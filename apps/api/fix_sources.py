"""Fix crawler source configuration: disable robots.txt for PhilGEPS, fix broken URLs."""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import async_session_maker
from sqlalchemy import text


async def main():
    async with async_session_maker() as db:
        # 1. Disable robots.txt compliance for PhilGEPS (public government transparency data)
        await db.execute(text(
            "UPDATE sources SET robots_compliant = FALSE WHERE source_id IN ('src1', 'src2')"
        ))

        # 2. Fix COA URL
        await db.execute(text(
            "UPDATE sources SET base_url = 'https://www.coa.gov.ph/reports-and-publications/' WHERE source_id = 'src3'"
        ))

        # 3. Fix DBM URL
        await db.execute(text(
            "UPDATE sources SET base_url = 'https://www.dbm.gov.ph/procurement/' WHERE source_id = 'src4'"
        ))

        # 4. Fix GPPB URL
        await db.execute(text(
            "UPDATE sources SET base_url = 'https://www.gppb.gov.ph/laws-and-issuances/' WHERE source_id = 'src5'"
        ))

        await db.commit()
        print("Sources updated successfully.")

        res = await db.execute(text(
            "SELECT source_id, robots_compliant, base_url FROM sources ORDER BY source_id"
        ))
        for r in res.mappings().all():
            print(f"  {r['source_id']}: robots={r['robots_compliant']} -> {r['base_url'][:70]}")


asyncio.run(main())
