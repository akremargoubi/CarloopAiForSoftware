/**
 * Returns the redirect target only when it is an internal path ("/mes-reservations?x=1").
 * Rejects absolute URLs and protocol-relative forms ("//evil.com", "/\evil.com") to prevent
 * open redirects after login.
 */
export function safeRedirect(value: string | null): string | null {
  if (!value || !value.startsWith('/')) return null;
  if (value.startsWith('//') || value.includes('\\')) return null;
  return value;
}
