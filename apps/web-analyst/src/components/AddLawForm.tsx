'use client';

import { useState } from 'react';

interface AddLawFormProps {
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
  apiUrl: string;
}

export default function AddLawForm({ onClose, onSuccess, token, apiUrl }: AddLawFormProps) {
  const [title, setTitle] = useState('');
  const [shortTitle, setShortTitle] = useState('');
  const [description, setDescription] = useState('');
  const [datePassed, setDatePassed] = useState('');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cleanApiUrl = apiUrl.replace(/\/api\/analyst$/, ''); // get root API url
      const res = await fetch(`${cleanApiUrl}/analyst/laws`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          short_title: shortTitle || null,
          description: description || null,
          date_passed: datePassed || null,
          status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to add law');
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
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Add New Law / Directive</h3>
          <button onClick={onClose} style={closeButtonStyle}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          {error && <div style={errorStyle}>{error}</div>}

          <div style={formGroupStyle}>
            <label style={labelStyle}>Title / Long Name *</label>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. An Act Providing for the Modernization..."
              rows={3}
              style={textareaStyle}
              required
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Short Title / Reference</label>
            <input
              type="text"
              value={shortTitle}
              onChange={(e) => setShortTitle(e.target.value)}
              placeholder="e.g. Republic Act No. 9184"
              style={inputStyle}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Description / Scope</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary of scope, applicability and oversight agencies..."
              rows={3}
              style={textareaStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Date Passed</label>
              <input
                type="date"
                value={datePassed}
                onChange={(e) => setDatePassed(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={selectStyle}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="repealed">Repealed</option>
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
              {loading ? 'Saving...' : 'Add Law'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Inline Styles matching Veritas Analyst Dark Mode
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
  gap: '16px',
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
  marginTop: '8px',
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
