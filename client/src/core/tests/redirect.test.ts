import { describe, expect, it } from 'vitest';
import { safeRedirect } from '../auth/redirect';

describe('safeRedirect', () => {
  it('keeps internal paths with their query string', () => {
    expect(safeRedirect('/reserver?categorie=vidange')).toBe('/reserver?categorie=vidange');
  });

  it('rejects external and protocol-relative targets (open redirect)', () => {
    expect(safeRedirect('https://evil.com')).toBeNull();
    expect(safeRedirect('//evil.com')).toBeNull();
    expect(safeRedirect('/\\evil.com')).toBeNull();
    expect(safeRedirect('javascript:alert(1)')).toBeNull();
    expect(safeRedirect(null)).toBeNull();
  });
});
