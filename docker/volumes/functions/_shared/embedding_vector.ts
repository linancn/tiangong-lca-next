export const EMBEDDING_FT_DIMENSIONS = 1024;

export class EmbeddingVectorError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'EmbeddingVectorError';
    this.code = code;
  }
}

function isFiniteNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'number' && Number.isFinite(item))
  );
}

function safeParseJsonString(value: string): unknown | undefined {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return undefined;

  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

function findFirstNumberArray(value: unknown): number[] | undefined {
  if (typeof value === 'string') {
    const parsed = safeParseJsonString(value);
    return parsed === undefined ? undefined : findFirstNumberArray(parsed);
  }

  if (isFiniteNumberArray(value)) return value;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstNumberArray(item);
      if (found) return found;
    }
    return undefined;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['embedding', 'embeddings', 'data']) {
      if (key in record) {
        const found = findFirstNumberArray(record[key]);
        if (found) return found;
      }
    }
    for (const candidate of Object.values(record)) {
      const found = findFirstNumberArray(candidate);
      if (found) return found;
    }
  }

  return undefined;
}

export function extractEmbeddingVector(
  value: unknown,
  expectedDimensions = EMBEDDING_FT_DIMENSIONS,
): number[] {
  const embedding = findFirstNumberArray(value);
  if (!embedding) {
    throw new EmbeddingVectorError(
      'EMBEDDING_VECTOR_MISSING',
      'failed to find a finite embedding vector in model response',
    );
  }
  if (embedding.length !== expectedDimensions) {
    throw new EmbeddingVectorError(
      'EMBEDDING_DIMENSION_MISMATCH',
      `expected ${expectedDimensions} embedding dimensions, received ${embedding.length}`,
    );
  }
  return embedding;
}
