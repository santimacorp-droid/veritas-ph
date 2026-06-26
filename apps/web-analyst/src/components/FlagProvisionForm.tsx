'use client';

import { useState } from 'react';

interface FlagProvisionFormProps {
  lawId: string;
  lawTitle: string;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
  apiUrl: string;
}

export default function FlagProvisionForm({
  lawId,
  lawTitle,
  onClose,
  onSuccess,
  token,
  apiUrl,
}: FlagProvisionFormProps) {
  const [sectionNumber, setSectionNumber] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [impact, setImpact] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sectionNumber.trim()) {
      setError('Section number is required');
      return;
    }
    if (!content.trim()) {
      setError('Provision content is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cleanApiUrl = apiUrl.replace(/\/api\/analyst$/, ''); // get root API url
      
      // 1. Create the provision
      const provRes = await fetch(`${cleanApiUrl}/analyst/laws/${lawId}/provisions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          section_number: sectionNumber,
          title: title || null,
          content,
        }),
      });

      if (!provRes.ok) {
        const data = await provRes.json();
        throw new Error(data.detail || 'Failed to create provision');
      }

      const provision = await provRes.json();

      // 2. If controversy details are filled out, create controversy
      if (issueDescription.trim()) {
        const contRes = await fetch(`${cleanApiUrl}/analyst/provisions/${provision.provision_id}/controversies`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            issue_description: issueDescription,
            impact: impact || null,
            severity,
          }),
        });

        if (!contRes.ok) {
          const data = await contRes.json();
          throw new Error(data.detail || 'Provision created, but controversy flagging failed');
        }
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
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Flag Provision</h3>
            <span style={{ fontSize: '11px', color: 'var(--color-ink-muted, #888)' }}>{lawTitle}</span>
          </div>
          <button onClick={onClose} style={closeButtonStyle}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          {error && <div style={errorStyle}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Section Number *</label>
              <input
                type="text"
                value={sectionNumber}
                onChange={(e) => setSectionNumber(e.target.value)}
                placeholder="e.g. Section 53"
                style={inputStyle}
                required
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Provision Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Negotiated Procurement"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Provision Text Content *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Copy the official wording of the provision here..."
              rows={4}
              style={textareaStyle}
              required
            />
          </div>

          <div style={{ borderTop: '1px solid var(--color-rule, #222)', paddingTop: '16px', marginTop: '4px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 600, color: 'var(--color-flag, #f43f5e)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Controversial Signal details (Optional)
            </h4>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Issue / Transparency Concern</label>
              <textarea
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Explain the loophole or susceptibility to abuse..."
                rows={3}
                style={textareaStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Impact on Procurement</label>
                <input
                  type="text"
                  value={impact}
                  onChange={(e) => setImpact(e.target.value)}
                  placeholder="e.g. Bypasses open public bidding..."
                  style={inputStyle}
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  style={selectStyle}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
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
              {loading ? 'Saving...' : 'Submit Provision'}
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
  maxWidth: '580px',
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
