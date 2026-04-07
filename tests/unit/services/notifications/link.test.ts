import { normalizeNotificationLink } from '@/services/notifications/link';

describe('normalizeNotificationLink', () => {
  it('returns undefined for blank, malformed, protocol-relative, or unsafe values', () => {
    expect(normalizeNotificationLink()).toBeUndefined();
    expect(normalizeNotificationLink('   ')).toBeUndefined();
    expect(normalizeNotificationLink('//example.com')).toBeUndefined();
    expect(normalizeNotificationLink('//example.com/path')).toBeUndefined();
    expect(normalizeNotificationLink('javascript:alert(1)')).toBeUndefined();
    expect(normalizeNotificationLink('not a url')).toBeUndefined();
    expect(normalizeNotificationLink('not a url at all')).toBeUndefined();
    expect(normalizeNotificationLink('mailto:test@example.com')).toBeUndefined();
  });

  it('keeps safe relative and http(s) links', () => {
    expect(normalizeNotificationLink(' /review/123 ')).toBe('/review/123');
    expect(normalizeNotificationLink(' /mydata/processes?id=1 ')).toBe('/mydata/processes?id=1');
    expect(normalizeNotificationLink('https://example.com/process')).toBe(
      'https://example.com/process',
    );
    expect(normalizeNotificationLink('https://example.com/path')).toBe('https://example.com/path');
    expect(normalizeNotificationLink('http://example.com/path')).toBe('http://example.com/path');
  });
});
