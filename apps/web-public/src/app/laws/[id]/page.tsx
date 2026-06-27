import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from './page.module.css';
import TriggerAnalysisButton from '@/components/TriggerAnalysisButton';

const API_URL = typeof window === 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000')
  : '/api';

interface Controversy {
  controversy_id: string;
  issue_description: string;
  impact?: string;
  severity: string;
  created_at: string;
}

interface Provision {
  provision_id: string;
  section_number: string;
  title?: string;
  content: string;
  controversies: Controversy[];
}

interface Revision {
  revision_id: string;
  proposed_bill: string;
  proposed_changes: string;
  sponsor?: string;
  status: string;
  created_at: string;
}

interface Loophole {
  section: string;
  risk_level: string;
  description: string;
}

interface SuggestedRevision {
  section: string;
  current_text: string;
  suggested_text: string;
  rationale?: string;
}

interface LawDetail {
  law_id: string;
  title: string;
  short_title?: string;
  description?: string;
  date_passed?: string;
  status: string;
  author?: string;
  sponsor?: string;
  approved_by?: string;
  provisions: Provision[];
  revisions: Revision[];
}

async function getLaw(id: string): Promise<LawDetail | null> {
  try {
    const res = await fetch(`${API_URL}/laws/${id}`, { next: { revalidate: 30 } });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error('Failed to fetch');
    }
    return res.json();
  } catch {
    return null;
  }
}

async function getLawAnalysis(id: string) {
  try {
    const res = await fetch(`${API_URL}/laws/${id}/analysis`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function formatDate(value?: string) {
  return value ? value.slice(0, 10) : '-';
}

export default async function LawDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [law, analysis] = await Promise.all([
    getLaw(id),
    getLawAnalysis(id)
  ]);

  if (!law) {
    notFound();
  }

  return (
    <div>
      <main className={styles.pageContent} style={{ paddingTop: '40px' }}>
        <Link href="/laws" className={`${styles.backLink} font-ui`}>
          &larr; Back to Laws
        </Link>
        <div className={styles.pageHead}>
          <h1 className={`${styles.pageTitle} font-display`}>{law.title}</h1>
          {law.short_title && (
            <p className={`${styles.pageSubtitle} font-ui`}>{law.short_title}</p>
          )}
          {law.description && <p style={{ fontSize: '15px', color: 'var(--color-ink-secondary)', lineHeight: 1.6 }}>{law.description}</p>}
        </div>

        <div className={styles.metaGrid}>
          <div>
            <div className={`${styles.metaLabel} font-ui`}>Status</div>
            <div className={`${styles.metaValue} font-body`} style={{ textTransform: 'capitalize' }}>{law.status}</div>
          </div>
          <div>
            <div className={`${styles.metaLabel} font-ui`}>Date Passed</div>
            <div className={`${styles.metaValue} font-mono`}>{formatDate(law.date_passed)}</div>
          </div>
          {law.author && (
            <div>
              <div className={`${styles.metaLabel} font-ui`}>Principal Author</div>
              <div className={`${styles.metaValue} font-body`}>{law.author}</div>
            </div>
          )}
          {law.sponsor && (
            <div>
              <div className={`${styles.metaLabel} font-ui`}>Sponsor</div>
              <div className={`${styles.metaValue} font-body`}>{law.sponsor}</div>
            </div>
          )}
          {law.approved_by && (
            <div>
              <div className={`${styles.metaLabel} font-ui`}>Approved By</div>
              <div className={`${styles.metaValue} font-body`}>{law.approved_by}</div>
            </div>
          )}
        </div>

        {/* AI Law Analysis Panel */}
        <div className={styles.aiPanel}>
          <div className={styles.aiHeader}>
            <h2 className={`${styles.aiTitle} font-display`}>
              🔬 AI Integrity & Governance Assessment
            </h2>
            <TriggerAnalysisButton lawId={id} apiUrl={API_URL} />
          </div>

          {!analysis ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-ink-muted)' }}>
              <p className="font-body" style={{ margin: '0 0 16px', fontSize: '14px' }}>
                No active AI assessment report is available for this law.
              </p>
            </div>
          ) : (
            <>
              <div className={styles.aiScores}>
                <div className={styles.scoreGauge}>
                  <span className={`${styles.gaugeLabel} font-ui`}>Law Integrity Index</span>
                  <div className={styles.gaugeRow}>
                    <div className={styles.gaugeTrack}>
                      <div
                        className={styles.gaugeFill}
                        style={{
                          width: `${analysis.integrity_score}%`,
                          background: analysis.integrity_score >= 70 ? 'var(--color-confirm)' : 'var(--color-flag)'
                        }}
                      />
                    </div>
                    <span className={`${styles.gaugeValue} font-mono`} style={{ color: analysis.integrity_score >= 70 ? 'var(--color-confirm)' : 'var(--color-flag)' }}>
                      {analysis.integrity_score}/100
                    </span>
                  </div>
                </div>

                <div className={styles.scoreGauge}>
                  <span className={`${styles.gaugeLabel} font-ui`}>Oversight & Governance Score</span>
                  <div className={styles.gaugeRow}>
                    <div className={styles.gaugeTrack}>
                      <div
                        className={styles.gaugeFill}
                        style={{
                          width: `${analysis.governance_score}%`,
                          background: analysis.governance_score >= 70 ? 'var(--color-confirm)' : 'var(--color-medium)'
                        }}
                      />
                    </div>
                    <span className={`${styles.gaugeValue} font-mono`} style={{ color: analysis.governance_score >= 70 ? 'var(--color-confirm)' : 'var(--color-medium)' }}>
                      {analysis.governance_score}/100
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.aiContent}>
                <div className={styles.aiGrid}>
                  <div>
                    <h4 className={`${styles.aiSectionTitle} font-ui`}>Strengths & Safeguards</h4>
                    <ul className={`${styles.aiList} font-body`}>
                      {analysis.pros?.map((pro: string, idx: number) => (
                        <li key={idx}>{pro}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className={`${styles.aiSectionTitle} font-ui`}>Weaknesses & Vulnerabilities</h4>
                    <ul className={`${styles.aiList} font-body`}>
                      {analysis.cons?.map((con: string, idx: number) => (
                        <li key={idx} style={{ color: '#ff8a8a' }}>{con}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {analysis.loopholes && analysis.loopholes.length > 0 && (
                  <div>
                    <h4 className={`${styles.aiSectionTitle} font-ui`}>Identified Loopholes</h4>
                    {analysis.loopholes.map((loop: Loophole, idx: number) => {
                      const riskLvl = loop.risk_level || 'medium';
                      const badgeClass = riskLvl === 'critical' ? styles.badgeCritical : 
                                         riskLvl === 'high' ? styles.badgeHigh : 
                                         riskLvl === 'low' ? styles.badgeLow : styles.badgeMedium;
                      return (
                        <div key={idx} className={styles.loopholeCard}>
                          <div className={styles.loopholeHeader}>
                            <span className={`${styles.loopholeSection} font-body`}>{loop.section}</span>
                            <span className={`${styles.loopholeBadge} ${badgeClass} font-ui`}>
                              {riskLvl} Risk
                            </span>
                          </div>
                          <p className={`${styles.loopholeDesc} font-body`}>{loop.description}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {analysis.suggested_revisions && analysis.suggested_revisions.length > 0 && (
                  <div>
                    <h4 className={`${styles.aiSectionTitle} font-ui`}>Suggested Revisions</h4>
                    {analysis.suggested_revisions.map((rev: SuggestedRevision, idx: number) => (
                      <div key={idx} className={styles.revisionCard}>
                        <div className={`${styles.revisionHeader} font-ui`}>Proposed Draft for {rev.section}</div>
                        <div className={styles.revisionDiff}>
                          <div className={`${styles.revisionCol} ${styles.revCurrent} font-body`}>
                            <strong>Current wording:</strong>
                            <p style={{ margin: '4px 0 0' }}>{rev.current_text}</p>
                          </div>
                          <div className={`${styles.revisionCol} ${styles.revSuggested} font-body`}>
                            <strong>Suggested wording:</strong>
                            <p style={{ margin: '4px 0 0' }}>{rev.suggested_text}</p>
                          </div>
                        </div>
                        <p className={`${styles.revisionRationale} font-body`}>
                          <strong>Rationale:</strong> {rev.rationale}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <h4 className={`${styles.aiSectionTitle} font-ui`}>Citizen Summary</h4>
                  <p className={`${styles.citizenSummary} font-body`}>{analysis.citizen_summary}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {law.provisions && law.provisions.length > 0 && (
          <section>
            <h2 className={`${styles.sectionTitle} font-display`}>Key Provisions & Controversies</h2>
            {law.provisions.map((prov) => (
              <div key={prov.provision_id} className={styles.provisionCard}>
                <div className={styles.provisionHeader}>
                  <div className={`${styles.provisionTitle} font-body`}>{prov.title || 'Provision'}</div>
                  <div className={`${styles.provisionSection} font-mono`}>Sec. {prov.section_number}</div>
                </div>
                <div className={`${styles.provisionContent} font-body`}>{prov.content}</div>

                {prov.controversies && prov.controversies.length > 0 && (
                  <div className={styles.controversyWrap} style={{ borderLeft: '4px solid var(--color-flag)', paddingLeft: '16px', marginTop: '16px' }}>
                    <span className={`${styles.controversyBadge} font-ui`} style={{ background: 'rgba(255, 65, 54, 0.15)', color: '#ff8a8a', borderColor: '#ff4136', fontWeight: 'bold' }}>
                      ⚠️ Legislative Flaw / Loophole Detected
                    </span>
                    {prov.controversies.map(cont => (
                      <div key={cont.controversy_id} style={{ marginTop: '8px' }}>
                        <p className={`${styles.controversyIssue} font-body`} style={{ color: '#ff8a8a', fontWeight: 600, margin: '0 0 4px' }}>{cont.issue_description}</p>
                        {cont.impact && <p className={`${styles.controversyImpact} font-body`} style={{ fontSize: '13px', margin: 0 }}><strong>Impact:</strong> {cont.impact}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {law.revisions && law.revisions.length > 0 && (
          <section>
            <h2 className={`${styles.sectionTitle} font-display`}>Proposed Revisions</h2>
            {law.revisions.map((rev) => (
              <div key={rev.revision_id} className={styles.revisionCard}>
                <div className={styles.revisionHeader}>
                  <div className={`${styles.revisionBill} font-body`}>{rev.proposed_bill}</div>
                  <div className={`${styles.revisionSponsor} font-body`}>
                    {rev.sponsor ? `Sponsored by ${rev.sponsor}` : 'Unknown Sponsor'} &bull; <span style={{ textTransform: 'capitalize' }}>{rev.status}</span>
                  </div>
                </div>
                <div className={`${styles.revisionChanges} font-mono`}>{rev.proposed_changes}</div>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
