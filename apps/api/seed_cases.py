"""
apps/api/seed_cases.py

Seeding script for procurement cases, agencies, suppliers, and discrepancies.
Populates historical mock procurement data spanning from 2010 to 2024.
"""

import asyncio
import json
import uuid
from datetime import date

from database import async_session_maker
from sqlalchemy import text

# Fixed UUIDs for consistency
DPWH_ID = "8a7b6c5d-4e3f-2a1b-0c9d-8e7f6a5b4c3d"
DEPED_ID = "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"
DOH_ID = "2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e"

SUNRISE_ID = "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f"
SUNRISE_COLLUSIVE_ID = "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e99"
PACIFIC_ID = "4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a"
ALLIED_ID = "5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b"
NORTHERN_ID = "6f7a8b9c-0d1e-2f3a-4b5c-6d7e8f9a0b1c"


async def seed_cases():
    print("Starting procurement cases seeding...")
    async with async_session_maker() as session:
        # Clean existing cases data (dialect-safe truncation)
        print("Clearing existing procurement cases data...")
        await session.execute(text("DELETE FROM audit_reports"))
        await session.execute(text("DELETE FROM evidence_links"))
        await session.execute(text("DELETE FROM discrepancies"))
        await session.execute(text("DELETE FROM risk_signals"))
        await session.execute(text("DELETE FROM contract_amendments"))
        await session.execute(text("DELETE FROM contracts"))
        await session.execute(text("DELETE FROM awards"))
        await session.execute(text("DELETE FROM project_locations"))
        await session.execute(text("DELETE FROM projects"))
        await session.execute(text("DELETE FROM procurement_events"))
        await session.execute(text("DELETE FROM procurement_cases"))
        await session.execute(text("DELETE FROM corporate_registries"))

        # 1. Seed Agencies
        print("Seeding agencies...")
        agencies = [
            (
                DPWH_ID,
                "pub1",
                "Department of Public Works and Highways",
                "DPWH",
                "000000000",
                "national_agency",
            ),
            (DEPED_ID, "pub1", "Department of Education", "DepEd", "000000000", "national_agency"),
            (DOH_ID, "pub1", "Department of Health", "DOH", "000000000", "national_agency"),
        ]
        for agency_id, pub_id, name, acronym, psgc, atype in agencies:
            await session.execute(
                text("""
                    INSERT INTO agencies (agency_id, publisher_id, name, acronym, psgc_code, agency_type)
                    VALUES (:agency_id, :pub_id, :name, :acronym, :psgc, :atype)
                    ON CONFLICT(agency_id) DO NOTHING
                """),
                {
                    "agency_id": agency_id,
                    "pub_id": pub_id,
                    "name": name,
                    "acronym": acronym,
                    "psgc": psgc,
                    "atype": atype,
                },
            )

        # 2. Seed Suppliers
        print("Seeding suppliers...")
        suppliers = [
            (
                SUNRISE_ID,
                "Sunrise Construction & Supply",
                "sunrise-construction-supply",
                "sole_prop",
                "Quezon City",
                "00-111-222",
                "sunrise@mail.com",
            ),
            (
                PACIFIC_ID,
                "Pacific Builders Corporation",
                "pacific-builders-corporation",
                "corporation",
                "Pasig City",
                "00-333-444",
                "pacific@mail.com",
            ),
            (
                ALLIED_ID,
                "Allied Healthcare Solutions Inc.",
                "allied-healthcare-solutions",
                "corporation",
                "Manila",
                "00-555-666",
                "allied@mail.com",
            ),
            (
                NORTHERN_ID,
                "Northern Trading & Supplies",
                "northern-trading-supplies",
                "partnership",
                "Baguio City",
                "00-777-888",
                "northern@mail.com",
            ),
            (
                SUNRISE_COLLUSIVE_ID,
                "Sunrise Builders & Supply LLC",
                "sunrise-builders-supply",
                "corporation",
                "Quezon City",
                "00-999-000",
                "sunrise-collusive@mail.com",
            ),
        ]
        for supplier_id, name, slug, stype, addr, philgeps, sec in suppliers:
            await session.execute(
                text("""
                    INSERT INTO suppliers (supplier_id, canonical_name, slug, supplier_type, primary_address, philgeps_id, sec_reg_no)
                    VALUES (:supplier_id, :name, :slug, :stype, :addr, :philgeps, :sec)
                    ON CONFLICT(supplier_id) DO NOTHING
                """),
                {
                    "supplier_id": supplier_id,
                    "name": name,
                    "slug": slug,
                    "stype": stype,
                    "addr": addr,
                    "philgeps": philgeps,
                    "sec": sec,
                },
            )

        # 2.5 Seed Corporate Registries
        print("Seeding corporate registries...")
        registries = [
            (
                str(uuid.uuid4()),
                "Sunrise Construction & Supply",
                "SEC-SUNRISE-111",
                "Quezon City",
                ["Juan Dela Cruz", "Maria Dela Cruz"],
                [{"name": "Juan Dela Cruz", "percentage": 80.0}, {"name": "Maria Dela Cruz", "percentage": 20.0}]
            ),
            (
                str(uuid.uuid4()),
                "Sunrise Builders & Supply LLC",
                "SEC-SUNRISE-999",
                "Quezon City",
                ["Juan Dela Cruz", "Maria Dela Cruz"],
                [{"name": "Juan Dela Cruz", "percentage": 60.0}, {"name": "Maria Dela Cruz", "percentage": 40.0}]
            ),
            (
                str(uuid.uuid4()),
                "Pacific Builders Corporation",
                "SEC-PACIFIC-333",
                "Pasig City",
                ["Pacifico Ramos", "Carla Ramos"],
                [{"name": "Pacifico Ramos", "percentage": 90.0}, {"name": "Carla Ramos", "percentage": 10.0}]
            ),
            (
                str(uuid.uuid4()),
                "Northern Trading & Supplies",
                "SEC-NORTH-777",
                "Baguio City",
                ["Northern Director", "Baguio Partner"],
                [{"name": "Northern Director", "percentage": 50.0}, {"name": "Baguio Partner", "percentage": 50.0}]
            ),
            (
                str(uuid.uuid4()),
                "Allied Healthcare Solutions Inc.",
                "SEC-ALLIED-555",
                "Manila",
                ["Allied Director", "Allied Partner"],
                [{"name": "Allied Director", "percentage": 50.0}, {"name": "Allied Partner", "percentage": 50.0}]
            )
        ]

        for rid, name, sec_no, addr, directors, shareholders in registries:
            await session.execute(
                text("""
                    INSERT INTO corporate_registries (registry_id, company_name, registration_no, registered_addr, directors, shareholders)
                    VALUES (:rid, :name, :sec_no, :addr, :directors, :shareholders)
                    ON CONFLICT(registry_id) DO NOTHING
                """),
                {
                    "rid": rid,
                    "name": name,
                    "sec_no": sec_no,
                    "addr": addr,
                    "directors": json.dumps(directors),
                    "shareholders": json.dumps(shareholders),
                }
            )

        # 3. Seed Procurement Cases
        print("Seeding procurement cases...")
        cases = [
            # --- 2010 Case ---
            (
                "c010a9c4-11e2-45e3-a6b1-000000002010",
                "pub1",
                DPWH_ID,
                "PHILGEPS-2010-00124",
                "Construction of Multi-Purpose Hall in Barangay Malate",
                "public_bidding",
                "infrastructure",
                4000000.0,
                3950000.0,
                "2010-04-12",
                0.05,
                "completed",
                "NCR",
            ),
            # --- 2012 Case ---
            (
                "c012a9c4-11e2-45e3-a6b1-000000002012",
                "pub1",
                DPWH_ID,
                "PHILGEPS-2012-00456",
                "Seawall Construction along Cavite Coastline",
                "public_bidding",
                "infrastructure",
                20000000.0,
                19800000.0,
                "2012-08-20",
                0.70,
                "completed",
                "Region IV-A",
            ),
            # --- 2015 Case ---
            (
                "c015a9c4-11e2-45e3-a6b1-000000002015",
                "pub1",
                DEPED_ID,
                "PHILGEPS-2015-00789",
                "Procurement of Elementary School Math Textbooks",
                "public_bidding",
                "goods",
                12000000.0,
                11900000.0,
                "2015-05-18",
                0.25,
                "completed",
                "National",
            ),
            # --- 2018 Case ---
            (
                "c018a9c4-11e2-45e3-a6b1-000000002018",
                "pub1",
                DOH_ID,
                "PHILGEPS-2018-01234",
                "DOH National Immunization Syringes Supply",
                "public_bidding",
                "goods",
                25000000.0,
                24800000.0,
                "2018-11-03",
                0.70,
                "completed",
                "National",
            ),
            # --- 2020 Case ---
            (
                "c020a9c4-11e2-45e3-a6b1-000000002020",
                "pub1",
                DOH_ID,
                "PHILGEPS-2020-00998",
                "Emergency Procurement of COVID PPEs",
                "negotiated",
                "goods",
                80000000.0,
                79500000.0,
                "2020-04-15",
                0.95,
                "completed",
                "National",
            ),
            # --- 2022 Case ---
            (
                "c022a9c4-11e2-45e3-a6b1-000000002022",
                "pub1",
                DPWH_ID,
                "PHILGEPS-2022-03456",
                "DPWH NCR Road Maintenance & Drainage Desilting",
                "public_bidding",
                "infrastructure",
                35000000.0,
                34500000.0,
                "2022-10-24",
                0.70,
                "completed",
                "NCR",
            ),
            # --- 2024 Cases ---
            (
                "d7b3a9c4-11e2-45e3-a6b1-0987654321ab",
                "pub1",
                DPWH_ID,
                "PHILGEPS-2024-08821",
                "Rehabilitation of Manila South Road (KM 12-25)",
                "public_bidding",
                "infrastructure",
                50000000.0,
                48500000.0,
                "2024-03-15",
                0.78,
                "open",
                "Region IV-A",
            ),
            (
                "e8c4b0d5-22f3-56f4-b7c2-1098765432bc",
                "pub1",
                DPWH_ID,
                "DPWH-NCR-2024-0012",
                "Construction of Pasig River Bypass Bridge",
                "negotiated",
                "infrastructure",
                100000000.0,
                99500000.0,
                "2024-04-02",
                0.85,
                "open",
                "NCR",
            ),
            (
                "f9d5c1e6-33a4-67a5-c8d3-2109876543cd",
                "pub1",
                DEPED_ID,
                "DEPED-2024-TX-0091",
                "Procurement of Grade 1-3 Elementary Textbooks",
                "public_bidding",
                "goods",
                15000000.0,
                14500000.0,
                "2024-02-18",
                0.25,
                "open",
                "National",
            ),
            (
                "a0e6d2f7-44b5-78b6-d9e4-3210987654de",
                "pub1",
                DEPED_ID,
                "DEPED-IVA-2024-IT-0112",
                "Supply and Delivery of IT Equipment for Calabarzon Schools",
                "shopping",
                "goods",
                10000000.0,
                9800000.0,
                "2024-05-10",
                0.55,
                "open",
                "Region IV-A",
            ),
            (
                "b1f7e3a8-55c6-89c7-e0f5-4321098765ef",
                "pub1",
                DOH_ID,
                "DOH-CO-2024-VAC-0042",
                "Procurement of Specialized Pediatric Vaccines & Syringes",
                "public_bidding",
                "goods",
                30000000.0,
                29200000.0,
                "2024-03-29",
                0.62,
                "open",
                "National",
            ),
            # --- 2025/2026 Cases (Expanded to exactly 20 total cases) ---
            (
                "c025a9c4-11e2-45e3-a6b1-000000000012",
                "pub1",
                DPWH_ID,
                "PHILGEPS-2025-01012",
                "Ilocos Norte Flood Control Wall Desilting & Repair",
                "public_bidding",
                "infrastructure",
                45000000.0,
                44200000.0,
                "2025-06-12",
                0.68,
                "completed",
                "Region I",
            ),
            (
                "c025a9c4-11e2-45e3-a6b1-000000000013",
                "pub1",
                DPWH_ID,
                "PHILGEPS-2025-01013",
                "Cagayan Valley Agricultural Bypass Bridge Construction",
                "public_bidding",
                "infrastructure",
                62000000.0,
                61500000.0,
                "2025-07-20",
                0.72,
                "completed",
                "Region II",
            ),
            (
                "c025a9c4-11e2-45e3-a6b1-000000000014",
                "pub1",
                DPWH_ID,
                "PHILGEPS-2025-01014",
                "Central Luzon Expressway Drainage Expansion Project",
                "public_bidding",
                "infrastructure",
                120000000.0,
                118500000.0,
                "2025-08-11",
                0.81,
                "completed",
                "Region III",
            ),
            (
                "c025a9c4-11e2-45e3-a6b1-000000000015",
                "pub1",
                DOH_ID,
                "PHILGEPS-2025-01015",
                "Bicol Regional Hospital ICU Wing Extension Construction",
                "public_bidding",
                "infrastructure",
                85000000.0,
                84200000.0,
                "2025-09-02",
                0.75,
                "completed",
                "Region V",
            ),
            (
                "c025a9c4-11e2-45e3-a6b1-000000000016",
                "pub1",
                DPWH_ID,
                "PHILGEPS-2025-01016",
                "Western Visayas Bypass Highway Road Rehabilitation",
                "public_bidding",
                "infrastructure",
                95000000.0,
                94100000.0,
                "2025-05-18",
                0.65,
                "completed",
                "Region VI",
            ),
            (
                "c025a9c4-11e2-45e3-a6b1-000000000017",
                "pub1",
                DPWH_ID,
                "PHILGEPS-2025-01017",
                "Central Visayas Waterfront Pier & Wharf Construction",
                "public_bidding",
                "infrastructure",
                150000000.0,
                149200000.0,
                "2025-03-24",
                0.88,
                "completed",
                "Region VII",
            ),
            (
                "c025a9c4-11e2-45e3-a6b1-000000000018",
                "pub1",
                DEPED_ID,
                "PHILGEPS-2025-01018",
                "Eastern Visayas School Building Reconstruction Program",
                "public_bidding",
                "infrastructure",
                18000000.0,
                17900000.0,
                "2025-04-14",
                0.45,
                "completed",
                "Region VIII",
            ),
            (
                "c025a9c4-11e2-45e3-a6b1-000000000019",
                "pub1",
                DPWH_ID,
                "PHILGEPS-2025-01019",
                "Davao City Coastal Highway Road Embankment",
                "public_bidding",
                "infrastructure",
                210000000.0,
                209500000.0,
                "2025-02-18",
                0.83,
                "completed",
                "Region XI",
            ),
            (
                "c025a9c4-11e2-45e3-a6b1-000000000020",
                "pub1",
                DEPED_ID,
                "PHILGEPS-2025-01020",
                "BARMM Regional Administrative Center Digitization Facilities",
                "public_bidding",
                "goods",
                22000000.0,
                21800000.0,
                "2025-10-09",
                0.35,
                "completed",
                "BARMM",
            ),
        ]

        for (
            cid,
            pub_id,
            agency_id,
            ref_no,
            title,
            method,
            cat,
            planned,
            awarded,
            adate,
            risk,
            status,
            geo_scope,
        ) in cases:
            # Force risk_score to be NULL for clean audit run!
            risk = None
            completeness = None
            confidence = None
            r_comp = {
                "competition": 0.0,
                "timeline": 0.0,
                "financial": 0.0,
                "transparency": 0.0,
                "compliance": 0.0
            }

            await session.execute(
                text("""
                    INSERT INTO procurement_cases (
                        case_id, publisher_id, agency_id, procurement_ref_no, title, 
                        procurement_method, category, planned_amount, awarded_amount, 
                        award_date, risk_score, status, geographic_scope,
                        completeness_score, confidence_score, risk_components
                    )
                    VALUES (
                        :cid, :pub_id, :agency_id, :ref_no, :title, 
                        :method, :cat, :planned, :awarded, 
                        :adate, :risk, :status, :geo_scope,
                        :completeness, :confidence, :components
                    )
                """),
                {
                    "cid": cid,
                    "pub_id": pub_id,
                    "agency_id": agency_id,
                    "ref_no": ref_no,
                    "title": title,
                    "method": method,
                    "cat": cat,
                    "planned": planned,
                    "awarded": awarded,
                    "adate": date.fromisoformat(adate) if adate else None,
                    "risk": risk,
                    "status": status,
                    "geo_scope": geo_scope,
                    "completeness": completeness,
                    "confidence": confidence,
                    "components": json.dumps(r_comp),
                },
            )

        # 4. Seed Discrepancies (Audit Flags)
        print("Seeding audit anomaly flags...")
        discrepancies = [
            (
                str(uuid.uuid4()),
                "c012a9c4-11e2-45e3-a6b1-000000002012",
                "single_bidder_loophole",
                "high",
                "Only a single bidder participated in this seawall bidding process. Detailed specs match regional suppliers catalog.",
                "RULE-001",
                "1.0",
                {"bidder_count": 1},
                {"min_bidders_recommended": 3},
                "confirmed",
            ),
            (
                str(uuid.uuid4()),
                "c018a9c4-11e2-45e3-a6b1-000000002018",
                "single_bidder_loophole",
                "high",
                "A single bidder won the national immunization syringes tender, reducing competitive price discovery.",
                "RULE-001",
                "1.0",
                {"bidder_count": 1},
                {"min_bidders_recommended": 3},
                "confirmed",
            ),
            (
                str(uuid.uuid4()),
                "c020a9c4-11e2-45e3-a6b1-000000002020",
                "negotiated_procurement_overuse",
                "critical",
                "Negotiated emergency procurement was chosen to acquire PPEs in bulk without open competitive bidding.",
                "RULE-002",
                "1.0",
                {"procurement_method": "negotiated"},
                {"permitted_methods": ["public_bidding"]},
                "confirmed",
            ),
            (
                str(uuid.uuid4()),
                "c022a9c4-11e2-45e3-a6b1-000000002022",
                "single_bidder_loophole",
                "high",
                "Bidding desilting maintenance was completed with only one responsive bidder participating.",
                "RULE-001",
                "1.0",
                {"bidder_count": 1},
                {"min_bidders_recommended": 3},
                "confirmed",
            ),
            # 2024 flags
            (
                str(uuid.uuid4()),
                "d7b3a9c4-11e2-45e3-a6b1-0987654321ab",
                "short_posting_window",
                "high",
                "The bid notice was posted for only 4 days on PhilGEPS, which is significantly below the statutory minimum of 7 calendar days.",
                "RULE-002",
                "1.0",
                {"days_posted": 4},
                {"min_required": 7},
                "confirmed",
            ),
            (
                str(uuid.uuid4()),
                "d7b3a9c4-11e2-45e3-a6b1-0987654321ab",
                "budget_splitting",
                "high",
                "Multiple smaller contracts for segment road clearing were awarded to the same contractor in a 15-day window, potentially bypassing public bidding requirements.",
                "RULE-005",
                "1.2",
                {"overlap_days": 15, "sibling_contracts": 3},
                {"max_window_days": 30},
                "confirmed",
            ),
            (
                str(uuid.uuid4()),
                "e8c4b0d5-22f3-56f4-b7c2-1098765432bc",
                "negotiated_procurement_overuse",
                "critical",
                "Negotiated procurement was chosen citing 'emergency cases' under Sec 53, but the project is a standard planned bypass bridge with no active state of emergency documented.",
                "RULE-009",
                "1.0",
                {"procurement_method": "negotiated"},
                {"permitted_methods": ["public_bidding"]},
                "confirmed",
            ),
            (
                str(uuid.uuid4()),
                "a0e6d2f7-44b5-78b6-d9e4-3210987654de",
                "single_bidder_loophole",
                "medium",
                "Only a single bidder participated in this Shopping transaction. Technical specifications matched a proprietary brand catalog directly, excluding competition.",
                "RULE-004",
                "1.1",
                {"bidder_count": 1},
                {"min_bidders_recommended": 3},
                "confirmed",
            ),
            (
                str(uuid.uuid4()),
                "b1f7e3a8-55c6-89c7-e0f5-4321098765ef",
                "supplier_conflict_of_interest",
                "high",
                "The winning bidder's primary shareholder is the spouse of the regional bids and awards committee (BAC) vice-chairman.",
                "RULE-012",
                "1.0",
                {"relationship": "spouse", "role": "BAC Vice-Chairman"},
                {"prohibited": True},
                "confirmed",
            ),
            # --- 2025/2026 Discrepancies ---
            (
                str(uuid.uuid4()),
                "c025a9c4-11e2-45e3-a6b1-000000000012",
                "single_bidder_loophole",
                "high",
                "Only a single bidder participated in this flood control desilting. Specific equipment requirements matched a single local supplier.",
                "RULE-001",
                "1.0",
                {"bidder_count": 1},
                {"min_bidders_recommended": 3},
                "confirmed",
            ),
            (
                str(uuid.uuid4()),
                "c025a9c4-11e2-45e3-a6b1-000000000013",
                "negotiated_procurement_overuse",
                "high",
                "Negotiated procurement used under emergency exemption for a standard pre-planned bridge project, bypassing open competitive bidding.",
                "RULE-002",
                "1.0",
                {"procurement_method": "negotiated"},
                {"permitted_methods": ["public_bidding"]},
                "confirmed",
            ),
            (
                str(uuid.uuid4()),
                "c025a9c4-11e2-45e3-a6b1-000000000014",
                "short_posting_window",
                "high",
                "The PhilGEPS invitation to bid was posted for only 3 days instead of the statutory 7 calendar days.",
                "RULE-002",
                "1.0",
                {"days_posted": 3},
                {"min_required": 7},
                "confirmed",
            ),
            (
                str(uuid.uuid4()),
                "c025a9c4-11e2-45e3-a6b1-000000000015",
                "single_bidder_loophole",
                "high",
                "Standard building construction received only a single bidder after specialized specs excluded local competitors.",
                "RULE-001",
                "1.0",
                {"bidder_count": 1},
                {"min_bidders_recommended": 3},
                "confirmed",
            ),
            (
                str(uuid.uuid4()),
                "c025a9c4-11e2-45e3-a6b1-000000000016",
                "budget_splitting",
                "high",
                "Project divided into 3 identical road clearing contracts awarded within a 10-day window to standard contractor, bypassing thresholds.",
                "RULE-005",
                "1.2",
                {"overlap_days": 10, "sibling_contracts": 3},
                {"max_window_days": 30},
                "confirmed",
            ),
            (
                str(uuid.uuid4()),
                "c025a9c4-11e2-45e3-a6b1-000000000017",
                "negotiated_procurement_overuse",
                "critical",
                "Negotiated emergency procurement used to award a major commercial pier construction contract without competitive bidding.",
                "RULE-009",
                "1.0",
                {"procurement_method": "negotiated"},
                {"permitted_methods": ["public_bidding"]},
                "confirmed",
            ),
            (
                str(uuid.uuid4()),
                "c025a9c4-11e2-45e3-a6b1-000000000018",
                "short_posting_window",
                "medium",
                "The PhilGEPS bidding post was available for only 5 days before closing.",
                "RULE-002",
                "1.0",
                {"days_posted": 5},
                {"min_required": 7},
                "confirmed",
            ),
            (
                str(uuid.uuid4()),
                "c025a9c4-11e2-45e3-a6b1-000000000019",
                "single_bidder_loophole",
                "high",
                "Bid invitation requirements specified patented marine filling material exclusive to a single supplier.",
                "RULE-001",
                "1.0",
                {"bidder_count": 1},
                {"min_bidders_recommended": 3},
                "confirmed",
            ),
            (
                str(uuid.uuid4()),
                "c025a9c4-11e2-45e3-a6b1-000000000020",
                "short_posting_window",
                "medium",
                "Digital equipment posting period was shortened to 4 days.",
                "RULE-002",
                "1.0",
                {"days_posted": 4},
                {"min_required": 7},
                "confirmed",
            ),
        ]

        print("Skipping pre-computed discrepancies seeding for a clean AI audit run.")

        # 5. Seed Awards
        print("Seeding awards...")
        awards = [
            (str(uuid.uuid4()), "c010a9c4-11e2-45e3-a6b1-000000002010", SUNRISE_ID, "2010-04-12", 3950000.0, 5, 0),
            (str(uuid.uuid4()), "c012a9c4-11e2-45e3-a6b1-000000002012", PACIFIC_ID, "2012-08-20", 19800000.0, 1, 1),
            (str(uuid.uuid4()), "c015a9c4-11e2-45e3-a6b1-000000002015", NORTHERN_ID, "2015-05-18", 11900000.0, 4, 0),
            (str(uuid.uuid4()), "c018a9c4-11e2-45e3-a6b1-000000002018", ALLIED_ID, "2018-11-03", 24800000.0, 1, 1),
            (str(uuid.uuid4()), "c020a9c4-11e2-45e3-a6b1-000000002020", SUNRISE_ID, "2020-04-15", 79500000.0, 1, 1),
            (str(uuid.uuid4()), "c022a9c4-11e2-45e3-a6b1-000000002022", SUNRISE_ID, "2022-10-24", 34500000.0, 1, 1),
            # 2024 awards
            (str(uuid.uuid4()), "d7b3a9c4-11e2-45e3-a6b1-0987654321ab", SUNRISE_ID, "2024-03-15", 48500000.0, 3, 0),
            (str(uuid.uuid4()), "e8c4b0d5-22f3-56f4-b7c2-1098765432bc", PACIFIC_ID, "2024-04-02", 99500000.0, 1, 1),
            (str(uuid.uuid4()), "f9d5c1e6-33a4-67a5-c8d3-2109876543cd", NORTHERN_ID, "2024-02-18", 14500000.0, 4, 0),
            (str(uuid.uuid4()), "a0e6d2f7-44b5-78b6-d9e4-3210987654de", NORTHERN_ID, "2024-05-10", 9800000.0, 1, 1),
            (str(uuid.uuid4()), "b1f7e3a8-55c6-89c7-e0f5-4321098765ef", ALLIED_ID, "2024-03-29", 29200000.0, 2, 0),
            # 2025/2026 awards
            (str(uuid.uuid4()), "c025a9c4-11e2-45e3-a6b1-000000000012", SUNRISE_ID, "2025-06-12", 44200000.0, 1, 1),
            (str(uuid.uuid4()), "c025a9c4-11e2-45e3-a6b1-000000000013", PACIFIC_ID, "2025-07-20", 61500000.0, 1, 1),
            (str(uuid.uuid4()), "c025a9c4-11e2-45e3-a6b1-000000000014", PACIFIC_ID, "2025-08-11", 118500000.0, 1, 1),
            (str(uuid.uuid4()), "c025a9c4-11e2-45e3-a6b1-000000000015", SUNRISE_ID, "2025-09-02", 84200000.0, 1, 1),
            (str(uuid.uuid4()), "c025a9c4-11e2-45e3-a6b1-000000000016", SUNRISE_ID, "2025-05-18", 94100000.0, 1, 1),
            (str(uuid.uuid4()), "c025a9c4-11e2-45e3-a6b1-000000000017", PACIFIC_ID, "2025-03-24", 149200000.0, 1, 1),
            (str(uuid.uuid4()), "c025a9c4-11e2-45e3-a6b1-000000000018", SUNRISE_ID, "2025-04-14", 17900000.0, 2, 0),
            (str(uuid.uuid4()), "c025a9c4-11e2-45e3-a6b1-000000000019", PACIFIC_ID, "2025-02-18", 209500000.0, 1, 1),
            (str(uuid.uuid4()), "c025a9c4-11e2-45e3-a6b1-000000000020", NORTHERN_ID, "2025-10-09", 21800000.0, 3, 0),
        ]
        for aid, cid, sid, adate, amt, bcount, sbid in awards:
            await session.execute(
                text("""
                    INSERT INTO awards (award_id, case_id, supplier_id, award_date, amount, bidders_count, single_bidder)
                    VALUES (:aid, :cid, :sid, :adate, :amt, :bcount, :sbid)
                    ON CONFLICT(award_id) DO NOTHING
                """),
                {
                    "aid": aid,
                    "cid": cid,
                    "sid": sid,
                    "adate": date.fromisoformat(adate) if adate else None,
                    "amt": amt,
                    "bcount": bcount,
                    "sbid": bool(sbid),
                },
            )

        # 6. Seed Projects
        print("Seeding projects...")
        projects = [
            ("proj2010", "c010a9c4-11e2-45e3-a6b1-000000002010", "Malate Barangay Hall", "Community hall construction", "completed"),
            ("proj2012", "c012a9c4-11e2-45e3-a6b1-000000002012", "Cavite Coast Seawall", "Coastal protection barrier", "completed"),
            ("proj2015", "c015a9c4-11e2-45e3-a6b1-000000002015", "School Textbooks Procurement", "Grade school printing delivery", "completed"),
            ("proj2018", "c018a9c4-11e2-45e3-a6b1-000000002018", "Syringe Supply", "National health syringes purchase", "completed"),
            ("proj2020", "c020a9c4-11e2-45e3-a6b1-000000002020", "Emergency PPE Procurement", "COVID-19 pandemic supplies", "completed"),
            ("proj2022", "c022a9c4-11e2-45e3-a6b1-000000002022", "Drainage Desilting", "Sewerage desilting maintenance", "completed"),
            # 2024 projects
            ("proj1", "d7b3a9c4-11e2-45e3-a6b1-0987654321ab", "Manila South Road Rehab", "Road rehabilitation work", "active"),
            ("proj2", "e8c4b0d5-22f3-56f4-b7c2-1098765432bc", "Pasig River Bypass Bridge", "Bridge construction project", "active"),
            ("proj3", "f9d5c1e6-33a4-67a5-c8d3-2109876543cd", "Elem Textbooks Distribution", "Textbooks distribution to schools", "active"),
            ("proj4", "a0e6d2f7-44b5-78b6-d9e4-3210987654de", "Calabarzon IT Supply", "IT equipment delivery for schools", "active"),
            ("proj5", "b1f7e3a8-55c6-89c7-e0f5-4321098765ef", "Pediatric Vaccines Supply", "Vaccine distribution program", "active"),
            # 2025/2026 projects
            ("proj12", "c025a9c4-11e2-45e3-a6b1-000000000012", "Ilocos Norte Flood Control Repair", "Flood control wall desilting and repair", "completed"),
            ("proj13", "c025a9c4-11e2-45e3-a6b1-000000000013", "Cagayan Valley Agricultural Bridge", "Agricultural bypass bridge construction", "completed"),
            ("proj14", "c025a9c4-11e2-45e3-a6b1-000000000014", "Central Luzon Expressway Drainage Expansion", "Expressway drainage expansion project", "completed"),
            ("proj15", "c025a9c4-11e2-45e3-a6b1-000000000015", "Bicol Regional Hospital ICU Wing Extension", "ICU wing extension construction", "completed"),
            ("proj16", "c025a9c4-11e2-45e3-a6b1-000000000016", "Western Visayas Bypass Highway Rehabilitation", "Bypass highway road rehabilitation", "completed"),
            ("proj17", "c025a9c4-11e2-45e3-a6b1-000000000017", "Central Visayas Waterfront Pier & Wharf", "Waterfront pier and wharf construction", "completed"),
            ("proj18", "c025a9c4-11e2-45e3-a6b1-000000000018", "Eastern Visayas School Building Reconstruction", "School building reconstruction program", "completed"),
            ("proj19", "c025a9c4-11e2-45e3-a6b1-000000000019", "Davao City Coastal Highway Embankment", "Coastal highway road embankment", "completed"),
            ("proj20", "c025a9c4-11e2-45e3-a6b1-000000000020", "BARMM Regional Administrative Center Digitization", "Digitization facilities supply", "completed"),
        ]
        for pid, cid, name, desc, status in projects:
            await session.execute(
                text("""
                    INSERT INTO projects (project_id, case_id, name, description, status)
                    VALUES (:pid, :cid, :name, :desc, :status)
                    ON CONFLICT(project_id) DO NOTHING
                """),
                {"pid": pid, "cid": cid, "name": name, "desc": desc, "status": status}
            )

        # 7. Seed Project Locations
        print("Seeding project locations...")
        locations = [
            ("loc2010", "proj2010", "130000000", "NCR", "Metro Manila", "Manila", "Malate", 14.5688, 120.9912),
            ("loc2012", "proj2012", "040000000", "Region IV-A", "Cavite", "Cavite City", "Coastal", 14.4820, 120.9015),
            ("loc2015", "proj2015", "130000000", "NCR", "Metro Manila", "Pasig", "Oran", 14.5772, 121.0664),
            ("loc2018", "proj2018", "130000000", "NCR", "Metro Manila", "Manila", "Tayuman", 14.6155, 120.9806),
            ("loc2020", "proj2020", "130000000", "NCR", "Metro Manila", "Manila", "Tayuman", 14.6155, 120.9806),
            ("loc2022", "proj2022", "130000000", "NCR", "Metro Manila", "Manila", "Intramuros", 14.5880, 120.9750),
            # 2024 locations
            ("loc1", "proj1", "130000000", "NCR", "Metro Manila", "Manila", "Malate", 14.5700, 120.9900),
            ("loc2", "proj2", "130000000", "NCR", "Metro Manila", "Pasig", "Bani", 14.5621, 121.0583),
            ("loc3", "proj3", "130000000", "NCR", "Metro Manila", "Pasig", "Oran", 14.5772, 121.0664),
            ("loc4", "proj4", "040000000", "Region IV-A", "Cavite", "Calabarzon", "Regional", 14.2152, 121.1559),
            ("loc5", "proj5", "130000000", "NCR", "Metro Manila", "Manila", "Tayuman", 14.6155, 120.9806),
            # 2025/2026 locations
            ("loc12", "proj12", "010000000", "Region I", "Ilocos Norte", "Laoag", "Barangay 1", 18.1960, 120.5927),
            ("loc13", "proj13", "020000000", "Region II", "Cagayan", "Tuguegarao", "Barangay 2", 17.6132, 121.7270),
            ("loc14", "proj14", "030000000", "Region III", "Pampanga", "San Fernando", "Barangay 3", 15.0333, 120.6833),
            ("loc15", "proj15", "050000000", "Region V", "Albay", "Legazpi", "Barangay 5", 13.1372, 123.7438),
            ("loc16", "proj16", "060000000", "Region VI", "Iloilo", "Iloilo City", "Barangay 6", 10.6969, 122.5644),
            ("loc17", "proj17", "070000000", "Region VII", "Cebu", "Cebu City", "Waterfront", 10.2931, 123.9015),
            ("loc18", "proj18", "080000000", "Region VIII", "Leyte", "Tacloban", "Barangay 8", 11.2444, 125.0038),
            ("loc19", "proj19", "110000000", "Region XI", "Davao del Sur", "Davao City", "Coastal", 7.0731, 125.6128),
            ("loc20", "proj20", "150000000", "BARMM", "Maguindanao", "Cotabato City", "Administrative", 7.2236, 124.2464),
        ]
        for lid, pid, psgc, region, prov, city, brgy, lat, lon in locations:
            await session.execute(
                text("""
                    INSERT INTO project_locations (location_id, project_id, psgc_code, region, province, city_municipality, barangay, latitude, longitude)
                    VALUES (:lid, :pid, :psgc, :region, :prov, :city, :brgy, :lat, :lon)
                    ON CONFLICT(location_id) DO NOTHING
                """),
                {"lid": lid, "pid": pid, "psgc": psgc, "region": region, "prov": prov, "city": city, "brgy": brgy, "lat": lat, "lon": lon}
            )

        # 8. Seed Procurement Events (Timelines) for all cases
        print("Seeding procurement timeline events...")
        for (
            cid,
            pub_id,
            agency_id,
            ref_no,
            title,
            method,
            cat,
            planned,
            awarded,
            adate,
            risk,
            status,
            geo_scope,
        ) in cases:
            if adate:
                from datetime import datetime, timedelta
                aw_date = date.fromisoformat(adate)
                events_to_seed = [
                    (str(uuid.uuid4()), cid, "planning", "app_entry", aw_date - timedelta(days=60), planned),
                    (str(uuid.uuid4()), cid, "tender", "bid_notice", aw_date - timedelta(days=30), planned),
                    (str(uuid.uuid4()), cid, "award", "noa", aw_date, awarded),
                    (str(uuid.uuid4()), cid, "contract", "contract", aw_date + timedelta(days=10), awarded),
                    (str(uuid.uuid4()), cid, "implementation", "ntp", aw_date + timedelta(days=15), awarded),
                ]
                for ev_id, case_id, stage, ev_type, ev_date, amt in events_to_seed:
                    await session.execute(
                        text("""
                            INSERT INTO procurement_events (event_id, case_id, stage, event_type, event_date, amount)
                            VALUES (:ev_id, :case_id, :stage, :ev_type, :ev_date, :amt)
                            ON CONFLICT(event_id) DO NOTHING
                        """),
                        {
                            "ev_id": ev_id,
                            "case_id": case_id,
                            "stage": stage,
                            "ev_type": ev_type,
                            "ev_date": ev_date,
                            "amt": amt,
                        }
                    )

        await session.commit()
        print("Procurement cases seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed_cases())
