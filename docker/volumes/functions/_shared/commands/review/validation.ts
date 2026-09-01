import { z } from 'zod';

import type { CommandParseResult } from '../../command_runtime/command.ts';
import {
  REVIEW_DECISION_TABLES,
  type ApproveReviewRequest,
  type AssignReviewersRequest,
  type RejectReviewRequest,
  type ReviewBatchDecisionRequest,
  type ReviewQualityDiagnosticRequest,
  type RevokeReviewerRequest,
  type SaveAssignmentDraftRequest,
  type SaveCommentDraftRequest,
  type SimpleReviewDecisionRequest,
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

export const simpleReviewDecisionRequestSchema = z.discriminatedUnion('decision', [
  reviewBaseSchema
    .extend({
      decision: z.literal('approve'),
    })
    .strict(),
  reviewBaseSchema
    .extend({
      decision: z.literal('reject'),
      reason: z.string().trim().min(1, 'reason is required'),
    })
    .strict(),
]);

export const reviewBatchDecisionRequestSchema = z
  .object({
    reviewIds: z.array(uuidSchema).min(1).max(50),
    decision: z.enum(['approve', 'reject']),
    reason: z.string().trim().max(1000).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.decision === 'reject' && !value.reason?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: 'reason is required for reject',
      });
    }
    if (value.decision === 'approve' && value.reason?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: 'approve does not accept a reason',
      });
    }
  })
  .transform((value) => ({
    ...value,
    reviewIds: [...new Set(value.reviewIds)],
    ...(value.reason?.trim() ? { reason: value.reason.trim() } : {}),
  }));

export const reviewQualityDiagnosticRequestSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('start'),
    })
    .strict(),
  z
    .object({
      action: z.literal('read'),
      runId: uuidSchema.optional(),
    })
    .strict(),
]);

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

export function parseSimpleReviewDecisionRequest(
  body: unknown,
): CommandParseResult<SimpleReviewDecisionRequest> {
  const parsed = simpleReviewDecisionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid simple review decision payload', parsed.error);
  }

  return { ok: true, value: parsed.data };
}

export function parseReviewBatchDecisionRequest(
  body: unknown,
): CommandParseResult<ReviewBatchDecisionRequest> {
  const parsed = reviewBatchDecisionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid review batch decision payload', parsed.error);
  }

  return { ok: true, value: parsed.data };
}

export function parseReviewQualityDiagnosticRequest(
  body: unknown,
): CommandParseResult<ReviewQualityDiagnosticRequest> {
  const parsed = reviewQualityDiagnosticRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid review quality diagnostic payload', parsed.error);
  }

  return { ok: true, value: parsed.data };
}
