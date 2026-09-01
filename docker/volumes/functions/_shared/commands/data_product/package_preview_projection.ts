import type { DataProductPackagePreviewRequest } from './types.ts';

export const LCIA_RESULT_PACKAGE_PREVIEW_DEFAULT_LIMIT = 25;
export const LCIA_RESULT_PACKAGE_PREVIEW_MAX_LIMIT = 100;
export const LCIA_ALL_UNIT_QUERY_FORMAT = 'all-unit-query:v1';

export type SnapshotIndexProcessEntry = {
  process_id: string;
  process_index: number;
  process_version: string;
};

export type SnapshotIndexImpactEntry = {
  impact_id: string;
  impact_index: number;
  impact_key?: string;
  impact_name: string;
  unit: string;
};

export type SnapshotIndexDocument = {
  version: number;
  snapshot_id: string;
  process_count: number;
  impact_count: number;
  process_map: SnapshotIndexProcessEntry[];
  impact_map: SnapshotIndexImpactEntry[];
};

export type AllUnitQueryEnvelope = {
  version: number;
  format: string;
  snapshot_id: string;
  job_id: string;
  process_count: number;
  impact_count: number;
  h_matrix: number[][];
};

export type LciaResultPackageInputRow = {
  rowNumber: number;
  processId: string;
  processVersion: string;
  processName: string;
  processIndex: number | null;
  stateCode: number | string | null;
};

export type LciaResultPackageDetailRow = LciaResultPackageInputRow & {
  impactCategoryId: string | null;
  impactKey: string | null;
  impactIndex: number | null;
  impactName: string | null;
  impactVersion: string | null;
  unit: string | null;
  value: number | null;
};

export type LciaResultPackageImpactOption = {
  impactCategoryId: string;
  impactKey: string;
  impactIndex: number;
  impactName: string;
  impactVersion: string | null;
  unit: string;
};

export type LciaResultPackageInputScope = {
  processCount: number;
  selectionMode: string | null;
  predicateVersion: string | null;
  stateCodeCounts: Array<{ stateCode: string; count: number }>;
};

export type LciaResultPackageProcessMetadata = {
  processId: string;
  processVersion: string;
  processName: string;
};

export type LciaResultPackageImpactMetadata = {
  impactCategoryId: string;
  impactVersion?: string | null;
  impactName?: string | null;
  unit?: string | null;
};

export type LciaResultPackagePreviewProjection = {
  detailPage:
    | {
        status: 'ready';
        impactCategoryId: string;
        impactKey: string;
        impactIndex: number;
        impactName: string;
        impactVersion: string | null;
        unit: string;
        offset: number;
        limit: number;
        returnedCount: number;
        totalCount: number;
        omittedInputCount: number;
        rows: LciaResultPackageDetailRow[];
      }
    | {
        status: 'unavailable';
        reason: string;
        offset: number;
        limit: number;
        returnedCount: number;
        totalCount: number;
        omittedInputCount: number;
        rows: LciaResultPackageDetailRow[];
      };
  impactOptions: LciaResultPackageImpactOption[];
};

export type PublishedLciaProcessRef = {
  id: string;
  version: string;
};

export type PublishedLciaAllImpactsProjection = {
  mode: 'process_all_impacts';
  process: { processId: string; processVersion: string };
  rowCount: number;
  values: Array<{
    impact_id: string;
    impact_index: number;
    impact_name: string;
    unit: string;
    value: number;
  }>;
};

export type PublishedLciaProcessesOneImpactProjection = {
  mode: 'processes_one_impact';
  impact_id: string;
  impact_index: number;
  rowCount: number;
  values: Record<string, number>;
};

export type PublishedLciaRankedProcessesProjection = {
  kind: 'ranked_processes';
  impact_id: string;
  impact_index: number;
  sort_by: 'absolute_value';
  sort_direction: 'desc';
  offset: number;
  limit: number;
  returned_count: number;
  total_process_count: number;
  total_absolute_value: number;
  values: Array<{
    process_id: string;
    process_version: string;
    process_index: number;
    value: number;
    absolute_value: number;
  }>;
};

type ProjectPreviewRowsInput = {
  preview: unknown;
  request: DataProductPackagePreviewRequest;
  snapshotIndex?: SnapshotIndexDocument | null;
  queryArtifact?: AllUnitQueryEnvelope | null;
  processMetadata?: LciaResultPackageProcessMetadata[];
  impactMetadata?: LciaResultPackageImpactMetadata[];
  resolvedValues?: {
    snapshotId: string;
    impactIndex: number;
    valuesByProcessIndex: Map<number, number>;
  } | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function recordField(value: unknown, field: string): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }
  const fieldValue = value[field];
  return isRecord(fieldValue) ? fieldValue : null;
}

function arrayField(value: unknown, field: string): unknown[] {
  if (!isRecord(value)) {
    return [];
  }
  const fieldValue = value[field];
  return Array.isArray(fieldValue) ? fieldValue : [];
}

function stringField(value: unknown, field: string): string | null {
  if (!isRecord(value)) {
    return null;
  }
  const fieldValue = value[field];
  return typeof fieldValue === 'string' && fieldValue.trim().length > 0 ? fieldValue.trim() : null;
}

function numberLikeField(value: unknown, ...fields: string[]): number | string | null {
  if (!isRecord(value)) {
    return null;
  }

  for (const field of fields) {
    const fieldValue = value[field];
    if (typeof fieldValue === 'number' && Number.isFinite(fieldValue)) {
      return fieldValue;
    }
    if (typeof fieldValue === 'string' && fieldValue.trim().length > 0) {
      const numeric = Number(fieldValue);
      return Number.isFinite(numeric) ? numeric : fieldValue.trim();
    }
  }

  return null;
}

function normalizeOffset(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizeLimit(value: unknown): number {
  const parsed = Number(value ?? LCIA_RESULT_PACKAGE_PREVIEW_DEFAULT_LIMIT);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return LCIA_RESULT_PACKAGE_PREVIEW_DEFAULT_LIMIT;
  }
  return Math.min(parsed, LCIA_RESULT_PACKAGE_PREVIEW_MAX_LIMIT);
}

function rowOffsetFrom(request: DataProductPackagePreviewRequest): number {
  return normalizeOffset(request.rowOffset ?? request.resultOffset ?? request.inputOffset);
}

function rowLimitFrom(request: DataProductPackagePreviewRequest): number {
  return normalizeLimit(request.rowLimit ?? request.resultLimit ?? request.inputLimit);
}

function processLookupKey(processId: string, processVersion: string): string {
  return `${processId}@${processVersion}`;
}

function processMetadataLookup(
  processMetadata: LciaResultPackageProcessMetadata[] = [],
): Map<string, LciaResultPackageProcessMetadata> {
  const lookup = new Map<string, LciaResultPackageProcessMetadata>();
  for (const metadata of processMetadata) {
    if (metadata.processId && metadata.processVersion && metadata.processName) {
      lookup.set(processLookupKey(metadata.processId, metadata.processVersion), metadata);
    }
  }
  return lookup;
}

function impactMetadataLookup(
  impactMetadata: LciaResultPackageImpactMetadata[] = [],
): Map<string, LciaResultPackageImpactMetadata> {
  const lookup = new Map<string, LciaResultPackageImpactMetadata>();
  for (const metadata of impactMetadata) {
    if (metadata.impactCategoryId) {
      lookup.set(metadata.impactCategoryId, metadata);
    }
  }
  return lookup;
}

function buildProcessIndexLookup(
  snapshotIndex?: SnapshotIndexDocument | null,
): Map<string, number> {
  const lookup = new Map<string, number>();
  for (const entry of snapshotIndex?.process_map ?? []) {
    if (
      entry.process_id &&
      entry.process_version &&
      Number.isInteger(entry.process_index) &&
      entry.process_index >= 0
    ) {
      lookup.set(processLookupKey(entry.process_id, entry.process_version), entry.process_index);
    }
  }
  return lookup;
}

function inputRowsFrom(
  preview: unknown,
  snapshotIndex?: SnapshotIndexDocument | null,
  processMetadata?: LciaResultPackageProcessMetadata[],
): LciaResultPackageInputRow[] {
  const manifest = recordField(preview, 'inputManifest');
  const processes = arrayField(manifest, 'processes');
  const processIndexLookup = buildProcessIndexLookup(snapshotIndex);
  const metadataLookup = processMetadataLookup(processMetadata);

  return processes.map((process, index) => {
    const processId = stringField(process, 'id') ?? '';
    const processVersion = stringField(process, 'version') ?? '';
    const processIndex =
      processId && processVersion
        ? (processIndexLookup.get(processLookupKey(processId, processVersion)) ?? null)
        : null;
    const metadata =
      processId && processVersion
        ? metadataLookup.get(processLookupKey(processId, processVersion))
        : null;

    return {
      rowNumber: index + 1,
      processId,
      processVersion,
      processName: metadata?.processName ?? processId,
      processIndex,
      stateCode: numberLikeField(process, 'stateCode', 'state_code'),
    };
  });
}

export function inputManifestSummaryFromPackagePreview(
  preview: unknown,
): Record<string, string> | null {
  const manifest = recordField(preview, 'inputManifest');
  if (!manifest) {
    return null;
  }

  return {
    ...(stringField(manifest, 'selectionMode')
      ? { selectionMode: stringField(manifest, 'selectionMode')! }
      : {}),
    ...(stringField(manifest, 'predicateVersion')
      ? { predicateVersion: stringField(manifest, 'predicateVersion')! }
      : {}),
  };
}

export function inputScopeFromPackagePreview(preview: unknown): LciaResultPackageInputScope {
  const manifest = recordField(preview, 'inputManifest');
  const processes = arrayField(manifest, 'processes');
  const stateCodeCounts = new Map<string, number>();
  for (const process of processes) {
    const stateCode = numberLikeField(process, 'stateCode', 'state_code');
    const key = stateCode === null ? '-' : String(stateCode);
    stateCodeCounts.set(key, (stateCodeCounts.get(key) ?? 0) + 1);
  }

  return {
    processCount: processes.length,
    selectionMode: stringField(manifest, 'selectionMode'),
    predicateVersion: stringField(manifest, 'predicateVersion'),
    stateCodeCounts: Array.from(stateCodeCounts)
      .map(([stateCode, count]) => ({ stateCode, count }))
      .sort((left, right) => left.stateCode.localeCompare(right.stateCode)),
  };
}

function impactOptionsFrom(
  snapshotIndex?: SnapshotIndexDocument | null,
  impactMetadata?: LciaResultPackageImpactMetadata[],
): LciaResultPackageImpactOption[] {
  const metadataLookup = impactMetadataLookup(impactMetadata);
  return [...(snapshotIndex?.impact_map ?? [])]
    .filter(
      (entry) => entry.impact_id && Number.isInteger(entry.impact_index) && entry.impact_index >= 0,
    )
    .sort((left, right) => left.impact_index - right.impact_index)
    .map((entry) => {
      const metadata = metadataLookup.get(entry.impact_id);
      return {
        impactCategoryId: entry.impact_id,
        impactKey: entry.impact_key || entry.impact_id,
        impactIndex: entry.impact_index,
        impactName: metadata?.impactName || entry.impact_name || entry.impact_id,
        impactVersion: metadata?.impactVersion ?? null,
        unit: metadata?.unit || entry.unit || '',
      };
    });
}

export function selectPreviewImpact(
  preview: unknown,
  request: DataProductPackagePreviewRequest,
  impactOptions: LciaResultPackageImpactOption[],
): LciaResultPackageImpactOption | null {
  if (impactOptions.length === 0) {
    return null;
  }

  const summary = recordField(preview, 'summary');
  const requested =
    request.impactCategoryId?.trim() || stringField(summary, 'defaultImpactCategory') || '';
  if (requested) {
    const hit = impactOptions.find(
      (impact) => impact.impactCategoryId === requested || impact.impactKey === requested,
    );
    if (hit) {
      return hit;
    }
  }

  return impactOptions[0];
}

function selectImpactByCategoryId(
  preview: unknown,
  impactCategoryId: string,
  impactOptions: LciaResultPackageImpactOption[],
): LciaResultPackageImpactOption | null {
  return selectPreviewImpact(
    preview,
    {
      action: 'preview_package',
      packageId: 'current-public',
      impactCategoryId,
    },
    impactOptions,
  );
}

function resultProjectionUnavailable(
  snapshotIndex?: SnapshotIndexDocument | null,
  queryArtifact?: AllUnitQueryEnvelope | null,
): boolean {
  return (
    !snapshotIndex ||
    !queryArtifact ||
    queryArtifact.format !== LCIA_ALL_UNIT_QUERY_FORMAT ||
    queryArtifact.snapshot_id !== snapshotIndex.snapshot_id
  );
}

function finiteMatrixValue(
  queryArtifact: AllUnitQueryEnvelope,
  processIndex: number,
  impactIndex: number,
): number {
  const hRow = queryArtifact.h_matrix[processIndex];
  if (!Array.isArray(hRow)) {
    return 0;
  }
  const value = Number(hRow[impactIndex] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export function projectPublishedProcessAllImpacts({
  preview,
  snapshotIndex,
  queryArtifact,
  impactMetadata,
  processId,
  processVersion,
  impactCategoryId,
}: {
  preview: unknown;
  snapshotIndex?: SnapshotIndexDocument | null;
  queryArtifact?: AllUnitQueryEnvelope | null;
  impactMetadata?: LciaResultPackageImpactMetadata[];
  processId: string;
  processVersion: string;
  impactCategoryId?: string;
}): PublishedLciaAllImpactsProjection {
  const impactOptions = impactOptionsFrom(snapshotIndex, impactMetadata);
  const processIndex = buildProcessIndexLookup(snapshotIndex).get(
    processLookupKey(processId, processVersion),
  );
  const selectedImpact = impactCategoryId
    ? selectImpactByCategoryId(preview, impactCategoryId, impactOptions)
    : null;
  const selectedImpacts = impactCategoryId
    ? selectedImpact
      ? [selectedImpact]
      : []
    : impactOptions;

  if (
    resultProjectionUnavailable(snapshotIndex, queryArtifact) ||
    typeof processIndex !== 'number'
  ) {
    return {
      mode: 'process_all_impacts',
      process: { processId, processVersion },
      rowCount: 0,
      values: [],
    };
  }

  const values = selectedImpacts.map((impact) => ({
    impact_id: impact.impactCategoryId,
    impact_index: impact.impactIndex,
    impact_name: impact.impactName,
    unit: impact.unit,
    value: finiteMatrixValue(queryArtifact!, processIndex, impact.impactIndex),
  }));

  return {
    mode: 'process_all_impacts',
    process: { processId, processVersion },
    rowCount: values.length,
    values,
  };
}

export function projectPublishedProcessesOneImpact({
  preview,
  snapshotIndex,
  queryArtifact,
  impactMetadata,
  impactCategoryId,
  processes,
}: {
  preview: unknown;
  snapshotIndex?: SnapshotIndexDocument | null;
  queryArtifact?: AllUnitQueryEnvelope | null;
  impactMetadata?: LciaResultPackageImpactMetadata[];
  impactCategoryId: string;
  processes: PublishedLciaProcessRef[];
}): PublishedLciaProcessesOneImpactProjection {
  const impact = selectImpactByCategoryId(
    preview,
    impactCategoryId,
    impactOptionsFrom(snapshotIndex, impactMetadata),
  );
  const values: Record<string, number> = {};

  if (resultProjectionUnavailable(snapshotIndex, queryArtifact) || !impact) {
    for (const process of processes) {
      values[process.id] = 0;
    }
    return {
      mode: 'processes_one_impact',
      impact_id: impactCategoryId,
      impact_index: -1,
      rowCount: processes.length,
      values,
    };
  }

  const processIndexLookup = buildProcessIndexLookup(snapshotIndex);
  for (const process of processes) {
    const processIndex = processIndexLookup.get(processLookupKey(process.id, process.version));
    values[process.id] =
      typeof processIndex === 'number'
        ? finiteMatrixValue(queryArtifact!, processIndex, impact.impactIndex)
        : 0;
  }

  return {
    mode: 'processes_one_impact',
    impact_id: impact.impactCategoryId,
    impact_index: impact.impactIndex,
    rowCount: processes.length,
    values,
  };
}

export function projectPublishedRankedProcessesOneImpact({
  preview,
  snapshotIndex,
  queryArtifact,
  processMetadata,
  impactMetadata,
  impactCategoryId,
  offset,
  limit,
}: {
  preview: unknown;
  snapshotIndex?: SnapshotIndexDocument | null;
  queryArtifact?: AllUnitQueryEnvelope | null;
  processMetadata?: LciaResultPackageProcessMetadata[];
  impactMetadata?: LciaResultPackageImpactMetadata[];
  impactCategoryId: string;
  offset: number;
  limit: number;
}): PublishedLciaRankedProcessesProjection {
  const normalizedOffset = normalizeOffset(offset);
  const normalizedLimit = normalizeLimit(limit);
  const impact = selectImpactByCategoryId(
    preview,
    impactCategoryId,
    impactOptionsFrom(snapshotIndex, impactMetadata),
  );

  if (resultProjectionUnavailable(snapshotIndex, queryArtifact) || !impact) {
    return {
      kind: 'ranked_processes',
      impact_id: impactCategoryId,
      impact_index: -1,
      sort_by: 'absolute_value',
      sort_direction: 'desc',
      offset: normalizedOffset,
      limit: normalizedLimit,
      returned_count: 0,
      total_process_count: 0,
      total_absolute_value: 0,
      values: [],
    };
  }

  const ranked = inputRowsFrom(preview, snapshotIndex, processMetadata)
    .filter((row) => typeof row.processIndex === 'number')
    .map((row) => {
      const value = finiteMatrixValue(queryArtifact!, row.processIndex!, impact.impactIndex);
      return {
        process_id: row.processId,
        process_version: row.processVersion,
        process_index: row.processIndex!,
        value,
        absolute_value: Math.abs(value),
      };
    })
    .sort((left, right) => {
      if (right.absolute_value !== left.absolute_value) {
        return right.absolute_value - left.absolute_value;
      }
      return `${left.process_id}@${left.process_version}`.localeCompare(
        `${right.process_id}@${right.process_version}`,
      );
    });

  const values = ranked.slice(normalizedOffset, normalizedOffset + normalizedLimit);

  return {
    kind: 'ranked_processes',
    impact_id: impact.impactCategoryId,
    impact_index: impact.impactIndex,
    sort_by: 'absolute_value',
    sort_direction: 'desc',
    offset: normalizedOffset,
    limit: normalizedLimit,
    returned_count: values.length,
    total_process_count: ranked.length,
    total_absolute_value: ranked.reduce((sum, row) => sum + row.absolute_value, 0),
    values,
  };
}

function unavailableResultPage(
  reason: string,
  request: DataProductPackagePreviewRequest,
  inputRows: LciaResultPackageInputRow[],
): LciaResultPackagePreviewProjection['detailPage'] {
  const offset = rowOffsetFrom(request);
  const limit = rowLimitFrom(request);
  const rows = inputRows.slice(offset, offset + limit).map((row) => ({
    ...row,
    impactCategoryId: null,
    impactKey: null,
    impactIndex: null,
    impactName: null,
    impactVersion: null,
    unit: null,
    value: null,
  }));
  return {
    status: 'unavailable',
    reason,
    offset,
    limit,
    returnedCount: rows.length,
    totalCount: inputRows.length,
    omittedInputCount: 0,
    rows,
  };
}

export function projectLciaResultPackagePreviewRows({
  preview,
  request,
  snapshotIndex,
  queryArtifact,
  processMetadata,
  impactMetadata,
  resolvedValues,
}: ProjectPreviewRowsInput): LciaResultPackagePreviewProjection {
  const rowOffset = rowOffsetFrom(request);
  const rowLimit = rowLimitFrom(request);
  const inputRows = inputRowsFrom(preview, snapshotIndex, processMetadata);
  const impactOptions = impactOptionsFrom(snapshotIndex, impactMetadata);

  if (!snapshotIndex || (!queryArtifact && !resolvedValues)) {
    return {
      detailPage: unavailableResultPage(
        'result_projection_artifacts_unavailable',
        request,
        inputRows,
      ),
      impactOptions,
    };
  }

  const projectionBindingMatches = resolvedValues
    ? resolvedValues.snapshotId === snapshotIndex.snapshot_id
    : queryArtifact?.format === LCIA_ALL_UNIT_QUERY_FORMAT &&
      queryArtifact.snapshot_id === snapshotIndex.snapshot_id;
  if (!projectionBindingMatches) {
    return {
      detailPage: unavailableResultPage('result_projection_artifact_mismatch', request, inputRows),
      impactOptions,
    };
  }

  const impact = selectPreviewImpact(preview, request, impactOptions);
  if (!impact) {
    return {
      detailPage: unavailableResultPage('impact_category_unavailable', request, inputRows),
      impactOptions,
    };
  }

  const pageInputRows = inputRows.slice(rowOffset, rowOffset + rowLimit);
  const resultPageRows: LciaResultPackageDetailRow[] = [];
  let omittedInputCount = 0;
  for (const inputRow of pageInputRows) {
    if (inputRow.processIndex === null) {
      omittedInputCount += 1;
      continue;
    }

    const resolvedValue =
      resolvedValues?.impactIndex === impact.impactIndex
        ? resolvedValues.valuesByProcessIndex.get(inputRow.processIndex)
        : undefined;
    const hRow = queryArtifact?.h_matrix[inputRow.processIndex];
    if (resolvedValues && resolvedValue === undefined) {
      omittedInputCount += 1;
      continue;
    }
    if (!resolvedValues && !Array.isArray(hRow)) {
      omittedInputCount += 1;
      continue;
    }

    const value = Number(resolvedValues ? resolvedValue : (hRow?.[impact.impactIndex] ?? 0));
    resultPageRows.push({
      ...inputRow,
      processIndex: inputRow.processIndex,
      impactCategoryId: impact.impactCategoryId,
      impactKey: impact.impactKey,
      impactIndex: impact.impactIndex,
      impactName: impact.impactName,
      impactVersion: impact.impactVersion,
      unit: impact.unit,
      value: Number.isFinite(value) ? value : 0,
    });
  }

  return {
    detailPage: {
      status: 'ready',
      impactCategoryId: impact.impactCategoryId,
      impactKey: impact.impactKey,
      impactIndex: impact.impactIndex,
      impactName: impact.impactName,
      impactVersion: impact.impactVersion,
      unit: impact.unit,
      offset: rowOffset,
      limit: rowLimit,
      returnedCount: resultPageRows.length,
      totalCount: inputRows.length,
      omittedInputCount,
      rows: resultPageRows,
    },
    impactOptions,
  };
}

export function previewMetadataRefsFromProjection(projection: LciaResultPackagePreviewProjection): {
  processes: Array<{ processId: string; processVersion: string }>;
  impactCategoryIds: string[];
} {
  const processKeys = new Set<string>();
  const processes: Array<{ processId: string; processVersion: string }> = [];
  for (const row of projection.detailPage.rows) {
    if (!row.processId || !row.processVersion) {
      continue;
    }
    const key = processLookupKey(row.processId, row.processVersion);
    if (!processKeys.has(key)) {
      processKeys.add(key);
      processes.push({
        processId: row.processId,
        processVersion: row.processVersion,
      });
    }
  }

  const impactCategoryIds = Array.from(
    new Set(
      [
        projection.detailPage.status === 'ready' ? projection.detailPage.impactCategoryId : null,
      ].filter(
        (impactCategoryId): impactCategoryId is string =>
          typeof impactCategoryId === 'string' && impactCategoryId.length > 0,
      ),
    ),
  );

  return { processes, impactCategoryIds };
}

export function snapshotIdFromPackagePreview(preview: unknown): string | null {
  const summary = recordField(preview, 'summary');
  const manifest = recordField(preview, 'artifactManifest');
  const snapshotBuilder = recordField(manifest, 'snapshotBuilder');
  return stringField(summary, 'snapshotId') ?? stringField(snapshotBuilder, 'resolved_snapshot_id');
}

export function queryArtifactUrlFromPackagePreview(preview: unknown): string | null {
  const queryArtifact = recordField(preview, 'queryArtifact');
  const manifest = recordField(preview, 'artifactManifest');
  const manifestQueryArtifact = recordField(manifest, 'queryArtifact');
  return (
    stringField(queryArtifact, 'artifactUrl') ??
    stringField(queryArtifact, 'artifact_url') ??
    stringField(manifestQueryArtifact, 'artifactUrl') ??
    stringField(manifestQueryArtifact, 'artifact_url')
  );
}

export type QueryArtifactDescriptor = {
  artifactUrl: string;
  artifactFormat: string | null;
  artifactSha256: string | null;
  artifactByteSize: number | null;
};

export function queryArtifactDescriptorFromPackagePreview(
  preview: unknown,
): QueryArtifactDescriptor | null {
  const queryArtifact = recordField(preview, 'queryArtifact');
  const manifest = recordField(preview, 'artifactManifest');
  const manifestQueryArtifact = recordField(manifest, 'queryArtifact');
  const source = queryArtifact ?? manifestQueryArtifact;
  const artifactUrl = queryArtifactUrlFromPackagePreview(preview);
  if (!source || !artifactUrl) {
    return null;
  }
  const rawByteSize = source.artifactByteSize ?? source.artifact_byte_size;
  const artifactByteSize = Number(rawByteSize);
  return {
    artifactUrl,
    artifactFormat: stringField(source, 'artifactFormat') ?? stringField(source, 'artifact_format'),
    artifactSha256: stringField(source, 'artifactSha256') ?? stringField(source, 'artifact_sha256'),
    artifactByteSize:
      Number.isSafeInteger(artifactByteSize) && artifactByteSize > 0 ? artifactByteSize : null,
  };
}

export function deriveSnapshotIndexUrl(snapshotArtifactUrl: string): string {
  const slash = snapshotArtifactUrl.lastIndexOf('/');
  if (slash < 0) {
    return `${snapshotArtifactUrl}/snapshot-index-v1.json`;
  }
  return `${snapshotArtifactUrl.slice(0, slash + 1)}snapshot-index-v1.json`;
}
