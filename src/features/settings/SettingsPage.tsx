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
import { profileApi, type UserProfile, type UsernameChangeRequest } from '@/features/profile/profileApi';

const LINK_PLATFORMS = [
  { value: 'github',    label: 'GitHub' },
  { value: 'xtwitter',  label: 'X/Twitter' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'discord',   label: 'Discord' },
] as const;

const PLATFORM_HINTS: Record<string, string> = {
  github:    'github.com/handle or just the handle',
  xtwitter:  'x.com/handle or @handle',
  instagram: 'instagram.com/handle or @handle',
  discord:   'discord.gg/server, discord.com/... or @username',
};

const PLATFORM_ALLOWED_HOSTS: Record<string, string[]> = {
  github:    ['github.com', 'www.github.com'],
  xtwitter:  ['x.com', 'twitter.com', 'www.x.com', 'www.twitter.com'],
  instagram: ['instagram.com', 'www.instagram.com'],
  discord:   ['discord.gg', 'discord.com', 'www.discord.com'],
};

function validateLinkForPlatform(platform: string, value: string): string | null {
  if (!value.trim()) return 'Enter a handle or URL.';
  if (/^(javascript|data|file):/i.test(value)) return 'Unsafe scheme.';
  if (value.includes('://')) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== 'https:') return 'Use a valid HTTPS URL.';
      const allowed = PLATFORM_ALLOWED_HOSTS[platform] ?? [];
      if (allowed.length > 0 && !allowed.includes(parsed.hostname.toLowerCase()))
        return `URL must be on ${allowed[0]}.`;
    } catch {
      return 'Use a valid URL or just the handle.';
    }
  }
  return null;
}

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

  // â”€â”€ Profile card (Module 2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileForm, setProfileForm] = useState({ displayName: '', bio: '' });
  const [linkForm, setLinkForm] = useState<UserProfile['links']>([]);
  const [linkErrors, setLinkErrors] = useState<Record<number, string>>({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [linksSaving, setLinksSaving] = useState(false);
  const [usernameRequest, setUsernameRequest] = useState<UsernameChangeRequest | null>(null);
  const [showUsernameRequest, setShowUsernameRequest] = useState(false);
  const [requestedUsername, setRequestedUsername] = useState('');
  const [usernameRequestLoading, setUsernameRequestLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  // Local color state — preview only. Saved explicitly on blur or button press.
  const [localAvatarColor, setLocalAvatarColor] = useState<string | null>(null);
  const [localBannerColor, setLocalBannerColor] = useState<string | null>(null);

  useEffect(() => {
    profileApi.getMe().then(p => {
      setProfile(p);
      setProfileForm({ displayName: p.displayName, bio: p.bio ?? '' });
      setLinkForm(p.links);
      setLocalAvatarColor(p.color);
      setLocalBannerColor(p.bannerFallbackColor);
    }).catch(() => {/* non-fatal during initial load */});
    profileApi.getUsernameChangeRequest().then(r => setUsernameRequest(r)).catch(() => {});
  }, []);

  // â”€â”€ Change password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Change email â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Sessions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  const [revokeAllLoading, setRevokeAllLoading] = useState(false);
  const handleRevokeAllSessions = async () => {
    setRevokeAllLoading(true);
    try {
      await accountApi.revokeAllSessions();
      setSessions([]);
      toast.push({ kind: 'success', title: 'All other sessions signed out.' });
      await logout();
    } catch (e) {
      toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not sign out all sessions.' });
    } finally {
      setRevokeAllLoading(false);
    }
  };

  // â”€â”€ Delete account â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  const handleUsernameSubmit = async () => {
    if (!requestedUsername.trim()) return;
    setUsernameRequestLoading(true);
    try {
      const result = await profileApi.updateUsername(requestedUsername.trim());
      setUsernameRequest(result.request);
      setShowUsernameRequest(false);
      setRequestedUsername('');
      if (result.appliedImmediately) {
        const updated = await profileApi.getMe();
        setProfile(updated);
        toast.push({ kind: 'success', title: 'Username changed.', body: result.message });
      } else {
        toast.push({ kind: 'success', title: 'Request saved.', body: result.message });
      }
    } catch (e) {
      toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not update username.' });
    } finally {
      setUsernameRequestLoading(false);
    }
  };

  const handleUsernameRequestEdit = async () => {
    if (!requestedUsername.trim()) return;
    setUsernameRequestLoading(true);
    try {
      const request = await profileApi.editUsernameChangeRequest(requestedUsername.trim());
      setUsernameRequest(request);
      setShowUsernameRequest(false);
      setRequestedUsername('');
      toast.push({ kind: 'success', title: 'Request updated.' });
    } catch (e) {
      toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not update request.' });
    } finally {
      setUsernameRequestLoading(false);
    }
  };

  const handleUsernameRequestCancel = async () => {
    setUsernameRequestLoading(true);
    try {
      const request = await profileApi.cancelUsernameChangeRequest();
      setUsernameRequest(request);
      setShowUsernameRequest(false);
      toast.push({ kind: 'success', title: 'Request cancelled.', body: 'This month\'s admin-request allowance remains used.' });
    } catch (e) {
      toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not cancel request.' });
    } finally {
      setUsernameRequestLoading(false);
    }
  };

  return (
    <>
      <SettingCard title="Profile" sub="Public info shown to other players.">
        {profile ? (
          <>
            <div className="row" style={{ gap: 18 }}>
              <div style={{ position: 'relative', cursor: 'pointer' }} title="Click to upload a new avatar">
                <Avatar user={{ initials: profile.initials, color: localAvatarColor ?? profile.color, status: 'online' }} src={profile.avatarUrl} size="xl" />
                <label style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', opacity: avatarUploading ? 1 : 0,
                  transition: 'opacity 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => !avatarUploading && (e.currentTarget.style.opacity = '0')}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setAvatarUploading(true);
                      try {
                        const updated = await profileApi.uploadAvatar(file);
                        setProfile(updated);
                        toast.push({ kind: 'success', title: 'Avatar updated.' });
                      } catch (err) {
                        toast.push({ kind: 'default', title: err instanceof Error ? err.message : 'Upload failed.' });
                      } finally {
                        setAvatarUploading(false);
                        e.target.value = '';
                      }
                    }} />
                  <Icon name={avatarUploading ? 'refresh' : 'edit'} size={16} style={{ color: '#fff' }} />
                </label>
              </div>
              <div className="col" style={{ gap: 6, minWidth: 150 }}>
                {profile.hasUploadedAvatar ? (
                  <Button size="sm" variant="ghost" icon="trash" onClick={async () => {
                    setAvatarUploading(true);
                    try {
                      const updated = await profileApi.removeAvatar();
                      setProfile(updated);
                      toast.push({ kind: 'success', title: 'Avatar removed.' });
                    } catch (e) {
                      toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not remove avatar.' });
                    } finally {
                      setAvatarUploading(false);
                    }
                  }}>
                    Remove avatar
                  </Button>
                ) : (
                  <div className="col" style={{ gap: 6 }}>
                    <label className="row" style={{ gap: 8, fontSize: 12, color: 'var(--text-md)' }}>
                      <input
                        type="color"
                        value={localAvatarColor ?? profile.color}
                        onChange={e => setLocalAvatarColor(e.target.value)}
                        onBlur={async e => {
                          const color = e.target.value;
                          if (color === profile.color) return;
                          setAvatarUploading(true);
                          try {
                            const updated = await profileApi.updateAvatarFallback(color);
                            setProfile(updated);
                            setLocalAvatarColor(updated.color);
                            toast.push({ kind: 'success', title: 'Avatar color saved.' });
                          } catch (err) {
                            setLocalAvatarColor(profile.color);
                            toast.push({ kind: 'default', title: err instanceof ApiError ? err.message : 'Could not update avatar color.' });
                          } finally {
                            setAvatarUploading(false);
                          }
                        }}
                      />
                      Default avatar color
                    </label>
                    <div style={{ fontSize: 11, color: 'var(--text-lo)' }}>Close the picker to save.</div>
                  </div>
                )}
              </div>
              <div className="col" style={{ flex: 1, gap: 10 }}>
                <div style={{
                  minHeight: 72, borderRadius: 8, border: '1px solid var(--border-1)',
                  background: profile.bannerUrl ? `url(${profile.bannerUrl}) center/cover` : `linear-gradient(135deg, ${localBannerColor ?? profile.bannerFallbackColor} 0%, #1B2238 55%, #0B0F18 100%)`,
                  position: 'relative', overflow: 'hidden'
                }}>
                  <label style={{ position: 'absolute', top: 8, right: 8 }}>
                    <input type="file" accept="image/jpeg,image/png,image/webp" hidden
                      onChange={async e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setBannerUploading(true);
                        try {
                          const updated = await profileApi.uploadBanner(file);
                          setProfile(updated);
                          toast.push({ kind: 'success', title: 'Cover updated.' });
                        } catch (err) {
                          toast.push({ kind: 'default', title: err instanceof Error ? err.message : 'Upload failed.' });
                        } finally {
                          setBannerUploading(false);
                          e.target.value = '';
                        }
                      }} />
                    <Button size="sm" variant="ghost" icon={bannerUploading ? 'refresh' : 'more'}>
                      {profile.hasUploadedBanner ? 'Change cover' : 'Upload cover'}
                    </Button>
                  </label>
                  {profile.hasUploadedBanner && (
                    <div style={{ position: 'absolute', right: 8, bottom: 8 }}>
                      <Button size="sm" variant="ghost" icon="trash" onClick={async () => {
                        setBannerUploading(true);
                        try {
                          const updated = await profileApi.removeBanner();
                          setProfile(updated);
                          toast.push({ kind: 'success', title: 'Cover removed.' });
                        } catch (e) {
                          toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not remove cover.' });
                        } finally {
                          setBannerUploading(false);
                        }
                      }}>
                        Remove
                      </Button>
                    </div>
                  )}
                  {!profile.hasUploadedBanner && (
                    <label className="row" style={{ position: 'absolute', right: 8, bottom: 8, gap: 8, fontSize: 12, color: 'var(--text-md)' }}>
                      <input
                        type="color"
                        value={localBannerColor ?? profile.bannerFallbackColor}
                        onChange={e => setLocalBannerColor(e.target.value)}
                        onBlur={async e => {
                          const color = e.target.value;
                          if (color === profile.bannerFallbackColor) return;
                          setBannerUploading(true);
                          try {
                            const updated = await profileApi.updateBannerFallback(color);
                            setProfile(updated);
                            setLocalBannerColor(updated.bannerFallbackColor);
                            toast.push({ kind: 'success', title: 'Cover color saved.' });
                          } catch (err) {
                            setLocalBannerColor(profile.bannerFallbackColor);
                            toast.push({ kind: 'default', title: err instanceof ApiError ? err.message : 'Could not update cover color.' });
                          } finally {
                            setBannerUploading(false);
                          }
                        }}
                      />
                      Default cover color
                    </label>
                  )}
                </div>
                <Field label="Display name">
                  <input className="input" value={profileForm.displayName}
                    onChange={e => setProfileForm(f => ({ ...f, displayName: e.target.value }))} />
                </Field>
                <Field label="Username (handle)">
                  <div>
                    <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                      <span className="mono" style={{ fontSize: 13, color: 'var(--text-md)' }}>@{profile.username}</span>
                      <Button size="sm" variant="ghost" style={{ fontSize: 11 }}
                        onClick={() => {
                          setRequestedUsername(usernameRequest?.status === 'Pending' ? usernameRequest.requestedUsername : '');
                          setShowUsernameRequest(v => !v);
                        }}>
                        {usernameRequest?.status === 'Pending' ? 'Edit request' : 'Change username'}
                      </Button>
                      {usernameRequest && (
                        <span className="chip chip--mono" style={{ fontSize: 10 }}>{usernameRequest.status}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-lo)', marginTop: 4 }}>
                      You have 1 username change per month. If it is already used, a request is saved for admin review.
                    </div>
                    {usernameRequest && (
                      <div style={{ fontSize: 11, color: usernameRequest.status === 'Rejected' ? 'var(--danger)' : 'var(--text-lo)', marginTop: 4 }}>
                        Requested username: <span className="mono">{usernameRequest.requestedUsername}</span>
                        {usernameRequest.rejectionReason ? ` · ${usernameRequest.rejectionReason}` : ''}
                        {usernameRequest.status === 'Cancelled' ? ' · Canceling does not restore this month\'s request allowance.' : ''}
                      </div>
                    )}
                    {showUsernameRequest && (
                      <div className="row" style={{ gap: 6, marginTop: 8 }}>
                        <input className="input" placeholder="New username"
                          value={requestedUsername} onChange={e => setRequestedUsername(e.target.value)}
                          style={{ flex: 1 }} />
                        <Button size="sm" disabled={usernameRequestLoading || !requestedUsername} onClick={() => {
                          if (usernameRequest?.status === 'Pending') void handleUsernameRequestEdit();
                          else void handleUsernameSubmit();
                        }}>
                          {usernameRequestLoading ? '...' : 'Submit'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowUsernameRequest(false)}>Cancel</Button>
                      </div>
                    )}
                    {usernameRequest?.canCancel && (
                      <Button size="sm" variant="ghost" style={{ marginTop: 8, fontSize: 11 }} disabled={usernameRequestLoading} onClick={() => void handleUsernameRequestCancel()}>
                        Cancel request
                      </Button>
                    )}
                  </div>
                </Field>
              </div>
            </div>
            <Field label="Bio" style={{ marginTop: 12 }}>
              <textarea className="input" value={profileForm.bio}
                onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                style={{ minHeight: 80, padding: 12, width: '100%' }} />
            </Field>
            <Field label="Profile visibility" style={{ marginTop: 12 }}>
              <select className="input" value={profile.visibility} onChange={async e => {
                const visibility = e.target.value as UserProfile['visibility'];
                try {
                  const updated = await profileApi.updateMe({
                    displayName: profile.displayName,
                    bio: profile.bio,
                    avatarUrl: profile.avatarUrl,
                    bannerUrl: profile.bannerUrl,
                    region: profile.region,
                    statusMessage: profile.statusMessage,
                    visibility,
                    profileType: profile.profileType,
                  });
                  setProfile(updated);
                  toast.push({ kind: 'success', title: 'Visibility updated.' });
                } catch (err) {
                  toast.push({ kind: 'default', title: err instanceof ApiError ? err.message : 'Could not update visibility.' });
                }
              }}>
                <option value="Public">Public</option>
                <option value="FriendsOnly">Friends-only</option>
                <option value="Private">Private</option>
              </select>
              {profile.visibility === 'FriendsOnly' && (
                <div style={{ fontSize: 12, color: 'var(--text-lo)', marginTop: 6 }}>
                  Friends-only visibility is saved now. Until the friends module is implemented, it behaves like private.
                </div>
              )}
            </Field>
            <Field label="Profile type" style={{ marginTop: 12 }}>
              <select className="input" value={profile.profileType} onChange={async e => {
                const profileType = e.target.value as UserProfile['profileType'];
                try {
                  const updated = await profileApi.updateMe({
                    displayName: profile.displayName,
                    bio: profile.bio,
                    avatarUrl: profile.avatarUrl,
                    bannerUrl: profile.bannerUrl,
                    region: profile.region,
                    statusMessage: profile.statusMessage,
                    visibility: profile.visibility,
                    profileType,
                  });
                  setProfile(updated);
                  toast.push({ kind: 'success', title: 'Profile type updated.' });
                } catch (err) {
                  toast.push({ kind: 'default', title: err instanceof ApiError ? err.message : 'Could not update profile type.' });
                }
              }}>
                <option value="Player">Player</option>
                <option value="Developer">Developer</option>
              </select>
              <div style={{ fontSize: 12, color: 'var(--text-lo)', marginTop: 6 }}>
                Developer marks your profile as a game publisher/developer profile. Publishing tools are planned for later modules.
              </div>
            </Field>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-1)' }}>
              <div className="row between" style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>Web profiles</div>
                <Button size="sm" variant="ghost" onClick={() => {
                  if (linkForm.length >= 5) {
                    toast.push({ kind: 'default', title: 'Maximum 5 links allowed.' });
                    return;
                  }
                  setLinkForm(links => [...links, { id: `new-${Date.now()}`, platform: 'github', url: '', displayLabel: null, sortOrder: links.length }]);
                }}>
                  Add link
                </Button>
              </div>
              <div className="col" style={{ gap: 8 }}>
                {linkForm.map((link, index) => (
                  <div key={link.id} className="col" style={{ gap: 4 }}>
                    <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                    <select className="input" aria-label="Link platform" value={link.platform}
                      onChange={e => {
                        const newPlatform = e.target.value;
                        setLinkForm(links => links.map((l, i) => i === index ? { ...l, platform: newPlatform, url: '' } : l));
                        setLinkErrors(errors => ({ ...errors, [index]: '' }));
                      }}
                      style={{ width: 130 }}>
                      {LINK_PLATFORMS.map(platform => (
                        <option key={platform.value} value={platform.value}>{platform.label}</option>
                      ))}
                    </select>
                    <input
                      className="input"
                      aria-label="Link URL or handle"
                      placeholder={PLATFORM_HINTS[link.platform] ?? 'Handle or URL'}
                      value={link.url}
                      onChange={e => {
                        setLinkErrors(errors => ({ ...errors, [index]: validateLinkForPlatform(link.platform, e.target.value) ?? '' }));
                        setLinkForm(links => links.map((l, i) => i === index ? { ...l, url: e.target.value } : l));
                      }}
                      style={{ flex: 1 }}
                    />
                    <input className="input" aria-label="Link label" placeholder="Label"
                      value={link.displayLabel ?? ''}
                      onChange={e => setLinkForm(links => links.map((l, i) => i === index ? { ...l, displayLabel: e.target.value || null } : l))}
                      style={{ width: 140 }} />
                    <Button size="sm" variant="ghost" icon="trash" onClick={() => setLinkForm(links => links.filter((_, i) => i !== index))}>
                      Remove
                    </Button>
                    </div>
                    {linkErrors[index] && (
                      <div style={{ fontSize: 11, color: 'var(--danger)', marginLeft: 138 }}>{linkErrors[index]}</div>
                    )}
                  </div>
                ))}
                {linkForm.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-lo)' }}>No web profiles linked.</div>
                )}
              </div>
              <div className="row" style={{ marginTop: 10, justifyContent: 'flex-end' }}>
                <Button size="sm" disabled={linksSaving} onClick={async () => {
                  const errors = Object.fromEntries(
                    linkForm
                      .map((link, index) => [index, validateLinkForPlatform(link.platform, link.url)] as const)
                      .filter(([, error]) => error)
                  ) as Record<number, string>;
                  setLinkErrors(errors);
                  if (Object.keys(errors).length > 0) {
                    toast.push({ kind: 'default', title: 'Fix link errors before saving.' });
                    return;
                  }
                  setLinksSaving(true);
                  try {
                    const updatedLinks = await profileApi.updateLinks({
                      links: linkForm.map((link, index) => ({
                        platform: link.platform,
                        url: link.url,
                        displayLabel: link.displayLabel,
                        sortOrder: index,
                      })),
                    });
                    setLinkForm(updatedLinks);
                    setProfile({ ...profile, links: updatedLinks });
                    toast.push({ kind: 'success', title: 'Web profiles updated.' });
                  } catch (e) {
                    toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not update web profiles.' });
                  } finally {
                    setLinksSaving(false);
                  }
                }}>
                  {linksSaving ? '...' : 'Save web profiles'}
                </Button>
              </div>
            </div>
            <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="ghost" onClick={() => {
                setProfileForm({ displayName: profile.displayName, bio: profile.bio ?? '' });
                setLinkForm(profile.links);
                setLinkErrors({});
              }}>
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
                    profileType: profile.profileType,
                  });
                  setProfile(updated);
                  toast.push({ kind: 'success', title: 'Profile saved.', body: 'Your changes are live.' });
                } catch (e) {
                  toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not save profile.' });
                } finally {
                  setProfileSaving(false);
                }
              }}>
                {profileSaving ? 'â€¦' : 'Save changes'}
              </Button>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-lo)', padding: '8px 0' }}>Loadingâ€¦</div>
        )}
      </SettingCard>

      <SettingCard title="Login & security">
        <SettingRow
          label="Email"
          hint={user ? `${user.email} Â· ${user.isEmailVerified ? 'verified' : 'unverified'}` : 'â€”'}
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
                  {emailLoading ? 'â€¦' : 'Send link'}
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
                    {pwLoading ? 'â€¦' : 'Update'}
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
            {sessionsLoading && <div style={{ fontSize: 12, color: 'var(--text-lo)' }}>Loadingâ€¦</div>}
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
            {sessions.filter(s => !s.isCurrent).length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-1)' }}>
                <Button size="sm" variant="ghost" onClick={handleRevokeAllSessions} disabled={revokeAllLoading}
                  style={{ color: 'var(--danger)', fontSize: 12 }}>
                  {revokeAllLoading ? 'â€¦' : 'Sign out all other devices'}
                </Button>
              </div>
            )}
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
                  {deleteLoading ? 'â€¦' : 'Delete'}
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
      <SettingRow label="Lobby invites" hint="In-app Â· email" right={<Toggle on={states.lobby} onChange={() => toggle('lobby')} label="" />} />
      <SettingRow label="Friend requests" right={<Toggle on={states.friend} onChange={() => toggle('friend')} label="" />} />
      <SettingRow label="Direct messages" hint="In-app only" right={<Toggle on={states.dm} onChange={() => toggle('dm')} label="" />} />
      <SettingRow label="Match results" hint="Win/loss summaries" right={<Toggle on={states.result} onChange={() => toggle('result')} label="" />} />
      <SettingRow label="Season announcements" right={<Toggle on={states.season} onChange={() => toggle('season')} label="" />} />
      <SettingRow label="Email digest" hint="Weekly Â· Sunday 19:00" right={<Toggle on={states.digest} onChange={() => toggle('digest')} label="" />} />
    </SettingCard>
  );
}

function PrivacySettings() {
  const toast = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [onlineStatus, setOnlineStatus] = useState(true);
  useEffect(() => {
    profileApi.getMe().then(setProfile).catch(() => {});
  }, []);

  const setVisibility = async (visibility: UserProfile['visibility']) => {
    if (!profile) return;
    try {
      const updated = await profileApi.updateMe({
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        bannerUrl: profile.bannerUrl,
        region: profile.region,
        statusMessage: profile.statusMessage,
        visibility,
        profileType: profile.profileType,
      });
      setProfile(updated);
      toast.push({ kind: 'success', title: 'Visibility updated.' });
    } catch (e) {
      toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not update visibility.' });
    }
  };

  return (
    <SettingCard title="Privacy" sub="Control who sees you and what they see.">
      <SettingRow label="Profile visibility" right={
        <div className="tabs">
          <button className={`tab ${profile?.visibility === 'Public' ? 'tab--active' : ''}`} onClick={() => void setVisibility('Public')}>Public</button>
          <button className={`tab ${profile?.visibility === 'FriendsOnly' ? 'tab--active' : ''}`} onClick={() => void setVisibility('FriendsOnly')}>Friends-only</button>
          <button className={`tab ${profile?.visibility === 'Private' ? 'tab--active' : ''}`} onClick={() => void setVisibility('Private')}>Private</button>
        </div>
      } />
      {profile?.visibility === 'FriendsOnly' && (
        <div style={{ fontSize: 12, color: 'var(--text-lo)', padding: '0 0 10px' }}>
          Friends-only visibility is saved now. Until the friends module is implemented, it behaves like private.
        </div>
      )}
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


