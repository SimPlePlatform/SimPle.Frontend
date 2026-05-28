'use client';
import React from 'react';
import { Icon } from './Icons';

interface EmptyStateProps {
  icon?: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = 'search', title, body, action }: EmptyStateProps) {
  return (
    <div style={{ textAlign:'center', padding:'56px 24px' }}>
      <div style={{ width:56, height:56, margin:'0 auto 14px', display:'grid', placeItems:'center', borderRadius:16, background:'var(--bg-3)', border:'1px solid var(--border-2)', color:'var(--text-lo)' }}>
        <Icon name={icon} size={22} />
      </div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:600, color:'var(--text-hi)' }}>{title}</div>
      {body && <div style={{ marginTop:6, color:'var(--text-lo)', fontSize:13 }}>{body}</div>}
      {action && <div style={{ marginTop:18 }}>{action}</div>}
    </div>
  );
}

export function Skeleton({ w = '100%', h = 12, r = 6, style }: { w?: string|number; h?: number; r?: number; style?: React.CSSProperties }) {
  return <div className="skel" style={{ width:w, height:h, borderRadius:r, ...style }} />;
}
