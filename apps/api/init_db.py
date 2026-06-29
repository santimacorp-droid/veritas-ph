"""
apps/api/init_db.py

Initializes the database with the Veritas schema.
Supports asynchronous connection to Supabase PostgreSQL or SQLite.
"""

import asyncio
import os
import sys

# Ensure apps/api directory is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine
from sqlalchemy import text

SCHEMA_SQL = """
-- ─── Publishers & Agencies ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS publishers (
    publisher_id    TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    slug            TEXT UNIQUE NOT NULL,
    website         TEXT,
    publisher_type  TEXT NOT NULL CHECK (publisher_type IN ('national_agency','gocc','province','city','municipality','barangay','oversight','other')),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agencies (
    agency_id       TEXT PRIMARY KEY,
    publisher_id    TEXT REFERENCES publishers(publisher_id),
    name            TEXT NOT NULL,
    acronym         TEXT,
    psgc_code       TEXT,
    agency_type     TEXT NOT NULL,
    parent_agency   TEXT REFERENCES agencies(agency_id),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agencies_name ON agencies (name);

-- ─── Source Registry ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sources (
    source_id           TEXT PRIMARY KEY,
    publisher_id        TEXT REFERENCES publishers(publisher_id),
    source_type         TEXT NOT NULL CHECK (source_type IN ('portal','html_listing','pdf_repo','file_drop','api','rss')),
    publisher_name      TEXT NOT NULL,
    agency_type         TEXT,
    geography_codes     JSONB, -- Store array as JSON/Text
    base_url            TEXT NOT NULL,
    robots_compliant    BOOLEAN NOT NULL DEFAULT TRUE,
    crawl_frequency     TEXT NOT NULL DEFAULT '24 hours',
    parser_type         TEXT NOT NULL,
    auth_required       BOOLEAN NOT NULL DEFAULT FALSE,
    reliability_score   NUMERIC DEFAULT 1.00,
    last_success        TIMESTAMP,
    last_failure        TIMESTAMP,
    enabled             BOOLEAN NOT NULL DEFAULT TRUE,
    notes               TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Crawls ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crawls (
    crawl_id        TEXT PRIMARY KEY,
    source_id       TEXT NOT NULL REFERENCES sources(source_id),
    started_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at     TIMESTAMP,
    status          TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','partial','failed')),
    urls_discovered INTEGER DEFAULT 0,
    docs_fetched    INTEGER DEFAULT 0,
    docs_new        INTEGER DEFAULT 0,
    errors          JSONB DEFAULT '[]', -- JSON
    crawler_version TEXT
);

-- ─── Documents ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS documents (
    document_id     TEXT PRIMARY KEY,
    source_id       TEXT NOT NULL REFERENCES sources(source_id),
    crawl_id        TEXT REFERENCES crawls(crawl_id),
    source_url      TEXT NOT NULL,
    fetch_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    content_type    TEXT,
    file_size_bytes BIGINT,
    sha256_hash     TEXT NOT NULL UNIQUE,
    storage_path    TEXT NOT NULL,    -- local object key
    document_type   TEXT,             -- APP, bid_notice, award, contract, audit_report, etc.
    language        TEXT DEFAULT 'en',
    page_count      INTEGER,
    is_ocr          BOOLEAN DEFAULT FALSE,
    parser_version  TEXT,
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending','extracting','extracted','linked','error')),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_source_url ON documents(source_url);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_fetch_ts ON documents(fetch_timestamp DESC);

CREATE TABLE IF NOT EXISTS document_versions (
    version_id      TEXT PRIMARY KEY,
    document_id     TEXT NOT NULL REFERENCES documents(document_id),
    version_num     INTEGER NOT NULL,
    sha256_hash     TEXT NOT NULL,
    storage_path    TEXT NOT NULL,
    fetched_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    change_summary  TEXT,
    UNIQUE (document_id, version_num)
);

CREATE TABLE IF NOT EXISTS document_pages (
    page_id         TEXT PRIMARY KEY,
    document_id     TEXT NOT NULL REFERENCES documents(document_id),
    page_number     INTEGER NOT NULL,
    raw_text        TEXT,
    ocr_confidence  NUMERIC,
    storage_path    TEXT,   -- thumbnail/preview object key
    UNIQUE (document_id, page_number)
);

-- ─── Extractions ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS extractions (
    extraction_id   TEXT PRIMARY KEY,
    document_id     TEXT NOT NULL REFERENCES documents(document_id),
    extractor       TEXT NOT NULL,     -- 'rule_parser', 'llm_assist', 'manual'
    parser_version  TEXT,
    extracted_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fields          JSONB NOT NULL,    -- JSON
    confidence      NUMERIC,          -- overall extraction confidence 0-1
    raw_spans       JSONB,             -- JSON
    review_status   TEXT DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed','verified','corrected','rejected'))
);

-- ─── Suppliers ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id     TEXT PRIMARY KEY,
    canonical_name  TEXT NOT NULL,
    slug            TEXT UNIQUE NOT NULL,
    supplier_type   TEXT,           -- corporation, sole_prop, cooperative, partnership, etc.
    primary_address TEXT,
    psgc_province   TEXT,
    philgeps_id     TEXT,
    sec_reg_no      TEXT,
    dti_reg_no      TEXT,
    business_classification TEXT,
    geography_codes JSONB,
    embedding       VECTOR(1536),   -- Store vector embeddings
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers (canonical_name);

CREATE TABLE IF NOT EXISTS supplier_aliases (
    alias_id        TEXT PRIMARY KEY,
    supplier_id     TEXT NOT NULL REFERENCES suppliers(supplier_id),
    alias           TEXT NOT NULL,
    source          TEXT,       -- which document/source this alias appeared in
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (supplier_id, alias)
);

CREATE TABLE IF NOT EXISTS pending_supplier_merges (
    merge_id        TEXT PRIMARY KEY,
    source_id       TEXT NOT NULL REFERENCES suppliers(supplier_id),
    target_id       TEXT NOT NULL REFERENCES suppliers(supplier_id),
    similarity_score NUMERIC NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (source_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_pending_supplier_merges ON pending_supplier_merges (status);

-- ─── Procurement Cases ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS procurement_cases (
    case_id                 TEXT PRIMARY KEY,
    publisher_id            TEXT REFERENCES publishers(publisher_id),
    agency_id               TEXT REFERENCES agencies(agency_id),
    procurement_ref_no      TEXT,
    title                   TEXT NOT NULL,
    procurement_method      TEXT,   -- public_bidding, shopping, negotiated, etc.
    category                TEXT,   -- infrastructure, goods, consulting_services, etc.
    geographic_scope        TEXT,
    planned_amount          NUMERIC,
    awarded_amount          NUMERIC,
    final_contract_amount   NUMERIC,
    bid_deadline            DATE,
    award_date              DATE,
    ntp_date                DATE,
    contract_start_date     DATE,
    contract_end_date       DATE,
    status                  TEXT DEFAULT 'open',
    procurement_stage       TEXT NOT NULL DEFAULT 'active_bidding'
                            CHECK (procurement_stage IN (
                                'active_bidding', 'under_evaluation', 'awarded',
                                'ongoing', 'completed', 'cancelled'
                            )),
    ai_stage_confidence     NUMERIC,          -- 0-1, set when AI classifier is used
    stage_classified_at     TIMESTAMP,        -- when AI last classified stage
    completeness_score      NUMERIC,   -- 0-1
    risk_score              NUMERIC,   -- 0-1 (raw internal risk score)
    public_risk_score       NUMERIC DEFAULT 0.05, -- 0-1 (public-facing confirmed risk score)
    confidence_score        NUMERIC,   -- 0-1
    risk_components         JSONB,          -- JSON
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cases_ref_no ON procurement_cases(procurement_ref_no);
CREATE INDEX IF NOT EXISTS idx_cases_agency ON procurement_cases(agency_id);
CREATE INDEX IF NOT EXISTS idx_cases_risk ON procurement_cases(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_cases_title ON procurement_cases(title);
CREATE INDEX IF NOT EXISTS idx_cases_award_date ON procurement_cases(award_date DESC);
CREATE INDEX IF NOT EXISTS idx_cases_status ON procurement_cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_stage ON procurement_cases(procurement_stage);
CREATE INDEX IF NOT EXISTS idx_cases_category ON procurement_cases(category);
CREATE INDEX IF NOT EXISTS idx_cases_method ON procurement_cases(procurement_method);
CREATE INDEX IF NOT EXISTS idx_cases_updated ON procurement_cases(updated_at DESC);

-- ─── Procurement Events (Timeline Stages) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS procurement_events (
    event_id        TEXT PRIMARY KEY,
    case_id         TEXT NOT NULL REFERENCES procurement_cases(case_id),
    document_id     TEXT REFERENCES documents(document_id),
    stage           TEXT NOT NULL CHECK (stage IN ('planning','tender','award','contract','implementation','audit')),
    event_type      TEXT NOT NULL,    -- app_entry, bid_notice, bid_abstract, noa, ntp, contract, vo, completion, audit_finding
    event_date      DATE,
    amount          NUMERIC,
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_case ON procurement_events(case_id, stage);

-- ─── Line Items ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS line_items (
    item_id         TEXT PRIMARY KEY,
    case_id         TEXT NOT NULL REFERENCES procurement_cases(case_id),
    document_id     TEXT REFERENCES documents(document_id),
    item_no         TEXT,
    description     TEXT NOT NULL,
    unit            TEXT,
    quantity        NUMERIC,
    unit_price      NUMERIC,
    total_price     NUMERIC,
    item_type       TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_items_case ON line_items(case_id);

-- ─── APP Items ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS app_items (
    app_item_id     TEXT PRIMARY KEY,
    agency_id       TEXT NOT NULL REFERENCES agencies(agency_id),
    document_id     TEXT REFERENCES documents(document_id),
    fiscal_year     INTEGER NOT NULL,
    quarter         INTEGER CHECK (quarter IN (1,2,3,4)),
    code            TEXT,
    description     TEXT NOT NULL,
    procurement_method TEXT,
    planned_amount  NUMERIC,
    linked_case_id  TEXT REFERENCES procurement_cases(case_id),
    match_status    TEXT DEFAULT 'unmatched' CHECK (match_status IN ('unmatched','matched','no_tender_found')),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Awards ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS awards (
    award_id        TEXT PRIMARY KEY,
    case_id         TEXT NOT NULL REFERENCES procurement_cases(case_id),
    supplier_id     TEXT REFERENCES suppliers(supplier_id),
    document_id     TEXT REFERENCES documents(document_id),
    award_date      DATE,
    amount          NUMERIC,
    bidders_count   INTEGER,
    single_bidder   BOOLEAN DEFAULT FALSE,
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Contracts ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contracts (
    contract_id     TEXT PRIMARY KEY,
    case_id         TEXT NOT NULL REFERENCES procurement_cases(case_id),
    award_id        TEXT REFERENCES awards(award_id),
    supplier_id     TEXT REFERENCES suppliers(supplier_id),
    document_id     TEXT REFERENCES documents(document_id),
    contract_no     TEXT,
    start_date      DATE,
    end_date        DATE,
    amount          NUMERIC,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contract_amendments (
    amendment_id    TEXT PRIMARY KEY,
    contract_id     TEXT NOT NULL REFERENCES contracts(contract_id),
    document_id     TEXT REFERENCES documents(document_id),
    amendment_no    INTEGER,
    amendment_date  DATE,
    amount_change   NUMERIC,
    time_extension_days INTEGER,
    reason          TEXT,
    vo_percentage   NUMERIC,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Projects ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
    project_id      TEXT PRIMARY KEY,
    case_id         TEXT REFERENCES procurement_cases(case_id),
    name            TEXT NOT NULL,
    description     TEXT,
    status          TEXT,
    start_date      DATE,
    end_date        DATE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_locations (
    location_id     TEXT PRIMARY KEY,
    project_id      TEXT NOT NULL REFERENCES projects(project_id),
    psgc_code       TEXT,
    region          TEXT,
    province        TEXT,
    city_municipality TEXT,
    barangay        TEXT,
    latitude        NUMERIC,
    longitude       NUMERIC,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Audit Findings ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_findings (
    finding_id      TEXT PRIMARY KEY,
    agency_id       TEXT REFERENCES agencies(agency_id),
    document_id     TEXT REFERENCES documents(document_id),
    case_id         TEXT REFERENCES procurement_cases(case_id),
    fiscal_year     INTEGER,
    finding_type    TEXT,
    finding_code    TEXT,
    description     TEXT NOT NULL,
    amount          NUMERIC,
    status          TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_findings ON audit_findings(agency_id, fiscal_year);

-- ─── Budgets ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS budgets (
    budget_id       TEXT PRIMARY KEY,
    agency_id       TEXT REFERENCES agencies(agency_id),
    document_id     TEXT REFERENCES documents(document_id),
    fiscal_year     INTEGER NOT NULL,
    appropriation   NUMERIC,
    allotment       NUMERIC,
    obligation      NUMERIC,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Risk & Discrepancies ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS discrepancies (
    discrepancy_id      TEXT PRIMARY KEY,
    case_id             TEXT NOT NULL REFERENCES procurement_cases(case_id),
    discrepancy_type    TEXT NOT NULL,
    severity            TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
    explanation         TEXT NOT NULL,
    source_document_ids JSONB, -- JSON
    source_fields       JSONB, -- JSON
    rule_id             TEXT NOT NULL,
    rule_version        TEXT NOT NULL,
    why_fired           JSONB NOT NULL,
    thresholds_applied  JSONB, -- JSON
    generated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    review_status       TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','confirmed','false_positive','needs_evidence','publishable_lead','published')),
    analyst_outcome     TEXT,
    analyst_id          TEXT,
    reviewed_at         TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discrepancies_case ON discrepancies(case_id);
CREATE INDEX IF NOT EXISTS idx_discrepancies_type ON discrepancies(discrepancy_type);
CREATE INDEX IF NOT EXISTS idx_discrepancies_status ON discrepancies(review_status);
CREATE INDEX IF NOT EXISTS idx_discrepancies_severity ON discrepancies(severity, generated_at DESC);

CREATE TABLE IF NOT EXISTS risk_signals (
    signal_id       TEXT PRIMARY KEY,
    case_id         TEXT NOT NULL REFERENCES procurement_cases(case_id),
    signal_name     TEXT NOT NULL,
    component_score NUMERIC,
    fired_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    evidence        JSONB -- JSON
);

-- ─── Evidence Links (Provenance) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS evidence_links (
    link_id         TEXT PRIMARY KEY,
    entity_type     TEXT NOT NULL,
    entity_id       TEXT NOT NULL,
    document_id     TEXT NOT NULL REFERENCES documents(document_id),
    source_url      TEXT NOT NULL,
    fetch_timestamp TIMESTAMP NOT NULL,
    sha256_hash     TEXT NOT NULL,
    page_number     INTEGER,
    char_start      INTEGER,
    char_end        INTEGER,
    extraction_confidence NUMERIC,
    parser_version  TEXT,
    rule_version    TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evidence_entity ON evidence_links(entity_type, entity_id);

-- ─── Human Review & Annotations ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    user_id         TEXT PRIMARY KEY,
    email           TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    full_name       TEXT,
    role            TEXT NOT NULL DEFAULT 'analyst' CHECK (role IN ('analyst','editor','admin')),
    is_active       BOOLEAN DEFAULT TRUE,
    last_login      TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analyst_reviews (
    review_id       TEXT PRIMARY KEY,
    discrepancy_id  TEXT REFERENCES discrepancies(discrepancy_id),
    case_id         TEXT REFERENCES procurement_cases(case_id),
    analyst_id      TEXT NOT NULL REFERENCES users(user_id),
    action          TEXT NOT NULL CHECK (action IN ('verified','corrected','false_positive','needs_evidence','publishable_lead','published','takedown')),
    note            TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
    log_id          TEXT PRIMARY KEY,
    actor_id        TEXT,
    actor_type      TEXT,
    action          TEXT NOT NULL,
    entity_type     TEXT,
    entity_id       TEXT,
    old_value       JSONB, -- JSON
    new_value       JSONB, -- JSON
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS annotations (
    annotation_id   TEXT PRIMARY KEY,
    entity_type     TEXT NOT NULL,
    entity_id       TEXT NOT NULL,
    analyst_id      TEXT NOT NULL REFERENCES users(user_id),
    annotation_type TEXT NOT NULL,
    content         TEXT,
    tags            JSONB, -- JSON
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_submissions (
    submission_id   TEXT PRIMARY KEY,
    submitter_email TEXT,
    submission_type TEXT NOT NULL CHECK (submission_type IN ('foi_response','tip','correction','takedown_request')),
    document_id     TEXT REFERENCES documents(document_id),
    linked_case_id  TEXT REFERENCES procurement_cases(case_id),
    notes           TEXT,
    status          TEXT DEFAULT 'pending',
    storage_path    TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Laws & Legislation ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS laws (
    law_id          TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    short_title     TEXT,
    description     TEXT,
    date_passed     DATE,
    status          TEXT DEFAULT 'active',
    author          TEXT,
    sponsor         TEXT,
    approved_by     TEXT,
    submitted_by    TEXT,
    voting_record   TEXT,
    category        TEXT DEFAULT 'republic_act',
    superseded_by_short_title TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS law_provisions (
    provision_id    TEXT PRIMARY KEY,
    law_id          TEXT NOT NULL REFERENCES laws(law_id) ON DELETE CASCADE,
    section_number  TEXT NOT NULL,
    title           TEXT,
    content         TEXT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS law_controversies (
    controversy_id   TEXT PRIMARY KEY,
    provision_id     TEXT NOT NULL REFERENCES law_provisions(provision_id) ON DELETE CASCADE,
    issue_description TEXT NOT NULL,
    impact           TEXT,
    severity         TEXT NOT NULL DEFAULT 'medium',
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS law_revisions (
    revision_id     TEXT PRIMARY KEY,
    law_id          TEXT NOT NULL REFERENCES laws(law_id) ON DELETE CASCADE,
    proposed_bill   TEXT NOT NULL,
    proposed_changes TEXT NOT NULL,
    sponsor         TEXT,
    status          TEXT DEFAULT 'pending',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS law_case_links (
    link_id         TEXT PRIMARY KEY,
    controversy_id  TEXT NOT NULL REFERENCES law_controversies(controversy_id) ON DELETE CASCADE,
    case_id         TEXT NOT NULL REFERENCES procurement_cases(case_id) ON DELETE CASCADE,
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS law_analyses (
    analysis_id         TEXT PRIMARY KEY,
    law_id              TEXT NOT NULL REFERENCES laws(law_id) ON DELETE CASCADE,
    model_used          TEXT NOT NULL,
    integrity_score     NUMERIC,
    governance_score    NUMERIC,
    pros                TEXT NOT NULL,
    cons                TEXT NOT NULL,
    loopholes           TEXT NOT NULL,
    suggested_revisions TEXT NOT NULL,
    violation_patterns  TEXT,
    cross_law_conflicts TEXT,
    citizen_summary     TEXT NOT NULL,
    raw_ai_response     TEXT,
    analysis_status     TEXT NOT NULL DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'running', 'completed', 'failed')),
    requested_by        TEXT,
    retry_count         INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at        TIMESTAMP
);

CREATE TABLE IF NOT EXISTS linker_metrics (
    metric_id       TEXT PRIMARY KEY,
    run_timestamp   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    precision       NUMERIC NOT NULL,
    recall          NUMERIC NOT NULL,
    false_positives INTEGER NOT NULL,
    false_negatives INTEGER NOT NULL,
    samples_evaluated INTEGER NOT NULL
);

-- ─── Corporate Registries & Advanced Audits ─────────────────────────────────

CREATE TABLE IF NOT EXISTS corporate_registries (
    registry_id      TEXT PRIMARY KEY,
    company_name     TEXT NOT NULL,
    registration_no  TEXT UNIQUE NOT NULL,
    registered_addr  TEXT NOT NULL,
    directors        JSONB NOT NULL,
    shareholders     JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_reports (
    report_id            TEXT PRIMARY KEY,
    case_id              TEXT NOT NULL REFERENCES procurement_cases(case_id) ON DELETE CASCADE,
    report_type          TEXT NOT NULL CHECK (report_type IN ('predictive', 'post_mortem')),
    risk_probability     NUMERIC,
    analysis_details     TEXT NOT NULL,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""


async def initialize_database():
    print(f"Initializing database using engine: {engine.url}")

    # Split schema DDL by semicolon to run statements sequentially
    statements = [s.strip() for s in SCHEMA_SQL.split(";") if s.strip()]

    async with engine.begin() as conn:
        print("Creating tables and indexes...")
        if "postgres" in str(engine.url):
            try:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            except Exception as e:
                print(f"Failed to create vector extension: {e}")
                
        for idx, statement in enumerate(statements, 1):
            try:
                await conn.execute(text(statement))
            except Exception as e:
                print(f"Error executing statement #{idx}: {statement[:80]}...")
                print(f"Error detail: {e}")
                raise e

        # --- ALTER TABLE migrations ---
        print("Running schema migration checks...")
        if "postgres" in str(engine.url):
            try:
                await conn.execute(text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS business_classification TEXT;"))
                print("Applied migration: business_classification to suppliers")
            except Exception as e:
                print(f"Migration warning (business_classification): {e}")
            try:
                await conn.execute(text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS geography_codes JSONB;"))
                print("Applied migration: geography_codes to suppliers")
            except Exception as e:
                print(f"Migration warning (geography_codes): {e}")
            try:
                await conn.execute(text("ALTER TABLE laws ADD COLUMN IF NOT EXISTS submitted_by TEXT;"))
                await conn.execute(text("ALTER TABLE laws ADD COLUMN IF NOT EXISTS voting_record TEXT;"))
                print("Applied migration: submitted_by & voting_record to laws")
            except Exception as e:
                print(f"Migration warning (laws columns): {e}")
        else:
            # SQLite: Check if columns exist using PRAGMA
            try:
                res = await conn.execute(text("PRAGMA table_info(suppliers);"))
                columns = [row[1] for row in res.fetchall()]
                if "business_classification" not in columns:
                    await conn.execute(text("ALTER TABLE suppliers ADD COLUMN business_classification TEXT;"))
                    print("Applied SQLite migration: business_classification to suppliers")
                if "geography_codes" not in columns:
                    await conn.execute(text("ALTER TABLE suppliers ADD COLUMN geography_codes TEXT;"))
                    print("Applied SQLite migration: geography_codes to suppliers")

                res_laws = await conn.execute(text("PRAGMA table_info(laws);"))
                laws_cols = [row[1] for row in res_laws.fetchall()]
                if "submitted_by" not in laws_cols:
                    await conn.execute(text("ALTER TABLE laws ADD COLUMN submitted_by TEXT;"))
                    print("Applied SQLite migration: submitted_by to laws")
                if "voting_record" not in laws_cols:
                    await conn.execute(text("ALTER TABLE laws ADD COLUMN voting_record TEXT;"))
                    print("Applied SQLite migration: voting_record to laws")
            except Exception as e:
                print(f"SQLite migration failed: {e}")
                
        print("Applying updated_at triggers...")
        tables_with_updated_at = [
            ("procurement_cases", "case_id"),
            ("suppliers", "supplier_id"),
            ("laws", "law_id"),
            ("users", "user_id")
        ]
        if "postgres" in str(engine.url):
            try:
                await conn.execute(text("""
                    CREATE OR REPLACE FUNCTION update_modified_column()
                    RETURNS TRIGGER AS $$
                    BEGIN
                        NEW.updated_at = now();
                        RETURN NEW;
                    END;
                    $$ language 'plpgsql';
                """))
                for table, _ in tables_with_updated_at:
                    await conn.execute(text(f"DROP TRIGGER IF EXISTS update_{table}_modtime ON {table};"))
                    await conn.execute(text(f"""
                        CREATE TRIGGER update_{table}_modtime
                        BEFORE UPDATE ON {table}
                        FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
                    """))
            except Exception as e:
                print(f"Failed to create postgres triggers: {e}")
        else:
            # SQLite
            try:
                for table, pk in tables_with_updated_at:
                    await conn.execute(text(f"""
                        DROP TRIGGER IF EXISTS update_{table}_modtime;
                    """))
                    await conn.execute(text(f"""
                        CREATE TRIGGER update_{table}_modtime
                        AFTER UPDATE ON {table}
                        FOR EACH ROW
                        BEGIN
                            UPDATE {table} SET updated_at = CURRENT_TIMESTAMP WHERE {pk} = old.{pk};
                        END;
                    """))
            except Exception as e:
                print(f"Failed to create sqlite triggers: {e}")

        # Check if users table is already seeded
        result = await conn.execute(text("SELECT COUNT(*) FROM users"))
        count = result.scalar()

        if count == 0:
            print("Seeding default publishers, sources, and users...")

            # Publishers
            publishers = [
                {
                    "publisher_id": "pub1",
                    "name": "Philippine Government Electronic Procurement System",
                    "slug": "philgeps",
                    "website": "https://www.philgeps.gov.ph",
                    "publisher_type": "national_agency",
                },
                {
                    "publisher_id": "pub2",
                    "name": "Commission on Audit",
                    "slug": "coa",
                    "website": "https://www.coa.gov.ph",
                    "publisher_type": "oversight",
                },
                {
                    "publisher_id": "pub3",
                    "name": "Department of Budget and Management",
                    "slug": "dbm",
                    "website": "https://www.dbm.gov.ph",
                    "publisher_type": "national_agency",
                },
                {
                    "publisher_id": "pub4",
                    "name": "Government Procurement Policy Board",
                    "slug": "gppb",
                    "website": "https://www.gppb.gov.ph",
                    "publisher_type": "national_agency",
                },
                {
                    "publisher_id": "pub5",
                    "name": "Department of the Interior and Local Government",
                    "slug": "dilg",
                    "website": "https://www.dilg.gov.ph",
                    "publisher_type": "national_agency",
                },
            ]
            await conn.execute(
                text(
                    "INSERT INTO publishers (publisher_id, name, slug, website, publisher_type) "
                    "VALUES (:publisher_id, :name, :slug, :website, :publisher_type)"
                ),
                publishers,
            )

            # Sources
            sources = [
                {
                    "source_id": "src1",
                    "publisher_id": "pub1",
                    "source_type": "portal",
                    "publisher_name": "PhilGEPS Public Notices",
                    "base_url": "https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/SplashOpportunitiesSearchUI.aspx?menuIndex=3&ClickFrom=OpenOpp&Result=3",
                    "parser_type": "philgeps_notice_parser",
                },
                {
                    "source_id": "src2",
                    "publisher_id": "pub1",
                    "source_type": "portal",
                    "publisher_name": "PhilGEPS Award Notices",
                    "base_url": "https://www.philgeps.gov.ph/GEPSNONPILOT/Tender/SplashOpenAwardNoticesNonPhilGEPS.aspx",
                    "parser_type": "philgeps_award_parser",
                },
                {
                    "source_id": "src3",
                    "publisher_id": "pub2",
                    "source_type": "pdf_repo",
                    "publisher_name": "COA Annual Audit Reports",
                    "base_url": "https://www.coa.gov.ph/reports-and-publications/annual-audit-report/",
                    "parser_type": "coa_audit_report_parser",
                },
                {
                    "source_id": "src4",
                    "publisher_id": "pub3",
                    "source_type": "pdf_repo",
                    "publisher_name": "DBM Annual Procurement Plans",
                    "base_url": "https://www.dbm.gov.ph/index.php/procurement/annual-procurement-plan",
                    "parser_type": "dbm_app_parser",
                },
                {
                    "source_id": "src5",
                    "publisher_id": "pub4",
                    "source_type": "html_listing",
                    "publisher_name": "GPPB Forms and Templates",
                    "base_url": "https://www.gppb.gov.ph/laws.php",
                    "parser_type": "gppb_forms_parser",
                },
            ]
            await conn.execute(
                text(
                    "INSERT INTO sources (source_id, publisher_id, source_type, publisher_name, base_url, parser_type) "
                    "VALUES (:source_id, :publisher_id, :source_type, :publisher_name, :base_url, :parser_type)"
                ),
                sources,
            )

            # Users
            users = [
                {
                    "user_id": "usr1",
                    "email": "analyst@veritas.ph",
                    "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$eI/xfs85R6g1hjCmlLIWgg$81Y+w/pehI1hqCaV3tocczTZmWSPmY/Q7R/MR+D6a08",
                    "full_name": "Lead Analyst",
                    "role": "analyst",
                },
                {
                    "user_id": "usr2",
                    "email": "editor@veritas.ph",
                    "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$eI/xfs85R6g1hjCmlLIWgg$81Y+w/pehI1hqCaV3tocczTZmWSPmY/Q7R/MR+D6a08",
                    "full_name": "Senior Editor",
                    "role": "editor",
                },
                {
                    "user_id": "usr3",
                    "email": "admin@veritas.ph",
                    "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$eI/xfs85R6g1hjCmlLIWgg$81Y+w/pehI1hqCaV3tocczTZmWSPmY/Q7R/MR+D6a08",
                    "full_name": "System Admin",
                    "role": "admin",
                },
            ]
            await conn.execute(
                text(
                    "INSERT INTO users (user_id, email, hashed_password, full_name, role) "
                    "VALUES (:user_id, :email, :hashed_password, :full_name, :role)"
                ),
                users,
            )

            print("Database initialization and seeding completed successfully!")
        else:
            print("Database already initialized and seeded.")

        # Agencies (GPPB registry canonical list)
        agencies = [
            {
                "agency_id": "8a7b6c5d-4e3f-2a1b-0c9d-8e7f6a5b4c3d",
                "publisher_id": "pub1",
                "name": "Department of Public Works and Highways",
                "acronym": "DPWH",
                "psgc_code": "000000000",
                "agency_type": "national_agency"
            },
            {
                "agency_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
                "publisher_id": "pub1",
                "name": "Department of Education",
                "acronym": "DepEd",
                "psgc_code": "000000000",
                "agency_type": "national_agency"
            },
            {
                "agency_id": "2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e",
                "publisher_id": "pub1",
                "name": "Department of Health",
                "acronym": "DOH",
                "psgc_code": "000000000",
                "agency_type": "national_agency"
            },
            {
                "agency_id": "agency_dnd",
                "publisher_id": "pub1",
                "name": "Department of National Defense",
                "acronym": "DND",
                "psgc_code": "000000000",
                "agency_type": "national_agency"
            },
            {
                "agency_id": "agency_dotr",
                "publisher_id": "pub1",
                "name": "Department of Transportation",
                "acronym": "DOTr",
                "psgc_code": "000000000",
                "agency_type": "national_agency"
            },
            {
                "agency_id": "agency_da",
                "publisher_id": "pub1",
                "name": "Department of Agriculture",
                "acronym": "DA",
                "psgc_code": "000000000",
                "agency_type": "national_agency"
            },
            {
                "agency_id": "agency_dswd",
                "publisher_id": "pub1",
                "name": "Department of Social Welfare and Development",
                "acronym": "DSWD",
                "psgc_code": "000000000",
                "agency_type": "national_agency"
            },
            {
                "agency_id": "agency_denr",
                "publisher_id": "pub1",
                "name": "Department of Environment and Natural Resources",
                "acronym": "DENR",
                "psgc_code": "000000000",
                "agency_type": "national_agency"
            },
            {
                "agency_id": "agency_dost",
                "publisher_id": "pub1",
                "name": "Department of Science and Technology",
                "acronym": "DOST",
                "psgc_code": "000000000",
                "agency_type": "national_agency"
            },
            {
                "agency_id": "agency_dti",
                "publisher_id": "pub1",
                "name": "Department of Trade and Industry",
                "acronym": "DTI",
                "psgc_code": "000000000",
                "agency_type": "national_agency"
            },
            {
                "agency_id": "agency_dilg",
                "publisher_id": "pub1",
                "name": "Department of the Interior and Local Government",
                "acronym": "DILG",
                "psgc_code": "000000000",
                "agency_type": "national_agency"
            },
            {
                "agency_id": "agency_dict",
                "publisher_id": "pub1",
                "name": "Department of Information and Communications Technology",
                "acronym": "DICT",
                "psgc_code": "000000000",
                "agency_type": "national_agency"
            },
            {
                "agency_id": "agency_dbm",
                "publisher_id": "pub1",
                "name": "Department of Budget and Management",
                "acronym": "DBM",
                "psgc_code": "000000000",
                "agency_type": "national_agency"
            },
            {
                "agency_id": "agency_neda",
                "publisher_id": "pub1",
                "name": "National Economic and Development Authority",
                "acronym": "NEDA",
                "psgc_code": "000000000",
                "agency_type": "national_agency"
            },
            {
                "agency_id": "agency_coa",
                "publisher_id": "pub2",
                "name": "Commission on Audit",
                "acronym": "COA",
                "psgc_code": "000000000",
                "agency_type": "national_agency"
            },
            {
                "agency_id": "agency_gppb",
                "publisher_id": "pub4",
                "name": "Government Procurement Policy Board",
                "acronym": "GPPB",
                "psgc_code": "000000000",
                "agency_type": "national_agency"
            }
        ]
        await conn.execute(
            text(
                "INSERT INTO agencies (agency_id, publisher_id, name, acronym, psgc_code, agency_type) "
                "VALUES (:agency_id, :publisher_id, :name, :acronym, :psgc_code, :agency_type) "
                "ON CONFLICT(agency_id) DO NOTHING"
            ),
            agencies,
        )
        print("Canonical GPPB agencies seeded/verified.")


if __name__ == "__main__":
    asyncio.run(initialize_database())
