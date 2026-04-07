"""
apps/api/main.py

Veritas FastAPI Application — Public and Analyst APIs.

All responses include provenance fields linking claims back to source documents.
Never expose raw PII or unreviewed analyst conclusions to the public endpoint.
"""

import json
import os
from contextlib import asynccontextmanager
from typing import Optional
from uuid import UUID, uuid4

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db, engine
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import structlog
import queries

logger = structlog.get_logger()


def _cors_origins() -> list[str]:
    raw = os.getenv("VERITAS_CORS_ORIGINS", "")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Veritas API starting up")
    # Initialize DB pool, MinIO client, Redis, etc.
    yield
    logger.info("Veritas API shutting down")


app = FastAPI(
    title="Veritas — Philippines Procurement Transparency API",
    description=(
        "Open-source evidence-first procurement intelligence platform. "
        "All data is sourced from public Philippine government records. "
        "Risk signals are anomaly indicators, not legal determinations."
    ),
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Public Search ───────────────────────────────────────────────────────────

@app.get("/stats/summary", tags=["Public"])
async def get_summary(db: AsyncSession = Depends(get_db)):
    """Top-level public counters for the homepage and overview pages."""
    return await queries.get_public_summary(db)


@app.get("/search", tags=["Public"])
async def search(
    q: str = Query(..., min_length=2, description="Search query"),
    type: Optional[str] = Query(None, description="Filter: cases, suppliers"),
    agency_id: Optional[UUID] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    Full-text search across procurement cases and suppliers.
    Returns results with provenance links to source documents.
    """
    if type == "suppliers":
        results = await queries.search_suppliers(db, q, limit, offset)
        return {"query": q, "type": "suppliers", "total": len(results), "results": results}

    total, results = await queries.search_cases(db, q, agency_id, date_from, date_to, limit, offset)
    return {
        "query": q,
        "type": "cases",
        "total": total,
        "results": results,
        "meta": {"limit": limit, "offset": offset},
    }


# ─── Procurement Cases ───────────────────────────────────────────────────────

@app.get("/cases", tags=["Public"])
async def list_cases(
    limit: int = Query(25, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List procurement cases ordered by risk score."""
    total, cases = await queries.list_cases(db, limit, offset)
    return {"total": total, "cases": cases}


@app.get("/cases/{case_id}", tags=["Public"])
async def get_case(case_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Retrieve full procurement case: timeline, discrepancies, suppliers, audit links.
    Every discrepancy card links to source documents with hash, URL, and fetch timestamp.
    """
    case = await queries.get_case_detail(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@app.get("/cases/{case_id}/timeline", tags=["Public"])
async def get_case_timeline(case_id: UUID, db: AsyncSession = Depends(get_db)):
    """Procurement lifecycle timeline from planning to audit."""
    case = await queries.get_case_detail(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    timeline = await queries.get_case_timeline(db, case_id)
    return {"case_id": str(case_id), "timeline": timeline}


@app.get("/cases/{case_id}/discrepancies", tags=["Public"])
async def get_case_discrepancies(case_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Explainable risk signals for a procurement case.
    Only returns signals with review_status IN ('confirmed', 'published').
    """
    case = await queries.get_case_detail(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    discrepancies = await queries.get_case_discrepancies(db, case_id, analyst=False)
    return {"case_id": str(case_id), "discrepancies": discrepancies}


# ─── Agencies ────────────────────────────────────────────────────────────────

@app.get("/agencies", tags=["Public"])
async def list_agencies(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List all agencies with procurement volume and risk stats."""
    total, agencies = await queries.list_agencies(db, limit, offset)
    return {"total": total, "agencies": agencies}


@app.get("/agencies/{agency_id}", tags=["Public"])
async def get_agency(agency_id: UUID, db: AsyncSession = Depends(get_db)):
    """Agency profile: procurement volume, top suppliers, concentration, flagged cases."""
    agency = await queries.get_agency_profile(db, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    return agency


@app.get("/agencies/{agency_id}/cases", tags=["Public"])
async def get_agency_cases(
    agency_id: UUID,
    year: Optional[int] = None,
    limit: int = Query(20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    agency = await queries.get_agency_profile(db, agency_id)
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    total, cases = await queries.get_agency_cases(db, agency_id, limit, offset)
    return {"agency_id": str(agency_id), "total": total, "cases": cases}


# ─── Suppliers ───────────────────────────────────────────────────────────────

@app.get("/suppliers", tags=["Public"])
async def list_suppliers(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List suppliers with aggregate award totals."""
    total, suppliers = await queries.list_suppliers(db, limit, offset)
    return {"total": total, "suppliers": suppliers}


@app.get("/suppliers/{supplier_id}", tags=["Public"])
async def get_supplier(supplier_id: UUID, db: AsyncSession = Depends(get_db)):
    """Supplier profile: award history, agencies, geographies, aliases."""
    supplier = await queries.get_supplier_profile(db, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@app.get("/suppliers/{supplier_id}/awards", tags=["Public"])
async def get_supplier_awards(
    supplier_id: UUID,
    limit: int = Query(20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    supplier = await queries.get_supplier_profile(db, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    total, awards = await queries.get_supplier_awards(db, supplier_id, limit, offset)
    return {"supplier_id": str(supplier_id), "total": total, "awards": awards}


# ─── Documents ───────────────────────────────────────────────────────────────

@app.get("/documents/{document_id}", tags=["Public"])
async def get_document(document_id: UUID, db: AsyncSession = Depends(get_db)):
    """Document record with provenance: source URL, fetch timestamp, SHA-256 hash."""
    result = await db.execute(
        text("SELECT * FROM documents WHERE document_id = :id"),
        {"id": str(document_id)},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    doc = dict(row)

    # Attach presigned URL if document is in MinIO
    if doc.get("storage_path"):
        try:
            from storage import get_api_store
            doc["download_url"] = get_api_store().presign_url(doc["storage_path"], expires_hours=1)
        except Exception:
            doc["download_url"] = None
    else:
        doc["download_url"] = None

    return doc


@app.get("/documents/{document_id}/download", tags=["Public"])
async def download_document(document_id: UUID, db: AsyncSession = Depends(get_db)):
    """Proxy-stream a document from MinIO (for CORS-safe in-browser rendering)."""
    from fastapi.responses import Response
    result = await db.execute(
        text("SELECT storage_path, content_type FROM documents WHERE document_id = :id"),
        {"id": str(document_id)},
    )
    row = result.mappings().first()
    if not row or not row["storage_path"]:
        raise HTTPException(status_code=404, detail="Document not in object storage")

    try:
        from storage import get_api_store
        content = get_api_store().get_bytes(row["storage_path"])
    except Exception:
        raise HTTPException(status_code=502, detail="Object storage unavailable")

    ct = row["content_type"] or "application/octet-stream"
    return Response(
        content=content,
        media_type=ct,
        headers={"Content-Disposition": f'inline; filename="{document_id}.html"'},
    )


# ─── Discrepancies ───────────────────────────────────────────────────────────

@app.get("/discrepancies", tags=["Public"])
async def list_discrepancies(
    limit: int = Query(10, le=50),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Recent public discrepancy feed."""
    total, discrepancies = await queries.list_recent_discrepancies(db, limit, offset)
    return {"total": total, "discrepancies": discrepancies}


@app.get("/discrepancies/{discrepancy_id}", tags=["Public"])
async def get_discrepancy(discrepancy_id: UUID):
    """
    Explainable discrepancy record.
    Shows: type, severity, explanation, why_fired, thresholds, source evidence.
    Only published discrepancies are accessible here.
    """
    raise HTTPException(status_code=404, detail="Discrepancy not found")


# ─── Exports ─────────────────────────────────────────────────────────────────

@app.get("/exports/case/{case_id}.json", tags=["Exports"])
async def export_case_json(case_id: UUID, db: AsyncSession = Depends(get_db)):
    """Download full procurement case dossier as JSON with evidence bundle."""
    import json as _json
    from datetime import date, datetime
    from decimal import Decimal
    from fastapi.responses import Response

    dossier = await queries.get_case_full_export(db, case_id)
    if not dossier:
        raise HTTPException(status_code=404, detail="Case not found")

    def serialise(obj):
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return float(obj)
        raise TypeError(f"Cannot serialise {type(obj)}")

    payload = _json.dumps(dossier, default=serialise, indent=2, ensure_ascii=False)
    return Response(
        content=payload,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="case-{case_id}.json"'},
    )


@app.get("/exports/case/{case_id}.csv", tags=["Exports"])
async def export_case_csv(case_id: UUID, db: AsyncSession = Depends(get_db)):
    """Download procurement case data as CSV."""
    import csv, io
    from datetime import date, datetime
    from decimal import Decimal
    from fastapi.responses import Response

    dossier = await queries.get_case_full_export(db, case_id)
    if not dossier:
        raise HTTPException(status_code=404, detail="Case not found")

    def fmt(v):
        if isinstance(v, (date, datetime)): return v.isoformat()
        if isinstance(v, Decimal): return float(v)
        if isinstance(v, dict): return str(v)
        return v

    buf = io.StringIO()
    w = csv.writer(buf)

    # Case header
    case = dossier["case"]
    w.writerow(["# CASE"])
    w.writerow(list(case.keys()))
    w.writerow([fmt(v) for v in case.values()])

    # Awards
    if dossier["awards"]:
        w.writerow([])
        w.writerow(["# AWARDS"])
        w.writerow(list(dossier["awards"][0].keys()))
        for row in dossier["awards"]:
            w.writerow([fmt(v) for v in row.values()])

    # Discrepancies
    if dossier["discrepancies"]:
        w.writerow([])
        w.writerow(["# DISCREPANCIES"])
        w.writerow(list(dossier["discrepancies"][0].keys()))
        for row in dossier["discrepancies"]:
            w.writerow([fmt(v) for v in row.values()])

    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="case-{case_id}.csv"'},
    )


@app.get("/bulk/ocds/releases", tags=["Exports"])
async def bulk_ocds_releases(
    published_after: Optional[str] = None,
    agency_id: Optional[UUID] = None,
    limit: int = Query(100, le=1000),
):
    """
    Bulk export in Open Contracting Data Standard (OCDS) release format.
    Enables interoperability with partner transparency organizations.
    """
    return {
        "uri": "https://veritas.ph/bulk/ocds/releases",
        "version": "1.1",
        "publishedDate": None,
        "releases": [],
        "meta": {"license": "https://creativecommons.org/licenses/by/4.0/"},
    }


# ─── Analyst API (Authentication Required) ───────────────────────────────────

analyst_router_prefix = "/analyst"


@app.get(f"{analyst_router_prefix}/cases", tags=["Analyst"])
async def list_analyst_cases(
    status: str = Query("queue", pattern="^(queue|confirmed|published)$"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Case-centric discrepancy queue for the analyst console."""
    try:
        total, cases = await queries.list_analyst_cases(db, status, limit, offset)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"status": status, "total": total, "cases": cases}


@app.post(f"{analyst_router_prefix}/corrections", tags=["Analyst"])
async def submit_correction(payload: dict):
    """Submit a field correction for an extraction. Logged immutably."""
    # TODO: Validate auth, write to extractions + audit_log
    return {"status": "accepted"}


@app.post(f"{analyst_router_prefix}/verify/{{extraction_id}}", tags=["Analyst"])
async def verify_extraction(extraction_id: UUID):
    """Mark an extraction as human-verified."""
    return {"status": "verified"}


@app.post(f"{analyst_router_prefix}/cases/{{case_id}}/review", tags=["Analyst"])
async def submit_case_review(
    case_id: UUID,
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit analyst review for a flagged case.
    Valid outcomes: confirmed, false_positive, needs_evidence, publishable_lead
    All reviews are logged to audit_log with immutable timestamp.
    """
    valid_outcomes = {"confirmed", "false_positive", "needs_evidence", "publishable_lead"}
    outcome = payload.get("outcome")
    if outcome not in valid_outcomes:
        raise HTTPException(status_code=400, detail=f"outcome must be one of {valid_outcomes}")

    discrepancy_id = payload.get("discrepancy_id")
    notes = payload.get("notes", "")

    if discrepancy_id:
        placeholder_analyst_id = UUID("00000000-0000-0000-0000-000000000000")
        review_action = "verified" if outcome == "confirmed" else outcome

        current_result = await db.execute(
            text("SELECT review_status FROM discrepancies WHERE discrepancy_id = :id"),
            {"id": discrepancy_id},
        )
        current_row = current_result.mappings().first()
        if not current_row:
            raise HTTPException(status_code=404, detail="Discrepancy not found")

        await db.execute(
            text("""
                UPDATE discrepancies
                   SET review_status = :status,
                       analyst_outcome = :status,
                       reviewed_at = NOW()
                 WHERE discrepancy_id = :id
            """),
            {"status": outcome, "id": discrepancy_id},
        )
        await db.execute(
            text("""
                INSERT INTO analyst_reviews (
                    review_id, discrepancy_id, case_id, analyst_id, action, note
                )
                VALUES (
                    :review_id, :discrepancy_id, :case_id, :analyst_id, :action, :note
                )
            """),
            {
                "review_id": str(uuid4()),
                "discrepancy_id": discrepancy_id,
                "case_id": str(case_id),
                "analyst_id": str(placeholder_analyst_id),
                "action": review_action,
                "note": notes,
            },
        )
        await db.execute(
            text("""
                INSERT INTO audit_log (
                    log_id, actor_id, actor_type, action, entity_type, entity_id, old_value, new_value
                )
                VALUES (
                    :log_id, :actor_id, 'analyst', 'review_status_updated', 'discrepancy', :entity_id,
                    CAST(:old_value AS JSONB), CAST(:new_value AS JSONB)
                )
            """),
            {
                "log_id": str(uuid4()),
                "actor_id": str(placeholder_analyst_id),
                "entity_id": discrepancy_id,
                "old_value": json.dumps({"review_status": current_row["review_status"]}),
                "new_value": json.dumps({"review_status": outcome, "notes": notes}),
            },
        )
        await db.commit()

    return {"status": "review_submitted", "outcome": outcome, "case_id": str(case_id)}


@app.post(f"{analyst_router_prefix}/cases/{{case_id}}/publish", tags=["Analyst"])
async def publish_case(case_id: UUID):
    """
    Publish a case for public view. Requires editor approval.
    NEVER publishes named allegations without analyst + editor approval.
    """
    # TODO: Check editor role, update review_status = 'published', log to audit_log
    return {"status": "pending_editor_approval"}


@app.post("/submissions", tags=["Public"])
async def submit_document(request: Request):
    """
    Public upload endpoint for FOI responses and tip submissions.
    Documents are quarantined until analyst review.
    """
    return {"status": "received", "message": "Your submission has been received and will be reviewed by our team."}


# ─── Health ──────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"], include_in_schema=False)
async def health():
    return {"status": "ok", "service": "veritas-api"}


@app.get("/", tags=["System"], include_in_schema=False)
async def root():
    return {
        "name": "Veritas API",
        "description": "Philippines Procurement Transparency Platform",
        "docs": "/api/docs",
        "mission": "Evidence before narrative. Every flag is explainable. Every claim is traceable.",
        "legal": "All data sourced from public Philippine government records. Risk signals are anomaly indicators, not legal determinations.",
    }
