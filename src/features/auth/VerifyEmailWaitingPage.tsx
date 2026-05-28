'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { ApiError, authApi } from '@/lib/api-client';
import { ROUTES } from '@/lib/routes';
import { useAuth } from './AuthProvider';

const RESEND_COOLDOWN = 60; // seconds

export function VerifyEmailWaitingPage() {
  const router = useRouter();
  const { user, status, logout } = useAuth();
  const { push } = useToast();
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect when verified, send to login when anonymous
  useEffect(() => {
    if (status === 'authenticated') router.replace(ROUTES.dashboard);
    if (status === 'anonymous') router.replace(ROUTES.login);
  }, [status, router]);

  // Start the initial cooldown so the user can't immediately spam resend
  useEffect(() => {
    startCooldown();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  const resend = async () => {
    setSending(true);
    try {
      await authApi.resendVerification();
      push({ kind:'success', title:'Email sent', body:'Check your inbox for the verification link.' });
      startCooldown();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to send. Please try again.';
      push({ title:'Could not resend', body:message, icon:'x' });
    } finally {
      setSending(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace(ROUTES.login);
  };

  if (status === 'loading') {
    return (
      <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', background:'var(--bg-0)' }}>
        <span style={{ color:'var(--text-md)' }}>Loading…</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', background:'var(--bg-0)', padding:24 }}>
      <div style={{ width:'100%', maxWidth:480 }}>
        {/* Brand */}
        <div className="row" style={{ gap:10, marginBottom:40 }}>
          <div className="brand__logo" style={{ width:28, height:28 }} />
          <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:18 }}>SimPle</div>
        </div>

        <div className="surface" style={{ padding:40, borderRadius:16, textAlign:'center' }}>
          {/* Email icon */}
          <div style={{
            width:72, height:72, borderRadius:16,
            background:'linear-gradient(135deg, rgba(240,57,75,0.15), rgba(240,57,75,0.05))',
            border:'1px solid rgba(240,57,75,0.2)',
            display:'grid', placeItems:'center', margin:'0 auto 24px',
          }}>
            <Icon name="mail" size={32} style={{ color:'#F0394B' }} />
          </div>

          <h1 className="font-display" style={{ fontSize:26, fontWeight:600, marginBottom:10 }}>
            Verify your email
          </h1>
          <p style={{ color:'var(--text-md)', marginBottom:6 }}>
            We sent a verification link to
          </p>
          <p style={{ fontWeight:600, marginBottom:24, wordBreak:'break-all' }}>
            {user?.email ?? 'your email address'}
          </p>
          <p style={{ color:'var(--text-lo)', fontSize:13, marginBottom:32, lineHeight:1.6 }}>
            Click the link in the email to activate your account. If you don&apos;t see it, check your spam folder.
          </p>

          <div className="col" style={{ gap:12 }}>
            <Button
              size="lg"
              disabled={cooldown > 0 || sending}
              icon={sending ? 'refresh' : undefined}
              onClick={resend}
            >
              {sending
                ? 'Sending…'
                : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : 'Resend verification email'}
            </Button>

            <button
              type="button"
              onClick={handleLogout}
              style={{ border:0, background:'none', color:'var(--text-lo)', cursor:'pointer', fontSize:13, padding:'8px 0' }}
            >
              Sign out and use a different account
            </button>
          </div>
        </div>

        <p style={{ textAlign:'center', color:'var(--text-dim)', fontSize:12, marginTop:24 }}>
          The link expires in 24 hours. &copy; {new Date().getFullYear()} SimPle
        </p>
      </div>
    </div>
  );
}
