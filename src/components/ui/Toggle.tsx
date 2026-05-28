'use client';
import React from 'react';

interface ToggleProps {
  on: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

export function Toggle({ on, onChange, label }: ToggleProps) {
  return (
    <label className="row" style={{ gap:8, cursor:'pointer' }}>
      <span style={{ position:'relative', width:34, height:20, background: on ? 'var(--red-500)' : 'var(--bg-4)', borderRadius:999, transition:'.15s', border:'1px solid var(--border-2)', display:'inline-block', flexShrink:0 }}>
        <span style={{ position:'absolute', top:2, left: on ? 16 : 2, width:14, height:14, borderRadius:999, background:'white', transition:'.15s', display:'block' }} />
      </span>
      {label && <span style={{ fontSize:13, color:'var(--text-md)' }}>{label}</span>}
      <input type="checkbox" checked={on} onChange={e => onChange(e.target.checked)} style={{ display:'none' }} />
    </label>
  );
}
