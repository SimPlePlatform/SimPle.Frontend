/**
 * Tests for the passwordStrength logic used in both AuthPage and ResetPasswordPage.
 * The function is tested indirectly through the shared logic definition here.
 */

// Inline the same function from AuthPage/ResetPasswordPage for unit testing:
function passwordStrength(password: string) {
  if (!password) return { score: 0, label: '', color: 'var(--border-1)', pct: 0 };
  const len = password.length;
  const hasUpper   = /[A-Z]/.test(password);
  const hasLower   = /[a-z]/.test(password);
  const hasDigit   = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const variety = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
  if (len < 8 || variety < 2) return { score: 1, label: 'Too weak',    color: '#EF4444', pct: 20 };
  if (len < 10 || variety < 3) return { score: 2, label: 'Weak',       color: '#F97316', pct: 40 };
  if (len < 12 || variety < 3) return { score: 3, label: 'Fair',       color: '#EAB308', pct: 60 };
  if (len < 14 || variety < 4) return { score: 4, label: 'Strong',     color: '#3B82F6', pct: 80 };
  return                              { score: 5, label: 'Very strong', color: '#22C55E', pct: 100 };
}

describe('passwordStrength', () => {
  it('returns score 0 for empty string', () => {
    const r = passwordStrength('');
    expect(r.score).toBe(0);
    expect(r.label).toBe('');
    expect(r.pct).toBe(0);
  });

  it('score 1 – Too weak: short password', () => {
    const r = passwordStrength('abc');
    expect(r.score).toBe(1);
    expect(r.label).toBe('Too weak');
    expect(r.pct).toBe(20);
  });

  it('score 1 – Too weak: 8+ chars but only one character category', () => {
    const r = passwordStrength('alllowercase');
    expect(r.score).toBe(1);
    expect(r.label).toBe('Too weak');
  });

  it('score 2 – Weak: 8 chars with two categories', () => {
    // lowercase + digit, exactly 8 chars
    const r = passwordStrength('abcd1234');
    expect(r.score).toBe(2);
    expect(r.label).toBe('Weak');
    expect(r.pct).toBe(40);
  });

  it('score 3 – Fair: 10+ chars but fewer than four categories', () => {
    // uppercase + lowercase + digit, 10 chars
    const r = passwordStrength('Abcdef1234');
    expect(r.score).toBe(3);
    expect(r.label).toBe('Fair');
    expect(r.pct).toBe(60);
  });

  it('score 4 – Strong: 12+ chars with three categories', () => {
    // uppercase + lowercase + digit, 12 chars
    const r = passwordStrength('Abcdefgh1234');
    expect(r.score).toBe(4);
    expect(r.label).toBe('Strong');
    expect(r.pct).toBe(80);
  });

  it('score 5 – Very strong: 14+ chars with all four categories', () => {
    const r = passwordStrength('Abcdefgh1234!@');
    expect(r.score).toBe(5);
    expect(r.label).toBe('Very strong');
    expect(r.pct).toBe(100);
  });

  it('special characters alone raise variety count', () => {
    // lowercase + special = 2 categories, 8 chars → Weak (score 2)
    const r = passwordStrength('abc!@#$%');
    expect(r.score).toBe(2);
  });
});
