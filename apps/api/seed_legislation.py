"""
apps/api/seed_legislation.py

Seeding script for the Legislation & Controversial Laws module.
Populates sample laws, provisions, controversies, and revisions using explicit UUID generation.
"""

import asyncio
import uuid

from database import async_session_maker
from sqlalchemy import text


async def seed_legislation():
    print("Starting legislation seeding...")
    async with async_session_maker() as session:
        # Truncate tables to ensure fresh seed
        await session.execute(text("TRUNCATE TABLE law_revisions, law_case_links CASCADE"))
        await session.execute(text("TRUNCATE TABLE law_analyses, law_controversies, law_provisions, laws CASCADE"))

        # 1. Republic Act No. 9184
        law1_id = str(uuid.uuid4())
        law1_sql = text("""
            INSERT INTO laws (law_id, title, short_title, description, date_passed, status)
            VALUES (
                :law_id,
                'An Act Providing for the Modernization, Standardization and Regulation of the Procurement Activities of the Government and for Other Purposes',
                'Republic Act No. 9184',
                'Commonly known as the Government Procurement Reform Act (GPRA). Passed in 2003, it governs all procurement activities across national government agencies, GOCCs, and local government units in the Philippines.',
                '2003-01-10',
                'active'
            )
        """)
        await session.execute(law1_sql, {"law_id": law1_id})

        # RA 9184 Provisions
        p1_id = str(uuid.uuid4())
        prov1_sql = text("""
            INSERT INTO law_provisions (provision_id, law_id, section_number, title, content)
            VALUES (
                :provision_id,
                :law_id,
                'Section 53',
                'Negotiated Procurement',
                'Negotiated Procurement is a method of procurement of Goods, Infrastructure Projects and Consulting Services, whereby the Procuring Entity directly negotiates a contract with a technically, legally and financially capable supplier, contractor or consultant in highly exceptional cases.'
            )
        """)
        await session.execute(prov1_sql, {"provision_id": p1_id, "law_id": law1_id})

        # Controversy for Section 53
        c1_id = str(uuid.uuid4())
        cont1_sql = text("""
            INSERT INTO law_controversies (controversy_id, provision_id, issue_description, impact, severity)
            VALUES (
                :controversy_id,
                :provision_id,
                'Bypassing competitive bidding under loosely-defined "emergency" or "adjacent" clauses. Frequently exploited to handpick vendors without open competition.',
                'Creates high susceptibility to corruption, overpriced contracts, and completely limits market access for new or independent bidders.',
                'critical'
            )
        """)
        await session.execute(cont1_sql, {"controversy_id": c1_id, "provision_id": p1_id})

        p2_id = str(uuid.uuid4())
        prov2_sql = text("""
            INSERT INTO law_provisions (provision_id, law_id, section_number, title, content)
            VALUES (
                :provision_id,
                :law_id,
                'Section 36',
                'Single Calculated/Rated Responsive Bid',
                'A Single Calculated/Rated Responsive Bid (SCRB) shall be considered for award if it meets the requirements, particularly in cases where only one bidder submits a bid, or where after evaluation, only one bidder meets the criteria.'
            )
        """)
        await session.execute(prov2_sql, {"provision_id": p2_id, "law_id": law1_id})

        # Controversy for Section 36
        c2_id = str(uuid.uuid4())
        cont2_sql = text("""
            INSERT INTO law_controversies (controversy_id, provision_id, issue_description, impact, severity)
            VALUES (
                :controversy_id,
                :provision_id,
                'The "Single Bidder" loophole. Bidding rules allow awards even if only one bidder participates, which is often a symptom of tailored technical specifications designed to exclude others.',
                'Severely limits price discovery, allows potential collusive agreement among bidders, and results in lack of genuine market competition.',
                'high'
            )
        """)
        await session.execute(cont2_sql, {"controversy_id": c2_id, "provision_id": p2_id})

        # Revisions for RA 9184
        rev1_id = str(uuid.uuid4())
        rev1_sql = text("""
            INSERT INTO law_revisions (revision_id, law_id, proposed_bill, proposed_changes, sponsor, status)
            VALUES (
                :revision_id,
                :law_id,
                'House Bill No. 9648 (New Government Procurement Act / RA 12009)',
                'A comprehensive overhaul of RA 9184 to mandate the digitization of bidder registries, introduce standard dynamic price reference indexes, enforce ultimate beneficial ownership disclosure, and streamline procurement modalities.',
                'Rep. Miro Quimbo, et al.',
                'approved'
            )
        """)
        await session.execute(rev1_sql, {"revision_id": rev1_id, "law_id": law1_id})

        # 2. Republic Act No. 6713
        law2_id = str(uuid.uuid4())
        law2_sql = text("""
            INSERT INTO laws (law_id, title, short_title, description, date_passed, status)
            VALUES (
                :law_id,
                'An Act Establishing a Code of Conduct and Ethical Standards for Public Officials and Employees, to Uphold the Time-Honored Principle of Public Office being a Public Trust',
                'Republic Act No. 6713',
                'Code of Conduct and Ethical Standards for Public Officials and Employees. Enacted in 1989, it defines conflict of interest, gift-giving prohibitions, and financial disclosures.',
                '1989-02-20',
                'active'
            )
        """)
        await session.execute(law2_sql, {"law_id": law2_id})

        # RA 6713 Provisions
        p3_id = str(uuid.uuid4())
        prov3_sql = text("""
            INSERT INTO law_provisions (provision_id, law_id, section_number, title, content)
            VALUES (
                :provision_id,
                :law_id,
                'Section 7(a)',
                'Financial and Material Interest',
                'Public officials and employees shall not, directly or indirectly, have any financial or material interest in any transaction requiring the approval of their office.'
            )
        """)
        await session.execute(prov3_sql, {"provision_id": p3_id, "law_id": law2_id})

        # Controversy for Section 7(a)
        c3_id = str(uuid.uuid4())
        cont3_sql = text("""
            INSERT INTO law_controversies (controversy_id, provision_id, issue_description, impact, severity)
            VALUES (
                :controversy_id,
                :provision_id,
                'Indirect ownership loopholes. Public officials frequently utilize close relatives or shell corporations to bid on projects managed by their own agencies.',
                'Undermines public trust and leads to severe conflict of interest, bias in awards, and substandard project delivery.',
                'critical'
            )
        """)
        await session.execute(cont3_sql, {"controversy_id": c3_id, "provision_id": p3_id})

        # Revisions for RA 6713
        rev2_id = str(uuid.uuid4())
        rev2_sql = text("""
            INSERT INTO law_revisions (revision_id, law_id, proposed_bill, proposed_changes, sponsor, status)
            VALUES (
                :revision_id,
                :law_id,
                'Senate Bill No. 2449 (Amending RA 6713 Code of Conduct)',
                'Amends Section 11 of RA 6713 to increase administrative and criminal penalties for graft, corruption, conflicts of interest, and ethical violations committed by public officials.',
                'Sen. Ramon Bong Revilla Jr.',
                'pending'
            )
        """)
        await session.execute(rev2_sql, {"revision_id": rev2_id, "law_id": law2_id})

        await session.commit()
        print("Legislation seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed_legislation())
