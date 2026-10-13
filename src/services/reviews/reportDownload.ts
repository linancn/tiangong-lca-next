import { supabase } from '@/services/supabase';

export type ReviewReportDownloadRequest = {
  processId: string;
  processVersion: string;
  sourceId: string;
  sourceVersion: string;
};

export type ReviewReportDownload = {
  filename: string;
  signedDownloadUrl: string;
  signedUrlExpiresAt: string;
};

export type ReviewReportDownloadError = {
  code: string;
  message: string;
};

export type ReviewReportDownloadResult = {
  data: ReviewReportDownload[] | null;
  error: ReviewReportDownloadError | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function decodeDownloads(value: unknown): ReviewReportDownload[] | null {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.data)) return null;
  const downloads = value.data.downloads;
  if (!Array.isArray(downloads) || downloads.length === 0 || downloads.length > 20) return null;

  const decoded: ReviewReportDownload[] = [];
  for (const download of downloads) {
    if (!isRecord(download)) return null;
    const { filename, signedDownloadUrl, signedUrlExpiresAt } = download;
    if (
      'bucket' in download ||
      'objectPath' in download ||
      typeof filename !== 'string' ||
      filename.length === 0 ||
      filename.length > 255 ||
      !isHttpUrl(signedDownloadUrl) ||
      typeof signedUrlExpiresAt !== 'string' ||
      Number.isNaN(Date.parse(signedUrlExpiresAt))
    ) {
      return null;
    }
    decoded.push({ filename, signedDownloadUrl, signedUrlExpiresAt });
  }
  return decoded;
}

async function decodeInvokeError(error: unknown): Promise<ReviewReportDownloadError> {
  const context = isRecord(error) ? error.context : null;
  if (context && typeof (context as { clone?: unknown }).clone === 'function') {
    try {
      const clonedContext = (context as { clone: () => { json: () => Promise<unknown> } }).clone();
      const body = await clonedContext.json();
      if (isRecord(body) && typeof body.code === 'string' && typeof body.message === 'string') {
        return { code: body.code, message: body.message };
      }
    } catch {
      // Fall through to the stable generic error below.
    }
  }
  return {
    code: 'REVIEW_REPORT_DOWNLOAD_FAILED',
    message: 'Unable to prepare review report download',
  };
}

export async function createReviewReportDownloads(
  request: ReviewReportDownloadRequest,
): Promise<ReviewReportDownloadResult> {
  const result = await supabase.functions.invoke('app_review_report_download', {
    body: request,
  });
  if (result.error) {
    return { data: null, error: await decodeInvokeError(result.error) };
  }

  const downloads = decodeDownloads(result.data);
  if (!downloads) {
    return {
      data: null,
      error: {
        code: 'REVIEW_REPORT_DOWNLOAD_FAILED',
        message: 'Review report download response is invalid',
      },
    };
  }
  return { data: downloads, error: null };
}

export function triggerReviewReportDownloads(
  downloads: ReviewReportDownload[],
  targetDocument: Pick<Document, 'createElement'> = document,
): void {
  downloads.forEach((download) => {
    const anchor = targetDocument.createElement('a');
    anchor.href = download.signedDownloadUrl;
    anchor.download = download.filename;
    anchor.target = '_self';
    anchor.rel = 'noopener noreferrer';
    anchor.click();
  });
}
