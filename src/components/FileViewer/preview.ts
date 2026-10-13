import type { FilePreviewState } from '@/services/supabase/storage';

type FormatMessage = (message: { id: string; defaultMessage: string }) => string;

export function filePreviewLabel(
  state: FilePreviewState | undefined,
  formatMessage: FormatMessage,
) {
  if (state === 'resolved') {
    return formatMessage({
      id: 'pages.file.preview.resolved',
      defaultMessage: 'File preview ready',
    });
  }
  if (state === 'unavailable') {
    return formatMessage({
      id: 'pages.file.preview.unavailable',
      defaultMessage: 'File preview unavailable',
    });
  }
  if (state === 'unsupported') {
    return formatMessage({
      id: 'pages.file.preview.unsupported',
      defaultMessage: 'Preview not supported for this reference',
    });
  }
  if (state === 'unchecked') {
    return formatMessage({
      id: 'pages.file.preview.unchecked',
      defaultMessage: 'File access not checked',
    });
  }
  return '';
}
