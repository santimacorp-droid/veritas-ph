"""
apps/api/workers/tasks/law_updater.py

Retries parsing and re-queuing AI analysis for laws stored as 'incomplete'.
These are laws where the initial crawler found < 2 parseable sections.

Runs as a background task each crawler cycle. Fetches the bookshelf URL
from the law's description, re-parses, and if it now succeeds updates
the law_provisions and queues a fresh AI analysis.
"""

import asyncio
import re
import random
import structlog
import httpx
from uuid import uuid4
from database import async_session_maker
from sqlalchemy import text

from workers.tasks.law_crawler import parse_bookshelf_provisions

logger = structlog.get_logger()

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
]


async def retry_incomplete_laws() -> dict:
    """
    Finds laws with status='incomplete', re-fetches their bookshelf pages,
    re-parses sections, and if successful:
    - Updates law_provisions with the parsed sections
    - Sets law status to 'active'
    - Queues a fresh AI analysis
    """
    logger.info("Law updater: scanning for incomplete laws to retry...")

    async with async_session_maker() as db:
        res = await db.execute(
            text("SELECT law_id, short_title, description FROM laws WHERE status = 'incomplete' LIMIT 20")
        )
        incomplete_laws = res.mappings().all()

    if not incomplete_laws:
        logger.info("Law updater: no incomplete laws found.")
        return {"status": "success", "retried": 0, "recovered": 0}

    logger.info(f"Law updater: found {len(incomplete_laws)} incomplete laws to retry.")
    headers = {"User-Agent": random.choice(USER_AGENTS)}
    retried = 0
    recovered = 0

    async with httpx.AsyncClient(timeout=25.0, verify=False) as client:
        for law in incomplete_laws:
            law_id = law["law_id"]
            short_title = law["short_title"]
            description = law["description"] or ""

            # Extract bookshelf URL from the description field
            url_match = re.search(r'Bookshelf URL:\s*(https?://[^\s]+)', description)
            if not url_match:
                logger.warning(f"No bookshelf URL found for {short_title}. Skipping.")
                continue

            bookshelf_url = url_match.group(1).strip().rstrip('.')
            retried += 1

            parsed_provisions = []
            try:
                await asyncio.sleep(random.uniform(0.5, 1.5))
                doc_resp = await client.get(bookshelf_url, headers=headers)
                if doc_resp.status_code == 200:
                    parsed_provisions = await parse_bookshelf_provisions(
                        doc_resp.text, short_title, logger
                    )

                # Try printer-friendly fallback
                if not parsed_provisions and "/showdocs/" in bookshelf_url:
                    friendly_url = bookshelf_url.replace("/showdocs/", "/showdocsfriendly/")
                    await asyncio.sleep(random.uniform(0.3, 0.7))
                    fd = await client.get(friendly_url, headers=headers)
                    if fd.status_code == 200:
                        parsed_provisions = await parse_bookshelf_provisions(
                            fd.text, short_title, logger
                        )
            except Exception as e:
                logger.warning(f"Law updater: fetch failed for {short_title}: {e}")
                continue

            if len(parsed_provisions) < 2:
                logger.info(f"Law updater: still incomplete after retry: {short_title}")
                continue

            logger.info(f"Law updater: recovered {len(parsed_provisions)} sections for {short_title}!")

            # Update database
            async with async_session_maker() as db:
                # Remove old stub provisions
                await db.execute(
                    text("DELETE FROM law_provisions WHERE law_id = :lid"),
                    {"lid": law_id}
                )

                # Insert new parsed provisions
                for prov in parsed_provisions:
                    await db.execute(
                        text("""
                            INSERT INTO law_provisions (provision_id, law_id, section_number, title, content)
                            VALUES (:pid, :lid, :sec, :title, :content)
                        """),
                        {
                            "pid": str(uuid4()),
                            "lid": law_id,
                            "sec": prov["section_number"],
                            "title": prov.get("title", ""),
                            "content": prov["content"]
                        }
                    )

                # Mark law as active
                await db.execute(
                    text("UPDATE laws SET status = 'active' WHERE law_id = :lid"),
                    {"lid": law_id}
                )

                # Remove old failed/skipped analyses
                await db.execute(
                    text("DELETE FROM law_analyses WHERE law_id = :lid"),
                    {"lid": law_id}
                )

                # Queue fresh AI analysis
                await db.execute(
                    text("""
                        INSERT INTO law_analyses (
                            analysis_id, law_id, model_used, pros, cons, loopholes,
                            suggested_revisions, citizen_summary, analysis_status, requested_by
                        ) VALUES (
                            :aid, :lid, 'pending', '[]', '[]', '[]', '[]',
                            'Re-analyzing recovered law...', 'pending', 'law_updater'
                        )
                    """),
                    {"aid": str(uuid4()), "lid": law_id}
                )

                await db.commit()
                recovered += 1

    logger.info(f"Law updater: retried {retried}, recovered {recovered} laws.")
    return {"status": "success", "retried": retried, "recovered": recovered}
