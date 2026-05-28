'use client';
import React, { useEffect } from 'react';
import { Icon } from './Icons';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  icon?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg';
}

export function Modal({ open, onClose, title, icon, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal ${size === 'lg' ? 'modal-lg' : ''}`}
        onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true"
      >
        {(title || icon) && (
          <div className="modal__head">
            {icon && (
              <div style={{ width:34, height:34, borderRadius:9, background:'var(--red-soft)', color:'var(--red-400)', display:'grid', placeItems:'center', border:'1px solid rgba(240,57,75,0.25)' }}>
                <Icon name={icon} />
              </div>
            )}
            <div className="grow">
              <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:16 }}>{title}</div>
            </div>
            <Button variant="ghost" size="sm" icon="x" onClick={onClose} aria-label="Close" />
          </div>
        )}
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  );
}
