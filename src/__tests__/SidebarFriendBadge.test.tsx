import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'u-1', displayName: 'Test User', username: 'testuser', initials: 'TU', color: '#F0394B', status: 'online' },
    status: 'authenticated',
  }),
}));

const mockSummaryState = {
  summary: null as { friendCount: number; incomingRequestCount: number; outgoingRequestCount: number } | null,
  loading: false,
  error: null as string | null,
  invalidate: vi.fn(),
  retry: vi.fn(),
};

vi.mock('@/features/friends/FriendSummaryContext', () => ({
  useFriendSummary: () => mockSummaryState,
}));

const mockGetMyActive = vi.fn(() => Promise.resolve({ lobby: null, ticketId: null }));
vi.mock('@/features/lobby/lobbyApi', () => ({
  lobbyApi: { getMyActive: () => mockGetMyActive() },
}));

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockSummaryState.summary = null;
  mockSummaryState.loading = false;
  mockSummaryState.error = null;
  mockGetMyActive.mockReset();
  mockGetMyActive.mockResolvedValue({ lobby: null, ticketId: null });
});

async function renderSidebar() {
  const { Sidebar } = await import('@/components/layout/Sidebar');
  return render(<Sidebar />);
}

describe('Sidebar friend badge', () => {
  it('badge hidden when loading=true', async () => {
    mockSummaryState.loading = true;
    mockSummaryState.summary = { friendCount: 3, incomingRequestCount: 5, outgoingRequestCount: 0 };
    await renderSidebar();
    expect(screen.queryByText('5')).not.toBeInTheDocument();
    expect(document.querySelector('.nav-item__badge')).not.toBeInTheDocument();
  });

  it('badge hidden when error is set', async () => {
    mockSummaryState.error = 'Network error';
    mockSummaryState.summary = { friendCount: 3, incomingRequestCount: 5, outgoingRequestCount: 0 };
    await renderSidebar();
    expect(document.querySelector('.nav-item__badge')).not.toBeInTheDocument();
  });

  it('badge hidden when incomingRequestCount is 0', async () => {
    mockSummaryState.summary = { friendCount: 3, incomingRequestCount: 0, outgoingRequestCount: 0 };
    await renderSidebar();
    expect(document.querySelector('.nav-item__badge')).not.toBeInTheDocument();
  });

  it('badge shows incomingRequestCount when nonzero', async () => {
    mockSummaryState.summary = { friendCount: 3, incomingRequestCount: 4, outgoingRequestCount: 0 };
    await renderSidebar();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(document.querySelector('.nav-item__badge')).toBeInTheDocument();
  });

  it('badge updates when summary changes to nonzero', async () => {
    mockSummaryState.summary = null;
    const { rerender } = await (async () => {
      const { Sidebar } = await import('@/components/layout/Sidebar');
      return render(<Sidebar />);
    })();
    expect(document.querySelector('.nav-item__badge')).not.toBeInTheDocument();
    mockSummaryState.summary = { friendCount: 1, incomingRequestCount: 3, outgoingRequestCount: 0 };
    const { Sidebar } = await import('@/components/layout/Sidebar');
    rerender(<Sidebar />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('links Active Lobby only when the authenticated user has one', async () => {
    mockGetMyActive.mockResolvedValue({ lobby: { lobbyId: 'lobby-real' }, ticketId: null });
    await renderSidebar();
    const link = await screen.findByRole('link', { name: 'Active Lobby' });
    expect(link).toHaveAttribute('href', '/lobby/lobby-real');
    expect(link).not.toHaveAttribute('href', expect.stringContaining('SP-7F-29'));
  });
});
