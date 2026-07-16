jest.mock('umi', () => ({
  __esModule: true,
}));

import {
  DEFAULT_BROWSER_APP_LOCALE,
  getDocumentationUrl,
  getRuntimeLocale,
  normalizeRuntimeLocale,
  resolveBrowserRuntimeLocale,
  UMI_LOCALE_STORAGE_KEY,
} from '@/services/general/runtimeLocale';

const createStorage = (initialValue: string | null = null) => {
  let value = initialValue;
  return {
    getItem: jest.fn(() => value),
    removeItem: jest.fn(() => {
      value = null;
    }),
    setItem: jest.fn((_key: string, nextValue: string) => {
      value = nextValue;
    }),
  };
};

describe('runtimeLocale', () => {
  it.each([
    ['zh', 'zh-CN'],
    ['zh_TW.UTF-8', 'zh-CN'],
    ['en', 'en-US'],
    ['en_GB.UTF-8', 'en-US'],
    ['de', 'de-DE'],
    ['de-DE', 'de-DE'],
    ['de_AT', 'de-DE'],
    ['de_CH.UTF-8', 'de-DE'],
    ['de_DE.UTF-8@euro', 'de-DE'],
    ['de-Latn-DE', 'de-DE'],
    ['de-DE-u-co-phonebk', 'de-DE'],
  ])('normalizes supported BCP47/POSIX locale %s to %s', (value, expected) => {
    expect(normalizeRuntimeLocale(value)).toBe(expected);
  });

  it.each(['', 'fr-FR', 'devalue', 'debug', 'de-', 'de--DE', 'de_DE_bad', 'C', 'POSIX'])(
    'rejects unsupported or malformed locale %p',
    (value) => {
      expect(normalizeRuntimeLocale(value)).toBeUndefined();
    },
  );

  it('rejects locale input when Intl canonicalization is unavailable', () => {
    const canonicalLocalesDescriptor = Object.getOwnPropertyDescriptor(Intl, 'getCanonicalLocales');
    Object.defineProperty(Intl, 'getCanonicalLocales', {
      configurable: true,
      value: undefined,
    });

    try {
      expect(normalizeRuntimeLocale('de-DE')).toBeUndefined();
    } finally {
      if (canonicalLocalesDescriptor) {
        Object.defineProperty(Intl, 'getCanonicalLocales', canonicalLocalesDescriptor);
      } else {
        Reflect.deleteProperty(Intl, 'getCanonicalLocales');
      }
    }
  });

  it('prefers the Umi locale getter when it returns a supported locale', () => {
    expect(
      getRuntimeLocale(
        {
          getLocale: () => 'de_CH.UTF-8',
        },
        {},
      ),
    ).toBe('de-DE');
  });

  it('falls back to environment locale values when Umi getLocale is unavailable', () => {
    expect(
      getRuntimeLocale(
        {},
        {
          LANG: 'en_US.UTF-8',
        },
      ),
    ).toBe('en-US');
  });

  it('skips unsupported Umi and LANGUAGE entries before selecting a supported locale', () => {
    expect(
      getRuntimeLocale(
        {
          getLocale: () => 'fr-FR',
        },
        {
          LANGUAGE: 'fr_FR:de_AT:en_US',
        },
      ),
    ).toBe('de-DE');
  });

  it('falls back to environment locale values when the Umi getter throws', () => {
    expect(
      getRuntimeLocale(
        {
          getLocale: () => {
            throw new Error('Umi runtime not initialized');
          },
        },
        {
          LANGUAGE: 'zh_CN.UTF-8',
        },
      ),
    ).toBe('zh-CN');
  });

  it('defaults Node/service consumers to en-US when no supported locale exists', () => {
    expect(getRuntimeLocale({}, {})).toBe('en-US');
    expect(getRuntimeLocale({ getLocale: () => 'fr-FR' }, { LANG: 'C.UTF-8' })).toBe('en-US');
  });

  it('uses process.env as the default runtime environment without leaking unsupported locales', () => {
    const originalLocaleEnv = {
      LANG: process.env.LANG,
      LANGUAGE: process.env.LANGUAGE,
      LC_ALL: process.env.LC_ALL,
      LC_MESSAGES: process.env.LC_MESSAGES,
    };
    process.env.LC_ALL = 'de_AT.UTF-8';
    delete process.env.LC_MESSAGES;
    delete process.env.LANGUAGE;
    delete process.env.LANG;

    try {
      expect(getRuntimeLocale()).toBe('de-DE');
    } finally {
      for (const [key, value] of Object.entries(originalLocaleEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });

  it('uses an empty default environment when process.env is unavailable', () => {
    const originalEnv = process.env;
    Object.defineProperty(process, 'env', {
      configurable: true,
      value: undefined,
    });

    try {
      expect(getRuntimeLocale({})).toBe('en-US');
    } finally {
      Object.defineProperty(process, 'env', {
        configurable: true,
        value: originalEnv,
      });
    }
  });

  it('prefers a cached locale and migrates a stale German alias before browser render', () => {
    const storage = createStorage('de_CH');

    expect(
      resolveBrowserRuntimeLocale({
        storage,
        navigator: { language: 'zh-CN', languages: ['zh-CN'] },
      }),
    ).toBe('de-DE');
    expect(storage.setItem).toHaveBeenCalledWith(UMI_LOCALE_STORAGE_KEY, 'de-DE');
  });

  it('uses the default browser storage and navigator before the first render', () => {
    window.localStorage.setItem(UMI_LOCALE_STORAGE_KEY, 'de_AT');

    try {
      expect(resolveBrowserRuntimeLocale()).toBe('de-DE');
      expect(window.localStorage.getItem(UMI_LOCALE_STORAGE_KEY)).toBe('de-DE');
    } finally {
      window.localStorage.removeItem(UMI_LOCALE_STORAGE_KEY);
    }
  });

  it('falls back safely when the browser localStorage getter is blocked', () => {
    const localStorageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('blocked');
      },
    });

    try {
      expect(resolveBrowserRuntimeLocale({ navigator: { language: 'de-AT' } })).toBe('de-DE');
    } finally {
      if (localStorageDescriptor) {
        Object.defineProperty(window, 'localStorage', localStorageDescriptor);
      } else {
        Reflect.deleteProperty(window, 'localStorage');
      }
    }
  });

  it('uses the configured fallback outside a browser runtime', () => {
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: undefined,
    });

    try {
      expect(resolveBrowserRuntimeLocale({ fallbackLocale: 'en-US' })).toBe('en-US');
    } finally {
      if (windowDescriptor) {
        Object.defineProperty(globalThis, 'window', windowDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, 'window');
      }
      if (navigatorDescriptor) {
        Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, 'navigator');
      }
    }
  });

  it('discards an unsupported cached locale and uses the first supported navigator preference', () => {
    const storage = createStorage('fr-FR');

    expect(
      resolveBrowserRuntimeLocale({
        storage,
        navigator: { language: 'en-US', languages: ['fr-FR', 'de-AT', 'en-US'] },
      }),
    ).toBe('de-DE');
    expect(storage.removeItem).toHaveBeenCalledWith(UMI_LOCALE_STORAGE_KEY);
    expect(storage.setItem).toHaveBeenCalledWith(UMI_LOCALE_STORAGE_KEY, 'de-DE');
  });

  it('uses the browser default when cache and navigator do not contain a supported locale', () => {
    expect(
      resolveBrowserRuntimeLocale({
        storage: null,
        navigator: { language: 'fr-FR', languages: ['fr-FR'] },
      }),
    ).toBe(DEFAULT_BROWSER_APP_LOCALE);
  });

  it('keeps locale bootstrap safe when storage access is denied', () => {
    const storage = {
      getItem: jest.fn(() => {
        throw new Error('denied');
      }),
      removeItem: jest.fn(() => {
        throw new Error('denied');
      }),
      setItem: jest.fn(() => {
        throw new Error('denied');
      }),
    };

    expect(
      resolveBrowserRuntimeLocale({
        storage,
        navigator: { language: 'de-AT' },
      }),
    ).toBe('de-DE');
  });

  it('routes German and English app locales to English docs without inventing /de', () => {
    expect(getDocumentationUrl('de-DE')).toBe('https://docs.tiangong.earth/en');
    expect(getDocumentationUrl('de-CH')).toBe('https://docs.tiangong.earth/en');
    expect(getDocumentationUrl('en-US')).toBe('https://docs.tiangong.earth/en');
    expect(getDocumentationUrl('zh-CN')).toBe('https://docs.tiangong.earth');
    expect(getDocumentationUrl('fr-FR')).toBe('https://docs.tiangong.earth');
  });
});
