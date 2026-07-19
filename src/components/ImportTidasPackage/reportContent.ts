import { IMPORT_REPORT_CONTENT_BY_APP_LOCALE } from '@/locales/importReportCatalog';
import { LOCALE_REGISTRY, type SupportedAppLocale } from '../../services/general/localeRegistry';

export { IMPORT_REPORT_CONTENT_BY_APP_LOCALE };

export type ImportReportAdapterKey = (typeof LOCALE_REGISTRY)[number]['adapters']['report'];

export type ImportReportSummaryInput = {
  code: string;
  summary: {
    total_entries: number;
    filtered_open_data_count: number;
    user_conflict_count: number;
    importable_count: number;
    imported_count?: number | null;
    validation_issue_count?: number | null;
  };
};

const IMPORT_REPORT_HUMAN_SUMMARY_TOKENS = [
  'code',
  'total_entries',
  'filtered_open_data_count',
  'user_conflict_count',
  'imported_count',
  'validation_issue_count',
] as const;

type ImportReportHumanSummaryToken = (typeof IMPORT_REPORT_HUMAN_SUMMARY_TOKENS)[number];
type ImportReportHumanSummaryValues = Record<ImportReportHumanSummaryToken, string | number>;

const REPORT_ADAPTER_KEYS = LOCALE_REGISTRY.map(({ adapters }) => adapters.report);

const mapContentToReportAdapters = <Value>(
  getValue: (locale: SupportedAppLocale) => Value,
): Record<ImportReportAdapterKey, Value> =>
  Object.fromEntries(
    LOCALE_REGISTRY.map(({ canonicalLocale, adapters }) => [
      adapters.report,
      getValue(canonicalLocale),
    ]),
  ) as Record<ImportReportAdapterKey, Value>;

const renderHumanSummary = (template: string, values: ImportReportHumanSummaryValues): string =>
  IMPORT_REPORT_HUMAN_SUMMARY_TOKENS.reduce(
    (rendered, token) => rendered.split(`{${token}}`).join(String(values[token])),
    template,
  );

export const buildImportReportHumanSummary = (
  response: ImportReportSummaryInput,
): Record<ImportReportAdapterKey, string> => {
  const values: ImportReportHumanSummaryValues = {
    code: response.code,
    total_entries: response.summary.total_entries,
    filtered_open_data_count: response.summary.filtered_open_data_count,
    user_conflict_count: response.summary.user_conflict_count,
    imported_count: response.summary.imported_count ?? response.summary.importable_count,
    validation_issue_count: response.summary.validation_issue_count ?? 0,
  };

  return mapContentToReportAdapters((locale) =>
    renderHumanSummary(IMPORT_REPORT_CONTENT_BY_APP_LOCALE[locale].humanSummaryTemplate, values),
  );
};

export const buildImportReportReadmeMarkdown = (): Record<ImportReportAdapterKey, string> =>
  mapContentToReportAdapters(
    (locale) => IMPORT_REPORT_CONTENT_BY_APP_LOCALE[locale].readmeMarkdown,
  );

/**
 * Pure report-content inventory for the locale-delivery audit. It deliberately
 * exposes canonical locale ownership and the external report adapter topology
 * without importing React, Umi, Ant Design, or browser-only helpers.
 */
export const getImportReportContentAuditDescriptor = () => ({
  sourceId: 'tidas-import-report-content',
  contentKinds: ['human_summary', 'readme_markdown'] as const,
  humanSummaryTokens: [...IMPORT_REPORT_HUMAN_SUMMARY_TOKENS],
  reportAdapterKeys: [...REPORT_ADAPTER_KEYS],
  entries: LOCALE_REGISTRY.map(({ canonicalLocale, adapters }) => ({
    canonicalLocale,
    reportAdapter: adapters.report,
    humanSummaryTemplate: IMPORT_REPORT_CONTENT_BY_APP_LOCALE[canonicalLocale].humanSummaryTemplate,
    readmeMarkdown: IMPORT_REPORT_CONTENT_BY_APP_LOCALE[canonicalLocale].readmeMarkdown,
  })),
});
