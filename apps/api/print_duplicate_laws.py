import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath('.'))

from database import async_session_maker
from sqlalchemy import text

async def main():
    async with async_session_maker() as db:
        res = await db.execute(text("""
            SELECT short_title, count(*), array_agg(law_id) as ids
            FROM laws
            GROUP BY short_title
            HAVING count(*) > 1
        """))
        print("DUPLICATE SHORT TITLES:")
        for r in res.mappings().all():
            print(dict(r))

        res2 = await db.execute(text("""
            SELECT title, count(*), array_agg(law_id) as ids
            FROM laws
            GROUP BY title
            HAVING count(*) > 1
        """))
        print("\nDUPLICATE FULL TITLES:")
        for r in res2.mappings().all():
            print(dict(r))

if __name__ == '__main__':
    asyncio.run(main())
