import { describe, expect, it } from 'vitest';
import { resolveApiBase } from '@/lib/api-client';

describe('resolveApiBase', () => {
  it('keeps the current local backend default outside production', () => {
    expect(resolveApiBase(undefined, false)).toBe('http://localhost:5147');
  });

  it('uses a relative base in production when no browser-visible backend URL is configured', () => {
    expect(resolveApiBase(undefined, true)).toBe('');
  });

  it('normalizes configured origins without changing an explicit same-origin base', () => {
    expect(resolveApiBase('https://api.example.test/', true)).toBe('https://api.example.test');
    expect(resolveApiBase('/', true)).toBe('');
  });
});
