"""
apps/api/seed_legislation.py

Seeding script for the Legislation & Controversial Laws module.
Populates sample laws, provisions, controversies, and revisions using the unified REAL_LEGISLATION_DATA.
"""

import asyncio
import sys
from database import async_session_maker
from sqlalchemy import text
from workers.tasks.law_crawler import REAL_LEGISLATION_DATA, ingest_laws_batch


async def seed_legislation():
    print("=" * 60)
    print("VERITAS PH — LEGISLATION DATA SEEDER")
    print("=" * 60)

    confirm = "--confirm-wipe" in sys.argv
    if not confirm:
        print("\nWARNING: Seeding will wipe all existing legislation, provisions, controversies, and analyses.")
        print("To proceed, you must run this script with the --confirm-wipe flag:")
        print("  PYTHONPATH=. ../../.venv_linux/bin/python seed_legislation.py --confirm-wipe")
        print("\nAborted.")
        return

    print("\nTruncating legislation tables...")
    async with async_session_maker() as session:
        await session.execute(text("TRUNCATE TABLE law_revisions, law_case_links CASCADE"))
        await session.execute(text("TRUNCATE TABLE law_analyses, law_controversies, law_provisions, laws CASCADE"))
        await session.commit()
    print("  ✅ Tables truncated.")

    print("\nIngesting unified seed laws and provisions...")
    seeds_count = await ingest_laws_batch(REAL_LEGISLATION_DATA)
    print(f"  ✅ Curated seeds ingestion complete: {seeds_count} new laws added.")
    print("Legislation seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed_legislation())
