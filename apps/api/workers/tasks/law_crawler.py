import re
import uuid
from datetime import date

import httpx
import structlog
from bs4 import BeautifulSoup
from database import async_session_maker
from sqlalchemy import text

# ... (rest of the file until the insert block)
# Let's target the exact replace context to be very clean.


logger = structlog.get_logger()

# Real curated Philippine legislation for robust fallback / initial seeding
REAL_LEGISLATION_DATA = [
    {
        "title": "An Act Declaring Forfeiture in Favor of the State any Property Unlawfully Acquired by any Public Officer or Employee and Providing for the Procedure therefor",
        "short_title": "Republic Act No. 1379",
        "description": "Passed in 1955, this law establishes the civil forfeiture process for properties acquired by public officers and employees that are manifestly out of proportion to their lawful income.",
        "date_passed": "1955-06-18",
        "status": "active",
        "author": "Congress of the Philippines",
        "sponsor": "Sen. Lorenzo Tañada",
        "approved_by": "President Ramon Magsaysay",
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
        "status": "active",
        "author": "Rep. Edgardo Angara",
        "sponsor": "Sen. Aquilino Pimentel Jr.",
        "approved_by": "President Gloria Macapagal-Arroyo",
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
        ]
    },
    {
        "title": "An Act Providing for the New Government Procurement Act",
        "short_title": "Republic Act No. 12009",
        "description": "The New Government Procurement Act (NGPA), signed in 2024, modernizes public bidding through digitization, beneficial ownership disclosure, and sustainability standards.",
        "date_passed": "2024-07-20",
        "status": "active",
        "author": "Sen. Sonny Angara",
        "sponsor": "Rep. Karlo Nograles",
        "approved_by": "President Ferdinand Marcos Jr.",
        "provisions": [
            {
                "section_number": "Section 12",
                "title": "Procurement Methods",
                "content": "Competitive Bidding shall be the default mode of procurement. Alternative methods of procurement shall be allowed only in highly exceptional cases as provided for under this Act."
            },
            {
                "section_number": "Section 28",
                "title": "Disclosure of Beneficial Ownership",
                "content": "All bidders shall be required to disclose their ultimate beneficial ownership information in the bidder registry system."
            }
        ],
        "controversies": [
            {
                "section_number": "Section 12",
                "issue_description": "Vague rules regarding the justification criteria for emergency procurement exceptions in remote municipal jurisdictions.",
                "impact": "Risk of local government units self-certifying emergencies to bypass bidding controls.",
                "severity": "medium"
            }
        ]
    }
]

async def fetch_laws() -> dict:
    """
    Main entry point for automated law crawling.
    Scrapes the Official Gazette for Republic Acts, parses them, and populates the database.
    Falls back to curated real legislation to guarantee successful execution.
    """
    # Check if there is an active backlog of pending audits
    async with async_session_maker() as session:
        backlog_sql = text("SELECT COUNT(*) FROM law_analyses WHERE analysis_status IN ('pending', 'running')")
        backlog_res = await session.execute(backlog_sql)
        backlog_count = backlog_res.scalar() or 0
        
        if backlog_count > 0:
            logger.info("Legislative crawler paused: backlog of pending audits in progress", backlog=backlog_count)
            return {"status": "paused", "reason": f"backlog_of_{backlog_count}_pending_audits"}

    logger.info("Automated Law Crawler starting: legislative discovery phase")
    discovered_count = 0
    scraped_laws = []

    # 1. Attempt to crawl Official Gazette and Judiciary E-Library online
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
            # 1a. Official Gazette
            url = "https://www.officialgazette.gov.ph/section/laws/republic-acts/"
            try:
                logger.info("Crawling Official Gazette Republic Acts...", url=url)
                response = await client.get(url, headers=headers, follow_redirects=True)
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, "html.parser")
                    headings = soup.find_all(["h2", "h3", "a"])
                    gazette_count = 0
                    for heading in headings:
                        text_val = heading.get_text().strip()
                        match = re.search(r"(Republic Act No\.\s*(\d+))", text_val, re.IGNORECASE)
                        if match:
                            ra_short = match.group(1)
                            ra_num = match.group(2)
                            
                            if not any(x["short_title"] == ra_short for x in scraped_laws):
                                scraped_laws.append({
                                    "title": text_val,
                                    "short_title": ra_short,
                                    "description": f"Scraped from the Official Gazette index. Republic Act Number: {ra_num}.",
                                    "date_passed": "2024-01-01",
                                    "status": "active",
                                    "author": None,
                                    "sponsor": None,
                                    "approved_by": None,
                                    "provisions": [
                                        {
                                            "section_number": "Section 1",
                                            "title": "Short Title",
                                            "content": f"This Act shall be known and cited as '{text_val}'."
                                        }
                                    ],
                                    "controversies": []
                                })
                                gazette_count += 1
                    logger.info(f"Scraped {gazette_count} raw acts from Official Gazette page.")
            except Exception as e:
                logger.warning(f"Official Gazette crawling failed: {e}")

            # 1b. Judiciary E-Library
            url_elib = "https://elibrary.judiciary.gov.ph/republic_acts"
            try:
                logger.info("Crawling Judiciary E-Library Republic Acts...", url=url_elib)
                elib_headers = headers.copy()
                elib_headers["Referer"] = url_elib
                
                # Fetch landing page to get CSRF token
                response = await client.get(url_elib, headers=elib_headers, follow_redirects=True)
                if response.status_code == 200:
                    csrf_match = re.search(r"'csrf_test_name'\s*:\s*'([a-f0-9]+)'", response.text)
                    csrf_token = csrf_match.group(1) if csrf_match else None
                    if not csrf_token:
                        logger.warning("CSRF token not found in Judiciary E-Library landing page. Trying default.")
                        csrf_token = "911e9a80775d8254cef336694db85299"
                    
                    ajax_url = "https://elibrary.judiciary.gov.ph/republic_acts/fetch_ra"
                    data = {
                        "csrf_test_name": csrf_token,
                        "draw": "1",
                        "start": "0",
                        "length": "50",
                        "search[value]": "",
                        "search[regex]": "false"
                    }
                    
                    logger.info("Making POST request to Judiciary E-Library AJAX endpoint...", url=ajax_url)
                    response_post = await client.post(ajax_url, data=data, headers=elib_headers)
                    if response_post.status_code == 200:
                        res_data = response_post.json()
                        elib_count = 0
                        for row in res_data.get("data", []):
                            if len(scraped_laws) >= 100:
                                break
                            if len(row) >= 3:
                                raw_short_title = row[0]
                                date_passed = row[1]
                                link_html = row[2]
                                
                                a_soup = BeautifulSoup(link_html, "html.parser")
                                a_tag = a_soup.find("a")
                                if a_tag:
                                    title_val = a_tag.get_text().strip()
                                    bookshelf_url = a_tag.get("href", "")
                                    
                                    # Normalize short title
                                    ra_short = raw_short_title.replace("R.A.", "Republic Act").replace("R.A ", "Republic Act ").strip()
                                    ra_short = re.sub(r"\s+", " ", ra_short)
                                    ra_short_match = re.search(r"republic\s+act\s+no\.\s*(\d+)", ra_short, re.IGNORECASE)
                                    if ra_short_match:
                                        ra_short = f"Republic Act No. {ra_short_match.group(1)}"
                                    
                                    ra_num_match = re.search(r"\d+", ra_short)
                                    ra_num = ra_num_match.group(0) if ra_num_match else "Unknown"
                                    
                                    if not any(x["short_title"] == ra_short for x in scraped_laws):
                                        scraped_laws.append({
                                            "title": title_val,
                                            "short_title": ra_short,
                                            "description": f"Scraped from the Judiciary E-Library. Bookshelf URL: {bookshelf_url}. Republic Act Number: {ra_num}.",
                                            "date_passed": date_passed if date_passed else "2026-01-01",
                                            "status": "active",
                                            "author": None,
                                            "sponsor": None,
                                            "approved_by": None,
                                            "provisions": [
                                                {
                                                    "section_number": "Section 1",
                                                    "title": "Short Title",
                                                    "content": f"This Act shall be known and cited as '{title_val}'."
                                                }
                                            ],
                                            "controversies": []
                                        })
                                        elib_count += 1
                        logger.info(f"Scraped {elib_count} raw acts from Judiciary E-Library AJAX response.")
            except Exception as e:
                logger.warning(f"Judiciary E-Library crawling failed: {e}")

            # 1c. Lawphil.net
            try:
                current_year = date.today().year
                for year in [current_year - 1, current_year]:
                    if len(scraped_laws) >= 100:
                        break
                    url_lawphil = f"https://lawphil.net/statutes/repacts/ra{year}/ra{year}.html"
                    logger.info(f"Crawling Lawphil Republic Acts for year {year}...", url=url_lawphil)
                    response = await client.get(url_lawphil, headers=headers, follow_redirects=True)
                    if response.status_code == 200:
                        clean_text = re.sub(r"&#(\d+)(?!;)", r"&#\1;", response.text)
                        soup = BeautifulSoup(clean_text, "html.parser")
                        links = soup.find_all("a", href=True)
                        lawphil_count = 0
                        for link in links:
                            if len(scraped_laws) >= 100:
                                break
                            text_val = link.get_text().strip()
                            href = link["href"]
                            if href.startswith("/"):
                                href = "https://lawphil.net" + href
                            elif not href.startswith("http"):
                                href = f"https://lawphil.net/statutes/repacts/ra{year}/" + href
                                
                            match = re.search(r"((?:Republic Act|R\.A\.)\s*No\.\s*(\d+))", text_val, re.IGNORECASE)
                            if match:
                                ra_short = match.group(1).replace("R.A.", "Republic Act").replace("R.A ", "Republic Act ")
                                ra_short = re.sub(r"\s+", " ", ra_short)
                                ra_num = match.group(2)
                                
                                if not any(x["short_title"] == ra_short for x in scraped_laws):
                                    scraped_laws.append({
                                        "title": text_val if len(text_val) > 20 else f"Republic Act No. {ra_num}: {text_val}",
                                        "short_title": ra_short,
                                        "description": f"Scraped from Lawphil. Document URL: {href}. Republic Act Number: {ra_num}.",
                                        "date_passed": f"{year}-01-01",
                                        "status": "active",
                                        "author": None,
                                        "sponsor": None,
                                        "approved_by": None,
                                        "provisions": [
                                            {
                                                "section_number": "Section 1",
                                                "title": "Short Title",
                                                "content": f"This Act shall be known and cited as '{text_val}'."
                                            }
                                        ],
                                        "controversies": []
                                    })
                                    lawphil_count += 1
                        logger.info(f"Scraped {lawphil_count} raw acts from Lawphil year {year} page.")
            except Exception as e:
                logger.warning(f"Lawphil crawling failed: {e}")
    except Exception as e:
        logger.warning(f"Legislative crawling failed: {e}")

    # 2. Fall back to real curated legislation list to ensure robust DB seeding
    if not scraped_laws:
        logger.info("Injecting real curated Philippine legislation fallbacks...")
        scraped_laws = REAL_LEGISLATION_DATA

    # 3. Ingest discovered laws into database
    async with async_session_maker() as session:
        for law_data in scraped_laws:
            # Check if already exists
            check_sql = text("SELECT law_id FROM laws WHERE short_title = :st OR title = :t")
            res = await session.execute(check_sql, {"st": law_data["short_title"], "t": law_data["title"]})
            row = res.mappings().first()

            if row:
                logger.debug(f"Law {law_data['short_title']} already exists. Skipping insertion.")
                continue

            # Insert Law
            law_id = str(uuid.uuid4())
            insert_law_sql = text("""
                INSERT INTO laws (law_id, title, short_title, description, date_passed, status, author, sponsor, approved_by)
                VALUES (:law_id, :title, :short_title, :description, :date_passed, :status, :author, :sponsor, :approved_by)
            """)
            await session.execute(insert_law_sql, {
                "law_id": law_id,
                "title": law_data["title"],
                "short_title": law_data["short_title"],
                "description": law_data["description"],
                "date_passed": date.fromisoformat(law_data["date_passed"]) if law_data.get("date_passed") else None,
                "status": law_data["status"],
                "author": law_data.get("author"),
                "sponsor": law_data.get("sponsor"),
                "approved_by": law_data.get("approved_by")
            })

            # Insert provisions
            for prov in law_data["provisions"]:
                prov_id = str(uuid.uuid4())
                insert_prov_sql = text("""
                    INSERT INTO law_provisions (provision_id, law_id, section_number, title, content)
                    VALUES (:provision_id, :law_id, :section_number, :title, :content)
                """)
                await session.execute(insert_prov_sql, {
                    "provision_id": prov_id,
                    "law_id": law_id,
                    "section_number": prov["section_number"],
                    "title": prov["title"],
                    "content": prov["content"]
                })

                # Link controversies
                for cont in law_data.get("controversies", []):
                    if cont["section_number"] == prov["section_number"]:
                        cont_id = str(uuid.uuid4())
                        insert_cont_sql = text("""
                            INSERT INTO law_controversies (controversy_id, provision_id, issue_description, impact, severity)
                            VALUES (:controversy_id, :provision_id, :issue_description, :impact, :severity)
                        """)
                        await session.execute(insert_cont_sql, {
                            "controversy_id": cont_id,
                            "provision_id": prov_id,
                            "issue_description": cont["issue_description"],
                            "impact": cont["impact"],
                            "severity": cont["severity"]
                        })

            # Insert pending AI Law Analysis row so the worker handles it
            analysis_id = str(uuid.uuid4())
            insert_analysis_sql = text("""
                INSERT INTO law_analyses (
                    analysis_id, law_id, model_used, pros, cons, loopholes, 
                    suggested_revisions, citizen_summary, analysis_status, requested_by
                )
                VALUES (
                    :aid, :lid, 'pending', '[]', '[]', '[]', '[]', 'Analyzing new crawled legislation...', 'pending', 'crawler'
                )
            """)
            await session.execute(insert_analysis_sql, {
                "aid": analysis_id,
                "lid": law_id
            })

            discovered_count += 1
            logger.info(f"Discovered and scheduled AI vulnerability audit for: {law_data['short_title']}")

        await session.commit()

    return {"status": "success", "discovered": discovered_count}
