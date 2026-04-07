import Link from 'next/link';
import styles from '../info.module.css';

export default function MethodologyPage() {
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
          {['Cases', 'Agencies', 'Suppliers', 'Methodology'].map((item) => (
            <Link
              key={item}
              href={`/${item.toLowerCase()}`}
              className={`${styles.navLink} ${item === 'Methodology' ? styles.navActive : ''} font-ui`}
            >
              {item}
            </Link>
          ))}
        </nav>
      </header>

      <main className={styles.pageContent}>
        <div className={styles.pageHead}>
          <h1 className={`${styles.pageTitle} font-display`}>Methodology</h1>
          <p className={`${styles.pageSubtitle} font-ui`}>
            Explainable signals, public documents, human review
          </p>
        </div>

        <div className={styles.prose}>
          <p>
            Veritas ingests public procurement records, extracts structured fields, links documents
            into a procurement timeline, and computes discrepancy signals using explicit rule logic.
          </p>
          <p>
            Each signal should answer three questions clearly: what fields were compared, what
            threshold or rule fired, and which source documents support the result. The intent is
            to make every flag inspectable rather than opaque.
          </p>
          <p>
            Signals are not findings of misconduct. They are prompts for analyst review. Publication
            decisions require additional verification, editorial judgment, and legal caution.
          </p>
        </div>
      </main>
    </div>
  );
}
