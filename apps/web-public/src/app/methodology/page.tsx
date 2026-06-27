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
            Technical blueprint of our data ingestion pipeline, extraction schemas, and risk calculations
          </p>
        </div>

        <div className={styles.prose}>
          <p className="font-body" style={{ fontSize: '15.5px', lineHeight: '1.75' }}>
            Veritas runs a continuous, multi-pass auditing pipeline connecting upstream statutory policies with downstream operational procurement. By combining rule-based compliance checks, statistical anomaly detection, and AI-driven legislative audit models, the platform translates raw, unstructured government registries into traceable risk metrics.
          </p>
        </div>

        {/* SECTION 1: DATA INGESTION PIPELINE */}
        <section className={styles.methodologySection}>
          <h2 className={`${styles.sectionTitle} font-ui`}>1. Data Ingestion & Crawling</h2>
          <div className={styles.prose}>
            <p className="font-body">
              The ingestion pipeline extracts records from primary government publications through scheduled crawler tasks:
            </p>
            <ul className="font-body" style={{ paddingLeft: '20px', lineHeight: '1.8', color: 'var(--color-ink-secondary)' }}>
              <li>
                <strong>PhilGEPS Procurement Portal:</strong> The crawler queries the open tenders search registry, scraping active and completed procurement postings, bid abstracts, notices of award (NOA), and notices to proceed (NTP).
              </li>
              <li>
                <strong>Legislative Registries:</strong> Crawlers scan legal indices (including Lawphil.net and the Official Gazette) to discover newly passed Republic Acts, executive orders, and administrative directives.
              </li>
              <li>
                <strong>Verification Checkpoints:</strong> During crawls, documents are instantly hashed (SHA-256) and recorded in the database to prevent duplicate ingestion and enforce historical immutability.
              </li>
            </ul>
          </div>
        </section>

        {/* SECTION 2: DATA EXTRACTION & PROVENANCE */}
        <section className={styles.methodologySection}>
          <h2 className={`${styles.sectionTitle} font-ui`}>2. Data Extraction & Provenance Tracking</h2>
          <div className={styles.prose}>
            <p className="font-body">
              Once raw text and PDF attachments are ingested, they pass through the data extraction and linking pipelines:
            </p>
            <ul className="font-body" style={{ paddingLeft: '20px', lineHeight: '1.8', color: 'var(--color-ink-secondary)' }}>
              <li>
                <strong>Entity Extraction:</strong> An NLP pipeline parses the text using rule-based Named Entity Recognition (NER) to isolate critical dates (deadlines, awards, publications), values (budget ceilings, final bids), and organizations (procuring agencies, winning contractors).
              </li>
              <li>
                <strong>Visual Provenance Coordination:</strong> To prevent extraction errors, every extracted parameter is linked to its exact coordinate offset within the source text:
                <div style={{ background: 'var(--color-paper-darker)', padding: '12px 18px', borderRadius: '4px', margin: '12px 0', fontSize: '13px' }} className="font-mono">
                  Coordinates = &#123; SHA256(Document), Page_Number, Character_Start, Character_End &#125;
                </div>
                This allows analysts to click any flag on the website and view the exact highlight in the original text.
              </li>
            </ul>
          </div>
        </section>

        {/* SECTION 3: DOWNSTREAM PROCUREMENT ANOMALY RULES */}
        <section className={styles.methodologySection}>
          <h2 className={`${styles.sectionTitle} font-ui`}>3. Downstream Case Auditing (14 Compliance Rules)</h2>
          <div className={styles.prose}>
            <p className="font-body">
              Downstream operational risk is analyzed by checking every contract award and tender notice against fourteen specialized algorithmic checks. Below, we document the mathematical model and statutory rationale for each rule:
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
                Flags open competitive tenders valued above a critical threshold that yield only a single bidder. A high frequency of single-bid awards indicates potential specification tailoring or pre-arranged collusion.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Calculation Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  Trigger = True &nbsp;if&nbsp; [ Bidders_Count = 1 &nbsp;&and;&nbsp; Award_Value &ge; 10,000,000 PHP ]
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  RA 9184 Section 36 (Single Calculated Responsive Bid standards).
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
                Flags procurement events where the duration between the public advertisement date and the bid closing date falls below the legal minimum, limiting fair competition.
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
                  RA 9184 Section 37.4.1 (Mandated Notice to Proceed timelines).
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
                Flags completed or awarded tenders that fail to publish the standard Abstract of Bids, preventing independent verify-and-match audits.
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
                Flags cases initiated by agencies that currently have outstanding or unresolved notices of suspension, disallowance, or material findings published by the Commission on Audit (COA).
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Calculation Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  Trigger = True &nbsp;if&nbsp; [ COA_Adverse_Findings(Agency, Fiscal_Year) &gt; 0 ]
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  1987 Philippine Constitution Article IX-D Section 2 (COA auditing jurisdiction).
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
                  RA 9184 Section 37 (Evaluation and award chronology).
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

        {/* SECTION 4: RISK SCORE AGGREGATION MODEL */}
        <section className={styles.methodologySection}>
          <h2 className={`${styles.sectionTitle} font-ui`}>4. Case-Level Risk Score Aggregation</h2>
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

        {/* SECTION 5: UPSTREAM LEGISLATIVE AUDITING */}
        <section className={styles.methodologySection}>
          <h2 className={`${styles.sectionTitle} font-ui`}>5. Upstream Legislative Vulnerability Auditing</h2>
          <div className={styles.prose}>
            <p className="font-body">
              Upstream legislative audits evaluate the text of Republic Acts and IRRs for systemic corruption loopholes before procurement starts. Our LLM-powered engine computes two primary metrics:
            </p>

            <div className={styles.methodologyGrid}>
              
              <div className={styles.methodologyCard}>
                <div className={styles.cardHeader}>
                  <h3 className={`${styles.cardTitle} font-ui`}>Integrity Index (I_L)</h3>
                  <span className={`${styles.cardPill} ${styles.cardPillBlue} font-ui`}>Statutory Score</span>
                </div>
                <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '12px' }}>
                  Rates the tightness of the law. Broad exceptions or vague procurement categories lower this index.
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

      </main>
    </div>
  );
}
