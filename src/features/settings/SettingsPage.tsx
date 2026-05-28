'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icons';
import { Toggle } from '@/components/ui/Toggle';
import { useToast } from '@/components/ui/Toast';
import { accountApi, type Session } from '@/features/auth/accountApi';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/features/auth/AuthProvider';
import { profileApi, type UserProfile } from '@/features/profile/profileApi';

const SECTIONS = [
  { id: 'account', label: 'Account',       icon: 'user' },
  { id: 'theme',   label: 'Theme',          icon: 'sparkle' },
  { id: 'notify',  label: 'Notifications',  icon: 'bell' },
  { id: 'privacy', label: 'Privacy',        icon: 'shield' },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

export function SettingsPage() {
  const [tab, setTab] = useState<SectionId>('account');

  return (
    <div className="page">
      <div>
        <div className="page-title">Settings</div>
        <div className="page-sub">Account, gameplay, notifications and more.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, marginTop: 22 }}>
        <aside className="card" style={{ padding: 8, height: 'fit-content' }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setTab(s.id)}
              className="row"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                background: tab === s.id ? 'var(--bg-tint)' : 'transparent',
                color: tab === s.id ? 'var(--text-hi)' : 'var(--text-md)',
                fontSize: 13.5, fontWeight: 500, gap: 10,
              }}
            >
              <Icon name={s.icon} size={15} />
              <span>{s.label}</span>
              {tab === s.id && <Icon name="chevronRight" size={13} style={{ marginLeft: 'auto', color: 'var(--red-400)' }} />}
            </button>
          ))}
        </aside>

        <div>
          {tab === 'account' && <AccountSettings />}
          {tab === 'theme'   && <ThemeSettings />}
          {tab === 'notify'  && <NotifySettings />}
          {tab === 'privacy' && <PrivacySettings />}
        </div>
      </div>
    </div>
  );
}

function SettingCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 22, marginBottom: 18 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>{title}</div>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function SettingRow({ label, hint, right }: { label: string; hint?: string; right: React.ReactNode }) {
  return (
    <div className="row between" style={{ padding: '12px 0', borderTop: '1px solid var(--border-1)' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--text-lo)', marginTop: 2 }}>{hint}</div>}
      </div>
      <div>{right}</div>
    </div>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{ display: 'block', ...style }}>
      <div style={{ fontSize: 12, color: 'var(--text-md)', fontWeight: 500, marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}

function AccountSettings() {
  const toast = useToast();
  const { user, logout } = useAuth();

  // ── Profile card (Module 2) ───────────────────────────────────────────────
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileForm, setProfileForm] = useState({ displayName: '', bio: '' });
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    profileApi.getMe().then(p => {
      setProfile(p);
      setProfileForm({ displayName: p.displayName, bio: p.bio ?? '' });
    }).catch(() => {/* non-fatal during initial load */});
  }, []);

  // ── Change password ───────────────────────────────────────────────────────
  const [showChangePw, setShowChangePw] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async () => {
    if (pwForm.next !== pwForm.confirm) {
      toast.push({ kind: 'default', title: 'Passwords do not match' });
      return;
    }
    setPwLoading(true);
    try {
      await accountApi.changePassword(pwForm.current, pwForm.next, pwForm.confirm);
      toast.push({ kind: 'success', title: 'Password updated', body: 'You have been signed out of all sessions.' });
      setShowChangePw(false);
      setPwForm({ current: '', next: '', confirm: '' });
      await logout();
    } catch (e) {
      toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not update password.' });
    } finally {
      setPwLoading(false);
    }
  };

  // ── Change email ──────────────────────────────────────────────────────────
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const handleChangeEmail = async () => {
    setEmailLoading(true);
    try {
      await accountApi.changeEmail(newEmail);
      toast.push({ kind: 'success', title: 'Verification sent', body: 'Check your new email for the confirmation link.' });
      setShowChangeEmail(false);
      setNewEmail('');
    } catch (e) {
      toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not request email change.' });
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Sessions ──────────────────────────────────────────────────────────────
  const [showSessions, setShowSessions] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await accountApi.getSessions();
      setSessions(data);
    } catch {
      toast.push({ kind: 'default', title: 'Could not load sessions.' });
    } finally {
      setSessionsLoading(false);
    }
  }, [toast]);

  // Load sessions when the panel opens, not via useEffect to avoid the
  // set-state-in-effect lint warning. Called directly from the button handler.
  const handleToggleSessions = () => {
    if (!showSessions) loadSessions();
    setShowSessions(v => !v);
  };

  const handleRevokeSession = async (id: string) => {
    try {
      await accountApi.revokeSession(id);
      setSessions(s => s.filter(x => x.id !== id));
      toast.push({ kind: 'success', title: 'Session revoked.' });
    } catch (e) {
      toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not revoke session.' });
    }
  };

  // ── Delete account ────────────────────────────────────────────────────────
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await accountApi.deleteAccount(deletePassword);
      toast.push({ kind: 'success', title: 'Account deleted.' });
      await logout();
    } catch (e) {
      toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not delete account.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <SettingCard title="Profile" sub="Public info shown to other players.">
        {profile ? (
          <>
            <div className="row" style={{ gap: 18 }}>
              <Avatar user={{ initials: profile.initials, color: profile.color, status: 'online' }} size="xl" />
              <div className="col" style={{ flex: 1, gap: 10 }}>
                <Field label="Display name">
                  <input className="input" value={profileForm.displayName}
                    onChange={e => setProfileForm(f => ({ ...f, displayName: e.target.value }))} />
                </Field>
                <Field label="Username (handle)">
                  <input className="input" defaultValue={profile.username} disabled
                    style={{ opacity: 0.6 }} title="Change username via profile page" />
                </Field>
              </div>
            </div>
            <Field label="Bio" style={{ marginTop: 12 }}>
              <textarea className="input" value={profileForm.bio}
                onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                style={{ minHeight: 80, padding: 12, width: '100%' }} />
            </Field>
            <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="ghost" onClick={() => setProfileForm({ displayName: profile.displayName, bio: profile.bio ?? '' })}>
                Cancel
              </Button>
              <Button disabled={profileSaving} onClick={async () => {
                setProfileSaving(true);
                try {
                  const updated = await profileApi.updateMe({
                    displayName: profileForm.displayName,
                    bio: profileForm.bio || null,
                    avatarUrl: profile.avatarUrl,
                    bannerUrl: profile.bannerUrl,
                    region: profile.region,
                    statusMessage: profile.statusMessage,
                    visibility: profile.visibility,
                  });
                  setProfile(updated);
                  toast.push({ kind: 'success', title: 'Profile saved.', body: 'Your changes are live.' });
                } catch (e) {
                  toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not save profile.' });
                } finally {
                  setProfileSaving(false);
                }
              }}>
                {profileSaving ? '…' : 'Save changes'}
              </Button>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-lo)', padding: '8px 0' }}>Loading…</div>
        )}
      </SettingCard>

      <SettingCard title="Login & security">
        <SettingRow
          label="Email"
          hint={user ? `${user.email} · ${user.isEmailVerified ? 'verified' : 'unverified'}` : '—'}
          right={
            showChangeEmail ? (
              <div className="row" style={{ gap: 6 }}>
                <input
                  className="input"
                  placeholder="New email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  style={{ width: 180 }}
                />
                <Button size="sm" onClick={handleChangeEmail} disabled={emailLoading || !newEmail}>
                  {emailLoading ? '…' : 'Send link'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowChangeEmail(false)}>Cancel</Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setShowChangeEmail(true)}>Change</Button>
            )
          }
        />

        <SettingRow
          label="Password"
          hint="Change your sign-in password"
          right={
            showChangePw ? (
              <div className="col" style={{ gap: 6, alignItems: 'flex-end' }}>
                <input className="input" type="password" placeholder="Current password"
                  value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} style={{ width: 220 }} />
                <input className="input" type="password" placeholder="New password"
                  value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} style={{ width: 220 }} />
                <input className="input" type="password" placeholder="Confirm new password"
                  value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} style={{ width: 220 }} />
                <div className="row" style={{ gap: 6 }}>
                  <Button size="sm" onClick={handleChangePassword} disabled={pwLoading || !pwForm.current || !pwForm.next}>
                    {pwLoading ? '…' : 'Update'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowChangePw(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setShowChangePw(true)}>Update</Button>
            )
          }
        />

        <SettingRow
          label="Active sessions"
          hint={sessions.length > 0 ? `${sessions.length} active session${sessions.length > 1 ? 's' : ''}` : 'Sign-in devices'}
          right={
            showSessions ? (
              <Button size="sm" variant="ghost" onClick={handleToggleSessions}>Hide</Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={handleToggleSessions}>View</Button>
            )
          }
        />

        {showSessions && (
          <div style={{ marginTop: 8 }}>
            {sessionsLoading && <div style={{ fontSize: 12, color: 'var(--text-lo)' }}>Loading…</div>}
            {!sessionsLoading && sessions.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-lo)' }}>No active sessions found.</div>
            )}
            {sessions.map(s => (
              <div key={s.id} className="row between" style={{ padding: '8px 0', borderTop: '1px solid var(--border-1)', fontSize: 12 }}>
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {s.ipAddress}{s.isCurrent && <span className="chip chip--red chip--mono" style={{ marginLeft: 6, fontSize: 10 }}>current</span>}
                  </div>
                  <div style={{ color: 'var(--text-lo)', marginTop: 2 }}>{s.userAgent ?? 'Unknown device'}</div>
                </div>
                {!s.isCurrent && (
                  <Button size="sm" variant="ghost" onClick={() => handleRevokeSession(s.id)}
                    style={{ color: 'var(--danger)', fontSize: 11 }}>Revoke</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </SettingCard>

      <SettingCard title="Danger zone">
        <SettingRow
          label="Delete account"
          hint="Permanently removes profile and history"
          right={
            showDelete ? (
              <div className="row" style={{ gap: 6 }}>
                <input
                  className="input"
                  type="password"
                  placeholder="Confirm password"
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  style={{ width: 180 }}
                />
                <Button size="sm" onClick={handleDeleteAccount}
                  disabled={deleteLoading || !deletePassword}
                  style={{ background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff' }}>
                  {deleteLoading ? '…' : 'Delete'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowDelete(false)}>Cancel</Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" icon="trash" style={{ color: 'var(--danger)' }}
                onClick={() => setShowDelete(true)}>Delete</Button>
            )
          }
        />
      </SettingCard>
    </>
  );
}

function ThemeSettings() {
  const [theme, setTheme] = useState('midnight');
  const [accent, setAccent] = useState('#F0394B');
  const [density, setDensity] = useState('Default');
  const themes = [
    { id: 'midnight', name: 'Midnight', a: '#0A0E18', b: '#161C2E' },
    { id: 'obsidian', name: 'Obsidian', a: '#070B14', b: '#10162A' },
    { id: 'slate',    name: 'Slate',    a: '#0F172A', b: '#1E293B' },
  ];
  return (
    <>
      <SettingCard title="Appearance" sub="Dark-first. Light coming later.">
        <div className="grid grid-3">
          {themes.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className="surface"
              style={{
                padding: 14, textAlign: 'left', cursor: 'pointer',
                border: theme === t.id ? '1px solid rgba(240,57,75,0.4)' : undefined,
                background: theme === t.id ? 'var(--red-soft)' : undefined,
              }}
            >
              <div style={{ height: 60, borderRadius: 8, background: `linear-gradient(180deg, ${t.a}, ${t.b})`, border: '1px solid var(--border-2)' }} />
              <div className="row between" style={{ marginTop: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</span>
                {theme === t.id && <span className="chip chip--red chip--mono"><Icon name="check" size={11} />Active</span>}
              </div>
            </button>
          ))}
        </div>
      </SettingCard>

      <SettingCard title="Accent color">
        <div className="row" style={{ gap: 10 }}>
          {['#F0394B', '#38BDF8', '#A78BFA', '#34D399', '#F59E0B', '#F472B6'].map(c => (
            <button
              key={c}
              onClick={() => setAccent(c)}
              aria-label={c}
              style={{
                width: 34, height: 34, borderRadius: 999, background: c, cursor: 'pointer',
                border: accent === c ? '2px solid #fff' : '2px solid transparent',
                boxShadow: accent === c ? `0 0 0 2px var(--bg-0), 0 0 0 4px ${c}` : 'none',
              }}
            />
          ))}
        </div>
      </SettingCard>

      <SettingCard title="Density">
        <SettingRow label="UI density" hint="Compact saves space, comfortable feels premium." right={
          <div className="tabs">
            {['Compact', 'Default', 'Comfortable'].map(d => (
              <button key={d} className={`tab ${d === density ? 'tab--active' : ''}`} onClick={() => setDensity(d)}>{d}</button>
            ))}
          </div>
        } />
      </SettingCard>
    </>
  );
}

function NotifySettings() {
  const [states, setStates] = useState({ lobby: true, friend: true, dm: true, result: false, season: true, digest: false });
  const toggle = (k: keyof typeof states) => setStates(s => ({ ...s, [k]: !s[k] }));
  return (
    <SettingCard title="Notifications" sub="Choose where and when SimPle reaches out.">
      <SettingRow label="Lobby invites" hint="In-app · email" right={<Toggle on={states.lobby} onChange={() => toggle('lobby')} label="" />} />
      <SettingRow label="Friend requests" right={<Toggle on={states.friend} onChange={() => toggle('friend')} label="" />} />
      <SettingRow label="Direct messages" hint="In-app only" right={<Toggle on={states.dm} onChange={() => toggle('dm')} label="" />} />
      <SettingRow label="Match results" hint="Win/loss summaries" right={<Toggle on={states.result} onChange={() => toggle('result')} label="" />} />
      <SettingRow label="Season announcements" right={<Toggle on={states.season} onChange={() => toggle('season')} label="" />} />
      <SettingRow label="Email digest" hint="Weekly · Sunday 19:00" right={<Toggle on={states.digest} onChange={() => toggle('digest')} label="" />} />
    </SettingCard>
  );
}

function PrivacySettings() {
  const [visibility, setVisibility] = useState('Friends');
  const [onlineStatus, setOnlineStatus] = useState(true);
  return (
    <SettingCard title="Privacy" sub="Control who sees you and what they see.">
      <SettingRow label="Profile visibility" right={
        <div className="tabs">
          {['Public', 'Friends', 'Private'].map(d => (
            <button key={d} className={`tab ${d === visibility ? 'tab--active' : ''}`} onClick={() => setVisibility(d)}>{d}</button>
          ))}
        </div>
      } />
      <SettingRow label="Show online status" hint="Friends always see you online" right={<Toggle on={onlineStatus} onChange={setOnlineStatus} label="" />} />
      <SettingRow label="Allow friend requests from" right={
        <div className="tabs">
          {['Anyone', 'Friends-of-friends', 'Off'].map(d => (
            <button key={d} className={`tab ${d === 'Friends-of-friends' ? 'tab--active' : ''}`}>{d}</button>
          ))}
        </div>
      } />
      <SettingRow label="Block list" hint="0 blocked players" right={<Button size="sm" variant="ghost">Manage</Button>} />
    </SettingCard>
  );
}


