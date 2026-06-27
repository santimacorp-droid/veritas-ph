import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath('.'))

from database import async_session_maker
from sqlalchemy import text

async def main():
    async with async_session_maker() as db:
        res = await db.execute(text('SELECT DISTINCT geographic_scope FROM procurement_cases'))
        print([r['geographic_scope'] for r in res.mappings().all()])

if __name__ == '__main__':
    asyncio.run(main())
