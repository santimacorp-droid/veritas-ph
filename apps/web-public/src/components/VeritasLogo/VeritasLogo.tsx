import React from 'react';
import styles from './VeritasLogo.module.css';

interface VeritasLogoProps {
  size?: number;
  showText?: boolean;
  animated?: boolean;
}

export default function VeritasLogo({ size = 32, showText = false, animated = true }: VeritasLogoProps) {
  const scaleRatio = size / 32;

  return (
    <div className={styles.logoWrapper} style={{ gap: `${8 * scaleRatio}px` }}>
      <div 
        className={`${styles.logoIcon} ${animated ? styles.animateLogo : ''}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={styles.svg}
        >
          <defs>
            {/* Cyber Blue Gradient */}
            <linearGradient id="cyberBlue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00E676" /> {/* Neon green/truth */}
              <stop offset="100%" stopColor="#00B0FF" /> {/* Vivid cyber blue */}
            </linearGradient>
            
            {/* Neon Red/Orange Risk Gradient */}
            <linearGradient id="neonRisk" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF9838" /> {/* Neon orange */}
              <stop offset="100%" stopColor="#FF4D5E" /> {/* Electric neon red */}
            </linearGradient>

            {/* Glow Filter */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer Shield / Shield Trim */}
          <path
            d="M16 2L28 7V16C28 23.5 22.8 28.7 16 30C9.2 28.7 4 23.5 4 16V7L16 2Z"
            stroke="url(#cyberBlue)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.25"
            className={styles.shieldOutline}
          />

          {/* Glowing Left Scale Plate (Statutory Rules) */}
          <circle cx="9" cy="13" r="1.5" fill="url(#cyberBlue)" filter="url(#neonGlow)" />
          <line x1="9" y1="13" x2="16" y2="9" stroke="url(#cyberBlue)" strokeWidth="1" strokeDasharray="1 1" />

          {/* Glowing Right Scale Plate (AI Auditor / Risk) */}
          <circle cx="23" cy="13" r="1.5" fill="url(#neonRisk)" filter="url(#neonGlow)" />
          <line x1="23" y1="13" x2="16" y2="9" stroke="url(#neonRisk)" strokeWidth="1" strokeDasharray="1 1" />

          {/* Main Balance Axis / Horizon line */}
          <line x1="9" y1="9" x2="23" y2="9" stroke="url(#cyberBlue)" strokeWidth="1.5" strokeLinecap="round" />

          {/* The Scale Pillar (Tower of Integrity) */}
          <path
            d="M16 7V25"
            stroke="url(#cyberBlue)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Outer Ring / Network Node Connectors */}
          <path
            d="M8 20C11 23 13 24 16 24C19 24 21 23 24 20"
            stroke="url(#neonRisk)"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* Sharp Geometric "V" (Veritas / Truth / Victory) */}
          <path
            d="M10 8L16 20L22 8"
            stroke="url(#cyberBlue)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#neonGlow)"
            className={styles.veritasV}
          />
        </svg>
      </div>

      {showText && (
        <div className={styles.brandText}>
          <span className={`${styles.logoName} font-display`}>
            VERITAS<span className={styles.accentDot}>.PH</span>
          </span>
          <span className={`${styles.logoTagline} font-ui`}>
            PHILIPPINES PROCUREMENT TRANSPARENCY
          </span>
        </div>
      )}
    </div>
  );
}
