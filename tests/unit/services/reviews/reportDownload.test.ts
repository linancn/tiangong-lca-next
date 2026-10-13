const mockInvoke = jest.fn();

jest.mock('@/services/supabase', () => ({
  __esModule: true,
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => Reflect.apply(mockInvoke, undefined, args),
    },
  },
}));

import {
  createReviewReportDownloads,
  triggerReviewReportDownloads,
} from '@/services/reviews/reportDownload';

const request = {
  processId: '11111111-1111-4111-8111-111111111111',
  processVersion: '01.01.000',
  sourceId: '22222222-2222-4222-8222-222222222222',
  sourceVersion: '01.01.000',
};

describe('review report download service', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('invokes the dedicated Edge command and decodes all signed downloads', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        ok: true,
        command: 'review_report_download',
        data: {
          downloads: [
            {
              filename: 'report.pdf',
              signedDownloadUrl: 'https://storage.example.test/report.pdf?token=short',
              signedUrlExpiresAt: '2026-09-29T00:05:00.000Z',
            },
            {
              filename: 'evidence.xlsx',
              signedDownloadUrl: 'http://storage.example.test/evidence.xlsx?token=short',
              signedUrlExpiresAt: '2026-09-29T00:05:00.000Z',
            },
          ],
        },
      },
      error: null,
    });

    const result = await createReviewReportDownloads(request);

    expect(mockInvoke).toHaveBeenCalledWith('app_review_report_download', { body: request });
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
    expect(result.data?.[0].filename).toBe('report.pdf');
  });

  it('fails closed when Edge returns storage authority or a malformed URL', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        ok: true,
        data: {
          downloads: [
            {
              filename: 'report.pdf',
              signedDownloadUrl: 'ftp://storage.example.test/report.pdf',
              signedUrlExpiresAt: '2026-09-29T00:05:00.000Z',
              bucket: 'external_docs',
              objectPath: 'secret/report.pdf',
            },
          ],
        },
      },
      error: null,
    });

    await expect(createReviewReportDownloads(request)).resolves.toEqual({
      data: null,
      error: {
        code: 'REVIEW_REPORT_DOWNLOAD_FAILED',
        message: 'Review report download response is invalid',
      },
    });
  });

  it.each([
    ['an unsuccessful envelope', { ok: false }],
    ['an empty download list', { ok: true, data: { downloads: [] } }],
    ['a non-object download', { ok: true, data: { downloads: [null] } }],
    [
      'an empty signed URL',
      {
        ok: true,
        data: {
          downloads: [
            {
              filename: 'report.pdf',
              signedDownloadUrl: '',
              signedUrlExpiresAt: '2026-09-29T00:05:00.000Z',
            },
          ],
        },
      },
    ],
  ])('fails closed for %s', async (_label, data) => {
    mockInvoke.mockResolvedValue({ data, error: null });

    await expect(createReviewReportDownloads(request)).resolves.toMatchObject({
      data: null,
      error: { code: 'REVIEW_REPORT_DOWNLOAD_FAILED' },
    });
  });

  it('preserves the stable no-attachment error from the Edge boundary', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: {
        context: {
          clone: () => ({
            json: async () => ({
              ok: false,
              code: 'REVIEW_REPORT_NO_ATTACHMENTS',
              message: 'The review report has no current attachments',
            }),
          }),
        },
      },
    });

    await expect(createReviewReportDownloads(request)).resolves.toEqual({
      data: null,
      error: {
        code: 'REVIEW_REPORT_NO_ATTACHMENTS',
        message: 'The review report has no current attachments',
      },
    });
  });

  it('fails closed when a signed download URL cannot be parsed', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        ok: true,
        data: {
          downloads: [
            {
              filename: 'report.pdf',
              signedDownloadUrl: 'not a url',
              signedUrlExpiresAt: '2026-09-29T00:05:00.000Z',
            },
          ],
        },
      },
      error: null,
    });

    await expect(createReviewReportDownloads(request)).resolves.toMatchObject({
      data: null,
      error: { code: 'REVIEW_REPORT_DOWNLOAD_FAILED' },
    });
  });

  it('uses a stable generic error when the Edge error body cannot be decoded', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: {
        context: {
          clone: () => ({
            json: async () => {
              throw new Error('unreadable body');
            },
          }),
        },
      },
    });

    await expect(createReviewReportDownloads(request)).resolves.toEqual({
      data: null,
      error: {
        code: 'REVIEW_REPORT_DOWNLOAD_FAILED',
        message: 'Unable to prepare review report download',
      },
    });
  });

  it('uses the generic error for a non-object invoke failure', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: 'network failure' });

    await expect(createReviewReportDownloads(request)).resolves.toMatchObject({
      data: null,
      error: { code: 'REVIEW_REPORT_DOWNLOAD_FAILED' },
    });
  });

  it('creates one download anchor for each signed attachment', () => {
    const anchors = [{ click: jest.fn() }, { click: jest.fn() }] as unknown as HTMLAnchorElement[];
    const createElement = jest.fn().mockReturnValueOnce(anchors[0]).mockReturnValueOnce(anchors[1]);
    const downloads = [
      {
        filename: 'report.pdf',
        signedDownloadUrl: 'https://storage.example.test/report.pdf?token=short',
        signedUrlExpiresAt: '2026-09-29T00:05:00.000Z',
      },
      {
        filename: 'evidence.xlsx',
        signedDownloadUrl: 'https://storage.example.test/evidence.xlsx?token=short',
        signedUrlExpiresAt: '2026-09-29T00:05:00.000Z',
      },
    ];

    triggerReviewReportDownloads(downloads, { createElement } as Pick<Document, 'createElement'>);

    expect(createElement).toHaveBeenCalledTimes(2);
    expect(anchors[0]).toMatchObject({
      href: downloads[0].signedDownloadUrl,
      download: downloads[0].filename,
      target: '_self',
      rel: 'noopener noreferrer',
    });
    expect(anchors[0].click).toHaveBeenCalledTimes(1);
    expect(anchors[1].click).toHaveBeenCalledTimes(1);

    expect(() => triggerReviewReportDownloads([])).not.toThrow();
  });
});
