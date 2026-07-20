import {
  resolveContentLanguage,
  type SupportedContentLanguage,
} from '@/services/general/contentLanguageRegistry';

import {
  getReferenceResourceDefinition,
  type IlcdCanonicalDataType,
  type ReferenceLocaleAvailability,
  type ReferenceResourceDeliveryStatus,
  type ReferenceResourceId,
  type ReferenceRuntimeAsset,
} from './manifest';

type NativeReferenceResolution = {
  status: 'native';
  resourceId: ReferenceResourceId;
  requestedLanguage: SupportedContentLanguage;
  resolvedLanguage: SupportedContentLanguage;
  usedFallback: false;
  deliveryStatus: ReferenceResourceDeliveryStatus;
  baseAsset: ReferenceRuntimeAsset;
  localizedAsset: ReferenceRuntimeAsset;
};

type DevelopmentBaseReferenceResolution = {
  status: 'development-base';
  resourceId: ReferenceResourceId;
  requestedLanguage: SupportedContentLanguage;
  resolvedLanguage: SupportedContentLanguage;
  usedFallback: true;
  ownerIssue: string;
  diagnostic: string;
  baseAsset: ReferenceRuntimeAsset;
  localizedAsset: ReferenceRuntimeAsset;
};

type MissingReferenceResolution = {
  status: 'missing';
  resourceId: ReferenceResourceId;
  requestedLanguage: SupportedContentLanguage;
  resolvedLanguage?: undefined;
  usedFallback: false;
  ownerIssue: string;
  diagnostic: string;
  baseAsset: ReferenceRuntimeAsset;
  localizedAsset?: undefined;
};

export type ReferenceResourceResolution =
  NativeReferenceResolution | DevelopmentBaseReferenceResolution | MissingReferenceResolution;

const getRequiredAsset = (
  resourceId: ReferenceResourceId,
  language: SupportedContentLanguage,
): ReferenceRuntimeAsset => {
  const resource = getReferenceResourceDefinition(resourceId);
  const runtimeAssets = resource.runtimeAssets as Partial<
    Record<SupportedContentLanguage, ReferenceRuntimeAsset>
  >;
  const asset = runtimeAssets[language];
  if (!asset) {
    throw new Error(`Reference resource ${resourceId} has no runtime asset for ${language}.`);
  }
  return asset;
};

export function resolveReferenceResource(
  resourceId: ReferenceResourceId,
  requestedLanguage?: string | null,
): ReferenceResourceResolution {
  const resource = getReferenceResourceDefinition(resourceId);
  const language = resolveContentLanguage(requestedLanguage);
  const baseAsset = getRequiredAsset(resourceId, resource.baseLanguage);
  const availability = resource.localizations[language] as ReferenceLocaleAvailability;

  if (availability.status === 'native') {
    const localizedAsset = getRequiredAsset(resourceId, availability.assetLanguage);
    return {
      status: 'native',
      resourceId,
      requestedLanguage: language,
      resolvedLanguage: availability.assetLanguage,
      usedFallback: false,
      deliveryStatus: availability.deliveryStatus,
      baseAsset,
      localizedAsset,
    };
  }

  if (availability.status === 'development-base') {
    const localizedAsset = getRequiredAsset(resourceId, availability.resolvedLanguage);
    return {
      status: 'development-base',
      resourceId,
      requestedLanguage: language,
      resolvedLanguage: availability.resolvedLanguage,
      usedFallback: true,
      ownerIssue: availability.ownerIssue,
      diagnostic: availability.diagnostic,
      baseAsset,
      localizedAsset,
    };
  }

  return {
    status: 'missing',
    resourceId,
    requestedLanguage: language,
    usedFallback: false,
    ownerIssue: availability.ownerIssue,
    diagnostic: availability.diagnostic,
    baseAsset,
  };
}

const emittedDiagnostics = new Set<string>();

export function reportReferenceResourceResolution(resolution: ReferenceResourceResolution): void {
  if (resolution.status === 'native') {
    return;
  }

  const key = `${resolution.resourceId}:${resolution.requestedLanguage}:${resolution.status}`;
  if (emittedDiagnostics.has(key)) {
    return;
  }
  emittedDiagnostics.add(key);
  console.warn(`[i18n-reference-resource] ${resolution.diagnostic}`);
}

export function getReferenceDataTypeName(
  asset: ReferenceRuntimeAsset | undefined,
  canonicalDataType: IlcdCanonicalDataType,
): string {
  return asset?.dataTypeNames?.[canonicalDataType] ?? canonicalDataType;
}

export function getResolvedReferenceDataTypeName(
  resolution: ReferenceResourceResolution,
  canonicalDataType: IlcdCanonicalDataType,
): string {
  return getReferenceDataTypeName(resolution.localizedAsset, canonicalDataType);
}

export function getReferenceAssetStem(resolution: ReferenceResourceResolution): string {
  return (resolution.localizedAsset ?? resolution.baseAsset).fileName.replace(
    /\.min\.json\.gz$/u,
    '',
  );
}
