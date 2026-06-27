/**
 * DiscrepancyCard — The core UI element of Veritas.
 * Every field maps to a discrepancy record from the DB.
 */
import styles from './DiscrepancyCard.module.css';
import { Discrepancy, Severity } from '@veritas/types';

export interface DiscrepancyCardProps extends Discrepancy {
  /** Show analyst action buttons (analyst console only) */
  isAnalyst?: boolean;
  onConfirm?: (id: string) => void;
  onReject?: (id: string) => void;
  onNeedsEvidence?: (id: string) => void;
  onPublish?: (id: string) => void;
}

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const DISCLAIMER =
  'This is an audit anomaly flag based on statistical patterns in public procurement records. ' +
  'It is not a legal determination or accusation of wrongdoing. Human review is required before publication.';

const KEY_LABEL_MAPPING: Record<string, string> = {
  single_bidder: 'Single Bidder Detected',
  bidders_count: 'Number of Participating Bidders',
  awarded_amount: 'Awarded Amount',
  planned_amount: 'Planned Budget (APP)',
  budget_amount: 'Approved Budget (ABC)',
  variance_percent: 'Budget Variance Percentage',
  bid_window_days: 'Bidding Opportunity Window (Days)',
  min_bid_window_days: 'Required Bidding Window (Days)',
  variation_order_count: 'Number of Variation Orders',
  time_elapsed_days: 'Days Between Award and NTP',
  unrelated_supplier: 'Supplier Category Mismatch',
  missing_bid_abstract: 'Missing Bid Abstract Document',
  active_coa_findings: 'Active COA Audit Findings',
  overshoot_detected: 'Award Budget Exceeded',
  late_ntp: 'Late Notice to Proceed',
};

interface GuideEntry {
  title: string;
  statute: string;
  implication: string;
  action: string;
}

const RULE_GUIDES: Record<string, GuideEntry> = {
  'RULE-001': {
    title: 'Single Bidder on High-Value Contract',
    statute: 'RA 9184 Section 36 allows a Single Calculated/Rated Responsive Bid (SCRB) under limited conditions. However, constant single-bidder scenarios indicate lack of active competition.',
    implication: 'When only one supplier participates, there is no price competition, which often leads to higher public procurement costs. It can also point to "tailored specs"—technical requirements drafted specifically to favor one provider and disqualify others.',
    action: 'Review the technical specifications in the Bidding Documents. Search for restrictive criteria (such as proprietary brands or narrow experience requirements) that might have shut out other competitive suppliers.'
  },
  'RULE-002': {
    title: 'Negotiated Procurement / Budget Splitting',
    statute: 'RA 9184 Sections 53 & 54.1 prohibit budget splitting (dividing large projects to bypass bidding thresholds) and restrict Alternative Methods (like Shopping or Negotiated Procurement) to highly exceptional circumstances.',
    implication: 'Alternative methods bypass competitive public bidding, dramatically reducing transparency and public oversight. Overusing emergency negotiated procurement or splitting contracts increases vulnerability to collusion, kickbacks, and inflated pricing.',
    action: 'Verify if a legitimate emergency existed that justified skipping competitive bidding. Review the Bids and Awards Committee (BAC) resolution justifying the alternative procurement method.'
  },
  'RULE-003': {
    title: 'Short Posting Window',
    statute: 'RA 9184 Section 21.2.1 mandates that advertisements/posting of invitations to bid must remain active on PhilGEPS for a minimum period (usually 7 to 14 calendar days) depending on the project type.',
    implication: 'Shortening the posting window restricts other competitive suppliers from preparing high-quality, cost-efficient bids. This often favors pre-selected contractors who had advance knowledge of the tender.',
    action: 'Check the publication date on PhilGEPS vs. the bid submission deadline to verify if the minimum calendar days were met.'
  },
  'RULE-004': {
    title: 'Award-to-Budget Overshoot',
    statute: 'RA 9184 Section 31 states that the Approved Budget for the Contract (ABC) shall be the upper limit or ceiling for bid prices. No contract shall be awarded at a price exceeding the ABC.',
    implication: 'Awarding a contract above the approved budget violates statutory ceilings, indicating either unauthorized budget expansion, poor financial control, or potential inflation of contract costs.',
    action: 'Examine the contract award value against the original ABC published in the invitation to bid. Look for any subsequent budget revisions or supplementary allocations.'
  },
  'RULE-005': {
    title: 'Variation Order Abuse',
    statute: 'RA 9184 Annex E Section 1.3 limits variation orders (additions/amendments) to a cumulative maximum of 10% of the original contract price, except under extreme emergency/geological conditions.',
    implication: 'Contractors sometimes submit artificially low bids to win the public tender, then use subsequent "Variation Orders" (amendments/change orders) to inflate the final payout. This bypasses the original competitive bid price.',
    action: 'Check the total value of all variation orders against the original awarded contract value to see if the cumulative addition exceeds 10%.'
  },
  'RULE-006': {
    title: 'APP-Tender Mismatch',
    statute: 'RA 9184 Section 7.2 dictates that no procurement shall be undertaken unless it is in accordance with the approved Annual Procurement Plan (APP) of the procuring entity.',
    implication: 'Tendering contracts that do not link to any approved item in the APP suggests ad-hoc, unplanned spending. This lacks strategic alignment and could indicate emergency bypasses or unauthorized projects.',
    action: 'Search the agency\'s published APP for the corresponding procurement project and verify if the timeline and budget line item align.'
  },
  'RULE-007': {
    title: 'Unrelated Supplier Win',
    statute: 'RA 9184 Section 23 requires that eligible bidders must possess the legal, technical, and financial capability, including the appropriate business license/registration matching the project scope.',
    implication: 'When a supplier wins a contract completely outside their registered business scope (e.g., a catering company winning an infrastructure road project), it is a major red flag for shell companies, fronting, or political favoritism.',
    action: 'Look up the winning contractor\'s business registrations (SEC, DTI, or PCAB license) and check their primary line of business.'
  },
  'RULE-008': {
    title: 'Late Notice to Proceed (NTP)',
    statute: 'RA 9184 Section 37.4.1 requires the procuring entity to issue the Notice to Proceed (NTP) within 7 calendar days from the date of approval of the contract.',
    implication: 'Long delays between the award/contract signing and the NTP can indicate stalling, negotiation of terms post-facto, or contractor inability to mobilize, which risks project completion delays.',
    action: 'Compare the contract approval date with the NTP issuance date to measure the days elapsed.'
  },
  'RULE-009': {
    title: 'Missing Bid Abstract',
    statute: 'RA 9184 Section 37 mandates the posting of the Abstract of Bids as calculated on the PhilGEPS portal alongside the Notice of Award to ensure transparency in bid evaluation.',
    implication: 'Failing to publish the Abstract of Bids hides competitor bid amounts, preventing verification of whether the winning bid was truly the lowest calculated responsive bid.',
    action: 'Request the BAC to release the Abstract of Bids and cross-check the submitted bid prices of all participating suppliers.'
  },
  'RULE-010': {
    title: 'Active COA Audit Findings',
    statute: 'The 1987 Philippine Constitution Art. IX-D empowers the Commission on Audit (COA) to audit all government expenditures. Unresolved COA audit findings indicate financial non-compliance.',
    implication: 'Executing new large contracts under an agency that has active, unresolved COA findings (e.g. suspension, disallowance, or adverse opinions) increases the risk of repeating financial anomalies.',
    action: 'Search the Commission on Audit (COA) database for the agency\'s Annual Audit Report (AAR) for the relevant fiscal year.'
  },
  'RULE-011': {
    title: 'Award Before Bid Deadline',
    statute: 'RA 9184 Section 37 dictates that the contract award can only be made after the bid evaluation and post-qualification processes are fully completed, which must happen after the bid submission deadline.',
    implication: 'Awarding a contract before the bid submission deadline has closed is a critical anomaly. It indicates that the winner was pre-determined and the entire public bidding process was a sham.',
    action: 'Compare the timestamp of the Notice of Award with the closing date/time of the bid invitation.'
  },
  'RULE-012': {
    title: 'HHI Market Concentration Anomaly',
    statute: 'The Philippine Competition Act (RA 10667) prohibits anti-competitive agreements, cartels, and abuse of dominant market position.',
    implication: 'An extremely high Herfindahl-Hirschman Index (HHI > 2500) indicates that a single supplier or a small group of suppliers monopolizes the agency\'s contracts in that category, suggesting potential collusive bidding/cartels.',
    action: 'Examine the historical list of winners in this procurement category for the agency to see if the awards are monopolized by a few contractors.'
  },
  'RULE-013': {
    title: 'Price Benchmark Anomaly',
    statute: 'COA Value-for-Money Audits mandate that government procurement must be economical, efficient, and effective, ensuring prices are reasonable compared to market standards.',
    implication: 'Purchasing items at prices significantly higher than historical benchmarks or market averages indicates potential overpricing, waste of public funds, or kickbacks.',
    action: 'Compare the contract\'s unit prices with retail/wholesale market prices or awards for similar items by other government agencies.'
  },
  'RULE-014': {
    title: 'Geographic Mismatch',
    statute: 'PCAB licensing and government bidding rules mandate that contractors must be licensed to operate in the regions/locations where the project is executed.',
    implication: 'Awarding local infrastructure projects to contractors based in remote regions without local branches raises costs and reduces monitoring capabilities. It may indicate favoritism toward specific contractors.',
    action: 'Cross-check the contractor\'s registered principal address with the project site location.'
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatWhyFiredValue(key: string, val: any) {
  if (typeof val === 'boolean') {
    return val ? 'Yes' : 'No';
  }
  if (key === 'awarded_amount' || key === 'planned_amount' || key === 'budget_amount') {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 0,
    }).format(Number(val));
  }
  if (key === 'variance_percent') {
    return `${Number(val).toFixed(1)}%`;
  }
  return String(val);
}

export function DiscrepancyCard({
  discrepancy_id,
  discrepancy_type,
  severity,
  explanation,
  rule_id,
  rule_version,
  why_fired,
  thresholds_applied,
  evidence = [],
  isAnalyst = false,
  onConfirm,
  onReject,
  onNeedsEvidence,
  onPublish,
}: DiscrepancyCardProps) {
  const typeLabel = discrepancy_type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const hashShort = (hash?: string | null) =>
    !hash ? '—' : hash.length > 16 ? hash.slice(0, 16) + '…' : hash;

  const ruleGuide = RULE_GUIDES[rule_id];

  return (
    <article
      className={styles.card}
      data-severity={severity}
      id={`discrepancy-${discrepancy_id}`}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.severityBadge} data-severity={severity}>
            {SEVERITY_LABELS[severity]}
          </span>
          <span className={styles.discrepancyType}>{typeLabel}</span>
        </div>
        <span className={styles.ruleVersion}>
          audit-rule: {rule_id} · v{rule_version}
        </span>
      </div>

      {/* ── Explanation ─────────────────────────────────────── */}
      <div className={styles.body}>
        <p className={styles.explanation}>{explanation}</p>
      </div>

      {/* ── Citizen Interpretation Guide ─────────────────────── */}
      {ruleGuide && (
        <div className={styles.interpretation}>
          <div className={styles.interpretationHeader}>
            <span className={styles.interpretationTitle}>🔍 Citizen Interpretation Guide</span>
          </div>
          <div className={styles.interpretationBody}>
            <div className={styles.guideRow}>
              <strong>Statutory Context:</strong> {ruleGuide.statute}
            </div>
            <div className={styles.guideRow}>
              <strong>Why it matters:</strong> {ruleGuide.implication}
            </div>
            <div className={styles.guideRow}>
              <strong>How to inspect:</strong> {ruleGuide.action}
            </div>
          </div>
        </div>
      )}

      {/* ── Meta Grid ───────────────────────────────────────── */}
      <div className={styles.meta}>
        <div className={styles.metaSection}>
          <div className={styles.metaLabel}>Audit Finding Details</div>
          <div className={styles.metaContent}>
            {Object.keys(why_fired).length === 0 ? (
              <span className={styles.metaValue}>No details recorded.</span>
            ) : (
              Object.entries(why_fired).map(([key, val]) => {
                const label = KEY_LABEL_MAPPING[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                return (
                  <div key={key} style={{ margin: '3px 0' }}>
                    <span className={styles.metaKey}>{label}: </span>
                    <span className={styles.metaValue} style={{ fontWeight: 600 }}>{formatWhyFiredValue(key, val)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {thresholds_applied && (
          <div className={styles.metaSection}>
            <div className={styles.metaLabel}>Rule Thresholds Applied</div>
            <div className={styles.metaContent}>
              {Object.entries(thresholds_applied).map(([key, val]) => {
                const label = KEY_LABEL_MAPPING[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                return (
                  <div key={key} style={{ margin: '3px 0' }}>
                    <span className={styles.metaKey}>{label}: </span>
                    <span className={styles.metaValue}>{formatWhyFiredValue(key, val)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Evidence ────────────────────────────────────────── */}
      {evidence.length > 0 && (
        <div className={styles.evidence}>
          <div className={styles.metaLabel}>Source Evidence (Visual Citations)</div>
          <div className={styles.evidenceRows}>
            {evidence.map((ev) => {
              let filename = ev.document_type ?? 'Document';
              if (ev.source_url) {
                try {
                  const url = new URL(ev.source_url);
                  filename = url.pathname.split('/').filter(Boolean).pop() ?? filename;
                } catch {
                  filename = ev.source_url.split('/').filter(Boolean).pop() ?? filename;
                }
              }

              const destUrl = ev.document_id 
                ? `/documents/${ev.document_id}`
                : ev.source_url;

              return (
                <a
                  key={ev.link_id}
                  href={destUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.evidenceRow}
                >
                  <span className={styles.docTypeBadge}>
                    {ev.document_type?.toUpperCase() ?? 'DOC'}
                  </span>
                  <span className={styles.docRef}>
                    {filename}
                  </span>
                  <span className={styles.docMeta}>
                    {ev.fetch_timestamp ? new Date(ev.fetch_timestamp).toLocaleDateString('en-PH') : '—'}
                    {ev.page_number != null ? ` · p.${ev.page_number}` : ''}
                    {ev.bounding_box && (
                      <span className={styles.citationBadge}>CITED</span>
                    )}
                  </span>
                  <span
                    className={styles.docHash}
                    title={ev.sha256_hash}
                  >
                    {hashShort(ev.sha256_hash)}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Disclaimer ──────────────────────────────────────── */}
      <div className={styles.disclaimer}>
        <span className={styles.disclaimerIcon}>⚠</span>
        <span className={styles.disclaimerText}>{DISCLAIMER}</span>
      </div>

      {/* ── Analyst Actions (console only) ──────────────────── */}
      {isAnalyst && (
        <div className={styles.actions}>
          <button
            id={`confirm-${discrepancy_id}`}
            className={`${styles.actionBtn} ${styles.btnConfirm}`}
            onClick={() => onConfirm?.(discrepancy_id)}
          >
            ✓ Confirm Finding
          </button>
          <button
            id={`reject-${discrepancy_id}`}
            className={`${styles.actionBtn} ${styles.btnReject}`}
            onClick={() => onReject?.(discrepancy_id)}
          >
            ✗ False Positive
          </button>
          <button
            id={`evidence-${discrepancy_id}`}
            className={`${styles.actionBtn} ${styles.btnEvidence}`}
            onClick={() => onNeedsEvidence?.(discrepancy_id)}
          >
            ? Needs Evidence
          </button>
          <button
            id={`publish-${discrepancy_id}`}
            className={`${styles.actionBtn} ${styles.btnPublish}`}
            onClick={() => onPublish?.(discrepancy_id)}
          >
            ★ Mark Publishable Lead
          </button>
        </div>
      )}
    </article>
  );
}
