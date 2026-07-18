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
  if (localizedNodes.length !== baseNodes.length) {
    throw new Error('Localized locations do not exactly cover the base structure.');
  }

  return baseNodes.map((baseNode, index) => {
    const localizedNode = localizedNodes[index];
    const value = baseNode['@value'];
    if (
      typeof value !== 'string' ||
      localizedNode?.['@value'] !== value ||
      typeof localizedNode?.['#text'] !== 'string' ||
      localizedNode['#text'].trim() === ''
    ) {
      throw new Error(`Localized location structure differs from the base at index ${index}.`);
    }
    return { ...baseNode, ...localizedNode, '@value': value };
  });
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
      : await getLocationNodes(resolution.localizedAsset.fileName);
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
