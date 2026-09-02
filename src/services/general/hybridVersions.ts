export type MatchedHybridRow = {
  id: string;
  version: string;
  [key: string]: any;
};

/** A legacy server must not silently replace matched versions with latest rows. */
export function readMatchedHybridRows(value: unknown): MatchedHybridRow[] | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const envelope = value as Record<string, unknown>;
  if (envelope.versionScope !== 'matched' || !Array.isArray(envelope.data)) return null;
  const keys = new Set<string>();
  for (const row of envelope.data) {
    if (
      !row ||
      typeof row !== 'object' ||
      Array.isArray(row) ||
      typeof row.id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(row.id) ||
      typeof row.version !== 'string' ||
      !/^\d{2}\.\d{2}\.\d{3}$/.test(row.version)
    )
      return null;
    const key = row.id + ':' + row.version;
    if (keys.has(key)) return null;
    keys.add(key);
  }
  return envelope.data;
}
