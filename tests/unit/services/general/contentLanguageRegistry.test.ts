import {
  AUTHORING_CONTENT_LANGUAGES,
  CANONICAL_CONTENT_LANGUAGE,
  CONTENT_LANGUAGE_OPTIONS,
  CONTENT_LANGUAGE_REGISTRY,
  getLanguageDisplayName,
  getServiceQueryLanguage,
  normalizeSupportedContentLanguage,
  REQUIRED_CONTENT_LANGUAGES,
  requireServiceQueryLanguage,
  resolveContentLanguage,
  resolveContentLanguages,
  resolveServiceQueryLanguage,
  SUPPORTED_CONTENT_LANGUAGES,
} from '@/services/general/contentLanguageRegistry';

describe('contentLanguageRegistry', () => {
  it('derives supported, authoring, required, and option lists from one registry', () => {
    expect(CANONICAL_CONTENT_LANGUAGE).toBe('en');
    expect(SUPPORTED_CONTENT_LANGUAGES).toEqual(['en', 'zh', 'de', 'fr']);
    expect(AUTHORING_CONTENT_LANGUAGES).toEqual(SUPPORTED_CONTENT_LANGUAGES);
    expect(REQUIRED_CONTENT_LANGUAGES).toEqual(['en']);
    expect(CONTENT_LANGUAGE_OPTIONS).toEqual([
      { value: 'en', label: 'English' },
      { value: 'zh', label: '简体中文' },
      { value: 'de', label: 'Deutsch' },
      { value: 'fr', label: 'Français' },
    ]);
    expect(new Set(CONTENT_LANGUAGE_REGISTRY.map(({ appLocale }) => appLocale)).size).toBe(
      CONTENT_LANGUAGE_REGISTRY.length,
    );
  });

  it.each([
    ['zh-CN', 'zh'],
    ['en_US', 'en'],
    ['de_DE.UTF-8', 'de'],
    ['fr-FR', 'fr'],
    ['fr', 'fr'],
  ])('normalizes %s through the UI/content boundary', (value, expected) => {
    expect(normalizeSupportedContentLanguage(value)).toBe(expected);
    expect(resolveContentLanguage(value)).toBe(expected);
  });

  it('falls back to canonical English only for unsupported input', () => {
    expect(normalizeSupportedContentLanguage('es-ES')).toBeUndefined();
    expect(resolveContentLanguage('es-ES')).toBe('en');
  });

  it('keeps requested content separate from its ordered read fallback', () => {
    expect(resolveContentLanguages('de-DE')).toEqual(['de', 'en']);
    expect(resolveContentLanguages('fr')).toEqual(['fr', 'en']);
    expect(resolveContentLanguages('zh-CN')).toEqual(['zh', 'en']);
    expect(resolveContentLanguages('en-US')).toEqual(['en']);
  });

  it('declares backend query fallback independently from content reading', () => {
    expect(resolveServiceQueryLanguage('de-DE')).toEqual({
      requestedLanguage: 'de',
      resolvedLanguage: 'en',
      status: 'declared-fallback',
      disclosure: 'diagnostic',
      usedFallback: true,
    });
    expect(resolveServiceQueryLanguage('zh-CN')).toEqual({
      requestedLanguage: 'zh',
      resolvedLanguage: 'zh',
      status: 'native',
      disclosure: 'none',
      usedFallback: false,
    });
    expect(getServiceQueryLanguage('fr-FR')).toBe('en');
  });

  it('fails closed when a future content language declares service queries unsupported', () => {
    expect(() =>
      requireServiceQueryLanguage({
        requestedLanguage: 'de',
        status: 'unsupported',
        disclosure: 'diagnostic',
        usedFallback: false,
      }),
    ).toThrow('Content language de has no supported service-query language.');
  });

  it('emits a declared service-query fallback diagnostic only once', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getServiceQueryLanguage('de-DE')).toBe('en');
    expect(getServiceQueryLanguage('de-DE')).toBe('en');

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('de uses en for the current service query boundary'),
    );
    consoleWarnSpy.mockRestore();
  });

  it('uses native labels for declared languages and a non-dash label for unknown codes', () => {
    expect(getLanguageDisplayName('de')).toBe('Deutsch');
    expect(getLanguageDisplayName('fr')).toBe('Français');
    expect(getLanguageDisplayName('ja', 'en-US')).toBe('Japanese');
    expect(getLanguageDisplayName('not_a_language', 'en-US')).toBe('not_a_language');
  });
});
