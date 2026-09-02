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

  if (request.table !== 'processes' && request.modelVersion) {
    return invalidInput(
      'MODEL_VERSION_NOT_ALLOWED',
      'modelVersion is only allowed for process dataset drafts',
    );
  }

  if (request.modelVersion && !request.modelId) {
    return invalidInput(
      'MODEL_ID_REQUIRED_FOR_MODEL_VERSION',
      'modelId is required when modelVersion is provided',
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

  if (request.table !== 'processes' && request.modelVersion) {
    return invalidInput(
      'MODEL_VERSION_NOT_ALLOWED',
      'modelVersion is only allowed for process dataset creates',
    );
  }

  if (request.modelVersion && !request.modelId) {
    return invalidInput(
      'MODEL_ID_REQUIRED_FOR_MODEL_VERSION',
      'modelId is required when modelVersion is provided',
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

  if (request.table !== 'processes' && request.modelVersion) {
    return invalidInput(
      'MODEL_VERSION_NOT_ALLOWED',
      'modelVersion is only allowed for process dataset version creates',
    );
  }

  if (request.modelVersion && !request.modelId) {
    return invalidInput(
      'MODEL_ID_REQUIRED_FOR_MODEL_VERSION',
      'modelId is required when modelVersion is provided',
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
  _request: SubmitReviewRequest,
): { ok: true } | DatasetCommandFailure {
  return { ok: true };
}
