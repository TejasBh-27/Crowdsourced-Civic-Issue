import React from 'react';

const STATUS_CONFIG = {
  'Submitted': { bg: '#FEF3C7', color: '#92400E', label: '📬 Submitted' },
  'Pending': { bg: '#FEF3C7', color: '#92400E', label: '⏳ Pending' },
  'Verified_Assigned': { bg: '#DBEAFE', color: '#1E3A8A', label: '✅ AI Verified' },
  'In Progress': { bg: '#EDE9FE', color: '#4C1D95', label: '⚙️ In Progress' },
  'Resolved': { bg: '#D1FAE5', color: '#064E3B', label: '🎉 Resolved' },
  'Rejected_Invalid_Image': { bg: '#FEE2E2', color: '#7F1D1D', label: '❌ CV Rejected' },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { bg: '#F1F5F9', color: '#64748B', label: status || 'Unknown' };
  return (
    <span
      className="animate-badge-pop"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: '9999px',
        backgroundColor: cfg.bg,
        color: cfg.color,
        fontSize: '10px',
        fontWeight: '800',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap'
      }}
    >
      {cfg.label}
    </span>
  );
}
