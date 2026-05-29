'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { ApiError, authApi } from '@/lib/api-client';
import { ROUTES } from '@/lib/routes';
import { GoogleOAuthButton } from './GoogleOAuthButton';
import { useAuth } from './AuthProvider';
import { RecaptchaCheckbox, type RecaptchaCheckboxHandle } from './RecaptchaCheckbox';

type Mode = 'login' | 'register' | 'forgot';
type RegisterDraft = { email: string; password: string; confirmPassword: string };

function returnPath() {
  if (typeof window === 'undefined') return ROUTES.dashboard;
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : ROUTES.dashboard;
}

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : 'Unable to connect. Please try again.';
}

export function AuthPage({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const { status } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<'form' | 'setup'>('form');
  const [draft, setDraft] = useState<RegisterDraft | null>(null);
  const [loginIdentifier, setLoginIdentifier] = useState('');

  useEffect(() => {
    if (status === 'authenticated') router.replace(returnPath());
    if (status === 'unverified') router.replace(ROUTES.verifyEmail);
  }, [router, status]);

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setStep('form');
    setDraft(null);
  };

  const registrationComplete = (email: string) => {
    setLoginIdentifier(email);
    switchMode('login');
  };

  return (
    <div className="auth-layout" style={{ minHeight:'100dvh', display:'grid', gridTemplateColumns:'1fr 1fr', background:'var(--bg-0)' }}>
      <div className="auth-left-panel"><AuthLeft /></div>
      <div style={{ display:'grid', placeItems:'center', padding:'clamp(16px,5vw,48px)', minHeight:'100dvh' }}>
        <div style={{ width:'100%', maxWidth:420 }}>
          {status !== 'anonymous' ? (
            <div style={{ textAlign:'center', color:'var(--text-md)' }}>Checking your session...</div>
          ) : (
            <>
              {step === 'form' && mode === 'login' && (
                <LoginForm
                  initialIdentifier={loginIdentifier}
                  onSwitch={() => switchMode('register')}
                  onForgot={() => switchMode('forgot')}
                />
              )}
              {step === 'form' && mode === 'register' && (
                <RegisterForm
                  onNext={value => { setDraft(value); setStep('setup'); }}
                  onSwitch={() => switchMode('login')}
                />
              )}
              {step === 'form' && mode === 'forgot' && (
                <ForgotPasswordForm onBack={() => switchMode('login')} />
              )}
              {step === 'setup' && draft && (
                <ProfileSetup draft={draft} onDone={registrationComplete} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AuthLeft() {
  // This panel always has a dark background regardless of the active theme,
  // so all text colours are pinned to the dark-mode palette values.
  return (
    <div style={{ position:'relative', overflow:'hidden', background:'linear-gradient(180deg, #0A0E18 0%, #07090F 100%)', padding:48, display:'flex', flexDirection:'column', justifyContent:'space-between', color:'#F2F5FB' }}>
      <div className="grid-bg" style={{ opacity:0.5 }} />
      <div className="row" style={{ gap:10, zIndex:2, position:'relative' }}>
        <div className="brand__logo" style={{ width:30, height:30 }} />
        <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:20, color:'#F2F5FB' }}>SimPle</div>
      </div>
      <div style={{ position:'relative', zIndex:2 }}>
        <div className="row" style={{ gap:8, marginBottom:16 }}>
          <span className="chip chip--red chip--mono"><span className="dot dot--playing" />Season 4 live</span>
          <span className="chip chip--mono" style={{ background:'rgba(255,255,255,0.06)', color:'#B6BFD5', borderColor:'rgba(255,255,255,0.1)' }}>+312 today</span>
        </div>
        <h1 className="font-display" style={{ fontSize:48, fontWeight:600, lineHeight:1.05, letterSpacing:'-0.02em', maxWidth:480, color:'#F2F5FB' }}>
          A premium clubhouse for sharp little games.
        </h1>
        <p style={{ marginTop:14, maxWidth:440, color:'#B6BFD5' }}>Find your friends. Drill against AI. Climb a ladder that actually matters.</p>
        <div style={{ marginTop:32, display:'grid', gap:8, maxWidth:420 }}>
          <ActivityRow initials="PR" color="#38BDF8" name="Priya Raman" text="started a Chess Lite lobby" when="now" />
          <ActivityRow initials="SL" color="#34D399" name="Sara Lindqvist" text="climbed to Diamond II - +24 ELO" when="2m" />
          <ActivityRow initials="MO" color="#A78BFA" name="Mateus Oliveira" text="unlocked Tetris Sprint achievement" when="5m" />
        </div>
      </div>
      <div className="row" style={{ gap:14, color:'#7A8299', fontSize:12, zIndex:2, position:'relative' }}>
        <span className="row" style={{ gap:6 }}><Icon name="lock" size={12} /> End-to-end TLS</span>
        <span className="row" style={{ gap:6 }}><Icon name="shield" size={12} /> Server-validated moves</span>
        <span className="row" style={{ gap:6 }}><Icon name="signal" size={12} /> Region-aware</span>
      </div>
    </div>
  );
}

function ActivityRow({ initials, color, name, text, when }: { initials:string; color:string; name:string; text:string; when:string }) {
  return (
    <div className="row" style={{ padding:10, gap:10, borderRadius:'var(--r-sm)', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)' }}>
      <Avatar user={{ initials, color }} size="sm" />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12.5, color:'#F2F5FB' }}><b>{name}</b> <span style={{ color:'#B6BFD5' }}>{text}</span></div>
      </div>
      <div className="mono" style={{ fontSize:10.5, color:'#7A8299' }}>{when}</div>
    </div>
  );
}

function LoginForm({ initialIdentifier, onSwitch, onForgot }: { initialIdentifier: string; onSwitch: () => void; onForgot: () => void }) {
  const { login } = useAuth();
  const { push } = useToast();
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const captchaRef = useRef<RecaptchaCheckboxHandle>(null);
  const handleGoogleError = (message: string) => { setError(message); };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Enter your email or username and password.');
      return;
    }
    if (!captchaToken) {
      setError('Please complete the CAPTCHA check.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await login({ emailOrUsername: identifier.trim(), password, captchaToken });
      push({ kind:'success', title:'Welcome back', body:'You are signed in.' });
      // Navigation handled by AuthPage's useEffect when status becomes 'authenticated' or 'unverified'.
    } catch (requestError) {
      const message = errorText(requestError);
      setError(message);
      push({ title:'Sign in failed', body:message, icon:'x' });
      captchaRef.current?.reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <h2 className="font-display" style={{ fontSize:28, fontWeight:600 }}>Welcome back.</h2>
      <p style={{ marginTop:6 }}>Sign in to pick up where you left off.</p>
      <div className="col" style={{ marginTop:24, gap:14 }}>
        <Field label="Email or username">
          <input className="input input-lg" value={identifier} onChange={event => setIdentifier(event.target.value)} placeholder="you@somewhere.com" autoComplete="username" />
        </Field>
        <Field label="Password" hint={
          <button type="button" onClick={onForgot} style={{ border:0, background:'none', color:'var(--text-md)', fontSize:12, cursor:'pointer', padding:0 }}>
            Forgot?
          </button>
        }>
          <div style={{ position:'relative' }}>
            <input type={show ? 'text' : 'password'} className={`input input-lg ${error ? 'input--error' : ''}`} value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" />
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setShow(value => !value)} style={{ position:'absolute', right:6, top:6 }} aria-label={show ? 'Hide password' : 'Show password'}>
              <Icon name={show ? 'eyeOff' : 'eye'} size={14} />
            </button>
          </div>
        </Field>
        <RecaptchaCheckbox ref={captchaRef} onChange={setCaptchaToken} />
        {error && <div className="row" style={{ color:'var(--danger)', fontSize:12, gap:6 }}><Icon name="x" size={14} /> {error}</div>}
        <Button type="submit" size="lg" disabled={loading} icon={loading ? 'refresh' : undefined} iconRight={!loading ? 'arrowRight' : undefined}>
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </div>
      <Divider label="or continue with" />
      <div className="grid" style={{ gap:10 }}>
        <GoogleOAuthButton onError={handleGoogleError} />
      </div>
      <p style={{ marginTop:24, fontSize:13, textAlign:'center', color:'var(--text-lo)' }}>
        New here? <button type="button" onClick={onSwitch} style={{ border:0, background:'none', color:'var(--red-400)', cursor:'pointer' }}>Create an account -&gt;</button>
      </p>
    </form>
  );
}

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const { push } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch {
      // Always show success to prevent email enumeration.
      setSent(true);
      push({ kind:'success', title:'Email sent', body:'If that address is registered, you will receive a reset link.' });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div>
        <button type="button" onClick={onBack} className="btn btn-ghost btn-sm row" style={{ gap:6, marginBottom:20, paddingLeft:0 }}>
          <Icon name="arrowLeft" size={14} /> Back to sign in
        </button>
        <div style={{ textAlign:'center', padding:'32px 0' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>📧</div>
          <h2 className="font-display" style={{ fontSize:24, fontWeight:600, marginBottom:8 }}>Check your inbox</h2>
          <p style={{ color:'var(--text-md)', fontSize:14, maxWidth:320, margin:'0 auto' }}>
            If <strong>{email}</strong> is registered, we sent a password reset link. It expires in 1 hour.
          </p>
          <p style={{ color:'var(--text-lo)', fontSize:12, marginTop:16 }}>
            Did not get it? Check your spam folder or{' '}
            <button type="button" onClick={() => setSent(false)} style={{ border:0, background:'none', color:'var(--red-400)', cursor:'pointer', fontSize:12 }}>
              try again
            </button>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <button type="button" onClick={onBack} className="btn btn-ghost btn-sm row" style={{ gap:6, marginBottom:20, paddingLeft:0 }}>
        <Icon name="arrowLeft" size={14} /> Back to sign in
      </button>
      <h2 className="font-display" style={{ fontSize:28, fontWeight:600 }}>Reset your password.</h2>
      <p style={{ marginTop:6 }}>Enter your account email and we will send a reset link.</p>
      <div className="col" style={{ marginTop:24, gap:14 }}>
        <Field label="Email">
          <input className={`input input-lg ${error ? 'input--error' : ''}`} value={email} onChange={event => setEmail(event.target.value)} placeholder="you@somewhere.com" autoComplete="email" />
        </Field>
        {error && <div className="row" style={{ color:'var(--danger)', fontSize:12, gap:6 }}><Icon name="x" size={14} /> {error}</div>}
        <Button type="submit" size="lg" disabled={loading} icon={loading ? 'refresh' : undefined} iconRight={!loading ? 'arrowRight' : undefined}>
          {loading ? 'Sending...' : 'Send reset link'}
        </Button>
      </div>
    </form>
  );
}

function passwordStrength(password: string) {
  if (!password) return { score: 0, label: '', color: 'var(--border-1)', pct: 0 };
  const len = password.length;
  const hasUpper   = /[A-Z]/.test(password);
  const hasLower   = /[a-z]/.test(password);
  const hasDigit   = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const variety = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
  if (len < 8 || variety < 2) return { score: 1, label: 'Too weak',   color: '#EF4444', pct: 20 };
  if (len < 10 || variety < 3) return { score: 2, label: 'Weak',      color: '#F97316', pct: 40 };
  if (len < 12 || variety < 3) return { score: 3, label: 'Fair',      color: '#EAB308', pct: 60 };
  if (len < 14 || variety < 4) return { score: 4, label: 'Strong',    color: '#3B82F6', pct: 80 };
  return                              { score: 5, label: 'Very strong', color: '#22C55E', pct: 100 };
}

function RegisterForm({ onNext, onSwitch }: { onNext: (draft: RegisterDraft) => void; onSwitch: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const strength = passwordStrength(password);
  const handleGoogleError = (message: string) => { setError(message); };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (strength.score < 2) {
      setError('Password is too weak. Use at least 8 characters with a mix of letters, numbers, or symbols.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agree) {
      setError('Please accept the terms to continue.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await authApi.checkEmail(email.trim());
      // 204 = available; proceed to profile setup
      onNext({ email: email.trim(), password, confirmPassword });
    } catch (requestError) {
      const message = requestError instanceof ApiError
        ? requestError.message
        : 'Unable to check email. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <h2 className="font-display" style={{ fontSize:28, fontWeight:600 }}>Create your account.</h2>
      <p style={{ marginTop:6 }}>Takes about 30 seconds. No credit card required.</p>
      <div className="col" style={{ marginTop:24, gap:14 }}>
        <Field label="Email">
          <input className="input input-lg" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@somewhere.com" autoComplete="email" />
        </Field>
        <Field label="Password">
          <input type="password" className="input input-lg" value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
          <div className="row" style={{ marginTop:8, gap:8 }}>
            <div className="bar" style={{ flex:1, height:4 }}><div className="bar__fill" style={{ width:`${strength.pct}%`, background:strength.color, transition:'width 0.2s, background 0.2s' }} /></div>
            {strength.label && <span className="mono" style={{ fontSize:11, color:strength.color }}>{strength.label}</span>}
          </div>
        </Field>
        <Field label="Confirm password">
          <input type="password" className="input input-lg" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" />
        </Field>
        {error && <div className="row" style={{ color:'var(--danger)', fontSize:12, gap:6 }}><Icon name="x" size={14} /> {error}</div>}
        <label className="row" style={{ gap:8, fontSize:12.5, color:'var(--text-md)', cursor:'pointer' }}>
          <input type="checkbox" checked={agree} onChange={event => setAgree(event.target.checked)} style={{ accentColor:'var(--red-500)' }} />
          <span>I agree to the Terms and Privacy Policy.</span>
        </label>
        <Button type="submit" size="lg" disabled={!agree || loading} icon={loading ? 'refresh' : undefined} iconRight={!loading ? 'arrowRight' : undefined}>
          {loading ? 'Checking...' : 'Continue'}
        </Button>
      </div>
      <Divider label="or continue with" />
      <div className="grid" style={{ gap:10 }}>
        <GoogleOAuthButton onError={handleGoogleError} />
      </div>
      <p style={{ marginTop:24, fontSize:13, textAlign:'center', color:'var(--text-lo)' }}>
        Already playing? <button type="button" onClick={onSwitch} style={{ border:0, background:'none', color:'var(--red-400)', cursor:'pointer' }}>Sign in -&gt;</button>
      </p>
    </form>
  );
}

function ProfileSetup({ draft, onDone: _onDone }: { draft: RegisterDraft; onDone: (email: string) => void }) {
  void _onDone;
  const { register } = useAuth();
  const { push } = useToast();
  const [username, setUsername] = useState('');
  const [color, setColor] = useState('#F0394B');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const captchaRef = useRef<RecaptchaCheckboxHandle>(null);
  const glyph = username.split(/[_\-\s]/).map(part => part[0]?.toUpperCase()).filter(Boolean).slice(0, 2).join('') || '??';
  const palette = ['#F0394B','#38BDF8','#A78BFA','#34D399','#F59E0B','#F472B6','#22D3EE','#FB7185'];

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
      setError('Use 3-30 letters, numbers, underscores, or hyphens.');
      return;
    }
    if (!captchaToken) {
      setError('Please complete the CAPTCHA check.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await register({ username: username.trim(), ...draft, captchaToken });
      push({ kind:'success', title:'Account created!', body:'Check your email to verify your address.' });
      // AuthPage.useEffect detects 'unverified' status and redirects to /verify-email.
    } catch (requestError) {
      const message = errorText(requestError);
      setError(message);
      push({ title:'Could not create account', body:message, icon:'x' });
      captchaRef.current?.reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="row" style={{ gap:10, marginBottom:18 }}>
        <span className="chip chip--mono">Step 2 / 2</span>
        <span style={{ color:'var(--text-lo)', fontSize:12 }}>Just one more step</span>
      </div>
      <h2 className="font-display" style={{ fontSize:28, fontWeight:600 }}>Pick a player tag.</h2>
      <p style={{ marginTop:6 }}>This is how friends will find you in lobbies.</p>
      <div className="row" style={{ gap:18, marginTop:28, alignItems:'flex-end' }}>
        <Avatar user={{ initials:glyph, color }} size="xl" />
        <div style={{ flex:1 }}>
          <Field label="Username">
            <input className={`input input-lg ${error ? 'input--error' : ''}`} value={username} onChange={event => setUsername(event.target.value)} placeholder="your_player_tag" autoComplete="username" />
            <div className="mono" style={{ fontSize:11, color:'var(--text-lo)', marginTop:6 }}>simple.gg/u/{username || 'your_player_tag'}</div>
          </Field>
        </div>
      </div>
      <div style={{ marginTop:20 }}>
        <div className="uppercase-label" style={{ marginBottom:8 }}>Avatar preview color</div>
        <div className="row" style={{ gap:8, flexWrap:'wrap' }}>
          {palette.map(option => (
            <button key={option} type="button" onClick={() => setColor(option)} aria-label={`Color ${option}`} style={{ width:30, height:30, borderRadius:999, background:`radial-gradient(circle at 30% 25%, rgba(255,255,255,0.35), transparent 60%), ${option}`, border: color === option ? '2px solid #fff' : '2px solid transparent', boxShadow: color === option ? `0 0 0 2px var(--bg-0), 0 0 0 4px ${option}` : 'none', cursor:'pointer' }} />
          ))}
        </div>
      </div>
      <div style={{ marginTop:20 }}>
        <RecaptchaCheckbox ref={captchaRef} onChange={setCaptchaToken} />
      </div>
      {error && <div className="row" style={{ color:'var(--danger)', fontSize:12, gap:6, marginTop:18 }}><Icon name="x" size={14} /> {error}</div>}
      <div style={{ marginTop:30 }}>
        <Button type="submit" size="lg" disabled={loading} icon={loading ? 'refresh' : undefined} iconRight={!loading ? 'arrowRight' : undefined}>
          {loading ? 'Creating account...' : 'Enter SimPle'}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label:string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label style={{ display:'block' }}>
      <div className="row between" style={{ marginBottom:6 }}>
        <span className="label">{label}</span>
        {hint}
      </div>
      {children}
    </label>
  );
}

function Divider({ label }: { label:string }) {
  return (
    <div className="row" style={{ gap:10, margin:'22px 0' }}>
      <hr className="hr grow" />
      <span className="uppercase-label" style={{ color:'var(--text-dim)' }}>{label}</span>
      <hr className="hr grow" />
    </div>
  );
}
