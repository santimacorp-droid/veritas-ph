# Veritas

Evidence-first procurement intelligence platform for the Philippines.

## System Components

- **Backend (FastAPI):** `apps/api` - Port 8000
- **Public Web (Next.js):** `apps/web-public` - Port 3000
- **Analyst Console (Next.js):** `apps/web-analyst` - Port 3001
- **Workers (Celery):** Process data lifecycle (Crawl, Extract, Risk, Link)

## Core Features

- **Evidence-First Ingestion:** Every data point is hashed and linked to a source document.
- **Visual Citations:** Extraction logic captures [x, y, w, h] coordinates to highlight evidence in PDFs.
- **Risk Engine:** Automated detection of Single Bidder patterns and Budget Splitting.
- **Semantic Search:** Supplier deduplication using `pgvector` embeddings.
- **RBAC Security:** Analyst console protected by JWT and Argon2 hashing.

## Getting Started

### 1. Prerequisites
- Docker & Docker Compose
- Node.js (for local frontend development)
- Python 3.11+ (for local backend development)

### 2. Installation
```bash
make install
```

### 3. Development
```bash
# Start all services (Database, Redis, MinIO, API, Worker, Frontends)
make dev

# Start worker separately (optional)
make worker
```

### 4. Default Accounts (Dev Environment)
- **Analyst:** `analyst@veritas.ph` / `password123`
- **Editor:** `editor@veritas.ph` / `password123`
- **Admin:** `admin@veritas.ph` / `password123`

## Documentation
- [Architecture](./docs/ARCHITECTURE.md)
- [API Docs](http://localhost:8000/api/docs)
