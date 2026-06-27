import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath('.'))

from database import async_session_maker
from sqlalchemy import text

async def main():
    print("Resetting all law audits in database to 'pending'...")
    async with async_session_maker() as db:
        # Reset the law_analyses status to pending and clear scores
        res = await db.execute(text("""
            UPDATE law_analyses
            SET analysis_status = 'pending',
                integrity_score = NULL,
                governance_score = NULL,
                pros = '[]',
                cons = '[]',
                loopholes = '[]',
                suggested_revisions = '[]',
                violation_patterns = '[]',
                cross_law_conflicts = '[]',
                citizen_summary = 'Indexed and awaiting AI audit...',
                raw_ai_response = NULL,
                completed_at = NULL
        """))
        print(f"Reset {res.rowcount} law audits to pending.")
        await db.commit()

if __name__ == '__main__':
    asyncio.run(main())
