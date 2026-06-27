"""
apps/api/workers/crawler_worker.py

Dedicated crawler worker.
Handles web/legislative scraping, notice discovery, document downloading, and text extraction.
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
from workers.tasks.law_crawler import fetch_laws


async def run_crawler_loop():
    logger.info("Veritas Background Crawler Worker Started")

    while True:
        try:
            # 1. Run source discovery crawler
            logger.info("Crawler checking: discovery crawler...")
            fetch_res = await fetch_sources()
            logger.info("Discovery complete", result=fetch_res)

            # 2. Run legislative crawler
            logger.info("Crawler checking: legislative crawler...")
            law_res = await fetch_laws()
            logger.info("Legislative crawl complete", result=law_res)

            async with async_session_maker() as db:
                # 3. Check for any pending documents to download/extract
                doc_sql = text(
                    "SELECT document_id FROM documents WHERE processing_status = 'pending' LIMIT 10"
                )
                doc_res = await db.execute(doc_sql)
                pending_docs = [str(r["document_id"]) for r in doc_res.mappings().all()]

                for doc_id in pending_docs:
                    logger.info(f"Crawler downloading document: {doc_id}")
                    await download_document(doc_id)
                    logger.info(f"Crawler running extraction: {doc_id}")
                    await process_document(doc_id)

        except Exception as e:
            logger.error("Error in crawler worker loop", error=str(e))

        # Poll every 30 seconds for new source notices
        await asyncio.sleep(30)


if __name__ == "__main__":
    asyncio.run(run_crawler_loop())
