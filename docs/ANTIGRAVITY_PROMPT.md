# Veritas — Philippines Procurement Transparency Platform
## Implementation Prompt for Antigravity

---

## Context

You are implementing **Veritas**, an open-source, evidence-first procurement transparency platform for the Philippines. Its mission is to collect, normalize, and cross-link public Philippine government procurement, budget, audit, and project documents — then surface explainable risk indicators for journalists, civil society groups, watchdogs, and citizens.

**Critical principles:**
- The system NEVER accuses anyone of crimes automatically.
- Every flag must be explainable and traceable to source documents.
- Only public or lawfully obtained documents are collected.
- Human review is required before publishing named allegations.
- All source evidence must be preserved with immutable hashing.

---

## Repository Structure

Implement the following monorepo layout:

```
veritas/
├── apps/
│   ├── web-public/          # Next.js public transparency portal
│   ├── web-analyst/         # Next.js analyst console
│   └── api/                 # FastAPI backend
├── workers/
│   ├── crawler/             # Document discovery & fetching
│   ├── extractor/           # PDF/HTML text & structure extraction
│   ├── linker/              # Entity resolution & timeline builder
│   └── risk-engine/         # Discrepancy rules & risk scoring
├── packages/
│   ├── common-schema/       # Shared Pydantic/TypeScript types
│   └── parser-utils/        # Shared parsing helpers
├── infra/
│   ├── docker/              # docker-compose files
│   └── terraform/           # Cloud infra (optional)
└── docs/
    ├── architecture/
    ├── data-dictionary/
    ├── legal-and-ethics/
    ├── source-registry/
    ├── rulebook/
    └── contribution-guide/
```

---

## Tech Stack

### Backend (Python)
- **FastAPI** — REST API
- **PostgreSQL** — Primary database with pgvector extension
- **Redis** — Task queues and caching
- **Celery** — Async job processing
- **MinIO** — S3-compatible object storage for raw documents
- **SQLAlchemy + Alembic** — ORM and migrations

### Data & Extraction (Python)
- **Playwright** — Browser automation for JS-rendered pages
- **httpx + BeautifulSoup** — HTML crawling
- **pdfplumber / pymupdf** — PDF text extraction
- **OCRmyPDF + Tesseract** — OCR fallback for scanned documents
- **Camelot / pdfplumber** — Table extraction from PDFs
- **spaCy** — Named entity recognition
- **Anthropic Claude API** — LLM extraction assist (with strict schemas, confidence labels, never final arbiter)

### Frontend (TypeScript)
- **Next.js 14 (App Router)** — Both portals
- **TailwindCSS** — Styling
- **Recharts / ECharts** — Explainable charts
- **Leaflet** — Project maps
- **TanStack Query** — Data fetching

### Infrastructure
- **Docker Compose** — Local development
- **GitHub Actions** — CI/CD
- **PostgreSQL 15+** with `pgvector` and `pg_trgm` extensions

---

## Database Schema

Implement ALL of the following tables with proper indexes and foreign keys:

```sql
-- Core registry
CREATE TABLE publishers (...);
CREATE TABLE agencies (...);
CREATE TABLE sources (...);
CREATE TABLE crawls (...);

-- Documents
CREATE TABLE documents (...);
CREATE TABLE document_versions (...);
CREATE TABLE document_pages (...);
CREATE TABLE extractions (...);

-- Procurement lifecycle
CREATE TABLE procurement_cases (...);
CREATE TABLE procurement_events (...);
CREATE TABLE line_items (...);
CREATE TABLE app_items (...);

-- Suppliers
CREATE TABLE suppliers (...);
CREATE TABLE supplier_aliases (...);

-- Awards & contracts
CREATE TABLE awards (...);
CREATE TABLE contracts (...);
CREATE TABLE contract_amendments (...);

-- Projects
CREATE TABLE projects (...);
CREATE TABLE project_locations (...);

-- Oversight
CREATE TABLE audit_findings (...);
CREATE TABLE budgets (...);

-- Risk engine
CREATE TABLE discrepancies (...);
CREATE TABLE risk_signals (...);

-- Human workflow
CREATE TABLE analyst_reviews (...);
CREATE TABLE annotations (...);
CREATE TABLE evidence_links (...);
CREATE TABLE user_submissions (...);
```

The `procurement_cases` table must include:
- `case_id`, `publisher_id`, `procurement_ref_no`, `title`
- `procurement_method`, `category`, `agency_id`, `geographic_scope`
- `planned_amount`, `awarded_amount`, `final_contract_amount`
- `award_date`, `ntp_date`, `contract_end_date`, `status`
- `completeness_score`, `risk_score`, `confidence_score`

The `discrepancies` table must include:
- `discrepancy_id`, `case_id`, `discrepancy_type`, `severity`
- `explanation` (human-readable, never accusatory)
- `source_document_ids[]`, `source_fields` (JSONB)
- `rule_version`, `generated_at`, `review_status`, `analyst_outcome`

---

## System Layers to Implement

### Layer 1: Source Registry
A configurable registry storing all monitored sources with fields:
`source_id`, `source_type`, `publisher_name`, `agency_type`, `geography_codes`, `base_url`, `robots_compliant`, `crawl_frequency`, `parser_type`, `auth_required` (must always be false for auto-collection), `reliability_score`, `last_success`, `last_failure`

### Layer 2: Crawler Service (`workers/crawler/`)
- Discovers and fetches public pages/documents
- Handles: HTML pages, PhilGEPS portal listings, PDF repositories, RSS feeds, manual uploads
- Responsibilities: URL discovery, content fetch, MIME detection, metadata capture, file storage, SHA-256 content hashing, change detection, retry queues with exponential backoff
- Must respect `robots.txt` and implement polite rate limiting

### Layer 3: Raw Document Store
- MinIO/S3-compatible storage with immutable versioning
- Store: original files, HTML snapshots, OCR outputs, extracted text, thumbnails
- Generate and store SHA-256 checksum manifests for every document

### Layer 4: Extractor Service (`workers/extractor/`)
- PDF text extraction with pdfplumber (primary) and pymupdf (fallback)
- OCR fallback using OCRmyPDF + Tesseract for scanned pages
- Layout-aware table parsing with Camelot
- Section detection and form/template recognition
- Language normalization for English/Filipino mixed text
- NER and field extraction with confidence scores
- Optional LLM extraction layer using Claude API with strict JSON schemas

### Layer 5: Linker Service (`workers/linker/`)
Entity resolution for: agencies, BAC units, procurements, line items, suppliers, awards, contracts, projects, locations, audit findings, budgets

Resolution features:
- Supplier name canonicalization (fuzzy matching + embeddings via pgvector)
- Agency name mapping table
- Contract/procurement number matching
- Amount normalization to PHP decimal
- Duplicate document clustering

### Layer 6: Contract Timeline Builder
Build a canonical timeline per procurement:
`planning → tender → award → contract → implementation → audit`

Surface missing stages explicitly. Store `completeness_score` (0–1) per case.

### Layer 7: Risk Engine (`workers/risk-engine/`)

Implement ALL rule families:

**1. Planning Mismatch**
- APP item missing corresponding tender
- Tender not in APP
- APP vs award amount diverges by >20%

**2. Competition Anomalies**
- Single-bidder awards
- Repeated winner concentration (HHI index)
- Posting windows shorter than statutory minimums (per RA 9184)
- Clustered bids by same vendors across agencies

**3. Pricing Anomalies**
- Item price >2 standard deviations above category benchmark
- Same item at divergent prices across agencies/periods
- Variation orders exceeding 10% of contract value (per GPPB rules)

**4. Contract Fragmentation (Threshold Splitting)**
- Multiple awards to same supplier near PhP 1M / PhP 500K / PhP 50K thresholds
- Same item split across BAC references within 30-day windows

**5. Timeline Inconsistencies**
- Award date before bid deadline
- NTP date before NOA date
- Steps compressed beyond statutory minimums

**6. Geographic/Supplier Patterns**
- Vendor wins outside registered address province with no visible competition
- Same address/contact across multiple nominally distinct suppliers

**7. Audit Linkage**
- COA finding references same agency/project/category
- Recurring observation type across years
- Adverse findings with continued awards in same category

**8. Completeness Gaps**
- Notice exists but no award document
- Contract exists but no completion record
- Project monitoring page inconsistent with procurement documents

Every signal MUST expose: `why_fired`, `documents_used[]`, `fields_compared`, `thresholds_applied`, `rule_version`.

Use TWO scores per case, never one:
- `confidence_score`: reliability of extracted data linkage (0–1)
- `risk_score`: unusualness of the pattern (0–1), decomposable into named components

### Layer 8: Public & Analyst APIs (`apps/api/`)

**Public endpoints:**
```
GET /search?q=&type=&agency=&date_from=&date_to=
GET /cases/{id}
GET /agencies/{id}
GET /suppliers/{id}
GET /documents/{id}
GET /discrepancies/{id}
GET /exports/case/{id}.json
GET /exports/case/{id}.csv
GET /bulk/ocds/releases
```

**Analyst endpoints (authenticated):**
```
POST /analyst/corrections
POST /analyst/verify/{extraction_id}
POST /analyst/entity-link
POST /analyst/tags
POST /analyst/notes
POST /analyst/publish/{case_id}
```

All responses must include provenance fields: `source_url`, `fetch_timestamp`, `document_hash`, `page_ref`, `extraction_confidence`, `parser_version`, `rule_version`.

### Layer 9: Frontend Apps

**Public Portal (`apps/web-public/`)**
Pages to implement:
- `/` — Homepage with search and summary dashboard
- `/search` — Full-text search across documents and cases
- `/cases/[id]` — Procurement case page with timeline, discrepancy cards, evidence bundle download
- `/agencies/[id]` — Agency profile: volume trend, top suppliers, concentration metrics, flagged cases
- `/suppliers/[id]` — Supplier profile: award history, agencies, geographies, aliases
- `/map` — Project location map (Leaflet)
- `/methodology` — Explainer of scoring methodology
- `/about` — Mission and legal notice

**Analyst Console (`apps/web-analyst/`)**
Pages to implement:
- `/dashboard` — Ingestion health, crawl success rates, extraction QA queue
- `/queue/extraction` — Extraction QA review
- `/queue/entities` — Unresolved entity matches
- `/queue/flags` — Flagged case triage
- `/cases/[id]/review` — Full case review with verify/correct/publish workflow
- `/sources` — Source registry management
- `/rules` — Rules management and threshold tuning
- `/upload` — FOI response and partner document upload

---

## Ingestion Flow (implement as Celery task chain)

```
discover_sources()
  → fetch_listing_pages()
    → download_documents()
      → hash_and_deduplicate()
        → extract_text()
          → parse_structured_fields()
            → map_to_canonical_schema()
              → link_to_procurement_cases()
                → run_discrepancy_rules()
                  → queue_human_review()  # for low-confidence or high-risk flags
                    → publish_approved_outputs()
```

---

## Provenance Requirements (CRITICAL)

Every claim in the UI must link back to:
- Original source URL
- Fetch timestamp (UTC ISO 8601)
- SHA-256 document hash
- Page number or character span
- Extraction confidence (0–1)
- Parser version (semver)
- Rule version (semver)

Store this in `evidence_links` table with immutable records.

---

## Primary Data Sources to Implement Parsers For

1. **PhilGEPS** — `philgeps.gov.ph` public notices, award notices, and open data pages
2. **GPPB** — `gppb.gov.ph` procurement law, IRR, and forms
3. **COA** — `coa.gov.ph` annual audit reports and annual financial reports
4. **DBM** — `dbm.gov.ph` budget publications and APP forms
5. **Agency transparency pages** — configurable per-source HTML parsers
6. **DILG/LGU monitoring** — `lgpms.dilg.gov.ph` project monitoring pages

Each parser must output a validated JSON document conforming to the `common-schema` package types.

---

## Open Contracting Data Standard (OCDS) Export

Map internal data to OCDS release schema for the `/bulk/ocds/releases` endpoint. This enables interoperability with partner organizations and international transparency tools.

Required OCDS fields: `ocid`, `date`, `tag`, `initiationType`, `parties[]`, `buyer`, `tender`, `awards[]`, `contracts[]`.

---

## Human Review Workflow

Implement a five-step workflow:
1. Machine generates flag → stored in `discrepancies` with `review_status = 'pending'`
2. Analyst sees signal + all source evidence in review queue
3. Analyst validates entity matching
4. Analyst marks outcome: `confirmed` | `false_positive` | `needs_evidence` | `publishable_lead`
5. Publication requires editor approval → `review_status = 'published'`
6. Public page renders methodology, evidentiary basis, and disclaimer

**NEVER publish named allegations without analyst + editor approval.**

---

## Quality Metrics to Track

Implement a metrics collection system tracking:
- Source freshness (hours since last successful crawl)
- Crawl success rate (%) per source
- Extraction accuracy by field type
- Entity-link precision/recall (sample-based)
- False-positive rate by rule family
- Analyst confirmation rate (confirmed / total reviewed)
- Average ingest lag (document_published → ingested)
- Case timeline completeness (% with all 6 stages present)

---

## Security & Ethics Controls

1. Only collect documents from sources with `auth_required = false`
2. Implement `robots.txt` compliance checker per source
3. Rate limiting: max 1 request/second per source domain
4. Maintain takedown/correction workflow (public form → analyst queue)
5. PII redaction pass using spaCy + Presidio before publishing extracted text
6. Separate raw evidence (internal only) from public narrative conclusions
7. Immutable audit log for all analyst edits and publication actions
8. GDPR/privacy-aware: only retain personal names where they appear in official procurement roles

---

## MVP Milestones

### Milestone 1 (Weeks 1–3): Foundation
- [ ] Monorepo scaffold with all packages
- [ ] PostgreSQL schema with all tables and migrations
- [ ] MinIO document store integration
- [ ] Source registry API and seed data (PhilGEPS, COA, DBM)
- [ ] Basic HTML + PDF crawler for PhilGEPS
- [ ] Document storage with SHA-256 hashing

### Milestone 2 (Weeks 4–6): Extraction
- [ ] PDF text extraction pipeline (pdfplumber + OCR fallback)
- [ ] PhilGEPS notice parser → canonical schema
- [ ] COA audit report parser
- [ ] APP form parser (DBM template)
- [ ] Entity resolution: suppliers and agencies
- [ ] Contract timeline builder

### Milestone 3 (Weeks 7–9): Risk Engine + Search
- [ ] First 5 discrepancy rule families implemented
- [ ] Dual scoring (confidence + risk) with decomposed components
- [ ] PostgreSQL full-text search API
- [ ] Public case page with timeline and discrepancy cards
- [ ] Analyst review queue
- [ ] CSV/JSON export

### Milestone 4 (Weeks 10–12): Dashboards + Publication
- [ ] Supplier and agency profile pages
- [ ] Project map (Leaflet)
- [ ] FOI document upload flow
- [ ] Publication workflow with editor approval gate
- [ ] OCDS bulk export
- [ ] Methodology and legal pages

---

## Notes for Implementation

- **Never black-box score**: every risk signal must be fully decomposable in the UI.
- **LLMs are extraction assistants only**: Claude API may help parse messy PDFs into structured fields, but never determines whether something is corrupt.
- **Filipino mixed-language text**: parsers must handle Tagalog-English mixed procurement documents; include language detection and normalization.
- **Amount formats**: Philippine procurement documents use varied number formats (1,000,000.00 / 1M / PhP 1M / P1,000,000). Normalize all to PHP decimal via a dedicated parser utility.
- **Date formats**: Multiple date formats appear (Jan 15, 2024 / 15-Jan-2024 / 01/15/2024). Normalize all to ISO 8601 UTC.
- **Procurement thresholds** follow RA 9184 and its current IRR — hardcode these as versioned constants in `common-schema` so rule thresholds can be updated as law changes.
- **Explainability first**: the UI should show "This case has 3 risk signals" with each signal linking directly to the source pages that triggered it.

---

## Deliverables

1. Full monorepo with all service scaffolds
2. Database migrations (Alembic)
3. Docker Compose dev environment
4. Working PhilGEPS crawler + parser
5. Working extraction pipeline for PDFs
6. At least 3 discrepancy rules implemented end-to-end
7. Public portal with search + case page
8. Analyst console with review queue
9. API documentation (auto-generated via FastAPI)
10. `docs/` directory with architecture, data dictionary, rulebook, and legal/ethics guide

---

*Project name: Veritas. Named for truth — because the goal is evidence, not accusation.*
