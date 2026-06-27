import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath('.'))

from database import async_session_maker
from sqlalchemy import text
from init_db import initialize_database
from seed_cases import seed_cases
from seed_legislation import seed_legislation

async def main():
    print("WARNING: Resetting all data in the database!")
    async with async_session_maker() as db:
        tables = [
            "linker_metrics", "law_analyses", "law_case_links", "law_revisions",
            "law_controversies", "law_provisions", "laws", "user_submissions",
            "annotations", "audit_log", "analyst_reviews", "users", "evidence_links",
            "risk_signals", "discrepancies", "budgets", "audit_findings",
            "project_locations", "projects", "contract_amendments", "contracts",
            "awards", "app_items", "line_items", "procurement_events",
            "procurement_cases", "supplier_aliases", "suppliers", "extractions",
            "document_pages", "document_versions", "documents", "crawls",
            "sources", "agencies", "publishers"
        ]
        
        print("Dropping all existing tables...")
        for table in tables:
            await db.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
        
        await db.commit()
        print("All tables dropped.")

    print("\n--- Initializing database schema ---")
    await initialize_database()

    print("\n--- Seeding legislation data ---")
    await seed_legislation()

    print("\n--- Seeding procurement cases data ---")
    await seed_cases()

    print("\nDatabase fully reset and seeded successfully!")

if __name__ == '__main__':
    asyncio.run(main())
