"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';
import VeritasLogo from '../VeritasLogo/VeritasLogo';

export default function Header() {
  const pathname = usePathname();
  
  const navItems = [
    { label: 'Search', path: '/search' },
    { label: 'Projects', path: '/projects' },
    { label: 'Agencies', path: '/agencies' },
    { label: 'Suppliers', path: '/suppliers' },
    { label: 'Scorecard', path: '/scorecard' },
    { label: 'Map', path: '/map' },
    { label: 'Legislation Audits', path: '/laws' },
    { label: 'Methodology', path: '/methodology' }
  ];

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <VeritasLogo size={32} showText={true} />
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
