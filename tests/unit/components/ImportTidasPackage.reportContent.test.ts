import {
  buildImportReportHumanSummary,
  buildImportReportReadmeMarkdown,
  getImportReportContentAuditDescriptor,
  IMPORT_REPORT_CONTENT_BY_APP_LOCALE,
  type ImportReportSummaryInput,
} from '@/components/ImportTidasPackage/reportContent';
import { LOCALE_REGISTRY } from '@/services/general/localeRegistry';

const reportResponse: ImportReportSummaryInput = {
  code: 'USER_DATA_CONFLICT',
  summary: {
    total_entries: 20,
    filtered_open_data_count: 12,
    user_conflict_count: 1,
    importable_count: 8,
  },
};

describe('ImportTidasPackage report content', () => {
  it('returns exactly the report adapter keys declared by the locale registry', () => {
    const expectedCanonicalLocales = LOCALE_REGISTRY.map(({ canonicalLocale }) => canonicalLocale);
    const expectedReportAdapterKeys = LOCALE_REGISTRY.map(({ adapters }) => adapters.report);
    const humanSummary = buildImportReportHumanSummary(reportResponse);
    const readmeMarkdown = buildImportReportReadmeMarkdown();
    const auditDescriptor = getImportReportContentAuditDescriptor();

    expect(Object.keys(IMPORT_REPORT_CONTENT_BY_APP_LOCALE)).toEqual(expectedCanonicalLocales);
    expect(Object.keys(humanSummary)).toEqual(expectedReportAdapterKeys);
    expect(Object.keys(readmeMarkdown)).toEqual(expectedReportAdapterKeys);
    expect(auditDescriptor.reportAdapterKeys).toEqual(expectedReportAdapterKeys);
    expect(auditDescriptor.entries.map(({ canonicalLocale }) => canonicalLocale)).toEqual(
      expectedCanonicalLocales,
    );
    expect(auditDescriptor.entries.map(({ reportAdapter }) => reportAdapter)).toEqual(
      expectedReportAdapterKeys,
    );
    expect(new Set(expectedReportAdapterKeys).size).toBe(expectedReportAdapterKeys.length);
  });

  it('preserves the French report adapter content and fallback counts', () => {
    const humanSummary = buildImportReportHumanSummary(reportResponse);
    const readmeMarkdown = buildImportReportReadmeMarkdown();

    expect(humanSummary.fr_FR).toBe(
      "Résultat de l'importation : USER_DATA_CONFLICT. Nombre total d'enregistrements : 20, enregistrements de données ouvertes ignorés : 12, conflits avec les données utilisateur : 1, importés : 8, problèmes de validation : 0.",
    );
    expect(readmeMarkdown.fr_FR).toContain("# Comment lire ce rapport d'importation");
    expect(readmeMarkdown.fr_FR).toContain('report.validation_issues');
    expect(readmeMarkdown.fr_FR).toContain('report.user_conflicts');
    expect(readmeMarkdown.fr_FR).toContain('report.filtered_open_data');
  });

  it('exposes non-empty pure content units for locale-delivery auditing', () => {
    const auditDescriptor = getImportReportContentAuditDescriptor();

    expect(auditDescriptor.sourceId).toBe('tidas-import-report-content');
    expect(auditDescriptor.contentKinds).toEqual(['human_summary', 'readme_markdown']);
    expect(auditDescriptor.entries).toHaveLength(LOCALE_REGISTRY.length);
    auditDescriptor.entries.forEach((entry) => {
      expect(entry.humanSummaryTemplate.trim()).not.toBe('');
      expect(entry.readmeMarkdown.trim()).not.toBe('');
    });
  });
});
