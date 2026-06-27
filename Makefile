.PHONY: help install pb-install pb-start api worker public analyst init-db seed-laws run-all dev lint format test

# Variables
VENV = .venv_linux
PYTHON = $(VENV)/bin/python
PIP = $(VENV)/bin/pip
# Note: set NEXT_PUBLIC_API_URL in your environment before running make dev on EC2

# Help target
help:
	@echo "Veritas - Philippines Procurement Transparency Platform (Zero-Docker)"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  install      Install all Node and Python dependencies"
	@echo "  pb-install   Download and install PocketBase binary locally"
	@echo "  pb-start     Start the PocketBase server on port 8090"
	@echo "  init-db      Initialize and seed the local SQLite database"
	@echo "  seed-laws    Seed controversial laws data"
	@echo "  api          Start the FastAPI backend server on port 8000"
	@echo "  worker       Start the local Python background queue worker"
	@echo "  public       Start Next.js public citizen frontend on port 3000"
	@echo "  analyst      Start Next.js analyst console frontend on port 3001"
	@echo "  dev          Run all services concurrently in one terminal"
	@echo "  lint         Run linting for backend (ruff) and frontends (eslint)"
	@echo "  format       Run formatting for backend (ruff)"
	@echo "  test         Run backend tests"

# Install all dependencies
install:
	npm install
	test -d $(VENV) || python3 -m venv $(VENV)
	PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1 $(PIP) install -r requirements.txt
	$(PIP) install ruff pytest pytest-asyncio

# Download and install PocketBase locally
pb-install:
	@echo "--- Downloading PocketBase ---"
	mkdir -p pb_bin
	curl -L -o pb_bin/pocketbase.zip https://github.com/pocketbase/pocketbase/releases/download/v0.22.14/pocketbase_0.22.14_linux_amd64.zip
	unzip -o pb_bin/pocketbase.zip -d pb_bin
	rm pb_bin/pocketbase.zip
	chmod +x pb_bin/pocketbase
	@echo "PocketBase installed successfully in ./pb_bin/pocketbase"

# Start PocketBase server
pb-start:
	./pb_bin/pocketbase serve --http="127.0.0.1:8090"

# Initialize local SQLite database and seed all tables
init-db:
	$(PYTHON) apps/api/init_db.py
	$(PYTHON) apps/api/seed_legislation.py
	$(PYTHON) apps/api/seed_cases.py

# Seed controversial laws
seed-laws:
	$(PYTHON) apps/api/seed_legislation.py

# Seed procurement cases
seed-cases:
	$(PYTHON) apps/api/seed_cases.py

# Start FastAPI API server
api:
	cd apps/api && ../../$(PYTHON) -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Start local worker
worker:
	cd apps/api && ../../$(PYTHON) workers/local_worker.py

# Start frontends
public:
	npm run dev:public

analyst:
	npm run dev:analyst

# Run all services concurrently (Zero-Docker)
dev:
	npx -y concurrently \
		-n "api,worker,public,analyst" \
		-c "green,magenta,cyan,yellow" \
		"make api" \
		"make worker" \
		"make public" \
		"make analyst"

# Run linting
lint:
	@echo "--- Linting Backend ---"
	$(VENV)/bin/ruff check .
	@echo "--- Linting Frontends ---"
	npm run lint

# Run formatting
format:
	@echo "--- Formatting Backend ---"
	$(VENV)/bin/ruff format .

# Run tests
test:
	@echo "--- Running Backend Tests ---"
	$(VENV)/bin/pytest
