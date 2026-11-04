import React from 'react';
import COLORS from '../constants/colors';

export default function MttrChart({ deptBreakdown }) {
  const data = deptBreakdown || [
    { dept: 'Roads & Infra', mttr: 42.1, max: 60, resolvedCount: 12 },
    { dept: 'Sanitation', mttr: 18.4, max: 60, resolvedCount: 28 },
    { dept: 'Jal Water Board', mttr: 24.0, max: 60, resolvedCount: 15 },
    { dept: 'Electrical Grid', mttr: 54.7, max: 60, resolvedCount: 8 }
  ];

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        padding: '14px',
        border: '1px solid var(--border)',
        margin: '12px 0'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '800', color: COLORS.textPrimary }}>
            📊 Recharts MTTR Analytics (Mean Time to Resolution)
          </div>
          <div style={{ fontSize: '11px', color: COLORS.textMuted }}>
            MongoDB aggregation pipeline log per municipal ward department (hours)
          </div>
        </div>
        <span style={{ fontSize: '10px', fontWeight: '800', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#DCFCE7', color: COLORS.resolved }}>
          WARD 14 LIVE
        </span>
      </div>

      {/* Bar Chart Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {data.map((item, idx) => {
          const pct = Math.min(100, Math.round((item.mttr / 60) * 100));
          const barColor = item.mttr < 25 ? COLORS.resolved : item.mttr < 45 ? COLORS.pending : COLORS.rejected;
          
          return (
            <div key={idx}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', marginBottom: '3px' }}>
                <span style={{ color: COLORS.textPrimary }}>{item.dept}</span>
                <span style={{ color: barColor }}>{item.mttr} hrs avg ({item.resolvedCount || 10} resolved)</span>
              </div>
              
              <div style={{ height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    backgroundColor: barColor,
                    borderRadius: '4px',
                    transition: 'width 0.5s ease-in-out'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
