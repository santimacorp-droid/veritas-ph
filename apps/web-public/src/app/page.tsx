import Link from 'next/link';
import styles from './page.module.css';
import {
  DiscrepancyCard,
  type DiscrepancyCardProps,
} from '@/components/DiscrepancyCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface SummaryStats {
  total_cases: number;
  total_agencies: number;
  total_discrepancies: number;
  total_awarded: number;
}

interface RecentDiscrepancy extends DiscrepancyCardProps {
  case_id: string;
  case_title?: string;
  procurement_ref_no?: string;
  agency_name?: string;
  agency_acronym?: string;
}

async function getSummary(): Promise<SummaryStats | null> {
  try {
    const res = await fetch(`${API_URL}/stats/summary`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getRecentDiscrepancies(): Promise<RecentDiscrepancy[]> {
  try {
    const res = await fetch(`${API_URL}/discrepancies?limit=6`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.discrepancies ?? [];
  } catch {
    return [];
  }
}

function formatPesoCompact(value?: number | null) {
  if (value == null) return 'â‚±0';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export default async function Home() {
  const [summary, discrepancies] = await Promise.all([
    getSummary(),
    getRecentDiscrepancies(),
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
          <span className={styles.statLabel}>Confirmed signals</span>
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

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={`${styles.sectionTitle} font-display`}>
            Recent Discrepancies
          </h2>
          <span className={`${styles.sectionNote} font-ui`}>
            Confirmed anomaly indicators from public procurement records
          </span>
        </div>

        {discrepancies.length === 0 ? (
          <div className={`${styles.emptyState} font-body`}>
            No reviewed discrepancy cards are available yet. Seed the database or run the crawler
            to populate the public feed.
          </div>
        ) : (
          <div className={styles.discrepancyList}>
            {discrepancies.map((discrepancy) => (
              <section key={discrepancy.discrepancy_id} className={styles.discrepancyBlock}>
                <div className={`${styles.discrepancyMeta} font-ui`}>
                  <div className={styles.discrepancyMetaLeft}>
                    <Link href={`/cases/${discrepancy.case_id}`} className={styles.metaLink}>
                      {discrepancy.procurement_ref_no ?? discrepancy.case_title ?? 'Open case'}
                    </Link>
                    {discrepancy.agency_acronym && (
                      <span>{discrepancy.agency_acronym}</span>
                    )}
                  </div>
                  <span className={styles.discrepancyMetaRight}>
                    {discrepancy.case_title}
                  </span>
                </div>
                <DiscrepancyCard
                  discrepancy_id={discrepancy.discrepancy_id}
                  discrepancy_type={discrepancy.discrepancy_type}
                  severity={discrepancy.severity}
                  explanation={discrepancy.explanation}
                  rule_id={discrepancy.rule_id}
                  rule_version={discrepancy.rule_version}
                  why_fired={discrepancy.why_fired}
                  thresholds_applied={discrepancy.thresholds_applied}
                  generated_at={discrepancy.generated_at}
                  review_status={discrepancy.review_status}
                  evidence={discrepancy.evidence}
                />
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
