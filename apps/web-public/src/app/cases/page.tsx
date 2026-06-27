import Link from 'next/link';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface CaseSummary {
  case_id: string;
  title: string;
  procurement_ref_no?: string;
  planned_amount?: number;
  awarded_amount?: number;
  final_contract_amount?: number;
  award_date?: string;
  risk_score?: number;
  updated_at?: string;
  agency_id?: string;
  agency_name?: string;
  agency_acronym?: string;
  discrepancy_count?: number;
  geographic_scope?: string;
}

async function getCases(filters: { agency_id?: string; method?: string; category?: string; risk_min?: string; year?: string; region?: string }): Promise<{ total: number; cases: CaseSummary[] }> {
  try {
    const query = new URLSearchParams();
    query.append('limit', '50');
    if (filters.agency_id) query.append('agency_id', filters.agency_id);
    if (filters.method) query.append('procurement_method', filters.method);
    if (filters.category) query.append('category', filters.category);
    if (filters.risk_min) query.append('risk_min', filters.risk_min);
    if (filters.year) query.append('year', filters.year);
    if (filters.region) query.append('region', filters.region);

    const res = await fetch(`${API_URL}/cases?${query.toString()}`, { next: { revalidate: 30 } });
    if (!res.ok) return { total: 0, cases: [] };
    return res.json();
  } catch {
    return { total: 0, cases: [] };
  }
}

function formatPHP(val?: number) {
  if (val == null) return '—';
  if (val >= 1_000_000_000) return `₱${(val / 1_000_000_000).toFixed(2)}B`;
  if (val >= 1_000_000) return `₱${(val / 1_000_000).toFixed(2)}M`;
  return '₱' + val.toLocaleString('en-PH');
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

async function getAgenciesList(): Promise<{ agency_id: string; name: string; acronym?: string }[]> {
  try {
    const res = await fetch(`${API_URL}/agencies?limit=100`, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.agencies ?? [];
  } catch {
    return [];
  }
}

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ agency_id?: string; method?: string; category?: string; risk_min?: string; year?: string; region?: string }>;
}) {
  const filters = await searchParams;
  const [ { total, cases }, agencies ] = await Promise.all([
    getCases(filters),
    getAgenciesList(),
  ]);

  return (
    <div>

      <main className={styles.pageContent}>
        <div className={styles.pageHead}>
          <h1 className={`${styles.pageTitle} font-display`}>Procurement Cases</h1>
          <p className={`${styles.pageSubtitle} font-ui`}>
            Showing {total} audited cases, ordered by latest ingestion, risk, and award recency
          </p>
        </div>

        <form className={styles.filterForm} method="GET" action="/cases">
          <div className={styles.filterGroup}>
            <label className="font-ui">Agency</label>
            <select name="agency_id" defaultValue={filters.agency_id || ""}>
              <option value="">All Agencies</option>
              {agencies.map((a) => (
                <option key={a.agency_id} value={a.agency_id}>
                  {a.acronym ? `${a.acronym} — ${a.name}` : a.name}
                </option>
              ))}
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
          <div className={styles.filterGroup}>
            <label className="font-ui">Region</label>
            <select name="region" defaultValue={filters.region || ""}>
              <option value="">All Regions</option>
              <option value="NCR">NCR (National Capital Region)</option>
              <option value="CAR">CAR (Cordillera)</option>
              <option value="Region I">Region I (Ilocos)</option>
              <option value="Region II">Region II (Cagayan Valley)</option>
              <option value="Region III">Region III (Central Luzon)</option>
              <option value="Region IV-A">Region IV-A (CALABARZON)</option>
              <option value="MIMAROPA">MIMAROPA</option>
              <option value="Region V">Region V (Bicol)</option>
              <option value="Region VI">Region VI (Western Visayas)</option>
              <option value="Region VII">Region VII (Central Visayas)</option>
              <option value="Region VIII">Region VIII (Eastern Visayas)</option>
              <option value="Region IX">Region IX (Zamboanga)</option>
              <option value="Region X">Region X (Northern Mindanao)</option>
              <option value="Region XI">Region XI (Davao)</option>
              <option value="Region XII">Region XII (SOCCSKSARGEN)</option>
              <option value="Region XIII">Region XIII (Caraga)</option>
              <option value="BARMM">BARMM (Bangsamoro)</option>
              <option value="National">National / Central</option>
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
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Financials</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Award Date</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Updated</th>
                <th className={`${styles.th} font-ui`}>Region</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Risk</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Audit Flags</th>
              </tr>
            </thead>
            <tbody>
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={8} className={`${styles.emptyCell} font-ui`}>
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
                      <div className={styles.financialCell}>
                        {item.planned_amount && (
                          <div className={styles.abcAmount} title="Approved Budget for Contract (ABC)">
                            ABC: {formatPHP(item.planned_amount)}
                          </div>
                        )}
                        {item.awarded_amount && (
                          <div className={styles.awardedAmount}>
                            Award: {formatPHP(item.awarded_amount)}
                          </div>
                        )}
                        {item.final_contract_amount && (
                          <div className={`${styles.finalAmount} ${item.final_contract_amount > (item.awarded_amount ?? 0) ? styles.overrun : ''}`}>
                            Paid: {formatPHP(item.final_contract_amount)}
                            {item.final_contract_amount > (item.awarded_amount ?? 0) && ' ⚠️'}
                          </div>
                        )}
                        {!item.planned_amount && !item.awarded_amount && !item.final_contract_amount && (
                          <span className={styles.dash}>-</span>
                        )}
                      </div>
                    </td>
                    <td className={`${styles.td} ${styles.tdNum} font-mono`}>
                      {formatDate(item.award_date)}
                    </td>
                    <td className={`${styles.td} ${styles.tdNum} font-mono`}>
                      {formatDate(item.updated_at)}
                    </td>
                    <td className={`${styles.td} font-body`} style={{ color: 'var(--color-ink-secondary)', fontSize: '12px' }}>
                      {item.geographic_scope ?? 'National'}
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

      </main>
    </div>
  );
}
