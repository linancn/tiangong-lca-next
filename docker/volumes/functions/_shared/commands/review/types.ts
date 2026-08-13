export const REVIEW_DECISION_TABLES = [
  'contacts',
  'sources',
  'unitgroups',
  'flowproperties',
  'flows',
  'processes',
  'lifecyclemodels',
] as const;

export type ReviewDecisionTable = (typeof REVIEW_DECISION_TABLES)[number];

export type SaveAssignmentDraftRequest = {
  reviewId: string;
  reviewerIds: string[];
};

export type AssignReviewersRequest = {
  reviewId: string;
  reviewerIds: string[];
  deadline?: string | null;
};

export type RevokeReviewerRequest = {
  reviewId: string;
  reviewerId: string;
};

export type SaveCommentDraftRequest = {
  reviewId: string;
  json: unknown;
};

export type SubmitCommentRequest = {
  reviewId: string;
  json: unknown;
  commentState?: 1 | -3;
};

export type ApproveReviewRequest = {
  table: ReviewDecisionTable;
  reviewId: string;
};

export type RejectReviewRequest = {
  table: ReviewDecisionTable;
  reviewId: string;
  reason: string;
};

export type ReviewKind = 'root' | 'reference';

export type SimpleReviewDecision = 'approve' | 'reject';

export type SimpleReviewDecisionRequest =
  | {
      reviewId: string;
      decision: 'approve';
    }
  | {
      reviewId: string;
      decision: 'reject';
      reason: string;
    };

export type ReviewBatchDecisionRequest = {
  reviewIds: string[];
  decision: SimpleReviewDecision;
  reason?: string;
};

export type ReviewIdRequest = {
  reviewId: string;
};

export type ReviewerDecisionRequest = ReviewIdRequest & {
  decision: SimpleReviewDecision;
  reason?: string;
};

export type ReviewResponsibility = {
  reviewId: string;
  reviewKind: ReviewKind;
  targetTable: ReviewDecisionTable;
  targetId: string;
  targetVersion: string;
  ownerId: string;
};

export type ReviewCommandFailure = {
  ok: false;
  code: string;
  message: string;
  status: number;
  details?: unknown;
};

export type ReviewCommandExecutionResult =
  { ok: true; body: unknown; status?: number } | ReviewCommandFailure;
