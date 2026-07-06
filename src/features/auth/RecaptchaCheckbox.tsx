'use client';

import Script from 'next/script';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';

interface RecaptchaApi {
  render: (container: HTMLElement, options: {
    sitekey: string;
    theme: 'dark';
    callback: (token: string) => void;
    'expired-callback': () => void;
    'error-callback': () => void;
  }) => number;
  reset: (widgetId: number) => void;
  ready: (callback: () => void) => void;
}

declare global {
  interface Window {
    grecaptcha?: RecaptchaApi;
  }
}

export interface RecaptchaCheckboxHandle {
  reset: () => void;
}

interface Props {
  onChange: (token: string) => void;
}

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? '';

// Dev/test-only captcha seam. When this build-time flag is set to a non-empty value, the
// widget short-circuits and emits that value as the captcha token, which the backend accepts
// only when its Recaptcha:DevBypassToken is set to the same value. Both are unset in production,
// so this is inert there. Mirrors the backend GoogleRecaptchaV2Service DevBypassToken seam and
// exists so the /simple-verify-checkpoint Playwright E2E can drive sign-in without Google.
const E2E_BYPASS_TOKEN = process.env.NEXT_PUBLIC_E2E_CAPTCHA_BYPASS ?? '';

export const RecaptchaCheckbox = forwardRef<RecaptchaCheckboxHandle, Props>(
  function RecaptchaCheckbox({ onChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<number | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    // Emit the dev/test bypass token on mount when the seam is enabled.
    useEffect(() => {
      if (E2E_BYPASS_TOKEN) onChangeRef.current(E2E_BYPASS_TOKEN);
    }, []);

    const configured = SITE_KEY !== '' && !SITE_KEY.startsWith('REPLACE');

    const renderWidget = useCallback(() => {
      if (!configured || !window.grecaptcha || !containerRef.current || widgetIdRef.current !== null) return;

      window.grecaptcha.ready(() => {
        if (!containerRef.current || widgetIdRef.current !== null) return;
        widgetIdRef.current = window.grecaptcha!.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme: 'dark',
          callback: token => onChangeRef.current(token),
          'expired-callback': () => onChangeRef.current(''),
          'error-callback': () => onChangeRef.current(''),
        });
      });
    }, [configured]);

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (window.grecaptcha && widgetIdRef.current !== null) {
          window.grecaptcha.reset(widgetIdRef.current);
        }
        onChangeRef.current(E2E_BYPASS_TOKEN || '');
      },
    }), []);

    if (E2E_BYPASS_TOKEN) {
      return (
        <div data-testid="captcha-e2e-bypass" style={{ fontSize:12, padding:'8px 10px', border:'1px dashed var(--text-md)', borderRadius:6, color:'var(--text-md)' }}>
          reCAPTCHA bypassed (E2E test mode).
        </div>
      );
    }

    if (!configured) {
      return (
        <div style={{ fontSize:12, padding:'10px 12px', border:'1px solid var(--danger)', borderRadius:6, color:'var(--danger)', lineHeight:1.5 }}>
          reCAPTCHA not configured.{' '}
          <a href="https://www.google.com/recaptcha/admin/create" target="_blank" rel="noopener noreferrer" style={{ color:'inherit', textDecoration:'underline' }}>
            Create v2 keys
          </a>{' '}
          and set <code>NEXT_PUBLIC_RECAPTCHA_SITE_KEY</code> in <code>frontend/.env.local</code>.
        </div>
      );
    }

    return (
      <>
        <Script
          src="https://www.google.com/recaptcha/api.js?render=explicit"
          strategy="afterInteractive"
          onReady={renderWidget}
        />
        <div ref={containerRef} />
      </>
    );
  },
);
