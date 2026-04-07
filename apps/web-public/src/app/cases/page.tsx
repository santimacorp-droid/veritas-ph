import Link from 'next/link';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface CaseSummary {
  case_id: string;
  title: string;
  procurement_ref_no?: string;
  awarded_amount?: number;
  award_date?: string;
  risk_score?: number;
  updated_at?: string;
  agency_id?: string;
  agency_name?: string;
  agency_acronym?: string;
  discrepancy_count?: number;
}

async function getCases(): Promise<{ total: number; cases: CaseSummary[] }> {
  try {
    const res = await fetch(`${API_URL}/cases?limit=50`, { cache: 'no-store' });
    if (!res.ok) return { total: 0, cases: [] };
    return res.json();
  } catch {
    return { total: 0, cases: [] };
  }
}

function formatPHP(val?: number) {
  if (val == null) return '-';
  if (val >= 1_000_000_000) return `PHP ${(val / 1_000_000_000).toFixed(1)}B`;
  if (val >= 1_000_000) return `PHP ${(val / 1_000_000).toFixed(1)}M`;
  return 'PHP ' + val.toLocaleString('en-PH');
}

function RiskBar({ score }: { score?: number }) {
  if (score == null) return <span className={styles.dash}>-</span>;
  const pct = Math.round(score * 100);
  const cls = pct >= 70 ? styles.barHigh : pct >= 40 ? styles.barMed : styles.barLow;
  return (
    <div className={styles.riskBarWrap}>
      <div className={styles.riskBarTrack}>
        <div className={`${styles.riskBarFill} ${cls}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`${styles.riskBarLabel} font-mono`}>{score.toFixed(2)}</span>
    </div>
  );
}

function formatDate(value?: string) {
  return value ? value.slice(0, 10) : '-';
}

export default async function CasesPage() {
  const { total, cases } = await getCases();

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
          {['Cases', 'Agencies', 'Suppliers', 'Methodology'].map((item) => (
            <Link
              key={item}
              href={`/${item.toLowerCase()}`}
              className={`${styles.navLink} ${item === 'Cases' ? styles.navActive : ''} font-ui`}
            >
              {item}
            </Link>
          ))}
        </nav>
      </header>

      <main className={styles.pageContent}>
        <div className={styles.pageHead}>
          <h1 className={`${styles.pageTitle} font-display`}>Procurement Cases</h1>
          <p className={`${styles.pageSubtitle} font-ui`}>
            {total} cases ordered by latest ingestion, then risk and award recency
          </p>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={`${styles.th} font-ui`}>Case</th>
                <th className={`${styles.th} font-ui`}>Agency</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Awarded</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Award Date</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Updated</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Risk</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Signals</th>
              </tr>
            </thead>
            <tbody>
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`${styles.emptyCell} font-ui`}>
                    No cases found. Ensure the database is seeded.
                  </td>
                </tr>
              ) : (
                cases.map((item) => (
                  <tr key={item.case_id} className={styles.tr}>
                    <td className={styles.td}>
                      <Link href={`/cases/${item.case_id}`} className={styles.agencyLink}>
                        <span className={`${styles.agencyName} font-body`}>{item.title}</span>
                        <span className={`${styles.agencyAcronym} font-mono`}>
                          {item.procurement_ref_no ?? item.case_id}
                        </span>
                      </Link>
                    </td>
                    <td className={styles.td}>
                      {item.agency_id ? (
                        <Link href={`/agencies/${item.agency_id}`} className={styles.agencyLink}>
                          <span className={`${styles.agencyName} font-body`}>
                            {item.agency_name ?? item.agency_acronym ?? 'Agency'}
                          </span>
                          {item.agency_acronym && (
                            <span className={`${styles.agencyAcronym} font-mono`}>
                              {item.agency_acronym}
                            </span>
                          )}
                        </Link>
                      ) : (
                        <span className={styles.dash}>-</span>
                      )}
                    </td>
                    <td className={`${styles.td} ${styles.tdNum} font-mono`}>
                      {formatPHP(item.awarded_amount)}
                    </td>
                    <td className={`${styles.td} ${styles.tdNum} font-mono`}>
                      {formatDate(item.award_date)}
                    </td>
                    <td className={`${styles.td} ${styles.tdNum} font-mono`}>
                      {formatDate(item.updated_at)}
                    </td>
                    <td className={`${styles.td} ${styles.tdNum}`}>
                      <RiskBar score={item.risk_score} />
                    </td>
                    <td className={`${styles.td} ${styles.tdNum} font-mono`}>
                      {item.discrepancy_count != null && item.discrepancy_count > 0 ? (
                        <span className={styles.discCount}>{item.discrepancy_count}</span>
                      ) : (
                        <span className={styles.dash}>-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className={`${styles.disclaimer} font-ui`}>
          Cases are listed from public records only. Signals shown elsewhere in Veritas are
          anomaly indicators and not legal determinations.
        </footer>
      </main>
    </div>
  );
}
