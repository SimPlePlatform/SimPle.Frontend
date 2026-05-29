'use client';
import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';
import { MobileNavDrawer } from './MobileNavDrawer';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="app">
      <div className="app__sidebar">
        <Sidebar />
      </div>
      <header className="app__topbar">
        <Topbar onMenuClick={() => setDrawerOpen(true)} />
      </header>
      <main className="app__main">
        {children}
      </main>
      <BottomNav />
      <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
