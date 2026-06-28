import React from 'react';
import styles from './VeritasLogo.module.css';

interface VeritasLogoProps {
  size?: number;
  showText?: boolean;
}

export default function VeritasLogo({ size = 32, showText = false }: VeritasLogoProps) {
  const scaleRatio = size / 32;

  return (
    <div className={styles.logoWrapper} style={{ gap: `${12 * scaleRatio}px` }}>
      <div 
        className={styles.logoIcon}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={styles.svg}
        >
          {/* Background shield/prism glow */}
          <path
            d="M16 2L28 9V21L16 30L4 21V9L16 2Z"
            fill="url(#shieldGlow)"
            className={styles.logoBackground}
          />
          
          {/* Minimalist modern geometric balance scales */}
          <path
            d="M6 10L16 13L26 10"
            stroke="var(--color-ink)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={styles.logoBeam}
          />
          
          {/* Right scale pan */}
          <path
            d="M26 10L28 20C28 21.1 27.1 22 26 22H24C22.9 22 22 21.1 22 20L22 10"
            stroke="var(--color-ink-secondary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={styles.logoPanRight}
          />

          {/* Left scale pan */}
          <path
            d="M6 10L4 20C4 21.1 4.9 22 6 22H8C9.1 22 10 21.1 10 20L10 10"
            stroke="var(--color-ink-secondary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={styles.logoPanLeft}
          />

          {/* Glowing central needle of truth */}
          <line
            x1="16"
            y1="5"
            x2="16"
            y2="24"
            stroke="url(#needleGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            className={styles.logoNeedle}
          />

          {/* Anchor node pivot point */}
          <circle
            cx="16"
            cy="13"
            r="2.5"
            fill="var(--color-flag)"
            className={styles.logoPivot}
          />
          
          <defs>
            <linearGradient id="shieldGlow" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="var(--color-flag)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--color-data-blue)" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="needleGradient" x1="16" y1="5" x2="16" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="var(--color-flag)" />
              <stop offset="100%" stopColor="var(--color-data-blue)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <div className={styles.brandText}>
          <span className={styles.logoName}>
            VERITAS<span className={styles.logoSuffix}>PH</span>
          </span>
          <span className={styles.logoTagline}>
            Procurement Intelligence Platform
          </span>
        </div>
      )}
    </div>
  );
}
