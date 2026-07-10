'use client';
import React from 'react';

function ArtPattern({ kind, a }: { kind: string; a: string }) {
  if (kind === 'sudoku') return (
    <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
      {Array.from({length:6}).map((_,r) => Array.from({length:8}).map((_2,c) => {
        const on = (r*c) % 5 === 0;
        return <rect key={`${r}-${c}`} x={c*26+8} y={r*22+8} width="22" height="18" rx="3" fill={on ? `${a}22` : '#ffffff05'} stroke={on ? `${a}55` : '#ffffff10'} />;
      }))}
      <text x="170" y="42" fill={a} fontFamily="JetBrains Mono" fontSize="20" fontWeight="600" opacity="0.9">7</text>
      <text x="138" y="80" fill="#fff" fontFamily="JetBrains Mono" fontSize="20" fontWeight="500" opacity="0.7">3</text>
    </svg>
  );
  if (kind === 'falling-blocks') return (
    <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
      {[[20,60],[40,60],[60,60],[40,40]].map(([x,y],i) => <rect key={i} x={x} y={y} width="18" height="18" rx="3" fill={a} opacity="0.9" />)}
      {[[100,80],[120,80],[120,60],[140,60]].map(([x,y],i) => <rect key={`b${i}`} x={x} y={y} width="18" height="18" rx="3" fill="#A78BFA" opacity="0.8" />)}
      {[[160,30],[160,50],[160,70],[160,90]].map(([x,y],i) => <rect key={`c${i}`} x={x} y={y} width="18" height="18" rx="3" fill="#FBBF24" opacity="0.65" />)}
    </svg>
  );
  if (kind === 'four-in-a-row') return (
    <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
      {Array.from({length:5}).map((_,r) => Array.from({length:7}).map((_2,c) => {
        const v = (r+c) % 5;
        const fill = v === 0 ? '#F0394B' : v === 1 ? a : 'transparent';
        return <circle key={`${r}-${c}`} cx={c*24+24} cy={r*22+18} r="9" fill={fill || '#ffffff08'} stroke="#ffffff14" />;
      }))}
    </svg>
  );
  if (kind === 'chess') return (
    <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
      {Array.from({length:5}).map((_,r) => Array.from({length:8}).map((_2,c) => {
        const on = (r+c) % 2 === 0;
        return <rect key={`${r}-${c}`} x={c*22+10} y={r*22+10} width="22" height="22" fill={on ? '#ffffff10' : 'transparent'} />;
      }))}
      <g transform="translate(120, 30)" fill="#fff" opacity="0.85"><path d="M0 32 h28 v4 h-28z M2 30 h24 v2 h-24z M6 12 l8 -8 l8 8 v18 h-16z" /></g>
      <g transform="translate(60, 40)" fill="#F0394B" opacity="0.95"><circle cx="10" cy="6" r="6" /><path d="M0 22 h20 v6 h-20z M4 12 h12 v10 h-12z" /></g>
    </svg>
  );
  if (kind === 'checkers') return (
    <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
      {Array.from({length:5}).map((_,r) => Array.from({length:7}).map((_2,c) => {
        const v = (r*c) % 6;
        const fill = v === 0 ? a : v === 2 ? '#F0394B' : null;
        return fill ? <circle key={`${r}-${c}`} cx={c*26+18} cy={r*22+18} r="8" fill={fill} opacity="0.9" /> : null;
      }))}
    </svg>
  );
  if (kind === 'five-letter') {
    const word = ['S','I','M','P','L','E'];
    return (
      <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
        {word.map((ch,i) => (
          <g key={i} transform={`translate(${i*30+18}, 40)`}>
            <rect width="26" height="32" rx="4" fill={i<3 ? `${a}33` : '#ffffff0a'} stroke={i<3 ? `${a}66` : '#ffffff18'} />
            <text x="13" y="22" textAnchor="middle" fontFamily="Space Grotesk" fontSize="18" fontWeight="600" fill="#fff">{ch}</text>
          </g>
        ))}
      </svg>
    );
  }
  if (kind === 'memory') return (
    <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
      {Array.from({length:5}).map((_,r) => Array.from({length:8}).map((_2,c) => {
        const flip = (r*3+c) % 7 < 2;
        return <rect key={`${r}-${c}`} x={c*22+10} y={r*22+10} width="20" height="20" rx="4" fill={flip ? `${a}33` : '#ffffff08'} stroke="#ffffff14" />;
      }))}
    </svg>
  );
  if (kind === 'snake') return (
    <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
      <path d="M10 100 L60 100 L60 60 L100 60 L100 90 L150 90 L150 40 L180 40" fill="none" stroke={a} strokeWidth="10" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
      <circle cx="180" cy="40" r="6" fill="#F0394B" />
    </svg>
  );
  // Neutral fallback for an unrecognized art token — never renders nothing (broken-media state).
  return (
    <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
      {Array.from({ length: 5 }).map((_, r) => Array.from({ length: 8 }).map((_2, c) => (
        <circle key={`${r}-${c}`} cx={c * 24 + 20} cy={r * 22 + 18} r="2.5" fill={`${a}33`} />
      )))}
    </svg>
  );
}

interface GameArtGame {
  artToken: string;
  artColorA: string;
  artColorB: string;
  artAltText: string;
  name: string;
}

interface GameArtProps {
  game: GameArtGame;
  /** Short derived line under the name, e.g. "Puzzle · Logic" — never a fabricated stat. */
  subtitle?: string;
  h?: number | string;
}

export function GameArt({ game, subtitle, h = 140 }: GameArtProps) {
  const { artToken: kind, artColorA: a, artColorB: b, artAltText } = game;
  const bg = `radial-gradient(120% 80% at 80% 10%, ${a}33, transparent 60%), linear-gradient(180deg, ${b}, #07090F)`;
  return (
    <div className="tile-art" role="img" aria-label={artAltText} style={{ height: h, background: bg }}>
      <ArtPattern kind={kind} a={a} />
      <div style={{ position:'absolute', inset:0, padding:14, display:'flex', flexDirection:'column', justifyContent:'flex-end', zIndex:2 }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:18, color:'#fff', letterSpacing:'-0.02em' }}>{game.name}</div>
        {subtitle && <div style={{ fontSize:11.5, color:'rgba(255,255,255,0.65)', marginTop:2 }}>{subtitle}</div>}
      </div>
    </div>
  );
}
