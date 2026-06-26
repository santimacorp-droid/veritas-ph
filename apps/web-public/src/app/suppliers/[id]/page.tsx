import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from './page.module.css';
import { SupplierAgencyConcentrationChart, SupplierAwardTrendChart } from '@/components/AnalyticsCharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface SupplierProfile {
  supplier_id: string;
  canonical_name: string;
  supplier_type?: string;
  primary_address?: string;
  psgc_province?: string;
  philgeps_id?: string;
  total_awards?: number;
  total_awarded?: number;
  first_award_date?: string;
  last_award_date?: string;
  agency_count?: number;
}

interface SupplierAward {
  award_id: string;
  award_date?: string;
  amount?: number;
  case_id: string;
  title: string;
  procurement_ref_no?: string;
  risk_score?: number;
  agency_id?: string;
  agency_name?: string;
  agency_acronym?: string;
}

async function getSupplier(id: string): Promise<SupplierProfile | null> {
  const res = await fetch(`${API_URL}/suppliers/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

interface SupplierDuplicate {
  supplier_id: string;
  canonical_name: string;
  similarity: number;
}

async function getSupplierDuplicates(id: string): Promise<SupplierDuplicate[]> {
  try {
    const res = await fetch(`${API_URL}/suppliers/${id}/duplicates`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.duplicates || [];
  } catch {
    return [];
  }
}

async function getSupplierAwards(id: string): Promise<{ total: number; awards: SupplierAward[] }> {
  const res = await fetch(`${API_URL}/suppliers/${id}/awards?limit=20`, { cache: 'no-store' });
  if (!res.ok) return { total: 0, awards: [] };
  return res.json();
}

function formatPHP(val?: number) {
  if (val == null) return '—';
  return '₱ ' + val.toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

function RiskPip({ score }: { score?: number }) {
  if (score == null) return <span>—</span>;
  const pct = Math.round(score * 100);
  const cls = pct >= 70 ? styles.riskHigh : pct >= 40 ? styles.riskMed : styles.riskLow;
  return <span className={`${styles.riskPip} ${cls} font-mono`}>{score.toFixed(2)}</span>;
}

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [supplier, awardsData, duplicates] = await Promise.all([
    getSupplier(id),
    getSupplierAwards(id),
    getSupplierDuplicates(id),
  ]);

  if (!supplier) notFound();

  return (
    <div>
      <header className={styles.siteHeader}>
        <div className={styles.topbar}>
          <Link href="/" className={styles.siteLogo}>
            <span className={`${styles.logoName} font-display`}>Veritas</span>
            <span className={`${styles.logoTagline} font-ui`}>Philippines Procurement Transparency</span>
          </Link>
        </div>
        <nav className={styles.navStrip}>
          {['Cases', 'Agencies', 'Suppliers', 'Scorecard', 'Map', 'Laws', 'Methodology'].map((item) => (
            <Link
              key={item}
              href={`/${item.toLowerCase()}`}
              className={`${styles.navLink} ${item === 'Suppliers' ? styles.navActive : ''} font-ui`}
            >
              {item}
            </Link>
          ))}
        </nav>
      </header>

      <main className={styles.pageContent}>
        <nav className={`${styles.breadcrumb} font-ui`}>
          <Link href="/suppliers">Suppliers</Link>
          <span className={styles.breadcrumbSep}>›</span>
          <span className={styles.breadcrumbCurrent}>{supplier.canonical_name}</span>
        </nav>

        <div className={styles.agencyHero}>
          <div className={styles.heroLeft}>
            <h1 className={`${styles.agencyName} font-display`}>{supplier.canonical_name}</h1>
            <div className={`${styles.agencyMeta} font-ui`}>
              {supplier.supplier_type && <span className={styles.metaChip}>{supplier.supplier_type}</span>}
              {supplier.psgc_province && (
                <>
                  <span className={styles.metaSep}>·</span>
                  <span className={styles.metaChip}>{supplier.psgc_province}</span>
                </>
              )}
              {supplier.primary_address && (
                <>
                  <span className={styles.metaSep}>·</span>
                  <span className={styles.metaChip}>{supplier.primary_address}</span>
                </>
              )}
              {supplier.philgeps_id && (
                <>
                  <span className={styles.metaSep}>·</span>
                  <span className={styles.metaChip}>
                    PhilGEPS ID:{' '}
                    <a
                      href="https://www.philgeps.gov.ph/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--color-data-blue)', textDecoration: 'underline' }}
                    >
                      {supplier.philgeps_id}
                    </a>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className={styles.statsPanel}>
          {[
            { label: 'Total Awards', value: supplier.total_awards ?? 0 },
            { label: 'Total Awarded', value: formatPHP(supplier.total_awarded) },
            { label: 'Agencies', value: supplier.agency_count ?? 0 },
            { label: 'First Award', value: supplier.first_award_date ?? '—' },
            { label: 'Last Award', value: supplier.last_award_date ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className={styles.statBlock}>
              <div className={`${styles.statLabel} font-ui`}>{label}</div>
              <div className={`${styles.statValue} font-mono`}>{String(value)}</div>
            </div>
          ))}
        </div>

        {/* Analytics Charts */}
        <div className={styles.chartsGrid}>
          <SupplierAgencyConcentrationChart awards={awardsData.awards} />
          <SupplierAwardTrendChart awards={awardsData.awards} />
        </div>

        {duplicates.length > 0 && (
          <div style={{ background: 'var(--color-flag-light, #2a1a1a)', border: '1px solid var(--color-flag, #ff5a5a)', padding: '20px', marginBottom: '24px', borderRadius: '4px' }}>
            <h3 className="font-ui" style={{ margin: '0 0 8px', color: 'var(--color-flag, #ff5a5a)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ⚠️ Entity Resolution Alert — Potential Aliases detected
            </h3>
            <p className="font-body" style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--color-ink-secondary, #ccc)', lineHeight: '1.5' }}>
              Our supplier deduplication resolver has detected other registered suppliers in the database with highly similar names or identifiers:
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {duplicates.map((dup) => (
                <Link
                  key={dup.supplier_id}
                  href={`/suppliers/${dup.supplier_id}`}
                  style={{
                    background: 'rgba(255, 90, 90, 0.1)',
                    border: '1px solid rgba(255, 90, 90, 0.3)',
                    padding: '6px 12px',
                    borderRadius: '2px',
                    fontSize: '12px',
                    color: '#ff8a8a',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'border-color 150ms'
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{dup.canonical_name}</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    ({Math.round(dup.similarity * 100)}% match)
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className={styles.sectionHeader}>
          <span className="font-ui">Award History</span>
          <span className={`${styles.sectionCount} font-mono`}>
            {awardsData.total} total
          </span>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={`${styles.th} font-ui`}>Case</th>
                <th className={`${styles.th} font-ui`}>Agency</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Award Date</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Amount</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Risk</th>
              </tr>
            </thead>
            <tbody>
              {awardsData.awards.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`${styles.emptyCell} font-ui`}>No awards found.</td>
                </tr>
              ) : (
                awardsData.awards.map((award) => (
                  <tr key={award.award_id} className={styles.tr}>
                    <td className={styles.td}>
                      <Link href={`/cases/${award.case_id}`} className={`${styles.caseLink} font-body`}>
                        {award.title}
                      </Link>
                      <div className={`${styles.sectionCount} font-mono`}>
                        {award.procurement_ref_no ?? award.case_id}
                      </div>
                    </td>
                    <td className={styles.td}>
                      {award.agency_id ? (
                        <Link href={`/agencies/${award.agency_id}`} className={`${styles.caseLink} font-body`}>
                          {award.agency_name ?? award.agency_acronym ?? 'Agency'}
                        </Link>
                      ) : (
                        <span className={styles.breadcrumbCurrent}>—</span>
                      )}
                    </td>
                    <td className={`${styles.td} ${styles.tdNum} font-mono`}>
                      {award.award_date ?? '—'}
                    </td>
                    <td className={`${styles.td} ${styles.tdNum} font-mono`}>
                      {formatPHP(award.amount)}
                    </td>
                    <td className={`${styles.td} ${styles.tdNum}`}>
                      <RiskPip score={award.risk_score} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className={`${styles.disclaimer} font-ui`}>
          Supplier pages summarize only awards currently linked to procurement cases in Veritas.
        </footer>
      </main>
    </div>
  );
}
