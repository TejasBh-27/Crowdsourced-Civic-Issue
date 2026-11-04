import React, { useState } from 'react';
import COLORS from '../constants/colors';

const LANDMARKS = [
  { name: 'Main Market Road, Gate 2', lat: 28.6139, lng: 77.2090 },
  { name: 'Block C Community Park Outer Lane', lat: 28.6152, lng: 77.2105 },
  { name: 'Lane 4, Near Model Public School', lat: 28.6120, lng: 77.2070 },
  { name: 'Central Bus Intersection Footbridge', lat: 28.6180, lng: 77.2150 }
];

export default function MapPicker({ selectedLocation, onSelectLocation }) {
  const [activeLoc, setActiveLoc] = useState(
    selectedLocation || { address: LANDMARKS[0].name + ', Ward 14', latitude: LANDMARKS[0].lat, longitude: LANDMARKS[0].lng }
  );

  const handlePickLandmark = (item) => {
    const loc = {
      address: `${item.name}, Ward 14 - Central Zone`,
      latitude: item.lat,
      longitude: item.lng
    };
    setActiveLoc(loc);
    if (onSelectLocation) onSelectLocation(loc);
  };

  return (
    <div style={{ margin: '12px 0' }}>
      <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.textPrimary, marginBottom: '6px' }}>
        🗺️ Geo-Tagged GPS Location (Google Maps / Leaflet SDK)
      </div>

      {/* Simulated Map Graphic Container */}
      <div
        style={{
          height: '140px',
          backgroundColor: '#E0F2FE',
          borderRadius: '14px',
          border: '1.5px solid #BAE6FD',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: '2px', backgroundColor: 'rgba(56, 189, 248, 0.4)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '2px', backgroundColor: 'rgba(56, 189, 248, 0.4)' }} />

        {/* Pin Marker */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: COLORS.rejected,
              border: '2px solid #FFFFFF',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FFFFFF' }} />
          </div>
          <div style={{ width: '3px', height: '10px', backgroundColor: COLORS.rejected }} />
          <div style={{ width: '16px', height: '4px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.25)', marginTop: '2px' }} />
        </div>

        {/* Coordinates Pill */}
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            color: '#FFFFFF',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: '700'
          }}
        >
          GeoJSON: [{activeLoc.longitude?.toFixed(4)}, {activeLoc.latitude?.toFixed(4)}]
        </div>
      </div>

      <div style={{ fontSize: '11px', fontWeight: '700', color: COLORS.textMuted, marginTop: '8px', marginBottom: '4px', textTransform: 'uppercase' }}>
        Select Ward 14 Landmark:
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {LANDMARKS.map((lm, idx) => {
          const isSelected = activeLoc.address.includes(lm.name);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handlePickLandmark(lm)}
              style={{
                backgroundColor: isSelected ? COLORS.primaryLight : '#F1F5F9',
                color: isSelected ? COLORS.primaryDark : COLORS.textSecondary,
                border: isSelected ? `1.5px solid ${COLORS.primary}` : '1px solid var(--border)',
                borderRadius: '16px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: isSelected ? '700' : '500',
                cursor: 'pointer'
              }}
            >
              📍 {lm.name}
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: '8px',
          padding: '8px 12px',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          fontSize: '12px',
          color: COLORS.textPrimary,
          fontWeight: '600'
        }}
      >
        <span style={{ color: COLORS.textMuted, fontSize: '10px', display: 'block' }}>CONFIRMED LOCATION ADDRESS:</span>
        {activeLoc.address}
      </div>
    </div>
  );
}
