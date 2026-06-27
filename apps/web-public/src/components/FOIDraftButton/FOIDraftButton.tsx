'use client';

import React, { useState } from 'react';

interface Props {
  caseId: string;
}

export default function FOIDraftButton({ caseId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [letter, setLetter] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchDraft = async () => {
    setLoading(true);
    setCopied(false);
    try {
      const res = await fetch(`/api/cases/${caseId}/foi-draft`);
      if (res.ok) {
        const data = await res.json();
        setLetter(data.foi_letter);
        setIsOpen(true);
      } else {
        alert('Failed to generate FOI draft. Please try again.');
      }
    } catch (e) {
      alert('Error fetching FOI draft.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button 
        onClick={fetchDraft} 
        disabled={loading}
        style={{
          background: 'none',
          border: '1px solid var(--color-data-blue)',
          color: 'var(--color-data-blue)',
          padding: '6px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer',
          marginTop: '8px',
          fontWeight: 600,
          display: 'inline-block'
        }}
        className="font-ui"
      >
        {loading ? 'Generating...' : '📄 Generate Draft FOI Request'}
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--color-paper)',
            border: '1px solid var(--color-rule)',
            borderRadius: '4px',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--color-ink)', fontSize: '18px' }} className="font-ui">Draft FOI Request Letter</h3>
            
            <div style={{
              flex: 1,
              overflowY: 'auto',
              background: 'var(--color-paper-darker)',
              border: '1px solid var(--color-rule)',
              borderRadius: '4px',
              padding: '16px',
              fontFamily: 'monospace',
              fontSize: '12px',
              whiteSpace: 'pre-wrap',
              color: 'var(--color-ink)',
              marginBottom: '16px',
              lineHeight: 1.5
            }}>
              {letter}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={handleCopy}
                style={{
                  background: copied ? 'var(--color-confirm)' : 'var(--color-data-blue)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'background-color 0.2s'
                }}
                className="font-ui"
              >
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: '1px solid var(--color-rule)',
                  color: 'var(--color-ink-secondary)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                className="font-ui"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
