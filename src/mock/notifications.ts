import type { Notification } from '@/types';

export const NOTIFICATIONS: Notification[] = [
  { id:'n1', kind:'invite',  from:'Priya Raman',  text:'invited you to a Chess Lite lobby',  when:'just now',  initials:'PR', color:'#38BDF8' },
  { id:'n2', kind:'friend',  from:'Yuki Tanaka',  text:'sent you a friend request',           when:'5m',        initials:'YT', color:'#A78BFA' },
  { id:'n3', kind:'system',  from:'SimPle',       text:'Season 4 ladders open in 2 days',     when:'1h',        initials:'SP', color:'#F0394B' },
  { id:'n4', kind:'achieve', from:'Achievement',  text:'You unlocked Comeback Kid',            when:'yesterday', initials:'!',  color:'#34D399' },
];
