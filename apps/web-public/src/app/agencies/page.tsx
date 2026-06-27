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

async function getAgencies(): Promise<{ total: number; agencies: Agency[] }> {
  try {
    const res = await fetch(`${API_URL}/agencies?limit=50`, { next: { revalidate: 30 } });
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

function RiskBar({ score }: { score?: number }) {
  if (score == null) return <span className={styles.dash}>—</span>;
  const pct   = Math.round(score * 100);
  const cls   = pct >= 70 ? styles.barHigh : pct >= 40 ? styles.barMed : styles.barLow;
  return (
    <div className={styles.riskBarWrap}>
      <div className={styles.riskBarTrack}>
        <div className={`${styles.riskBarFill} ${cls}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`${styles.riskBarLabel} font-mono`}>{score.toFixed(2)}</span>
    </div>
  );
}

export default async function AgenciesPage() {
  const { total, agencies } = await getAgencies();

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────── */}
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
          {['Cases', 'Agencies', 'Suppliers', 'Scorecard', 'Map', 'Laws', 'Methodology'].map((item) => (
            <Link
              key={item}
              href={`/${item.toLowerCase()}`}
              className={`${styles.navLink} ${item === 'Agencies' ? styles.navActive : ''} font-ui`}
            >
              {item}
            </Link>
          ))}
        </nav>
      </header>

      <main className={styles.pageContent}>
        {/* Page Head */}
        <div className={styles.pageHead}>
          <h1 className={`${styles.pageTitle} font-display`}>Procuring Entities</h1>
          <p className={`${styles.pageSubtitle} font-ui`}>
            {total} agencies tracked · Sorted by total awarded value
          </p>
        </div>

        {/* Table */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={`${styles.th} font-ui`}>Agency</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Cases</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Total Awarded</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Avg Risk</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>High Risk</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Signals</th>
              </tr>
            </thead>
            <tbody>
              {agencies.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`${styles.emptyCell} font-ui`}>
                    No agencies found. Ensure the database is seeded.
                  </td>
                </tr>
              ) : (
                agencies.map((a) => (
                  <tr key={a.agency_id} className={styles.tr}>
                    <td className={styles.td}>
                      <Link href={`/agencies/${a.agency_id}`} className={styles.agencyLink}>
                        <span className={`${styles.agencyName} font-body`}>{a.name}</span>
                        {a.acronym && (
                          <span className={`${styles.agencyAcronym} font-mono`}>{a.acronym}</span>
                        )}
                      </Link>
                    </td>
                    <td className={`${styles.td} ${styles.tdNum} font-mono`}>
                      {a.total_cases ?? 0}
                    </td>
                    <td className={`${styles.td} ${styles.tdNum} font-mono`}>
                      {formatPHP(a.total_awarded)}
                    </td>
                    <td className={`${styles.td} ${styles.tdNum}`}>
                      <RiskBar score={a.avg_risk_score} />
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className={`${styles.disclaimer} font-ui`}>
          All data sourced from public Philippine government records. Risk scores are
          statistical anomaly indicators, not assessments of misconduct.
        </footer>
      </main>
    </div>
  );
}
