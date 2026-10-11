import {
  queryExactPublishedLciaResults,
  type PublishedLciaExactValue,
  type PublishedLciaProcessSelection,
} from './api';

// Reviewed Climate change method (01.00.000); excludes biogenic/fossil/land-use subcategories.
export const PUBLISHED_CLIMATE_METHOD_ID = '6209b35f-9447-40b5-b68c-a1099e3674a0';

export function publishedProcessKey(process: PublishedLciaProcessSelection): string {
  return `${process.id}:${process.version}`;
}

function hasIdentity(value: unknown): boolean {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as Record<string, unknown>).id === 'string' &&
    !!(value as Record<string, string>).id.trim()
  );
}

export async function getPublishedClimateResults(
  processes: PublishedLciaProcessSelection[],
): Promise<Map<string, PublishedLciaExactValue>> {
  if (processes.length === 0) return new Map();
  const requested = new Set(processes.map(publishedProcessKey));
  if (processes.length > 100 || requested.size !== processes.length) {
    throw new Error('invalid_published_climate_selection');
  }
  const result = await queryExactPublishedLciaResults({
    impactCategoryId: PUBLISHED_CLIMATE_METHOD_ID,
    processes,
  });
  if (result.error) throw new Error('published_climate_query_failed');
  const data = result.data;
  if (
    !data ||
    data.mode !== 'processes_one_impact_exact' ||
    data.impact_id !== PUBLISHED_CLIMATE_METHOD_ID ||
    !hasIdentity(data.publication) ||
    !hasIdentity(data.package) ||
    data.rowCount !== processes.length ||
    !Array.isArray(data.values) ||
    data.values.length !== processes.length
  ) {
    throw new Error('invalid_published_climate_response');
  }
  const values = new Map<string, PublishedLciaExactValue>();
  for (const row of data.values) {
    if (!row || typeof row.id !== 'string' || typeof row.version !== 'string') {
      throw new Error('invalid_published_climate_response');
    }
    const key = publishedProcessKey(row);
    if (
      !requested.has(key) ||
      values.has(key) ||
      typeof row.unit !== 'string' ||
      (row.status === 'available'
        ? typeof row.value !== 'number' || !Number.isFinite(row.value) || !row.unit.trim()
        : row.status !== 'missing' || row.value !== null)
    ) {
      throw new Error('invalid_published_climate_response');
    }
    values.set(key, row);
  }
  return values;
}
