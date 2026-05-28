'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { ApiError, authApi } from '@/lib/api-client';
import { ROUTES } from '@/lib/routes';

function passwordStrength(password: string) {
  if (!password) return { score: 0, label: '', color: 'var(--border-1)', pct: 0 };
  const len = password.length;
  const hasUpper   = /[A-Z]/.test(password);
  const hasLower   = /[a-z]/.test(password);
  const hasDigit   = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const variety = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
  if (len < 8 || variety < 2) return { score: 1, label: 'Too weak',    color: '#EF4444', pct: 20 };
  if (len < 10 || variety < 3) return { score: 2, label: 'Weak',       color: '#F97316', pct: 40 };
  if (len < 12 || variety < 3) return { score: 3, label: 'Fair',       color: '#EAB308', pct: 60 };
  if (len < 14 || variety < 4) return { score: 4, label: 'Strong',     color: '#3B82F6', pct: 80 };
  return                              { score: 5, label: 'Very strong', color: '#22C55E', pct: 100 };
}

export function ResetPasswordPage({ token }: { token: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const strength = passwordStrength(password);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }
    if (strength.score < 2) {
      setError('Password is too weak. Use at least 8 characters with a mix of letters, numbers, or symbols.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword(token, password, confirm);
      setDone(true);
      push({ kind:'success', title:'Password updated', body:'You can now sign in with your new password.' });
    } catch (requestError) {
      const message = requestError instanceof ApiError ? requestError.message : 'Could not reset password. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', background:'var(--bg-0)', padding:24 }}>
      <div style={{ width:'100%', maxWidth:440 }}>
        {/* Brand */}
        <div className="row" style={{ gap:10, marginBottom:40 }}>
          <div className="brand__logo" style={{ width:28, height:28 }} />
          <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:18 }}>SimPle</div>
        </div>

        <div className="surface" style={{ padding:40, borderRadius:16 }}>
          {done ? (
            <div style={{ textAlign:'center' }}>
              <div style={{
                width:64, height:64, borderRadius:16,
                background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.25)',
                display:'grid', placeItems:'center', margin:'0 auto 24px',
              }}>
                <Icon name="check" size={28} style={{ color:'#22C55E' }} />
              </div>
              <h2 className="font-display" style={{ fontSize:24, fontWeight:600, marginBottom:8 }}>Password updated</h2>
              <p style={{ color:'var(--text-md)', fontSize:14, marginBottom:28 }}>
                Your new password is set. All previous sessions have been signed out.
              </p>
              <Button size="lg" iconRight="arrowRight" onClick={() => router.replace(ROUTES.login)}>
                Sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h2 className="font-display" style={{ fontSize:26, fontWeight:600, marginBottom:6 }}>Set a new password</h2>
              <p style={{ color:'var(--text-md)', marginBottom:28, fontSize:14 }}>
                Choose a strong password you haven&apos;t used before.
              </p>

              <div className="col" style={{ gap:14 }}>
                <label style={{ display:'block' }}>
                  <div className="row between" style={{ marginBottom:6 }}>
                    <span className="label">New password</span>
                  </div>
                  <div style={{ position:'relative' }}>
                    <input
                      type={show ? 'text' : 'password'}
                      className={`input input-lg ${error ? 'input--error' : ''}`}
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                    />
                    <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setShow(v => !v)} style={{ position:'absolute', right:6, top:6 }} aria-label={show ? 'Hide' : 'Show'}>
                      <Icon name={show ? 'eyeOff' : 'eye'} size={14} />
                    </button>
                  </div>
                  <div className="row" style={{ marginTop:8, gap:8 }}>
                    <div className="bar" style={{ flex:1, height:4 }}><div className="bar__fill" style={{ width:`${strength.pct}%`, background:strength.color, transition:'width 0.2s, background 0.2s' }} /></div>
                    {strength.label && <span className="mono" style={{ fontSize:11, color:strength.color }}>{strength.label}</span>}
                  </div>
                </label>

                <label style={{ display:'block' }}>
                  <div className="row between" style={{ marginBottom:6 }}>
                    <span className="label">Confirm password</span>
                  </div>
                  <input
                    type="password"
                    className={`input input-lg ${error && password !== confirm ? 'input--error' : ''}`}
                    value={confirm}
                    onChange={event => setConfirm(event.target.value)}
                    autoComplete="new-password"
                  />
                </label>

                {!token && (
                  <div style={{ color:'var(--danger)', fontSize:12 }}>
                    This link is invalid. Please request a new password reset.
                  </div>
                )}
                {error && (
                  <div className="row" style={{ color:'var(--danger)', fontSize:12, gap:6 }}>
                    <Icon name="x" size={14} /> {error}
                  </div>
                )}

                <Button type="submit" size="lg" disabled={loading || !token} icon={loading ? 'refresh' : undefined}>
                  {loading ? 'Updating password…' : 'Set new password'}
                </Button>

                <button
                  type="button"
                  onClick={() => router.replace(ROUTES.login)}
                  style={{ border:0, background:'none', color:'var(--text-lo)', cursor:'pointer', fontSize:13, textAlign:'center' }}
                >
                  Back to sign in
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
