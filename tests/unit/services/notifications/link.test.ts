import { normalizeNotificationLink } from '@/services/notifications/link';

describe('normalizeNotificationLink', () => {
  it('returns undefined for blank, malformed, or unsafe values', () => {
    expect(normalizeNotificationLink()).toBeUndefined();
    expect(normalizeNotificationLink('   ')).toBeUndefined();
    expect(normalizeNotificationLink('//example.com')).toBeUndefined();
    expect(normalizeNotificationLink('javascript:alert(1)')).toBeUndefined();
    expect(normalizeNotificationLink('not a url')).toBeUndefined();
  });

  it('keeps safe relative and http(s) links', () => {
    expect(normalizeNotificationLink(' /mydata/processes?id=1 ')).toBe('/mydata/processes?id=1');
    expect(normalizeNotificationLink('https://example.com/path')).toBe('https://example.com/path');
    expect(normalizeNotificationLink('http://example.com/path')).toBe('http://example.com/path');
  });
});
