import { supabase } from '@/services/supabase';
import type { SupabaseError } from '@/services/supabase/data';
import { FunctionRegion } from '@supabase/supabase-js';

export type DataProductCoverageMode = 'global_eligible' | 'subset';

export type DataProductProcessSelection = {
  id: string;
  version: string;
};

export type LciaResultBuildRequest = {
  name: string;
  processes?: DataProductProcessSelection[];
  coverageMode: DataProductCoverageMode;
  defaultImpactCategory?: string;
  lciaMethodSet: unknown[];
  idempotencyKey?: string;
};

export type PublishLciaResultPackageRequest = {
  packageId: string;
  displayDefaultImpactCategory?: string;
  reason?: string;
};

export type UnpublishLciaResultPublicationRequest = {
  publicationId: string;
  reason?: string;
};

export type ListLciaResultPublicationsRequest = {
  limit?: number;
};

export type LciaResultPublication = {
  id?: string;
  publicationId?: string;
  packageId?: string;
  packageName?: string;
  packageVersion?: string;
  status?: string;
  isCurrent?: boolean;
  publicationSeriesKey?: string;
  publicationChannel?: string;
  visibilityScope?: string;
  displayDefaultImpactCategory?: string;
  publishedAt?: string;
  unpublishedAt?: string;
  reason?: string;
  eligibleInputCount?: number;
  includedInputCount?: number;
};

export type PreviewLciaResultPackageRequest = {
  packageId: string;
  impactCategoryId?: string;
  rowOffset?: number;
  rowLimit?: number;
  inputOffset?: number;
  inputLimit?: number;
  resultOffset?: number;
  resultLimit?: number;
};

export type PublishedLciaResultValue = {
  impact_id: string;
  impact_index: number;
  impact_name: string;
  unit: string;
  value: number;
};

export type PublishedLciaResultPackageRequest = {
  processId: string;
  processVersion: string;
  impactCategoryId?: string;
};

export type PublishedLciaProcessSelection = {
  id: string;
  version: string;
};

export type QueryPublishedLciaResultsRequest =
  | {
      mode: 'process_all_impacts';
      processId: string;
      processVersion: string;
      impactCategoryId?: string;
    }
  | {
      mode: 'processes_one_impact';
      impactCategoryId: string;
      processes: PublishedLciaProcessSelection[];
    }
  | {
      mode: 'ranked_processes_one_impact';
      impactCategoryId: string;
      offset?: number;
      limit?: number;
    };

export type PublishedLciaRankedProcessValue = {
  process_id: string;
  process_version: string;
  process_index: number;
  value: number;
  absolute_value: number;
};

export type PublishedLciaResultPackage = {
  publication: Record<string, unknown> | null;
  package: Record<string, unknown> | null;
  process?: Record<string, unknown> | null;
  resultArtifact?: Record<string, unknown> | null;
  queryArtifact?: Record<string, unknown> | null;
  artifactManifest?: Record<string, unknown> | null;
  rowCount: number;
  values?: PublishedLciaResultValue[];
};

export type PublishedLciaResults = Omit<PublishedLciaResultPackage, 'values'> & {
  mode?: string;
  kind?: string;
  impact_id?: string;
  impact_index?: number;
  sort_by?: string;
  sort_direction?: string;
  offset?: number;
  limit?: number;
  returned_count?: number;
  total_process_count?: number;
  total_absolute_value?: number;
  values?: PublishedLciaResultValue[] | PublishedLciaRankedProcessValue[] | Record<string, unknown>;
};

export type DataProductApiResult<T> = {
  data: T | null;
  error: SupabaseError | null;
  count: null;
  status: number;
  statusText: string;
};

type DataProductFunctionName = 'app_data_product_commands' | 'data_product_results';

type InvokeOptions = {
  requireAuth?: boolean;
};

function authRequiredResult<T>(): DataProductApiResult<T> {
  return {
    data: null,
    error: {
      message: 'Authentication required',
      code: 'AUTH_REQUIRED',
      details: '',
      hint: '',
    },
    count: null,
    status: 401,
    statusText: 'AUTH_REQUIRED',
  };
}

function normalizeError(error: any, payload: any): SupabaseError {
  return {
    message:
      payload?.message || payload?.detail || payload?.error || error?.message || 'Request failed',
    code:
      typeof payload?.code === 'string'
        ? payload.code
        : typeof payload?.error === 'string'
          ? payload.error
          : 'FUNCTION_ERROR',
    details: payload?.details ?? '',
    hint: payload?.hint ?? '',
  };
}

async function parseFunctionErrorPayload(error: any) {
  if (!error?.context || typeof error.context.json !== 'function') {
    return null;
  }

  try {
    return await error.context.json();
  } catch (_parseError) {
    return null;
  }
}

function unwrapDataProductData<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    (payload as { ok?: unknown }).ok === true &&
    'data' in (payload as Record<string, unknown>)
  ) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

function isCommandFailure(payload: unknown): payload is {
  ok: false;
  code?: string;
  message?: string;
  status?: number;
  details?: unknown;
} {
  return Boolean(
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    (payload as { ok?: unknown }).ok === false,
  );
}

async function getSessionAccessToken(): Promise<string | undefined> {
  const session = await supabase.auth.getSession();
  return session.data.session?.access_token || undefined;
}

async function invokeDataProductFunction<T>(
  functionName: DataProductFunctionName,
  body: Record<string, unknown>,
  options: InvokeOptions = {},
): Promise<DataProductApiResult<T>> {
  const accessToken = await getSessionAccessToken();
  if (options.requireAuth && !accessToken) {
    return authRequiredResult<T>();
  }

  const requestOptions: {
    body: Record<string, unknown>;
    headers?: Record<string, string>;
    region: FunctionRegion;
  } = {
    body,
    region: FunctionRegion.UsEast1,
  };

  if (accessToken) {
    requestOptions.headers = {
      Authorization: `Bearer ${accessToken}`,
    };
  }

  const result = await supabase.functions.invoke(functionName, requestOptions);

  if (result.error) {
    const payload = await parseFunctionErrorPayload(result.error);
    const error = normalizeError(result.error, payload);
    return {
      data: null,
      error,
      count: null,
      status: result.error.context?.status ?? 500,
      statusText: error.code,
    };
  }

  if (isCommandFailure(result.data)) {
    const error = normalizeError(null, result.data);
    return {
      data: null,
      error,
      count: null,
      status: result.data.status ?? 400,
      statusText: error.code,
    };
  }

  return {
    data: unwrapDataProductData<T>(result.data),
    error: null,
    count: null,
    status: 200,
    statusText: 'OK',
  };
}

function invokeDataProductCommand<T>(body: Record<string, unknown>) {
  return invokeDataProductFunction<T>('app_data_product_commands', body, { requireAuth: true });
}

export function createLciaResultBuildRequest(request: LciaResultBuildRequest) {
  return invokeDataProductCommand<Record<string, unknown>>({
    action: 'create_build',
    ...request,
  });
}

export function previewLciaResultPackage(request: string | PreviewLciaResultPackageRequest) {
  const payload = typeof request === 'string' ? { packageId: request } : request;
  return invokeDataProductCommand<Record<string, unknown>>({
    action: 'preview_package',
    ...payload,
  });
}

export function publishLciaResultPackage(request: PublishLciaResultPackageRequest) {
  return invokeDataProductCommand<Record<string, unknown>>({
    action: 'publish_package',
    ...request,
  });
}

export function unpublishLciaResultPublication(request: UnpublishLciaResultPublicationRequest) {
  return invokeDataProductCommand<Record<string, unknown>>({
    action: 'unpublish_publication',
    ...request,
  });
}

export function listLciaResultPublications(request: ListLciaResultPublicationsRequest = {}) {
  return invokeDataProductCommand<LciaResultPublication[]>({
    action: 'list_publications',
    ...(request.limit ? { limit: request.limit } : {}),
  });
}

export function getPublishedLciaResultPackage(request: PublishedLciaResultPackageRequest) {
  return invokeDataProductFunction<PublishedLciaResultPackage>('data_product_results', {
    processId: request.processId,
    processVersion: request.processVersion,
    ...(request.impactCategoryId ? { impactCategoryId: request.impactCategoryId } : {}),
  });
}

export function queryPublishedLciaResults(request: QueryPublishedLciaResultsRequest) {
  return invokeDataProductFunction<PublishedLciaResults>(
    'data_product_results',
    request as unknown as Record<string, unknown>,
  );
}
