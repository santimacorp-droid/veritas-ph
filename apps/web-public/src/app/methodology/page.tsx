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
        
        {/* Academic Paper Header */}
        <div style={{ textAlign: 'center', marginTop: '48px', marginBottom: '40px' }}>
          <h1 className="font-display" style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.25', margin: '0 0 12px 0', color: 'var(--color-ink)' }}>
            Algorithmic Auditing of Public Procurement:<br />
            An Evidence-First Framework for Statutory and Operational Risk Scoring
          </h1>
          <p className="font-ui" style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px 0', color: 'var(--color-ink-secondary)' }}>
            Veritas Technical Working Group
          </p>
          <p className="font-body" style={{ fontSize: '12px', fontStyle: 'italic', margin: '0 0 24px 0', color: 'var(--color-ink-muted)' }}>
            Civic Technology & Public Policy Research Initiative, Philippines
          </p>
          <div style={{ width: '80px', height: '1px', background: 'var(--color-rule-strong)', margin: '0 auto' }}></div>
        </div>

        {/* Paper Abstract */}
        <div style={{ 
          background: 'var(--color-paper-dark)', 
          border: '1px solid var(--color-rule)', 
          padding: '24px 32px', 
          borderRadius: '4px',
          margin: '0 0 48px 0' 
        }}>
          <h3 className="font-ui" style={{ 
            fontSize: '11px', 
            fontWeight: '700', 
            textTransform: 'uppercase', 
            letterSpacing: '0.12em', 
            textAlign: 'center', 
            margin: '0 0 12px 0',
            color: 'var(--color-ink)'
          }}>
            Abstract
          </h3>
          <p className="font-body" style={{ 
            fontSize: '13.5px', 
            lineHeight: '1.75', 
            fontStyle: 'italic', 
            textAlign: 'justify',
            margin: 0,
            color: 'var(--color-ink-secondary)'
          }}>
            This paper presents the algorithmic methodology behind the Veritas platform, a computational auditing system designed for public sector procurement in the Philippines. We formalize a dual-layer auditing model that connects upstream statutory vulnerabilities (legislative policy analysis) with downstream operational execution anomalies (procurement case records). We detail the mathematical formulations for fourteen diagnostic compliance checks aligned with the Government Procurement Reform Act (Republic Act 9184) and the New Government Procurement Act (Republic Act 12009). Further, we define a weighted severity risk aggregation model, a five-dimensional corruption risk vector, and a cryptographic citation protocol mapping extracted anomalies back to verifiable coordinates in official source publications. By resolving unstructured tender and statutory texts into structured indices, this framework provides an open-source, reproducible tool for public oversight, journalist investigation, and civic accountability.
          </p>
        </div>

        {/* Section 1: Introduction */}
        <section className={styles.methodologySection}>
          <h2 className={`${styles.sectionTitle} font-ui`}>1. Introduction & Statutory Context</h2>
          <div className={styles.prose}>
            <p className="font-body">
              Public procurement accounts for a substantial percentage of the national budget of developing economies. In the Philippines, the procurement landscape has historically been governed by the Government Procurement Reform Act (GPRA, Republic Act No. 9184), enacted in 2003 to consolidate laws, standardize processes, and introduce competitive public bidding as the default acquisition mechanism. Recently, the New Government Procurement Act (NGPA, Republic Act No. 12009) was legislated to modernize procurement operations, introduce value-for-money metrics, and enhance public observation channels.
            </p>
            <p className="font-body">
              Despite these legislative frameworks, systemic vulnerabilities persist due to two distinct vectors: (1) <strong>Upstream Policy Loopholes</strong>, where statutory texts incorporate overly subjective exception clauses, discretionary bidding thresholds, or vague reporting rules that diminish public accountability, and (2) <strong>Downstream Operational Deviations</strong>, where procuring entities utilize alternative non-competitive methods (e.g., Small Value Procurement, emergency negotiated awards) or timeline compressions to bypass competitive checks.
            </p>
            <p className="font-body">
              Veritas bridges this gap by deploying a computational pipeline that parses, indexes, and audits procurement notices, contract documents, and legal acts. The system operates on a <em>zero-trust verification model</em>: every detected flag must be traceable back to an exact, cryptographically verified source document, preventing false claims and providing an explainable audit trail.
            </p>
          </div>
        </section>

        {/* Section 2: Mathematical Formulations */}
        <section className={styles.methodologySection}>
          <h2 className={`${styles.sectionTitle} font-ui`}>2. Downstream Procurement Audit: The 14 Anomaly Rules</h2>
          <div className={styles.prose}>
            <p className="font-body">
              Downstream operational risk is analyzed by checking every contract award and tender notice against fourteen specialized algorithmic checks. Below, we provide the formal mathematical formulation, operational thresholds, and statutory citations for each rule.
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
                Flags open competitive tenders valued above a critical threshold that yield only a single bidder. A high frequency of single-bid awards indicates potential specification tailoring, pre-arranged collusion, or barrier-to-entry manipulation.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Mathematical Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  R_001(c) = 1 &nbsp;if&nbsp; [ N_bidders(c) = 1 &nbsp;&and;&nbsp; V_award(c) &ge; &theta;_val ]
                  {"\n"}where:
                  {"\n"}  - N_bidders(c) is the count of qualified bidders for case c.
                  {"\n"}  - V_award(c) is the final awarded contract amount in PHP.
                  {"\n"}  - &theta;_val = 10,000,000 PHP (Statutory High-Value Threshold).
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  RA 9184 Section 36 (Governing Single Calculated/Rated Responsive Bid requirements).
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
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Mathematical Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  Let C = &#123; c_i &#125; be a set of contracts executed by Agency A, using SVP or Shopping, where:
                  {"\n"}  - |t(c_i) - t(c_j)| &le; 30 days (Temporal window).
                  {"\n"}  - Category(c_i) = Category(c_j) (Same category code).
                  {"\n"}  - JaroWinkler(Title(c_i), Title(c_j)) &ge; 0.40 (High title overlap).
                  {"\n"}  - &sum; V_award(c_i) &ge; &theta;_split (Aggregate value exceeds limit).
                  {"\n"}R_002(c_i) = 1 &nbsp;for all&nbsp; c_i &in; C. (&theta;_split = 1,000,000 PHP).
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  RA 9184 Section 54.1 & COA Circulars detailing the strict prohibition of budget splitting.
                </p>
              </div>
            </div>

            {/* Rule 3 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-003: Short Advertisement/Posting Window</h3>
                <span className={`${styles.cardPill} font-ui`}>Timeline</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '16px' }}>
                Flags procurement events where the duration between the public advertisement date and the bid closing date falls below the legal minimum, hindering non-collusive external bidding.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Mathematical Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  R_003(c) = 1 &nbsp;if&nbsp; [ t_close(c) - t_publish(c) &lt; &tau;_min(Method(c)) ]
                  {"\n"}where:
                  {"\n"}  - t_close(c) is the timestamp of bid submission closing.
                  {"\n"}  - t_publish(c) is the timestamp of PhilGEPS advertisement publication.
                  {"\n"}  - &tau;_min = 20 calendar days for competitive bidding; 7 days for Shopping/SVP.
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  RA 9184 Section 21.2.1(a) (Advertisement and Posting of Invitation to Bid guidelines).
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
                Flags contracts where the awarded contract amount exceeds the Approved Budget for the Contract (ABC) or the planned budget limit, indicating massive cost projection failures.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Mathematical Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  R_004(c) = 1 &nbsp;if&nbsp; [ V_award(c) &gt; V_abc(c) &times; 1.20 ]
                  {"\n"}where:
                  {"\n"}  - V_award(c) is the final contract amount.
                  {"\n"}  - V_abc(c) is the Approved Budget for the Contract.
                  {"\n"}  - (Note: Standard bids exceeding V_abc are legally disqualified; an overshoot indicates post-qualification inflation).
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  RA 9184 Section 31 (Approved Budget for the Contract serving as the absolute ceiling for bid prices).
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
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Mathematical Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  R_005(c) = 1 &nbsp;if&nbsp; [ &sum; &Delta;V_amendment(c) &gt; V_original(c) &times; &theta;_vo ]
                  {"\n"}where:
                  {"\n"}  - &sum; &Delta;V_amendment(c) is the sum of value increases across all amendment orders.
                  {"\n"}  - V_original(c) is the original contract award value.
                  {"\n"}  - &theta;_vo = 0.10 (10% Statutory cumulative ceiling).
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  RA 9184 Annex E Section 1.3 (Detailing limits and justification requirements for contract Variation Orders).
                </p>
              </div>
            </div>

            {/* Rule 6 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-006: Annual Procurement Plan (APP) Mismatch</h3>
                <span className={`${styles.cardPill} font-ui`}>Transparency</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '16px' }}>
                Flags projects launched dynamically by agencies without corresponding schedule listings in the approved annual plan, highlighting potential off-budget or arbitrary spending.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Mathematical Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  R_006(c) = 1 &nbsp;if&nbsp; [ N_linked_app_items(c) = 0 ]
                  {"\n"}where:
                  {"\n"}  - N_linked_app_items(c) is the count of matches found in the agency's registered APP for fiscal year of t_publish(c).
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  RA 9184 Section 7.2 (No procurement shall be undertaken by any procuring entity unless it is in accordance with the approved APP).
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
                Flags wins by contractors whose commercial registration, history, or industry sector classification falls entirely outside the scope of the bid (e.g., an IT software developer winning a civil building contract).
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Mathematical Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  R_007(c) = 1 &nbsp;if&nbsp; [ Category(c) &notin; Specialties(Supplier(c)) ]
                  {"\n"}where:
                  {"\n"}  - Category(c) represents the PSIC (Philippine Standard Industrial Classification) code of project c.
                  {"\n"}  - Specialties(Supplier(c)) is the set of sector capabilities extracted from the supplier's PCAB licenses or registration profiles.
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  RA 9184 Section 23 (Defining eligibility criteria, financial statements, and technical competence standards).
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
                Detects deviations where the date of issuance for the Notice to Proceed lags significantly behind the Notice of Award, suggesting delayed project kickoffs, bribery negotiations, or contract signing disruptions.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Mathematical Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  R_008(c) = 1 &nbsp;if&nbsp; [ t_ntp(c) - t_award(c) &gt; &theta;_ntp &nbsp;&or;&nbsp; t_ntp(c) &lt; t_award(c) ]
                  {"\n"}where:
                  {"\n"}  - t_ntp(c) is the timestamp of the Notice to Proceed.
                  {"\n"}  - t_award(c) is the timestamp of the Notice of Award.
                  {"\n"}  - &theta;_ntp = 15 calendar days (combined limit of contract signing & approval).
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  RA 9184 Section 37.4.1 (Mandating Notice to Proceed issuance within 7 calendar days from approval of the contract).
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
                Flags completed or awarded tenders that fail to publish the standard Abstract of Bids, preventing independent verify-and-match audits on final pricing calculations.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Mathematical Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  R_009(c) = 1 &nbsp;if&nbsp; [ HasAward(c) = True &nbsp;&and;&nbsp; N_abstract_docs(c) = 0 ]
                  {"\n"}where:
                  {"\n"}  - HasAward(c) indicates if the procurement has transitioned to an award state.
                  {"\n"}  - N_abstract_docs(c) is the count of published Abstract files attached to the PhilGEPS index.
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  RA 9184 Section 37 (Specifying documentation transparency rules).
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
                Flags cases initiated by agencies that currently have outstanding or unresolved notices of suspension, disallowance, or material findings published by the Commission on Audit (COA) for the corresponding fiscal period.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Mathematical Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  R_010(c) = 1 &nbsp;if&nbsp; [ N_coa_findings(Agency(c), Year(t_publish(c))) &gt; 0 ]
                  {"\n"}where:
                  {"\n"}  - N_coa_findings is the count of unresolved adverse observations in the published COA Annual Audit Report.
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  1987 Philippine Constitution Article IX-D Section 2 (Granting the Commission on Audit the authority to define auditing regulations).
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
                Detects severe chronological corruption where a contract award date is officially logged prior to the closing deadline for public bid submission, indicating predetermined selection.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Mathematical Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  R_011(c) = 1 &nbsp;if&nbsp; [ t_award(c) &lt; t_close(c) ]
                  {"\n"}where:
                  {"\n"}  - t_award(c) is the timestamp of Notice of Award publication.
                  {"\n"}  - t_close(c) is the deadline timestamp for bid submission.
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  RA 9184 Section 37 (Outlining the chronological sequence from bid evaluation and post-qualification to award approval).
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
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Mathematical Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  HHI_k = &sum;_&#123;s &in; S_k&#125; ( (V_award(s, k) / V_total(k)) &times; 100 )^2
                  {"\n"}R_012(c) = 1 &nbsp;if&nbsp; [ HHI_&#123;Category(c)&#125; &gt; &theta;_hhi ]
                  {"\n"}where:
                  {"\n"}  - S_k is the set of suppliers winning contracts in category k.
                  {"\n"}  - V_award(s, k) is the sum of awards won by supplier s in category k.
                  {"\n"}  - V_total(k) is the total market volume of category k.
                  {"\n"}  - &theta;_hhi = 2,500 (Highly concentrated market threshold).
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  Philippine Competition Act (RA 10667) & GPPB Anti-Collusion Guidelines.
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
                Detects overpricing by executing statistical outlier checks on specific itemized unit prices against the historical baseline distribution of identical goods across the registry.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '16px', borderRadius: '4px', borderLeft: '3px solid var(--color-flag)' }}>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Mathematical Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  R_013(item) = 1 &nbsp;if&nbsp; [ p_unit(item) &gt; &mu;_k + z &times; &sigma;_k ]
                  {"\n"}where:
                  {"\n"}  - p_unit(item) is the unit price of the audited item.
                  {"\n"}  - &mu;_k is the historical mean unit price of category k.
                  {"\n"}  - &sigma;_k is the standard deviation of category k unit prices.
                  {"\n"}  - z = 2.0 (Confidence coefficient for statistical anomaly).
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  COA Guidelines on detecting overpriced public commodities & Value-for-Money Audits.
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
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginBottom: '8px' }}>Mathematical Model</span>
                <code className="font-mono" style={{ fontSize: '13px', display: 'block', whiteSpace: 'pre-wrap', color: 'var(--color-ink)' }}>
                  R_014(c) = 1 &nbsp;if&nbsp; [ RegCode(c) &notin; AllowedRegions(Supplier(c)) ]
                  {"\n"}where:
                  {"\n"}  - RegCode(c) is the Philippine Standard Geographic Code (PSGC) region of the project.
                  {"\n"}  - AllowedRegions(Supplier(c)) is the set of regions authorized by the supplier's PCAB certificate.
                </code>
                <span className="font-ui" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>Statutory Link</span>
                <p className="font-body" style={{ fontSize: '12.5px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                  Philippine Contractors Accreditation Board (PCAB) License Guidelines & RA 4566.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* Section 3: Risk Score Aggregation */}
        <section className={styles.methodologySection}>
          <h2 className={`${styles.sectionTitle} font-ui`}>3. Case-Level Risk Score Aggregation Model</h2>
          <div className={styles.prose}>
            <p className="font-body">
              Rather than employing a simple count of triggered anomalies—which ignores the variance in severe non-compliance—Veritas utilizes a <strong>Weighted Severity Aggregation Model</strong> ($R(c)$). This model maps case risk to a closed interval $[0.0, 1.0]$.
            </p>
            <p className="font-body">
              Let $F(c)$ be the set of rules that fired on case $c$, and let $W_i$ be the weight associated with the severity level of rule $i$. The aggregated case risk $R(c)$ is defined as:
            </p>

            <div style={{ background: 'var(--color-paper-darker)', padding: '24px', borderRadius: '4px', textAlign: 'center', margin: '20px 0' }}>
              <p className="font-mono" style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px 0', color: 'var(--color-ink)' }}>
                R(c) = min(1.0, &sum;_(i &in; F(c)) W_i)
              </p>
              <p className="font-body" style={{ fontSize: '13px', margin: 0, color: 'var(--color-ink-secondary)' }}>
                Subject to the hard boundary constraint:
              </p>
              <p className="font-mono" style={{ fontSize: '14px', margin: '8px 0 0 0', fontWeight: 'bold', color: 'var(--color-flag)' }}>
                R(c) &ge; 0.80 &nbsp;if&nbsp; &#123; i &in; F(c) | Severity(i) = &apos;critical&apos; &#125; &ne; &empty;
              </p>
            </div>

            <p className="font-body">
              The severity levels and their corresponding scalar weights ($W_i$) are defined below:
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', marginTop: '16px', marginBottom: '24px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-rule-strong)', background: 'var(--color-paper-dark)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }} className="font-ui">Severity Level</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px' }} className="font-ui">Weight ($W_i$)</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px' }} className="font-ui">Auditing Operational Definition</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--color-critical)', fontWeight: 'bold' }} className="font-mono">🛑 Critical</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold' }} className="font-mono">1.0</td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-ink-secondary)' }} className="font-body">
                    Severe, categorical timeline or procedural breach that establishes prima facie evidence of pre-selection (e.g., RULE-011: Award Before Bid Deadline).
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--color-flag)', fontWeight: 'bold' }} className="font-mono">🟠 High</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold' }} className="font-mono">0.6</td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-ink-secondary)' }} className="font-body">
                    Substantial competition bypass or financial outlier indicating active evasion of competitive checks (e.g., RULE-002: Budget Splitting, RULE-005: Variation Order Abuse).
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--color-medium)', fontWeight: 'bold' }} className="font-mono">🟡 Medium</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold' }} className="font-mono">0.3</td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-ink-secondary)' }} className="font-body">
                    Timeline and posting compressions or procedural gaps (e.g., RULE-003: Short Posting Window, RULE-008: Late Notice to Proceed).
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--color-confirm)', fontWeight: 'bold' }} className="font-mono">🔵 Low</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold' }} className="font-mono">0.1</td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-ink-secondary)' }} className="font-body">
                    Minor reporting delays, minor registry discrepancies, or secondary cross-referenced indicators.
                  </td>
                </tr>
              </tbody>
            </table>

            <h3 className="font-ui" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-ink)', margin: '32px 0 12px 0' }}>
              The Five-Dimensional Compliance Vector (V_risk)
            </h3>
            <p className="font-body" style={{ margin: '0 0 16px 0' }}>
              To categorize the type of risk rather than just its severity, every case is mapped to a column vector representing five distinct risk domains:
            </p>
            <div style={{ background: 'var(--color-paper-darker)', padding: '16px 24px', borderRadius: '4px', margin: '16px 0' }} className="font-mono">
              V_risk = [ C_comp, C_time, C_fin, C_trans, C_compl ]^T
            </div>
            <p className="font-body">
              The individual dimension scores are computed as the maximum weight of the rules triggered within that specific domain:
            </p>
            <ul className="font-body" style={{ paddingLeft: '20px', lineHeight: '1.8', color: 'var(--color-ink-secondary)' }}>
              <li><strong>Competition (C_comp):</strong> Max severity weight of &#123;RULE-001, RULE-007, RULE-012&#125;.</li>
              <li><strong>Timeline (C_time):</strong> Max severity weight of &#123;RULE-003, RULE-008, RULE-011&#125;.</li>
              <li><strong>Financial (C_fin):</strong> Max severity weight of &#123;RULE-002, RULE-004, RULE-005, RULE-013&#125;.</li>
              <li><strong>Transparency (C_trans):</strong> Max severity weight of &#123;RULE-006, RULE-009&#125;.</li>
              <li><strong>Compliance (C_compl):</strong> Max severity weight of &#123;RULE-010, RULE-014&#125;.</li>
            </ul>
          </div>
        </section>

        {/* Section 4: AI Statutory Indexing */}
        <section className={styles.methodologySection}>
          <h2 className={`${styles.sectionTitle} font-ui`}>4. Upstream Legislative Vulnerability Auditing</h2>
          <div className={styles.prose}>
            <p className="font-body">
              To identify systemic vulnerabilities prior to operational procurement phases, Veritas audits statutory legal texts (such as Republic Acts, Executive Orders, and GPPB Implementing Rules and Regulations) utilizing legal LLMs (DeepSeek V3 / GPT-4o-mini). The model parses legal sections to compute two core indices.
            </p>

            <div className={styles.methodologyGrid}>
              
              <div className={styles.methodologyCard}>
                <div className={styles.cardHeader}>
                  <h3 className={`${styles.cardTitle} font-ui`}>Integrity Index ($I_L$)</h3>
                  <span className={`${styles.cardPill} ${styles.cardPillBlue} font-ui`}>Statutory Tightness</span>
                </div>
                <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '12px' }}>
                  Measures the legislative resistance to loopholes. Broadly worded exemption clauses, discretionary authority grants without checks, or subjective emergency qualifications reduce the score.
                </p>
                <div style={{ background: 'var(--color-paper-darker)', padding: '12px', borderRadius: '4px', fontSize: '12.5px' }} className="font-mono">
                  I_L = max( 0, 100 - &sum;_(i &in; Loopholes) w_i )
                  {"\n"}where loophole weights w_i are:
                  {"\n"}  - Critical Loophole: 20
                  {"\n"}  - High Risk Loophole: 15
                  {"\n"}  - Medium Risk Loophole: 8
                  {"\n"}  - Low Risk Loophole: 3
                </div>
              </div>

              <div className={styles.methodologyCard}>
                <div className={styles.cardHeader}>
                  <h3 className={`${styles.cardTitle} font-ui`}>Oversight Score ($O_L$)</h3>
                  <span className={`${styles.cardPill} ${styles.cardPillBlue} font-ui`}>Governance Strength</span>
                </div>
                <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '12px' }}>
                  Evaluates the presence of positive accountability criteria defined explicitly in the legal text, such as monitoring mandates, public disclosures, and observation channels.
                </p>
                <div style={{ background: 'var(--color-paper-darker)', padding: '12px', borderRadius: '4px', fontSize: '12.5px' }} className="font-mono">
                  O_L = &sum;_(j &in; Factors) f_j
                  {"\n"}where oversight factors f_j are:
                  {"\n"}  - CS Observers Mandated: +25
                  {"\n"}  - Open Data Publishing Required: +25
                  {"\n"}  - Explicit Punitive/Penal Clauses: +25
                  {"\n"}  - Independent Audits Mandated: +25
                </div>
              </div>

            </div>

            <h3 className="font-ui" style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-ink)', margin: '24px 0 10px' }}>
              Loophole Severity Classification
            </h3>
            <ul className="font-body" style={{ paddingLeft: '20px', lineHeight: '1.8', color: 'var(--color-ink-secondary)' }}>
              <li>
                <strong>Critical (Weight = 20):</strong> Structural provisions allowing complete circumvention of competitive public bidding without requiring BAC (Bids and Awards Committee) resolutions or alternative registry postings.
              </li>
              <li>
                <strong>High (Weight = 15):</strong> Subjective clauses granting discretionary powers to heads of procuring entities (HOPE) to approve exceptions based on undefined parameters (e.g., &quot;in the interest of the service&quot;).
              </li>
              <li>
                <strong>Medium (Weight = 8):</strong> Weak transparency rules, such as allowing paper-only bidding submissions or delaying contract publication beyond standard 30-day limits.
              </li>
              <li>
                <strong>Low (Weight = 3):</strong> Minor administrative ambiguities, outdated terminology, or references to deprecated departments.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 5: Data Provenance */}
        <section className={styles.methodologySection}>
          <h2 className={`${styles.sectionTitle} font-ui`}>5. Data Provenance & Verification Protocol</h2>
          <div className={styles.prose}>
            <p className="font-body">
              To guarantee that all computed metrics represent verifiable facts, Veritas implements a cryptographic citation protocol called <strong>Visual Provenance Tracking</strong>. This prevents arbitrary AI hallucinations or database corruptions.
            </p>
            <p className="font-body">
              Every data node parsed into the database is anchored to an immutable coordinate object defined as:
            </p>
            <div style={{ background: 'var(--color-paper-darker)', padding: '16px 24px', borderRadius: '4px', margin: '16px 0' }} className="font-mono">
              Provenance(x) = &#123; SHA256(Doc), Page_Number, Char_Start, Char_End &#125;
            </div>
            <p className="font-body">
              When an analyst views a case anomaly or a statutory controversy on the portal, the frontend retrieves the coordinate object, downloads the SHA-256 hashed text or PDF document from the decentralized/local document storage (PocketBase), and renders the highlighted target string. This ensures absolute reproducibility of all findings.
            </p>
          </div>
        </section>

        {/* Section 6: References */}
        <section className={styles.methodologySection} style={{ borderTop: '1px solid var(--color-rule-strong)', paddingTop: '32px', marginTop: '64px' }}>
          <h2 className="font-ui" style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-ink)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px' }}>
            References & Standards
          </h2>
          <div className="font-body" style={{ fontSize: '13px', lineHeight: '1.75', color: 'var(--color-ink-muted)' }}>
            <p style={{ marginBottom: '12px', textAlign: 'justify', textIndent: '-24px', paddingLeft: '24px' }}>
              [1] Fazekas, M., Tóth, I. J., & King, L. P. (2016). Anatomy of grand corruption: A composite corruption risk index in public procurement. <em>International Journal of Public Administration</em>, 39(13), 1056-1070.
            </p>
            <p style={{ marginBottom: '12px', textAlign: 'justify', textIndent: '-24px', paddingLeft: '24px' }}>
              [2] OECD. (2021). <em>Preventing Corruption in Public Procurement: Advisory Standards for Transparency and Auditability</em>. OECD Publishing.
            </p>
            <p style={{ marginBottom: '12px', textAlign: 'justify', textIndent: '-24px', paddingLeft: '24px' }}>
              [3] Government Procurement Policy Board (GPPB). (2003). <em>Implementing Rules and Regulations of Republic Act No. 9184</em>. National Printing Office.
            </p>
            <p style={{ marginBottom: '12px', textAlign: 'justify', textIndent: '-24px', paddingLeft: '24px' }}>
              [4] Commission on Audit (COA). (2020). <em>Guide on the Audit of Procurement Contracts and Financial Transactions</em>. Commonwealth Ave., Quezon City.
            </p>
            <p style={{ marginBottom: '12px', textAlign: 'justify', textIndent: '-24px', paddingLeft: '24px' }}>
              [5] World Bank. (2018). <em>Procurement Guidance: Risk Mitigation and Detection of Collusive Tendering Patterns</em>. World Bank Group.
            </p>
          </div>
        </section>

      </main>
    </div>
  );
}
