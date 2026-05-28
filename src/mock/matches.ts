import type { Match } from '@/types';

export const RECENT_MATCHES: Match[] = [
  { id:'m1', game:'Chess Lite',    result:'win',  opponent:'Priya Raman',     duration:'12m 04s', delta:'+18', when:'2h ago' },
  { id:'m2', game:'Tetris Arena',  result:'loss', opponent:'Mateus Oliveira', duration:'4m 22s',  delta:'-12', when:'yesterday' },
  { id:'m3', game:'Online Sudoku', result:'win',  opponent:'AI · Hard',       duration:'7m 11s',  delta:'+9',  when:'yesterday' },
  { id:'m4', game:'Connect Four',  result:'win',  opponent:'Noor Abadi',      duration:'3m 02s',  delta:'+11', when:'2d ago' },
  { id:'m5', game:'Word Duel',     result:'draw', opponent:'Sara Lindqvist',  duration:'6m 48s',  delta:'+1',  when:'3d ago' },
];
