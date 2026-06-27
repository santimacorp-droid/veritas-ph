import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath('.'))

from database import async_session_maker
from sqlalchemy import text

async def main():
    async with async_session_maker() as db:
        res = await db.execute(text("SELECT * FROM procurement_cases WHERE case_id = 'c025a9c4-11e2-45e3-a6b1-000000000017'"))
        case = res.mappings().first()
        print("CASE DETAIL:")
        print(dict(case) if case else "Not found")

        res_disc = await db.execute(text("SELECT * FROM discrepancies WHERE case_id = 'c025a9c4-11e2-45e3-a6b1-000000000017'"))
        discs = res_disc.mappings().all()
        print("\nDISCREPANCIES:")
        print([dict(d) for d in discs])

        res_events = await db.execute(text("SELECT * FROM procurement_events WHERE case_id = 'c025a9c4-11e2-45e3-a6b1-000000000017'"))
        events = res_events.mappings().all()
        print("\nEVENTS:")
        print([dict(e) for e in events])

if __name__ == '__main__':
    asyncio.run(main())
