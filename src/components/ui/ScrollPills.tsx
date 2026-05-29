'use client';
import React from 'react';

interface ScrollPillsProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// Horizontal scroll-snap pill row for tabs and filters.
// Fades at edges to hint at overflow; scrollbar hidden.
export function ScrollPills({ children, className = '', style }: ScrollPillsProps) {
  return (
    <div style={{ position: 'relative', ...style }}>
      {/* Left fade */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 24, zIndex: 1,
        background: 'linear-gradient(to right, var(--bg-2), transparent)',
        pointerEvents: 'none',
      }} />
      <div className={`scroll-pills ${className}`}>
        {children}
      </div>
      {/* Right fade */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 24, zIndex: 1,
        background: 'linear-gradient(to left, var(--bg-2), transparent)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}
