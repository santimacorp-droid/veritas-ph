import hashlib
import os
import asyncio
import urllib.robotparser
from urllib.parse import urlparse
from uuid import uuid4

import structlog
from playwright.async_api import async_playwright
from database import async_session_maker
from sqlalchemy import text
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = structlog.get_logger()


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True
)
async def fetch_page_content_simple(url: str) -> str:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url, timeout=30000)
        text_result = await page.inner_text("body")
        await browser.close()
        return text_result


async def handle_document_recrawl(db, document_id: str, href: str, current_hash: str, current_path: str):
    try:
        body_text = await fetch_page_content_simple(href)
        text_bytes = body_text.encode("utf-8")
        new_hash = hashlib.sha256(text_bytes).hexdigest()
        
        if new_hash != current_hash:
            logger.info("Document content change detected, archiving old version", doc_id=document_id)
            res = await db.execute(
                text("SELECT COALESCE(MAX(version_num), 0) FROM document_versions WHERE document_id = :did"),
                {"did": document_id}
            )
            max_v = res.scalar() or 0
            next_v = max_v + 1
            
            # Archive the old version
            await db.execute(
                text("""
                    INSERT INTO document_versions (
                        version_id, document_id, version_num, sha256_hash, storage_path, change_summary
                    )
                    VALUES (:vid, :did, :vnum, :hash, :path, :summary)
                """),
                {
                    "vid": str(uuid4()),
                    "did": document_id,
                    "vnum": next_v,
                    "hash": current_hash,
                    "path": current_path,
                    "summary": f"Auto-archived on content change detection (version {next_v})"
                }
            )
            
            # Save new content
            new_storage_path = f"documents/{document_id}_v{next_v + 1}.txt"
            from storage import get_api_store
            get_api_store().put_bytes(new_storage_path, text_bytes)
            
            # Update document
            await db.execute(
                text("""
                    UPDATE documents 
                    SET sha256_hash = :hash, 
                        storage_path = :path, 
                        file_size_bytes = :size,
                        processing_status = 'pending',
                        fetch_timestamp = CURRENT_TIMESTAMP
                    WHERE document_id = :did
                """),
                {
                    "hash": new_hash,
                    "path": new_storage_path,
                    "size": len(text_bytes),
                    "did": document_id
                }
            )
            await db.commit()
            logger.info("Document updated to new version", doc_id=document_id, new_version=next_v + 1)
    except Exception as e:
        logger.error("Error during document re-crawl check", doc_id=document_id, error=str(e))


async def fetch_sources():
    """
    Main entry point for the crawler.
    Loops through all enabled sources in the database and discovers/versions documents.
    """
    logger.info("Crawler starting: discovery phase")

    async with async_session_maker() as db:
        res = await db.execute(text("SELECT source_id, base_url, source_type, parser_type, robots_compliant FROM sources WHERE enabled = TRUE"))
        sources = res.mappings().all()

    if not sources:
        logger.error("No enabled sources found in database")
        return {"status": "failed", "error": "no_sources"}

    discovered_total = 0
    for source in sources:
        source_id = source["source_id"]
        target_url = source["base_url"]
        source_type = source["source_type"]
        robots_compliant = source.get("robots_compliant", True)
        
        logger.info(f"Crawling source: {source_id} ({target_url})")

        # For portal source type, use Playwright PhilGEPS crawl logic
        if source_type == 'portal':
            if robots_compliant:
                rp = urllib.robotparser.RobotFileParser()
                rp.set_url(urlparse(target_url).scheme + "://" + urlparse(target_url).netloc + "/robots.txt")
                try:
                    rp.read()
                    if not rp.can_fetch("*", target_url):
                        logger.error(f"robots.txt prevents crawling {target_url}")
                        continue
                except Exception as e:
                    logger.warning(f"Failed to read robots.txt: {e}")
            else:
                logger.info("robots.txt compliance is disabled for this source. Bypassing check.")

            discovered_count = 0
            try:
                async with async_playwright() as p:
                    logger.info("Launching headless Chromium...")
                    browser = await p.chromium.launch(headless=True)
                    page = await browser.new_page()

                    logger.info(f"Navigating to source URL: {target_url}")
                    await asyncio.sleep(1.0) # Rate limiting
                    await page.goto(
                        target_url,
                        timeout=45000,
                    )

                    try:
                        await page.click("text=Search", timeout=5000)
                        await page.wait_for_timeout(3000)
                    except Exception:
                        logger.info("No 'Search' tab found, parsing current page directly")

                    logger.info("Extracting notice links from search table...")
                    links = await page.eval_on_selector_all(
                        "a",
                        'elements => elements.filter(el => el.href.includes("SplashBidNoticeAbstractUI") || el.href.includes("NoticeDetail")).map(el => [el.innerText.trim(), el.href])',
                    )
                    logger.info(f"Found {len(links)} notice links on page")

                    async with async_session_maker() as db:
                        for title, href in links[:20]:
                            if not href or not title:
                                continue
                            result = await db.execute(
                                text("SELECT document_id, sha256_hash, storage_path FROM documents WHERE source_url = :href"),
                                {"href": href}
                            )
                            row = result.fetchone()
                            if row:
                                doc_id, current_hash, current_path = row[0], row[1], row[2]
                                await handle_document_recrawl(db, doc_id, href, current_hash, current_path)
                                continue

                            # Create a new document entry
                            await asyncio.sleep(1.0)
                            doc_id = str(uuid4())
                            url_hash = hashlib.sha256(href.encode("utf-8")).hexdigest()
                            storage_path = f"documents/{doc_id}.txt"

                            await db.execute(
                                text("""
                                INSERT INTO documents (
                                    document_id, source_id, source_url, sha256_hash, storage_path, 
                                    processing_status, document_type, language
                                )
                                VALUES (:did, :sid, :href, :uhash, :path, 'pending', 'bid_notice', 'en')
                                """),
                                {"did": doc_id, "sid": source_id, "href": href, "uhash": url_hash, "path": storage_path}
                            )
                            discovered_count += 1
                            logger.info(
                                "Discovered new opportunity notice", title=title, url=href, doc_id=doc_id
                            )
                        await db.commit()

                    await browser.close()
                    discovered_total += discovered_count
            except Exception as e:
                logger.error(f"Error during crawl of source {source_id}", error=str(e))
        else:
            logger.info(f"Source {source_id} has type {source_type}, executing generic listing crawl...")
            try:
                import httpx
                from bs4 import BeautifulSoup
                headers = {"User-Agent": "Mozilla/5.0"}
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(target_url, headers=headers, follow_redirects=True)
                    if response.status_code == 200:
                        soup = BeautifulSoup(response.text, "html.parser")
                        links = []
                        for a in soup.find_all("a", href=True):
                            href = a["href"]
                            if href.startswith("/"):
                                from urllib.parse import urljoin
                                href = urljoin(target_url, href)
                            if href.startswith("http") and (".pdf" in href.lower() or "notice" in href.lower() or "award" in href.lower()):
                                links.append((a.get_text().strip(), href))
                        
                        logger.info(f"Generic crawl found {len(links)} links for {source_id}")
                        async with async_session_maker() as db:
                            discovered_count = 0
                            for title, href in links[:5]:
                                result = await db.execute(
                                    text("SELECT document_id, sha256_hash, storage_path FROM documents WHERE source_url = :href"),
                                    {"href": href}
                                )
                                row = result.fetchone()
                                if row:
                                    doc_id, current_hash, current_path = row[0], row[1], row[2]
                                    await handle_document_recrawl(db, doc_id, href, current_hash, current_path)
                                    continue

                                doc_id = str(uuid4())
                                url_hash = hashlib.sha256(href.encode("utf-8")).hexdigest()
                                doc_type = "audit_report" if "audit" in target_url.lower() else ("app" if "app" in target_url.lower() else "bid_notice")
                                storage_path = f"documents/{doc_id}.pdf" if href.lower().endswith(".pdf") else f"documents/{doc_id}.txt"

                                await db.execute(
                                    text("""
                                    INSERT INTO documents (
                                        document_id, source_id, source_url, sha256_hash, storage_path, 
                                        processing_status, document_type, language
                                    )
                                    VALUES (:did, :sid, :href, :uhash, :path, 'pending', :dtype, 'en')
                                    """),
                                    {"did": doc_id, "sid": source_id, "href": href, "uhash": url_hash, "path": storage_path, "dtype": doc_type}
                                )
                                discovered_count += 1
                            await db.commit()
                            discovered_total += discovered_count
            except Exception as e:
                logger.error(f"Error during generic crawl of source {source_id}", error=str(e))

    return {"status": "success", "discovered": discovered_total}


async def download_document(document_id: str):
    """
    Fetches a specific document, hashes it, and stores it in the local filesystem storage.
    """
    logger.info(f"Downloading document: {document_id}")

    try:
        # 1. Fetch document row from Database
        async with async_session_maker() as db:
            result = await db.execute(
                text("SELECT source_url, storage_path FROM documents WHERE document_id = :did"),
                {"did": document_id}
            )
            row = result.fetchone()
            if not row:
                logger.error("Document not found in database", doc_id=document_id)
                return {"status": "failed", "error": "not_found"}

            source_url, storage_path = row[0], row[1]

        # 2. Launch browser and load source_url
        @retry(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=1, min=2, max=10),
            retry=retry_if_exception_type(Exception),
            reraise=True
        )
        async def fetch_page_content(url: str) -> str:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                logger.info("Loading notice detail page...", url=url)
                await asyncio.sleep(1.0) # Rate limiting
                await page.goto(url, timeout=30000)
                # Extract inner text of the body
                text_result = await page.inner_text("body")
                await browser.close()
                return text_result

        body_text = await fetch_page_content(source_url)

        # 3. Store text content in the document store
        from storage import get_api_store

        text_bytes = body_text.encode("utf-8")
        success = get_api_store().put_bytes(storage_path, text_bytes)

        if not success:
            logger.error("Failed to write notice text to storage", doc_id=document_id)
            return {"status": "failed", "error": "storage_write_error"}

        # 4. Compute actual text hash and update document row
        new_hash = hashlib.sha256(text_bytes).hexdigest()

        async with async_session_maker() as db:
            try:
                await db.execute(
                    text("UPDATE documents SET sha256_hash = :hash, file_size_bytes = :size WHERE document_id = :did"),
                    {"hash": new_hash, "size": len(text_bytes), "did": document_id}
                )
                await db.commit()
            except Exception as e:
                # E.g. sqlalchemy.exc.IntegrityError in case of hash clash
                await db.rollback()
                logger.warning(
                    "Hash clash on downloaded text, keeping URL-based hash or creating new version if supported", doc_id=document_id
                )

        logger.info("Successfully downloaded and stored document", doc_id=document_id)
        return {"status": "success", "document_id": document_id}

    except Exception as e:
        logger.error("Error downloading document", doc_id=document_id, error=str(e))
        return {"status": "failed", "error": str(e)}
