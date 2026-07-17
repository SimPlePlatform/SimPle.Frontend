'use client';
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icons';
import { useTheme } from '@/lib/theme';
import { Toggle } from '@/components/ui/Toggle';
import { useToast } from '@/components/ui/Toast';
import { accountApi, type Session } from '@/features/auth/accountApi';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/features/auth/AuthProvider';
import { toUserStatus } from '@/features/realtime/presence';
import { usePresence } from '@/features/realtime/RealtimeConnectionProvider';
import { profileApi, type UserProfile, type UsernameChangeRequest } from '@/features/profile/profileApi';
import { friendsApi } from '@/features/friends/friendsApi';
import { friendsErrorMessage } from '@/features/friends/friendsErrors';
import type { BlockDto, SearchVisibility, FriendsListVisibility } from '@/features/friends/types';

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

      {/* Mobile: horizontal scroll pills; Desktop: side nav */}
      <div className="settings-pills scroll-pills" style={{ marginTop: 16, gap: 8 }}>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setTab(s.id)}
            className={`tab${tab === s.id ? ' tab--active' : ''}`}
            style={{ gap: 6, padding: '8px 14px', minHeight: 40 }}
          >
            <Icon name={s.icon} size={14} />{s.label}
          </button>
        ))}
      </div>

      <div className="settings-layout" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, marginTop: 22 }}>
        <aside className="card settings-sidenav" style={{ padding: 8, height: 'fit-content' }}>
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
  const presence = usePresence(user?.id);

  // â”€â”€ Profile card (Module 2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileForm, setProfileForm] = useState({ displayName: '', bio: '', visibility: 'Public' as UserProfile['visibility'], profileType: 'Player' as UserProfile['profileType'] });
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
  // Local color state — preview while picking. Saved with the main Save button.
  const [localAvatarColor, setLocalAvatarColor] = useState<string | null>(null);
  const [localBannerColor, setLocalBannerColor] = useState<string | null>(null);
  // Warn when Save Changes is clicked while there are unsaved link edits.
  const [linksConflict, setLinksConflict] = useState(false);
  // Sessions state declared here so useEffect below can reference setSessions.
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  useEffect(() => {
    profileApi.getMe().then(p => {
      setProfile(p);
      setProfileForm({ displayName: p.displayName, bio: p.bio ?? '', visibility: p.visibility, profileType: p.profileType });
      setLinkForm(p.links);
      setLocalAvatarColor(p.color);
      setLocalBannerColor(p.bannerFallbackColor);
    }).catch(() => {/* non-fatal during initial load */});
    profileApi.getUsernameChangeRequest().then(r => setUsernameRequest(r)).catch(() => {});
    accountApi.getSessions().then(setSessions).catch(() => {});
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

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const data = await accountApi.getSessions();
      setSessions(data);
    } catch {
      toast.push({ kind: 'default', title: 'Could not load sessions.' });
    } finally {
      setSessionsLoading(false);
    }
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
                <Avatar user={{ initials: profile.initials, color: localAvatarColor ?? profile.color, status: presence ? toUserStatus(presence.status) : undefined }} src={profile.avatarUrl} size="xl" />
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
                  <label className="row" style={{ gap: 8, fontSize: 12, color: 'var(--text-md)' }}>
                    <input
                      type="color"
                      value={localAvatarColor ?? profile.color}
                      onChange={e => setLocalAvatarColor(e.target.value)}
                    />
                    Default avatar color
                  </label>
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
              <select className="input" value={profileForm.visibility}
                onChange={e => setProfileForm(f => ({ ...f, visibility: e.target.value as UserProfile['visibility'] }))}>
                <option value="Public">Public</option>
                <option value="FriendsOnly">Friends-only</option>
                <option value="Private">Private</option>
              </select>
            </Field>
            <Field label="Profile type" style={{ marginTop: 12 }}>
              <select className="input" value={profileForm.profileType}
                onChange={e => setProfileForm(f => ({ ...f, profileType: e.target.value as UserProfile['profileType'] }))}>
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
              <div className="row" style={{ marginTop: 10, justifyContent: 'flex-end', gap: 8 }}>
                <Button size="sm" variant="ghost" onClick={() => {
                  setLinkForm(profile.links);
                  setLinkErrors({});
                  setLinksConflict(false);
                }}>
                  Revert
                </Button>
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
                    setLinksConflict(false);
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
            {linksConflict && (
              <div className="card" style={{ marginTop: 12, padding: 14, border: '1px solid var(--warning, #F59E0B)', borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
                  You have unsaved changes in Web profiles.
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-lo)', marginBottom: 12 }}>
                  Save them now, or discard them to keep only the profile changes above.
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <Button size="sm" disabled={linksSaving} onClick={async () => {
                    const errors = Object.fromEntries(
                      linkForm
                        .map((link, index) => [index, validateLinkForPlatform(link.platform, link.url)] as const)
                        .filter(([, error]) => error)
                    ) as Record<number, string>;
                    if (Object.keys(errors).length > 0) {
                      setLinkErrors(errors);
                      toast.push({ kind: 'default', title: 'Fix link errors first.' });
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
                      setLinksConflict(false);
                      toast.push({ kind: 'success', title: 'Web profiles saved.' });
                    } catch (e) {
                      toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not save web profiles.' });
                    } finally {
                      setLinksSaving(false);
                    }
                  }}>
                    {linksSaving ? '…' : 'Save web profiles too'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setLinkForm(profile.links);
                    setLinkErrors({});
                    setLinksConflict(false);
                  }}>
                    Discard link changes
                  </Button>
                </div>
              </div>
            )}
            <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="ghost" onClick={() => {
                setProfileForm({ displayName: profile.displayName, bio: profile.bio ?? '', visibility: profile.visibility, profileType: profile.profileType });
                setLocalAvatarColor(profile.color);
                setLocalBannerColor(profile.bannerFallbackColor);
                setLinkForm(profile.links);
                setLinkErrors({});
                setLinksConflict(false);
              }}>
                Cancel
              </Button>
              <Button disabled={profileSaving} onClick={async () => {
                // Check for unsaved link edits before saving profile.
                const linksChanged = JSON.stringify(linkForm.map(l => ({ platform: l.platform, url: l.url, displayLabel: l.displayLabel })))
                  !== JSON.stringify(profile.links.map(l => ({ platform: l.platform, url: l.url, displayLabel: l.displayLabel })));
                if (linksChanged && !linksConflict) {
                  setLinksConflict(true);
                  return;
                }
                setLinksConflict(false);
                setProfileSaving(true);
                try {
                  // Save avatar color if changed.
                  if (localAvatarColor && localAvatarColor !== profile.color) {
                    const colorResult = await profileApi.updateAvatarFallback(localAvatarColor);
                    setProfile(colorResult);
                    setLocalAvatarColor(colorResult.color);
                  }
                  // Save banner color if changed.
                  if (localBannerColor && localBannerColor !== profile.bannerFallbackColor) {
                    const colorResult = await profileApi.updateBannerFallback(localBannerColor);
                    setProfile(colorResult);
                    setLocalBannerColor(colorResult.bannerFallbackColor);
                  }
                  const updated = await profileApi.updateMe({
                    displayName: profileForm.displayName,
                    bio: profileForm.bio || null,
                    region: profile.region,
                    statusMessage: profile.statusMessage,
                    visibility: profileForm.visibility,
                    profileType: profileForm.profileType,
                  });
                  setProfile(updated);
                  setProfileForm(f => ({ ...f, visibility: updated.visibility, profileType: updated.profileType }));
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

      </SettingCard>

      <SettingCard title="Devices & sessions" sub="All devices currently signed in to your account.">
        <SessionsList
          sessions={sessions}
          loading={sessionsLoading}
          revokeAllLoading={revokeAllLoading}
          onRevoke={handleRevokeSession}
          onRevokeAll={handleRevokeAllSessions}
          onRefresh={loadSessions}
        />
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
  const { theme, setTheme } = useTheme();

  const options = [
    {
      id: 'dark' as const,
      name: 'Dark',
      sub: 'Midnight blue · default',
      icon: 'moon' as const,
      preview: (
        <div style={{ position: 'relative', height: 60, borderRadius: 8, background: 'linear-gradient(180deg, #0A0E18, #161C2E)', border: '1px solid #252E48', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 8, left: 8, width: 18, height: 6, borderRadius: 3, background: '#F0394B' }} />
          <div style={{ position: 'absolute', top: 8, left: 30, width: 38, height: 6, borderRadius: 3, background: '#252E48' }} />
          <div style={{ position: 'absolute', top: 22, left: 8, right: 8, height: 24, borderRadius: 5, background: '#161C2E', border: '1px solid #252E48' }} />
        </div>
      ),
    },
    {
      id: 'light' as const,
      name: 'Light',
      sub: 'Soft ink · paper white',
      icon: 'sun' as const,
      preview: (
        <div style={{ position: 'relative', height: 60, borderRadius: 8, background: 'linear-gradient(180deg, #FFFFFF, #F4F6FB)', border: '1px solid #DEE3EF', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 8, left: 8, width: 18, height: 6, borderRadius: 3, background: '#D62133' }} />
          <div style={{ position: 'absolute', top: 8, left: 30, width: 38, height: 6, borderRadius: 3, background: '#DEE3EF' }} />
          <div style={{ position: 'absolute', top: 22, left: 8, right: 8, height: 24, borderRadius: 5, background: '#FFFFFF', border: '1px solid #DEE3EF' }} />
        </div>
      ),
    },
  ];

  return (
    <SettingCard title="Appearance" sub="Choose your visual mode. Persists across sessions.">
      <div className="grid grid-2">
        {options.map(t => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className="surface"
            aria-pressed={theme === t.id}
            style={{
              padding: 14, textAlign: 'left', cursor: 'pointer',
              border: theme === t.id ? '1px solid rgba(240,57,75,0.4)' : '1px solid var(--border-2)',
              background: theme === t.id ? 'var(--red-soft)' : 'var(--bg-2)',
            }}
          >
            {t.preview}
            <div className="row between" style={{ marginTop: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)', marginTop: 2 }}>{t.sub}</div>
              </div>
              {theme === t.id && <span className="chip chip--red chip--mono"><Icon name="check" size={11} />Active</span>}
            </div>
          </button>
        ))}
      </div>
      <div className="surface row" style={{ marginTop: 12, padding: 12, gap: 10 }}>
        <Icon name="sparkle" size={14} style={{ color: 'var(--ice-400)' }} />
        <span style={{ fontSize: 12.5, color: 'var(--text-md)' }}>SimPle follows your system preference until you choose one explicitly.</span>
      </div>
    </SettingCard>
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

  // Profile visibility (separate from friend request privacy)
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Friend request privacy
  const [privacy, setPrivacy]           = useState<'Anyone' | 'FriendsOfFriends' | 'Off' | null>(null);
  const [searchVisibility, setSearchVisibility] = useState<SearchVisibility | null>(null);
  const [listVisibility, setListVisibility]     = useState<FriendsListVisibility | null>(null);
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const [privacySaving, setPrivacySaving]   = useState(false);
  const [privacyError, setPrivacyError]     = useState<string | null>(null);
  const [privacyRev, setPrivacyRev]         = useState(0);

  // Block count hint
  const [blockCount, setBlockCount]         = useState<number | null>(null);
  const [blockCountAtLeast, setBlockCountAtLeast] = useState(false);
  const [blockCountError, setBlockCountError] = useState(false);

  // Block list (keyset cursor)
  const [blocks, setBlocks]               = useState<BlockDto[]>([]);
  const [blocksCursor, setBlocksCursor]   = useState<string | null>(null);
  const [loadingBlocks, setLoadingBlocks]         = useState(false);
  const [loadingMoreBlocks, setLoadingMoreBlocks] = useState(false);
  const [blocksError, setBlocksError]     = useState<string | null>(null);
  const [showBlockList, setShowBlockList] = useState(false);
  const [pendingUnblock, setPendingUnblock] = useState<Record<string, boolean>>({});

  useEffect(() => {
    profileApi.getMe().then(setProfile).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrivacyLoading(true);
     
    setPrivacyError(null);
    friendsApi.getSettings()
      .then(s => {
        if (cancelled) return;
        setPrivacy(s.friendRequestPrivacy);
        setSearchVisibility(s.searchVisibility);
        setListVisibility(s.friendsListVisibility);
      })
      .catch(e => { if (!cancelled) setPrivacyError(e instanceof ApiError ? e.message : 'Could not load privacy settings.'); })
      .finally(() => { if (!cancelled) setPrivacyLoading(false); });
    return () => { cancelled = true; };
  }, [privacyRev]);

  useEffect(() => {
    let cancelled = false;
    // Cursor lists promise no total; derive an approximate count from the first page.
    friendsApi.getBlocks({ limit: 20 })
      .then(r => {
        if (cancelled) return;
        setBlockCount(r.items.length);
        setBlockCountAtLeast(r.nextCursor != null);
      })
      .catch(() => { if (!cancelled) setBlockCountError(true); });
    return () => { cancelled = true; };
  }, []);

  const setVisibility = async (visibility: UserProfile['visibility']) => {
    if (!profile) return;
    try {
      const updated = await profileApi.updateMe({
        displayName: profile.displayName, bio: profile.bio,
        region: profile.region, statusMessage: profile.statusMessage,
        visibility, profileType: profile.profileType,
      });
      setProfile(updated);
      toast.push({ kind: 'success', title: 'Visibility updated.' });
    } catch (e) {
      toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not update visibility.' });
    }
  };

  const handlePrivacyChange = async (newPrivacy: 'Anyone' | 'FriendsOfFriends' | 'Off') => {
    if (privacySaving || privacyLoading) return;
    setPrivacySaving(true);
    try {
      const s = await friendsApi.updateSettings(newPrivacy);
      setPrivacy(s.friendRequestPrivacy);
      toast.push({ kind: 'success', title: 'Privacy updated.' });
    } catch (e) {
      toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not update privacy.' });
    } finally {
      setPrivacySaving(false);
    }
  };

  const handleSearchVisibilityChange = async (v: SearchVisibility) => {
    if (privacySaving || privacyLoading || !privacy) return;
    setPrivacySaving(true);
    try {
      const s = await friendsApi.updateSettings(privacy, v);
      setSearchVisibility(s.searchVisibility);
      toast.push({ kind: 'success', title: 'Search visibility updated.' });
    } catch (e) {
      toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not update search visibility.' });
    } finally {
      setPrivacySaving(false);
    }
  };

  const handleListVisibilityChange = async (v: FriendsListVisibility) => {
    if (privacySaving || privacyLoading || !privacy) return;
    setPrivacySaving(true);
    try {
      const s = await friendsApi.updateSettings(privacy, undefined, v);
      setListVisibility(s.friendsListVisibility);
      toast.push({ kind: 'success', title: 'Friends list visibility updated.' });
    } catch (e) {
      toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not update friends list visibility.' });
    } finally {
      setPrivacySaving(false);
    }
  };

  const loadBlocks = async (cursor: string | null, reset: boolean) => {
    if (reset) { setLoadingBlocks(true); } else { setLoadingMoreBlocks(true); }
    if (reset) setBlocksError(null);
    try {
      const r = await friendsApi.getBlocks({ cursor: cursor ?? undefined, limit: 20 });
      setBlocks(prev => reset ? r.items : [...prev, ...r.items]);
      setBlocksCursor(r.nextCursor);
    } catch (e) {
      setBlocksError(e instanceof ApiError ? e.message : 'Could not load block list.');
    } finally {
      setLoadingBlocks(false);
      setLoadingMoreBlocks(false);
    }
  };

  const handleUnblock = async (userId: string) => {
    setPendingUnblock(p => ({ ...p, [userId]: true }));
    try {
      await friendsApi.unblockUser(userId);
      setBlocks(prev => prev.filter(b => b.blockedUserId !== userId));
      setBlockCount(prev => prev !== null ? Math.max(0, prev - 1) : null);
      toast.push({ kind: 'success', title: 'Unblocked', body: 'User removed from your block list.' });
    } catch (e) {
      toast.push({ kind: 'default', title: 'Error', body: friendsErrorMessage(e) });
    } finally {
      setPendingUnblock(p => { const n = { ...p }; delete n[userId]; return n; });
    }
  };

  const blockHintText = blockCountError
    ? '— blocked players'
    : blockCount !== null
      ? `${blockCount}${blockCountAtLeast ? '+' : ''} blocked player${blockCount === 1 && !blockCountAtLeast ? '' : 's'}`
      : '—';

  return (
    <SettingCard title="Privacy" sub="Control who sees you and what they see.">
      <SettingRow label="Profile visibility" right={
        <div className="tabs">
          <button className={`tab ${profile?.visibility === 'Public' ? 'tab--active' : ''}`} onClick={() => void setVisibility('Public')}>Public</button>
          <button className={`tab ${profile?.visibility === 'FriendsOnly' ? 'tab--active' : ''}`} onClick={() => void setVisibility('FriendsOnly')}>Friends-only</button>
          <button className={`tab ${profile?.visibility === 'Private' ? 'tab--active' : ''}`} onClick={() => void setVisibility('Private')}>Private</button>
        </div>
      } />

      {/* Show online status toggle — deferred to Module 7 (requires presence system) */}

      <SettingRow label="Allow friend requests from" right={
        <div className="tabs">
          {(['Anyone', 'FriendsOfFriends', 'Off'] as const).map(v => {
            const label = v === 'FriendsOfFriends' ? 'Friends-of-friends' : v;
            return (
              <button
                key={v}
                className={`tab ${privacy === v ? 'tab--active' : ''}`}
                disabled={privacyLoading || privacySaving}
                onClick={() => void handlePrivacyChange(v)}
              >{label}</button>
            );
          })}
        </div>
      } />
      <SettingRow label="Who can find you in search" right={
        <div className="tabs">
          {(['Everyone', 'FriendsOfFriends', 'Nobody'] as const).map(v => (
            <button
              key={v}
              className={`tab ${searchVisibility === v ? 'tab--active' : ''}`}
              disabled={privacyLoading || privacySaving}
              onClick={() => void handleSearchVisibilityChange(v)}
            >{v === 'FriendsOfFriends' ? 'Friends-of-friends' : v}</button>
          ))}
        </div>
      } />

      <SettingRow label="Who can see your friends list" right={
        <div className="tabs">
          {([
            { value: 'Everyone', label: 'Everyone' },
            { value: 'Friends', label: 'Friends' },
            { value: 'OnlyMe', label: 'Only me' },
          ] as const).map(o => (
            <button
              key={o.value}
              className={`tab ${listVisibility === o.value ? 'tab--active' : ''}`}
              disabled={privacyLoading || privacySaving}
              onClick={() => void handleListVisibilityChange(o.value)}
            >{o.label}</button>
          ))}
        </div>
      } />

      {privacyError && (
        <div style={{ fontSize: 12, color: 'var(--danger)', padding: '0 0 8px' }}>
          {privacyError}{' '}
          <button
            onClick={() => { setPrivacyError(null); setPrivacyRev(r => r + 1); }}
            style={{ color: 'var(--ice-400)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
          >Retry</button>
        </div>
      )}

      <SettingRow label="Block list" hint={blockHintText} right={
        <Button
          size="sm" variant="ghost"
          aria-expanded={showBlockList}
          aria-controls="friend-block-list"
          onClick={() => {
            setShowBlockList(v => !v);
            if (!showBlockList && blocks.length === 0) loadBlocks(null, true);
          }}
        >Manage</Button>
      } />

      {showBlockList && (
        <div id="friend-block-list" style={{ marginTop: 4, borderTop: '1px solid var(--border-1)', paddingTop: 12 }}>
          {loadingBlocks ? (
            <div style={{ fontSize: 13, color: 'var(--text-lo)', padding: '8px 0' }}>Loading…</div>
          ) : blocksError ? (
            <div style={{ padding: '8px 0' }}>
              <span style={{ fontSize: 13, color: 'var(--danger)' }}>{blocksError}</span>{' '}
              <Button size="sm" variant="ghost" onClick={() => loadBlocks(null, true)}>Retry</Button>
            </div>
          ) : blocks.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-lo)' }}>No blocked players.</div>
          ) : (
            <div className="col" style={{ gap: 4 }}>
              {blocks.map(b => (
                <div key={b.blockedUserId} className="row" style={{ padding: '8px 0', gap: 10, borderTop: '1px solid var(--border-1)' }}>
                  <Avatar src={b.blockedAvatarUrl} user={{ initials: b.blockedInitials, color: b.blockedColor }} size="sm" />
                  <span style={{ flex: 1, fontSize: 13 }}>{b.blockedDisplayName}</span>
                  <Button
                    size="sm" variant="ghost"
                    disabled={!!pendingUnblock[b.blockedUserId]}
                    onClick={() => handleUnblock(b.blockedUserId)}
                  >
                    {pendingUnblock[b.blockedUserId] ? 'Unblocking…' : 'Unblock'}
                  </Button>
                </div>
              ))}
              {blocksCursor != null && (
                <Button size="sm" variant="ghost" disabled={loadingMoreBlocks} onClick={() => loadBlocks(blocksCursor, false)}>
                  {loadingMoreBlocks ? 'Loading…' : 'Load more'}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </SettingCard>
  );
}

function SessionsList({
  sessions, loading, revokeAllLoading, onRevoke, onRevokeAll, onRefresh,
}: {
  sessions: Session[];
  loading: boolean;
  revokeAllLoading: boolean;
  onRevoke: (id: string) => void;
  onRevokeAll: () => void;
  onRefresh: () => void;
}) {
  const otherSessions = sessions.filter(s => !s.isCurrent);

  return (
    <div>
      <div className="row between" style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: 'var(--text-lo)' }}>
          {loading ? 'Loading…' : sessions.length === 0 ? 'No active sessions found.' : `${sessions.length} active session${sessions.length !== 1 ? 's' : ''}`}
        </div>
        <Button size="sm" variant="ghost" onClick={onRefresh} disabled={loading}>Refresh</Button>
      </div>

      {sessions.map(s => (
        <div key={s.id} className="row between" style={{ padding: '10px 0', borderTop: '1px solid var(--border-1)', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{s.ipAddress || 'Unknown IP'}</span>
              {s.isCurrent && (
                <span className="chip chip--red chip--mono" style={{ fontSize: 10 }}>This device</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-lo)', marginTop: 2 }}>{s.userAgent ?? 'Unknown device'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
              Signed in {new Date(s.createdAt).toLocaleDateString()} · expires {new Date(s.expiresAt).toLocaleDateString()}
            </div>
          </div>
          {!s.isCurrent && (
            <Button size="sm" variant="ghost" onClick={() => onRevoke(s.id)}
              style={{ color: 'var(--danger)', flexShrink: 0 }}>
              Sign out
            </Button>
          )}
        </div>
      ))}

      {otherSessions.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-1)' }}>
          <Button variant="ghost" onClick={onRevokeAll} disabled={revokeAllLoading}
            style={{ color: 'var(--danger)', fontSize: 13 }}>
            {revokeAllLoading ? '…' : `Sign out all other devices (${otherSessions.length})`}
          </Button>
        </div>
      )}
    </div>
  );
}


