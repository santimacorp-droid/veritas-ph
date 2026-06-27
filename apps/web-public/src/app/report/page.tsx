"use client";

import { useState } from 'react';
import styles from './page.module.css';

export default function ReportPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate submission to the lead verification queue
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1200);
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.pageHead}>
          <h1 className={`${styles.pageTitle} font-display`}>Report a Procurement Anomaly</h1>
          <p className={`${styles.pageSubtitle} font-ui`}>
            Submit suspicious bidding timelines, single-bidder setups, or cost overruns for AI audit check.
          </p>
        </div>

        {submitted ? (
          <div className={styles.successBlock}>
            <div className={styles.successIcon}>✓</div>
            <h2 className="font-display">Anomaly Lead Submitted Successfully</h2>
            <p className="font-body">
              Thank you for contributing to public accountability. Our ingestion crawler will attempt to fetch and verify the provided source URL. If confirmed, the audit anomalies will appear in the public feed after human verification.
            </p>
            <button onClick={() => setSubmitted(false)} className={`${styles.resetBtn} font-ui`}>
              Submit Another Report
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className="font-ui" htmlFor="agency">Procuring Agency / Department</label>
              <input
                id="agency"
                type="text"
                required
                placeholder="e.g. Department of Public Works and Highways (DPWH)"
                className="font-body"
              />
            </div>

            <div className={styles.formGroup}>
              <label className="font-ui" htmlFor="refNo">PhilGEPS Reference Number (Optional)</label>
              <input
                id="refNo"
                type="text"
                placeholder="e.g. 10978234"
                className="font-mono"
              />
            </div>

            <div className={styles.formGroup}>
              <label className="font-ui" htmlFor="url">Source Document URL / Web Link</label>
              <input
                id="url"
                type="text"
                required
                placeholder="https://notices.philgeps.gov.ph/... or cloud drive link"
                className="font-mono"
              />
            </div>

            <div className={styles.formGroup}>
              <label className="font-ui" htmlFor="description">What makes this suspicious?</label>
              <textarea
                id="description"
                required
                placeholder="e.g. The bidding window was only open for 3 days, or the contract was awarded to a catering firm for road construction..."
                className={`${styles.textarea} font-body`}
                rows={5}
              />
            </div>

            <div className={styles.formGroup}>
              <label className="font-ui" htmlFor="email">Your Email Address (Optional, for updates)</label>
              <input
                id="email"
                type="text"
                placeholder="email@example.com"
                className="font-body"
              />
            </div>

            <button type="submit" disabled={loading} className={`${styles.submitBtn} font-ui`}>
              {loading ? 'Submitting Lead...' : 'Submit to Verification Queue'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
