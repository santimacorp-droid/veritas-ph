import Link from 'next/link';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface Agency {
  agency_id: string;
  name: string;
  acronym?: string;
  agency_type?: string;
  publisher_name?: string;
  total_cases?: number;
  total_awarded?: number;
  avg_risk_score?: number;
  high_risk_cases?: number;
  confirmed_discrepancies?: number;
}

async function getAgencies(sort: string): Promise<{ total: number; agencies: Agency[] }> {
  try {
    const res = await fetch(`${API_URL}/agencies?sort=${sort}&limit=50`, { next: { revalidate: 30 } });
    if (!res.ok) return { total: 0, agencies: [] };
    return res.json();
  } catch {
    return { total: 0, agencies: [] };
  }
}

function formatPHP(val?: number) {
  if (val == null) return '—';
  if (val >= 1_000_000_000) return `₱${(val / 1_000_000_000).toFixed(1)}B`;
  if (val >= 1_000_000)     return `₱${(val / 1_000_000).toFixed(1)}M`;
  return '₱' + val.toLocaleString('en-PH');
}

function getRiskBand(score?: number) {
  if (score == null) return { label: 'Unknown', className: styles.bandUnknown, color: '#7a7670' };
  const pct = Math.round(score * 100);
  if (pct >= 70) return { label: 'CRITICAL RISK', className: styles.bandHigh, color: 'var(--color-flag)' };
  if (pct >= 40) return { label: 'MODERATE RISK', className: styles.bandMed, color: 'var(--color-medium)' };
  return { label: 'LOW RISK', className: styles.bandLow, color: 'var(--color-confirm)' };
}

export default async function ScorecardPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const params = await searchParams;
  const sort = params.sort === 'discrepancies' ? 'discrepancies' : 'risk_score';
  const { total, agencies } = await getAgencies(sort);

  // Derive stats
  const evaluatedCount = agencies.length;
  const highestRisk = agencies.reduce<Agency | null>((max, a) => {
    if (!max || (a.avg_risk_score ?? 0) > (max.avg_risk_score ?? 0)) return a;
    return max;
  }, null);

  const mostFlags = agencies.reduce<Agency | null>((max, a) => {
    if (!max || (a.confirmed_discrepancies ?? 0) > (max.confirmed_discrepancies ?? 0)) return a;
    return max;
  }, null);

  return (
    <div>

      <main className={styles.pageContent}>
        {/* Page Head */}
        <div className={styles.pageHead}>
          <h1 className={`${styles.pageTitle} font-display`}>Agency Scorecard & Leaderboard</h1>
          <p className={`${styles.pageSubtitle} font-ui`}>
            Ranked risk indices of {total} procuring entities using public PhilGEPS data
          </p>
        </div>

        {/* Top Widgets Grid */}
        <section className={styles.widgetsGrid}>
          <div className={styles.widgetCard}>
            <span className={`${styles.widgetLabel} font-ui`}>Agencies Evaluated</span>
            <span className={`${styles.widgetValue} font-mono`}>{evaluatedCount}</span>
            <span className={`${styles.widgetDetail} font-ui`}>Top agencies by dataset volume</span>
          </div>
          <div className={`${styles.widgetCard} ${styles.widgetDanger}`}>
            <span className={`${styles.widgetLabel} font-ui`}>Highest Average Risk</span>
            <span className={`${styles.widgetValue} font-mono`}>
              {highestRisk ? `${Math.round((highestRisk.avg_risk_score ?? 0) * 100)}%` : '—'}
            </span>
            <span className={`${styles.widgetDetail} font-ui`}>
              {highestRisk ? `${highestRisk.name} (${highestRisk.acronym ?? 'N/A'})` : '—'}
            </span>
          </div>
          <div className={`${styles.widgetCard} ${styles.widgetWarn}`}>
            <span className={`${styles.widgetLabel} font-ui`}>Most Confirmed Signals</span>
            <span className={`${styles.widgetValue} font-mono`}>
              {mostFlags ? mostFlags.confirmed_discrepancies : '—'}
            </span>
            <span className={`${styles.widgetDetail} font-ui`}>
              {mostFlags ? `${mostFlags.name} (${mostFlags.acronym ?? 'N/A'})` : '—'}
            </span>
          </div>
        </section>

        {/* View Toggles */}
        <div className={styles.controlsRow}>
          <span className={`${styles.controlsLabel} font-ui`}>Rank By:</span>
          <div className={styles.btnGroup}>
            <Link
              href="/scorecard?sort=risk_score"
              className={`${styles.toggleBtn} ${sort === 'risk_score' ? styles.btnActive : ''} font-ui`}
            >
              Average Risk Score
            </Link>
            <Link
              href="/scorecard?sort=discrepancies"
              className={`${styles.toggleBtn} ${sort === 'discrepancies' ? styles.btnActive : ''} font-ui`}
            >
              Confirmed Anomaly Signals
            </Link>
          </div>
        </div>

        {/* Scorecard Table */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={`${styles.th} ${styles.thRank} font-ui`}>Rank</th>
                <th className={`${styles.th} font-ui`}>Agency Name</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Average Risk</th>
                <th className={`${styles.th} font-ui`}>Severity Band</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>High Risk Cases</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Total Signals</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Total Awarded</th>
              </tr>
            </thead>
            <tbody>
              {agencies.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`${styles.emptyCell} font-ui`}>
                    No scorecard data found. Check your database seed state.
                  </td>
                </tr>
              ) : (
                agencies.map((a, index) => {
                  const band = getRiskBand(a.avg_risk_score);
                  return (
                    <tr key={a.agency_id} className={styles.tr}>
                      <td className={`${styles.td} ${styles.tdRank} font-mono`}>
                        #{index + 1}
                      </td>
                      <td className={styles.td}>
                        <Link href={`/agencies/${a.agency_id}`} className={styles.agencyLink}>
                          <span className={`${styles.agencyName} font-body`}>{a.name}</span>
                          {a.acronym && (
                            <span className={`${styles.agencyAcronym} font-mono`}>{a.acronym}</span>
                          )}
                        </Link>
                      </td>
                      <td className={`${styles.td} ${styles.tdNum} font-mono ${styles.riskHighlight}`}>
                        {a.avg_risk_score != null ? `${Math.round(a.avg_risk_score * 100)}%` : '—'}
                      </td>
                      <td className={styles.td}>
                        <span className={`${styles.bandBadge} ${band.className} font-ui`}>
                          {band.label}
                        </span>
                      </td>
                      <td className={`${styles.td} ${styles.tdNum} font-mono`}>
                        {a.high_risk_cases != null && a.high_risk_cases > 0 ? (
                          <span className={styles.flagCount}>{a.high_risk_cases}</span>
                        ) : (
                          <span className={styles.dash}>—</span>
                        )}
                      </td>
                      <td className={`${styles.td} ${styles.tdNum} font-mono`}>
                        {a.confirmed_discrepancies != null && a.confirmed_discrepancies > 0 ? (
                          <span className={styles.discCount}>{a.confirmed_discrepancies}</span>
                        ) : (
                          <span className={styles.dash}>—</span>
                        )}
                      </td>
                      <td className={`${styles.td} ${styles.tdNum} font-mono`}>
                        {formatPHP(a.total_awarded)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}
