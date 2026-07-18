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
import {
  getLocaleDefinition,
  SUPPORTED_APP_LOCALES,
  type SupportedAppLocale,
} from './localeRegistry';

export type ReferenceResourceCapability = {
  resourceId: ReferenceResourceId;
  status: ReferenceResourceRuntimeStatus;
  requestedLanguage: SupportedContentLanguage;
  resolvedLanguage?: SupportedContentLanguage;
  deliveryStatus?: ReferenceResourceDeliveryStatus;
  ownerIssue?: string;
};

export type LocaleCapabilityRow = {
  appLocale: SupportedAppLocale;
  contentLanguage: SupportedContentLanguage;
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

const buildLocaleCapabilityRow = (appLocale: SupportedAppLocale): LocaleCapabilityRow => {
  const locale = getLocaleDefinition(appLocale);
  const content = getContentLanguageDefinition(locale.languageCode);
  if (!content || content.appLocale !== appLocale) {
    throw new Error(`UI locale ${appLocale} has no matching content-language capability.`);
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
    contentReading: getContentReadingCapabilityStatus(content),
    contentAuthoring: content.authoring.enabled ? 'native' : 'unsupported',
    serviceQuery: {
      status: serviceQuery.status,
      resolvedLanguage: serviceQuery.resolvedLanguage,
      disclosure: serviceQuery.disclosure,
    },
    referenceResources,
  };
};

/** Derived view over the three owner registries; never edit rows directly. */
export const LOCALE_CAPABILITY_MATRIX: readonly LocaleCapabilityRow[] =
  SUPPORTED_APP_LOCALES.map(buildLocaleCapabilityRow);

export function getLocaleCapability(appLocale: SupportedAppLocale): LocaleCapabilityRow;
export function getLocaleCapability(appLocale?: string | null): LocaleCapabilityRow | undefined;
export function getLocaleCapability(appLocale?: string | null): LocaleCapabilityRow | undefined {
  return LOCALE_CAPABILITY_MATRIX.find(({ appLocale: locale }) => locale === appLocale);
}
