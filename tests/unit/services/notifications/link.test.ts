import { normalizeNotificationLink } from '@/services/notifications/link';

describe('normalizeNotificationLink', () => {
  it('accepts trimmed relative links', () => {
    expect(normalizeNotificationLink(' /review/123 ')).toBe('/review/123');
  });

  it('rejects protocol-relative and malformed links', () => {
    expect(normalizeNotificationLink('//example.com/path')).toBeUndefined();
    expect(normalizeNotificationLink('not a url at all')).toBeUndefined();
  });

  it('accepts http or https and rejects other protocols', () => {
    expect(normalizeNotificationLink('https://example.com/process')).toBe(
      'https://example.com/process',
    );
    expect(normalizeNotificationLink('mailto:test@example.com')).toBeUndefined();
  });

  it('returns undefined for blank input', () => {
    expect(normalizeNotificationLink('   ')).toBeUndefined();
    expect(normalizeNotificationLink(undefined)).toBeUndefined();
  });
});
