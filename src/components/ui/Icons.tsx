'use client';
import React from 'react';

const PATHS: Record<string, React.ReactNode> = {
  home:         <><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></>,
  library:      <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  users:        <><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="3"/><path d="M15 20a5 5 0 0 1 7 0"/></>,
  trophy:       <><path d="M8 4h8v4a4 4 0 0 1-8 0V4z"/><path d="M16 5h3v2a3 3 0 0 1-3 3"/><path d="M8 5H5v2a3 3 0 0 0 3 3"/><path d="M10 13h4l-1 4h-2l-1-4z"/><path d="M9 20h6"/></>,
  settings:     <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
  bell:         <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
  search:       <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
  play:         <><path d="M7 4v16l13-8z"/></>,
  plus:         <><path d="M12 5v14M5 12h14"/></>,
  check:        <><path d="M5 12l4 4 10-10"/></>,
  x:            <><path d="M6 6l12 12M18 6L6 18"/></>,
  chevronRight: <><path d="M9 6l6 6-6 6"/></>,
  chevronDown:  <><path d="M6 9l6 6 6-6"/></>,
  chevronLeft:  <><path d="M15 6l-6 6 6 6"/></>,
  arrowRight:   <><path d="M5 12h14M13 5l7 7-7 7"/></>,
  arrowLeft:    <><path d="M19 12H5M11 19l-7-7 7-7"/></>,
  send:         <><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4z"/></>,
  message:      <><path d="M4 5h16v11H8l-4 4z"/></>,
  more:         <><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></>,
  filter:       <><path d="M3 5h18l-7 8v6l-4 2v-8z"/></>,
  star:         <><path d="m12 3 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.9 6.1 21l1.2-6.5L2.5 9.9 9 9z"/></>,
  shield:       <><path d="M12 3 4 6v6c0 5 4 8 8 9 4-1 8-4 8-9V6z"/></>,
  bolt:         <><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></>,
  ai:           <><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 6V3M16 6V3M2 12h2M20 12h2"/><circle cx="9" cy="13" r="1.2"/><circle cx="15" cy="13" r="1.2"/><path d="M9 17h6"/></>,
  globe:        <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>,
  pause:        <><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></>,
  flag:         <><path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/></>,
  copy:         <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></>,
  share:        <><circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M9 11l7-4M9 13l7 4"/></>,
  edit:         <><path d="M4 20h4l11-11-4-4L4 16z"/><path d="M14 6l4 4"/></>,
  trash:        <><path d="M5 7h14M10 7V4h4v3M6 7l1 13h10l1-13"/></>,
  lock:         <><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/></>,
  mail:         <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
  google:       <><path d="M21 12.3c0-.7-.1-1.3-.2-2H12v3.8h5.1c-.2 1.2-.9 2.2-1.9 2.8v2.3h3.1c1.8-1.7 2.7-4.1 2.7-6.9z"/><path d="M12 21c2.6 0 4.8-.9 6.4-2.4l-3.1-2.3c-.9.6-2 1-3.3 1-2.5 0-4.7-1.7-5.5-4H3.3v2.4A9 9 0 0 0 12 21z"/><path d="M6.5 13.3a5.4 5.4 0 0 1 0-3.4V7.5H3.3a9 9 0 0 0 0 8.2l3.2-2.4z"/><path d="M12 5.6c1.4 0 2.7.5 3.7 1.5l2.8-2.8A9 9 0 0 0 3.3 7.5l3.2 2.4c.8-2.3 3-4 5.5-4z"/></>,
  github:       <><path d="M9 19c-4 1-4-2-5.5-2.5M15 22v-3.5c0-1-.1-1.4-.5-2 3-.3 5.5-1.5 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.4 4.4 0 0 0-.1-3.2s-1-.3-3.5 1.3a12 12 0 0 0-6 0C6.5 1.6 5.5 1.9 5.5 1.9a4.4 4.4 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 8.4c0 4.5 2.5 5.7 5.5 6-.4.5-.5 1-.5 2V22"/></>,
  controller:   <><rect x="2" y="8" width="20" height="11" rx="5"/><path d="M8 13h2M9 12v2M15 12h.01M17 14h.01"/></>,
  trendingUp:   <><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></>,
  trendingDown: <><path d="M3 7l6 6 4-4 8 8"/><path d="M14 17h7v-7"/></>,
  clock:        <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  user:         <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  link:         <><path d="M10 14a4 4 0 0 1 0-5.7l2.8-2.8a4 4 0 1 1 5.7 5.7L17 12.7"/><path d="M14 10a4 4 0 0 1 0 5.7l-2.8 2.8a4 4 0 1 1-5.7-5.7L7 11.3"/></>,
  crown:        <><path d="M3 8l4 4 5-6 5 6 4-4v10H3z"/></>,
  sparkle:      <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></>,
  sun:          <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
  moon:         <><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></>,
  eye:          <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
  eyeOff:       <><path d="M3 3l18 18"/><path d="M10.6 6.1A10 10 0 0 1 22 12s-1.7 2.9-4.6 4.8M6.6 6.6C3.6 8.4 2 12 2 12s4 7 10 7c2 0 3.7-.5 5.2-1.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>,
  refresh:      <><path d="M21 12a9 9 0 1 0-3 6.7L21 16"/><path d="M21 21v-5h-5"/></>,
  layers:       <><path d="m12 2 10 6-10 6L2 8z"/><path d="m2 12 10 6 10-6"/><path d="m2 16 10 6 10-6"/></>,
  network:      <><circle cx="12" cy="12" r="2"/><circle cx="4" cy="4" r="2"/><circle cx="20" cy="4" r="2"/><circle cx="4" cy="20" r="2"/><circle cx="20" cy="20" r="2"/><path d="m6 6 4 4M18 6l-4 4M6 18l4-4M18 18l-4-4"/></>,
  database:     <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></>,
  cpu:          <><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M2 10h2M2 14h2M20 10h2M20 14h2M10 2v2M14 2v2M10 20v2M14 20v2"/></>,
  grid:         <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
  flame:        <><path d="M12 3c2 4 6 5 6 10a6 6 0 1 1-12 0c0-2 1-4 3-5-1 3 2 4 2 2 0-2 0-4 1-7z"/></>,
  list:         <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>,
  signal:       <><path d="M2 20h2M7 17v3M12 13v7M17 9v11M22 4v16"/></>,
  rocket:       <><path d="M5 19a4 4 0 0 1-2-3l3-3 2 2-3 3a4 4 0 0 1-2 1z"/><path d="M14 10a8 8 0 0 1 8-8 8 8 0 0 1-8 8z"/><path d="M9 11c1-4 5-8 9-8l4 4c0 4-4 8-8 9l-3-2z"/><circle cx="16" cy="8" r="1.5"/></>,
  menu:         <><path d="M4 6h16M4 12h16M4 18h16"/></>,
};

interface IconProps {
  name: string;
  size?: number;
  stroke?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 18, stroke = 1.75, className = '', style }: IconProps) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style} aria-hidden="true"
    >
      {path}
    </svg>
  );
}
