# Development Log: 2026-04-01 - API Startup & Dependency Resolution

**Date:** April 1, 2026  
**Time:** ~14:41 – 14:56 PHT

## What We Finished
- **FastAPI API server is running** on `http://127.0.0.1:8000` with live hot-reload via uvicorn.
- **All core API dependencies** installed into the `.venv` virtual environment:  
  `structlog`, `fastapi`, `uvicorn[standard]`, `sqlalchemy[asyncio]`, `asyncpg`, `alembic`, `psycopg2-binary`, `pgvector`, `python-dotenv`, `pydantic`, `boto3`, `aiofiles`, `orjson`, `python-slugify`, `tenacity`, `sentry-sdk`, `prometheus-client`, `httpx`.
- **`redbeat` version fixed** — pinned version `2.2.0` did not exist on PyPI; downgraded to `2.0.0` in `requirements.txt`.

## What Went Wrong

1. **`ImportError: attempted relative import with no known parent package`**  
   `main.py` was using `from .database import ...` (relative import). Since uvicorn runs `main.py` as the top-level entry point (not as part of a package), relative imports are not supported.

2. **`ModuleNotFoundError: No module named 'structlog'`**  
   Even after activating `.venv` in PowerShell, running `uvicorn` still invoked the **system Python 3.11** installation instead of the `.venv` Python. This is because the system-level `uvicorn` binary on `PATH` took precedence over the one installed in `.venv`.

3. **`redbeat==2.2.0` does not exist on PyPI**  
   `pip install -r requirements.txt` failed with `No matching distribution found for redbeat==2.2.0`.

## What We Did to Fix This

1. **Fixed relative import** — Changed `from .database import get_db, engine` to `from database import get_db, engine` in `apps/api/main.py`.

2. **Used explicit `.venv` uvicorn path** — Instead of relying on the activated `PATH`, we invoke uvicorn directly:
   ```powershell
   C:\Users\santi\Desktop\gov\.venv\Scripts\uvicorn.exe main:app --reload
   ```
   This guarantees the correct isolated Python environment is used every time, regardless of which terminals or shell configs are active.

3. **Downgraded redbeat** — Updated `requirements.txt` line `redbeat==2.2.0` → `redbeat==2.0.0`.

## Action Required (User)
- Always launch the API using the explicit path:
  ```powershell
  C:\Users\santi\Desktop\gov\.venv\Scripts\uvicorn.exe main:app --reload
  ```
  Running plain `uvicorn main:app --reload` in the terminal will hit system Python and fail until PATH is permanently configured.
