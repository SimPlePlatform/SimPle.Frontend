'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icons';
import { StatCard } from '@/components/ui/StatCard';
import { GameArt } from '@/components/ui/GameArt';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { GAMES } from '@/mock/games';
import { RECENT_MATCHES } from '@/mock/matches';
import { ACHIEVEMENTS } from '@/mock/achievements';
import { rarityBg, rarityFg } from '@/lib/utils';
import { profileApi, type UserProfile } from '@/features/profile/profileApi';
import { useAuth } from '@/features/auth/AuthProvider';
import { ApiError } from '@/lib/api-client';
import { friendsApi } from '@/features/friends/friendsApi';

const VISIBILITY_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  Public:      { label: 'Public',       color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  Private:     { label: 'Private',      color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
  FriendsOnly: { label: 'Friends-only', color: '#38BDF8', bg: 'rgba(56,189,248,0.12)' },
};

function VisibilityBadge({ visibility }: { visibility: string }) {
  const s = VISIBILITY_STYLES[visibility] ?? { label: visibility, color: 'var(--text-lo)', bg: 'transparent' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
      color: s.color, background: s.bg, border: `1px solid ${s.color}33`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

export function ProfilePage({ userId }: { userId: string }) {
  const { user: authUser } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [mediaLoading, setMediaLoading] = useState<'avatar' | 'banner' | null>(null);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [bannerMenuOpen, setBannerMenuOpen] = useState(false);
  const [editForm, setEditForm] = useState({ displayName: '', bio: '' });
  const [localAvatarColor, setLocalAvatarColor] = useState<string | null>(null);
  const [localBannerColor, setLocalBannerColor] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const isOwn = authUser?.id === userId;

  useEffect(() => {
    let cancelled = false;
    (isOwn ? profileApi.getMe() : profileApi.getPublic(userId))
      .then(data => {
        if (cancelled) return;
        setProfile(data);
        setEditForm({ displayName: data.displayName, bio: data.bio ?? '' });
        setLocalAvatarColor(data.color);
        setLocalBannerColor(data.bannerFallbackColor);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, isOwn]);

  const handleSave = async () => {
    if (!profile) return;
    setSaveLoading(true);
    try {
      const updated = await profileApi.updateMe({
        displayName: editForm.displayName,
        bio: editForm.bio || null,
        region: profile.region,
        statusMessage: profile.statusMessage,
        visibility: profile.visibility,
        profileType: profile.profileType,
      });
      setProfile(updated);
      setEditing(false);
      toast.push({ kind: 'success', title: 'Profile saved.' });
    } catch (e) {
      toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not save profile.' });
    } finally {
      setSaveLoading(false);
    }
  };

  const uploadMedia = async (kind: 'avatar' | 'banner', file: File | undefined) => {
    if (!file) return;
    setMediaLoading(kind);
    try {
      const updated = kind === 'avatar'
        ? await profileApi.uploadAvatar(file)
        : await profileApi.uploadBanner(file);
      setProfile(updated);
      toast.push({ kind: 'success', title: kind === 'avatar' ? 'Avatar updated.' : 'Cover updated.' });
    } catch (e) {
      toast.push({ kind: 'default', title: e instanceof Error ? e.message : 'Upload failed.' });
    } finally {
      setMediaLoading(null);
      setAvatarMenuOpen(false);
      setBannerMenuOpen(false);
    }
  };

  const removeMedia = async (kind: 'avatar' | 'banner') => {
    setMediaLoading(kind);
    try {
      const updated = kind === 'avatar'
        ? await profileApi.removeAvatar()
        : await profileApi.removeBanner();
      setProfile(updated);
      toast.push({ kind: 'success', title: kind === 'avatar' ? 'Avatar removed.' : 'Cover removed.' });
    } catch (e) {
      toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not remove media.' });
    } finally {
      setMediaLoading(null);
      setAvatarMenuOpen(false);
      setBannerMenuOpen(false);
    }
  };

  const updateAvatarFallbackColor = async (color: string) => {
    setMediaLoading('avatar');
    try {
      const updated = await profileApi.updateAvatarFallback(color);
      setProfile(updated);
      setLocalAvatarColor(updated.color);
      toast.push({ kind: 'success', title: 'Avatar color saved.' });
    } catch (e) {
      if (profile) setLocalAvatarColor(profile.color);
      toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not update avatar color.' });
    } finally {
      setMediaLoading(null);
      setAvatarMenuOpen(false);
    }
  };

  const updateBannerFallbackColor = async (color: string) => {
    setMediaLoading('banner');
    try {
      const updated = await profileApi.updateBannerFallback(color);
      setProfile(updated);
      setLocalBannerColor(updated.bannerFallbackColor);
      toast.push({ kind: 'success', title: 'Cover color saved.' });
    } catch (e) {
      if (profile) setLocalBannerColor(profile.bannerFallbackColor);
      toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not update cover color.' });
    } finally {
      setMediaLoading(null);
      setBannerMenuOpen(false);
    }
  };

  const handleFriendAction = async (action: 'send' | 'remove' | 'block') => {
    if (!profile) return;
    setSaveLoading(true);
    try {
      if (action === 'send') {
        await friendsApi.sendRequest(profile.userId);
        toast.push({ kind: 'success', title: 'Friend request sent.' });
      } else if (action === 'remove') {
        await friendsApi.removeFriend(profile.userId);
        toast.push({ kind: 'success', title: 'Friend removed.' });
      } else {
        await friendsApi.block(profile.userId);
        toast.push({ kind: 'success', title: 'User blocked.' });
      }
      const updated = await profileApi.getPublic(profile.username);
      setProfile(updated);
    } catch (e) {
      toast.push({ kind: 'default', title: e instanceof ApiError ? e.message : 'Could not update friendship.' });
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card-elev" style={{ padding: 40, textAlign: 'center', color: 'var(--text-lo)' }}>
          Loading profile...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page">
        <div className="card-elev" style={{ padding: 40, textAlign: 'center', color: 'var(--text-lo)' }}>
          Profile not found or private.
        </div>
      </div>
    );
  }

  const avatarUser = { initials: profile.initials, color: localAvatarColor ?? profile.color, status: 'online' as const };
  const joinedYear = new Date(profile.joinedAt).getFullYear();
  const regionText = profile.region?.trim().toLowerCase() === 'eu-west' ? '' : profile.region?.trim();

  return (
    <div className="page">
      <div className="card-elev" style={{ overflow: 'hidden', padding: 0 }}>
        <div className="profile-banner" style={{ height: 160, position: 'relative', background: profile.bannerUrl ? `url(${profile.bannerUrl}) center/cover` : `linear-gradient(135deg, ${localBannerColor ?? profile.bannerFallbackColor} 0%, #1B2238 55%, #0B0F18 100%)` }}>
          <div className="grid-bg" style={{ opacity: 0.5 }} />
          {isOwn && (
            <div style={{ position: 'absolute', top: 14, right: editing ? 170 : 14 }}>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={e => {
                  void uploadMedia('banner', e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <Button size="sm" variant="ghost" icon="more" aria-label="Cover options" onClick={() => setBannerMenuOpen(v => !v)} />
              {bannerMenuOpen && (
                <div className="card dropdown-panel mobile-menu-panel" style={{ position: 'absolute', top: 36, right: 0, zIndex: 5, minWidth: 190, padding: 6 }}>
                  <button className="row" style={{ width: '100%', gap: 8, padding: 8, fontSize: 13 }} onClick={() => bannerInputRef.current?.click()}>
                    <Icon name="edit" size={14} /> {profile.hasUploadedBanner ? 'Change cover picture' : 'Upload cover picture'}
                  </button>
                  {profile.hasUploadedBanner && (
                    <button className="row" style={{ width: '100%', gap: 8, padding: 8, fontSize: 13, color: 'var(--danger)' }} onClick={() => void removeMedia('banner')} disabled={mediaLoading === 'banner'}>
                      <Icon name="trash" size={14} /> Remove cover picture
                    </button>
                  )}
                  {!profile.hasUploadedBanner && (
                    <label className="row" style={{ width: '100%', gap: 8, padding: 8, fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="color"
                        value={localBannerColor ?? profile.bannerFallbackColor}
                        onChange={e => setLocalBannerColor(e.target.value)}
                        onBlur={async e => {
                          const color = e.target.value;
                          if (color === profile.bannerFallbackColor) return;
                          await updateBannerFallbackColor(color);
                        }}
                        style={{ width: 24, height: 24, padding: 0, border: 0, background: 'transparent' }}
                      />
                      Edit default cover color
                    </label>
                  )}
                </div>
              )}
            </div>
          )}
          {isOwn && (
            <div style={{ position: 'absolute', top: 14, left: 14 }}>
              {editing ? (
                <div className="row" style={{ gap: 6 }}>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button size="sm" icon="check" onClick={handleSave} disabled={saveLoading}>
                    {saveLoading ? '...' : 'Save'}
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" icon="edit" onClick={() => setEditing(true)}>
                  Edit profile
                </Button>
              )}
            </div>
          )}
        </div>
        <div style={{ padding: '0 24px 24px', marginTop: -44, position: 'relative', zIndex: 1 }}>
          <div className="row between mobile-wrap" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
            <div className="row mobile-wrap profile-header-inner" style={{ gap: 18, alignItems: 'flex-end' }}>
              <div style={{ position: 'relative' }}>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={e => {
                    void uploadMedia('avatar', e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                <Avatar user={avatarUser} src={profile.avatarUrl} size="xl" showPresence />
                {isOwn && (
                  <button
                    aria-label="Avatar options"
                    onClick={() => setAvatarMenuOpen(v => !v)}
                    style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.42)', color: '#fff',
                      display: 'grid', placeItems: 'center', opacity: avatarMenuOpen || mediaLoading === 'avatar' ? 1 : 0,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => !avatarMenuOpen && mediaLoading !== 'avatar' && (e.currentTarget.style.opacity = '0')}
                  >
                    <Icon name={mediaLoading === 'avatar' ? 'refresh' : 'edit'} size={18} />
                  </button>
                )}
                {avatarMenuOpen && (
                  <div className="card dropdown-panel mobile-menu-panel" style={{ position: 'absolute', left: 0, top: 84, zIndex: 5, minWidth: 210, padding: 6 }}>
                    <button className="row" style={{ width: '100%', gap: 8, padding: 8, fontSize: 13 }} onClick={() => avatarInputRef.current?.click()}>
                      <Icon name="edit" size={14} /> Upload profile picture
                    </button>
                    {!profile.hasUploadedAvatar && (
                      <label className="row" style={{ width: '100%', gap: 8, padding: 8, fontSize: 13, cursor: 'pointer' }}>
                        <input
                          type="color"
                          value={localAvatarColor ?? profile.color}
                          onChange={e => setLocalAvatarColor(e.target.value)}
                          onBlur={async e => {
                            const color = e.target.value;
                            if (color === profile.color) return;
                            await updateAvatarFallbackColor(color);
                          }}
                          style={{ width: 24, height: 24, padding: 0, border: 0, background: 'transparent' }}
                        />
                        Edit default avatar color
                      </label>
                    )}
                    {profile.hasUploadedAvatar && (
                      <button className="row" style={{ width: '100%', gap: 8, padding: 8, fontSize: 13, color: 'var(--danger)' }} onClick={() => void removeMedia('avatar')} disabled={mediaLoading === 'avatar'}>
                        <Icon name="trash" size={14} /> Remove profile picture
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div style={{ paddingBottom: 6, minWidth: 0 }}>
                {!editing ? (
                  <>
                    <div className="font-display profile-display-name" style={{ fontSize: 24, fontWeight: 600 }}>{profile.displayName}</div>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--text-lo)' }}>
                      @{profile.username}  -  joined {joinedYear}{regionText ? `  -  ${regionText}` : ''}
                    </div>
                    {profile.statusMessage && (
                      <div style={{ fontSize: 12, color: 'var(--text-md)', marginTop: 4 }}>{profile.statusMessage}</div>
                    )}
                  </>
                ) : (
                  <div className="col" style={{ gap: 8, maxWidth: 380 }}>
                    <input className="input" value={editForm.displayName} placeholder="Display name"
                      onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))} />
                  </div>
                )}
              </div>
            </div>
            <div className="row mobile-wrap" style={{ gap: 8 }}>
              <span className="chip chip--mono">{profile.elo} ELO</span>
              <span className="chip chip--mono">Lv {profile.level}</span>
              <span className="chip chip--mono">{profile.profileType}</span>
              <VisibilityBadge visibility={profile.visibility} />
              {!isOwn && profile.friendshipStatus === 'None' && (
                <Button size="sm" icon="plus" disabled={saveLoading} onClick={() => void handleFriendAction('send')}>Add Friend</Button>
              )}
              {!isOwn && profile.friendshipStatus === 'RequestSent' && (
                <span className="chip chip--mono">Request sent</span>
              )}
              {!isOwn && profile.friendshipStatus === 'Friends' && (
                <Button size="sm" variant="ghost" icon="x" disabled={saveLoading} onClick={() => void handleFriendAction('remove')}>Remove Friend</Button>
              )}
              {!isOwn && profile.friendshipStatus !== 'Blocked' && (
                <Button size="sm" variant="ghost" icon="shield" disabled={saveLoading} onClick={() => void handleFriendAction('block')}>Block</Button>
              )}
            </div>
          </div>
          {!editing ? (
            profile.bio && <p style={{ marginTop: 14, maxWidth: 640 }}>{profile.bio}</p>
          ) : (
            <textarea
              className="input"
              value={editForm.bio}
              placeholder="Bio (optional)"
              style={{ marginTop: 14, minHeight: 80, padding: 12, resize: 'vertical', width: '100%' }}
              onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
            />
          )}
          {profile.links.length > 0 && (
            <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              {profile.links.map(link => (
                <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="chip chip--mono" style={{ fontSize: 11, gap: 4 }}>
                  <Icon name="link" size={10} />
                  {link.displayLabel ?? link.platform}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats - placeholders until Module 10 */}
      <div className="grid grid-4" style={{ marginTop: 18 }}>
        <StatCard label="Matches"     value="-"  hint="Module 10"   icon="controller" />
        <StatCard label="Win rate"    value="-"  hint="Module 10"   icon="trophy" />
        <StatCard label="Best streak" value="-"  hint="Module 10"   icon="flame" />
        <StatCard label="Friends"     value={String(profile.friendCount ?? 0)}  hint="Social graph"    icon="users" accent="ice" />
      </div>

      <div style={{ marginTop: 24 }}>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'overview', label: 'Overview' },
            { value: 'matches',  label: 'Match history' },
            { value: 'achieve',  label: 'Achievements' },
            { value: 'games',    label: 'Favorite games' },
          ]}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        {tab === 'overview' && <ProfileOverview />}
        {tab === 'matches'  && <MatchHistoryTable />}
        {tab === 'achieve'  && <AchievementsGrid />}
        {tab === 'games'    && <FavoriteGames />}
      </div>
    </div>
  );
}

function ProfileOverview() {
  return (
    <div className="responsive-split" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
      <PerformanceChart />
      <div className="col" style={{ gap: 18 }}>
        <FavoriteGames compact />
        <AchievementsGrid compact />
      </div>
    </div>
  );
}

function PerformanceChart() {
  const data = [1640, 1680, 1655, 1700, 1690, 1720, 1755, 1740, 1780, 1810, 1795, 1825, 1842];
  const min = Math.min(...data), max = Math.max(...data);
  const W = 600, H = 200, pad = 24;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / (max - min)) * (H - pad * 2);
    return [x, y];
  });
  const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ' ' + p[1]).join(' ');
  const dArea = d + ` L ${W - pad} ${H - pad} L ${pad} ${H - pad} Z`;

  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="row between">
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>ELO over time</div>
          <div className="page-sub">Last 13 days</div>
        </div>
        <Tabs value="13d" onChange={() => {}} items={[{ value: '7d', label: '7d' }, { value: '13d', label: '13d' }, { value: '30d', label: '30d' }]} />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 220, marginTop: 14 }}>
        <defs>
          <linearGradient id="elo-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#F0394B" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#F0394B" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: 4 }).map((_, i) => (
          <line key={i} x1={pad} x2={W - pad} y1={pad + i * ((H - pad * 2) / 3)} y2={pad + i * ((H - pad * 2) / 3)} stroke="#1B2238" />
        ))}
        <path d={dArea} fill="url(#elo-grad)" />
        <path d={d} fill="none" stroke="#F0394B" strokeWidth="2" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 5 : 2.5} fill="#F0394B" stroke="#0F1422" strokeWidth={i === pts.length - 1 ? 3 : 1} />
        ))}
        <text x={W - pad} y={(pts[pts.length - 1][1] ?? 0) - 10} textAnchor="end" fill="#F0394B" fontFamily="JetBrains Mono" fontWeight="600" fontSize="12">1842</text>
      </svg>
    </div>
  );
}

function MatchHistoryTable() {
  const matches = [...RECENT_MATCHES, ...RECENT_MATCHES.map((m, i) => ({ ...m, id: m.id + 'x' + i, when: '4d ago' }))];
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="match-history-header row" style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-1)' }}>
        <div className="uppercase-label" style={{ width: 120 }}>Result</div>
        <div className="uppercase-label" style={{ flex: 1 }}>Game / Opponent</div>
        <div className="uppercase-label" style={{ width: 120 }}>Duration</div>
        <div className="uppercase-label" style={{ width: 80, textAlign: 'right' }}>ELO</div>
        <div className="uppercase-label" style={{ width: 100, textAlign: 'right' }}>When</div>
      </div>
      {matches.map(m => {
        const c = m.result === 'win' ? 'var(--success)' : m.result === 'loss' ? 'var(--danger)' : 'var(--text-lo)';
        return (
          <div key={m.id} className="match-history-row row" style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-1)' }}>
            <div className="row" style={{ width: 120, gap: 8 }}>
              <div style={{ width: 6, height: 18, background: c, borderRadius: 3 }} />
              <span style={{ textTransform: 'uppercase', fontSize: 11, color: c, fontWeight: 600, letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>{m.result}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{m.game}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>vs {m.opponent}</div>
            </div>
            <div className="mono" style={{ width: 120, fontSize: 12.5 }}>{m.duration}</div>
            <div className="mono" style={{ width: 80, fontSize: 12.5, textAlign: 'right', color: m.delta.startsWith('+') ? 'var(--success)' : m.delta.startsWith('-') ? 'var(--danger)' : 'var(--text-lo)', fontWeight: 600 }}>{m.delta}</div>
            <div className="mono" style={{ width: 100, fontSize: 11, textAlign: 'right', color: 'var(--text-lo)' }}>{m.when}</div>
          </div>
        );
      })}
    </div>
  );
}

function AchievementsGrid({ compact }: { compact?: boolean }) {
  const list = compact ? ACHIEVEMENTS.slice(0, 4) : ACHIEVEMENTS;
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="row between">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>Achievements</div>
        <span className="chip chip--mono">3 / 6 unlocked</span>
      </div>
      <div className="grid grid-2" style={{ marginTop: 14 }}>
        {list.map(a => (
          <div key={a.id} className="surface" style={{ padding: 14, opacity: a.unlocked ? 1 : 0.7 }}>
            <div className="row" style={{ gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: a.unlocked ? rarityBg(a.rarity) : 'var(--bg-3)',
                color: a.unlocked ? rarityFg(a.rarity) : 'var(--text-dim)',
                display: 'grid', placeItems: 'center', border: '1px solid var(--border-2)',
              }}>
                <Icon name={a.unlocked ? 'trophy' : 'lock'} size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between">
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</span>
                  <span className="chip chip--mono" style={{ height: 18, padding: '0 6px', fontSize: 10, textTransform: 'capitalize' }}>{a.rarity}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-lo)', marginTop: 2 }}>{a.desc}</div>
                {!a.unlocked && a.progress != null && (
                  <div style={{ marginTop: 8 }}>
                    <div className="bar bar--ice" style={{ height: 4 }}><div className="bar__fill" style={{ width: (a.progress * 100) + '%' }} /></div>
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-lo)', marginTop: 4 }}>{Math.round(a.progress * 100)}%</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FavoriteGames({ compact }: { compact?: boolean }) {
  const games = GAMES.slice(0, compact ? 4 : 8);
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="row between">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>Favorite games</div>
        <span className="chip chip--mono">8 played</span>
      </div>
      <div className="grid grid-2" style={{ marginTop: 12 }}>
        {games.map(g => (
          <div key={g.id} className="surface" style={{ padding: 10 }}>
            <GameArt game={g} h={90} />
            <div className="row between" style={{ marginTop: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{g.name}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>{g.online} online</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
