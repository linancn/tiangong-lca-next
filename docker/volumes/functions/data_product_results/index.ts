import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';
import { z } from 'zod';

import { commandError, json } from '../_shared/command_runtime/http.ts';
import { readJsonBody } from '../_shared/command_runtime/request.ts';
import {
  type AllUnitQueryEnvelope,
  deriveSnapshotIndexUrl,
  projectPublishedProcessAllImpacts,
  projectPublishedProcessesOneImpact,
  projectPublishedRankedProcessesOneImpact,
  queryArtifactUrlFromPackagePreview,
  type SnapshotIndexDocument,
} from '../_shared/commands/data_product/package_preview_projection.ts';
import {
  createDataProductCommandRepository,
  type DataProductCommandRepository,
} from '../_shared/commands/data_product/repository.ts';
import { corsHeaders } from '../_shared/cors.ts';
import type { DataProductRpcResult } from '../_shared/db_rpc/data_product_commands.ts';
import { createSupabaseServiceClient } from '../_shared/supabase_client.ts';

const versionPattern = /^\d{2}\.\d{2}\.\d{3}$/;
const DEFAULT_RANKED_LIMIT = 20;
const MAX_RANKED_LIMIT = 100;

const processRefSchema = z
  .object({
    id: z.string().uuid(),
    version: z.string().regex(versionPattern, 'version must be in 00.00.000 format'),
  })
  .strict();

export const dataProductPublishedResultsRequestSchema = z.preprocess(
  (value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      if (typeof record.mode !== 'string') {
        return { ...record, mode: 'process_all_impacts' };
      }
    }
    return value;
  },
  z.discriminatedUnion('mode', [
    z
      .object({
        mode: z.literal('process_all_impacts'),
        processId: z.string().uuid(),
        processVersion: z
          .string()
          .regex(versionPattern, 'processVersion must be in 00.00.000 format'),
        impactCategoryId: z.string().trim().min(1).max(200).optional(),
      })
      .strict(),
    z
      .object({
        mode: z.literal('processes_one_impact'),
        impactCategoryId: z.string().trim().min(1).max(200),
        processes: z.array(processRefSchema).min(1).max(500),
      })
      .strict(),
    z
      .object({
        mode: z.literal('ranked_processes_one_impact'),
        impactCategoryId: z.string().trim().min(1).max(200),
        offset: z.coerce.number().int().min(0).default(0),
        limit: z.coerce.number().int().min(1).max(MAX_RANKED_LIMIT).default(DEFAULT_RANKED_LIMIT),
      })
      .strict(),
  ]),
);

export type DataProductPublishedResultsRequest = z.infer<
  typeof dataProductPublishedResultsRequestSchema
>;

export type DataProductPublishedResultsRepository = {
  queryCurrentPublicResults: (
    request: DataProductPublishedResultsRequest,
  ) => Promise<DataProductRpcResult>;
};

export type DataProductResultsHandlerOptions = {
  supabase?: Pick<SupabaseClient, 'rpc'>;
  repository?: DataProductPublishedResultsRepository;
};

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function commandFailure(
  code: string,
  status: number,
  message: string,
  details?: unknown,
): DataProductRpcResult {
  return {
    ok: false,
    code,
    status,
    message,
    ...(details === undefined ? {} : { details }),
  };
}

function publicationPayload(publication: Record<string, unknown>) {
  return {
    id: stringValue(publication.id),
    publicationId: stringValue(publication.id),
    packageId: stringValue(publication.package_id),
    publicationSeriesKey: stringValue(publication.publication_series_key),
    publicationChannel: stringValue(publication.publication_channel),
    visibilityScope: stringValue(publication.visibility_scope),
    status: stringValue(publication.status),
    isCurrent: Boolean(publication.is_current),
    displayDefaultImpactCategory: stringValue(publication.display_default_impact_category),
    publishedAt: stringValue(publication.published_at),
  };
}

function packagePayload(packageRow: Record<string, unknown>) {
  return {
    id: stringValue(packageRow.id),
    packageId: stringValue(packageRow.id),
    packageVersion: stringValue(packageRow.package_version),
    snapshotId: stringValue(packageRow.snapshot_id),
    resultId: stringValue(packageRow.result_id),
    status: stringValue(packageRow.status),
    defaultImpactCategory: stringValue(packageRow.default_impact_category),
    eligibleInputCount: Number(packageRow.eligible_input_count ?? 0),
    includedInputCount: Number(packageRow.included_input_count ?? 0),
  };
}

function buildPackagePreviewEnvelope(packageRow: Record<string, unknown>) {
  return {
    summary: {
      packageId: stringValue(packageRow.id),
      packageVersion: stringValue(packageRow.package_version),
      snapshotId: stringValue(packageRow.snapshot_id),
      resultId: stringValue(packageRow.result_id),
      defaultImpactCategory: stringValue(packageRow.default_impact_category),
    },
    inputManifest: recordValue(packageRow.input_manifest) ?? {},
    resultArtifact: recordValue(packageRow.result_artifact_ref) ?? {},
    queryArtifact: recordValue(packageRow.query_artifact_ref) ?? {},
    artifactManifest: recordValue(packageRow.artifact_manifest) ?? {},
  };
}

export function impactCategoryIdsForRequest(
  request: DataProductPublishedResultsRequest,
  snapshotIndex: SnapshotIndexDocument,
): string[] {
  if (request.mode === 'process_all_impacts' && !request.impactCategoryId) {
    // The snapshot index already carries names and units for all impact rows. Fetching method
    // metadata for every impact can turn a single-process read into a large DB fanout.
    return [];
  }
  return [request.impactCategoryId].filter((impactCategoryId): impactCategoryId is string =>
    Boolean(impactCategoryId),
  );
}

function processRefsForRequest(request: DataProductPublishedResultsRequest) {
  if (request.mode === 'process_all_impacts') {
    return [
      {
        processId: request.processId,
        processVersion: request.processVersion,
      },
    ];
  }
  if (request.mode === 'processes_one_impact') {
    return request.processes.map((process) => ({
      processId: process.id,
      processVersion: process.version,
    }));
  }
  return [];
}

function createPublishedResultsRepository(
  serviceSupabase: SupabaseClient = createSupabaseServiceClient(),
  artifacts: DataProductCommandRepository = createDataProductCommandRepository(
    serviceSupabase,
    serviceSupabase,
  ),
): DataProductPublishedResultsRepository {
  return {
    async queryCurrentPublicResults(request) {
      const { data, error } = await serviceSupabase.rpc('svc_data_product_current_public_package');
      if (error) {
        return commandFailure(
          'published_lcia_publication_lookup_failed',
          500,
          'Failed to read current public LCIA result publication',
          error.message,
        );
      }
      const envelope = recordValue(data);
      if (!envelope || envelope.ok !== true) {
        return commandFailure(
          stringValue(envelope?.code) ?? 'published_lcia_publication_lookup_failed',
          Number(envelope?.status ?? 500),
          'Failed to read current public LCIA result publication',
          envelope,
        );
      }
      const current = recordValue(envelope.data);
      const publication = recordValue(current?.publication);
      const packageId = stringValue(publication?.package_id);
      if (!publication || !packageId) {
        return commandFailure(
          'published_lcia_publication_not_found',
          404,
          'No current public LCIA result publication is available',
        );
      }

      const packageRow = recordValue(current?.package);
      if (!packageRow) {
        return commandFailure(
          'published_lcia_package_not_ready',
          404,
          'Current public LCIA result package is not preview-ready',
        );
      }

      const preview = buildPackagePreviewEnvelope(packageRow);
      const snapshotId = stringValue(packageRow.snapshot_id);
      if (!snapshotId) {
        return commandFailure(
          'published_lcia_snapshot_missing',
          409,
          'Current public LCIA result package has no snapshot id',
        );
      }

      const snapshotArtifact = await artifacts.fetchSnapshotArtifactUrl(snapshotId);
      if (!snapshotArtifact.ok) {
        return snapshotArtifact;
      }

      const snapshotIndex = await artifacts.fetchJsonArtifact<SnapshotIndexDocument>(
        deriveSnapshotIndexUrl(snapshotArtifact.data.artifactUrl),
      );
      if (!snapshotIndex.ok) {
        return commandFailure(
          'published_lcia_snapshot_index_unavailable',
          502,
          'Failed to read current public LCIA snapshot index artifact',
          snapshotIndex.error,
        );
      }

      const queryArtifactUrl = queryArtifactUrlFromPackagePreview(preview);
      if (!queryArtifactUrl) {
        return commandFailure(
          'published_lcia_query_artifact_missing',
          409,
          'Current public LCIA result package has no query artifact',
        );
      }

      const queryArtifact =
        await artifacts.fetchJsonArtifact<AllUnitQueryEnvelope>(queryArtifactUrl);
      if (!queryArtifact.ok) {
        return commandFailure(
          'published_lcia_query_artifact_unavailable',
          502,
          'Failed to read current public LCIA query artifact',
          queryArtifact.error,
        );
      }

      const metadata = await artifacts.fetchPreviewMetadata({
        processes: processRefsForRequest(request),
        impactCategoryIds: impactCategoryIdsForRequest(request, snapshotIndex.data),
      });
      const processMetadata = metadata.ok ? metadata.data.processes : [];
      const impactMetadata = metadata.ok ? metadata.data.impacts : [];
      const common = {
        publication: publicationPayload(publication),
        package: packagePayload(packageRow),
        resultArtifact: recordValue(packageRow.result_artifact_ref) ?? {},
        queryArtifact: recordValue(packageRow.query_artifact_ref) ?? {},
        artifactManifest: recordValue(packageRow.artifact_manifest) ?? {},
      };

      if (request.mode === 'process_all_impacts') {
        const projection = projectPublishedProcessAllImpacts({
          preview,
          snapshotIndex: snapshotIndex.data,
          queryArtifact: queryArtifact.data,
          impactMetadata,
          processId: request.processId,
          processVersion: request.processVersion,
          impactCategoryId: request.impactCategoryId,
        });
        return {
          ok: true,
          data: {
            ...common,
            process: projection.process,
            rowCount: projection.rowCount,
            values: projection.values,
          },
        };
      }

      if (request.mode === 'processes_one_impact') {
        const projection = projectPublishedProcessesOneImpact({
          preview,
          snapshotIndex: snapshotIndex.data,
          queryArtifact: queryArtifact.data,
          impactMetadata,
          impactCategoryId: request.impactCategoryId,
          processes: request.processes,
        });
        return {
          ok: true,
          data: {
            ...common,
            ...projection,
          },
        };
      }

      const projection = projectPublishedRankedProcessesOneImpact({
        preview,
        snapshotIndex: snapshotIndex.data,
        queryArtifact: queryArtifact.data,
        processMetadata,
        impactMetadata,
        impactCategoryId: request.impactCategoryId,
        offset: request.offset,
        limit: request.limit,
      });
      return {
        ok: true,
        data: {
          ...common,
          ...projection,
        },
      };
    },
  };
}

function parseQuery(req: Request): Record<string, string> {
  return Object.fromEntries(new URL(req.url).searchParams.entries());
}

async function readRequestPayload(req: Request) {
  if (req.method === 'GET') {
    return { ok: true as const, value: parseQuery(req) };
  }

  return await readJsonBody(req);
}

export function createDataProductResultsHandler(options: DataProductResultsHandlerOptions = {}) {
  const repository = options.repository;

  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST' && req.method !== 'GET') {
      return commandError('METHOD_NOT_ALLOWED', 'Only GET and POST are supported', 405);
    }

    const bodyResult = await readRequestPayload(req);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const parsed = dataProductPublishedResultsRequestSchema.safeParse(bodyResult.value);
    if (!parsed.success) {
      return commandError(
        'INVALID_PAYLOAD',
        'Invalid data product result lookup payload',
        400,
        parsed.error.flatten(),
      );
    }

    const result = await (
      repository ?? createPublishedResultsRepository()
    ).queryCurrentPublicResults(parsed.data);
    if (!result.ok) {
      return commandError(result.code, result.message, result.status, result.details);
    }

    return json({
      ok: true,
      data: result.data,
    });
  };
}

export const handleDataProductResults = createDataProductResultsHandler();

if (import.meta.main) {
  Deno.serve(handleDataProductResults);
}
