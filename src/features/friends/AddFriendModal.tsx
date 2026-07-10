'use client';
import React, { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { PlayerIdentity } from '@/components/identity/PlayerIdentity';
import { friendsApi } from './friendsApi';
import { friendsErrorMessage } from './friendsErrors';
import type { DiscoveryResultDto } from './types';

interface AddFriendModalProps {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
}

export function AddFriendModal({ open, onClose, onSent }: AddFriendModalProps) {
  const toast = useToast();

  const [username, setUsername]       = useState('');
  const [lookup, setLookup]           = useState<DiscoveryResultDto | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const lookupActive = useRef(false);

  // Reset state whenever modal opens
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUsername('');
       
      setLookup(null);
       
      setLookupError(null);
    }
  }, [open]);

  const handleSearch = async () => {
    const stripped = username.trim().replace(/^@/, '');
    if (!stripped) return;
    if (lookupActive.current) return;

    lookupActive.current = true;
    setLookupLoading(true);
    setLookupError(null);
    setLookup(null);

    try {
      // Safe discovery: exact username, minimal identity only, privacy-preserving.
      // Any ineligible/hidden/nonexistent target returns 404 Profile.NotVisible.
      const result = await friendsApi.discover(stripped);
      setLookup(result);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setLookupError('User not found.');
      } else {
        setLookupError(friendsErrorMessage(e));
      }
    } finally {
      setLookupLoading(false);
      lookupActive.current = false;
    }
  };

  const handleSend = async () => {
    if (!lookup) return;
    setSendLoading(true);
    try {
      const result = await friendsApi.sendRequest(lookup.userId);
      if (result.outcome === 'cross_request_accepted') {
        toast.push({ kind: 'success', title: 'Friend added', body: `You and ${lookup.displayName} are now friends.` });
      } else if (result.outcome === 'already_pending') {
        toast.push({ kind: 'info', title: 'Request already sent', body: `Your request to ${lookup.displayName} is still pending.` });
      } else {
        toast.push({ kind: 'success', title: 'Request sent', body: `${lookup.displayName} will be notified.` });
      }
      onSent();
      onClose();
    } catch (e) {
      toast.push({ kind: 'default', title: 'Error', body: friendsErrorMessage(e) });
    } finally {
      setSendLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !lookupLoading && !lookup) handleSearch();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add friend">
      <div className="col" style={{ gap: 12 }}>
        <div className="row" style={{ gap: 8 }}>
          <input
            className="input"
            style={{ flex: 1 }}
            placeholder="@username"
            value={username}
            onChange={e => { setUsername(e.target.value); setLookup(null); setLookupError(null); }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <Button
            disabled={!username.trim() || lookupLoading}
            onClick={handleSearch}
          >
            {lookupLoading ? 'Searching…' : 'Search'}
          </Button>
        </div>

        {lookupError && (
          <p style={{ fontSize: 13, color: 'var(--danger)', margin: 0 }}>{lookupError}</p>
        )}

        {lookup && (
          <div className="surface row" style={{ padding: 14, gap: 12 }}>
            <PlayerIdentity player={lookup} />
            <Button
              icon="plus"
              disabled={sendLoading}
              onClick={handleSend}
            >
              {sendLoading ? 'Sending…' : 'Send request'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
