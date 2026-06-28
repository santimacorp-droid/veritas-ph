import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from './page.module.css';
import { AgencyCasesRiskChart, AgencyMethodShareChart } from '@/components/AnalyticsCharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://47.129.63.52:8000';

interface AgencyDetail {
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

interface AgencyCaseSummary {
  case_id: string;
  title: string;
  procurement_ref_no?: string;
  awarded_amount?: number;
  procurement_method?: string;
  award_date?: string;
  risk_score?: number;
  discrepancy_count?: number;
}

interface AgencyCasesResponse {
  cases: AgencyCaseSummary[];
  total: number;
}

async function getAgency(id: string): Promise<AgencyDetail | null> {
  const res = await fetch(`${API_URL}/agencies/${id}`, { next: { revalidate: 30 } });
  if (!res.ok) return null;
  return res.json();
}

async function getAgencyCases(id: string): Promise<AgencyCasesResponse> {
  const res = await fetch(`${API_URL}/agencies/${id}/cases?limit=20`, { next: { revalidate: 30 } });
  if (!res.ok) return { cases: [], total: 0 };
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

export default async function AgencyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [agency, casesData] = await Promise.all([
    getAgency(id),
    getAgencyCases(id),
  ]);

  if (!agency) notFound();

  const riskPct = agency.avg_risk_score ? Math.round(agency.avg_risk_score * 100) : 0;

  return (
    <div>
      <main className={styles.pageContent}>
        {/* Breadcrumb */}
        <nav className={`${styles.breadcrumb} font-ui`}>
          <Link href="/agencies">Agencies</Link>
          <span className={styles.breadcrumbSep}>›</span>
          <span className={styles.breadcrumbCurrent}>{agency.acronym ?? agency.name}</span>
        </nav>

        {/* Agency Hero */}
        <div className={styles.agencyHero}>
          <div className={styles.heroLeft}>
            <h1 className={`${styles.agencyName} font-display`}>{agency.name}</h1>
            <div className={`${styles.agencyMeta} font-ui`}>
              {agency.acronym && <span className={styles.metaChip}>{agency.acronym}</span>}
              {agency.publisher_name && (
                <>
                  <span className={styles.metaSep}>·</span>
                  <span className={styles.metaChip}>{agency.publisher_name}</span>
                </>
              )}
              {agency.agency_type && (
                <>
                  <span className={styles.metaSep}>·</span>
                  <span className={`${styles.metaChip} ${styles.metaType}`}>
                    {agency.agency_type.replace(/_/g, ' ')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Panel */}
        <div className={styles.statsPanel}>
          {[
            { label: 'Total Projects', value: agency.total_cases ?? 0 },
            { label: 'Total Awarded', value: formatPHP(agency.total_awarded) },
            { label: 'High Risk Projects', value: agency.high_risk_cases ?? 0, flag: true },
            {
              label: 'Confirmed Signals',
              value: agency.confirmed_discrepancies ?? 0,
              flag: (agency.confirmed_discrepancies ?? 0) > 0,
            },
          ].map(({ label, value, flag }) => (
            <div key={label} className={styles.statBlock}>
              <div className={`${styles.statLabel} font-ui`}>{label}</div>
              <div className={`${styles.statValue} ${flag ? styles.statFlagged : ''} font-mono`}>
                {String(value)}
              </div>
            </div>
          ))}
          {/* Avg risk with bar */}
          <div className={styles.statBlock}>
            <div className={`${styles.statLabel} font-ui`}>Avg Risk Score</div>
            <div className={styles.riskBarWrap}>
              <div className={styles.riskBarTrack}>
                <div
                  className={`${styles.riskBarFill} ${riskPct >= 70 ? styles.barHigh : riskPct >= 40 ? styles.barMed : styles.barLow}`}
                  style={{ width: `${riskPct}%` }}
                />
              </div>
              <span className={`${styles.riskBarLabel} font-mono`}>
                {agency.avg_risk_score?.toFixed(2) ?? '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Analytics Charts */}
        <div className={styles.chartsGrid}>
          <AgencyCasesRiskChart cases={casesData.cases} />
          <AgencyMethodShareChart cases={casesData.cases} />
        </div>

        {/* Cases Table */}
        <div className={styles.sectionHeader}>
          <span className="font-ui">Procurement Projects</span>
          <span className={`${styles.sectionCount} font-mono`}>
            {casesData.total} total
          </span>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={`${styles.th} font-ui`}>Title</th>
                <th className={`${styles.th} font-ui`}>Ref No.</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Awarded</th>
                <th className={`${styles.th} font-ui`}>Method</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Award Date</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Risk</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Signals</th>
              </tr>
            </thead>
            <tbody>
              {casesData.cases.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`${styles.emptyCell} font-ui`}>No cases found.</td>
                </tr>
              ) : (
                casesData.cases.map((agencyCase) => (
                  <tr key={agencyCase.case_id} className={styles.tr}>
                    <td className={styles.td}>
                      <Link href={`/projects/${agencyCase.case_id}`} className={`${styles.caseLink} font-body`}>
                        {agencyCase.title}
                      </Link>
                    </td>
                    <td className={`${styles.td} font-mono`} style={{ fontSize: 11, color: 'var(--color-data-blue)' }}>
                      {agencyCase.procurement_ref_no ?? '—'}
                    </td>
                    <td className={`${styles.td} ${styles.tdNum} font-mono`}>
                      {formatPHP(agencyCase.awarded_amount)}
                    </td>
                    <td className={`${styles.td} font-ui`} style={{ fontSize: 11, textTransform: 'capitalize' }}>
                      {agencyCase.procurement_method?.replace(/_/g, ' ') ?? '—'}
                    </td>
                    <td className={`${styles.td} ${styles.tdNum} font-mono`} style={{ fontSize: 11 }}>
                      {agencyCase.award_date ?? '—'}
                    </td>
                    <td className={`${styles.td} ${styles.tdNum}`}>
                      <RiskPip score={agencyCase.risk_score} />
                    </td>
                    <td className={`${styles.td} ${styles.tdNum} font-mono`}>
                      {agencyCase.discrepancy_count && agencyCase.discrepancy_count > 0
                        ? <span className={styles.discCount}>{agencyCase.discrepancy_count}</span>
                        : <span style={{ color: 'var(--color-ink-faint)' }}>—</span>}
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
