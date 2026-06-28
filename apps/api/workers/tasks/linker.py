"""
apps/api/workers/tasks/linker.py

Linker worker for Veritas.
Handles entity resolution and embedding generation.
"""

import json

import structlog
from database import async_session_maker
from embeddings import generate_embedding
from sqlalchemy import text

logger = structlog.get_logger()


async def update_supplier_embeddings():
    """
    Background task to generate embeddings for suppliers missing them.
    Enables semantic search and deduplication.
    """
    async with async_session_maker() as db:
        # 1. Find suppliers without embeddings
        sql = text(
            "SELECT supplier_id, canonical_name FROM suppliers WHERE embedding IS NULL LIMIT 100"
        )
        result = await db.execute(sql)
        suppliers = result.mappings().all()

        if not suppliers:
            return {"status": "skipped", "reason": "no_suppliers_to_process"}

        count = 0
        for s in suppliers:
            # 2. Generate embedding
            vector = await generate_embedding(s["canonical_name"])

            # 3. Update record
            await db.execute(
                text("UPDATE suppliers SET embedding = :vec WHERE supplier_id = :id"),
                {"vec": json.dumps(vector), "id": str(s["supplier_id"])},
            )
            count += 1

        await db.commit()

    logger.info(f"Updated embeddings for {count} suppliers")
    return {"status": "success", "processed": count}


async def link_app_items():
    """
    Links procurement cases to APP items based on title similarity and agency.
    """
    from rapidfuzz import fuzz
    async with async_session_maker() as db:
        # Get unlinked cases
        cases_res = await db.execute(text(
            "SELECT case_id, title, agency_id, procurement_ref_no, bid_deadline FROM procurement_cases "
            "WHERE case_id NOT IN (SELECT linked_case_id FROM app_items WHERE linked_case_id IS NOT NULL) "
            "LIMIT 500"
        ))
        cases = cases_res.mappings().all()
        
        count = 0
        for case in cases:
            # Find candidate APP items for this agency
            app_res = await db.execute(text(
                "SELECT app_item_id, description, code, fiscal_year FROM app_items "
                "WHERE agency_id = :aid AND linked_case_id IS NULL"
            ), {"aid": case["agency_id"]})
            app_items = app_res.mappings().all()
            
            best_match_id = None
            best_score = 0
            
            ref_no = str(case["procurement_ref_no"] or "").strip().lower()
            
            case_year = None
            if case.get("bid_deadline"):
                # bid_deadline is formatted as YYYY-MM-DD
                try:
                    case_year = int(str(case["bid_deadline"])[:4])
                except ValueError:
                    pass
            
            for item in app_items:
                item_code = str(item["code"] or "").strip().lower()
                item_year = item.get("fiscal_year")
                
                # If we have both years and they don't match, heavily penalize or skip
                year_penalty = 0
                if case_year and item_year and case_year != item_year:
                    year_penalty = -50
                
                # If exact reference number matches, we highly boost the score
                base_score = 100 if (ref_no and item_code and ref_no == item_code) else 0
                
                title_score = fuzz.token_sort_ratio(str(case["title"]), str(item["description"]))
                
                final_score = base_score + title_score + year_penalty
                
                # Threshold requires either exact ref_no match (base 100) or very high title similarity
                if final_score > 80 and final_score > best_score:
                    best_score = final_score
                    best_match_id = item["app_item_id"]
            
            if best_match_id:
                # Find the matched item details
                matched_item = next(it for it in app_items if it["app_item_id"] == best_match_id)
                await db.execute(text(
                    "UPDATE app_items SET linked_case_id = :cid, match_status = 'matched' WHERE app_item_id = :iid"
                ), {"cid": str(case["case_id"]), "iid": str(best_match_id)})
                
                # Create planning event in timeline if missing
                event_res = await db.execute(text(
                    "SELECT event_id FROM procurement_events WHERE case_id = :cid AND stage = 'planning'"
                ), {"cid": str(case["case_id"])})
                
                if not event_res.fetchone():
                    from uuid import uuid4
                    from datetime import date
                    await db.execute(text("""
                        INSERT INTO procurement_events (
                            event_id, case_id, stage, event_type, event_date, amount, notes
                        )
                        VALUES (:eid, :cid, 'planning', 'app_entry', :edate, :amt, :notes)
                    """), {
                        "eid": str(uuid4()),
                        "cid": str(case["case_id"]),
                        "edate": date(case_year or 2024, 1, 1),
                        "amt": float(matched_item.get("planned_amount") or 0.0),
                        "notes": f"Linked planning entry from APP item description: {matched_item['description']}"
                    })
                count += 1
        
        await db.commit()
        
    logger.info(f"Linked {count} APP items to cases")
    return {"status": "success", "linked_count": count}


async def canonicalize_suppliers():
    """
    Finds potential duplicate suppliers and logs them in pending_supplier_merges for human confirmation.
    """
    from rapidfuzz import fuzz
    from uuid import uuid4
    async with async_session_maker() as db:
        sql = text("SELECT supplier_id, canonical_name FROM suppliers")
        res = await db.execute(sql)
        suppliers = res.mappings().all()
        
        if len(suppliers) < 2:
            return {"status": "success", "flagged_count": 0}
            
        flagged_count = 0
        
        for i, sup1 in enumerate(suppliers):
            id1 = str(sup1["supplier_id"])
            name1 = str(sup1["canonical_name"]).upper()
            
            for j in range(i + 1, len(suppliers)):
                sup2 = suppliers[j]
                id2 = str(sup2["supplier_id"])
                name2 = str(sup2["canonical_name"]).upper()
                
                ratio = fuzz.token_sort_ratio(name1, name2)
                if ratio > 85:
                    await db.execute(text("""
                        INSERT INTO pending_supplier_merges (merge_id, source_id, target_id, similarity_score, status)
                        VALUES (:mid, :sid, :tid, :score, 'pending')
                        ON CONFLICT (source_id, target_id) DO NOTHING
                    """), {
                        "mid": str(uuid4()),
                        "sid": id2,  # Duplicate supplier to merge from
                        "tid": id1,  # Target canonical supplier to keep
                        "score": float(ratio) / 100.0
                    })
                    flagged_count += 1
                    
        await db.commit()
    
    logger.info(f"Flagged {flagged_count} potential supplier merges for review")
    return {"status": "success", "flagged_count": flagged_count}


async def detect_duplicate_documents():
    """
    Identifies duplicate cases (resulting from duplicate notices) using fuzzy comparison
    of titles, identical agencies, and planned amounts, then merges them.
    """
    from rapidfuzz import fuzz
    async with async_session_maker() as db:
        res = await db.execute(text(
            "SELECT case_id, title, agency_id, planned_amount, procurement_ref_no FROM procurement_cases"
        ))
        cases = res.mappings().all()
        
        if len(cases) < 2:
            return {"status": "success", "merged_cases": 0}
            
        merged_count = 0
        processed_ids = set()
        
        for i, case1 in enumerate(cases):
            id1 = str(case1["case_id"])
            if id1 in processed_ids:
                continue
            
            ref1 = str(case1["procurement_ref_no"] or "").strip()
            title1 = str(case1["title"])
            agency1 = str(case1["agency_id"])
            amount1 = float(case1["planned_amount"] or 0.0)
            
            for j in range(i + 1, len(cases)):
                case2 = cases[j]
                id2 = str(case2["case_id"])
                if id2 in processed_ids:
                    continue
                
                ref2 = str(case2["procurement_ref_no"] or "").strip()
                title2 = str(case2["title"])
                agency2 = str(case2["agency_id"])
                amount2 = float(case2["planned_amount"] or 0.0)
                
                is_match = False
                if ref1 and ref2 and ref1.lower() == ref2.lower():
                    is_match = True
                elif agency1 == agency2 and abs(amount1 - amount2) < 0.01:
                    if fuzz.token_sort_ratio(title1.lower(), title2.lower()) > 90:
                        is_match = True
                
                if is_match:
                    logger.info("Found duplicate cases, merging", case1=id1, case2=id2)
                    await db.execute(text("UPDATE procurement_events SET case_id = :id1 WHERE case_id = :id2"), {"id1": id1, "id2": id2})
                    await db.execute(text("UPDATE line_items SET case_id = :id1 WHERE case_id = :id2"), {"id1": id1, "id2": id2})
                    await db.execute(text("UPDATE awards SET case_id = :id1 WHERE case_id = :id2"), {"id1": id1, "id2": id2})
                    await db.execute(text("UPDATE contracts SET case_id = :id1 WHERE case_id = :id2"), {"id1": id1, "id2": id2})
                    await db.execute(text("UPDATE app_items SET linked_case_id = :id1 WHERE linked_case_id = :id2"), {"id1": id1, "id2": id2})
                    await db.execute(text("UPDATE discrepancies SET case_id = :id1 WHERE case_id = :id2"), {"id1": id1, "id2": id2})
                    await db.execute(text("UPDATE risk_signals SET case_id = :id1 WHERE case_id = :id2"), {"id1": id1, "id2": id2})
                    await db.execute(text("DELETE FROM procurement_cases WHERE case_id = :id2"), {"id2": id2})
                    await db.execute(text("UPDATE procurement_cases SET risk_score = NULL WHERE case_id = :id1"), {"id1": id1})
                    
                    processed_ids.add(id2)
                    merged_count += 1
                    
        await db.commit()
    
    logger.info(f"Merged {merged_count} duplicate cases")
    return {"status": "success", "merged_cases": merged_count}


async def link_contracts_to_cases():
    """
    Cross-matches contract documents to procurement cases using reference numbers.
    """
    async with async_session_maker() as db:
        res = await db.execute(text(
            "SELECT c.contract_id, c.document_id, c.contract_no, d.source_url "
            "FROM contracts c "
            "JOIN documents d ON d.document_id = c.document_id "
            "WHERE c.case_id IS NULL OR c.case_id = ''"
        ))
        unlinked_contracts = res.mappings().all()
        
        count = 0
        for contract in unlinked_contracts:
            contract_id = contract["contract_id"]
            contract_no = contract["contract_no"]
            
            if contract_no:
                case_res = await db.execute(text(
                    "SELECT case_id FROM procurement_cases WHERE procurement_ref_no = :ref OR title LIKE :pat"
                ), {"ref": contract_no, "pat": f"%{contract_no}%"})
                case_row = case_res.mappings().first()
                if case_row:
                    await db.execute(text(
                        "UPDATE contracts SET case_id = :cid WHERE contract_id = :id"
                    ), {"cid": case_row["case_id"], "id": contract_id})
                    count += 1
                    
        await db.commit()
        
    logger.info(f"Cross-matched and linked {count} contracts to cases")
    return {"status": "success", "linked_contracts": count}


async def track_linker_metrics():
    """
    Computes precision/recall statistics for entity resolution and links,
    saving the evaluation metrics to the database.
    """
    from uuid import uuid4
    async with async_session_maker() as db:
        try:
            res = await db.execute(text("""
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN action = 'false_positive' THEN 1 ELSE 0 END) as fp,
                       SUM(CASE WHEN action = 'verified' OR action = 'published' THEN 1 ELSE 0 END) as tp
                FROM analyst_reviews
            """))
            row = res.mappings().first()
            if row:
                tp = row["tp"] or 0
                fp = row["fp"] or 0
                total = row["total"] or 0
                
                precision = tp / (tp + fp) if (tp + fp) > 0 else 1.0
                fn_res = await db.execute(text("SELECT COUNT(*) FROM analyst_reviews WHERE action = 'corrected'"))
                fn = fn_res.scalar() or 0
                recall = tp / (tp + fn) if (tp + fn) > 0 else 1.0
                
                metric_id = str(uuid4())
                await db.execute(text("""
                    INSERT INTO linker_metrics (metric_id, run_timestamp, precision, recall, false_positives, false_negatives, samples_evaluated)
                    VALUES (:id, CURRENT_TIMESTAMP, :p, :r, :fp, :fn, :total)
                """), {
                    "id": metric_id,
                    "p": precision,
                    "r": recall,
                    "fp": fp,
                    "fn": fn,
                    "total": total
                })
                await db.commit()
                logger.info(f"Linker metrics calculated: Precision={precision:.2f}, Recall={recall:.2f}")
                return {"status": "success", "precision": precision, "recall": recall}
        except Exception as e:
            logger.warning(f"Failed to track linker metrics: {e}")
            return {"status": "failed", "error": str(e)}

