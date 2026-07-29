export type EmbeddingJobErrorCategory =
  | 'db_lock_timeout'
  | 'db_statement_timeout'
  | 'db_contention'
  | 'unexpected';

export type ClassifiedEmbeddingJobError = {
  category: EmbeddingJobErrorCategory;
  code?: string;
  message: string;
  retryable: boolean;
};

type PostgresLikeError = {
  code?: unknown;
  message?: unknown;
};

export function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function classifyEmbeddingJobError(error: unknown): ClassifiedEmbeddingJobError {
  const postgresError = error as PostgresLikeError;
  const code = typeof postgresError?.code === 'string' ? postgresError.code : undefined;
  const message = getErrorMessage(error);
  const normalizedMessage = message.toLowerCase();

  if (code === '55P03' || normalizedMessage.includes('lock timeout')) {
    return {
      category: 'db_lock_timeout',
      code,
      message,
      retryable: true,
    };
  }

  if (
    code === '57014' ||
    normalizedMessage.includes('statement timeout') ||
    normalizedMessage.includes('canceling statement due to statement timeout')
  ) {
    return {
      category: 'db_statement_timeout',
      code,
      message,
      retryable: true,
    };
  }

  if (
    code === '40P01' ||
    normalizedMessage.includes('deadlock detected') ||
    normalizedMessage.includes('could not serialize access')
  ) {
    return {
      category: 'db_contention',
      code,
      message,
      retryable: true,
    };
  }

  return {
    category: 'unexpected',
    code,
    message,
    retryable: false,
  };
}
