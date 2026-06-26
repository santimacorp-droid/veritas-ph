"""
apps/api/workers/tasks/risk_engine.py

Risk Engine worker for Veritas.
Runs rule-based and statistical checks to fire discrepancies.
"""

import json
import os
from datetime import date, datetime
from uuid import uuid4

import httpx
import math
import structlog
from database import async_session_maker
from sqlalchemy import text

logger = structlog.get_logger()

# ─── Date Parsing Utility ───────────────────────────────────────────────────


def parse_date(date_str: str) -> date | None:
    """
    Parses DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD formats into a datetime.date object.
    """
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None


async def insert_baseline_evidence(db, case_id: str, discrepancy_id: str, rule_version: str = "v1.0.0"):
    """Inserts a baseline provenance link to the case's source document, extracting span details if available."""
    sql = text("""
        SELECT d.document_id, d.source_url, d.sha256_hash, d.fetch_timestamp,
               e.confidence, e.parser_version, e.raw_spans
        FROM procurement_events pe
        JOIN documents d ON d.document_id = pe.document_id
        LEFT JOIN extractions e ON e.document_id = d.document_id
        WHERE pe.case_id = :cid
        LIMIT 1
    """)
    res = await db.execute(sql, {"cid": case_id})
    doc = res.mappings().first()
    if doc:
        raw_spans = doc.get("raw_spans")
        if raw_spans and isinstance(raw_spans, str):
            try:
                raw_spans = json.loads(raw_spans)
            except Exception:
                raw_spans = None
        
        page_number = None
        char_start = None
        char_end = None
        
        if raw_spans and isinstance(raw_spans, list):
            selected_span = None
            priority_fields = ["procurement_ref_no", "planned_amount", "closing_date", "date_published"]
            for field in priority_fields:
                for span in raw_spans:
                    if span.get("field") == field:
                        selected_span = span
                        break
                if selected_span:
                    break
            
            if not selected_span and raw_spans:
                selected_span = raw_spans[0]
            
            if selected_span:
                page_number = selected_span.get("page")
                char_start = selected_span.get("char_start")
                char_end = selected_span.get("char_end")

        await db.execute(
            text("""
                INSERT INTO evidence_links (
                    link_id, entity_type, entity_id, document_id, 
                    source_url, sha256_hash, fetch_timestamp,
                    page_number, char_start, char_end,
                    extraction_confidence, parser_version, rule_version
                )
                VALUES (
                    :lid, 'discrepancy', :did, :docid, 
                    :url, :hash, :ts,
                    :page, :start, :end,
                    :conf, :parser, :rule_v
                )
            """),
            {
                "lid": str(uuid4()),
                "did": discrepancy_id,
                "docid": str(doc["document_id"]),
                "url": doc["source_url"],
                "hash": doc["sha256_hash"],
                "ts": doc["fetch_timestamp"],
                "page": page_number,
                "start": char_start,
                "end": char_end,
                "conf": doc["confidence"],
                "parser": doc["parser_version"] or "v1.0.0",
                "rule_v": rule_version,
            },
        )


# ─── AI Helper & Explanation Generator ───────────────────────────────────────


async def call_llm_api(url: str, api_key: str, model: str, prompt: str) -> str | None:
    """Helper function to execute standard chat completion request."""
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "max_tokens": 150,
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
            else:
                logger.warning(
                    f"LLM API call failed: {model} returned status {response.status_code} - {response.text}"
                )
        except Exception as e:
            logger.warning(f"Exception during LLM API call for {model}: {e}")
    return None


async def generate_explanation(
    discrepancy_type: str,
    rule_id: str,
    why_fired: dict,
    case_title: str,
    agency_name: str,
    awarded_amount: float,
    fallback_text: str,
) -> str:
    """
    Generate a citizen-friendly explanation of the anomaly using DeepSeek V3 (primary)
    with a fallback to OpenAI GPT-4o-mini, and a final local rule fallback.
    """
    prompt = (
        f"You are a civic watchdog and procurement audit assistant. Explain the following public procurement anomaly "
        f"in a citizen-friendly, clear, and objective tone. Do not use jargon. Limit the response to 2 to 3 sentences.\n\n"
        f"Anomaly Type: {discrepancy_type}\n"
        f"Rule ID: {rule_id}\n"
        f"Project Title: {case_title}\n"
        f"Procuring Agency: {agency_name or 'Unknown Agency'}\n"
        f"Contract Value: {awarded_amount:,.2f} PHP (if applicable)\n"
        f"Technical details: {json.dumps(why_fired)}\n\n"
        f"Response:"
    )

    # 1. Try Deepseek
    deepseek_key = os.getenv("DEEPSEEK_API_KEY")
    if deepseek_key and deepseek_key != "your_key_here":
        logger.info("Attempting explanation generation using Deepseek (deepseek-chat)...")
        res = await call_llm_api(
            url="https://api.deepseek.com/chat/completions",
            api_key=deepseek_key,
            model="deepseek-chat",
            prompt=prompt,
        )
        if res:
            logger.info("Deepseek explanation generated successfully.")
            return res

    # 2. Fallback to OpenAI
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key and openai_key != "your_key_here":
        logger.info("Attempting explanation generation using OpenAI (gpt-4o-mini)...")
        res = await call_llm_api(
            url="https://api.openai.com/v1/chat/completions",
            api_key=openai_key,
            model="gpt-4o-mini",
            prompt=prompt,
        )
        if res:
            logger.info("OpenAI explanation generated successfully.")
            return res

    # 3. Final local fallback
    logger.info("No LLM API keys configured or calls failed. Using local fallback explanation.")
    return fallback_text


# ─── Risk Rule: Single Bidder on High-Value Contract ──────────────────────────


async def check_single_bidder_risk(db, case_id: str):
    """
    Rule: Fired if a high-value contract (> 10M PHP) has only one bidder.
    This is a common indicator of tailored specifications or collusion.
    """
    # 1. Fetch case, award, and agency data
    sql = text("""
        SELECT 
            pc.case_id, pc.title, pc.awarded_amount, pc.procurement_method,
            aw.bidders_count, aw.single_bidder, aw.document_id,
            d.source_url, d.sha256_hash,
            a.name AS agency_name
        FROM procurement_cases pc
        JOIN awards aw ON aw.case_id = pc.case_id
        LEFT JOIN agencies a ON a.agency_id = pc.agency_id
        LEFT JOIN documents d ON d.document_id = aw.document_id
        WHERE pc.case_id = :cid
    """)
    result = await db.execute(sql, {"cid": case_id})
    case = result.mappings().first()

    if not case:
        return None

    # 2. Apply Logic
    threshold_amount = 10_000_000.00  # 10M PHP
    awarded_amount = float(case["awarded_amount"] or 0)
    is_high_value = awarded_amount >= threshold_amount
    is_single_bidder = case["bidders_count"] == 1 or case["single_bidder"] is True

    if is_high_value and is_single_bidder:
        discrepancy_id = str(uuid4())

        # 3. Create Explainable Discrepancy
        fallback_explanation = (
            f"This high-value contract ({awarded_amount:,.2f} PHP) was awarded "
            "to a single bidder. Large public biddings typically attract multiple "
            "competitors; a single-bidder outcome may indicate restrictive "
            "technical specifications or insufficient competition time."
        )

        why_fired = {
            "rule": "SINGLE_BIDDER_HIGH_VALUE",
            "conditions": {
                "awarded_amount": awarded_amount,
                "threshold": threshold_amount,
                "bidders_count": case["bidders_count"],
            },
        }

        # Generate AI explanation with local fallback
        explanation = await generate_explanation(
            discrepancy_type="competition_risk",
            rule_id="RULE_001",
            why_fired=why_fired,
            case_title=case["title"],
            agency_name=case["agency_name"],
            awarded_amount=awarded_amount,
            fallback_text=fallback_explanation,
        )

        await db.execute(
            text("""
                INSERT INTO discrepancies (
                    discrepancy_id, case_id, discrepancy_type, severity, 
                    explanation, rule_id, rule_version, why_fired, 
                    source_document_ids, review_status
                )
                VALUES (
                    :did, :cid, 'competition_risk', 'high', 
                    :exp, 'RULE_001', 'v1.0.0', :why, 
                    :thresholds, :docs, 'pending'
                )
            """),
            {
                "did": discrepancy_id,
                "cid": case_id,
                "exp": explanation,
                "why": json.dumps(why_fired), "thresholds": json.dumps(why_fired.get("conditions", {})),
                "docs": json.dumps([str(case["document_id"])]) if case["document_id"] else "[]",
            },
        )

        # 4. Link evidence directly
        await insert_baseline_evidence(db, case_id, discrepancy_id)

        return discrepancy_id
    return None


# ─── Risk Rule: Budget Splitting ──────────────────────────────────────────────


async def check_budget_splitting(db, case_id: str):
    """
    Rule: Fired if multiple small contracts (e.g. Shopping/SVP) from the same agency
    have similar titles and occur within a 30-day window, potentially bypassing
    public bidding thresholds.
    """
    # 1. Fetch current case info
    sql = text("""
        SELECT pc.agency_id, pc.title, pc.awarded_amount, pc.award_date, pc.procurement_method, pc.category,
               a.name AS agency_name
        FROM procurement_cases pc
        LEFT JOIN agencies a ON a.agency_id = pc.agency_id
        WHERE pc.case_id = :cid
    """)
    result = await db.execute(sql, {"cid": case_id})
    case = result.mappings().first()

    if not case or not case["agency_id"] or not case["award_date"]:
        return None

    # Check if this case uses a non-competitive method
    non_competitive_methods = {"shopping", "small_value_procurement", "negotiated"}
    if str(case["procurement_method"]).lower() not in non_competitive_methods:
        return None

    # 2. Find similar cases within 30 days
    cluster_sql = text("""
        SELECT case_id, title, awarded_amount, award_date
        FROM procurement_cases
        WHERE agency_id = :aid
          AND category = :cat
          AND procurement_method IN ('Shopping', 'Small Value Procurement', 'Negotiated', 'shopping', 'small_value_procurement', 'negotiated')
          AND case_id != :cid
          AND award_date BETWEEN date(:date, '-30 days') AND date(:date, '+30 days')
    """)
    cluster_result = await db.execute(
        cluster_sql,
        {
            "aid": str(case["agency_id"]),
            "cat": case["category"],
            "cid": case_id,
            "date": case["award_date"],
        },
    )

    from rapidfuzz import fuzz

    siblings = []
    for r in cluster_result.mappings().all():
        sim = fuzz.token_sort_ratio(case["title"], r["title"]) / 100.0
        if sim > 0.70:
            siblings.append(r)

    if not siblings:
        return None

    # 3. Calculate Aggregates
    awarded_amount = float(case["awarded_amount"] or 0)
    total_amount = awarded_amount + sum(float(s["awarded_amount"] or 0) for s in siblings)
    bidding_threshold = 1_000_000.00

    if total_amount >= bidding_threshold:
        discrepancy_id = str(uuid4())
        fallback_explanation = (
            f"Potential 'Budget Splitting' detected. This contract for '{case['title']}' "
            f"is one of {len(siblings) + 1} similar contracts awarded by this agency within 30 days. "
            f"The combined value ({total_amount:,.2f} PHP) exceeds the {bidding_threshold:,.2f} PHP "
            "threshold that typically triggers public bidding."
        )

        why_fired = {
            "rule": "BUDGET_SPLITTING",
            "cluster_size": len(siblings) + 1,
            "total_value": total_amount,
            "threshold": bidding_threshold,
            "related_cases": [str(s["case_id"]) for s in siblings],
        }

        # Generate AI explanation with local fallback
        explanation = await generate_explanation(
            discrepancy_type="transparency_risk",
            rule_id="RULE_002",
            why_fired=why_fired,
            case_title=case["title"],
            agency_name=case["agency_name"],
            awarded_amount=awarded_amount,
            fallback_text=fallback_explanation,
        )

        await db.execute(
            text("""
                INSERT INTO discrepancies (
                    discrepancy_id, case_id, discrepancy_type, severity, 
                    explanation, rule_id, rule_version, why_fired, review_status
                )
                VALUES (
                    :did, :cid, 'transparency_risk', 'high', 
                    :exp, 'RULE_002', 'v1.0.0', :why, :thresholds, 'pending'
                )
            """),
            {
                "did": discrepancy_id,
                "cid": case_id,
                "exp": explanation,
                "why": json.dumps(why_fired),
            },
        )
        return discrepancy_id

    return None


# ─── Risk Rule: Short Posting Window ──────────────────────────────────────────


async def check_short_posting_window(db, case_id: str):
    """
    Rule: Fired if the notice posting window (closing_date - date_published) is strictly
    less than 7 calendar days (statutory minimum under RA 9184 Sec 21).
    """
    # 1. Fetch case, extraction fields, and document details
    sql = text("""
        SELECT 
            pc.case_id, pc.title,
            pe.document_id, pe.event_date,
            e.fields,
            d.source_url, d.sha256_hash,
            a.name AS agency_name
        FROM procurement_cases pc
        LEFT JOIN agencies a ON a.agency_id = pc.agency_id
        JOIN procurement_events pe ON pe.case_id = pc.case_id AND pe.stage = 'tender' AND pe.event_type = 'bid_notice'
        LEFT JOIN extractions e ON e.document_id = pe.document_id
        LEFT JOIN documents d ON d.document_id = pe.document_id
        WHERE pc.case_id = :cid
    """)
    result = await db.execute(sql, {"cid": case_id})
    row = result.mappings().first()

    if not row or not row["fields"]:
        return None

    try:
        fields = json.loads(row["fields"])
    except Exception:
        return None

    date_published_str = fields.get("date_published")
    closing_date_str = fields.get("closing_date")

    if not date_published_str or not closing_date_str:
        return None

    date_published = parse_date(date_published_str)
    closing_date = parse_date(closing_date_str)

    if not date_published or not closing_date:
        return None

    diff_days = (closing_date - date_published).days

    # RA 9184 minimum posting days per procurement method
    method_thresholds = {
        "public_bidding": 20,
        "shopping": 7,
        "small_value_procurement": 7,
        "negotiated": 7,
        "direct_contracting": 0
    }
    method_key = str(row.get("procurement_method", "")).lower()
    
    # Determine minimum days based on method (fallback to 7 if unknown)
    min_posting_days = method_thresholds.get(method_key, 7)

    if diff_days < min_posting_days:
        discrepancy_id = str(uuid4())

        fallback_explanation = (
            f"The posting window for this bid notice was only {diff_days} days "
            f"({date_published_str} to {closing_date_str}), which is less than the statutory "
            f"minimum of {min_posting_days} calendar days required by Section 21 of RA 9184. "
            f"Short posting windows limit competition and may favor pre-selected suppliers."
        )

        why_fired = {
            "rule": "SHORT_POSTING_WINDOW",
            "conditions": {
                "date_published": date_published_str,
                "closing_date": closing_date_str,
                "days_posted": diff_days,
                "required_minimum_days": min_posting_days,
            },
        }

        # Generate AI explanation with local fallback
        explanation = await generate_explanation(
            discrepancy_type="transparency_risk",
            rule_id="RULE_003",
            why_fired=why_fired,
            case_title=row["title"],
            agency_name=row["agency_name"],
            awarded_amount=0.0,
            fallback_text=fallback_explanation,
        )

        await db.execute(
            text("""
                INSERT INTO discrepancies (
                    discrepancy_id, case_id, discrepancy_type, severity, 
                    explanation, rule_id, rule_version, why_fired, 
                    source_document_ids, review_status
                )
                VALUES (
                    :did, :cid, 'transparency_risk', 'high', 
                    :exp, 'RULE_003', 'v1.0.0', :why, 
                    :thresholds, :docs, 'pending'
                )
            """),
            {
                "did": discrepancy_id,
                "cid": case_id,
                "exp": explanation,
                "why": json.dumps(why_fired), "thresholds": json.dumps(why_fired.get("conditions", {})),
                "docs": json.dumps([str(row["document_id"])]) if row["document_id"] else "[]",
            },
        )

        # Link evidence directly
        await insert_baseline_evidence(db, case_id, discrepancy_id)

        return discrepancy_id
    return None


# ─── Risk Rule: RULE-004: Award-to-Budget Overshoot ────────────────────────────


async def check_award_to_budget_overshoot(db, case_id: str):
    sql = text("""
        SELECT pc.case_id, pc.title, pc.planned_amount, pc.awarded_amount, pc.final_contract_amount,
               a.name AS agency_name, pc.publisher_id
        FROM procurement_cases pc
        LEFT JOIN agencies a ON a.agency_id = pc.agency_id
        WHERE pc.case_id = :cid
    """)
    result = await db.execute(sql, {"cid": case_id})
    case = result.mappings().first()
    if not case or not case["planned_amount"] or not case["awarded_amount"]:
        return None
    
    planned = float(case["planned_amount"])
    awarded = float(case["awarded_amount"])
    final = float(case["final_contract_amount"] or 0)
    
    # Check if discrepancy already exists to avoid duplication
    exists = (await db.execute(text("SELECT 1 FROM discrepancies WHERE case_id = :cid AND rule_id = 'RULE_004'"), {"cid": case_id})).scalar()
    if exists:
        return "exists"
        
    overshoot_val = awarded
    if final > 0:
        overshoot_val = final
        
    if planned > 0 and overshoot_val > planned * 1.20:
        discrepancy_id = str(uuid4())
        fallback_explanation = (
            f"The final award or contract amount ({overshoot_val:,.2f} PHP) significantly exceeded the "
            f"Approved Budget for the Contract ({planned:,.2f} PHP) by over 20%. Under RA 9184 Sec 31, "
            "budgets serve as ceilings, and excessive final costs require justification."
        )
        why_fired = {
            "rule": "AWARD_TO_BUDGET_OVERSHOOT",
            "planned_amount": planned,
            "awarded_amount": awarded,
            "final_contract_amount": final,
            "overshoot_percentage": (overshoot_val / planned - 1) * 100
        }
        explanation = await generate_explanation(
            discrepancy_type="financial_risk",
            rule_id="RULE_004",
            why_fired=why_fired,
            case_title=case["title"],
            agency_name=case["agency_name"],
            awarded_amount=awarded,
            fallback_text=fallback_explanation
        )
        await db.execute(
            text("""
                INSERT INTO discrepancies (discrepancy_id, case_id, discrepancy_type, severity, explanation, rule_id, rule_version, why_fired, thresholds_applied, review_status)
                VALUES (:did, :cid, 'financial_risk', 'high', :exp, 'RULE_004', 'v1.0.0', :why, :thresholds, 'pending')
            """),
            {"did": discrepancy_id, "cid": case_id, "exp": explanation, "why": json.dumps(why_fired), "thresholds": json.dumps(why_fired.get("conditions", {}))}
        )
        await insert_baseline_evidence(db, case_id, discrepancy_id)
        return discrepancy_id
    return None


# ─── Risk Rule: RULE-005: Variation Order Abuse ─────────────────────────────────


async def check_variation_order_abuse(db, case_id: str):
    exists = (await db.execute(text("SELECT 1 FROM discrepancies WHERE case_id = :cid AND rule_id = 'RULE_005'"), {"cid": case_id})).scalar()
    if exists:
        return "exists"
        
    sql = text("""
        SELECT c.contract_id, c.amount AS contract_amount, COALESCE(MAX(ca.amount_change), 0) AS total_change,
               pc.title, a.name AS agency_name, pc.awarded_amount
        FROM contracts c
        JOIN procurement_cases pc ON pc.case_id = c.case_id
        LEFT JOIN agencies a ON a.agency_id = pc.agency_id
        LEFT JOIN contract_amendments ca ON ca.contract_id = c.contract_id
        WHERE c.case_id = :cid
        GROUP BY c.contract_id, c.amount, pc.title, a.name, pc.awarded_amount
    """)
    result = await db.execute(sql, {"cid": case_id})
    row = result.mappings().first()
    if not row or not row["contract_amount"] or not row["total_change"]:
        return None
        
    contract_amount = float(row["contract_amount"])
    total_change = float(row["total_change"])
    
    if contract_amount > 0 and total_change > contract_amount * 0.10:
        discrepancy_id = str(uuid4())
        pct = (total_change / contract_amount) * 100
        fallback_explanation = (
            f"The total variation order adjustments ({total_change:,.2f} PHP) for this contract "
            f"exceed 10% of the original contract value ({contract_amount:,.2f} PHP). Section 38 "
            "of RA 9184 and standard COA guidelines require variation orders to be kept under 10% "
            "unless highly exceptional conditions apply."
        )
        why_fired = {
            "rule": "VARIATION_ORDER_ABUSE",
            "contract_amount": contract_amount,
            "total_change": total_change,
            "percentage": pct
        }
        explanation = await generate_explanation(
            discrepancy_type="financial_risk",
            rule_id="RULE_005",
            why_fired=why_fired,
            case_title=row["title"],
            agency_name=row["agency_name"],
            awarded_amount=float(row["awarded_amount"] or 0),
            fallback_text=fallback_explanation
        )
        await db.execute(
            text("""
                INSERT INTO discrepancies (discrepancy_id, case_id, discrepancy_type, severity, explanation, rule_id, rule_version, why_fired, thresholds_applied, review_status)
                VALUES (:did, :cid, 'financial_risk', 'high', :exp, 'RULE_005', 'v1.0.0', :why, :thresholds, 'pending')
            """),
            {"did": discrepancy_id, "cid": case_id, "exp": explanation, "why": json.dumps(why_fired), "thresholds": json.dumps(why_fired.get("conditions", {}))}
        )
        await insert_baseline_evidence(db, case_id, discrepancy_id)
        return discrepancy_id
    return None


# ─── Risk Rule: RULE-006: APP-Tender Mismatch ───────────────────────────────────


async def check_app_tender_mismatch(db, case_id: str):
    exists = (await db.execute(text("SELECT 1 FROM discrepancies WHERE case_id = :cid AND rule_id = 'RULE_006'"), {"cid": case_id})).scalar()
    if exists:
        return "exists"
        
    sql = text("""
        SELECT pc.case_id, pc.title, a.name AS agency_name, pc.awarded_amount
        FROM procurement_cases pc
        LEFT JOIN agencies a ON a.agency_id = pc.agency_id
        WHERE pc.case_id = :cid
    """)
    result = await db.execute(sql, {"cid": case_id})
    case = result.mappings().first()
    if not case:
        return None
        
    match_sql = text("SELECT COUNT(*) FROM app_items WHERE linked_case_id = :cid")
    match_count = (await db.execute(match_sql, {"cid": case_id})).scalar()
    
    if match_count == 0:
        discrepancy_id = str(uuid4())
        fallback_explanation = (
            f"This procurement case for '{case['title']}' is not linked to any scheduled Annual Procurement Plan "
            "(APP) item. Procurement projects must be planned in the APP (RA 9184 Sec 7) before posting "
            "to ensure budgetary alignment and prevent unscheduled expenditure."
        )
        why_fired = {
            "rule": "APP_TENDER_MISMATCH",
            "linked_app_count": 0
        }
        explanation = await generate_explanation(
            discrepancy_type="transparency_risk",
            rule_id="RULE_006",
            why_fired=why_fired,
            case_title=case["title"],
            agency_name=case["agency_name"],
            awarded_amount=float(case["awarded_amount"] or 0),
            fallback_text=fallback_explanation
        )
        await db.execute(
            text("""
                INSERT INTO discrepancies (discrepancy_id, case_id, discrepancy_type, severity, explanation, rule_id, rule_version, why_fired, thresholds_applied, review_status)
                VALUES (:did, :cid, 'transparency_risk', 'medium', :exp, 'RULE_006', 'v1.0.0', :why, :thresholds, 'pending')
            """),
            {"did": discrepancy_id, "cid": case_id, "exp": explanation, "why": json.dumps(why_fired), "thresholds": json.dumps(why_fired.get("conditions", {}))}
        )
        await insert_baseline_evidence(db, case_id, discrepancy_id)
        return discrepancy_id
    return None


# ─── Risk Rule: RULE-007: Unrelated Supplier Win ─────────────────────────────────


async def check_unrelated_supplier_win(db, case_id: str):
    exists = (await db.execute(text("SELECT 1 FROM discrepancies WHERE case_id = :cid AND rule_id = 'RULE_007'"), {"cid": case_id})).scalar()
    if exists:
        return "exists"
        
    sql = text("""
        SELECT pc.case_id, pc.title, pc.category, s.canonical_name AS supplier_name, s.supplier_id,
               s.business_classification, a.name AS agency_name, pc.awarded_amount
        FROM procurement_cases pc
        JOIN awards aw ON aw.case_id = pc.case_id
        JOIN suppliers s ON s.supplier_id = aw.supplier_id
        LEFT JOIN agencies a ON a.agency_id = pc.agency_id
        WHERE pc.case_id = :cid
    """)
    result = await db.execute(sql, {"cid": case_id})
    row = result.mappings().first()
    if not row or not row["category"] or not row["supplier_name"]:
        return None
        
    category = str(row["category"]).lower()
    sup_name = str(row["supplier_name"]).lower()
    
    # Use the supplier's registered SEC/DTI classification
    industry = str(row.get("business_classification") or "unclassified").lower()
    
    mismatch = False
    details = ""
    if "infrastructure" in category and industry in ["health", "trading"]:
        mismatch = True
        details = f"Supplier's SEC/DTI registration classifies them as '{industry}' but won an infrastructure contract."
    elif "goods" in category and industry == "construction" and "vaccines" in str(row["title"]).lower():
        mismatch = True
        details = f"Supplier's SEC/DTI registration classifies them as '{industry}' but won a vaccine procurement contract."
        
    if mismatch:
        discrepancy_id = str(uuid4())
        fallback_explanation = (
            f"Unrelated Supplier Win: The supplier '{row['supplier_name']}' specializing in other services "
            f"won a contract categorized as '{row['category']}' for '{row['title']}'. This category mismatch "
            "is a red flag for shell companies or non-qualified bidding."
        )
        why_fired = {
            "rule": "UNRELATED_SUPPLIER_WIN",
            "supplier_name": row["supplier_name"],
            "case_category": row["category"],
            "indicators": details
        }
        explanation = await generate_explanation(
            discrepancy_type="competition_risk",
            rule_id="RULE_007",
            why_fired=why_fired,
            case_title=row["title"],
            agency_name=row["agency_name"],
            awarded_amount=float(row["awarded_amount"] or 0),
            fallback_text=fallback_explanation
        )
        await db.execute(
            text("""
                INSERT INTO discrepancies (discrepancy_id, case_id, discrepancy_type, severity, explanation, rule_id, rule_version, why_fired, thresholds_applied, review_status)
                VALUES (:did, :cid, 'competition_risk', 'medium', :exp, 'RULE_007', 'v1.0.0', :why, :thresholds, 'pending')
            """),
            {"did": discrepancy_id, "cid": case_id, "exp": explanation, "why": json.dumps(why_fired), "thresholds": json.dumps(why_fired.get("conditions", {}))}
        )
        await insert_baseline_evidence(db, case_id, discrepancy_id)
        return discrepancy_id
    return None


# ─── Risk Rule: RULE-008: Late NTP Issuance ──────────────────────────────────────


async def check_late_ntp_issuance(db, case_id: str):
    exists = (await db.execute(text("SELECT 1 FROM discrepancies WHERE case_id = :cid AND rule_id = 'RULE_008'"), {"cid": case_id})).scalar()
    if exists:
        return "exists"
        
    sql = text("""
        SELECT pc.case_id, pc.title, pc.award_date, pc.ntp_date,
               a.name AS agency_name, pc.awarded_amount
        FROM procurement_cases pc
        LEFT JOIN agencies a ON a.agency_id = pc.agency_id
        WHERE pc.case_id = :cid
    """)
    result = await db.execute(sql, {"cid": case_id})
    row = result.mappings().first()
    if not row or not row["award_date"] or not row["ntp_date"]:
        return None
        
    a_date = row["award_date"]
    n_date = row["ntp_date"]
    
    if isinstance(a_date, str):
        a_date = parse_date(a_date)
    if isinstance(n_date, str):
        n_date = parse_date(n_date)
        
    if not a_date or not n_date:
        return None
        
    diff = (n_date - a_date).days
    
    if diff > 15:
        severity = "medium"
        discrepancy_id = str(uuid4())
        fallback_explanation = (
            f"The Notice to Proceed (NTP) was issued {diff} calendar days after the Notice of Award "
            f"({a_date} to {n_date}), exceeding the statutory limit of 15 calendar days prescribed "
            "by the IRR of RA 9184. Delays in NTP issuance can stall public services and indicate negotiation irregularities."
        )
        why_fired = {
            "rule": "LATE_NTP_ISSUANCE",
            "award_date": str(a_date),
            "ntp_date": str(n_date),
            "days_delay": diff,
            "statutory_limit": 15
        }
    elif diff < 0:
        severity = "high"
        discrepancy_id = str(uuid4())
        fallback_explanation = (
            f"The Notice to Proceed (NTP) was issued BEFORE the Notice of Award "
            f"({a_date} to {n_date}). This is a severe chronological violation."
        )
        why_fired = {
            "rule": "NTP_BEFORE_NOA",
            "award_date": str(a_date),
            "ntp_date": str(n_date),
            "days_delay": diff
        }
    
    if diff > 15 or diff < 0:
        explanation = await generate_explanation(
            discrepancy_type="timeline_risk",
            rule_id="RULE_008",
            why_fired=why_fired,
            case_title=row["title"],
            agency_name=row["agency_name"],
            awarded_amount=float(row["awarded_amount"] or 0),
            fallback_text=fallback_explanation
        )
        await db.execute(
            text("""
                INSERT INTO discrepancies (discrepancy_id, case_id, discrepancy_type, severity, explanation, rule_id, rule_version, why_fired, thresholds_applied, review_status)
                VALUES (:did, :cid, 'timeline_risk', :sev, :exp, 'RULE_008', 'v1.0.0', :why, :thresholds, 'pending')
            """),
            {"did": discrepancy_id, "cid": case_id, "exp": explanation, "why": json.dumps(why_fired), "sev": severity}
        )
        await insert_baseline_evidence(db, case_id, discrepancy_id)
        return discrepancy_id
    return None


# ─── Risk Rule: RULE-009: Missing Bid Abstract ───────────────────────────────────


async def check_missing_bid_abstract(db, case_id: str):
    exists = (await db.execute(text("SELECT 1 FROM discrepancies WHERE case_id = :cid AND rule_id = 'RULE_009'"), {"cid": case_id})).scalar()
    if exists:
        return "exists"
        
    sql = text("""
        SELECT pc.case_id, pc.title, pc.award_date,
               a.name AS agency_name, pc.awarded_amount
        FROM procurement_cases pc
        LEFT JOIN agencies a ON a.agency_id = pc.agency_id
        WHERE pc.case_id = :cid
    """)
    result = await db.execute(sql, {"cid": case_id})
    row = result.mappings().first()
    if not row or not row["award_date"]:
        return None
        
    event_sql = text("SELECT COUNT(*) FROM procurement_events WHERE case_id = :cid AND event_type = 'bid_abstract'")
    count = (await db.execute(event_sql, {"cid": case_id})).scalar()
    
    if count == 0:
        discrepancy_id = str(uuid4())
        fallback_explanation = (
            f"This contract for '{row['title']}' has been awarded, but does not have a linked Abstract of Bids "
            "document. Under Section 37 of RA 9184, the bid abstract is a critical audit document proving "
            "competitive price comparison; its absence obscures the basis of selection."
        )
        why_fired = {
            "rule": "MISSING_BID_ABSTRACT",
            "has_award_date": True,
            "abstract_events_found": 0
        }
        explanation = await generate_explanation(
            discrepancy_type="transparency_risk",
            rule_id="RULE_009",
            why_fired=why_fired,
            case_title=row["title"],
            agency_name=row["agency_name"],
            awarded_amount=float(row["awarded_amount"] or 0),
            fallback_text=fallback_explanation
        )
        await db.execute(
            text("""
                INSERT INTO discrepancies (discrepancy_id, case_id, discrepancy_type, severity, explanation, rule_id, rule_version, why_fired, thresholds_applied, review_status)
                VALUES (:did, :cid, 'transparency_risk', 'medium', :exp, 'RULE_009', 'v1.0.0', :why, :thresholds, 'pending')
            """),
            {"did": discrepancy_id, "cid": case_id, "exp": explanation, "why": json.dumps(why_fired), "thresholds": json.dumps(why_fired.get("conditions", {}))}
        )
        await insert_baseline_evidence(db, case_id, discrepancy_id)
        return discrepancy_id
    return None


# ─── Risk Rule: RULE-010: COA Finding Cross-Reference ─────────────────────────────


async def check_coa_finding_cross_ref(db, case_id: str):
    exists = (await db.execute(text("SELECT 1 FROM discrepancies WHERE case_id = :cid AND rule_id = 'RULE_010'"), {"cid": case_id})).scalar()
    if exists:
        return "exists"
        
    sql = text("""
        SELECT pc.case_id, pc.title, pc.agency_id, pc.award_date,
               a.name AS agency_name, pc.awarded_amount
        FROM procurement_cases pc
        LEFT JOIN agencies a ON a.agency_id = pc.agency_id
        WHERE pc.case_id = :cid
    """)
    result = await db.execute(sql, {"cid": case_id})
    row = result.mappings().first()
    if not row or not row["agency_id"] or not row["award_date"]:
        return None
        
    a_date = row["award_date"]
    if isinstance(a_date, str):
        a_date = parse_date(a_date)
    
    if not a_date:
        return None
        
    fiscal_year = a_date.year
    
    findings_sql = text("SELECT COUNT(*) FROM audit_findings WHERE agency_id = :aid AND fiscal_year = :year")
    findings_count = (await db.execute(findings_sql, {"aid": row["agency_id"], "year": fiscal_year})).scalar()
    
    if findings_count > 0:
        discrepancy_id = str(uuid4())
        fallback_explanation = (
            f"The procuring agency '{row['agency_name']}' has active Commission on Audit (COA) audit findings "
            f"for the fiscal year {fiscal_year}. Projects procured within years of high audit warnings carry "
            "elevated compliance and delivery risks."
        )
        why_fired = {
            "rule": "COA_FINDING_CROSS_REFERENCE",
            "agency_id": row["agency_id"],
            "fiscal_year": fiscal_year,
            "active_coa_findings": findings_count
        }
        explanation = await generate_explanation(
            discrepancy_type="compliance_risk",
            rule_id="RULE_010",
            why_fired=why_fired,
            case_title=row["title"],
            agency_name=row["agency_name"],
            awarded_amount=float(row["awarded_amount"] or 0),
            fallback_text=fallback_explanation
        )
        await db.execute(
            text("""
                INSERT INTO discrepancies (discrepancy_id, case_id, discrepancy_type, severity, explanation, rule_id, rule_version, why_fired, thresholds_applied, review_status)
                VALUES (:did, :cid, 'compliance_risk', 'high', :exp, 'RULE_010', 'v1.0.0', :why, :thresholds, 'pending')
            """),
            {"did": discrepancy_id, "cid": case_id, "exp": explanation, "why": json.dumps(why_fired), "thresholds": json.dumps(why_fired.get("conditions", {}))}
        )
        await insert_baseline_evidence(db, case_id, discrepancy_id)
        return discrepancy_id
    return None


async def check_award_before_bid_deadline(db, case_id: str):
    exists_res = await db.execute(text("SELECT 1 FROM discrepancies WHERE case_id = :cid AND rule_id = 'RULE_011'"), {"cid": case_id})
    if exists_res.scalar():
        return None

    case_res = await db.execute(
        text("""SELECT pc.title, pc.award_date, pc.bid_deadline, pc.awarded_amount, a.name as agency_name 
                FROM procurement_cases pc LEFT JOIN agencies a ON a.agency_id = pc.agency_id 
                WHERE pc.case_id = :cid"""),
        {"cid": case_id}
    )
    case = case_res.mappings().first()
    if not case or not case.get("award_date") or not case.get("bid_deadline"):
        return None

    award_dt = case["award_date"]
    if isinstance(award_dt, str):
        award_dt = parse_date(award_dt)

    deadline_dt = case["bid_deadline"]
    if isinstance(deadline_dt, str):
        deadline_dt = parse_date(deadline_dt)

    if award_dt and deadline_dt and award_dt < deadline_dt:
        discrepancy_id = str(uuid4())
        fallback_explanation = "The award date occurs before the bid submission deadline."
        why_fired = {
            "rule": "AWARD_BEFORE_BID_DEADLINE",
            "award_date": str(award_dt),
            "bid_deadline": str(deadline_dt)
        }
        explanation = await generate_explanation(
            discrepancy_type="timeline_anomaly",
            rule_id="RULE_011",
            why_fired=why_fired,
            case_title=case["title"],
            agency_name=case.get("agency_name") or "Unknown Agency",
            awarded_amount=float(case.get("awarded_amount") or 0),
            fallback_text=fallback_explanation
        )
        await db.execute(
            text("""
                INSERT INTO discrepancies (discrepancy_id, case_id, discrepancy_type, severity, explanation, rule_id, rule_version, why_fired, thresholds_applied, review_status)
                VALUES (:did, :cid, 'timeline_anomaly', 'critical', :exp, 'RULE_011', 'v1.0.0', :why, :thresholds, 'pending')
            """),
            {"did": discrepancy_id, "cid": case_id, "exp": explanation, "why": json.dumps(why_fired), "thresholds": json.dumps(why_fired.get("conditions", {}))}
        )
        await insert_baseline_evidence(db, case_id, discrepancy_id)
        return discrepancy_id
    return None


async def check_hhi_concentration(db, case_id: str):
    exists_res = await db.execute(text("SELECT 1 FROM discrepancies WHERE case_id = :cid AND rule_id = 'RULE_012'"), {"cid": case_id})
    if exists_res.scalar():
        return None

    case_res = await db.execute(
        text("""SELECT pc.title, pc.agency_id, pc.category, pc.award_date, pc.awarded_amount, a.name as agency_name 
                FROM procurement_cases pc LEFT JOIN agencies a ON a.agency_id = pc.agency_id 
                WHERE pc.case_id = :cid"""),
        {"cid": case_id}
    )
    case = case_res.mappings().first()
    if not case or not case.get("agency_id") or not case.get("category") or not case.get("award_date"):
        return None

    award_dt = case["award_date"]
    if isinstance(award_dt, str):
        award_dt = parse_date(award_dt)
    if not award_dt:
        return None

    fiscal_year = award_dt.year

    market_res = await db.execute(
        text("""
            SELECT a.supplier_id, SUM(a.amount) as total_awarded
            FROM awards a
            JOIN procurement_cases pc ON a.case_id = pc.case_id
            WHERE pc.agency_id = :aid AND pc.category = :cat 
              AND EXTRACT(YEAR FROM a.award_date) = :year
              AND a.supplier_id IS NOT NULL
            GROUP BY a.supplier_id
        """),
        {"aid": case["agency_id"], "cat": case["category"], "year": fiscal_year}
    )
    market = market_res.mappings().all()

    if not market:
        return None

    total_market_size = sum(float(m["total_awarded"] or 0) for m in market)
    if total_market_size == 0:
        return None

    hhi = 0
    for m in market:
        share = (float(m["total_awarded"] or 0) / total_market_size) * 100
        hhi += (share ** 2)

    if hhi > 2500:
        discrepancy_id = str(uuid4())
        fallback_explanation = f"The supplier market for {case['category']} at this agency is highly concentrated (HHI: {hhi:.1f}), indicating potential monopoly or reduced competition."
        why_fired = {
            "rule": "HHI_CONCENTRATION_CHECK",
            "hhi_score": hhi,
            "fiscal_year": fiscal_year,
            "category": case["category"]
        }
        explanation = await generate_explanation(
            discrepancy_type="competition_risk",
            rule_id="RULE_012",
            why_fired=why_fired,
            case_title=case["title"],
            agency_name=case.get("agency_name") or "Unknown Agency",
            awarded_amount=float(case.get("awarded_amount") or 0),
            fallback_text=fallback_explanation
        )
        await db.execute(
            text("""
                INSERT INTO discrepancies (discrepancy_id, case_id, discrepancy_type, severity, explanation, rule_id, rule_version, why_fired, thresholds_applied, review_status)
                VALUES (:did, :cid, 'competition_risk', 'medium', :exp, 'RULE_012', 'v1.0.0', :why, :thresholds, 'pending')
            """),
            {"did": discrepancy_id, "cid": case_id, "exp": explanation, "why": json.dumps(why_fired), "thresholds": json.dumps(why_fired.get("conditions", {}))}
        )
        await insert_baseline_evidence(db, case_id, discrepancy_id)
        return discrepancy_id
    return None


async def check_price_benchmark(db, case_id: str):
    exists_res = await db.execute(text("SELECT 1 FROM discrepancies WHERE case_id = :cid AND rule_id = 'RULE_013'"), {"cid": case_id})
    if exists_res.scalar():
        return None

    case_res = await db.execute(
        text("""SELECT pc.title, pc.category, pc.awarded_amount, a.name as agency_name 
                FROM procurement_cases pc LEFT JOIN agencies a ON a.agency_id = pc.agency_id 
                WHERE pc.case_id = :cid"""),
        {"cid": case_id}
    )
    case = case_res.mappings().first()
    if not case or not case.get("category"):
        return None

    items_res = await db.execute(
        text("SELECT item_id, description, unit_price FROM line_items WHERE case_id = :cid AND unit_price IS NOT NULL AND unit_price > 0"),
        {"cid": case_id}
    )
    items = items_res.mappings().all()

    flagged_items = []
    for item in items:
        similar_res = await db.execute(
            text("""
                SELECT l.unit_price FROM line_items l
                JOIN procurement_cases pc ON l.case_id = pc.case_id
                WHERE pc.category = :cat AND l.description = :desc 
                  AND l.unit_price IS NOT NULL AND l.unit_price > 0
            """),
            {"cat": case["category"], "desc": item["description"]}
        )
        similar_prices = [float(r["unit_price"]) for r in similar_res.mappings().all()]
        if len(similar_prices) > 3:
            mean = sum(similar_prices) / len(similar_prices)
            variance = sum((p - mean) ** 2 for p in similar_prices) / len(similar_prices)
            std_dev = math.sqrt(variance)

            current_price = float(item["unit_price"])
            if std_dev > 0 and current_price > (mean + 2 * std_dev):
                flagged_items.append({
                    "description": item["description"],
                    "current_price": current_price,
                    "mean_price": mean,
                    "std_dev": std_dev
                })

    if flagged_items:
        discrepancy_id = str(uuid4())
        fallback_explanation = f"Found {len(flagged_items)} items priced significantly higher (> 2 std dev) than the category historical mean."
        why_fired = {
            "rule": "PRICE_BENCHMARK_ANOMALY",
            "flagged_items": flagged_items
        }
        explanation = await generate_explanation(
            discrepancy_type="financial_anomaly",
            rule_id="RULE_013",
            why_fired=why_fired,
            case_title=case["title"],
            agency_name=case.get("agency_name") or "Unknown Agency",
            awarded_amount=float(case.get("awarded_amount") or 0),
            fallback_text=fallback_explanation
        )
        await db.execute(
            text("""
                INSERT INTO discrepancies (discrepancy_id, case_id, discrepancy_type, severity, explanation, rule_id, rule_version, why_fired, thresholds_applied, review_status)
                VALUES (:did, :cid, 'financial_anomaly', 'high', :exp, 'RULE_013', 'v1.0.0', :why, :thresholds, 'pending')
            """),
            {"did": discrepancy_id, "cid": case_id, "exp": explanation, "why": json.dumps(why_fired), "thresholds": json.dumps(why_fired.get("conditions", {}))}
        )
        await insert_baseline_evidence(db, case_id, discrepancy_id)
        return discrepancy_id
    return None


async def check_geographic_mismatch(db, case_id: str):
    exists_res = await db.execute(text("SELECT 1 FROM discrepancies WHERE case_id = :cid AND rule_id = 'RULE_014'"), {"cid": case_id})
    if exists_res.scalar():
        return None

    case_res = await db.execute(
        text("""
            SELECT pc.title, pc.geographic_scope, pc.awarded_amount, a.name as agency_name, aw.supplier_id 
            FROM procurement_cases pc
            JOIN awards aw ON pc.case_id = aw.case_id
            LEFT JOIN agencies a ON a.agency_id = pc.agency_id
            WHERE pc.case_id = :cid AND pc.category = 'infrastructure'
        """),
        {"cid": case_id}
    )
    case_awards = case_res.mappings().all()

    for award in case_awards:
        if not award.get("geographic_scope") or not award.get("supplier_id"):
            continue
        
        sup_res = await db.execute(
            text("SELECT geography_codes FROM suppliers WHERE supplier_id = :sid"),
            {"sid": award["supplier_id"]}
        )
        sup = sup_res.mappings().first()
        if not sup or not sup.get("geography_codes"):
            continue

        sup_codes = sup["geography_codes"]
        if isinstance(sup_codes, str):
            try:
                sup_codes = json.loads(sup_codes)
            except:
                sup_codes = []

        matched = False
        project_scope = str(award["geographic_scope"]).lower()
        for code in sup_codes:
            if str(code).lower() in project_scope or project_scope in str(code).lower():
                matched = True
                break

        if not matched and sup_codes:
            discrepancy_id = str(uuid4())
            fallback_explanation = "The awarded supplier's registered geography does not match the project's geographic scope."
            why_fired = {
                "rule": "GEOGRAPHIC_MISMATCH",
                "supplier_geography": sup_codes,
                "project_scope": award["geographic_scope"]
            }
            explanation = await generate_explanation(
                discrepancy_type="compliance_risk",
                rule_id="RULE_014",
                why_fired=why_fired,
                case_title=award["title"],
                agency_name=award.get("agency_name") or "Unknown Agency",
                awarded_amount=float(award.get("awarded_amount") or 0),
                fallback_text=fallback_explanation
            )
            await db.execute(
                text("""
                    INSERT INTO discrepancies (discrepancy_id, case_id, discrepancy_type, severity, explanation, rule_id, rule_version, why_fired, thresholds_applied, review_status)
                    VALUES (:did, :cid, 'compliance_risk', 'medium', :exp, 'RULE_014', 'v1.0.0', :why, :thresholds, 'pending')
                """),
                {"did": discrepancy_id, "cid": case_id, "exp": explanation, "why": json.dumps(why_fired), "thresholds": json.dumps(why_fired.get("conditions", {}))}
            )
            await insert_baseline_evidence(db, case_id, discrepancy_id)
            return discrepancy_id
    return None


async def analyze_case(case_id: str):
    """
    Run the risk engine pipeline for a case.
    """
    logger.info(f"Analyzing risk for case: {case_id}")

    async with async_session_maker() as db:
        risk_1 = await check_single_bidder_risk(db, case_id)
        risk_2 = await check_budget_splitting(db, case_id)
        risk_3 = await check_short_posting_window(db, case_id)
        risk_4 = await check_award_to_budget_overshoot(db, case_id)
        risk_5 = await check_variation_order_abuse(db, case_id)
        risk_6 = await check_app_tender_mismatch(db, case_id)
        risk_7 = await check_unrelated_supplier_win(db, case_id)
        risk_8 = await check_late_ntp_issuance(db, case_id)
        risk_9 = await check_missing_bid_abstract(db, case_id)
        risk_10 = await check_coa_finding_cross_ref(db, case_id)
        risk_11 = await check_award_before_bid_deadline(db, case_id)
        risk_12 = await check_hhi_concentration(db, case_id)
        risk_13 = await check_price_benchmark(db, case_id)
        risk_14 = await check_geographic_mismatch(db, case_id)

        # Build bitmask components
        risk_components = {
            "competition": 1.0 if (risk_1 or risk_7 or risk_12) else 0.1,
            "timeline": 1.0 if (risk_3 or risk_8 or risk_11) else 0.1,
            "financial": 1.0 if (risk_2 or risk_4 or risk_5 or risk_13) else 0.1,
            "transparency": 1.0 if (risk_6 or risk_9) else 0.1,
            "compliance": 1.0 if (risk_10 or risk_14) else 0.1
        }
        
        # Weighted scoring model
        rule_weights = [
            0.6, # R1: High
            0.6, # R2: High
            0.6, # R3: High
            0.6, # R4: High
            0.6, # R5: High
            0.3, # R6: Medium
            0.3, # R7: Medium
            0.3, # R8: Medium
            0.3, # R9: Medium
            0.6, # R10: High
            1.0, # R11: Critical
            0.3, # R12: Medium
            0.6, # R13: High
            0.3, # R14: Medium
        ]
        risks = [risk_1, risk_2, risk_3, risk_4, risk_5, risk_6, risk_7, risk_8, risk_9, risk_10, risk_11, risk_12, risk_13, risk_14]
        earned_weight = sum(w for r, w in zip(risks, rule_weights) if r is not None)
        total_weight = sum(rule_weights)
        new_score = earned_weight / total_weight if total_weight > 0 else 0.05
        
        # Methodology constraint: If ANY critical rule fires, score must be >= 0.80
        if risk_11 is not None:
            new_score = max(new_score, 0.80)
        
        # Compute confidence score
        conf_res = await db.execute(text("""
            SELECT AVG(e.confidence) FROM extractions e
            JOIN procurement_events pe ON pe.document_id = e.document_id
            WHERE pe.case_id = :cid
        """), {"cid": case_id})
        conf_val = conf_res.scalar()
        if conf_val is None:
            conf_val = 1.0

        await db.execute(
            text("""
                UPDATE procurement_cases 
                   SET risk_score = :score,
                       risk_components = :components,
                       confidence_score = :conf
                 WHERE case_id = :cid
            """),
            {
                "score": float(new_score),
                "components": json.dumps(risk_components),
                "conf": float(conf_val),
                "cid": case_id
            },
        )

        # Case-to-Law Violation Linker
        await db.execute(
            text("DELETE FROM law_case_links WHERE case_id = :cid"),
            {"cid": case_id}
        )

        if risk_1:
            c1_res = await db.execute(
                text("""
                    SELECT lc.controversy_id 
                    FROM law_controversies lc
                    JOIN law_provisions lp ON lp.provision_id = lc.provision_id
                    WHERE lp.section_number = 'Section 36'
                    LIMIT 1
                """)
            )
            c1_row = c1_res.fetchone()
            if c1_row:
                await db.execute(
                    text("""
                        INSERT INTO law_case_links (link_id, controversy_id, case_id, notes)
                        VALUES (:lid, :cont_id, :case_id, 'Fired automated discrepancy RULE_001 (Single Bidder on High-Value Contract)')
                    """),
                    {
                        "lid": str(uuid4()),
                        "cont_id": str(c1_row[0]),
                        "case_id": case_id
                    }
                )

        if risk_2:
            c2_res = await db.execute(
                text("""
                    SELECT lc.controversy_id 
                    FROM law_controversies lc
                    JOIN law_provisions lp ON lp.provision_id = lc.provision_id
                    WHERE lp.section_number = 'Section 53'
                    LIMIT 1
                """)
            )
            c2_row = c2_res.fetchone()
            if c2_row:
                await db.execute(
                    text("""
                        INSERT INTO law_case_links (link_id, controversy_id, case_id, notes)
                        VALUES (:lid, :cont_id, :case_id, 'Fired automated discrepancy RULE_002 (Budget Splitting)')
                    """),
                    {
                        "lid": str(uuid4()),
                        "cont_id": str(c2_row[0]),
                        "case_id": case_id
                    }
                )

        await db.commit()

        active_count = len([r for r in risks if r is not None])
        
        # Build timeline and update completeness score
        await build_timeline(db, case_id)

    return {"status": "success", "case_id": case_id, "risks_found": active_count}


async def build_timeline(db, case_id: str):
    """
    Inspects all procurement_events for a case and computes the completeness score.
    There are 6 possible stages: planning, tender, award, contract, implementation, audit.
    """
    sql = text("""
        SELECT DISTINCT stage FROM procurement_events WHERE case_id = :cid
    """)
    res = await db.execute(sql, {"cid": case_id})
    stages = [r[0] for r in res.fetchall()]
    
    stages_present = len(set(stages))
    completeness_score = stages_present / 6.0
    
    await db.execute(
        text("""
            UPDATE procurement_cases 
            SET completeness_score = :score 
            WHERE case_id = :cid
        """),
        {"score": completeness_score, "cid": case_id}
    )
    # Note: caller (analyze_case) is responsible for committing
