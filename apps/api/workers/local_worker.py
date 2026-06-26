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

from database import async_session_maker
from sqlalchemy import text

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = structlog.get_logger()

# Import task logic directly
from workers.tasks.crawler import download_document, fetch_sources
from workers.tasks.extractor import process_document
from workers.tasks.law_analyzer import analyze_law
from workers.tasks.law_crawler import fetch_laws
from workers.tasks.linker import update_supplier_embeddings
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

                # 3. Generate missing supplier embeddings
                logger.info("Worker checking: supplier embeddings...")
                emb_res = await update_supplier_embeddings()
                logger.info("Embeddings check complete", result=emb_res)

                # 4. Run risk engine on unanalyzed cases
                case_sql = text(
                    "SELECT case_id FROM procurement_cases WHERE risk_score IS NULL LIMIT 10"
                )
                case_res = await db.execute(case_sql)
                pending_cases = [str(r["case_id"]) for r in case_res.mappings().all()]

                for case_id in pending_cases:
                    logger.info(f"Worker analyzing risk for case: {case_id}")
                    await analyze_case(case_id)

                # 5. Run Law Analyzer on pending analyses
                law_sql = text(
                    "SELECT law_id FROM law_analyses WHERE analysis_status = 'pending' LIMIT 5"
                )
                law_res = await db.execute(law_sql)
                pending_laws = [str(r["law_id"]) for r in law_res.mappings().all()]

                for law_id in pending_laws:
                    logger.info(f"Worker analyzing law: {law_id}")
                    await analyze_law(law_id)

        except Exception as e:
            logger.error("Error in local worker loop", error=str(e))

        # Poll every 20 seconds
        await asyncio.sleep(20)


if __name__ == "__main__":
    asyncio.run(run_worker_loop())
