import type { PublishedLciaResults } from '@/services/dataProducts';
import type { LcaAnalysisDataScope } from './lcaAnalysisShared';

export type PublishedLciaQueryMeta = {
  snapshotId: string;
  resultId: string;
  source: string;
  computedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(record: Record<string, unknown> | null | undefined, keys: string[]): string {
  if (!record) {
    return '';
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

export function shouldUsePublishedLciaResults(dataScope?: LcaAnalysisDataScope): boolean {
  return process.env.APP_PUBLIC_LCIA_RESULTS_ENABLED === 'true' && dataScope === 'open_data';
}

export function publishedLciaQueryMeta(
  data: PublishedLciaResults | null | undefined,
): PublishedLciaQueryMeta {
  const packageRecord = isRecord(data?.package) ? data.package : null;
  const publicationRecord = isRecord(data?.publication) ? data.publication : null;

  return {
    snapshotId: readString(packageRecord, ['snapshotId', 'snapshot_id']) || '-',
    resultId: readString(packageRecord, ['packageId', 'package_id', 'id']) || '-',
    source: 'published_package',
    computedAt: readString(publicationRecord, ['publishedAt', 'published_at']) || '-',
  };
}

export function publishedValuesByProcessId(
  data: PublishedLciaResults | null | undefined,
): Record<string, unknown> {
  const values = data?.values;
  return isRecord(values) ? values : {};
}
