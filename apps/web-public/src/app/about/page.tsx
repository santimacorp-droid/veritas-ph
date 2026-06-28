import Link from 'next/link';
import styles from '../info.module.css';

export default function AboutPage() {
  return (
    <div>
      <main className={styles.pageContent} style={{ maxWidth: '960px', paddingBottom: '120px' }}>
        
        {/* Hero Header */}
        <div className={styles.pageHead} style={{ marginBottom: '40px' }}>
          <h1 className={`${styles.pageTitle} font-display`} style={{ fontSize: '36px' }}>
            About Veritas
          </h1>
          <p className={`${styles.pageSubtitle} font-ui`} style={{ color: 'var(--color-flag)', fontWeight: 700 }}>
            Evidence Before Narrative
          </p>
        </div>

        {/* Introduction Prose */}
        <div className={styles.prose} style={{ marginBottom: '48px' }}>
          <p className="font-body" style={{ fontSize: '16px', lineHeight: '1.8' }}>
            Veritas is an open-source, evidence-first procurement transparency platform for the Philippines. 
            We build tools to audit public expenditures, verify legislative oversight, and empower civil society 
            with concrete, traceable data.
          </p>
          <p className="font-body" style={{ fontSize: '14.5px', color: 'var(--color-ink-secondary)' }}>
            Raw government portals are frequently fragmented, slow, and prone to data changes. Veritas aggregates 
            these disparate registries, establishes a cryptographic chain of custody, and applies deterministic 
            auditing checks to flag irregularities.
          </p>
        </div>

        {/* The Three Pillars Grid */}
        <h2 className={`${styles.sectionTitle} font-ui`} style={{ marginBottom: '24px' }}>
          Core Architectural Pillars
        </h2>
        
        <div className={styles.methodologyGrid} style={{ marginBottom: '48px' }}>
          
          {/* Pillar 1 */}
          <div className={styles.methodologyCard}>
            <div className={styles.cardHeader} style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-data-blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <h3 className={`${styles.cardTitle} font-ui`}>Cryptographic Provenance</h3>
              </div>
            </div>
            <p className={`${styles.cardBody} font-body`} style={{ marginTop: '12px', fontSize: '13px' }}>
              Every crawled PhilGEPS notice and legal directive is immediately hashed using SHA-256. This establishes an immutable record and ensures upstream source documents cannot be altered retroactively without an audit trail.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className={styles.methodologyCard}>
            <div className={styles.cardHeader} style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-flag)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <h3 className={`${styles.cardTitle} font-ui`}>Explainable Risk Indicators</h3>
              </div>
            </div>
            <p className={`${styles.cardBody} font-body`} style={{ marginTop: '12px', fontSize: '13px' }}>
              Unlike black-box AI algorithms, Veritas maps every anomaly to a deterministic compliance check (RULE-001 to RULE-014). Each flag cites the exact character coordinates and document page numbers where it fired.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className={styles.methodologyCard}>
            <div className={styles.cardHeader} style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-confirm)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <h3 className={`${styles.cardTitle} font-ui`}>Human-in-the-Loop</h3>
              </div>
            </div>
            <p className={`${styles.cardBody} font-body`} style={{ marginTop: '12px', fontSize: '13px' }}>
              Veritas does not automate accusations. All system flags begin in a pending state, requiring verified civil society analysts to check evidence coordinates, upload documentation, and sign off before publication.
            </p>
          </div>

        </div>

        {/* Mission Statement & Specifications */}
        <h2 className={`${styles.sectionTitle} font-ui`} style={{ marginBottom: '24px' }}>
          Open Governance & Standards
        </h2>

        <div className={styles.prose} style={{ marginBottom: '32px' }}>
          <p className="font-body" style={{ fontSize: '14.5px', lineHeight: '1.7' }}>
            We believe that accountability tools should themselves be fully auditable. The code powering Veritas is 
            entirely open-source. Anyone can inspect our database schemas, verify our 14 downstream compliance rules, 
            or deploy our crawler infrastructure locally to audit regional budgets.
          </p>
        </div>

        {/* Tech Stack Specs Banner */}
        <div style={{ background: 'var(--color-paper-dark)', border: '1px solid var(--color-rule-strong)', padding: '24px', borderRadius: '4px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', marginBottom: '8px' }} className="font-ui">Auditing Pipeline</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--color-ink-secondary)' }} className="font-body">
              <li>• FastAPI Ingestion Backend</li>
              <li>• PostgreSQL & Supabase Engine</li>
              <li>• Vector Entity Deduplication</li>
              <li>• SHA-256 Provenance Ledger</li>
            </ul>
          </div>
          <div>
            <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', marginBottom: '8px' }} className="font-ui">Public Transparency Portal</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--color-ink-secondary)' }} className="font-body">
              <li>• Next.js Static Pages</li>
              <li>• Glassmorphic Obsidian Styling</li>
              <li>• SVG Visual Highlights</li>
              <li>• Traceable Citation Offsets</li>
            </ul>
          </div>
        </div>

      </main>
    </div>
  );
}
