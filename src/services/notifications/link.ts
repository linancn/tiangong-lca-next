const normalizeString = (value?: string | null) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

export const normalizeNotificationLink = (value?: string | null) => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return undefined;
  }

  if (normalized.startsWith('/') && !normalized.startsWith('//')) {
    return normalized;
  }

  try {
    const parsed = new URL(normalized);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? normalized : undefined;
  } catch {
    return undefined;
  }
};
