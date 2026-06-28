"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../info.module.css';

interface Rule {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  description: string;
  model: string;
  link: string;
}

const RULES: Rule[] = [
  {
    id: "RULE-001",
    title: "Single Bidder on High-Value Tenders",
    category: "competition",
    categoryLabel: "Competition",
    description: "Flags competitive tenders valued above a critical threshold that yield only a single bidder, indicating potential tailored specifications or pre-arranged collusion.",
    model: "Trigger = True  if  [ Bidders_Count = 1  &  Award_Value >= 10,000,000 PHP ]\n  - Flags a pattern permitted under specific Section 65 criteria, used as a statistical red flag for further review.",
    link: "RA 12009 Section 65 (Single Calculated/Rated/Economically Advantageous and Responsive Bid Submission)."
  },
  {
    id: "RULE-002",
    title: "Potential Budget Splitting",
    category: "financial",
    categoryLabel: "Financial",
    description: "Identifies clusters of alternative (non-competitive) contract awards executed by the same procuring entity within close temporal proximity that aggregate to a value exceeding public bidding thresholds.",
    model: "Let C = { contracts } by same Agency, same Category, using SVP or Shopping where:\n  - |Date(c_i) - Date(c_j)| <= 30 days\n  - TitleSimilarity(c_i, c_j) >= 0.40\n  - Sum(Award_Value(c_i)) >= 1,000,000 PHP\n  - Section 39 excludes legitimate package/lot procurement.",
    link: "RA 12009 Section 39 (Prohibition on Splitting of Government Contracts) & Section 92(d) (Administrative Liability)."
  },
  {
    id: "RULE-003",
    title: "Short Advertisement Window",
    category: "timeline",
    categoryLabel: "Timeline",
    description: "Flags procurement events where the duration between the public advertisement date and the bid closing date falls below the legal minimum.",
    model: "Trigger = True  if  [ (Closing_Date - Date_Published) < Method_Posting_Threshold ]\n  - Pre-Feb 2025: 20 calendar days for competitive bidding; 7 days for Shopping/SVP.\n  - Post-Feb 2025: Differentiates based on updated NGPA IRR timeline frameworks (e.g. up to 45 days for Goods).",
    link: "RA 12009 Section 50 (Publication and Contents of the Invitation to Bid) & GPPB IRR Rule VII/VIII."
  },
  {
    id: "RULE-004",
    title: "Award-to-Budget Overshoot",
    category: "financial",
    categoryLabel: "Financial",
    description: "Flags contracts where the awarded contract amount exceeds the Approved Budget for the Contract (ABC) or the planned budget limit.",
    model: "Trigger = True  if  [ Award_Value > Planned_Budget_ABC ]\n  - Bids exceeding the ABC ceiling must be disqualified outright. Over-budget awards suggest bidding process anomalies or post-award inflation.",
    link: "RA 12009 Section 60 (Ceiling for Bid Prices)."
  },
  {
    id: "RULE-005",
    title: "Variation Order Abuse",
    category: "financial",
    categoryLabel: "Financial",
    description: "Flags contract modifications and amendments executed post-award that increase the total project cost by a margin exceeding statutory limitations.",
    model: "Trigger = True  if  [ Cumulative_Amendment_Value_Increase > Original_Contract_Value * 10% ]\n  - Section 89 strictly controls price escalation based on official indices and GPPB approval.",
    link: "RA 12009 Section 71 (Contract Implementation and Termination) & Section 89 (Contract Prices)."
  },
  {
    id: "RULE-006",
    title: "APP-Tender Mismatch",
    category: "transparency",
    categoryLabel: "Transparency",
    description: "Flags projects launched dynamically by agencies without corresponding schedule listings in the approved Annual Procurement Plan (APP).",
    model: "Trigger = True  if  [ Linked_APP_Items_Count = 0 ]",
    link: "RA 12009 Section 7 (Strategic Procurement Planning and Budgeting Linkage)."
  },
  {
    id: "RULE-007",
    title: "Unrelated Supplier Capability Win",
    category: "competition",
    categoryLabel: "Competition",
    description: "Flags wins by contractors whose commercial registration, history, or industry sector classification falls entirely outside the scope of the bid.",
    model: "Trigger = True  if  [ Project_Category_Code not in Supplier_Specialization_Registry ]",
    link: "RA 12009 Section 52 (Eligibility Requirements for Goods, Infrastructure, and Consulting)."
  },
  {
    id: "RULE-008",
    title: "Delayed Notice to Proceed (NTP)",
    category: "timeline",
    categoryLabel: "Timeline",
    description: "Detects deviations where the date of issuance for the Notice to Proceed lags significantly behind the contract approval date.",
    model: "Trigger = True  if  [ (NTP_Date - Contract_Approval_Date) > 3 days ]\n  - Measured from contract approval for post-Feb 2025 procurements (NGPA mandate).",
    link: "RA 12009 Section 66 (Notice and Execution of Award)."
  },
  {
    id: "RULE-009",
    title: "Missing Abstract of Bids / Opening Records",
    category: "transparency",
    categoryLabel: "Transparency",
    description: "Flags completed or awarded tenders that fail to publish the standard Abstract of Bids or bid opening records.",
    model: "Trigger = True  if  [ Has_Award = True  &  Abstract_Attachments_Count = 0 ]",
    link: "RA 12009 Section 58 (Bid Opening) and Section 3(a) (Transparency Principles)."
  },
  {
    id: "RULE-010",
    title: "Active COA Audit Findings",
    category: "compliance",
    categoryLabel: "Compliance",
    description: "Flags cases initiated by agencies that currently have outstanding or unresolved notices of suspension or disallowance published by the Commission on Audit (COA).",
    model: "Trigger = True  if  [ COA_Adverse_Findings(Agency, Fiscal_Year) > 0 ]",
    link: "1987 Philippine Constitution Art. IX-D Sec. 2 & PD 1445 (Government Auditing Code)."
  },
  {
    id: "RULE-011",
    title: "Award Issued Before Bid Closing",
    category: "timeline",
    categoryLabel: "Timeline",
    description: "Detects chronological anomalies where a contract award date is officially logged prior to the closing deadline for public bid submission.",
    model: "Trigger = True  if  [ Award_Date < Bid_Closing_Deadline ]",
    link: "Derived sequencing violation from RA 12009 Articles VIII-XI (Sections 54, 58, 63, and 66)."
  },
  {
    id: "RULE-012",
    title: "HHI Market Concentration Anomaly",
    category: "competition",
    categoryLabel: "Competition",
    description: "Flags contract awards executed within a market category and agency region that exhibits extreme supplier monopolization, measured using the Herfindahl-Hirschman Index (HHI).",
    model: "HHI_category = Sum_{s in Suppliers} ( (Supplier_Category_Wins / Total_Category_Volume) * 100 )^2\nTrigger = True  if  [ HHI_category > 2,500 ]\n  - HHI > 2500 threshold is an international statistical convention applied for market analysis.",
    link: "RA 12009 Section 100(c), (f), & (i) (Bid-Rigging Definitions) & Philippine Competition Act (RA 10667)."
  },
  {
    id: "RULE-013",
    title: "Unit Price Benchmark Outlier",
    category: "financial",
    categoryLabel: "Financial",
    description: "Detects overpricing by executing statistical outlier checks on specific itemized unit prices against the historical baseline distribution of identical goods.",
    model: "Trigger = True  if  [ Item_Unit_Price > Category_Mean_Price + 2 * Standard_Deviation ]",
    link: "COA Price Reasonableness circulars and Value-for-Money auditing guidelines."
  },
  {
    id: "RULE-014",
    title: "Regional PCAB License Mismatch",
    category: "compliance",
    categoryLabel: "Compliance",
    description: "Flags infrastructure projects awarded to suppliers whose registered office address or PCAB license regional classification codes mismatch the actual geographic location of the project.",
    model: "Trigger = True  if  [ Project_Region_Code not in Supplier_PCAB_Allowed_Regions ]",
    link: "RA 4566 (Contractors' License Law) & RA 12009 Section 23(c) (PhilGEPS database interconnectivity)."
  }
];

const SECTIONS = [
  { id: "ingestion", label: "1. Data Ingestion" },
  { id: "resolution", label: "2. Entity Resolution" },
  { id: "extraction", label: "3. Document Extraction" },
  { id: "audit-engine", label: "4. Downstream Rules" },
  { id: "aggregation", label: "5. Risk Aggregation" },
  { id: "scorecards", label: "6. Entity Scorecards" },
  { id: "legislation", label: "7. Upstream Auditing" },
  { id: "human-review", label: "8. Human Review" }
];

export default function MethodologyPage() {
  const [activeSection, setActiveSection] = useState("ingestion");
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      for (const section of SECTIONS) {
        const el = document.getElementById(section.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredRules = RULES.filter(
    (r) => activeCategory === "all" || r.category === activeCategory
  );

  return (
    <div>
      <main className={styles.pageContent} style={{ maxWidth: '1200px', paddingBottom: '120px' }}>
        
        {/* Title Block */}
        <div className={styles.pageHead} style={{ marginBottom: '36px' }}>
          <h1 className={`${styles.pageTitle} font-display`} style={{ fontSize: '36px' }}>
            System Methodology & Auditing Engine
          </h1>
          <p className={`${styles.pageSubtitle} font-ui`}>
            Comprehensive technical specification of our ingestion pipeline, data extraction, auditing rules, and integrity controls
          </p>
        </div>

        <div className={styles.layoutWrapper}>
          
          {/* Sticky Navigation Sidebar */}
          <aside className={styles.sidebarNav}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-ink-secondary)', fontWeight: 700, marginBottom: '8px', display: 'block' }} className="font-ui">
              Specifications
            </span>
            {SECTIONS.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className={`${styles.sidebarItem} ${activeSection === sec.id ? styles.sidebarActive : ''} font-ui`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth' });
                  setActiveSection(sec.id);
                }}
              >
                {sec.label}
              </a>
            ))}
          </aside>

          {/* Content Pane */}
          <div style={{ minWidth: 0 }}>
            
            <div className={styles.prose}>
              <p className="font-body" style={{ fontSize: '15.5px', lineHeight: '1.75' }}>
                Veritas utilizes a multi-layered computational pipeline to bridge the gap between upstream statutory policy design and downstream operational procurement outcomes. The platform operates on a zero-trust verification model, applying strict cryptographic checks and deterministic mathematical auditing to guarantee absolute data integrity.
              </p>
            </div>

            {/* SECTION 1 */}
            <section id="ingestion" className={styles.methodologySection}>
              <h2 className={`${styles.sectionTitle} font-ui`}>1. Data Ingestion, Crawling & Immutability</h2>
              <div className={styles.prose}>
                <p className="font-body">
                  The ingestion pipeline extracts unstructured data from primary government portals and maps it to a unified relational model:
                </p>
                <ul className="font-body" style={{ paddingLeft: '20px', lineHeight: '1.8', color: 'var(--color-ink-secondary)' }}>
                  <li>
                    <strong>PhilGEPS Ingestion:</strong> The crawler searches active and completed procurement indices, scraping notice metadata, bidding timelines, and associated award notice links.
                  </li>
                  <li>
                    <strong>Legislation Ingestion:</strong> Crawlers index the authenticated database of the **Supreme Court Judiciary E-Library** to collect Republic Acts (RAs), Executive Orders (EOs), and Implementing Rules and Regulations (IRRs). Stub registries are filtered out.
                  </li>
                  <li>
                    <strong>SHA-256 Cryptographic Hashing:</strong> To protect the pipeline against data tampering or modifications on source portals, every downloaded document is hashed immediately upon ingestion:
                    <div className={`${styles.formulaBlock} font-mono`}>
                      <span className={styles.formulaText}>Document_Hash = SHA256(Raw_Downloaded_Content)</span>
                    </div>
                    If a document changes on the source portal, the system preserves the historical revision and logs a new version rather than overwriting existing records, ensuring a permanent audit trail.
                  </li>
                </ul>
              </div>
            </section>

            {/* SECTION 2 */}
            <section id="resolution" className={styles.methodologySection}>
              <h2 className={`${styles.sectionTitle} font-ui`}>2. Entity Resolution & Database Constraints</h2>
              <div className={styles.prose}>
                <p className="font-body">
                  Raw government registries frequently contain typos, duplicate entries, and inconsistent naming conventions. Veritas cleans and structures this data through the following controls:
                </p>
                <ul className="font-body" style={{ paddingLeft: '20px', lineHeight: '1.8', color: 'var(--color-ink-secondary)' }}>
                  <li>
                    <strong>String Similarity Deduplication:</strong> Entities are matched using the Jaro-Winkler distance and token-based similarity. When a new notice is crawled, the agency or supplier name is evaluated against the existing database:
                    <div className={`${styles.formulaBlock} font-mono`}>
                      <span className={styles.formulaText}>Match = True  if  [ JaroWinkler(Name_A, Name_B) &gt; 0.88 ]</span>
                    </div>
                    If a match is found, the notice is linked to the existing record; otherwise, a new entity is registered.
                  </li>
                  <li>
                    <strong>Relational Database Integrity:</strong> Supabase schema constraints prevent corrupt data from propagating:
                    <ul style={{ paddingLeft: '20px', marginTop: '6px' }}>
                      <li>Foreign Key constraints link all case awards, discrepancies, and events to unique cases.</li>
                      <li><code>CHECK</code> constraints enforce validation rules (e.g., severity must be one of: <code>&apos;low&apos;</code>, <code>&apos;medium&apos;</code>, <code>&apos;high&apos;</code>, <code>&apos;critical&apos;</code>).</li>
                      <li>Unique constraints on <code>procurement_ref_no</code> prevent double-counting.</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </section>

            {/* SECTION 3 */}
            <section id="extraction" className={styles.methodologySection}>
              <h2 className={`${styles.sectionTitle} font-ui`}>3. Document Extraction & Visual Provenance</h2>
              <div className={styles.prose}>
                <p className="font-body">
                  Veritas extracts fields from tender notices and legal documents using a multi-pass parsing framework:
                </p>
                <ul className="font-body" style={{ paddingLeft: '20px', lineHeight: '1.8', color: 'var(--color-ink-secondary)' }}>
                  <li>
                    <strong>Text Normalization:</strong> Raw HTML pages and PDF text layers are cleaned of control characters, duplicate spacing, and markup formatting.
                  </li>
                  <li>
                    <strong>Entity and Parameter Extraction:</strong> Named Entity Recognition (NER) models isolate key dates, amounts, and organization names.
                  </li>
                  <li>
                    <strong>Visual Provenance Coordinate Offsets:</strong> Every extracted parameter records its exact coordinate offset within the source text to ensure absolute verification:
                    <div style={{ background: 'var(--color-paper-darker)', padding: '16px 20px', borderRadius: '6px', margin: '16px 0', fontSize: '13px', border: '1px solid var(--color-rule-strong)' }} className="font-mono">
                      {"{"}
                      {"\n"}  &quot;document_id&quot;: UUID,
                      {"\n"}  &quot;page_number&quot;: Integer,
                      {"\n"}  &quot;char_start&quot;: Integer,
                      {"\n"}  &quot;char_end&quot;: Integer,
                      {"\n"}  &quot;confidence&quot;: Decimal
                      {"\n"}{"}"}
                    </div>
                    When an analyst clicks a discrepancy, the portal highlights the exact character range in the original document, validating the finding.
                  </li>
                </ul>
              </div>
            </section>

            {/* SECTION 4 */}
            <section id="audit-engine" className={styles.methodologySection}>
              <h2 className={`${styles.sectionTitle} font-ui`}>4. Downstream Procurement Project Audit Engine</h2>
              <div className={styles.prose}>
                <p className="font-body">
                  The operational audit engine executes fourteen compliance checks. Use the filter tabs below to explore the active rules:
                </p>
              </div>

              {/* Interactive Rule Category Filters */}
              <div className={styles.ruleFilters}>
                {[
                  { key: "all", label: "All Rules" },
                  { key: "competition", label: "Competition" },
                  { key: "financial", label: "Financial" },
                  { key: "timeline", label: "Timeline" },
                  { key: "transparency", label: "Transparency" },
                  { key: "compliance", label: "Compliance" }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    className={`${styles.filterTabBtn} ${activeCategory === tab.key ? styles.filterTabActive : ''} font-ui`}
                    onClick={() => setActiveCategory(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {filteredRules.map((rule) => (
                  <div key={rule.id} className={styles.methodologyCard}>
                    <div className={styles.cardHeader}>
                      <h3 className={`${styles.cardTitle} font-ui`}>{rule.id}: {rule.title}</h3>
                      <span className={`${styles.cardPill} font-ui`}>{rule.categoryLabel}</span>
                    </div>
                    <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '16px' }}>
                      {rule.description}
                    </p>
                    <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                      <span className="font-ui" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Calculation Model</span>
                      <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                        {rule.model}
                      </code>
                      <span className="font-ui" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                      <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                        {rule.link}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION 5 */}
            <section id="aggregation" className={styles.methodologySection}>
              <h2 className={`${styles.sectionTitle} font-ui`}>5. Project-Level Risk Score Aggregation</h2>
              <div className={styles.prose}>
                <p className="font-body">
                  To aggregate multiple flags into a unified project risk rating, Veritas maps active anomalies to a closed interval between <code>0.0</code> (No Risk) and <code>1.0</code> (Critical Risk):
                </p>

                <div className={styles.formulaBlock}>
                  <p className="font-mono" style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px 0', color: 'var(--color-ink)' }}>
                    Risk_Score = min(1.0, &sum; Weight_i)
                  </p>
                  <p className="font-body" style={{ fontSize: '13px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                    If any <strong>Critical</strong> severity rule triggers, the final risk score is automatically constrained:
                  </p>
                  <p className="font-mono" style={{ fontSize: '14px', margin: '8px 0 0 0', fontWeight: 'bold', color: 'var(--color-flag)' }}>
                    Risk_Score &ge; 0.80
                  </p>
                </div>

                <p className="font-body">
                  The individual rule weights are determined by severity level:
                </p>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', marginTop: '16px', marginBottom: '24px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-rule-strong)', background: 'var(--color-paper-dark)' }}>
                      <th style={{ textAlign: 'left', padding: '12px 16px' }} className="font-ui">Severity Level</th>
                      <th style={{ textAlign: 'center', padding: '12px 16px' }} className="font-ui">Weight</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px' }} className="font-ui">Auditing Standard Definition</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`${styles.severityPill} ${styles.sevCritical}`}>Critical</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold' }} className="font-mono">1.0</td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-ink-secondary)' }} className="font-body">
                        Statutory violation that indicates bid rigging or pre-selection (e.g., Award before Bid Deadline).
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`${styles.severityPill} ${styles.sevHigh}`}>High</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold' }} className="font-mono">0.6</td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-ink-secondary)' }} className="font-body">
                        Substantial competition bypass or financial budget manipulation (e.g., Budget Splitting).
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`${styles.severityPill} ${styles.sevMedium}`}>Medium</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold' }} className="font-mono">0.3</td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-ink-secondary)' }} className="font-body">
                        Timeline compressions or procedural delays (e.g., Short Posting Window).
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`${styles.severityPill} ${styles.sevLow}`}>Low</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold' }} className="font-mono">0.1</td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-ink-secondary)' }} className="font-body">
                        Minor documentation inconsistencies or delayed timestamps.
                      </td>
                    </tr>
                  </tbody>
                </table>

                <h3 className="font-ui" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-ink)', margin: '32px 0 12px 0' }}>
                  The Five-Dimensional Compliance Vector (V_risk)
                </h3>
                <p className="font-body" style={{ margin: '0 0 16px 0' }}>
                  Every project records a five-dimensional risk vector mapped to specific vulnerability indexes:
                </p>
                <div style={{ background: 'var(--color-paper-darker)', padding: '16px 24px', borderRadius: '4px', margin: '16px 0' }} className="font-mono">
                  V_risk = [ Competition, Timeline, Financial, Transparency, Compliance ]^T
                </div>
                <p className="font-body">
                  Each vector dimension is computed as the maximum weight of the triggered rules in that category:
                </p>
                <ul className="font-body" style={{ paddingLeft: '20px', lineHeight: '1.8', color: 'var(--color-ink-secondary)' }}>
                  <li><strong>Competition Score:</strong> Max weight of &#123;RULE-001, RULE-007, RULE-012&#125;.</li>
                  <li><strong>Timeline Score:</strong> Max weight of &#123;RULE-003, RULE-008, RULE-011&#125;.</li>
                  <li><strong>Financial Score:</strong> Max weight of &#123;RULE-002, RULE-004, RULE-005, RULE-013&#125;.</li>
                  <li><strong>Transparency Score:</strong> Max weight of &#123;RULE-006, RULE-009&#125;.</li>
                  <li><strong>Compliance Score:</strong> Max weight of &#123;RULE-010, RULE-014&#125;.</li>
                </ul>
              </div>
            </section>

            {/* SECTION 6 */}
            <section id="scorecards" className={styles.methodologySection}>
              <h2 className={`${styles.sectionTitle} font-ui`}>6. Supplier and Agency Scorecards</h2>
              <div className={styles.prose}>
                <p className="font-body">
                  Veritas aggregates project results to evaluate overall entity risk profiles on the Scorecard:
                </p>
                <ul className="font-body" style={{ paddingLeft: '20px', lineHeight: '1.8', color: 'var(--color-ink-secondary)' }}>
                  <li>
                    <strong>Agency Scorecard Calculation:</strong> An agency&apos;s risk index is the average risk score of its projects, weighted by budget value, and multiplied by an active COA audit findings factor:
                    <div className={styles.formulaBlock}>
                      <span className={styles.formulaText}>Agency_Risk = Average(Project_Risk_Scores) &times; [ 1.0 + 0.15 &times; Min(COA_Findings_Count, 3) ]</span>
                    </div>
                  </li>
                  <li>
                    <strong>Supplier Scorecard Calculation:</strong> A contractor&apos;s scorecard incorporates win rates on single-bid tenders, regional license mismatches, and their contribution to localized market monopolies (HHI):
                    <div className={styles.formulaBlock}>
                      <span className={styles.formulaText}>Supplier_Risk = Average(Project_Risk_Scores) &times; [ 1.0 + 0.20 &times; (Single_Bid_Wins / Total_Wins) ]</span>
                    </div>
                  </li>
                </ul>
              </div>
            </section>

            {/* SECTION 7 */}
            <section id="legislation" className={styles.methodologySection}>
              <h2 className={`${styles.sectionTitle} font-ui`}>7. Upstream Legislative Vulnerability Auditing</h2>
              <div className={styles.prose}>
                <p className="font-body">
                  Upstream legislative audits evaluate the text of Republic Acts and IRRs for systemic corruption loopholes before procurement starts. Our legal auditing engine computes two primary metrics:
                </p>

                <div className={styles.methodologyGrid}>
                  
                  <div className={styles.methodologyCard}>
                    <div className={styles.cardHeader}>
                      <h3 className={`${styles.cardTitle} font-ui`}>Integrity Index (I_L)</h3>
                      <span className={`${styles.cardPill} ${styles.cardPillBlue} font-ui`}>Statutory Score</span>
                    </div>
                    <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '12px' }}>
                      Rates the loophole tightness of the law. Broad exemptions or vague procurement categories lower this index.
                    </p>
                    <div style={{ background: 'var(--color-paper-darker)', padding: '12px', borderRadius: '4px', fontSize: '12.5px' }} className="font-mono">
                      I_L = max( 0, 100 - &sum; Loophole_Weights )
                      {"\n"}Loophole Weights:
                      {"\n"}  - Critical Loophole: -20
                      {"\n"}  - High Risk: -15
                      {"\n"}  - Medium Risk: -8
                      {"\n"}  - Low Risk: -3
                    </div>
                  </div>

                  <div className={styles.methodologyCard}>
                    <div className={styles.cardHeader}>
                      <h3 className={`${styles.cardTitle} font-ui`}>Oversight Score (O_L)</h3>
                      <span className={`${styles.cardPill} ${styles.cardPillBlue} font-ui`}>Governance Score</span>
                    </div>
                    <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '12px' }}>
                      Evaluates the presence of monitoring, public disclosure rules, and observation channels.
                    </p>
                    <div style={{ background: 'var(--color-paper-darker)', padding: '12px', borderRadius: '4px', fontSize: '12.5px' }} className="font-mono">
                      O_L = &sum; Oversight_Factors
                      {"\n"}Oversight Factors:
                      {"\n"}  - CS Observers Mandated: +25
                      {"\n"}  - Open Data Required: +25
                      {"\n"}  - Clear Penal Clauses: +25
                      {"\n"}  - Independent Auditing: +25
                    </div>
                  </div>

                </div>
              </div>
            </section>

            {/* SECTION 8 */}
            <section id="human-review" className={styles.methodologySection}>
              <h2 className={`${styles.sectionTitle} font-ui`}>8. Human Analyst Annotations & Audit Trail</h2>
              <div className={styles.prose}>
                <p className="font-body">
                  Algorithmic audits are subject to human verification. When an anomaly triggers, it begins in a <code>&apos;pending&apos;</code> status:
                </p>
                <ul className="font-body" style={{ paddingLeft: '20px', lineHeight: '1.8', color: 'var(--color-ink-secondary)' }}>
                  <li>
                    <strong>Verification Outcomes:</strong> Licensed civil society analysts review coordinates and tag findings as:
                    <ul style={{ paddingLeft: '20px', marginTop: '6px' }}>
                      <li><code>&apos;confirmed&apos;</code> (Validated anomaly, published to citizen feed).</li>
                      <li><code>&apos;false_positive&apos;</code> (Flag cleared due to specific context, archived).</li>
                      <li><code>&apos;needs_evidence&apos;</code> (Returned for field inspection).</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Audit Log Immutability:</strong> All manual overrides, comments, and status adjustments are stamped with the analyst&apos;s signature and logged in the audit history database. This prevents arbitrary updates and ensures accountability for both algorithms and auditors.
                  </li>
                </ul>
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}
