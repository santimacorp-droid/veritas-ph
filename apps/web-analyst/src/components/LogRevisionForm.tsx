'use client';

import { useState } from 'react';

interface LogRevisionFormProps {
  lawId: string;
  lawTitle: string;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
  apiUrl: string;
}

export default function LogRevisionForm({
  lawId,
  lawTitle,
  onClose,
  onSuccess,
  token,
  apiUrl,
}: LogRevisionFormProps) {
  const [proposedBill, setProposedBill] = useState('');
  const [proposedChanges, setProposedChanges] = useState('');
  const [sponsor, setSponsor] = useState('');
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!proposedBill.trim()) {
      setError('Proposed bill identifier is required');
      return;
    }
    if (!proposedChanges.trim()) {
      setError('Details of proposed changes are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cleanApiUrl = apiUrl.replace(/\/api\/analyst$/, ''); // get root API url
      const res = await fetch(`${cleanApiUrl}/analyst/laws/${lawId}/revisions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          proposed_bill: proposedBill,
          proposed_changes: proposedChanges,
          sponsor: sponsor || null,
          status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to log revision');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <div style={modalHeaderStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Log Proposed Revision / Bill</h3>
            <span style={{ fontSize: '11px', color: 'var(--color-ink-muted, #888)' }}>{lawTitle}</span>
          </div>
          <button onClick={onClose} style={closeButtonStyle}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          {error && <div style={errorStyle}>{error}</div>}

          <div style={formGroupStyle}>
            <label style={labelStyle}>Proposed Bill ID / Name *</label>
            <input
              type="text"
              value={proposedBill}
              onChange={(e) => setProposedBill(e.target.value)}
              placeholder="e.g. House Bill No. 10184 (New Government Procurement Act)"
              style={inputStyle}
              required
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Details of Proposed Changes *</label>
            <textarea
              value={proposedChanges}
              onChange={(e) => setProposedChanges(e.target.value)}
              placeholder="Describe amendments, digitalization mandates, new transparency clauses..."
              rows={5}
              style={textareaStyle}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Primary Sponsor</label>
              <input
                type="text"
                value={sponsor}
                onChange={(e) => setSponsor(e.target.value)}
                placeholder="e.g. Rep. Juan dela Cruz"
                style={inputStyle}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Legislative Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={selectStyle}
              >
                <option value="pending">Pending / Introduced</option>
                <option value="under_review">Under Review / Committee</option>
                <option value="passed">Passed / Enacted</option>
                <option value="rejected">Rejected / Vetoed</option>
              </select>
            </div>
          </div>

          <div style={actionsContainerStyle}>
            <button
              type="button"
              onClick={onClose}
              style={cancelButtonStyle}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={submitButtonStyle}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Log Revision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Reuse modal styles
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(4px)',
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-paper, #1e1e1e)',
  border: '1px solid var(--color-rule-strong, #333)',
  width: '100%',
  maxWidth: '560px',
  borderRadius: '4px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  color: 'var(--color-ink, #f5f5f5)',
  overflow: 'hidden',
};

const modalHeaderStyle: React.CSSProperties = {
  padding: '16px 24px',
  borderBottom: '1px solid var(--color-rule, #222)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: 'var(--color-paper-dark, #121212)',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--color-ink-muted, #888)',
  fontSize: '24px',
  cursor: 'pointer',
  padding: 0,
  lineHeight: 1,
};

const formStyle: React.CSSProperties = {
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const formGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--color-ink-secondary, #ccc)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-paper-dark, #121212)',
  border: '1px solid var(--color-rule, #222)',
  color: 'var(--color-ink, #f5f5f5)',
  padding: '8px 12px',
  fontSize: '13px',
  borderRadius: '2px',
  outline: 'none',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: 'inherit',
  resize: 'vertical',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const errorStyle: React.CSSProperties = {
  backgroundColor: '#5c1919',
  color: '#ffc1c1',
  border: '1px solid #9c2828',
  padding: '10px 12px',
  fontSize: '12px',
  borderRadius: '2px',
};

const actionsContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  marginTop: '12px',
};

const cancelButtonStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  border: '1px solid var(--color-rule-strong, #333)',
  color: 'var(--color-ink-secondary, #ccc)',
  padding: '8px 16px',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  cursor: 'pointer',
  borderRadius: '2px',
};

const submitButtonStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-data-blue, #0070f3)',
  border: 'none',
  color: '#fff',
  padding: '8px 20px',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  cursor: 'pointer',
  borderRadius: '2px',
};
