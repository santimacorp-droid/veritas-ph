import React from 'react';

interface StatusBadgeProps {
  status: 'pending' | 'confirmed' | 'published' | 'error';
  label?: string;
}

const colors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  published: 'bg-green-100 text-green-800 border-green-200',
  error: 'bg-red-100 text-red-800 border-red-200',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[status]}`}>
      {label || status.toUpperCase()}
    </span>
  );
};
