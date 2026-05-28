'use client';
import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <div className="app__sidebar">
        <Sidebar />
      </div>
      <header className="app__topbar">
        <Topbar />
      </header>
      <main className="app__main">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
