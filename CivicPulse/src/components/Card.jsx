import React from 'react';

export default function Card({ children, style = {}, onClick, elevated = false, className = '' }) {
  const isClickable = typeof onClick === 'function';
  return (
    <div
      className={`cp-card ${elevated ? 'elevated' : ''} ${isClickable ? 'clickable' : ''} ${className}`}
      onClick={onClick}
      style={{ padding: '14px', marginBottom: '12px', ...style }}
    >
      {children}
    </div>
  );
}
