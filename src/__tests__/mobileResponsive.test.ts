import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(process.cwd(), 'src/styles/globals.css'), 'utf8');

describe('mobile responsive safety rules', () => {
  it('keeps app shell and page containers constrained on small screens', () => {
    expect(css).toContain('max-width: 100vw');
    expect(css).toContain('.app__main');
    expect(css).toContain('min-width: 0');
    expect(css).toContain('@media (max-width: 720px)');
    expect(css).toContain('.app__sidebar { display: none; }');
    expect(css).toContain('.bottomnav { display: flex; }');
  });

  it('stacks major desktop grids and converts wide rows for mobile', () => {
    expect(css).toContain('.responsive-split');
    expect(css).toContain('.responsive-sidebar');
    expect(css).toContain('.responsive-room');
    expect(css).toContain('grid-template-columns: minmax(0, 1fr) !important');
    expect(css).toContain('.leaderboard-row');
    expect(css).toContain('.match-history-row');
    expect(css).toContain('.friends-row');
  });

  it('keeps dropdowns, modals, tabs, and toasts inside the viewport', () => {
    expect(css).toContain('.dropdown-panel');
    expect(css).toContain('max-width: calc(100vw - 24px)');
    expect(css).toContain('.modal, .modal-lg');
    expect(css).toContain('.tabs');
    expect(css).toContain('overflow-x: auto');
    expect(css).toContain('.toast-stack');
  });
});
