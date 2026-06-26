import Link from 'next/link';
import styles from './page.module.css';
import {
  DiscrepancyCard,
} from '@/components/DiscrepancyCard/DiscrepancyCard';
import {
  RiskDistributionBarChart,
  AgencyConcentrationPieChart,
} from '@/components/AnalyticsCharts';
import { PublicSummary, Discrepancy } from '@veritas/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function getSummary(): Promise<PublicSummary | null> {
  try {
    const res = await fetch(`${API_URL}/stats/summary`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getRecentDiscrepancies(): Promise<Discrepancy[]> {
  try {
    const res = await fetch(`${API_URL}/discrepancies?limit=6`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.discrepancies ?? [];
  } catch {
    return [];
  }
}

interface RiskData {
  level: string;
  count: number;
}

interface AgencyData {
  agency_name: string;
  total_awarded: number;
}

async function getChartStats(): Promise<{ risk_distribution: RiskData[]; agency_distribution: AgencyData[] }> {
  try {
    const res = await fetch(`${API_URL}/stats/charts`, { cache: 'no-store' });
    if (!res.ok) throw new Error();
    return res.json();
  } catch {
    return {
      risk_distribution: [
        { level: 'Low', count: 0 },
        { level: 'Medium', count: 0 },
        { level: 'High', count: 0 },
      ],
      agency_distribution: [],
    };
  }
}

function formatPesoCompact(value?: number | null) {
  if (value == null) return '₱0';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export default async function Home() {
  const [summary, discrepancies, chartStats] = await Promise.all([
    getSummary(),
    getRecentDiscrepancies(),
    getChartStats(),
  ]);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.wordmark}>
          <h1 className={`${styles.wordmarkTitle} font-display`}>VERITAS</h1>
          <p className={`${styles.wordmarkSub} font-ui`}>
            Philippines Procurement Transparency
          </p>
        </div>
        <nav className={styles.nav}>
          <Link href="/search" className={`${styles.navLink} font-ui`}>Search</Link>
          <Link href="/cases" className={`${styles.navLink} font-ui`}>Cases</Link>
          <Link href="/agencies" className={`${styles.navLink} font-ui`}>Agencies</Link>
          <Link href="/suppliers" className={`${styles.navLink} font-ui`}>Suppliers</Link>
          <Link href="/scorecard" className={`${styles.navLink} font-ui`}>Scorecard</Link>
          <Link href="/map" className={`${styles.navLink} font-ui`}>Map</Link>
          <Link href="/laws" className={`${styles.navLink} font-ui`}>Laws</Link>
          <Link href="/about" className={`${styles.navLink} font-ui`}>About</Link>
        </nav>
      </header>

      <section className={styles.statsBar}>
        <div className={`${styles.stat} font-mono`}>
          <span className={styles.statValue}>{summary?.total_cases ?? 0}</span>
          <span className={styles.statLabel}>Cases indexed</span>
        </div>
        <div className={`${styles.stat} font-mono`}>
          <span className={`${styles.statValue} ${styles.statFlag}`}>
            {summary?.total_discrepancies ?? 0}
          </span>
          <span className={styles.statLabel}>Audit anomaly flags</span>
        </div>
        <div className={`${styles.stat} font-mono`}>
          <span className={styles.statValue}>{summary?.total_agencies ?? 0}</span>
          <span className={styles.statLabel}>Agencies tracked</span>
        </div>
        <div className={`${styles.stat} font-mono`}>
          <span className={styles.statValue}>
            {formatPesoCompact(summary?.total_awarded)}
          </span>
          <span className={styles.statLabel}>Total value indexed</span>
        </div>
      </section>

      {/* Analytics Dashboard Section */}
      <section className={styles.chartsGrid}>
        <RiskDistributionBarChart riskData={chartStats.risk_distribution} />
        <AgencyConcentrationPieChart agencyData={chartStats.agency_distribution} />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={`${styles.sectionTitle} font-display`}>
            Recent Audit Anomaly Flags
          </h2>
          <span className={`${styles.sectionNote} font-ui`}>
            Confirmed anomaly flags from public procurement records
          </span>
        </div>

        {discrepancies.length === 0 ? (
          <div className={`${styles.emptyState} font-body`}>
            No reviewed anomaly flag cards are available yet. Seed the database or run the crawler
            to populate the public feed.
          </div>
        ) : (
          <div className={styles.discrepancyList}>
            {discrepancies.map((discrepancy) => (
              <section key={discrepancy.discrepancy_id} className={styles.discrepancyBlock}>
                <div className={`${styles.discrepancyMeta} font-ui`}>
                  <div className={styles.discrepancyMetaLeft}>
                    <Link href={`/cases/${discrepancy.case_id}`} className={styles.metaLink}>
                      {discrepancy.case_title ?? 'Open case'}
                    </Link>
                    {discrepancy.agency_acronym && (
                      <span>&bull; {discrepancy.agency_acronym}</span>
                    )}
                  </div>
                  <span className={styles.discrepancyMetaRight}>
                    {discrepancy.discrepancy_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <DiscrepancyCard {...discrepancy} />
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
