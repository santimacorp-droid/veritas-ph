import Link from 'next/link';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface SupplierSummary {
  supplier_id: string;
  canonical_name: string;
  supplier_type?: string;
  psgc_province?: string;
  total_awards?: number;
  total_awarded?: number;
  agency_count?: number;
  last_award_date?: string;
}

async function getSuppliers(): Promise<{ total: number; suppliers: SupplierSummary[] }> {
  try {
    const res = await fetch(`${API_URL}/suppliers?limit=50`, { cache: 'no-store' });
    if (!res.ok) return { total: 0, suppliers: [] };
    return res.json();
  } catch {
    return { total: 0, suppliers: [] };
  }
}

function formatPHP(val?: number) {
  if (val == null) return '—';
  if (val >= 1_000_000_000) return `₱${(val / 1_000_000_000).toFixed(1)}B`;
  if (val >= 1_000_000) return `₱${(val / 1_000_000).toFixed(1)}M`;
  return '₱' + val.toLocaleString('en-PH');
}

export default async function SuppliersPage() {
  const { total, suppliers } = await getSuppliers();

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
              className={`${styles.navLink} ${item === 'Suppliers' ? styles.navActive : ''} font-ui`}
            >
              {item}
            </Link>
          ))}
        </nav>
      </header>

      <main className={styles.pageContent}>
        <div className={styles.pageHead}>
          <h1 className={`${styles.pageTitle} font-display`}>Suppliers</h1>
          <p className={`${styles.pageSubtitle} font-ui`}>
            {total} suppliers ranked by total public award value
          </p>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={`${styles.th} font-ui`}>Supplier</th>
                <th className={`${styles.th} font-ui`}>Province</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Awards</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Total Awarded</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Agencies</th>
                <th className={`${styles.th} ${styles.thNum} font-ui`}>Last Award</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`${styles.emptyCell} font-ui`}>
                    No suppliers found. Ensure the database is seeded.
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.supplier_id} className={styles.tr}>
                    <td className={styles.td}>
                      <Link href={`/suppliers/${supplier.supplier_id}`} className={styles.agencyLink}>
                        <span className={`${styles.agencyName} font-body`}>{supplier.canonical_name}</span>
                        <span className={`${styles.agencyAcronym} font-mono`}>
                          {supplier.supplier_type ?? 'supplier'}
                        </span>
                      </Link>
                    </td>
                    <td className={styles.td}>
                      <span className={`${styles.agencyAcronym} font-ui`}>
                        {supplier.psgc_province ?? '—'}
                      </span>
                    </td>
                    <td className={`${styles.td} ${styles.tdNum} font-mono`}>
                      {supplier.total_awards ?? 0}
                    </td>
                    <td className={`${styles.td} ${styles.tdNum} font-mono`}>
                      {formatPHP(supplier.total_awarded)}
                    </td>
                    <td className={`${styles.td} ${styles.tdNum} font-mono`}>
                      {supplier.agency_count ?? 0}
                    </td>
                    <td className={`${styles.td} ${styles.tdNum} font-mono`}>
                      {supplier.last_award_date ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className={`${styles.disclaimer} font-ui`}>
          Supplier profiles aggregate only publicly visible awards already ingested into Veritas.
        </footer>
      </main>
    </div>
  );
}
