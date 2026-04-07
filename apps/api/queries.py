"""
apps/api/queries.py

Raw SQL query layer for Veritas. Uses asyncpg via SQLAlchemy's text() construct.
Every query returns provenance data — source URLs, hashes, fetch timestamps.
"""

import json
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import bindparam, text
from sqlalchemy.ext.asyncio import AsyncSession


def _parse_jsonish(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return value


def _normalise_discrepancy_row(row: Any) -> dict[str, Any]:
    data = dict(row)
    parsed_why_fired = _parse_jsonish(data.get("why_fired"))
    data["why_fired"] = parsed_why_fired if isinstance(parsed_why_fired, dict) else {}

    parsed_thresholds = _parse_jsonish(data.get("thresholds_applied"))
    data["thresholds_applied"] = parsed_thresholds if isinstance(parsed_thresholds, dict) else None
    return data


async def _attach_discrepancy_evidence(
    db: AsyncSession,
    rows: list[Any],
) -> list[dict[str, Any]]:
    items = [_normalise_discrepancy_row(row) for row in rows]
    discrepancy_ids = [str(item["discrepancy_id"]) for item in items if item.get("discrepancy_id")]
    evidence_by_discrepancy: dict[str, list[dict[str, Any]]] = {key: [] for key in discrepancy_ids}

    if discrepancy_ids:
        evidence_sql = text("""
            SELECT
                el.entity_id AS discrepancy_id,
                el.link_id,
                el.document_id,
                el.source_url,
                el.fetch_timestamp,
                el.sha256_hash,
                el.page_number,
                el.extraction_confidence,
                d.document_type
            FROM evidence_links el
            JOIN documents d ON d.document_id = el.document_id
            WHERE el.entity_type = 'discrepancy'
              AND el.entity_id IN :discrepancy_ids
            ORDER BY el.extraction_confidence DESC NULLS LAST, el.fetch_timestamp DESC
        """).bindparams(bindparam("discrepancy_ids", expanding=True))
        evidence_result = await db.execute(evidence_sql, {"discrepancy_ids": discrepancy_ids})
        for row in evidence_result.mappings().all():
            evidence_by_discrepancy[str(row["discrepancy_id"])].append(
                {
                    "link_id": str(row["link_id"]),
                    "document_id": str(row["document_id"]),
                    "document_type": row["document_type"],
                    "source_url": row["source_url"],
                    "fetch_timestamp": row["fetch_timestamp"],
                    "sha256_hash": row["sha256_hash"],
                    "page_number": row["page_number"],
                    "extraction_confidence": row["extraction_confidence"],
                }
            )

    fallback_ids: list[str] = []
    fallback_case_ids: list[str] = []
    for item in items:
        if evidence_by_discrepancy.get(str(item.get("discrepancy_id"))):
            continue
        fallback_ids.extend(str(doc_id) for doc_id in (item.get("source_document_ids") or []) if doc_id)
        if item.get("case_id"):
            fallback_case_ids.append(str(item["case_id"]))

    documents_by_id: dict[str, dict[str, Any]] = {}
    if fallback_ids:
        docs_sql = text("""
            SELECT
                document_id,
                document_type,
                source_url,
                fetch_timestamp,
                sha256_hash
            FROM documents
            WHERE document_id IN :document_ids
        """).bindparams(bindparam("document_ids", expanding=True))
        docs_result = await db.execute(docs_sql, {"document_ids": list(dict.fromkeys(fallback_ids))})
        documents_by_id = {
            str(row["document_id"]): {
                "link_id": str(row["document_id"]),
                "document_id": str(row["document_id"]),
                "document_type": row["document_type"],
                "source_url": row["source_url"],
                "fetch_timestamp": row["fetch_timestamp"],
                "sha256_hash": row["sha256_hash"],
            }
            for row in docs_result.mappings().all()
        }

    documents_by_case: dict[str, list[dict[str, Any]]] = {}
    if fallback_case_ids:
        case_docs_sql = text("""
            SELECT
                pe.case_id,
                d.document_id,
                d.document_type,
                d.source_url,
                d.fetch_timestamp,
                d.sha256_hash
            FROM procurement_events pe
            JOIN documents d ON d.document_id = pe.document_id
            WHERE pe.case_id IN :case_ids
            ORDER BY pe.event_date DESC NULLS LAST, d.fetch_timestamp DESC
        """).bindparams(bindparam("case_ids", expanding=True))
        case_docs_result = await db.execute(
            case_docs_sql,
            {"case_ids": list(dict.fromkeys(fallback_case_ids))},
        )
        for row in case_docs_result.mappings().all():
            case_id = str(row["case_id"])
            documents_by_case.setdefault(case_id, [])
            if any(item["document_id"] == str(row["document_id"]) for item in documents_by_case[case_id]):
                continue
            documents_by_case[case_id].append(
                {
                    "link_id": str(row["document_id"]),
                    "document_id": str(row["document_id"]),
                    "document_type": row["document_type"],
                    "source_url": row["source_url"],
                    "fetch_timestamp": row["fetch_timestamp"],
                    "sha256_hash": row["sha256_hash"],
                }
            )

    for item in items:
        discrepancy_id = str(item.get("discrepancy_id"))
        direct_evidence = evidence_by_discrepancy.get(discrepancy_id, [])
        if direct_evidence:
            item["evidence"] = direct_evidence
            continue

        source_document_ids = [str(doc_id) for doc_id in (item.get("source_document_ids") or []) if doc_id]
        fallback_evidence = [
            documents_by_id[doc_id]
            for doc_id in source_document_ids
            if doc_id in documents_by_id
        ]
        if fallback_evidence:
            item["evidence"] = fallback_evidence
            continue

        case_id = str(item.get("case_id")) if item.get("case_id") else None
        item["evidence"] = documents_by_case.get(case_id, [])[:3] if case_id else []

    return items


async def get_public_summary(db: AsyncSession):
    """Top-level counters used on the public homepage and overview pages."""
    sql = text("""
        SELECT
            (SELECT COUNT(*) FROM procurement_cases) AS total_cases,
            (SELECT COUNT(*) FROM agencies) AS total_agencies,
            (
                SELECT COUNT(*)
                FROM discrepancies
                WHERE review_status IN ('confirmed', 'published')
            ) AS total_discrepancies,
            (
                SELECT COALESCE(SUM(awarded_amount), 0)
                FROM procurement_cases
            ) AS total_awarded
    """)
    result = await db.execute(sql)
    row = result.mappings().first()
    return dict(row) if row else {
        "total_cases": 0,
        "total_agencies": 0,
        "total_discrepancies": 0,
        "total_awarded": 0,
    }


async def list_cases(db: AsyncSession, limit: int = 25, offset: int = 0):
    """List procurement cases ordered by freshness first, then risk and award date."""
    sql = text("""
        SELECT
            pc.case_id,
            pc.agency_id,
            pc.title,
            pc.procurement_ref_no,
            pc.procurement_method,
            pc.category,
            pc.awarded_amount,
            pc.award_date,
            pc.status,
            pc.risk_score,
            pc.completeness_score,
            pc.confidence_score,
            pc.updated_at,
            pc.created_at,
            a.agency_id,
            a.name AS agency_name,
            a.acronym AS agency_acronym,
            COUNT(DISTINCT d.discrepancy_id) FILTER (
                WHERE d.review_status IN ('confirmed', 'published')
            ) AS discrepancy_count
        FROM procurement_cases pc
        LEFT JOIN agencies a ON a.agency_id = pc.agency_id
        LEFT JOIN discrepancies d ON d.case_id = pc.case_id
        GROUP BY
            pc.case_id, pc.title, pc.procurement_ref_no, pc.procurement_method,
            pc.category, pc.awarded_amount, pc.award_date, pc.status,
            pc.risk_score, pc.completeness_score, pc.confidence_score,
            pc.updated_at, pc.created_at,
            a.agency_id, a.name, a.acronym
        ORDER BY
            COALESCE(pc.updated_at, pc.created_at) DESC,
            pc.risk_score DESC NULLS LAST,
            pc.award_date DESC NULLS LAST
        LIMIT :limit OFFSET :offset
    """)
    result = await db.execute(sql, {"limit": limit, "offset": offset})
    rows = result.mappings().all()
    count_result = await db.execute(text("SELECT COUNT(*) FROM procurement_cases"))
    total = count_result.scalar_one()
    return total, [dict(r) for r in rows]


async def search_cases(
    db: AsyncSession,
    q: str,
    agency_id: Optional[UUID],
    date_from: Optional[str],
    date_to: Optional[str],
    limit: int,
    offset: int,
):
    """Full-text search on procurement cases using PostgreSQL ts_rank."""
    filters = ["to_tsvector('english', pc.title) @@ plainto_tsquery('english', :q)"]
    params: dict = {"q": q, "limit": limit, "offset": offset}

    if agency_id:
        filters.append("pc.agency_id = :agency_id")
        params["agency_id"] = str(agency_id)
    if date_from:
        filters.append("pc.award_date >= :date_from")
        params["date_from"] = date_from
    if date_to:
        filters.append("pc.award_date <= :date_to")
        params["date_to"] = date_to

    where = " AND ".join(filters)
    sql = text(f"""
        SELECT
            pc.case_id,
            pc.title,
            pc.procurement_method,
            pc.awarded_amount,
            pc.award_date,
            pc.risk_score,
            pc.status,
            a.name AS agency_name,
            a.acronym AS agency_acronym,
            ts_rank(to_tsvector('english', pc.title), plainto_tsquery('english', :q)) AS rank
        FROM procurement_cases pc
        LEFT JOIN agencies a ON a.agency_id = pc.agency_id
        WHERE {where}
        ORDER BY rank DESC, pc.risk_score DESC NULLS LAST
        LIMIT :limit OFFSET :offset
    """)

    result = await db.execute(sql, params)
    rows = result.mappings().all()

    count_sql = text(f"SELECT COUNT(*) FROM procurement_cases pc WHERE {where}")
    count_params = {k: v for k, v in params.items() if k not in ("limit", "offset")}
    count_result = await db.execute(count_sql, count_params)
    total = count_result.scalar_one()

    return total, [dict(r) for r in rows]


async def search_suppliers(
    db: AsyncSession,
    q: str,
    limit: int,
    offset: int,
):
    """Trigram fuzzy search on supplier names."""
    sql = text("""
        SELECT
            s.supplier_id,
            s.canonical_name,
            s.supplier_type,
            s.psgc_province,
            s.philgeps_id,
            similarity(s.canonical_name, :q) AS score
        FROM suppliers s
        WHERE s.canonical_name % :q
        ORDER BY score DESC
        LIMIT :limit OFFSET :offset
    """)
    result = await db.execute(sql, {"q": q, "limit": limit, "offset": offset})
    rows = result.mappings().all()
    return [dict(r) for r in rows]


async def get_case_detail(db: AsyncSession, case_id: UUID):
    """Full case detail with agency and risk info."""
    sql = text("""
        SELECT
            pc.case_id,
            pc.title,
            pc.procurement_ref_no,
            pc.procurement_method,
            pc.category,
            pc.planned_amount,
            pc.awarded_amount,
            pc.final_contract_amount,
            pc.award_date,
            pc.ntp_date,
            pc.contract_start_date,
            pc.contract_end_date,
            pc.status,
            pc.risk_score,
            pc.completeness_score,
            pc.confidence_score,
            pc.risk_components,
            pc.created_at,
            pc.updated_at,
            a.name AS agency_name,
            a.acronym AS agency_acronym,
            a.agency_type,
            p.name AS publisher_name
        FROM procurement_cases pc
        LEFT JOIN agencies a ON a.agency_id = pc.agency_id
        LEFT JOIN publishers p ON p.publisher_id = pc.publisher_id
        WHERE pc.case_id = :case_id
    """)
    result = await db.execute(sql, {"case_id": str(case_id)})
    row = result.mappings().first()
    return dict(row) if row else None


async def get_case_timeline(db: AsyncSession, case_id: UUID):
    """Ordered procurement lifecycle events with linked document info."""
    sql = text("""
        SELECT
            pe.event_id,
            pe.stage,
            pe.event_type,
            pe.event_date,
            pe.amount,
            pe.notes,
            d.document_id,
            d.source_url,
            d.document_type,
            d.sha256_hash,
            d.fetch_timestamp,
            d.storage_path
        FROM procurement_events pe
        LEFT JOIN documents d ON d.document_id = pe.document_id
        WHERE pe.case_id = :case_id
        ORDER BY pe.event_date ASC NULLS LAST, pe.stage
    """)
    result = await db.execute(sql, {"case_id": str(case_id)})
    rows = result.mappings().all()
    return [_normalise_discrepancy_row(r) for r in rows]


async def get_case_discrepancies(db: AsyncSession, case_id: UUID, analyst: bool = False):
    """
    Discrepancies for a case.
    Public: only confirmed/published.
    Analyst: includes pending.
    """
    if analyst:
        status_filter = "d.review_status IN ('pending','confirmed','published','needs_evidence')"
    else:
        status_filter = "d.review_status IN ('confirmed','published')"

    sql = text(f"""
        SELECT
            d.discrepancy_id,
            d.case_id,
            d.discrepancy_type,
            d.severity,
            d.explanation,
            d.rule_id,
            d.rule_version,
            d.why_fired,
            d.thresholds_applied,
            d.generated_at,
            d.review_status,
            d.source_document_ids
        FROM discrepancies d
        WHERE d.case_id = :case_id
          AND {status_filter}
        ORDER BY
            CASE d.severity
                WHEN 'critical' THEN 1
                WHEN 'high'     THEN 2
                WHEN 'medium'   THEN 3
                WHEN 'low'      THEN 4
            END,
            d.generated_at DESC
    """)
    result = await db.execute(sql, {"case_id": str(case_id)})
    rows = result.mappings().all()
    return await _attach_discrepancy_evidence(db, rows)


async def get_evidence_for_discrepancy(db: AsyncSession, discrepancy_id: UUID):
    """Evidence links — provenance chain for a single discrepancy."""
    sql = text("""
        SELECT
            el.link_id,
            el.document_id,
            el.source_url,
            el.fetch_timestamp,
            el.sha256_hash,
            el.page_number,
            el.extraction_confidence,
            el.rule_version,
            d.document_type,
            d.storage_path
        FROM evidence_links el
        JOIN documents d ON d.document_id = el.document_id
        WHERE el.entity_type = 'discrepancy'
          AND el.entity_id = :discrepancy_id
        ORDER BY el.extraction_confidence DESC NULLS LAST
    """)
    result = await db.execute(sql, {"discrepancy_id": str(discrepancy_id)})
    rows = result.mappings().all()
    return [dict(r) for r in rows]


async def get_agency_profile(db: AsyncSession, agency_id: UUID):
    """Agency profile with aggregated stats."""
    sql = text("""
        SELECT
            a.agency_id,
            a.name,
            a.acronym,
            a.agency_type,
            p.name AS publisher_name,
            COUNT(DISTINCT pc.case_id) AS total_cases,
            SUM(pc.awarded_amount) AS total_awarded,
            AVG(pc.risk_score) AS avg_risk_score,
            COUNT(DISTINCT CASE WHEN pc.risk_score >= 0.7 THEN pc.case_id END) AS high_risk_cases
        FROM agencies a
        LEFT JOIN publishers p ON p.publisher_id = a.publisher_id
        LEFT JOIN procurement_cases pc ON pc.agency_id = a.agency_id
        WHERE a.agency_id = :agency_id
        GROUP BY a.agency_id, a.name, a.acronym, a.agency_type, p.name
    """)
    result = await db.execute(sql, {"agency_id": str(agency_id)})
    row = result.mappings().first()
    return dict(row) if row else None


async def get_supplier_profile(db: AsyncSession, supplier_id: UUID):
    """Supplier profile with award history summary."""
    sql = text("""
        SELECT
            s.supplier_id,
            s.canonical_name,
            s.supplier_type,
            s.primary_address,
            s.psgc_province,
            s.philgeps_id,
            COUNT(DISTINCT aw.award_id) AS total_awards,
            SUM(aw.amount) AS total_awarded,
            MIN(aw.award_date) AS first_award_date,
            MAX(aw.award_date) AS last_award_date,
            COUNT(DISTINCT pc.agency_id) AS agency_count
        FROM suppliers s
        LEFT JOIN awards aw ON aw.supplier_id = s.supplier_id
        LEFT JOIN procurement_cases pc ON pc.case_id = aw.case_id
        WHERE s.supplier_id = :supplier_id
        GROUP BY s.supplier_id, s.canonical_name, s.supplier_type,
                 s.primary_address, s.psgc_province, s.philgeps_id
    """)
    result = await db.execute(sql, {"supplier_id": str(supplier_id)})
    row = result.mappings().first()
    return dict(row) if row else None


async def list_suppliers(db: AsyncSession, limit: int = 50, offset: int = 0):
    """Supplier leaderboard with award totals and reach across agencies."""
    sql = text("""
        SELECT
            s.supplier_id,
            s.canonical_name,
            s.supplier_type,
            s.psgc_province,
            s.philgeps_id,
            COUNT(DISTINCT aw.award_id) AS total_awards,
            COALESCE(SUM(aw.amount), 0) AS total_awarded,
            COUNT(DISTINCT pc.agency_id) AS agency_count,
            MAX(aw.award_date) AS last_award_date
        FROM suppliers s
        LEFT JOIN awards aw ON aw.supplier_id = s.supplier_id
        LEFT JOIN procurement_cases pc ON pc.case_id = aw.case_id
        GROUP BY s.supplier_id, s.canonical_name, s.supplier_type, s.psgc_province, s.philgeps_id
        ORDER BY total_awarded DESC NULLS LAST, total_awards DESC, s.canonical_name ASC
        LIMIT :limit OFFSET :offset
    """)
    result = await db.execute(sql, {"limit": limit, "offset": offset})
    rows = result.mappings().all()
    count_result = await db.execute(text("SELECT COUNT(*) FROM suppliers"))
    total = count_result.scalar_one()
    return total, [dict(r) for r in rows]


async def get_supplier_awards(
    db: AsyncSession,
    supplier_id: UUID,
    limit: int = 20,
    offset: int = 0,
):
    """Award history for a supplier with linked case and agency context."""
    sql = text("""
        SELECT
            aw.award_id,
            aw.award_date,
            aw.amount,
            aw.bidders_count,
            aw.single_bidder,
            pc.case_id,
            pc.title,
            pc.procurement_ref_no,
            pc.risk_score,
            a.agency_id,
            a.name AS agency_name,
            a.acronym AS agency_acronym
        FROM awards aw
        JOIN procurement_cases pc ON pc.case_id = aw.case_id
        LEFT JOIN agencies a ON a.agency_id = pc.agency_id
        WHERE aw.supplier_id = :supplier_id
        ORDER BY aw.award_date DESC NULLS LAST, aw.amount DESC NULLS LAST
        LIMIT :limit OFFSET :offset
    """)
    result = await db.execute(
        sql,
        {"supplier_id": str(supplier_id), "limit": limit, "offset": offset},
    )
    rows = result.mappings().all()
    count_result = await db.execute(
        text("SELECT COUNT(*) FROM awards WHERE supplier_id = :supplier_id"),
        {"supplier_id": str(supplier_id)},
    )
    total = count_result.scalar_one()
    return total, [dict(r) for r in rows]


async def list_agencies(db: AsyncSession, limit: int = 50, offset: int = 0):
    """All agencies with aggregated procurement stats, sorted by total awarded desc."""
    sql = text("""
        SELECT
            a.agency_id,
            a.name,
            a.acronym,
            a.agency_type,
            p.name AS publisher_name,
            COUNT(DISTINCT pc.case_id)   AS total_cases,
            SUM(pc.awarded_amount)        AS total_awarded,
            AVG(pc.risk_score)            AS avg_risk_score,
            COUNT(DISTINCT CASE WHEN pc.risk_score >= 0.7 THEN pc.case_id END) AS high_risk_cases,
            COUNT(DISTINCT CASE WHEN d.review_status IN ('confirmed','published')
                  THEN d.discrepancy_id END) AS confirmed_discrepancies
        FROM agencies a
        LEFT JOIN publishers p         ON p.publisher_id = a.publisher_id
        LEFT JOIN procurement_cases pc ON pc.agency_id = a.agency_id
        LEFT JOIN discrepancies d      ON d.case_id = pc.case_id
        GROUP BY a.agency_id, a.name, a.acronym, a.agency_type, p.name
        ORDER BY total_awarded DESC NULLS LAST
        LIMIT :limit OFFSET :offset
    """)
    result = await db.execute(sql, {"limit": limit, "offset": offset})
    rows = result.mappings().all()
    count_result = await db.execute(text("SELECT COUNT(*) FROM agencies"))
    total = count_result.scalar_one()
    return total, [dict(r) for r in rows]


async def list_recent_discrepancies(db: AsyncSession, limit: int = 10, offset: int = 0):
    """Recent public discrepancies for the homepage and discrepancy feed."""
    sql = text("""
        SELECT
            d.discrepancy_id,
            d.case_id,
            d.discrepancy_type,
            d.severity,
            d.explanation,
            d.rule_id,
            d.rule_version,
            d.why_fired,
            d.thresholds_applied,
            d.generated_at,
            d.review_status,
            d.source_document_ids,
            pc.title AS case_title,
            pc.procurement_ref_no,
            a.name AS agency_name,
            a.acronym AS agency_acronym
        FROM discrepancies d
        JOIN procurement_cases pc ON pc.case_id = d.case_id
        LEFT JOIN agencies a ON a.agency_id = pc.agency_id
        WHERE d.review_status IN ('confirmed', 'published')
        ORDER BY d.generated_at DESC, pc.risk_score DESC NULLS LAST
        LIMIT :limit OFFSET :offset
    """)
    result = await db.execute(sql, {"limit": limit, "offset": offset})
    rows = result.mappings().all()
    count_result = await db.execute(text("""
        SELECT COUNT(*)
        FROM discrepancies
        WHERE review_status IN ('confirmed', 'published')
    """))
    total = count_result.scalar_one()
    return total, await _attach_discrepancy_evidence(db, rows)


async def get_agency_cases(
    db: AsyncSession,
    agency_id: UUID,
    limit: int = 20,
    offset: int = 0,
):
    """Cases for a specific agency ordered by risk desc."""
    sql = text("""
        SELECT
            pc.case_id,
            pc.title,
            pc.procurement_ref_no,
            pc.procurement_method,
            pc.awarded_amount,
            pc.award_date,
            pc.risk_score,
            pc.status,
            COUNT(DISTINCT d.discrepancy_id) FILTER (
                WHERE d.review_status IN ('confirmed','published')
            ) AS discrepancy_count
        FROM procurement_cases pc
        LEFT JOIN discrepancies d ON d.case_id = pc.case_id
        WHERE pc.agency_id = :agency_id
        GROUP BY pc.case_id, pc.title, pc.procurement_ref_no,
                 pc.procurement_method, pc.awarded_amount, pc.award_date,
                 pc.risk_score, pc.status
        ORDER BY pc.risk_score DESC NULLS LAST, pc.award_date DESC NULLS LAST
        LIMIT :limit OFFSET :offset
    """)
    result = await db.execute(sql, {"agency_id": str(agency_id), "limit": limit, "offset": offset})
    rows = result.mappings().all()
    count_result = await db.execute(
        text("SELECT COUNT(*) FROM procurement_cases WHERE agency_id = :id"),
        {"id": str(agency_id)},
    )
    total = count_result.scalar_one()
    return total, [dict(r) for r in rows]


async def list_analyst_cases(
    db: AsyncSession,
    status: str,
    limit: int = 50,
    offset: int = 0,
):
    """Case-centric analyst queue grouped by discrepancy review status."""
    status_map = {
        "queue": ("pending", "needs_evidence"),
        "confirmed": ("confirmed",),
        "published": ("publishable_lead", "published"),
    }
    if status not in status_map:
        raise ValueError(f"Unsupported analyst status: {status}")

    statuses = list(status_map[status])
    params = {"statuses": statuses, "limit": limit, "offset": offset}
    sql = text("""
        SELECT
            pc.case_id,
            pc.title,
            pc.procurement_ref_no,
            pc.risk_score,
            pc.updated_at,
            pc.created_at,
            a.name AS agency_name,
            a.acronym AS agency_acronym,
            d.discrepancy_id,
            d.discrepancy_type,
            d.severity,
            d.explanation,
            d.rule_id,
            d.rule_version,
            d.why_fired,
            d.thresholds_applied,
            d.generated_at,
            d.review_status,
            d.source_document_ids
        FROM discrepancies d
        JOIN procurement_cases pc ON pc.case_id = d.case_id
        LEFT JOIN agencies a ON a.agency_id = pc.agency_id
        WHERE d.review_status IN :statuses
          AND pc.case_id IN (
              SELECT ranked.case_id
              FROM (
                  SELECT
                      d2.case_id,
                      MAX(pc2.risk_score) AS max_risk_score,
                      MAX(d2.generated_at) AS latest_generated_at
                  FROM discrepancies d2
                  JOIN procurement_cases pc2 ON pc2.case_id = d2.case_id
                  WHERE d2.review_status IN :statuses
                  GROUP BY d2.case_id
                  ORDER BY max_risk_score DESC NULLS LAST, latest_generated_at DESC
                  LIMIT :limit OFFSET :offset
              ) AS ranked
          )
        ORDER BY
            pc.risk_score DESC NULLS LAST,
            CASE d.severity
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
                ELSE 5
            END,
            d.generated_at DESC
    """).bindparams(bindparam("statuses", expanding=True))
    result = await db.execute(sql, params)
    rows = result.mappings().all()
    count_result = await db.execute(
        text("""
            SELECT COUNT(DISTINCT case_id)
            FROM discrepancies
            WHERE review_status IN :statuses
        """).bindparams(bindparam("statuses", expanding=True)),
        {"statuses": statuses},
    )
    total = count_result.scalar_one()

    grouped: dict[str, dict[str, Any]] = {}
    discrepancy_rows: list[dict[str, Any]] = []
    for row in rows:
        case_id = str(row["case_id"])
        if case_id not in grouped:
            grouped[case_id] = {
                "case_id": row["case_id"],
                "title": row["title"],
                "procurement_ref_no": row["procurement_ref_no"],
                "risk_score": row["risk_score"],
                "updated_at": row["updated_at"] or row["created_at"],
                "agency_name": row["agency_name"],
                "agency_acronym": row["agency_acronym"],
                "discrepancies": [],
            }

        discrepancy_payload = {
            "discrepancy_id": row["discrepancy_id"],
            "case_id": row["case_id"],
            "discrepancy_type": row["discrepancy_type"],
            "severity": row["severity"],
            "explanation": row["explanation"],
            "rule_id": row["rule_id"],
            "rule_version": row["rule_version"],
            "why_fired": row["why_fired"],
            "thresholds_applied": row["thresholds_applied"],
            "generated_at": row["generated_at"],
            "review_status": row["review_status"],
            "source_document_ids": row["source_document_ids"],
        }
        discrepancy_rows.append(discrepancy_payload)

    evidence_rows = await _attach_discrepancy_evidence(db, discrepancy_rows)
    for discrepancy_payload in evidence_rows:
        grouped[str(discrepancy_payload["case_id"])]["discrepancies"].append(discrepancy_payload)

    return total, list(grouped.values())


async def get_case_full_export(db: AsyncSession, case_id: UUID):
    """Full case dossier for JSON/CSV export — joins all tables."""
    case = await get_case_detail(db, case_id)
    if not case:
        return None
    timeline = await get_case_timeline(db, case_id)
    discrepancies = await get_case_discrepancies(db, case_id, analyst=False)

    awards_sql = text("""
        SELECT
            aw.award_id, aw.amount, aw.award_date,
            s.supplier_id, s.canonical_name, s.supplier_type, s.psgc_province
        FROM awards aw
        JOIN suppliers s ON s.supplier_id = aw.supplier_id
        WHERE aw.case_id = :case_id
    """)
    awards_result = await db.execute(awards_sql, {"case_id": str(case_id)})
    awards = [dict(r) for r in awards_result.mappings().all()]

    return {
        "meta": {
            "export_type": "case_dossier",
            "veritas_version": "0.1.0",
            "license": "https://creativecommons.org/licenses/by/4.0/",
            "disclaimer": (
                "Risk signals are anomaly indicators derived from public procurement data. "
                "Not legal determinations. Human review required before publication."
            ),
        },
        "case": case,
        "timeline": timeline,
        "discrepancies": discrepancies,
        "awards": awards,
    }
