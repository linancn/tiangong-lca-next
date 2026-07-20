import { isTranslationSourceContentLanguage } from '@/services/general/contentLanguageRegistry';
import {
  DEFAULT_BROWSER_APP_LOCALE,
  normalizeRuntimeLocale,
} from '@/services/general/runtimeLocale';
import { getLocale, useIntl } from '@umijs/max';

export type DashboardIntl = Pick<ReturnType<typeof useIntl>, 'formatMessage' | 'locale'>;

const numberFormatters = new Map<string, Intl.NumberFormat>();
const exchangeAmountFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

export function getCanonicalRuntimeLocale(): string {
  return normalizeRuntimeLocale(getLocale()) ?? DEFAULT_BROWSER_APP_LOCALE;
}

export function formatDashboardNumber(value: number): string {
  const locale = getCanonicalRuntimeLocale();
  let formatter = numberFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale);
    numberFormatters.set(locale, formatter);
  }
  return formatter.format(value);
}

export function formatDashboardExchangeAmount(value?: number): string {
  if (!Number.isFinite(value)) {
    return '-';
  }

  const locale = getCanonicalRuntimeLocale();
  let formatter = exchangeAmountFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 8 });
    exchangeAmountFormatters.set(locale, formatter);
  }
  return formatter.format(value as number);
}

export function formatDashboardDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const locale = getCanonicalRuntimeLocale();
  let formatter = dateFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
      year: 'numeric',
    });
    dateFormatters.set(locale, formatter);
  }
  return formatter.format(date);
}

export function isChineseDashboardLocale(locale: string): boolean {
  return isTranslationSourceContentLanguage(locale);
}

export function getDashboardScreenLabel(intl: DashboardIntl, screen: string): string {
  switch (screen) {
    case 'overview':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.screen.overview' });
    case 'map_status':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.screen.mapStatus' });
    case 'outcome_metrics':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.screen.outcomeMetrics' });
    case 'connectivity':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.screen.connectivity' });
    case 'flow_topology':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.screen.flowTopology' });
    default:
      return screen;
  }
}

export function getDashboardStatusLabel(intl: DashboardIntl, status: string): string {
  switch (status) {
    case 'all':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.status.all' });
    case 'filling':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.status.filling' });
    case 'submitted':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.status.submitted' });
    case 'reviewing':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.status.reviewing' });
    case 'sampleAccepted':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.status.sampleAccepted' });
    case 'postProcessing':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.status.postProcessing' });
    case 'pendingPublish':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.status.pendingPublish' });
    case 'published':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.status.published' });
    default:
      return status;
  }
}

export function getDashboardRegionLabel(
  intl: DashboardIntl,
  adcode: number,
  fallback: string,
): string {
  switch (adcode) {
    case 110000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.beijing' });
    case 120000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.tianjin' });
    case 130000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.hebei' });
    case 140000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.shanxi' });
    case 150000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.innerMongolia' });
    case 210000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.liaoning' });
    case 220000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.jilin' });
    case 230000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.heilongjiang' });
    case 310000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.shanghai' });
    case 320000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.jiangsu' });
    case 330000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.zhejiang' });
    case 340000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.anhui' });
    case 350000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.fujian' });
    case 360000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.jiangxi' });
    case 370000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.shandong' });
    case 410000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.henan' });
    case 420000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.hubei' });
    case 430000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.hunan' });
    case 440000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.guangdong' });
    case 450000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.guangxi' });
    case 460000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.hainan' });
    case 500000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.chongqing' });
    case 510000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.sichuan' });
    case 520000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.guizhou' });
    case 530000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.yunnan' });
    case 540000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.tibet' });
    case 610000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.shaanxi' });
    case 620000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.gansu' });
    case 630000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.qinghai' });
    case 640000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.ningxia' });
    case 650000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.xinjiang' });
    case 710000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.taiwan' });
    case 810000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.hongKong' });
    case 820000:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.macao' });
    default:
      return fallback;
  }
}

export function getDashboardMapPathLabel(
  intl: DashboardIntl,
  code: string | undefined,
  fallback: string,
): string {
  if (code === 'JD' || code?.endsWith('_JD')) {
    return intl.formatMessage({ id: 'pages.home.nationalCarbon.region.southChinaSea' });
  }
  return code && /^\d+$/u.test(code)
    ? getDashboardRegionLabel(intl, Number(code), fallback)
    : fallback;
}

export function getNarrativeStageTitle(
  intl: DashboardIntl,
  stage: string,
  fallback: string,
): string {
  switch (stage) {
    case 'sample':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.narrative.sample.title' });
    case 'publish':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.narrative.publish.title' });
    case 'compute':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.narrative.compute.title' });
    default:
      return fallback;
  }
}

export function getNarrativeStageDescription(
  intl: DashboardIntl,
  stage: string,
  fallback: string,
): string {
  switch (stage) {
    case 'sample':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.narrative.sample.description' });
    case 'publish':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.narrative.publish.description' });
    case 'compute':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.narrative.compute.description' });
    default:
      return fallback;
  }
}

export function getOutcomeMetricLabel(
  intl: DashboardIntl,
  metric: string,
  fallback: string,
): string {
  switch (metric) {
    case 'sampleDatasets':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.metric.sampleDatasets' });
    case 'contributors':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.metric.contributors' });
    case 'productCategories':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.metric.productCategories' });
    case 'productionWeightCoverage':
      return intl.formatMessage({
        id: 'pages.home.nationalCarbon.metric.productionWeightCoverage',
      });
    case 'publishedDatasets':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.metric.publishedDatasets' });
    case 'nationalAverageResults':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.metric.nationalAverageResults' });
    case 'regionalAverageResults':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.metric.regionalAverageResults' });
    case 'latestBatch':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.metric.latestBatch' });
    default:
      return fallback;
  }
}

export function getOutcomeMetricUnit(intl: DashboardIntl, metric: string): string | undefined {
  switch (metric) {
    case 'contributors':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.unit.organizations' });
    case 'productCategories':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.unit.categories' });
    case 'productionWeightCoverage':
      return '%';
    case 'latestBatch':
      return undefined;
    default:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.unit.items' });
  }
}

export function getIndustryLabel(intl: DashboardIntl, industry: string, fallback: string): string {
  switch (industry) {
    case 'steel':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.industry.steel' });
    case 'cement':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.industry.cement' });
    case 'power':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.industry.power' });
    case 'nonferrous':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.industry.nonferrous' });
    case 'chemical':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.industry.chemical' });
    case 'building':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.industry.building' });
    case 'transport':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.industry.transport' });
    default:
      return fallback;
  }
}

export function getIndustryQualityLabel(
  intl: DashboardIntl,
  industry: string,
  fallback?: string,
): string {
  switch (industry) {
    case 'steel':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.quality.weightComplete' });
    case 'cement':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.quality.published' });
    case 'power':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.quality.highCoverage' });
    case 'nonferrous':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.quality.weightPending' });
    case 'chemical':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.quality.reviewing' });
    case 'building':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.quality.pendingPublish' });
    case 'transport':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.quality.supplementing' });
    default:
      return fallback ?? '-';
  }
}

export function getGapFlowLabel(intl: DashboardIntl, flow: string): string {
  switch (flow) {
    case '石灰石':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.gap.flow.limestone' });
    case '柴油':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.gap.flow.diesel' });
    case '硬煤':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.gap.flow.hardCoal' });
    case '交流电':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.gap.flow.acElectricity' });
    case '天然气':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.gap.flow.naturalGas' });
    default:
      return flow;
  }
}

export function getGapCategoryLabel(intl: DashboardIntl, category: string): string {
  switch (category) {
    case '基础材料':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.gap.category.basicMaterials' });
    case '能源燃料':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.gap.category.energyFuels' });
    case '电力公用工程':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.gap.category.electricUtilities' });
    default:
      return category;
  }
}

export function getMatrixGroupLabel(intl: DashboardIntl, group: string): string {
  switch (group) {
    case 'steel':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.matrix.group.steel' });
    case 'power':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.matrix.group.power' });
    case 'cement':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.matrix.group.cement' });
    case 'chemical':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.matrix.group.chemical' });
    case 'transport':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.matrix.group.transport' });
    case 'building':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.matrix.group.building' });
    case 'energy':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.matrix.group.energy' });
    case 'material':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.matrix.group.material' });
    case 'process':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.matrix.group.process' });
    case 'logistics':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.matrix.group.logistics' });
    case 'waste':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.matrix.group.waste' });
    case 'factor':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.matrix.group.factor' });
    default:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.matrix.group.ungrouped' });
  }
}

export function getMatrixZoneLabel(intl: DashboardIntl, zone: string): string {
  switch (zone) {
    case 'closed-process':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.matrix.zone.closedProcess' });
    case 'closed-factor':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.matrix.zone.closedFactor' });
    case 'gap-provider-a':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.matrix.zone.providerGapA' });
    case 'gap-provider-b':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.matrix.zone.providerGapB' });
    default:
      return zone;
  }
}

export function getRiskLabel(intl: DashboardIntl, risk: string): string {
  switch (risk) {
    case 'low':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.risk.low' });
    case 'medium':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.risk.medium' });
    case 'high':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.risk.high' });
    default:
      return risk;
  }
}

export function getQuickSelectLabel(intl: DashboardIntl, target: string): string {
  switch (target) {
    case 'china':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.quickSelect.crudeSteel' });
    case 'world':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.quickSelect.pvSystem' });
    default:
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.quickSelect.limestone' });
  }
}

export function getGraphCategoryLabel(intl: DashboardIntl, category: string): string {
  switch (category.trim()) {
    case 'Agriculture, forestry and fishing':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.category.agriculture' });
    case 'Electricity, gas, steam and air conditioning supply':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.category.energySupply' });
    case 'Manufacture of chemicals and chemical products':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.category.chemicals' });
    case 'Manufacture of computer, electronic and optical products':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.category.electronics' });
    case 'Manufacturing':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.category.manufacturing' });
    case 'Ores and minerals':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.category.ores' });
    case 'Transport':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.category.transport' });
    case 'Water supply; sewerage, waste management and remediation activities':
      return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.category.waterWaste' });
    default:
      return category.trim();
  }
}
