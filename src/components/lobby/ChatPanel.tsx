'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icons';
import type { ChatMessage } from '@/types';

interface ChatPanelProps {
  chat: ChatMessage[];
  onSend: (text: string) => void;
  title?: string;
  compact?: boolean;
}

export function ChatPanel({ chat, onSend, title = 'Chat', compact = false }: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [chat]);

  const send = () => {
    if (!draft.trim()) return;
    onSend(draft.trim());
    setDraft('');
  };

  return (
    <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: compact ? 280 : 320 }}>
      <div className="row between" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-1)' }}>
        <div className="row" style={{ gap: 8 }}>
          <Icon name="message" size={14} style={{ color: 'var(--text-lo)' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>{title}</div>
        </div>
        <span className="chip chip--mono">{chat.length}</span>
      </div>
      <div ref={ref} style={{ flex: 1, overflow: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {chat.map((m, i) => (
          <div key={i} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <Avatar user={{ initials: m.initials, color: m.color }} size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row" style={{ gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: m.me ? 'var(--red-400)' : 'var(--text-hi)' }}>{m.from}</span>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-lo)' }}>{m.when}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-md)', marginTop: 2 }}>{m.text}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border-1)', display: 'flex', gap: 8 }}>
        <input
          className="input"
          placeholder="Message…"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          style={{ flex: 1 }}
        />
        <Button size="md" icon="send" onClick={send} />
      </div>
    </div>
  );
}
