export const normalizeExchangeLocationCode = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const normalizedValue = `${value}`.trim();
    return normalizedValue || undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const normalizedValue = normalizeExchangeLocationCode(item);
      if (normalizedValue) {
        return normalizedValue;
      }
    }
    return undefined;
  }

  if (typeof value === 'object') {
    const locationValue = value as Record<string, unknown>;
    return (
      normalizeExchangeLocationCode(locationValue['#text']) ??
      normalizeExchangeLocationCode(locationValue['@value']) ??
      normalizeExchangeLocationCode(locationValue.value)
    );
  }

  return undefined;
};
