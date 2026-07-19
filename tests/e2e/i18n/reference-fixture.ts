import { readFileSync } from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

import type { SupportedContentLanguage } from '../../../src/services/general/contentLanguageRegistry';
import { GENERATED_REFERENCE_RESOURCE_MANIFEST } from '../../../src/services/referenceResources/generatedManifest';
import { AUTHORING_LANGUAGES, REPOSITORY_ROOT } from './contracts';

type RuntimeAsset = {
  dataTypeNames?: Record<string, string>;
  fileName: string;
};

type ManifestResource = {
  resourceId: string;
  runtimeAssets: Record<string, RuntimeAsset>;
  scope: 'classification' | 'location';
};

type CategoryNode = {
  '@id': string;
  '@name': string;
  category?: CategoryNode[] | CategoryNode;
};

type ClassificationDocument = {
  CategorySystem: {
    categories: Array<{
      '@dataType': string;
      category: CategoryNode[] | CategoryNode;
    }>;
  };
};

type LocationDocument = {
  ILCDLocations: {
    location: Array<{ '#text': string; '@value': string }>;
  };
};

export type ReferenceFixture = {
  classification: {
    assetFileNames: Record<SupportedContentLanguage, string>;
    canonicalPath: Array<{ id: string; label: string }>;
    labels: Record<SupportedContentLanguage, string[]>;
  };
  location: {
    assetFileNames: Record<SupportedContentLanguage, string>;
    code: 'GLO';
    labels: Record<SupportedContentLanguage, string>;
  };
};

const manifestResources =
  GENERATED_REFERENCE_RESOURCE_MANIFEST as unknown as readonly ManifestResource[];

function getResource(resourceId: string): ManifestResource {
  const resource = manifestResources.find((candidate) => candidate.resourceId === resourceId);
  if (!resource) {
    throw new Error(`Reference fixture resource is missing: ${resourceId}`);
  }
  return resource;
}

function getAsset(resource: ManifestResource, language: SupportedContentLanguage): RuntimeAsset {
  const asset = resource.runtimeAssets[language];
  if (!asset) {
    throw new Error(`Reference fixture asset is missing: ${resource.resourceId}/${language}`);
  }
  return asset;
}

function readGzipJson<T>(resource: ManifestResource, asset: RuntimeAsset): T {
  const runtimeDirectory =
    resource.scope === 'location' ? 'public/locations' : 'public/classifications';
  const absolutePath = path.join(REPOSITORY_ROOT, runtimeDirectory, asset.fileName);
  return JSON.parse(gunzipSync(readFileSync(absolutePath)).toString('utf8')) as T;
}

function asArray<T>(value: T[] | T): T[] {
  return Array.isArray(value) ? value : [value];
}

function firstStableLeafPath(nodes: CategoryNode[] | CategoryNode): CategoryNode[] {
  const pathNodes: CategoryNode[] = [];
  let current = asArray(nodes)[0];
  while (current) {
    pathNodes.push(current);
    const children = current.category ? asArray(current.category) : [];
    if (children.length === 0) {
      break;
    }
    current = children[0];
  }
  if (pathNodes.length < 2) {
    throw new Error('Process classification fixture requires a non-trivial stable path.');
  }
  return pathNodes;
}

function resolveLocalizedPath(
  nodes: CategoryNode[] | CategoryNode,
  canonicalPath: readonly CategoryNode[],
): CategoryNode[] {
  let candidates = asArray(nodes);
  return canonicalPath.map((canonicalNode) => {
    const localizedNode = candidates.find((candidate) => candidate['@id'] === canonicalNode['@id']);
    if (!localizedNode?.['@name']) {
      throw new Error(`Localized process classification is missing ${canonicalNode['@id']}.`);
    }
    candidates = localizedNode.category ? asArray(localizedNode.category) : [];
    return localizedNode;
  });
}

export function loadReferenceFixture(): ReferenceFixture {
  const classificationResource = getResource('isic');
  const locationResource = getResource('ilcd-locations');
  const classificationDocuments = Object.fromEntries(
    AUTHORING_LANGUAGES.map((language) => {
      const asset = getAsset(classificationResource, language);
      return [
        language,
        { asset, document: readGzipJson<ClassificationDocument>(classificationResource, asset) },
      ];
    }),
  ) as Record<SupportedContentLanguage, { asset: RuntimeAsset; document: ClassificationDocument }>;
  const baseClassification = classificationDocuments.en;
  const baseProcessType = baseClassification.asset.dataTypeNames?.Process ?? 'Process';
  const baseProcessGroup = asArray(baseClassification.document.CategorySystem.categories).find(
    (group) => group['@dataType'] === baseProcessType,
  );
  if (!baseProcessGroup) {
    throw new Error('Canonical Process classification group is missing.');
  }
  const canonicalPathNodes = firstStableLeafPath(baseProcessGroup.category);

  const classificationLabels = Object.fromEntries(
    AUTHORING_LANGUAGES.map((language) => {
      const { asset, document } = classificationDocuments[language];
      const localizedProcessType = asset.dataTypeNames?.Process ?? baseProcessType;
      const group = asArray(document.CategorySystem.categories).find(
        (candidate) => candidate['@dataType'] === localizedProcessType,
      );
      if (!group) {
        throw new Error(`Localized Process classification group is missing for ${language}.`);
      }
      return [
        language,
        resolveLocalizedPath(group.category, canonicalPathNodes).map((node) => node['@name']),
      ];
    }),
  ) as Record<SupportedContentLanguage, string[]>;

  const locationLabels = Object.fromEntries(
    AUTHORING_LANGUAGES.map((language) => {
      const asset = getAsset(locationResource, language);
      const document = readGzipJson<LocationDocument>(locationResource, asset);
      const location = asArray(document.ILCDLocations.location).find(
        (candidate) => candidate['@value'] === 'GLO',
      );
      if (!location?.['#text']) {
        throw new Error(`Localized GLO location is missing for ${language}.`);
      }
      return [language, location['#text']];
    }),
  ) as Record<SupportedContentLanguage, string>;

  return {
    classification: {
      assetFileNames: Object.fromEntries(
        AUTHORING_LANGUAGES.map((language) => [
          language,
          getAsset(classificationResource, language).fileName,
        ]),
      ) as Record<SupportedContentLanguage, string>,
      canonicalPath: canonicalPathNodes.map((node) => ({
        id: node['@id'],
        label: node['@name'],
      })),
      labels: classificationLabels,
    },
    location: {
      assetFileNames: Object.fromEntries(
        AUTHORING_LANGUAGES.map((language) => [
          language,
          getAsset(locationResource, language).fileName,
        ]),
      ) as Record<SupportedContentLanguage, string>,
      code: 'GLO',
      labels: locationLabels,
    },
  };
}
