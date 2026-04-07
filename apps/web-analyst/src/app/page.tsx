'use client';

import { startTransition, useEffect, useState } from 'react';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

type AnalystStatus = 'queue' | 'confirmed' | 'published';
type ReviewOutcome = 'confirmed' | 'false_positive' | 'needs_evidence' | 'publishable_lead';

interface Discrepancy {
  discrepancy_id: string;
  discrepancy_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  explanation: string;
  rule_id: string;
  rule_version: string;
  why_fired: Record<string, string | number | boolean | undefined>;
  thresholds_applied?: Record<string, string | number | undefined> | null;
  generated_at: string;
  review_status: string;
  evidence?: EvidenceLink[];
}

interface EvidenceLink {
  link_id: string;
  document_id?: string;
  document_type?: string;
  source_url: string;
  fetch_timestamp: string;
  sha256_hash: string;
  page_number?: number;
}

interface CaseWithDiscrepancies {
  case_id: string;
  title: string;
  procurement_ref_no?: string;
  risk_score?: number;
  updated_at?: string;
  agency_name?: string;
  agency_acronym?: string;
  discrepancies: Discrepancy[];
}

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

const OUTCOMES: { key: ReviewOutcome; label: string; style: string }[] = [
  { key: 'confirmed', label: 'Confirm', style: 'confirm' },
  { key: 'false_positive', label: 'False Positive', style: 'reject' },
  { key: 'needs_evidence', label: 'Needs Evidence', style: 'evidence' },
  { key: 'publishable_lead', label: 'Publishable Lead', style: 'publish' },
];

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={`${styles.severityBadge} ${styles[`sev_${severity}`]} font-ui`}>
      {severity.toUpperCase()}
    </span>
  );
}

function ReviewLabel({ status }: { status: string }) {
  const label = status === 'publishable_lead' ? 'Publishable Lead' : status.replace(/_/g, ' ');
  return <span className={`${styles.reviewedTag} font-ui`}>{label}</span>;
}

function DiscrepancyRow({
  discrepancy,
  onReview,
  readOnly,
}: {
  discrepancy: Discrepancy;
  onReview: (discrepancyId: string, outcome: ReviewOutcome, notes: string) => Promise<void>;
  readOnly: boolean;
}) {
  const [loading, setLoading] = useState<ReviewOutcome | null>(null);
  const [notes, setNotes] = useState('');

  async function handleReview(outcome: ReviewOutcome) {
    setLoading(outcome);
    try {
      await onReview(discrepancy.discrepancy_id, outcome, notes);
      setNotes('');
    } finally {
      setLoading(null);
    }
  }

  const typeLabel = discrepancy.discrepancy_type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className={styles.discRow} data-severity={discrepancy.severity}>
      <div className={`${styles.discAccent} ${styles[`accent_${discrepancy.severity}`]}`} />

      <div className={styles.discHeader}>
        <SeverityBadge severity={discrepancy.severity} />
        <span className={`${styles.discType} font-ui`}>{typeLabel}</span>
        <span className={`${styles.discRule} font-mono`}>
          {discrepancy.rule_id} · {discrepancy.rule_version}
        </span>
        {discrepancy.review_status !== 'pending' && <ReviewLabel status={discrepancy.review_status} />}
      </div>

      <div className={`${styles.discBody} font-body`}>{discrepancy.explanation}</div>

      <div className={styles.discMeta}>
        {Object.entries(discrepancy.why_fired).map(([key, value]) => (
          <span key={key} className={`${styles.metaChip} font-mono`}>
            <span className={styles.metaKey}>{key.replace(/_/g, ' ')}</span>
            {String(value)}
          </span>
        ))}
      </div>

      {discrepancy.evidence && discrepancy.evidence.length > 0 && (
        <div className={styles.evidenceLinks}>
          {discrepancy.evidence.map((item) => (
            <a
              key={item.link_id}
              href={item.source_url}
              target="_blank"
              rel="noreferrer"
              className={`${styles.evidenceLink} font-mono`}
            >
              <span>{item.document_type ?? 'document'}</span>
              <span>{new Date(item.fetch_timestamp).toLocaleDateString('en-PH')}</span>
              {item.page_number != null && <span>p.{item.page_number}</span>}
            </a>
          ))}
        </div>
      )}

      {!readOnly && (
        <textarea
          className={`${styles.notesInput} font-mono`}
          placeholder="Optional analyst note..."
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      )}

      {!readOnly && (
        <div className={styles.discActions}>
          {OUTCOMES.map(({ key, label, style }) => (
            <button
              key={key}
              id={`review-${discrepancy.discrepancy_id}-${key}`}
              className={`${styles.actionBtn} ${styles[`btn_${style}`]} font-ui`}
              onClick={() => handleReview(key)}
              disabled={loading !== null}
            >
              {loading === key ? '...' : label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CaseBlock({
  item,
  onReview,
  readOnly,
}: {
  item: CaseWithDiscrepancies;
  onReview: (caseId: string, discId: string, outcome: ReviewOutcome, notes: string) => Promise<void>;
  readOnly: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const riskPct = item.risk_score ? Math.round(item.risk_score * 100) : 0;

  return (
    <div className={styles.caseBlock}>
      <button className={styles.caseHeader} onClick={() => setExpanded((v) => !v)}>
        <div className={styles.caseHeaderLeft}>
          <span className={`${styles.caseRef} font-mono`}>
            {item.procurement_ref_no ?? item.case_id.slice(0, 8)}
          </span>
          <span className={`${styles.caseTitle} font-body`}>{item.title}</span>
        </div>
        <div className={styles.caseHeaderRight}>
          {item.updated_at && (
            <span className={`${styles.caseRef} font-mono`}>{item.updated_at.slice(0, 10)}</span>
          )}
          {item.agency_acronym && (
            <span className={`${styles.agencyPill} font-ui`}>{item.agency_acronym}</span>
          )}
          {item.risk_score != null && (
            <span
              className={`${styles.riskPip} ${
                riskPct >= 70 ? styles.riskHigh : riskPct >= 40 ? styles.riskMed : styles.riskLow
              } font-mono`}
            >
              {item.risk_score.toFixed(2)}
            </span>
          )}
          <span className={`${styles.expandChevron} font-ui`}>{expanded ? 'v' : '>'}</span>
        </div>
      </button>

      {expanded && (
        <div className={styles.discList}>
          {item.discrepancies.length === 0 ? (
            <div className={`${styles.emptyState} font-body`}>
              No automated discrepancies yet. This case was recently ingested and is waiting for enrichment.
            </div>
          ) : (
            [...item.discrepancies]
              .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
              .map((d) => (
                <DiscrepancyRow
                  key={d.discrepancy_id}
                  discrepancy={d}
                  readOnly={readOnly}
                  onReview={(discId, outcome, notes) => onReview(item.case_id, discId, outcome, notes)}
                />
              ))
          )}
        </div>
      )}
    </div>
  );
}

async function fetchCases(status: AnalystStatus): Promise<{ total: number; cases: CaseWithDiscrepancies[] }> {
  const res = await fetch(`${API_URL}/analyst/cases?status=${status}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to load ${status} cases`);
  }
  return res.json();
}

export default function AnalystDashboard() {
  const [activeTab, setActiveTab] = useState<AnalystStatus>('queue');
  const [cases, setCases] = useState<CaseWithDiscrepancies[]>([]);
  const [totals, setTotals] = useState<Record<AnalystStatus, number>>({
    queue: 0,
    confirmed: 0,
    published: 0,
  });
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        const [queueData, confirmedData, publishedData] = await Promise.all([
          fetchCases('queue'),
          fetchCases('confirmed'),
          fetchCases('published'),
        ]);
        if (cancelled) return;

        setTotals({
          queue: queueData.total,
          confirmed: confirmedData.total,
          published: publishedData.total,
        });

        const currentData = {
          queue: queueData,
          confirmed: confirmedData,
          published: publishedData,
        }[activeTab];
        setCases(currentData.cases ?? []);
      } catch {
        if (!cancelled) {
          setError('Could not connect to the analyst API. Make sure the backend is running.');
          setCases([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [activeTab, refreshKey]);

  async function handleReview(caseId: string, discId: string, outcome: ReviewOutcome, notes: string) {
    const res = await fetch(`${API_URL}/analyst/cases/${caseId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome, discrepancy_id: discId, notes }),
    });
    if (!res.ok) {
      throw new Error('Review submission failed');
    }
    setReviewCount((n) => n + 1);
    setRefreshKey((n) => n + 1);
  }

  const totalVisibleSignals = cases.reduce((acc, item) => acc + item.discrepancies.length, 0);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <span className={`${styles.logoName} font-display`}>Veritas</span>
          <span className={`${styles.logoSub} font-ui`}>Analyst Console</span>
        </div>

        <nav className={styles.sidebarNav}>
          {[
            { key: 'queue', label: 'Review Queue' },
            { key: 'confirmed', label: 'Confirmed' },
            { key: 'published', label: 'Published Leads' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`${styles.navItem} ${activeTab === key ? styles.navItemActive : ''} font-ui`}
              onClick={() => startTransition(() => setActiveTab(key as AnalystStatus))}
            >
              {label}
              {totals[key as AnalystStatus] > 0 && (
                <span className={styles.navBadge}>{totals[key as AnalystStatus]}</span>
              )}
            </button>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <a href="http://localhost:3000" className={`${styles.footerLink} font-ui`} target="_blank" rel="noreferrer">
            Public Portal
          </a>
          <a href="http://localhost:8000/api/docs" className={`${styles.footerLink} font-ui`} target="_blank" rel="noreferrer">
            API Docs
          </a>
          <div className={`${styles.sessionInfo} font-mono`}>{reviewCount} reviewed this session</div>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <h1 className={`${styles.topbarTitle} font-ui`}>
              {activeTab === 'queue' && 'Review Queue'}
              {activeTab === 'confirmed' && 'Confirmed Findings'}
              {activeTab === 'published' && 'Published Leads'}
            </h1>
            <span className={`${styles.topbarMeta} font-mono`}>
              {totalVisibleSignals} visible signals · {reviewCount} reviewed this session
            </span>
          </div>
          <div className={styles.topbarRight}>
            <span className={`${styles.roleBadge} font-ui`}>Analyst</span>
          </div>
        </div>

        <div className={`${styles.disclaimer} font-ui`}>
          <span className={styles.disclaimerIcon}>!</span>
          All findings require human review before publication. Signals are anomaly indicators generated by automated rules, not legal determinations.
        </div>

        <div className={styles.queueContent}>
          {loading && <div className={`${styles.emptyState} font-body`}>Loading analyst queue...</div>}

          {!loading && error && <div className={`${styles.emptyState} font-body`}>{error}</div>}

          {!loading && !error && cases.length === 0 && (
            <div className={`${styles.emptyState} font-body`}>
              {activeTab === 'queue'
                ? 'No pending discrepancy reviews are available.'
                : activeTab === 'confirmed'
                  ? 'No confirmed findings are available yet.'
                  : 'No publishable leads are available yet.'}
            </div>
          )}

          {!loading &&
            !error &&
            cases.map((item) => (
              <CaseBlock
                key={item.case_id}
                item={item}
                readOnly={activeTab !== 'queue'}
                onReview={handleReview}
              />
            ))}
        </div>
      </main>
    </div>
  );
}
