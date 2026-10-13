import {
  getManagedFileRemovalKeys,
  isStorageObjectKey,
  resolveFileLocator,
} from '@/services/supabase/fileLocator';

describe('digital-file locator routing', () => {
  it.each(['http://lca.jrc.ec.europa.eu', 'HTTPS://example.org/a%2Fb?q=hello#part'])(
    'keeps an external URL byte-for-byte: %s',
    (uri) => {
      expect(resolveFileLocator(uri)).toEqual({ kind: 'external', url: uri });
    },
  );
  it.each([
    '../external_docs/a/b/c.pdf',
    '/sys-files/logo/name.png',
    'storage/bucket-name/a/file.jpg',
  ])('resolves only explicit Storage syntax: %s', (uri) => {
    expect(resolveFileLocator(uri).kind).toBe('managed');
  });
  it('preserves nested object keys, Unicode, spaces and literal percent/query/hash characters', () => {
    expect(resolveFileLocator('../external_docs/a/文档 %2F?x#y.pdf')).toEqual({
      kind: 'managed',
      bucketName: 'external_docs',
      filePath: 'a/文档 %2F?x#y.pdf',
    });
  });
  it.each([
    null,
    1,
    '',
    'https://',
    ' https://example.org/a',
    'http://example.org/\nfile',
    'javascript:alert(1)',
    'blob:preview',
    'data:image/svg+xml,x',
    'file:///tmp/a',
    '//example.org/a',
    '../local/a',
    './relative/a.pdf',
    '../external_docs/a/../b',
    '../external_docs/a//b',
    '../external_docs/a\\b',
    '../external_docs/',
  ])('leaves %p opaque and inactive', (uri) => {
    expect(resolveFileLocator(uri)).toEqual({ kind: 'opaque' });
  });
  it('limits deletion keys to the intended managed bucket', () => {
    expect(
      getManagedFileRemovalKeys(
        [
          '../external_docs/a/b.pdf',
          '/external_docs/c.pdf',
          '../sys-files/logo/c.png',
          'https://example.org/c.pdf',
          'data:text/plain,x',
          'blob:preview',
          '../local/c.pdf',
        ],
        'external_docs',
      ),
    ).toEqual(['a/b.pdf', 'c.pdf']);
  });
  it.each(['a/b.pdf', 'a/file name.pdf'])('accepts a real object key %s', (key) => {
    expect(isStorageObjectKey(key)).toBe(true);
  });
  it.each(['', '/a', '../a', 'a/./b', 'a//b', 'https://example.org/a', 'data:text/plain,x'])(
    'rejects unsafe deletion input %s',
    (key) => {
      expect(isStorageObjectKey(key)).toBe(false);
    },
  );
});
