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

const ILCD_LOCATION_FILES = {
  en: 'ILCDLocations.min.json.gz',
  zh: 'ILCDLocations_zh.min.json.gz',
} as const;

function normalizeIlcdLang(lang: string): 'en' | 'zh' {
  return lang === 'zh' ? 'zh' : 'en';
}

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

async function getLocationNodes(lang: 'en' | 'zh'): Promise<ILCDLocationNode[]> {
  const fileName = ILCD_LOCATION_FILES[lang];
  const document = await getCachedOrFetchLocationFileData<ILCDLocationDocument>(fileName);

  if (!document) {
    throw new Error(`Failed to load ILCD location data from ${fileName}`);
  }

  return normalizeLocationNodes(document.ILCDLocations?.location);
}

export async function getILCDLocationEntries(
  lang: string,
  getValues: string[],
): Promise<ILCDLocationNode[]> {
  const normalizedLang = normalizeIlcdLang(lang);
  const nodes = await getLocationNodes(normalizedLang);

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
  const normalizedLang = normalizeIlcdLang(lang);
  const fileName = normalizedLang === 'zh' ? 'ILCDLocations_zh' : 'ILCDLocations';

  try {
    const location = await getILCDLocationEntries(normalizedLang, ['all']);

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
