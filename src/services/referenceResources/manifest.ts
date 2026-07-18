import type { SupportedContentLanguage } from '@/services/general/contentLanguageRegistry';

import {
  GENERATED_REFERENCE_CANONICAL_DATA_TYPES,
  GENERATED_REFERENCE_RESOURCE_MANIFEST,
  GENERATED_REFERENCE_RESOURCE_MANIFEST_VERSION,
} from './generatedManifest';

export const REFERENCE_RESOURCE_MANIFEST_VERSION = String(
  GENERATED_REFERENCE_RESOURCE_MANIFEST_VERSION,
);
export const REFERENCE_RESOURCE_LOCALIZATION_OWNER = '#634';

export type ReferenceResourceScope = 'classification' | 'location';
export type ReferenceResourceDeliveryStatus =
  | 'legacy-unverified'
  | 'official'
  | 'official-crosswalk'
  | 'project-translated'
  | 'project-reviewed';
export type ReferenceResourceRuntimeStatus = 'native' | 'development-base' | 'missing';

export const ILCD_CANONICAL_DATA_TYPES = GENERATED_REFERENCE_CANONICAL_DATA_TYPES;

export type IlcdCanonicalDataType = (typeof ILCD_CANONICAL_DATA_TYPES)[number];

export type ReferenceRuntimeAsset = {
  readonly language: SupportedContentLanguage;
  readonly fileName: string;
  readonly dataTypeNames?: Readonly<Partial<Record<IlcdCanonicalDataType, string>>>;
};

export type ReferenceLocaleAvailability =
  | {
      readonly status: 'native';
      readonly assetLanguage: SupportedContentLanguage;
      readonly deliveryStatus: ReferenceResourceDeliveryStatus;
    }
  | {
      readonly status: 'development-base';
      readonly resolvedLanguage: SupportedContentLanguage;
      readonly ownerIssue: typeof REFERENCE_RESOURCE_LOCALIZATION_OWNER;
      readonly diagnostic: string;
    }
  | {
      readonly status: 'missing';
      readonly ownerIssue: typeof REFERENCE_RESOURCE_LOCALIZATION_OWNER;
      readonly diagnostic: string;
    };

export type ReferenceResourceDefinition = {
  readonly resourceId: string;
  readonly scope: ReferenceResourceScope;
  readonly required: boolean;
  readonly baseLanguage: SupportedContentLanguage;
  readonly identityStrategy:
    | 'tree-index-path-with-id-assertion'
    | 'data-type-index-path-occurrence-with-id-assertion'
    | 'location-code';
  readonly cacheRevision: string;
  readonly provenance: {
    readonly status: 'pending-verification' | 'verified';
    readonly edition: string | null;
    readonly publisher: string | null;
    readonly officialUrl: string | null;
    readonly license: string | null;
    readonly retrievedAt: string | null;
    readonly ownerIssue: typeof REFERENCE_RESOURCE_LOCALIZATION_OWNER;
  };
  readonly runtimeAssets: Readonly<
    Partial<Record<SupportedContentLanguage, ReferenceRuntimeAsset>>
  >;
  readonly localizations: Readonly<Record<SupportedContentLanguage, ReferenceLocaleAvailability>>;
};

export const REFERENCE_RESOURCE_MANIFEST =
  GENERATED_REFERENCE_RESOURCE_MANIFEST satisfies readonly ReferenceResourceDefinition[];

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
