"""
apps/api/workers/tasks/case_updater.py

Automatically transitions procurement cases through their lifecycle stages
based on date comparisons, document content, and AI classification.

Lifecycle stages:
  active_bidding   — Accepting bids; bid_deadline has not passed
  under_evaluation — Bid deadline has passed; BAC evaluating
  awarded          — NOA issued / award_date is set
  ongoing          — NTP issued / ntp_date has passed
  completed        — contract_end_date has passed, or document confirms completion
  cancelled        — Marked cancelled by extractor or manual flag

Strategy:
  1. Date-based SQL promotion (fast, no AI) — handles all clear-cut cases
  2. Heuristic date inference — estimates contract_end_date from category + duration norms
  3. AI-powered stage classification (DeepSeek primary, OpenAI audit) — for stuck/ambiguous cases
     Only called when case has been stuck for >60 days AND has document text available
"""

import json
import os
from datetime import date, datetime, timedelta

import httpx
import structlog
from database import async_session_maker
from sqlalchemy import text

logger = structlog.get_logger()

# ─── Duration Heuristics By Category ───────────────────────────────────────────
# Estimated average contract duration in days per procurement category
# Used when contract_start_date exists but contract_end_date is missing
CATEGORY_DURATION_DAYS = {
    "infrastructure":        365,   # 1 year typical road/building project
    "goods":                  60,   # delivery contracts
    "consulting_services":   180,   # 6 months typical
    "ict":                   120,   # 4 months typical
    "general_services":       90,   # 3 months
    "equipment":              90,   # delivery + installation
    "medical_supplies":       60,
    "default":               270,   # 9 months fallback
}


# ─── LLM Helper ────────────────────────────────────────────────────────────────

async def _call_llm(url: str, api_key: str, model: str, prompt: str) -> str | None:
    """Low-level LLM call with 15s timeout."""
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_tokens": 200,
        "response_format": {"type": "json_object"},
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            r = await client.post(url, json=payload, headers=headers)
            if r.status_code == 200:
                return r.json()["choices"][0]["message"]["content"].strip()
            logger.warning("LLM call failed", model=model, status=r.status_code)
        except Exception as e:
            logger.warning("LLM call exception", model=model, error=str(e))
    return None


async def _ai_classify_stage(doc_text: str, case_title: str, planned_amount: float,
                              award_date: str | None, bid_deadline: str | None,
                              created_at: str) -> tuple[str, float]:
    """
    Uses DeepSeek (primary) + OpenAI GPT-4o-mini (audit/confirmation) to classify
    the procurement lifecycle stage of a case with missing date fields.

    Returns (stage, confidence) where confidence is 0.0–1.0.
    DeepSeek does the heavy lifting. OpenAI is only called to confirm if DeepSeek
    confidence < 0.70 or if the classification is 'completed' or 'cancelled'.
    """
    valid_stages = ["active_bidding", "under_evaluation", "awarded", "ongoing", "completed", "cancelled"]

    prompt = (
        "You are a Philippine government procurement analyst. "
        "Based on the following procurement document text and metadata, classify the CURRENT lifecycle stage "
        "of this procurement project. Respond ONLY with a JSON object with keys:\n"
        "  'stage': one of [active_bidding, under_evaluation, awarded, ongoing, completed, cancelled]\n"
        "  'confidence': float 0.0-1.0 (how confident you are)\n"
        "  'reasoning': 1-2 sentences explaining why\n\n"
        f"Project Title: {case_title}\n"
        f"Planned Amount: {planned_amount:,.2f} PHP\n"
        f"Bid Deadline on Record: {bid_deadline or 'Not available'}\n"
        f"Award Date on Record: {award_date or 'Not available'}\n"
        f"Case Created: {created_at}\n"
        f"Today's Date: {date.today().isoformat()}\n\n"
        "Document Text (first 1500 chars):\n"
        f"{doc_text[:1500]}\n\n"
        "Classification:"
    )

    deepseek_stage = None
    deepseek_conf = 0.0
    deepseek_reasoning = ""

    # 1. DeepSeek — primary heavy lifter
    ds_key = os.getenv("DEEPSEEK_API_KEY")
    if ds_key and ds_key != "your_key_here":
        ds_model = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash")
        raw = await _call_llm(
            url="https://api.deepseek.com/chat/completions",
            api_key=ds_key,
            model=ds_model,
            prompt=prompt,
        )
        if raw:
            try:
                parsed = json.loads(raw)
                stage = parsed.get("stage", "").lower().replace(" ", "_")
                if stage in valid_stages:
                    deepseek_stage = stage
                    deepseek_conf = float(parsed.get("confidence", 0.5))
                    deepseek_reasoning = parsed.get("reasoning", "")
                    logger.info("DeepSeek stage classification", stage=deepseek_stage,
                                confidence=deepseek_conf, case=case_title[:50])
            except Exception as e:
                logger.warning("DeepSeek stage parse error", error=str(e))

    # 2. OpenAI — audit/confirmation layer:
    #    Called ONLY when:
    #    - DeepSeek confidence < 0.70 (uncertain)
    #    - DeepSeek classified as 'completed' or 'cancelled' (high-stakes, must confirm)
    #    - DeepSeek failed entirely
    needs_openai = (
        deepseek_stage is None
        or deepseek_conf < 0.70
        or deepseek_stage in ("completed", "cancelled")
    )

    if needs_openai:
        oa_key = os.getenv("OPENAI_API_KEY")
        if oa_key and oa_key != "your_key_here":
            audit_prompt = (
                "You are a senior Philippine procurement auditor reviewing an AI classification.\n\n"
                f"DeepSeek classified this project as: '{deepseek_stage}' "
                f"(confidence: {deepseek_conf:.0%})\n"
                f"DeepSeek reasoning: {deepseek_reasoning}\n\n"
                "Please independently verify and provide your own classification. "
                "Respond ONLY with a JSON object:\n"
                "  'stage': one of [active_bidding, under_evaluation, awarded, ongoing, completed, cancelled]\n"
                "  'confidence': float 0.0-1.0\n"
                "  'agrees_with_deepseek': boolean\n\n"
                f"Project Title: {case_title}\n"
                f"Bid Deadline: {bid_deadline or 'Not available'}\n"
                f"Award Date: {award_date or 'Not available'}\n"
                f"Today: {date.today().isoformat()}\n\n"
                "Document excerpt:\n"
                f"{doc_text[:800]}\n\n"
                "Audit:"
            )
            raw_oa = await _call_llm(
                url="https://api.openai.com/v1/chat/completions",
                api_key=oa_key,
                model="gpt-4o-mini",
                prompt=audit_prompt,
            )
            if raw_oa:
                try:
                    parsed_oa = json.loads(raw_oa)
                    oa_stage = parsed_oa.get("stage", "").lower().replace(" ", "_")
                    oa_conf = float(parsed_oa.get("confidence", 0.5))
                    agrees = parsed_oa.get("agrees_with_deepseek", True)

                    if oa_stage in valid_stages:
                        if not agrees or oa_conf > deepseek_conf:
                            # OpenAI disagrees or is more confident → use OpenAI's classification
                            logger.info("OpenAI overrides DeepSeek stage classification",
                                        old_stage=deepseek_stage, new_stage=oa_stage,
                                        case=case_title[:50])
                            return oa_stage, oa_conf
                        else:
                            # OpenAI agrees → average confidence (higher certainty)
                            return deepseek_stage, min(1.0, (deepseek_conf + oa_conf) / 2 + 0.1)
                except Exception as e:
                    logger.warning("OpenAI stage audit parse error", error=str(e))

    # Return DeepSeek result (or fallback to None)
    if deepseek_stage:
        return deepseek_stage, deepseek_conf

    return "active_bidding", 0.3  # final fallback — leave as active_bidding with low confidence


# ─── Main Stage Promotion ───────────────────────────────────────────────────────

async def update_case_stages() -> dict:
    """
    Scans all procurement cases and promotes them to the correct lifecycle stage.

    Strategy:
    1. SQL date-based promotion (instant, no AI) — handles clear-cut cases
    2. Heuristic contract_end_date inference — estimates end date from category + start date
    3. AI classification — for cases stuck >60 days with missing dates but linked documents
    """
    logger.info("Case updater: running lifecycle stage promotion...")

    transitions = {
        "to_under_evaluation": 0,
        "to_awarded": 0,
        "to_ongoing": 0,
        "to_completed": 0,
        "ai_classified": 0,
        "heuristic_end_date": 0,
    }

    async with async_session_maker() as db:

        # ── Step 1: SQL date-based promotion ──────────────────────────────────

        # 1a. active_bidding → under_evaluation
        #     When: bid_deadline passed >1 day ago, no award yet
        res = await db.execute(text("""
            UPDATE procurement_cases
               SET procurement_stage = 'under_evaluation',
                   updated_at = CURRENT_TIMESTAMP
             WHERE procurement_stage = 'active_bidding'
               AND bid_deadline IS NOT NULL
               AND bid_deadline < CURRENT_DATE - INTERVAL '1 day'
               AND award_date IS NULL
        """))
        transitions["to_under_evaluation"] = res.rowcount

        # 1b. any non-completed/cancelled → awarded
        #     When: award_date is set
        res = await db.execute(text("""
            UPDATE procurement_cases
               SET procurement_stage = 'awarded',
                   updated_at = CURRENT_TIMESTAMP
             WHERE procurement_stage IN ('active_bidding', 'under_evaluation')
               AND award_date IS NOT NULL
        """))
        transitions["to_awarded"] = res.rowcount

        # 1c. awarded → ongoing
        #     When: ntp_date is set and has passed
        res = await db.execute(text("""
            UPDATE procurement_cases
               SET procurement_stage = 'ongoing',
                   updated_at = CURRENT_TIMESTAMP
             WHERE procurement_stage = 'awarded'
               AND ntp_date IS NOT NULL
               AND ntp_date <= CURRENT_DATE
        """))
        transitions["to_ongoing"] = res.rowcount

        # 1d. ongoing → completed
        #     When: contract_end_date has passed
        res = await db.execute(text("""
            UPDATE procurement_cases
               SET procurement_stage = 'completed',
                   updated_at = CURRENT_TIMESTAMP
             WHERE procurement_stage = 'ongoing'
               AND contract_end_date IS NOT NULL
               AND contract_end_date < CURRENT_DATE
        """))
        transitions["to_completed"] = res.rowcount

        # ── Step 2: Heuristic contract_end_date inference ─────────────────────
        # For awarded/ongoing cases that have contract_start_date but no contract_end_date,
        # estimate contract_end_date using category duration norms.
        lacking_end = await db.execute(text("""
            SELECT case_id, category, contract_start_date
              FROM procurement_cases
             WHERE procurement_stage IN ('awarded', 'ongoing')
               AND contract_start_date IS NOT NULL
               AND contract_end_date IS NULL
        """))
        for row in lacking_end.mappings().all():
            cat = row["category"] or "default"
            duration = CATEGORY_DURATION_DAYS.get(cat, CATEGORY_DURATION_DAYS["default"])
            start = row["contract_start_date"]
            if isinstance(start, str):
                try:
                    start = datetime.strptime(start, "%Y-%m-%d").date()
                except ValueError:
                    continue
            estimated_end = start + timedelta(days=duration)
            await db.execute(text("""
                UPDATE procurement_cases
                   SET contract_end_date = :end_date,
                       updated_at = CURRENT_TIMESTAMP
                 WHERE case_id = :cid
            """), {"end_date": estimated_end, "cid": row["case_id"]})
            transitions["heuristic_end_date"] += 1
            logger.info("Heuristic contract_end_date set", case_id=row["case_id"],
                        category=cat, estimated_end=str(estimated_end))

        # Re-run completed promotion after heuristic end dates are set
        if transitions["heuristic_end_date"] > 0:
            res2 = await db.execute(text("""
                UPDATE procurement_cases
                   SET procurement_stage = 'completed',
                       updated_at = CURRENT_TIMESTAMP
                 WHERE procurement_stage = 'ongoing'
                   AND contract_end_date IS NOT NULL
                   AND contract_end_date < CURRENT_DATE
            """))
            transitions["to_completed"] += res2.rowcount

        await db.commit()

    # ── Step 3: AI classification for stuck cases ──────────────────────────────
    # Find cases stuck as 'active_bidding' for >60 days with no bid_deadline,
    # no award_date, but with at least one linked document.
    async with async_session_maker() as db:
        stuck_res = await db.execute(text("""
            SELECT pc.case_id, pc.title,
                   COALESCE(pc.planned_amount, 0) AS planned_amount,
                   pc.award_date, pc.bid_deadline,
                   pc.created_at::text AS created_at,
                   pc.category,
                   d.storage_path AS doc_path,
                   d.document_id
              FROM procurement_cases pc
              JOIN procurement_events pe ON pe.case_id = pc.case_id
              JOIN documents d ON d.document_id = pe.document_id
             WHERE pc.procurement_stage = 'active_bidding'
               AND pc.bid_deadline IS NULL
               AND pc.award_date IS NULL
               AND pc.created_at < CURRENT_TIMESTAMP - INTERVAL '60 days'
               AND (pc.ai_stage_confidence IS NULL OR pc.ai_stage_confidence < 0.6)
             GROUP BY pc.case_id, pc.title, pc.planned_amount, pc.award_date,
                      pc.bid_deadline, pc.created_at, pc.category, d.storage_path, d.document_id
             LIMIT 20
        """))
        stuck_cases = stuck_res.mappings().all()

        if stuck_cases:
            logger.info(f"AI stage classifier: found {len(stuck_cases)} stuck cases to classify")

        from storage import get_api_store
        store = get_api_store()

        for case in stuck_cases:
            # Load document text from storage
            doc_text = ""
            try:
                raw = store.get_bytes(case["doc_path"])
                if raw:
                    doc_text = raw.decode("utf-8", errors="replace")
            except Exception as e:
                logger.warning("Could not load doc text for AI classifier",
                               case_id=case["case_id"], error=str(e))

            if not doc_text or len(doc_text) < 100:
                continue

            # Run AI classification
            try:
                new_stage, confidence = await _ai_classify_stage(
                    doc_text=doc_text,
                    case_title=case["title"],
                    planned_amount=float(case["planned_amount"] or 0),
                    award_date=case["award_date"],
                    bid_deadline=case["bid_deadline"],
                    created_at=case["created_at"],
                )
            except Exception as e:
                logger.error("AI stage classification failed", case_id=case["case_id"], error=str(e))
                continue

            # Only apply if confidence meets threshold
            if confidence >= 0.65 and new_stage != "active_bidding":
                await db.execute(text("""
                    UPDATE procurement_cases
                       SET procurement_stage = :stage,
                           ai_stage_confidence = :conf,
                           stage_classified_at = CURRENT_TIMESTAMP,
                           updated_at = CURRENT_TIMESTAMP
                     WHERE case_id = :cid
                """), {"stage": new_stage, "conf": confidence, "cid": case["case_id"]})
                transitions["ai_classified"] += 1
                logger.info("AI stage classification applied",
                            case_id=case["case_id"], stage=new_stage,
                            confidence=f"{confidence:.0%}")
            else:
                # Low confidence — still record the attempt so we don't retry immediately
                await db.execute(text("""
                    UPDATE procurement_cases
                       SET ai_stage_confidence = :conf,
                           stage_classified_at = CURRENT_TIMESTAMP
                     WHERE case_id = :cid
                """), {"conf": confidence, "cid": case["case_id"]})
                logger.info("AI stage classification: low confidence, keeping active_bidding",
                            case_id=case["case_id"], confidence=f"{confidence:.0%}")

        await db.commit()

    total = sum(v for k, v in transitions.items() if k != "heuristic_end_date")
    logger.info(
        "Case updater: stage promotion complete",
        total_transitioned=total,
        **transitions
    )
    return {"status": "success", "transitions": transitions, "total": total}
