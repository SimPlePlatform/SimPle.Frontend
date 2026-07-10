'use client';
import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';
import { MobileNavDrawer } from './MobileNavDrawer';
import { FriendSummaryProvider } from '@/features/friends/FriendSummaryContext';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <FriendSummaryProvider>
      <div className="app">
        <div className="app__sidebar">
          <Sidebar />
        </div>
        <div className="app__topbar">
          <Topbar onHamburger={() => setDrawerOpen(true)} />
        </div>
        <main className="app__main">
          {children}
        </main>
        <BottomNav />
        <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>
    </FriendSummaryProvider>
  );
}
