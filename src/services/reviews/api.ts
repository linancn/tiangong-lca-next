import {
  createLegacyMutationRemovedError,
  invokeDatasetCommand,
  type TidasPackageRootTable,
} from '@/services/general/api';
import { getLifeCyclesByIdAndVersion } from '@/services/lifeCycleModels/api';
import { supabase } from '@/services/supabase';
import type { SupabaseError, SupabaseMutationResult } from '@/services/supabase/data';
import { getUserId } from '@/services/users/api';
import type { WorkerJobResult } from '@/services/workerJobs/api';
import { FunctionRegion } from '@supabase/supabase-js';
import { getLangText, jsonToList } from '../general/util';
import { getProcessDetailByIdAndVersion } from '../processes/api';
import { genProcessName } from '../processes/util';
import { isCurrentAssignedReviewerCommentState } from './util';

export type ReviewSubmitDatasetTable = Extract<
  TidasPackageRootTable,
  'processes' | 'lifecyclemodels'
>;
export type ReviewSubmitGateDatasetTable = Extract<ReviewSubmitDatasetTable, 'processes'>;
export const REVIEW_SUBMIT_GATE_POLICY_PROFILE = 'review_submit_fast.v1';
export const REVIEW_SUBMIT_GATE_REPORT_SCHEMA_VERSION = 'review_submit_gate_report.v1';

export type ReviewSubmitGateAction = 'ensure' | 'read' | 'rerun';
export type ReviewSubmitGateStatus =
  | 'queued'
  | 'running'
  | 'passed'
  | 'blocked'
  | 'stale'
  | 'error';

export type ReviewSubmitGateBlockingReason = {
  code?: string;
  message?: string;
  severity?: string;
  details?: unknown;
  [key: string]: unknown;
};

export type ReviewSubmitGateResult = {
  status: ReviewSubmitGateStatus;
  gateRunId?: string;
  datasetRevision?: {
    table?: string;
    id?: string;
    version?: string;
    revisionChecksum?: string;
  };
  policy?: {
    profile?: string;
  };
  calculatorReport?: {
    schemaVersion?: string;
    reportId?: string;
    generatedAt?: string;
  } | null;
  blockingReasons?: ReviewSubmitGateBlockingReason[];
  [key: string]: unknown;
};

export type ReviewSubmitGateRequest = {
  table: ReviewSubmitGateDatasetTable;
  id: string;
  version: string;
  revisionChecksum?: string;
  action?: ReviewSubmitGateAction;
  gateRunId?: string;
  policyProfile?: typeof REVIEW_SUBMIT_GATE_POLICY_PROFILE;
  reportSchemaVersion?: typeof REVIEW_SUBMIT_GATE_REPORT_SCHEMA_VERSION;
};

export type SubmitReviewGateMetadata = {
  reviewSubmitGateRunId?: string;
  revisionChecksum?: string;
  reviewSubmitPolicyProfile?: typeof REVIEW_SUBMIT_GATE_POLICY_PROFILE;
  reviewSubmitReportSchemaVersion?: typeof REVIEW_SUBMIT_GATE_REPORT_SCHEMA_VERSION;
};

export type ReviewSubmitJobAction = 'enqueue' | 'read' | 'read_latest';
export type ReviewSubmitJobStatus =
  | 'queued'
  | 'waiting_gate'
  | 'submitting'
  | 'submitted'
  | 'blocked'
  | 'stale'
  | 'error'
  | 'cancelled';

export type ReviewSubmitJobResult = {
  status: ReviewSubmitJobStatus;
  reviewSubmitJobId?: string;
  submitWorkerJobId?: string | null;
  rootJobId?: string | null;
  gateRunId?: string | null;
  gateWorkerJobId?: string | null;
  datasetRevision?: {
    table?: string;
    id?: string;
    version?: string;
    revisionChecksum?: string;
  };
  policy?: {
    profile?: string;
    reportSchemaVersion?: string;
  };
  gate?: ReviewSubmitGateResult | null;
  submitWorkerJob?: WorkerJobResult | null;
  workerJob?: WorkerJobResult | null;
  gateWorkerJob?: WorkerJobResult | null;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  } | null;
  result?: unknown;
  [key: string]: unknown;
};

export type ReviewSubmitJobRequest =
  | {
      action?: 'enqueue';
      table: ReviewSubmitGateDatasetTable;
      id: string;
      version: string;
      revisionChecksum?: string;
      policyProfile?: typeof REVIEW_SUBMIT_GATE_POLICY_PROFILE;
      reportSchemaVersion?: typeof REVIEW_SUBMIT_GATE_REPORT_SCHEMA_VERSION;
    }
  | {
      action: 'read';
      reviewSubmitJobId: string;
    }
  | {
      action: 'read_latest';
      table: ReviewSubmitGateDatasetTable;
      id: string;
      version: string;
      revisionChecksum?: string;
    };
type ReviewWorkflowCommandFunctionName =
  | 'admin_review_save_assignment_draft'
  | 'admin_review_assign_reviewers'
  | 'admin_review_revoke_reviewer'
  | 'admin_review_approve'
  | 'admin_review_reject';

const STABLE_HASH_KEY_ENCODER = new TextEncoder();

type DataNotificationRpcRow = {
  id: string;
  state_code: number;
  json: any;
  modified_at: string;
  total_count?: number | string | null;
};

type ReviewItemRpcRow = {
  id: string;
  data_id?: string;
  data_version?: string;
  state_code?: number;
  reviewer_id?: string[] | null;
  json: any;
  deadline?: string | null;
  created_at?: string;
  modified_at?: string;
};

type ReviewAdminQueueRpcRow = ReviewItemRpcRow & {
  comment_state_codes?: number[] | null;
  total_count?: number | string | null;
};

type ReviewMemberQueueRpcRow = {
  id: string;
  data_id?: string;
  data_version?: string;
  review_state_code?: number;
  reviewer_id?: string[] | null;
  json: any;
  deadline?: string | null;
  created_at?: string;
  modified_at?: string;
  comment_state_code?: number;
  comment_json?: any;
  comment_created_at?: string;
  comment_modified_at?: string;
  total_count?: number | string | null;
};

function compareStableHashKeys(left: string, right: string): number {
  const leftBytes = STABLE_HASH_KEY_ENCODER.encode(left);
  const rightBytes = STABLE_HASH_KEY_ENCODER.encode(right);
  const length = Math.min(leftBytes.length, rightBytes.length);

  for (let index = 0; index < length; index += 1) {
    const diff = leftBytes[index] - rightBytes[index];
    if (diff !== 0) {
      return diff;
    }
  }

  return leftBytes.length - rightBytes.length;
}

async function invokeReviewWorkflowCommand<Row extends Record<string, unknown>>(
  functionName: ReviewWorkflowCommandFunctionName,
  body: Record<string, unknown>,
) {
  return invokeDatasetCommand<Row>(functionName as never, body);
}

function stringifyStableJsonValue(value: unknown): string | undefined {
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stringifyStableJsonValue(item) ?? 'null').join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => compareStableHashKeys(left, right))
      .flatMap(([key, childValue]) => {
        const serialized = stringifyStableJsonValue(childValue);
        return serialized === undefined ? [] : [`${JSON.stringify(key)}:${serialized}`];
      });

    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

export function stableJsonStringifyForReviewSubmit(value: unknown): string {
  if (value === undefined) {
    throw new Error('Cannot hash an undefined dataset revision payload');
  }

  const serialized = stringifyStableJsonValue(value);
  if (serialized === undefined) {
    throw new Error('Cannot hash an undefined dataset revision payload');
  }
  return serialized;
}

export async function computeStableJsonSha256(value: unknown): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle?.digest) {
    throw new Error('SHA-256 digest is unavailable in this browser');
  }

  const normalizedJson = stableJsonStringifyForReviewSubmit(value);
  const encoded = new TextEncoder().encode(normalizedJson);
  const digest = await subtle.digest('SHA-256', encoded);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function normalizeReviewSubmitCommandRows<Row extends Record<string, unknown>>(payload: unknown) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload) && 'data' in payload) {
    const data = (payload as { data?: unknown }).data;
    return data === null || data === undefined ? [] : [data as Row];
  }

  return payload === null || payload === undefined ? [] : [payload as Row];
}

async function parseReviewSubmitCommandErrorPayload(error: any) {
  if (!error?.context || typeof error.context.json !== 'function') {
    return null;
  }

  try {
    return await error.context.json();
  } catch (_parseError) {
    return null;
  }
}

function isReviewSubmitGateEnvelope(payload: unknown): payload is {
  command?: string;
  data?: ReviewSubmitGateResult;
} {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false;
  }

  const candidate = payload as { command?: unknown; data?: { status?: unknown } };
  return (
    candidate.command === 'dataset_review_submit_gate' && typeof candidate.data?.status === 'string'
  );
}

function isReviewSubmitJobEnvelope(payload: unknown): payload is {
  command?: string;
  data?: ReviewSubmitJobResult;
} {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false;
  }

  const candidate = payload as { command?: unknown; data?: { status?: unknown } };
  return (
    (candidate.command === 'dataset_review_submit_job_enqueue' ||
      candidate.command === 'dataset_review_submit_job_read' ||
      candidate.command === 'dataset_review_submit_job_read_latest') &&
    typeof candidate.data?.status === 'string'
  );
}

function normalizeReviewSubmitCommandError(error: any, payload: any): SupabaseError {
  return {
    message:
      payload?.message || payload?.detail || payload?.error || error?.message || 'Request failed',
    code: typeof payload?.code === 'string' ? payload.code : 'FUNCTION_ERROR',
    details: payload?.details ?? '',
    hint: payload?.hint ?? '',
  } as SupabaseError;
}

async function invokeReviewWorkflowCommandBatch<Row extends Record<string, unknown>>(
  functionName: Exclude<
    ReviewWorkflowCommandFunctionName,
    'admin_review_revoke_reviewer' | 'admin_review_approve' | 'admin_review_reject'
  >,
  reviewIds: React.Key[],
  buildBody: (reviewId: string) => Record<string, unknown>,
) {
  const results = await Promise.all(
    reviewIds.map((reviewId) =>
      invokeReviewWorkflowCommand<Row>(functionName, buildBody(String(reviewId))),
    ),
  );

  const firstError = results.find((result) => result.error);

  return {
    data: results.flatMap((result) => result.data ?? []),
    error: firstError?.error ?? null,
    count: null,
    status: firstError?.status ?? 200,
    statusText: firstError?.statusText ?? 'OK',
  };
}

function normalizeTotalCount(value: number | string | null | undefined) {
  return Number(value ?? 0) || 0;
}

function mapReviewRowToTableData(
  row: ReviewItemRpcRow,
  lang: string,
  lifecycleModels: any[],
  comments: { state_code: number }[] = [],
) {
  const model = lifecycleModels?.find(
    (candidate) =>
      candidate.id === row?.json?.data?.id && candidate.version === row?.json?.data?.version,
  );
  const modelName =
    model?.json?.lifeCycleModelDataSet?.lifeCycleModelInformation?.dataSetInformation?.name;

  return {
    key: row.id,
    id: row.id,
    isFromLifeCycle: Boolean(model),
    name:
      (model
        ? genProcessName(modelName ?? {}, lang)
        : genProcessName(row?.json?.data?.name ?? {}, lang)) || '-',
    teamName: getLangText(row?.json?.team?.name ?? {}, lang),
    userName: row?.json?.user?.name ?? row?.json?.user?.email ?? '-',
    createAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    modifiedAt: row.modified_at ? new Date(row.modified_at).toISOString() : undefined,
    deadline: row.deadline ? new Date(row.deadline).toISOString() : row.deadline,
    json: row?.json,
    comments,
    modelData: model
      ? { id: model.id, version: model.version, json: model.json, json_tg: model.json_tg }
      : null,
  };
}

async function getReviewItemsRpc(params: {
  reviewIds?: string[];
  dataId?: string | null;
  dataVersion?: string | null;
  stateCodes?: number[];
}) {
  const { data, error } = await supabase.rpc('qry_review_get_items', {
    p_review_ids: params.reviewIds?.length ? params.reviewIds : null,
    p_data_id: params.dataId ?? null,
    p_data_version: params.dataVersion ?? null,
    p_state_codes: params.stateCodes?.length ? params.stateCodes : null,
  });

  return {
    data: (data ?? []) as ReviewItemRpcRow[],
    error,
  };
}

export async function addReviewsApi(id: string, data: any) {
  void id;
  void data;
  return { error: createLegacyMutationRemovedError('addReviewsApi') };
}

export async function submitDatasetReviewApi<
  Row extends Record<string, unknown> = Record<string, unknown>,
>(
  tableName: ReviewSubmitDatasetTable,
  id: string,
  version: string,
  gateMetadata: SubmitReviewGateMetadata = {},
) {
  return invokeDatasetCommand<Row>('app_dataset_submit_review', {
    id,
    version,
    table: tableName,
    ...gateMetadata,
  });
}

export async function requestReviewSubmitGateApi<
  Row extends ReviewSubmitGateResult = ReviewSubmitGateResult,
>(request: ReviewSubmitGateRequest): Promise<SupabaseMutationResult<Row>> {
  const session = await supabase.auth.getSession();
  if (!session?.data?.session) {
    return {
      data: null,
      error: {
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        details: '',
        hint: '',
      } as SupabaseError,
      count: null,
      status: 401,
      statusText: 'AUTH_REQUIRED',
    };
  }

  const result = await supabase.functions.invoke('app_dataset_review_submit_gate', {
    headers: {
      Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
    },
    body: {
      table: request.table,
      id: request.id,
      version: request.version,
      ...(request.revisionChecksum ? { revisionChecksum: request.revisionChecksum } : {}),
      action: request.action ?? 'ensure',
      gateRunId: request.gateRunId,
      policyProfile: request.policyProfile ?? REVIEW_SUBMIT_GATE_POLICY_PROFILE,
      reportSchemaVersion: request.reportSchemaVersion ?? REVIEW_SUBMIT_GATE_REPORT_SCHEMA_VERSION,
    },
    region: FunctionRegion.UsEast1,
  });

  if (result.error) {
    const payload = await parseReviewSubmitCommandErrorPayload(result.error);
    if (isReviewSubmitGateEnvelope(payload)) {
      return {
        data: [payload.data as Row],
        error: null,
        count: null,
        status: result.error.context?.status ?? 200,
        statusText: 'OK',
      };
    }

    const normalizedError = normalizeReviewSubmitCommandError(result.error, payload);
    return {
      data: null,
      error: normalizedError,
      count: null,
      status: result.error.context?.status ?? 500,
      statusText: normalizedError.code,
    };
  }

  return {
    data: normalizeReviewSubmitCommandRows<Row>(result.data),
    error: null,
    count: null,
    status: 200,
    statusText: 'OK',
  };
}

export async function requestReviewSubmitJobApi<
  Row extends ReviewSubmitJobResult = ReviewSubmitJobResult,
>(request: ReviewSubmitJobRequest): Promise<SupabaseMutationResult<Row>> {
  const session = await supabase.auth.getSession();
  if (!session?.data?.session) {
    return {
      data: null,
      error: {
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        details: '',
        hint: '',
      } as SupabaseError,
      count: null,
      status: 401,
      statusText: 'AUTH_REQUIRED',
    };
  }

  const body =
    request.action === 'read'
      ? {
          action: 'read',
          reviewSubmitJobId: request.reviewSubmitJobId,
        }
      : {
          table: request.table,
          id: request.id,
          version: request.version,
          ...(request.revisionChecksum ? { revisionChecksum: request.revisionChecksum } : {}),
          action: request.action ?? 'enqueue',
          ...(request.action === 'read_latest'
            ? {}
            : {
                policyProfile: request.policyProfile ?? REVIEW_SUBMIT_GATE_POLICY_PROFILE,
                reportSchemaVersion:
                  request.reportSchemaVersion ?? REVIEW_SUBMIT_GATE_REPORT_SCHEMA_VERSION,
              }),
        };

  const result = await supabase.functions.invoke('app_dataset_review_submit_jobs', {
    headers: {
      Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
    },
    body,
    region: FunctionRegion.UsEast1,
  });

  if (result.error) {
    const payload = await parseReviewSubmitCommandErrorPayload(result.error);
    if (isReviewSubmitJobEnvelope(payload)) {
      return {
        data: [payload.data as Row],
        error: null,
        count: null,
        status: result.error.context?.status ?? 200,
        statusText: 'OK',
      };
    }

    const normalizedError = normalizeReviewSubmitCommandError(result.error, payload);
    return {
      data: null,
      error: normalizedError,
      count: null,
      status: result.error.context?.status ?? 500,
      statusText: normalizedError.code,
    };
  }

  return {
    data: normalizeReviewSubmitCommandRows<Row>(result.data),
    error: null,
    count: null,
    status: 200,
    statusText: 'OK',
  };
}

export async function saveReviewAssignmentDraftApi<
  Row extends Record<string, unknown> = Record<string, unknown>,
>(reviewIds: React.Key[], reviewerIds: string[]) {
  return invokeReviewWorkflowCommandBatch<Row>(
    'admin_review_save_assignment_draft',
    reviewIds,
    (reviewId) => ({
      reviewId,
      reviewerIds,
    }),
  );
}

export async function assignReviewersApi<
  Row extends Record<string, unknown> = Record<string, unknown>,
>(reviewIds: React.Key[], reviewerIds: string[], deadline?: string | null) {
  return invokeReviewWorkflowCommandBatch<Row>(
    'admin_review_assign_reviewers',
    reviewIds,
    (reviewId) => ({
      reviewId,
      reviewerIds,
      deadline: deadline ?? null,
    }),
  );
}

export async function revokeReviewerApi<
  Row extends Record<string, unknown> = Record<string, unknown>,
>(reviewId: string, reviewerId: string) {
  return invokeReviewWorkflowCommand<Row>('admin_review_revoke_reviewer', {
    reviewId,
    reviewerId,
  });
}

export async function approveReviewApi<
  Row extends Record<string, unknown> = Record<string, unknown>,
>(reviewId: string, table: ReviewSubmitDatasetTable) {
  return invokeReviewWorkflowCommand<Row>('admin_review_approve', {
    reviewId,
    table,
  });
}

export async function rejectReviewApi<
  Row extends Record<string, unknown> = Record<string, unknown>,
>(reviewId: string, table: ReviewSubmitDatasetTable, reason: string) {
  return invokeReviewWorkflowCommand<Row>('admin_review_reject', {
    reviewId,
    table,
    reason,
  });
}

export async function updateReviewApi(reviewIds: React.Key[], data: any) {
  void reviewIds;
  void data;
  return {
    error: createLegacyMutationRemovedError('updateReviewApi'),
  };
}

export async function getReviewerIdsApi(reviewIds: React.Key[]) {
  const { data } = await getReviewItemsRpc({
    reviewIds: reviewIds.map(String),
  });

  return Array.from(
    new Set(
      data.flatMap((item: any) => (Array.isArray(item?.reviewer_id) ? item.reviewer_id : [])),
    ),
  );
}

export async function getReviewsDetail(id: string) {
  const { data } = await getReviewItemsRpc({
    reviewIds: [id],
  });
  return data.length > 0 ? data[0] : null;
}

export async function getReviewsDetailByReviewIds(reviewIds: React.Key[]) {
  const { data } = await getReviewItemsRpc({
    reviewIds: reviewIds.map(String),
  });
  return data;
}

export async function getReviewsTableDataOfReviewMember(
  params: { pageSize: number; current: number },
  sort: any,
  type: 'reviewed' | 'pending' | 'reviewer-rejected',
  lang: string,
  userData?: { user_id: string | undefined },
) {
  const userId = userData?.user_id ?? (await getUserId());
  if (!userId) {
    return Promise.resolve({
      data: [],
      success: true,
      total: 0,
    });
  }

  const normalizedSort = sort ?? {};
  const sortBy = Object.keys(normalizedSort)[0] ?? 'modified_at';
  const orderBy = normalizedSort[sortBy] ?? 'descend';

  const { data, error } = await supabase.rpc('qry_review_get_member_queue_items', {
    p_status: type,
    p_page: params.current ?? 1,
    p_page_size: params.pageSize ?? 10,
    p_sort_by: sortBy,
    p_sort_order: orderBy,
  });

  const rows = (data ?? []) as ReviewMemberQueueRpcRow[];
  if (error || rows.length === 0) {
    return Promise.resolve({
      data: [],
      success: true,
      total: 0,
    });
  }

  const processes = rows
    .map((row) => ({
      id: row?.json?.data?.id,
      version: row?.json?.data?.version,
    }))
    .filter((item) => item.id);
  const modelResult = await getLifeCyclesByIdAndVersion(processes);
  const lifecycleModels = Array.isArray(modelResult?.data) ? modelResult.data : [];

  return Promise.resolve({
    data: rows.map((row) => mapReviewRowToTableData(row, lang, lifecycleModels)),
    page: params?.current ?? 1,
    success: true,
    total: normalizeTotalCount(rows[0]?.total_count),
  });
}

export async function getReviewsTableDataOfReviewAdmin(
  params: { pageSize: number; current: number },
  sort: any,
  type: 'unassigned' | 'assigned' | 'admin-rejected',
  lang: string,
) {
  const normalizedSort = sort ?? {};
  const sortBy = Object.keys(normalizedSort)[0] ?? 'modified_at';
  const orderBy = normalizedSort[sortBy] ?? 'descend';

  const { data, error } = await supabase.rpc('qry_review_get_admin_queue_items', {
    p_status: type,
    p_page: params.current ?? 1,
    p_page_size: params.pageSize ?? 10,
    p_sort_by: sortBy,
    p_sort_order: orderBy,
  });

  const rows = (data ?? []) as ReviewAdminQueueRpcRow[];
  if (error || rows.length === 0) {
    return Promise.resolve({
      data: [],
      success: true,
      total: 0,
    });
  }

  const processes = rows
    .map((row) => ({
      id: row?.json?.data?.id,
      version: row?.json?.data?.version,
    }))
    .filter((item) => item.id);
  const modelResult = await getLifeCyclesByIdAndVersion(processes);
  const lifecycleModels = Array.isArray(modelResult?.data) ? modelResult.data : [];

  return Promise.resolve({
    data: rows.map((row) =>
      mapReviewRowToTableData(
        row,
        lang,
        lifecycleModels,
        Array.isArray(row.comment_state_codes)
          ? row.comment_state_codes
              .map((stateCode) => ({ state_code: Number(stateCode) }))
              .filter((comment) => isCurrentAssignedReviewerCommentState(comment.state_code))
          : [],
      ),
    ),
    page: params?.current ?? 1,
    success: true,
    total: normalizeTotalCount(rows[0]?.total_count),
  });
}

export async function getReviewsByProcess(processId: string, processVersion: string) {
  return getReviewItemsRpc({
    dataId: processId,
    dataVersion: processVersion,
  });
}

export async function getRejectReviewsByProcess(processId: string, processVersion: string) {
  return getReviewItemsRpc({
    dataId: processId,
    dataVersion: processVersion,
    stateCodes: [-1],
  });
}

export async function getNotifyReviews(
  params: { pageSize: number; current: number },
  lang: string,
  timeFilter: number = 3,
) {
  const session = await supabase.auth.getSession();

  if (!session.data.session) {
    return Promise.resolve({
      data: [],
      success: false,
      total: 0,
    });
  }

  const { data, error } = await supabase.rpc('qry_notification_get_my_data_items', {
    p_page: params.current ?? 1,
    p_page_size: params.pageSize ?? 10,
    p_days: timeFilter,
  });

  if (error || !Array.isArray(data)) {
    return Promise.resolve({
      data: [],
      success: false,
      total: 0,
    });
  }

  if (data.length === 0) {
    return Promise.resolve({
      data: [],
      success: true,
      total: 0,
    });
  }

  const rows = data as DataNotificationRpcRow[];
  const processIdAndVersions: { id: string; version: string }[] = [];
  rows.forEach((row) => {
    const id = row?.json?.data?.id;
    const version = row?.json?.data?.version;
    if (id && version) {
      processIdAndVersions.push({ id, version });
    }
  });
  const modelResult = await getLifeCyclesByIdAndVersion(processIdAndVersions);
  const mappedRows = rows.map((row) => {
    const model = modelResult?.data?.find(
      (candidate) =>
        candidate.id === row?.json?.data?.id && candidate.version === row?.json?.data?.version,
    );
    const name =
      model?.json?.lifeCycleModelDataSet?.lifeCycleModelInformation?.dataSetInformation?.name;
    return {
      key: row.id,
      id: row.id,
      isFromLifeCycle: model ? true : false,
      name:
        (model
          ? genProcessName(name ?? {}, lang)
          : genProcessName(row?.json?.data?.name ?? {}, lang)) || '-',
      teamName: getLangText(row?.json?.team?.name ?? {}, lang),
      userName: row?.json?.user?.name ?? row?.json?.user?.email ?? '-',
      modifiedAt: new Date(row.modified_at).toISOString(),
      stateCode: row.state_code,
      json: row?.json,
    };
  });

  return Promise.resolve({
    data: mappedRows,
    page: params?.current ?? 1,
    success: true,
    total: Number(rows[0]?.total_count ?? 0) || 0,
  });
}

export async function getNotifyReviewsCount(timeFilter: number = 3, lastViewTime?: number) {
  const session = await supabase.auth.getSession();

  if (!session.data.session) {
    return Promise.resolve({
      success: false,
      total: 0,
    });
  }

  const { data, error } = await supabase.rpc('qry_notification_get_my_data_count', {
    p_days: timeFilter,
    p_last_view_at: lastViewTime && lastViewTime > 0 ? new Date(lastViewTime).toISOString() : null,
  });

  return Promise.resolve({
    success: !error,
    total: Number(data ?? 0) || 0,
  });
}

export async function getLatestReviewOfMine() {
  const userId = await getUserId();

  if (!userId) {
    return null;
  }

  const { data } = await supabase
    .from('reviews')
    .select('*')
    .filter('json->user->>id', 'eq', userId)
    .in('state_code', [1, 2, -1])
    .order('modified_at', { ascending: false })
    .limit(1);

  return data;
}

/**
 * Batch fetch subtable data for LifecycleModel
 * Collect and merge data from processInstance and json_tg.submodels
 * @param modelDatas - lifecyclemodel data array
 * @param lang - language
 * @returns Subtable data grouped by reviewId
 */
export async function getLifeCycleModelSubTableDataBatch(
  modelDatas: Array<{
    reviewId: string;
    modelData: {
      id: string;
      version: string;
      json: any;
      json_tg: any;
    };
  }>,
  lang: string,
): Promise<{
  data: Record<
    string,
    Array<{
      key: string;
      id: string;
      version: string;
      name: string;
      generalComment: string;
      sourceType: 'processInstance' | 'submodel';
      submodelType: string;
    }>
  >;
  success: boolean;
}> {
  if (!modelDatas.length) {
    return { data: {}, success: true };
  }

  // 1. Collect all process id and version that need to be fetched, and record data source and type
  const processParamMap = new Map<string, string[]>(); // key: "id:version", value: reviewId[]
  const processSourceMap = new Map<
    string,
    { source: 'processInstance' | 'submodel'; type?: string }
  >(); // key: "id:version", value: source info

  modelDatas.forEach(({ reviewId, modelData }) => {
    if (!modelData) return;

    const { json, json_tg, version } = modelData;

    // Extract from json.processInstance
    const processInstances =
      json?.lifeCycleModelDataSet?.lifeCycleModelInformation?.technology?.processes
        ?.processInstance ?? [];

    jsonToList(processInstances).forEach((instance: any) => {
      const refObjectId = instance?.referenceToProcess?.['@refObjectId'];
      const refVersion = instance?.referenceToProcess?.['@version'];
      if (refObjectId && refVersion) {
        const key = `${refObjectId}:${refVersion}`;
        if (!processParamMap.has(key)) {
          processParamMap.set(key, []);
        }
        processParamMap.get(key)!.push(reviewId);
        // Record source as processInstance
        if (!processSourceMap.has(key)) {
          processSourceMap.set(key, { source: 'processInstance' });
        }
      }
    });

    // Extract from json_tg.submodels
    const submodels = json_tg?.submodels ?? [];
    submodels.forEach((submodel: any) => {
      const submodelId = submodel?.id;
      const submodelType = submodel?.type; // primary or secondary
      if (submodelId) {
        const key = `${submodelId}:${version}`;
        if (!processParamMap.has(key)) {
          processParamMap.set(key, []);
        }
        processParamMap.get(key)!.push(reviewId);
        // Record source as submodel and its type
        if (!processSourceMap.has(key)) {
          processSourceMap.set(key, { source: 'submodel', type: submodelType });
        }
      }
    });
  });

  // 2. Batch fetch all process details
  const processParams = Array.from(processParamMap.keys()).map((key) => {
    const [id, version] = key.split(':');
    return { id, version };
  });

  if (processParams.length === 0) {
    return { data: {}, success: true };
  }

  const processesResult = await getProcessDetailByIdAndVersion(processParams);

  if (!processesResult.success || !processesResult.data) {
    return { data: {}, success: false };
  }

  // 3. Group and format process data by reviewId
  const resultData: Record<string, any[]> = {};

  processesResult.data.forEach((process: any) => {
    if (process.state_code !== 20) {
      return;
    }

    const key = `${process.id}:${process.version}`;
    const relatedReviewIds = processParamMap.get(key) ?? [];
    const sourceInfo = processSourceMap.get(key);

    relatedReviewIds.forEach((reviewId) => {
      if (!resultData[reviewId]) {
        resultData[reviewId] = [];
      }

      // Avoid adding the same process multiple times
      if (!resultData[reviewId].some((item: any) => item.id === process.id)) {
        resultData[reviewId].push({
          key: process.id,
          id: process.id,
          version: process.version,
          name: genProcessName(
            process.json?.processDataSet?.processInformation?.dataSetInformation?.name ?? {},
            lang,
          ),
          sourceType: sourceInfo?.source,
          submodelType: sourceInfo?.type,
        });
      }
    });
  });

  return { data: resultData, success: true };
}
