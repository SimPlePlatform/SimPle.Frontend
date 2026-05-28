'use client';
import React from 'react';
import { Icon } from './Icons';

interface TabItem {
  value: string;
  label: string;
  icon?: string;
  count?: number;
}

interface TabsProps {
  value: string;
  onChange: (v: string) => void;
  items: TabItem[];
}

export function Tabs({ value, onChange, items }: TabsProps) {
  return (
    <div className="tabs" role="tablist">
      {items.map(it => (
        <button
          key={it.value} role="tab"
          aria-selected={value === it.value}
          className={`tab ${value === it.value ? 'tab--active' : ''}`}
          onClick={() => onChange(it.value)}
        >
          {it.icon && <Icon name={it.icon} size={13} />}
          {it.label}
          {it.count != null && (
            <span className="mono" style={{ color:'var(--text-lo)', fontSize:11 }}>{it.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
