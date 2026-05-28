import type { Friend, FriendRequest, SuggestedUser } from '@/types';

export const FRIENDS: Friend[] = [
  { id:'f1', display:'Priya Raman',     initials:'PR', color:'#38BDF8', status:'online',  activity:'In lobby · Chess Lite',  elo:1910, level:31 },
  { id:'f2', display:'Mateus Oliveira', initials:'MO', color:'#A78BFA', status:'playing', activity:'Playing Tetris Arena',   elo:1675, level:18 },
  { id:'f3', display:'Sara Lindqvist',  initials:'SL', color:'#34D399', status:'online',  activity:'Idle on dashboard',      elo:2104, level:42 },
  { id:'f4', display:'Kenji Sato',      initials:'KS', color:'#F59E0B', status:'away',    activity:'Away · 12m',             elo:1538, level:12 },
  { id:'f5', display:'Noor Abadi',      initials:'NA', color:'#F472B6', status:'playing', activity:'Playing Connect Four',   elo:1782, level:25 },
  { id:'f6', display:'Diego Hernández', initials:'DH', color:'#22D3EE', status:'offline', activity:'Last seen 2h ago',       elo:1444, level:9  },
  { id:'f7', display:'Anya Volkov',     initials:'AV', color:'#FB7185', status:'online',  activity:'Browsing library',       elo:1990, level:28 },
  { id:'f8', display:'Tomás Ribeiro',   initials:'TR', color:'#38BDF8', status:'offline', activity:'Last seen yesterday',    elo:1320, level:6  },
];

export const FRIEND_REQUESTS: FriendRequest[] = [
  { id:'r1', display:'Yuki Tanaka', initials:'YT', color:'#A78BFA', mutual: 3 },
  { id:'r2', display:'Lara Costa',  initials:'LC', color:'#34D399', mutual: 7 },
];

export const SUGGESTED: SuggestedUser[] = [
  { id:'s1', display:'Idris Khan',   initials:'IK', color:'#F0394B', mutual: 4, elo:1801 },
  { id:'s2', display:'Hana Park',    initials:'HP', color:'#22D3EE', mutual: 2, elo:1644 },
  { id:'s3', display:'Robin Becker', initials:'RB', color:'#F59E0B', mutual: 5, elo:1925 },
];
