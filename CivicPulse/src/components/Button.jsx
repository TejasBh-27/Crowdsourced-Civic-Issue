import React from 'react';
import COLORS from '../constants/colors';

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style = {},
  icon = null
}) {
  const sizeStyles = {
    small: { padding: '7px 14px', fontSize: '12px', borderRadius: '8px' },
    medium: { padding: '11px 18px', fontSize: '14px', borderRadius: '10px' },
    large: { padding: '14px 24px', fontSize: '15px', borderRadius: '12px' }
  };

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled || loading}
      className={`cp-btn ${variant}`}
      style={{ ...sizeStyles[size], ...style }}
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span style={{ marginLeft: '4px' }}>Processing…</span>
        </span>
      ) : (
        <>
          {icon && <span>{icon}</span>}
          <span>{title}</span>
        </>
      )}
    </button>
  );
}
