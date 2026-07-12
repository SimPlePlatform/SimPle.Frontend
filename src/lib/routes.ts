export const ROUTES = {
  home:           '/',
  login:          '/login',
  register:       '/register',
  dashboard:      '/dashboard',
  games:          '/games',
  game:           (id: string) => `/games/${id}`,
  friends:        '/friends',
  profile:        (id: string) => `/profile/${id}`,
  u:              (username: string) => `/u/${encodeURIComponent(username)}`,
  uFriends:       (username: string) => `/u/${encodeURIComponent(username)}/friends`,
  uMutualFriends: (username: string) => `/u/${encodeURIComponent(username)}/mutual-friends`,
  search:         (params: { type?: 'people' | 'games' | 'lobbies'; q?: string }) => {
    const qs = new URLSearchParams();
    qs.set('type', params.type ?? 'people');
    if (params.q) qs.set('q', params.q);
    return `/search?${qs.toString()}`;
  },
  lobby:          (id: string) => `/lobby/${id}`,
  room:           (id: string) => `/room/${id}`,
  leaderboards:   '/leaderboards',
  settings:       '/settings',
  verifyEmail:    '/verify-email',
  verifyConfirm:  '/verify-email/confirm',
  resetPassword:  '/reset-password',
} as const;
