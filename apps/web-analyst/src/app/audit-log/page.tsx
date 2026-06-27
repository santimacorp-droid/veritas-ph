'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

const API_URL = typeof window === 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000')
  : '/api';

const PUBLIC_PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://veritas-ph-web-public.vercel.app';

interface AuditLogEntry {
  log_id: string;
  actor_id?: string;
  actor_type?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
  actor_name?: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('veritas_token');
    if (savedToken) {
      setToken(savedToken);
    } else {
      setLoading(false);
      setError('Authentication required. Please log in.');
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    async function loadAuditLog() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_URL}/analyst/audit-log?limit=${limit}&offset=${offset}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        });
        if (!res.ok) {
          throw new Error('Failed to retrieve audit logs');
        }
        const data = await res.json();
        setLogs(data.logs ?? []);
        setTotal(data.total ?? 0);
      } catch (err) {
        setError('Could not retrieve audit history logs.');
      } finally {
        setLoading(false);
      }
    }

    loadAuditLog();
  }, [token, offset, limit]);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <span className={`${styles.logoName} font-display`}>Veritas</span>
          <span className={`${styles.logoSub} font-ui`}>Analyst Console</span>
        </div>

        <nav className={styles.sidebarNav}>
          <Link href="/" className={`${styles.navItem} font-ui`} style={{ textDecoration: 'none' }}>
            Review Queue
          </Link>
          <Link href="/legislation" className={`${styles.navItem} font-ui`} style={{ textDecoration: 'none' }}>
            Legislation
          </Link>
          <Link href="/audit-log" className={`${styles.navItem} ${styles.navItemActive} font-ui`} style={{ textDecoration: 'none' }}>
            Audit Log
          </Link>
        </nav>

        <div className={styles.sidebarFooter}>
          <a href={PUBLIC_PORTAL_URL} className={`${styles.footerLink} font-ui`} target="_blank" rel="noreferrer">
            Public Portal
          </a>
          <a href={`${API_URL}/docs`} className={`${styles.footerLink} font-ui`} target="_blank" rel="noreferrer">
            API Docs
          </a>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <h1 className={`${styles.topbarTitle} font-ui`}>Workspace Audit History</h1>
            <span className={`${styles.topbarMeta} font-mono`}>
              {total} total records tracked
            </span>
          </div>
          <div className={styles.topbarRight}>
            <span className={`${styles.roleBadge} font-ui`}>Auditor</span>
          </div>
        </div>

        <div className={styles.content}>
          {loading && <div className={`${styles.statusMessage} font-body`}>Loading audit history logs...</div>}

          {!loading && error && <div className={`${styles.statusMessage} ${styles.errorMessage} font-body`}>{error}</div>}

          {!loading && !error && logs.length === 0 && (
            <div className={`${styles.statusMessage} font-body`}>No audit log events recorded yet.</div>
          )}

          {!loading && !error && logs.length > 0 && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={`${styles.th} font-ui`}>Timestamp</th>
                    <th className={`${styles.th} font-ui`}>Actor</th>
                    <th className={`${styles.th} font-ui`}>Action</th>
                    <th className={`${styles.th} font-ui`}>Entity</th>
                    <th className={`${styles.th} font-ui`}>Entity ID</th>
                    <th className={`${styles.th} font-ui`}>Detail Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.log_id} className={styles.tr}>
                      <td className={`${styles.td} font-mono ${styles.timestampCol}`}>
                        {new Date(log.created_at).toLocaleString('en-PH')}
                      </td>
                      <td className={`${styles.td} font-body`}>
                        <span className={styles.actorName}>{log.actor_name ?? 'System'}</span>
                        <span className={`${styles.actorType} font-mono`}>({log.actor_type})</span>
                      </td>
                      <td className={styles.td}>
                        <span className={`${styles.actionBadge} ${styles[`action_${log.action}`] || styles.actionDefault} font-ui`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className={`${styles.td} font-ui ${styles.entityTypeCol}`}>
                        {log.entity_type ?? '—'}
                      </td>
                      <td className={`${styles.td} font-mono ${styles.entityIdCol}`} title={log.entity_id}>
                        {log.entity_id ? log.entity_id.slice(0, 8) : '—'}
                      </td>
                      <td className={`${styles.td} font-mono ${styles.detailCol}`}>
                        {log.old_value || log.new_value ? (
                          <div className={styles.changeDetails}>
                            {log.old_value && (
                              <div className={styles.oldVal}>
                                <span className={styles.changeLabel}>OLD:</span> {log.old_value}
                              </div>
                            )}
                            {log.new_value && (
                              <div className={styles.newVal}>
                                <span className={styles.changeLabel}>NEW:</span> {log.new_value}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className={styles.dash}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className={styles.paginationRow}>
              <button
                disabled={offset === 0 || loading}
                onClick={() => setOffset((o) => Math.max(0, o - limit))}
                className={`${styles.pageBtn} font-ui`}
              >
                &larr; Previous Page
              </button>
              <span className={`${styles.paginationText} font-mono`}>
                Showing {offset + 1} - {Math.min(offset + limit, total)} of {total}
              </span>
              <button
                disabled={offset + limit >= total || loading}
                onClick={() => setOffset((o) => o + limit)}
                className={`${styles.pageBtn} font-ui`}
              >
                Next Page &rarr;
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
