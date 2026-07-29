export const REVIEW_DECISION_TABLES = ['processes', 'lifecyclemodels'] as const;

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

export type ReviewCommandFailure = {
  ok: false;
  code: string;
  message: string;
  status: number;
  details?: unknown;
};

export type ReviewCommandExecutionResult =
  | { ok: true; body: unknown; status?: number }
  | ReviewCommandFailure;
