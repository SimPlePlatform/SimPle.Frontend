import type { LobbySlot } from '@/types';
import { CURRENT_USER } from './users';
import { FRIENDS } from './friends';

export const DEFAULT_LOBBY_SLOTS: LobbySlot[] = [
  { kind:'host',   user: CURRENT_USER, ready:true  },
  { kind:'friend', user: FRIENDS[0],   ready:true  },
  { kind:'empty' },
  { kind:'empty' },
];

export const DEFAULT_LOBBY_CHAT = [
  { from:'Priya', text:"gg let's go",           color:'#38BDF8', initials:'PR', when:'-2m' },
  { from:'You',   text:'one sec, grabbing water', color:'#F0394B', initials:'AK', when:'-1m', me:true },
  { from:'Priya', text:'all good 👍',            color:'#38BDF8', initials:'PR', when:'-30s' },
];
