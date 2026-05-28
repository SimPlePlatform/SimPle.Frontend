export function shade(hex: string, amt: number): string {
  const c = parseInt(hex.replace('#', ''), 16);
  let r = (c >> 16) + amt, g = ((c >> 8) & 0xff) + amt, b = (c & 0xff) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function presenceColor(status: string): string {
  switch (status) {
    case 'online':  return 'var(--presence-online)';
    case 'playing': return 'var(--presence-playing)';
    case 'away':    return 'var(--presence-away)';
    default:        return 'var(--presence-offline)';
  }
}

export function presenceDotClass(status: string): string {
  switch (status) {
    case 'online':  return 'dot--online';
    case 'playing': return 'dot--playing';
    case 'away':    return 'dot--away';
    default:        return 'dot--offline';
  }
}

export function rarityBg(r: string): string {
  switch (r) {
    case 'legendary': return 'rgba(245,158,11,0.12)';
    case 'epic':      return 'rgba(167,139,250,0.12)';
    case 'rare':      return 'rgba(56,189,248,0.10)';
    default:          return 'rgba(52,211,153,0.10)';
  }
}

export function rarityFg(r: string): string {
  switch (r) {
    case 'legendary': return '#F59E0B';
    case 'epic':      return '#A78BFA';
    case 'rare':      return '#38BDF8';
    default:          return '#34D399';
  }
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
