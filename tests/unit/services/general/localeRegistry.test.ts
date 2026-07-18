import {
  CANONICAL_SOURCE_APP_LOCALE,
  getLocaleDefinition,
  getLocaleDefinitionByLanguage,
  getLocaleFallbackDefinition,
  hasEnglishFallback,
  hasLocaleFallback,
  LOCALE_REGISTRY,
  normalizeSupportedAppLocale,
  SUPPORTED_APP_LOCALES,
} from '@/services/general/localeRegistry';

describe('localeRegistry', () => {
  it('defines one canonical product locale per language in selector order', () => {
    expect(CANONICAL_SOURCE_APP_LOCALE).toBe('en-US');
    expect(SUPPORTED_APP_LOCALES).toEqual(['zh-CN', 'en-US', 'de-DE', 'fr-FR']);
    expect(new Set(SUPPORTED_APP_LOCALES).size).toBe(SUPPORTED_APP_LOCALES.length);
    expect(new Set(LOCALE_REGISTRY.map(({ languageCode }) => languageCode)).size).toBe(
      LOCALE_REGISTRY.length,
    );
  });

  it('keeps fr_FR at adapter boundaries while the product locale remains fr-FR', () => {
    expect(getLocaleDefinition('fr-FR')).toEqual(
      expect.objectContaining({
        canonicalLocale: 'fr-FR',
        languageCode: 'fr',
        englishName: 'French',
        chineseName: '法语',
        nativeLabel: 'Français',
        aliases: ['fr', 'fr-*', 'fr_*', 'fr_*.UTF-8', 'fr_*.UTF-8@*'],
        direction: 'ltr',
        adapters: {
          antDesign: 'fr_FR',
          dayjs: 'fr',
          intl: 'fr-FR',
          report: 'fr_FR',
        },
        formatting: {
          listSeparator: ', ',
          twoItemConjunction: ' et ',
          manyItemConjunction: ' et ',
        },
        fallbacks: {
          documentationLocale: 'en-US',
          documentationUrl: 'https://docs.tiangong.earth/en',
          legalLocale: 'en-US',
        },
        environment: {
          titleKey: 'APP_TITLE_FR_FR',
          loginSubtitleKey: 'APP_LOGIN_SUBTITLE_FR_FR',
        },
      }),
    );
    expect(getLocaleDefinitionByLanguage('fr')?.canonicalLocale).toBe('fr-FR');
  });

  it.each([
    ['fr', 'fr-FR'],
    ['fr-FR', 'fr-FR'],
    ['fr_CA', 'fr-FR'],
    ['fr_BE.UTF-8@euro', 'fr-FR'],
    ['fr_FR.UTF_8@euro', 'fr-FR'],
    ['fr-FR-u-nu-latn', 'fr-FR'],
  ])('normalizes declared French alias %s to the sole canonical locale', (value, expected) => {
    expect(normalizeSupportedAppLocale(value)).toBe(expected);
  });

  it('does not invent unknown locale definitions', () => {
    expect(getLocaleDefinition('fr_FR')).toBeUndefined();
    expect(getLocaleDefinitionByLanguage('es')).toBeUndefined();
    expect(normalizeSupportedAppLocale('es-ES')).toBeUndefined();
    expect(normalizeSupportedAppLocale('fr_FR_bad')).toBeUndefined();
    expect(normalizeSupportedAppLocale(123 as never)).toBeUndefined();
  });

  it('reports only actual English fallback boundaries', () => {
    expect(hasEnglishFallback('fr-FR')).toBe(true);
    expect(hasEnglishFallback('fr_FR')).toBe(true);
    expect(hasEnglishFallback('zh-CN')).toBe(true);
    expect(hasEnglishFallback('en-US')).toBe(false);
    expect(hasEnglishFallback('es-ES')).toBe(false);
  });

  it.each(LOCALE_REGISTRY)(
    'derives fallback and welcome-asset behavior for $canonicalLocale from the registry',
    (definition) => {
      const documentationFallback = getLocaleFallbackDefinition(
        definition.canonicalLocale,
        'documentationLocale',
      );
      const legalFallback = getLocaleFallbackDefinition(definition.canonicalLocale, 'legalLocale');

      expect(documentationFallback?.canonicalLocale).toBe(definition.fallbacks.documentationLocale);
      expect(legalFallback?.canonicalLocale).toBe(definition.fallbacks.legalLocale);
      expect(hasLocaleFallback(definition.canonicalLocale, 'documentationLocale')).toBe(
        definition.fallbacks.documentationLocale !== definition.canonicalLocale,
      );
      expect(hasLocaleFallback(definition.canonicalLocale, 'legalLocale')).toBe(
        definition.fallbacks.legalLocale !== definition.canonicalLocale,
      );
      expect(definition.assets.welcomeTidas.light).toMatch(/[.]svg$/u);
      expect(definition.assets.welcomeTidas.dark).toMatch(/-dark[.]svg$/u);
    },
  );
});
