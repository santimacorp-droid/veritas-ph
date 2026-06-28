import asyncio
import os
import re
import sys
import httpx
from bs4 import BeautifulSoup
from uuid import uuid4

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database import async_session_maker
from sqlalchemy import text

async def repair_laws():
    print("Starting Veritas Law Provision Repair Script...")
    async with async_session_maker() as db:
        # Get all laws
        res = await db.execute(text("SELECT law_id, short_title, title, description FROM laws"))
        laws = res.mappings().all()
        
        repaired_count = 0
        for law in laws:
            law_id = law["law_id"]
            short_title = law["short_title"]
            title = law["title"]
            desc = law["description"]
            
            # Check number of provisions
            prov_res = await db.execute(
                text("SELECT COUNT(*) FROM law_provisions WHERE law_id = :lid"),
                {"lid": law_id}
            )
            count = prov_res.scalar() or 0
            
            # If it's a stub (only 1 provision) and has Bookshelf URL in description, let's repair it!
            url_match = re.search(r'Bookshelf URL:\s*(https?://[^\s]+)\.?', desc or "")
            if (count <= 1 or "12277" in short_title) and url_match:
                bookshelf_url = url_match.group(1).strip()
                # Clean trailing dot if present
                if bookshelf_url.endswith('.'):
                    bookshelf_url = bookshelf_url[:-1]
                    
                print(f"\n[REPAIR] Found stub law: {short_title} (ID: {law_id})")
                print(f"-> Bookshelf URL: {bookshelf_url}")
                
                # Fetch and parse bookshelf text
                parsed_provisions = []
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                }
                try:
                    async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
                        doc_resp = await client.get(bookshelf_url, headers=headers)
                        if doc_resp.status_code == 200:
                            doc_soup = BeautifulSoup(doc_resp.text, "html.parser")
                            content_div = doc_soup.find("div", class_="single_content")
                            if not content_div:
                                content_div = doc_soup.body or doc_soup
                            divs = content_div.find_all("div", align="justify")
                            
                            current_sec = None
                            current_title = ""
                            current_paragraphs = []
                            
                            for div in divs:
                                text_val = div.get_text(separator=" ").strip()
                                text_val = re.sub(r'\s+', ' ', text_val)
                                if not text_val:
                                    continue
                                if "Be it enacted" in text_val:
                                    continue
                                    
                                match_sec = re.match(r'^(SEC(?:TION)?\.?\s+\d+)\.?\s*(.*?)(?:\s+[-—–]\s+(.*))?$', text_val, re.IGNORECASE | re.DOTALL)
                                if match_sec:
                                    if current_sec:
                                        parsed_provisions.append({
                                            "section_number": current_sec,
                                            "title": current_title,
                                            "content": "\n\n".join(current_paragraphs).strip()
                                        })
                                    current_sec = match_sec.group(1).strip()
                                    g2 = match_sec.group(2).strip()
                                    g3 = match_sec.group(3)
                                    if g3 is not None:
                                        title_part = g2
                                        content_part = g3.strip()
                                    else:
                                        title_part = ""
                                        content_part = g2
                                    title_part = re.sub(r'[\s\.]+$', '', title_part)
                                    current_title = title_part
                                    current_paragraphs = [content_part]
                                else:
                                    if current_sec:
                                        current_paragraphs.append(text_val)
                                        
                            if current_sec:
                                last_content = "\n\n".join(current_paragraphs).strip()
                                sig_match = re.search(r'Approved:|\(SGD\.\)|Passed by the|Approved,', last_content, re.IGNORECASE)
                                if sig_match:
                                    last_content = last_content[:sig_match.start()].strip()
                                parsed_provisions.append({
                                    "section_number": current_sec,
                                    "title": current_title,
                                    "content": last_content
                                })
                except Exception as fetch_err:
                    print(f"❌ Failed to fetch/parse bookshelf page: {fetch_err}")
                    continue
                    
                if len(parsed_provisions) > 1:
                    print(f"-> Successfully parsed {len(parsed_provisions)} sections!")
                    
                    # Delete old provisions
                    await db.execute(
                        text("DELETE FROM law_provisions WHERE law_id = :lid"),
                        {"lid": law_id}
                    )
                    
                    # Insert new provisions
                    for prov in parsed_provisions:
                        prov_id = str(uuid4())
                        await db.execute(
                            text("""
                                INSERT INTO law_provisions (provision_id, law_id, section_number, title, content)
                                VALUES (:pid, :lid, :sec_num, :title, :content)
                            """),
                            {
                                "pid": prov_id,
                                "lid": law_id,
                                "sec_num": prov["section_number"],
                                "title": prov["title"],
                                "content": prov["content"]
                            }
                        )
                    
                    # Delete any existing analyses for this law to queue a fresh one
                    await db.execute(
                        text("DELETE FROM law_analyses WHERE law_id = :lid"),
                        {"lid": law_id}
                    )
                    
                    # Insert new pending analysis
                    analysis_id = str(uuid4())
                    await db.execute(
                        text("""
                            INSERT INTO law_analyses (
                                analysis_id, law_id, model_used, pros, cons, loopholes, 
                                suggested_revisions, citizen_summary, analysis_status, requested_by
                            )
                            VALUES (
                                :aid, :lid, 'pending', '[]', '[]', '[]', '[]', 'Re-analyzing law with complete provisions...', 'pending', 'repair_script'
                            )
                        """),
                        {
                            "aid": analysis_id,
                            "lid": law_id
                        }
                    )
                    
                    await db.commit()
                    print(f"✅ Successfully repaired and queued re-analysis for {short_title}!")
                    repaired_count += 1
                else:
                    print(f"⚠️ Parsing yielded 0 or 1 sections for {short_title}. Skipping.")
                    
        print(f"\n[REPAIR COMPLETE] Repaired {repaired_count} laws.")

if __name__ == "__main__":
    asyncio.run(repair_laws())
