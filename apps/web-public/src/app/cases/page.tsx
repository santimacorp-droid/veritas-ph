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

async function getCases(filters: { agency_id?: string; method?: string; category?: string; risk_min?: string; year?: string }): Promise<{ total: number; cases: CaseSummary[] }> {
  try {
    const query = new URLSearchParams();
    query.append('limit', '50');
    if (filters.agency_id) query.append('agency_id', filters.agency_id);
    if (filters.method) query.append('procurement_method', filters.method);
    if (filters.category) query.append('category', filters.category);
    if (filters.risk_min) query.append('risk_min', filters.risk_min);
    if (filters.year) query.append('year', filters.year);

    const res = await fetch(`${API_URL}/cases?${query.toString()}`, { next: { revalidate: 30 } });
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

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ agency_id?: string; method?: string; category?: string; risk_min?: string; year?: string }>;
}) {
  const filters = await searchParams;
  const { total, cases } = await getCases(filters);

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
          {['Cases', 'Agencies', 'Suppliers', 'Scorecard', 'Map', 'Laws', 'Methodology'].map((item) => (
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

        <form className={styles.filterForm} method="GET" action="/cases">
          <div className={styles.filterGroup}>
            <label className="font-ui">Agency</label>
            <select name="agency_id" defaultValue={filters.agency_id || ""}>
              <option value="">All Agencies</option>
              <option value="8a7b6c5d-4e3f-2a1b-0c9d-8e7f6a5b4c3d">DPWH</option>
              <option value="1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d">DepEd</option>
              <option value="2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e">DOH</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className="font-ui">Method</label>
            <select name="method" defaultValue={filters.method || ""}>
              <option value="">All Methods</option>
              <option value="public_bidding">Public Bidding</option>
              <option value="negotiated">Negotiated</option>
              <option value="shopping">Shopping</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className="font-ui">Category</label>
            <select name="category" defaultValue={filters.category || ""}>
              <option value="">All Categories</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="goods">Goods</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className="font-ui">Min Risk</label>
            <select name="risk_min" defaultValue={filters.risk_min || ""}>
              <option value="">All Risks</option>
              <option value="0.70">High (&gt;= 0.70)</option>
              <option value="0.40">Medium (&gt;= 0.40)</option>
              <option value="0.01">Low / Any</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className="font-ui">Year</label>
            <select name="year" defaultValue={filters.year || ""}>
              <option value="">All Years</option>
              {Array.from({ length: 2026 - 2010 + 1 }, (_, i) => 2026 - i).map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className={`${styles.filterBtn} font-ui`}>Apply</button>
            <Link href="/cases" className={`${styles.clearBtn} font-ui`}>Clear</Link>
          </div>
        </form>

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
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Audit Flags</th>
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
          Cases are listed from public records only. Flags shown elsewhere in Veritas are
          audit anomaly indicators and not legal determinations.
        </footer>
      </main>
    </div>
  );
}
