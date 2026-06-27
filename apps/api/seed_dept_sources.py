"""
seed_dept_sources.py
Registers DPWH, DOH, and DepEd as official publishers and crawlers in the database.
"""
import asyncio
from sqlalchemy import text
from database import async_session_maker

async def seed_departments():
    print("Seeding DPWH, DOH, and DepEd sources...")
    async with async_session_maker() as session:
        # Publishers data
        publishers = [
            {
                "publisher_id": "pub_dpwh",
                "name": "Department of Public Works and Highways",
                "slug": "dpwh",
                "website": "https://www.dpwh.gov.ph",
                "publisher_type": "national_agency"
            },
            {
                "publisher_id": "pub_doh",
                "name": "Department of Health",
                "slug": "doh",
                "website": "https://doh.gov.ph",
                "publisher_type": "national_agency"
            },
            {
                "publisher_id": "pub_deped",
                "name": "Department of Education",
                "slug": "deped",
                "website": "https://www.deped.gov.ph",
                "publisher_type": "national_agency"
            }
        ]

        # Sources data
        sources = [
            {
                "source_id": "src_dpwh",
                "publisher_id": "pub_dpwh",
                "source_type": "portal",
                "publisher_name": "DPWH Civil Works Procurement Opportunities",
                "base_url": "https://www.dpwh.gov.ph/dpwh/procurement/civil_works",
                "parser_type": "dpwh_procurement_parser"
            },
            {
                "source_id": "src_doh",
                "publisher_id": "pub_doh",
                "source_type": "portal",
                "publisher_name": "DOH Procurement Opportunities",
                "base_url": "https://doh.gov.ph/procurement",
                "parser_type": "doh_procurement_parser"
            },
            {
                "source_id": "src_deped",
                "publisher_id": "pub_deped",
                "source_type": "portal",
                "publisher_name": "DepEd Procurement Opportunities",
                "base_url": "https://www.deped.gov.ph/about-deped/procurement/",
                "parser_type": "deped_procurement_parser"
            }
        ]

        for pub in publishers:
            # Check if publisher exists
            res = await session.execute(
                text("SELECT 1 FROM publishers WHERE publisher_id = :id"),
                {"id": pub["publisher_id"]}
            )
            if not res.scalar():
                print(f"Adding publisher: {pub['name']}")
                await session.execute(
                    text("""
                        INSERT INTO publishers (publisher_id, name, slug, website, publisher_type)
                        VALUES (:publisher_id, :name, :slug, :website, :publisher_type)
                    """),
                    pub
                )

        for src in sources:
            # Check if source exists
            res = await session.execute(
                text("SELECT 1 FROM sources WHERE source_id = :id"),
                {"id": src["source_id"]}
            )
            if not res.scalar():
                print(f"Adding source: {src['publisher_name']}")
                await session.execute(
                    text("""
                        INSERT INTO sources (source_id, publisher_id, source_type, publisher_name, base_url, parser_type)
                        VALUES (:source_id, :publisher_id, :source_type, :publisher_name, :base_url, :parser_type)
                    """),
                    src
                )
                
        await session.commit()
    print("Department sources seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_departments())
