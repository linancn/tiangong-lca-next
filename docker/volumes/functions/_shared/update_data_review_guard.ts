type UpdateDataPayload = Record<string, unknown> | null | undefined;

const getDefinedEntries = (data: UpdateDataPayload) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return [];
  }

  return Object.entries(data).filter(([, value]) => value !== undefined);
};

export const isStateCodeOnlyUpdate = (data: UpdateDataPayload) => {
  const entries = getDefinedEntries(data);

  return (
    entries.length === 1 && entries[0]?.[0] === 'state_code' && typeof entries[0]?.[1] === 'number'
  );
};

export const canNonReviewAdminUpdateUnderReviewData = (
  oldStateCode: number | undefined,
  data: UpdateDataPayload,
) => {
  return oldStateCode === 20 && isStateCodeOnlyUpdate(data);
};
