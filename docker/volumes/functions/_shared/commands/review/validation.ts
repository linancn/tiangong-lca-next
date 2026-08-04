import { z } from 'zod';

import type { CommandParseResult } from '../../command_runtime/command.ts';
import {
  type ApproveReviewRequest,
  type AssignReviewersRequest,
  type RejectReviewRequest,
  REVIEW_DECISION_TABLES,
  type RevokeReviewerRequest,
  type SaveAssignmentDraftRequest,
  type SaveCommentDraftRequest,
  type SubmitCommentRequest,
} from './types.ts';

const uuidSchema = z.string().uuid();
const reviewerIdsSchema = z.array(uuidSchema);
const commentStateSchema = z.union([z.literal(-3), z.literal(1)]);
const isoDateTimeSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'deadline must be an ISO datetime string');

const reviewBaseSchema = z
  .object({
    reviewId: uuidSchema,
  })
  .strict();

export const saveAssignmentDraftRequestSchema = reviewBaseSchema
  .extend({
    reviewerIds: reviewerIdsSchema,
  })
  .strict();

export const assignReviewersRequestSchema = reviewBaseSchema
  .extend({
    reviewerIds: reviewerIdsSchema,
    deadline: isoDateTimeSchema.nullable().optional(),
  })
  .strict();

export const revokeReviewerRequestSchema = reviewBaseSchema
  .extend({
    reviewerId: uuidSchema,
  })
  .strict();

export const saveCommentDraftRequestSchema = reviewBaseSchema
  .extend({
    json: z.unknown(),
  })
  .strict();

export const submitCommentRequestSchema = reviewBaseSchema
  .extend({
    json: z.unknown(),
    commentState: commentStateSchema.optional(),
  })
  .strict();

const decisionBaseSchema = z
  .object({
    table: z.enum(REVIEW_DECISION_TABLES),
    reviewId: uuidSchema,
  })
  .strict();

export const approveReviewRequestSchema = decisionBaseSchema.strict();

export const rejectReviewRequestSchema = decisionBaseSchema
  .extend({
    reason: z.string().trim().min(1, 'reason is required'),
  })
  .strict();

function invalidPayload<T>(message: string, error: z.ZodError): CommandParseResult<T> {
  return {
    ok: false,
    message,
    details: error.flatten(),
  };
}

export function parseSaveAssignmentDraftRequest(
  body: unknown,
): CommandParseResult<SaveAssignmentDraftRequest> {
  const parsed = saveAssignmentDraftRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid review save-assignment-draft payload', parsed.error);
  }

  return { ok: true, value: parsed.data };
}

export function parseAssignReviewersRequest(
  body: unknown,
): CommandParseResult<AssignReviewersRequest> {
  const parsed = assignReviewersRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid review assign-reviewers payload', parsed.error);
  }

  return { ok: true, value: parsed.data };
}

export function parseRevokeReviewerRequest(
  body: unknown,
): CommandParseResult<RevokeReviewerRequest> {
  const parsed = revokeReviewerRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid review revoke-reviewer payload', parsed.error);
  }

  return { ok: true, value: parsed.data };
}

export function parseSaveCommentDraftRequest(
  body: unknown,
): CommandParseResult<SaveCommentDraftRequest> {
  const parsed = saveCommentDraftRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid review save-comment-draft payload', parsed.error);
  }

  return { ok: true, value: parsed.data };
}

export function parseSubmitCommentRequest(body: unknown): CommandParseResult<SubmitCommentRequest> {
  const parsed = submitCommentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid review submit-comment payload', parsed.error);
  }

  return { ok: true, value: parsed.data };
}

export function parseApproveReviewRequest(body: unknown): CommandParseResult<ApproveReviewRequest> {
  const parsed = approveReviewRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid review approve payload', parsed.error);
  }

  return { ok: true, value: parsed.data };
}

export function parseRejectReviewRequest(body: unknown): CommandParseResult<RejectReviewRequest> {
  const parsed = rejectReviewRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid review reject payload', parsed.error);
  }

  return { ok: true, value: parsed.data };
}
