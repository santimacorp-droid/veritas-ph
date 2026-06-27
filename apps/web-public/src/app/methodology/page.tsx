import Link from 'next/link';
import styles from '../info.module.css';

export default function MethodologyPage() {
  return (
    <div>
      <header className={styles.siteHeader}>
        <div className={styles.topbar}>
          <Link href="/" className={styles.siteLogo}>
            <span className={`${styles.logoName} font-display`}>Veritas</span>
            <span className={`${styles.logoTagline} font-ui`}>
              Philippines Procurement Transparency
            </span>
          </Link>
        </div>
        <nav className={styles.navStrip}>
          {['Cases', 'Agencies', 'Suppliers', 'Scorecard', 'Map', 'Laws', 'Methodology'].map((item) => (
            <Link
              key={item}
              href={`/${item.toLowerCase()}`}
              className={`${styles.navLink} ${item === 'Methodology' ? styles.navActive : ''} font-ui`}
            >
              {item}
            </Link>
          ))}
        </nav>
      </header>

      <main className={styles.pageContent} style={{ maxWidth: '960px', paddingBottom: '120px' }}>
        
        {/* Title Block */}
        <div className={styles.pageHead} style={{ marginBottom: '36px' }}>
          <h1 className={`${styles.pageTitle} font-display`} style={{ fontSize: '32px' }}>
            System Methodology & Auditing Engine
          </h1>
          <p className={`${styles.pageSubtitle} font-ui`}>
            Comprehensive technical specification of our ingestion pipeline, data extraction, auditing rules, and integrity controls
          </p>
        </div>

        <div className={styles.prose}>
          <p className="font-body" style={{ fontSize: '15.5px', lineHeight: '1.75' }}>
            Veritas utilizes a multi-layered computational pipeline to bridge the gap between upstream statutory policy design and downstream operational procurement outcomes. The platform operates on a zero-trust verification model, applying strict cryptographic checks and deterministic mathematical auditing to guarantee absolute data integrity.
          </p>
        </div>

        {/* SECTION 1: DATA INGESTION, CRAWLING & IMMUTABILITY */}
        <section className={styles.methodologySection}>
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
                <strong>Legislation Ingestion:</strong> Crawlers index the legal directories of Lawphil.net and the Official Gazette to collect Republic Acts (RAs), Executive Orders (EOs), and Implementing Rules and Regulations (IRRs).
              </li>
              <li>
                <strong>SHA-256 Cryptographic Hashing:</strong> To protect the pipeline against data tampering or modifications on source portals, every downloaded document is hashed immediately upon ingestion:
                <div style={{ background: 'var(--color-paper-darker)', padding: '12px 18px', borderRadius: '4px', margin: '12px 0', fontSize: '13px' }} className="font-mono">
                  Document_Hash = SHA256(Raw_Downloaded_Content)
                </div>
                If a document changes on the source portal, the system preserves the historical revision and logs a new version rather than overwriting existing records, ensuring a permanent audit trail.
              </li>
            </ul>
          </div>
        </section>

        {/* SECTION 2: ENTITY RESOLUTION & DATA INTEGRITY */}
        <section className={styles.methodologySection}>
          <h2 className={`${styles.sectionTitle} font-ui`}>2. Entity Resolution & Database Constraints</h2>
          <div className={styles.prose}>
            <p className="font-body">
              Raw government registries frequently contain typos, duplicate entries, and inconsistent naming conventions (e.g., &quot;Dept. of Health&quot; vs. &quot;Department of Health&quot;). Veritas cleans and structures this data through the following controls:
            </p>
            <ul className="font-body" style={{ paddingLeft: '20px', lineHeight: '1.8', color: 'var(--color-ink-secondary)' }}>
              <li>
                <strong>String Similarity Deduplication:</strong> Entities are matched using the Jaro-Winkler distance and token-based similarity. When a new notice is crawled, the agency or supplier name is evaluated against the existing database:
                <div style={{ background: 'var(--color-paper-darker)', padding: '12px 18px', borderRadius: '4px', margin: '12px 0', fontSize: '13px' }} className="font-mono">
                  Match = True &nbsp;if&nbsp; [ JaroWinkler(Name_A, Name_B) &gt; 0.88 ]
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

        {/* SECTION 3: TEXT PARSING & PROVENANCE COORDINATES */}
        <section className={styles.methodologySection}>
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
                <div style={{ background: 'var(--color-paper-darker)', padding: '12px 18px', borderRadius: '4px', margin: '12px 0', fontSize: '13px' }} className="font-mono">
                  Provenance_Citation = &#123;
                  {"\n"}  "document_id": UUID,
                  {"\n"}  "page_number": Integer,
                  {"\n"}  "char_start": Integer,
                  {"\n"}  "char_end": Integer,
                  {"\n"}  "confidence": Decimal
                  {"\n"}&#125;
                </div>
                When an analyst clicks a discrepancy, the portal highlights the exact character range in the original document, validating the finding.
              </li>
            </ul>
          </div>
        </section>

        {/* SECTION 4: DOWNSTREAM PROCUREMENT ANOMALY RULES */}
        <section className={styles.methodologySection}>
          <h2 className={`${styles.sectionTitle} font-ui`}>4. Downstream Procurement Case Audit Engine</h2>
          <div className={styles.prose}>
            <p className="font-body">
              The operational audit engine executes fourteen specialized compliance checks against every case. Below is the detailed calculation logic for each rule:
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginTop: '24px' }}>
            
            {/* Rule 1 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-001: Single Bidder on High-Value Bids</h3>
                <span className={`${styles.cardPill} font-ui`}>Competition</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '16px' }}>
                Flags competitive tenders valued above a critical threshold that yield only a single bidder, indicating potential tailored specifications or pre-arranged collusion.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Calculation Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  Trigger = True &nbsp;if&nbsp; [ Bidders_Count = 1 &nbsp;&and;&nbsp; Award_Value &ge; 10,000,000 PHP ]
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  RA 9184 Section 36 (Single Calculated Responsive Bid requirements).
                </p>
              </div>
            </div>

            {/* Rule 2 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-002: Potential Budget Splitting</h3>
                <span className={`${styles.cardPill} font-ui`}>Financial</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '16px' }}>
                Identifies clusters of alternative (non-competitive) contract awards executed by the same procuring entity within close temporal proximity that aggregate to a value exceeding public bidding thresholds.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Calculation Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  Let C = &#123; contracts &#125; by same Agency, same Category, using SVP or Shopping where:
                  {"\n"}  - |Date(c_i) - Date(c_j)| &le; 30 days
                  {"\n"}  - TitleSimilarity(c_i, c_j) &ge; 0.40
                  {"\n"}  - &sum; Award_Value(c_i) &ge; 1,000,000 PHP
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  RA 9184 Section 54.1 (Prohibition against splitting of contracts to bypass public bidding).
                </p>
              </div>
            </div>

            {/* Rule 3 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-003: Short Advertisement Window</h3>
                <span className={`${styles.cardPill} font-ui`}>Timeline</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '16px' }}>
                Flags procurement events where the duration between the public advertisement date and the bid closing date falls below the legal minimum.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Calculation Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  Trigger = True &nbsp;if&nbsp; [ (Closing_Date - Date_Published) &lt; Method_Posting_Threshold ]
                  {"\n"}  - Threshold: 20 calendar days for competitive bidding; 7 days for Shopping/SVP.
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  RA 9184 Section 21.2.1(a) (Notice posting requirements).
                </p>
              </div>
            </div>

            {/* Rule 4 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-004: Award-to-Budget Overshoot</h3>
                <span className={`${styles.cardPill} font-ui`}>Financial</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '16px' }}>
                Flags contracts where the awarded contract amount exceeds the Approved Budget for the Contract (ABC) or the planned budget limit.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Calculation Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  Trigger = True &nbsp;if&nbsp; [ Award_Value &gt; Planned_Budget_ABC &times; 1.20 ]
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  RA 9184 Section 31 (Budget ceiling limitations).
                </p>
              </div>
            </div>

            {/* Rule 5 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-005: Variation Order Abuse</h3>
                <span className={`${styles.cardPill} font-ui`}>Financial</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '16px' }}>
                Flags contract modifications and amendments executed post-award that increase the total project cost by a margin exceeding statutory limitations.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Calculation Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  Trigger = True &nbsp;if&nbsp; [ Cumulative_Amendment_Value_Increase &gt; Original_Contract_Value &times; 10% ]
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  RA 9184 Annex E Section 1.3 (Cumulative Variation Orders capped at 10% of original price).
                </p>
              </div>
            </div>

            {/* Rule 6 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-006: APP-Tender Mismatch</h3>
                <span className={`${styles.cardPill} font-ui`}>Transparency</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '16px' }}>
                Flags projects launched dynamically by agencies without corresponding schedule listings in the approved Annual Procurement Plan (APP).
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Calculation Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  Trigger = True &nbsp;if&nbsp; [ Linked_APP_Items_Count = 0 ]
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  RA 9184 Section 7.2 (Procurement must conform with the approved Annual Procurement Plan).
                </p>
              </div>
            </div>

            {/* Rule 7 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-007: Unrelated Supplier Capability Win</h3>
                <span className={`${styles.cardPill} font-ui`}>Competition</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '16px' }}>
                Flags wins by contractors whose commercial registration, history, or industry sector classification falls entirely outside the scope of the bid.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Calculation Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  Trigger = True &nbsp;if&nbsp; [ Project_Category_Code &notin; Supplier_Specialization_Registry ]
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  RA 9184 Section 23 (Contractor technical eligibility and licensing benchmarks).
                </p>
              </div>
            </div>

            {/* Rule 8 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-008: Delayed Notice to Proceed (NTP)</h3>
                <span className={`${styles.cardPill} font-ui`}>Timeline</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '16px' }}>
                Detects deviations where the date of issuance for the Notice to Proceed lags significantly behind the Notice of Award.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Calculation Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  Trigger = True &nbsp;if&nbsp; [ (NTP_Date - Award_Date) &gt; 15 days &nbsp;&or;&nbsp; NTP_Date &lt; Award_Date ]
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  RA 9184 Section 37.4.1 (Notice to Proceed timelines).
                </p>
              </div>
            </div>

            {/* Rule 9 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-009: Missing Abstract of Bids</h3>
                <span className={`${styles.cardPill} font-ui`}>Transparency</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '16px' }}>
                Flags completed or awarded tenders that fail to publish the standard Abstract of Bids.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Calculation Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  Trigger = True &nbsp;if&nbsp; [ Has_Award = True &nbsp;&and;&nbsp; Abstract_Attachments_Count = 0 ]
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  RA 9184 Section 37 (Public disclosure rules).
                </p>
              </div>
            </div>

            {/* Rule 10 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-010: Active COA Audit Findings</h3>
                <span className={`${styles.cardPill} font-ui`}>Compliance</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '16px' }}>
                Flags cases initiated by agencies that currently have outstanding or unresolved notices of suspension or disallowance published by the Commission on Audit (COA).
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Calculation Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  Trigger = True &nbsp;if&nbsp; [ COA_Adverse_Findings(Agency, Fiscal_Year) &gt; 0 ]
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  1987 Philippine Constitution Article IX-D Section 2.
                </p>
              </div>
            </div>

            {/* Rule 11 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-011: Award Issued Before Bid Closing</h3>
                <span className={`${styles.cardPill} font-ui`}>Timeline</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '16px' }}>
                Detects chronological anomalies where a contract award date is officially logged prior to the closing deadline for public bid submission.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Calculation Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  Trigger = True &nbsp;if&nbsp; [ Award_Date &lt; Bid_Closing_Deadline ]
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  RA 9184 Section 37 (Award chronology rules).
                </p>
              </div>
            </div>

            {/* Rule 12 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-012: HHI Market Concentration Anomaly</h3>
                <span className={`${styles.cardPill} font-ui`}>Competition</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '16px' }}>
                Flags contract awards executed within a market category and agency region that exhibits extreme supplier monopolization, measured using the Herfindahl-Hirschman Index (HHI).
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Calculation Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  HHI_category = &sum;_&#123;s &in; Suppliers&#125; ( (Supplier_Category_Wins / Total_Category_Volume) &times; 100 )^2
                  {"\n"}Trigger = True &nbsp;if&nbsp; [ HHI_category &gt; 2,500 ]
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  Philippine Competition Act (RA 10667) & GPPB Anti-Collusion standards.
                </p>
              </div>
            </div>

            {/* Rule 13 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-013: Unit Price Benchmark Outlier</h3>
                <span className={`${styles.cardPill} font-ui`}>Financial</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '16px' }}>
                Detects overpricing by executing statistical outlier checks on specific itemized unit prices against the historical baseline distribution of identical goods.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Calculation Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  Trigger = True &nbsp;if&nbsp; [ Item_Unit_Price &gt; Category_Mean_Price + 2 &times; Standard_Deviation ]
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  COA Guidelines on Overpricing audits.
                </p>
              </div>
            </div>

            {/* Rule 14 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-014: Regional PCAB License Mismatch</h3>
                <span className={`${styles.cardPill} font-ui`}>Compliance</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '16px' }}>
                Flags infrastructure projects awarded to suppliers whose registered office address or PCAB license regional classification codes mismatch the actual geographic location of the project.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Calculation Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  Trigger = True &nbsp;if&nbsp; [ Project_Region_Code &notin; Supplier_PCAB_Allowed_Regions ]
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  Philippine Contractors Accreditation Board (PCAB) licensing requirements.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* SECTION 5: RISK SCORE AGGREGATION MODEL */}
        <section className={styles.methodologySection}>
          <h2 className={`${styles.sectionTitle} font-ui`}>5. Case-Level Risk Score Aggregation</h2>
          <div className={styles.prose}>
            <p className="font-body">
              To aggregate multiple flags into a unified case risk rating, Veritas maps active anomalies to a closed interval between <code>0.0</code> (No Risk) and <code>1.0</code> (Critical Risk):
            </p>

            <div style={{ background: 'var(--color-paper-darker)', padding: '24px', borderRadius: '4px', textAlign: 'center', margin: '20px 0' }}>
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
                  <td style={{ padding: '12px 16px', color: 'var(--color-critical)', fontWeight: 'bold' }} className="font-mono">🛑 Critical</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold' }} className="font-mono">1.0</td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-ink-secondary)' }} className="font-body">
                    Statutory violation that indicates bid rigging or pre-selection (e.g., Award before Bid Deadline).
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--color-flag)', fontWeight: 'bold' }} className="font-mono">🟠 High</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold' }} className="font-mono">0.6</td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-ink-secondary)' }} className="font-body">
                    Substantial competition bypass or financial budget manipulation (e.g., Budget Splitting).
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--color-medium)', fontWeight: 'bold' }} className="font-mono">🟡 Medium</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold' }} className="font-mono">0.3</td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-ink-secondary)' }} className="font-body">
                    Timeline compressions or procedural delays (e.g., Short Posting Window).
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--color-confirm)', fontWeight: 'bold' }} className="font-mono">🔵 Low</td>
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
              Every procurement case records a five-dimensional risk vector mapped to specific vulnerability indexes:
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

        {/* SECTION 6: SUPPLIER & AGENCY RISK SCORECARDS */}
        <section className={styles.methodologySection}>
          <h2 className={`${styles.sectionTitle} font-ui`}>6. Supplier and Agency Scorecards</h2>
          <div className={styles.prose}>
            <p className="font-body">
              Veritas aggregates individual case audit results to evaluate overall entity risk profiles on the Scorecard:
            </p>
            <ul className="font-body" style={{ paddingLeft: '20px', lineHeight: '1.8', color: 'var(--color-ink-secondary)' }}>
              <li>
                <strong>Agency Scorecard Calculation:</strong> An agency&apos;s risk index is the average risk score of its cases, weighted by budget value, and multiplied by an active COA audit findings factor:
                <div style={{ background: 'var(--color-paper-darker)', padding: '12px 18px', borderRadius: '4px', margin: '12px 0', fontSize: '13px' }} className="font-mono">
                  Agency_Risk = Average(Case_Risk_Scores) &times; [ 1.0 + 0.15 &times; Min(COA_Findings_Count, 3) ]
                </div>
              </li>
              <li>
                <strong>Supplier Scorecard Calculation:</strong> A contractor&apos;s scorecard incorporates win rates on single-bid tenders, regional license mismatches, and their contribution to localized market monopolies (HHI):
                <div style={{ background: 'var(--color-paper-darker)', padding: '12px 18px', borderRadius: '4px', margin: '12px 0', fontSize: '13px' }} className="font-mono">
                  Supplier_Risk = Average(Case_Risk_Scores) &times; [ 1.0 + 0.20 &times; (Single_Bid_Wins / Total_Wins) ]
                </div>
              </li>
            </ul>
          </div>
        </section>

        {/* SECTION 7: UPSTREAM LEGISLATIVE AUDITING */}
        <section className={styles.methodologySection}>
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

        {/* SECTION 8: HUMAN REVIEW AUDIT TRAIL */}
        <section className={styles.methodologySection}>
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

      </main>
    </div>
  );
}
