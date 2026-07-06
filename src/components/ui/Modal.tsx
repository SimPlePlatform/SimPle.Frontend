'use client';
import React, { useEffect, useId, useRef } from 'react';
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

const FOCUSABLE_SEL = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SEL)).filter(
    el => !el.hidden && el.offsetParent !== null,
  );
}

export function Modal({ open, onClose, title, icon, children, footer, size = 'md' }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const trigger = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose?.(); return; }
      if (e.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = getFocusable(dialog);

      if (focusable.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || active === dialog) { e.preventDefault(); last.focus(); }
      } else {
        if (active === last  || active === dialog) { e.preventDefault(); first.focus(); }
      }
    };

    window.addEventListener('keydown', onKey);

    // Initial focus: first focusable element, or dialog itself as fallback
    const dialog = dialogRef.current;
    if (dialog) {
      const focusable = getFocusable(dialog);
      (focusable[0] ?? dialog).focus();
    }

    return () => {
      window.removeEventListener('keydown', onKey);
      trigger?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className={`modal ${size === 'lg' ? 'modal-lg' : ''}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        {(title || icon) && (
          <div className="modal__head">
            {icon && (
              <div style={{ width:34, height:34, borderRadius:9, background:'var(--red-soft)', color:'var(--red-400)', display:'grid', placeItems:'center', border:'1px solid rgba(240,57,75,0.25)' }}>
                <Icon name={icon} />
              </div>
            )}
            <div className="grow">
              <div id={titleId} style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:16 }}>{title}</div>
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
