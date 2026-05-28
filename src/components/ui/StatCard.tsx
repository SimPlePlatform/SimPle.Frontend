'use client';
import React from 'react';
import { Icon } from './Icons';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  trend?: string;
  icon?: string;
  accent?: 'red' | 'ice';
}

export function StatCard({ label, value, hint, trend, icon, accent = 'red' }: StatCardProps) {
  const trendColor = trend?.startsWith('+') ? 'var(--success)' : trend?.startsWith('-') ? 'var(--danger)' : 'var(--text-lo)';
  return (
    <div className="card" style={{ padding:18 }}>
      <div className="between">
        <div className="uppercase-label">{label}</div>
        {icon && (
          <div style={{ width:28, height:28, borderRadius:8, background: accent === 'ice' ? 'rgba(56,189,248,0.10)' : 'var(--red-soft)', color: accent === 'ice' ? 'var(--ice-400)' : 'var(--red-400)', display:'grid', placeItems:'center' }}>
            <Icon name={icon} size={14} />
          </div>
        )}
      </div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:600, marginTop:8, letterSpacing:'-0.02em' }}>{value}</div>
      <div className="row" style={{ marginTop:6, fontSize:12, color:'var(--text-lo)', gap:6 }}>
        {trend && <span className="mono" style={{ color:trendColor, fontWeight:600 }}>{trend}</span>}
        {hint && <span>{hint}</span>}
      </div>
    </div>
  );
}
