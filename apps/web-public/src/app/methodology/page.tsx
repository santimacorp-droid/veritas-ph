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
          {['Cases', 'Agencies', 'Suppliers', 'Scorecard', 'Map', 'Laws', 'Methodology', 'About'].map((item) => (
            <Link
              key={item}
              href={`/${item.toLowerCase() === 'scorecard' ? 'scorecard' : item.toLowerCase() === 'map' ? 'map' : item.toLowerCase()}`}
              className={`${styles.navLink} ${item === 'Methodology' ? styles.navActive : ''} font-ui`}
            >
              {item}
            </Link>
          ))}
        </nav>
      </header>

      <main className={styles.pageContent} style={{ maxWidth: '960px' }}>
        <div className={styles.pageHead}>
          <h1 className={`${styles.pageTitle} font-display`}>System Methodology</h1>
          <p className={`${styles.pageSubtitle} font-ui`}>
            Rigorous mathematical auditing formulas, risk models, and legislative AI scoring mechanics
          </p>
        </div>

        <div className={styles.prose}>
          <p className="font-body" style={{ fontSize: '16px' }}>
            Veritas operates on a zero-trust, rule-based procurement auditing framework combined with automated natural language processing (NLP) and LLM-based legislative vulnerability scans. This page provides the formal, mathematical, and statutory definitions of the metrics and scoring engines deployed across the public portal.
          </p>
        </div>

        {/* ─── SECTION 1: PROCUREMENT ANOMALY ENGINE ─── */}
        <section className={styles.methodologySection}>
          <h2 className={`${styles.sectionTitle} font-ui`}>1. Procurement Anomaly Engine (14 Key Audit Rules)</h2>
          <p className="font-body" style={{ color: 'var(--color-ink-secondary)', marginBottom: '24px' }}>
            The risk engine processes ingestion batches of PhilGEPS contract awards and tender events. Fourteen specialized mathematical audits run on every case record to detect anomaly patterns.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Rule 1 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-001: Single Bidder on High-Value Contract</h3>
                <span className={`${styles.cardPill} font-ui`}>Competition Risk</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '12px' }}>
                Flags high-value procurement projects that result in a single bidding participant. In large tenders, a lack of multiple bids strongly correlates with tailored specifications or collusive bid suppression.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '12px 16px', borderRadius: '4px', fontSize: '12.5px' }} className="font-mono">
                <strong>Formula:</strong> (Bidders Count == 1 OR Single Bidder == True) AND Contract Value &ge; 10,000,000 PHP<br />
                <strong>Legal Reference:</strong> RA 9184 / RA 12009 Section 36 (Single Calculated Responsive Bid)
              </div>
            </div>

            {/* Rule 2 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-002: Potential Budget Splitting</h3>
                <span className={`${styles.cardPill} font-ui`}>Financial / Transparency Risk</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '12px' }}>
                Detects instances where an agency splits a large purchase into multiple small-value or non-competitive contracts (e.g. SVP, Shopping) to bypass the statutory threshold requiring public open bidding.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '12px 16px', borderRadius: '4px', fontSize: '12.5px' }} className="font-mono">
                <strong>Formula:</strong> Let C_i be contracts within &plusmn;30 days by the same Agency, same Category, using SVP/Shopping. If StringSimilarity(Title_A, Title_B) &gt; 0.40 AND &sum; Value(C_i) &ge; 1,000,000 PHP.<br />
                <strong>Legal Reference:</strong> RA 9184 Section 54.1 & COA Circulars prohibiting splitting of contracts.
              </div>
            </div>

            {/* Rule 3 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-003: Short Posting Window</h3>
                <span className={`${styles.cardPill} font-ui`}>Procedural Risk</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '12px' }}>
                Flags tenders that close bids after an active advertisement duration shorter than the legal minimum, restricting the ability of non-pre-selected suppliers to prepare proposals.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '12px 16px', borderRadius: '4px', fontSize: '12.5px' }} className="font-mono">
                <strong>Formula:</strong> Posting Window (Days) = Closing Date - Date Published &lt; Method Posting Threshold (e.g. 20 Days for Public Bidding, 7 Days for Shopping/SVP)<br />
                <strong>Legal Reference:</strong> RA 9184 Section 21.2.1(a) (Notice Posting Minimum limits per method)
              </div>
            </div>

            {/* Rule 4 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-004: Award-to-Budget Overshoot</h3>
                <span className={`${styles.cardPill} font-ui`}>Financial Risk</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '12px' }}>
                Flags contract awards or final contract valuations that significantly exceed the planned procurement budget (Approved Budget for the Contract / ABC).
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '12px 16px', borderRadius: '4px', fontSize: '12.5px' }} className="font-mono">
                <strong>Formula:</strong> Award Value &gt; Planned Budget (ABC) &times; 1.20 (Overshoot &gt; 20%)<br />
                <strong>Legal Reference:</strong> RA 9184 Section 31 (ABC serves as the ceiling for bid prices)
              </div>
            </div>

            {/* Rule 5 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-005: Variation Order Abuse</h3>
                <span className={`${styles.cardPill} font-ui`}>Financial Risk</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '12px' }}>
                Surfaces contracts that undergo massive changes or scope extensions post-award, which is a common pathway to inflate project costs after bypassing initial competitive scrutiny.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '12px 16px', borderRadius: '4px', fontSize: '12.5px' }} className="font-mono">
                <strong>Formula:</strong> Any Single Amendment Value Change &gt; Original Contract Amount &times; 0.10 (VO &gt; 10%)<br />
                <strong>Legal Reference:</strong> RA 9184 Annex E Section 1.3 (Cumulative Variation Orders capped at 10%)
              </div>
            </div>

            {/* Rule 6 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-006: APP-Tender Mismatch</h3>
                <span className={`${styles.cardPill} font-ui`}>Transparency Risk</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '12px' }}>
                Flags procurement projects initiated without a matching scheduled item in the agency&apos;s Annual Procurement Plan (APP), signaling unscheduled, discretionary expenditure.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '12px 16px', borderRadius: '4px', fontSize: '12.5px' }} className="font-mono">
                <strong>Formula:</strong> Match Count(linked_app_items) == 0<br />
                <strong>Legal Reference:</strong> RA 9184 Section 7.2 (No procurement shall be undertaken unless in accordance with the APP)
              </div>
            </div>

            {/* Rule 7 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-007: Unrelated Supplier Win</h3>
                <span className={`${styles.cardPill} font-ui`}>Competition Risk</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '12px' }}>
                Detects wins by suppliers whose corporate profile, business registrations, or historically tracked categories do not align with the category of the awarded project (e.g., a pharmaceutical trading company winning a bridge construction contract).
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '12px 16px', borderRadius: '4px', fontSize: '12.5px' }} className="font-mono">
                <strong>Formula:</strong> (Category == Infrastructure AND Supplier specializes in Healthcare/Trading) OR (Category == Goods/Vaccines AND Supplier specializes in Construction)<br />
                <strong>Legal Reference:</strong> RA 9184 Section 23 (Eligibility Criteria for Goods, Infrastructure, and Consulting)
              </div>
            </div>

            {/* Rule 8 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-008: Late Notice to Proceed (NTP)</h3>
                <span className={`${styles.cardPill} font-ui`}>Timeline Risk</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '12px' }}>
                Flags projects where the Notice to Proceed is delayed beyond legal time boundaries, which often indicates informal renegotiations, mobilization failures, or delayed kickbacks.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '12px 16px', borderRadius: '4px', fontSize: '12.5px' }} className="font-mono">
                <strong>Formula:</strong> Notice to Proceed Date - Notice of Award Date &gt; 15 Calendar Days OR NTP Date &lt; Notice of Award Date<br />
                <strong>Legal Reference:</strong> RA 9184 Section 37.4.1 (NTP issuance deadline of 15 calendar days from contract approval)
              </div>
            </div>

            {/* Rule 9 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-009: Missing Bid Abstract</h3>
                <span className={`${styles.cardPill} font-ui`}>Transparency Risk</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '12px' }}>
                Flags contracts marked as awarded or active that do not contain a published Abstract of Bids as required by law. The abstract is the primary evidence of fair price comparison.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '12px 16px', borderRadius: '4px', fontSize: '12.5px' }} className="font-mono">
                <strong>Formula:</strong> Has Award Date == True AND Abstract Documents Count == 0<br />
                <strong>Legal Reference:</strong> RA 9184 / RA 12009 Section 37 (Notice of Award transparency requirements)
              </div>
            </div>

            {/* Rule 10 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-010: Active COA Audit Findings</h3>
                <span className={`${styles.cardPill} font-ui`}>Compliance Risk</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '12px' }}>
                Cross-references procuring agencies with published annual Commission on Audit (COA) audit findings. Procurement during fiscal years with open audit notices carries elevated systemic risk.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '12px 16px', borderRadius: '4px', fontSize: '12.5px' }} className="font-mono">
                <strong>Formula:</strong> Active COA Audit Findings for Agency_ID in Fiscal Year of Award Date &gt; 0<br />
                <strong>Legal Reference:</strong> 1987 Philippine Constitution Article IX-D (COA Audits) & Government Auditing Code
              </div>
            </div>

            {/* Rule 11 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-011: Award Before Bid Deadline</h3>
                <span className={`${styles.cardPill} font-ui`}>Timeline Risk</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '12px' }}>
                Flags cases where the contract or award date occurs prior to the official bid closing deadline. This represents a severe integrity violation, suggesting pre-selection or premature award before competition closes.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '12px 16px', borderRadius: '4px', fontSize: '12.5px' }} className="font-mono">
                <strong>Formula:</strong> Award Date &lt; Bid Deadline<br />
                <strong>Legal Reference:</strong> RA 9184 Section 37 (Award timeline regulations)
              </div>
            </div>

            {/* Rule 12 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-012: HHI Market Concentration Anomaly</h3>
                <span className={`${styles.cardPill} font-ui`}>Competition Risk</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '12px' }}>
                Calculates the Herfindahl-Hirschman Index (HHI) for the specific agency and category within the fiscal year. High concentration indicates potential monopoly, collusive bidder rotation, or cartels.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '12px 16px', borderRadius: '4px', fontSize: '12.5px' }} className="font-mono">
                <strong>Formula:</strong> HHI = &sum; (Market Share %)^2 &gt; 2,500<br />
                <strong>Legal Reference:</strong> Philippine Competition Act (RA 10667) & GPPB Anti-Collusion Guidelines
              </div>
            </div>

            {/* Rule 13 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-013: Price Benchmark Anomaly</h3>
                <span className={`${styles.cardPill} font-ui`}>Financial Risk</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '12px' }}>
                Audits line-item unit prices against historical statistical averages for identical goods/services within the same procurement category. Flags items priced significantly above market baseline.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '12px 16px', borderRadius: '4px', fontSize: '12.5px' }} className="font-mono">
                <strong>Formula:</strong> Unit Price &gt; Historical Mean + 2 &times; Standard Deviation<br />
                <strong>Legal Reference:</strong> COA Guidelines on Overpricing & Value-for-Money Audits
              </div>
            </div>

            {/* Rule 14 */}
            <div className={styles.methodologyCard}>
              <div className={styles.cardHeader}>
                <h3 className={`${styles.cardTitle} font-ui`}>RULE-014: Geographic Mismatch</h3>
                <span className={`${styles.cardPill} font-ui`}>Compliance / Procedural Risk</span>
              </div>
              <p className={`${styles.cardBody} font-body`} style={{ marginBottom: '12px' }}>
                Compares the geographic location of the project against the registered business operation geography codes of the awarded supplier. Flags infrastructure projects awarded to distant, unaccredited entities.
              </p>
              <div style={{ background: 'var(--color-paper-darker)', padding: '12px 16px', borderRadius: '4px', fontSize: '12.5px' }} className="font-mono">
                <strong>Formula:</strong> Project Location not in Supplier Geographic Codes<br />
                <strong>Legal Reference:</strong> PCAB (Philippine Contractors Accreditation Board) License Regulations
              </div>
            </div>

          </div>
        </section>

        {/* ─── SECTION 2: CASE RISK SCORING MODEL ─── */}
        <section className={styles.methodologySection}>
          <h2 className={`${styles.sectionTitle} font-ui`}>2. Case-Level Risk Score Aggregation Model</h2>
          <div className={styles.prose}>
            <p className="font-body">
              Veritas calculates case risk using a **weighted severity scoring model** ($R$) based on the individual severity of active discrepancies that fired on a case. This represents standard auditing practice where risks are weighted proportionally to their potential compliance and financial damage, rather than simple counts.
            </p>

            <div style={{ background: 'var(--color-paper-darker)', padding: '20px', borderRadius: '4px', margin: '16px 0' }}>
              <h4 className="font-ui" style={{ margin: '0 0 12px 0' }}>Formula:</h4>
              <p className="font-mono" style={{ fontSize: '14px', marginBottom: '16px' }}>
                R = min(1.0, &sum; W_i)
              </p>
              <p className="font-body" style={{ fontSize: '13.5px', marginBottom: '16px' }}>
                If any **Critical** severity rule triggers, the final risk score is constrained to be &ge; 0.80.
              </p>
              <h4 className="font-ui" style={{ margin: '0 0 12px 0' }}>Discrepancy Severity Weights:</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }} className="font-mono">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-rule-strong)' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Discrepancy Severity</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Weight ($W_i$)</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
                    <td style={{ padding: '8px', color: 'var(--color-critical)' }}><strong>Critical</strong></td>
                    <td style={{ padding: '8px' }}>1.0</td>
                    <td style={{ padding: '8px' }}>Severe statutory violation (e.g. Award Before Bid Deadline). Forces the final risk score to be &ge; 0.80.</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
                    <td style={{ padding: '8px', color: 'var(--color-flag)' }}><strong>High</strong></td>
                    <td style={{ padding: '8px' }}>0.6</td>
                    <td style={{ padding: '8px' }}>Significant competition or budget anomaly (e.g. Budget Splitting).</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
                    <td style={{ padding: '8px', color: 'var(--color-medium)' }}><strong>Medium</strong></td>
                    <td style={{ padding: '8px' }}>0.3</td>
                    <td style={{ padding: '8px' }}>Procedural deviation (e.g. Short Posting Window).</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', color: 'var(--color-confirm)' }}><strong>Low</strong></td>
                    <td style={{ padding: '8px' }}>0.1</td>
                    <td style={{ padding: '8px' }}>Minor timeline delay or non-critical finding.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="font-ui" style={{ fontSize: '18px', margin: '24px 0 10px' }}>Risk Component Vector {"($V_{risk}$)"}:</h3>
            <p className="font-body">
              Every analyzed case records a five-dimensional risk component vector representing different corruption pathways:
              {"$$V_{risk} = [C_{comp}, C_{time}, C_{fin}, C_{trans}, C_{compl}]$$"}
              Where each component is assigned a severity-scaled value from triggered rules:
            </p>
            <ul className="font-body" style={{ margin: '0 0 16px 20px', padding: 0 }}>
              <li style={{ marginBottom: '6px' }}><strong>Competition {"($C_{comp}$)"}</strong> = Max severity weight of (RULE-001, RULE-007, RULE-012); else 0.1</li>
              <li style={{ marginBottom: '6px' }}><strong>Timeline {"($C_{time}$)"}</strong> = Max severity weight of (RULE-003, RULE-008, RULE-011); else 0.1</li>
              <li style={{ marginBottom: '6px' }}><strong>Financial {"($C_{fin}$)"}</strong> = Max severity weight of (RULE-002, RULE-004, RULE-005, RULE-013); else 0.1</li>
              <li style={{ marginBottom: '6px' }}><strong>Transparency {"($C_{trans}$)"}</strong> = Max severity weight of (RULE-006, RULE-009); else 0.1</li>
              <li style={{ marginBottom: '6px' }}><strong>Compliance {"($C_{compl}$)"}</strong> = Max severity weight of (RULE-010, RULE-014); else 0.1</li>
            </ul>
          </div>
        </section>

        {/* ─── SECTION 3: LEGISLATIVE AUDITING FRAMEWORK ─── */}
        <section className={styles.methodologySection} style={{ marginBottom: '64px' }}>
          <h2 className={`${styles.sectionTitle} font-ui`}>3. Legislative Vulnerability Audit (AI Scoring Model)</h2>
          <div className={styles.prose}>
            <p className="font-body">
              To address corruption upstream, the platform audits statutory legal texts using legal LLMs (DeepSeek V3 / GPT-4o-mini). The AI model scores two primary indices for every analyzed law:
            </p>

            <div className={styles.methodologyGrid}>
              <div className={styles.methodologyCard}>
                <div className={styles.cardHeader}>
                  <h3 className={`${styles.cardTitle} font-ui`}>Integrity Index {"($I_L$)"}</h3>
                  <span className={`${styles.cardPill} ${styles.cardPillBlue} font-ui`}>Statutory Score</span>
                </div>
                <p className={`${styles.cardBody} font-body`}>
                  Measures how **loophole-free** and enforceable the law&apos;s text is. Laws with subjective exemption clauses, vague procurement categories, or discretionary authorization powers receive a low Integrity Index.
                  <br /><br />
                  {"$$I_L = 100 - \\sum (Vulnerability\\_Weight_i)$$" }
                  Where Vulnerability Weights are: Critical Loophole (-20), High (-15), Medium (-8), Low (-3). Capped at a minimum of 0.
                </p>
              </div>

              <div className={styles.methodologyCard}>
                <div className={styles.cardHeader}>
                  <h3 className={`${styles.cardTitle} font-ui`}>Oversight Score {"($O_L$)"}</h3>
                  <span className={`${styles.cardPill} ${styles.cardPillBlue} font-ui`}>Governance Score</span>
                </div>
                <p className={`${styles.cardBody} font-body`}>
                  Evaluates the presence and clarity of **monitoring mechanisms, public reporting requirements, civil society observer roles, and legal penalties** within the law.
                  <br /><br />
                  {"$$O_L = \\sum (Oversight\\_Factor_j)$$" }
                  Where Oversight Factors are: Explicit CS Observers (+25), Open Data Reporting (+25), Clear Penal Clauses (+25), Independent Auditing Mandate (+25). Capped at a maximum of 100.
                </p>
              </div>
            </div>

            <h3 className="font-ui" style={{ fontSize: '18px', margin: '24px 0 10px' }}>Loophole Classification Standards:</h3>
            <p className="font-body">
              Surfaced loopholes are classified into severity levels based on their risk profile:
            </p>
            <ul className="font-body" style={{ margin: '0 0 16px 20px', padding: 0 }}>
              <li style={{ marginBottom: '8px' }}>
                <strong>Critical Risk</strong>: Exemption rules that allow complete bypass of competitive bidding without public recording.
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>High Risk</strong>: Subjective parameters (e.g. &ldquo;highly exceptional conditions&rdquo;) without defining approval bodies.
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Medium Risk</strong>: Weak public reporting frequencies (e.g. annual reports instead of real-time OCDS updates).
              </li>
              <li>
                <strong>Low Risk</strong>: Procedural ambiguities or minor document translation inconsistencies.
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
