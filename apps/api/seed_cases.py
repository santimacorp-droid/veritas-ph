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
PACIFIC_ID = "4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a"
ALLIED_ID = "5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b"
NORTHERN_ID = "6f7a8b9c-0d1e-2f3a-4b5c-6d7e8f9a0b1c"


async def seed_cases():
    print("Starting procurement cases seeding...")
    async with async_session_maker() as session:
        # Clean existing cases data (dialect-safe truncation)
        print("Clearing existing procurement cases data...")
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
        ) in cases:
            await session.execute(
                text("""
                    INSERT INTO procurement_cases (
                        case_id, publisher_id, agency_id, procurement_ref_no, title, 
                        procurement_method, category, planned_amount, awarded_amount, 
                        award_date, risk_score, status
                    )
                    VALUES (
                        :cid, :pub_id, :agency_id, :ref_no, :title, 
                        :method, :cat, :planned, :awarded, 
                        :adate, :risk, :status
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
        ]

        for did, cid, dtype, sev, exp, rule, rver, why, thresh, rstatus in discrepancies:
            await session.execute(
                text("""
                    INSERT INTO discrepancies (
                        discrepancy_id, case_id, discrepancy_type, severity, explanation, 
                        rule_id, rule_version, why_fired, thresholds_applied, review_status
                    )
                    VALUES (
                        :did, :cid, :dtype, :sev, :exp, 
                        :rule, :rver, :why, :thresh, :rstatus
                    )
                """),
                {
                    "did": did,
                    "cid": cid,
                    "dtype": dtype,
                    "sev": sev,
                    "exp": exp,
                    "rule": rule,
                    "rver": rver,
                    "why": json.dumps(why),
                    "thresh": json.dumps(thresh),
                    "rstatus": rstatus,
                },
            )

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
            ("proj5", "b1f7e3a8-55c6-89c7-e0f5-4321098765ef", "Pediatric Vaccines Supply", "Vaccine distribution program", "active")
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
            ("loc5", "proj5", "130000000", "NCR", "Metro Manila", "Manila", "Tayuman", 14.6155, 120.9806)
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

        await session.commit()
        print("Procurement cases seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed_cases())
