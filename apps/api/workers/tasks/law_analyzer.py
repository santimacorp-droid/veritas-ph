"""
apps/api/workers/tasks/law_analyzer.py

AI Law Analyzer worker task for Veritas.
Runs structured multi-dimensional legal assessments using DeepSeek V3 & GPT-4o-mini.
"""

import json
import os
from uuid import uuid4

import httpx
import structlog
from database import async_session_maker
from sqlalchemy import text

logger = structlog.get_logger()


async def call_llm_json(url: str, api_key: str, model: str, prompt: str) -> str | None:
    """Helper to perform standard LLM completions requesting JSON."""
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "You are a senior legal expert in Philippine procurement law and civic governance. You must return your analysis strictly as a raw valid JSON object. Do not include markdown formatting like ```json or ```."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.2,
        "max_tokens": 4000,
        "response_format": {"type": "json_object"} if ("gpt" in model or "deepseek" in model) else None
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
            else:
                logger.warn(f"LLM API returned status {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Exception calling LLM API {model}: {e}")
    return None


async def analyze_law(law_id: str, requested_by: str = "system", analysis_id: str = None):
    """
    Ingests law data, provisions, and controversies, performs AI analysis, and updates law_analyses table.
    """
    logger.info(f"Starting AI analysis for law: {law_id}")
    if not analysis_id:
        analysis_id = str(uuid4())
        is_new = True
    else:
        is_new = False

    async with async_session_maker() as db:
        if is_new:
            # Create initial pending entry
            await db.execute(
                text("""
                    INSERT INTO law_analyses (
                        analysis_id, law_id, model_used, pros, cons, loopholes, 
                        suggested_revisions, citizen_summary, analysis_status, requested_by
                    )
                    VALUES (
                        :aid, :lid, 'pending', '[]', '[]', '[]', '[]', 'Starting...', 'running', :req
                    )
                """),
                {"aid": analysis_id, "lid": law_id, "req": requested_by}
            )
        else:
            # Update existing pending entry to running
            await db.execute(
                text("""
                    UPDATE law_analyses
                       SET analysis_status = 'running',
                           citizen_summary = 'Starting...'
                     WHERE analysis_id = :aid
                """),
                {"aid": analysis_id}
            )
        await db.commit()

        # 1. Fetch law details
        law_sql = text("SELECT title, short_title, description, author, sponsor, approved_by, submitted_by, voting_record, date_passed FROM laws WHERE law_id = :id")
        law_res = await db.execute(law_sql, {"id": law_id})
        law_row = law_res.mappings().first()
        if not law_row:
            logger.error(f"Law {law_id} not found.")
            await db.execute(
                text("UPDATE law_analyses SET analysis_status = 'failed' WHERE analysis_id = :aid"),
                {"aid": analysis_id}
            )
            await db.commit()
            return

        provisions_sql = text("""
            SELECT section_number, title, content 
            FROM law_provisions 
            WHERE law_id = :id
            ORDER BY section_number
        """)
        prov_res = await db.execute(provisions_sql, {"id": law_id})
        provisions = prov_res.mappings().all()

        # If metadata is missing, use AI to extract it
        author = law_row.get('author')
        sponsor = law_row.get('sponsor')
        approved_by = law_row.get('approved_by')
        submitted_by = law_row.get('submitted_by')
        voting_record = law_row.get('voting_record')

        if not author or not sponsor or not approved_by or not submitted_by or not voting_record:
            logger.info("Legislative metadata is missing. Attempting AI metadata extraction...", title=law_row['title'])
            prov_preview = "\n".join([f"Sec {p['section_number']}: {p['title'] or ''}" for p in provisions[:5]])
            
            deepseek_key = os.getenv("DEEPSEEK_API_KEY")
            if deepseek_key and deepseek_key != "your_key_here":
                extract_prompt = f"""
You are a senior legislative archivist. Your task is to look up and extract the official historical metadata for the following Philippine law.

CRITICAL REQUIREMENT:
If you are unsure of any detail, lack the exact historical record, or cannot verify the information with absolute certainty, you MUST return null for that field. 
DO NOT guess, estimate, approximate, extrapolate, or generate plausible fallbacks. We do not permit any fake or unverified information. Accuracy and absolute truth are mandatory.

Title: {law_row['title']}
Short Title: {law_row['short_title'] or ''}
Provisions Preview:
{prov_preview}

Return strictly a JSON object:
{{
  "author": "<principal author/congress filer name, or null if not 100% verified>",
  "sponsor": "<sponsoring senator/representative or co-authors, or null if not 100% verified>",
  "approved_by": "<name of the President of the Philippines who signed this into law, or null if not 100% verified>",
  "submitted_by": "<filing details/bill number, or null if not 100% verified>",
  "voting_record": "<the final voting tally in Congress/Senate if 100% verified, otherwise null>"
}}
"""
                try:
                    raw_ext = await call_llm_json(
                        url="https://api.deepseek.com/chat/completions",
                        api_key=deepseek_key,
                        model=os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash"),
                        prompt=extract_prompt
                    )
                    if raw_ext:
                        extracted = json.loads(raw_ext)
                        author = author or extracted.get("author")
                        sponsor = sponsor or extracted.get("sponsor")
                        approved_by = approved_by or extracted.get("approved_by")
                        submitted_by = submitted_by or extracted.get("submitted_by")
                        voting_record = voting_record or extracted.get("voting_record")
                        
                        await db.execute(
                            text("""
                                UPDATE laws 
                                   SET author = :author, sponsor = :sponsor, approved_by = :approved_by, 
                                       submitted_by = :submitted_by, voting_record = :voting_record
                                 WHERE law_id = :lid
                            """),
                            {
                                "author": author,
                                "sponsor": sponsor,
                                "approved_by": approved_by,
                                "submitted_by": submitted_by,
                                "voting_record": voting_record,
                                "lid": law_id
                            }
                        )
                        await db.commit()
                        logger.info("AI legislative metadata extraction completed and saved.", law_id=law_id)
                except Exception as ex:
                    logger.error("AI legislative metadata extraction failed", error=str(ex))

        controversies_sql = text("""
            SELECT lp.section_number, lc.issue_description, lc.impact, lc.severity
            FROM law_controversies lc
            JOIN law_provisions lp ON lp.provision_id = lc.provision_id
            WHERE lp.law_id = :id
        """)
        cont_res = await db.execute(controversies_sql, {"id": law_id})
        controversies = cont_res.mappings().all()

        # Build law context
        law_context = f"Law Title: {law_row['title']}\n"
        if law_row['short_title']:
            law_context += f"Short Title: {law_row['short_title']}\n"
        
        # Include metadata in AI context
        if author:
            law_context += f"Author(s): {author}\n"
        if sponsor:
            law_context += f"Sponsor(s): {sponsor}\n"
        if approved_by:
            law_context += f"Signed/Approved By: {approved_by}\n"
        if submitted_by:
            law_context += f"Submitted/Filed: {submitted_by}\n"
        if voting_record:
            law_context += f"Voting Record: {voting_record}\n"
        if law_row.get('date_passed'):
            law_context += f"Date Passed: {law_row['date_passed']}\n"

        law_context += f"Overview: {law_row['description'] or ''}\n\n"
        
        # Safeguard: prevent token blowup on extremely long laws
        total_len = sum(len(p['content'] or '') for p in provisions)
        truncate_provisions = total_len > 40000

        law_context += "=== PROVISIONS ===\n"
        for p in provisions:
            content = p['content'] or ''
            if truncate_provisions and len(content) > 1200:
                content = content[:1200] + " ... [TRUNCATED FOR LENGTH]"
            law_context += f"Section {p['section_number']} - {p['title'] or ''}:\n{content}\n\n"

        if controversies:
            law_context += "=== KNOWN CONTROVERSIES / ISSUES ===\n"
            for c in controversies:
                law_context += f"Section {c['section_number']}: {c['issue_description']} (Impact: {c['impact'] or ''}, Severity: {c['severity']})\n\n"

        prompt = f"""
Analyze the following Philippine law and produce a structured assessment JSON object.
Ensure your analysis is comprehensive, legal-expert grade, and citizen-friendly.
Specifically evaluate the role of the Authors, Sponsors, Approvers, and the Voting/Approval Timeline for potential conflicts of interest, lobbying influence, or compromised oversight, and document these findings in your pros/cons, loopholes, or citizen summary as applicable.

{law_context}

Return exactly a JSON object conforming to this schema:
{{
  "integrity_score": <number between 0 and 100 representing how loophole-free and enforceable it is>,
  "governance_score": <number between 0 and 100 representing strength of oversight and accountability>,
  "pros": [<list of strings detailing what the law does well for transparency and civic interest>],
  "cons": [<list of strings detailing weaknesses, vague items, or failures of the law>],
  "loopholes": [
    {{
      "section": "<e.g. Section 53>",
      "description": "<detailed loophole explanation>",
      "risk_level": "<low|medium|high|critical>"
    }}
  ],
  "suggested_revisions": [
    {{
      "section": "<e.g. Section 53>",
      "current_text": "<approximate current wording or reference>",
      "suggested_text": "<your proposed revision wording for this section>",
      "rationale": "<why this revision fixes the loophole>"
    }}
  ],
  "violation_patterns": [
    {{
      "discrepancy_type": "<e.g. budget_splitting>",
      "linked_rule_ids": ["RULE_002"],
      "section_refs": "Section 54"
    }}
  ],
  "cross_law_conflicts": [
    {{
      "conflicting_law_id": "",
      "section_a": "",
      "section_b": "",
      "description": "<how these sections conflict>"
    }}
  ],
  "citizen_summary": "<clear, plain-language paragraph summarizing the law's intent and implications for ordinary Filipinos>"
}}
"""

        # Call APIs (DeepSeek -> OpenAI)
        model_used = "pending"
        raw_response = None

        deepseek_key = os.getenv("DEEPSEEK_API_KEY")
        if deepseek_key and deepseek_key != "your_key_here":
            logger.info("Attempting DeepSeek for law analysis...")
            deepseek_model = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash")
            raw_response = await call_llm_json(
                url="https://api.deepseek.com/chat/completions",
                api_key=deepseek_key,
                model=deepseek_model,
                prompt=prompt
            )
            if raw_response:
                model_used = deepseek_model

        if not raw_response:
            openai_key = os.getenv("OPENAI_API_KEY")
            if openai_key and openai_key != "your_key_here":
                logger.info("Attempting OpenAI for law analysis fallback...")
                raw_response = await call_llm_json(
                    url="https://api.openai.com/v1/chat/completions",
                    api_key=openai_key,
                    model="gpt-4o-mini",
                    prompt=prompt
                )
                if raw_response:
                    model_used = "gpt-4o-mini"

        if not raw_response:
            logger.error("No LLM API keys available or call failed.")
            await db.execute(
                text("UPDATE law_analyses SET analysis_status = 'failed' WHERE analysis_id = :aid"),
                {"aid": analysis_id}
            )
            await db.commit()
            return

        # Parse response
        try:
            import re
            clean_res = raw_response.strip()
            if clean_res.startswith("```json"):
                clean_res = clean_res[7:]
            elif clean_res.startswith("```"):
                clean_res = clean_res[3:]
            if clean_res.endswith("```"):
                clean_res = clean_res[:-3]
            clean_res = clean_res.strip()

            # Clean trailing commas in objects and arrays
            clean_res = re.sub(r',\s*\}', '}', clean_res)
            clean_res = re.sub(r',\s*\]', ']', clean_res)

            try:
                data = json.loads(clean_res)
            except Exception:
                # Handle unescaped newlines/carriages inside double-quoted string literals
                def escape_inside_quotes(match):
                    return match.group(0).replace('\n', '\\n').replace('\r', '\\r')
                repaired = re.sub(r'"([^"\\]*(?:\\.[^"\\]*)*)"', escape_inside_quotes, clean_res, flags=re.DOTALL)
                try:
                    data = json.loads(repaired)
                except Exception as repair_err:
                    # Self-healing: repair truncated JSON by auto-closing strings, arrays, and objects
                    text_to_test = repaired.strip()
                    
                    # 1. Close unclosed double quote if count is odd (meaning it truncated inside a string value)
                    unescaped_quotes = []
                    escaped = False
                    for i, char in enumerate(text_to_test):
                        if char == '\\':
                            escaped = not escaped
                        elif char == '"':
                            if not escaped:
                                unescaped_quotes.append(i)
                            escaped = False
                        else:
                            escaped = False
                            
                    if len(unescaped_quotes) % 2 != 0:
                        last_quote_idx = unescaped_quotes[-1]
                        head = text_to_test[:last_quote_idx + 1]
                        tail = text_to_test[last_quote_idx + 1:]
                        # Escape newlines and carriage returns in the truncated string value
                        tail = tail.replace('\n', '\\n').replace('\r', '\\r')
                        text_to_test = head + tail + '"'
                        
                    # 2. Track open braces/brackets using a stack and append closing characters in reverse
                    brackets = []
                    # Keep track of whether we are inside a string to avoid matching braces inside text
                    in_string = False
                    escaped = False
                    for char in text_to_test:
                        if char == '"' and not escaped:
                            in_string = not in_string
                        elif char == '\\' and in_string:
                            escaped = not escaped
                            continue
                        elif not in_string:
                            if char == '{':
                                brackets.append('}')
                            elif char == '[':
                                brackets.append(']')
                            elif char == '}':
                                if brackets and brackets[-1] == '}':
                                    brackets.pop()
                            elif char == ']':
                                if brackets and brackets[-1] == ']':
                                    brackets.pop()
                        escaped = False
                        
                    if brackets:
                        text_to_test += "".join(reversed(brackets))
                        
                    try:
                        data = json.loads(text_to_test)
                    except Exception:
                        raise repair_err from None
            
            # Serialize items
            integrity_score = data.get("integrity_score", 70)
            governance_score = data.get("governance_score", 70)
            pros = json.dumps(data.get("pros", []))
            cons = json.dumps(data.get("cons", []))
            loopholes = json.dumps(data.get("loopholes", []))
            suggested_revisions = json.dumps(data.get("suggested_revisions", []))
            violation_patterns = json.dumps(data.get("violation_patterns", []))
            cross_law_conflicts = json.dumps(data.get("cross_law_conflicts", []))
            citizen_summary = data.get("citizen_summary", "Summary not provided.")

            # Update DB
            await db.execute(
                text("""
                    UPDATE law_analyses
                       SET model_used = :model,
                           integrity_score = :integrity,
                           governance_score = :governance,
                           pros = :pros,
                           cons = :cons,
                           loopholes = :loopholes,
                           suggested_revisions = :revisions,
                           violation_patterns = :violations,
                           cross_law_conflicts = :conflicts,
                           citizen_summary = :summary,
                           raw_ai_response = :raw,
                           analysis_status = 'completed',
                           completed_at = CURRENT_TIMESTAMP
                     WHERE analysis_id = :aid
                """),
                {
                    "model": model_used,
                    "integrity": integrity_score,
                    "governance": governance_score,
                    "pros": pros,
                    "cons": cons,
                    "loopholes": loopholes,
                    "revisions": suggested_revisions,
                    "violations": violation_patterns,
                    "conflicts": cross_law_conflicts,
                    "summary": citizen_summary,
                    "raw": raw_response,
                    "aid": analysis_id
                }
            )
            await db.commit()
            logger.info(f"AI Law analysis completed successfully for law {law_id} using {model_used}.")

        except Exception as e:
            logger.error(f"Error parsing law analysis response: {e}")
            await db.execute(
                text("""
                    UPDATE law_analyses 
                       SET analysis_status = 'failed',
                           raw_ai_response = :raw
                     WHERE analysis_id = :aid
                """),
                {"aid": analysis_id, "raw": raw_response}
            )
            await db.commit()
