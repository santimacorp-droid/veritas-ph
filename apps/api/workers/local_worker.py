"""
apps/api/workers/local_worker.py

Simple local polling worker loop.
Runs crawling, extraction, embedding updates, and risk analysis in-process.
"""
# ruff: noqa: E402

import asyncio
import logging
import os
import sys

import structlog

# Add apps/api to path so imports work correctly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import async_session_maker, DATABASE_URL
from sqlalchemy import text

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = structlog.get_logger()

# Import task logic directly
from workers.tasks.crawler import download_document, fetch_sources
from workers.tasks.extractor import process_document
from workers.tasks.law_analyzer import analyze_law
from workers.tasks.law_crawler import fetch_laws
from workers.tasks.linker import update_supplier_embeddings, canonicalize_suppliers, detect_duplicate_documents
from workers.tasks.risk_engine import analyze_case


async def run_worker_loop():
    logger.info("Local Veritas Background Worker Started")

    while True:
        try:
            # 1. Run source discovery crawler
            logger.info("Worker checking: discovery crawler...")
            fetch_res = await fetch_sources()
            logger.info("Discovery complete", result=fetch_res)

            # 1.5. Run legislative crawler
            logger.info("Worker checking: legislative crawler...")
            law_res = await fetch_laws()
            logger.info("Legislative crawl complete", result=law_res)

            async with async_session_maker() as db:
                # 2. Check for any pending documents to download/extract
                doc_sql = text(
                    "SELECT document_id FROM documents WHERE processing_status = 'pending' LIMIT 10"
                )
                doc_res = await db.execute(doc_sql)
                pending_docs = [str(r["document_id"]) for r in doc_res.mappings().all()]

                for doc_id in pending_docs:
                    logger.info(f"Worker downloading document: {doc_id}")
                    await download_document(doc_id)
                    logger.info(f"Worker running extraction: {doc_id}")
                    await process_document(doc_id)

                # 3. Generate missing supplier embeddings and run entity deduplication
                logger.info("Worker checking: supplier embeddings...")
                emb_res = await update_supplier_embeddings()
                logger.info("Embeddings check complete", result=emb_res)

                logger.info("Worker checking: canonicalizing suppliers...")
                merge_sup_res = await canonicalize_suppliers()
                logger.info("Supplier canonicalization complete", result=merge_sup_res)

                logger.info("Worker checking: detecting duplicate cases...")
                merge_case_res = await detect_duplicate_documents()
                logger.info("Duplicate case detection complete", result=merge_case_res)

                is_sqlite = "sqlite" in DATABASE_URL

                # 4. Run risk engine on unanalyzed cases
                if is_sqlite:
                    case_sql = text("SELECT case_id FROM procurement_cases WHERE risk_score IS NULL LIMIT 10")
                else:
                    case_sql = text("SELECT case_id FROM procurement_cases WHERE risk_score IS NULL LIMIT 10 FOR UPDATE SKIP LOCKED")
                case_res = await db.execute(case_sql)
                pending_cases = [str(r["case_id"]) for r in case_res.mappings().all()]
                
                # Atomically set sentinel to lock these cases
                for case_id in pending_cases:
                    await db.execute(
                        text("UPDATE procurement_cases SET risk_score = -1.0 WHERE case_id = :cid"),
                        {"cid": case_id}
                    )
                await db.commit()

                for case_id in pending_cases:
                    logger.info(f"Worker analyzing risk for case: {case_id}")
                    try:
                        await analyze_case(case_id)
                    except Exception as e:
                        logger.error(f"Failed to analyze case {case_id}, resetting risk_score: {e}")
                        async with async_session_maker() as db2:
                            await db2.execute(
                                text("UPDATE procurement_cases SET risk_score = NULL WHERE case_id = :cid"),
                                {"cid": case_id}
                            )
                            await db2.commit()

                # 5. Run Law Analyzer on pending analyses (prioritize newest laws first)
                if is_sqlite:
                    law_sql = text("""
                        SELECT la.analysis_id, la.law_id 
                        FROM law_analyses la
                        JOIN laws l ON l.law_id = la.law_id
                        WHERE la.analysis_status = 'pending' 
                        ORDER BY l.date_passed DESC NULLS LAST, l.created_at DESC 
                        LIMIT 5
                    """)
                else:
                    law_sql = text("""
                        SELECT la.analysis_id, la.law_id 
                        FROM law_analyses la
                        JOIN laws l ON l.law_id = la.law_id
                        WHERE la.analysis_status = 'pending' 
                        ORDER BY l.date_passed DESC NULLS LAST, l.created_at DESC 
                        LIMIT 5
                        FOR UPDATE SKIP LOCKED
                    """)
                law_res = await db.execute(law_sql)
                pending_items = [(str(r["analysis_id"]), str(r["law_id"])) for r in law_res.mappings().all()]
                
                # Atomically set 'running' status to lock these laws
                for analysis_id, _ in pending_items:
                    await db.execute(
                        text("UPDATE law_analyses SET analysis_status = 'running' WHERE analysis_id = :aid"),
                        {"aid": analysis_id}
                    )
                await db.commit()

                for analysis_id, law_id in pending_items:
                    logger.info(f"Worker analyzing law: {law_id} (analysis: {analysis_id})")
                    try:
                        await analyze_law(law_id, analysis_id=analysis_id)
                    except Exception as e:
                        logger.error(f"Failed to analyze law {law_id}, resetting status to pending: {e}")
                        async with async_session_maker() as db3:
                            await db3.execute(
                                text("UPDATE law_analyses SET analysis_status = 'pending' WHERE analysis_id = :aid"),
                                {"aid": analysis_id}
                            )
                            await db3.commit()

        except Exception as e:
            logger.error("Error in local worker loop", error=str(e))

        # Poll every 20 seconds
        await asyncio.sleep(20)


if __name__ == "__main__":
    asyncio.run(run_worker_loop())
