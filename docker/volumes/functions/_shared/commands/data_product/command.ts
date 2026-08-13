import { z } from 'zod';

import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import type { CommandParseResult } from '../../command_runtime/command.ts';
import {
  ALL_UNIT_QUERY_V2_FORMAT,
  parseAllUnitQueryArtifact,
  readImpactColumn,
} from '../../lca_all_unit_query_artifact.ts';
import {
  type AllUnitQueryEnvelope,
  deriveSnapshotIndexUrl,
  inputManifestSummaryFromPackagePreview,
  inputScopeFromPackagePreview,
  previewMetadataRefsFromProjection,
  projectLciaResultPackagePreviewRows,
  queryArtifactDescriptorFromPackagePreview,
  selectPreviewImpact,
  snapshotIdFromPackagePreview,
  type SnapshotIndexDocument,
} from './package_preview_projection.ts';
import {
  createDataProductCommandRepository,
  type DataProductCommandRepository,
} from './repository.ts';
import type {
  DataProductBuildCreateRequest,
  DataProductCommandExecutionResult,
  DataProductCommandRequest,
  DataProductPackagePreviewRequest,
  DataProductWorkerJobRequest,
} from './types.ts';

const versionPattern = /^\d{2}\.\d{2}\.\d{3}$/;
const uuidSchema = z.string().uuid();
const nonEmptyTextSchema = z.string().trim().min(1).max(200);
// Keep the command boundary bounded even though a global-eligible scope is
// expanded server-side.  The limits are deliberately above the current public
// catalogue size, so they protect the Edge runtime without constraining normal
// product selections.
const maxClosureProcessSelections = 10_000;
const maxClosureMethodSelections = 1_000;

const processSelectionSchema = z
  .object({
    id: uuidSchema,
    version: z.string().regex(versionPattern, 'version must be in 00.00.000 format'),
  })
  .strict();

const closureLinkPolicySchema = z
  .object({
    linkSemanticsVersion: z.literal('signed-flow-balance-v1').optional(),
    flowIdentityPolicy: z.literal('exact-flow-version-reference-unit-v2').optional(),
    allocationSemanticsVersion: z.literal('tidas-reference-allocation-v3').optional(),
    technosphereBoundaryPolicy: z.enum(['closed', 'open', 'cutoff']).optional(),
    providerUniversePolicy: z.enum(['scope_only', 'eligible_transitive_expansion-v1']).optional(),
  })
  .strict();

// This is user intent, not a client-created Certificate binding.  The database
// resolves exact identities, applies the visibility policy and computes both
// hashes before it persists the immutable Requested Scope Manifest.
const closureRequestedScopeSchema = z
  .object({
    coverageMode: z.enum(['global_eligible', 'subset']),
    processes: z.array(processSelectionSchema).max(maxClosureProcessSelections).optional(),
    lciaMethods: z.array(processSelectionSchema).min(1).max(maxClosureMethodSelections),
    certificateFreshnessPolicy: z
      .enum(['frozen-artifact-reusable-v1', 'current-membership-required-v1'])
      .optional(),
    linkPolicy: closureLinkPolicySchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.coverageMode === 'global_eligible' && (value.processes?.length ?? 0) > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'global_eligible scope must not provide processes',
      });
    }
    if (value.coverageMode === 'subset' && (value.processes?.length ?? 0) === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'subset scope requires at least one process',
      });
    }
  });

const createBuildSchema = z
  .object({
    action: z.literal('create_build'),
    name: nonEmptyTextSchema,
    processes: z.array(processSelectionSchema).min(1).optional(),
    coverageMode: z.enum(['global_eligible', 'subset']).default('global_eligible'),
    defaultImpactCategory: nonEmptyTextSchema.optional(),
    lciaMethodSet: z.array(z.unknown()).default([]),
    idempotencyKey: z.string().trim().min(1).max(200).optional(),
    closureCheckId: uuidSchema.optional(),
    requestedScopeHash: z.string().trim().min(1).max(256).optional(),
    policyFingerprint: z.string().trim().min(1).max(256).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const supplied = [
      value.closureCheckId,
      value.requestedScopeHash,
      value.policyFingerprint,
    ].filter(Boolean).length;
    if (supplied !== 0 && supplied !== 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'closureCheckId, requestedScopeHash, and policyFingerprint must be supplied together',
      });
    }
  });

const createClosureCheckSchema = z
  .object({
    action: z.literal('create_closure_check'),
    requestedScope: closureRequestedScopeSchema,
    requestIdempotencyToken: z.string().trim().min(1).max(200),
  })
  .strict();

const getClosureCheckSchema = z
  .object({
    action: z.literal('get_closure_check'),
    closureCheckId: uuidSchema,
  })
  .strict();
const listClosureIssuesSchema = z
  .object({
    action: z.literal('list_closure_issues'),
    closureCheckId: uuidSchema,
    afterIssueId: uuidSchema.optional(),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .strict();
const createClosureReportDownloadSchema = z
  .object({
    action: z.literal('create_closure_report_download'),
    closureCheckId: uuidSchema,
    artifactRole: z.enum(['closure_report_xlsx', 'closure_issue_manifest']),
  })
  .strict();
const listTaskFeedSchema = z
  .object({
    action: z.literal('list_task_feed'),
    category: nonEmptyTextSchema.optional(),
    jobKinds: z.array(nonEmptyTextSchema).max(50).optional(),
    statuses: z.array(nonEmptyTextSchema).max(20).optional(),
    updatedSince: z.string().datetime({ offset: true }).optional(),
    cursor: z
      .object({
        updatedAt: z.string().datetime({ offset: true }),
        jobId: uuidSchema,
      })
      .strict()
      .optional(),
    limit: z.number().int().min(1).max(200).optional(),
    rootOnly: z.boolean().optional(),
  })
  .strict();

const previewPackageSchema = z
  .object({
    action: z.literal('preview_package'),
    packageId: uuidSchema,
    impactCategoryId: nonEmptyTextSchema.optional(),
    rowOffset: z.number().int().min(0).optional(),
    rowLimit: z.number().int().min(1).max(100).optional(),
    inputOffset: z.number().int().min(0).optional(),
    inputLimit: z.number().int().min(1).max(100).optional(),
    resultOffset: z.number().int().min(0).optional(),
    resultLimit: z.number().int().min(1).max(100).optional(),
  })
  .strict();

const publishPackageSchema = z
  .object({
    action: z.literal('publish_package'),
    packageId: uuidSchema,
    displayDefaultImpactCategory: nonEmptyTextSchema.optional(),
    reason: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

const unpublishPublicationSchema = z
  .object({
    action: z.literal('unpublish_publication'),
    publicationId: uuidSchema,
    reason: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

const listPublicationsSchema = z
  .object({
    action: z.literal('list_publications'),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .strict();

export const dataProductCommandRequestSchema = z.discriminatedUnion('action', [
  createBuildSchema,
  createClosureCheckSchema,
  getClosureCheckSchema,
  listClosureIssuesSchema,
  createClosureReportDownloadSchema,
  listTaskFeedSchema,
  previewPackageSchema,
  publishPackageSchema,
  unpublishPublicationSchema,
  listPublicationsSchema,
]);

function invalidPayload<T>(message: string, error: z.ZodError): CommandParseResult<T> {
  return {
    ok: false,
    message,
    details: error.flatten(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringField(value: unknown, field: string): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const fieldValue = value[field];
  return typeof fieldValue === 'string' && fieldValue.length > 0 ? fieldValue : null;
}

function objectField(value: unknown, field: string): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }

  const fieldValue = value[field];
  return isRecord(fieldValue) ? fieldValue : null;
}

function requesterTypeFrom(
  value: string | null,
): DataProductWorkerJobRequest['requesterType'] | null {
  if (value === 'user' || value === 'system' || value === 'service' || value === 'operator') {
    return value;
  }

  return null;
}

function visibilityFrom(value: string | null): DataProductWorkerJobRequest['visibility'] {
  if (value === 'user' || value === 'operator' || value === 'system') {
    return value;
  }

  return null;
}

function compactPackagePreviewData(data: Record<string, unknown>): Record<string, unknown> {
  const { inputManifest: _inputManifest, ...baseData } = data;
  const inputManifest = inputManifestSummaryFromPackagePreview(data);
  return {
    ...baseData,
    ...(inputManifest ? { inputManifest } : {}),
    inputScope: inputScopeFromPackagePreview(data),
  };
}

async function enrichPackagePreview(
  data: unknown,
  request: DataProductPackagePreviewRequest,
  repository: DataProductCommandRepository,
): Promise<unknown> {
  if (!isRecord(data)) {
    return data;
  }

  const warnings: Array<Record<string, unknown>> = [];
  let snapshotIndex: SnapshotIndexDocument | null = null;
  let queryArtifact: AllUnitQueryEnvelope | null = null;
  let rawQueryArtifact: unknown = null;
  let processMetadata = undefined;
  let impactMetadata = undefined;
  const snapshotId = snapshotIdFromPackagePreview(data);
  const queryDescriptor = queryArtifactDescriptorFromPackagePreview(data);

  if (snapshotId) {
    const snapshotArtifact = await repository.fetchSnapshotArtifactUrl(snapshotId);
    if (snapshotArtifact.ok) {
      const snapshotIndexResult = await repository.fetchJsonArtifact<SnapshotIndexDocument>(
        deriveSnapshotIndexUrl(snapshotArtifact.data.artifactUrl),
      );
      if (snapshotIndexResult.ok) {
        snapshotIndex = snapshotIndexResult.data;
      } else {
        warnings.push({
          code: 'snapshot_index_fetch_failed',
          detail: snapshotIndexResult.error,
        });
      }
    } else {
      warnings.push({
        code: snapshotArtifact.code,
        detail: snapshotArtifact.message,
      });
    }
  } else {
    warnings.push({ code: 'snapshot_id_missing' });
  }

  if (queryDescriptor) {
    if (queryDescriptor.artifactFormat === ALL_UNIT_QUERY_V2_FORMAT) {
      const verified = await fetchVerifiedQueryArtifact(repository, queryDescriptor);
      if (verified.ok) {
        rawQueryArtifact = verified.data;
      } else {
        warnings.push({ code: verified.error, detail: verified.detail });
      }
    } else {
      const queryArtifactResult = await repository.fetchJsonArtifact<AllUnitQueryEnvelope>(
        queryDescriptor.artifactUrl,
      );
      if (queryArtifactResult.ok) {
        queryArtifact = queryArtifactResult.data;
        rawQueryArtifact = queryArtifactResult.data;
      } else {
        warnings.push({
          code: 'query_artifact_fetch_failed',
          detail: queryArtifactResult.error,
        });
      }
    }
  } else {
    warnings.push({ code: 'query_artifact_url_missing' });
  }

  let projection = projectLciaResultPackagePreviewRows({
    preview: data,
    request,
    snapshotIndex,
    queryArtifact,
  });
  const previewMetadataRefs = previewMetadataRefsFromProjection(projection);
  if (
    previewMetadataRefs.processes.length > 0 ||
    previewMetadataRefs.impactCategoryIds.length > 0
  ) {
    const metadataResult = await repository.fetchPreviewMetadata(previewMetadataRefs);
    if (metadataResult.ok) {
      processMetadata = metadataResult.data.processes;
      impactMetadata = metadataResult.data.impacts;
      projection = projectLciaResultPackagePreviewRows({
        preview: data,
        request,
        snapshotIndex,
        queryArtifact,
        processMetadata: metadataResult.data.processes,
        impactMetadata: metadataResult.data.impacts,
      });
      if (metadataResult.data.warnings) {
        warnings.push(
          ...metadataResult.data.warnings.map((warning) => ({
            code: warning.code,
            detail: warning.message,
            details: warning.details,
          })),
        );
      }
    } else {
      warnings.push({
        code: metadataResult.code,
        detail: metadataResult.message,
      });
    }
  }

  if (
    snapshotIndex &&
    rawQueryArtifact &&
    queryDescriptor?.artifactFormat === ALL_UNIT_QUERY_V2_FORMAT
  ) {
    const impacts = [...snapshotIndex.impact_map].sort(
      (left, right) => left.impact_index - right.impact_index,
    );
    const parsed = parseAllUnitQueryArtifact(rawQueryArtifact, {
      expectedFormat: queryDescriptor.artifactFormat,
      snapshotId: snapshotIndex.snapshot_id,
      processCount: snapshotIndex.process_count,
      impacts,
    });
    const selectedImpact = selectPreviewImpact(data, request, projection.impactOptions);
    if (!parsed.ok) {
      warnings.push({ code: parsed.error, detail: parsed.detail });
    } else if (selectedImpact) {
      const processIndices = projection.detailPage.rows
        .map((row) => row.processIndex)
        .filter((value): value is number => value !== null);
      const values = await readImpactColumn(
        parsed.data,
        impacts,
        selectedImpact.impactIndex,
        processIndices,
        repository.fetchArtifactBytes,
      );
      if (values.ok) {
        projection = projectLciaResultPackagePreviewRows({
          preview: data,
          request,
          snapshotIndex,
          queryArtifact: null,
          processMetadata,
          impactMetadata,
          resolvedValues: {
            snapshotId: snapshotIndex.snapshot_id,
            impactIndex: selectedImpact.impactIndex,
            valuesByProcessIndex: values.data,
          },
        });
      } else {
        warnings.push({ code: values.error, detail: values.detail });
      }
    }
  }

  return {
    ...compactPackagePreviewData(data),
    ...projection,
    ...(warnings.length > 0 ? { previewWarnings: warnings } : {}),
  };
}

async function fetchVerifiedQueryArtifact(
  repository: DataProductCommandRepository,
  descriptor: {
    artifactUrl: string;
    artifactSha256: string | null;
    artifactByteSize: number | null;
  },
) {
  const expectedSha256 = descriptor.artifactSha256?.toLowerCase();
  if (!expectedSha256?.match(/^[0-9a-f]{64}$/) || descriptor.artifactByteSize === null) {
    return {
      ok: false as const,
      error: 'result_projection_artifact_integrity_invalid',
      detail: 'durable query artifact integrity metadata is missing or invalid',
    };
  }
  const fetched = await repository.fetchArtifactBytes(descriptor.artifactUrl);
  if (!fetched.ok) {
    return fetched;
  }
  if (fetched.data.byteLength !== descriptor.artifactByteSize) {
    return {
      ok: false as const,
      error: 'result_projection_artifact_integrity_invalid',
      detail: `expected_bytes=${descriptor.artifactByteSize} actual_bytes=${fetched.data.byteLength}`,
    };
  }
  const digest = await crypto.subtle.digest('SHA-256', fetched.data);
  const observedSha256 = [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
  if (observedSha256 !== expectedSha256) {
    return {
      ok: false as const,
      error: 'result_projection_artifact_integrity_invalid',
      detail: 'sha256_mismatch',
    };
  }
  try {
    return {
      ok: true as const,
      data: JSON.parse(new TextDecoder().decode(fetched.data)) as unknown,
    };
  } catch (error) {
    return {
      ok: false as const,
      error: 'result_projection_artifact_invalid_json',
      detail: error instanceof Error ? error.message : 'json_parse_failed',
    };
  }
}

function workerJobFrom(value: Record<string, unknown>): DataProductWorkerJobRequest | null {
  const jobKind = stringField(value, 'jobKind');
  const payload = objectField(value, 'payload');
  const payloadSchemaVersion = stringField(value, 'payloadSchemaVersion');
  const subjectType = stringField(value, 'subjectType');
  const subjectId = stringField(value, 'subjectId');
  const requestedBy = stringField(value, 'requestedBy');
  const requesterType = requesterTypeFrom(stringField(value, 'requesterType'));

  if (
    !jobKind ||
    !payload ||
    !payloadSchemaVersion ||
    !subjectType ||
    !subjectId ||
    !requestedBy ||
    !requesterType
  ) {
    return null;
  }

  return {
    jobKind,
    payload,
    payloadSchemaVersion,
    subjectType,
    subjectId,
    subjectVersion: stringField(value, 'subjectVersion'),
    requestedBy,
    requesterType,
    requestHash: stringField(value, 'requestHash'),
    queueKey: stringField(value, 'queueKey'),
    visibility: visibilityFrom(stringField(value, 'visibility')),
  };
}

export function parseDataProductCommand(
  body: unknown,
): CommandParseResult<DataProductCommandRequest> {
  const parsed = dataProductCommandRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid data product command payload', parsed.error);
  }

  return {
    ok: true,
    value: parsed.data,
  };
}

function auditFor(request: DataProductCommandRequest, actor: ActorContext) {
  switch (request.action) {
    case 'create_build':
      return buildCommandAuditPayload({
        command: 'lcia_result_build_request',
        actorUserId: actor.userId,
        targetTable: 'worker_jobs',
        targetId: 'pending',
        targetVersion: '',
        payload: {
          coverageMode: request.coverageMode,
          defaultImpactCategory: request.defaultImpactCategory ?? null,
        },
      });
    case 'create_closure_check':
      return buildCommandAuditPayload({
        command: 'lcia_scope_closure_check_request',
        actorUserId: actor.userId,
        targetTable: 'lcia_scope_closure_checks',
        targetId: 'pending',
        targetVersion: '',
        payload: {
          coverageMode: request.requestedScope.coverageMode,
          processCount: request.requestedScope.processes?.length ?? 0,
          lciaMethodCount: request.requestedScope.lciaMethods.length,
        },
      });
    case 'publish_package':
      return buildCommandAuditPayload({
        command: 'lcia_result_package_publish',
        actorUserId: actor.userId,
        targetTable: 'lcia_result_packages',
        targetId: request.packageId,
        targetVersion: '',
        payload: {
          displayDefaultImpactCategory: request.displayDefaultImpactCategory ?? null,
          reason: request.reason ?? null,
        },
      });
    case 'unpublish_publication':
      return buildCommandAuditPayload({
        command: 'lcia_result_publication_unpublish',
        actorUserId: actor.userId,
        targetTable: 'lcia_result_publications',
        targetId: request.publicationId,
        targetVersion: '',
        payload: {
          reason: request.reason ?? null,
        },
      });
    case 'preview_package':
    case 'list_publications':
    case 'get_closure_check':
    case 'list_closure_issues':
    case 'create_closure_report_download':
    case 'list_task_feed':
      return null;
  }
}

async function executeCreateBuild(
  request: DataProductBuildCreateRequest,
  actor: ActorContext,
  repository: DataProductCommandRepository,
): Promise<DataProductCommandExecutionResult> {
  const audit = auditFor(request, actor)!;
  const result = await repository.createBuild(request, audit);
  if (!result.ok) {
    return result;
  }

  const buildId = stringField(result.data, 'buildId');
  if (!buildId) {
    return {
      ok: false,
      code: 'lcia_result_build_id_missing',
      status: 502,
      message: 'LCIA result build RPC did not return a buildId',
      details: result.data,
    };
  }

  // Certificate-bound Build V2 persists the worker job inside its database
  // transaction.  Do not enqueue a second, unbound job from Edge.
  const persistedWorkerJobId = stringField(result.data, 'workerJobId');
  if (persistedWorkerJobId) {
    return {
      ok: true,
      status: 200,
      body: {
        ok: true,
        command: 'lcia_result_build_request',
        data: {
          ...(isRecord(result.data) ? result.data : { buildId }),
          workerJobId: persistedWorkerJobId,
        },
      },
    };
  }

  const workerJobEnvelope = objectField(result.data, 'workerJob');
  const workerJobRequest = workerJobFrom(workerJobEnvelope ?? {});
  if (!workerJobRequest) {
    return {
      ok: false,
      code: 'lcia_result_worker_job_request_missing',
      status: 502,
      message: 'LCIA result build RPC did not return a valid worker job request',
      details: result.data,
    };
  }

  const workerJob = await repository.enqueuePackageBuild(
    {
      buildId,
      workerJob: workerJobRequest,
      idempotencyKey:
        stringField(workerJobEnvelope, 'idempotencyKey') ?? `lcia_result.package_build:${buildId}`,
    },
    actor,
  );
  if (!workerJob.ok) {
    return {
      ok: false,
      code: 'worker_jobs_enqueue_failed',
      status: workerJob.status,
      message: 'Failed to enqueue LCIA result package build',
      details: {
        buildId,
        error: workerJob.error,
        details: workerJob.details ?? null,
      },
    };
  }

  if (!workerJob.workerJobId) {
    return {
      ok: false,
      code: 'lcia_result_worker_job_id_missing',
      status: 502,
      message: 'Worker enqueue RPC did not return a worker job id',
      details: workerJob.data,
    };
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'lcia_result_build_request',
      data: {
        ...(isRecord(result.data) ? result.data : { buildId }),
        workerJobId: workerJob.workerJobId,
      },
    },
  };
}

export async function executeDataProductCommand(
  request: DataProductCommandRequest,
  actor: ActorContext,
  repository: DataProductCommandRepository = createDataProductCommandRepository(actor.supabase),
): Promise<DataProductCommandExecutionResult> {
  switch (request.action) {
    case 'create_closure_check': {
      const result = await repository.createClosureCheck(request, auditFor(request, actor)!);
      return result.ok
        ? {
            ok: true,
            body: {
              ok: true,
              command: 'lcia_scope_closure_check_request',
              data: result.data,
            },
          }
        : result;
    }
    case 'get_closure_check': {
      const result = await repository.getClosureCheck(request);
      return result.ok
        ? {
            ok: true,
            body: {
              ok: true,
              command: 'lcia_scope_closure_check_get',
              data: result.data,
            },
          }
        : result;
    }
    case 'list_closure_issues': {
      const result = await repository.listClosureIssues(request);
      return result.ok
        ? {
            ok: true,
            body: {
              ok: true,
              command: 'lcia_scope_closure_issues_list',
              data: result.data,
            },
          }
        : result;
    }
    case 'create_closure_report_download': {
      const result = await repository.createClosureReportDownload(request);
      return result.ok
        ? {
            ok: true,
            body: {
              ok: true,
              command: 'lcia_scope_closure_report_download_create',
              data: result.data,
            },
          }
        : result;
    }
    case 'list_task_feed': {
      const result = await repository.listTaskFeed(request);
      return result.ok
        ? {
            ok: true,
            body: {
              ok: true,
              command: 'task_summary_v2_feed_list',
              data: result.data,
            },
          }
        : result;
    }
    case 'create_build':
      return executeCreateBuild(request, actor, repository);
    case 'preview_package': {
      const result = await repository.previewPackage(request);
      if (!result.ok) {
        return result;
      }
      const data = await enrichPackagePreview(result.data, request, repository);
      return {
        ok: true,
        body: {
          ok: true,
          command: 'lcia_result_package_preview',
          data,
        },
      };
    }
    case 'publish_package': {
      const result = await repository.publishPackage(request, auditFor(request, actor)!);
      if (!result.ok) {
        return result;
      }
      return {
        ok: true,
        body: {
          ok: true,
          command: 'lcia_result_package_publish',
          data: result.data,
        },
      };
    }
    case 'unpublish_publication': {
      const result = await repository.unpublishPublication(request, auditFor(request, actor)!);
      if (!result.ok) {
        return result;
      }
      return {
        ok: true,
        body: {
          ok: true,
          command: 'lcia_result_publication_unpublish',
          data: result.data,
        },
      };
    }
    case 'list_publications': {
      const result = await repository.listPublications(request);
      if (!result.ok) {
        return result;
      }
      return {
        ok: true,
        body: {
          ok: true,
          command: 'lcia_result_publications_list',
          data: result.data,
        },
      };
    }
  }
}
