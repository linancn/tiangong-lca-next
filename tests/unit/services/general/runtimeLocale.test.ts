jest.mock('umi', () => ({
  __esModule: true,
}));

import {
  DEFAULT_BROWSER_APP_LOCALE,
  getDocumentationUrl,
  getRuntimeLocale,
  normalizeRuntimeLocale,
  publishRuntimeIntlChange,
  rememberManualRuntimeLocale,
  MANUAL_LOCALE_STORAGE_KEY,
  resolveBrowserRuntimeLocale,
  RUNTIME_INTL_CHANGE_EVENT,
  subscribeRuntimeIntlChange,
  UMI_LOCALE_STORAGE_KEY,
} from '@/services/general/runtimeLocale';

const createStorage = (initialValue: string | null = null, key = UMI_LOCALE_STORAGE_KEY) => {
  const values = new Map(initialValue === null ? [] : [[key, initialValue]]);
  return {
    getItem: jest.fn((key: string) => values.get(key) ?? null),
    removeItem: jest.fn((key: string) => {
      values.delete(key);
    }),
    setItem: jest.fn((key: string, nextValue: string) => {
      values.set(key, nextValue);
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
    ['fr', 'fr-FR'],
    ['fr-FR', 'fr-FR'],
    ['fr_CA', 'fr-FR'],
    ['fr_BE.UTF-8@euro', 'fr-FR'],
    ['fr_FR.UTF_8@euro', 'fr-FR'],
    ['fr-Latn-CH', 'fr-FR'],
    ['fr-FR-u-nu-latn', 'fr-FR'],
  ])('normalizes supported BCP47/POSIX locale %s to %s', (value, expected) => {
    expect(normalizeRuntimeLocale(value)).toBe(expected);
  });

  it.each(['', 'es-ES', 'devalue', 'debug', 'de-', 'de--DE', 'de_DE_bad', 'C', 'POSIX'])(
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

  it('publishes only valid registry-backed intl changes and removes subscriptions', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeRuntimeIntlChange(listener);
    const validIntl = {
      locale: 'fr-FR',
      formatMessage: ({ id }: { id: string }) => id,
    };

    window.dispatchEvent(new CustomEvent(RUNTIME_INTL_CHANGE_EVENT));
    window.dispatchEvent(
      new CustomEvent(RUNTIME_INTL_CHANGE_EVENT, {
        detail: { intl: { locale: 'fr-FR' } },
      }),
    );
    window.dispatchEvent(
      new CustomEvent(RUNTIME_INTL_CHANGE_EVENT, {
        detail: {
          intl: {
            locale: 'es-ES',
            formatMessage: ({ id }: { id: string }) => id,
          },
        },
      }),
    );
    publishRuntimeIntlChange({ ...validIntl, locale: 'es-ES' });
    expect(listener).not.toHaveBeenCalled();

    publishRuntimeIntlChange(validIntl);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(validIntl);

    unsubscribe();
    publishRuntimeIntlChange(validIntl);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps detached intl publication and subscription safe without a browser window', () => {
    const listener = jest.fn();

    expect(() =>
      publishRuntimeIntlChange(
        {
          locale: 'en-US',
          formatMessage: ({ id }) => id,
        },
        null,
      ),
    ).not.toThrow();
    const unsubscribe = subscribeRuntimeIntlChange(listener, null);
    expect(() => unsubscribe()).not.toThrow();
    expect(listener).not.toHaveBeenCalled();
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

  it('honors POSIX environment precedence while resolving French canonically', () => {
    expect(
      getRuntimeLocale(
        {},
        {
          LC_ALL: 'fr_FR.UTF-8',
          LC_MESSAGES: 'de_DE.UTF-8',
          LANGUAGE: 'zh_CN:en_US',
          LANG: 'en_US.UTF-8',
        },
      ),
    ).toBe('fr-FR');
  });

  it('skips unsupported Umi and LANGUAGE entries before selecting a supported locale', () => {
    expect(
      getRuntimeLocale(
        {
          getLocale: () => 'es-ES',
        },
        {
          LANGUAGE: 'es_ES:fr_FR:de_AT:en_US',
        },
      ),
    ).toBe('fr-FR');
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
    expect(getRuntimeLocale({ getLocale: () => 'es-ES' }, { LANG: 'C.UTF-8' })).toBe('en-US');
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

  it('migrates a cached French adapter alias to the canonical product locale', () => {
    const storage = createStorage('fr_FR');

    expect(
      resolveBrowserRuntimeLocale({
        storage,
        navigator: { language: 'en-US', languages: ['en-US'] },
      }),
    ).toBe('fr-FR');
    expect(storage.setItem).toHaveBeenCalledWith(UMI_LOCALE_STORAGE_KEY, 'fr-FR');
    expect(storage.setItem).not.toHaveBeenCalledWith(MANUAL_LOCALE_STORAGE_KEY, 'fr-FR');
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
    expect(
      resolveBrowserRuntimeLocale({
        fallbackLocale: 'en-US',
        navigator: null,
        storage: null,
      }),
    ).toBe('en-US');
  });

  it('discards an unsupported cached locale and uses the first supported navigator preference', () => {
    const storage = createStorage('es-ES');

    expect(
      resolveBrowserRuntimeLocale({
        storage,
        navigator: { language: 'en-US', languages: ['es-ES', 'fr-CA', 'de-AT', 'en-US'] },
      }),
    ).toBe('fr-FR');
    expect(storage.removeItem).toHaveBeenCalledWith(UMI_LOCALE_STORAGE_KEY);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('uses the browser default when cache and navigator do not contain a supported locale', () => {
    expect(
      resolveBrowserRuntimeLocale({
        storage: null,
        navigator: { language: 'es-ES', languages: ['es-ES'] },
      }),
    ).toBe(DEFAULT_BROWSER_APP_LOCALE);
    expect(DEFAULT_BROWSER_APP_LOCALE).toBe('en-US');
  });

  it('does not cache automatic language detection when browser preferences change', () => {
    const storage = createStorage();
    expect(
      resolveBrowserRuntimeLocale({ storage, navigator: { languages: ['es-ES', 'fr-CA'] } }),
    ).toBe('fr-FR');
    expect(
      resolveBrowserRuntimeLocale({ storage, navigator: { languages: ['de-AT', 'fr-CA'] } }),
    ).toBe('de-DE');
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('persists only manual choices, overriding both legacy and browser preferences on reopen', () => {
    const storage = createStorage('zh-CN');
    const session = {};
    rememberManualRuntimeLocale('fr-CA', { storage, session });
    expect(storage.setItem).toHaveBeenCalledWith(MANUAL_LOCALE_STORAGE_KEY, 'fr-FR');
    expect(storage.getItem(UMI_LOCALE_STORAGE_KEY)).toBe('zh-CN');
    expect(
      resolveBrowserRuntimeLocale({ storage, session: {}, navigator: { language: 'en-US' } }),
    ).toBe('fr-FR');
  });

  it('retains a supported legacy choice without upgrading its unknown source to manual', () => {
    const storage = createStorage('de-DE');
    expect(resolveBrowserRuntimeLocale({ storage, navigator: { language: 'fr-FR' } })).toBe(
      'de-DE',
    );
    expect(storage.getItem(MANUAL_LOCALE_STORAGE_KEY)).toBeNull();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('canonicalizes manual aliases and discards invalid manual entries before legacy detection', () => {
    const storage = createStorage('fr_CA', MANUAL_LOCALE_STORAGE_KEY);
    expect(resolveBrowserRuntimeLocale({ storage, navigator: null })).toBe('fr-FR');
    expect(storage.setItem).toHaveBeenCalledWith(MANUAL_LOCALE_STORAGE_KEY, 'fr-FR');
    storage.setItem(MANUAL_LOCALE_STORAGE_KEY, 'es-ES');
    storage.setItem(UMI_LOCALE_STORAGE_KEY, 'de-DE');
    expect(resolveBrowserRuntimeLocale({ storage, navigator: null })).toBe('de-DE');
    expect(storage.removeItem).toHaveBeenCalledWith(MANUAL_LOCALE_STORAGE_KEY);
  });

  it('keeps a manual choice in the current document when storage writes fail', () => {
    const storage = createStorage();
    storage.setItem.mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    const session = {};
    rememberManualRuntimeLocale('de-AT', { storage, session });
    expect(
      resolveBrowserRuntimeLocale({ storage, session, navigator: { language: 'fr-FR' } }),
    ).toBe('de-DE');
    expect(
      resolveBrowserRuntimeLocale({ storage, session: {}, navigator: { language: 'fr-FR' } }),
    ).toBe('fr-FR');
  });

  it('supports memory-only manual choices and ignores unsupported choices', () => {
    const session = {};
    rememberManualRuntimeLocale('es-ES', { storage: null, session });
    expect(session).toEqual({});
    rememberManualRuntimeLocale('fr-FR', { storage: null, session });
    expect(resolveBrowserRuntimeLocale({ session, storage: null, navigator: null })).toBe('fr-FR');
    rememberManualRuntimeLocale('de-DE', { session: null, storage: null });
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

  it('routes German, French, and English app locales to English docs without fake routes', () => {
    expect(getDocumentationUrl()).toBe('https://docs.tiangong.earth/en');
    expect(getDocumentationUrl('de-DE')).toBe('https://docs.tiangong.earth/en');
    expect(getDocumentationUrl('de-CH')).toBe('https://docs.tiangong.earth/en');
    expect(getDocumentationUrl('en-US')).toBe('https://docs.tiangong.earth/en');
    expect(getDocumentationUrl('zh-CN')).toBe('https://docs.tiangong.earth');
    expect(getDocumentationUrl('fr-FR')).toBe('https://docs.tiangong.earth/en');
    expect(getDocumentationUrl('fr-CA')).toBe('https://docs.tiangong.earth/en');
    expect(getDocumentationUrl('fr_FR.UTF-8')).toBe('https://docs.tiangong.earth/en');
  });
});
