import type { RefVersionItem } from '@/components/RefsOfNewVersionDrawer';
import { getAllRefObj, getRefTableName } from '@/pages/Utils/review';
import { genFlowNameJson } from '@/services/flows/util';
import { getDataDetail, getDataDetailById } from '@/services/general/api';
import { getLangList } from '@/services/general/util';

export const getNewVersionShortDescription = (json: any, type: string) => {
  try {
    if (!json || !type) return [];
    if (type === 'flow data set') {
      const name = json?.flowDataSet?.flowInformation?.dataSetInformation?.name;
      const shortDesc = genFlowNameJson(name);
      return shortDesc ?? [];
    }
    if (type === 'process data set') {
      const baseName = json?.processDataSet?.processInformation?.dataSetInformation?.name?.baseName;
      return getLangList(baseName ?? []);
    }
    if (type === 'contact data set') {
      const shortName =
        json?.contactDataSet?.contactInformation?.dataSetInformation?.['common:shortName'];
      return getLangList(shortName ?? []);
    }
    if (type === 'source data set') {
      const shortName =
        json?.sourceDataSet?.sourceInformation?.dataSetInformation?.['common:shortName'];
      return getLangList(shortName ?? []);
    }
    if (type === 'flow property data set') {
      const shortName =
        json?.flowPropertyDataSet?.flowPropertyInformation?.dataSetInformation?.[
          'common:shortName'
        ];
      return getLangList(shortName ?? []);
    }
    if (type === 'unit group data set') {
      const shortName =
        json?.unitGroupDataSet?.unitGroupInformation?.dataSetInformation?.['common:shortName'];
      return getLangList(shortName ?? []);
    }
    if (type === 'LCIA method data set') {
      const shortName =
        json?.lciaMethodDataSet?.LCIAMethodInformation?.dataSetInformation?.['common:shortName'];
      return getLangList(shortName ?? []);
    }
    return getLangList([]);
  } catch {
    return getLangList([]);
  }
};

export const getRefsOfNewVersion = async (initData: any) => {
  if (!initData) return { newRefs: [] as RefVersionItem[], oldRefs: [] as RefVersionItem[] };
  const refObjs = getAllRefObj(initData) ?? [];
  const seen = new Set<string>();
  const unique = refObjs.filter((r: any) => {
    const key = `${r['@refObjectId']}:${r['@version']}:${r['@type']}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const newRefs: RefVersionItem[] = [];
  const oldRefs: RefVersionItem[] = [];
  await Promise.all(
    unique.map(async (r: any) => {
      const table = getRefTableName(r['@type']);
      if (!table) return;
      try {
        const result = await getDataDetailById(r['@refObjectId'], table);
        const rows = result?.data ?? [];
        const allVersions = rows
          .map((i: any) => i?.version)
          .filter((v: any) => typeof v === 'string');
        const otherVersions = allVersions.filter((v: string) => v !== r['@version']);

        const currentRow = rows.find(
          (row: any) => row?.version === r['@version'] && row.id === r['@refObjectId'],
        );
        const currentNormDesc = getNewVersionShortDescription(currentRow?.json, r['@type']);
        oldRefs.push({
          key: `${r['@refObjectId']}:${r['@version']}:${r['@type']}:current`,
          id: r['@refObjectId'],
          type: r['@type'],
          currentVersion: r['@version'],
          newVersion: r['@version'],
          description: getLangList(r['common:shortDescription']),
          newDescription: currentNormDesc,
        } as any);
        if (otherVersions.length > 0) {
          otherVersions.forEach((ver: string, idx: number) => {
            const newRow = rows.find(
              (row: any) => row?.version === ver && row.id === r['@refObjectId'],
            );
            const newDesc = getNewVersionShortDescription(newRow?.json, r['@type']);
            newRefs.push({
              key: `${r['@refObjectId']}:${r['@version']}:${r['@type']}:${idx}`,
              id: r['@refObjectId'],
              type: r['@type'],
              currentVersion: r['@version'],
              newVersion: ver,
              description: getLangList(r['common:shortDescription']),
              newDescription: newDesc,
            });
          });
        }
      } catch (e) {
        // ignore single ref error
      }
    }),
  );
  return { newRefs, oldRefs };
};

export const getRefsOfCurrentVersion = async (initData: any) => {
  if (!initData) return { oldRefs: [] as RefVersionItem[] };
  const refObjs = getAllRefObj(initData) ?? [];
  const seen = new Set<string>();
  const unique = refObjs.filter((r: any) => {
    const key = `${r['@refObjectId']}:${r['@version']}:${r['@type']}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const oldRefs: RefVersionItem[] = [];
  await Promise.all(
    unique.map(async (r: any) => {
      const table = getRefTableName(r['@type']);
      if (!table) return;
      try {
        const result = await getDataDetail(r['@refObjectId'], r['@version'], table);
        const currentRow = result?.data;
        if (currentRow) {
          const currentNormDesc = getNewVersionShortDescription(currentRow?.json, r['@type']);
          oldRefs.push({
            key: `${r['@refObjectId']}:${r['@version']}:${r['@type']}:current`,
            id: r['@refObjectId'],
            type: r['@type'],
            currentVersion: r['@version'],
            newVersion: r['@version'],
            description: getLangList(r['common:shortDescription']),
            newDescription: currentNormDesc,
          } as any);
        }
      } catch (e) {
        // ignore single ref error
      }
    }),
  );
  return { oldRefs };
};

export function updateRefsData(obj: any, newRefs: RefVersionItem[], updateVersion: boolean) {
  if (!obj || !newRefs || !Array.isArray(newRefs)) {
    return obj;
  }

  const newRefsMap = new Map<string, RefVersionItem>();
  newRefs.forEach((ref) => {
    if (ref?.id && ref?.type) {
      const key = `${ref.id}|${ref.type}`;
      newRefsMap.set(key, ref);
    }
  });

  const visited = new WeakSet();

  const traverse = (current: any) => {
    if (!current || typeof current !== 'object') return;

    if (visited.has(current)) return;
    visited.add(current);

    if (
      '@refObjectId' in current &&
      current['@refObjectId'] &&
      '@type' in current &&
      current['@type']
    ) {
      const key = `${current['@refObjectId']}|${current['@type']}`;
      const matchedRef = newRefsMap.get(key);
      if (matchedRef) {
        if (updateVersion) {
          current['@version'] = matchedRef.newVersion;
        }
        if (matchedRef.newDescription && matchedRef.newDescription.length > 0) {
          current['common:shortDescription'] = matchedRef.newDescription;
        }
      }
    }

    if (Array.isArray(current)) {
      current.forEach((item) => traverse(item));
    } else if (typeof current === 'object') {
      Object.values(current).forEach((value) => traverse(value));
    }
  };

  traverse(obj);
  return obj;
}
