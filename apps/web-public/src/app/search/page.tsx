'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './page.module.css';

const API_URL = typeof window === 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000')
  : '/api';

interface CaseResult {
  case_id: string;
  title: string;
  procurement_method?: string;
  awarded_amount?: number;
  award_date?: string;
  risk_score?: number;
  status?: string;
  agency_name?: string;
  agency_acronym?: string;
}

interface SupplierResult {
  supplier_id: string;
  canonical_name: string;
  supplier_type?: string;
  psgc_province?: string;
  score?: number;
}

type SearchType = 'cases' | 'suppliers';

function formatPHP(val?: number) {
  if (val == null) return null;
  return '₱ ' + val.toLocaleString('en-PH', { minimumFractionDigits: 0 });
}

function RiskPip({ score }: { score?: number }) {
  if (score == null) return null;
  const cls =
    score >= 0.7 ? styles.riskHigh : score >= 0.4 ? styles.riskMedium : styles.riskLow;
  return (
    <span className={`${styles.riskPip} ${cls}`}>
      {score.toFixed(2)}
    </span>
  );
}

function CaseCard({ c }: { c: CaseResult }) {
  return (
    <Link href={`/projects/${c.case_id}`} className={styles.caseCard}>
      <div className={styles.cardTop}>
        <h2 className={`${styles.cardTitle} font-body`}>{c.title}</h2>
        <RiskPip score={c.risk_score} />
      </div>
      <div className={styles.cardMeta}>
        {c.agency_acronym && (
          <span className={`${styles.metaChip} font-ui`}>
            <span className={styles.chipLabel}>Agency</span>
            {c.agency_name ?? c.agency_acronym}
          </span>
        )}
        {c.procurement_method && (
          <span className={`${styles.metaChip} font-ui`}>
            <span className={styles.chipLabel}>Method</span>
            {c.procurement_method.replace(/_/g, ' ')}
          </span>
        )}
        {c.award_date && (
          <span className={`${styles.metaChip} font-mono`}>{c.award_date}</span>
        )}
        {c.awarded_amount != null && (
          <span className={`${styles.metaAmount} font-mono`}>
            {formatPHP(c.awarded_amount)}
          </span>
        )}
      </div>
    </Link>
  );
}

function SupplierCard({ s }: { s: SupplierResult }) {
  return (
    <Link href={`/suppliers/${s.supplier_id}`} className={styles.caseCard}>
      <div className={styles.cardTop}>
        <h2 className={`${styles.cardTitle} font-body`}>{s.canonical_name}</h2>
      </div>
      <div className={styles.cardMeta}>
        {s.supplier_type && (
          <span className={`${styles.metaChip} font-ui`}>
            <span className={styles.chipLabel}>Type</span>
            {s.supplier_type}
          </span>
        )}
        {s.psgc_province && (
          <span className={`${styles.metaChip} font-ui`}>
            <span className={styles.chipLabel}>Province</span>
            {s.psgc_province}
          </span>
        )}
        {s.score != null && (
          <span className={`${styles.metaChip} font-mono`}>
            match: {(s.score * 100).toFixed(0)}%
          </span>
        )}
      </div>
    </Link>
  );
}

export default function SearchPage() {
  const [query, setQuery]           = useState('');
  const [type, setType]             = useState<SearchType>('cases');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [results, setResults]       = useState<(CaseResult | SupplierResult)[]>([]);
  const [total, setTotal]           = useState<number | null>(null);
  const [loading, setLoading]       = useState(false);
  const [searched, setSearched]     = useState(false);
  const [error, setError]           = useState('');
  const debounceRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setTotal(null); setSearched(false); return; }
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ q, type });
      if (type === 'cases') {
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo)   params.set('date_to', dateTo);
      }
      const res = await fetch(`${API_URL}/search?${params}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data.results ?? []);
      setTotal(data.total ?? data.results?.length ?? 0);
      setSearched(true);
    } catch {
      setError('Could not connect to the API. Make sure the backend is running.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [type, dateFrom, dateTo]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => doSearch(query), 350);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, doSearch]);

  return (
    <div>

      <main className={styles.pageContent}>
        {/* ── Page Title ──────────────────────────────────── */}
        <div className={styles.pageHead}>
          <h1 className={`${styles.pageTitle} font-display`}>Search Procurement Records</h1>
          <p className={`${styles.pageSubtitle} font-ui`}>
            Full-text search across public PhilGEPS and COA records.
          </p>
        </div>

        {/* ── Search Bar ──────────────────────────────────── */}
        <div className={styles.searchBox}>
          <input
            id="search-input"
            type="search"
            className={`${styles.searchInput} font-mono`}
            placeholder="Search cases, agencies, procurement references…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* ── Filters ─────────────────────────────────────── */}
        <div className={styles.filtersRow}>
          <div className={styles.filterGroup}>
            <label className={`${styles.filterLabel} font-ui`} htmlFor="filter-type">Type</label>
            <select
              id="filter-type"
              className={`${styles.filterSelect} font-ui`}
              value={type}
              onChange={(e) => setType(e.target.value as SearchType)}
            >
              <option value="cases">Procurement Cases</option>
              <option value="suppliers">Suppliers</option>
            </select>
          </div>

          {type === 'cases' && (
            <>
              <div className={styles.filterGroup}>
                <label className={`${styles.filterLabel} font-ui`} htmlFor="filter-from">
                  Award Date From
                </label>
                <input
                  id="filter-from"
                  type="date"
                  className={`${styles.filterInput} font-mono`}
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className={styles.filterGroup}>
                <label className={`${styles.filterLabel} font-ui`} htmlFor="filter-to">
                  To
                </label>
                <input
                  id="filter-to"
                  type="date"
                  className={`${styles.filterInput} font-mono`}
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {/* ── Results ─────────────────────────────────────── */}
        <div className={styles.results}>
          {/* Results header */}
          {searched && !loading && !error && (
            <div className={`${styles.resultsHeader} font-ui`}>
              <span className={styles.resultsCount}>
                {total != null ? `${total.toLocaleString()} result${total !== 1 ? 's' : ''}` : ''}
              </span>
              <span className={styles.resultsQuery}>
                for &ldquo;{query}&rdquo;
              </span>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className={`${styles.statusBlock} font-ui`}>
              <span className={styles.loadingDot} />
              Searching…
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className={`${styles.errorBlock} font-ui`}>⚠ {error}</div>
          )}

          {/* No results */}
          {searched && !loading && !error && results.length === 0 && (
            <div className={`${styles.emptyBlock} font-body`}>
              No records found for &ldquo;{query}&rdquo;. Try a shorter term or different spelling.
              <span className={styles.emptyNote}>
                Note: The database requires seeding with PhilGEPS data before records appear.
              </span>
            </div>
          )}

          {/* Results list */}
          {!loading && !error && results.length > 0 && (
            <div className={styles.resultsList}>
              {type === 'cases'
                ? (results as CaseResult[]).map((c) => (
                    <CaseCard key={c.case_id} c={c} />
                  ))
                : (results as SupplierResult[]).map((s) => (
                    <SupplierCard key={s.supplier_id} s={s} />
                  ))}
            </div>
          )}

          {/* Empty state before search */}
          {!searched && !loading && (
            <div className={styles.emptyState}>
              <div className={`${styles.emptyStateTitle} font-display`}>
                Evidence before narrative.
              </div>
              <p className={`${styles.emptyStateBody} font-body`}>
                Search over public Philippine government procurement records from PhilGEPS,
                the Commission on Audit, and agency procurement plans. Every result links back
                to its source document, hash-verified at the time of collection.
              </p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
