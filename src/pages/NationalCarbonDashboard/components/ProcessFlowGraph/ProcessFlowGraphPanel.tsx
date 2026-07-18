import {
  requestNationalCarbonGraphCacheJobsApi,
  type NationalCarbonGraphCacheWorkerJobResult,
  type NationalCarbonGraphCacheWorkerJobStatus,
} from '@/services/nationalCarbonGraphCache/jobs';
import {
  AimOutlined,
  ApartmentOutlined,
  CaretDownOutlined,
  CaretUpOutlined,
  ClearOutlined,
  CloseCircleOutlined,
  DotChartOutlined,
  DragOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  LoadingOutlined,
  NodeIndexOutlined,
  RightOutlined,
  SearchOutlined,
  SelectOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Modal, message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  formatDashboardExchangeAmount,
  formatDashboardNumber as formatNumber,
  getDashboardMapPathLabel,
  getGraphCategoryLabel,
  getQuickSelectLabel,
  isChineseDashboardLocale,
  type DashboardIntl,
} from '../../i18n';
import ProcessFlowGraphCanvas from './ProcessFlowGraphCanvas.client';
import {
  getProcessFlowGraphNode,
  getProcessFlowGraphSelection,
  summarizeProcessFlowSelection,
} from './graphSelection';
import {
  type ProcessFlowGraphData,
  type ProcessFlowGraphEdge,
  type ProcessFlowGraphGeoMapView,
  type ProcessFlowGraphInteractionMode,
  type ProcessFlowGraphLayoutName,
  type ProcessFlowGraphMapScope,
  type ProcessFlowGraphNode,
} from './graphTypes';
import {
  loadProcessFlowGraphFromCache,
  loadProcessFlowGraphGeoMapViewFromCache,
  resetProcessFlowGraphCacheLoaderState,
} from './processFlowGraphCacheLoader';
import styles from './styles.module.less';
const geoMapCacheSoftTimeoutMs = 4500;
const initialGeoMapPrefetchGraceMs = 900;
const graphCacheJobPollDelayMs = 3500;
const maxCacheErrorLength = 96;
const inspectorExitAnimationMs = 320;
const categoryPathDelimiter = ' / ';
const categoryTreeKeyDelimiter = '\u001f';
const maxCategoryTreeDepth = 5;
const maxCategorySearchResults = 50;
const maxNodeSearchResults = 50;
const minCategoryMenuWidth = 226;
const quickSelectOverviewFlowNodeId = 'flow:c431c0c3-3f5e-4b7b-af99-2ebbdcaf5f98@01.01.002';
const quickSelectWorldMapProcessNodeId = 'process:1714bb7f-ced9-4c3f-8fac-af40ef8dd5fb@01.01.000';
const quickSelectChinaMapProcessNodeId = 'process:9c3a6c6e-1010-41a6-b1f8-a3a52d2d62a3@01.01.000';
const graphCacheJobActiveStatuses: NationalCarbonGraphCacheWorkerJobStatus[] = [
  'queued',
  'running',
  'waiting',
  'stale',
];
const graphCacheJobFailureStatuses: NationalCarbonGraphCacheWorkerJobStatus[] = [
  'blocked',
  'failed',
  'cancelled',
];

type QuickSelectTarget = {
  label: string;
  nodeId: string;
};

function getQuickSelectTarget(
  intl: DashboardIntl,
  layoutMode: ProcessFlowGraphLayoutName,
  mapScope: ProcessFlowGraphMapScope,
): QuickSelectTarget {
  if (layoutMode === 'geoMap2d') {
    return mapScope === 'china'
      ? {
          label: getQuickSelectLabel(intl, 'china'),
          nodeId: quickSelectChinaMapProcessNodeId,
        }
      : {
          label: getQuickSelectLabel(intl, 'world'),
          nodeId: quickSelectWorldMapProcessNodeId,
        };
  }

  return {
    label: getQuickSelectLabel(intl, 'overview'),
    nodeId: quickSelectOverviewFlowNodeId,
  };
}

function formatCacheError(error: string): string {
  if (error.length <= maxCacheErrorLength) {
    return error;
  }

  return `${error.slice(0, maxCacheErrorLength - 1)}...`;
}

function getFirstGraphCacheJob(
  jobs: NationalCarbonGraphCacheWorkerJobResult[] | null,
): NationalCarbonGraphCacheWorkerJobResult | undefined {
  return jobs?.[0];
}

function isGraphCacheJobActive(job?: NationalCarbonGraphCacheWorkerJobResult): boolean {
  return Boolean(job && graphCacheJobActiveStatuses.includes(job.status));
}

function isGraphCacheJobFailure(job?: NationalCarbonGraphCacheWorkerJobResult): boolean {
  return Boolean(job && graphCacheJobFailureStatuses.includes(job.status));
}

function getGraphCacheJobStatusLabel(
  intl: DashboardIntl,
  job?: NationalCarbonGraphCacheWorkerJobResult,
): string {
  if (!job) {
    return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.job.notSubmitted' });
  }

  if (job.status === 'queued') {
    return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.job.queued' });
  }
  if (job.status === 'running') {
    return job.phase
      ? intl.formatMessage(
          { id: 'pages.home.nationalCarbon.graph.job.runningPhase' },
          { phase: job.phase },
        )
      : intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.job.running' });
  }
  if (job.status === 'waiting') {
    return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.job.waiting' });
  }
  if (job.status === 'stale') {
    return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.job.stale' });
  }
  if (job.status === 'completed') {
    return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.job.completed' });
  }
  if (job.status === 'blocked') {
    return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.job.blocked' });
  }
  if (job.status === 'failed') {
    return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.job.failed' });
  }
  if (job.status === 'cancelled') {
    return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.job.cancelled' });
  }

  return job.status;
}

function getFlowTypeLabel(intl: DashboardIntl, flowType?: string) {
  if (flowType === 'Product flow') {
    return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.flowType.product' });
  }
  if (flowType === 'Waste flow') {
    return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.flowType.waste' });
  }
  if (flowType === 'Other flow') {
    return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.flowType.other' });
  }
  return intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.flowType.nonElementary' });
}

function getLegacyCategoryParts(intl: DashboardIntl, category?: string) {
  const categoryParts =
    category
      ?.split(categoryPathDelimiter)
      .map((part) => part.trim())
      .filter(Boolean) ?? [];

  if (!categoryParts.length) {
    return [intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.category.uncategorized' })];
  }

  const cappedCategoryParts =
    categoryParts.length <= maxCategoryTreeDepth
      ? categoryParts
      : [
          ...categoryParts.slice(0, maxCategoryTreeDepth - 1),
          categoryParts.slice(maxCategoryTreeDepth - 1).join(categoryPathDelimiter),
        ];

  return cappedCategoryParts.map((categoryPart) => getGraphCategoryLabel(intl, categoryPart));
}

function getCategoryLabel(intl: DashboardIntl, category?: string) {
  if (!category) {
    return '-';
  }

  return getLegacyCategoryParts(intl, category).join(categoryPathDelimiter);
}

function getNodeCategoryParts(intl: DashboardIntl, node: ProcessFlowGraphNode) {
  const useChineseName = isChineseDashboardLocale(intl.locale);
  const structuredParts =
    node.categoryPath
      ?.map((item) => (useChineseName ? item.zhName || item.name : item.name || item.zhName).trim())
      .filter(Boolean)
      .map((categoryPart) => getGraphCategoryLabel(intl, categoryPart)) ?? [];

  return structuredParts.length ? structuredParts : getLegacyCategoryParts(intl, node.category);
}

function getNodeCategoryDisplayPath(intl: DashboardIntl, node: ProcessFlowGraphNode) {
  const categoryDisplayPath = node.categoryDisplayPath?.trim();
  if (categoryDisplayPath && isChineseDashboardLocale(intl.locale)) {
    return categoryDisplayPath;
  }

  return getNodeCategoryParts(intl, node).join(categoryPathDelimiter) || '-';
}

function getNodeCategorySearchValues(intl: DashboardIntl, node: ProcessFlowGraphNode) {
  return [
    node.category,
    getCategoryLabel(intl, node.category),
    node.categoryDisplayPath,
    getNodeCategoryDisplayPath(intl, node),
    node.categorySystem,
    ...(node.categoryPath?.flatMap((item) => [
      item.id,
      item.name,
      item.zhName,
      String(item.level),
    ]) ?? []),
  ];
}

function getExchangeDirectionLabel(
  intl: DashboardIntl,
  direction: ProcessFlowGraphEdge['direction'],
) {
  return direction === 'input'
    ? intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.input' })
    : intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.output' });
}

function formatExchangeAmount(amount?: number) {
  return formatDashboardExchangeAmount(amount);
}

function getNodeEdgeRows(
  data: ProcessFlowGraphData,
  node: ProcessFlowGraphNode | undefined,
): ProcessFlowGraphEdge[] {
  if (!node) {
    return [];
  }

  return (data.adjacency[node.id] ?? [])
    .map((edgeId) => {
      const edgeIndex = data.indexes.edgeById[edgeId];
      return edgeIndex === undefined ? undefined : data.edges[edgeIndex];
    })
    .filter((edge): edge is ProcessFlowGraphEdge => Boolean(edge));
}

function getConnectedNodeName(
  data: ProcessFlowGraphData,
  edge: ProcessFlowGraphEdge,
  nodeId: string,
) {
  const connectedNodeId = edge.source === nodeId ? edge.target : edge.source;
  return getProcessFlowGraphNode(data, connectedNodeId)?.name ?? connectedNodeId;
}

type GraphDataSource = 'loading' | 'minio' | 'error';
type GeoMapCacheStatus = 'idle' | 'loading' | 'hit' | 'miss' | 'error';
type GeoMapPendingSourceLayoutMode = Exclude<ProcessFlowGraphLayoutName, 'geoMap2d'>;
type CategoryTreeNode = {
  children: CategoryTreeNode[];
  count: number;
  depth: number;
  exchangeCount: number;
  items: ProcessFlowGraphNode[];
  key: string;
  label: string;
  path: string[];
  rawLabel: string;
};
type MutableCategoryTreeNode = CategoryTreeNode & {
  childrenByRawLabel: Map<string, MutableCategoryTreeNode>;
};

type CategoryBreadcrumb = {
  count: number;
  key: string;
  label: string;
};

type CategorySearchResults = {
  categoryMatches: CategoryTreeNode[];
  nodeMatches: ProcessFlowGraphNode[];
  totalCategoryMatches: number;
  totalNodeMatches: number;
};

function getCategoryTreeNodeKey(path: string[]) {
  return path.join(categoryTreeKeyDelimiter) || 'root';
}

function createCategoryTreeNode(
  rawLabel: string,
  path: string[],
  depth: number,
  rootLabel: string,
): MutableCategoryTreeNode {
  return {
    children: [],
    childrenByRawLabel: new Map<string, MutableCategoryTreeNode>(),
    count: 0,
    depth,
    exchangeCount: 0,
    items: [],
    key: getCategoryTreeNodeKey(path),
    label: rawLabel || rootLabel,
    path,
    rawLabel,
  };
}

function compareCategoryTreeNodes(left: CategoryTreeNode, right: CategoryTreeNode) {
  return (
    right.count - left.count ||
    right.exchangeCount - left.exchangeCount ||
    left.label.localeCompare(right.label)
  );
}

function compareCategoryTreeItems(left: ProcessFlowGraphNode, right: ProcessFlowGraphNode) {
  return (
    right.degree - left.degree ||
    left.name.localeCompare(right.name) ||
    left.id.localeCompare(right.id)
  );
}

function finalizeCategoryTreeNode(categoryNode: MutableCategoryTreeNode): CategoryTreeNode {
  return {
    children: Array.from(categoryNode.childrenByRawLabel.values())
      .map(finalizeCategoryTreeNode)
      .sort(compareCategoryTreeNodes),
    count: categoryNode.count,
    depth: categoryNode.depth,
    exchangeCount: categoryNode.exchangeCount,
    items: [...categoryNode.items].sort(compareCategoryTreeItems),
    key: categoryNode.key,
    label: categoryNode.label,
    path: categoryNode.path,
    rawLabel: categoryNode.rawLabel,
  };
}

function buildCategoryTree(intl: DashboardIntl, nodes: ProcessFlowGraphNode[]): CategoryTreeNode {
  const rootLabel = intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.allCategories' });
  const rootNode = createCategoryTreeNode('', [], 0, rootLabel);

  nodes.forEach((graphNode) => {
    let currentNode = rootNode;
    currentNode.count += 1;
    currentNode.exchangeCount += graphNode.degree;

    getNodeCategoryParts(intl, graphNode).forEach((categoryPart, categoryIndex) => {
      const childPath = [...currentNode.path, categoryPart];
      let childNode = currentNode.childrenByRawLabel.get(categoryPart);

      if (!childNode) {
        childNode = createCategoryTreeNode(categoryPart, childPath, categoryIndex + 1, rootLabel);
        currentNode.childrenByRawLabel.set(categoryPart, childNode);
      }

      childNode.count += 1;
      childNode.exchangeCount += graphNode.degree;
      currentNode = childNode;
    });

    currentNode.items.push(graphNode);
  });

  return finalizeCategoryTreeNode(rootNode);
}

function doesCategoryTreeSearchMatch(
  intl: DashboardIntl,
  node: ProcessFlowGraphNode,
  normalizedQuery: string,
) {
  if (!normalizedQuery) {
    return true;
  }

  return [
    node.id,
    node.name,
    ...getNodeCategorySearchValues(intl, node),
    node.location,
    node.flowType,
    node.flowType ? getFlowTypeLabel(intl, node.flowType) : undefined,
  ].some((searchValue) => searchValue?.toLowerCase().includes(normalizedQuery));
}

function getCategorySearchText(categoryNode: CategoryTreeNode) {
  return [...categoryNode.path, categoryNode.label].join(categoryPathDelimiter).toLowerCase();
}

function findCategoryTreeNodeByKey(
  categoryNode: CategoryTreeNode,
  nodeKey: string,
): CategoryTreeNode | undefined {
  if (categoryNode.key === nodeKey) {
    return categoryNode;
  }

  for (const childNode of categoryNode.children) {
    const matchingNode = findCategoryTreeNodeByKey(childNode, nodeKey);

    if (matchingNode) {
      return matchingNode;
    }
  }

  return undefined;
}

function getCategoryTreeBreadcrumbs(
  categoryTree: CategoryTreeNode,
  activeCategoryNode: CategoryTreeNode,
): CategoryBreadcrumb[] {
  const breadcrumbs: CategoryBreadcrumb[] = [
    {
      count: categoryTree.count,
      key: categoryTree.key,
      label: categoryTree.label,
    },
  ];
  let currentNode = categoryTree;

  activeCategoryNode.path.forEach((pathPart) => {
    const childNode = currentNode.children.find((node) => node.rawLabel === pathPart);

    if (!childNode) {
      return;
    }

    breadcrumbs.push({
      count: childNode.count,
      key: childNode.key,
      label: childNode.label,
    });
    currentNode = childNode;
  });

  return breadcrumbs;
}

function getCategoryBreadcrumbLabel(breadcrumbs: CategoryBreadcrumb[]) {
  return breadcrumbs.map((breadcrumb) => breadcrumb.label).join(' / ');
}

function getAdaptiveCategoryMenuWidth(breadcrumbLabel: string, maxWidth: number) {
  const weightedLength = Array.from(breadcrumbLabel).reduce(
    (length, char) => length + (char.charCodeAt(0) > 255 ? 1.1 : 0.56),
    0,
  );
  const safeMaxWidth = Math.max(0, Math.round(maxWidth));

  return Math.min(
    safeMaxWidth,
    Math.max(minCategoryMenuWidth, Math.round(196 + weightedLength * 7)),
  );
}

function getCategoryShareStyle(count: number, maxCount: number) {
  const share = maxCount > 0 ? Math.max(0.04, count / maxCount) : 0;

  return { '--category-share': String(share) } as CSSProperties;
}

function getCategorySearchResults(
  intl: DashboardIntl,
  categoryTree: CategoryTreeNode | undefined,
  nodes: ProcessFlowGraphNode[],
  normalizedQuery: string,
): CategorySearchResults {
  if (!normalizedQuery) {
    return {
      categoryMatches: [],
      nodeMatches: [],
      totalCategoryMatches: 0,
      totalNodeMatches: 0,
    };
  }

  const categoryMatches: CategoryTreeNode[] = [];
  let totalCategoryMatches = 0;

  const visitCategoryNode = (categoryNode: CategoryTreeNode) => {
    categoryNode.children.forEach((childNode) => {
      if (getCategorySearchText(childNode).includes(normalizedQuery)) {
        totalCategoryMatches += 1;
        if (categoryMatches.length < maxCategorySearchResults) {
          categoryMatches.push(childNode);
        }
      }

      visitCategoryNode(childNode);
    });
  };

  if (categoryTree) {
    visitCategoryNode(categoryTree);
  }

  const matchingNodes = nodes.filter((node) =>
    doesCategoryTreeSearchMatch(intl, node, normalizedQuery),
  );

  return {
    categoryMatches,
    nodeMatches: matchingNodes.slice(0, maxNodeSearchResults),
    totalCategoryMatches,
    totalNodeMatches: matchingNodes.length,
  };
}

function CategoryRadarIndex({
  activeNode,
  categoryTree,
  nodeKindLabel,
  onNavigate,
  onSelectNode,
  selectedNodeId,
}: {
  activeNode: CategoryTreeNode;
  categoryTree: CategoryTreeNode;
  nodeKindLabel: string;
  onNavigate: (nodeKey: string) => void;
  onSelectNode: (nodeId: string) => void;
  selectedNodeId?: string;
}) {
  const intl = useIntl();
  const breadcrumbs = getCategoryTreeBreadcrumbs(categoryTree, activeNode);
  const breadcrumbLabel = getCategoryBreadcrumbLabel(breadcrumbs);
  const shouldShowBreadcrumbPath = breadcrumbs.length > 1;
  const visibleBreadcrumbs = shouldShowBreadcrumbPath ? breadcrumbs : [];
  const shouldCollapseBreadcrumbs = visibleBreadcrumbs.length > 4;
  const leadingBreadcrumbs = shouldCollapseBreadcrumbs
    ? visibleBreadcrumbs.slice(0, 1)
    : visibleBreadcrumbs;
  const overflowBreadcrumbs = shouldCollapseBreadcrumbs ? visibleBreadcrumbs.slice(1, -2) : [];
  const trailingBreadcrumbs = shouldCollapseBreadcrumbs ? visibleBreadcrumbs.slice(-2) : [];
  const sectionClassName = [
    styles.categoryRadarIndex,
    shouldShowBreadcrumbPath ? '' : styles.categoryRadarIndexRoot,
  ]
    .filter(Boolean)
    .join(' ');
  const maxChildCount = Math.max(1, ...activeNode.children.map((node) => node.count));
  const resultCount = activeNode.children.length + activeNode.items.length;

  const renderBreadcrumbButton = (breadcrumb: CategoryBreadcrumb, index: number) => (
    <button
      aria-current={breadcrumb.key === activeNode.key ? 'page' : undefined}
      className={styles.categoryIndexPathButton}
      key={breadcrumb.key}
      onClick={() => onNavigate(breadcrumb.key)}
      title={`${breadcrumb.label} / ${formatNumber(breadcrumb.count)} ${nodeKindLabel}`}
      type='button'
    >
      {index > 0 && <i aria-hidden='true'>/</i>}
      <span>{breadcrumb.label}</span>
    </button>
  );

  return (
    <section
      className={sectionClassName}
      aria-label={intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.categoryIndex' })}
    >
      {shouldShowBreadcrumbPath && (
        <nav
          className={styles.categoryIndexPath}
          aria-label={intl.formatMessage(
            { id: 'pages.home.nationalCarbon.graph.currentCategoryPath' },
            { path: breadcrumbLabel },
          )}
          title={breadcrumbLabel}
        >
          {leadingBreadcrumbs.map((breadcrumb, index) => renderBreadcrumbButton(breadcrumb, index))}
          {shouldCollapseBreadcrumbs && (
            <span className={styles.categoryIndexOverflow}>
              <button
                aria-haspopup='menu'
                className={styles.categoryIndexOverflowButton}
                title={intl.formatMessage({
                  id: 'pages.home.nationalCarbon.graph.intermediateCategories',
                })}
                type='button'
              >
                <i aria-hidden='true'>/</i>
                <span>...</span>
              </button>
              <div className={styles.categoryIndexOverflowMenu} role='menu'>
                {overflowBreadcrumbs.map((breadcrumb) => (
                  <button
                    key={breadcrumb.key}
                    onClick={() => onNavigate(breadcrumb.key)}
                    role='menuitem'
                    title={`${breadcrumb.label} / ${formatNumber(breadcrumb.count)} ${nodeKindLabel}`}
                    type='button'
                  >
                    <span>{breadcrumb.label}</span>
                    <em>{formatNumber(breadcrumb.count)}</em>
                  </button>
                ))}
              </div>
            </span>
          )}
          {trailingBreadcrumbs.map((breadcrumb, index) =>
            renderBreadcrumbButton(breadcrumb, leadingBreadcrumbs.length + index + 1),
          )}
        </nav>
      )}
      {resultCount > 0 ? (
        <ul className={styles.categoryIndexList} key={activeNode.key}>
          {activeNode.children.map((childNode) => (
            <li className={styles.categoryIndexItem} key={childNode.key}>
              <button
                className={styles.categoryIndexCategoryButton}
                onClick={() => onNavigate(childNode.key)}
                style={getCategoryShareStyle(childNode.count, maxChildCount)}
                title={`${childNode.label} / ${formatNumber(childNode.count)} ${nodeKindLabel}`}
                type='button'
              >
                <span className={styles.categoryIndexSignal} aria-hidden='true' />
                <strong>{childNode.label}</strong>
                <em>{formatNumber(childNode.count)}</em>
                <RightOutlined className={styles.categoryIndexArrow} aria-hidden='true' />
              </button>
            </li>
          ))}
          {activeNode.items.map((itemNode) => (
            <li className={styles.categoryIndexItem} key={itemNode.id}>
              <button
                aria-pressed={selectedNodeId === itemNode.id}
                className={[
                  styles.categoryIndexNodeButton,
                  selectedNodeId === itemNode.id ? styles.categoryIndexNodeActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onSelectNode(itemNode.id)}
                title={itemNode.name}
                type='button'
              >
                <strong>{itemNode.name}</strong>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.categoryTreeEmpty} role='status'>
          {intl.formatMessage(
            { id: 'pages.home.nationalCarbon.graph.noItemsInCategory' },
            { kind: nodeKindLabel },
          )}
        </div>
      )}
    </section>
  );
}

function CategorySearchPanel({
  nodeKindLabel,
  onNavigateCategory,
  onSelectNode,
  results,
  selectedNodeId,
}: {
  nodeKindLabel: string;
  onNavigateCategory: (nodeKey: string) => void;
  onSelectNode: (nodeId: string) => void;
  results: CategorySearchResults;
  selectedNodeId?: string;
}) {
  const intl = useIntl();
  const hasResults = results.totalCategoryMatches > 0 || results.totalNodeMatches > 0;
  const shouldShowNodeMatches = results.nodeMatches.length > 0;
  const shouldShowCategoryMatches = !shouldShowNodeMatches && results.categoryMatches.length > 0;
  const maxCategoryCount = Math.max(1, ...results.categoryMatches.map((node) => node.count));
  const visibleSearchLimit = shouldShowNodeMatches
    ? maxNodeSearchResults
    : maxCategorySearchResults;
  const visibleSearchType = shouldShowNodeMatches
    ? nodeKindLabel
    : intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.category' });
  const hasMoreVisibleResults = shouldShowNodeMatches
    ? results.totalNodeMatches > results.nodeMatches.length
    : results.totalCategoryMatches > results.categoryMatches.length;

  return (
    <section
      className={styles.categorySearchPanel}
      aria-label={intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.searchResults' })}
    >
      {hasResults ? (
        <>
          {shouldShowNodeMatches && (
            <ul className={styles.categoryIndexList}>
              {results.nodeMatches.map((itemNode) => (
                <li className={styles.categoryIndexItem} key={itemNode.id}>
                  <button
                    aria-pressed={selectedNodeId === itemNode.id}
                    className={[
                      styles.categoryIndexNodeButton,
                      selectedNodeId === itemNode.id ? styles.categoryIndexNodeActive : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => onSelectNode(itemNode.id)}
                    title={`${itemNode.name} / ${getNodeCategoryDisplayPath(intl, itemNode)}`}
                    type='button'
                  >
                    <strong>{itemNode.name}</strong>
                    <small>{getNodeCategoryDisplayPath(intl, itemNode)}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {shouldShowCategoryMatches && (
            <ul className={styles.categoryIndexList}>
              {results.categoryMatches.map((categoryNode) => (
                <li className={styles.categoryIndexItem} key={categoryNode.key}>
                  <button
                    className={styles.categoryIndexCategoryButton}
                    onClick={() => onNavigateCategory(categoryNode.key)}
                    style={getCategoryShareStyle(categoryNode.count, maxCategoryCount)}
                    title={`${categoryNode.path.join(categoryPathDelimiter)} / ${formatNumber(categoryNode.count)} ${nodeKindLabel}`}
                    type='button'
                  >
                    <span className={styles.categoryIndexSignal} aria-hidden='true' />
                    <strong>{categoryNode.label}</strong>
                    <em>{formatNumber(categoryNode.count)}</em>
                    <RightOutlined className={styles.categoryIndexArrow} aria-hidden='true' />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {hasMoreVisibleResults && (
            <div className={styles.categorySearchHint}>
              {intl.formatMessage(
                { id: 'pages.home.nationalCarbon.graph.searchLimit' },
                { limit: visibleSearchLimit, type: visibleSearchType },
              )}
            </div>
          )}
        </>
      ) : (
        <div className={styles.categoryTreeEmpty} role='status'>
          {intl.formatMessage(
            { id: 'pages.home.nationalCarbon.graph.noSearchMatch' },
            { kind: nodeKindLabel },
          )}
        </div>
      )}
    </section>
  );
}

type InspectorSnapshot = {
  data: ProcessFlowGraphData;
  node: ProcessFlowGraphNode;
};

function Inspector({
  data,
  isExiting = false,
  node,
}: {
  data: ProcessFlowGraphData;
  isExiting?: boolean;
  node: ProcessFlowGraphNode;
}) {
  const intl = useIntl();
  const edgeRows = useMemo(() => getNodeEdgeRows(data, node), [data, node]);
  const selection = useMemo(() => getProcessFlowGraphSelection(data, node.id), [data, node]);
  const summary = useMemo(() => summarizeProcessFlowSelection(data, selection), [data, selection]);
  const inputEdges = edgeRows.filter((edge) => edge.direction === 'input');
  const outputEdges = edgeRows.filter((edge) => edge.direction === 'output');
  const inspectorClassName = [styles.inspector, isExiting ? styles.inspectorExiting : '']
    .filter(Boolean)
    .join(' ');

  return (
    <aside aria-hidden={isExiting} className={inspectorClassName}>
      <div className={styles.nodeIdentity}>
        <strong>{node.name}</strong>
      </div>
      <div className={styles.inspectorMetricGrid}>
        <div>
          <span>
            {intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.relatedProcesses' })}
          </span>
          <strong>{formatNumber(summary.relatedProcesses)}</strong>
        </div>
        <div>
          <span>{intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.relatedFlows' })}</span>
          <strong>{formatNumber(summary.relatedFlows)}</strong>
        </div>
        <div>
          <span>{intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.input' })}</span>
          <strong>{formatNumber(summary.inputEdges || inputEdges.length)}</strong>
        </div>
        <div>
          <span>{intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.output' })}</span>
          <strong>{formatNumber(summary.outputEdges || outputEdges.length)}</strong>
        </div>
      </div>
      <div className={styles.edgeList}>
        <span>
          {intl.formatMessage(
            { id: 'pages.home.nationalCarbon.graph.exchangeCount' },
            { count: formatNumber(edgeRows.length) },
          )}
        </span>
        <div
          aria-label={intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.exchangeList' })}
          className={styles.edgeRows}
        >
          {edgeRows.map((edge) => {
            const connectedNodeName = getConnectedNodeName(data, edge, node.id);
            return (
              <div key={edge.id} title={connectedNodeName}>
                <i className={edge.direction === 'input' ? styles.inputDot : styles.outputDot} />
                <strong>{getExchangeDirectionLabel(intl, edge.direction)}</strong>
                <em>{connectedNodeName}</em>
                <b>
                  {formatExchangeAmount(edge.amount)}
                  {edge.unit ? ` ${edge.unit}` : ''}
                </b>
              </div>
            );
          })}
          {!edgeRows.length && (
            <small>
              {intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.noHighlightedExchange' })}
            </small>
          )}
        </div>
      </div>
    </aside>
  );
}

function GraphLoadState({
  dataSource,
  description,
  title,
}: {
  dataSource: GraphDataSource;
  description?: string;
  title?: string;
}) {
  const intl = useIntl();
  const isLoading = dataSource === 'loading';
  const displayTitle =
    title ??
    (isLoading ? '' : intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.noData.title' }));
  const displayDescription =
    description ??
    (isLoading
      ? ''
      : intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.noData.description' }));

  return (
    <div
      aria-busy={isLoading}
      aria-live={isLoading ? 'polite' : 'assertive'}
      className={[
        styles.graphLoadState,
        isLoading ? styles.graphLoadStateActive : styles.graphLoadStateError,
      ]
        .filter(Boolean)
        .join(' ')}
      role={isLoading ? 'status' : 'alert'}
    >
      {isLoading ? (
        <div aria-hidden='true' className={styles.graphLoaderScene}>
          <div className={styles.graphLoaderGrid} />
          <div className={styles.graphLoaderOrbit}>
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className={styles.graphLoaderCore}>
            <NodeIndexOutlined />
          </div>
          <div className={styles.graphLoaderBeam} />
        </div>
      ) : (
        <div aria-hidden='true' className={styles.graphNoDataScene}>
          <div className={styles.graphNoDataRadar}>
            <i />
            <i />
            <i />
          </div>
          <div className={styles.graphNoDataCore}>
            <NodeIndexOutlined />
          </div>
          <div className={styles.graphNoDataSparks}>
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
      )}
      <div className={styles.graphLoaderCopy}>
        <strong>{displayTitle}</strong>
        <span>{displayDescription}</span>
      </div>
      {isLoading && (
        <div aria-hidden='true' className={styles.graphLoaderSteps}>
          <i />
          <i />
          <i />
        </div>
      )}
    </div>
  );
}

export default function ProcessFlowGraphPanel() {
  const intl = useIntl();
  const [data, setData] = useState<ProcessFlowGraphData | undefined>();
  const [dataSource, setDataSource] = useState<GraphDataSource>('loading');
  const [loadError, setLoadError] = useState<string | undefined>();
  const [graphCacheReloadToken, setGraphCacheReloadToken] = useState(0);
  const [graphCacheJob, setGraphCacheJob] = useState<
    NationalCarbonGraphCacheWorkerJobResult | undefined
  >();
  const [graphCacheJobError, setGraphCacheJobError] = useState<string | undefined>();
  const [isGraphCacheJobSubmitting, setIsGraphCacheJobSubmitting] = useState(false);
  const [canManageGraphCacheJob, setCanManageGraphCacheJob] = useState(true);
  const [layoutMode, setLayoutMode] = useState<ProcessFlowGraphLayoutName>('sphere3d');
  const [geoMapPendingSourceLayoutMode, setGeoMapPendingSourceLayoutMode] =
    useState<GeoMapPendingSourceLayoutMode>('sphere3d');
  const [mapScope, setMapScope] = useState<ProcessFlowGraphMapScope>('world');
  const [geoMapCacheStatus, setGeoMapCacheStatus] = useState<
    Partial<Record<ProcessFlowGraphMapScope, GeoMapCacheStatus>>
  >({});
  const [geoMapCachedViews, setGeoMapCachedViews] = useState<
    Partial<Record<ProcessFlowGraphMapScope, ProcessFlowGraphGeoMapView>>
  >({});
  const [visibleGeoMapScope, setVisibleGeoMapScope] = useState<
    ProcessFlowGraphMapScope | undefined
  >();
  const [geoMapLoadError, setGeoMapLoadError] = useState<string | undefined>();
  const [interactionMode, setInteractionMode] = useState<ProcessFlowGraphInteractionMode>('select');
  const [query, setQuery] = useState('');
  const [categoryIndexNodeKey, setCategoryIndexNodeKey] = useState('root');
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [exitingInspector, setExitingInspector] = useState<InspectorSnapshot | undefined>();
  const [isLeftRailCollapsed, setIsLeftRailCollapsed] = useState(true);
  const inspectorExitTimeoutRef = useRef<number | undefined>();
  const graphCacheJobCompletionRefreshRef = useRef<string | undefined>();
  const canvasToolbarRef = useRef<HTMLDivElement | null>(null);
  const [canvasToolbarWidth, setCanvasToolbarWidth] = useState<number>();
  const isGeoMapMode = layoutMode === 'geoMap2d';
  const rawCachedGeoMapView = geoMapCachedViews[mapScope];
  const cachedGeoMapView =
    rawCachedGeoMapView?.background.scope === mapScope ? rawCachedGeoMapView : undefined;
  const rawRetainedGeoMapView =
    visibleGeoMapScope === mapScope ? geoMapCachedViews[visibleGeoMapScope] : undefined;
  const retainedGeoMapView =
    rawRetainedGeoMapView?.background.scope === mapScope ? rawRetainedGeoMapView : undefined;
  const currentGeoMapCacheStatus = geoMapCacheStatus[mapScope] ?? 'idle';
  const geoMapView = cachedGeoMapView;
  const displayedGeoMapView = geoMapView ?? retainedGeoMapView;
  const isGeoMapPending =
    isGeoMapMode &&
    Boolean(data) &&
    !geoMapView &&
    (currentGeoMapCacheStatus === 'idle' || currentGeoMapCacheStatus === 'loading');
  const activeData = isGeoMapMode
    ? (displayedGeoMapView?.data ?? (isGeoMapPending ? data : undefined))
    : data;
  const activeMapBackground = isGeoMapMode ? displayedGeoMapView?.background : undefined;
  const localizedActiveMapBackground = useMemo(() => {
    if (!activeMapBackground) {
      return undefined;
    }

    return {
      ...activeMapBackground,
      paths: activeMapBackground.paths.map((mapPath) => ({
        ...mapPath,
        label: getDashboardMapPathLabel(intl, mapPath.code, mapPath.label),
      })),
    };
  }, [activeMapBackground, intl]);
  const activeLayoutMode: ProcessFlowGraphLayoutName = isGeoMapPending
    ? displayedGeoMapView
      ? 'geoMap2d'
      : geoMapPendingSourceLayoutMode
    : layoutMode;
  const shouldShowProcessSearch = activeLayoutMode === 'geoMap2d';
  const selectedNode = useMemo(
    () => (activeData ? getProcessFlowGraphNode(activeData, selectedNodeId) : undefined),
    [activeData, selectedNodeId],
  );
  const selection = useMemo(
    () => (activeData ? getProcessFlowGraphSelection(activeData, selectedNodeId) : undefined),
    [activeData, selectedNodeId],
  );
  const normalizedCategoryTreeQuery = query.trim().toLowerCase();
  const categoryIndexNodes = useMemo(() => {
    if (!activeData) {
      return [];
    }

    return activeData.nodes.filter((node) =>
      shouldShowProcessSearch ? node.kind === 'process' : node.kind === 'flow',
    );
  }, [activeData, shouldShowProcessSearch]);
  const categoryTree = useMemo(() => {
    if (!categoryIndexNodes.length) {
      return undefined;
    }

    return buildCategoryTree(intl, categoryIndexNodes);
  }, [categoryIndexNodes, intl]);
  const activeCategoryIndexNode = useMemo(() => {
    if (!categoryTree) {
      return undefined;
    }

    return findCategoryTreeNodeByKey(categoryTree, categoryIndexNodeKey) ?? categoryTree;
  }, [categoryIndexNodeKey, categoryTree]);
  const activeCategoryBreadcrumbLabel = useMemo(() => {
    if (!categoryTree || !activeCategoryIndexNode) {
      return '';
    }

    return getCategoryBreadcrumbLabel(
      getCategoryTreeBreadcrumbs(categoryTree, activeCategoryIndexNode),
    );
  }, [activeCategoryIndexNode, categoryTree]);
  const leftRailStyle = useMemo(() => {
    const maxWidth = canvasToolbarWidth ?? minCategoryMenuWidth;
    const menuWidth = getAdaptiveCategoryMenuWidth(activeCategoryBreadcrumbLabel, maxWidth);

    return {
      '--left-rail-max-width': `${maxWidth}px`,
      '--left-rail-width': `${menuWidth}px`,
    } as CSSProperties;
  }, [activeCategoryBreadcrumbLabel, canvasToolbarWidth]);
  const categorySearchResults = useMemo(
    () =>
      getCategorySearchResults(intl, categoryTree, categoryIndexNodes, normalizedCategoryTreeQuery),
    [categoryIndexNodes, categoryTree, intl, normalizedCategoryTreeQuery],
  );
  const isCategoryTreeSearchMode = normalizedCategoryTreeQuery.length > 0;
  const categoryTreeNodeKindLabel = shouldShowProcessSearch
    ? intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.process' })
    : intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.flow' });
  const searchPlaceholder = shouldShowProcessSearch
    ? intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.searchProcess' })
    : intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.searchFlow' });
  const searchAriaLabel = shouldShowProcessSearch
    ? intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.searchProcessAria' })
    : intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.searchFlowAria' });
  const quickSelectTarget = useMemo(
    () => getQuickSelectTarget(intl, layoutMode, mapScope),
    [intl, layoutMode, mapScope],
  );
  const quickSelectNode = useMemo(
    () => (activeData ? getProcessFlowGraphNode(activeData, quickSelectTarget.nodeId) : undefined),
    [activeData, quickSelectTarget.nodeId],
  );
  const quickSelectTitle = intl.formatMessage(
    { id: 'pages.home.nationalCarbon.graph.quickSelect' },
    { target: quickSelectTarget.label },
  );
  const graphCacheJobStatusLabel = getGraphCacheJobStatusLabel(intl, graphCacheJob);
  const graphCacheJobIsActive = isGraphCacheJobActive(graphCacheJob);
  const graphCacheJobHasFailure =
    isGraphCacheJobFailure(graphCacheJob) || Boolean(graphCacheJobError);
  const graphCacheJobButtonTitle = graphCacheJobError
    ? intl.formatMessage(
        { id: 'pages.home.nationalCarbon.graph.cache.error' },
        { error: formatCacheError(graphCacheJobError) },
      )
    : graphCacheJobIsActive
      ? intl.formatMessage(
          { id: 'pages.home.nationalCarbon.graph.cache.status' },
          { status: graphCacheJobStatusLabel },
        )
      : graphCacheJob?.status === 'completed'
        ? intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.cache.rerun' })
        : intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.cache.run' });
  const graphCacheJobButtonClassName = [
    styles.cacheJobButton,
    graphCacheJobIsActive || isGraphCacheJobSubmitting ? styles.cacheJobButtonActive : '',
    graphCacheJob?.status === 'completed' ? styles.cacheJobButtonComplete : '',
    graphCacheJobHasFailure ? styles.cacheJobButtonError : '',
  ]
    .filter(Boolean)
    .join(' ');

  const cancelInspectorExit = useCallback(() => {
    if (inspectorExitTimeoutRef.current !== undefined) {
      window.clearTimeout(inspectorExitTimeoutRef.current);
      inspectorExitTimeoutRef.current = undefined;
    }

    setExitingInspector(undefined);
  }, []);

  const selectNode = useCallback(
    (nodeId: string) => {
      cancelInspectorExit();
      setSelectedNodeId(nodeId);
    },
    [cancelInspectorExit],
  );

  const reloadProcessFlowGraphCacheView = useCallback(() => {
    resetProcessFlowGraphCacheLoaderState();
    setGeoMapCachedViews({});
    setGeoMapCacheStatus({});
    setVisibleGeoMapScope(undefined);
    setGeoMapLoadError(undefined);
    setData(undefined);
    setDataSource('loading');
    setLoadError(undefined);
    setSelectedNodeId(undefined);
    setQuery('');
    setGraphCacheReloadToken((currentToken) => currentToken + 1);
  }, []);

  const clearSelectedNodeWithInspectorExit = useCallback(() => {
    if (inspectorExitTimeoutRef.current !== undefined) {
      window.clearTimeout(inspectorExitTimeoutRef.current);
      inspectorExitTimeoutRef.current = undefined;
    }

    if (activeData && selectedNode) {
      setExitingInspector({
        data: activeData,
        node: selectedNode,
      });
      inspectorExitTimeoutRef.current = window.setTimeout(() => {
        setExitingInspector(undefined);
        inspectorExitTimeoutRef.current = undefined;
      }, inspectorExitAnimationMs);
    } else {
      setExitingInspector(undefined);
    }

    setSelectedNodeId(undefined);
  }, [activeData, selectedNode]);

  const handleNavigateCategoryIndexNode = useCallback((nodeKey: string) => {
    setCategoryIndexNodeKey(nodeKey);
  }, []);

  const handleNavigateSearchCategory = useCallback((nodeKey: string) => {
    setQuery('');
    setCategoryIndexNodeKey(nodeKey);
  }, []);

  useEffect(() => {
    const toolbarElement = canvasToolbarRef.current;

    if (!toolbarElement) {
      return undefined;
    }

    const updateToolbarWidth = () => {
      const nextWidth = Math.round(toolbarElement.getBoundingClientRect().width);

      if (nextWidth <= 0) {
        return;
      }

      setCanvasToolbarWidth((currentWidth) =>
        currentWidth === nextWidth ? currentWidth : nextWidth,
      );
    };

    updateToolbarWidth();

    const toolbarResizeObserver =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(updateToolbarWidth);

    toolbarResizeObserver?.observe(toolbarElement);
    window.addEventListener('resize', updateToolbarWidth);

    return () => {
      toolbarResizeObserver?.disconnect();
      window.removeEventListener('resize', updateToolbarWidth);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let initialGeoMapPrefetchGraceTimeoutId: number | undefined;

    setDataSource('loading');
    setLoadError(undefined);

    const markGeoMapPrefetchLoading = (scope: ProcessFlowGraphMapScope) => {
      setGeoMapCacheStatus((currentStatus) => {
        if (currentStatus[scope] === 'hit' || currentStatus[scope] === 'loading') {
          return currentStatus;
        }

        return {
          ...currentStatus,
          [scope]: 'loading',
        };
      });
    };

    const markGeoMapPrefetchIdle = (scope: ProcessFlowGraphMapScope) => {
      setGeoMapCacheStatus((currentStatus) => {
        if (currentStatus[scope] !== 'loading') {
          return currentStatus;
        }

        return {
          ...currentStatus,
          [scope]: 'idle',
        };
      });
    };

    const prefetchGeoMapScope = async (
      scope: ProcessFlowGraphMapScope,
    ): Promise<ProcessFlowGraphGeoMapView | undefined> => {
      markGeoMapPrefetchLoading(scope);

      try {
        const cachedView = await loadProcessFlowGraphGeoMapViewFromCache(scope);
        if (cancelled) {
          return cachedView;
        }

        if (!cachedView) {
          markGeoMapPrefetchIdle(scope);
          return undefined;
        }

        setGeoMapCachedViews((currentViews) => {
          if (currentViews[scope]) {
            return currentViews;
          }

          return {
            ...currentViews,
            [scope]: cachedView,
          };
        });
        setGeoMapCacheStatus((currentStatus) => ({
          ...currentStatus,
          [scope]: 'hit',
        }));
        return cachedView;
      } catch {
        if (!cancelled) {
          markGeoMapPrefetchIdle(scope);
        }
        return undefined;
      }
    };

    const worldGeoMapPrefetch = prefetchGeoMapScope('world');
    void worldGeoMapPrefetch.finally(() => {
      if (!cancelled) {
        void prefetchGeoMapScope('china');
      }
    });

    const initialGeoMapPrefetchWindow = new Promise<void>((resolve) => {
      let settled = false;
      const settle = () => {
        if (settled) {
          return;
        }

        settled = true;
        if (initialGeoMapPrefetchGraceTimeoutId !== undefined) {
          window.clearTimeout(initialGeoMapPrefetchGraceTimeoutId);
        }
        resolve();
      };

      initialGeoMapPrefetchGraceTimeoutId = window.setTimeout(settle, initialGeoMapPrefetchGraceMs);
      void worldGeoMapPrefetch.finally(settle);
    });

    loadProcessFlowGraphFromCache()
      .then(async (cacheData) => {
        await initialGeoMapPrefetchWindow;
        if (cancelled) {
          return;
        }
        setData(cacheData);
        setDataSource('minio');
        setLoadError(undefined);
        setSelectedNodeId(undefined);
        setQuery('');
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setData(undefined);
        setDataSource('error');
        setLoadError(error instanceof Error ? error.message : String(error));
        setSelectedNodeId(undefined);
        setQuery('');
      });

    return () => {
      cancelled = true;
      if (initialGeoMapPrefetchGraceTimeoutId !== undefined) {
        window.clearTimeout(initialGeoMapPrefetchGraceTimeoutId);
      }
    };
  }, [graphCacheReloadToken]);

  useEffect(
    () => () => {
      if (inspectorExitTimeoutRef.current !== undefined) {
        window.clearTimeout(inspectorExitTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    setCategoryIndexNodeKey('root');
  }, [shouldShowProcessSearch]);

  useEffect(() => {
    if (!categoryTree || findCategoryTreeNodeByKey(categoryTree, categoryIndexNodeKey)) {
      return;
    }

    setCategoryIndexNodeKey('root');
  }, [categoryIndexNodeKey, categoryTree]);

  useEffect(() => {
    if (!isGeoMapMode || !data || cachedGeoMapView) {
      return undefined;
    }

    let cancelled = false;
    let settled = false;

    setGeoMapCacheStatus((currentStatus) => ({
      ...currentStatus,
      [mapScope]: 'loading',
    }));

    const timeoutId = window.setTimeout(() => {
      if (cancelled || settled) {
        return;
      }

      settled = true;
      setGeoMapCacheStatus((currentStatus) => ({
        ...currentStatus,
        [mapScope]: 'miss',
      }));
      setGeoMapLoadError(
        intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.mapCacheMissing' }),
      );
    }, geoMapCacheSoftTimeoutMs);

    loadProcessFlowGraphGeoMapViewFromCache(mapScope)
      .then((cachedView) => {
        if (cancelled || settled) {
          return;
        }

        settled = true;
        window.clearTimeout(timeoutId);

        if (!cachedView) {
          setGeoMapCacheStatus((currentStatus) => ({
            ...currentStatus,
            [mapScope]: 'miss',
          }));
          setGeoMapLoadError(
            intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.mapCacheMissing' }),
          );
          return;
        }

        setGeoMapCachedViews((currentViews) => ({
          ...currentViews,
          [mapScope]: cachedView,
        }));
        setGeoMapCacheStatus((currentStatus) => ({
          ...currentStatus,
          [mapScope]: 'hit',
        }));
        setGeoMapLoadError(undefined);
      })
      .catch(() => {
        if (cancelled || settled) {
          return;
        }

        settled = true;
        window.clearTimeout(timeoutId);
        setGeoMapCacheStatus((currentStatus) => ({
          ...currentStatus,
          [mapScope]: 'error',
        }));
        setGeoMapLoadError(
          intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.mapCacheLoadError' }),
        );
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [cachedGeoMapView, data, intl, isGeoMapMode, mapScope]);

  useEffect(() => {
    if (!isGeoMapMode) {
      setVisibleGeoMapScope(undefined);
      return;
    }

    if (cachedGeoMapView) {
      setVisibleGeoMapScope(mapScope);
    }
  }, [cachedGeoMapView, isGeoMapMode, mapScope]);

  useEffect(() => {
    if (activeData && selectedNodeId && !getProcessFlowGraphNode(activeData, selectedNodeId)) {
      setSelectedNodeId(undefined);
    }
  }, [activeData, selectedNodeId]);

  useEffect(() => {
    setInteractionMode(selectedNodeId ? 'pan' : 'select');
  }, [selectedNodeId]);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (selectedNodeId === nodeId) {
        clearSelectedNodeWithInspectorExit();
        return;
      }

      selectNode(nodeId);
    },
    [clearSelectedNodeWithInspectorExit, selectedNodeId, selectNode],
  );

  const handleToggleMapMode = useCallback(() => {
    setSelectedNodeId(undefined);

    if (layoutMode !== 'geoMap2d') {
      setGeoMapPendingSourceLayoutMode(layoutMode);
      setMapScope('world');
      setLayoutMode('geoMap2d');
      setQuery('');
      return;
    }

    setMapScope((currentScope) => (currentScope === 'world' ? 'china' : 'world'));
    setQuery('');
  }, [layoutMode]);

  const handleSelectSphereMode = useCallback(() => {
    setGeoMapPendingSourceLayoutMode('sphere3d');
    setLayoutMode('sphere3d');
    setQuery('');
  }, []);

  const handleSelectExpandedMode = useCallback(() => {
    setGeoMapPendingSourceLayoutMode('expanded2d');
    setLayoutMode('expanded2d');
    setQuery('');
  }, []);

  const handleQuickSelectNode = useCallback(() => {
    if (quickSelectNode) {
      selectNode(quickSelectNode.id);
    }
  }, [quickSelectNode, selectNode]);

  const handleToggleLeftRail = useCallback(() => {
    setIsLeftRailCollapsed((currentCollapsed) => !currentCollapsed);
  }, []);

  const handleTriggerGraphCacheJob = useCallback(() => {
    Modal.confirm({
      title: intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.cache.modal.title' }),
      content: intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.cache.modal.content' }),
      okText: intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.cache.modal.run' }),
      cancelText: intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.cache.modal.cancel' }),
      centered: true,
      onOk: async () => {
        setIsGraphCacheJobSubmitting(true);
        setGraphCacheJobError(undefined);

        try {
          const result = await requestNationalCarbonGraphCacheJobsApi({
            action: 'enqueue',
          });

          if (result.error) {
            if (result.status === 401 || result.status === 403) {
              setCanManageGraphCacheJob(false);
            }
            setGraphCacheJobError(result.error.message);
            message.error(
              intl.formatMessage(
                { id: 'pages.home.nationalCarbon.graph.cache.submitFailed' },
                { error: result.error.message },
              ),
            );
            return;
          }

          const nextJob = getFirstGraphCacheJob(result.data);
          setGraphCacheJob(nextJob);
          if (nextJob?.id && nextJob.status !== 'completed') {
            graphCacheJobCompletionRefreshRef.current = undefined;
          }
          message.success(
            isGraphCacheJobActive(nextJob)
              ? intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.cache.queued' })
              : intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.cache.submitted' }),
          );
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          setGraphCacheJobError(errorMessage);
          message.error(
            intl.formatMessage(
              { id: 'pages.home.nationalCarbon.graph.cache.submitFailed' },
              { error: errorMessage },
            ),
          );
        } finally {
          setIsGraphCacheJobSubmitting(false);
        }
      },
    });
  }, [intl]);

  useEffect(() => {
    let cancelled = false;

    requestNationalCarbonGraphCacheJobsApi({
      action: 'read_latest',
      limit: 1,
    })
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (result.error) {
          if (result.status === 401 || result.status === 403) {
            setCanManageGraphCacheJob(false);
          }
          return;
        }

        const latestJob = getFirstGraphCacheJob(result.data);
        if (latestJob?.id && latestJob.status === 'completed') {
          graphCacheJobCompletionRefreshRef.current = latestJob.id;
        }
        setGraphCacheJob(latestJob);
        setCanManageGraphCacheJob(true);
      })
      .catch(() => {
        if (!cancelled) {
          setGraphCacheJob(undefined);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!graphCacheJob?.id || !isGraphCacheJobActive(graphCacheJob)) {
      return undefined;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      requestNationalCarbonGraphCacheJobsApi({
        action: 'read',
        jobId: graphCacheJob.id as string,
      })
        .then((result) => {
          if (cancelled) {
            return;
          }

          if (result.error) {
            if (result.status === 401 || result.status === 403) {
              setCanManageGraphCacheJob(false);
            }
            setGraphCacheJobError(result.error.message);
            return;
          }

          const nextJob = getFirstGraphCacheJob(result.data);
          if (nextJob) {
            setGraphCacheJob(nextJob);
            setGraphCacheJobError(undefined);
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setGraphCacheJobError(error instanceof Error ? error.message : String(error));
          }
        });
    }, graphCacheJobPollDelayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [graphCacheJob]);

  useEffect(() => {
    if (!graphCacheJob?.id) {
      return;
    }

    if (graphCacheJob.status === 'completed') {
      if (graphCacheJobCompletionRefreshRef.current === graphCacheJob.id) {
        return;
      }

      graphCacheJobCompletionRefreshRef.current = graphCacheJob.id;
      message.success(
        intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.cache.completed' }),
      );
      reloadProcessFlowGraphCacheView();
      return;
    }

    if (isGraphCacheJobFailure(graphCacheJob)) {
      setGraphCacheJobError(
        graphCacheJob.errorMessage || getGraphCacheJobStatusLabel(intl, graphCacheJob),
      );
    }
  }, [graphCacheJob, intl, reloadProcessFlowGraphCacheView]);

  const mapButtonLabel =
    isGeoMapMode && mapScope === 'world'
      ? intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.chinaMap' })
      : intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.worldMap' });
  const mapLoadDataSource: GraphDataSource =
    isGeoMapMode && data && !geoMapView ? (geoMapLoadError ? 'error' : 'loading') : dataSource;
  const mapLoadError = isGeoMapMode && data && !geoMapView ? geoMapLoadError : loadError;
  const leftRailToggleLabel = isLeftRailCollapsed
    ? intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.expandIndex' })
    : intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.collapseIndex' });
  const panelShellClassName = [
    styles.panelShell,
    isLeftRailCollapsed ? styles.panelShellLeftCollapsed : '',
  ]
    .filter(Boolean)
    .join(' ');
  const searchBoxClassName = [styles.searchBox, query ? styles.searchBoxActive : '']
    .filter(Boolean)
    .join(' ');
  const leftRailClassName = [styles.leftRail, isLeftRailCollapsed ? styles.leftRailCollapsed : '']
    .filter(Boolean)
    .join(' ');
  const inspectorView =
    selectedNode && activeData
      ? {
          data: activeData,
          isExiting: false,
          node: selectedNode,
        }
      : exitingInspector
        ? {
            data: exitingInspector.data,
            isExiting: true,
            node: exitingInspector.node,
          }
        : undefined;

  return (
    <div className={panelShellClassName}>
      <aside aria-hidden={isLeftRailCollapsed} className={leftRailClassName} style={leftRailStyle}>
        <div className={styles.leftRailHeader}>
          <label className={searchBoxClassName}>
            <span className={styles.searchBoxIcon} aria-hidden='true'>
              <SearchOutlined />
            </span>
            <input
              aria-label={searchAriaLabel}
              disabled={!activeData || isLeftRailCollapsed}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              value={query}
            />
            {query && (
              <button
                aria-label={intl.formatMessage({
                  id: 'pages.home.nationalCarbon.graph.clearSearch',
                })}
                disabled={isLeftRailCollapsed}
                onClick={() => setQuery('')}
                type='button'
              >
                <CloseCircleOutlined />
              </button>
            )}
          </label>
        </div>
        <div className={styles.categoryTreePanel}>
          {categoryTree && activeCategoryIndexNode ? (
            isCategoryTreeSearchMode ? (
              <CategorySearchPanel
                nodeKindLabel={categoryTreeNodeKindLabel}
                onNavigateCategory={handleNavigateSearchCategory}
                onSelectNode={selectNode}
                results={categorySearchResults}
                selectedNodeId={selectedNodeId}
              />
            ) : (
              <CategoryRadarIndex
                activeNode={activeCategoryIndexNode}
                categoryTree={categoryTree}
                nodeKindLabel={categoryTreeNodeKindLabel}
                onNavigate={handleNavigateCategoryIndexNode}
                onSelectNode={selectNode}
                selectedNodeId={selectedNodeId}
              />
            )
          ) : (
            <div className={styles.categoryTreeEmpty} role='status'>
              {intl.formatMessage(
                { id: 'pages.home.nationalCarbon.graph.noSearchMatch' },
                { kind: categoryTreeNodeKindLabel },
              )}
            </div>
          )}
        </div>
      </aside>
      <main className={styles.graphStage}>
        <div
          aria-label={intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.toolbar' })}
          className={styles.canvasToolbar}
          ref={canvasToolbarRef}
        >
          <div className={styles.railToggleTools}>
            <button
              aria-expanded={!isLeftRailCollapsed}
              aria-label={leftRailToggleLabel}
              aria-pressed={!isLeftRailCollapsed}
              onClick={handleToggleLeftRail}
              title={leftRailToggleLabel}
              type='button'
            >
              <span className={styles.railDrawerIcon} aria-hidden='true'>
                <i />
                {isLeftRailCollapsed ? <CaretDownOutlined /> : <CaretUpOutlined />}
              </span>
            </button>
          </div>
          <div className={styles.modeTabs}>
            <button
              aria-label={intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.sphere' })}
              aria-pressed={layoutMode === 'sphere3d'}
              className={layoutMode === 'sphere3d' ? styles.activeMode : ''}
              onClick={handleSelectSphereMode}
              title={intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.sphere' })}
              type='button'
            >
              <GlobalOutlined />
            </button>
            <button
              aria-label={intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.expanded' })}
              aria-pressed={layoutMode === 'expanded2d'}
              className={layoutMode === 'expanded2d' ? styles.activeMode : ''}
              onClick={handleSelectExpandedMode}
              title={intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.expanded' })}
              type='button'
            >
              <ApartmentOutlined />
            </button>
            <button
              aria-label={mapButtonLabel}
              aria-pressed={layoutMode === 'geoMap2d'}
              className={layoutMode === 'geoMap2d' ? styles.activeMode : ''}
              onClick={handleToggleMapMode}
              title={mapButtonLabel}
              type='button'
            >
              <EnvironmentOutlined />
            </button>
          </div>
          <div className={styles.mouseTools}>
            <button
              aria-label={intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.pan' })}
              aria-pressed={interactionMode === 'pan'}
              className={interactionMode === 'pan' ? styles.activeMode : ''}
              onClick={() => setInteractionMode('pan')}
              title={intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.pan' })}
              type='button'
            >
              <DragOutlined />
            </button>
            <button
              aria-label={intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.pick' })}
              aria-pressed={interactionMode === 'select'}
              className={interactionMode === 'select' ? styles.activeMode : ''}
              onClick={() => setInteractionMode('select')}
              title={intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.pick' })}
              type='button'
            >
              <SelectOutlined />
            </button>
          </div>
          <div className={styles.selectionTools}>
            <button
              aria-label={quickSelectTitle}
              disabled={!quickSelectNode}
              onClick={handleQuickSelectNode}
              title={quickSelectTitle}
              type='button'
            >
              <AimOutlined />
            </button>
            <button
              aria-label={intl.formatMessage({
                id: 'pages.home.nationalCarbon.graph.clearSelection',
              })}
              disabled={!activeData || !selectedNodeId}
              onClick={clearSelectedNodeWithInspectorExit}
              title={intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.clearSelection' })}
              type='button'
            >
              <ClearOutlined />
            </button>
          </div>
          {canManageGraphCacheJob && (
            <div className={styles.cacheJobTools}>
              <button
                aria-label={graphCacheJobButtonTitle}
                aria-pressed={graphCacheJobIsActive}
                className={graphCacheJobButtonClassName}
                disabled={isGraphCacheJobSubmitting || graphCacheJobIsActive}
                onClick={handleTriggerGraphCacheJob}
                title={graphCacheJobButtonTitle}
                type='button'
              >
                {isGraphCacheJobSubmitting || graphCacheJobIsActive ? (
                  <LoadingOutlined spin />
                ) : (
                  <SyncOutlined />
                )}
              </button>
            </div>
          )}
          <dl
            aria-label={intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.scale' })}
            className={styles.graphBadges}
          >
            <div title={intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.nodes' })}>
              <dt className={styles.graphMetricLabel}>
                {intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.nodes' })}
              </dt>
              <dd className={styles.graphMetricValue}>
                <DotChartOutlined aria-hidden='true' />
                <b>{formatNumber(activeData?.nodes.length ?? 0)}</b>
              </dd>
            </div>
            <div title={intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.edges' })}>
              <dt className={styles.graphMetricLabel}>
                {intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.edges' })}
              </dt>
              <dd className={styles.graphMetricValue}>
                <NodeIndexOutlined aria-hidden='true' />
                <b>{formatNumber(activeData?.edges.length ?? 0)}</b>
              </dd>
            </div>
          </dl>
        </div>
        {activeData && selection ? (
          <>
            <ProcessFlowGraphCanvas
              data={activeData}
              geoMapBackground={localizedActiveMapBackground}
              interactionMode={interactionMode}
              layoutMode={activeLayoutMode}
              onNodeClick={handleNodeClick}
              selection={selection}
            />
            {isGeoMapPending && (
              <div className={styles.mapPreparingOverlay}>
                <strong>
                  {intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.mapLoading.title' })}
                </strong>
                <span>
                  {intl.formatMessage({
                    id: 'pages.home.nationalCarbon.graph.mapLoading.description',
                  })}
                </span>
              </div>
            )}
            {inspectorView && (
              <Inspector
                data={inspectorView.data}
                isExiting={inspectorView.isExiting}
                key={`${inspectorView.isExiting ? 'exiting' : 'selected'}-${inspectorView.node.id}`}
                node={inspectorView.node}
              />
            )}
          </>
        ) : (
          <GraphLoadState
            dataSource={mapLoadDataSource}
            description={
              isGeoMapMode && data && !geoMapView
                ? mapLoadError
                  ? formatCacheError(mapLoadError)
                  : intl.formatMessage({
                      id: 'pages.home.nationalCarbon.graph.mapLoading.waitingForBoth',
                    })
                : undefined
            }
            title={
              isGeoMapMode && data && !geoMapView
                ? intl.formatMessage({ id: 'pages.home.nationalCarbon.graph.mapLoading.layout' })
                : undefined
            }
          />
        )}
      </main>
    </div>
  );
}
