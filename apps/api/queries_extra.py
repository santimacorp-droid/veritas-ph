"""
apps/api/queries.py  (additional queries — append to existing file)
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def list_agencies(
    db: AsyncSession,
    limit: int = 50,
    offset: int = 0,
):
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
        LEFT JOIN publishers p       ON p.publisher_id = a.publisher_id
        LEFT JOIN procurement_cases pc ON pc.agency_id = a.agency_id
        LEFT JOIN discrepancies d    ON d.case_id = pc.case_id
        GROUP BY a.agency_id, a.name, a.acronym, a.agency_type, p.name
        ORDER BY total_awarded DESC NULLS LAST
        LIMIT :limit OFFSET :offset
    """)
    result = await db.execute(sql, {"limit": limit, "offset": offset})
    rows = result.mappings().all()

    count_result = await db.execute(text("SELECT COUNT(*) FROM agencies"))
    total = count_result.scalar_one()

    return total, [dict(r) for r in rows]


async def get_agency_cases(
    db: AsyncSession,
    agency_id,
    limit: int = 20,
    offset: int = 0,
):
    """Cases for a specific agency, ordered by risk desc."""
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


async def get_case_full_export(db: AsyncSession, case_id):
    """Full case dossier for export — joins all tables."""
    from uuid import UUID as _UUID
    case = await get_case_detail(db, case_id)
    if not case:
        return None
    timeline = await get_case_timeline(db, case_id)
    discrepancies = await get_case_discrepancies(db, case_id, analyst=False)

    # Awards
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
                "Risk signals are anomaly indicators derived from public data. "
                "Not legal determinations. Human review required before publication."
            ),
        },
        "case": case,
        "timeline": timeline,
        "discrepancies": discrepancies,
        "awards": awards,
    }
