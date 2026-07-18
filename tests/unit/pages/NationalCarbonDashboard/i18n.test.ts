import {
  formatDashboardDate,
  formatDashboardExchangeAmount,
  formatDashboardNumber,
  getDashboardMapPathLabel,
  getDashboardRegionLabel,
  getDashboardScreenLabel,
  getDashboardStatusLabel,
  getGapCategoryLabel,
  getGapFlowLabel,
  getGraphCategoryLabel,
  getIndustryLabel,
  getIndustryQualityLabel,
  getMatrixGroupLabel,
  getMatrixZoneLabel,
  getNarrativeStageDescription,
  getNarrativeStageTitle,
  getOutcomeMetricLabel,
  getOutcomeMetricUnit,
  getQuickSelectLabel,
  getRiskLabel,
  isChineseDashboardLocale,
} from '@/pages/NationalCarbonDashboard/i18n';
import { isTranslationSourceContentLanguage } from '@/services/general/contentLanguageRegistry';
import { LOCALE_REGISTRY } from '@/services/general/localeRegistry';

let mockLocale = 'fr-FR';

jest.mock('@umijs/max', () => ({
  getLocale: () => mockLocale,
  useIntl: jest.fn(),
}));

const intl: any = {
  locale: 'fr-FR',
  formatMessage: jest.fn(({ id }, values) =>
    Object.entries(values ?? {}).reduce(
      (message, [key, value]) => `${message}|${key}:${String(value)}`,
      String(id ?? ''),
    ),
  ),
};

describe('NationalCarbonDashboard i18n token adapters', () => {
  beforeEach(() => {
    mockLocale = 'fr-FR';
    jest.clearAllMocks();
  });

  it('formats numbers, exchange amounts, and dates with the active canonical locale', () => {
    expect(formatDashboardNumber(1234)).toBe('1 234');
    expect(formatDashboardNumber(1234)).toBe('1 234');
    expect(formatDashboardExchangeAmount(undefined)).toBe('-');
    expect(formatDashboardExchangeAmount(1234.56789)).toBe('1 234,56789');
    expect(formatDashboardExchangeAmount(1234.56789)).toBe('1 234,56789');
    expect(formatDashboardDate('not-a-date')).toBe('not-a-date');
    expect(formatDashboardDate('2026-05-31')).toContain('2026');
    expect(formatDashboardDate('2026-05-31')).toContain('2026');

    mockLocale = '';
    expect(formatDashboardNumber(12)).toBe('12');
  });

  it('recognizes the registry-owned translation-source locale aliases', () => {
    expect(isChineseDashboardLocale('zh_CN')).toBe(true);
    LOCALE_REGISTRY.forEach(({ canonicalLocale }) => {
      expect(isChineseDashboardLocale(canonicalLocale)).toBe(
        isTranslationSourceContentLanguage(canonicalLocale),
      );
    });
  });

  it('covers every screen and status token plus safe fallbacks', () => {
    ['overview', 'map_status', 'outcome_metrics', 'connectivity', 'flow_topology'].forEach(
      (screen) =>
        expect(getDashboardScreenLabel(intl, screen)).toContain(
          'pages.home.nationalCarbon.screen.',
        ),
    );
    expect(getDashboardScreenLabel(intl, 'custom')).toBe('custom');

    [
      'all',
      'filling',
      'submitted',
      'reviewing',
      'sampleAccepted',
      'postProcessing',
      'pendingPublish',
      'published',
    ].forEach((status) =>
      expect(getDashboardStatusLabel(intl, status)).toContain('pages.home.nationalCarbon.status.'),
    );
    expect(getDashboardStatusLabel(intl, 'custom')).toBe('custom');
  });

  it('covers every stable region adcode and preserves unknown region data', () => {
    [
      110000, 120000, 130000, 140000, 150000, 210000, 220000, 230000, 310000, 320000, 330000,
      340000, 350000, 360000, 370000, 410000, 420000, 430000, 440000, 450000, 460000, 500000,
      510000, 520000, 530000, 540000, 610000, 620000, 630000, 640000, 650000, 710000, 810000,
      820000,
    ].forEach((adcode) =>
      expect(getDashboardRegionLabel(intl, adcode, 'fallback')).toContain(
        'pages.home.nationalCarbon.region.',
      ),
    );
    expect(getDashboardRegionLabel(intl, 0, 'Unknown region')).toBe('Unknown region');
    expect(getDashboardMapPathLabel(intl, '100000_JD', '南海诸岛')).toBe(
      'pages.home.nationalCarbon.region.southChinaSea',
    );
    expect(getDashboardMapPathLabel(intl, 'JD', '南海诸岛')).toBe(
      'pages.home.nationalCarbon.region.southChinaSea',
    );
    expect(getDashboardMapPathLabel(intl, '110000', '北京')).toBe(
      'pages.home.nationalCarbon.region.beijing',
    );
    expect(getDashboardMapPathLabel(intl, undefined, 'Custom region')).toBe('Custom region');
  });

  it('localizes narrative and outcome metric tokens', () => {
    ['sample', 'publish', 'compute'].forEach((stage) => {
      expect(getNarrativeStageTitle(intl, stage, 'fallback')).toContain('.narrative.');
      expect(getNarrativeStageDescription(intl, stage, 'fallback')).toContain('.narrative.');
    });
    expect(getNarrativeStageTitle(intl, 'custom', 'fallback')).toBe('fallback');
    expect(getNarrativeStageDescription(intl, 'custom', 'fallback')).toBe('fallback');

    [
      'sampleDatasets',
      'contributors',
      'productCategories',
      'productionWeightCoverage',
      'publishedDatasets',
      'nationalAverageResults',
      'regionalAverageResults',
      'latestBatch',
    ].forEach((metric) =>
      expect(getOutcomeMetricLabel(intl, metric, 'fallback')).toContain('.metric.'),
    );
    expect(getOutcomeMetricLabel(intl, 'custom', 'fallback')).toBe('fallback');
    expect(getOutcomeMetricUnit(intl, 'contributors')).toContain('.unit.organizations');
    expect(getOutcomeMetricUnit(intl, 'productCategories')).toContain('.unit.categories');
    expect(getOutcomeMetricUnit(intl, 'productionWeightCoverage')).toBe('%');
    expect(getOutcomeMetricUnit(intl, 'latestBatch')).toBeUndefined();
    expect(getOutcomeMetricUnit(intl, 'sampleDatasets')).toContain('.unit.items');
  });

  it('localizes industry names and quality marks', () => {
    ['steel', 'cement', 'power', 'nonferrous', 'chemical', 'building', 'transport'].forEach(
      (industry) => {
        expect(getIndustryLabel(intl, industry, 'fallback')).toContain('.industry.');
        expect(getIndustryQualityLabel(intl, industry, 'fallback')).toContain('.quality.');
      },
    );
    expect(getIndustryLabel(intl, 'custom', 'fallback')).toBe('fallback');
    expect(getIndustryQualityLabel(intl, 'custom', 'fallback')).toBe('fallback');
    expect(getIndustryQualityLabel(intl, 'custom')).toBe('-');
  });

  it('localizes stable gap, matrix, risk, and quick-select tokens', () => {
    ['石灰石', '柴油', '硬煤', '交流电', '天然气'].forEach((flow) =>
      expect(getGapFlowLabel(intl, flow)).toContain('.gap.flow.'),
    );
    expect(getGapFlowLabel(intl, 'Custom flow')).toBe('Custom flow');

    ['基础材料', '能源燃料', '电力公用工程'].forEach((category) =>
      expect(getGapCategoryLabel(intl, category)).toContain('.gap.category.'),
    );
    expect(getGapCategoryLabel(intl, 'Custom category')).toBe('Custom category');

    [
      'steel',
      'power',
      'cement',
      'chemical',
      'transport',
      'building',
      'energy',
      'material',
      'process',
      'logistics',
      'waste',
      'factor',
    ].forEach((group) => expect(getMatrixGroupLabel(intl, group)).toContain('.matrix.group.'));
    expect(getMatrixGroupLabel(intl, 'custom')).toContain('.matrix.group.ungrouped');

    ['closed-process', 'closed-factor', 'gap-provider-a', 'gap-provider-b'].forEach((zone) =>
      expect(getMatrixZoneLabel(intl, zone)).toContain('.matrix.zone.'),
    );
    expect(getMatrixZoneLabel(intl, 'custom')).toBe('custom');

    ['low', 'medium', 'high'].forEach((risk) =>
      expect(getRiskLabel(intl, risk)).toContain('.risk.'),
    );
    expect(getRiskLabel(intl, 'custom')).toBe('custom');

    expect(getQuickSelectLabel(intl, 'china')).toContain('.quickSelect.crudeSteel');
    expect(getQuickSelectLabel(intl, 'world')).toContain('.quickSelect.pvSystem');
    expect(getQuickSelectLabel(intl, 'overview')).toContain('.quickSelect.limestone');
  });

  it('localizes known graph categories and preserves unknown category data', () => {
    [
      'Agriculture, forestry and fishing',
      'Electricity, gas, steam and air conditioning supply',
      'Manufacture of chemicals and chemical products',
      'Manufacture of computer, electronic and optical products',
      'Manufacturing',
      'Ores and minerals',
      'Transport',
      'Water supply; sewerage, waste management and remediation activities',
    ].forEach((category) =>
      expect(getGraphCategoryLabel(intl, category)).toContain('.graph.category.'),
    );
    expect(getGraphCategoryLabel(intl, ' Custom category ')).toBe('Custom category');
  });
});
