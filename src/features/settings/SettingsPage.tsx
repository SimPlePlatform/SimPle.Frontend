'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icons';
import { Toggle } from '@/components/ui/Toggle';
import { useToast } from '@/components/ui/Toast';
import { CURRENT_USER } from '@/mock/users';

const SECTIONS = [
  { id: 'account', label: 'Account',       icon: 'user' },
  { id: 'theme',   label: 'Theme',          icon: 'sparkle' },
  { id: 'notify',  label: 'Notifications',  icon: 'bell' },
  { id: 'privacy', label: 'Privacy',        icon: 'shield' },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

export function SettingsPage() {
  const [tab, setTab] = useState<SectionId>('account');

  return (
    <div className="page">
      <div>
        <div className="page-title">Settings</div>
        <div className="page-sub">Account, gameplay, notifications and more.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, marginTop: 22 }}>
        <aside className="card" style={{ padding: 8, height: 'fit-content' }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setTab(s.id)}
              className="row"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                background: tab === s.id ? 'var(--bg-tint)' : 'transparent',
                color: tab === s.id ? 'var(--text-hi)' : 'var(--text-md)',
                fontSize: 13.5, fontWeight: 500, gap: 10,
              }}
            >
              <Icon name={s.icon} size={15} />
              <span>{s.label}</span>
              {tab === s.id && <Icon name="chevronRight" size={13} style={{ marginLeft: 'auto', color: 'var(--red-400)' }} />}
            </button>
          ))}
        </aside>

        <div>
          {tab === 'account' && <AccountSettings />}
          {tab === 'theme'   && <ThemeSettings />}
          {tab === 'notify'  && <NotifySettings />}
          {tab === 'privacy' && <PrivacySettings />}
        </div>
      </div>
    </div>
  );
}

function SettingCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 22, marginBottom: 18 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>{title}</div>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function SettingRow({ label, hint, right }: { label: string; hint?: string; right: React.ReactNode }) {
  return (
    <div className="row between" style={{ padding: '12px 0', borderTop: '1px solid var(--border-1)' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--text-lo)', marginTop: 2 }}>{hint}</div>}
      </div>
      <div>{right}</div>
    </div>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{ display: 'block', ...style }}>
      <div style={{ fontSize: 12, color: 'var(--text-md)', fontWeight: 500, marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}

function AccountSettings() {
  const toast = useToast();
  const u = CURRENT_USER;
  return (
    <>
      <SettingCard title="Profile" sub="Public info shown to other players.">
        <div className="row" style={{ gap: 18 }}>
          <Avatar user={u} size="xl" />
          <div className="col" style={{ flex: 1, gap: 10 }}>
            <Field label="Display name"><input className="input" defaultValue={u.display} /></Field>
            <Field label="Username (handle)"><input className="input" defaultValue={u.username} /></Field>
          </div>
        </div>
        <Field label="Bio" style={{ marginTop: 12 }}>
          <textarea className="input" defaultValue={u.bio} style={{ minHeight: 80, padding: 12, width: '100%' }} />
        </Field>
        <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost">Cancel</Button>
          <Button onClick={() => toast.push({ kind: 'success', title: 'Profile saved', body: 'Your changes are live.' })}>Save changes</Button>
        </div>
      </SettingCard>

      <SettingCard title="Login & security">
        <SettingRow label="Email" hint="alex@simple.gg · verified" right={<Button size="sm" variant="ghost">Change</Button>} />
        <SettingRow label="Password" hint="Last changed 28 days ago" right={<Button size="sm" variant="ghost">Update</Button>} />
        <SettingRow label="Two-factor authentication" hint="Adds a code on every new device" right={<Toggle on={true} onChange={() => {}} label="" />} />
        <SettingRow label="Active sessions" hint="2 devices · Frankfurt, Amsterdam" right={<Button size="sm" variant="ghost">View</Button>} />
      </SettingCard>

      <SettingCard title="Danger zone">
        <SettingRow label="Delete account" hint="Permanently removes profile and history" right={<Button size="sm" variant="ghost" icon="trash" style={{ color: 'var(--danger)' }}>Delete</Button>} />
      </SettingCard>
    </>
  );
}

function ThemeSettings() {
  const [theme, setTheme] = useState('midnight');
  const [accent, setAccent] = useState('#F0394B');
  const [density, setDensity] = useState('Default');
  const themes = [
    { id: 'midnight', name: 'Midnight', a: '#0A0E18', b: '#161C2E' },
    { id: 'obsidian', name: 'Obsidian', a: '#070B14', b: '#10162A' },
    { id: 'slate',    name: 'Slate',    a: '#0F172A', b: '#1E293B' },
  ];
  return (
    <>
      <SettingCard title="Appearance" sub="Dark-first. Light coming later.">
        <div className="grid grid-3">
          {themes.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className="surface"
              style={{
                padding: 14, textAlign: 'left', cursor: 'pointer',
                border: theme === t.id ? '1px solid rgba(240,57,75,0.4)' : undefined,
                background: theme === t.id ? 'var(--red-soft)' : undefined,
              }}
            >
              <div style={{ height: 60, borderRadius: 8, background: `linear-gradient(180deg, ${t.a}, ${t.b})`, border: '1px solid var(--border-2)' }} />
              <div className="row between" style={{ marginTop: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</span>
                {theme === t.id && <span className="chip chip--red chip--mono"><Icon name="check" size={11} />Active</span>}
              </div>
            </button>
          ))}
        </div>
      </SettingCard>

      <SettingCard title="Accent color">
        <div className="row" style={{ gap: 10 }}>
          {['#F0394B', '#38BDF8', '#A78BFA', '#34D399', '#F59E0B', '#F472B6'].map(c => (
            <button
              key={c}
              onClick={() => setAccent(c)}
              aria-label={c}
              style={{
                width: 34, height: 34, borderRadius: 999, background: c, cursor: 'pointer',
                border: accent === c ? '2px solid #fff' : '2px solid transparent',
                boxShadow: accent === c ? `0 0 0 2px var(--bg-0), 0 0 0 4px ${c}` : 'none',
              }}
            />
          ))}
        </div>
      </SettingCard>

      <SettingCard title="Density">
        <SettingRow label="UI density" hint="Compact saves space, comfortable feels premium." right={
          <div className="tabs">
            {['Compact', 'Default', 'Comfortable'].map(d => (
              <button key={d} className={`tab ${d === density ? 'tab--active' : ''}`} onClick={() => setDensity(d)}>{d}</button>
            ))}
          </div>
        } />
      </SettingCard>
    </>
  );
}

function NotifySettings() {
  const [states, setStates] = useState({ lobby: true, friend: true, dm: true, result: false, season: true, digest: false });
  const toggle = (k: keyof typeof states) => setStates(s => ({ ...s, [k]: !s[k] }));
  return (
    <SettingCard title="Notifications" sub="Choose where and when SimPle reaches out.">
      <SettingRow label="Lobby invites" hint="In-app · email" right={<Toggle on={states.lobby} onChange={() => toggle('lobby')} label="" />} />
      <SettingRow label="Friend requests" right={<Toggle on={states.friend} onChange={() => toggle('friend')} label="" />} />
      <SettingRow label="Direct messages" hint="In-app only" right={<Toggle on={states.dm} onChange={() => toggle('dm')} label="" />} />
      <SettingRow label="Match results" hint="Win/loss summaries" right={<Toggle on={states.result} onChange={() => toggle('result')} label="" />} />
      <SettingRow label="Season announcements" right={<Toggle on={states.season} onChange={() => toggle('season')} label="" />} />
      <SettingRow label="Email digest" hint="Weekly · Sunday 19:00" right={<Toggle on={states.digest} onChange={() => toggle('digest')} label="" />} />
    </SettingCard>
  );
}

function PrivacySettings() {
  const [visibility, setVisibility] = useState('Friends');
  const [onlineStatus, setOnlineStatus] = useState(true);
  return (
    <SettingCard title="Privacy" sub="Control who sees you and what they see.">
      <SettingRow label="Profile visibility" right={
        <div className="tabs">
          {['Public', 'Friends', 'Private'].map(d => (
            <button key={d} className={`tab ${d === visibility ? 'tab--active' : ''}`} onClick={() => setVisibility(d)}>{d}</button>
          ))}
        </div>
      } />
      <SettingRow label="Show online status" hint="Friends always see you online" right={<Toggle on={onlineStatus} onChange={setOnlineStatus} label="" />} />
      <SettingRow label="Allow friend requests from" right={
        <div className="tabs">
          {['Anyone', 'Friends-of-friends', 'Off'].map(d => (
            <button key={d} className={`tab ${d === 'Friends-of-friends' ? 'tab--active' : ''}`}>{d}</button>
          ))}
        </div>
      } />
      <SettingRow label="Block list" hint="0 blocked players" right={<Button size="sm" variant="ghost">Manage</Button>} />
    </SettingCard>
  );
}


