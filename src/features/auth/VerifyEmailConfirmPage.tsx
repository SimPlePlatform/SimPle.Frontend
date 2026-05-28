'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icons';
import { ApiError, authApi } from '@/lib/api-client';
import { ROUTES } from '@/lib/routes';
import { useAuth } from './AuthProvider';

type State = 'verifying' | 'success' | 'error';

export function VerifyEmailConfirmPage({ token }: { token: string }) {
  const router = useRouter();
  const { reloadSession } = useAuth();
  const [state, setState] = useState<State>(token ? 'verifying' : 'error');
  const [errorMessage, setErrorMessage] = useState(
    token ? '' : 'No verification token found in the link.'
  );

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const run = async () => {
      try {
        await authApi.verifyEmail(token);
        if (cancelled) return;
        // Reload session so AuthProvider picks up isEmailVerified = true
        await reloadSession();
        setState('success');
        // Give the user a moment to read the success message before redirecting
        setTimeout(() => {
          if (!cancelled) router.replace(ROUTES.dashboard);
        }, 2500);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof ApiError
          ? error.message
          : 'Something went wrong. Please try again.';
        setErrorMessage(message);
        setState('error');
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [token, router, reloadSession]);

  return (
    <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', background:'var(--bg-0)', padding:24 }}>
      <div style={{ width:'100%', maxWidth:440 }}>
        {/* Brand */}
        <div className="row" style={{ gap:10, marginBottom:40 }}>
          <div className="brand__logo" style={{ width:28, height:28 }} />
          <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:18 }}>SimPle</div>
        </div>

        <div className="surface" style={{ padding:40, borderRadius:16, textAlign:'center' }}>
          {state === 'verifying' && (
            <>
              <div style={{
                width:64, height:64, borderRadius:16,
                background:'rgba(240,57,75,0.08)', border:'1px solid rgba(240,57,75,0.15)',
                display:'grid', placeItems:'center', margin:'0 auto 24px',
              }}>
                <Icon name="refresh" size={28} style={{ color:'#F0394B', animation:'spin 1s linear infinite' }} />
              </div>
              <h2 className="font-display" style={{ fontSize:22, fontWeight:600, marginBottom:8 }}>
                Verifying your email…
              </h2>
              <p style={{ color:'var(--text-md)', fontSize:14 }}>Just a second.</p>
            </>
          )}

          {state === 'success' && (
            <>
              <div style={{
                width:64, height:64, borderRadius:16,
                background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.25)',
                display:'grid', placeItems:'center', margin:'0 auto 24px',
              }}>
                <Icon name="check" size={28} style={{ color:'#22C55E' }} />
              </div>
              <h2 className="font-display" style={{ fontSize:24, fontWeight:600, marginBottom:8 }}>
                Email verified!
              </h2>
              <p style={{ color:'var(--text-md)', fontSize:14, marginBottom:24 }}>
                Welcome to SimPle. Redirecting you to the dashboard…
              </p>
              <Button size="lg" onClick={() => router.replace(ROUTES.dashboard)}>
                Go to dashboard
              </Button>
            </>
          )}

          {state === 'error' && (
            <>
              <div style={{
                width:64, height:64, borderRadius:16,
                background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)',
                display:'grid', placeItems:'center', margin:'0 auto 24px',
              }}>
                <Icon name="x" size={28} style={{ color:'#EF4444' }} />
              </div>
              <h2 className="font-display" style={{ fontSize:22, fontWeight:600, marginBottom:8 }}>
                Verification failed
              </h2>
              <p style={{ color:'var(--text-md)', fontSize:14, marginBottom:24 }}>
                {errorMessage}
              </p>
              <div className="col" style={{ gap:10 }}>
                <Button size="lg" onClick={() => router.replace(ROUTES.verifyEmail)}>
                  Request a new link
                </Button>
                <Button variant="secondary" size="lg" onClick={() => router.replace(ROUTES.login)}>
                  Back to sign in
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
