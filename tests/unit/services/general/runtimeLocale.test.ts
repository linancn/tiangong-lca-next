jest.mock('umi', () => ({
  __esModule: true,
}));

import { getRuntimeLocale, normalizeRuntimeLocale } from '@/services/general/runtimeLocale';

describe('runtimeLocale', () => {
  it('prefers the Umi locale getter when it exists', () => {
    expect(
      getRuntimeLocale(
        {
          getLocale: () => 'zh_CN.UTF-8',
        },
        {},
      ),
    ).toBe('zh-CN');
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

  it('defaults to en-US when neither Umi nor the environment provide a locale', () => {
    expect(getRuntimeLocale({}, {})).toBe('en-US');
  });

  it('uses process.env as the default runtime environment', () => {
    const originalLocaleEnv = {
      LANG: process.env.LANG,
      LANGUAGE: process.env.LANGUAGE,
      LC_ALL: process.env.LC_ALL,
      LC_MESSAGES: process.env.LC_MESSAGES,
    };
    process.env.LC_ALL = 'fr_FR.UTF-8';
    delete process.env.LC_MESSAGES;
    delete process.env.LANGUAGE;
    delete process.env.LANG;

    try {
      expect(getRuntimeLocale()).toBe('fr-FR');
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

  it('normalizes locale strings from runtime sources', () => {
    expect(normalizeRuntimeLocale('fr_FR.UTF-8')).toBe('fr-FR');
    expect(normalizeRuntimeLocale('')).toBeUndefined();
  });
});
