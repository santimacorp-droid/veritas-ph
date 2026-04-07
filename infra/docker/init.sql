-- Veritas Database Schema
-- Run once on first init. Alembic manages subsequent migrations.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ─── Publishers & Agencies ──────────────────────────────────────────────────

CREATE TABLE publishers (
    publisher_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    slug            TEXT UNIQUE NOT NULL,
    website         TEXT,
    publisher_type  TEXT NOT NULL CHECK (publisher_type IN ('national_agency','gocc','province','city','municipality','barangay','oversight','other')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE agencies (
    agency_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    publisher_id    UUID REFERENCES publishers(publisher_id),
    name            TEXT NOT NULL,
    acronym         TEXT,
    psgc_code       TEXT,
    agency_type     TEXT NOT NULL,
    parent_agency   UUID REFERENCES agencies(agency_id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agencies_name_trgm ON agencies USING gin (name gin_trgm_ops);

-- ─── Source Registry ────────────────────────────────────────────────────────

CREATE TABLE sources (
    source_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    publisher_id        UUID REFERENCES publishers(publisher_id),
    source_type         TEXT NOT NULL CHECK (source_type IN ('portal','html_listing','pdf_repo','file_drop','api','rss')),
    publisher_name      TEXT NOT NULL,
    agency_type         TEXT,
    geography_codes     TEXT[],
    base_url            TEXT NOT NULL,
    robots_compliant    BOOLEAN NOT NULL DEFAULT TRUE,
    crawl_frequency     INTERVAL NOT NULL DEFAULT '24 hours',
    parser_type         TEXT NOT NULL,
    auth_required       BOOLEAN NOT NULL DEFAULT FALSE CHECK (auth_required = FALSE),  -- MUST always be false
    reliability_score   NUMERIC(3,2) DEFAULT 1.00,
    last_success        TIMESTAMPTZ,
    last_failure        TIMESTAMPTZ,
    enabled             BOOLEAN NOT NULL DEFAULT TRUE,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Crawls ─────────────────────────────────────────────────────────────────

CREATE TABLE crawls (
    crawl_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id       UUID NOT NULL REFERENCES sources(source_id),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at     TIMESTAMPTZ,
    status          TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','partial','failed')),
    urls_discovered INTEGER DEFAULT 0,
    docs_fetched    INTEGER DEFAULT 0,
    docs_new        INTEGER DEFAULT 0,
    errors          JSONB DEFAULT '[]',
    crawler_version TEXT
);

-- ─── Documents ──────────────────────────────────────────────────────────────

CREATE TABLE documents (
    document_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id       UUID NOT NULL REFERENCES sources(source_id),
    crawl_id        UUID REFERENCES crawls(crawl_id),
    source_url      TEXT NOT NULL,
    fetch_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    content_type    TEXT,
    file_size_bytes BIGINT,
    sha256_hash     TEXT NOT NULL,
    storage_path    TEXT NOT NULL,    -- MinIO object key
    document_type   TEXT,             -- APP, bid_notice, award, contract, audit_report, etc.
    language        TEXT DEFAULT 'en',
    page_count      INTEGER,
    is_ocr          BOOLEAN DEFAULT FALSE,
    parser_version  TEXT,
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending','extracting','extracted','linked','error')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_documents_hash ON documents(sha256_hash);
CREATE INDEX idx_documents_source_url ON documents(source_url);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_fetch_ts ON documents(fetch_timestamp DESC);

CREATE TABLE document_versions (
    version_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES documents(document_id),
    version_num     INTEGER NOT NULL,
    sha256_hash     TEXT NOT NULL,
    storage_path    TEXT NOT NULL,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_summary  TEXT,
    UNIQUE (document_id, version_num)
);

CREATE TABLE document_pages (
    page_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES documents(document_id),
    page_number     INTEGER NOT NULL,
    raw_text        TEXT,
    ocr_confidence  NUMERIC(4,3),
    storage_path    TEXT,   -- thumbnail/preview object key
    UNIQUE (document_id, page_number)
);

-- Full text search index on page text
CREATE INDEX idx_document_pages_fts ON document_pages USING gin (to_tsvector('english', COALESCE(raw_text,'')));

-- ─── Extractions ────────────────────────────────────────────────────────────

CREATE TABLE extractions (
    extraction_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES documents(document_id),
    extractor       TEXT NOT NULL,     -- 'rule_parser', 'llm_assist', 'manual'
    parser_version  TEXT,
    extracted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fields          JSONB NOT NULL,    -- key-value pairs of extracted fields
    confidence      NUMERIC(4,3),      -- overall extraction confidence 0-1
    raw_spans       JSONB,             -- [{field, page, char_start, char_end, text}]
    review_status   TEXT DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed','verified','corrected','rejected'))
);

-- ─── Suppliers ──────────────────────────────────────────────────────────────

CREATE TABLE suppliers (
    supplier_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_name  TEXT NOT NULL,
    slug            TEXT UNIQUE NOT NULL,
    supplier_type   TEXT,           -- corporation, sole_prop, cooperative, partnership, etc.
    primary_address TEXT,
    psgc_province   TEXT,
    philgeps_id     TEXT,
    sec_reg_no      TEXT,
    dti_reg_no      TEXT,
    embedding       vector(1536),   -- for semantic similarity dedup
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_name_trgm ON suppliers USING gin (canonical_name gin_trgm_ops);
CREATE INDEX idx_suppliers_embedding ON suppliers USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE supplier_aliases (
    alias_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id     UUID NOT NULL REFERENCES suppliers(supplier_id),
    alias           TEXT NOT NULL,
    source          TEXT,       -- which document/source this alias appeared in
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (supplier_id, alias)
);

CREATE INDEX idx_supplier_aliases_trgm ON supplier_aliases USING gin (alias gin_trgm_ops);

-- ─── Procurement Cases ──────────────────────────────────────────────────────

CREATE TABLE procurement_cases (
    case_id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    publisher_id            UUID REFERENCES publishers(publisher_id),
    agency_id               UUID REFERENCES agencies(agency_id),
    procurement_ref_no      TEXT,
    title                   TEXT NOT NULL,
    procurement_method      TEXT,   -- public_bidding, shopping, negotiated, etc.
    category                TEXT,   -- infrastructure, goods, consulting_services, etc.
    geographic_scope        TEXT,
    planned_amount          NUMERIC(18,2),
    awarded_amount          NUMERIC(18,2),
    final_contract_amount   NUMERIC(18,2),
    award_date              DATE,
    ntp_date                DATE,
    contract_start_date     DATE,
    contract_end_date       DATE,
    status                  TEXT DEFAULT 'open',
    completeness_score      NUMERIC(4,3),   -- 0-1: fraction of timeline stages present
    risk_score              NUMERIC(4,3),   -- 0-1: aggregated risk
    confidence_score        NUMERIC(4,3),   -- 0-1: data linkage reliability
    risk_components         JSONB,          -- decomposed risk signal scores
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cases_ref_no ON procurement_cases(procurement_ref_no);
CREATE INDEX idx_cases_agency ON procurement_cases(agency_id);
CREATE INDEX idx_cases_risk ON procurement_cases(risk_score DESC NULLS LAST);
CREATE INDEX idx_cases_title_fts ON procurement_cases USING gin (to_tsvector('english', title));

-- ─── Procurement Events (Timeline Stages) ───────────────────────────────────

CREATE TABLE procurement_events (
    event_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id         UUID NOT NULL REFERENCES procurement_cases(case_id),
    document_id     UUID REFERENCES documents(document_id),
    stage           TEXT NOT NULL CHECK (stage IN ('planning','tender','award','contract','implementation','audit')),
    event_type      TEXT NOT NULL,    -- app_entry, bid_notice, bid_abstract, noa, ntp, contract, vo, completion, audit_finding
    event_date      DATE,
    amount          NUMERIC(18,2),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_case ON procurement_events(case_id, stage);

-- ─── Line Items ─────────────────────────────────────────────────────────────

CREATE TABLE line_items (
    item_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id         UUID NOT NULL REFERENCES procurement_cases(case_id),
    document_id     UUID REFERENCES documents(document_id),
    item_no         TEXT,
    description     TEXT NOT NULL,
    unit            TEXT,
    quantity        NUMERIC(18,4),
    unit_price      NUMERIC(18,2),
    total_price     NUMERIC(18,2),
    item_type       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_items_case ON line_items(case_id);
CREATE INDEX idx_items_desc_fts ON line_items USING gin (to_tsvector('english', description));

-- ─── APP Items ──────────────────────────────────────────────────────────────

CREATE TABLE app_items (
    app_item_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id       UUID NOT NULL REFERENCES agencies(agency_id),
    document_id     UUID REFERENCES documents(document_id),
    fiscal_year     INTEGER NOT NULL,
    quarter         INTEGER CHECK (quarter IN (1,2,3,4)),
    code            TEXT,
    description     TEXT NOT NULL,
    procurement_method TEXT,
    planned_amount  NUMERIC(18,2),
    linked_case_id  UUID REFERENCES procurement_cases(case_id),
    match_status    TEXT DEFAULT 'unmatched' CHECK (match_status IN ('unmatched','matched','no_tender_found')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Awards ─────────────────────────────────────────────────────────────────

CREATE TABLE awards (
    award_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id         UUID NOT NULL REFERENCES procurement_cases(case_id),
    supplier_id     UUID REFERENCES suppliers(supplier_id),
    document_id     UUID REFERENCES documents(document_id),
    award_date      DATE,
    amount          NUMERIC(18,2),
    bidders_count   INTEGER,
    single_bidder   BOOLEAN DEFAULT FALSE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Contracts ──────────────────────────────────────────────────────────────

CREATE TABLE contracts (
    contract_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id         UUID NOT NULL REFERENCES procurement_cases(case_id),
    award_id        UUID REFERENCES awards(award_id),
    supplier_id     UUID REFERENCES suppliers(supplier_id),
    document_id     UUID REFERENCES documents(document_id),
    contract_no     TEXT,
    start_date      DATE,
    end_date        DATE,
    amount          NUMERIC(18,2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE contract_amendments (
    amendment_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id     UUID NOT NULL REFERENCES contracts(contract_id),
    document_id     UUID REFERENCES documents(document_id),
    amendment_no    INTEGER,
    amendment_date  DATE,
    amount_change   NUMERIC(18,2),
    time_extension_days INTEGER,
    reason          TEXT,
    vo_percentage   NUMERIC(6,3),  -- variation order as % of original contract
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Projects ───────────────────────────────────────────────────────────────

CREATE TABLE projects (
    project_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id         UUID REFERENCES procurement_cases(case_id),
    name            TEXT NOT NULL,
    description     TEXT,
    status          TEXT,
    start_date      DATE,
    end_date        DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_locations (
    location_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES projects(project_id),
    psgc_code       TEXT,
    region          TEXT,
    province        TEXT,
    city_municipality TEXT,
    barangay        TEXT,
    latitude        NUMERIC(10,7),
    longitude       NUMERIC(10,7),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Audit Findings ─────────────────────────────────────────────────────────

CREATE TABLE audit_findings (
    finding_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id       UUID REFERENCES agencies(agency_id),
    document_id     UUID REFERENCES documents(document_id),
    case_id         UUID REFERENCES procurement_cases(case_id),
    fiscal_year     INTEGER,
    finding_type    TEXT,     -- disallowance, observation, notice_of_suspension, etc.
    finding_code    TEXT,
    description     TEXT NOT NULL,
    amount          NUMERIC(18,2),
    status          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_findings_agency ON audit_findings(agency_id, fiscal_year);
CREATE INDEX idx_audit_findings_fts ON audit_findings USING gin (to_tsvector('english', description));

-- ─── Budgets ────────────────────────────────────────────────────────────────

CREATE TABLE budgets (
    budget_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id       UUID REFERENCES agencies(agency_id),
    document_id     UUID REFERENCES documents(document_id),
    fiscal_year     INTEGER NOT NULL,
    appropriation   NUMERIC(18,2),
    allotment       NUMERIC(18,2),
    obligation      NUMERIC(18,2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Risk & Discrepancies ───────────────────────────────────────────────────

CREATE TABLE discrepancies (
    discrepancy_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id             UUID NOT NULL REFERENCES procurement_cases(case_id),
    discrepancy_type    TEXT NOT NULL,  -- planning_mismatch, single_bidder, threshold_split, etc.
    severity            TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
    explanation         TEXT NOT NULL,  -- human-readable, never accusatory
    source_document_ids UUID[],
    source_fields       JSONB,          -- which fields were compared
    rule_id             TEXT NOT NULL,
    rule_version        TEXT NOT NULL,
    why_fired           TEXT NOT NULL,
    thresholds_applied  JSONB,
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    review_status       TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','confirmed','false_positive','needs_evidence','publishable_lead','published')),
    analyst_outcome     TEXT,
    analyst_id          UUID,
    reviewed_at         TIMESTAMPTZ
);

CREATE INDEX idx_discrepancies_case ON discrepancies(case_id);
CREATE INDEX idx_discrepancies_type ON discrepancies(discrepancy_type);
CREATE INDEX idx_discrepancies_status ON discrepancies(review_status);
CREATE INDEX idx_discrepancies_severity ON discrepancies(severity, generated_at DESC);

CREATE TABLE risk_signals (
    signal_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id         UUID NOT NULL REFERENCES procurement_cases(case_id),
    signal_name     TEXT NOT NULL,
    component_score NUMERIC(4,3),   -- 0-1 contribution to risk_score
    fired_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    evidence        JSONB
);

-- ─── Evidence Links (Provenance) ────────────────────────────────────────────

CREATE TABLE evidence_links (
    link_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type     TEXT NOT NULL,  -- discrepancy, risk_signal, line_item, award, etc.
    entity_id       UUID NOT NULL,
    document_id     UUID NOT NULL REFERENCES documents(document_id),
    source_url      TEXT NOT NULL,
    fetch_timestamp TIMESTAMPTZ NOT NULL,
    sha256_hash     TEXT NOT NULL,
    page_number     INTEGER,
    char_start      INTEGER,
    char_end        INTEGER,
    extraction_confidence NUMERIC(4,3),
    parser_version  TEXT,
    rule_version    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_entity ON evidence_links(entity_type, entity_id);

-- ─── Human Review & Annotations ────────────────────────────────────────────

CREATE TABLE analyst_reviews (
    review_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discrepancy_id  UUID REFERENCES discrepancies(discrepancy_id),
    case_id         UUID REFERENCES procurement_cases(case_id),
    analyst_id      UUID NOT NULL,
    action          TEXT NOT NULL CHECK (action IN ('verified','corrected','false_positive','needs_evidence','publishable_lead','published','takedown')),
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutable audit log
CREATE TABLE audit_log (
    log_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id        UUID,
    actor_type      TEXT,   -- analyst, editor, system
    action          TEXT NOT NULL,
    entity_type     TEXT,
    entity_id       UUID,
    old_value       JSONB,
    new_value       JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE annotations (
    annotation_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type     TEXT NOT NULL,
    entity_id       UUID NOT NULL,
    analyst_id      UUID NOT NULL,
    annotation_type TEXT NOT NULL,  -- tag, note, correction, flag
    content         TEXT,
    tags            TEXT[],
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_submissions (
    submission_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submitter_email TEXT,
    submission_type TEXT NOT NULL CHECK (submission_type IN ('foi_response','tip','correction','takedown_request')),
    document_id     UUID REFERENCES documents(document_id),
    linked_case_id  UUID REFERENCES procurement_cases(case_id),
    notes           TEXT,
    status          TEXT DEFAULT 'pending',
    storage_path    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Seed: Primary Philippine Government Sources ─────────────────────────────

INSERT INTO publishers (name, slug, publisher_type, website) VALUES
  ('Philippine Government Electronic Procurement System', 'philgeps', 'national_agency', 'https://www.philgeps.gov.ph'),
  ('Commission on Audit', 'coa', 'oversight', 'https://www.coa.gov.ph'),
  ('Department of Budget and Management', 'dbm', 'national_agency', 'https://www.dbm.gov.ph'),
  ('Government Procurement Policy Board', 'gppb', 'national_agency', 'https://www.gppb.gov.ph'),
  ('Department of the Interior and Local Government', 'dilg', 'national_agency', 'https://www.dilg.gov.ph');

INSERT INTO sources (publisher_id, source_type, publisher_name, base_url, parser_type, crawl_frequency, robots_compliant) VALUES
  ((SELECT publisher_id FROM publishers WHERE slug='philgeps'), 'portal', 'PhilGEPS Public Notices', 'https://notices.philgeps.gov.ph', 'philgeps_notice_parser', '6 hours', TRUE),
  ((SELECT publisher_id FROM publishers WHERE slug='philgeps'), 'portal', 'PhilGEPS Award Notices', 'https://www.philgeps.gov.ph/GEPSNONPILOT/Tender/SplashOpenAwardNoticesNonPhilGEPS.aspx', 'philgeps_award_parser', '6 hours', TRUE),
  ((SELECT publisher_id FROM publishers WHERE slug='coa'), 'pdf_repo', 'COA Annual Audit Reports', 'https://www.coa.gov.ph/reports-and-publications/annual-audit-report/', 'coa_audit_report_parser', '7 days', TRUE),
  ((SELECT publisher_id FROM publishers WHERE slug='dbm'), 'pdf_repo', 'DBM Annual Procurement Plans', 'https://www.dbm.gov.ph/index.php/procurement/annual-procurement-plan', 'dbm_app_parser', '7 days', TRUE),
  ((SELECT publisher_id FROM publishers WHERE slug='gppb'), 'html_listing', 'GPPB Forms and Templates', 'https://www.gppb.gov.ph/laws.php', 'gppb_forms_parser', '30 days', TRUE);
