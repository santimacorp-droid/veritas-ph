'use client';

import { useState } from 'react';

interface TriggerAnalysisButtonProps {
  lawId: string;
  apiUrl: string;
}

export default function TriggerAnalysisButton({ lawId, apiUrl }: TriggerAnalysisButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function triggerAnalysis() {
    setLoading(true);
    setStatus('idle');
    try {
      // Get the mock analyst token from localStorage
      const token = localStorage.getItem('veritas_token');
      
      const res = await fetch(`${apiUrl}/laws/${lawId}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) {
        throw new Error('Analysis request failed. Please check analyst console permissions.');
      }
      
      setStatus('success');
      // Reload page after a short delay so server component refetches
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Error triggering analysis');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        onClick={triggerAnalysis}
        disabled={loading || status === 'success'}
        style={{
          background: status === 'success' ? 'var(--color-confirm, #10b981)' : 'var(--color-data-blue, #0070f3)',
          color: '#fff',
          border: 'none',
          padding: '8px 16px',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          cursor: loading ? 'not-allowed' : 'pointer',
          borderRadius: '2px',
          opacity: loading ? 0.7 : 1,
          transition: 'all 150ms'
        }}
      >
        {loading ? 'Scheduling AI Pipeline...' : status === 'success' ? '✓ Scheduled! Reloading...' : '🔬 Run AI Law Analysis'}
      </button>
      {status === 'error' && (
        <div style={{ color: 'var(--color-high, #ef4444)', fontSize: '11px', marginTop: '6px', fontWeight: 600 }}>
          Error: {errorMsg}
        </div>
      )}
    </div>
  );
}
