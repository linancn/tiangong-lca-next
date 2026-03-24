import { getDataSource, getLangJson } from '@/services/general/util';
import type { LCIAResultTable, LciaMethodListData } from '@/services/lciaMethods/data';
import { cacheAndDecompressMethod, getDecompressedMethod } from '@/services/lciaMethods/util';
import type { ProcessTable } from '@/services/processes/data';

export const LCA_SCOPE = 'dev-v1';
export const VALUE_EPSILON = 1e-12;
export const UNKNOWN_LCIA_UNIT = 'unknown';

type LciaMethodListEntry = {
  id?: string;
  version?: string;
  description?: unknown;
  referenceQuantity?: {
    'common:shortDescription'?: unknown;
  };
};

export type ImpactOption = {
  value: string;
  label: string;
  unit: string;
};

export type LcaProcessOption = {
  selectionKey: string;
  value: string;
  processId: string;
  name: string;
  version: string;
  label: string;
};

export type LcaAnalysisDataScope = 'current_user' | 'open_data' | 'all_data';

type LcaMethodMeta = {
  description?: unknown;
  version?: string;
  referenceQuantityDesc?: unknown;
};

export type SolverLcaImpactValueRow = {
  impact_id: string;
  impact_name: string;
  unit: string;
  value: number;
};

export function resolveLangText(value: unknown, lang: string): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const normalizedLang = lang.toLowerCase();
    const preferred = value.find((item) => {
      const itemLang =
        typeof item?.['@xml:lang'] === 'string' ? item['@xml:lang'].toLowerCase() : '';
      return itemLang === normalizedLang || itemLang.startsWith(`${normalizedLang}-`);
    });
    const fallback = preferred ?? value.find((item) => typeof item?.['#text'] === 'string');
    return typeof fallback?.['#text'] === 'string' ? fallback['#text'].trim() : '';
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record['#text'] === 'string') {
      return record['#text'].trim();
    }
  }

  return '';
}

export function normalizeNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getDefaultLcaDataScopeForPath(
  pathname: string,
): Exclude<LcaAnalysisDataScope, 'all_data'> | undefined {
  const dataSource = getDataSource(pathname);
  if (dataSource === 'my') {
    return 'current_user';
  }
  if (dataSource === 'tg') {
    return 'open_data';
  }
  return undefined;
}

export function buildLcaProcessSelectionKey(processId: string, version: unknown): string {
  const normalizedProcessId = String(processId ?? '').trim();
  const normalizedVersion = String(version ?? '').trim();
  return normalizedVersion ? `${normalizedProcessId}:${normalizedVersion}` : normalizedProcessId;
}

export function buildLcaProcessOptions(
  processes: ProcessTable[],
  config: { dedupeByProcessId?: boolean } = {},
): LcaProcessOption[] {
  const dedupeByProcessId = config.dedupeByProcessId ?? true;
  const seen = new Set<string>();
  const result: LcaProcessOption[] = [];

  processes.forEach((process) => {
    const processId = String(process.id ?? '').trim();
    const version = String(process.version ?? '').trim() || '-';
    const selectionKey = buildLcaProcessSelectionKey(processId, process.version);
    const dedupeKey = dedupeByProcessId ? processId : selectionKey;
    if (!processId || seen.has(dedupeKey)) {
      return;
    }
    seen.add(dedupeKey);
    const processName = String(process.name ?? '').trim() || processId;
    result.push({
      selectionKey,
      value: processId,
      processId,
      name: processName,
      version,
      label: `${processName} (${version})`,
    });
  });

  return result;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatSourceLabel(source: string): string {
  return source.replace(/_/g, ' ');
}

export function toProgressPercent(normalizedValue: number): number {
  if (!Number.isFinite(normalizedValue) || normalizedValue <= VALUE_EPSILON) {
    return 0;
  }
  return Math.max(Math.round(normalizedValue * 100), 1);
}

export function toProgressStatus(
  direction: 'positive' | 'negative' | 'neutral',
): 'normal' | 'exception' {
  return direction === 'negative' ? 'exception' : 'normal';
}

function readTrimmedString(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

async function getLciaMethodListEntries(): Promise<LciaMethodListEntry[]> {
  let listData = await getDecompressedMethod<LciaMethodListData>('list.json');
  const needsUpdate = listData && !listData.files?.[0]?.referenceQuantity;

  if (!listData || needsUpdate) {
    const cached = await cacheAndDecompressMethod('list.json');
    if (!cached) {
      throw new Error('load_lcia_method_list_failed');
    }
    listData = await getDecompressedMethod<LciaMethodListData>('list.json');
  }

  return Array.isArray(listData?.files)
    ? (listData.files.filter(
        (item: unknown): item is LciaMethodListEntry => !!item && typeof item === 'object',
      ) as LciaMethodListEntry[])
    : [];
}

export async function loadImpactOptions(lang: string): Promise<ImpactOption[]> {
  const files = await getLciaMethodListEntries();

  return files
    .map((item) => {
      const value = readTrimmedString(item.id);
      if (!value) {
        return null;
      }

      const label = resolveLangText(item.description, lang) || value;
      const unit =
        resolveLangText(item.referenceQuantity?.['common:shortDescription'], lang) || '-';

      return {
        value,
        label,
        unit,
      } satisfies ImpactOption;
    })
    .filter((item): item is ImpactOption => !!item)
    .sort((left, right) => left.label.localeCompare(right.label));
}

export async function getLcaMethodMetaMap(
  impactIds: string[],
): Promise<Map<string, LcaMethodMeta>> {
  const impactIdSet = new Set(impactIds.filter((id) => !!id));
  if (impactIdSet.size === 0) {
    return new Map<string, LcaMethodMeta>();
  }

  const files = await getLciaMethodListEntries();
  const byId = new Map<string, LcaMethodMeta>();

  files.forEach((item) => {
    const methodId = readTrimmedString(item.id);
    if (!methodId || !impactIdSet.has(methodId)) {
      return;
    }

    byId.set(methodId, {
      description: item.description,
      version: item.version,
      referenceQuantityDesc: getLangJson(item.referenceQuantity?.['common:shortDescription']),
    });
  });

  return byId;
}

function toLangFallback(text: string) {
  return getLangJson({ '@xml:lang': 'en', '#text': text });
}

export function buildMergedLcaRows(
  baseRows: LCIAResultTable[],
  solverRows: SolverLcaImpactValueRow[],
  methodMetaById: Map<string, LcaMethodMeta>,
): LCIAResultTable[] {
  const mergedRows = baseRows.map((row) => ({
    ...row,
    referenceToLCIAMethodDataSet: { ...row.referenceToLCIAMethodDataSet },
  }));
  const indexByMethodId = new Map<string, number>();

  mergedRows.forEach((row, idx) => {
    const methodId = String(row?.referenceToLCIAMethodDataSet?.['@refObjectId'] ?? '').trim();
    if (methodId) {
      indexByMethodId.set(methodId, idx);
    }
  });

  solverRows.forEach((solverRow) => {
    const methodId = solverRow.impact_id;
    const methodMeta = methodMetaById.get(methodId);
    const shortDescription =
      methodMeta?.description ??
      toLangFallback(solverRow.impact_name?.trim() || solverRow.impact_id || '-');
    const unitDesc =
      methodMeta?.referenceQuantityDesc ??
      (solverRow.unit?.trim() && solverRow.unit !== UNKNOWN_LCIA_UNIT
        ? toLangFallback(solverRow.unit)
        : undefined);
    const existingIdx = indexByMethodId.get(methodId);

    if (existingIdx !== undefined) {
      const existing = mergedRows[existingIdx];
      mergedRows[existingIdx] = {
        ...existing,
        meanAmount: solverRow.value,
        referenceQuantityDesc: existing.referenceQuantityDesc || unitDesc,
        referenceToLCIAMethodDataSet: {
          ...existing.referenceToLCIAMethodDataSet,
          '@version':
            existing.referenceToLCIAMethodDataSet?.['@version'] || methodMeta?.version || '',
          'common:shortDescription':
            existing.referenceToLCIAMethodDataSet?.['common:shortDescription'] ||
            (shortDescription as LCIAResultTable['referenceToLCIAMethodDataSet']['common:shortDescription']),
        },
      };
      return;
    }

    mergedRows.push({
      key: methodId,
      referenceToLCIAMethodDataSet: {
        '@refObjectId': methodId,
        '@type': 'lCIA method data set',
        '@uri': `../lciamethods/${methodId}.xml`,
        '@version': methodMeta?.version || '',
        'common:shortDescription':
          shortDescription as LCIAResultTable['referenceToLCIAMethodDataSet']['common:shortDescription'],
      },
      meanAmount: solverRow.value,
      referenceQuantityDesc: unitDesc as string | undefined,
    });
  });

  return mergedRows;
}
