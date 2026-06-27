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

from database import async_session_maker
from sqlalchemy import text

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = structlog.get_logger()

# Import task logic directly
from workers.tasks.law_analyzer import analyze_law
from workers.tasks.linker import update_supplier_embeddings
from workers.tasks.risk_engine import analyze_case


async def run_analyzer_loop():
    logger.info("Veritas Background AI Analyzer & Risk Engine Started")

    while True:
        try:
            # 1. Generate missing supplier embeddings
            logger.info("Analyzer checking: supplier embeddings...")
            emb_res = await update_supplier_embeddings()
            logger.info("Embeddings check complete", result=emb_res)

            # 2. Run risk engine on unanalyzed cases
            async with async_session_maker() as db:
                case_sql = text(
                    "SELECT case_id FROM procurement_cases WHERE risk_score IS NULL LIMIT 10"
                )
                case_res = await db.execute(case_sql)
                pending_cases = [str(r["case_id"]) for r in case_res.mappings().all()]

            for case_id in pending_cases:
                logger.info(f"Analyzer scoring risk for case: {case_id}")
                await analyze_case(case_id)

            # 3. Run Law Analyzer on pending analyses (prioritize newest first)
            async with async_session_maker() as db:
                law_sql = text("""
                    SELECT la.analysis_id, la.law_id 
                    FROM law_analyses la
                    JOIN laws l ON l.law_id = la.law_id
                    WHERE la.analysis_status = 'pending' 
                    ORDER BY l.date_passed DESC NULLS LAST, l.created_at DESC 
                    LIMIT 5
                """)
                law_res = await db.execute(law_sql)
                pending_items = [(str(r["analysis_id"]), str(r["law_id"])) for r in law_res.mappings().all()]

            for analysis_id, law_id in pending_items:
                logger.info(f"Analyzer auditing law: {law_id} (analysis: {analysis_id})")
                await analyze_law(law_id, analysis_id=analysis_id)

        except Exception as e:
            logger.error("Error in analyzer worker loop", error=str(e))

        # Poll every 15 seconds for pending audits
        await asyncio.sleep(15)


if __name__ == "__main__":
    asyncio.run(run_analyzer_loop())
