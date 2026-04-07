# Development Log: 2026-04-01 - Crawler Reset and Reliability

**Date:** April 1, 2026  
**Time:** ~22:30 PHT

## What Was Finished

### Crawler Reliability
- Fixed PhilGEPS detail link resolution so notice pages no longer 404 after listing-page fetches
- Fixed timestamp handling for `documents.fetch_timestamp` so asyncpg receives real datetime values
- Fixed crawl session persistence so `sources` and `crawls` foreign keys are valid during live runs
- Fixed crawl finalization to use `crawls.errors` instead of the non-existent `error_summary` column
- Corrected crawler summary output:
  - `Documents saved` now reflects stored documents
  - removed the misleading `New cases upserted` wording

### Case Persistence
- Updated crawler case upsert behavior so existing `procurement_cases` rows are refreshed instead of left stale
- Fixed duplicate-document recovery path:
  - if a document already exists, the crawler can now still rebuild `procurement_cases` and `procurement_events`
  - this makes reruns and post-reset recovery reliable
- Added duplicate-event guard so reruns do not keep inserting the same procurement event for the same case/document pair

### API / Frontend Behavior
- Fixed local-dev CORS handling for `localhost` / `127.0.0.1`
- Fixed analyst queue SQL failures and restored the queue to discrepancy-backed cases only
- Updated `/cases` ordering to prioritize the latest ingested/updated case rows
- Added frontend visibility for case freshness on the public cases page
- Added discrepancy evidence plumbing in the API and analyst/public UIs

## Reset Performed

The local database was reset for case-facing data so the frontend no longer mixes seeded/demo case rows with scraped placeholders.

Tables cleared included:
- `documents`
- `procurement_cases`
- `procurement_events`
- `discrepancies`
- `awards`
- `contracts`
- related evidence / review / linkage tables tied to cases

After reset, live API state was verified as:
- `/stats/summary` -> `total_cases: 0`
- `/cases` -> empty
- `/discrepancies` -> empty

`agencies` were intentionally left in place.

## Important Findings

### 1. Crawl Logs Were Misleading
- Large crawl counts were document counts, not unique visible case counts
- Repeated PhilGEPS crawls were often updating the same small set of case refs rather than creating many new frontend-visible cases

### 2. Frontend Visibility Depends on Data Quality
- Scraped PhilGEPS notices were reaching the API
- But many rows were incomplete because the parser still extracts poor fields, especially:
  - title falls back to the reference number
  - agency is often parsed as `Contact Person:`
  - award amounts and dates are often missing

### 3. Discrepancy Source Links Need Better Provenance Data
- UI support for evidence links is now present
- Current seeded discrepancy rows still lack real `source_document_ids` / `evidence_links`
- The discrepancy generation step still needs to persist provenance if every discrepancy should link back to PhilGEPS or bidding source pages

## Verification
- `python -m compileall workers/crawler` -> passed
- API import check (`main`, `queries`) -> passed
- `npm.cmd --workspace=apps/web-public run lint` -> passed
- `npm.cmd --workspace=apps/web-public run build` -> passed
- `npm.cmd --workspace=apps/web-analyst run lint` -> passed
- `npm.cmd --workspace=apps/web-analyst run build` -> passed

## Next Recommended Work

### 1. Fix PhilGEPS Parsing
- Extract actual agency name, title, posting date, deadline date, and amounts from current notice page structure
- Stop producing `Contact Person:` placeholder cases

### 2. Audit Pagination Quality
- Verify page 2+ listing fetches produce genuinely new PhilGEPS refs instead of repeatedly cycling a small set of notices

### 3. Add Real Discrepancy Provenance
- When discrepancy/risk generation runs, persist `source_document_ids` or `evidence_links`
- This is required for every discrepancy card to link directly to the source PhilGEPS/bid notice evidence
