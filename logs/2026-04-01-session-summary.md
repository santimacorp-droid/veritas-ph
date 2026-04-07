# Veritas — Development Log: 2026-04-01

**Date:** April 1, 2026
**Session time:** ~14:50–15:43 PHT
**Status:** ✅ All core systems operational

---

## Services Running

| Service            | URL                              | Status |
|--------------------|----------------------------------|--------|
| Public Portal      | http://localhost:3000            | ✅ running |
| Analyst Console    | http://localhost:3001            | ✅ running |
| FastAPI            | http://localhost:8000/api/docs   | ✅ running |
| PostgreSQL         | localhost:5433                   | ✅ running (Docker) |
| MinIO              | http://localhost:9000            | ✅ running (Docker) |
| MinIO Console      | http://localhost:9001            | ✅ running (Docker) |

---

## What Was Built This Session

### 1. Backend — Live PostgreSQL Queries
- `apps/api/queries.py` — Full SQL query layer
  - `search_cases()` — FTS with `ts_rank` + `plainto_tsquery`
  - `search_suppliers()` — `pg_trgm` trigram fuzzy search
  - `get_case_detail()`, `get_case_timeline()`, `get_case_discrepancies()`
  - `get_agency_profile()`, `get_supplier_profile()`
  - `list_agencies()`, `get_agency_cases()`
  - `get_case_full_export()` — joins all tables for JSON/CSV dossier
- All stub `raise HTTPException(404)` endpoints replaced with real DB queries

### 2. Backend — API Endpoints
- `GET /agencies` — Agency list with aggregated stats
- `GET /agencies/{id}` — Agency profile
- `GET /agencies/{id}/cases` — Cases by agency, sorted by risk
- `GET /suppliers/{id}` — Supplier profile
- `GET /documents/{id}` — Document record + presigned MinIO URL
- `GET /documents/{id}/download` — Proxy-stream from MinIO
- `GET /exports/case/{id}.json` — Full dossier (case + timeline + discrepancies + awards)
- `GET /exports/case/{id}.csv` — Multi-section flat CSV
- `POST /analyst/cases/{id}/review` — Now writes to DB (`UPDATE discrepancies SET review_status`)

### 3. Frontend — Public Portal (`apps/web-public`)

#### Components
- `DiscrepancyCard` — Severity badge, meta grid, evidence rows, disclaimer bar
- `ProcurementTimeline` — 6-stage lifecycle: present / flagged (⚠) / missing (dashed); completeness bar + pills

#### Pages
- `/` — Homepage with demo DiscrepancyCards
- `/search` — Live debounced search (cases + suppliers), date filters, risk pip badges
- `/cases/[id]` — Full case detail: score panel, embedded timeline, discrepancy list, export buttons
- `/agencies` — Agency table with risk bars, flagged case counts, discrepancy counts
- `/agencies/[id]` — Agency detail: 5-metric stats panel + case table

### 4. Analyst Console (`apps/web-analyst`) — Port 3001
- Full dark mode design system (4-level surface palette)
- Sidebar shell layout with nav tabs + session counter
- Review Queue — collapsible case blocks, per-discrepancy rows with:
  - Severity accent bars, explanation text, "why fired" metadata
  - Analyst note textarea
  - 4 action buttons: ✓ Confirm · ✗ False Positive · ? Needs Evidence · ★ Publishable Lead
  - Each button calls `POST /analyst/cases/{id}/review` → writes to DB

### 5. Database Seeded
```
Publishers:     3  (DPWH, DOH, DepEd)
Agencies:       6
Suppliers:      6
Cases:          3  (risk scores: 0.73, 0.61, 0.29)
Discrepancies:  3  (all confirmed)
```

### 6. Crawler Worker (`workers/crawler/`)
- `philgeps_crawler.py` — Crawls PhilGEPS notice + award listing pages (rate-limited, robots.txt compliant)
- `db_writer.py` — Persists documents → upserts cases/events/agencies from parsed fields; uploads to MinIO
- `storage.py` — MinIO client (upload, presign URL, proxy get, stat)
- `run_crawler.py` — CLI entrypoint: `--mode notices|awards|both --pages N --dry-run`

### 7. API Storage Layer (`apps/api/storage.py`)
- `APIDocumentStore` — presign_url, get_bytes, stat (used by document endpoints)

---

## Pending Actions

| # | Action | Command |
|---|--------|---------|
| 1 | Install `minio` Python SDK | `.\.venv\Scripts\pip.exe install minio` |
| 2 | Test dry-run crawl | `python workers/crawler/run_crawler.py --mode notices --pages 2 --dry-run` |
| 3 | Run live crawl (when ready) | `python workers/crawler/run_crawler.py --mode both --pages 10` |
| 4 | Verify MinIO upload flow | Check http://localhost:9001 after a crawl run |

---

## Architecture Overview

```
philgeps.gov.ph
      │
      ▼
PhilGEPSCrawler (rate-limited, robots-compliant)
      │ raw bytes + SHA-256
      ▼
PhilGEPSNoticeParser → structured fields
      │
      ▼
CrawlerDBWriter ──→ MinIO (storage_path)
      │               (bid_notice/2024/03/{doc_id}.html)
      ▼
PostgreSQL ──→ FastAPI (port 8000)
                  │
          ┌───────┴───────┐
          ▼               ▼
   web-public (3000)  web-analyst (3001)
   Search · Cases     Review Queue
   Agencies · Timeline Dark mode UI
```

---

## Key Commands Reference

```powershell
# Start API
C:\Users\santi\Desktop\gov\.venv\Scripts\uvicorn.exe main:app --reload
# (run from apps/api)

# Start public portal
npm run dev
# (run from apps/web-public)

# Start analyst console
npm run dev -- --port 3001
# (run from apps/web-analyst)

# Re-seed database
.\.venv\Scripts\python.exe scripts/seed_db.py

# Crawl PhilGEPS (dry run)
.\.venv\Scripts\python.exe workers/crawler/run_crawler.py --mode notices --pages 2 --dry-run
```
