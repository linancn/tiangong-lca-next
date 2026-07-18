import {
  formatLocaleDateTime,
  formatLocaleList,
  getLocaleListSeparator,
} from '@/utils/localeFormatting';

describe('localeFormatting', () => {
  it.each([
    ['en-US', /Overview.*Classification.*Contact information/],
    ['de-DE', /Übersicht.*Klassifizierung.*Kontaktinformationen/],
    ['fr-FR', /Vue d’ensemble.*Classification.*Coordonnées/],
    ['zh-CN', /概览.*分类.*联系信息/],
  ])('formats lists with the canonical %s locale', (locale, expected) => {
    const items =
      locale === 'de-DE'
        ? ['Übersicht', 'Klassifizierung', 'Kontaktinformationen']
        : locale === 'fr-FR'
          ? ['Vue d’ensemble', 'Classification', 'Coordonnées']
          : locale === 'zh-CN'
            ? ['概览', '分类', '联系信息']
            : ['Overview', 'Classification', 'Contact information'];

    expect(formatLocaleList(items, locale)).toMatch(expected);
  });

  it('drops blank list entries and falls back to English without a locale', () => {
    expect(formatLocaleList(['Overview', '  ', 'Contact information'])).toBe(
      'Overview and Contact information',
    );
  });

  it('normalizes French adapter and POSIX aliases before formatting', () => {
    expect(formatLocaleList(['Vue d’ensemble', 'Coordonnées'], 'fr_FR.UTF-8')).toBe(
      'Vue d’ensemble et Coordonnées',
    );
  });

  it('uses deterministic conjunction fallbacks when Intl.ListFormat is unavailable', () => {
    const listFormatDescriptor = Object.getOwnPropertyDescriptor(Intl, 'ListFormat');
    Object.defineProperty(Intl, 'ListFormat', {
      configurable: true,
      value: undefined,
    });

    try {
      expect(formatLocaleList([], 'en-US')).toBe('');
      expect(formatLocaleList(['Overview'], 'en-US')).toBe('Overview');
      expect(formatLocaleList(['Übersicht', 'Kontaktinformationen'], 'de-DE')).toBe(
        'Übersicht und Kontaktinformationen',
      );
      expect(
        formatLocaleList(['Übersicht', 'Klassifizierung', 'Kontaktinformationen'], 'de-DE'),
      ).toBe('Übersicht, Klassifizierung und Kontaktinformationen');
      expect(formatLocaleList(['概览', '分类', '联系信息'], 'zh-CN')).toBe('概览、分类和联系信息');
      expect(formatLocaleList(['Vue d’ensemble', 'Coordonnées'], 'fr-FR')).toBe(
        'Vue d’ensemble et Coordonnées',
      );
      expect(formatLocaleList(['Vue d’ensemble', 'Classification', 'Coordonnées'], 'fr-FR')).toBe(
        'Vue d’ensemble, Classification et Coordonnées',
      );
      expect(formatLocaleList(['Overview', 'Classification', 'Contact information'], 'en-US')).toBe(
        'Overview, Classification, and Contact information',
      );
    } finally {
      if (listFormatDescriptor) {
        Object.defineProperty(Intl, 'ListFormat', listFormatDescriptor);
      } else {
        Reflect.deleteProperty(Intl, 'ListFormat');
      }
    }
  });

  it('falls back when Intl.ListFormat rejects the requested locale', () => {
    expect(formatLocaleList(['Overview', 'Contact information'], 'invalid_locale')).toBe(
      'Overview and Contact information',
    );
  });

  it('uses the deterministic list fallback when Intl.ListFormat throws', () => {
    const listFormatDescriptor = Object.getOwnPropertyDescriptor(Intl, 'ListFormat');
    class ThrowingListFormat {
      constructor() {
        throw new RangeError('formatter unavailable');
      }
    }
    Object.defineProperty(Intl, 'ListFormat', {
      configurable: true,
      value: ThrowingListFormat,
    });

    try {
      expect(formatLocaleList(['Vue d’ensemble', 'Coordonnées'], 'fr-FR')).toBe(
        'Vue d’ensemble et Coordonnées',
      );
    } finally {
      if (listFormatDescriptor) {
        Object.defineProperty(Intl, 'ListFormat', listFormatDescriptor);
      } else {
        Reflect.deleteProperty(Intl, 'ListFormat');
      }
    }
  });

  it.each([
    ['en-US', 0, ', '],
    ['en-US', 1, ', and '],
    ['de-DE', 0, ', '],
    ['de-DE', 1, ' und '],
    ['fr-FR', 0, ', '],
    ['fr-FR', 1, ' et '],
    ['zh-CN', 0, '、'],
    ['zh-CN', 1, '和'],
  ])('returns the %s literal after item %d for interactive lists', (locale, index, expected) => {
    expect(getLocaleListSeparator(index, 3, locale)).toBe(expected);
  });

  it('returns no separator outside the range between adjacent items', () => {
    expect(getLocaleListSeparator(-1, 3, 'de-DE')).toBe('');
  });

  it('uses a stable separator when a formatter omits the adjacent placeholders', () => {
    const listFormatDescriptor = Object.getOwnPropertyDescriptor(Intl, 'ListFormat');
    class PlaceholderDroppingListFormat {
      format() {
        return 'unusable formatter output';
      }
    }
    Object.defineProperty(Intl, 'ListFormat', {
      configurable: true,
      value: PlaceholderDroppingListFormat,
    });

    try {
      expect(getLocaleListSeparator(0, 2, 'en-US')).toBe(', ');
    } finally {
      if (listFormatDescriptor) {
        Object.defineProperty(Intl, 'ListFormat', listFormatDescriptor);
      } else {
        Reflect.deleteProperty(Intl, 'ListFormat');
      }
    }
  });

  it('formats valid timestamps for the requested locale and preserves invalid raw values', () => {
    const value = '2026-07-16T08:30:00Z';

    expect(formatLocaleDateTime(value, 'de-DE')).toBe(
      new Intl.DateTimeFormat('de-DE', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      }).format(Date.parse(value)),
    );
    expect(formatLocaleDateTime(value, 'fr-FR')).toBe(
      new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      }).format(Date.parse(value)),
    );
    expect(formatLocaleDateTime('not-a-date', 'de-DE')).toBe('not-a-date');
  });

  it('defaults valid timestamps to English and recovers from unsupported locales', () => {
    const value = '2026-07-16T08:30:00Z';
    const timestamp = Date.parse(value);

    expect(formatLocaleDateTime(value)).toBe(
      new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      }).format(timestamp),
    );
    expect(formatLocaleDateTime(value, 'invalid_locale')).toBe(
      new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      }).format(timestamp),
    );
  });

  it('uses the stable date fallback when Intl.DateTimeFormat throws', () => {
    const dateTimeFormatDescriptor = Object.getOwnPropertyDescriptor(Intl, 'DateTimeFormat');
    const value = '2026-07-16T08:30:00Z';
    const expected = new Date(Date.parse(value)).toLocaleString('en-US');
    class ThrowingDateTimeFormat {
      constructor() {
        throw new RangeError('formatter unavailable');
      }
    }
    Object.defineProperty(Intl, 'DateTimeFormat', {
      configurable: true,
      value: ThrowingDateTimeFormat,
    });

    try {
      expect(formatLocaleDateTime(value, 'fr-FR')).toBe(expected);
    } finally {
      if (dateTimeFormatDescriptor) {
        Object.defineProperty(Intl, 'DateTimeFormat', dateTimeFormatDescriptor);
      } else {
        Reflect.deleteProperty(Intl, 'DateTimeFormat');
      }
    }
  });
});
