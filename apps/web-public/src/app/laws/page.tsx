"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

const API_URL = typeof window === 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000')
  : '/api';

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

function formatDate(value?: string) {
  return value ? value.slice(0, 10) : '-';
}

export default function LawsPage() {
  const [laws, setLaws] = useState<LawSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [auditFilter, setAuditFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');

  useEffect(() => {
    async function loadLaws() {
      try {
        const res = await fetch(`${API_URL}/laws?limit=1000`);
        if (res.ok) {
          const data = await res.json();
          // Filter out any laws that have dummy/placeholder data
          const rawLaws = (data.laws || []) as LawSummary[];
          const cleanedLaws = rawLaws.filter(l => 
            !l.title.toLowerCase().includes("dummy") && 
            !l.title.toLowerCase().includes("placeholder") &&
            !(l.short_title && l.short_title.toLowerCase().includes("mock"))
          );
          setLaws(cleanedLaws);
        }
      } catch (err) {
        console.error("Failed to load laws", err);
      } finally {
        setLoading(false);
      }
    }
    loadLaws();
  }, []);

  const filteredLaws = laws.filter(item => {
    // 1. Search query match
    const query = search.toLowerCase();
    const titleMatch = item.title.toLowerCase().includes(query);
    const shortMatch = item.short_title?.toLowerCase().includes(query) ?? false;
    const descMatch = item.description?.toLowerCase().includes(query) ?? false;
    const matchesSearch = !search || titleMatch || shortMatch || descMatch;

    // 2. Status match (active vs repealed)
    const matchesStatus = statusFilter === 'all' || item.status.toLowerCase() === statusFilter;

    // 3. Audit status match (audited vs not audited)
    const isAudited = item.integrity_score != null;
    const matchesAudit = auditFilter === 'all' || 
      (auditFilter === 'audited' && isAudited) || 
      (auditFilter === 'not_audited' && !isAudited);

    // 4. Risk / Integrity Score match
    let matchesRisk = true;
    if (riskFilter !== 'all') {
      if (!isAudited) {
        matchesRisk = false;
      } else if (item.integrity_score != null) {
        if (riskFilter === 'critical') {
          matchesRisk = item.integrity_score < 40;
        } else if (riskFilter === 'warn') {
          matchesRisk = item.integrity_score >= 40 && item.integrity_score < 70;
        } else if (riskFilter === 'low') {
          matchesRisk = item.integrity_score >= 70;
        }
      }
    }

    return matchesSearch && matchesStatus && matchesAudit && matchesRisk;
  });

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
            {filteredLaws.length} of {laws.length} laws filtered · Audited for structural flaws and corruption loopholes
          </p>
        </div>

        {/* Automated Law Crawler Explanation Banner */}
        <div className={styles.crawlerBanner}>
          <div className={styles.bannerIcon}>🔬</div>
          <div className={styles.bannerContent}>
            <h3 className="font-display">Automated Law Crawler & AI Vulnerability Auditing</h3>
            <p className="font-body">
              Veritas automatically crawls public legislative registries (such as the Official Gazette and Lawphil) for republic acts and directives. 
              Our multi-pass AI engine scans the legislation section-by-section to identify systemic loopholes, rate oversight strengths, and suggest concrete revisions to block corruption.
            </p>
          </div>
        </div>

        {/* Search and Filters panel */}
        <div className={styles.filtersContainer}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by title, Republic Act number, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="repealed">Repealed</option>
          </select>

          <select
            className={styles.filterSelect}
            value={auditFilter}
            onChange={(e) => setAuditFilter(e.target.value)}
          >
            <option value="all">All Audit Statuses</option>
            <option value="audited">Audited</option>
            <option value="not_audited">Not Audited</option>
          </select>

          <select
            className={styles.filterSelect}
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
          >
            <option value="all">All Risk Levels</option>
            <option value="critical">Critical Risk (&lt;40)</option>
            <option value="warn">Medium Risk (40-69)</option>
            <option value="low">Low Risk (70+)</option>
          </select>

          <div className={styles.resultsCount}>
            Showing {filteredLaws.length} laws
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
              {loading ? (
                <tr>
                  <td colSpan={6} className={`${styles.emptyCell} font-ui`}>
                    Loading laws from database...
                  </td>
                </tr>
              ) : filteredLaws.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`${styles.emptyCell} font-ui`}>
                    No laws match the selected search or filters.
                  </td>
                </tr>
              ) : (
                filteredLaws.map((item) => {
                  return (
                    <tr key={item.law_id} className={styles.tr}>
                      <td className={styles.td} style={{ maxWidth: '450px' }}>
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
