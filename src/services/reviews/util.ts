const EXCLUDED_CURRENT_ASSIGNED_REVIEWER_COMMENT_STATES = new Set([-1, -2]);

export const isCurrentAssignedReviewerCommentState = (stateCode: number) =>
  !EXCLUDED_CURRENT_ASSIGNED_REVIEWER_COMMENT_STATES.has(stateCode);

export const hasCurrentReviewerApproval = (
  reviewerCount: number | null | undefined,
  approveOpinionCount: number | null | undefined,
) =>
  typeof reviewerCount === 'number' &&
  reviewerCount > 0 &&
  typeof approveOpinionCount === 'number' &&
  approveOpinionCount > 0;
