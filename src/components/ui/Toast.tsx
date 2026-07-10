'use client';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Icon } from './Icons';
import type { Toast } from '@/types';

interface ToastContextValue {
  push: (t: Omit<Toast, 'id'>) => void;
}

const ToastCtx = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, kind: 'default', ...t };
    setToasts(curr => [...curr, toast]);
    setTimeout(() => setToasts(curr => curr.filter(x => x.id !== id)), t.duration ?? 3800);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast--${t.kind}`}>
            <div style={{
              width:28, height:28, borderRadius:8,
              background: t.kind === 'success' ? 'rgba(52,211,153,0.12)' : t.kind === 'info' ? 'rgba(56,189,248,0.12)' : 'var(--red-soft)',
              display:'grid', placeItems:'center',
              color: t.kind === 'success' ? 'var(--success)' : t.kind === 'info' ? 'var(--ice-400)' : 'var(--red-400)',
            }}>
              <Icon name={t.icon ?? (t.kind === 'success' ? 'check' : t.kind === 'info' ? 'bell' : 'sparkle')} size={14} />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              {t.title && <div style={{ fontSize:13, fontWeight:600, color:'var(--text-hi)' }}>{t.title}</div>}
              {t.body  && <div style={{ fontSize:12.5, color:'var(--text-md)', marginTop:2 }}>{t.body}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
