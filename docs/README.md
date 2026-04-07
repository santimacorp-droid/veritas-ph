# Veritas — Philippines Procurement Transparency Platform

> *"Evidence before narrative. Every flag is explainable. Every claim is traceable."*

Veritas is an open-source, evidence-first platform that collects, normalizes, and cross-links public Philippine government procurement, budget, audit, and project documents — to detect discrepancies, surface risk indicators, and support investigative journalists, civil society groups, watchdogs, and citizens.

**Veritas does not accuse. It surfaces anomalies and lets humans decide.**

---

## Quick Start (Development)

```bash
# 1. Clone and enter
git clone https://github.com/veritas-ph/veritas.git
cd veritas

# 2. Set environment variables
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY if using LLM extraction assist

# 3. Start all services
docker compose -f infra/docker/docker-compose.yml up -d

# 4. Run database migrations
docker compose exec api alembic upgrade head

# 5. Seed source registry (PhilGEPS, COA, DBM, GPPB)
# Already seeded via init.sql

# 6. Start crawling PhilGEPS
docker compose exec crawler python -c "
from tasks import crawl_philgeps_notices
crawl_philgeps_notices.delay()
"
```

**Services:**
| Service | URL |
|---------|-----|
| Public Portal | http://localhost:3000 |
| Analyst Console | http://localhost:3001 |
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/api/docs |
| MinIO Console | http://localhost:9001 |
| Flower (Celery) | http://localhost:5555 |

---

## Architecture

```
PhilGEPS / COA / DBM / Agency Pages
           │
     [Layer 2: Crawler]
     Playwright + httpx
     robots.txt compliant
     1 req/sec rate limit
           │
     [Layer 3: Document Store]
     MinIO + SHA-256 hashing
     Immutable versioning
           │
     [Layer 4: Extractor]
     pdfplumber + OCR + Camelot
     Optional: Claude API assist
           │
     [Layer 5: Linker]
     Entity resolution + dedup
     Supplier canonicalization
           │
     [Layer 6: Timeline Builder]
     planning→tender→award→contract→audit
           │
     [Layer 7: Risk Engine]
     11 explainable rule families
     Dual scoring: confidence + risk
           │
     [Layer 8: API]          [Layer 9: Frontends]
     FastAPI                 Public Portal (Next.js)
     PostgreSQL FTS          Analyst Console (Next.js)
     OCDS export
```

---

## Risk Rules

Veritas implements 11 explainable rule families under RA 9184:

| Rule | Type | Severity |
|------|------|----------|
| APP item has no matching tender | Planning Mismatch | Medium |
| APP vs award amount >20% diff | Planning Mismatch | Medium–High |
| Single bidder in public bidding | Competition | Medium |
| Posting window below statutory minimum | Competition | Medium–High |
| Item price >2 std dev above benchmark | Pricing | Medium–High |
| Variation orders exceed 10% of contract | Pricing | Medium–High |
| 3+ near-threshold awards to same supplier in 30 days | Threshold Splitting | Medium–High |
| Award date before bid deadline | Timeline | **Critical** |
| NTP date before award date | Timeline | **Critical** |
| Award in COA-flagged category without resolution | Audit Echo | Medium–High |
| 2+ required timeline stages missing | Completeness | Low–Medium |

Every signal exposes: `why_fired`, `documents_used`, `fields_compared`, `thresholds_applied`, `rule_version`.

---

## Data Sources

| Source | Type | Parser |
|--------|------|--------|
| PhilGEPS Public Notices | Portal | `philgeps_notice_parser` |
| PhilGEPS Award Notices | Portal | `philgeps_award_parser` |
| COA Annual Audit Reports | PDF Repo | `coa_audit_report_parser` |
| DBM Annual Procurement Plans | PDF Repo | `dbm_app_parser` |
| GPPB Forms & Templates | HTML | `gppb_forms_parser` |

---

## Repository Layout

```
veritas/
├── apps/
│   ├── web-public/         # Next.js public transparency portal
│   ├── web-analyst/        # Next.js analyst console
│   └── api/                # FastAPI backend + Alembic migrations
├── workers/
│   ├── crawler/            # PhilGEPS + agency page crawlers
│   ├── extractor/          # PDF/HTML extraction pipeline
│   ├── linker/             # Entity resolution + timeline builder
│   └── risk-engine/        # Discrepancy rules (rules.py)
├── packages/
│   ├── common-schema/      # Shared Pydantic models (veritas_schema.py)
│   └── parser-utils/       # Shared parsing helpers
├── infra/
│   ├── docker/             # docker-compose.yml + init.sql
│   └── terraform/          # Cloud infra
└── docs/
    ├── architecture/
    ├── data-dictionary/
    ├── legal-and-ethics/
    ├── rulebook/
    └── contribution-guide/
```

---

## Implementation Prompt

See [`ANTIGRAVITY_PROMPT.md`](./ANTIGRAVITY_PROMPT.md) for the full implementation specification used to build this system.

---

## Guiding Principles

1. **Evidence before narrative** — never auto-accuse
2. **Open-source and reproducible** — all code and rules are public
3. **Public documents only** — no hacking, no private data
4. **Explainable scoring** — every flag shows its math
5. **Human in the loop** — analysts verify before publication
6. **Immutable provenance** — every claim links to its source
7. **Responsible disclosure** — legal review before named allegations

---

## Legal Notice

Veritas collects only publicly available Philippine government documents. Risk signals are anomaly indicators and statistical patterns — not legal determinations or accusations of wrongdoing. All published conclusions require human analyst and editor review. Users are encouraged to consult the methodology pages before drawing conclusions from any risk indicator.

---

## Contributing

See [`docs/contribution-guide/`](./docs/contribution-guide/) for how to add new parsers, rules, or data sources.

## License

MIT License. See `LICENSE`.

---

*Named for truth — because the goal is evidence, not accusation.*
