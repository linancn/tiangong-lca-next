import type {
  AssignTeamRequest,
  CreateRequest,
  CreateVersionRequest,
  DatasetCommandFailure,
  DeleteRequest,
  PublishRequest,
  SaveDraftRequest,
  SubmitReviewRequest,
} from './types.ts';

function invalidInput(code: string, message: string): DatasetCommandFailure {
  return {
    ok: false,
    code,
    message,
    status: 400,
  };
}

export function assertSaveDraftPolicy(
  request: SaveDraftRequest,
): { ok: true } | DatasetCommandFailure {
  if (request.table !== 'processes' && request.modelId) {
    return invalidInput(
      'MODEL_ID_NOT_ALLOWED',
      'modelId is only allowed for process dataset drafts',
    );
  }

  return { ok: true };
}

export function assertCreatePolicy(request: CreateRequest): { ok: true } | DatasetCommandFailure {
  if (request.table !== 'processes' && request.modelId) {
    return invalidInput(
      'MODEL_ID_NOT_ALLOWED',
      'modelId is only allowed for process dataset creates',
    );
  }

  return { ok: true };
}

export function assertCreateVersionPolicy(
  request: CreateVersionRequest,
): { ok: true } | DatasetCommandFailure {
  if (request.table !== 'processes' && request.modelId) {
    return invalidInput(
      'MODEL_ID_NOT_ALLOWED',
      'modelId is only allowed for process dataset version creates',
    );
  }

  return { ok: true };
}

export function assertDeletePolicy(_request: DeleteRequest): { ok: true } | DatasetCommandFailure {
  return { ok: true };
}

export function assertAssignTeamPolicy(
  _request: AssignTeamRequest,
): { ok: true } | DatasetCommandFailure {
  return { ok: true };
}

export function assertPublishPolicy(
  _request: PublishRequest,
): { ok: true } | DatasetCommandFailure {
  return { ok: true };
}

export function assertSubmitReviewPolicy(
  request: SubmitReviewRequest,
): { ok: true } | DatasetCommandFailure {
  if (request.table === 'processes' && !request.reviewSubmitGateRunId) {
    return invalidInput(
      'REVIEW_SUBMIT_GATE_REQUIRED',
      'reviewSubmitGateRunId is required for process dataset review submission',
    );
  }

  if (request.table === 'processes' && !request.revisionChecksum) {
    return invalidInput(
      'REVISION_CHECKSUM_REQUIRED',
      'revisionChecksum is required for process dataset review submission',
    );
  }

  return { ok: true };
}
