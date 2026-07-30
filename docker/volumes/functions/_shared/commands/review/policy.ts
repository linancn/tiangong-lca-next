import type {
  ApproveReviewRequest,
  AssignReviewersRequest,
  RejectReviewRequest,
  ReviewCommandFailure,
  RevokeReviewerRequest,
  SaveAssignmentDraftRequest,
  SaveCommentDraftRequest,
  SubmitCommentRequest,
} from './types.ts';

function invalidInput(code: string, message: string): ReviewCommandFailure {
  return {
    ok: false,
    code,
    message,
    status: 400,
  };
}

export function assertSaveAssignmentDraftPolicy(
  _request: SaveAssignmentDraftRequest,
): { ok: true } | ReviewCommandFailure {
  return { ok: true };
}

export function assertAssignReviewersPolicy(
  _request: AssignReviewersRequest,
): { ok: true } | ReviewCommandFailure {
  return { ok: true };
}

export function assertRevokeReviewerPolicy(
  _request: RevokeReviewerRequest,
): { ok: true } | ReviewCommandFailure {
  return { ok: true };
}

export function assertSaveCommentDraftPolicy(
  _request: SaveCommentDraftRequest,
): { ok: true } | ReviewCommandFailure {
  return { ok: true };
}

export function assertSubmitCommentPolicy(
  request: SubmitCommentRequest,
): { ok: true } | ReviewCommandFailure {
  if (
    request.commentState !== undefined &&
    request.commentState !== -3 &&
    request.commentState !== 1
  ) {
    return invalidInput('INVALID_COMMENT_STATE', 'commentState must be 1 or -3');
  }

  return { ok: true };
}

export function assertApproveReviewPolicy(
  _request: ApproveReviewRequest,
): { ok: true } | ReviewCommandFailure {
  return { ok: true };
}

export function assertRejectReviewPolicy(
  request: RejectReviewRequest,
): { ok: true } | ReviewCommandFailure {
  if (!request.reason.trim()) {
    return invalidInput('REASON_REQUIRED', 'reason is required');
  }

  return { ok: true };
}
