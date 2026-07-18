import {
  getReferenceAssetStem,
  reportReferenceResourceResolution,
  resolveReferenceResource,
} from '../referenceResources/resolver';
import { getCachedOrFetchLocationFileData } from './util';

type ILCDLocationNode = Record<string, unknown> & {
  '@value'?: string;
  '#text'?: string;
};

type ILCDLocationDocument = {
  ILCDLocations?: {
    location?: ILCDLocationNode[] | ILCDLocationNode | null;
  } | null;
};

function normalizeLocationNodes(
  location?: ILCDLocationNode[] | ILCDLocationNode | null,
): ILCDLocationNode[] {
  if (Array.isArray(location)) {
    return location;
  }
  if (location) {
    return [location];
  }
  return [];
}

async function getLocationNodes(fileName: string): Promise<ILCDLocationNode[]> {
  const document = await getCachedOrFetchLocationFileData<ILCDLocationDocument>(fileName);

  if (!document) {
    throw new Error(`Failed to load ILCD location data from ${fileName}`);
  }

  return normalizeLocationNodes(document.ILCDLocations?.location);
}

function mergeLocationNodes(
  baseNodes: ILCDLocationNode[],
  localizedNodes: ILCDLocationNode[],
): ILCDLocationNode[] {
  const localizedByValue = new Map<string, ILCDLocationNode>();
  const localizedWithoutValue: ILCDLocationNode[] = [];

  for (const node of localizedNodes) {
    const value = node['@value'];
    if (typeof value === 'string') {
      localizedByValue.set(value, node);
    } else {
      localizedWithoutValue.push(node);
    }
  }

  const baseValues = new Set<string>();
  const mergedNodes = baseNodes.map((baseNode) => {
    const value = baseNode['@value'];
    if (typeof value !== 'string') {
      return baseNode;
    }

    baseValues.add(value);
    const localizedNode = localizedByValue.get(value);
    return localizedNode ? { ...baseNode, ...localizedNode, '@value': value } : baseNode;
  });

  const appendedLocalizedValues = new Set<string>();
  for (const localizedNode of localizedNodes) {
    const value = localizedNode['@value'];
    if (
      typeof value === 'string' &&
      !baseValues.has(value) &&
      !appendedLocalizedValues.has(value)
    ) {
      const mergedNode = localizedByValue.get(value);
      if (mergedNode) {
        mergedNodes.push(mergedNode);
        appendedLocalizedValues.add(value);
      }
    }
  }

  return [...mergedNodes, ...localizedWithoutValue];
}

export async function getILCDLocationEntries(
  lang: string,
  getValues: string[],
): Promise<ILCDLocationNode[]> {
  const resolution = resolveReferenceResource('ilcd-locations', lang);
  reportReferenceResourceResolution(resolution);
  if (resolution.status === 'missing' || !resolution.localizedAsset) {
    throw new Error(resolution.diagnostic);
  }
  const baseNodes = await getLocationNodes(resolution.baseAsset.fileName);
  const localizedNodes =
    resolution.localizedAsset.fileName === resolution.baseAsset.fileName
      ? baseNodes
      : await (async () => {
          try {
            return await getLocationNodes(resolution.localizedAsset.fileName);
          } catch (error) {
            console.warn(
              `[i18n-reference-resource] Failed to load localized location asset ${resolution.localizedAsset.fileName} for ${lang}; falling back to ${resolution.baseAsset.fileName}.`,
              error,
            );
            return baseNodes;
          }
        })();
  const nodes =
    localizedNodes === baseNodes ? baseNodes : mergeLocationNodes(baseNodes, localizedNodes);

  if (getValues.includes('all')) {
    return nodes;
  }

  const filters = new Set(getValues.filter(Boolean));
  if (filters.size === 0) {
    return [];
  }

  return nodes.filter((node) => {
    const value = node['@value'];
    return typeof value === 'string' && filters.has(value);
  });
}

export async function getILCDLocationAll(lang: string) {
  const resolution = resolveReferenceResource('ilcd-locations', lang);
  reportReferenceResourceResolution(resolution);
  const fileName = getReferenceAssetStem(resolution);

  try {
    const location = await getILCDLocationEntries(lang, ['all']);

    return Promise.resolve({
      data: [{ file_name: fileName, location }],
      success: true,
    });
  } catch (e) {
    console.error(e);
    return Promise.resolve({
      data: [],
      success: false,
    });
  }
}

export async function getILCDLocationByValues(lang: string, getValues: string[]) {
  try {
    const data = await getILCDLocationEntries(lang, getValues);

    return Promise.resolve({
      data,
      success: true,
    });
  } catch (e) {
    console.error(e);
    return Promise.resolve({
      data: [],
      success: false,
    });
  }
}

export async function getILCDLocationByValue(lang: string, getValue: string) {
  const result = await getILCDLocationByValues(lang, [getValue]);

  if (result.data?.[0]?.['#text']) {
    return Promise.resolve({
      data: `${getValue} (${result.data?.[0]?.['#text']})`,
      success: result.success,
    });
  }

  return Promise.resolve({
    data: getValue,
    success: result.success,
  });
}
