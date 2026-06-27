/**
 * ProcurementTimeline — 6-stage procurement lifecycle visualizer.
 * Spec: spec_kit_implementation/procurement-timeline.html
 *
 * Stages: planning → tender → award → contract → implementation → audit
 * Each stage is either: present | flagged | missing
 */
import styles from './ProcurementTimeline.module.css';

export type Stage =
  | 'planning'
  | 'tender'
  | 'award'
  | 'contract'
  | 'implementation'
  | 'audit';

export type StageStatus = 'present' | 'flagged' | 'missing';

export interface TimelineEvent {
  event_id: string;
  stage: Stage;
  event_type: string;
  event_date?: string;
  amount?: number;
  notes?: string;
  document_id?: string;
  source_url?: string;
  document_type?: string;
  sha256_hash?: string;
  /** Risk note to display inline (e.g. "4-day posting window") */
  risk_note?: string;
}

export interface ProcurementTimelineProps {
  case_ref: string;
  events: TimelineEvent[];
  completeness_score?: number;
}

const STAGE_ORDER: Stage[] = [
  'planning',
  'tender',
  'award',
  'contract',
  'implementation',
  'audit',
];

const STAGE_LABELS: Record<Stage, string> = {
  planning:       'Planning',
  tender:         'Tender',
  award:          'Award',
  contract:       'Contract',
  implementation: 'Implementation',
  audit:          'Audit',
};

function formatPHP(amount?: number): string {
  if (amount == null) return '';
  return '₱ ' + amount.toLocaleString('en-PH');
}

function shortRef(url?: string, type?: string): string {
  if (!url) return type ?? 'Document';
  try {
    return new URL(url).pathname.split('/').filter(Boolean).pop() ?? type ?? 'Document';
  } catch {
    return type ?? 'Document';
  }
}

export function ProcurementTimeline({
  case_ref,
  events,
  completeness_score,
}: ProcurementTimelineProps) {
  // Group events by stage — take the first/most important event per stage
  const eventsByStage = new Map<Stage, TimelineEvent>();
  for (const event of events) {
    if (!eventsByStage.has(event.stage)) {
      eventsByStage.set(event.stage, event);
    }
  }

  // Determine status for each stage
  function stageStatus(stage: Stage): StageStatus {
    const event = eventsByStage.get(stage);
    if (!event) return 'missing';
    if (event.risk_note) return 'flagged';
    return 'present';
  }

  const presentCount = STAGE_ORDER.filter(
    (s) => stageStatus(s) !== 'missing'
  ).length;

  const completenessPercent =
    completeness_score != null
      ? Math.round(completeness_score * 100)
      : Math.round((presentCount / STAGE_ORDER.length) * 100);

  return (
    <div
      className={styles.container}
      id={`timeline-${case_ref.replace(/[^a-zA-Z0-9]/g, '-')}`}
    >
      <div className={`${styles.header} font-ui`}>
        Procurement Timeline — {case_ref}
      </div>

      <div className={styles.track}>
        {STAGE_ORDER.map((stage) => {
          const status = stageStatus(stage);
          const event = eventsByStage.get(stage);

          return (
            <div
              key={stage}
              className={`${styles.stage} ${styles[status]}`}
            >
              {/* Node */}
              <div className={`${styles.stageNode} ${styles[status]}`}>
                {status === 'flagged' && (
                  <span
                    className={styles.stageRiskIcon}
                    title={event?.risk_note ?? 'Risk indicator'}
                  >
                    ⚠
                  </span>
                )}
              </div>

              {/* Label */}
              <div className={`${styles.stageLabel} font-ui`}>
                {STAGE_LABELS[stage]}
              </div>

              {/* Event card */}
              <div className={styles.eventCard}>
                {status === 'missing' ? (
                  <span className={`${styles.missingLabel} font-ui`}>
                    No documents found
                  </span>
                ) : (
                  <>
                    {event?.document_id || event?.source_url ? (
                      <div className={styles.eventRefContainer}>
                        <a
                          className={`${styles.eventRef} font-mono`}
                          href={event.document_id ? `/documents/${event.document_id}` : event.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {shortRef(event.source_url, event.document_type)}
                        </a>
                        {event.document_id && (
                          <a
                            href={`/api/documents/${event.document_id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.downloadIconBtn}
                            title="Download official PDF"
                          >
                            ⬇
                          </a>
                        )}
                      </div>
                    ) : null}
                    {event?.event_date && (
                      <span className={`${styles.eventDate} font-mono`}>
                        {event.event_date}
                      </span>
                    )}
                    <span className={`${styles.eventTitle} font-body`}>
                      {event?.event_type
                        ?.replace(/_/g, ' ')
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                    {event?.amount != null && (
                      <span className={`${styles.eventAmount} font-mono`}>
                        {formatPHP(event.amount)}
                      </span>
                    )}
                    {event?.risk_note && (
                      <span className={`${styles.eventRiskNote} font-ui`}>
                        ⚠ {event.risk_note}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Completeness bar */}
      <div className={styles.completenessBar}>
        <span className={`${styles.completenessLabel} font-ui`}>
          Timeline Completeness
        </span>
        <div className={styles.completenessTrack}>
          <div
            className={styles.completenessFill}
            style={{ width: `${completenessPercent}%` }}
          />
        </div>
        <span className={`${styles.completenessPct} font-mono`}>
          {completenessPercent}%
        </span>
      </div>

      {/* Stage pills */}
      <div className={styles.stagePills}>
        {STAGE_ORDER.map((stage) => {
          const status = stageStatus(stage);
          const present = status !== 'missing';
          return (
            <span key={stage} className={`${styles.stagePill} font-ui`}>
              <span className={present ? styles.pillCheck : styles.pillCross}>
                {present ? '✓' : '✗'}
              </span>
              <span className={styles.pillName}>{STAGE_LABELS[stage]}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
