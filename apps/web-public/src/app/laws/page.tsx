"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

const API_URL = typeof window === 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://47.129.63.52:8000')
  : '/api';

interface LawSummary {
  law_id: string;
  title: string;
  short_title?: string;
  description?: string;
  date_passed?: string;
  status: string;
  author?: string;
  sponsor?: string;
  approved_by?: string;
  submitted_by?: string;
  voting_record?: string;
  integrity_score?: number;
  governance_score?: number;
  analysis_status?: string;
  loophole_count?: number;
  category?: string;
}

function formatDate(value?: string) {
  return value ? value.slice(0, 10) : '-';
}

function formatCategory(cat?: string) {
  if (!cat) return 'Republic Act';
  if (cat === 'republic_act') return 'Republic Act';
  if (cat === 'gppb_resolution') return 'GPPB Resolution';
  if (cat === 'coa_circular') return 'COA Circular';
  return cat.replace(/_/g, ' ').toUpperCase();
}

export default function LawsPage() {
  const [laws, setLaws] = useState<LawSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [auditFilter, setAuditFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    async function loadLaws() {
      try {
        const res = await fetch(`${API_URL}/laws?limit=1000`);
        if (res.ok) {
          const data = await res.json();
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
    const authorMatch = item.author?.toLowerCase().includes(query) ?? false;
    const sponsorMatch = item.sponsor?.toLowerCase().includes(query) ?? false;
    const approverMatch = item.approved_by?.toLowerCase().includes(query) ?? false;
    const matchesSearch = !search || titleMatch || shortMatch || descMatch || authorMatch || sponsorMatch || approverMatch;

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

    // 5. Category match
    const matchesCategory = categoryFilter === 'all' || (item.category ?? 'republic_act') === categoryFilter;

    return matchesSearch && matchesStatus && matchesAudit && matchesRisk && matchesCategory;
  });

  const auditedLaws = filteredLaws.filter(l => l.integrity_score != null);
  const pendingLaws = filteredLaws.filter(l => l.integrity_score == null);

  return (
    <div>

      <main className={styles.pageContent}>
        <div className={styles.pageHead}>
          <h1 className={`${styles.pageTitle} font-display`}>Legislation Audits & Vulnerabilities</h1>
          <p className={`${styles.pageSubtitle} font-ui`}>
            {filteredLaws.length} of {laws.length} laws filtered · Audited for structural flaws and corruption loopholes
          </p>
        </div>

        {/* Automated Law Crawler Explanation Banner */}
        <div className={styles.crawlerBanner}>
          <div className={styles.bannerIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-data-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <circle cx="10" cy="13" r="2" />
              <line x1="20" y1="20" x2="11.5" y2="15" />
            </svg>
          </div>
          <div className={styles.bannerContent}>
            <h3 className="font-display">Automated Law Crawler & AI Vulnerability Auditing</h3>
            <p className="font-body">
              Veritas automatically crawls the Supreme Court Judiciary E-Library, GPPB, and COA registries for republic acts and administrative directives. 
              Our multi-pass AI engine scans the legislation section-by-section to identify systemic loopholes, rate oversight strengths, and suggest concrete revisions to block corruption.
            </p>
          </div>
        </div>

        {/* Search and Filters panel */}
        <div className={styles.filtersContainer}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by title, RA number, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className={styles.filterSelect}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="republic_act">Republic Acts</option>
            <option value="gppb_resolution">GPPB Resolutions</option>
            <option value="coa_circular">COA Circulars</option>
          </select>

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
        </div>

        {/* Section 1: Audited Legislation */}
        <div className={styles.sectionHeader}>
          <h2 className={`${styles.sectionTitle} font-display`}>Audited Legislation & Vulnerability Ratings</h2>
          <span className={`${styles.sectionNote} font-ui`}>Showing {auditedLaws.length} audited items</span>
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
              ) : auditedLaws.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`${styles.emptyCell} font-ui`}>
                    No audited laws match the selected search or filters.
                  </td>
                </tr>
              ) : (
                auditedLaws.map((item) => {
                  return (
                    <tr key={item.law_id} className={styles.tr}>
                      <td className={styles.td} style={{ maxWidth: '450px' }}>
                        <Link href={`/laws/${item.law_id}`} className={styles.lawLink}>
                          <span className={`${styles.lawTitle} font-body`}>{item.title}</span>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '4px' }}>
                            {item.short_title && (
                              <span className={`${styles.lawShort} font-mono`}>{item.short_title}</span>
                            )}
                            <span className={`${styles.categoryBadge} ${item.category === 'coa_circular' ? styles.catCOA : item.category === 'gppb_resolution' ? styles.catGPPB : styles.catRA} font-ui`}>
                              {formatCategory(item.category)}
                            </span>
                          </div>
                          {item.description && (
                            <span className={`${styles.lawDesc} font-body`}>{item.description}</span>
                          )}
                          {(item.author || item.approved_by || item.voting_record) && (
                            <span className={`${styles.lawMetaRow} font-ui`}>
                              {item.author && (
                                <span className={styles.lawMetaItem}>
                                  <strong>Author/Issuer:</strong> {item.author}
                                </span>
                              )}
                              {item.approved_by && (
                                <span className={styles.lawMetaItem}>
                                  <strong>Signed By:</strong> {item.approved_by}
                                </span>
                              )}
                              {item.voting_record && (
                                <span className={styles.lawMetaItem}>
                                  <strong>Vote:</strong> {item.voting_record}
                                </span>
                              )}
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className={`${styles.td} ${styles.tdNum}`}>
                        {item.integrity_score != null ? (
                          <div className={styles.scoreGroup}>
                            <span className={`${styles.scoreValue} font-mono`} style={{ color: item.integrity_score >= 70 ? '#00E676' : item.integrity_score >= 40 ? '#FF9838' : '#FF4D5E' }}>
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
                            <span className={`${styles.scoreValue} font-mono`} style={{ color: item.governance_score >= 70 ? '#00E676' : item.governance_score >= 40 ? '#FF9838' : '#FF4D5E' }}>
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
                          <span className={`${styles.loopCountBadge} ${item.loophole_count >= 2 ? styles.badgeCritical : styles.badgeWarn} font-mono`}>
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
                          {item.status === 'incomplete' ? 'Incomplete Text' : item.status}
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

        {/* Section 2: Recently Crawled / Queue Section */}
        {!loading && pendingLaws.length > 0 && (
          <div style={{ marginTop: '48px' }}>
            <div className={styles.sectionHeader}>
              <h2 className={`${styles.sectionTitle} font-display`}>Recently Indexed (Awaiting AI Audit)</h2>
              <span className={`${styles.sectionNote} font-ui`}>Showing {pendingLaws.length} queued items</span>
            </div>
            
            <div className={styles.pendingList}>
              {pendingLaws.map((item) => (
                <div key={item.law_id} className={styles.pendingCard}>
                  <div className={styles.pendingCardHeader}>
                    <Link href={`/laws/${item.law_id}`} className={styles.pendingLink}>
                      <span className={`${styles.pendingTitle} font-body`}>{item.title}</span>
                    </Link>
                    <span className={`${styles.pendingStatus} font-ui`}>
                      <span className={styles.pulseDot} /> {item.analysis_status === 'running' ? 'Auditing...' : 'Queued'}
                    </span>
                  </div>
                  <div className={styles.pendingCardMeta}>
                    {item.short_title && (
                      <span className={`${styles.pendingShort} font-mono`}>{item.short_title}</span>
                    )}
                    <span className={`${styles.categoryBadge} ${item.category === 'coa_circular' ? styles.catCOA : item.category === 'gppb_resolution' ? styles.catGPPB : styles.catRA} font-ui`}>
                      {formatCategory(item.category)}
                    </span>
                    <span className="font-mono">{formatDate(item.date_passed)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
