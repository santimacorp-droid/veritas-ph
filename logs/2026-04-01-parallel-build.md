# Development Log: 2026-04-01 - API Queries + React Components

**Date:** April 1, 2026  
**Time:** ~15:01 PHT

## What We Finished

### Backend: Live DB Queries
- **Created `apps/api/queries.py`** — A dedicated SQL query layer with real PostgreSQL queries:
  - `search_cases()` — Full-text search using `ts_rank` and `plainto_tsquery`
  - `search_suppliers()` — Trigram fuzzy search using `pg_trgm` similarity
  - `get_case_detail()` — Full case with agency and publisher join
  - `get_case_timeline()` — Ordered procurement lifecycle events with document provenance
  - `get_case_discrepancies()` — Severity-sorted discrepancies (analyst/public modes)
  - `get_evidence_for_discrepancy()` — Full provenance chain per discrepancy
  - `get_agency_profile()` — Aggregated stats with award totals
  - `get_supplier_profile()` — Award history summary
- **Updated `apps/api/main.py`** — Wired all stub endpoints to real DB calls:
  - `GET /search` — Now hits PostgreSQL FTS
  - `GET /cases/{case_id}` — Real case lookup
  - `GET /cases/{case_id}/timeline` — Real timeline
  - `GET /cases/{case_id}/discrepancies` — Real discrepancies (public only)
  - `GET /agencies/{agency_id}` — Real agency profile

### Frontend: DiscrepancyCard Component
- **Created `DiscrepancyCard.tsx`** — Full React component matching the spec kit HTML exactly, including severity badges, meta grid, evidence rows with truncated hashes, disclaimer bar, and analyst action buttons.
- **Created `DiscrepancyCard.module.css`** — Scoped CSS module using all design tokens.
- **Updated `page.tsx`** — Homepage now shows demo discrepancy cards with real data shape (using static demo data until DB is seeded).
- **Created `page.module.css`** — Layout for header, stats bar, and discrepancy list.
- **Updated `globals.css`** — Complete Google Fonts import + all design tokens consolidated directly (no dependency on spec-kit package import path resolution).

## What Went Wrong
- N/A — both implementations completed cleanly in parallel.

## Next Steps
- Seed the database with PhilGEPS sample data to show real results in the `/search` endpoint.
- Build the `ProcurementTimeline` React component.
- Implement the supplier detail page.
