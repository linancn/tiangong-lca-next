import { DataDerivationTypeStatusOptions } from '@/pages/Processes/Components/optiondata';
import { flow_hybrid_search } from '@/services/flows/api';
import type { FlowTable } from '@/services/flows/data';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { geoMercator, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson';
import { gsap } from 'gsap';
import { Application, Container, Graphics } from 'pixi.js';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import {
  filterTopologyFlowCandidates,
  getFlowTopologyCacheBaseUrl,
  getFlowTopologyLatestPointerPath,
  getFlowTopologyObjectPath,
  isTopologyEligibleFlow,
  parseFlowTopologySnapshot,
  resolveFlowTopologyUrl,
  topologyFlowTypeFilter,
  type FlowTopologyEdge,
  type FlowTopologyLatestPointer,
  type FlowTopologyNode,
  type FlowTopologySnapshot,
} from './data/flowTopology';
import rawSnapshot from './data/mockDashboardSnapshot.json';
import {
  dashboardStatusKeys,
  dashboardStatusLabels,
  getRegionStatusValue,
  getRegionTotal,
  parseDashboardSnapshot,
  type DashboardSnapshot,
  type DashboardStatusKey,
  type IndustrySnapshot,
  type MatrixSnapshot,
  type RegionSnapshot,
} from './data/schema';
import styles from './index.less';

type ScreenKey = 'overview' | 'map_status' | 'outcome_metrics' | 'connectivity' | 'flow_topology';
type StatusFilterKey = DashboardStatusKey | 'all';
type ProvinceTooltipState = {
  anchorX: number;
  anchorY: number;
  placement: 'left' | 'right';
  region: RegionSnapshot;
  value: number;
  x: number;
  y: number;
};
type ChinaFeatureProperties = {
  adcode?: number | string;
  name?: string;
};
type ChinaMapFeature = Feature<Geometry, ChinaFeatureProperties>;
type ChinaMapData = FeatureCollection<Geometry, ChinaFeatureProperties>;
type StatusTone = {
  dark: string;
  glow: string;
  primary: string;
  rampHigh: string;
  rampLow: string;
  rampMid: string;
  soft: string;
};
type ConnectivitySnapshot = DashboardSnapshot['connectivity'];

const dashboardSnapshot = parseDashboardSnapshot(rawSnapshot);

const screens: { key: ScreenKey; label: string; shortLabel: string }[] = [
  { key: 'overview', label: '总览', shortLabel: '01' },
  { key: 'map_status', label: '态势', shortLabel: '02' },
  { key: 'outcome_metrics', label: '成果', shortLabel: '03' },
  { key: 'connectivity', label: '可计算', shortLabel: '04' },
  { key: 'flow_topology', label: '流图谱', shortLabel: '05' },
];

const statusFilterKeys: StatusFilterKey[] = ['all', ...dashboardStatusKeys];
const overviewMapViewBox = { height: 580, width: 1030 } as const;
const overviewHotspotLabelSize = { height: 21, width: 104 } as const;
const statusTonePalette: Record<StatusFilterKey, StatusTone> = {
  all: {
    dark: '#0849c8',
    glow: 'rgba(28, 102, 229, 0.26)',
    primary: '#1c66e5',
    rampHigh: '#073b91',
    rampLow: '#c7ddf8',
    rampMid: '#1c66e5',
    soft: 'rgba(28, 102, 229, 0.16)',
  },
  filling: {
    dark: '#0b5cbf',
    glow: 'rgba(39, 116, 232, 0.24)',
    primary: '#2774e8',
    rampHigh: '#07408f',
    rampLow: '#c5ddfb',
    rampMid: '#2774e8',
    soft: 'rgba(39, 116, 232, 0.14)',
  },
  pendingPublish: {
    dark: '#b36a0b',
    glow: 'rgba(240, 165, 43, 0.28)',
    primary: '#f0a52b',
    rampHigh: '#b36507',
    rampLow: '#ffe1a8',
    rampMid: '#f0a52b',
    soft: 'rgba(240, 165, 43, 0.16)',
  },
  postProcessing: {
    dark: '#a8540f',
    glow: 'rgba(224, 132, 34, 0.25)',
    primary: '#e08422',
    rampHigh: '#a05208',
    rampLow: '#ffd1a0',
    rampMid: '#e08422',
    soft: 'rgba(224, 132, 34, 0.15)',
  },
  published: {
    dark: '#8a5b06',
    glow: 'rgba(197, 138, 18, 0.28)',
    primary: '#c58a12',
    rampHigh: '#7f5204',
    rampLow: '#f0d890',
    rampMid: '#c58a12',
    soft: 'rgba(197, 138, 18, 0.16)',
  },
  reviewing: {
    dark: '#093fb2',
    glow: 'rgba(28, 102, 229, 0.3)',
    primary: '#1c66e5',
    rampHigh: '#073b91',
    rampLow: '#c6dbfb',
    rampMid: '#1c66e5',
    soft: 'rgba(28, 102, 229, 0.16)',
  },
  sampleAccepted: {
    dark: '#087d92',
    glow: 'rgba(19, 197, 216, 0.26)',
    primary: '#13c5d8',
    rampHigh: '#057f95',
    rampLow: '#a4edf3',
    rampMid: '#13c5d8',
    soft: 'rgba(19, 197, 216, 0.15)',
  },
  submitted: {
    dark: '#0a719a',
    glow: 'rgba(17, 169, 215, 0.24)',
    primary: '#11a9d7',
    rampHigh: '#056f94',
    rampLow: '#a9e5f4',
    rampMid: '#11a9d7',
    soft: 'rgba(17, 169, 215, 0.14)',
  },
};

const numberFormatter = new Intl.NumberFormat('zh-CN');
let chinaMapDataCache: ChinaMapData | null = null;
let chinaMapDataRequest: Promise<ChinaMapData> | null = null;

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function getHashSearchParams(): URLSearchParams {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }

  const [, query = ''] = window.location.hash.split('?');
  return new URLSearchParams(query);
}

function getInitialScreen(): ScreenKey {
  const screenParam = getHashSearchParams().get('screen');
  const matchedScreen = screens.find((screen) => screen.key === screenParam);
  return matchedScreen?.key ?? 'overview';
}

function getAutoplayEnabled(): boolean {
  return getHashSearchParams().get('autoplay') !== '0';
}

function getStatusTone(statusKey: StatusFilterKey): StatusTone {
  return statusTonePalette[statusKey];
}

function getStatusToneStyle(statusKey: StatusFilterKey): CSSProperties {
  const tone = getStatusTone(statusKey);
  return {
    '--status-color': tone.primary,
    '--status-dark': tone.dark,
    '--status-glow': tone.glow,
    '--status-ramp-high': tone.rampHigh,
    '--status-ramp-low': tone.rampLow,
    '--status-ramp-mid': tone.rampMid,
    '--status-soft': tone.soft,
  } as CSSProperties;
}

function hexToRgb(hexColor: string): [number, number, number] {
  const hex = hexColor.replace('#', '');
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function mixHexColor(fromColor: string, toColor: string, ratio: number): string {
  const [fromRed, fromGreen, fromBlue] = hexToRgb(fromColor);
  const [toRed, toGreen, toBlue] = hexToRgb(toColor);
  const boundedRatio = Math.max(0, Math.min(ratio, 1));
  const red = Math.round(fromRed + (toRed - fromRed) * boundedRatio);
  const green = Math.round(fromGreen + (toGreen - fromGreen) * boundedRatio);
  const blue = Math.round(fromBlue + (toBlue - fromBlue) * boundedRatio);
  return `rgb(${red}, ${green}, ${blue})`;
}

function loadChinaMapData(): Promise<ChinaMapData> {
  if (chinaMapDataCache) {
    return Promise.resolve(chinaMapDataCache);
  }

  if (!chinaMapDataRequest) {
    chinaMapDataRequest = fetch('/maps/china-province-100000-full.geojson')
      .then((response) => response.json())
      .then((data: ChinaMapData) => {
        chinaMapDataCache = data;
        return data;
      });
  }

  return chinaMapDataRequest;
}

function getRegionAdcode(feature: ChinaMapFeature): number | undefined {
  const rawAdcode = feature.properties?.adcode;
  if (typeof rawAdcode === 'number') {
    return rawAdcode;
  }
  if (typeof rawAdcode === 'string') {
    const parsed = Number.parseInt(rawAdcode, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function rewindMapFeature(feature: ChinaMapFeature): ChinaMapFeature {
  if (feature.geometry.type === 'Polygon') {
    const geometry: Polygon = {
      ...feature.geometry,
      coordinates: feature.geometry.coordinates.map((ring) => ring.slice().reverse()),
    };
    return { ...feature, geometry };
  }

  if (feature.geometry.type === 'MultiPolygon') {
    const geometry: MultiPolygon = {
      ...feature.geometry,
      coordinates: feature.geometry.coordinates.map((polygon) =>
        polygon.map((ring) => ring.slice().reverse()),
      ),
    };
    return { ...feature, geometry };
  }

  return feature;
}

function getMapColor(statusKey: StatusFilterKey, value: number, maxValue: number): string {
  const ratio = maxValue > 0 ? Math.max(0.08, Math.min(value / maxValue, 1)) : 0;
  const boostedRatio = Math.pow(ratio, 0.58);
  const tone = getStatusTone(statusKey);

  if (boostedRatio < 0.48) {
    return mixHexColor(tone.rampLow, tone.rampMid, boostedRatio / 0.48);
  }

  return mixHexColor(tone.rampMid, tone.rampHigh, (boostedRatio - 0.48) / 0.52);
}

function getProvinceDensityClass(value: number, maxValue: number): string {
  const ratio = maxValue > 0 ? value / maxValue : 0;
  if (ratio >= 0.72) {
    return styles.provinceHot;
  }
  if (ratio >= 0.42) {
    return styles.provinceWarm;
  }
  return styles.provinceLow;
}

function buildRegionMap(regions: RegionSnapshot[]): Map<number, RegionSnapshot> {
  return new Map(regions.map((region) => [region.adcode, region]));
}

function getTopRegion(
  regions: RegionSnapshot[],
  statusKey: StatusFilterKey,
): RegionSnapshot | undefined {
  return regions.reduce<RegionSnapshot | undefined>((topRegion, region) => {
    if (!topRegion) {
      return region;
    }
    return getRegionStatusValue(region, statusKey) > getRegionStatusValue(topRegion, statusKey)
      ? region
      : topRegion;
  }, undefined);
}

function getTopRegions(
  regions: RegionSnapshot[],
  statusKey: StatusFilterKey,
  limit: number,
): RegionSnapshot[] {
  return [...regions]
    .sort(
      (left, right) =>
        getRegionStatusValue(right, statusKey) - getRegionStatusValue(left, statusKey),
    )
    .slice(0, limit);
}

function sumStatus(regions: RegionSnapshot[], statusKey: StatusFilterKey): number {
  return regions.reduce((total, region) => total + getRegionStatusValue(region, statusKey), 0);
}

function getNarrativeMetric(snapshot: DashboardSnapshot, stageKey: string) {
  if (stageKey === 'publish') {
    return {
      label: '发布成果',
      unit: '个',
      value: formatNumber(snapshot.summary.publishedDatasets),
    };
  }
  if (stageKey === 'compute') {
    return {
      label: '连接完成度',
      unit: '%',
      value: snapshot.summary.connectivityRate.toFixed(1),
    };
  }
  return {
    label: '样本库',
    unit: '个',
    value: formatNumber(snapshot.summary.sampleDatasets),
  };
}

type FlowTopologySearchState = 'idle' | 'loading' | 'ready' | 'error';
type FlowTopologyLoadState = 'idle' | 'loading' | 'ready' | 'missing' | 'error';
type FlowTopologyRelation = 'provider' | 'consumer' | 'both';
type FlowTopologyViewMode = 'overview' | 'provider' | 'consumer' | 'process';
type FlowTopologySide = 'left' | 'right';
type FlowTopologyProcessReference = {
  edges: FlowTopologyEdge[];
  node: FlowTopologyNode;
  relation: FlowTopologyRelation;
  score: number;
};
type FlowTopologyClusterLayoutItem = {
  category: string;
  id: string;
  kind: 'cluster';
  processCount: number;
  referenceCount: number;
  relation: FlowTopologyRelation;
  representativeRefs: FlowTopologyProcessReference[];
  share: number;
  side: FlowTopologySide;
  strength: number;
  x: number;
  y: number;
};
type FlowTopologyProcessListItem = {
  category: string;
  clusterId: string;
  edges: FlowTopologyEdge[];
  id: string;
  kind: 'process';
  node: FlowTopologyNode;
  relation: FlowTopologyRelation;
  side: FlowTopologySide;
  strength: number;
};
type FlowTopologyLayoutItem = FlowTopologyClusterLayoutItem | FlowTopologyProcessListItem;

class FlowTopologyCacheMissError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FlowTopologyCacheMissError';
  }
}

const flowTopologySearchPageSize = 5;
const flowTopologyCategoryDisplayLimit = 5;
const flowTopologyFlowTypeLabelMap: Record<string, string> = {
  'Elementary flow': '基础流',
  'Other flow': '其他流',
  'Product flow': '产品流',
  'Waste flow': '废物流',
};
const flowTopologyCategoryLabelMap: Record<string, string> = {
  'Agriculture, forestry and fishing': '农林牧渔业',
  Construction: '建筑业',
  'End-of-life treatment': '末端处理',
  'Energy carriers and technologies': '能源载体与技术',
  Manufacturing: '制造业',
  'Materials production': '材料生产',
  'Mining and quarrying': '采矿业',
  'Other Services': '其他服务业',
  Systems: '系统与设备',
  'Water supply; sewerage, waste management and remediation activities': '水务、污水与废弃物处理',
};

function getFlowTopologyProcessNodes(snapshot: FlowTopologySnapshot): FlowTopologyNode[] {
  return snapshot.nodes.filter((node) => node.type === 'process');
}

function getFlowTopologyNodeRelation(
  snapshot: FlowTopologySnapshot,
  nodeId: string,
): FlowTopologyRelation {
  const isProvider = snapshot.edges.some(
    (edge) => edge.relation === 'provider' && edge.source === nodeId,
  );
  const isConsumer = snapshot.edges.some(
    (edge) => edge.relation === 'consumer' && edge.target === nodeId,
  );

  if (isProvider && isConsumer) {
    return 'both';
  }
  if (isProvider) {
    return 'provider';
  }
  return 'consumer';
}

function isFlowTopologyRelationVisible(
  relation: FlowTopologyRelation,
  viewMode: FlowTopologyViewMode,
) {
  if (viewMode === 'overview' || viewMode === 'process') {
    return true;
  }
  return relation === viewMode || relation === 'both';
}

function getFlowTopologyRelationLabel(relation: FlowTopologyRelation) {
  if (relation === 'provider') {
    return '供给';
  }
  if (relation === 'consumer') {
    return '消费';
  }
  return '供需';
}

function getFlowTopologyFlowTypeLabel(flowType?: string) {
  if (!flowType) {
    return '-';
  }

  return flowTopologyFlowTypeLabelMap[flowType] ?? flowType;
}

function getFlowTopologyDataDerivationTypeStatusLabel(status?: string) {
  if (!status || status === '-') {
    return '-';
  }

  const option = DataDerivationTypeStatusOptions.find((item) => item.value === status);

  return option?.label ?? '-';
}

function getFlowTopologyCategory(node: FlowTopologyNode): string {
  const classification = node.classification?.trim();

  if (!classification) {
    return '未分类';
  }

  const primaryCategory = classification.split(/[/>|｜]/)[0]?.trim() || classification;

  return flowTopologyCategoryLabelMap[primaryCategory] ?? primaryCategory;
}

function getFlowTopologyRelationSide(
  relation: FlowTopologyRelation,
  viewMode: FlowTopologyViewMode,
  index: number,
): FlowTopologySide {
  if (viewMode === 'provider') {
    return 'left';
  }
  if (viewMode === 'consumer') {
    return 'right';
  }
  if (relation === 'provider') {
    return 'left';
  }
  if (relation === 'consumer') {
    return 'right';
  }
  return index % 2 === 0 ? 'left' : 'right';
}

type FlowTopologyAmountField = 'meanAmount' | 'resultingAmount';

function getFlowTopologyEdgeAmountByField(
  edge: FlowTopologyEdge,
  amountField: FlowTopologyAmountField,
): number | null {
  const rawAmount = edge[amountField];
  const amount = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount);

  return Number.isFinite(amount) ? amount : null;
}

function getFlowTopologyEdgeAmount(edge: FlowTopologyEdge): number | null {
  return (
    getFlowTopologyEdgeAmountByField(edge, 'resultingAmount') ??
    getFlowTopologyEdgeAmountByField(edge, 'meanAmount')
  );
}

function getFlowTopologyReferenceScore(edges: FlowTopologyEdge[]): number {
  const numericScore = edges.reduce((total, edge) => {
    const amount = getFlowTopologyEdgeAmount(edge);
    return total + (amount === null ? 0 : Math.abs(amount));
  }, 0);

  return numericScore > 0 ? numericScore : edges.length;
}

function formatFlowTopologyAmount(amount: number): string {
  const absoluteAmount = Math.abs(amount);

  if (absoluteAmount === 0) {
    return '0';
  }

  return absoluteAmount >= 100
    ? amount.toFixed(0)
    : absoluteAmount >= 10
      ? amount.toFixed(1)
      : amount.toFixed(2);
}

function getFlowTopologyAmountLabel(
  edges: FlowTopologyEdge[],
  amountField?: FlowTopologyAmountField,
): string {
  let hasAmount = false;
  const amount = edges.reduce((total, edge) => {
    const edgeAmount = amountField
      ? getFlowTopologyEdgeAmountByField(edge, amountField)
      : getFlowTopologyEdgeAmount(edge);

    if (edgeAmount === null) {
      return total;
    }

    hasAmount = true;
    return total + edgeAmount;
  }, 0);

  return hasAmount ? formatFlowTopologyAmount(amount) : '-';
}

function getFlowTopologyProcessReferences(
  snapshot: FlowTopologySnapshot,
  viewMode: FlowTopologyViewMode,
): FlowTopologyProcessReference[] {
  const processNodes = getFlowTopologyProcessNodes(snapshot);
  const references = processNodes
    .map((node, index) => {
      const relation = getFlowTopologyNodeRelation(snapshot, node.id);
      const edges = snapshot.edges.filter(
        (edge) => edge.source === node.id || edge.target === node.id,
      );

      return {
        edges,
        node,
        originalIndex: index,
        relation,
        score: getFlowTopologyReferenceScore(edges),
      };
    })
    .filter((item) => isFlowTopologyRelationVisible(item.relation, viewMode))
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.edges.length - left.edges.length ||
        left.node.name.localeCompare(right.node.name, 'zh-CN') ||
        left.originalIndex - right.originalIndex,
    );

  return references.map(({ edges, node, relation, score }) => ({
    edges,
    node,
    relation,
    score,
  }));
}

function getFlowTopologyClusterPoint(
  index: number,
  total: number,
  side: FlowTopologySide,
): Pick<FlowTopologyClusterLayoutItem, 'x' | 'y'> {
  const yMin = 20;
  const yMax = 80;
  const progress = total > 1 ? index / (total - 1) : 0.5;
  const y = yMin + (yMax - yMin) * progress;
  const yCurve = Math.abs(progress - 0.5) * 2;
  const x = side === 'left' ? 22 + yCurve * 3 : 78 - yCurve * 3;

  return { x, y };
}

function getFlowTopologyClusterRelation(
  references: FlowTopologyProcessReference[],
): FlowTopologyRelation {
  const hasProvider = references.some((reference) => reference.relation === 'provider');
  const hasConsumer = references.some((reference) => reference.relation === 'consumer');
  const hasBoth = references.some((reference) => reference.relation === 'both');

  if (hasBoth || (hasProvider && hasConsumer)) {
    return 'both';
  }
  return hasProvider ? 'provider' : 'consumer';
}

function getFlowTopologyClusterLayout(
  snapshot: FlowTopologySnapshot,
  viewMode: FlowTopologyViewMode,
): FlowTopologyClusterLayoutItem[] {
  const references = getFlowTopologyProcessReferences(snapshot, viewMode);
  const buckets = new Map<string, FlowTopologyProcessReference[]>();

  references.forEach((reference, index) => {
    const side = getFlowTopologyRelationSide(reference.relation, viewMode, index);
    const category = getFlowTopologyCategory(reference.node);
    const key = `${side}:${category}`;
    buckets.set(key, [...(buckets.get(key) ?? []), reference]);
  });

  const sideBuckets: Record<FlowTopologySide, FlowTopologyClusterLayoutItem[]> = {
    left: [],
    right: [],
  };

  Array.from(buckets.entries()).forEach(([key, bucket]) => {
    const [side, category] = key.split(':') as [FlowTopologySide, string];
    const sortedRefs = [...bucket].sort(
      (left, right) =>
        right.score - left.score ||
        right.edges.length - left.edges.length ||
        left.node.name.localeCompare(right.node.name, 'zh-CN'),
    );
    const referenceCount = sortedRefs.reduce(
      (total, reference) => total + reference.edges.length,
      0,
    );
    const strength = sortedRefs.reduce((total, reference) => total + reference.score, 0);

    sideBuckets[side].push({
      category,
      id: `cluster:${side}:${category}`,
      kind: 'cluster',
      processCount: sortedRefs.length,
      referenceCount,
      relation: getFlowTopologyClusterRelation(sortedRefs),
      representativeRefs: sortedRefs,
      share: 0,
      side,
      strength,
      x: 50,
      y: 50,
    });
  });

  return (Object.keys(sideBuckets) as FlowTopologySide[]).flatMap((side) => {
    const sortedClusters = sideBuckets[side].sort(
      (left, right) =>
        right.processCount - left.processCount ||
        right.referenceCount - left.referenceCount ||
        left.category.localeCompare(right.category, 'zh-CN'),
    );
    const visibleClusters = sortedClusters.slice(0, flowTopologyCategoryDisplayLimit);
    const restClusters = sortedClusters.slice(flowTopologyCategoryDisplayLimit);
    const clusters =
      restClusters.length === 0
        ? visibleClusters
        : [
            ...visibleClusters,
            {
              category: `其他 ${formatNumber(restClusters.length)} 类`,
              id: `cluster:${side}:__other`,
              kind: 'cluster' as const,
              processCount: restClusters.reduce(
                (total, cluster) => total + cluster.processCount,
                0,
              ),
              referenceCount: restClusters.reduce(
                (total, cluster) => total + cluster.referenceCount,
                0,
              ),
              relation: getFlowTopologyClusterRelation(
                restClusters.flatMap((cluster) => cluster.representativeRefs),
              ),
              representativeRefs: restClusters.flatMap((cluster) => cluster.representativeRefs),
              share: 0,
              side,
              strength: restClusters.reduce((total, cluster) => total + cluster.strength, 0),
              x: 50,
              y: 50,
            },
          ];
    const sideStrength = clusters.reduce((total, cluster) => total + cluster.strength, 0);

    return clusters.map((cluster, index) => ({
      ...cluster,
      share: sideStrength > 0 ? cluster.strength / sideStrength : 0,
      ...getFlowTopologyClusterPoint(index, clusters.length, side),
    }));
  });
}

function getFlowTopologyLayout(
  snapshot: FlowTopologySnapshot,
  viewMode: FlowTopologyViewMode,
): FlowTopologyLayoutItem[] {
  const clusters = getFlowTopologyClusterLayout(snapshot, viewMode);
  const processItems = clusters.flatMap((cluster) =>
    cluster.representativeRefs.map((reference) => ({
      category: getFlowTopologyCategory(reference.node),
      clusterId: cluster.id,
      edges: reference.edges,
      id: `process:${reference.node.id}`,
      kind: 'process' as const,
      node: reference.node,
      relation: reference.relation,
      side: cluster.side,
      strength: reference.score,
    })),
  );

  return [...clusters, ...processItems];
}

function isFlowTopologyItemHighlighted(
  item: FlowTopologyLayoutItem,
  activeItem?: FlowTopologyLayoutItem,
) {
  if (!activeItem) {
    return false;
  }
  if (item.id === activeItem.id) {
    return true;
  }
  if (item.kind === 'process' && activeItem.kind === 'cluster') {
    return item.clusterId === activeItem.id;
  }
  if (item.kind === 'cluster' && activeItem.kind === 'process') {
    return item.id === activeItem.clusterId;
  }

  return false;
}

function getFlowTopologyClusterPath(item: FlowTopologyClusterLayoutItem) {
  const controlX = item.side === 'left' ? 38 : 62;

  return `M ${item.x} ${item.y} C ${controlX} ${item.y}, ${controlX} 50, 50 50`;
}

function getFlowTopologyEdgeWeight(strength: number) {
  return Math.min(8.2, Math.max(2.2, 1.8 + Math.log10(strength + 1) * 1.18));
}

async function fetchJsonOrCacheMiss<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: 'no-cache',
  });

  if (response.status === 404) {
    throw new FlowTopologyCacheMissError(`Topology cache was not found: ${url}`);
  }

  if (!response.ok) {
    throw new Error(`Topology cache request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function loadCachedFlowTopology(flow: FlowTable): Promise<FlowTopologySnapshot> {
  const baseUrl = getFlowTopologyCacheBaseUrl();
  const manifest = await fetchJsonOrCacheMiss<{ activeBuildId?: string; buildId?: string }>(
    `${baseUrl}/manifest.json`,
  );
  const buildId = manifest.activeBuildId ?? manifest.buildId;

  if (!buildId) {
    throw new FlowTopologyCacheMissError('Topology manifest does not include an active build id.');
  }

  const latestPointerPath = getFlowTopologyLatestPointerPath(buildId, flow.id);
  const latestPointer = await fetchJsonOrCacheMiss<FlowTopologyLatestPointer>(
    resolveFlowTopologyUrl(baseUrl, latestPointerPath),
  );
  const topologyUrl =
    latestPointer.topologyUrl ??
    (latestPointer.topologyPath
      ? resolveFlowTopologyUrl(baseUrl, latestPointer.topologyPath)
      : resolveFlowTopologyUrl(baseUrl, getFlowTopologyObjectPath(buildId, flow.id, flow.version)));

  return parseFlowTopologySnapshot(await fetchJsonOrCacheMiss(topologyUrl));
}

async function searchSmartRecommendedFlows(queryText: string): Promise<{
  data: FlowTable[];
  fallback: boolean;
}> {
  const normalizedQuery = queryText.trim();

  if (!normalizedQuery) {
    return { data: [], fallback: false };
  }

  try {
    const result = await flow_hybrid_search(
      { current: 1, pageSize: 8 },
      'zh',
      'tg',
      normalizedQuery,
      {
        flowType: topologyFlowTypeFilter,
      },
      100,
    );
    const recommendedFlows = filterTopologyFlowCandidates(result.data ?? []);

    if (recommendedFlows.length > 0) {
      return { data: recommendedFlows, fallback: false };
    }
  } catch (error) {
    console.warn('Failed to load smart flow recommendations.', error);
  }

  return { data: [], fallback: false };
}

type StageLayout = {
  left: number;
  scale: number;
  top: number;
};

function computeStageLayout(): StageLayout {
  if (typeof window === 'undefined') {
    return { left: 0, scale: 1, top: 0 };
  }

  const viewport = window.visualViewport;
  const viewportWidth =
    viewport?.width ?? document.documentElement.clientWidth ?? window.innerWidth;
  const viewportHeight =
    viewport?.height ?? document.documentElement.clientHeight ?? window.innerHeight;
  const scale = Math.min(viewportWidth / 1920, viewportHeight / 1080);
  const scaledWidth = 1920 * scale;

  return {
    left: (viewport?.offsetLeft ?? 0) + (viewportWidth - scaledWidth) / 2,
    scale,
    top: viewport?.offsetTop ?? 0,
  };
}

function useStageLayout(): StageLayout {
  const [layout, setLayout] = useState<StageLayout>(() => computeStageLayout());

  useEffect(() => {
    const updateLayout = () => {
      setLayout(computeStageLayout());
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    window.visualViewport?.addEventListener('resize', updateLayout);

    return () => {
      window.removeEventListener('resize', updateLayout);
      window.visualViewport?.removeEventListener('resize', updateLayout);
    };
  }, []);

  return layout;
}

function MetricIcon({ type }: { type: string }) {
  if (type === 'database') {
    return (
      <svg viewBox='0 0 64 64' aria-hidden='true'>
        <ellipse cx='32' cy='15' rx='20' ry='8' />
        <path d='M12 15v24c0 4.4 9 8 20 8s20-3.6 20-8V15' />
        <path d='M12 27c0 4.4 9 8 20 8s20-3.6 20-8' />
        <path d='M12 39c0 4.4 9 8 20 8s20-3.6 20-8' />
      </svg>
    );
  }
  if (type === 'location') {
    return (
      <svg viewBox='0 0 64 64' aria-hidden='true'>
        <path d='M32 56s18-17.5 18-32a18 18 0 0 0-36 0c0 14.5 18 32 18 32Z' />
        <circle cx='32' cy='24' r='7' />
        <path d='M18 54h28' />
      </svg>
    );
  }
  if (type === 'report') {
    return (
      <svg viewBox='0 0 64 64' aria-hidden='true'>
        <path d='M18 8h22l10 10v38H18z' />
        <path d='M40 8v11h10' />
        <path d='M27 45V30M36 45V24M45 45V35' />
      </svg>
    );
  }
  if (type === 'network') {
    return (
      <svg viewBox='0 0 64 64' aria-hidden='true'>
        <circle cx='16' cy='35' r='6' />
        <circle cx='34' cy='18' r='6' />
        <circle cx='48' cy='42' r='6' />
        <path d='m21 31 8-8M38 23l7 14M22 37l20 4' />
      </svg>
    );
  }
  return (
    <svg viewBox='0 0 64 64' aria-hidden='true'>
      <path d='M14 44h36M18 34h28M22 24h20M26 14h12' />
    </svg>
  );
}

function HeaderRibbon({
  snapshot,
  title,
  subtitle,
}: {
  snapshot: DashboardSnapshot;
  title?: string;
  subtitle?: string;
}) {
  return (
    <header className={styles.headerRibbon}>
      <div className={styles.headerFlow} />
      <div className={styles.headerText}>
        <h1>{title ?? snapshot.title}</h1>
        <p>{subtitle ?? snapshot.subtitle}</p>
      </div>
      <div className={styles.headerMeta}>
        <strong>{snapshot.dataVersion}</strong>
        <span>数据更新：{snapshot.generatedAt.slice(0, 16).replace('T', ' ')}</span>
      </div>
    </header>
  );
}

function ScreenNavigator({
  activeScreen,
  onChange,
}: {
  activeScreen: ScreenKey;
  onChange: (screen: ScreenKey) => void;
}) {
  return (
    <nav className={styles.screenNavigator} aria-label='大屏切换'>
      {screens.map((screen) => (
        <button
          className={screen.key === activeScreen ? styles.screenNavActive : ''}
          key={screen.key}
          onClick={() => onChange(screen.key)}
          type='button'
        >
          <span>{screen.shortLabel}</span>
          {screen.label}
        </button>
      ))}
    </nav>
  );
}

function CountMetric({
  label,
  value,
  unit,
  icon,
  tone = 'blue',
}: {
  label: string;
  value: number;
  unit?: string;
  icon: string;
  tone?: 'blue' | 'cyan' | 'gold' | 'amber';
}) {
  return (
    <div className={`${styles.countMetric} ${styles[`tone-${tone}`]}`} data-animate='metric'>
      <div className={styles.metricIcon}>
        <MetricIcon type={icon} />
      </div>
      <div>
        <span>{label}</span>
        <strong>
          {formatNumber(value)}
          {unit && <em>{unit}</em>}
        </strong>
      </div>
    </div>
  );
}

function ChinaStatusMap({
  regions,
  statusKey,
  variant,
  highlightAdcode,
  selectedAdcode,
  onSelectRegion,
}: {
  regions: RegionSnapshot[];
  statusKey: StatusFilterKey;
  variant: 'overview' | 'detail';
  highlightAdcode?: number;
  selectedAdcode?: number;
  onSelectRegion?: (region: RegionSnapshot) => void;
}) {
  const [mapData, setMapData] = useState<ChinaMapData | null>(null);
  const [provinceTooltip, setProvinceTooltip] = useState<ProvinceTooltipState | null>(null);
  const regionMap = useMemo(() => buildRegionMap(regions), [regions]);
  const maxValue = useMemo(
    () => Math.max(...regions.map((region) => getRegionStatusValue(region, statusKey))),
    [regions, statusKey],
  );

  const updateProvinceTooltip = (
    event: ReactMouseEvent<SVGPathElement>,
    region: RegionSnapshot,
    value: number,
  ) => {
    const layer = event.currentTarget.ownerSVGElement?.parentElement;
    const bounds = layer?.getBoundingClientRect();
    if (!layer || !bounds) {
      return;
    }

    const layerWidth = layer.offsetWidth || bounds.width;
    const layerHeight = layer.offsetHeight || bounds.height;
    const scaleX = bounds.width / layerWidth || 1;
    const scaleY = bounds.height / layerHeight || 1;
    const tooltipWidth = 264;
    const tooltipHeight = 126;
    const anchorX = (event.clientX - bounds.left) / scaleX;
    const anchorY = (event.clientY - bounds.top) / scaleY;

    const gutter = 22;
    const maxX = Math.max(16, layerWidth - tooltipWidth - 16);
    const maxY = Math.max(16, layerHeight - tooltipHeight - 16);
    const placement = anchorX + tooltipWidth + gutter <= layerWidth - 16 ? 'right' : 'left';
    const x =
      placement === 'right'
        ? Math.min(Math.max(anchorX + gutter, 16), maxX)
        : Math.min(Math.max(anchorX - tooltipWidth - gutter, 16), maxX);
    const y = Math.min(Math.max(anchorY - tooltipHeight / 2, 16), maxY);

    setProvinceTooltip({ anchorX, anchorY, placement, region, value, x, y });
  };
  const clearProvinceTooltipWhenOutsideRegion = (event: ReactMouseEvent<SVGSVGElement>) => {
    const target = event.target;
    const isRegionPath =
      target instanceof SVGPathElement && Boolean(target.getAttribute('aria-label'));

    if (!isRegionPath) {
      setProvinceTooltip(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    loadChinaMapData()
      .then((data) => {
        if (mounted) {
          setMapData(data);
        }
      })
      .catch(() => {
        if (mounted) {
          setMapData(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const paths = useMemo(() => {
    if (!mapData) {
      return [];
    }

    const displayFeatures = mapData.features
      .filter((feature) => {
        const adcode = getRegionAdcode(feature);
        return Boolean(feature.properties?.name) && Boolean(adcode) && adcode !== 100000;
      })
      .map(rewindMapFeature);
    const displayMapData: ChinaMapData = {
      ...mapData,
      features: displayFeatures,
    };

    const projection = geoMercator().fitExtent(
      [
        [18, 18],
        [variant === 'overview' ? 1010 : 1080, variant === 'overview' ? 560 : 700],
      ],
      displayMapData,
    );
    const pathGenerator = geoPath(projection);

    return displayFeatures.map((feature) => {
      const adcode = getRegionAdcode(feature);
      const region = adcode ? regionMap.get(adcode) : undefined;
      const value = region ? getRegionStatusValue(region, statusKey) : 0;

      return {
        adcode,
        centroid: pathGenerator.centroid(feature) as [number, number],
        path: pathGenerator(feature) ?? '',
        region,
        value,
      };
    });
  }, [mapData, regionMap, statusKey, variant]);

  if (!mapData) {
    return <div className={styles.mapLoading}>地图资产加载中</div>;
  }

  return (
    <div
      className={styles.mapInteractiveLayer}
      onMouseLeave={() => setProvinceTooltip(null)}
      style={getStatusToneStyle(statusKey)}
    >
      <svg
        className={`${styles.chinaMap} ${
          variant === 'overview' ? styles.chinaMapOverview : styles.chinaMapDetail
        }`}
        role='img'
        onMouseLeave={() => setProvinceTooltip(null)}
        onMouseMove={clearProvinceTooltipWhenOutsideRegion}
        viewBox={`0 0 ${variant === 'overview' ? 1030 : 1100} ${
          variant === 'overview' ? 580 : 720
        }`}
      >
        <defs>
          <filter id='provinceGlow' x='-20%' y='-20%' width='140%' height='140%'>
            <feGaussianBlur in='SourceGraphic' stdDeviation='3' />
            <feColorMatrix values='0 0 0 0 0.15 0 0 0 0 0.55 0 0 0 0 1 0 0 0 0.32 0' />
            <feMerge>
              <feMergeNode />
              <feMergeNode in='SourceGraphic' />
            </feMerge>
          </filter>
        </defs>
        <g filter='url(#provinceGlow)'>
          {paths.map((item, index) => {
            const isSelected = item.adcode === selectedAdcode;
            const isTopRegion = item.adcode === highlightAdcode;
            return (
              <path
                aria-label={
                  item.region
                    ? `${item.region.name} ${dashboardStatusLabels[statusKey]} ${formatNumber(
                        item.value,
                      )} 条`
                    : undefined
                }
                className={[
                  getProvinceDensityClass(item.value, maxValue),
                  isTopRegion ? styles.provinceTop : '',
                  isSelected ? styles.provinceSelected : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                d={item.path}
                fill={
                  item.region
                    ? getMapColor(statusKey, item.value, maxValue)
                    : 'rgba(180,205,232,.18)'
                }
                key={`${item.adcode ?? 'inset'}-${index}`}
                onClick={() => item.region && onSelectRegion?.(item.region)}
                onMouseEnter={(event) =>
                  item.region && updateProvinceTooltip(event, item.region, item.value)
                }
                onMouseLeave={() => setProvinceTooltip(null)}
                onMouseMove={(event) =>
                  item.region && updateProvinceTooltip(event, item.region, item.value)
                }
                stroke='rgba(255,255,255,.92)'
                strokeWidth={isSelected || isTopRegion ? 2.8 : 1.15}
              />
            );
          })}
        </g>
        {variant === 'detail' && (
          <g className={styles.provinceHotspots}>
            {paths
              .filter(
                (item) =>
                  item.region &&
                  item.centroid.every(Number.isFinite) &&
                  (item.adcode === selectedAdcode || item.adcode === highlightAdcode),
              )
              .filter(
                (item, index, list) =>
                  list.findIndex((candidate) => candidate.adcode === item.adcode) === index,
              )
              .map((item) => {
                const [x, y] = item.centroid;
                const isSelected = item.adcode === selectedAdcode;
                return (
                  <g key={`spotlight-${item.adcode}`} transform={`translate(${x} ${y})`}>
                    <circle className={styles.provinceSpotlightHalo} r={isSelected ? 19 : 15} />
                    <circle className={styles.provinceSpotlightCore} r={isSelected ? 5.5 : 4.5} />
                  </g>
                );
              })}
          </g>
        )}
      </svg>
      {provinceTooltip && (
        <>
          <svg className={styles.provinceTooltipLink}>
            <line
              x1={provinceTooltip.anchorX}
              x2={
                provinceTooltip.placement === 'left' ? provinceTooltip.x + 264 : provinceTooltip.x
              }
              y1={provinceTooltip.anchorY}
              y2={provinceTooltip.y + 63}
            />
          </svg>
          <div
            className={styles.provinceHoverPin}
            style={{
              left: provinceTooltip.anchorX,
              top: provinceTooltip.anchorY,
            }}
          />
          <div
            className={`${styles.provinceTooltip} ${
              provinceTooltip.placement === 'left' ? styles.provinceTooltipLeft : ''
            }`}
            style={{
              ...getStatusToneStyle(statusKey),
              left: provinceTooltip.x,
              top: provinceTooltip.y,
            }}
          >
            <div className={styles.provinceTooltipHeader}>
              <strong>{provinceTooltip.region.shortName}</strong>
              <span>{dashboardStatusLabels[statusKey]}</span>
            </div>
            <div className={styles.provinceTooltipValue}>
              <b>{formatNumber(provinceTooltip.value)}</b>
              <em>条</em>
            </div>
            <div className={styles.provinceTooltipMeta}>
              <span>全部数据</span>
              <strong>{formatNumber(getRegionTotal(provinceTooltip.region))}</strong>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function OverviewScreen({
  snapshot,
  activeScreen,
  onChangeScreen,
}: {
  snapshot: DashboardSnapshot;
  activeScreen: ScreenKey;
  onChangeScreen: (screen: ScreenKey) => void;
}) {
  const [mapData, setMapData] = useState<ChinaMapData | null>(null);
  const overviewTopRegions = useMemo(
    () => getTopRegions(snapshot.regions, 'all', 4),
    [snapshot.regions],
  );
  const overviewHotspotItems = useMemo(() => {
    if (!mapData) {
      return [];
    }

    const displayFeatures = mapData.features
      .filter((feature) => {
        const adcode = getRegionAdcode(feature);
        return Boolean(feature.properties?.name) && Boolean(adcode) && adcode !== 100000;
      })
      .map(rewindMapFeature);
    const featureMap = new Map(
      displayFeatures.flatMap((feature) => {
        const adcode = getRegionAdcode(feature);
        return adcode ? [[adcode, feature] as const] : [];
      }),
    );
    const displayMapData: ChinaMapData = {
      ...mapData,
      features: displayFeatures,
    };
    const projection = geoMercator().fitExtent(
      [
        [18, 18],
        [1010, 560],
      ],
      displayMapData,
    );
    const pathGenerator = geoPath(projection);

    return overviewTopRegions.flatMap((region) => {
      const feature = featureMap.get(region.adcode);
      if (!feature) {
        return [];
      }

      const centroid = pathGenerator.centroid(feature) as [number, number];
      if (!centroid.every(Number.isFinite)) {
        return [];
      }

      return [
        {
          centroid,
          region,
        },
      ];
    });
  }, [mapData, overviewTopRegions]);

  useEffect(() => {
    let mounted = true;

    loadChinaMapData()
      .then((data) => {
        if (mounted) {
          setMapData(data);
        }
      })
      .catch(() => {
        if (mounted) {
          setMapData(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className={styles.screenPanel}>
      <HeaderRibbon
        snapshot={snapshot}
        subtitle={`${snapshot.summary.coveredRegions}省覆盖 / ${formatNumber(
          sumStatus(snapshot.regions, 'all'),
        )}条建设数据 / ${snapshot.summary.connectivityRate.toFixed(1)}%可计算连接`}
        title='天工数据库建设成果总览'
      />
      <div className={styles.overviewStage}>
        <div className={styles.overviewMetricsLeft}>
          <CountMetric
            icon='database'
            label='建设数据总量'
            unit='条'
            value={sumStatus(snapshot.regions, 'all')}
          />
          <CountMetric
            icon='location'
            label='覆盖省份'
            tone='blue'
            unit='个'
            value={snapshot.summary.coveredRegions}
          />
        </div>
        <div className={styles.overviewMapWrap} data-animate='map'>
          <div className={styles.mapHalo} />
          <ChinaStatusMap regions={snapshot.regions} statusKey='all' variant='overview' />
          <div className={styles.mapEnergyOverlay} aria-hidden='true'>
            <i className={styles.mapEnergyOrbit} />
          </div>
          <svg
            aria-hidden='true'
            className={styles.overviewHotspotLayer}
            viewBox={`0 0 ${overviewMapViewBox.width} ${overviewMapViewBox.height}`}
          >
            {overviewHotspotItems.map(({ centroid, region }) => (
              <g className={styles.overviewHotspotCallout} key={region.adcode}>
                <foreignObject
                  height={overviewHotspotLabelSize.height}
                  width={overviewHotspotLabelSize.width}
                  x={centroid[0]}
                  y={centroid[1] - overviewHotspotLabelSize.height / 2}
                >
                  <div className={styles.overviewHotspotLabel}>
                    <i />
                    <b>{region.shortName}</b>
                    <span>{formatNumber(getRegionTotal(region))}</span>
                  </div>
                </foreignObject>
              </g>
            ))}
          </svg>
          <div className={styles.overviewInsight}>
            <b>天工数据库底座已形成，支撑全生命周期核算应用</b>
            <span>
              <strong>{snapshot.summary.coveredRegions}</strong>省覆盖
            </span>
            <span>
              <strong>{formatNumber(sumStatus(snapshot.regions, 'all'))}</strong>条建设数据
            </span>
            <span>
              <strong>{snapshot.summary.connectivityRate.toFixed(1)}%</strong>可计算连接
            </span>
          </div>
        </div>
        <div className={styles.overviewMetricsRight}>
          <CountMetric
            icon='report'
            label='正式发布数据'
            tone='gold'
            unit='个'
            value={snapshot.summary.publishedDatasets}
          />
          <CountMetric
            icon='network'
            label='供应链连接完成度'
            tone='blue'
            unit='%'
            value={snapshot.summary.connectivityRate}
          />
        </div>
      </div>
      <div className={styles.storyline}>
        {snapshot.narrativeStages.map((stage) => {
          const metric = getNarrativeMetric(snapshot, stage.key);
          return (
            <div className={`${styles.storyItem} ${styles[`tone-${stage.tone}`]}`} key={stage.key}>
              <span>{stage.index}</span>
              <strong>{stage.title}</strong>
              <p>{stage.description}</p>
              <div className={styles.storyMetric}>
                <b>
                  {metric.value}
                  <em>{metric.unit}</em>
                </b>
                <small>{metric.label}</small>
              </div>
            </div>
          );
        })}
      </div>
      <ScreenNavigator activeScreen={activeScreen} onChange={onChangeScreen} />
    </section>
  );
}

function StatusSwitch({
  activeStatus,
  regions,
  onChange,
}: {
  activeStatus: StatusFilterKey;
  regions: RegionSnapshot[];
  onChange: (status: StatusFilterKey) => void;
}) {
  return (
    <div className={styles.statusSwitch}>
      {statusFilterKeys.map((statusKey) => (
        <button
          className={statusKey === activeStatus ? styles.statusSwitchActive : ''}
          key={statusKey}
          onClick={() => onChange(statusKey)}
          style={getStatusToneStyle(statusKey)}
          type='button'
        >
          <span>{dashboardStatusLabels[statusKey]}</span>
          <strong>{formatNumber(sumStatus(regions, statusKey))}</strong>
        </button>
      ))}
    </div>
  );
}

function RegionDetail({
  region,
  activeStatus,
}: {
  region?: RegionSnapshot;
  activeStatus: StatusFilterKey;
}) {
  if (!region) {
    return null;
  }
  const total = getRegionTotal(region);
  const activeValue = getRegionStatusValue(region, activeStatus);

  return (
    <aside className={styles.regionDetail}>
      <div className={styles.regionHero}>
        <span>地区状态明细</span>
        <strong>{region.shortName}</strong>
        <div>
          <p>当前状态</p>
          <b>{dashboardStatusLabels[activeStatus]}</b>
        </div>
        <div>
          <p>当前数量</p>
          <b>{formatNumber(activeValue)}</b>
        </div>
        <div>
          <p>全部数据</p>
          <b>{formatNumber(total)}</b>
        </div>
      </div>
      <div className={styles.regionStatusRows}>
        {dashboardStatusKeys.map((statusKey) => {
          const value = region.statusCounts[statusKey];
          const ratio = total > 0 ? (value / total) * 100 : 0;
          return (
            <div
              className={[
                styles.regionStatusRow,
                statusKey === activeStatus ? styles.regionStatusRowActive : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={statusKey}
              style={getStatusToneStyle(statusKey)}
            >
              <span>{dashboardStatusLabels[statusKey]}</span>
              <div>
                <i style={{ width: `${Math.max(ratio, 4)}%` }} />
              </div>
              <strong>{formatNumber(value)}</strong>
              <em>{ratio.toFixed(1)}%</em>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function MapStatusScreen({
  snapshot,
  activeScreen,
  onChangeScreen,
}: {
  snapshot: DashboardSnapshot;
  activeScreen: ScreenKey;
  onChangeScreen: (screen: ScreenKey) => void;
}) {
  const [activeStatus, setActiveStatus] = useState<StatusFilterKey>('reviewing');
  const [selectedAdcode, setSelectedAdcode] = useState(320000);
  const selectedRegion =
    snapshot.regions.find((region) => region.adcode === selectedAdcode) ??
    getTopRegion(snapshot.regions, activeStatus);
  const topRegion = getTopRegion(snapshot.regions, activeStatus);
  const nationalTotal = sumStatus(snapshot.regions, activeStatus);
  const maxStatusValue = Math.max(
    ...snapshot.regions.map((region) => getRegionStatusValue(region, activeStatus)),
  );
  const handleStatusChange = (status: StatusFilterKey) => {
    setActiveStatus(status);
    const nextTopRegion = getTopRegion(snapshot.regions, status);
    if (nextTopRegion) {
      setSelectedAdcode(nextTopRegion.adcode);
    }
  };

  return (
    <section className={styles.screenPanel} style={getStatusToneStyle(activeStatus)}>
      <HeaderRibbon
        snapshot={snapshot}
        subtitle='按数据生命周期状态查看各省份/地区建设进展'
        title='全国数据建设态势'
      />
      <StatusSwitch
        activeStatus={activeStatus}
        onChange={handleStatusChange}
        regions={snapshot.regions}
      />
      <div className={styles.mapStatusGrid}>
        <div className={styles.detailMapShell}>
          <ChinaStatusMap
            highlightAdcode={topRegion?.adcode}
            onSelectRegion={(region) => setSelectedAdcode(region.adcode)}
            regions={snapshot.regions}
            selectedAdcode={selectedRegion?.adcode}
            statusKey={activeStatus}
            variant='detail'
          />
          <div className={styles.mapLegend}>
            <strong>{dashboardStatusLabels[activeStatus]}数据量</strong>
            <div className={styles.legendRamp} />
            <div className={styles.legendScale}>
              <span>低</span>
              <span>高 {formatNumber(maxStatusValue)}</span>
            </div>
          </div>
        </div>
        <RegionDetail activeStatus={activeStatus} region={selectedRegion} />
      </div>
      <div className={styles.nationalStrip}>
        <div>
          <span>{dashboardStatusLabels[activeStatus]}全国总量</span>
          <strong>{formatNumber(nationalTotal)}</strong>
          <em>条</em>
        </div>
        <div>
          <span>覆盖省份</span>
          <strong>
            {snapshot.summary.coveredRegions}/{snapshot.summary.totalRegions}
          </strong>
          <em>个</em>
        </div>
        <div>
          <span>最高地区</span>
          <strong>{topRegion?.shortName ?? '-'}</strong>
          <em>
            {topRegion ? `${formatNumber(getRegionStatusValue(topRegion, activeStatus))} 条` : ''}
          </em>
        </div>
        <div>
          <span>数据截止</span>
          <strong>{snapshot.dataAsOf}</strong>
        </div>
      </div>
      <ScreenNavigator activeScreen={activeScreen} onChange={onChangeScreen} />
    </section>
  );
}

function MiniMetric({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: number;
  unit?: string;
  tone?: 'blue' | 'cyan' | 'gold' | 'amber';
}) {
  return (
    <div className={`${styles.miniMetric} ${styles[`tone-${tone ?? 'blue'}`]}`}>
      <span>{label}</span>
      <strong>
        {formatNumber(value)}
        {unit && <em>{unit}</em>}
      </strong>
    </div>
  );
}

function IndustryIcon({ item }: { item: IndustrySnapshot }) {
  return (
    <span className={styles.industryIcon} aria-hidden='true'>
      {item.icon.slice(0, 1).toUpperCase()}
    </span>
  );
}

function IndustryProgressRow({ index, item }: { index: number; item: IndustrySnapshot }) {
  const phases = [
    { key: 'sample', label: '样本沉淀', tone: 'blue' as const, value: item.sampleCount },
    { key: 'aggregation', label: '聚合处理', tone: 'cyan' as const, value: item.aggregationCount },
    { key: 'publication', label: '正式发布', tone: 'gold' as const, value: item.publicationCount },
  ];
  const phaseGridTemplate = phases
    .map((phase) => `${Math.max(Math.sqrt(phase.value), 4).toFixed(2)}fr`)
    .join(' ');

  return (
    <div
      className={`${styles.industryRow} ${index < 3 ? styles.industryRowLead : ''}`}
      style={{ '--completion': `${item.completionRate}%` } as CSSProperties}
    >
      <div className={styles.industryName}>
        <IndustryIcon item={item} />
        <div>
          <strong>{item.name}</strong>
          <small>发布 {formatNumber(item.publicationCount)}</small>
        </div>
      </div>
      <div
        aria-label={`${item.name}发布流水线：样本 ${formatNumber(
          item.sampleCount,
        )}，聚合 ${formatNumber(item.aggregationCount)}，发布 ${formatNumber(
          item.publicationCount,
        )}`}
        className={styles.phaseCells}
        style={{ gridTemplateColumns: phaseGridTemplate }}
      >
        {phases.map((phase, phaseIndex) => (
          <div
            className={[
              styles.phaseCell,
              styles[`tone-${phase.tone}`],
              phaseIndex < 2 || item.completionRate >= 88 ? styles.phaseCellDone : '',
            ]
              .filter(Boolean)
              .join(' ')}
            key={phase.key}
          >
            <i />
          </div>
        ))}
      </div>
      <div className={styles.industryCompletion}>
        <span>{item.qualityMark}</span>
        <strong>{item.completionRate}%</strong>
        <i />
      </div>
    </div>
  );
}

function OutcomeMetricsScreen({
  snapshot,
  activeScreen,
  onChangeScreen,
}: {
  snapshot: DashboardSnapshot;
  activeScreen: ScreenKey;
  onChangeScreen: (screen: ScreenKey) => void;
}) {
  const featuredIndustries = snapshot.outcome.industries.slice(0, 4);
  const remainingIndustries = snapshot.outcome.industries.slice(4);
  const remainingOutputCount = remainingIndustries.reduce(
    (total, item) => total + item.sampleCount + item.aggregationCount + item.publicationCount,
    0,
  );
  const remainingAverageCompletion =
    remainingIndustries.length > 0
      ? Math.round(
          remainingIndustries.reduce((total, item) => total + item.completionRate, 0) /
            remainingIndustries.length,
        )
      : 0;

  return (
    <section className={styles.screenPanel}>
      <HeaderRibbon
        snapshot={snapshot}
        subtitle='天工数据库建设成果总览'
        title='建设成果与发布成果'
      />
      <div className={styles.outcomeTopGrid}>
        <div className={styles.metricCluster}>
          <h2>建设成果</h2>
          {snapshot.outcome.constructionMetrics.map(({ key, ...metric }) => (
            <MiniMetric key={key} {...metric} />
          ))}
        </div>
        <div className={styles.outcomeHero}>
          <span>累计建设成果</span>
          <strong>{formatNumber(snapshot.outcome.totalOutputs)}</strong>
          <p>样本库与正式发布结果合计</p>
        </div>
        <div className={`${styles.metricCluster} ${styles.publicationCluster}`}>
          <h2>发布成果</h2>
          {snapshot.outcome.publicationMetrics.map(({ key, ...metric }) => (
            <MiniMetric key={key} {...metric} />
          ))}
        </div>
      </div>
      <div className={styles.industryBoard}>
        <div className={styles.boardHeader}>
          <strong>重点行业成果发布流水线</strong>
          <div className={styles.phaseHeaderLabels}>
            <span>样本沉淀</span>
            <span>聚合处理</span>
            <span>正式发布</span>
          </div>
          <span>完成度</span>
        </div>
        {featuredIndustries.map((item, index) => (
          <IndustryProgressRow index={index} item={item} key={item.key} />
        ))}
        {remainingIndustries.length > 0 && (
          <div className={styles.industrySummaryRow}>
            <span>其余重点行业</span>
            <strong>{remainingIndustries.map((item) => item.name).join(' / ')}</strong>
            <em>{formatNumber(remainingOutputCount)} 个成果</em>
            <b>{remainingAverageCompletion}% 平均完成度</b>
          </div>
        )}
      </div>
      <ScreenNavigator activeScreen={activeScreen} onChange={onChangeScreen} />
    </section>
  );
}

type AggregatedMatrixTile = {
  column: number;
  connected: number;
  density: number;
  dominantGroup: string;
  empty: number;
  pathCount: number;
  row: number;
  sourceColumnEnd: number;
  sourceColumnStart: number;
  sourceRowEnd: number;
  sourceRowStart: number;
  total: number;
  unmatched: number;
  unmatchedRate: number;
};

type MatrixAxisGroup = {
  end: number;
  key: string;
  label: string;
  start: number;
  tone: 'blue' | 'cyan' | 'gold';
};

type AggregatedMatrixSnapshot = {
  columnGroups: MatrixAxisGroup[];
  connectionBands: {
    key: string;
    points: { column: number; row: number }[];
    tone: 'blue' | 'cyan' | 'gold';
  }[];
  rowGroups: MatrixAxisGroup[];
  tiles: AggregatedMatrixTile[];
};

const MATRIX_TILE_COUNT = 100;
const MATRIX_CANVAS_WIDTH = 1160;
const MATRIX_CANVAS_HEIGHT = 650;
const MATRIX_LAYOUT = {
  cellHeight: 4.25,
  cellWidth: 7.15,
  left: 68,
  skewX: 2.62,
  top: 104,
};

const matrixRowGroups: MatrixAxisGroup[] = [
  { end: 15, key: 'steel', label: '钢铁', start: 0, tone: 'blue' },
  { end: 31, key: 'power', label: '电力', start: 16, tone: 'cyan' },
  { end: 47, key: 'cement', label: '水泥', start: 32, tone: 'blue' },
  { end: 65, key: 'chemical', label: '化工', start: 48, tone: 'blue' },
  { end: 82, key: 'transport', label: '交通', start: 66, tone: 'cyan' },
  { end: 99, key: 'building', label: '建材', start: 83, tone: 'blue' },
];

const matrixColumnGroups: MatrixAxisGroup[] = [
  { end: 13, key: 'energy', label: '能源', start: 0, tone: 'cyan' },
  { end: 29, key: 'material', label: '原材料', start: 14, tone: 'blue' },
  { end: 47, key: 'process', label: '制造过程', start: 30, tone: 'blue' },
  { end: 64, key: 'logistics', label: '运输', start: 48, tone: 'cyan' },
  { end: 81, key: 'waste', label: '废弃处理', start: 65, tone: 'blue' },
  { end: 99, key: 'factor', label: '区域因子', start: 82, tone: 'cyan' },
];

const matrixConnectionBands: AggregatedMatrixSnapshot['connectionBands'] = [
  {
    key: 'energy-manufacturing',
    points: [
      { column: 12, row: 18 },
      { column: 34, row: 26 },
      { column: 52, row: 42 },
      { column: 70, row: 54 },
    ],
    tone: 'cyan',
  },
  {
    key: 'material-building',
    points: [
      { column: 18, row: 34 },
      { column: 38, row: 48 },
      { column: 58, row: 62 },
      { column: 77, row: 78 },
    ],
    tone: 'blue',
  },
  {
    key: 'transport-region',
    points: [
      { column: 51, row: 67 },
      { column: 66, row: 72 },
      { column: 82, row: 78 },
      { column: 93, row: 84 },
    ],
    tone: 'cyan',
  },
  {
    key: 'regional-factor',
    points: [
      { column: 62, row: 18 },
      { column: 74, row: 34 },
      { column: 86, row: 49 },
      { column: 95, row: 64 },
    ],
    tone: 'blue',
  },
];

const matrixDensityContours = [
  { column: 57, height: 96, row: 31, tone: 'cyan', width: 190 },
  { column: 33, height: 80, row: 72, tone: 'blue', width: 158 },
  { column: 77, height: 66, row: 18, tone: 'cyan', width: 136 },
] as const;
const matrixZoneBadges = [
  { key: 'closed-process', label: '闭合高地', left: '50%', top: '36%', tone: 'cyan' },
  { key: 'closed-factor', label: '天工数据库闭合带', left: '70%', top: '58%', tone: 'cyan' },
  { key: 'gap-provider-a', label: 'provider 缺口 A', left: '31%', top: '63%', tone: 'gold' },
  { key: 'gap-provider-b', label: 'provider 缺口 B', left: '80%', top: '27%', tone: 'gold' },
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function interpolateColor(low: number, high: number, ratio: number): number {
  const lowR = (low >> 16) & 255;
  const lowG = (low >> 8) & 255;
  const lowB = low & 255;
  const highR = (high >> 16) & 255;
  const highG = (high >> 8) & 255;
  const highB = high & 255;
  const nextR = Math.round(lowR + (highR - lowR) * ratio);
  const nextG = Math.round(lowG + (highG - lowG) * ratio);
  const nextB = Math.round(lowB + (highB - lowB) * ratio);
  return (nextR << 16) + (nextG << 8) + nextB;
}

function getMatrixGroupLabel(groups: MatrixAxisGroup[], index: number): string {
  return groups.find((group) => index >= group.start && index <= group.end)?.label ?? '未分组';
}

function sourcePointToTile(
  point: { column: number; row: number },
  matrix: MatrixSnapshot,
): { column: number; row: number } {
  return {
    column: clamp(
      Math.round(((point.column - 1) / Math.max(matrix.columns - 1, 1)) * (MATRIX_TILE_COUNT - 1)),
      0,
      MATRIX_TILE_COUNT - 1,
    ),
    row: clamp(
      Math.round(((point.row - 1) / Math.max(matrix.rows - 1, 1)) * (MATRIX_TILE_COUNT - 1)),
      0,
      MATRIX_TILE_COUNT - 1,
    ),
  };
}

function getMatrixTilePoint(row: number, column: number) {
  return {
    x: MATRIX_LAYOUT.left + column * MATRIX_LAYOUT.cellWidth + row * MATRIX_LAYOUT.skewX,
    y: MATRIX_LAYOUT.top + row * MATRIX_LAYOUT.cellHeight,
  };
}

function getPointSegmentDistance(
  point: { column: number; row: number },
  start: { column: number; row: number },
  end: { column: number; row: number },
): number {
  const dx = end.column - start.column;
  const dy = end.row - start.row;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return Math.hypot(point.column - start.column, point.row - start.row);
  }
  const t = clamp(
    ((point.column - start.column) * dx + (point.row - start.row) * dy) / lengthSquared,
    0,
    1,
  );
  return Math.hypot(point.column - (start.column + dx * t), point.row - (start.row + dy * t));
}

function buildAggregatedMatrixSnapshot(matrix: MatrixSnapshot): AggregatedMatrixSnapshot {
  const unmatchedHotspots = matrix.unmatchedCells.map((cell) => sourcePointToTile(cell, matrix));
  const targetClosureRatio = matrix.connectedRatio;
  const tiles: AggregatedMatrixTile[] = [];

  for (let row = 0; row < MATRIX_TILE_COUNT; row += 1) {
    for (let column = 0; column < MATRIX_TILE_COUNT; column += 1) {
      const rowNorm = row / (MATRIX_TILE_COUNT - 1);
      const columnNorm = column / (MATRIX_TILE_COUNT - 1);
      const sourceRowStart = Math.floor((row / MATRIX_TILE_COUNT) * matrix.rows) + 1;
      const sourceRowEnd = Math.max(
        sourceRowStart,
        Math.floor(((row + 1) / MATRIX_TILE_COUNT) * matrix.rows),
      );
      const sourceColumnStart = Math.floor((column / MATRIX_TILE_COUNT) * matrix.columns) + 1;
      const sourceColumnEnd = Math.max(
        sourceColumnStart,
        Math.floor(((column + 1) / MATRIX_TILE_COUNT) * matrix.columns),
      );
      const total = (sourceRowEnd - sourceRowStart + 1) * (sourceColumnEnd - sourceColumnStart + 1);
      const terrain =
        Math.sin(rowNorm * Math.PI * 3.1) * 0.055 +
        Math.cos(columnNorm * Math.PI * 4.2) * 0.045 +
        Math.sin((rowNorm + columnNorm) * Math.PI * 2.5) * 0.035;
      const closedRidge =
        Math.exp(-((row - 31) ** 2 + (column - 56) ** 2) / 620) * 0.18 +
        Math.exp(-((row - 72) ** 2 + (column - 34) ** 2) / 520) * 0.13 +
        Math.exp(-((row - 20) ** 2 + (column - 77) ** 2) / 420) * 0.11;
      let gapField =
        Math.exp(-((row - 58) ** 2 + (column - 22) ** 2) / 230) * 0.22 +
        Math.exp(-((row - 84) ** 2 + (column - 73) ** 2) / 260) * 0.18 +
        Math.exp(-((row - 12) ** 2 + (column - 43) ** 2) / 280) * 0.12;

      unmatchedHotspots.forEach((hotspot) => {
        const distanceSquared = (row - hotspot.row) ** 2 + (column - hotspot.column) ** 2;
        gapField += Math.exp(-distanceSquared / 38) * 0.4;
      });

      const pathCount = matrixConnectionBands.reduce((totalCount, band) => {
        const segmentCount = band.points.slice(1).reduce((count, point, index) => {
          const distance = getPointSegmentDistance({ column, row }, band.points[index], point);
          return distance <= 2.8 ? count + 1 : count;
        }, 0);
        return totalCount + segmentCount;
      }, 0);
      const density = clamp(
        targetClosureRatio + terrain + closedRidge + pathCount * 0.038 - gapField * 0.48,
        0.12,
        0.98,
      );
      const unmatchedRate = clamp(0.045 + gapField + (1 - targetClosureRatio) * 0.12, 0.02, 0.86);
      const connected = Math.round(total * density);
      const unmatched = Math.min(total - connected, Math.round(total * unmatchedRate));

      tiles.push({
        column,
        connected,
        density,
        dominantGroup: `${getMatrixGroupLabel(matrixRowGroups, row)} / ${getMatrixGroupLabel(matrixColumnGroups, column)}`,
        empty: Math.max(0, total - connected - unmatched),
        pathCount,
        row,
        sourceColumnEnd,
        sourceColumnStart,
        sourceRowEnd,
        sourceRowStart,
        total,
        unmatched,
        unmatchedRate: clamp(unmatchedRate, 0, 0.62),
      });
    }
  }

  return {
    columnGroups: matrixColumnGroups,
    connectionBands: matrixConnectionBands,
    rowGroups: matrixRowGroups,
    tiles,
  };
}

function getAggregatedTileColor(tile: AggregatedMatrixTile): number {
  const densityColor = interpolateColor(
    0x09274a,
    0x22ecff,
    clamp((tile.density - 0.2) / 0.68, 0, 1),
  );
  if (tile.unmatchedRate > 0.28) {
    return interpolateColor(
      densityColor,
      0xffb342,
      clamp((tile.unmatchedRate - 0.18) * 1.55, 0, 0.78),
    );
  }
  if (tile.pathCount > 0) {
    return interpolateColor(densityColor, 0x3d8cff, 0.38);
  }
  return densityColor;
}

function isDailyNewTile(tile: AggregatedMatrixTile): boolean {
  return tile.density > 0.76 && (tile.row * 29 + tile.column * 17) % 211 === 0;
}

function getMatrixToneColor(tone: MatrixAxisGroup['tone']): number {
  if (tone === 'gold') {
    return 0xf0a52b;
  }
  if (tone === 'blue') {
    return 0x1c66e5;
  }
  return 0x13c5d8;
}

function ConnectivityMatrix({ connectivity }: { connectivity: ConnectivitySnapshot }) {
  const { closure, matrix, quality } = connectivity;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [hoveredTile, setHoveredTile] = useState<
    (AggregatedMatrixTile & { left: number; top: number }) | null
  >(null);
  const aggregatedMatrix = useMemo(() => buildAggregatedMatrixSnapshot(matrix), [matrix]);
  const tileMap = useMemo(() => {
    return new Map(
      aggregatedMatrix.tiles.map((tile) => [`${tile.row}:${tile.column}`, tile] as const),
    );
  }, [aggregatedMatrix.tiles]);
  const matrixRate = closure.writePct;

  useEffect(() => {
    const hostElement = hostRef.current;
    if (!hostElement) {
      return undefined;
    }

    let application: Application | null = null;
    let destroyed = false;

    const mount = async () => {
      const app = new Application();
      await app.init({
        antialias: true,
        autoDensity: true,
        backgroundAlpha: 0,
        height: 650,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        width: 1160,
      });

      if (destroyed) {
        app.destroy(true);
        return;
      }

      application = app;
      hostElement.appendChild(app.canvas);

      const backgroundLayer = new Container();
      const groupLayer = new Container();
      const tileLayer = new Container();
      const contourLayer = new Container();
      const bandLayer = new Container();
      const changeLayer = new Container();
      const pulseLayer = new Container();
      app.stage.addChild(backgroundLayer);
      app.stage.addChild(groupLayer);
      app.stage.addChild(tileLayer);
      app.stage.addChild(contourLayer);
      app.stage.addChild(bandLayer);
      app.stage.addChild(changeLayer);
      app.stage.addChild(pulseLayer);

      const plateTopLeft = getMatrixTilePoint(0, 0);
      const plateTopRight = getMatrixTilePoint(0, MATRIX_TILE_COUNT - 1);
      const plateBottomLeft = getMatrixTilePoint(MATRIX_TILE_COUNT - 1, 0);
      const plateBottomRight = getMatrixTilePoint(MATRIX_TILE_COUNT - 1, MATRIX_TILE_COUNT - 1);
      const plate = new Graphics();
      plate
        .poly([
          plateTopLeft.x - 20,
          plateTopLeft.y - 18,
          plateTopRight.x + MATRIX_LAYOUT.cellWidth + 28,
          plateTopRight.y - 18,
          plateBottomRight.x + MATRIX_LAYOUT.cellWidth + 38,
          plateBottomRight.y + MATRIX_LAYOUT.cellHeight + 34,
          plateBottomLeft.x - 32,
          plateBottomLeft.y + MATRIX_LAYOUT.cellHeight + 34,
        ])
        .fill({ alpha: 0.24, color: 0xeaf7ff })
        .stroke({ alpha: 0.26, color: 0x6fa9ea, width: 2 });
      backgroundLayer.addChild(plate);

      const groups = new Graphics();
      aggregatedMatrix.columnGroups.forEach((group) => {
        const startTop = getMatrixTilePoint(0, group.start);
        const startBottom = getMatrixTilePoint(MATRIX_TILE_COUNT - 1, group.start);
        groups.moveTo(startTop.x - 5, startTop.y - 12);
        groups.lineTo(startBottom.x - 5, startBottom.y + 12);
      });
      aggregatedMatrix.rowGroups.forEach((group) => {
        const startLeft = getMatrixTilePoint(group.start, 0);
        const startRight = getMatrixTilePoint(group.start, MATRIX_TILE_COUNT - 1);
        groups.moveTo(startLeft.x - 16, startLeft.y - 2);
        groups.lineTo(startRight.x + MATRIX_LAYOUT.cellWidth + 18, startRight.y - 2);
      });
      groups.stroke({ alpha: 0.18, color: 0x0849c8, width: 1.4 });
      groupLayer.addChild(groups);

      const tiles = new Graphics();
      aggregatedMatrix.tiles.forEach((tile) => {
        const point = getMatrixTilePoint(tile.row, tile.column);
        const densityAlpha =
          0.12 + clamp((tile.density - 0.46) / 0.54, 0, 1) * 0.7 + tile.pathCount * 0.12;
        tiles
          .rect(point.x, point.y, MATRIX_LAYOUT.cellWidth - 0.65, MATRIX_LAYOUT.cellHeight - 0.45)
          .fill({
            alpha: clamp(densityAlpha + tile.unmatchedRate * 0.32, 0.16, 0.94),
            color: getAggregatedTileColor(tile),
          });
      });
      tileLayer.addChild(tiles);

      const contours = new Graphics();
      matrixDensityContours.forEach((contour) => {
        const color = getMatrixToneColor(contour.tone);
        const point = getMatrixTilePoint(contour.row, contour.column);
        [1, 0.66, 0.38].forEach((scale, index) => {
          contours
            .ellipse(
              point.x + MATRIX_LAYOUT.cellWidth / 2,
              point.y + MATRIX_LAYOUT.cellHeight / 2,
              contour.width * scale,
              contour.height * scale,
            )
            .stroke({ alpha: 0.18 + index * 0.05, color, width: index === 0 ? 1.4 : 1 });
        });
      });
      contourLayer.addChild(contours);

      const bandScreenPoints = aggregatedMatrix.connectionBands.map((band) => ({
        ...band,
        points: band.points.map((point) => {
          const screenPoint = getMatrixTilePoint(point.row, point.column);
          return {
            x: screenPoint.x + MATRIX_LAYOUT.cellWidth / 2,
            y: screenPoint.y + MATRIX_LAYOUT.cellHeight / 2,
          };
        }),
      }));

      bandScreenPoints.forEach((band) => {
        const underlay = new Graphics();
        const core = new Graphics();
        const color = getMatrixToneColor(band.tone);
        band.points.forEach((point, index) => {
          if (index === 0) {
            underlay.moveTo(point.x, point.y);
            core.moveTo(point.x, point.y);
          } else {
            underlay.lineTo(point.x, point.y);
            core.lineTo(point.x, point.y);
          }
        });
        underlay.stroke({ alpha: band.tone === 'gold' ? 0.2 : 0.17, color, width: 48 });
        core.stroke({ alpha: band.tone === 'gold' ? 0.22 : 0.2, color, width: 16 });
        bandLayer.addChild(underlay);
        bandLayer.addChild(core);
      });

      const newTiles = aggregatedMatrix.tiles.filter(isDailyNewTile);
      const drawDailyChanges = (time: number) => {
        changeLayer.removeChildren();
        newTiles.forEach((tile, index) => {
          const point = getMatrixTilePoint(tile.row, tile.column);
          const pulse = 0.55 + Math.sin(time / 440 + index * 0.36) * 0.3;
          const marker = new Graphics();
          marker
            .rect(point.x + 1.6, point.y + 0.7, 3.2, 3.2)
            .fill({ alpha: 0.52 + pulse * 0.32, color: 0x18c887 });
          changeLayer.addChild(marker);
        });
      };

      const hotspots = matrix.unmatchedCells.map((cell) => sourcePointToTile(cell, matrix));
      const drawHotspots = (time: number) => {
        pulseLayer.removeChildren();
        hotspots.forEach((hotspot, index) => {
          const point = getMatrixTilePoint(hotspot.row, hotspot.column);
          const pulse = 0.65 + Math.sin(time / 320 + index * 0.8) * 0.35;
          const centerX = point.x + MATRIX_LAYOUT.cellWidth / 2;
          const centerY = point.y + MATRIX_LAYOUT.cellHeight / 2;
          const size = 17 + pulse * 5;
          const corner = 8;
          const hotspotGraphic = new Graphics();
          hotspotGraphic
            .moveTo(centerX - size, centerY - size + corner)
            .lineTo(centerX - size, centerY - size)
            .lineTo(centerX - size + corner, centerY - size)
            .moveTo(centerX + size - corner, centerY - size)
            .lineTo(centerX + size, centerY - size)
            .lineTo(centerX + size, centerY - size + corner)
            .moveTo(centerX + size, centerY + size - corner)
            .lineTo(centerX + size, centerY + size)
            .lineTo(centerX + size - corner, centerY + size)
            .moveTo(centerX - size + corner, centerY + size)
            .lineTo(centerX - size, centerY + size)
            .lineTo(centerX - size, centerY + size - corner)
            .stroke({ alpha: 0.58 + pulse * 0.18, color: 0xf0a52b, width: 3 })
            .moveTo(centerX - 7, centerY - 7)
            .lineTo(centerX + 7, centerY + 7)
            .moveTo(centerX + 7, centerY - 7)
            .lineTo(centerX - 7, centerY + 7)
            .stroke({ alpha: 0.46, color: 0xf0a52b, width: 2 });
          pulseLayer.addChild(hotspotGraphic);
        });
      };

      app.ticker.add((ticker) => {
        const time = ticker.lastTime;
        const pulse = 0.72 + Math.sin(time / 720) * 0.1;
        bandLayer.alpha = pulse;
        contourLayer.alpha = 0.72 + Math.sin(time / 880) * 0.12;
        drawHotspots(time);
        drawDailyChanges(time);
      });
    };

    mount();

    return () => {
      destroyed = true;
      application?.destroy(true, { children: true });
      hostElement.innerHTML = '';
    };
  }, [aggregatedMatrix, matrix]);

  const handleMatrixHover = (event: ReactMouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const internalX = ((event.clientX - bounds.left) / bounds.width) * MATRIX_CANVAS_WIDTH;
    const internalY = ((event.clientY - bounds.top) / bounds.height) * MATRIX_CANVAS_HEIGHT;
    const row = Math.round((internalY - MATRIX_LAYOUT.top) / MATRIX_LAYOUT.cellHeight);
    const column = Math.round(
      (internalX - MATRIX_LAYOUT.left - row * MATRIX_LAYOUT.skewX) / MATRIX_LAYOUT.cellWidth,
    );

    if (row < 0 || row >= MATRIX_TILE_COUNT || column < 0 || column >= MATRIX_TILE_COUNT) {
      setHoveredTile(null);
      return;
    }

    const tile = tileMap.get(`${row}:${column}`);
    if (!tile) {
      setHoveredTile(null);
      return;
    }

    setHoveredTile({
      ...tile,
      left: clamp(event.clientX - bounds.left + 24, 18, bounds.width - 288),
      top: clamp(event.clientY - bounds.top - 56, 18, bounds.height - 164),
    });
  };

  return (
    <div className={styles.matrixCanvas}>
      <div className={styles.matrixHeader}>
        <div>
          <div className={styles.matrixTitle}>供应链闭合度地形图</div>
          <div className={styles.matrixInsight}>
            青蓝区域代表已写入 A 矩阵的闭合连接，金色热区代表 no provider 断裂缺口
          </div>
        </div>
        <div className={styles.matrixSpotlight}>
          <span>
            <strong>{matrixRate.toFixed(2)}%</strong> 闭合率
          </span>
          <span>
            <strong>{formatNumber(closure.writtenEdges)}</strong> 已闭合
          </span>
          <span>
            <strong>{formatNumber(closure.noProviderEdges)}</strong> 未闭合
          </span>
          <span>
            <strong>{closure.providerPresentResolvedPct.toFixed(0)}%</strong> 规则解析
          </span>
        </div>
      </div>
      <div
        className={styles.matrixHost}
        onMouseLeave={() => setHoveredTile(null)}
        onMouseMove={handleMatrixHover}
        ref={hostRef}
      >
        <div className={styles.matrixAxisTop}>
          {aggregatedMatrix.columnGroups.map((group) => (
            <span className={styles[`tone-${group.tone}`]} key={group.key}>
              {group.label}
            </span>
          ))}
        </div>
        <div className={styles.matrixAxisSide}>
          {aggregatedMatrix.rowGroups.map((group) => (
            <span className={styles[`tone-${group.tone}`]} key={group.key}>
              {group.label}
            </span>
          ))}
        </div>
        <div className={styles.matrixZoneBadges} aria-hidden='true'>
          {matrixZoneBadges.map((badge) => (
            <span
              className={styles[`tone-${badge.tone}`]}
              key={badge.key}
              style={{ left: badge.left, top: badge.top }}
            >
              {badge.label}
            </span>
          ))}
        </div>
        {hoveredTile && (
          <div
            className={styles.matrixHoverTooltip}
            style={{ left: hoveredTile.left, top: hoveredTile.top }}
          >
            <strong>{hoveredTile.dominantGroup}</strong>
            <span>
              映射区间：行 {formatNumber(hoveredTile.sourceRowStart)}-
              {formatNumber(hoveredTile.sourceRowEnd)} / 列
              {formatNumber(hoveredTile.sourceColumnStart)}-
              {formatNumber(hoveredTile.sourceColumnEnd)}
            </span>
            <div>
              <b>{Math.round(hoveredTile.density * 100)}%</b>
              <em>闭合强度</em>
              <b>{Math.round(hoveredTile.unmatchedRate * 100)}%</b>
              <em>断裂缺口</em>
            </div>
            <small>
              {formatNumber(hoveredTile.connected)} 已闭合 / {formatNumber(hoveredTile.unmatched)}{' '}
              未闭合
            </small>
          </div>
        )}
      </div>
      <div className={styles.matrixQualityStrip}>
        <span>
          供应量拆分 <strong>{quality.splitByProcessVolumePct.toFixed(2)}%</strong>
        </span>
        <span>
          数量兜底 <strong>{quality.volumeFallbackToOnePct.toFixed(0)}%</strong>
        </span>
        <span>
          本地因子 <strong>{quality.localSubnationalPct.toFixed(2)}%</strong>
        </span>
        <span>
          同国匹配 <strong>{quality.sameCountryPct.toFixed(2)}%</strong>
        </span>
        <span>
          风险 <strong>{quality.singularRiskLevel.toUpperCase()}</strong>
        </span>
      </div>
      <div className={styles.matrixLegend}>
        <span>
          <i className={styles.legendConnected} /> 已闭合连接
        </span>
        <span>
          <i className={styles.legendUnmatched} /> 未闭合缺口
        </span>
        <span>
          <i className={styles.legendBand} /> 闭合高地
        </span>
        <span>
          <i className={styles.legendNew} /> 本轮增量
        </span>
        <span>
          <i className={styles.legendEmpty} /> 低密度背景
        </span>
      </div>
    </div>
  );
}

function ConnectivityScreen({
  snapshot,
  activeScreen,
  onChangeScreen,
}: {
  snapshot: DashboardSnapshot;
  activeScreen: ScreenKey;
  onChangeScreen: (screen: ScreenKey) => void;
}) {
  return (
    <section className={styles.screenPanel}>
      <HeaderRibbon
        snapshot={snapshot}
        subtitle='过程输入输出匹配成熟度总览'
        title='供应链连接与可计算性'
      />
      <div className={styles.connectivityGrid}>
        <aside className={styles.connectivitySummary}>
          <span>供应链闭合率</span>
          <strong>
            {snapshot.connectivity.closure.writePct.toFixed(2)}
            <em>%</em>
          </strong>
          <p>A 矩阵已写入连接 / input edge 总量</p>
          <div>
            <MiniMetric
              label='已闭合连接'
              tone='blue'
              unit='条'
              value={snapshot.connectivity.closure.writtenEdges}
            />
            <MiniMetric
              label='未闭合连接'
              tone='amber'
              unit='条'
              value={snapshot.connectivity.closure.noProviderEdges}
            />
            <MiniMetric
              label='有 provider 解析率'
              tone='cyan'
              unit='%'
              value={snapshot.connectivity.closure.providerPresentResolvedPct}
            />
          </div>
          <div className={styles.gapQueue}>
            <h3>缺口优先级</h3>
            {snapshot.connectivity.gaps.topFlows.slice(0, 4).map((gap) => (
              <div key={gap.flow}>
                <span>{gap.flow}</span>
                <strong>{formatNumber(gap.count)}</strong>
                <em>{gap.category}</em>
              </div>
            ))}
          </div>
        </aside>
        <ConnectivityMatrix connectivity={snapshot.connectivity} />
      </div>
      <ScreenNavigator activeScreen={activeScreen} onChange={onChangeScreen} />
    </section>
  );
}

function FlowTopologySearchResult({
  flow,
  isSelected,
  onSelect,
}: {
  flow: FlowTable;
  isSelected: boolean;
  onSelect: (flow: FlowTable) => void;
}) {
  return (
    <button
      className={`${styles.flowTopologyResult} ${isSelected ? styles.flowTopologyResultActive : ''}`}
      disabled={!isTopologyEligibleFlow(flow)}
      onClick={() => onSelect(flow)}
      type='button'
    >
      <span>{getFlowTopologyFlowTypeLabel(flow.flowType)}</span>
      <strong>{flow.name}</strong>
      <small>{flow.classification || '未分类'}</small>
      <em>
        {flow.id} / {flow.version}
      </em>
    </button>
  );
}

function FlowTopologySearchLoading() {
  return (
    <div aria-live='polite' className={styles.flowTopologySearchLoading} role='status'>
      <div className={styles.flowTopologySearchLoadingCore} aria-hidden='true'>
        <i />
        <i />
        <i />
      </div>
      <strong>智能推荐中</strong>
      <span>正在锁定非基础流候选</span>
      <div className={styles.flowTopologySearchLoadingBars} aria-hidden='true'>
        {Array.from({ length: 18 }, (_, index) => (
          <i key={index} style={{ '--bar-index': index } as CSSProperties} />
        ))}
      </div>
      <div className={styles.flowTopologySearchLoadingRows} aria-hidden='true'>
        {Array.from({ length: 4 }, (_, index) => (
          <i key={index} style={{ '--row-index': index } as CSSProperties} />
        ))}
      </div>
    </div>
  );
}

function FlowTopologySearchEmpty() {
  return (
    <div className={styles.flowTopologyEmpty}>
      <div className={styles.flowTopologyEmptyRadar} aria-hidden='true'>
        <i />
        <i />
        <i />
        <span />
      </div>
      <strong>未命中拓扑候选</strong>
      <span>NO TOPOLOGY SIGNAL</span>
      <div className={styles.flowTopologyEmptyNodes} aria-hidden='true'>
        {Array.from({ length: 9 }, (_, index) => (
          <i key={index} style={{ '--empty-node-index': index } as CSSProperties} />
        ))}
      </div>
      <div className={styles.flowTopologyEmptyBars} aria-hidden='true'>
        {Array.from({ length: 14 }, (_, index) => (
          <i key={index} style={{ '--empty-bar-index': index } as CSSProperties} />
        ))}
      </div>
    </div>
  );
}

function getFlowTopologyViewLabel(viewMode: FlowTopologyViewMode) {
  if (viewMode === 'provider') {
    return '输出引用';
  }
  if (viewMode === 'consumer') {
    return '输入引用';
  }
  if (viewMode === 'process') {
    return '过程清单';
  }
  return '供需概览';
}

function getFlowTopologyListTitle(selectedItem: FlowTopologyLayoutItem | undefined) {
  if (!selectedItem) {
    return '全部过程';
  }
  if (selectedItem.kind === 'cluster') {
    return selectedItem.category;
  }
  return selectedItem.node.name;
}

const FlowTopologyClusterButton = memo(function FlowTopologyClusterButton({
  index,
  isActive,
  item,
  onActivate,
  onClearHover,
  onHover,
}: {
  index: number;
  isActive: boolean;
  item: FlowTopologyClusterLayoutItem;
  onActivate: (itemId: string) => void;
  onClearHover: () => void;
  onHover: (itemId: string) => void;
}) {
  const handleHover = () => onHover(item.id);

  return (
    <button
      aria-label={`${item.category}，${formatNumber(item.processCount)} 个过程，${getFlowTopologyRelationLabel(item.relation)}`}
      aria-pressed={isActive}
      className={[
        styles.flowTopologyClusterNode,
        styles.flowTopologyBasinNode,
        item.relation === 'provider' ? styles.flowTopologyNodeProvider : '',
        item.relation === 'consumer' ? styles.flowTopologyNodeConsumer : '',
        item.relation === 'both' ? styles.flowTopologyNodeBoth : '',
        item.side === 'left' ? styles.flowTopologyNodeLeft : styles.flowTopologyNodeRight,
        isActive ? styles.flowTopologyNodeActive : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onBlur={onClearHover}
      onClick={() => onActivate(item.id)}
      onFocus={handleHover}
      onMouseEnter={handleHover}
      onMouseLeave={onClearHover}
      style={
        {
          '--node-delay': `${0.12 + index * 0.06}s`,
          '--node-x': `${item.x}%`,
          '--node-y': `${item.y}%`,
        } as CSSProperties
      }
      title={item.category}
      type='button'
    >
      <i aria-hidden='true' className={styles.flowTopologyProcessAnchor} />
      <span>{item.side === 'left' ? '输出引用' : '输入引用'}</span>
      <strong>{item.category}</strong>
      <em>
        <b>{formatNumber(item.processCount)}</b> 个过程
      </em>
      <small>
        {formatNumber(item.referenceCount)} 条引用 / {(item.share * 100).toFixed(0)}%
      </small>
    </button>
  );
});

const FlowTopologyProcessRow = memo(function FlowTopologyProcessRow({
  isActive,
  item,
  onActivate,
  onClearHover,
  onHover,
}: {
  isActive: boolean;
  item: FlowTopologyProcessListItem;
  onActivate: (itemId: string) => void;
  onClearHover: () => void;
  onHover: (itemId: string) => void;
}) {
  const handleHover = () => onHover(item.id);
  const primaryEdge = item.edges[0];

  return (
    <button
      className={[
        styles.flowTopologyProcessRow,
        item.relation === 'provider' ? styles.flowTopologyNodeProvider : '',
        item.relation === 'consumer' ? styles.flowTopologyNodeConsumer : '',
        item.relation === 'both' ? styles.flowTopologyNodeBoth : '',
        isActive ? styles.flowTopologyProcessRowActive : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`${item.node.name}，${getFlowTopologyRelationLabel(item.relation)}`}
      aria-pressed={isActive}
      onBlur={onClearHover}
      onClick={() => onActivate(item.id)}
      onFocus={handleHover}
      onMouseEnter={handleHover}
      onMouseLeave={onClearHover}
      title={item.node.name}
      type='button'
    >
      <span>{getFlowTopologyRelationLabel(item.relation)}</span>
      <strong>{item.node.name}</strong>
      <small>{item.category}</small>
      <em>{item.node.location ?? '-'}</em>
      <b>{getFlowTopologyAmountLabel(item.edges, 'meanAmount')}</b>
      <b>{getFlowTopologyAmountLabel(item.edges, 'resultingAmount')}</b>
      <i>{getFlowTopologyDataDerivationTypeStatusLabel(primaryEdge?.dataDerivationTypeStatus)}</i>
    </button>
  );
});

function FlowTopologyGraph({ topology }: { topology: FlowTopologySnapshot }) {
  const [hoveredClusterId, setHoveredClusterId] = useState<string | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [hoveredProcessId, setHoveredProcessId] = useState<string | null>(null);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const layoutItems = useMemo(() => getFlowTopologyLayout(topology, 'overview'), [topology]);
  const clusterItems = useMemo(
    () =>
      layoutItems.filter((item): item is FlowTopologyClusterLayoutItem => item.kind === 'cluster'),
    [layoutItems],
  );
  const processItems = useMemo(
    () =>
      layoutItems.filter((item): item is FlowTopologyProcessListItem => item.kind === 'process'),
    [layoutItems],
  );
  const layoutMap = useMemo(
    () => new Map(layoutItems.map((item) => [item.id, item] as const)),
    [layoutItems],
  );
  const selectedFilterItem = selectedClusterId ? layoutMap.get(selectedClusterId) : undefined;
  const activeClusterId = hoveredClusterId ?? selectedClusterId;
  const activeCluster = activeClusterId ? layoutMap.get(activeClusterId) : undefined;
  const activeProcessId = hoveredProcessId ?? selectedProcessId;
  const activeProcess = activeProcessId ? layoutMap.get(activeProcessId) : undefined;
  const highlightedItem = activeProcess ?? activeCluster;
  const visibleProcessItems =
    selectedFilterItem?.kind === 'cluster'
      ? processItems.filter((item) => item.clusterId === selectedFilterItem.id)
      : processItems;
  const stats: { count: number; label: string }[] = [
    { count: topology.stats.providers, label: '输出' },
    { count: topology.stats.consumers, label: '输入' },
    { count: topology.stats.processCount, label: '过程' },
  ];

  useEffect(() => {
    setHoveredClusterId(null);
    setSelectedClusterId(null);
    setHoveredProcessId(null);
    setSelectedProcessId(null);
  }, [topology]);

  const handleHoverCluster = useCallback((itemId: string) => {
    setHoveredClusterId(itemId);
  }, []);
  const handleClearHoveredCluster = useCallback(() => {
    setHoveredClusterId(null);
  }, []);
  const handleActivateCluster = useCallback((itemId: string) => {
    setSelectedClusterId((currentId) => (currentId === itemId ? null : itemId));
    setSelectedProcessId(null);
  }, []);
  const handleHoverProcess = useCallback((itemId: string) => {
    setHoveredProcessId(itemId);
  }, []);
  const handleClearHoveredProcess = useCallback(() => {
    setHoveredProcessId(null);
  }, []);
  const handleActivateProcess = useCallback((itemId: string) => {
    setSelectedProcessId((currentId) => (currentId === itemId ? null : itemId));
  }, []);
  const renderClusterEdge = (item: FlowTopologyClusterLayoutItem, index: number) => {
    const isHighlighted = isFlowTopologyItemHighlighted(item, highlightedItem);

    return (
      <g
        className={[
          styles.flowTopologyAggregateEdges,
          item.relation === 'provider' ? styles.flowTopologyAggregateProvider : '',
          item.relation === 'consumer' ? styles.flowTopologyAggregateConsumer : '',
          item.relation === 'both' ? styles.flowTopologyAggregateMixed : '',
          isHighlighted ? styles.flowTopologyEdgeActive : '',
        ]
          .filter(Boolean)
          .join(' ')}
        key={item.id}
        style={
          {
            '--edge-delay': `${index * 0.07}s`,
            '--edge-width': `${getFlowTopologyEdgeWeight(item.strength)}`,
          } as CSSProperties
        }
      >
        <path className={styles.flowTopologyAggregateHalo} d={getFlowTopologyClusterPath(item)} />
        <path className={styles.flowTopologyAggregateBeam} d={getFlowTopologyClusterPath(item)} />
      </g>
    );
  };

  return (
    <div className={styles.flowTopologyGraphShell}>
      <div className={styles.flowTopologyGraphHeader}>
        <div>
          <strong>{topology.flow.name}</strong>
        </div>
        <div className={styles.flowTopologyHeaderActions}>
          <div
            className={styles.flowTopologyStats}
            style={
              {
                alignItems: 'center',
                display: 'flex',
                justifyContent: 'flex-end',
                minWidth: 324,
                width: 324,
              } as CSSProperties
            }
          >
            {stats.map((item, index) => (
              <div
                aria-label={`${item.label} ${formatNumber(item.count)}`}
                className={styles.flowTopologyStatCard}
                key={item.label}
                style={
                  {
                    alignItems: 'center',
                    columnGap: 6,
                    display: 'inline-flex',
                    justifyContent: 'center',
                    marginLeft: index === 0 ? 0 : 12,
                    whiteSpace: 'nowrap',
                    width: item.label === '输出' ? 92 : 104,
                  } as CSSProperties
                }
              >
                <span>{item.label}</span>
                <strong>{formatNumber(item.count)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.flowTopologyGraphBody}>
        <div
          className={[styles.flowTopologyCanvas, styles.flowTopologyBasinCanvas].join(' ')}
          onMouseLeave={handleClearHoveredCluster}
        >
          <div aria-hidden='true' className={styles.flowTopologyCanvasSignal} />
          <svg aria-hidden='true' className={styles.flowTopologyEdges} viewBox='0 0 100 100'>
            <defs>
              <linearGradient id='flowTopologyProviderLine' x1='0' x2='1' y1='0' y2='0'>
                <stop offset='0%' stopColor='#3d8cff' stopOpacity='0.08' />
                <stop offset='45%' stopColor='#22e8ff' stopOpacity='0.98' />
                <stop offset='100%' stopColor='#b6fbff' stopOpacity='0.42' />
              </linearGradient>
              <linearGradient id='flowTopologyConsumerLine' x1='0' x2='1' y1='0' y2='0'>
                <stop offset='0%' stopColor='#fff1a8' stopOpacity='0.42' />
                <stop offset='55%' stopColor='#ffd45f' stopOpacity='0.98' />
                <stop offset='100%' stopColor='#ff9d36' stopOpacity='0.08' />
              </linearGradient>
            </defs>
            <line className={styles.flowTopologyMidline} x1='12' x2='88' y1='50' y2='50' />
            <ellipse className={styles.flowTopologyOrbitOuter} cx='50' cy='50' rx='38' ry='36' />
            <ellipse className={styles.flowTopologyOrbitInner} cx='50' cy='50' rx='22' ry='20' />
            {clusterItems.map(renderClusterEdge)}
          </svg>
          <div className={styles.flowTopologyCoreNode}>
            <span>{getFlowTopologyFlowTypeLabel(topology.flow.flowType)}</span>
            <strong>{topology.flow.name}</strong>
            <em>{topology.flow.version}</em>
          </div>
          {clusterItems.map((item, index) => (
            <FlowTopologyClusterButton
              index={index}
              isActive={isFlowTopologyItemHighlighted(item, highlightedItem)}
              item={item}
              key={item.id}
              onActivate={handleActivateCluster}
              onClearHover={handleClearHoveredCluster}
              onHover={handleHoverCluster}
            />
          ))}
          {layoutItems.length === 0 && (
            <div className={styles.flowTopologyViewEmpty}>
              <span>全部引用</span>
              <strong>暂无对应过程</strong>
            </div>
          )}
        </div>
        <div className={styles.flowTopologyProcessLedger}>
          <div className={styles.flowTopologyLedgerHeader}>
            <div className={styles.flowTopologyLedgerSummary}>
              <span>{getFlowTopologyViewLabel('overview')}</span>
              <strong>{getFlowTopologyListTitle(selectedFilterItem)}</strong>
              <p>
                {formatNumber(visibleProcessItems.length)} / {formatNumber(processItems.length)}{' '}
                个过程
              </p>
            </div>
          </div>
          <div className={styles.flowTopologyLedgerColumns} aria-hidden='true'>
            <span>关系</span>
            <span>过程</span>
            <span>分类</span>
            <span>地区</span>
            <span>平均量</span>
            <span>结果量</span>
            <span>数据推导类型/状态</span>
          </div>
          <div className={styles.flowTopologyProcessRows}>
            {visibleProcessItems.map((item) => (
              <FlowTopologyProcessRow
                isActive={isFlowTopologyItemHighlighted(item, highlightedItem)}
                item={item}
                key={item.id}
                onActivate={handleActivateProcess}
                onClearHover={handleClearHoveredProcess}
                onHover={handleHoverProcess}
              />
            ))}
            {visibleProcessItems.length === 0 && (
              <div className={styles.flowTopologyLedgerEmpty}>暂无对应过程</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowTopologyScreen({
  snapshot,
  activeScreen,
  onChangeScreen,
}: {
  snapshot: DashboardSnapshot;
  activeScreen: ScreenKey;
  onChangeScreen: (screen: ScreenKey) => void;
}) {
  const [query, setQuery] = useState('');
  const [searchState, setSearchState] = useState<FlowTopologySearchState>('ready');
  const [searchResults, setSearchResults] = useState<FlowTable[]>([]);
  const [searchPage, setSearchPage] = useState(1);
  const [selectedFlow, setSelectedFlow] = useState<FlowTable | null>(null);
  const [topologyState, setTopologyState] = useState<FlowTopologyLoadState>('idle');
  const [topology, setTopology] = useState<FlowTopologySnapshot | null>(null);
  const [topologyTransitionKey, setTopologyTransitionKey] = useState(0);
  const searchTotalPages = Math.max(
    1,
    Math.ceil(searchResults.length / flowTopologySearchPageSize),
  );
  const pagedSearchResults = useMemo(() => {
    const start = (searchPage - 1) * flowTopologySearchPageSize;
    return searchResults.slice(start, start + flowTopologySearchPageSize);
  }, [searchPage, searchResults]);
  const firstResultIndex =
    searchResults.length > 0 ? (searchPage - 1) * flowTopologySearchPageSize + 1 : 0;
  const lastResultIndex = Math.min(searchPage * flowTopologySearchPageSize, searchResults.length);

  useEffect(() => {
    setSearchPage((currentPage) => Math.min(currentPage, searchTotalPages));
  }, [searchTotalPages]);

  const handleSearch = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setSearchState('loading');

    const result = await searchSmartRecommendedFlows(query);
    setSearchResults(result.data);
    setSearchPage(1);
    setSearchState('ready');
  };

  const handleSelectFlow = async (flow: FlowTable) => {
    if (!isTopologyEligibleFlow(flow)) {
      return;
    }

    setSelectedFlow(flow);
    setTopologyTransitionKey((currentKey) => currentKey + 1);
    setTopology(null);
    setTopologyState('loading');

    try {
      const nextTopology = await loadCachedFlowTopology(flow);
      setTopology(nextTopology);
      setTopologyState('ready');
    } catch (error) {
      if (error instanceof FlowTopologyCacheMissError) {
        setTopologyState('missing');
        return;
      }
      console.error(error);
      setTopologyState('error');
    }
  };

  const placeholderTitle =
    topologyState === 'missing'
      ? '拓扑缓存未命中'
      : topologyState === 'error'
        ? '缓存链路异常'
        : topologyState === 'loading'
          ? '拓扑信号接入中'
          : '过程网络待激活';
  const placeholderCaption = topologyState === 'loading' ? '供需关系信号接入中' : '供需过程网络';

  return (
    <section className={styles.screenPanel}>
      <HeaderRibbon
        snapshot={snapshot}
        subtitle='从非基础流下钻到 provider / consumer 过程网络'
        title='流过程网络拓扑'
      />
      <div className={styles.flowTopologyGrid}>
        <aside className={styles.flowTopologySearchPanel}>
          <div className={styles.flowTopologyPanelHeader}>
            <strong>流查询</strong>
          </div>
          <form className={styles.flowTopologySearchForm} onSubmit={handleSearch}>
            <input
              aria-label='智能推荐流'
              onChange={(event) => setQuery(event.target.value)}
              placeholder='输入产品流、废物流或关键词'
              value={query}
            />
            <button disabled={searchState === 'loading'} type='submit'>
              查询
            </button>
          </form>
          <div className={styles.flowTopologyResultList}>
            {searchState === 'loading' ? (
              <FlowTopologySearchLoading />
            ) : (
              <>
                {pagedSearchResults.map((flow) => (
                  <FlowTopologySearchResult
                    flow={flow}
                    isSelected={
                      selectedFlow?.id === flow.id && selectedFlow?.version === flow.version
                    }
                    key={`${flow.id}:${flow.version}`}
                    onSelect={handleSelectFlow}
                  />
                ))}
                {searchResults.length === 0 && <FlowTopologySearchEmpty />}
              </>
            )}
          </div>
          <div className={styles.flowTopologySearchMeta}>
            <span>
              {searchState === 'loading'
                ? '智能推荐中'
                : searchResults.length > 0
                  ? `${formatNumber(firstResultIndex)}-${formatNumber(lastResultIndex)} / ${formatNumber(searchResults.length)}`
                  : '0 / 0'}
            </span>
            <b>
              {searchState === 'loading'
                ? 'SCAN'
                : `${formatNumber(searchPage)} / ${formatNumber(searchTotalPages)}`}
            </b>
            <div className={styles.flowTopologyPagerActions}>
              <button
                aria-label='上一页'
                disabled={searchState === 'loading' || searchPage <= 1}
                onClick={() => setSearchPage((currentPage) => Math.max(1, currentPage - 1))}
                type='button'
              >
                <LeftOutlined />
              </button>
              <button
                aria-label='下一页'
                disabled={searchState === 'loading' || searchPage >= searchTotalPages}
                onClick={() =>
                  setSearchPage((currentPage) => Math.min(searchTotalPages, currentPage + 1))
                }
                type='button'
              >
                <RightOutlined />
              </button>
            </div>
          </div>
        </aside>
        <div
          className={[
            styles.flowTopologyWorkspace,
            topologyState === 'loading' ? styles.flowTopologyWorkspaceLoading : '',
            topologyState === 'ready' ? styles.flowTopologyWorkspaceReady : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {topologyState === 'ready' && topology ? (
            <FlowTopologyGraph
              key={`${topology.buildId}:${topology.flow.id}:${topologyTransitionKey}`}
              topology={topology}
            />
          ) : (
            <div
              className={styles.flowTopologyPlaceholder}
              key={`${topologyState}:${topologyTransitionKey}`}
            >
              <div className={styles.flowTopologyPlaceholderSignal} />
              <span>
                {topologyState === 'missing'
                  ? '该流尚未生成拓扑缓存'
                  : topologyState === 'error'
                    ? '拓扑缓存读取失败'
                    : topologyState === 'loading'
                      ? '正在读取缓存'
                      : '等待选择非基础流'}
              </span>
              <strong>{placeholderTitle}</strong>
              <p>{placeholderCaption}</p>
            </div>
          )}
        </div>
      </div>
      <ScreenNavigator activeScreen={activeScreen} onChange={onChangeScreen} />
    </section>
  );
}

export default function NationalCarbonDashboardPage() {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>(() => getInitialScreen());
  const rootRef = useRef<HTMLDivElement | null>(null);
  const activeIndex = screens.findIndex((screen) => screen.key === activeScreen);
  const autoplayEnabled = useMemo(() => getAutoplayEnabled(), []);
  const stageLayout = useStageLayout();

  useEffect(() => {
    if (!autoplayEnabled || activeScreen === 'flow_topology') {
      return undefined;
    }

    const timer = window.setInterval(
      () => {
        setActiveScreen((current) => {
          const currentIndex = screens.findIndex((screen) => screen.key === current);
          return screens[(currentIndex + 1) % screens.length].key;
        });
      },
      activeScreen === 'map_status' ? 24000 : 18000,
    );

    return () => window.clearInterval(timer);
  }, [activeScreen, autoplayEnabled]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        setActiveScreen(screens[(activeIndex + 1) % screens.length].key);
      }
      if (event.key === 'ArrowLeft') {
        setActiveScreen(screens[(activeIndex + screens.length - 1) % screens.length].key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex]);

  useEffect(() => {
    if (!rootRef.current) {
      return undefined;
    }

    const context = gsap.context(() => {
      const metricTargets = rootRef.current?.querySelectorAll('[data-animate="metric"]');
      const mapTargets = rootRef.current?.querySelectorAll('[data-animate="map"]');

      if (metricTargets?.length) {
        gsap.fromTo(
          metricTargets,
          { y: 18 },
          { duration: 0.7, ease: 'power2.out', stagger: 0.07, y: 0 },
        );
      }

      if (mapTargets?.length) {
        gsap.fromTo(mapTargets, { scale: 0.985 }, { duration: 1.1, ease: 'power2.out', scale: 1 });
      }
    }, rootRef);

    return () => context.revert();
  }, [activeScreen]);

  return (
    <main className={styles.dashboardViewport} ref={rootRef}>
      <div
        className={styles.dashboardStage}
        style={{
          left: stageLayout.left,
          top: stageLayout.top,
          transform: `scale(${stageLayout.scale})`,
        }}
      >
        {activeScreen === 'overview' && (
          <OverviewScreen
            activeScreen={activeScreen}
            onChangeScreen={setActiveScreen}
            snapshot={dashboardSnapshot}
          />
        )}
        {activeScreen === 'map_status' && (
          <MapStatusScreen
            activeScreen={activeScreen}
            onChangeScreen={setActiveScreen}
            snapshot={dashboardSnapshot}
          />
        )}
        {activeScreen === 'outcome_metrics' && (
          <OutcomeMetricsScreen
            activeScreen={activeScreen}
            onChangeScreen={setActiveScreen}
            snapshot={dashboardSnapshot}
          />
        )}
        {activeScreen === 'connectivity' && (
          <ConnectivityScreen
            activeScreen={activeScreen}
            onChangeScreen={setActiveScreen}
            snapshot={dashboardSnapshot}
          />
        )}
        {activeScreen === 'flow_topology' && (
          <FlowTopologyScreen
            activeScreen={activeScreen}
            onChangeScreen={setActiveScreen}
            snapshot={dashboardSnapshot}
          />
        )}
      </div>
    </main>
  );
}
