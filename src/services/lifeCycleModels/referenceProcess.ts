const INTEGER_REFERENCE_PROCESS_ID = /^-?\d+$/;

export const toReferenceProcessNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim();
  if (!INTEGER_REFERENCE_PROCESS_ID.test(normalizedValue)) {
    return undefined;
  }

  return Number(normalizedValue);
};

export const toReferenceProcessKey = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue : undefined;
};
