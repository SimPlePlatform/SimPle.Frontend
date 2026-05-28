'use client';
import React from 'react';

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const txt = label ?? (status.charAt(0).toUpperCase() + status.slice(1));
  return (
    <span className="chip">
      <span className={`dot dot--${status}`} />
      <span>{txt}</span>
    </span>
  );
}
