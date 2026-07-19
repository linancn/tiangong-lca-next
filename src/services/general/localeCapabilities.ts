import {
  getReferenceResourceDefinition,
  REQUIRED_REFERENCE_RESOURCE_IDS,
  type ReferenceResourceDeliveryStatus,
  type ReferenceResourceId,
  type ReferenceResourceRuntimeStatus,
} from '../referenceResources/manifest';
import { resolveReferenceResource } from '../referenceResources/resolver';
import {
  getContentLanguageDefinition,
  resolveServiceQueryLanguage,
  type ContentCapabilityStatus,
  type ContentLanguageDefinition,
  type SupportedContentLanguage,
} from './contentLanguageRegistry';
import { LOCALE_REGISTRY, type LocaleDefinition, type SupportedAppLocale } from './localeRegistry';

export type ReferenceResourceCapability = {
  resourceId: ReferenceResourceId;
  status: ReferenceResourceRuntimeStatus;
  requestedLanguage: SupportedContentLanguage;
  resolvedLanguage?: SupportedContentLanguage;
  deliveryStatus?: ReferenceResourceDeliveryStatus;
  ownerIssue?: string;
};

type LocaleCapabilityBase = {
  appLocale: SupportedAppLocale;
  uiCatalog: 'native';
};

export type AvailableLocaleCapabilityRow = LocaleCapabilityBase & {
  contentLanguage: SupportedContentLanguage;
  contentReading: 'native' | 'declared-fallback';
  contentAuthoring: 'native' | 'unsupported';
  serviceQuery: {
    status: ContentCapabilityStatus;
    resolvedLanguage?: SupportedContentLanguage;
    disclosure: 'diagnostic' | 'user-visible' | 'none';
  };
  referenceResources: readonly ReferenceResourceCapability[];
};

export type UnsupportedLocaleCapabilityRow = LocaleCapabilityBase & {
  contentLanguage?: undefined;
  contentReading: 'unsupported';
  contentAuthoring: 'unsupported';
  serviceQuery: {
    status: 'unsupported';
    resolvedLanguage?: undefined;
    disclosure: 'none';
  };
  referenceResources: readonly [];
};

export type LocaleCapabilityRow = AvailableLocaleCapabilityRow | UnsupportedLocaleCapabilityRow;

export type LocaleCapabilitySnapshot = {
  appLocale: string;
  contentLanguage?: SupportedContentLanguage;
  uiCatalog: 'native';
  contentReading: ContentCapabilityStatus;
  contentAuthoring: 'native' | 'unsupported';
  serviceQuery: {
    status: ContentCapabilityStatus;
    resolvedLanguage?: SupportedContentLanguage;
    disclosure: 'diagnostic' | 'user-visible' | 'none';
  };
  referenceResources: readonly ReferenceResourceCapability[];
};

export const getContentReadingCapabilityStatus = (
  content: Pick<ContentLanguageDefinition, 'languageCode' | 'reading'>,
): ContentCapabilityStatus => {
  if (!content.reading.enabled || content.reading.priority.length === 0) {
    return 'unsupported';
  }
  return content.reading.priority[0] === content.languageCode ? 'native' : 'declared-fallback';
};

export const buildLocaleCapabilityRow = (locale: LocaleDefinition): LocaleCapabilitySnapshot => {
  const appLocale = locale.canonicalLocale;
  const declaredCapability = locale.contentCapability;
  if (
    !declaredCapability ||
    !['native', 'declared-fallback', 'unsupported'].includes(declaredCapability.status)
  ) {
    throw new Error(`UI locale ${appLocale} has no declared content capability.`);
  }
  if (declaredCapability.status === 'unsupported') {
    if (declaredCapability.contentLanguage !== undefined) {
      throw new Error(
        `UI locale ${appLocale} cannot name a content language when typed content is unsupported.`,
      );
    }
    return {
      appLocale,
      uiCatalog: 'native',
      contentReading: 'unsupported',
      contentAuthoring: 'unsupported',
      serviceQuery: {
        status: 'unsupported',
        disclosure: 'none',
      },
      referenceResources: [],
    };
  }

  const content = getContentLanguageDefinition(declaredCapability.contentLanguage);
  if (!content) {
    throw new Error(
      `UI locale ${appLocale} references unknown content language ${declaredCapability.contentLanguage}.`,
    );
  }

  const serviceQuery = resolveServiceQueryLanguage(content.languageCode);
  const referenceResources = REQUIRED_REFERENCE_RESOURCE_IDS.map((resourceId) => {
    const resource = getReferenceResourceDefinition(resourceId);
    const resolution = resolveReferenceResource(resourceId, content.languageCode);
    const nativeDeliveryReady =
      resolution.status === 'native' &&
      (resolution.deliveryStatus === 'official' ||
        resolution.deliveryStatus === 'project-reviewed');
    return {
      resourceId,
      status: resolution.status,
      requestedLanguage: resolution.requestedLanguage,
      resolvedLanguage: resolution.resolvedLanguage,
      deliveryStatus: resolution.status === 'native' ? resolution.deliveryStatus : undefined,
      ownerIssue:
        resolution.status === 'native'
          ? nativeDeliveryReady
            ? undefined
            : resource.provenance.ownerIssue
          : resolution.ownerIssue,
    } satisfies ReferenceResourceCapability;
  });

  return {
    appLocale,
    contentLanguage: content.languageCode,
    uiCatalog: 'native',
    contentReading:
      declaredCapability.status === 'declared-fallback'
        ? 'declared-fallback'
        : getContentReadingCapabilityStatus(content),
    contentAuthoring:
      declaredCapability.status === 'native' && content.authoring.enabled
        ? 'native'
        : 'unsupported',
    serviceQuery: {
      status: serviceQuery.status,
      resolvedLanguage: serviceQuery.resolvedLanguage,
      disclosure: serviceQuery.disclosure,
    },
    referenceResources,
  };
};

/** Derived view over the three owner registries; never edit rows directly. */
export const LOCALE_CAPABILITY_MATRIX: readonly LocaleCapabilityRow[] = LOCALE_REGISTRY.map(
  (locale) => buildLocaleCapabilityRow(locale) as LocaleCapabilityRow,
);

export function getLocaleCapability(appLocale: SupportedAppLocale): LocaleCapabilityRow;
export function getLocaleCapability(appLocale?: string | null): LocaleCapabilityRow | undefined;
export function getLocaleCapability(appLocale?: string | null): LocaleCapabilityRow | undefined {
  return LOCALE_CAPABILITY_MATRIX.find(({ appLocale: locale }) => locale === appLocale);
}
