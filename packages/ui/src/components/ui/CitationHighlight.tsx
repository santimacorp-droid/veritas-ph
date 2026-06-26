import React from 'react';

interface CitationHighlightProps {
  boundingBox: [number, number, number, number]; // [x, y, w, h] in percentages or pixels
  label?: string;
}

/**
 * CitationHighlight — Overlays a red box on a document preview to show exactly
 * where the evidence was extracted from.
 */
export const CitationHighlight: React.FC<CitationHighlightProps> = ({ boundingBox, label }) => {
  const [x, y, w, h] = boundingBox;
  
  return (
    <div 
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: `${w}%`,
        height: `${h}%`,
        border: '2px solid #ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        pointerEvents: 'none',
        zIndex: 10,
      }}
      title={label}
    >
      {label && (
        <span style={{
          position: 'absolute',
          top: '-18px',
          left: '-2px',
          backgroundColor: '#ef4444',
          color: 'white',
          fontSize: '10px',
          padding: '1px 4px',
          borderRadius: '2px',
          whiteSpace: 'nowrap'
        }}>
          {label}
        </span>
      )}
    </div>
  );
};
