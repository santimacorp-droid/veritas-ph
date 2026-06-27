"""
apps/api/queries_legislation.py

Raw SQL queries for the Legislation module.
"""

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def list_laws(db: AsyncSession, limit: int = 50, offset: int = 0):
    sql = text("""
        SELECT
            l.law_id, l.title, l.short_title, l.description, l.date_passed, l.status,
            l.author, l.sponsor, l.approved_by, l.submitted_by, l.voting_record, l.category,
            l.created_at, l.updated_at,
            la.integrity_score, la.governance_score, la.analysis_status, la.loopholes
        FROM laws l
        LEFT JOIN (
            SELECT la1.law_id, la1.integrity_score, la1.governance_score, la1.analysis_status, la1.loopholes
            FROM law_analyses la1
            WHERE la1.created_at = (
                SELECT MAX(la2.created_at)
                FROM law_analyses la2
                WHERE la2.law_id = la1.law_id
            )
        ) la ON la.law_id = l.law_id
        ORDER BY l.date_passed DESC NULLS LAST, l.created_at DESC
        LIMIT :limit OFFSET :offset
    """)
    result = await db.execute(sql, {"limit": limit, "offset": offset})
    rows = result.mappings().all()
    
    laws_list = []
    for r in rows:
        d = dict(r)
        loophole_count = 0
        if d.get("loopholes"):
            try:
                import json
                loops = json.loads(d["loopholes"])
                if isinstance(loops, list):
                    loophole_count = len(loops)
            except Exception:
                pass
        d["loophole_count"] = loophole_count
        if "loopholes" in d:
            del d["loopholes"]
        laws_list.append(d)
        
        
    count_result = await db.execute(text("SELECT COUNT(*) FROM laws"))
    total = count_result.scalar_one()
    return total, laws_list


async def get_law_detail(db: AsyncSession, law_id: UUID):
    sql = text("""
        SELECT
            law_id, title, short_title, description, date_passed, status,
            author, sponsor, approved_by, submitted_by, voting_record, category,
            created_at, updated_at
        FROM laws
        WHERE law_id = :law_id
    """)
    result = await db.execute(sql, {"law_id": str(law_id)})
    row = result.mappings().first()
    if not row:
        return None

    law = dict(row)

    provisions_sql = text("""
        SELECT
            p.provision_id, p.law_id, p.section_number, p.title, p.content, p.created_at,
            c.controversy_id, c.issue_description, c.impact, c.severity, c.created_at as controversy_created_at
        FROM law_provisions p
        LEFT JOIN law_controversies c ON c.provision_id = p.provision_id
        WHERE p.law_id = :law_id
        ORDER BY p.section_number
    """)
    prov_result = await db.execute(provisions_sql, {"law_id": str(law_id)})
    provisions_map = {}
    for r in prov_result.mappings().all():
        pid = str(r["provision_id"])
        if pid not in provisions_map:
            provisions_map[pid] = {
                "provision_id": pid,
                "law_id": str(r["law_id"]),
                "section_number": r["section_number"],
                "title": r["title"],
                "content": r["content"],
                "created_at": r["created_at"],
                "controversies": [],
            }
        if r["controversy_id"]:
            provisions_map[pid]["controversies"].append(
                {
                    "controversy_id": str(r["controversy_id"]),
                    "provision_id": pid,
                    "issue_description": r["issue_description"],
                    "impact": r["impact"],
                    "severity": r["severity"],
                    "created_at": r["controversy_created_at"],
                }
            )

    law["provisions"] = list(provisions_map.values())

    revisions_sql = text("""
        SELECT
            revision_id, law_id, proposed_bill, proposed_changes, sponsor, status, created_at
        FROM law_revisions
        WHERE law_id = :law_id
        ORDER BY created_at DESC
    """)
    rev_result = await db.execute(revisions_sql, {"law_id": str(law_id)})
    law["revisions"] = [dict(r) for r in rev_result.mappings().all()]

    return law


async def create_law(
    db: AsyncSession,
    title: str,
    short_title: str = None,
    description: str = None,
    date_passed: str = None,
    status: str = "active",
):
    import uuid

    law_id = str(uuid.uuid4())
    sql = text("""
        INSERT INTO laws (law_id, title, short_title, description, date_passed, status)
        VALUES (:law_id, :title, :short_title, :description, :date_passed, :status)
        RETURNING law_id, title, short_title, description, date_passed, status, created_at, updated_at
    """)
    result = await db.execute(
        sql,
        {
            "law_id": law_id,
            "title": title,
            "short_title": short_title,
            "description": description,
            "date_passed": date_passed,
            "status": status,
        },
    )
    row = result.mappings().first()
    return dict(row)


async def create_provision(
    db: AsyncSession, law_id: UUID, section_number: str, title: str = None, content: str = ""
):
    import uuid

    provision_id = str(uuid.uuid4())
    sql = text("""
        INSERT INTO law_provisions (provision_id, law_id, section_number, title, content)
        VALUES (:provision_id, :law_id, :section_number, :title, :content)
        RETURNING provision_id, law_id, section_number, title, content, created_at
    """)
    result = await db.execute(
        sql,
        {
            "provision_id": provision_id,
            "law_id": str(law_id),
            "section_number": section_number,
            "title": title,
            "content": content,
        },
    )
    row = result.mappings().first()
    return dict(row)


async def create_controversy(
    db: AsyncSession,
    provision_id: UUID,
    issue_description: str,
    impact: str = None,
    severity: str = "medium",
):
    import uuid

    controversy_id = str(uuid.uuid4())
    sql = text("""
        INSERT INTO law_controversies (controversy_id, provision_id, issue_description, impact, severity)
        VALUES (:controversy_id, :provision_id, :issue_description, :impact, :severity)
        RETURNING controversy_id, provision_id, issue_description, impact, severity, created_at
    """)
    result = await db.execute(
        sql,
        {
            "controversy_id": controversy_id,
            "provision_id": str(provision_id),
            "issue_description": issue_description,
            "impact": impact,
            "severity": severity,
        },
    )
    row = result.mappings().first()
    return dict(row)


async def create_revision(
    db: AsyncSession,
    law_id: UUID,
    proposed_bill: str,
    proposed_changes: str,
    sponsor: str = None,
    status: str = "pending",
):
    import uuid

    revision_id = str(uuid.uuid4())
    sql = text("""
        INSERT INTO law_revisions (revision_id, law_id, proposed_bill, proposed_changes, sponsor, status)
        VALUES (:revision_id, :law_id, :proposed_bill, :proposed_changes, :sponsor, :status)
        RETURNING revision_id, law_id, proposed_bill, proposed_changes, sponsor, status, created_at
    """)
    result = await db.execute(
        sql,
        {
            "revision_id": revision_id,
            "law_id": str(law_id),
            "proposed_bill": proposed_bill,
            "proposed_changes": proposed_changes,
            "sponsor": sponsor,
            "status": status,
        },
    )
    row = result.mappings().first()
    return dict(row)
