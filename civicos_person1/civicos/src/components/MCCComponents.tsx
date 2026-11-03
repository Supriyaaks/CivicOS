import React from 'react';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    'Pending': 'bg-yellow-100 text-yellow-700',
    'In Progress': 'bg-blue-100 text-blue-700',
    'Resolved': 'bg-green-100 text-green-700',
  };
  return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[status] || 'bg-slate-100 text-slate-700'}`}>{status}</span>;
};

const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const colors: Record<string, string> = {
    'Critical': 'bg-red-100 text-red-700',
    'High': 'bg-orange-100 text-orange-700',
    'Medium': 'bg-yellow-100 text-yellow-700',
    'Low': 'bg-slate-100 text-slate-700',
  };
  return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[severity] || 'bg-slate-100 text-slate-700'}`}>{severity}</span>;
};

export { StatusBadge, SeverityBadge };
