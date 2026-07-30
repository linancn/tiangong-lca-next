import { z } from 'zod';

import type { CommandParseResult } from '../../command_runtime/command.ts';
import {
  type AssignTeamRequest,
  type CreateRequest,
  type CreateVersionRequest,
  DATASET_TABLES,
  type DeleteRequest,
  type PublishRequest,
  REVIEW_SUBMIT_GATE_POLICY_PROFILE,
  REVIEW_SUBMIT_GATE_REPORT_SCHEMA_VERSION,
  type SaveDraftRequest,
  type SubmitReviewRequest,
} from './types.ts';

const versionPattern = /^\d{2}\.\d{2}\.\d{3}$/;
const sha256Pattern = /^[a-f0-9]{64}$/;

const datasetTableSchema = z.enum(DATASET_TABLES);
const datasetIdSchema = z.string().uuid();
const versionSchema = z.string().regex(versionPattern, 'version must be in 00.00.000 format');
const sha256Schema = z
  .string()
  .regex(sha256Pattern, 'revisionChecksum must be a lowercase SHA-256 hex digest');

const datasetIdTableSchema = z
  .object({
    table: datasetTableSchema,
    id: datasetIdSchema,
  })
  .strict();

const datasetBaseRequestSchema = datasetIdTableSchema
  .extend({
    version: versionSchema,
  })
  .strict();

export const saveDraftRequestSchema = datasetBaseRequestSchema
  .extend({
    jsonOrdered: z.unknown(),
    modelId: z.string().uuid().optional(),
    ruleVerification: z.boolean().nullable().optional(),
  })
  .strict();

export const createRequestSchema = datasetIdTableSchema
  .extend({
    jsonOrdered: z.unknown(),
    modelId: z.string().uuid().nullable().optional(),
    ruleVerification: z.boolean().nullable().optional(),
  })
  .strict();

export const createVersionRequestSchema = datasetIdTableSchema
  .extend({
    sourceVersion: versionSchema,
    jsonOrdered: z.unknown(),
    modelId: z.string().uuid().nullable().optional(),
    ruleVerification: z.boolean().nullable().optional(),
  })
  .strict();

export const deleteRequestSchema = datasetBaseRequestSchema.strict();

export const assignTeamRequestSchema = datasetBaseRequestSchema
  .extend({
    teamId: z.string().uuid(),
  })
  .strict();

export const publishRequestSchema = datasetBaseRequestSchema.strict();
export const submitReviewRequestSchema = datasetBaseRequestSchema
  .extend({
    reviewSubmitGateRunId: z.string().uuid().optional(),
    revisionChecksum: sha256Schema.optional(),
    reviewSubmitPolicyProfile: z.literal(REVIEW_SUBMIT_GATE_POLICY_PROFILE).optional(),
    reviewSubmitReportSchemaVersion: z.literal(REVIEW_SUBMIT_GATE_REPORT_SCHEMA_VERSION).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.table !== 'processes') {
      return;
    }

    if (!value.reviewSubmitGateRunId) {
      ctx.addIssue({
        code: 'custom',
        path: ['reviewSubmitGateRunId'],
        message: 'reviewSubmitGateRunId is required for process submit-review',
      });
    }

    if (!value.revisionChecksum) {
      ctx.addIssue({
        code: 'custom',
        path: ['revisionChecksum'],
        message: 'revisionChecksum is required for process submit-review',
      });
    }
  });

function invalidPayload<T>(message: string, error: z.ZodError): CommandParseResult<T> {
  return {
    ok: false,
    message,
    details: error.flatten(),
  };
}

export function parseSaveDraftRequest(body: unknown): CommandParseResult<SaveDraftRequest> {
  const parsed = saveDraftRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid dataset save draft payload', parsed.error);
  }

  return {
    ok: true,
    value: parsed.data,
  };
}

export function parseCreateRequest(body: unknown): CommandParseResult<CreateRequest> {
  const parsed = createRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid dataset create payload', parsed.error);
  }

  return {
    ok: true,
    value: parsed.data,
  };
}

export function parseCreateVersionRequest(body: unknown): CommandParseResult<CreateVersionRequest> {
  const parsed = createVersionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid dataset create-version payload', parsed.error);
  }

  return {
    ok: true,
    value: parsed.data,
  };
}

export function parseDeleteRequest(body: unknown): CommandParseResult<DeleteRequest> {
  const parsed = deleteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid dataset delete payload', parsed.error);
  }

  return {
    ok: true,
    value: parsed.data,
  };
}

export function parseAssignTeamRequest(body: unknown): CommandParseResult<AssignTeamRequest> {
  const parsed = assignTeamRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid dataset assign-team payload', parsed.error);
  }

  return {
    ok: true,
    value: parsed.data,
  };
}

export function parsePublishRequest(body: unknown): CommandParseResult<PublishRequest> {
  const parsed = publishRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid dataset publish payload', parsed.error);
  }

  return {
    ok: true,
    value: parsed.data,
  };
}

export function parseSubmitReviewRequest(body: unknown): CommandParseResult<SubmitReviewRequest> {
  const parsed = submitReviewRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid dataset submit-review payload', parsed.error);
  }

  return {
    ok: true,
    value: parsed.data,
  };
}
