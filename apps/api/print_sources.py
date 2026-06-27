import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath('.'))

from database import async_session_maker
from sqlalchemy import text

async def main():
    async with async_session_maker() as db:
        res = await db.execute(text('SELECT source_id, publisher_name, base_url FROM sources'))
        for r in res.mappings().all():
            print(f"{r['source_id']}: {r['publisher_name']} -> {r['base_url']}")

if __name__ == '__main__':
    asyncio.run(main())
