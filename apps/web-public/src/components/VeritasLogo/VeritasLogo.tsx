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
    <div className={styles.logoWrapper} style={{ gap: `${10 * scaleRatio}px` }}>
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
            {/* Cyber Gradient: Blue to Green */}
            <linearGradient id="cyberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00B0FF" /> {/* Cyber Blue */}
              <stop offset="100%" stopColor="#00E676" /> {/* Neon Green */}
            </linearGradient>

            {/* Risk Gradient: Red to Orange */}
            <linearGradient id="riskGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF4D5E" /> {/* Electric Red */}
              <stop offset="100%" stopColor="#FF9838" /> {/* Neon Orange */}
            </linearGradient>

            {/* Premium Radial Glow */}
            <filter id="premiumGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Futuristic Minimalist "V" (Chevron Ribbon Concept) */}
          {/* Left Ribbon Wing */}
          <path
            d="M5 6L13.5 25.5C14.2 27.1 15.8 27.1 16.5 25.5L25 6"
            stroke="url(#cyberGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#premiumGlow)"
            className={styles.chevronLeft}
          />

          {/* Overlapping Right Accent Ribbon (Truth/Risk balance) */}
          <path
            d="M17.5 16.5L21.5 7.5"
            stroke="url(#riskGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            className={styles.chevronRight}
          />
          
          {/* Center Audit Node */}
          <circle 
            cx="16" 
            cy="15" 
            r="1.8" 
            fill="#F3F5F9" 
            filter="url(#premiumGlow)"
            className={styles.centerNode} 
          />
        </svg>
      </div>

      {showText && (
        <div className={styles.brandText}>
          <span className={`${styles.logoName} font-display`}>
            VERITAS<span className={styles.accentDot}>PH</span>
          </span>
          <span className={`${styles.logoTagline} font-ui`}>
            Procurement Intelligence Platform
          </span>
        </div>
      )}
    </div>
  );
}
