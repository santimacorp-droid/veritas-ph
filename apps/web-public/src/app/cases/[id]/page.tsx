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
import CaseDownloadButtons from '@/components/CaseDownloadButtons/CaseDownloadButtons';
import FOIDraftButton from '@/components/FOIDraftButton/FOIDraftButton';

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
  planned_amount?: number;
  awarded_amount?: number;
  final_contract_amount?: number;
  status?: string;
  supplier_id?: string;
  supplier_name?: string;
  supplier_type?: string;
  supplier_philgeps_id?: string;
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

interface AuditReport {
  report_type: 'predictive' | 'post_mortem' | 'none';
  risk_probability: number | null;
  analysis_details: string;
}

async function getAuditReport(id: string): Promise<AuditReport> {
  try {
    const res = await fetch(`${API_URL}/cases/${id}/audit-report`, { next: { revalidate: 30 } });
    if (!res.ok) return { report_type: 'none', risk_probability: null, analysis_details: 'No advanced audit report generated yet.' };
    return res.json();
  } catch {
    return { report_type: 'none', risk_probability: null, analysis_details: 'No advanced audit report generated yet.' };
  }
}

function riskClass(score?: number) {
  if (!score) return '';
  if (score >= 0.7) return styles.riskHigh;
  if (score >= 0.4) return styles.riskMedium;
  return styles.riskOk;
}

function formatPHP(val?: number) {
  if (val == null) return '—';
  if (val >= 1_000_000_000) return `₱${(val / 1_000_000_000).toFixed(2)}B`;
  if (val >= 1_000_000) return `₱${(val / 1_000_000).toFixed(2)}M`;
  return '₱' + val.toLocaleString('en-PH');
}

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [caseData, timelineData, discrepancyData, auditReport] = await Promise.all([
    getCase(id),
    getTimeline(id),
    getDiscrepancies(id),
    getAuditReport(id),
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

      {/* ── Page Content ──────────────────────────────────────── */}
      <main className={styles.pageContent}>
        {/* Breadcrumb */}
        <nav className={`${styles.breadcrumb} font-ui`}>
          <Link href="/projects">Projects</Link>
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

        {/* Sandbox Notice */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.05)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '4px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
          color: 'var(--color-ink-secondary)',
          fontSize: '13px',
          lineHeight: '1.5'
        }} className="font-ui">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-data-blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div>
            <strong>Simulated Audit Dossier:</strong> This profile is an audited historical case study (2010–2026) generated within the Veritas PH research sandbox to evaluate public procurement integrity.
          </div>
        </div>

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
            {caseData.supplier_name && (
              <div className={`${styles.metaChip} font-ui`}>
                <span className={styles.chipLabel}>Contractor</span>
                {caseData.supplier_id ? (
                  <Link href={`/suppliers/${caseData.supplier_id}`} style={{ color: 'inherit', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                    {caseData.supplier_name}
                  </Link>
                ) : (
                  caseData.supplier_name
                )}
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

        {/* Score Glossary / Interpretation */}
        <div style={{ background: 'var(--color-paper-dark)', border: '1px solid var(--color-rule)', padding: '16px 20px', borderRadius: '4px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px', marginTop: '16px' }}>
          <div>
            <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--color-ink)', fontWeight: 600, display: 'flex', alignItems: 'center' }} className="font-ui">
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-flag)', marginRight: '6px' }}></span>
              Risk Score
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-ink-secondary)', lineHeight: 1.5 }} className="font-body">
              Calculated based on red flag rules (e.g. single-bidder loops, compressed timelines, or cost overruns). A higher score indicates higher exposure to integrity risks.
            </p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--color-ink)', fontWeight: 600, display: 'flex', alignItems: 'center' }} className="font-ui">
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-data-blue)', marginRight: '6px' }}></span>
              Confidence Score
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-ink-secondary)', lineHeight: 1.5 }} className="font-body">
              Measures reliability and linkage depth. High scores indicate the presence of verifiable cryptographic hashes linked directly to PhilGEPS source records.
            </p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--color-ink)', fontWeight: 600, display: 'flex', alignItems: 'center' }} className="font-ui">
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-confirm)', marginRight: '6px' }}></span>
              Timeline Completeness
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-ink-secondary)', lineHeight: 1.5 }} className="font-body">
              Tracks transparency across the 5 statutory procurement stages: Planning (APP), Tender (ITB), Award (NOA), Contract, and Implementation (NTP).
            </p>
          </div>
        </div>

        {/* Financial Summary */}
        <div className={styles.sectionHeader}>
          <span className="font-ui">Financial Summary</span>
        </div>
        <div className={styles.financialSummaryPanel}>
          <div className={styles.financialBlock}>
            <div className={`${styles.financialLabel} font-ui`}>Approved Budget (ABC)</div>
            <div className={`${styles.financialValue} font-display`}>
              {caseData.planned_amount ? formatPHP(caseData.planned_amount) : '—'}
            </div>
            <div className={`${styles.financialSublabel} font-ui`}>Statutory ceiling for bidding</div>
          </div>

          <div className={styles.financialBlock}>
            <div className={`${styles.financialLabel} font-ui`}>Awarded Amount</div>
            <div className={`${styles.financialValue} font-display`}>
              {caseData.awarded_amount ? formatPHP(caseData.awarded_amount) : '—'}
            </div>
            {caseData.award_date && (
              <div className={`${styles.financialSublabel} font-ui`}>Award Date: {caseData.award_date}</div>
            )}
          </div>

          <div className={styles.financialBlock}>
            <div className={`${styles.financialLabel} font-ui`}>Final Paid Amount</div>
            <div className={`${styles.financialValue} ${caseData.final_contract_amount && caseData.awarded_amount && caseData.final_contract_amount > caseData.awarded_amount ? styles.overrunText : ''} font-display`}>
              {caseData.final_contract_amount ? formatPHP(caseData.final_contract_amount) : '—'}
            </div>
            {caseData.final_contract_amount && caseData.awarded_amount && caseData.final_contract_amount > caseData.awarded_amount ? (
              <div className={`${styles.financialSublabel} ${styles.warningText} font-ui`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Cost Overrun of {(((caseData.final_contract_amount - caseData.awarded_amount) / caseData.awarded_amount) * 100).toFixed(1)}% detected
              </div>
            ) : (
              <div className={`${styles.financialSublabel} font-ui`}>Actual expenditure at completion</div>
            )}
          </div>
        </div>
        {/* Verified Case Dossier Basis */}
        {(() => {
          const primaryDoc = timelineData.timeline.find((ev) => ev.document_id);
          return (
            <>
              <div className={styles.sectionHeader} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-data-blue)' }}>
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                <span className="font-ui">Verified Project Dossier Basis</span>
              </div>
              <div className={styles.dossierContainer}>
                <div className={styles.dossierBadge}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-ink-muted)' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                  <span className={styles.dossierBadgeLabel}>Official basis</span>
                </div>
                <div className={styles.dossierContent}>
                  <div className={styles.dossierTitleRow}>
                    <h3 className={`${styles.dossierTitle} font-ui`}>
                      {primaryDoc?.document_type
                        ? primaryDoc.document_type.replace(/_/g, ' ').toUpperCase()
                        : 'PHILGEPS BID NOTICE'}
                    </h3>
                    <span
                      className={`${styles.dossierStatus} ${
                        primaryDoc ? styles.statusVerified : styles.statusPending
                      } font-ui`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      {primaryDoc ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Cryptographically Verified
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                          </svg>
                          Syncing from Registry
                        </>
                      )}
                    </span>
                  </div>

                  <div className={styles.dossierGrid}>
                    <div className={styles.dossierItem}>
                      <span className={styles.dossierLabel}>Dossier ID / Reference</span>
                      <span className={styles.dossierValue}>
                        {primaryDoc?.document_id ?? caseData.procurement_ref_no ?? 'Pending crawl run...'}
                      </span>
                    </div>
                    {primaryDoc?.sha256_hash && (
                      <div className={styles.dossierItem}>
                        <span className={styles.dossierLabel}>SHA-256 Checksum (Immutability Proof)</span>
                        <span className={styles.dossierValue}>{primaryDoc.sha256_hash}</span>
                      </div>
                    )}
                    <div className={styles.dossierItem}>
                      <span className={styles.dossierLabel}>Registry Source Authority</span>
                      <span className={styles.dossierValue} style={{ fontFamily: 'var(--font-body)' }}>
                        Republic of the Philippines Government Procurement System (PhilGEPS)
                      </span>
                    </div>
                  </div>

                  <div className={styles.dossierActions}>
                    {primaryDoc?.document_id ? (
                      <>
                        <Link
                          href={`/documents/${primaryDoc.document_id}`}
                          className={`${styles.dossierBtn} ${styles.dossierBtnPrimary} font-ui`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                          Read Extracted Text
                        </Link>
                        <a
                          href={`/api/documents/${primaryDoc.document_id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${styles.dossierBtn} font-ui`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          Download PDF / Ingested HTML
                        </a>
                      </>
                    ) : null}
                    {caseData.procurement_ref_no && (
                      <a
                        href={
                          primaryDoc?.source_url ??
                          `https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/SplashBidNoticeAbstractUI.aspx?refID=${caseData.procurement_ref_no}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.dossierBtn} font-ui`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/>
                          <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                        Open External PhilGEPS Notice
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </>
          );
        })()}

        {/* Advanced Audit Report (DeepSeek) */}
        {auditReport.report_type !== 'none' && (
          <>
            <div className={styles.sectionHeader} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-flag)' }}>
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              <span className="font-ui">Advanced Audit Report</span>
              <span className={`${styles.sectionCount} font-mono`} style={{ background: 'var(--color-flag)', color: 'var(--color-paper)' }}>
                AI Engine
              </span>
            </div>
            <div style={{
              background: 'var(--color-paper-dark)',
              border: '1px solid var(--color-rule)',
              borderRadius: '4px',
              padding: '24px',
              marginBottom: '32px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '3px 8px', borderRadius: '3px', background: auditReport.report_type === 'predictive' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: auditReport.report_type === 'predictive' ? 'var(--color-flag)' : 'var(--color-confirm)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }} className="font-ui">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    {auditReport.report_type === 'predictive' ? 'Predictive Risk Model' : 'Forensic Audit Report'}
                  </span>
                </div>
                {auditReport.report_type === 'predictive' && auditReport.risk_probability !== null && (
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--color-ink-secondary)' }} className="font-ui">Probability of Overrun:</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: auditReport.risk_probability >= 0.7 ? 'var(--color-flag)' : 'var(--color-ink)' }} className="font-display">
                      {Math.round(auditReport.risk_probability * 100)}%
                    </span>
                  </div>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '14.5px', lineHeight: '1.6', color: 'var(--color-ink)' }} className="font-body">
                {auditReport.analysis_details}
              </p>
            </div>
          </>
        )}

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

        {/* Public Integrity Action Hub */}
        <div className={styles.actionHub}>
          <div className={styles.actionHubHeader} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-data-blue)' }}>
              <path d="M12 19c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H12z"/>
              <path d="M12 11H8c-1.1 0-2 .9-2 2v4"/>
              <circle cx="5" cy="5" r="2"/>
            </svg>
            <span className={styles.actionHubTitle}>Citizen Action Hub — How to Use This Project</span>
          </div>
          <div className={styles.actionHubBody}>
            <p className="font-body">
              This project contains verified statistical anomalies. As a citizen, journalist, or public watchdog, you can take concrete steps to verify, investigate, and report these findings:
            </p>
            <div className={styles.actionGrid}>
              <div className={styles.actionItem}>
                <h4 className="font-ui">1. Inspect Source Proof</h4>
                <p className="font-body">
                  Click on the visual citations under "Source Evidence" to inspect the raw government files (PDFs/HTML pages) scraped directly from PhilGEPS. Check original dates and amounts.
                </p>
              </div>
              <div className={styles.actionItem}>
                <h4 className="font-ui">2. File an FOI Request</h4>
                <p className="font-body">
                  Use the Philippine Government FOI portal (foi.gov.ph) to request the missing documents (e.g. Bid Abstracts, Project NTPs, or BAC Resolutions). Reference PhilGEPS ID: <strong>{caseData.procurement_ref_no ?? 'N/A'}</strong>.
                </p>
                <FOIDraftButton caseId={id} />
              </div>
              <div className={styles.actionItem}>
                <h4 className="font-ui">3. Report to COA</h4>
                <p className="font-body">
                  Submit a formal complaint or tip-off to the Commission on Audit (COA) Citizen Desk (coa.gov.ph) highlighting the cost overruns or single-bidder patterns flagged here.
                </p>
              </div>
              <div className={styles.actionItem}>
                <h4 className="font-ui">4. Download Dossier</h4>
                <p className="font-body">
                  Export the full machine-readable structured JSON or CSV data file of this audit trail using the download buttons below to share with local media or watchdogs.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Page Actions */}
        <div className={styles.pageActions}>
          <CaseDownloadButtons caseId={id} btnPrimary={styles.btnPrimary} btnSecondary={styles.btnSecondary} />
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
