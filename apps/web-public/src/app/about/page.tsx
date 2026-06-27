import Link from 'next/link';
import styles from '../info.module.css';

export default function AboutPage() {
  return (
    <div>

      <main className={styles.pageContent}>
        <div className={styles.pageHead}>
          <h1 className={`${styles.pageTitle} font-display`}>About Veritas</h1>
          <p className={`${styles.pageSubtitle} font-ui`}>
            Evidence before narrative
          </p>
        </div>

        <div className={styles.prose}>
          <p>
            Veritas is an evidence-first transparency system for Philippine public procurement.
            It collects publicly available procurement records, organizes them into case timelines,
            and surfaces explainable anomaly indicators for human review.
          </p>
          <p>
            The system is built to support journalists, civil society groups, researchers, and
            public-interest watchdogs. It is not built to publish accusations automatically.
            Every discrepancy is meant to be traceable back to source material and reviewed by a human.
          </p>
          <p>
            The current implementation combines a FastAPI backend, a public transparency portal,
            an analyst review console, and crawler infrastructure for ingesting source documents
            into PostgreSQL and object storage.
          </p>
        </div>
      </main>
    </div>
  );
}
