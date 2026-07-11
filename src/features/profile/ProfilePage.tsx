'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { GameArt } from '@/components/ui/GameArt';
import { Icon } from '@/components/ui/Icons';
import { StatCard } from '@/components/ui/StatCard';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { profileApi, type UserProfile, type ProfileViewerContext, type RelationshipState } from '@/features/profile/profileApi';
import { friendsApi } from '@/features/friends/friendsApi';
import { friendsErrorMessage } from '@/features/friends/friendsErrors';
import { useAuth } from '@/features/auth/AuthProvider';
import { gamesApi } from '@/features/games/gamesApi';
import type { GameFavoriteDto } from '@/features/games/types';
import { ApiError } from '@/lib/api-client';
import { ROUTES } from '@/lib/routes';

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

export function ProfilePage({ username }: { username: string }) {
  const { user: authUser } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [viewerContext, setViewerContext] = useState<ProfileViewerContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundMessage, setNotFoundMessage] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [mediaLoading, setMediaLoading] = useState<'avatar' | 'banner' | null>(null);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [bannerMenuOpen, setBannerMenuOpen] = useState(false);
  const [editForm, setEditForm] = useState({ displayName: '', bio: '' });
  const [localAvatarColor, setLocalAvatarColor] = useState<string | null>(null);
  const [localBannerColor, setLocalBannerColor] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'remove' | 'block' | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const loadSeq = useRef(0);

  const isOwn = authUser?.username === username;

  const load = useCallback(() => {
    const seq = ++loadSeq.current;
    setLoading(true);
    setNotFoundMessage(null);
    Promise.all([
      isOwn ? profileApi.getMe() : profileApi.getPublic(username),
      authUser ? profileApi.getViewerContext(username).catch(() => null) : Promise.resolve(null),
    ])
      .then(([data, vc]) => {
        if (seq !== loadSeq.current) return;
        setProfile(data);
        setViewerContext(vc);
        setEditForm({ displayName: data.displayName, bio: data.bio ?? '' });
        setLocalAvatarColor(data.color);
        setLocalBannerColor(data.bannerFallbackColor);
        setLoading(false);
      })
      .catch(e => {
        if (seq !== loadSeq.current) return;
        setProfile(null);
        setNotFoundMessage(e instanceof ApiError ? friendsErrorMessage(e) : "This profile isn't available.");
        setLoading(false);
      });
  }, [username, isOwn, authUser]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const [favItems, setFavItems] = useState<GameFavoriteDto[]>([]);
  const [favCursor, setFavCursor] = useState<string | null>(null);
  const [favLoading, setFavLoading] = useState(false);
  const [favLoadingMore, setFavLoadingMore] = useState(false);
  const [favError, setFavError] = useState<string | null>(null);
  const favLoadedRef = useRef(false);

  const loadFavorites = useCallback((cur: string | null, append: boolean) => {
    if (append) setFavLoadingMore(true); else setFavLoading(true);
    setFavError(null);
    gamesApi.getFavorites({ limit: 24, cursor: cur ?? undefined })
      .then(r => {
        setFavItems(prev => append ? [...prev, ...r.items] : r.items);
        setFavCursor(r.nextCursor);
      })
      .catch(e => setFavError(e instanceof ApiError ? e.message : 'Failed to load favorite games.'))
      .finally(() => { setFavLoading(false); setFavLoadingMore(false); });
  }, []);

  useEffect(() => {
    if (tab === 'games' && isOwn && !favLoadedRef.current) {
      favLoadedRef.current = true;
      loadFavorites(null, false);
    }
  }, [tab, isOwn, loadFavorites]);

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

  // ─── Relationship actions ───────────────────────────────────────────────────
  // Decline/Cancel need a requestId that ProfileViewerContextDto doesn't carry, so they look it up
  // just-in-time from the first page of pending requests (send-cap of 3/day/target makes >50
  // simultaneous pending requests implausible).
  async function findPendingRequestId(direction: 'incoming' | 'outgoing', targetUserId: string) {
    const page = await friendsApi.getRequests(direction, { limit: 50 });
    const match = page.items.find(r =>
      direction === 'incoming' ? r.requesterId === targetUserId : r.addresseeId === targetUserId);
    return match?.requestId ?? null;
  }

  const runAction = async (fn: () => Promise<void>) => {
    setActionPending(true);
    try {
      await fn();
      load();
    } catch (e) {
      toast.push({ kind: 'default', title: 'Error', body: friendsErrorMessage(e) });
    } finally {
      setActionPending(false);
    }
  };

  const handleAddFriend = () => profile && runAction(async () => {
    const result = await friendsApi.sendRequest(profile.userId);
    if (result.outcome === 'cross_request_accepted') {
      toast.push({ kind: 'success', title: 'Friend added', body: `You and ${profile.displayName} are now friends.` });
    } else if (result.outcome === 'already_pending') {
      toast.push({ kind: 'info', title: 'Request already sent' });
    } else {
      toast.push({ kind: 'success', title: 'Request sent' });
    }
  });

  const handleAccept = () => profile && runAction(async () => {
    // Documented shortcut: sending to someone with an existing reverse-pending request atomically accepts it.
    await friendsApi.sendRequest(profile.userId);
    toast.push({ kind: 'success', title: 'Friend request accepted' });
  });

  const handleDecline = () => profile && runAction(async () => {
    const requestId = await findPendingRequestId('incoming', profile.userId);
    if (!requestId) { toast.push({ kind: 'default', title: 'Request not found', body: 'It may have already been withdrawn.' }); return; }
    await friendsApi.declineRequest(requestId);
    toast.push({ kind: 'success', title: 'Request declined' });
  });

  const handleCancel = () => profile && runAction(async () => {
    const requestId = await findPendingRequestId('outgoing', profile.userId);
    if (!requestId) { toast.push({ kind: 'default', title: 'Request not found', body: 'It may have already been accepted or withdrawn.' }); return; }
    await friendsApi.cancelRequest(requestId);
    toast.push({ kind: 'success', title: 'Request cancelled' });
  });

  const handleRemove = () => profile && runAction(async () => {
    await friendsApi.removeFriend(profile.userId);
    setConfirmAction(null);
    toast.push({ kind: 'success', title: 'Friend removed' });
  });

  const handleBlock = () => profile && runAction(async () => {
    await friendsApi.blockUser(profile.userId);
    setConfirmAction(null);
    toast.push({ kind: 'success', title: 'User blocked' });
  });

  const handleUnblock = () => profile && runAction(async () => {
    await friendsApi.unblockUser(profile.userId);
    toast.push({ kind: 'success', title: 'User unblocked' });
  });

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.push({ kind: 'success', title: 'Link copied' });
    } catch {
      toast.push({ kind: 'default', title: 'Could not copy link' });
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card-elev" style={{ padding: 40, textAlign: 'center', color: 'var(--text-lo)' }}>
          Loading profile…
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page">
        <div className="card-elev" style={{ padding: 40, textAlign: 'center', color: 'var(--text-lo)' }}>
          {notFoundMessage ?? "This profile isn't available."}
        </div>
      </div>
    );
  }

  const avatarUser = { initials: profile.initials, color: localAvatarColor ?? profile.color };
  const joinedYear = new Date(profile.joinedAt).getFullYear();
  const regionText = profile.region?.trim().toLowerCase() === 'eu-west' ? '' : profile.region?.trim();
  const relationshipState: RelationshipState | null = viewerContext?.relationshipState ?? (isOwn ? 'Self' : null);

  return (
    <div className="page">
      <div className="card-elev" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ height: 'clamp(96px, 28vw, 160px)', position: 'relative', background: profile.bannerUrl ? `url(${profile.bannerUrl}) center/cover` : `linear-gradient(135deg, ${localBannerColor ?? profile.bannerFallbackColor} 0%, #1B2238 55%, #0B0F18 100%)` }}>
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
                <div className="card" style={{ position: 'absolute', top: 36, right: 0, zIndex: 5, minWidth: 190, padding: 6 }}>
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
                    {saveLoading ? '…' : 'Save'}
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
        <div style={{ padding: '0 24px 24px', marginTop: -44 }}>
          <div className="row between" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
            <div className="row" style={{ gap: 18, alignItems: 'flex-end' }}>
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
                <Avatar user={avatarUser} src={profile.avatarUrl} size="xl" />
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
                  <div className="card" style={{ position: 'absolute', left: 0, top: 84, zIndex: 5, minWidth: 210, padding: 6 }}>
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
              <div style={{ paddingBottom: 6 }}>
                {!editing ? (
                  <>
                    <h1 className="font-display" style={{ fontSize: 24, fontWeight: 600 }}>{profile.displayName}</h1>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--text-lo)' }}>
                      @{profile.username} · joined {joinedYear}{regionText ? ` · ${regionText}` : ''}
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
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <span className="chip chip--mono">{profile.profileType}</span>
              <VisibilityBadge visibility={profile.visibility} />
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

          {!isOwn && (
            <div style={{ marginTop: 18 }}>
              {relationshipState ? (
                <RelationshipActions
                  state={relationshipState}
                  actionPending={actionPending}
                  onAdd={handleAddFriend}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  onCancel={handleCancel}
                  onRemove={() => setConfirmAction('remove')}
                  onBlock={() => setConfirmAction('block')}
                  onUnblock={handleUnblock}
                  onShare={() => void handleShare()}
                />
              ) : (
                <div className="row" style={{ gap: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-lo)' }}>Sign in to add friends or send messages.</span>
                  <Button variant="ghost" size="sm" icon="share" onClick={() => void handleShare()}>Share</Button>
                </div>
              )}
              {viewerContext && viewerContext.visibleMutualFriendCount > 0 && (
                <Link
                  href={ROUTES.uMutualFriends(username)}
                  className="mono"
                  style={{ fontSize: 11.5, color: 'var(--text-lo)', marginTop: 8, display: 'block', width: 'fit-content' }}
                >
                  {viewerContext.visibleMutualFriendCount} mutual friend{viewerContext.visibleMutualFriendCount !== 1 ? 's' : ''}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats — matches/win-rate/streak are placeholders until Module 10; Friends is real and drills down. */}
      <div className="grid grid-4" style={{ marginTop: 18 }}>
        <StatCard label="Matches"     value="—"  hint="Module 10"   icon="controller" />
        <StatCard label="Win rate"    value="—"  hint="Module 10"   icon="trophy" />
        <StatCard label="Best streak" value="—"  hint="Module 10"   icon="flame" />
        {viewerContext ? (
          viewerContext.canViewFriends ? (
            <Link href={ROUTES.uFriends(username)} style={{ textDecoration: 'none', color: 'inherit' }}>
              <StatCard label="Friends" value={String(viewerContext.visibleFriendCount ?? profile.friendCount)} hint="View all" icon="users" accent="ice" />
            </Link>
          ) : (
            <StatCard label="Friends" value="Private" icon="users" accent="ice" />
          )
        ) : (
          <StatCard label="Friends" value={String(profile.friendCount)} icon="users" accent="ice" />
        )}
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
        {tab === 'overview' && (
          <EmptyState
            icon="layers"
            title="Performance overview is coming later"
            body="Match history and achievements ship with Module 10 (Ranking & Matches); favorite games ship with Module 4 (Game Library)."
          />
        )}
        {tab === 'matches' && (
          <EmptyState icon="controller" title="Match history" body="Available once Module 10 (Ranking & Matches) ships." />
        )}
        {tab === 'achieve' && (
          <EmptyState icon="trophy" title="Achievements" body="Available once Module 10 (Ranking & Matches) ships." />
        )}
        {tab === 'games' && (
          !isOwn ? (
            <EmptyState icon="library" title="Favorite games" body="Only visible to the profile owner." />
          ) : favLoading ? (
            <div role="status" style={{ textAlign: 'center', padding: 32, color: 'var(--text-lo)' }}>Loading…</div>
          ) : favError ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <p style={{ color: 'var(--danger)', marginBottom: 8 }}>{favError}</p>
              <Button size="sm" variant="ghost" onClick={() => loadFavorites(null, false)}>Retry</Button>
            </div>
          ) : favItems.length === 0 ? (
            <EmptyState
              icon="library"
              title="No favorite games yet"
              body="Favorite a game from the library to see it here."
              action={<Button size="sm" onClick={() => router.push(ROUTES.games)}>Browse games</Button>}
            />
          ) : (
            <div className="col" style={{ gap: 12 }}>
              <div className="grid grid-3">
                {favItems.map(g => <FavoriteGameCard key={g.slug} favorite={g} />)}
              </div>
              {favCursor && (
                <div style={{ textAlign: 'center' }}>
                  <Button size="sm" variant="ghost" disabled={favLoadingMore} onClick={() => loadFavorites(favCursor, true)}>
                    {favLoadingMore ? 'Loading…' : 'Load more'}
                  </Button>
                </div>
              )}
            </div>
          )
        )}
      </div>

      <Modal
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === 'block' ? 'Block this user?' : 'Remove friend?'}
        icon={confirmAction === 'block' ? 'shield' : 'x'}
        footer={
          <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setConfirmAction(null)} disabled={actionPending}>Cancel</Button>
            <Button
              onClick={() => (confirmAction === 'block' ? handleBlock() : handleRemove())}
              disabled={actionPending}
            >
              {actionPending ? 'Working…' : confirmAction === 'block' ? 'Block' : 'Remove'}
            </Button>
          </div>
        }
      >
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-md)' }}>
          {confirmAction === 'block'
            ? `${profile.displayName} won't be able to send you friend requests, and any existing friendship will be removed.`
            : `${profile.displayName} will be removed from your friends list.`}
        </p>
      </Modal>
    </div>
  );
}

interface RelationshipActionsProps {
  state: RelationshipState;
  actionPending: boolean;
  onAdd: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
  onRemove: () => void;
  onBlock: () => void;
  onUnblock: () => void;
  onShare: () => void;
}

function RelationshipActions({
  state, actionPending, onAdd, onAccept, onDecline, onCancel, onRemove, onBlock, onUnblock, onShare,
}: RelationshipActionsProps) {
  switch (state) {
    case 'None':
      return (
        <div className="row" style={{ gap: 8 }}>
          <Button icon="plus" disabled={actionPending} onClick={onAdd}>Add friend</Button>
          <Button variant="ghost" icon="share" onClick={onShare}>Share</Button>
          <MoreMenu onBlock={onBlock} />
        </div>
      );
    case 'IncomingPending':
      return (
        <div className="row" style={{ gap: 8 }}>
          <Button icon="check" disabled={actionPending} onClick={onAccept}>
            {actionPending ? 'Working…' : 'Accept'}
          </Button>
          <Button variant="ghost" icon="x" disabled={actionPending} onClick={onDecline}>Decline</Button>
          <Button variant="ghost" icon="share" onClick={onShare}>Share</Button>
        </div>
      );
    case 'OutgoingPending':
      return (
        <div className="row" style={{ gap: 8 }}>
          <Button variant="ghost" disabled aria-disabled="true">Request pending</Button>
          <Button variant="ghost" icon="x" disabled={actionPending} onClick={onCancel}>Cancel</Button>
          <Button variant="ghost" icon="share" onClick={onShare}>Share</Button>
        </div>
      );
    case 'Friends':
      return (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <Button variant="ghost" icon="plus" disabled aria-disabled="true">Invite (Module 6)</Button>
          <Button variant="ghost" icon="x" disabled={actionPending} onClick={onRemove}>Remove friend</Button>
          <Button variant="ghost" icon="share" onClick={onShare}>Share</Button>
          <MoreMenu onBlock={onBlock} />
        </div>
      );
    case 'BlockedBySelf':
      return (
        <div className="row" style={{ gap: 8 }}>
          <Button variant="ghost" icon="shield" disabled={actionPending} onClick={onUnblock}>
            {actionPending ? 'Working…' : 'Unblock'}
          </Button>
          <Button variant="ghost" icon="share" onClick={onShare}>Share</Button>
        </div>
      );
    case 'Self':
    default:
      return null;
  }
}

function MoreMenu({ onBlock }: { onBlock: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn btn-ghost btn-icon btn-sm" aria-label="More actions" onClick={() => setOpen(v => !v)}>
        <Icon name="more" size={14} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', zIndex: 10,
          background: 'var(--bg-3)', border: '1px solid var(--border-2)',
          borderRadius: 8, padding: '4px 0', minWidth: 180,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13, borderRadius: 0, color: 'var(--danger)' }}
            onClick={() => { setOpen(false); onBlock(); }}
          >Block user</button>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13, borderRadius: 0 }}
            disabled
            aria-disabled="true"
          >Report (Module 12)</button>
        </div>
      )}
    </div>
  );
}

function FavoriteGameCard({ favorite }: { favorite: GameFavoriteDto }) {
  return (
    <Link href={ROUTES.game(favorite.slug)} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="card" style={{ overflow: 'hidden' }}>
        <GameArt game={favorite} h={120} />
        <div style={{ padding: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{favorite.name}</div>
          {favorite.lifecycle !== 'Available' && (
            <div style={{ marginTop: 8 }}>
              <span className="chip chip--mono">{favorite.lifecycle === 'ComingSoon' ? 'Coming soon' : favorite.lifecycle}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
