import {
  decompressGzipData,
  getAllCachedKeys,
  getCachedJsonEntry,
  getLocalStorageJson,
  initIndexedDbStore,
  putCachedJsonEntry,
  setLocalStorageJson,
} from '@/services/general/browserResourceCache';

import type { Classification } from '../general/data';

const CACHE_KEY = 'classification_cache_manifest';
const CACHE_DB_NAME = 'classification_cache_db';
const CACHE_DB_VERSION = 1;
const CACHE_STORE_NAME = 'classification_files';

export interface ClassificationCacheManifest {
  version: string;
  files: string[];
  cachedAt: number;
  decompressed: boolean;
}

export const categoryTypeOptions = [
  {
    en: 'Process',
    zh: '过程',
  },
  {
    en: 'Flow',
    zh: '流',
  },
  {
    en: 'FlowProperty',
    zh: '流属性',
  },
  {
    en: 'UnitGroup',
    zh: '单位组',
  },
  {
    en: 'Contact',
    zh: '联系信息',
  },
  {
    en: 'Source',
    zh: '来源',
  },
  {
    en: 'LCIAMethod',
    zh: '生命周期影响评估方法',
  },
];

export type ILCDCategoryNode = {
  '@id': string;
  '@name': string;
  category?: ILCDCategoryNode[] | null;
  [key: string]: unknown;
};

export function genClass(data?: ILCDCategoryNode[] | null): Classification[] {
  if (!data) {
    return [];
  }
  return data.map((item) => {
    return {
      id: item['@id'],
      value: item['@name'],
      label: item['@name'],
      children: genClass(item.category),
    };
  });
}

export function genClassZH(
  data?: ILCDCategoryNode[] | null,
  dataZH?: ILCDCategoryNode[] | null,
): Classification[] {
  if (!data) {
    return [];
  }
  return data.map((item) => {
    const zh = dataZH ? dataZH.find((candidate) => candidate['@id'] === item['@id']) : null;
    return {
      id: item['@id'],
      value: item['@name'],
      label: zh?.['@name'] ?? item['@name'],
      children: genClassZH(item.category, zh?.category),
    };
  });
}

const initDB = (): Promise<IDBDatabase> => {
  return initIndexedDbStore(CACHE_DB_NAME, CACHE_DB_VERSION, CACHE_STORE_NAME);
};

export const getClassificationCacheManifest = (): ClassificationCacheManifest | null => {
  return getLocalStorageJson<ClassificationCacheManifest>(CACHE_KEY);
};

export const setClassificationCacheManifest = (manifest: ClassificationCacheManifest): void => {
  setLocalStorageJson(CACHE_KEY, manifest);
};

export const getCachedClassificationFileList = async (): Promise<string[]> => {
  try {
    const db = await initDB();
    return await getAllCachedKeys(db, CACHE_STORE_NAME);
  } catch (error) {
    console.error('Failed to get classification cached file list:', error);
    return [];
  }
};

export const getCachedClassificationFileData = async <T>(filename: string): Promise<T | null> => {
  try {
    const db = await initDB();
    const cachedEntry = await getCachedJsonEntry<T>(db, CACHE_STORE_NAME, filename);
    return cachedEntry?.data ?? null;
  } catch (error) {
    console.error(`Failed to read classification cached file ${filename}:`, error);
    return null;
  }
};

export const cacheAndDecompressClassificationFile = async (filename: string): Promise<boolean> => {
  try {
    const response = await fetch(`/classifications/${filename}`);
    if (!response.ok) {
      console.warn(`Classification source file not found: ${filename}`);
      return false;
    }

    const arrayBuffer = await response.arrayBuffer();
    const decompressedText = await decompressGzipData(arrayBuffer);
    const data = JSON.parse(decompressedText);

    const db = await initDB();
    await putCachedJsonEntry(db, CACHE_STORE_NAME, filename, data);

    return true;
  } catch (error) {
    console.error(`Failed to cache classification file ${filename}:`, error);
    return false;
  }
};

export const getCachedOrFetchClassificationFileData = async <T>(
  filename: string,
): Promise<T | null> => {
  const cachedData = await getCachedClassificationFileData<T>(filename);
  if (cachedData) {
    return cachedData;
  }

  const cached = await cacheAndDecompressClassificationFile(filename);
  if (!cached) {
    return null;
  }

  return getCachedClassificationFileData<T>(filename);
};
