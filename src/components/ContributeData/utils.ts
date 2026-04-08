type IntlLike = {
  formatMessage: (descriptor: { id: string; defaultMessage?: string }) => string;
};

const OPEN_DATA_CONTRIBUTE_ERROR_MESSAGE = {
  id: 'component.contributeData.error.dataAlreadyPublished',
  defaultMessage: 'Open data cannot be shared to a team.',
};

const UNDER_REVIEW_CONTRIBUTE_ERROR_MESSAGE = {
  id: 'component.contributeData.error.dataUnderReview',
  defaultMessage: 'Data under review cannot be contributed to a team.',
};

const DEFAULT_ACTION_ERROR_MESSAGE = {
  id: 'pages.action.error',
  defaultMessage: 'Action failed',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function extractContributeErrorCode(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  return typeof error.code === 'string' ? error.code : undefined;
}

function extractContributeStateCode(error: unknown): number | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  if (typeof error.state_code === 'number') {
    return error.state_code;
  }

  if (isRecord(error.details) && typeof error.details.state_code === 'number') {
    return error.details.state_code;
  }

  return undefined;
}

function extractContributeReviewStateCode(error: unknown): number | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  if (typeof error.review_state_code === 'number') {
    return error.review_state_code;
  }

  if (isRecord(error.details) && typeof error.details.review_state_code === 'number') {
    return error.details.review_state_code;
  }

  return undefined;
}

function extractContributeErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  if (!isRecord(error)) {
    return undefined;
  }

  return typeof error.message === 'string' && error.message.trim().length > 0
    ? error.message
    : undefined;
}

export function extractContributeDataError(result: unknown): unknown {
  if (!isRecord(result)) {
    return null;
  }

  if (result.error) {
    return result.error;
  }

  if (!Array.isArray(result.contributeResults)) {
    return null;
  }

  for (const contributeResult of result.contributeResults) {
    if (!isRecord(contributeResult)) {
      continue;
    }

    if (isRecord(contributeResult.data) && contributeResult.data.error) {
      return contributeResult.data.error;
    }

    if (contributeResult.error) {
      return contributeResult.error;
    }
  }

  return null;
}

export function getContributeDataErrorMessage(intl: IntlLike, error: unknown): string {
  const errorCode = extractContributeErrorCode(error);
  const stateCode = extractContributeStateCode(error);
  const reviewStateCode = extractContributeReviewStateCode(error);

  if (errorCode === 'DATA_ALREADY_PUBLISHED' || stateCode === 100) {
    return intl.formatMessage(OPEN_DATA_CONTRIBUTE_ERROR_MESSAGE);
  }

  if (errorCode === 'DATA_UNDER_REVIEW' || stateCode === 20 || reviewStateCode === 20) {
    return intl.formatMessage(UNDER_REVIEW_CONTRIBUTE_ERROR_MESSAGE);
  }

  return extractContributeErrorMessage(error) ?? intl.formatMessage(DEFAULT_ACTION_ERROR_MESSAGE);
}
