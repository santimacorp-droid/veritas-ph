"""
apps/api/clear_fake_data.py

Wipes all mock/seeded cases, documents, and discrepancies from the database,
allowing the real PhilGEPS crawler and analyzer to populate the system
with genuine public data.

Preserves:
- Registered publishers & agencies
- Configured sources (DPWH, DOH, DepEd crawling setups)
- Scraped legislation & laws (laws, law_provisions, law_analyses)
- Users and authentication credentials
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

TABLES_TO_WIPE = [
    "audit_reports",
    "evidence_links",
    "discrepancies",
    "procurement_events",
    "project_locations",
    "projects",
    "contracts",
    "contract_amendments",
    "awards",
    "line_items",
    "app_items",
    "corporate_registries",
    "supplier_aliases",
    "suppliers",
    "procurement_cases",
    "extractions",
    "document_pages",
    "document_versions",
    "documents",
    "crawls",
    "risk_signals",
    "law_case_links",
    "linker_metrics",
    "audit_findings",
    "budgets",
    "analyst_reviews",
    "user_submissions",
    "annotations",
]


async def clear_data():
    print("=" * 60)
    print("VERITAS PH — CLEARING MOCK CASE & DOCUMENT DATA")
    print("=" * 60)
    print("This will wipe all transactional procurement data (cases, documents, anomalies).")
    print("It will PRESERVE crawled legislation (laws) and crawler sources.")

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        for tbl in TABLES_TO_WIPE:
            # Try DELETE with commit per table to avoid aborting the entire transaction block
            try:
                await db.execute(text(f"DELETE FROM {tbl}"))
                await db.commit()
                print(f"  Wiped table: {tbl}")
            except Exception as e:
                await db.rollback()
                try:
                    await db.execute(text(f"TRUNCATE TABLE {tbl} CASCADE"))
                    await db.commit()
                    print(f"  Wiped table: {tbl} (via TRUNCATE)")
                except Exception as ex:
                    await db.rollback()
                    print(f"  [ERROR] Failed to clear {tbl}: {ex}")
    await engine.dispose()
    print("\nWipe complete! Running services will now start with a clean state.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(clear_data())
