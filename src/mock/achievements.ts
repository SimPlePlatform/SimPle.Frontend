import type { Achievement } from '@/types';

export const ACHIEVEMENTS: Achievement[] = [
  { id:'a1', name:'First Blood',   desc:'Win your first ranked match.',         unlocked:true,  rarity:'common' },
  { id:'a2', name:'Strategist',    desc:'Win 10 strategy games.',               unlocked:true,  rarity:'rare' },
  { id:'a3', name:'Comeback Kid',  desc:'Win after being down 80%.',            unlocked:true,  rarity:'epic' },
  { id:'a4', name:'Sudoku Master', desc:'Solve a Master grid under 5 minutes.', unlocked:false, rarity:'legendary', progress:0.6 },
  { id:'a5', name:'Friendship+',   desc:'Add 10 friends.',                      unlocked:true,  rarity:'common' },
  { id:'a6', name:'Insomniac',     desc:'Play 5 games after midnight.',         unlocked:false, rarity:'rare', progress:0.4 },
];
