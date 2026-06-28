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
    const res = await fetch(`${API_URL}/stats/summary`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getRecentDiscrepancies(): Promise<Discrepancy[]> {
  try {
    const res = await fetch(`${API_URL}/discrepancies?limit=6`, { next: { revalidate: 30 } });
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
    const res = await fetch(`${API_URL}/stats/charts`, { next: { revalidate: 30 } });
    if (!res.ok) throw new Error();
    return res.json();
  } catch (error) {
    console.error(error);
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
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={`${styles.heroTitle} font-display`}>
            Evidence-First <span className={styles.highlight}>Procurement Intelligence</span>
          </h1>
          <p className={`${styles.heroDesc} font-body`}>
            Veritas automatically audits public bidding registries, tracks agency spend overruns, and extracts legislative loopholes to expose transparency anomalies in the Philippines.
          </p>
          <div className={styles.searchBox}>
            <form action="/search" method="GET" className={styles.searchForm}>
              <input 
                type="text" 
                name="q" 
                placeholder="Search by supplier name, procuring agency, or case title..." 
                className={`${styles.heroSearchInput} font-body`}
              />
              <button type="submit" className={`${styles.heroSearchBtn} font-ui`}>Search Registry</button>
            </form>
          </div>
        </div>
      </section>

      <section className={styles.statsBar}>
        <div className={`${styles.stat} font-mono`}>
          <span className={styles.statValue}>{summary?.total_cases ?? 0}</span>
          <span className={styles.statLabel}>Projects indexed</span>
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
      
      {/* Donation/Support Banner */}
      <section className={styles.donationBanner}>
        <div className={styles.donationContent}>
          <div className={styles.donationIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-medium)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div className={styles.donationText}>
            <h3 className={`${styles.donationTitle} font-display`}>Support Veritas Philippines</h3>
            <p className={`${styles.donationDesc} font-body`}>
              Help us keep our database storage, API hosting, and ingestion pipelines running. Your contributions power public procurement accountability.
            </p>
          </div>
        </div>
        <a 
          href="https://ko-fi.com/santima" 
          target="_blank" 
          rel="noopener noreferrer" 
          className={`${styles.donationBtn} font-ui`}
        >
          Support on Ko-fi
        </a>
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
                    <Link href={`/projects/${discrepancy.case_id}`} className={styles.metaLink}>
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
