# ⚖️ Veritas — Philippines Procurement Transparency Platform

<div align="center">

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://opensource.org/licenses/AGPL-3.0)
[![Python: 3.11+](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![Node: 20+](https://img.shields.io/badge/Node-20+-green.svg)](https://nodejs.org)
[![Framework: FastAPI](https://img.shields.io/badge/Framework-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![Framework: Next.js](https://img.shields.io/badge/Framework-Next.js-black.svg)](https://nextjs.org)
[![Database: PostgreSQL/Supabase](https://img.shields.io/badge/Database-PostgreSQL%2F%20Supabase-31859C.svg)](https://supabase.com)

**"Evidence before narrative. Every flag is explainable. Every claim is traceable."**

*Veritas is a community-driven, open-source civic technology platform for public procurement auditing and legislative transparency in the Philippines.*

[Key Features](#-key-features) • [Architecture](#-system-architecture) • [Quick Start](#-quick-start) • [Audit Rules](#-procurement-anomaly-engine-14-audit-rules) • [Math Models](#-case-risk-scoring--math-models) • [License](#-license)

</div>

---

Veritas acts as an **evidence-first intelligence pipeline**. It automatically ingests, normalizes, and cross-links public government documents (PhilGEPS opportunities, COA Annual Audit Reports, DBM circulars, and GPPB laws). By combining rule-based statutory checks, statistical risk modeling, and LLM-driven legislative vulnerability analysis, Veritas surfaces risks for civil society watchdogs, investigative journalists, and public administrators.

> [!NOTE]
> **Veritas does not accuse.** It detects statistical anomalies, highlights statutory deviations, and provides absolute traceability back to official documents, leaving final determinations to human reviewers.

---

## 🚀 Key Features

* **Upstream Legislative Auditing:** Evaluates legal texts (Republic Acts, IRR) for vulnerabilities, outputting an **Integrity Index** and **Oversight Score** based on ambiguous scopes or mandated civil society observers.
* **Downstream Procurement Auditing:** Scans active bids and tenders using **14 specialized mathematical checks** aligned with the Government Procurement Reform Act (**RA 9184**) and the New Government Procurement Act (**RA 12009**).
* **Traceable Visual Provenance:** Anchors extracted data points directly to specific coordinates `[page_number, char_start, char_end]` on SHA256-hashed source documents.
* **Citizen Portal & Analyst Console:** Next.js portals offering public discovery of procurement risks alongside a secure workspace for civil society annotations and audits.

---

## 🗺️ System Architecture

```mermaid
graph TD
    classDef layer fill:#f9f9f9,stroke:#333,stroke-width:1px;
    classDef db fill:#e1f5fe,stroke:#0288d1,stroke-width:1px,stroke-dasharray: 5 5;
    classDef worker fill:#fff3e0,stroke:#f57c00,stroke-width:1px;

    subgraph Sources [Government Portals & Legal Indices]
        PhilGEPS[PhilGEPS Portals]
        ELib[Judiciary E-Library]
        Lawphil[Lawphil.net]
    end

    subgraph Ingestion [1. Ingestion Layer]
        Crawler[Crawler Worker]:::worker --> Docs[PocketBase Doc Storage]:::db
        Crawler --> MetadataDB[(Supabase / SQLite)]:::db
    end

    subgraph Processing [2. Processing Pipeline]
        Extractor[Extractor Worker]:::worker --> Docs
        Extractor --> Extractions[(JSONB Extracted Schema)]:::db
        Linker[Linker Worker]:::worker --> Extractions
        Linker --> CrossRefs[(Entity Resolution Graph)]:::db
    end

    subgraph Risk [3. Audit Engine]
        RiskEngine[Risk Engine]:::worker --> Extractions
        RiskEngine --> Discrepancies[(Discrepancies Table)]:::db
        LawAnalyzer[AI Law Auditor]:::worker --> MetadataDB
    end

    subgraph API [4. Gateway Layer]
        FastAPI[FastAPI Backend] --> MetadataDB
        FastAPI --> Docs
    end

    subgraph UI [5. Frontend Layer]
        PublicWeb[Citizen Next.js Portal] --> FastAPI
        AnalystWeb[Analyst Admin Console] --> FastAPI
    end

    Sources --> Crawler
    class Ingestion,Processing,Risk,API,UI layer;
```

### 📁 Repository Layout
```yaml
veritas-ph/
├── apps/
│   ├── web-public/         # Next.js citizen portal (Port 3005)
│   ├── web-analyst/        # Next.js analyst workspace (Port 3001)
│   └── api/                # FastAPI backend + crawler tasks (Port 8000)
├── packages/
│   ├── config/             # Shared ESLint, TS, and Prettier configurations
│   ├── types/              # Unified TypeScript definitions (Discrepancy, Law)
│   └── ui/                 # Shared UI badges, indicators, and citation components
├── pb_bin/                 # PocketBase binary directory (Document store)
├── pb_data/                # PocketBase local files & document storage
├── docs/                   # Architectural blueprints and legal standards
└── Makefile                # Master automation script
```

---

## 🌐 Platform Deployments & Ecosystem

Veritas is deployed as a fully integrated, live civic technology network:

* 👥 **Citizen Portal:** [https://veritas-ph-web-public.vercel.app](https://veritas-ph-web-public.vercel.app)  
  * A public dashboard for investigative journalists, civil society watchdogs, and citizens to explore procurement cases, track agency risk scores, and search audited legislative indexes.
* 💼 **Analyst Workspace:** [https://veritas-ph-web-analyst.vercel.app](https://veritas-ph-web-analyst.vercel.app)  
  * A secure console for legal analysts and audit organizations to review system-generated anomalies, record manual annotations, and publish investigative leads.
* ⚙️ **API Gateway:** [https://veritas-ph.onrender.com](https://veritas-ph.onrender.com)  
  * The central FastAPI engine powering the public REST APIs, handling data normalization, and hosting the Swagger UI endpoints documentation.

---

## 🔍 Procurement Anomaly Engine (14 Audit Rules)

Veritas runs fourteen specialized compliance and statistical audits on every contract award and tender notice.

| Rule ID | Anomaly / Check | Severity | Risk Dimension | Statutory / Auditing Reference |
| :--- | :--- | :--- | :--- | :--- |
| **RULE-001** | Single Bidder on High-Value Contract | High | Competition | RA 9184 Sec. 36 (requires active market pricing) |
| **RULE-002** | Potential Budget Splitting / Alternative Overuse | High | Financial | RA 9184 Sec. 54.1 & COA Guidelines (bypassing public bidding) |
| **RULE-003** | Short Posting Window | Medium | Procedural | RA 9184 Sec. 21.2.1 (minimum advertisement calendar days) |
| **RULE-004** | Award-to-Budget Overshoot | High | Financial | RA 9184 Sec. 31 (ABC serves as absolute bid ceiling) |
| **RULE-005** | Variation Order Abuse | High | Financial | RA 9184 Annex E Sec. 1.3 (max 10% contract value modification) |
| **RULE-006** | APP-Tender Mismatch | Medium | Transparency | RA 9184 Sec. 7.2 (procurement must align with approved APP) |
| **RULE-007** | Unrelated Supplier Win | High | Competition | RA 9184 Sec. 23 (requires matching specialized business licenses) |
| **RULE-008** | Late Notice to Proceed (NTP) | Medium | Timeline | RA 9184 Sec. 37.4.1 (NTP must issue within 7 days of approval) |
| **RULE-009** | Missing Bid Abstract | High | Transparency | RA 9184 Sec. 37 (requires publication of evaluation totals) |
| **RULE-010** | Active COA Audit Findings | Medium | Compliance | 1987 Philippine Constitution Art. IX-D (COA report cross-ref) |
| **RULE-011** | Award Before Bid Deadline | Critical | Timeline | RA 9184 Sec. 37 (award can only occur post bid-qualification) |
| **RULE-012** | HHI Market Concentration Anomaly | High | Competition | RA 10667 Competition Act (monopoly / collusive cartel patterns) |
| **RULE-013** | Price Benchmark Anomaly | High | Financial | COA Value-for-Money Audits (outlier unit pricing against benchmarks) |
| **RULE-014** | Geographic Mismatch | Medium | Compliance | PCAB Accreditation Rules (contractor regional address mismatch) |

---

## ⚖️ Case Risk Scoring & Math Models

### 1. Weighted Severity Scoring
Veritas aggregates anomalies into a combined risk index ($R$) bounded between $0.0$ and $1.0$:

$$R = \min\left(1.0, \sum W_i\right)$$

Where discrepancy severity weights ($W_i$) are defined as:
* 🛑 **Critical** ($W_i = 1.0$): Hard-constrains case risk to $\ge 0.80$ (e.g., *Award Before Bid Deadline*).
* 🟠 **High** ($W_i = 0.6$): Severe competition/financial checks (e.g., *Budget Splitting*).
* 🟡 **Medium** ($W_i = 0.3$): Timeline or compliance deviations (e.g., *Short Posting Window*).
* 🔵 **Low** ($W_i = 0.1$): Minor record inconsistencies.

### 2. Five-Dimensional Risk Vector ($V_{\text{risk}}$)
Every case maps to a risk vector indicating specific compliance vulnerabilities:

$$V_{\text{risk}} = [C_{\text{comp}}, C_{\text{time}}, C_{\text{fin}}, C_{\text{trans}}, C_{\text{compl}}]$$

---

## 📜 Legislative Vulnerability Auditing (AI Engine)

Upstream statutory vulnerabilities are evaluated by scanning legal texts (Republic Acts and IRRs) for loopholes.

### Integrity Index ($I_L$)
Measures the statutory tighteness of a law. Loopholes and vague exceptions decrease the index:

$$I_L = 100 - \sum \text{Vulnerability\_Weight}_i$$

* **Critical Loophole** ($-20$)
* **High Vulnerability** ($-15$)
* **Medium Vulnerability** ($-8$)
* **Low Vulnerability** ($-3$)

### Oversight Score ($O_L$)
Measures the transparency, monitoring, and penalty clauses mandated by the statute:

$$O_L = \sum \text{Oversight\_Factor}_j$$

* **CS Observers Explicitly Mandated** ($+25$)
* **Open Data Reporting Required** ($+25$)
* **Clear Penal / Punitive Clauses** ($+25$)
* **Independent Auditing Mandated** ($+25$)

---

## 📄 License

Veritas is licensed under the **GNU Affero General Public License v3 (AGPL-3.0)**. 

### Why AGPL-3.0?
Veritas is civic-tech software meant for public good, accountability, and transparency. The AGPL-3.0 license protects this mission by ensuring that **any modifications or enhancements made to Veritas—even if run purely as a cloud/web service—must be released as open-source code under the same license**. This prevents proprietary closed forks and ensures the community's work remains public forever.

For details, see the [LICENSE](LICENSE) file.
