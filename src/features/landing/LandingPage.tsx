'use client';
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icons';
import { GameArt } from '@/components/ui/GameArt';
import { GAMES } from '@/mock/games';
import { ROUTES } from '@/lib/routes';

export function LandingPage() {
  return (
    <div className="landing">
      <LandingNav />
      <Hero />
      <Trust />
      <FeatureGrid />
      <DashboardPreview />
      <ModesSection />
      <TechCredibility />
      <FinalCTA />
      <Footer />
    </div>
  );
}

function LandingNav() {
  return (
    <div className="landing__nav">
      <div className="container row" style={{ height:64, justifyContent:'space-between' }}>
        <div className="row" style={{ gap:10 }}>
          <div className="brand__logo" style={{ width:28, height:28 }} />
          <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:18, letterSpacing:'-0.02em' }}>SimPle</div>
          <span className="chip chip--mono" style={{ marginLeft:6 }}>beta</span>
        </div>
        <nav className="row" style={{ gap:24, fontSize:13, color:'var(--text-md)' }}>
          <a href="#features">Features</a>
          <a href="#modes">Modes</a>
          <a href="#tech">Tech</a>
        </nav>
        <div className="row" style={{ gap:8 }}>
          <Link href={ROUTES.login}><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link href={ROUTES.register}><Button size="sm" iconRight="arrowRight">Start playing</Button></Link>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section style={{ position:'relative', padding:'80px 0 60px', overflow:'hidden' }}>
      <div className="grid-bg" />
      <div className="container" style={{ position:'relative', zIndex:2, display:'grid', gridTemplateColumns:'1.05fr 1fr', gap:64, alignItems:'center' }}>
        <div>
          <div className="row" style={{ gap:8, marginBottom:18 }}>
            <span className="chip chip--red chip--mono"><span className="dot dot--playing" /> Live · Season 4 open</span>
            <span className="chip chip--mono">5,832 players online</span>
          </div>
          <h1 className="font-display" style={{ fontSize:'clamp(40px, 6vw, 68px)', lineHeight:1.02, fontWeight:600 }}>
            Play smarter.<br/>
            <span style={{ background:'linear-gradient(135deg, #F0394B 0%, #FF7884 60%, #FFE5E8 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Connect faster.</span>
          </h1>
          <p style={{ marginTop:18, fontSize:17, maxWidth:520, color:'var(--text-md)' }}>
            SimPle is a social hub for sharp little games. Add friends, jump into ranked lobbies, drill against AI — all in one premium, real-time platform.
          </p>
          <div className="row" style={{ gap:10, marginTop:28 }}>
            <Link href={ROUTES.register}><Button size="lg" iconRight="arrowRight">Start playing — it&apos;s free</Button></Link>
            <Link href={ROUTES.games}><Button size="lg" variant="ghost" icon="play">Explore games</Button></Link>
          </div>
          <div className="row" style={{ gap:18, marginTop:28, color:'var(--text-lo)', fontSize:12 }}>
            <span className="row" style={{ gap:6 }}><Icon name="check" size={14} /> No download. Browser-native.</span>
            <span className="row" style={{ gap:6 }}><Icon name="check" size={14} /> Cross-region matchmaking.</span>
            <span className="row" style={{ gap:6 }}><Icon name="check" size={14} /> More games shipping soon.</span>
          </div>
        </div>
        <HeroBoard />
      </div>
    </section>
  );
}

function HeroBoard() {
  const pieceMap: Record<number,string> = { 0:'♜',1:'♞',2:'♝',3:'♛',4:'♚',5:'♝',6:'♞',7:'♜',8:'♟',9:'♟',10:'♟',11:'♟',12:'♟',13:'♟',14:'♟',15:'♟',48:'♙',49:'♙',50:'♙',51:'♙',52:'♙',53:'♙',54:'♙',55:'♙',56:'♖',57:'♘',58:'♗',59:'♕',60:'♔',61:'♗',62:'♘',63:'♖' };
  return (
    <div style={{ position:'relative' }}>
      <div className="card-elev glow-ring" style={{ padding:18, position:'relative', overflow:'hidden', transform:'perspective(1400px) rotateY(-7deg) rotateX(4deg)', transformOrigin:'center' }}>
        <div className="row between" style={{ marginBottom:14 }}>
          <div className="row" style={{ gap:8 }}>
            <span className="dot dot--playing" />
            <span style={{ fontFamily:'var(--font-display)', fontWeight:600 }}>Chess Lite · Ranked 1v1</span>
          </div>
          <span className="chip chip--mono">02:47</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <PlayerStrip name="Priya Raman" sub="2,104 ELO · NL" turn={false} color="#38BDF8" initials="PR" />
          <PlayerStrip name="You" sub="1,842 ELO · EU" turn color="#F0394B" initials="AK" />
        </div>
        <div style={{ marginTop:14, display:'grid', gridTemplateColumns:'repeat(8, 1fr)', border:'1px solid var(--border-2)', borderRadius:10, overflow:'hidden' }}>
          {Array.from({length:64}).map((_,i) => {
            const r = Math.floor(i/8), c = i%8;
            const on = (r+c)%2 === 0;
            const isMove = i === 36 || i === 28;
            return (
              <div key={i} style={{ aspectRatio:'1', background: isMove ? 'rgba(240,57,75,0.18)' : on ? '#11172A' : '#0B0F18', display:'grid', placeItems:'center', fontSize:18, color: pieceMap[i] && i<16 ? '#38BDF8' : '#fff', position:'relative' }}>
                {pieceMap[i] || ''}
                {isMove && <span style={{ position:'absolute', width:10, height:10, borderRadius:999, background:'var(--red-500)', opacity:.9 }} />}
              </div>
            );
          })}
        </div>
        <div className="row" style={{ marginTop:14, gap:8 }}>
          <span className="chip chip--mono"><Icon name="bolt" size={12} /> e4 → e5</span>
          <span className="chip chip--mono">Nf3 → Nc6</span>
          <span className="chip chip--red chip--mono">Bb5 (best)</span>
        </div>
      </div>
      <FloatingCard style={{ left:-30, top:30 }}>
        <div className="row" style={{ gap:8 }}>
          <Avatar user={{ initials:'SL', color:'#34D399', status:'online' }} size="sm" showPresence />
          <div style={{ fontSize:12 }}>
            <div style={{ fontWeight:600 }}>Sara invited you</div>
            <div className="muted" style={{ fontSize:11 }}>Tetris Arena · 4 slots</div>
          </div>
          <Button size="sm">Join</Button>
        </div>
      </FloatingCard>
      <FloatingCard style={{ right:-20, bottom:30 }}>
        <div className="row" style={{ gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:'rgba(52,211,153,0.12)', color:'var(--success)', display:'grid', placeItems:'center' }}><Icon name="trophy" size={14} /></div>
          <div style={{ fontSize:12 }}>
            <div style={{ fontWeight:600 }}>+18 ELO · Diamond III</div>
            <div className="muted" style={{ fontSize:11 }}>Win streak ×4</div>
          </div>
        </div>
      </FloatingCard>
    </div>
  );
}

function PlayerStrip({ name, sub, turn, color, initials }: { name:string; sub:string; turn:boolean; color:string; initials:string }) {
  return (
    <div className="surface" style={{ padding:10, borderColor: turn ? 'rgba(240,57,75,0.4)' : undefined, boxShadow: turn ? '0 0 0 1px rgba(240,57,75,0.35), 0 12px 30px rgba(240,57,75,0.18)' : undefined }}>
      <div className="row" style={{ gap:10 }}>
        <Avatar user={{ initials, color }} size="sm" />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12.5, fontWeight:600 }}>{name}</div>
          <div className="mono" style={{ fontSize:10.5, color:'var(--text-lo)' }}>{sub}</div>
        </div>
        {turn && <span className="chip chip--red chip--mono"><span className="dot dot--playing" />Turn</span>}
      </div>
    </div>
  );
}

function FloatingCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="card-elev" style={{ position:'absolute', padding:10, ...style }}>
      {children}
    </div>
  );
}

function Trust() {
  return null;
}

function FeatureGrid() {
  const features = [
    { icon:'users',   title:'Friends, not feeds',  body:"A clean roster with live presence, lobby invites and DMs. No infinite scroll, no rage bait." },
    { icon:'ai',      title:'Train against AI',     body:'Every game ships with 3–4 AI difficulty curves so practice doesn\'t require a partner.' },
    { icon:'network', title:'Real-time lobbies',    body:'Sub-second join, ready states, AI fill, host controls and rejoin-on-disconnect.' },
    { icon:'signal',  title:'Stats that matter',    body:'ELO, win rate, recent form. Per-game leaderboards with global and friends-only views.' },
    { icon:'shield',  title:'Fair play first',      body:'Server-validated moves, anti-disconnect penalty, rate-limited matchmaking, no bots-as-players.' },
    { icon:'bolt',    title:'Built for browsers',   body:'Zero install. Plays smoothly on mid-range laptops and modern phones. Keyboard-friendly.' },
  ];
  return (
    <section id="features" style={{ padding:'60px 0', borderTop:'1px solid var(--border-1)' }}>
      <div className="container">
        <SectionHeader eyebrow="What you get" title="A social platform that respects players." sub="No gambling loops. No dark patterns. Just sharp games and the friends you want to play them with." />
        <div className="grid grid-3" style={{ marginTop:36 }}>
          {features.map(f => (
            <div key={f.title} className="card" style={{ padding:20 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'var(--red-soft)', color:'var(--red-400)', display:'grid', placeItems:'center', border:'1px solid rgba(240,57,75,0.2)' }}>
                <Icon name={f.icon} size={17} />
              </div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:16, marginTop:14 }}>{f.title}</div>
              <p style={{ marginTop:6, fontSize:13.5 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ eyebrow, title, sub }: { eyebrow:string; title:string; sub?:string }) {
  return (
    <div style={{ textAlign:'center', maxWidth:720, margin:'0 auto' }}>
      <div className="uppercase-label" style={{ color:'var(--red-400)' }}>{eyebrow}</div>
      <h2 className="font-display" style={{ fontSize:38, fontWeight:600, marginTop:8, letterSpacing:'-0.02em' }}>{title}</h2>
      {sub && <p style={{ marginTop:12, fontSize:15 }}>{sub}</p>}
    </div>
  );
}

function DashboardPreview() {
  return (
    <section style={{ padding:'60px 0', borderTop:'1px solid var(--border-1)' }}>
      <div className="container">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr', gap:48, alignItems:'center' }}>
          <div>
            <div className="uppercase-label" style={{ color:'var(--red-400)' }}>The hub</div>
            <h2 className="font-display" style={{ fontSize:34, fontWeight:600, marginTop:8 }}>One dashboard. Everything in reach.</h2>
            <p style={{ marginTop:14 }}>See who&apos;s online, your recent matches, recommended games and pending invites. Nothing buried behind tabs.</p>
            <div className="col" style={{ marginTop:22, gap:10 }}>
              {['Live friend presence + lobby invites','Continue-playing rail for matches in progress','Daily quests & seasonal events','Recent matches with ELO deltas'].map(s => (
                <div key={s} className="row" style={{ gap:10, fontSize:13.5 }}>
                  <span style={{ width:18, height:18, borderRadius:999, background:'var(--red-soft)', color:'var(--red-400)', display:'grid', placeItems:'center' }}><Icon name="check" size={12} /></span>
                  <span style={{ color:'var(--text-md)' }}>{s}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop:24 }}>
              <Link href={ROUTES.dashboard}><Button iconRight="arrowRight">Tour the dashboard</Button></Link>
            </div>
          </div>
          <div className="card-elev" style={{ padding:14 }}>
            <div className="row between" style={{ marginBottom:12 }}>
              <div className="row" style={{ gap:8 }}><span className="dot dot--online" /><span style={{ fontWeight:600 }}>Good evening, Alex</span></div>
              <span className="chip chip--mono">Diamond III · 1842 ELO</span>
            </div>
            <div className="grid grid-3" style={{ marginBottom:12 }}>
              {[['Win rate','64%','+3%'],['Matches','218','+12'],['Friends','36','+2']].map(([l,v,t]) => (
                <div key={l} className="surface" style={{ padding:12 }}>
                  <div className="uppercase-label">{l}</div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:22, marginTop:4 }}>{v}</div>
                  <div className="mono" style={{ fontSize:11, color: t.startsWith('+') ? 'var(--success)' : 'var(--danger)', marginTop:2 }}>{t}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[GAMES[3], GAMES[1]].map(g => (
                <div key={g.id} className="surface" style={{ padding:10 }}>
                  <GameArt game={g} h={100} />
                  <div className="row between" style={{ marginTop:8 }}>
                    <div className="mono" style={{ fontSize:11, color:'var(--text-lo)' }}>{g.duration}</div>
                    <Button size="sm" variant="ghost" icon="play">Play</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ModesSection() {
  return (
    <section id="modes" style={{ padding:'60px 0', borderTop:'1px solid var(--border-1)' }}>
      <div className="container">
        <SectionHeader eyebrow="Three ways to play" title="Solo, friends, or ranked. Your call." />
        <div className="grid grid-3" style={{ marginTop:36 }}>
          <ModeCard color="#F0394B" icon="ai"    title="Vs AI"      body="Four difficulty curves per game. Practice without waiting for a partner." cta="Play vs AI" />
          <ModeCard color="#38BDF8" icon="users" title="Vs Friends" body="Drop into a private lobby, invite friends, fill with AI if you're short." cta="Create lobby" highlight />
          <ModeCard color="#A78BFA" icon="trophy" title="Ranked"   body="Region-aware matchmaking by ELO. Seasons reset every 8 weeks." cta="Quick match" />
        </div>
      </div>
    </section>
  );
}

function ModeCard({ color, icon, title, body, cta, highlight }: { color:string; icon:string; title:string; body:string; cta:string; highlight?:boolean }) {
  return (
    <div className="card" style={{ padding:24, position:'relative', overflow:'hidden', borderColor: highlight ? 'rgba(240,57,75,0.35)' : undefined }}>
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(400px 200px at 100% 0%, ${color}22, transparent 60%)`, pointerEvents:'none' }} />
      <div style={{ width:42, height:42, borderRadius:12, background:`${color}22`, color, display:'grid', placeItems:'center', border:`1px solid ${color}44`, position:'relative' }}>
        <Icon name={icon} size={20} />
      </div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:22, marginTop:18, position:'relative' }}>{title}</div>
      <p style={{ marginTop:8, position:'relative' }}>{body}</p>
      <div style={{ marginTop:20, position:'relative' }}>
        <Button variant={highlight ? 'primary' : 'ghost'} iconRight="arrowRight">{cta}</Button>
      </div>
    </div>
  );
}

function TechCredibility() {
  const pillars = [
    { label:'Frontend', value:'React · TS · Tailwind',  icon:'layers' },
    { label:'Realtime', value:'WebSockets · SignalR',    icon:'network' },
    { label:'Backend',  value:'.NET 8 · EF Core',       icon:'cpu' },
    { label:'Storage',  value:'PostgreSQL · Redis',      icon:'database' },
    { label:'Auth',     value:'JWT · OAuth2',            icon:'lock' },
    { label:'Infra',    value:'Docker · GitHub CI',      icon:'rocket' },
  ];
  return (
    <section id="tech" style={{ padding:'60px 0', borderTop:'1px solid var(--border-1)' }}>
      <div className="container">
        <SectionHeader eyebrow="Under the hood" title="Built like a product, not a prototype." sub="SimPle is a portfolio-grade full-stack project. Every part is shippable." />
        <div className="grid grid-3" style={{ marginTop:36 }}>
          {pillars.map(p => (
            <div key={p.label} className="surface" style={{ padding:18 }}>
              <div className="row between">
                <div className="uppercase-label">{p.label}</div>
                <Icon name={p.icon} size={14} style={{ color:'var(--text-lo)' }} />
              </div>
              <div className="mono" style={{ marginTop:8, fontSize:13.5, color:'var(--text-hi)' }}>{p.value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section style={{ padding:'80px 0' }}>
      <div className="container">
        <div className="card-elev" style={{ padding:'56px 48px', textAlign:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(600px 300px at 50% 0%, rgba(240,57,75,0.18), transparent 70%)' }} />
          <div style={{ position:'relative' }}>
            <h2 className="font-display" style={{ fontSize:42, fontWeight:600, letterSpacing:'-0.02em' }}>Your next game is one click away.</h2>
            <p style={{ marginTop:14, fontSize:15, maxWidth:560, margin:'14px auto 0' }}>Sign up free. Invite three friends. Play tonight.</p>
            <div className="row" style={{ gap:10, justifyContent:'center', marginTop:24 }}>
              <Link href={ROUTES.register}><Button size="lg" iconRight="arrowRight">Create my account</Button></Link>
              <Link href={ROUTES.dashboard}><Button size="lg" variant="ghost">Open the demo</Button></Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop:'1px solid var(--border-1)', padding:'32px 0', color:'var(--text-lo)', fontSize:12.5 }}>
      <div className="container row between" style={{ flexWrap:'wrap', gap:16 }}>
        <div className="row" style={{ gap:8 }}>
          <div className="brand__logo" style={{ width:22, height:22 }} />
          <span>© 2026 SimPle Labs · Built as a portfolio project.</span>
        </div>
        <div className="row" style={{ gap:18 }}>
          <a href="#">Changelog</a><a href="#">Docs</a><a href="#">Status</a><a href="#">Press kit</a>
        </div>
      </div>
    </footer>
  );
}
