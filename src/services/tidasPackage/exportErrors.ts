export const TIDAS_PACKAGE_EXPORT_TOO_LARGE_ERROR = 'tidas_package_export_too_large';

const TOO_LARGE_PATTERNS = [
  /\bentitytoolarge\b/i,
  /\bpayload too large\b/i,
  /\bexceeded the maximum allowed size\b/i,
  /\bobject upload failed status\s*=\s*413\b/i,
  /\bstatus\s*=\s*413\b/i,
  /\bstatus\s*413\b/i,
];

function toMessageText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value instanceof Error) {
    return value.message.trim();
  }
  return '';
}

export function classifyTidasPackageExportError(value: unknown): string | null {
  const text = toMessageText(value);
  if (!text) {
    return null;
  }

  if (TOO_LARGE_PATTERNS.some((pattern) => pattern.test(text))) {
    return TIDAS_PACKAGE_EXPORT_TOO_LARGE_ERROR;
  }

  return null;
}

export function normalizeTidasPackageExportErrorMessage(
  value: unknown,
  fallback = 'TIDAS package export failed',
): string {
  const text = toMessageText(value);
  const classified = classifyTidasPackageExportError(text);
  if (classified === TIDAS_PACKAGE_EXPORT_TOO_LARGE_ERROR) {
    return 'Export package is too large for the current storage upload limit. Try exporting a smaller scope, or ask an administrator to enable large-file upload support.';
  }

  return text || fallback;
}
