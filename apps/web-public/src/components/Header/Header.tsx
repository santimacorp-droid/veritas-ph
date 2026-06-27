"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';

export default function Header() {
  const pathname = usePathname();
  
  const navItems = [
    { label: 'Search', path: '/search' },
    { label: 'Cases', path: '/cases' },
    { label: 'Agencies', path: '/agencies' },
    { label: 'Suppliers', path: '/suppliers' },
    { label: 'Scorecard', path: '/scorecard' },
    { label: 'Map', path: '/map' },
    { label: 'Laws', path: '/laws' },
    { label: 'Methodology', path: '/methodology' },
    { label: 'Report Anomaly', path: '/report' }
  ];

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <span className={`${styles.logoName} font-display`}>VERITAS</span>
          <span className={`${styles.logoTagline} font-ui`}>Philippines Procurement Transparency</span>
        </Link>
        <nav className={styles.nav}>
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <Link
                key={item.label}
                href={item.path}
                className={`${styles.navLink} ${isActive ? styles.navActive : ''} font-ui`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
