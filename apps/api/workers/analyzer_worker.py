"""
apps/api/workers/analyzer_worker.py

Dedicated AI analyzer and risk engine worker.
Handles anomaly scoring, risk engine execution, supplier embeddings, and AI law audits.
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
from workers.tasks.law_analyzer import analyze_law
from workers.tasks.linker import update_supplier_embeddings, canonicalize_suppliers, detect_duplicate_documents
from workers.tasks.risk_engine import analyze_case
from workers.tasks.case_updater import update_case_stages
from workers.tasks.law_updater import retry_incomplete_laws


async def run_analyzer_loop():
    logger.info("Veritas Background AI Analyzer & Risk Engine Started")
    is_sqlite = "sqlite" in DATABASE_URL
    loop_count = 0

    # Startup cleanup: release any locked records from crashed runs
    try:
        logger.info("Releasing orphaned lock indicators from previous runs...")
        async with async_session_maker() as db:
            c_res = await db.execute(
                text("UPDATE procurement_cases SET risk_score = NULL WHERE risk_score = -1.0")
            )
            l_res = await db.execute(
                text("UPDATE law_analyses SET analysis_status = 'pending' WHERE analysis_status = 'running'")
            )
            await db.commit()
            logger.info(
                "Cleanup complete",
                unlocked_cases=c_res.rowcount,
                unlocked_laws=l_res.rowcount
            )
    except Exception as e:
        logger.warning(f"Startup cleanup failed: {e}")

    while True:
        try:
            loop_count += 1

            # 0. Stale-row reaper: any law_analyses in 'running' for >10 minutes is marked as failed
            try:
                async with async_session_maker() as db:
                    reaped_res = await db.execute(
                        text("""
                            UPDATE law_analyses
                            SET analysis_status = 'failed',
                                citizen_summary = 'Failed: analysis timed out/stuck in running state.'
                            WHERE analysis_status = 'running'
                              AND created_at < CURRENT_TIMESTAMP - INTERVAL '10 minutes'
                        """)
                    )
                    await db.commit()
                    if reaped_res.rowcount > 0:
                        logger.info("Reaped stale law analyses", reaped_count=reaped_res.rowcount)
            except Exception as re:
                logger.warning(f"Stale-row reaper failed: {re}")

            # 1. Generate missing supplier embeddings and run entity deduplication
            logger.info("Analyzer checking: supplier embeddings...")
            emb_res = await update_supplier_embeddings()
            logger.info("Embeddings check complete", result=emb_res)

            logger.info("Analyzer checking: canonicalizing suppliers...")
            merge_sup_res = await canonicalize_suppliers()
            logger.info("Supplier canonicalization complete", result=merge_sup_res)

            logger.info("Analyzer checking: detecting duplicate cases...")
            merge_case_res = await detect_duplicate_documents()
            logger.info("Duplicate case detection complete", result=merge_case_res)

            # 2. Update procurement case lifecycle stages (every 5 loops = ~75 seconds)
            if loop_count % 5 == 0:
                logger.info("Analyzer checking: procurement case stage promotion...")
                stage_res = await update_case_stages()
                logger.info("Case stage update complete", result=stage_res)

            # 3. Run risk engine on unanalyzed cases
            async with async_session_maker() as db:
                if is_sqlite:
                    case_sql = text("SELECT case_id FROM procurement_cases WHERE risk_score IS NULL LIMIT 10")
                else:
                    case_sql = text("SELECT case_id FROM procurement_cases WHERE risk_score IS NULL LIMIT 10 FOR UPDATE SKIP LOCKED")
                case_res = await db.execute(case_sql)
                pending_cases = [str(r["case_id"]) for r in case_res.mappings().all()]

                for case_id in pending_cases:
                    await db.execute(
                        text("UPDATE procurement_cases SET risk_score = -1.0 WHERE case_id = :cid"),
                        {"cid": case_id}
                    )
                await db.commit()

            for case_id in pending_cases:
                logger.info(f"Analyzer scoring risk for case: {case_id}")
                try:
                    await analyze_case(case_id)
                except Exception as e:
                    logger.error(f"Failed to analyze case {case_id}, resetting risk_score: {e}")
                    async with async_session_maker() as db:
                        await db.execute(
                            text("UPDATE procurement_cases SET risk_score = NULL WHERE case_id = :cid"),
                            {"cid": case_id}
                        )
                        await db.commit()

            # 4. Run Law Analyzer on pending analyses (prioritize newest first)
            async with async_session_maker() as db:
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

                for analysis_id, _ in pending_items:
                    await db.execute(
                        text("UPDATE law_analyses SET analysis_status = 'running' WHERE analysis_id = :aid"),
                        {"aid": analysis_id}
                    )
                await db.commit()

            for analysis_id, law_id in pending_items:
                logger.info(f"Analyzer auditing law: {law_id} (analysis: {analysis_id})")
                try:
                    await analyze_law(law_id, analysis_id=analysis_id)
                except Exception as e:
                    logger.error(f"Failed to analyze law {law_id}, checking retry count: {e}")
                    async with async_session_maker() as db:
                        res = await db.execute(
                            text("SELECT retry_count FROM law_analyses WHERE analysis_id = :aid"),
                            {"aid": analysis_id}
                        )
                        row = res.mappings().first()
                        retries = (row["retry_count"] if row else 0) or 0
                        
                        if retries >= 3:
                            logger.error(f"Law analysis {analysis_id} failed 3 times. Marking permanently as 'failed'.")
                            await db.execute(
                                text("""
                                    UPDATE law_analyses
                                    SET analysis_status = 'failed',
                                        citizen_summary = 'Failed: maximum analysis retries exceeded.'
                                    WHERE analysis_id = :aid
                                """),
                                {"aid": analysis_id}
                            )
                        else:
                            logger.info(f"Incrementing retry count for analysis {analysis_id} and resetting to 'pending'.")
                            await db.execute(
                                text("""
                                    UPDATE law_analyses
                                    SET analysis_status = 'pending',
                                        retry_count = retry_count + 1
                                    WHERE analysis_id = :aid
                                """),
                                {"aid": analysis_id}
                            )
                        await db.commit()

            # 5. Retry incomplete laws (every 40 loops = ~10 minutes)
            if loop_count % 40 == 0:
                logger.info("Analyzer checking: retrying incomplete law parsings...")
                updater_res = await retry_incomplete_laws()
                logger.info("Law updater complete", result=updater_res)

        except Exception as e:
            logger.error("Error in analyzer worker loop", error=str(e))

        # Poll every 15 seconds
        await asyncio.sleep(15)


if __name__ == "__main__":
    asyncio.run(run_analyzer_loop())
