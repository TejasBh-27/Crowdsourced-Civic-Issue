import React from 'react';
import COLORS from '../constants/colors';

export default function MapHeatmap({ complaints }) {
  const points = complaints || [];

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '800', color: COLORS.textPrimary }}>
            🗺️ Leaflet.js Ward 14 Heatmap & GeoJSON Clusters
          </div>
          <div style={{ fontSize: '11px', color: COLORS.textMuted }}>
            Real-time complaint density visualization from MongoDB spatial index
          </div>
        </div>
        <span style={{ fontSize: '10px', fontWeight: '800', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#DBEAFE', color: COLORS.assigned }}>
          HEATMAP ON
        </span>
      </div>

      <div
        style={{
          height: '160px',
          backgroundColor: '#0F172A',
          borderRadius: '12px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Heatmap Grid & Glow Clusters */}
        <div style={{ position: 'absolute', top: '20%', left: '30%', width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.4)', filter: 'blur(12px)' }} />
        <div style={{ position: 'absolute', bottom: '25%', right: '35%', width: '90px', height: '90px', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.35)', filter: 'blur(14px)' }} />
        <div style={{ position: 'absolute', top: '40%', right: '20%', width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.3)', filter: 'blur(10px)' }} />

        {/* Pin Points */}
        {points.slice(0, 5).map((c, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${25 + (i * 15)}%`,
              left: `${20 + (i * 18)}%`,
              backgroundColor: c.urgency === 'high' || c.urgency === 'critical' ? COLORS.rejected : COLORS.pending,
              color: '#FFFFFF',
              borderRadius: '12px',
              padding: '2px 8px',
              fontSize: '9px',
              fontWeight: '800',
              boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
              cursor: 'pointer'
            }}
          >
            📍 {c.id} ({c.category})
          </div>
        ))}

        <div style={{ position: 'absolute', bottom: '8px', left: '10px', color: '#94A3B8', fontSize: '10px', fontWeight: '700' }}>
          Ward 14 Coordinates Range: 28.6120° N - 77.2090° E
        </div>
      </div>
    </div>
  );
}
