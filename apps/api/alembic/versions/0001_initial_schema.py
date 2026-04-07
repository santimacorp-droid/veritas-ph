"""
apps/api/alembic/versions/0001_initial_schema.py

Initial Veritas database schema migration.
Run: alembic upgrade head
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable extensions
    op.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")
    op.execute("CREATE EXTENSION IF NOT EXISTS \"pg_trgm\"")
    op.execute("CREATE EXTENSION IF NOT EXISTS \"vector\"")
    op.execute("CREATE EXTENSION IF NOT EXISTS \"unaccent\"")

    # publishers
    op.create_table(
        "publishers",
        sa.Column("publisher_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("slug", sa.Text, unique=True, nullable=False),
        sa.Column("website", sa.Text),
        sa.Column("publisher_type", sa.Text, nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # agencies
    op.create_table(
        "agencies",
        sa.Column("agency_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("publisher_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("publishers.publisher_id")),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("acronym", sa.Text),
        sa.Column("psgc_code", sa.Text),
        sa.Column("agency_type", sa.Text, nullable=False),
        sa.Column("parent_agency", postgresql.UUID(as_uuid=True), sa.ForeignKey("agencies.agency_id")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.execute("CREATE INDEX idx_agencies_name_trgm ON agencies USING gin (name gin_trgm_ops)")

    # sources
    op.create_table(
        "sources",
        sa.Column("source_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("publisher_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("publishers.publisher_id")),
        sa.Column("source_type", sa.Text, nullable=False),
        sa.Column("publisher_name", sa.Text, nullable=False),
        sa.Column("agency_type", sa.Text),
        sa.Column("geography_codes", postgresql.ARRAY(sa.Text)),
        sa.Column("base_url", sa.Text, nullable=False),
        sa.Column("robots_compliant", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("crawl_frequency", sa.Interval, nullable=False, server_default="'24 hours'"),
        sa.Column("parser_type", sa.Text, nullable=False),
        sa.Column("auth_required", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("reliability_score", sa.Numeric(3, 2), server_default="1.00"),
        sa.Column("last_success", sa.TIMESTAMP(timezone=True)),
        sa.Column("last_failure", sa.TIMESTAMP(timezone=True)),
        sa.Column("enabled", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # documents
    op.create_table(
        "documents",
        sa.Column("document_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sources.source_id"), nullable=False),
        sa.Column("crawl_id", postgresql.UUID(as_uuid=True)),
        sa.Column("source_url", sa.Text, nullable=False),
        sa.Column("fetch_timestamp", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("content_type", sa.Text),
        sa.Column("file_size_bytes", sa.BigInteger),
        sa.Column("sha256_hash", sa.Text, nullable=False),
        sa.Column("storage_path", sa.Text, nullable=False),
        sa.Column("document_type", sa.Text),
        sa.Column("language", sa.Text, server_default="'en'"),
        sa.Column("page_count", sa.Integer),
        sa.Column("is_ocr", sa.Boolean, server_default="false"),
        sa.Column("parser_version", sa.Text),
        sa.Column("processing_status", sa.Text, nullable=False, server_default="'pending'"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_unique_constraint("uq_documents_hash", "documents", ["sha256_hash"])
    op.create_index("idx_documents_source_url", "documents", ["source_url"])
    op.create_index("idx_documents_type", "documents", ["document_type"])
    op.create_index("idx_documents_fetch_ts", "documents", ["fetch_timestamp"], postgresql_ops={"fetch_timestamp": "DESC"})

    # suppliers
    op.create_table(
        "suppliers",
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("canonical_name", sa.Text, nullable=False),
        sa.Column("slug", sa.Text, unique=True, nullable=False),
        sa.Column("supplier_type", sa.Text),
        sa.Column("primary_address", sa.Text),
        sa.Column("psgc_province", sa.Text),
        sa.Column("philgeps_id", sa.Text),
        sa.Column("embedding", postgresql.ARRAY(sa.Float)),  # vector(1536) via pgvector
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.execute("CREATE INDEX idx_suppliers_name_trgm ON suppliers USING gin (canonical_name gin_trgm_ops)")

    # procurement_cases
    op.create_table(
        "procurement_cases",
        sa.Column("case_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("publisher_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("publishers.publisher_id")),
        sa.Column("agency_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agencies.agency_id")),
        sa.Column("procurement_ref_no", sa.Text),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("procurement_method", sa.Text),
        sa.Column("category", sa.Text),
        sa.Column("geographic_scope", sa.Text),
        sa.Column("planned_amount", sa.Numeric(18, 2)),
        sa.Column("awarded_amount", sa.Numeric(18, 2)),
        sa.Column("final_contract_amount", sa.Numeric(18, 2)),
        sa.Column("award_date", sa.Date),
        sa.Column("ntp_date", sa.Date),
        sa.Column("contract_start_date", sa.Date),
        sa.Column("contract_end_date", sa.Date),
        sa.Column("status", sa.Text, server_default="'open'"),
        sa.Column("completeness_score", sa.Numeric(4, 3)),
        sa.Column("risk_score", sa.Numeric(4, 3)),
        sa.Column("confidence_score", sa.Numeric(4, 3)),
        sa.Column("risk_components", postgresql.JSONB),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("idx_cases_risk", "procurement_cases", ["risk_score"])
    op.execute("CREATE INDEX idx_cases_title_fts ON procurement_cases USING gin (to_tsvector('english', title))")

    # discrepancies
    op.create_table(
        "discrepancies",
        sa.Column("discrepancy_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("procurement_cases.case_id"), nullable=False),
        sa.Column("discrepancy_type", sa.Text, nullable=False),
        sa.Column("severity", sa.Text, nullable=False),
        sa.Column("explanation", sa.Text, nullable=False),
        sa.Column("source_document_ids", postgresql.ARRAY(postgresql.UUID(as_uuid=True))),
        sa.Column("source_fields", postgresql.JSONB),
        sa.Column("rule_id", sa.Text, nullable=False),
        sa.Column("rule_version", sa.Text, nullable=False),
        sa.Column("why_fired", sa.Text, nullable=False),
        sa.Column("thresholds_applied", postgresql.JSONB),
        sa.Column("generated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("review_status", sa.Text, nullable=False, server_default="'pending'"),
        sa.Column("analyst_outcome", sa.Text),
        sa.Column("analyst_id", postgresql.UUID(as_uuid=True)),
        sa.Column("reviewed_at", sa.TIMESTAMP(timezone=True)),
    )
    op.create_index("idx_discrepancies_case", "discrepancies", ["case_id"])
    op.create_index("idx_discrepancies_status", "discrepancies", ["review_status"])

    # evidence_links (provenance)
    op.create_table(
        "evidence_links",
        sa.Column("link_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("entity_type", sa.Text, nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("documents.document_id"), nullable=False),
        sa.Column("source_url", sa.Text, nullable=False),
        sa.Column("fetch_timestamp", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("sha256_hash", sa.Text, nullable=False),
        sa.Column("page_number", sa.Integer),
        sa.Column("char_start", sa.Integer),
        sa.Column("char_end", sa.Integer),
        sa.Column("extraction_confidence", sa.Numeric(4, 3)),
        sa.Column("parser_version", sa.Text),
        sa.Column("rule_version", sa.Text),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("idx_evidence_entity", "evidence_links", ["entity_type", "entity_id"])

    # audit_log (immutable)
    op.create_table(
        "audit_log",
        sa.Column("log_id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True)),
        sa.Column("actor_type", sa.Text),
        sa.Column("action", sa.Text, nullable=False),
        sa.Column("entity_type", sa.Text),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True)),
        sa.Column("old_value", postgresql.JSONB),
        sa.Column("new_value", postgresql.JSONB),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("evidence_links")
    op.drop_table("discrepancies")
    op.drop_table("procurement_cases")
    op.drop_table("suppliers")
    op.drop_table("documents")
    op.drop_table("sources")
    op.drop_table("agencies")
    op.drop_table("publishers")
