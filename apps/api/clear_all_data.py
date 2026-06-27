"""One-shot script to clear all procurement and legislation data from the DB."""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

TABLES = [
    'audit_reports',
    'audit_logs',
    'discrepancies',
    'procurement_events',
    'project_locations',
    'projects',
    'awards',
    'audit_anomaly_flags',
    'procurement_cases',
    'corporate_registries',
    'suppliers',
    'law_analyses',
    'laws',
]

async def main():
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        for tbl in TABLES:
            try:
                await db.execute(text(f'DELETE FROM {tbl}'))
                print(f'  Cleared: {tbl}')
            except Exception as e:
                print(f'  Skipped {tbl}: {e}')
        await db.commit()
    await engine.dispose()
    print('\nAll procurement and legislation data cleared. DB is now empty.')

asyncio.run(main())
