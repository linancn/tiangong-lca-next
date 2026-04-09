const EXCLUDED_CURRENT_ASSIGNED_REVIEWER_COMMENT_STATES = new Set([-1, -2]);

export const isCurrentAssignedReviewerCommentState = (stateCode: number) =>
  !EXCLUDED_CURRENT_ASSIGNED_REVIEWER_COMMENT_STATES.has(stateCode);
