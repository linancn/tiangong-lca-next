import { FunctionRegion } from '@supabase/supabase-js';
import {
  DecompressionStream as NodeDecompressionStream,
  ReadableStream as NodeReadableStream,
} from 'node:stream/web';
import { gzipSync } from 'node:zlib';

const mockAuthGetSession = jest.fn();
const mockFunctionsInvoke = jest.fn();

jest.mock('@/services/supabase', () => ({
  __esModule: true,
  supabase: {
    auth: { getSession: (...args: any[]) => mockAuthGetSession(...args) },
    functions: { invoke: (...args: any[]) => mockFunctionsInvoke(...args) },
  },
}));

import {
  createLcaReleaseArtifactDownload,
  fetchCalculationBundleArtifactText,
  fetchCalculationBundleRecords,
  getCalculationBundle,
  getCurrentLcaRelease,
  getCurrentLcaReleaseForProcess,
  getLcaRelease,
} from '@/services/lcaReleases';

const originalCrypto = global.crypto;
const originalDecompressionStream = global.DecompressionStream;
const originalFetch = global.fetch;
const originalResponse = global.Response;

class StreamResponse {
  body: any;

  constructor(body: ArrayBuffer | any) {
    this.body =
      body && typeof body.getReader === 'function'
        ? body
        : new NodeReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(body));
              controller.close();
            },
          });
  }

  async text() {
    const chunks: Uint8Array[] = [];
    const reader = this.body?.getReader();
    if (!reader) return '';
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      chunks.push(item.value);
    }
    const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
    const output = new Uint8Array(size);
    let offset = 0;
    chunks.forEach((chunk) => {
      output.set(chunk, offset);
      offset += chunk.byteLength;
    });
    return new TextDecoder().decode(output);
  }
}

function setCryptoDigest(fill: number) {
  Object.defineProperty(global, 'crypto', {
    configurable: true,
    value: {
      subtle: {
        digest: jest.fn(async () => new Uint8Array(32).fill(fill).buffer),
      },
    },
  });
}

function restoreGlobal(
  name: 'crypto' | 'DecompressionStream' | 'fetch' | 'Response',
  value: unknown,
) {
  Object.defineProperty(global, name, { configurable: true, writable: true, value });
}

describe('lcaReleases api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthGetSession.mockResolvedValue({
      data: { session: { access_token: 'access-token' } },
    });
    restoreGlobal('crypto', originalCrypto);
    restoreGlobal('DecompressionStream', originalDecompressionStream);
    restoreGlobal('fetch', originalFetch);
    restoreGlobal('Response', originalResponse);
  });

  afterAll(() => {
    restoreGlobal('crypto', originalCrypto);
    restoreGlobal('DecompressionStream', originalDecompressionStream);
    restoreGlobal('fetch', originalFetch);
    restoreGlobal('Response', originalResponse);
  });

  it('routes authenticated Calculation Bundle and release read requests', async () => {
    mockFunctionsInvoke
      .mockResolvedValueOnce({ data: { ok: true, data: { packageId: 'package-1' } }, error: null })
      .mockResolvedValueOnce({ data: { ok: true, data: { releaseRunId: 'current' } }, error: null })
      .mockResolvedValueOnce({ data: { ok: true, data: { releaseRunId: 'process' } }, error: null })
      .mockResolvedValueOnce({ data: { ok: true, data: { releaseRunId: 'private' } }, error: null })
      .mockResolvedValueOnce({
        data: { ok: true, data: { artifactId: 'artifact-1' } },
        error: null,
      });

    await getCalculationBundle('11111111-1111-4111-8111-111111111111');
    await getCurrentLcaRelease();
    await getCurrentLcaReleaseForProcess('22222222-2222-4222-8222-222222222222', '01.00.000');
    await getLcaRelease('33333333-3333-4333-8333-333333333333');
    const download = await createLcaReleaseArtifactDownload('44444444-4444-4444-8444-444444444444');

    expect(mockFunctionsInvoke).toHaveBeenNthCalledWith(1, 'app_lca_release_commands', {
      body: {
        action: 'get_calculation_bundle',
        packageId: '11111111-1111-4111-8111-111111111111',
      },
      headers: { Authorization: 'Bearer access-token' },
      region: FunctionRegion.UsEast1,
    });
    expect(mockFunctionsInvoke).toHaveBeenNthCalledWith(3, 'lca_release_results', {
      body: {
        mode: 'process',
        processId: '22222222-2222-4222-8222-222222222222',
        processVersion: '01.00.000',
      },
      headers: { Authorization: 'Bearer access-token' },
      region: FunctionRegion.UsEast1,
    });
    expect(download).toMatchObject({ data: { artifactId: 'artifact-1' }, status: 200 });
  });

  it('allows anonymous public release reads but rejects private bundle reads without a session', async () => {
    mockAuthGetSession.mockResolvedValue({ data: { session: null } });
    mockFunctionsInvoke.mockResolvedValueOnce({ data: { releaseRunId: 'public' }, error: null });

    await expect(getCalculationBundle('11111111-1111-4111-8111-111111111111')).resolves.toEqual({
      data: null,
      error: {
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        details: '',
        hint: '',
      },
      count: null,
      status: 401,
      statusText: 'AUTH_REQUIRED',
    });
    await expect(getCurrentLcaRelease()).resolves.toMatchObject({
      data: { releaseRunId: 'public' },
      status: 200,
    });
    expect(mockFunctionsInvoke).toHaveBeenCalledTimes(1);
    expect(mockFunctionsInvoke).toHaveBeenCalledWith('lca_release_results', {
      body: { mode: 'current' },
      region: FunctionRegion.UsEast1,
    });
  });

  it('normalizes HTTP and command failure envelopes', async () => {
    mockFunctionsInvoke
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: 'FunctionsHttpError',
          context: {
            status: 403,
            json: async () => ({
              code: 'not_data_product_manager',
              message: 'Manager role required',
              details: { role: 'member' },
              hint: 'Use a manager account',
            }),
          },
        },
      })
      .mockResolvedValueOnce({
        data: { ok: false, error: 'publication_not_found', detail: 'No release', status: 404 },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { ok: false },
        error: null,
      });

    await expect(getCurrentLcaRelease()).resolves.toMatchObject({
      error: {
        code: 'not_data_product_manager',
        message: 'Manager role required',
        details: { role: 'member' },
        hint: 'Use a manager account',
      },
      status: 403,
    });
    await expect(getCurrentLcaRelease()).resolves.toMatchObject({
      error: { code: 'publication_not_found', message: 'No release' },
      status: 404,
    });
    await expect(getCurrentLcaRelease()).resolves.toMatchObject({
      error: { code: 'FUNCTION_ERROR', message: 'Request failed' },
      status: 400,
    });
  });

  it('falls back safely for missing and invalid function error payloads', async () => {
    mockFunctionsInvoke
      .mockResolvedValueOnce({ data: null, error: { message: 'Offline' } })
      .mockResolvedValueOnce({
        data: null,
        error: {
          context: {
            json: async () => {
              throw new Error('invalid json');
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: null,
        error: {
          context: { status: 502, json: async () => ({ error: 'upstream_failed' }) },
        },
      });

    await expect(getCurrentLcaRelease()).resolves.toMatchObject({
      error: { message: 'Offline', code: 'FUNCTION_ERROR' },
      status: 500,
    });
    await expect(getCurrentLcaRelease()).resolves.toMatchObject({
      error: { message: 'Request failed', code: 'FUNCTION_ERROR' },
      status: 500,
    });
    await expect(getCurrentLcaRelease()).resolves.toMatchObject({
      error: { message: 'Request failed', code: 'upstream_failed' },
      status: 502,
    });
  });

  it('downloads, verifies, and parses uncompressed NDJSON artifacts', async () => {
    const bytes = new TextEncoder().encode('{"value":1}\n\n{"value":2}\n');
    setCryptoDigest(0);
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => bytes.buffer,
    })) as any;
    const artifact = {
      kind: 'lci',
      path: 'results/lci.ndjson',
      schemaVersion: 'test',
      mediaType: 'application/x-ndjson',
      compression: 'none',
      sha256: '00'.repeat(32),
      byteSize: bytes.byteLength,
      recordCount: 2,
      signedDownloadUrl: 'https://download.example/lci',
      signedDownloadExpiresInSeconds: 900,
    };

    await expect(fetchCalculationBundleArtifactText(artifact)).resolves.toContain('{"value":1}');
    await expect(fetchCalculationBundleRecords<{ value: number }>(artifact)).resolves.toEqual([
      { value: 1 },
      { value: 2 },
    ]);
    expect(global.fetch).toHaveBeenCalledWith('https://download.example/lci', {
      credentials: 'omit',
    });
  });

  it('decompresses verified gzip records and tolerates already-decoded responses', async () => {
    const plain = Buffer.from('{"value":"gzip"}\n');
    const compressed = gzipSync(plain);
    restoreGlobal('DecompressionStream', NodeDecompressionStream);
    restoreGlobal('Response', StreamResponse);
    setCryptoDigest(1);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: async () =>
          compressed.buffer.slice(
            compressed.byteOffset,
            compressed.byteOffset + compressed.byteLength,
          ),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: async () =>
          plain.buffer.slice(plain.byteOffset, plain.byteOffset + plain.byteLength),
      }) as any;
    const gzipArtifact = {
      signedDownloadUrl: 'https://download.example/gzip',
      sha256: '01'.repeat(32),
      byteSize: compressed.byteLength,
      uncompressedSha256: '02'.repeat(32),
      uncompressedByteSize: plain.byteLength,
      compression: 'gzip',
    };
    await expect(fetchCalculationBundleArtifactText(gzipArtifact)).resolves.toBe(plain.toString());

    setCryptoDigest(2);
    await expect(fetchCalculationBundleArtifactText(gzipArtifact)).resolves.toBe(plain.toString());
  });

  it('reports download, size, hash, and browser decompression failures', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 410 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array([1]).buffer,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array([1]).buffer,
      }) as any;
    const artifact = {
      signedDownloadUrl: 'https://download.example/file',
      sha256: '00'.repeat(32),
      byteSize: 2,
      compression: 'none',
    };
    await expect(fetchCalculationBundleArtifactText(artifact)).rejects.toThrow('(410)');
    await expect(fetchCalculationBundleArtifactText(artifact)).rejects.toThrow('size mismatch');

    setCryptoDigest(9);
    await expect(fetchCalculationBundleArtifactText({ ...artifact, byteSize: 1 })).rejects.toThrow(
      'SHA-256 mismatch',
    );

    const compressed = gzipSync(Buffer.from('gzip'));
    restoreGlobal('crypto', undefined);
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () =>
        compressed.buffer.slice(
          compressed.byteOffset,
          compressed.byteOffset + compressed.byteLength,
        ),
    })) as any;
    await expect(
      fetchCalculationBundleArtifactText({
        ...artifact,
        byteSize: compressed.byteLength,
        compression: 'gzip',
      }),
    ).rejects.toThrow('SHA-256 verification is not supported');

    setCryptoDigest(0);
    restoreGlobal('DecompressionStream', undefined);
    await expect(
      fetchCalculationBundleArtifactText({
        ...artifact,
        byteSize: compressed.byteLength,
        compression: 'gzip',
      }),
    ).rejects.toThrow('not supported by this browser');

    const plain = new TextEncoder().encode('already decoded');
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => plain.buffer,
    })) as any;
    await expect(
      fetchCalculationBundleArtifactText({
        ...artifact,
        compression: 'gzip',
      }),
    ).rejects.toThrow('transparent-decompression integrity metadata');
    await expect(
      fetchCalculationBundleArtifactText({
        ...artifact,
        compression: 'gzip',
        uncompressedByteSize: plain.byteLength,
      }),
    ).rejects.toThrow('transparent-decompression integrity metadata');
  });
});
