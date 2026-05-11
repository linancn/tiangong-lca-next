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

  it('normalizes locale strings from runtime sources', () => {
    expect(normalizeRuntimeLocale('fr_FR.UTF-8')).toBe('fr-FR');
    expect(normalizeRuntimeLocale('')).toBeUndefined();
  });
});
