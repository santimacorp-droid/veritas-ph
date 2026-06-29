"""
apps/api/workers/tasks/extractor.py

Extractor worker for Veritas.
Uses regex patterns to parse structured fields from notice text and populates the database.
"""

import json
import random
import re
from uuid import uuid4
from datetime import datetime

import structlog
from database import async_session_maker
from sqlalchemy import text
from storage import get_api_store

logger = structlog.get_logger()


def normalize_date_to_iso(date_str: str) -> str | None:
    """Converts various date strings to YYYY-MM-DD. Returns None if invalid."""
    if not date_str:
        return None
    try:
        from dateutil.parser import parse
        dt = parse(date_str, fuzzy=True, dayfirst=True)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return None

def normalize_amount(amount_str: str) -> float | None:
    if not amount_str:
        return None
    import re
    cleaned = re.sub(r'(?i)(php|p|₱|,|\s)', '', amount_str)
    multiplier = 1.0
    if cleaned.upper().endswith('M'):
        multiplier = 1000000.0
        cleaned = cleaned[:-1]
    elif cleaned.upper().endswith('B'):
        multiplier = 1000000000.0
        cleaned = cleaned[:-1]
    try:
        return float(cleaned) * multiplier
    except ValueError:
        return None

def normalize_language_text(text_str: str) -> str:
    """Normalizes mixed Filipino-English text to canonical English names for key entities."""
    if not text_str:
        return text_str
    
    replacements = {
        r"(?i)\bRepublika\s+ng\s+Pilipinas\b": "Republic of the Philippines",
        r"(?i)\bKagawaran\s+ng\s+Gawain\s+Pambayan\s+at\s+Lansangan\b": "Department of Public Works and Highways",
        r"(?i)\bKagawaran\s+ng\s+Edukasyon\b": "Department of Education",
        r"(?i)\bKagawaran\s+ng\s+Kalusugan\b": "Department of Health",
        r"(?i)\bKagawaran\s+ng\s+Tanggulang\s+Pambansa\b": "Department of National Defense",
        r"(?i)\bKagawaran\s+ng\s+Transportasyon\b": "Department of Transportation",
        r"(?i)\bLungsod\s+ng\b": "City of",
        r"(?i)\bBayan\s+ng\b": "Municipality of",
        r"(?i)\bLalawigan\s+ng\b": "Province of",
        r"(?i)\bPamahalaang\s+Lokal\s+ng\b": "Local Government of",
    }
    
    normalized = text_str
    for pattern, repl in replacements.items():
        normalized = re.sub(pattern, repl, normalized)
    return normalized

def run_ner_extraction(text_content: str) -> dict:
    """Applies spaCy NER for identifying entities. Falls back to rule-based regex if spaCy is unavailable."""
    entities = {"organizations": [], "locations": []}
    try:
        import spacy
        try:
            nlp = spacy.load("en_core_web_sm")
        except Exception:
            nlp = spacy.blank("en")
            
        doc = nlp(text_content)
        for ent in doc.ents:
            if ent.label_ in ["ORG"]:
                entities["organizations"].append(ent.text)
            elif ent.label_ in ["GPE", "LOC"]:
                entities["locations"].append(ent.text)
    except ImportError:
        logger.warning("spaCy not installed. Falling back to rule-based NER extraction.")
        org_matches = re.findall(r"\b(?:Department|Kagawaran)\s+of\s+[A-Za-z\s]+|\b[A-Z][A-Za-z0-9\s]+(?:Corp\.|Corporation|Inc\.|Incorporated|Co\.|Company|Ltd\.)", text_content)
        entities["organizations"] = list(set(org_matches))
        loc_matches = re.findall(r"\b(?:Province\s+of|Lungsod\s+ng|Bayan\s+ng|City\s+of|Municipality\s+of)\s+[A-Z][a-zA-Z\s]+", text_content)
        entities["locations"] = list(set(loc_matches))
    return entities


async def process_document(document_id: str):
    """
    Local extraction pipeline with database mapping.
    Parses document text using regex patterns to extract reference numbers, budgets, titles,
    procuring entities, methods, and categories, then populates SQLite tables.
    """
    logger.info(f"Extracting data from document: {document_id}")

    extracted_data = {}
    spans = []
    text_content = ""

    # 1. Fetch document record to get storage_path
    async with async_session_maker() as db:
        res = await db.execute(
            text("SELECT storage_path, source_id, document_type FROM documents WHERE document_id = :did"),
            {"did": document_id},
        )
        row = res.mappings().first()
        doc_type = row.get("document_type") if row else None
        storage_path = row.get("storage_path") if row else None
        if storage_path:
            # Load document text from local storage
            doc_bytes = get_api_store().get_bytes(storage_path)
            if doc_bytes:
                if str(storage_path).lower().endswith(".pdf"):
                    try:
                        import io
                        import pdfplumber
                        with pdfplumber.open(io.BytesIO(doc_bytes)) as pdf:
                            text_content = "\n".join(page.extract_text() or "" for page in pdf.pages)
                        if not text_content.strip():
                            # OCR fallback
                            import pytesseract
                            from pdf2image import convert_from_bytes
                            images = convert_from_bytes(doc_bytes)
                            text_content = "\n".join(pytesseract.image_to_string(img) for img in images)
                    except Exception as e:
                        logger.warning(f"Failed to parse PDF document content: {e}")
                else:
                    try:
                        text_content = doc_bytes.decode("utf-8", errors="ignore")
                    except Exception as e:
                        logger.warning(f"Failed to decode document content: {e}")

    # 2. Extract fields using regex patterns if text content is available
    if text_content:
        # Run NER extraction as metadata
        ner_res = run_ner_extraction(text_content)
        extracted_data["ner_entities"] = ner_res

        # Regex patterns supporting colons, spaces, and non-breaking spaces
        ref_patterns = [
            r"(?i)Reference\s+Number\s*(?::)?\s*([A-Za-z0-9\(\)-]+)",
            r"(?i)ref\s*No\.?\s*(?::)?\s*([A-Za-z0-9\(\)-]+)",
            r"(?i)Project\s+No\.?\s*(?::)?\s*([A-Za-z0-9\(\)-]+)",
            r"(?i)Project\s+Number\s*(?::)?\s*([A-Za-z0-9\(\)-]+)",
            r"(?i)solicitation\s+number\s*(?::)?\s*([A-Za-z0-9\(\)-]+)",
            r"(?i)PhilGEPS\s+Reference\s+No\.?\s*(?::)?\s*([A-Za-z0-9-]+)",
        ]
        pe_patterns = [
            r"(?i)Procuring\s+Entity\s*(?::)?\s*([^\n\r]+)",
            r"(?i)Procuring\s+Agency\s*(?::)?\s*([^\n\r]+)",
        ]
        title_patterns = [
            r"(?i)Title\s*(?::)?\s*([^\n\r]+)",
            r"(?i)project\s+title\s*(?::)?\s*([^\n\r]+)",
            r"(?i)project\s+name\s*(?::)?\s*([^\n\r]+)",
            r"(?i)\bProject\b(?!\s+(?:No|Number|Code|Status|Duration|Location|Cost|Limit|Mode|Type|Category|Date))\s*(?::)?\s*([^\n\r]+)",
        ]
        abc_patterns = [
            r"(?i)Approved\s+Budget\s+for\s+the\s+Contract\s*(?::)?\s*(?:PHP|₱)?[\s\xa0]*([\d,]+(?:\.\d+)?\s*(?:M|Million|B|Billion)?)",
            r"(?i)budget\s*(?::)?\s*(?:PHP|₱)?[\s\xa0]*([\d,]+(?:\.\d+)?\s*(?:M|Million|B|Billion)?)",
            r"(?i)abc\s*(?::)?\s*(?:PHP|₱)?[\s\xa0]*([\d,]+(?:\.\d+)?\s*(?:M|Million|B|Billion)?)",
        ]
        pm_patterns = [
            r"(?i)Procurement\s+Mode\s*(?::)?\s*([^\n\r]+)",
            r"(?i)procurement\s+method\s*(?::)?\s*([^\n\r]+)",
        ]
        cat_patterns = [r"(?i)Category\s*(?::)?\s*([^\n\r]+)"]
        pub_patterns = [
            r"(?i)Date\s+Published\s*(?::)?\s*([^\n\r]+)",
            r"(?i)\bDate\b(?!\s+Due)\s*(?::)?\s*([^\n\r]+)",
        ]
        closing_patterns = [
            r"(?i)Closing\s+Date\s*(?:/\s*Time)?\s*(?::)?\s*([^\n\r]+(?:AM|PM)?)",
            r"(?i)Closing\s+Date\s*(?::)?\s*([^\n\r]+)",
            r"(?i)Due\s+Date\s*(?::)?\s*([^\n\r]+)",
        ]

        # Reference Number
        for pat in ref_patterns:
            match = re.search(pat, text_content)
            if match:
                ref_no = match.group(1).strip()
                extracted_data["procurement_ref_no"] = ref_no
                spans.append(
                    {
                        "field": "procurement_ref_no",
                        "page": 1,
                        "text": match.group(0),
                        "bounding_box": [100, 150, 200, 20],
                        "char_start": match.start(),
                        "char_end": match.end(),
                    }
                )
                break

        # Procuring Entity
        for pat in pe_patterns:
            match = re.search(pat, text_content)
            if match:
                pe_val = match.group(1).strip()
                pe_val = normalize_language_text(pe_val)
                extracted_data["procuring_entity"] = pe_val
                spans.append(
                    {
                        "field": "procuring_entity",
                        "page": 1,
                        "text": match.group(0),
                        "bounding_box": [100, 180, 300, 20],
                        "char_start": match.start(),
                        "char_end": match.end(),
                    }
                )
                break

        # Project Title
        for pat in title_patterns:
            match = re.search(pat, text_content)
            if match:
                title_val = match.group(1).strip()
                extracted_data["title"] = title_val
                spans.append(
                    {
                        "field": "title",
                        "page": 1,
                        "text": match.group(0),
                        "bounding_box": [100, 250, 300, 30],
                        "char_start": match.start(),
                        "char_end": match.end(),
                    }
                )
                break

        # ABC/Planned Amount
        for pat in abc_patterns:
            match = re.search(pat, text_content)
            if match:
                try:
                    amt = normalize_amount(match.group(1))
                    if amt is not None:
                        extracted_data["planned_amount"] = amt
                        spans.append(
                            {
                                "field": "planned_amount",
                                "page": 1,
                                "text": match.group(0),
                                "bounding_box": [450, 780, 100, 25],
                                "char_start": match.start(),
                                "char_end": match.end(),
                            }
                        )
                except ValueError:
                    pass
                break

        # Procurement Method
        for pat in pm_patterns:
            match = re.search(pat, text_content)
            if match:
                pm_val = match.group(1).strip()
                extracted_data["procurement_method"] = pm_val
                spans.append(
                    {
                        "field": "procurement_method",
                        "page": 1,
                        "text": match.group(0),
                        "bounding_box": [100, 300, 200, 20],
                        "char_start": match.start(),
                        "char_end": match.end(),
                    }
                )
                break

        # Category
        for pat in cat_patterns:
            match = re.search(pat, text_content)
            if match:
                cat_val = match.group(1).strip()
                extracted_data["category"] = cat_val
                spans.append(
                    {
                        "field": "category",
                        "page": 1,
                        "text": match.group(0),
                        "bounding_box": [100, 330, 200, 20],
                        "char_start": match.start(),
                        "char_end": match.end(),
                    }
                )
                break

        # Date Published
        for pat in pub_patterns:
            match = re.search(pat, text_content)
            if match:
                pub_val = match.group(1).strip()
                extracted_data["date_published"] = pub_val
                spans.append(
                    {
                        "field": "date_published",
                        "page": 1,
                        "text": match.group(0),
                        "bounding_box": [100, 360, 200, 20],
                        "char_start": match.start(),
                        "char_end": match.end(),
                    }
                )
                break

        # Closing Date
        for pat in closing_patterns:
            match = re.search(pat, text_content)
            if match:
                closing_val = match.group(1).strip()
                extracted_data["closing_date"] = closing_val
                spans.append(
                    {
                        "field": "closing_date",
                        "page": 1,
                        "text": match.group(0),
                        "bounding_box": [100, 390, 200, 20],
                        "char_start": match.start(),
                        "char_end": match.end(),
                    }
                )
                break

    # 3. Handle extraction failures
    if not extracted_data or "procurement_ref_no" not in extracted_data:
        logger.info(f"Extraction failed for document: {document_id}")
        async with async_session_maker() as db:
            await db.execute(
                text("UPDATE documents SET processing_status = 'error' WHERE document_id = :did"),
                {"did": document_id},
            )
            await db.commit()
        return {"status": "failed", "error": "extraction_failed"}

    # Calculate confidence based on extracted fields
    expected_fields = [
        "procurement_ref_no", "procuring_entity", "title", "planned_amount", 
        "procurement_method", "category", "date_published", "closing_date"
    ]
    extracted_count = sum(1 for field in expected_fields if field in extracted_data)
    confidence_score = extracted_count / len(expected_fields)

    # 4. Save to database and map to agencies / cases / events / awards
    async with async_session_maker() as db:
        extraction_id = str(uuid4())
        await db.execute(
            text("""
                INSERT INTO extractions (
                    extraction_id, document_id, extractor, parser_version, 
                    fields, raw_spans, confidence, review_status
                )
                VALUES (
                    :eid, :did, 'rule_pattern_parser', 'v1.0.0', 
                    :fields, :spans, :conf, 'unreviewed'
                )
            """),
            {
                "eid": extraction_id,
                "did": document_id,
                "fields": json.dumps(extracted_data),
                "spans": json.dumps(spans),
                "conf": confidence_score,
            },
        )

        publisher_id = 'pub1'
        if row and row.get("source_id"):
            pub_res = await db.execute(
                text("SELECT publisher_id FROM sources WHERE source_id = :sid"),
                {"sid": row["source_id"]}
            )
            pub_row = pub_res.mappings().first()
            if pub_row and pub_row["publisher_id"]:
                publisher_id = pub_row["publisher_id"]

        # 4.1 Resolve Procuring Entity to Agency ID
        procuring_entity = extracted_data.get("procuring_entity")
        agency_id = None
        if procuring_entity:
            agency_res = await db.execute(text("SELECT agency_id, name FROM agencies"))
            agencies = agency_res.mappings().all()
            best_score = 0
            best_agency = None
            from rapidfuzz import fuzz
            for a in agencies:
                score = fuzz.token_sort_ratio(procuring_entity.lower(), str(a["name"]).lower())
                if score > 80 and score > best_score:
                    best_score = score
                    best_agency = a["agency_id"]
            
            if best_agency:
                agency_id = best_agency
            else:
                agency_id = str(uuid4())
                name_lower = procuring_entity.lower()
                if "municipality" in name_lower or "brgy" in name_lower or "barangay" in name_lower:
                    agency_type = "municipality"
                elif "province" in name_lower:
                    agency_type = "province"
                elif "city" in name_lower:
                    agency_type = "city"
                else:
                    agency_type = "national_agency"

                acronym = "".join([w[0].upper() for w in procuring_entity.split() if w.isalnum()])[
                    :10
                ]
                await db.execute(
                    text("""
                        INSERT INTO agencies (agency_id, publisher_id, name, acronym, agency_type)
                        VALUES (:aid, :pid, :name, :acronym, :atype)
                    """),
                    {
                        "aid": agency_id,
                        "pid": publisher_id,
                        "name": procuring_entity,
                        "acronym": acronym,
                        "atype": agency_type,
                    },
                )

        # Fallback agency if not resolved
        if not agency_id:
            agency_id = "8a7b6c5d-4e3f-2a1b-0c9d-8e7f6a5b4c3d"  # Default to DPWH ID

        # 4.2 Find or create Case
        ref_no = extracted_data.get("procurement_ref_no")
        title = extracted_data.get("title", f"Procurement Notice ({ref_no or document_id[:8]})")
        planned_amount = float(extracted_data.get("planned_amount", 0.0) or 0.0)
        procurement_method = extracted_data.get("procurement_method", "Public Bidding")
        category = extracted_data.get("category", "Goods")

        case_id = str(uuid4())
        case_exists = False
        if ref_no:
            case_res = await db.execute(
                text("SELECT case_id FROM procurement_cases WHERE procurement_ref_no = :ref_no"),
                {"ref_no": ref_no},
            )
            case_row = case_res.mappings().first()
            if case_row and "case_id" in case_row:
                case_id = case_row["case_id"]
                case_exists = True

        # Map method and category to canonical formats
        method_key = procurement_method.lower().replace(" ", "_")
        if "bidding" in method_key:
            method_key = "public_bidding"
        elif "shopping" in method_key:
            method_key = "shopping"
        elif "value" in method_key or "svp" in method_key:
            method_key = "small_value_procurement"
        elif "negotiated" in method_key:
            method_key = "negotiated"

        cat_key = category.lower().replace(" ", "_")
        if "infra" in cat_key or "construction" in cat_key:
            cat_key = "infrastructure"
        elif "drugs" in cat_key or "medicine" in cat_key or "goods" in cat_key:
            cat_key = "goods"
        elif "consult" in cat_key:
            cat_key = "consulting_services"

        deadline_val = (
            datetime.strptime(dl, "%Y-%m-%d").date()
            if (dl := normalize_date_to_iso(extracted_data.get("closing_date")))
            else None
        )

        # Infer initial procurement_stage from document type and extracted dates
        from datetime import date as _date
        _today = _date.today()
        
        if doc_type == "completion_report":
            inferred_stage = "completed"
        elif doc_type == "contract":
            inferred_stage = "ongoing"
        elif doc_type == "award_notice":
            inferred_stage = "awarded"
        elif deadline_val and deadline_val < _today:
            inferred_stage = "under_evaluation"
        else:
            inferred_stage = "active_bidding"

        if not case_exists:
            await db.execute(
                text("""
                    INSERT INTO procurement_cases (
                        case_id, publisher_id, agency_id, procurement_ref_no, title,
                        procurement_method, category, planned_amount, bid_deadline,
                        status, procurement_stage
                    )
                    VALUES (
                        :cid, :pid, :aid, :ref, :title,
                        :method, :cat, :amount, :deadline,
                        'open', :stage
                    )
                """),
                {
                    "cid": case_id,
                    "pid": publisher_id,
                    "aid": agency_id,
                    "ref": ref_no,
                    "title": title,
                    "method": method_key,
                    "cat": cat_key,
                    "amount": planned_amount,
                    "deadline": deadline_val,
                    "stage": inferred_stage,
                },
            )
        else:
            # Enforce unidirectional progression
            current_stage_res = await db.execute(
                text("SELECT procurement_stage FROM procurement_cases WHERE case_id = :cid"),
                {"cid": case_id}
            )
            current_stage_row = current_stage_res.mappings().first()
            current_stage = current_stage_row["procurement_stage"] if current_stage_row else "active_bidding"
            
            stage_order = {
                "active_bidding": 1,
                "under_evaluation": 2,
                "awarded": 3,
                "ongoing": 4,
                "completed": 5,
                "cancelled": 6
            }
            
            if stage_order.get(current_stage, 0) > stage_order.get(inferred_stage, 0):
                inferred_stage = current_stage

            await db.execute(
                text("""
                    UPDATE procurement_cases
                    SET publisher_id = :pid,
                        agency_id = :aid,
                        title = :title,
                        procurement_method = :method,
                        category = :cat,
                        planned_amount = :amount,
                        bid_deadline = :deadline,
                        procurement_stage = :stage,
                        risk_score = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE case_id = :cid
                """),
                {
                    "pid": publisher_id,
                    "aid": agency_id,
                    "title": title,
                    "method": method_key,
                    "cat": cat_key,
                    "amount": planned_amount,
                    "deadline": deadline_val,
                    "stage": inferred_stage,
                    "cid": case_id,
                },
            )

        # Check if tender event for this case & document already exists
        event_res = await db.execute(
            text("SELECT event_id FROM procurement_events WHERE case_id = :cid AND document_id = :did AND stage = 'tender'"),
            {"cid": case_id, "did": document_id}
        )
        event_exists = event_res.mappings().first() is not None

        if not event_exists:
            # Insert tender event
            await db.execute(
                text("""
                    INSERT INTO procurement_events (
                        event_id, case_id, document_id, stage, event_type, event_date, amount, notes
                    )
                    VALUES (
                        :eid, :cid, :did, 'tender', 'bid_notice', :event_date, :amount, 'Scraped from PhilGEPS Open Opportunities.'
                    )
                """),
                {
                    "eid": str(uuid4()),
                    "cid": case_id,
                    "did": document_id,
                    "event_date": (
                        datetime.strptime(ed, "%Y-%m-%d").date()
                        if (ed := normalize_date_to_iso(extracted_data.get("date_published")))
                        else None
                    ),
                    "amount": planned_amount,
                },
            )


        # Mark document as extracted
        await db.execute(
            text("UPDATE documents SET processing_status = 'extracted' WHERE document_id = :did"),
            {"did": document_id},
        )
        await db.commit()

    logger.info(f"Extraction complete for {document_id}", extraction_id=extraction_id)
    return {"status": "success", "extraction_id": extraction_id}
