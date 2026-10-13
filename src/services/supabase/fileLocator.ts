import { supabaseStorageBucket } from './key';

export type FileLocator =
  | { kind: 'external'; url: string }
  | { kind: 'managed'; bucketName: string; filePath: string }
  | { kind: 'opaque' };

export const isStorageObjectKey = (key: string): boolean =>
  Boolean(key) &&
  !/[\u0000-\u001f\u007f\\]/u.test(key) &&
  !/^[a-z][a-z0-9+.-]*:/iu.test(key) &&
  key.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');

// This is a preview/Storage routing boundary, not validation of TIDAS's opaque URI field.
export function resolveFileLocator(
  uri: unknown,
  managedBuckets: readonly string[] = [supabaseStorageBucket, 'sys-files'],
): FileLocator {
  if (typeof uri !== 'string' || !uri || /[\u0000-\u001f\u007f\\]/u.test(uri)) {
    return { kind: 'opaque' };
  }
  if (/^https?:\/\//iu.test(uri)) {
    try {
      const parsed = new URL(uri);
      if (parsed.hostname && uri === uri.trim()) return { kind: 'external', url: uri };
    } catch {
      return { kind: 'opaque' };
    }
  }
  const match = /^(\.\.\/|\/|storage\/)([a-z0-9_-]+)\/(.+)$/iu.exec(uri);
  if (
    match &&
    (match[1] === 'storage/' || managedBuckets.includes(match[2])) &&
    isStorageObjectKey(match[3])
  ) {
    return { kind: 'managed', bucketName: match[2], filePath: match[3] };
  }
  return { kind: 'opaque' };
}

export function getManagedFileRemovalKeys(locators: string[], bucket: string): string[] {
  return locators.flatMap((uri) => {
    const locator = resolveFileLocator(uri, [bucket]);
    return locator.kind === 'managed' && locator.bucketName === bucket ? [locator.filePath] : [];
  });
}
