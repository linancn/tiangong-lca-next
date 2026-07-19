import {
  getContentLanguageDefinition,
  type ContentLanguageRegistryEntry,
  type SupportedContentLanguage,
} from '../../../src/services/general/contentLanguageRegistry';
import type { LocaleCapabilitySnapshot } from '../../../src/services/general/localeCapabilities';

type ReadableLocaleContentScenario = {
  appLocale: string;
  contentLanguage: SupportedContentLanguage;
  contentLanguageDefinition: ContentLanguageRegistryEntry;
};

export type LocaleContentE2EScenario =
  | (ReadableLocaleContentScenario & { status: 'native' })
  | (ReadableLocaleContentScenario & { status: 'declared-fallback' })
  | {
      appLocale: string;
      status: 'unsupported';
    };

/**
 * Converts the capability matrix into an exhaustive browser-test scenario.
 * A declared fallback or unsupported content boundary is valid, but it must
 * never be exercised as if it were native. Inconsistent rows fail closed.
 */
export function resolveLocaleContentE2EScenario(
  capability: LocaleCapabilitySnapshot,
): LocaleContentE2EScenario {
  if (capability.contentReading === 'unsupported') {
    if (
      capability.contentLanguage !== undefined ||
      capability.contentAuthoring !== 'unsupported' ||
      capability.serviceQuery.status !== 'unsupported' ||
      capability.referenceResources.length !== 0
    ) {
      throw new Error(
        `Unsupported UI locale ${capability.appLocale} has inconsistent content capabilities.`,
      );
    }
    return { appLocale: capability.appLocale, status: 'unsupported' };
  }

  const contentLanguage = capability.contentLanguage;
  const contentLanguageDefinition = contentLanguage
    ? getContentLanguageDefinition(contentLanguage)
    : undefined;
  if (!contentLanguage || !contentLanguageDefinition?.reading.enabled) {
    throw new Error(`Readable UI locale ${capability.appLocale} has no readable content language.`);
  }

  if (capability.contentReading === 'declared-fallback') {
    if (capability.contentAuthoring !== 'unsupported') {
      throw new Error(
        `Fallback UI locale ${capability.appLocale} must not claim native content authoring.`,
      );
    }
    return {
      appLocale: capability.appLocale,
      contentLanguage,
      contentLanguageDefinition,
      status: 'declared-fallback',
    };
  }

  if (capability.contentReading !== 'native' || capability.contentAuthoring !== 'native') {
    throw new Error(
      `Native UI locale ${capability.appLocale} has inconsistent content capabilities.`,
    );
  }
  return {
    appLocale: capability.appLocale,
    contentLanguage,
    contentLanguageDefinition,
    status: 'native',
  };
}
