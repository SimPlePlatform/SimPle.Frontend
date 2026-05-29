import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// Wraps every page body with max-width, responsive horizontal padding,
// and safe-area-aware bottom padding (accounts for BottomNav on mobile).
export function PageContainer({ children, className = '', style }: PageContainerProps) {
  return (
    <div className={`page ${className}`} style={style}>
      {children}
    </div>
  );
}
