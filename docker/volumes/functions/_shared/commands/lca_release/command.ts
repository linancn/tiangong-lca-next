import { z } from 'zod';

import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import type { CommandParseResult } from '../../command_runtime/command.ts';
import {
  createLcaReleaseCommandRepository,
  type LcaReleaseCommandRepository,
} from './repository.ts';
import {
  LCA_RELEASE_FORMATS,
  LCA_RELEASE_PROFILE_IDS,
  type LcaReleaseCommandExecutionResult,
  type LcaReleaseCommandRequest,
} from './types.ts';

const versionPattern = /^\d{2}\.\d{2}\.\d{3}$/;
const sha256Pattern = /^[0-9a-f]{64}$/;
const uuidSchema = z.string().uuid();
const sha256Schema = z.string().regex(sha256Pattern, 'must be a lowercase SHA-256 value');
const jsonObjectSchema = z.record(z.string(), z.unknown());
const reasonSchema = z.string().trim().min(1).max(1000);
const idempotencyKeySchema = z.string().trim().min(1).max(200);

const artifactInputSchema = z
  .object({
    profileId: z.enum(LCA_RELEASE_PROFILE_IDS),
    format: z.enum(LCA_RELEASE_FORMATS),
    sha256: sha256Schema,
    byteSize: z
      .number()
      .int()
      .positive()
      .max(50 * 1024 * 1024),
    mediaType: z.literal('application/zip'),
  })
  .strict();

function artifactSetSchema<T extends z.ZodTypeAny>(item: T) {
  return z
    .array(item)
    .length(4)
    .superRefine((artifacts, context) => {
      const actual = new Set(
        artifacts.map((artifact) => {
          const value = artifact as { profileId: string; format: string };
          return `${value.profileId}:${value.format}`;
        }),
      );
      const expected = LCA_RELEASE_PROFILE_IDS.flatMap((profileId) =>
        LCA_RELEASE_FORMATS.map((format) => `${profileId}:${format}`),
      );
      if (actual.size !== 4 || expected.some((pair) => !actual.has(pair))) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'artifacts must contain each TIDAS/ILCD release profile pair exactly once',
        });
      }
    });
}

const uploadedArtifactSchema = artifactInputSchema.extend({
  storageBucket: z.string().trim().min(1).max(200),
  objectKey: z.string().trim().min(1).max(1500),
});

const prepareSchema = z
  .object({
    action: z.literal('prepare'),
    releaseRunId: uuidSchema,
    releaseVersion: z.string().regex(versionPattern, 'releaseVersion must use NN.NN.NNN'),
    selectionManifestHash: sha256Schema,
    inputManifestHash: sha256Schema,
    calculationBundleRef: jsonObjectSchema,
    calculationBundleHash: sha256Schema,
    profileLockHash: sha256Schema,
    publishPlan: jsonObjectSchema,
    publishPlanHash: sha256Schema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

const createArtifactUploadsSchema = z
  .object({
    action: z.literal('create_artifact_uploads'),
    releaseRunId: uuidSchema,
    publishPlanHash: sha256Schema,
    artifacts: artifactSetSchema(artifactInputSchema),
  })
  .strict();

const finalizeArtifactsSchema = z
  .object({
    action: z.literal('finalize_artifacts'),
    releaseRunId: uuidSchema,
    publishPlanHash: sha256Schema,
    releaseManifest: jsonObjectSchema,
    releaseManifestHash: sha256Schema,
    artifacts: artifactSetSchema(uploadedArtifactSchema),
  })
  .strict();

const approveSchema = z
  .object({
    action: z.literal('approve'),
    releaseRunId: uuidSchema,
    publishPlanHash: sha256Schema,
    expiresAt: z.string().datetime({ offset: true }).optional(),
    reason: reasonSchema.optional(),
  })
  .strict();

const publishSchema = z
  .object({
    action: z.literal('publish'),
    releaseRunId: uuidSchema,
    approvalId: uuidSchema,
    approvalHash: sha256Schema,
    publishPlanHash: sha256Schema,
    idempotencyKey: idempotencyKeySchema,
    credentialFingerprint: sha256Schema,
    reason: reasonSchema.optional(),
  })
  .strict();

const readbackVerifySchema = z
  .object({
    action: z.literal('readback_verify'),
    releaseRunId: uuidSchema,
    releaseManifestHash: sha256Schema,
    artifactHashes: z
      .array(
        z
          .object({
            artifactId: uuidSchema,
            sha256: sha256Schema,
          })
          .strict(),
      )
      .length(4)
      .superRefine((items, context) => {
        if (new Set(items.map((item) => item.artifactId)).size !== items.length) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'artifactHashes must contain four distinct artifact ids',
          });
        }
      }),
  })
  .strict();

const unpublishSchema = z
  .object({
    action: z.literal('unpublish'),
    publicationId: uuidSchema,
    reason: reasonSchema,
  })
  .strict();

const getReleaseSchema = z
  .object({ action: z.literal('get_release'), releaseRunId: uuidSchema })
  .strict();
const getCurrentSchema = z.object({ action: z.literal('get_current') }).strict();
const getCalculationBundleSchema = z
  .object({ action: z.literal('get_calculation_bundle'), packageId: uuidSchema })
  .strict();
const createArtifactDownloadSchema = z
  .object({ action: z.literal('create_artifact_download'), artifactId: uuidSchema })
  .strict();

export const lcaReleaseCommandRequestSchema = z.discriminatedUnion('action', [
  prepareSchema,
  createArtifactUploadsSchema,
  finalizeArtifactsSchema,
  approveSchema,
  publishSchema,
  readbackVerifySchema,
  unpublishSchema,
  getReleaseSchema,
  getCurrentSchema,
  getCalculationBundleSchema,
  createArtifactDownloadSchema,
]);

function invalidPayload<T>(error: z.ZodError): CommandParseResult<T> {
  return {
    ok: false,
    message: 'Invalid LCA release command payload',
    details: error.flatten(),
  };
}

export function parseLcaReleaseCommand(
  body: unknown,
): CommandParseResult<LcaReleaseCommandRequest> {
  const parsed = lcaReleaseCommandRequestSchema.safeParse(body);
  return parsed.success ? { ok: true, value: parsed.data } : invalidPayload(parsed.error);
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function auditFor(request: LcaReleaseCommandRequest, actor: ActorContext) {
  switch (request.action) {
    case 'prepare':
      return buildCommandAuditPayload({
        command: 'lca_release_prepare',
        actorUserId: actor.userId,
        targetTable: 'lca_release_runs',
        targetId: request.releaseRunId,
        targetVersion: request.releaseVersion,
        payload: { publishPlanHash: request.publishPlanHash },
      });
    case 'approve':
      return buildCommandAuditPayload({
        command: 'lca_release_approve',
        actorUserId: actor.userId,
        targetTable: 'lca_release_runs',
        targetId: request.releaseRunId,
        targetVersion: '',
        payload: { publishPlanHash: request.publishPlanHash, reason: request.reason ?? null },
      });
    case 'publish':
      return buildCommandAuditPayload({
        command: 'lca_release_publish',
        actorUserId: actor.userId,
        targetTable: 'lca_release_runs',
        targetId: request.releaseRunId,
        targetVersion: '',
        payload: {
          approvalId: request.approvalId,
          publishPlanHash: request.publishPlanHash,
          reason: request.reason ?? null,
        },
      });
    case 'readback_verify':
      return buildCommandAuditPayload({
        command: 'lca_release_readback_verify',
        actorUserId: actor.userId,
        targetTable: 'lca_release_runs',
        targetId: request.releaseRunId,
        targetVersion: '',
        payload: { releaseManifestHash: request.releaseManifestHash },
      });
    case 'unpublish':
      return buildCommandAuditPayload({
        command: 'lca_release_unpublish',
        actorUserId: actor.userId,
        targetTable: 'lca_release_publications',
        targetId: request.publicationId,
        targetVersion: '',
        payload: { reason: request.reason },
      });
    case 'create_artifact_uploads':
    case 'finalize_artifacts':
    case 'get_release':
    case 'get_current':
    case 'get_calculation_bundle':
    case 'create_artifact_download':
      return null;
  }
}

function releaseRunPrecondition(
  data: unknown,
  publishPlanHash: string,
  allowedStatuses: string[],
): LcaReleaseCommandExecutionResult | null {
  const run = recordValue(data);
  if (!run) {
    return {
      ok: false,
      code: 'release_run_response_invalid',
      status: 502,
      message: 'Release run lookup returned an invalid response',
      details: data,
    };
  }
  if (stringValue(run.publishPlanHash) !== publishPlanHash) {
    return {
      ok: false,
      code: 'publish_plan_hash_mismatch',
      status: 409,
      message: 'Release command does not bind the prepared publish plan hash',
    };
  }
  const status = stringValue(run.status);
  if (!status || !allowedStatuses.includes(status)) {
    return {
      ok: false,
      code: 'release_state_conflict',
      status: 409,
      message: `Release run is not in an allowed state: ${allowedStatuses.join(', ')}`,
      details: { status },
    };
  }
  return null;
}

function success(command: string, data: unknown): LcaReleaseCommandExecutionResult {
  return { ok: true, body: { ok: true, command, data } };
}

export async function executeLcaReleaseCommand(
  request: LcaReleaseCommandRequest,
  actor: ActorContext,
  repository: LcaReleaseCommandRepository = createLcaReleaseCommandRepository(actor.supabase),
): Promise<LcaReleaseCommandExecutionResult> {
  switch (request.action) {
    case 'prepare': {
      const result = await repository.prepare(request, auditFor(request, actor)!);
      return result.ok ? success('lca_release_prepare', result.data) : result;
    }
    case 'create_artifact_uploads': {
      const manager = await repository.assertManager();
      if (!manager.ok) return manager;
      const run = await repository.getRun(request.releaseRunId);
      if (!run.ok) return run;
      const precondition = releaseRunPrecondition(run.data, request.publishPlanHash, ['prepared']);
      if (precondition) return precondition;
      const result = await repository.createArtifactUploads(request);
      return result.ok ? success('lca_release_artifact_uploads_create', result.data) : result;
    }
    case 'finalize_artifacts': {
      const allowedStatuses = [
        'prepared',
        'ready_for_approval',
        'approved',
        'published',
        'readback_verified',
      ];
      const manager = await repository.assertManager();
      if (!manager.ok) return manager;
      const before = await repository.getRun(request.releaseRunId);
      if (!before.ok) return before;
      const beforePrecondition = releaseRunPrecondition(
        before.data,
        request.publishPlanHash,
        allowedStatuses,
      );
      if (beforePrecondition) return beforePrecondition;

      const verified = await repository.verifyArtifacts(request);
      if (!verified.ok) return verified;

      // Re-run the dedicated actor-bound assertion after object reads so a revoked manager role
      // fails closed even when the release itself is already public.
      const liveManagerCheck = await repository.assertManager();
      if (!liveManagerCheck.ok) return liveManagerCheck;

      // Re-read the run immediately before the internal service-only finalize transaction.
      const liveActorCheck = await repository.getRun(request.releaseRunId);
      if (!liveActorCheck.ok) return liveActorCheck;
      const livePrecondition = releaseRunPrecondition(
        liveActorCheck.data,
        request.publishPlanHash,
        allowedStatuses,
      );
      if (livePrecondition) return livePrecondition;

      const result = await repository.finalizeArtifacts(request, {
        requestedBy: actor.userId,
        edgeVerified: true,
        verifiedArtifactCount: verified.data.length,
      });
      return result.ok ? success('lca_release_artifacts_finalize', result.data) : result;
    }
    case 'approve': {
      const result = await repository.approve(request, auditFor(request, actor)!);
      return result.ok ? success('lca_release_approve', result.data) : result;
    }
    case 'publish': {
      const result = await repository.publish(request, auditFor(request, actor)!);
      return result.ok ? success('lca_release_publish', result.data) : result;
    }
    case 'readback_verify': {
      const result = await repository.readbackVerify(request, auditFor(request, actor)!);
      return result.ok ? success('lca_release_readback_verify', result.data) : result;
    }
    case 'unpublish': {
      const result = await repository.unpublish(request, auditFor(request, actor)!);
      return result.ok ? success('lca_release_unpublish', result.data) : result;
    }
    case 'get_release': {
      const result = await repository.getRun(request.releaseRunId);
      return result.ok ? success('lca_release_get', result.data) : result;
    }
    case 'get_current': {
      const result = await repository.getCurrent();
      return result.ok ? success('lca_release_current_get', result.data) : result;
    }
    case 'get_calculation_bundle': {
      const result = await repository.getCalculationBundle(request.packageId);
      return result.ok ? success('lcia_result_calculation_bundle_get', result.data) : result;
    }
    case 'create_artifact_download': {
      const result = await repository.createArtifactDownload(request.artifactId);
      return result.ok ? success('lca_release_artifact_download_create', result.data) : result;
    }
  }
}
