export type LocaleDirection = 'ltr' | 'rtl';

export type LocaleDefinition = {
  canonicalLocale: string;
  languageCode: string;
  englishName: string;
  chineseName: string;
  nativeLabel: string;
  aliases: readonly string[];
  direction: LocaleDirection;
  adapters: {
    antDesign: string;
    dayjs: string;
    intl: string;
    report: string;
  };
  formatting: {
    listSeparator: string;
    twoItemConjunction: string;
    manyItemConjunction: string;
  };
  assets: {
    welcomeTidas: {
      light: string;
      dark: string;
    };
  };
  fallbacks: {
    documentationLocale: string;
    documentationUrl: string;
    legalLocale: string;
  };
  environment: {
    titleKey: string;
    loginSubtitleKey: string;
  };
};

const DOCUMENTATION_BASE_URL = 'https://docs.tiangong.earth';

/**
 * Product-locale source of truth. Adapter names and fallback locales describe
 * integration boundaries; they never create a second product locale bundle.
 * Umi remains the owner of each locale's native flag icon.
 */
export const LOCALE_REGISTRY = [
  {
    canonicalLocale: 'zh-CN',
    languageCode: 'zh',
    englishName: 'Chinese',
    chineseName: '中文',
    nativeLabel: '简体中文',
    aliases: ['zh', 'zh-*', 'zh_*', 'zh_*.UTF-8', 'zh_*.UTF-8@*'],
    direction: 'ltr',
    adapters: {
      antDesign: 'zh_CN',
      dayjs: 'zh-cn',
      intl: 'zh-CN',
      report: 'zh_CN',
    },
    formatting: {
      listSeparator: '、',
      twoItemConjunction: '和',
      manyItemConjunction: '和',
    },
    assets: {
      welcomeTidas: {
        light: '/images/tidas/TIDAS-zh-CN.svg',
        dark: '/images/tidas/TIDAS-zh-CN-dark.svg',
      },
    },
    fallbacks: {
      documentationLocale: 'zh-CN',
      documentationUrl: DOCUMENTATION_BASE_URL,
      legalLocale: 'en-US',
    },
    environment: {
      titleKey: 'APP_TITLE_ZH_CN',
      loginSubtitleKey: 'APP_LOGIN_SUBTITLE_ZH_CN',
    },
  },
  {
    canonicalLocale: 'en-US',
    languageCode: 'en',
    englishName: 'English',
    chineseName: '英语',
    nativeLabel: 'English',
    aliases: ['en', 'en-*', 'en_*', 'en_*.UTF-8', 'en_*.UTF-8@*'],
    direction: 'ltr',
    adapters: {
      antDesign: 'en_US',
      dayjs: 'en',
      intl: 'en-US',
      report: 'en_US',
    },
    formatting: {
      listSeparator: ', ',
      twoItemConjunction: ' and ',
      manyItemConjunction: ', and ',
    },
    assets: {
      welcomeTidas: {
        light: '/images/tidas/TIDAS-en.svg',
        dark: '/images/tidas/TIDAS-en-dark.svg',
      },
    },
    fallbacks: {
      documentationLocale: 'en-US',
      documentationUrl: `${DOCUMENTATION_BASE_URL}/en`,
      legalLocale: 'en-US',
    },
    environment: {
      titleKey: 'APP_TITLE_EN_US',
      loginSubtitleKey: 'APP_LOGIN_SUBTITLE_EN_US',
    },
  },
  {
    canonicalLocale: 'de-DE',
    languageCode: 'de',
    englishName: 'German',
    chineseName: '德语',
    nativeLabel: 'Deutsch',
    aliases: ['de', 'de-*', 'de_*', 'de_*.UTF-8', 'de_*.UTF-8@*'],
    direction: 'ltr',
    adapters: {
      antDesign: 'de_DE',
      dayjs: 'de',
      intl: 'de-DE',
      report: 'de_DE',
    },
    formatting: {
      listSeparator: ', ',
      twoItemConjunction: ' und ',
      manyItemConjunction: ' und ',
    },
    assets: {
      welcomeTidas: {
        light: '/images/tidas/TIDAS-en.svg',
        dark: '/images/tidas/TIDAS-en-dark.svg',
      },
    },
    fallbacks: {
      documentationLocale: 'en-US',
      documentationUrl: `${DOCUMENTATION_BASE_URL}/en`,
      legalLocale: 'en-US',
    },
    environment: {
      titleKey: 'APP_TITLE_DE_DE',
      loginSubtitleKey: 'APP_LOGIN_SUBTITLE_DE_DE',
    },
  },
  {
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
    assets: {
      welcomeTidas: {
        light: '/images/tidas/TIDAS-en.svg',
        dark: '/images/tidas/TIDAS-en-dark.svg',
      },
    },
    fallbacks: {
      documentationLocale: 'en-US',
      documentationUrl: `${DOCUMENTATION_BASE_URL}/en`,
      legalLocale: 'en-US',
    },
    environment: {
      titleKey: 'APP_TITLE_FR_FR',
      loginSubtitleKey: 'APP_LOGIN_SUBTITLE_FR_FR',
    },
  },
] as const satisfies readonly LocaleDefinition[];

export type SupportedAppLocale = (typeof LOCALE_REGISTRY)[number]['canonicalLocale'];
export type LocaleRegistryEntry = (typeof LOCALE_REGISTRY)[number];

export const CANONICAL_SOURCE_APP_LOCALE: SupportedAppLocale = 'en-US';
export const DEFAULT_BROWSER_APP_LOCALE: SupportedAppLocale = 'zh-CN';
export const DEFAULT_SERVICE_APP_LOCALE: SupportedAppLocale = CANONICAL_SOURCE_APP_LOCALE;

export const SUPPORTED_APP_LOCALES: readonly SupportedAppLocale[] = LOCALE_REGISTRY.map(
  ({ canonicalLocale }) => canonicalLocale,
);

export function getLocaleDefinition(locale: SupportedAppLocale): LocaleRegistryEntry;
export function getLocaleDefinition(locale?: string | null): LocaleRegistryEntry | undefined;
export function getLocaleDefinition(locale?: string | null): LocaleRegistryEntry | undefined {
  return LOCALE_REGISTRY.find(({ canonicalLocale }) => canonicalLocale === locale);
}

export function getLocaleDefinitionByLanguage(
  languageCode?: string | null,
): LocaleRegistryEntry | undefined {
  const normalizedLanguage = languageCode?.trim().toLowerCase();
  return LOCALE_REGISTRY.find(({ languageCode }) => languageCode === normalizedLanguage);
}

const stripPosixLocaleSuffix = (value: string): string =>
  value
    .replace(/\.[A-Za-z0-9_-]+(?=@|$)/u, '')
    .replace(/@[A-Za-z0-9_-]+$/u, '')
    .replace(/_/gu, '-');

const canonicalizeLocale = (value: string): string | undefined => {
  if (typeof Intl.getCanonicalLocales !== 'function') {
    return undefined;
  }

  try {
    return Intl.getCanonicalLocales(value)[0];
  } catch {
    return undefined;
  }
};

const matchesLocaleAlias = (value: string, alias: string): boolean => {
  const pattern = alias
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'))
    .join('.*');
  return new RegExp(`^${pattern}$`, 'iu').test(value);
};

/**
 * Resolves canonical, BCP47, underscore, and POSIX locale identifiers through
 * the aliases declared by the product registry. Invalid and unsupported
 * identifiers remain outside the app-locale boundary.
 */
export function normalizeSupportedAppLocale(value?: string | null): SupportedAppLocale | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const candidate = value?.trim().split(':')[0]?.trim();
  if (!candidate) {
    return undefined;
  }

  const aliasDefinition = LOCALE_REGISTRY.find(
    ({ aliases, canonicalLocale }) =>
      canonicalLocale.toLowerCase() === candidate.toLowerCase() ||
      aliases.some((alias) => matchesLocaleAlias(candidate, alias)),
  );
  if (!aliasDefinition) {
    return undefined;
  }

  const canonicalLocale = canonicalizeLocale(stripPosixLocaleSuffix(candidate));
  const canonicalDefinition = getLocaleDefinitionByLanguage(canonicalLocale?.split('-')[0]);
  return canonicalDefinition?.canonicalLocale === aliasDefinition.canonicalLocale
    ? aliasDefinition.canonicalLocale
    : undefined;
}

export function hasEnglishFallback(locale?: string | null): boolean {
  const normalizedLocale = normalizeSupportedAppLocale(locale);
  const definition = normalizedLocale ? getLocaleDefinition(normalizedLocale) : undefined;
  return Boolean(
    definition &&
    ((definition.fallbacks.documentationLocale === 'en-US' &&
      definition.fallbacks.documentationLocale !== definition.canonicalLocale) ||
      (definition.fallbacks.legalLocale === 'en-US' &&
        definition.fallbacks.legalLocale !== definition.canonicalLocale)),
  );
}

export type LocaleFallbackKind = 'documentationLocale' | 'legalLocale';

export function getLocaleFallbackDefinition(
  locale: string | null | undefined,
  kind: LocaleFallbackKind,
): LocaleRegistryEntry | undefined {
  const normalizedLocale = normalizeSupportedAppLocale(locale);
  const definition = normalizedLocale ? getLocaleDefinition(normalizedLocale) : undefined;
  return definition ? getLocaleDefinition(definition.fallbacks[kind]) : undefined;
}

export function hasLocaleFallback(
  locale: string | null | undefined,
  kind: LocaleFallbackKind,
): boolean {
  const normalizedLocale = normalizeSupportedAppLocale(locale);
  const definition = normalizedLocale ? getLocaleDefinition(normalizedLocale) : undefined;
  const fallbackDefinition = definition
    ? getLocaleDefinition(definition.fallbacks[kind])
    : undefined;
  return Boolean(
    definition &&
    fallbackDefinition &&
    fallbackDefinition.canonicalLocale !== definition.canonicalLocale,
  );
}
