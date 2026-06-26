import Link from 'next/link';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface LawSummary {
  law_id: string;
  title: string;
  short_title?: string;
  description?: string;
  date_passed?: string;
  status: string;
  integrity_score?: number;
  governance_score?: number;
  analysis_status?: string;
  loophole_count?: number;
}

async function getLaws(): Promise<{ total: number; laws: LawSummary[] }> {
  try {
    const res = await fetch(`${API_URL}/laws?limit=50`, { cache: 'no-store' });
    if (!res.ok) return { total: 0, laws: [] };
    return res.json();
  } catch {
    return { total: 0, laws: [] };
  }
}

function formatDate(value?: string) {
  return value ? value.slice(0, 10) : '-';
}

export default async function LawsPage() {
  const { total, laws } = await getLaws();

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
              className={`${styles.navLink} ${item === 'Laws' ? styles.navActive : ''} font-ui`}
            >
              {item}
            </Link>
          ))}
        </nav>
      </header>

      <main className={styles.pageContent}>
        <div className={styles.pageHead}>
          <h1 className={`${styles.pageTitle} font-display`}>Legislation Audits & Vulnerabilities</h1>
          <p className={`${styles.pageSubtitle} font-ui`}>
            {total} laws tracked and audited for structural flaws and corruption loopholes
          </p>
        </div>

        {/* Automated Law Crawler Explanation Banner */}
        <div className={styles.crawlerBanner}>
          <div className={styles.bannerIcon}>🔬</div>
          <div className={styles.bannerContent}>
            <h3 className="font-display">Automated Law Crawler & AI Vulnerability Auditing</h3>
            <p className="font-body">
              Veritas automatically crawls public legislative registries (such as the Official Gazette) for republic acts and directives. 
              Our multi-pass AI engine scans the legislation section-by-section to identify systemic loopholes, rate oversight strengths, and suggest concrete revisions to block corruption.
            </p>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={`${styles.th} font-ui`}>Legislation</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Integrity Index</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Oversight Score</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Loopholes</th>
                <th className={`${styles.th} font-ui`}>Status</th>
                <th className={`${styles.th} font-ui`}>Date Passed</th>
              </tr>
            </thead>
            <tbody>
              {laws.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`${styles.emptyCell} font-ui`}>
                    No laws found. Ensure the database is seeded.
                  </td>
                </tr>
              ) : (
                laws.map((item) => {
                  const scoreCls = (score?: number) => {
                    if (score == null) return '';
                    return score >= 70 ? styles.badgeLow : score >= 40 ? styles.badgeWarn : styles.badgeCritical;
                  };

                  return (
                    <tr key={item.law_id} className={styles.tr}>
                      <td className={styles.td} style={{ maxWidth: '400px' }}>
                        <Link href={`/laws/${item.law_id}`} className={styles.lawLink}>
                          <span className={`${styles.lawTitle} font-body`}>{item.title}</span>
                          {item.short_title && (
                            <span className={`${styles.lawShort} font-mono`}>{item.short_title}</span>
                          )}
                          {item.description && (
                            <span className={`${styles.lawDesc} font-body`}>{item.description}</span>
                          )}
                        </Link>
                      </td>
                      <td className={`${styles.td} ${styles.tdNum}`}>
                        {item.integrity_score != null ? (
                          <div className={styles.scoreGroup}>
                            <span className={`${styles.scoreValue} font-mono`} style={{ color: item.integrity_score >= 70 ? '#2ecc71' : item.integrity_score >= 40 ? '#ffb700' : '#ff8a8a' }}>
                              {item.integrity_score}/100
                            </span>
                            <span className={`${styles.scoreLabel} font-ui`}>loophole resistance</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-ink-muted)' }} className="font-ui">Not Audited</span>
                        )}
                      </td>
                      <td className={`${styles.td} ${styles.tdNum}`}>
                        {item.governance_score != null ? (
                          <div className={styles.scoreGroup}>
                            <span className={`${styles.scoreValue} font-mono`} style={{ color: item.governance_score >= 70 ? '#2ecc71' : item.governance_score >= 40 ? '#ffb700' : '#ff8a8a' }}>
                              {item.governance_score}/100
                            </span>
                            <span className={`${styles.scoreLabel} font-ui`}>oversight strength</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-ink-muted)' }} className="font-ui">Not Audited</span>
                        )}
                      </td>
                      <td className={`${styles.td} ${styles.tdNum}`}>
                        {item.loophole_count != null && item.loophole_count > 0 ? (
                          <span className={`${styles.loopCountBadge} ${item.loophole_count >= 3 ? styles.badgeCritical : styles.badgeWarn} font-mono`}>
                            {item.loophole_count} {item.loophole_count === 1 ? 'flaw' : 'flaws'}
                          </span>
                        ) : item.integrity_score != null ? (
                          <span className={`${styles.loopCountBadge} ${styles.badgeLow} font-mono`}>0 flaws</span>
                        ) : (
                          <span style={{ color: 'var(--color-ink-muted)' }} className="font-ui">-</span>
                        )}
                      </td>
                      <td className={styles.td}>
                        <span className={styles.statusBadge} data-status={item.status.toLowerCase()}>
                          {item.status}
                        </span>
                      </td>
                      <td className={`${styles.td} font-mono`}>
                        {formatDate(item.date_passed)}
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
