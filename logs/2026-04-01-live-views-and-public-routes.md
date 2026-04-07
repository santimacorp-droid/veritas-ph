# Development Log: 2026-04-01 - Live Views and Public Routes

**Date:** April 1, 2026  
**Time:** ~17:35 PHT

## What Was Finished

### Backend API
- Added `GET /stats/summary`
- Added `GET /cases`
- Added `GET /suppliers`
- Implemented `GET /suppliers/{supplier_id}/awards`
- Added `GET /discrepancies`
- Added `GET /analyst/cases?status=queue|confirmed|published`
- Updated analyst review submission to:
  - update discrepancy review status
  - insert a row into `analyst_reviews`
  - insert an `audit_log` entry
- Normalized discrepancy payloads so `why_fired` is returned as structured JSON instead of a raw string
- Fixed case detail query to include `agency_id`

### Public Portal
- Homepage now loads live summary stats and recent reviewed discrepancies from the API
- Added `/cases` page
- Added `/suppliers` page
- Added `/suppliers/[id]` page
- Added `/about` page
- Added `/methodology` page
- Public nav links now resolve to real routes instead of placeholders

### Analyst Console
- Replaced demo queue data with live API-backed data
- Tabs now load:
  - pending / needs-evidence queue
  - confirmed findings
  - publishable / published leads
- Review actions now submit live notes + outcomes to the backend

## Verification
- `npm.cmd --workspace=apps/web-public run lint` -> passed
- `npm.cmd --workspace=apps/web-public run build` -> passed
- `npm.cmd --workspace=apps/web-analyst run lint` -> passed
- `npm.cmd --workspace=apps/web-analyst run build` -> passed
- `python -m compileall apps/api` -> passed
- API import check (`main`, `queries`) -> passed

## Current Remaining Priorities

### 1. Crawler End-to-End Validation
- Dry-run and live-run the crawler against PhilGEPS
- Confirm MinIO object storage writes and new database ingestion

### 2. Public Detail Depth
- Add richer supplier detail context such as aliases, related agencies, and linked case history summaries
- Implement a published discrepancy detail route if direct discrepancy pages are needed

### 3. Automated Repo-Level Checks
- Add a single root validation command to run lint/build/import checks consistently
- Add API smoke tests for the new live routes
