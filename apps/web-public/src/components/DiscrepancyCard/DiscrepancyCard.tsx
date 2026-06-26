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

  const hashShort = (hash: string) =>
    hash.length > 16 ? hash.slice(0, 16) + '…' : hash;

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

      {/* ── Meta Grid ───────────────────────────────────────── */}
      <div className={styles.meta}>
        <div className={styles.metaSection}>
          <div className={styles.metaLabel}>Audit Finding Details</div>
          <div className={styles.metaContent}>
            {Object.entries(why_fired).map(([key, val]) => {
              const label = KEY_LABEL_MAPPING[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
              return (
                <div key={key} style={{ margin: '3px 0' }}>
                  <span className={styles.metaKey}>{label}: </span>
                  <span className={styles.metaValue} style={{ fontWeight: 600 }}>{formatWhyFiredValue(key, val)}</span>
                </div>
              );
            })}
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
                    {new Date(ev.fetch_timestamp).toLocaleDateString('en-PH')}
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
