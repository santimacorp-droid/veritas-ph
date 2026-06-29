import asyncio
import re
import uuid
from datetime import date

import httpx
import random

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
]
import structlog
from bs4 import BeautifulSoup
from database import async_session_maker
from sqlalchemy import text


logger = structlog.get_logger()

# Real curated Philippine legislation for robust fallback / initial seeding
REAL_LEGISLATION_DATA = [
    {
        "title": "An Act Declaring Forfeiture in Favor of the State any Property Unlawfully Acquired by any Public Officer or Employee and Providing for the Procedure therefor",
        "short_title": "Republic Act No. 1379",
        "description": "Passed in 1955, this law establishes the civil forfeiture process for properties acquired by public officers and employees that are manifestly out of proportion to their lawful income.",
        "date_passed": "1955-06-18",
        "status": "active",
        "author": "Sen. Lorenzo Tañada",
        "sponsor": "Sen. Lorenzo Tañada",
        "approved_by": "President Ramon Magsaysay",
        "submitted_by": "Committee on Civil Service",
        "voting_record": "Unanimously passed by voice vote (viva voce) in both chambers",
        "provisions": [
            {
                "section_number": "Section 2",
                "title": "Filing of Petition",
                "content": "Whenever a public officer or employee has acquired during his incumbency an amount of property which is manifestly out of proportion to his salary as such public officer or employee and to his other lawful income and the income from his legitimately acquired property, such property shall be presumed prima facie to have been unlawfully acquired."
            },
            {
                "section_number": "Section 6",
                "title": "Judgment",
                "content": "If the respondent is unable to show to the satisfaction of the court that he has lawfully acquired the property in question, then the court shall declare such property forfeited in favor of the State, and may enjoin the respondent from disposing of the same."
            }
        ],
        "controversies": [
            {
                "section_number": "Section 2",
                "issue_description": "Lack of real-time asset tracking and registries makes establishing the prima facie disproportionate wealth presumption extremely difficult.",
                "impact": "Delays prosecution of corrupt officials who can easily hide wealth under shell accounts and nominees.",
                "severity": "high"
            }
        ]
    },
    {
        "title": "An Act Providing for the Modernization, Standardization and Regulation of the Procurement Activities of the Government and for Other Purposes",
        "short_title": "Republic Act No. 9184",
        "description": "The Government Procurement Reform Act (GPRA), passed in 2003, governs all procurement activities across national agencies, GOCCs, and local government units in the Philippines.",
        "date_passed": "2003-01-10",
        "status": "repealed",
        "superseded_by_short_title": "Republic Act No. 12009",
        "author": "Committee on Appropriations / Committee on Good Government",
        "sponsor": "Sen. Aquilino Pimentel Jr. / Rep. Luis Villafuerte",
        "approved_by": "President Gloria Macapagal-Arroyo",
        "submitted_by": "Bicameral Conference Committee Report",
        "voting_record": "Senate: 22-0, House: 184-0",
        "provisions": [
            {
                "section_number": "Section 36",
                "title": "Single Calculated/Rated Responsive Bid",
                "content": "A Single Calculated/Rated Responsive Bid (SCRB) shall be considered for award if it meets the requirements, particularly in cases where only one bidder submits a bid, or where after evaluation, only one bidder meets the criteria."
            },
            {
                "section_number": "Section 53",
                "title": "Negotiated Procurement",
                "content": "Negotiated Procurement is a method of procurement of Goods, Infrastructure Projects and Consulting Services, whereby the Procuring Entity directly negotiates a contract with a technically, legally and financially capable supplier, contractor or consultant in highly exceptional cases."
            }
        ],
        "controversies": [
            {
                "section_number": "Section 36",
                "issue_description": "The Single Bidder loophole allows bidding to proceed even when only one supplier participates, which often conceals tailored specifications designed to exclude others.",
                "impact": "Severely limits price discovery and restricts competitive market access.",
                "severity": "high"
            },
            {
                "section_number": "Section 53",
                "issue_description": "Abuse of Negotiated Procurement clauses (emergency, adjacent, or take-over contracts) to bypass competitive public bidding entirely.",
                "impact": "Creates high vulnerability to favoritism and overpriced contracts.",
                "severity": "critical"
            }
        ],
        "revisions": [
            {
                "proposed_bill": "House Bill No. 9648 (New Government Procurement Act / RA 12009)",
                "proposed_changes": "A comprehensive overhaul of RA 9184 to mandate the digitization of bidder registries, introduce standard dynamic price reference indexes, enforce ultimate beneficial ownership disclosure, and streamline procurement modalities.",
                "sponsor": "Rep. Miro Quimbo, et al.",
                "status": "approved"
            }
        ]
    },
    {
        "title": "An Act Establishing a Code of Conduct and Ethical Standards for Public Officials and Employees",
        "short_title": "Republic Act No. 6713",
        "description": "Enacted in 1989, it defines conflict of interest, gift-giving prohibitions, and financial disclosures for public employees to uphold public trust.",
        "date_passed": "1989-02-20",
        "status": "active",
        "author": "Sen. Jovito Salonga",
        "sponsor": "Sen. Jovito Salonga",
        "approved_by": "President Corazon C. Aquino",
        "submitted_by": "Senate Blue Ribbon Committee",
        "voting_record": "Senate: 23-0, House: 174-0",
        "provisions": [
            {
                "section_number": "Section 7(a)",
                "title": "Financial and Material Interest",
                "content": "Public officials and employees shall not, directly or indirectly, have any financial or material interest in any transaction requiring the approval of their office."
            }
        ],
        "controversies": [
            {
                "section_number": "Section 7(a)",
                "issue_description": "Indirect ownership loophole. Public officials hide business interests behind close relatives or shell companies to bid on contracts managed by their own agency.",
                "impact": "Severe conflict of interest and potential bias in the evaluation and awarding of bids.",
                "severity": "critical"
            }
        ],
        "revisions": [
            {
                "proposed_bill": "Senate Bill No. 2449 (Amending RA 6713 Code of Conduct)",
                "proposed_changes": "Amends Section 11 of RA 6713 to increase administrative and criminal penalties for graft, corruption, conflicts of interest, and ethical violations committed by public officials.",
                "sponsor": "Sen. Ramon Bong Revilla Jr.",
                "status": "pending"
            }
        ]
    },
    {
        "title": "An Act Providing for the New Government Procurement Act",
        "short_title": "Republic Act No. 12009",
        "description": "The New Government Procurement Act (NGPA), signed in 2024, modernizes public bidding through digitization, beneficial ownership disclosure, and sustainability standards.",
        "date_passed": "2024-07-20",
        "status": "active",
        "author": "Committee on Finance / Committee on Good Government",
        "sponsor": "Sen. Sonny Angara / Rep. Jose Aquino",
        "approved_by": "President Ferdinand Marcos Jr.",
        "submitted_by": "Filed on Feb 2024 (Senate Bill No. 2593)",
        "voting_record": "Senate: 21-0, House: 228-0",
        "provisions": [
            {
                "section_number": "Section 12",
                "title": "Early Procurement Activities",
                "content": "Procuring entities are authorized to undertake early procurement activities, short of award, from the time of the submission of the proposed budget to Congress or LGU local councils..."
            },
            {
                "section_number": "Section 26",
                "title": "Procurement Methods",
                "content": "Competitive Bidding shall be the default mode of procurement. Alternative methods of procurement shall be allowed only in highly exceptional cases as provided for under this Act."
            },
            {
                "section_number": "Section 28",
                "title": "Limited Source Bidding",
                "content": "Limited Source Bidding, otherwise known as selective bidding, is a method of procurement of Goods and Consulting Services that involves direct invitation to bid by the Procuring Entity from a list of pre-selected suppliers..."
            },
            {
                "section_number": "Section 82",
                "title": "Disclosure of Beneficial Ownership",
                "content": "All bidders shall be required to disclose their ultimate beneficial ownership information in the bidder registry system."
            }
        ],
        "controversies": [
            {
                "section_number": "Section 26",
                "issue_description": "Vague rules regarding the justification criteria for emergency procurement exceptions in remote municipal jurisdictions.",
                "impact": "Risk of local government units self-certifying emergencies to bypass bidding controls.",
                "severity": "medium"
            }
        ],
        "category": "republic_act"
    },
    {
        "title": "Approving the Guidelines for the Conduct of Procurement Activities during a State of Calamity, or Implementation of Community Quarantine",
        "short_title": "GPPB Resolution No. 09-2020",
        "description": "Issued in 2020 by the Government Procurement Policy Board to streamline emergency procurement procedures during national calamities and pandemics.",
        "date_passed": "2020-04-07",
        "status": "active",
        "author": "Government Procurement Policy Board",
        "approved_by": "GPPB Chairman",
        "category": "gppb_resolution",
        "provisions": [
            {
                "section_number": "Section 3",
                "title": "Emergency Procurement Guidelines",
                "content": "Allows procuring entities to directly negotiate contracts with capable suppliers, contractors, or consultants for goods, infrastructure, and services in response to a state of calamity or quarantine."
            }
        ],
        "controversies": [
            {
                "section_number": "Section 3",
                "issue_description": "Lack of pricing caps or centralized price monitoring for emergency items under negotiated procurement.",
                "impact": "High risk of overpriced public spending and supplier favoritism.",
                "severity": "critical"
            }
        ]
    },
    {
        "title": "Guidelines for the Prevention and Disallowance of Irregular, Unnecessary, Excessive, Extravagant and Unconscionable (IUEEU) Expenditures",
        "short_title": "COA Circular No. 2012-003",
        "description": "Enacted by the Commission on Audit in 2012 to establish rules and standards against wasteful, unnecessary, or non-compliant public spending.",
        "date_passed": "2012-10-29",
        "status": "active",
        "author": "Commission on Audit",
        "approved_by": "COA Chairperson",
        "category": "coa_circular",
        "provisions": [
            {
                "section_number": "Section 4.0",
                "title": "Definition of Irregular Expenditures",
                "content": "An expenditure is irregular if it is incurred without adhering to established rules, regulations, procedural guidelines, or statutory ceilings (such as RA 9184 standards)."
            }
        ],
        "controversies": [
            {
                "section_number": "Section 4.0",
                "issue_description": "Subjective application of 'unnecessary' or 'excessive' standards by individual audit teams.",
                "impact": "Can lead to inconsistent disallowance rulings and delay key infrastructure projects due to audit fear.",
                "severity": "medium"
            }
        ]
    }
]


async def parse_bookshelf_provisions(html_text: str, ra_short: str, logger_ref) -> list:
    """
    Two-pass section parser for SC E-Library bookshelf pages.

    Pass 1: div[align="justify"] elements (standard E-Library layout).
    Pass 2: Fallback to <p> tags if Pass 1 yields < 2 sections.

    Handles:
    - "SECTION 1. Title - Content" (with em-dash or hyphen separator)
    - "SEC. 2. Content only" (no title, no dash)
    - "SECTION 1. June 22 is declared..." (short laws with no title)
    - Subsection paragraphs (appended to parent section content)

    Returns list of {section_number, title, content} dicts.
    If fewer than 2 sections found, returns [] to signal 'incomplete'.
    """
    sec_re = re.compile(
        r'^(SEC(?:TION)?\.?\s+\d+)\.?\s*(.*?)(?:\s+[-\u2014\u2013]\s+(.*))?$',
        re.IGNORECASE | re.DOTALL
    )
    sig_re = re.compile(r'Approved:|\(SGD\.\)|Passed by the|Approved,', re.IGNORECASE)

    def _parse_blocks(blocks: list) -> list:
        provisions = []
        current_sec = None
        current_title = ""
        current_paragraphs = []

        for raw in blocks:
            txt = re.sub(r'\s+', ' ', raw).strip()
            if not txt:
                continue
            if "Be it enacted" in txt:
                continue

            m = sec_re.match(txt)
            if m:
                # Flush previous section
                if current_sec:
                    provisions.append({
                        "section_number": current_sec,
                        "title": current_title,
                        "content": "\n\n".join(current_paragraphs).strip()
                    })
                current_sec = m.group(1).strip()
                g2 = (m.group(2) or "").strip()
                g3 = m.group(3)
                if g3 is not None:
                    # Has "Title - Content" pattern
                    title_part = re.sub(r'[\s\.]+$', '', g2)
                    content_part = g3.strip()
                else:
                    # No dash separator — entire remainder is content
                    title_part = ""
                    content_part = g2
                current_title = title_part
                current_paragraphs = [content_part] if content_part else []
            else:
                if current_sec:
                    current_paragraphs.append(txt)

        # Flush final section
        if current_sec:
            last = "\n\n".join(current_paragraphs).strip()
            sig = sig_re.search(last)
            if sig:
                last = last[:sig.start()].strip()
            provisions.append({
                "section_number": current_sec,
                "title": current_title,
                "content": last
            })
        return provisions

    soup = BeautifulSoup(html_text, "html.parser")
    content_div = soup.find("div", class_="single_content") or soup.body or soup

    # Pass 1: div[align="justify"] (standard E-Library format)
    divs = content_div.find_all("div", align="justify")
    provisions = _parse_blocks([d.get_text(separator=" ") for d in divs])
    if len(provisions) >= 2:
        logger_ref.debug(f"Pass 1 succeeded for {ra_short}: {len(provisions)} sections")
        return provisions

    # Pass 2: <p> tag fallback
    logger_ref.info(f"Pass 1 found {len(provisions)} sections for {ra_short}. Trying <p> fallback...")
    paras = content_div.find_all("p")
    provisions = _parse_blocks([p.get_text(separator=" ") for p in paras])
    if len(provisions) >= 2:
        logger_ref.debug(f"Pass 2 succeeded for {ra_short}: {len(provisions)} sections")
        return provisions

    logger_ref.warning(f"Both passes failed for {ra_short}. Will store as incomplete.")
    return []


async def ingest_laws_batch(laws_to_ingest: list) -> int:
    discovered_count = 0
    async with async_session_maker() as session:
        for law_data in laws_to_ingest:
            # Skip if already in DB
            res = await session.execute(
                text("SELECT law_id FROM laws WHERE short_title = :st OR title = :t"),
                {"st": law_data["short_title"], "t": law_data["title"]}
            )
            if res.mappings().first():
                logger.debug(f"Already exists: {law_data['short_title']}")
                continue

            law_id = str(uuid.uuid4())
            law_status = law_data.get("status", "active")

            try:
                dp = law_data.get("date_passed")
                date_val = date.fromisoformat(dp) if dp else None
            except (ValueError, TypeError):
                date_val = None

            await session.execute(
                text("""
                    INSERT INTO laws (
                        law_id, title, short_title, description, date_passed, status,
                        author, sponsor, approved_by, superseded_by_short_title, category,
                        submitted_by, voting_record
                    ) VALUES (
                        :law_id, :title, :short_title, :description, :date_passed, :status,
                        :author, :sponsor, :approved_by, :superseded, :category,
                        :submitted, :voting
                    )
                """),
                {
                    "law_id": law_id,
                    "title": law_data["title"],
                    "short_title": law_data["short_title"],
                    "description": law_data["description"],
                    "date_passed": date_val,
                    "status": law_status,
                    "author": law_data.get("author"),
                    "sponsor": law_data.get("sponsor"),
                    "approved_by": law_data.get("approved_by"),
                    "superseded": law_data.get("superseded_by_short_title"),
                    "category": law_data.get("category", "republic_act"),
                    "submitted": law_data.get("submitted_by"),
                    "voting": law_data.get("voting_record")
                }
            )

            # Insert provisions
            for prov in law_data.get("provisions", []):
                prov_id = str(uuid.uuid4())
                await session.execute(
                    text("""
                        INSERT INTO law_provisions (provision_id, law_id, section_number, title, content)
                        VALUES (:provision_id, :law_id, :section_number, :title, :content)
                    """),
                    {
                        "provision_id": prov_id,
                        "law_id": law_id,
                        "section_number": prov["section_number"],
                        "title": prov.get("title", ""),
                        "content": prov["content"]
                    }
                )
                # Link controversies to provisions
                for cont in law_data.get("controversies", []):
                    if cont["section_number"] == prov["section_number"]:
                        await session.execute(
                            text("""
                                INSERT INTO law_controversies (
                                    controversy_id, provision_id, issue_description, impact, severity
                                ) VALUES (
                                    :controversy_id, :provision_id, :issue_description, :impact, :severity
                                )
                            """),
                            {
                                "controversy_id": str(uuid.uuid4()),
                                "provision_id": prov_id,
                                "issue_description": cont["issue_description"],
                                "impact": cont["impact"],
                                "severity": cont["severity"]
                            }
                        )

            # Ingest default pending analysis for active laws
            if law_status in ("active", "repealed"):
                await session.execute(
                    text("""
                        INSERT INTO law_analyses (
                            analysis_id, law_id, model_used, pros, cons, loopholes,
                            suggested_revisions, citizen_summary, analysis_status, requested_by
                        ) VALUES (
                            :analysis_id, :law_id, 'pending', '[]', '[]', '[]', '[]',
                            'Waiting in queue...', 'pending', 'law_crawler'
                        )
                    """),
                    {
                        "analysis_id": str(uuid.uuid4()),
                        "law_id": law_id
                    }
                )

            # Insert revisions
            for rev in law_data.get("revisions", []):
                await session.execute(
                    text("""
                        INSERT INTO law_revisions (revision_id, law_id, proposed_bill, proposed_changes, sponsor, status)
                        VALUES (:revision_id, :law_id, :proposed_bill, :proposed_changes, :sponsor, :status)
                    """),
                    {
                        "revision_id": str(uuid.uuid4()),
                        "law_id": law_id,
                        "proposed_bill": rev["proposed_bill"],
                        "proposed_changes": rev["proposed_changes"],
                        "sponsor": rev.get("sponsor"),
                        "status": rev.get("status", "pending")
                    }
                )

            discovered_count += 1
        await session.commit()
    return discovered_count


async def fetch_laws() -> dict:
    # 1. Ingest seed laws first thing on startup
    logger.info("Ingesting curated seed laws on startup...")
    seeds_count = await ingest_laws_batch(REAL_LEGISLATION_DATA)
    logger.info(f"Curated seed laws ingestion complete: {seeds_count} new laws added.")

    logger.info("Law Crawler starting: SC E-Library full-text discovery phase")
    incomplete_count = 0
    discovered_count = seeds_count

    try:
        headers = {"User-Agent": random.choice(USER_AGENTS)}
        await asyncio.sleep(random.uniform(1.0, 2.0))

        async with httpx.AsyncClient(timeout=25.0, verify=False) as client:
            url_elib = "https://elibrary.judiciary.gov.ph/republic_acts"
            elib_headers = {**headers, "Referer": url_elib}

            # Step 1: Fetch landing page for CSRF token
            logger.info("Fetching E-Library landing page for CSRF token...")
            csrf_token = None
            try:
                lp_resp = await client.get(url_elib, headers=elib_headers, follow_redirects=True)
                if lp_resp.status_code == 200:
                    m = re.search(r"'csrf_test_name'\s*:\s*'([a-f0-9]+)'", lp_resp.text)
                    if m:
                        csrf_token = m.group(1)
            except Exception as e:
                logger.warning(f"Failed to fetch E-Library landing page: {e}")

            if not csrf_token:
                logger.error("Could not retrieve a valid CSRF token from E-Library. Aborting crawl cycle.")
                return {
                    "status": "failed",
                    "reason": "missing_csrf_token",
                    "discovered": discovered_count,
                    "incomplete": 0,
                    "queued_for_analysis": 0
                }

            # Step 2: AJAX paginated fetch — get ALL laws
            ajax_url = "https://elibrary.judiciary.gov.ph/republic_acts/fetch_ra"
            page_size = 100
            start = 0

            while True:
                await asyncio.sleep(random.uniform(0.5, 1.5))
                ajax_data = {
                    "csrf_test_name": csrf_token,
                    "draw": str(start // page_size + 1),
                    "start": str(start),
                    "length": str(page_size),
                    "search[value]": "",
                    "search[regex]": "false"
                }
                logger.info(f"Fetching E-Library AJAX rows {start}–{start + page_size}...")

                try:
                    rp = await client.post(ajax_url, data=ajax_data, headers=elib_headers)
                except Exception as e:
                    logger.warning(f"E-Library AJAX request failed: {e}")
                    break

                if rp.status_code != 200:
                    logger.warning(f"E-Library AJAX returned HTTP {rp.status_code}. Stopping pagination.")
                    break

                try:
                    rows = rp.json().get("data", [])
                except Exception:
                    logger.warning("Failed to parse E-Library AJAX JSON response.")
                    break

                if not rows:
                    logger.info("E-Library AJAX: no more rows. Pagination complete.")
                    break

                scraped_laws_page = []
                for row in rows:
                    if len(row) < 3:
                        continue

                    raw_short_title = row[0]
                    date_passed = row[1]
                    link_html = row[2]

                    a_tag = BeautifulSoup(link_html, "html.parser").find("a")
                    if not a_tag:
                        continue

                    title_val = a_tag.get_text().strip()
                    bookshelf_url = a_tag.get("href", "")

                    # Normalize short title to canonical form "Republic Act No. XXXX"
                    ra_short = (
                        raw_short_title
                        .replace("R.A.", "Republic Act")
                        .replace("R.A ", "Republic Act ")
                        .strip()
                        .strip('.')
                    )
                    ra_short = re.sub(r"\s+", " ", ra_short)
                    m2 = re.search(r"republic\s+act\s+no\.?\s*(\d+)", ra_short, re.IGNORECASE)
                    if m2:
                        ra_short = f"Republic Act No. {m2.group(1)}"
                    ra_num_m = re.search(r"\d+", ra_short)
                    ra_num = ra_num_m.group(0) if ra_num_m else "Unknown"

                    # Skip duplicates
                    if any(x["short_title"] == ra_short for x in scraped_laws_page):
                        continue

                    # Step 3: Fetch and parse full bookshelf text
                    parsed_provisions = []
                    law_status = "active"
                    try:
                        await asyncio.sleep(random.uniform(0.3, 0.8))
                        doc_resp = await client.get(bookshelf_url, headers=headers)
                        if doc_resp.status_code == 200:
                            parsed_provisions = await parse_bookshelf_provisions(
                                doc_resp.text, ra_short, logger
                            )

                        # Printer-friendly fallback if standard page failed
                        if not parsed_provisions and "/showdocs/" in bookshelf_url:
                            friendly_url = bookshelf_url.replace("/showdocs/", "/showdocsfriendly/")
                            logger.info(f"Trying printer-friendly URL for {ra_short}...")
                            await asyncio.sleep(random.uniform(0.3, 0.7))
                            fd = await client.get(friendly_url, headers=headers)
                            if fd.status_code == 200:
                                parsed_provisions = await parse_bookshelf_provisions(
                                    fd.text, ra_short, logger
                                )
                    except Exception as fe:
                        logger.warning(f"Failed fetching bookshelf for {ra_short}: {fe}")

                    if not parsed_provisions:
                        law_status = "incomplete"
                        incomplete_count += 1
                        logger.warning(f"No parseable sections for {ra_short} — storing as incomplete.")

                    scraped_laws_page.append({
                        "title": title_val,
                        "short_title": ra_short,
                        "description": (
                            f"Scraped from SC E-Library. Bookshelf URL: {bookshelf_url}. "
                            f"Republic Act Number: {ra_num}."
                        ),
                        "date_passed": date_passed if date_passed else None,
                        "status": law_status,
                        "author": None,
                        "sponsor": None,
                        "approved_by": None,
                        "provisions": parsed_provisions,
                        "controversies": [],
                        "category": "republic_act"
                    })

                # Ingest current page laws into database immediately
                if scraped_laws_page:
                    logger.info(f"Ingesting batch of {len(scraped_laws_page)} laws from current page...")
                    page_ingest_count = await ingest_laws_batch(scraped_laws_page)
                    discovered_count += page_ingest_count
                    logger.info(f"Batch ingestion complete: {page_ingest_count} new laws committed.")

                # Stop if we got fewer rows than the page size (last page)
                if len(rows) < page_size:
                    logger.info("E-Library pagination complete (last page reached).")
                    break
                start += page_size

            logger.info(
                "E-Library crawl finished",
                total_discovered=discovered_count,
                incomplete=incomplete_count,
            )

    except Exception as e:
        logger.warning(f"Law crawler outer error: {e}")

    return {
        "status": "success",
        "discovered": discovered_count,
        "incomplete": incomplete_count,
        "queued_for_analysis": discovered_count - incomplete_count
    }
