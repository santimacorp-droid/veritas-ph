"""
apps/api/main.py

Veritas FastAPI Application — Public and Analyst APIs.

All responses include provenance fields linking claims back to source documents.
Never expose raw PII or unreviewed analyst conclusions to the public endpoint.
"""

import json
import os
from contextlib import asynccontextmanager
from datetime import datetime
from uuid import UUID, uuid4

import auth
import queries
import queries_legislation
import structlog
from database import get_db
from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

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
from fastapi import Request
from fastapi.responses import JSONResponse
import traceback

@app.exception_handler(Exception)
async def custom_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "traceback": tb}
    )


@app.post("/auth/login", tags=["Auth"])
async def login(
    db: AsyncSession = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
):
    """Authenticate a user and return a JWT access token."""
    result = await db.execute(
        text("SELECT * FROM users WHERE email = :email AND is_active = TRUE"),
        {"email": form_data.username},
    )
    user = result.mappings().first()

    if not user or not auth.verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth.create_access_token(
        data={"sub": str(user["user_id"]), "role": user["role"]}
    )

    await db.execute(
        text("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = :id"),
        {"id": user["user_id"]},
    )
    await db.commit()

    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/auth/me", tags=["Auth"])
async def get_me(current_user: dict = Depends(auth.get_current_user)):
    """Get current authenticated user info."""
    return {
        "user_id": current_user["user_id"],
        "email": current_user["email"],
        "full_name": current_user["full_name"],
        "role": current_user["role"],
    }


@app.get("/stats/summary", tags=["Public"])
async def get_summary(db: AsyncSession = Depends(get_db)):
    """Top-level public counters for the homepage and overview pages."""
    return await queries.get_public_summary(db)


@app.get("/stats/charts", tags=["Public"])
async def get_charts(db: AsyncSession = Depends(get_db)):
    """Aggregate statistics for public homepage charts."""
    return await queries.get_chart_stats(db)


@app.get("/search", tags=["Public"])
async def search(
    q: str = Query(..., min_length=2, description="Search query"),
    type: str | None = Query(None, description="Filter: cases, suppliers"),
    semantic: bool = Query(False, description="Use semantic AI search"),
    agency_id: UUID | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    Full-text search across procurement cases and suppliers.
    Returns results with provenance links to source documents.
    """
    if type == "suppliers":
        embedding = None
        if semantic:
            from embeddings import generate_embedding

            embedding = await generate_embedding(q)

        results = await queries.search_suppliers(
            db, q, limit, offset, use_semantic=semantic, embedding=embedding
        )
        return {
            "query": q,
            "type": "suppliers",
            "total": len(results),
            "results": results,
            "semantic": semantic,
        }

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
    agency_id: UUID | None = Query(None, description="Filter by procuring agency"),
    procurement_method: str | None = Query(None, description="Filter by method"),
    category: str | None = Query(None, description="Filter by category"),
    risk_min: float | None = Query(None, description="Filter by minimum risk score"),
    year: int | None = Query(None, description="Filter by award year"),
    db: AsyncSession = Depends(get_db),
):
    """List procurement cases ordered by risk score."""
    total, cases = await queries.list_cases(
        db, limit, offset, agency_id, procurement_method, category, risk_min, year
    )
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
        
    # Query linked laws/controversies
    sql = text("""
        SELECT l.law_id, l.short_title, lp.section_number, lc.issue_description, lcl.notes
        FROM law_case_links lcl
        JOIN law_controversies lc ON lc.controversy_id = lcl.controversy_id
        JOIN law_provisions lp ON lp.provision_id = lc.provision_id
        JOIN laws l ON l.law_id = lp.law_id
        WHERE lcl.case_id = :cid
    """)
    res = await db.execute(sql, {"cid": str(case_id)})
    case["linked_laws"] = [dict(r) for r in res.mappings().all()]
    
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


@app.get("/projects/locations", tags=["Public"])
async def get_projects_locations(db: AsyncSession = Depends(get_db)):
    """Retrieve coordinates and metadata for all projects to render on the map."""
    sql = text("""
        SELECT pl.location_id, pl.latitude, pl.longitude, p.project_id, p.name AS project_name, 
               pc.case_id, pc.title AS case_title, pc.risk_score, pc.awarded_amount,
               a.acronym AS agency_acronym, a.name AS agency_name
        FROM project_locations pl
        JOIN projects p ON p.project_id = pl.project_id
        JOIN procurement_cases pc ON pc.case_id = p.case_id
        LEFT JOIN agencies a ON a.agency_id = pc.agency_id
    """)
    result = await db.execute(sql)
    return [dict(r) for r in result.mappings().all()]


# ─── Agencies ────────────────────────────────────────────────────────────────


@app.get("/agencies", tags=["Public"])
async def list_agencies(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    sort: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all agencies with procurement volume and risk stats."""
    total, agencies = await queries.list_agencies(db, limit, offset, sort=sort)
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
    year: int | None = None,
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


@app.get("/suppliers/{supplier_id}/duplicates", tags=["Public"])
async def get_supplier_duplicates(
    supplier_id: UUID,
    threshold: float = Query(0.90, description="Cosine similarity threshold"),
    db: AsyncSession = Depends(get_db)
):
    """Find similar/duplicate supplier entities using embedding cosine similarity."""
    supplier = await queries.get_supplier_profile(db, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    duplicates = await queries.find_duplicate_suppliers(db, supplier_id, threshold)
    return {"supplier_id": str(supplier_id), "duplicates": duplicates}


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


@app.get("/documents/download_path", tags=["Public"])
async def download_document_path(path: str):
    """Proxy-stream a document from local storage by path."""
    import os

    from fastapi.responses import Response

    try:
        from storage import get_api_store

        content = get_api_store().get_bytes(path)
    except Exception:
        raise HTTPException(status_code=502, detail="Local storage unavailable") from None

    if not content:
        raise HTTPException(status_code=404, detail="File not found")

    ct = "application/pdf" if path.endswith(".pdf") else "application/octet-stream"
    return Response(
        content=content,
        media_type=ct,
        headers={"Content-Disposition": f'inline; filename="{os.path.basename(path)}"'},
    )


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
        raise HTTPException(status_code=502, detail="Object storage unavailable") from None

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
async def get_discrepancy(discrepancy_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Explainable discrepancy record.
    Shows: type, severity, explanation, why_fired, thresholds, source evidence.
    Only published discrepancies are accessible here.
    """
    result = await db.execute(
        text("SELECT * FROM discrepancies WHERE discrepancy_id = :id AND review_status = 'published'"),
        {"id": str(discrepancy_id)},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Discrepancy not found")
    
    normalised = await queries._attach_discrepancy_evidence(db, [row])
    return normalised[0]


# ─── Legislation ─────────────────────────────────────────────────────────────


@app.get("/laws", tags=["Public"])
async def list_laws(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List controversial laws and general legislation."""
    total, laws = await queries_legislation.list_laws(db, limit, offset)
    return {"total": total, "laws": laws}


@app.get("/laws/{law_id}", tags=["Public"])
async def get_law(law_id: UUID, db: AsyncSession = Depends(get_db)):
    """Law detail with provisions, controversies, and revisions."""
    law = await queries_legislation.get_law_detail(db, law_id)
    if not law:
        raise HTTPException(status_code=404, detail="Law not found")
    return law


@app.get("/laws/{law_id}/analysis", tags=["Public"])
async def get_law_analysis(law_id: UUID, db: AsyncSession = Depends(get_db)):
    """Retrieve the latest completed AI analysis for a law."""
    result = await db.execute(
        text("""
            SELECT * FROM law_analyses 
             WHERE law_id = :law_id AND analysis_status = 'completed'
             ORDER BY completed_at DESC LIMIT 1
        """),
        {"law_id": str(law_id)}
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="No completed analysis found for this law.")
    data = dict(row)
    for field in ("pros", "cons", "loopholes", "suggested_revisions", "violation_patterns", "cross_law_conflicts"):
        if data.get(field):
            try:
                data[field] = json.loads(data[field])
            except Exception:
                pass
    return data


@app.post("/laws/{law_id}/analyze", tags=["Analyst"])
async def trigger_law_analyze(
    law_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["analyst", "editor", "admin"]))
):
    """Triggers a background AI analysis run for a law."""
    law = await queries_legislation.get_law_detail(db, law_id)
    if not law:
        raise HTTPException(status_code=404, detail="Law not found")
    analysis_id = str(uuid4())
    await db.execute(
        text("""
            INSERT INTO law_analyses (
                analysis_id, law_id, model_used, pros, cons, loopholes, 
                suggested_revisions, citizen_summary, analysis_status, requested_by
            )
            VALUES (
                :aid, :lid, 'pending', '[]', '[]', '[]', '[]', 'Starting...', 'pending', :req
            )
        """),
        {"aid": analysis_id, "lid": str(law_id), "req": current_user["user_id"]}
    )
    await db.commit()
    return {"status": "analysis_scheduled", "analysis_id": analysis_id}


@app.get("/laws/{law_id}/analysis/history", tags=["Public"])
async def get_law_analysis_history(law_id: UUID, db: AsyncSession = Depends(get_db)):
    """Lists all past analyses for a law."""
    result = await db.execute(
        text("SELECT * FROM law_analyses WHERE law_id = :law_id ORDER BY created_at DESC"),
        {"law_id": str(law_id)}
    )
    rows = [dict(r) for r in result.mappings().all()]
    for data in rows:
        for field in ("pros", "cons", "loopholes", "suggested_revisions", "violation_patterns", "cross_law_conflicts"):
            if data.get(field):
                try:
                    data[field] = json.loads(data[field])
                except Exception:
                    pass
    return rows


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
    import csv
    import io
    from datetime import date, datetime
    from decimal import Decimal

    from fastapi.responses import Response

    dossier = await queries.get_case_full_export(db, case_id)
    if not dossier:
        raise HTTPException(status_code=404, detail="Case not found")

    def fmt(v):
        if isinstance(v, (date, datetime)):
            return v.isoformat()
        if isinstance(v, Decimal):
            return float(v)
        if isinstance(v, dict):
            return str(v)
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
    published_after: str | None = None,
    cursor: str | None = Query(None, description="Cursor for pagination (ISO datetime string)"),
    agency_id: UUID | None = None,
    limit: int = Query(100, le=1000),
    db: AsyncSession = Depends(get_db),
):
    """
    Bulk export in Open Contracting Data Standard (OCDS) release format.
    Enables interoperability with partner transparency organizations.
    """
    sql_query = """
        SELECT pc.case_id, pc.title, pc.awarded_amount, pc.award_date, pc.procurement_method, pc.created_at,
               a.agency_id, a.name AS agency_name,
               s.supplier_id, s.canonical_name AS supplier_name,
               c.contract_id, c.start_date AS contract_start, c.end_date AS contract_end, c.amount AS contract_amount
        FROM procurement_cases pc
        LEFT JOIN agencies a ON a.agency_id = pc.agency_id
        LEFT JOIN awards aw ON aw.case_id = pc.case_id
        LEFT JOIN suppliers s ON s.supplier_id = aw.supplier_id
        LEFT JOIN contracts c ON c.case_id = pc.case_id
        WHERE 1=1
    """
    params = {"limit": limit}
    
    if published_after:
        sql_query += " AND pc.created_at > :after"
        params["after"] = published_after
        
    if cursor:
        sql_query += " AND pc.created_at < :cursor"
        params["cursor"] = cursor
        
    sql_query += " ORDER BY pc.created_at DESC LIMIT :limit"

    result = await db.execute(text(sql_query), params)
    rows = result.mappings().all()
    
    releases = []
    # Group by case_id in case there are multiple awards/contracts
    grouped_cases = {}
    for r in rows:
        cid = str(r["case_id"])
        if cid not in grouped_cases:
            grouped_cases[cid] = {
                "base": r,
                "awards": [],
                "contracts": [],
                "parties": {}
            }
            
        grp = grouped_cases[cid]
        
        # Add Agency to parties
        if r["agency_id"]:
            grp["parties"][f"agency-{r['agency_id']}"] = {
                "id": f"agency-{r['agency_id']}",
                "name": r["agency_name"],
                "roles": ["buyer", "procuringEntity"]
            }
            
        # Add Supplier to parties
        if r["supplier_id"]:
            grp["parties"][f"supplier-{r['supplier_id']}"] = {
                "id": f"supplier-{r['supplier_id']}",
                "name": r["supplier_name"],
                "roles": ["tenderer", "supplier"]
            }
            
            # Construct award if hasn't been added
            award_id = f"award-{cid}-{r['supplier_id']}"
            if not any(a["id"] == award_id for a in grp["awards"]):
                grp["awards"].append({
                    "id": award_id,
                    "title": r["title"],
                    "status": "active",
                    "date": str(r["award_date"]) if r["award_date"] else None,
                    "value": {
                        "amount": float(r["awarded_amount"]) if r["awarded_amount"] else 0.0,
                        "currency": "PHP"
                    },
                    "suppliers": [{
                        "id": f"supplier-{r['supplier_id']}",
                        "name": r["supplier_name"]
                    }]
                })
                
        # Construct contract if exists
        if r["contract_id"]:
            contract_id = str(r["contract_id"])
            if not any(c["id"] == contract_id for c in grp["contracts"]):
                grp["contracts"].append({
                    "id": contract_id,
                    "awardID": award_id if r["supplier_id"] else None,
                    "title": r["title"],
                    "status": "active",
                    "period": {
                        "startDate": str(r["contract_start"]) if r["contract_start"] else None,
                        "endDate": str(r["contract_end"]) if r["contract_end"] else None
                    },
                    "value": {
                        "amount": float(r["contract_amount"]) if r["contract_amount"] else 0.0,
                        "currency": "PHP"
                    }
                })

    for cid, grp in grouped_cases.items():
        base = grp["base"]
        
        # Determine tags
        tags = ["tender"]
        if grp["awards"]:
            tags.append("award")
        if grp["contracts"]:
            tags.append("contract")
            
        releases.append({
            "ocid": f"ocds-ph-{cid}",
            "id": f"release-{cid}",
            "date": str(base["created_at"]),
            "tag": tags,
            "initiationType": "tender",
            "parties": list(grp["parties"].values()),
            "buyer": {
                "id": f"agency-{base['agency_id']}" if base["agency_id"] else "unknown",
                "name": base["agency_name"] if base["agency_name"] else "Unknown Agency"
            },
            "tender": {
                "id": f"tender-{cid}",
                "title": base["title"],
                "status": "complete",
                "procurementMethod": base["procurement_method"]
            },
            "awards": grp["awards"],
            "contracts": grp["contracts"]
        })
        
    next_cursor = None
    if releases:
        next_cursor = releases[-1]["date"]

    return {
        "uri": "https://veritas.ph/bulk/ocds/releases",
        "version": "1.1",
        "publishedDate": datetime.utcnow().isoformat() + "Z",
        "releases": releases,
        "meta": {"license": "https://creativecommons.org/licenses/by/4.0/"},
        "links": {
            "next": f"https://veritas.ph/bulk/ocds/releases?cursor={next_cursor}&limit={limit}" if next_cursor else None
        }
    }


# ─── Analyst API (Authentication Required) ───────────────────────────────────

analyst_router_prefix = "/analyst"


@app.get(f"{analyst_router_prefix}/cases", tags=["Analyst"])
async def list_analyst_cases(
    status: str = Query("queue", pattern="^(queue|confirmed|published)$"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["analyst", "editor", "admin"])),
):
    """Case-centric discrepancy queue for the analyst console."""
    try:
        total, cases = await queries.list_analyst_cases(db, status, limit, offset)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"status": status, "total": total, "cases": cases}


@app.get(f"{analyst_router_prefix}/queue/takedowns", tags=["Analyst"])
async def get_takedown_queue(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["analyst", "editor", "admin"])),
):
    """Analyst queue for pending takedown requests."""
    sql = text("""
        SELECT us.*, pc.title AS case_title, pc.procurement_ref_no, d.source_url
        FROM user_submissions us
        LEFT JOIN procurement_cases pc ON pc.case_id = us.linked_case_id
        LEFT JOIN documents d ON d.document_id = us.document_id
        WHERE us.submission_type = 'takedown_request' AND us.status = 'pending'
        ORDER BY us.created_at ASC
    """)
    res = await db.execute(sql)
    return [dict(r) for r in res.mappings().all()]


@app.post(f"{analyst_router_prefix}/corrections", tags=["Analyst"])
async def submit_correction(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["analyst", "editor", "admin"]))
):
    """Submit a field correction for an extraction. Logged immutably."""
    extraction_id = payload.get("extraction_id")
    fields = payload.get("fields")
    if not extraction_id or not fields:
        raise HTTPException(status_code=400, detail="extraction_id and fields are required")
    
    actor_id = current_user["user_id"]
    current = await db.execute(
        text("SELECT fields FROM extractions WHERE extraction_id = :id"),
        {"id": str(extraction_id)}
    )
    row = current.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Extraction not found")
        
    await db.execute(
        text("UPDATE extractions SET fields = :fields, review_status = 'corrected' WHERE extraction_id = :id"),
        {"fields": json.dumps(fields), "id": str(extraction_id)}
    )
    await db.execute(
        text("""
            INSERT INTO audit_log (log_id, actor_id, actor_type, action, entity_type, entity_id, old_value, new_value)
            VALUES (:lid, :actor, 'analyst', 'extraction_corrected', 'extraction', :eid, :old, :new)
        """),
        {
            "lid": str(uuid4()),
            "actor": str(actor_id),
            "eid": str(extraction_id),
            "old": row["fields"],
            "new": json.dumps(fields)
        }
    )
    await db.commit()
    return {"status": "accepted", "extraction_id": str(extraction_id)}


@app.post(f"{analyst_router_prefix}/verify/{{extraction_id}}", tags=["Analyst"])
async def verify_extraction(
    extraction_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["analyst", "editor", "admin"])),
):
    """Mark an extraction as human-verified."""
    actor_id = current_user["user_id"]
    current = await db.execute(
        text("SELECT review_status FROM extractions WHERE extraction_id = :id"),
        {"id": str(extraction_id)}
    )
    row = current.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Extraction not found")
        
    await db.execute(
        text("UPDATE extractions SET review_status = 'verified' WHERE extraction_id = :id"),
        {"id": str(extraction_id)}
    )
    await db.execute(
        text("""
            INSERT INTO audit_log (log_id, actor_id, actor_type, action, entity_type, entity_id, old_value, new_value)
            VALUES (:lid, :actor, 'analyst', 'extraction_verified', 'extraction', :eid, :old, :new)
        """),
        {
            "lid": str(uuid4()),
            "actor": str(actor_id),
            "eid": str(extraction_id),
            "old": json.dumps({"review_status": row["review_status"]}),
            "new": json.dumps({"review_status": "verified"})
        }
    )
    await db.commit()
    return {"status": "verified", "extraction_id": str(extraction_id)}


@app.post(f"{analyst_router_prefix}/cases/{{case_id}}/review", tags=["Analyst"])
async def submit_case_review(
    case_id: UUID,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["analyst", "editor", "admin"])),
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
        analyst_id = current_user["user_id"]
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
                       reviewed_at = CURRENT_TIMESTAMP
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
                "analyst_id": str(analyst_id),
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
                "actor_id": str(analyst_id),
                "entity_id": discrepancy_id,
                "old_value": json.dumps({"review_status": current_row["review_status"]}),
                "new_value": json.dumps({"review_status": outcome, "notes": notes}),
            },
        )
        await db.commit()

    return {"status": "review_submitted", "outcome": outcome, "case_id": str(case_id)}


@app.post(f"{analyst_router_prefix}/cases/{{case_id}}/publish", tags=["Analyst"])
async def publish_case(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["editor", "admin"]))
):
    """
    Publish a case for public view. Requires editor approval.
    """
    actor_id = current_user["user_id"]
    await db.execute(
        text("UPDATE discrepancies SET review_status = 'published' WHERE case_id = :cid"),
        {"cid": str(case_id)}
    )
    await db.execute(
        text("""
            INSERT INTO audit_log (log_id, actor_id, actor_type, action, entity_type, entity_id)
            VALUES (:lid, :actor, 'analyst', 'case_published', 'case', :cid)
        """),
        {
            "lid": str(uuid4()),
            "actor": str(actor_id),
            "cid": str(case_id)
        }
    )
    await db.commit()
    return {"status": "published", "case_id": str(case_id)}


@app.get(f"{analyst_router_prefix}/audit-log", tags=["Analyst"])
async def get_audit_log(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["analyst", "editor", "admin"]))
):
    """Retrieve the action audit logs for analysts."""
    sql = text("""
        SELECT a.log_id, a.actor_id, a.actor_type, a.action, a.entity_type, a.entity_id, 
               a.old_value, a.new_value, a.created_at, u.full_name AS actor_name
        FROM audit_log a
        LEFT JOIN users u ON u.user_id = a.actor_id
        ORDER BY a.created_at DESC
        LIMIT :limit OFFSET :offset
    """)
    result = await db.execute(sql, {"limit": limit, "offset": offset})
    rows = [dict(r) for r in result.mappings().all()]
    count_res = await db.execute(text("SELECT COUNT(*) FROM audit_log"))
    total = count_res.scalar_one()
    return {"total": total, "logs": rows}


@app.post(f"{analyst_router_prefix}/laws", tags=["Analyst"])
async def create_law(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["analyst", "editor", "admin"])),
):
    """Create a new law record."""
    law = await queries_legislation.create_law(db, **payload)
    await db.commit()
    return law


@app.post(f"{analyst_router_prefix}/laws/{{law_id}}/provisions", tags=["Analyst"])
async def create_provision(
    law_id: UUID,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["analyst", "editor", "admin"])),
):
    """Create a new provision for a law."""
    provision = await queries_legislation.create_provision(db, law_id=law_id, **payload)
    await db.commit()
    return provision


@app.post(f"{analyst_router_prefix}/provisions/{{provision_id}}/controversies", tags=["Analyst"])
async def create_controversy(
    provision_id: UUID,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["analyst", "editor", "admin"])),
):
    """Flag a provision as controversial."""
    controversy = await queries_legislation.create_controversy(
        db, provision_id=provision_id, **payload
    )
    await db.commit()
    return controversy


@app.post(f"{analyst_router_prefix}/laws/{{law_id}}/revisions", tags=["Analyst"])
async def create_revision(
    law_id: UUID,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["analyst", "editor", "admin"])),
):
    """Propose a revision for a law."""
    revision = await queries_legislation.create_revision(db, law_id=law_id, **payload)
    await db.commit()
    return revision


from pydantic import BaseModel

class TakedownRequest(BaseModel):
    report_url: str
    reason: str
    submitter_email: str

@app.post("/submissions/takedown", tags=["Public"])
async def submit_takedown(
    payload: TakedownRequest,
    db: AsyncSession = Depends(get_db)
):
    """Submit a takedown request for a specific URL on the portal."""
    submission_id = str(uuid4())
    await db.execute(
        text("""
            INSERT INTO user_submissions (submission_id, submitter_email, submission_type, notes, status)
            VALUES (:sid, :email, 'takedown_request', :notes, 'pending')
        """),
        {
            "sid": submission_id,
            "email": payload.submitter_email,
            "notes": f"URL: {payload.report_url}\\nReason: {payload.reason}"
        }
    )
    await db.commit()
    return {"status": "success", "submission_id": submission_id}


@app.post("/submissions", tags=["Public"])
async def submit_document(
    submitter_email: str = Form(...),
    submission_type: str = Form(...),
    notes: str | None = Form(None),
    linked_case_id: UUID | None = Form(None),
    document: UploadFile = File(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Public upload endpoint for FOI responses and tip submissions.
    Documents are quarantined until analyst review.
    """
    submission_id = str(uuid4())
    storage_path = None
    
    if document:
        filename = f"submissions/{submission_id}-{document.filename}"
        content = await document.read()
        try:
            from storage import get_api_store
            get_api_store().put_bytes(filename, content)
            storage_path = filename
        except Exception as e:
            logger.error(f"Error uploading submission to object store: {e}")
            os.makedirs("quarantine", exist_ok=True)
            local_path = os.path.join("quarantine", f"{submission_id}-{document.filename}")
            with open(local_path, "wb") as f:
                f.write(content)
            storage_path = local_path

    await db.execute(
        text("""
            INSERT INTO user_submissions (submission_id, submitter_email, submission_type, notes, linked_case_id, storage_path, status)
            VALUES (:sid, :email, :stype, :notes, :case_id, :path, 'pending')
        """),
        {
            "sid": submission_id,
            "email": submitter_email,
            "stype": submission_type,
            "notes": notes,
            "case_id": str(linked_case_id) if linked_case_id else None,
            "path": storage_path
        }
    )
    await db.commit()
    
    return {
        "status": "received",
        "submission_id": submission_id,
        "message": "Your submission has been received and will be reviewed by our team.",
    }


# ─── Health ──────────────────────────────────────────────────────────────────


@app.get("/health/db", tags=["System"], include_in_schema=False)
async def health_db():
    import socket
    from database import engine
    from urllib.parse import urlparse
    
    db_url = str(engine.url)
    parsed = urlparse(db_url)
    host = parsed.hostname
    port = parsed.port
    scheme = parsed.scheme
    
    resolved_ips = []
    resolve_error = None
    if host:
        try:
            infos = socket.getaddrinfo(host, port or 5432)
            resolved_ips = list(set([info[4][0] for info in infos]))
        except Exception as e:
            resolve_error = str(e)
            
    query_success = False
    query_error = None
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            query_success = True
    except Exception as e:
        query_error = str(e)
        
    return {
        "configured_scheme": scheme,
        "configured_host": host,
        "configured_port": port,
        "dns_resolved_ips": resolved_ips,
        "dns_resolve_error": resolve_error,
        "query_success": query_success,
        "query_error": query_error,
    }


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
