/**
 * Case Detail Page â€” /cases/[id]
 * Maps to GET /cases/{id} + /cases/{id}/timeline + /cases/{id}/discrepancies
 * Spec: spec_kit_implementation/case-detail.html
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EvidenceLink } from '@veritas/types';
import styles from './page.module.css';
import { DiscrepancyCard } from '@/components/DiscrepancyCard';
import RiskRadarChart from '@/components/RiskRadarChart';
import {
  ProcurementTimeline,
  type TimelineEvent,
} from '@/components/ProcurementTimeline';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface LinkedLaw {
  law_id: string;
  short_title: string;
  section_number: string;
  issue_description: string;
  notes?: string;
}

interface CaseDetail {
  case_id: string;
  title: string;
  procurement_ref_no?: string;
  risk_score?: number;
  confidence_score?: number;
  completeness_score?: number;
  agency_id?: string;
  agency_name?: string;
  agency_acronym?: string;
  procurement_method?: string;
  award_date?: string;
  risk_components?: Record<string, number> | string;
  linked_laws?: LinkedLaw[];
}

interface TimelineResponse {
  timeline: TimelineEvent[];
}

type ReviewStatus =
  | 'pending'
  | 'confirmed'
  | 'false_positive'
  | 'needs_evidence'
  | 'publishable_lead'
  | 'published';

interface CaseDiscrepancy {
  discrepancy_id: string;
  case_id: string;
  discrepancy_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  explanation: string;
  rule_id: string;
  rule_version: string;
  why_fired: Record<string, string | number | boolean | undefined>;
  thresholds_applied?: Record<string, string | number | undefined>;
  generated_at: string;
  review_status: ReviewStatus;
  evidence?: EvidenceLink[];
}

interface DiscrepancyResponse {
  discrepancies: CaseDiscrepancy[];
}

async function getCase(id: string): Promise<CaseDetail | null> {
  try {
    const res = await fetch(`${API_URL}/cases/${id}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getTimeline(id: string): Promise<TimelineResponse> {
  try {
    const res = await fetch(`${API_URL}/cases/${id}/timeline`, { next: { revalidate: 30 } });
    if (!res.ok) return { timeline: [] };
    return res.json();
  } catch {
    return { timeline: [] };
  }
}

async function getDiscrepancies(id: string): Promise<DiscrepancyResponse> {
  try {
    const res = await fetch(`${API_URL}/cases/${id}/discrepancies`, { next: { revalidate: 30 } });
    if (!res.ok) return { discrepancies: [] };
    return res.json();
  } catch {
    return { discrepancies: [] };
  }
}

function riskClass(score?: number) {
  if (!score) return '';
  if (score >= 0.7) return styles.riskHigh;
  if (score >= 0.4) return styles.riskMedium;
  return styles.riskOk;
}

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [caseData, timelineData, discrepancyData] = await Promise.all([
    getCase(id),
    getTimeline(id),
    getDiscrepancies(id),
  ]);

  if (!caseData) notFound();

  const riskPct = caseData.risk_score ? Math.round(caseData.risk_score * 100) : 0;
  const confidencePct = caseData.confidence_score
    ? Math.round(caseData.confidence_score * 100)
    : 0;
  const completenessPct = caseData.completeness_score
    ? Math.round(caseData.completeness_score * 100)
    : 0;

  return (
    <div>
      {/* ── Site Header ────────────────────────────────────────── */}
      <header className={styles.siteHeader}>
        <div className={styles.topbar}>
          <Link href="/" className={styles.siteLogo}>
            <span className={`${styles.logoName} font-display`}>Veritas</span>
            <span className={`${styles.logoTagline} font-ui`}>
              Philippines Procurement Transparency
            </span>
          </Link>
          <div className={styles.headerSearch}>
            <input
              id="case-search"
              className={`${styles.searchInput} font-mono`}
              type="search"
              placeholder="Search cases, agencies, suppliers..."
            />
          </div>
        </div>
        <nav className={styles.navStrip}>
          {['Cases', 'Agencies', 'Suppliers', 'Scorecard', 'Map', 'Laws', 'Methodology'].map((item) => (
            <Link
              key={item}
              href={`/${item.toLowerCase()}`}
              className={`${styles.navLink} font-ui`}
            >
              {item}
            </Link>
          ))}
        </nav>
      </header>

      {/* ── Page Content ──────────────────────────────────────── */}
      <main className={styles.pageContent}>
        {/* Breadcrumb */}
        <nav className={`${styles.breadcrumb} font-ui`}>
          <Link href="/cases">Cases</Link>
          <span className={styles.breadcrumbSep}>›</span>
          {caseData.agency_acronym && caseData.agency_id && (
            <>
              <Link href={`/agencies/${caseData.agency_id}`}>
                {caseData.agency_acronym}
              </Link>
              <span className={styles.breadcrumbSep}>›</span>
            </>
          )}
          <span className={styles.breadcrumbCurrent}>
            {caseData.procurement_ref_no ?? id}
          </span>
        </nav>

        {/* Case Hero */}
        <div className={styles.caseHero}>
          <div className={styles.caseTitleRow}>
            <h1 className={`${styles.caseTitle} font-display`}>
              {caseData.title}
            </h1>
            {caseData.risk_score && caseData.risk_score >= 0.7 && (
              <span className={`${styles.severityBadge} ${styles.badgeHigh}`}>
                High Risk
              </span>
            )}
          </div>
          <div className={styles.caseMetaRow}>
            {caseData.procurement_ref_no && (
              <div className={`${styles.metaChip} ${styles.refNo} font-mono`}>
                {caseData.procurement_ref_no}
              </div>
            )}
            {caseData.agency_name && (
              <div className={`${styles.metaChip} font-ui`}>
                <span className={styles.chipLabel}>Agency</span>
                {caseData.agency_name}
              </div>
            )}
            {caseData.procurement_method && (
              <div className={`${styles.metaChip} font-ui`}>
                <span className={styles.chipLabel}>Method</span>
                {caseData.procurement_method.replace(/_/g, ' ')}
              </div>
            )}
            {caseData.award_date && (
              <div className={`${styles.metaChip} font-ui`}>
                <span className={styles.chipLabel}>Award Date</span>
                <span className="font-mono">{caseData.award_date}</span>
              </div>
            )}
          </div>
        </div>

        {/* Score Panel */}
        <div className={styles.scorePanel}>
          <div className={styles.scoreBlock}>
            <div className={`${styles.scoreBlockLabel} font-ui`}>Risk Score</div>
            <div className={`${styles.scoreValue} ${riskClass(caseData.risk_score)} font-display`}>
              {caseData.risk_score?.toFixed(2) ?? '—'}
            </div>
            <div className={styles.scoreTrack}>
              <div
                className={`${styles.scoreFill} ${riskPct >= 70 ? styles.high : riskPct >= 40 ? styles.medium : styles.neutral}`}
                style={{ width: `${riskPct}%` }}
              />
            </div>
            <div className={`${styles.scoreSublabel} font-ui`}>
              {riskPct >= 70 ? 'High' : riskPct >= 40 ? 'Medium' : 'Low'}
            </div>
          </div>

          <div className={styles.scoreBlock}>
            <div className={`${styles.scoreBlockLabel} font-ui`}>Confidence Score</div>
            <div className={`${styles.scoreValue} font-display`}>
              {caseData.confidence_score?.toFixed(2) ?? '—'}
            </div>
            <div className={styles.scoreTrack}>
              <div className={`${styles.scoreFill} ${styles.neutral}`} style={{ width: `${confidencePct}%` }} />
            </div>
            <div className={`${styles.scoreSublabel} font-ui`}>Data Linkage</div>
          </div>

          <div className={styles.scoreBlock}>
            <div className={`${styles.scoreBlockLabel} font-ui`}>Timeline Completeness</div>
            <div className={`${styles.scoreValue} font-display`}>
              {completenessPct}%
            </div>
            <div className={styles.scoreTrack}>
              <div className={`${styles.scoreFill} ${styles.confirm}`} style={{ width: `${completenessPct}%` }} />
            </div>
            <div className={`${styles.scoreSublabel} font-ui`}>
              Stages documented
            </div>
          </div>

          <div className={styles.scoreBlock} style={{ padding: '10px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '180px' }}>
            <div className={`${styles.scoreBlockLabel} font-ui`} style={{ marginBottom: '0' }}>Risk Dimensions</div>
            <RiskRadarChart riskComponents={caseData.risk_components} />
          </div>
        </div>

        {/* Timeline */}
        <div className={styles.sectionHeader}>
          <span className="font-ui">Procurement Timeline</span>
        </div>
        <div className={styles.timelineWrapper}>
          <ProcurementTimeline
            case_ref={caseData.procurement_ref_no ?? id}
            events={timelineData.timeline}
            completeness_score={caseData.completeness_score}
          />
        </div>

        {/* Discrepancies */}
        <div className={styles.sectionHeader}>
          <span className="font-ui">Audit Anomaly Flags</span>
          <span className={`${styles.sectionCount} font-mono`}>
            {discrepancyData.discrepancies.length} flags
          </span>
        </div>
        <div className={styles.discrepancyList}>
          {discrepancyData.discrepancies.length === 0 ? (
            <p className={`${styles.emptyNote} font-ui`}>
              No confirmed anomaly flags for this case.
            </p>
          ) : (
            discrepancyData.discrepancies.map((discrepancy) => (
              <DiscrepancyCard
                key={discrepancy.discrepancy_id}
                {...discrepancy}
                isAnalyst={false}
              />
            ))
          )}
        </div>

        {/* Potential Law Violations */}
        {caseData.linked_laws && caseData.linked_laws.length > 0 && (
          <div className={styles.sectionHeader} style={{ marginTop: '36px' }}>
            <span className="font-ui">Potential Law Violations</span>
          </div>
        )}
        {caseData.linked_laws && caseData.linked_laws.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            {caseData.linked_laws.map((law: LinkedLaw, idx: number) => (
              <div key={idx} style={{ background: 'var(--color-paper-dark)', border: '1px solid var(--color-rule)', padding: '16px 20px', borderLeft: '4px solid var(--color-flag)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <Link href={`/laws/${law.law_id}`} style={{ color: 'var(--color-data-blue)', fontWeight: 600, textDecoration: 'underline' }} className="font-ui">
                    {law.short_title} — {law.section_number}
                  </Link>
                  <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)' }} className="font-mono">
                    AUTOMATIC LINK
                  </span>
                </div>
                <p className="font-body" style={{ fontSize: '13.5px', color: 'var(--color-ink-secondary)' }}>
                  {law.issue_description}
                </p>
                {law.notes && (
                  <p className="font-mono" style={{ fontSize: '11px', color: 'var(--color-ink-muted)', marginTop: '8px', borderTop: '1px dashed var(--color-rule)', paddingTop: '6px' }}>
                    Note: {law.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Page Actions */}
        <div className={styles.pageActions}>
          <a
            href={`${API_URL}/exports/case/${id}.json`}
            className={`${styles.btnPrimary} font-ui`}
          >
            Download Case Dossier (JSON)
          </a>
          <a
            href={`${API_URL}/exports/case/${id}.csv`}
            className={`${styles.btnSecondary} font-ui`}
          >
            Download (CSV)
          </a>
        </div>

        {/* Methodology */}
        <div className={styles.methodology}>
          <div className={`${styles.methodologyTitle} font-ui`}>
            Methodology Note
          </div>
          <p className={`${styles.methodologyBody} font-body`}>
            All signals shown are statistical anomaly indicators derived from public procurement records.
            They are not legal determinations or allegations of wrongdoing. Each signal is linked to source
            documents with cryptographic hashes for independent verification. All published findings have
            undergone human analyst review.
          </p>
        </div>
      </main>
    </div>
  );
}
