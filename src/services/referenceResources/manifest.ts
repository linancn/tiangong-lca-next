import type { SupportedContentLanguage } from '@/services/general/contentLanguageRegistry';

export const REFERENCE_RESOURCE_MANIFEST_VERSION = '1';
export const REFERENCE_RESOURCE_LOCALIZATION_OWNER = '#634';

export type ReferenceResourceScope = 'classification' | 'location';
export type ReferenceResourceDeliveryStatus =
  'legacy-unverified' | 'official' | 'official-crosswalk' | 'project-reviewed';
export type ReferenceResourceRuntimeStatus = 'native' | 'development-base' | 'missing';

export const ILCD_CANONICAL_DATA_TYPES = [
  'Process',
  'Flow',
  'FlowProperty',
  'UnitGroup',
  'Contact',
  'Source',
  'LCIAMethod',
  'LifeCycleModel',
] as const;

export type IlcdCanonicalDataType = (typeof ILCD_CANONICAL_DATA_TYPES)[number];

export type ReferenceRuntimeAsset = {
  language: SupportedContentLanguage;
  fileName: string;
  dataTypeNames?: Partial<Record<IlcdCanonicalDataType, string>>;
};

export type ReferenceLocaleAvailability =
  | {
      status: 'native';
      assetLanguage: SupportedContentLanguage;
      deliveryStatus: ReferenceResourceDeliveryStatus;
    }
  | {
      status: 'development-base';
      resolvedLanguage: SupportedContentLanguage;
      ownerIssue: typeof REFERENCE_RESOURCE_LOCALIZATION_OWNER;
      diagnostic: string;
    }
  | {
      status: 'missing';
      ownerIssue: typeof REFERENCE_RESOURCE_LOCALIZATION_OWNER;
      diagnostic: string;
    };

export type ReferenceResourceDefinition = {
  resourceId: string;
  scope: ReferenceResourceScope;
  required: boolean;
  baseLanguage: SupportedContentLanguage;
  identityStrategy:
    | 'tree-index-path-with-id-assertion'
    | 'data-type-index-path-occurrence-with-id-assertion'
    | 'location-code';
  cacheRevision: string;
  provenance: {
    status: 'pending-verification' | 'verified';
    edition: string | null;
    publisher: string | null;
    officialUrl: string | null;
    license: string | null;
    retrievedAt: string | null;
    ownerIssue: typeof REFERENCE_RESOURCE_LOCALIZATION_OWNER;
  };
  runtimeAssets: Partial<Record<SupportedContentLanguage, ReferenceRuntimeAsset>>;
  localizations: Record<SupportedContentLanguage, ReferenceLocaleAvailability>;
};

const ENGLISH_DATA_TYPE_NAMES = Object.fromEntries(
  ILCD_CANONICAL_DATA_TYPES.map((dataType) => [dataType, dataType]),
) as Record<IlcdCanonicalDataType, string>;

const CHINESE_DATA_TYPE_NAMES = {
  Process: '过程',
  Flow: '流',
  FlowProperty: '流属性',
  UnitGroup: '单位组',
  Contact: '联系信息',
  Source: '来源',
  LCIAMethod: '生命周期影响评估方法',
  LifeCycleModel: '生命周期模型',
} as const satisfies Record<IlcdCanonicalDataType, string>;

const pendingProvenance = () =>
  ({
    status: 'pending-verification',
    edition: null,
    publisher: null,
    officialUrl: null,
    license: null,
    retrievedAt: null,
    ownerIssue: REFERENCE_RESOURCE_LOCALIZATION_OWNER,
  }) as const;

const legacyLocalizations = (): Record<SupportedContentLanguage, ReferenceLocaleAvailability> => ({
  en: {
    status: 'native',
    assetLanguage: 'en',
    deliveryStatus: 'legacy-unverified',
  },
  zh: {
    status: 'native',
    assetLanguage: 'zh',
    deliveryStatus: 'legacy-unverified',
  },
  de: {
    status: 'development-base',
    resolvedLanguage: 'en',
    ownerIssue: REFERENCE_RESOURCE_LOCALIZATION_OWNER,
    diagnostic: 'German reference labels use the development English base until #634 lands.',
  },
  fr: {
    status: 'development-base',
    resolvedLanguage: 'en',
    ownerIssue: REFERENCE_RESOURCE_LOCALIZATION_OWNER,
    diagnostic: 'French reference labels use the development English base until #634 lands.',
  },
});

export const REFERENCE_RESOURCE_MANIFEST = [
  {
    resourceId: 'cpc',
    scope: 'classification',
    required: true,
    baseLanguage: 'en',
    identityStrategy: 'tree-index-path-with-id-assertion',
    cacheRevision: 'legacy-1',
    provenance: pendingProvenance(),
    runtimeAssets: {
      en: {
        language: 'en',
        fileName: 'CPCClassification.min.json.gz',
        dataTypeNames: ENGLISH_DATA_TYPE_NAMES,
      },
      zh: {
        language: 'zh',
        fileName: 'CPCClassification_zh.min.json.gz',
        dataTypeNames: ENGLISH_DATA_TYPE_NAMES,
      },
    },
    localizations: legacyLocalizations(),
  },
  {
    resourceId: 'isic',
    scope: 'classification',
    required: true,
    baseLanguage: 'en',
    identityStrategy: 'tree-index-path-with-id-assertion',
    cacheRevision: 'legacy-1',
    provenance: pendingProvenance(),
    runtimeAssets: {
      en: {
        language: 'en',
        fileName: 'ISICClassification.min.json.gz',
        dataTypeNames: ENGLISH_DATA_TYPE_NAMES,
      },
      zh: {
        language: 'zh',
        fileName: 'ISICClassification_zh.min.json.gz',
        dataTypeNames: ENGLISH_DATA_TYPE_NAMES,
      },
    },
    localizations: legacyLocalizations(),
  },
  {
    resourceId: 'ilcd-classification',
    scope: 'classification',
    required: true,
    baseLanguage: 'en',
    identityStrategy: 'data-type-index-path-occurrence-with-id-assertion',
    cacheRevision: 'legacy-1',
    provenance: pendingProvenance(),
    runtimeAssets: {
      en: {
        language: 'en',
        fileName: 'ILCDClassification.min.json.gz',
        dataTypeNames: ENGLISH_DATA_TYPE_NAMES,
      },
      zh: {
        language: 'zh',
        fileName: 'ILCDClassification_zh.min.json.gz',
        dataTypeNames: CHINESE_DATA_TYPE_NAMES,
      },
    },
    localizations: legacyLocalizations(),
  },
  {
    resourceId: 'ilcd-flow-categorization',
    scope: 'classification',
    required: true,
    baseLanguage: 'en',
    identityStrategy: 'tree-index-path-with-id-assertion',
    cacheRevision: 'legacy-1',
    provenance: pendingProvenance(),
    runtimeAssets: {
      en: {
        language: 'en',
        fileName: 'ILCDFlowCategorization.min.json.gz',
        dataTypeNames: ENGLISH_DATA_TYPE_NAMES,
      },
      zh: {
        language: 'zh',
        fileName: 'ILCDFlowCategorization_zh.min.json.gz',
        dataTypeNames: CHINESE_DATA_TYPE_NAMES,
      },
    },
    localizations: legacyLocalizations(),
  },
  {
    resourceId: 'ilcd-locations',
    scope: 'location',
    required: true,
    baseLanguage: 'en',
    identityStrategy: 'location-code',
    cacheRevision: 'legacy-1',
    provenance: pendingProvenance(),
    runtimeAssets: {
      en: {
        language: 'en',
        fileName: 'ILCDLocations.min.json.gz',
      },
      zh: {
        language: 'zh',
        fileName: 'ILCDLocations_zh.min.json.gz',
      },
    },
    localizations: legacyLocalizations(),
  },
] as const satisfies readonly ReferenceResourceDefinition[];

export type ReferenceResourceId = (typeof REFERENCE_RESOURCE_MANIFEST)[number]['resourceId'];
export type ReferenceResourceRegistryEntry = (typeof REFERENCE_RESOURCE_MANIFEST)[number];

export const REQUIRED_REFERENCE_RESOURCE_IDS: readonly ReferenceResourceId[] =
  REFERENCE_RESOURCE_MANIFEST.filter(({ required }) => required).map(
    ({ resourceId }) => resourceId,
  );

export function getReferenceResourceDefinition(
  resourceId: ReferenceResourceId,
): ReferenceResourceRegistryEntry;
export function getReferenceResourceDefinition(
  resourceId?: string | null,
): ReferenceResourceRegistryEntry | undefined;
export function getReferenceResourceDefinition(
  resourceId?: string | null,
): ReferenceResourceRegistryEntry | undefined {
  return REFERENCE_RESOURCE_MANIFEST.find(({ resourceId: id }) => id === resourceId);
}

export function getReferenceResourceCacheFiles(scope: ReferenceResourceScope): readonly string[] {
  return [
    ...new Set(
      REFERENCE_RESOURCE_MANIFEST.filter((resource) => resource.scope === scope).flatMap(
        (resource) =>
          Object.values(resource.runtimeAssets)
            .map((asset) => asset?.fileName)
            .filter((fileName): fileName is string => Boolean(fileName)),
      ),
    ),
  ];
}

export function getReferenceResourceCacheVersion(scope: ReferenceResourceScope): string {
  const revisions = REFERENCE_RESOURCE_MANIFEST.filter((resource) => resource.scope === scope)
    .map(({ cacheRevision, resourceId }) => `${resourceId}@${cacheRevision}`)
    .sort();
  return `${REFERENCE_RESOURCE_MANIFEST_VERSION}:${revisions.join(',')}`;
}
