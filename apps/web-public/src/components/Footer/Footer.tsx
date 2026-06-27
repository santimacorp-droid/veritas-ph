import Link from 'next/link';
import styles from './Footer.module.css';
import VeritasLogo from '../VeritasLogo/VeritasLogo';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.left}>
          <VeritasLogo size={24} showText={true} animated={false} />
          <p className={`${styles.desc} font-body`} style={{ marginTop: '12px' }}>
            A community-driven procurement analytics and legal vulnerability audit platform for public accountability in the Philippines.
          </p>
        </div>
        <div className={styles.links}>
          <Link href="/about" className={`${styles.link} font-ui`}>About Veritas</Link>
          <Link href="/methodology" className={`${styles.link} font-ui`}>Methodology</Link>
          <Link href="/laws" className={`${styles.link} font-ui`}>Legislative Audits</Link>
          <a href="https://github.com/santimacorp-droid/veritas-ph" target="_blank" rel="noopener noreferrer" className={`${styles.link} font-ui`}>GitHub</a>
          <a href="https://ko-fi.com/santima" target="_blank" rel="noopener noreferrer" className={`${styles.link} font-ui`} style={{ color: '#FFD54F', fontWeight: 600 }}>☕ Support on Ko-fi</a>
        </div>
      </div>
      <div className={styles.disclaimerContainer}>
        <p className={`${styles.disclaimer} font-ui`}>
          Disclaimer: All data is extracted directly from public Philippine government source documents (PhilGEPS, Judiciary E-Library, and Official Gazette). Audit scores are statistical risk markers calculated by automated rules and AI analyzers, and do not constitute legal accusations of malfeasance.
        </p>
        <p className={`${styles.copyright} font-ui`}>
          &copy; {new Date().getFullYear()} Veritas Philippines. Open-Source under GNU AGPLv3.
        </p>
      </div>
    </footer>
  );
}
