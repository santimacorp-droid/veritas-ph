/**
 * DiscrepancyCard — The core UI element of Veritas.
 * Every field maps to a discrepancy record from the DB.
 * Spec: spec_kit_implementation/discrepancy-card.html
 */
import styles from './DiscrepancyCard.module.css';

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type ReviewStatus =
  | 'pending'
  | 'confirmed'
  | 'false_positive'
  | 'needs_evidence'
  | 'publishable_lead'
  | 'published';

export interface EvidenceLink {
  link_id: string;
  document_type: string;
  source_url: string;
  fetch_timestamp: string;
  sha256_hash: string;
  page_number?: number;
  extraction_confidence?: number;
}

export interface DiscrepancyCardProps {
  discrepancy_id: string;
  discrepancy_type: string;
  severity: Severity;
  explanation: string;
  rule_id: string;
  rule_version: string;
  why_fired: Record<string, string | number | boolean | undefined>;
  thresholds_applied?: Record<string, string | number | undefined>;
  generated_at: string;
  review_status: ReviewStatus;
  evidence?: EvidenceLink[];
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
  'This is an anomaly indicator based on statistical patterns in public procurement records. ' +
  'It is not a legal determination or accusation of wrongdoing. Human review is required before publication.';

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
          rule: {rule_id} · {rule_version}
        </span>
      </div>

      {/* ── Explanation ─────────────────────────────────────── */}
      <div className={styles.body}>
        <p className={styles.explanation}>{explanation}</p>
      </div>

      {/* ── Meta Grid ───────────────────────────────────────── */}
      <div className={styles.meta}>
        <div className={styles.metaSection}>
          <div className={styles.metaLabel}>Why This Fired</div>
          <div className={styles.metaContent}>
            {Object.entries(why_fired).map(([key, val]) => (
              <div key={key}>
                <span className={styles.metaKey}>{key.replace(/_/g, ' ')}: </span>
                <span className={styles.metaValue}>{String(val)}</span>
              </div>
            ))}
          </div>
        </div>

        {thresholds_applied && (
          <div className={styles.metaSection}>
            <div className={styles.metaLabel}>Thresholds Applied</div>
            <div className={styles.metaContent}>
              {Object.entries(thresholds_applied).map(([key, val]) => (
                <div key={key}>
                  <span className={styles.metaKey}>{key.replace(/_/g, ' ')}: </span>
                  <span className={styles.metaValue}>{String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Evidence ────────────────────────────────────────── */}
      {evidence.length > 0 && (
        <div className={styles.evidence}>
          <div className={styles.metaLabel}>Source Evidence</div>
          <div className={styles.evidenceRows}>
            {evidence.map((ev) => (
              <a
                key={ev.link_id}
                href={ev.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.evidenceRow}
              >
                <span className={styles.docTypeBadge}>
                  {ev.document_type?.toUpperCase() ?? 'DOC'}
                </span>
                <span className={styles.docRef}>
                  {new URL(ev.source_url).pathname.split('/').pop()}
                </span>
                <span className={styles.docMeta}>
                  {new Date(ev.fetch_timestamp).toLocaleDateString('en-PH')}
                  {ev.page_number != null ? ` · p.${ev.page_number}` : ''}
                </span>
                <span
                  className={styles.docHash}
                  title={ev.sha256_hash}
                >
                  {hashShort(ev.sha256_hash)}
                </span>
              </a>
            ))}
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
