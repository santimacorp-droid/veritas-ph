'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import AddLawForm from '../../components/AddLawForm';
import FlagProvisionForm from '../../components/FlagProvisionForm';
import LogRevisionForm from '../../components/LogRevisionForm';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/analyst';
const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface LawSummary {
  law_id: string;
  title: string;
  short_title?: string;
  date_passed?: string;
  status: string;
}

export default function AnalystLegislationPage() {
  const [laws, setLaws] = useState<LawSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Modal States
  const [showAddLaw, setShowAddLaw] = useState(false);
  const [showFlagProvision, setShowFlagProvision] = useState(false);
  const [showLogRevision, setShowLogRevision] = useState(false);
  const [selectedLaw, setSelectedLaw] = useState<LawSummary | null>(null);

  function fetchLaws(showLoading = false) {
    if (showLoading) setLoading(true);
    fetch(`${PUBLIC_API}/laws`)
      .then(r => r.json())
      .then(d => {
        setLaws(d.laws || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  // Auto-login and load laws
  useEffect(() => {
    async function initAuth() {
      let savedToken = localStorage.getItem('veritas_token');
      
      if (!savedToken) {
        try {
          console.log('No veritas_token found. Attempting auto-login as default analyst...');
          const formData = new URLSearchParams();
          formData.append('username', 'analyst@veritas.ph');
          formData.append('password', 'admin_dev');

          const res = await fetch(`${PUBLIC_API}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            savedToken = data.access_token;
            if (savedToken) {
              localStorage.setItem('veritas_token', savedToken);
              console.log('Auto-login successful.');
            }
          } else {
            console.error('Auto-login failed. Form edits may fail authorization.');
          }
        } catch (err) {
          console.error('Error during auto-login:', err);
        }
      }
      
      setToken(savedToken);
    }

    initAuth().then(() => {
      fetchLaws(false);
    });
  }, []);

  return (
    <div>
      <header className={styles.siteHeader}>
        <div className={styles.topbar}>
          <Link href="/" className={styles.siteLogo}>
            <span className={`${styles.logoName} font-display`}>Veritas Analyst</span>
            <span className={`${styles.logoTagline} font-ui`}>Workspace</span>
          </Link>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink)' }}>analyst@veritas.ph</span>
          </div>
        </div>
        <nav className={styles.navStrip}>
          {['Queue', 'Legislation', 'Audit Log'].map((item) => (
            <Link
              key={item}
              href={item === 'Queue' ? '/' : item === 'Audit Log' ? '/audit-log' : `/${item.toLowerCase()}`}
              className={`${styles.navLink} ${item === 'Legislation' ? styles.navActive : ''} font-ui`}
            >
              {item}
            </Link>
          ))}
        </nav>
      </header>

      <main className={styles.pageContent}>
        <div className={styles.headerRow}>
          <h1 className={`${styles.pageTitle} font-display`}>Legislation Management</h1>
          <button className={styles.primaryButton} onClick={() => setShowAddLaw(true)}>
            Add Law / Directive
          </button>
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={`${styles.cardTitle} font-ui`}>Tracked Laws & Frameworks</h2>
            {loading ? (
              <div className={styles.emptyState}>Loading...</div>
            ) : laws.length === 0 ? (
              <div className={styles.emptyState}>No laws tracked yet.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={`${styles.th} font-ui`}>Law / Directive</th>
                    <th className={`${styles.th} font-ui`}>Status</th>
                    <th className={`${styles.th} font-ui`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {laws.map(law => (
                    <tr key={law.law_id} className={styles.tr}>
                      <td className={styles.td}>
                        <div className={styles.lawLink}>
                          <span className={`${styles.lawTitle} font-body`}>{law.title}</span>
                          <span className={`${styles.lawShort} font-mono`}>{law.short_title || law.law_id}</span>
                        </div>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.statusBadge} data-status={law.status.toLowerCase()}>{law.status}</span>
                      </td>
                      <td className={styles.td}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className={styles.actionButton}
                            onClick={() => {
                              setSelectedLaw(law);
                              setShowFlagProvision(true);
                            }}
                          >
                            Flag Provision
                          </button>
                          <button
                            className={styles.actionButton}
                            onClick={() => {
                              setSelectedLaw(law);
                              setShowLogRevision(true);
                            }}
                          >
                            Log Revision
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Curation Modals */}
      {showAddLaw && (
        <AddLawForm
          onClose={() => setShowAddLaw(false)}
          onSuccess={fetchLaws}
          token={token}
          apiUrl={API_URL}
        />
      )}

      {showFlagProvision && selectedLaw && (
        <FlagProvisionForm
          lawId={selectedLaw.law_id}
          lawTitle={selectedLaw.short_title || selectedLaw.title}
          onClose={() => {
            setShowFlagProvision(false);
            setSelectedLaw(null);
          }}
          onSuccess={fetchLaws}
          token={token}
          apiUrl={API_URL}
        />
      )}

      {showLogRevision && selectedLaw && (
        <LogRevisionForm
          lawId={selectedLaw.law_id}
          lawTitle={selectedLaw.short_title || selectedLaw.title}
          onClose={() => {
            setShowLogRevision(false);
            setSelectedLaw(null);
          }}
          onSuccess={fetchLaws}
          token={token}
          apiUrl={API_URL}
        />
      )}
    </div>
  );
}
