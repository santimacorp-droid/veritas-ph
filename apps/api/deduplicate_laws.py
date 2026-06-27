import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath('.'))

from database import async_session_maker
from sqlalchemy import text

async def main():
    async with async_session_maker() as db:
        print("Starting legislative deduplication process...")

        # 1. Deduplicate laws by short_title first, then title
        # Get all laws sorted by created_at so we keep the oldest one
        res = await db.execute(text("SELECT law_id, short_title, title, created_at FROM laws ORDER BY created_at ASC"))
        all_laws = res.mappings().all()

        canonical_map = {} # Maps duplicate_id -> canonical_id
        seen_shorts = {}   # short_title -> canonical_id
        seen_titles = {}   # title -> canonical_id

        duplicate_count = 0

        for law in all_laws:
            st = law["short_title"]
            title = law["title"]
            lid = law["law_id"]

            canonical_id = None
            if st and st in seen_shorts:
                canonical_id = seen_shorts[st]
            elif title and title in seen_titles:
                canonical_id = seen_titles[title]

            if canonical_id:
                canonical_map[lid] = canonical_id
                duplicate_count += 1
            else:
                if st:
                    seen_shorts[st] = lid
                if title:
                    seen_titles[title] = lid

        print(f"Found {duplicate_count} duplicate laws to merge.")

        if duplicate_count > 0:
            # Update references for each duplicate law
            for dup_id, can_id in canonical_map.items():
                # Update law_provisions
                await db.execute(text("UPDATE law_provisions SET law_id = :can_id WHERE law_id = :dup_id"), {"can_id": can_id, "dup_id": dup_id})
                # Update law_revisions
                await db.execute(text("UPDATE law_revisions SET law_id = :can_id WHERE law_id = :dup_id"), {"can_id": can_id, "dup_id": dup_id})
                # Update law_analyses
                await db.execute(text("UPDATE law_analyses SET law_id = :can_id WHERE law_id = :dup_id"), {"can_id": can_id, "dup_id": dup_id})
                # Delete duplicate law
                await db.execute(text("DELETE FROM laws WHERE law_id = :dup_id"), {"dup_id": dup_id})

            print("Updated references and deleted duplicate laws.")

        # 2. Deduplicate law_provisions (grouped by law_id, section_number)
        res_prov = await db.execute(text("SELECT provision_id, law_id, section_number, content, created_at FROM law_provisions ORDER BY created_at ASC"))
        all_provs = res_prov.mappings().all()

        seen_provs = {} # (law_id, section_number) -> provision_id
        prov_canonical_map = {}
        dup_prov_count = 0

        for p in all_provs:
            key = (p["law_id"], p["section_number"].strip().lower())
            pid = p["provision_id"]

            if key in seen_provs:
                prov_canonical_map[pid] = seen_provs[key]
                dup_prov_count += 1
            else:
                seen_provs[key] = pid

        print(f"Found {dup_prov_count} duplicate provisions to merge.")

        if dup_prov_count > 0:
            for dup_pid, can_pid in prov_canonical_map.items():
                # Update law_controversies
                await db.execute(text("UPDATE law_controversies SET provision_id = :can_pid WHERE provision_id = :dup_pid"), {"can_pid": can_pid, "dup_pid": dup_pid})
                # Delete duplicate provision
                await db.execute(text("DELETE FROM law_provisions WHERE provision_id = :dup_pid"), {"dup_pid": dup_pid})

            print("Updated controversies and deleted duplicate provisions.")

        await db.commit()
        print("Deduplication completed successfully!")

if __name__ == '__main__':
    asyncio.run(main())
