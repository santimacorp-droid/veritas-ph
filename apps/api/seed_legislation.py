"""
apps/api/seed_legislation.py

Seeding script for the Legislation & Controversial Laws module.
Populates sample laws, provisions, controversies, and revisions using explicit UUID generation.
"""

import asyncio
import uuid
import json
from datetime import datetime, date

from database import async_session_maker
from sqlalchemy import text


async def seed_legislation():
    print("Starting legislation seeding...")
    async with async_session_maker() as session:
        # Truncate tables to ensure fresh seed
        await session.execute(text("TRUNCATE TABLE law_revisions, law_case_links CASCADE"))
        await session.execute(text("TRUNCATE TABLE law_analyses, law_controversies, law_provisions, laws CASCADE"))

        # ─── 1. Republic Act No. 9184 ─────────────────────────────────────────
        law1_id = str(uuid.uuid4())
        law1_sql = text("""
            INSERT INTO laws (law_id, title, short_title, description, date_passed, status, category)
            VALUES (
                :law_id,
                'An Act Providing for the Modernization, Standardization and Regulation of the Procurement Activities of the Government and for Other Purposes',
                'Republic Act No. 9184',
                'Commonly known as the Government Procurement Reform Act (GPRA). Passed in 2003, it governs all procurement activities across national government agencies, GOCCs, and local government units in the Philippines.',
                '2003-01-10',
                'active',
                'republic_act'
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

        # Analysis for RA 9184
        await session.execute(
            text("""
                INSERT INTO law_analyses (
                    analysis_id, law_id, model_used, integrity_score, governance_score, loopholes, pros, cons, 
                    suggested_revisions, citizen_summary, analysis_status, completed_at
                )
                VALUES (
                    :aid, :lid, 'seed', 72.0, 68.0, :loops, :pros, :cons, :revisions, :summary, 'completed', :completed
                )
            """),
            {
                "aid": str(uuid.uuid4()),
                "lid": law1_id,
                "loops": json.dumps([
                    {"title": "Single Bidder Loophole", "description": "Allows public bidding to proceed with only one bidder, reducing competitiveness.", "severity": "high"},
                    {"title": "Negotiated Procurement Abuse", "description": "Vague conditions for emergency exceptions lead to direct award favoritism.", "severity": "critical"}
                ]),
                "pros": json.dumps(["Establishes a standardized framework", "Mandates public posting of bids"]),
                "cons": json.dumps(["Complex bureaucratic overhead", "Slow dispute resolution"]),
                "revisions": json.dumps(["Mandate beneficial ownership disclosure", "Enforce dynamic price references"]),
                "summary": "The main procurement law of the Philippines. While standardized, it contains major loopholes around negotiated procurement and single bids.",
                "completed": datetime.now()
            }
        )

        # ─── 2. Republic Act No. 6713 ─────────────────────────────────────────
        law2_id = str(uuid.uuid4())
        law2_sql = text("""
            INSERT INTO laws (law_id, title, short_title, description, date_passed, status, category)
            VALUES (
                :law_id,
                'An Act Establishing a Code of Conduct and Ethical Standards for Public Officials and Employees, to Uphold the Time-Honored Principle of Public Office being a Public Trust',
                'Republic Act No. 6713',
                'Code of Conduct and Ethical Standards for Public Officials and Employees. Enacted in 1989, it defines conflict of interest, gift-giving prohibitions, and financial disclosures.',
                '1989-02-20',
                'active',
                'republic_act'
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

        # Analysis for RA 6713
        await session.execute(
            text("""
                INSERT INTO law_analyses (
                    analysis_id, law_id, model_used, integrity_score, governance_score, loopholes, pros, cons, 
                    suggested_revisions, citizen_summary, analysis_status, completed_at
                )
                VALUES (
                    :aid, :lid, 'seed', 85.0, 75.0, :loops, :pros, :cons, :revisions, :summary, 'completed', :completed
                )
            """),
            {
                "aid": str(uuid.uuid4()),
                "lid": law2_id,
                "loops": json.dumps([
                    {"title": "Indirect Relative Ownership", "description": "Conflict of interest checks can be bypassed by using extended family members or dummy shareholders.", "severity": "critical"}
                ]),
                "pros": json.dumps(["Establishes clear ethical standards", "Requires public assets disclosure (SALN)"]),
                "cons": json.dumps(["Lacks independent enforcement body", "Weak punitive actions for minor infractions"]),
                "revisions": json.dumps(["Create an independent ethics commission", "Incorporate digital beneficial ownership mappings"]),
                "summary": "Establishes ethical guidelines and conflict of interest declarations, but suffers from indirect relative ownership loopholes.",
                "completed": datetime.now()
            }
        )

        # ─── 3. GPPB Resolution No. 09-2020 ───────────────────────────────────
        law3_id = str(uuid.uuid4())
        law3_sql = text("""
            INSERT INTO laws (law_id, title, short_title, description, date_passed, status, category)
            VALUES (
                :law_id,
                'Approving the Guidelines for the Conduct of Procurement Activities during a State of Calamity, or Implementation of Community Quarantine',
                'GPPB Resolution No. 09-2020',
                'Issued by the Government Procurement Policy Board (GPPB) to streamline negotiated procurement rules during public emergencies and community quarantines.',
                '2020-04-07',
                'active',
                'gppb_resolution'
            )
        """)
        await session.execute(law3_sql, {"law_id": law3_id})

        p4_id = str(uuid.uuid4())
        prov4_sql = text("""
            INSERT INTO law_provisions (provision_id, law_id, section_number, title, content)
            VALUES (
                :provision_id,
                :law_id,
                'Section 3.0',
                'Emergency Negotiated Procurement',
                'Enables government agencies to directly negotiate with capable suppliers for essential goods, equipment, and civil works during a state of calamity or quarantine, bypassing the long public bidding window.'
            )
        """)
        await session.execute(prov4_sql, {"provision_id": p4_id, "law_id": law3_id})

        c4_id = str(uuid.uuid4())
        cont4_sql = text("""
            INSERT INTO law_controversies (controversy_id, provision_id, issue_description, impact, severity)
            VALUES (
                :controversy_id,
                :provision_id,
                'Lack of real-time price monitoring and validation during emergency shopping.',
                'Led to several highly publicized purchase anomalies for medical equipment and masks at inflated rates.',
                'critical'
            )
        """)
        await session.execute(cont4_sql, {"controversy_id": c4_id, "provision_id": p4_id})

        # Analysis for GPPB Resolution 09-2020
        await session.execute(
            text("""
                INSERT INTO law_analyses (
                    analysis_id, law_id, model_used, integrity_score, governance_score, loopholes, pros, cons, 
                    suggested_revisions, citizen_summary, analysis_status, completed_at
                )
                VALUES (
                    :aid, :lid, 'seed', 50.0, 60.0, :loops, :pros, :cons, :revisions, :summary, 'completed', :completed
                )
            """),
            {
                "aid": str(uuid.uuid4()),
                "lid": law3_id,
                "loops": json.dumps([
                    {"title": "No Price Validation Ceiling", "description": "Bypassing the standard ABC guidelines without a secondary emergency price index cap.", "severity": "critical"}
                ]),
                "pros": json.dumps(["Accelerates procurement during crisis", "Reduces red tape"]),
                "cons": json.dumps(["High transparency risk", "No competitive pricing checks"]),
                "revisions": json.dumps(["Establish a mandatory real-time emergency price reference registry"]),
                "summary": "Streamlines emergency purchases but creates large transparency risks by removing price validation checkpoints.",
                "completed": datetime.now()
            }
        )

        # ─── 4. COA Circular No. 2012-003 ─────────────────────────────────────
        law4_id = str(uuid.uuid4())
        law4_sql = text("""
            INSERT INTO laws (law_id, title, short_title, description, date_passed, status, category)
            VALUES (
                :law_id,
                'Guidelines for the Prevention and Disallowance of Irregular, Unnecessary, Excessive, Extravagant and Unconscionable (IUEEU) Expenditures',
                'COA Circular No. 2012-003',
                'Commission on Audit (COA) guidelines outlining standards to identify and disallow wasteful, excessive, and irregular spending of government funds.',
                '2012-10-29',
                'active',
                'coa_circular'
            )
        """)
        await session.execute(law4_sql, {"law_id": law4_id})

        p5_id = str(uuid.uuid4())
        prov5_sql = text("""
            INSERT INTO law_provisions (provision_id, law_id, section_number, title, content)
            VALUES (
                :provision_id,
                :law_id,
                'Section 4.0',
                'Irregular Expenditures',
                'An expenditure is irregular if it is incurred without adhering to established rules, regulations, procedural guidelines, or statutory ceilings (such as RA 9184 standards).'
            )
        """)
        await session.execute(prov5_sql, {"provision_id": p5_id, "law_id": law4_id})

        c5_id = str(uuid.uuid4())
        cont5_sql = text("""
            INSERT INTO law_controversies (controversy_id, provision_id, issue_description, impact, severity)
            VALUES (
                :controversy_id,
                :provision_id,
                'Subjective interpretations of wasteful spending by individual auditing teams.',
                'Creates a chilling effect where local officials delay projects out of fear of audit disallowance notices.',
                'medium'
            )
        """)
        await session.execute(cont5_sql, {"controversy_id": c5_id, "provision_id": p5_id})

        # Analysis for COA Circular 2012-003
        await session.execute(
            text("""
                INSERT INTO law_analyses (
                    analysis_id, law_id, model_used, integrity_score, governance_score, loopholes, pros, cons, 
                    suggested_revisions, citizen_summary, analysis_status, completed_at
                )
                VALUES (
                    :aid, :lid, 'seed', 80.0, 78.0, :loops, :pros, :cons, :revisions, :summary, 'completed', :completed
                )
            """),
            {
                "aid": str(uuid.uuid4()),
                "lid": law4_id,
                "loops": json.dumps([
                    {"title": "Subjective Waste Assessment", "description": "Auditors have broad discretion to define what is 'unnecessary' or 'excessive', leading to inconsistent disallowance notices.", "severity": "medium"}
                ]),
                "pros": json.dumps(["Deters extravagant spending", "Provides robust legal baseline for audit disallowances"]),
                "cons": json.dumps(["Creates fear of implementation", "Inconsistent rulings"]),
                "revisions": json.dumps(["Create quantitative benchmark matrix for excessive costs"]),
                "summary": "Crucial audit guidelines against wasteful spending, though can result in delays due to subjective auditor definitions.",
                "completed": datetime.now()
            }
        )

        await session.commit()
        print("Legislation seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed_legislation())
