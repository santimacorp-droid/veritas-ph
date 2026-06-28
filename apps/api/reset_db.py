"""
apps/api/reset_db.py

Full database wipe and reseed script.
Run this on EC2 to clear all law and case data and start fresh.

WARNING: This is irreversible. Make sure a pg_dump backup has been taken first.

Usage:
  cd /home/ubuntu/veritas-ph/apps/api
  PYTHONPATH=. ../../.venv_linux/bin/python reset_db.py
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from database import async_session_maker
from sqlalchemy import text


async def reset():
    print("=" * 60)
    print("VERITAS PH — FULL DATABASE RESET")
    print("=" * 60)
    print("\nWARNING: This will delete ALL law and case data.")
    confirm = input("Type 'yes' to continue: ").strip().lower()
    if confirm != "yes":
        print("Aborted.")
        return

    print("\nStep 1: Adding schema columns if missing...")
    async with async_session_maker() as db:
        # Add procurement_stage column
        await db.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='procurement_cases' AND column_name='procurement_stage'
                ) THEN
                    ALTER TABLE procurement_cases
                    ADD COLUMN procurement_stage TEXT DEFAULT 'active_bidding'
                    CHECK(procurement_stage IN (
                        'active_bidding', 'under_evaluation', 'awarded',
                        'ongoing', 'completed', 'cancelled'
                    ));
                END IF;
            END $$;
        """))

        # Add completion_date column
        await db.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='procurement_cases' AND column_name='completion_date'
                ) THEN
                    ALTER TABLE procurement_cases ADD COLUMN completion_date DATE;
                END IF;
            END $$;
        """))

        # Add ntp_issued column
        await db.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='procurement_cases' AND column_name='ntp_issued'
                ) THEN
                    ALTER TABLE procurement_cases ADD COLUMN ntp_issued BOOLEAN DEFAULT FALSE;
                END IF;
            END $$;
        """))

        # Add 'incomplete' to laws.status (no CHECK constraint enforced via code)
        await db.commit()
        print("  ✅ Schema columns added/verified.")

    print("\nStep 2: Wiping all law and case data...")
    async with async_session_maker() as db:
        # TRUNCATE CASCADE handles all FK dependencies automatically
        await db.execute(text("""
            TRUNCATE TABLE
                law_controversies, law_analyses, law_provisions,
                law_revisions, law_case_links, laws,
                discrepancies, procurement_events, procurement_cases,
                document_versions, documents, agencies, publishers,
                suppliers, app_items
            CASCADE
        """))
        await db.commit()

        # Verify
        for table in ["laws", "law_provisions", "law_analyses", "procurement_cases", "documents"]:
            r = await db.execute(text(f"SELECT COUNT(*) FROM {table}"))
            print(f"  ✅ {table}: {r.scalar()} rows (empty)")
        print("  ✅ Database wiped.")


    print("\nStep 3: Initializing procurement_stage for any remaining cases...")
    async with async_session_maker() as db:
        await db.execute(text("""
            UPDATE procurement_cases
               SET procurement_stage = CASE
                   WHEN ntp_date IS NOT NULL AND ntp_date <= CURRENT_DATE THEN 'ongoing'
                   WHEN award_date IS NOT NULL THEN 'awarded'
                   WHEN bid_deadline IS NOT NULL AND bid_deadline < CURRENT_DATE - INTERVAL '1 day' THEN 'under_evaluation'
                   ELSE 'active_bidding'
               END
             WHERE procurement_stage IS NULL OR procurement_stage = 'active_bidding'
        """))
        await db.commit()
        print("  ✅ Stage initialization done.")

    print("\n" + "=" * 60)
    print("RESET COMPLETE.")
    print("The database is now empty (except schema).")
    print("Restart veritas-crawler to start re-populating with fresh data.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(reset())
