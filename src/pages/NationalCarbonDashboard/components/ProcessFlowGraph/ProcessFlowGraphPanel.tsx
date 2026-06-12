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
  NodeIndexOutlined,
  RightOutlined,
  SearchOutlined,
  SelectOutlined,
} from '@ant-design/icons';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from './processFlowGraphCacheLoader';
import styles from './styles.module.less';

const numberFormatter = new Intl.NumberFormat('zh-CN');
const exchangeAmountFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 8,
});
const geoMapCacheSoftTimeoutMs = 4500;
const initialGeoMapPrefetchGraceMs = 900;
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

type QuickSelectTarget = {
  label: string;
  nodeId: string;
};

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function getQuickSelectTarget(
  layoutMode: ProcessFlowGraphLayoutName,
  mapScope: ProcessFlowGraphMapScope,
): QuickSelectTarget {
  if (layoutMode === 'geoMap2d') {
    return mapScope === 'china'
      ? {
          label: '粗钢生产',
          nodeId: quickSelectChinaMapProcessNodeId,
        }
      : {
          label: '多晶硅光伏系统',
          nodeId: quickSelectWorldMapProcessNodeId,
        };
  }

  return {
    label: '石灰石',
    nodeId: quickSelectOverviewFlowNodeId,
  };
}

function formatCacheError(error: string): string {
  if (error.length <= maxCacheErrorLength) {
    return error;
  }

  return `${error.slice(0, maxCacheErrorLength - 1)}...`;
}

function getFlowTypeLabel(flowType?: string) {
  if (flowType === 'Product flow') {
    return '产品流';
  }
  if (flowType === 'Waste flow') {
    return '废物流';
  }
  if (flowType === 'Other flow') {
    return '其他流';
  }
  return '非基础流';
}

const categoryLabelTranslations: Record<string, string> = {
  'Agriculture, forestry and fishing': '农业、林业和渔业',
  'Electricity, gas, steam and air conditioning supply': '电力、燃气、蒸汽和空调供应',
  'Manufacture of chemicals and chemical products': '化学品及化学制品制造',
  'Manufacture of computer, electronic and optical products': '计算机、电子和光学产品制造',
  Manufacturing: '制造业',
  'Ores and minerals': '矿石与矿物',
  Transport: '运输',
  'Water supply; sewerage, waste management and remediation activities':
    '供水、污水处理、废弃物管理和修复活动',
};

function getCategoryPartLabel(categoryPart: string) {
  const trimmedPart = categoryPart.trim();
  return categoryLabelTranslations[trimmedPart] ?? trimmedPart;
}

function getLegacyCategoryParts(category?: string) {
  const categoryParts =
    category
      ?.split(categoryPathDelimiter)
      .map((part) => part.trim())
      .filter(Boolean) ?? [];

  if (!categoryParts.length) {
    return ['未分类'];
  }

  const cappedCategoryParts =
    categoryParts.length <= maxCategoryTreeDepth
      ? categoryParts
      : [
          ...categoryParts.slice(0, maxCategoryTreeDepth - 1),
          categoryParts.slice(maxCategoryTreeDepth - 1).join(categoryPathDelimiter),
        ];

  return cappedCategoryParts.map(getCategoryPartLabel);
}

function getCategoryLabel(category?: string) {
  if (!category) {
    return '-';
  }

  return getLegacyCategoryParts(category).join(categoryPathDelimiter);
}

function getNodeCategoryParts(node: ProcessFlowGraphNode) {
  const structuredParts =
    node.categoryPath?.map((item) => (item.zhName || item.name).trim()).filter(Boolean) ?? [];

  return structuredParts.length ? structuredParts : getLegacyCategoryParts(node.category);
}

function getNodeCategoryDisplayPath(node: ProcessFlowGraphNode) {
  const categoryDisplayPath = node.categoryDisplayPath?.trim();
  if (categoryDisplayPath) {
    return categoryDisplayPath;
  }

  return getNodeCategoryParts(node).join(categoryPathDelimiter) || '-';
}

function getNodeCategorySearchValues(node: ProcessFlowGraphNode) {
  return [
    node.category,
    getCategoryLabel(node.category),
    node.categoryDisplayPath,
    getNodeCategoryDisplayPath(node),
    node.categorySystem,
    ...(node.categoryPath?.flatMap((item) => [
      item.id,
      item.name,
      item.zhName,
      String(item.level),
    ]) ?? []),
  ];
}

function getExchangeDirectionLabel(direction: ProcessFlowGraphEdge['direction']) {
  return direction === 'input' ? '输入' : '输出';
}

function formatExchangeAmount(amount?: number) {
  return Number.isFinite(amount) ? exchangeAmountFormatter.format(amount as number) : '-';
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
): MutableCategoryTreeNode {
  return {
    children: [],
    childrenByRawLabel: new Map<string, MutableCategoryTreeNode>(),
    count: 0,
    depth,
    exchangeCount: 0,
    items: [],
    key: getCategoryTreeNodeKey(path),
    label: rawLabel || '全部分类',
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

function buildCategoryTree(nodes: ProcessFlowGraphNode[]): CategoryTreeNode {
  const rootNode = createCategoryTreeNode('', [], 0);

  nodes.forEach((graphNode) => {
    let currentNode = rootNode;
    currentNode.count += 1;
    currentNode.exchangeCount += graphNode.degree;

    getNodeCategoryParts(graphNode).forEach((categoryPart, categoryIndex) => {
      const childPath = [...currentNode.path, categoryPart];
      let childNode = currentNode.childrenByRawLabel.get(categoryPart);

      if (!childNode) {
        childNode = createCategoryTreeNode(categoryPart, childPath, categoryIndex + 1);
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

function doesCategoryTreeSearchMatch(node: ProcessFlowGraphNode, normalizedQuery: string) {
  if (!normalizedQuery) {
    return true;
  }

  return [
    node.id,
    node.name,
    ...getNodeCategorySearchValues(node),
    node.location,
    node.flowType,
    node.flowType ? getFlowTypeLabel(node.flowType) : undefined,
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
      label: '全部',
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

  const matchingNodes = nodes.filter((node) => doesCategoryTreeSearchMatch(node, normalizedQuery));

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
    <section className={sectionClassName} aria-label='分类雷达索引'>
      {shouldShowBreadcrumbPath && (
        <nav
          className={styles.categoryIndexPath}
          aria-label={`当前分类路径：${breadcrumbLabel}`}
          title={breadcrumbLabel}
        >
          {leadingBreadcrumbs.map((breadcrumb, index) => renderBreadcrumbButton(breadcrumb, index))}
          {shouldCollapseBreadcrumbs && (
            <span className={styles.categoryIndexOverflow}>
              <button
                aria-haspopup='menu'
                className={styles.categoryIndexOverflowButton}
                title='悬浮查看中间分类'
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
          当前分类暂无{nodeKindLabel}
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
  const hasResults = results.totalCategoryMatches > 0 || results.totalNodeMatches > 0;
  const shouldShowNodeMatches = results.nodeMatches.length > 0;
  const shouldShowCategoryMatches = !shouldShowNodeMatches && results.categoryMatches.length > 0;
  const maxCategoryCount = Math.max(1, ...results.categoryMatches.map((node) => node.count));
  const visibleSearchLimit = shouldShowNodeMatches
    ? maxNodeSearchResults
    : maxCategorySearchResults;
  const visibleSearchType = shouldShowNodeMatches ? nodeKindLabel : '分类';
  const hasMoreVisibleResults = shouldShowNodeMatches
    ? results.totalNodeMatches > results.nodeMatches.length
    : results.totalCategoryMatches > results.categoryMatches.length;

  return (
    <section className={styles.categorySearchPanel} aria-label='分类搜索结果'>
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
                    title={`${itemNode.name} / ${getNodeCategoryDisplayPath(itemNode)}`}
                    type='button'
                  >
                    <strong>{itemNode.name}</strong>
                    <small>{getNodeCategoryDisplayPath(itemNode)}</small>
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
              仅展示前 {visibleSearchLimit} 条匹配{visibleSearchType}
              ，可继续输入关键词缩小范围
            </div>
          )}
        </>
      ) : (
        <div className={styles.categoryTreeEmpty} role='status'>
          未找到匹配的{nodeKindLabel}
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
          <span>关联过程</span>
          <strong>{formatNumber(summary.relatedProcesses)}</strong>
        </div>
        <div>
          <span>关联流</span>
          <strong>{formatNumber(summary.relatedFlows)}</strong>
        </div>
        <div>
          <span>输入</span>
          <strong>{formatNumber(summary.inputEdges || inputEdges.length)}</strong>
        </div>
        <div>
          <span>输出</span>
          <strong>{formatNumber(summary.outputEdges || outputEdges.length)}</strong>
        </div>
      </div>
      <div className={styles.edgeList}>
        <span>输入/输出（{formatNumber(edgeRows.length)}）</span>
        <div aria-label='输入/输出明细列表' className={styles.edgeRows}>
          {edgeRows.map((edge) => {
            const connectedNodeName = getConnectedNodeName(data, edge, node.id);
            return (
              <div key={edge.id} title={connectedNodeName}>
                <i className={edge.direction === 'input' ? styles.inputDot : styles.outputDot} />
                <strong>{getExchangeDirectionLabel(edge.direction)}</strong>
                <em>{connectedNodeName}</em>
                <b>
                  {formatExchangeAmount(edge.amount)}
                  {edge.unit ? ` ${edge.unit}` : ''}
                </b>
              </div>
            );
          })}
          {!edgeRows.length && <small>暂无高亮交换</small>}
        </div>
      </div>
    </aside>
  );
}

function GraphLoadState({
  dataSource,
  description,
  loadError,
  title,
}: {
  dataSource: GraphDataSource;
  description?: string;
  loadError?: string;
  title?: string;
}) {
  const isLoading = dataSource === 'loading';
  const displayTitle = title ?? (isLoading ? '正在唤醒全量图谱' : 'Process-flow graph unavailable');
  const displayDescription =
    description ??
    (isLoading
      ? '读取 worker manifest / 解压拓扑索引 / 预热地图缓存'
      : loadError
        ? formatCacheError(loadError)
        : 'Cache manifest could not be loaded');

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
      {isLoading && (
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
  const [data, setData] = useState<ProcessFlowGraphData | undefined>();
  const [dataSource, setDataSource] = useState<GraphDataSource>('loading');
  const [loadError, setLoadError] = useState<string | undefined>();
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

    return buildCategoryTree(categoryIndexNodes);
  }, [categoryIndexNodes]);
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
    () => getCategorySearchResults(categoryTree, categoryIndexNodes, normalizedCategoryTreeQuery),
    [categoryIndexNodes, categoryTree, normalizedCategoryTreeQuery],
  );
  const isCategoryTreeSearchMode = normalizedCategoryTreeQuery.length > 0;
  const categoryTreeNodeKindLabel = shouldShowProcessSearch ? '过程' : '流';
  const searchPlaceholder = shouldShowProcessSearch ? '搜索过程' : '搜索流';
  const searchAriaLabel = shouldShowProcessSearch ? '搜索过程节点' : '搜索非基础流';
  const quickSelectTarget = useMemo(
    () => getQuickSelectTarget(layoutMode, mapScope),
    [layoutMode, mapScope],
  );
  const quickSelectNode = useMemo(
    () => (activeData ? getProcessFlowGraphNode(activeData, quickSelectTarget.nodeId) : undefined),
    [activeData, quickSelectTarget.nodeId],
  );
  const quickSelectTitle = `快速选中：${quickSelectTarget.label}`;

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
  }, []);

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
      setGeoMapLoadError(`Missing or timed out ${mapScope} map layout cache`);
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
          setGeoMapLoadError(`Missing or timed out ${mapScope} map layout cache`);
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
        setGeoMapLoadError(`Unable to load ${mapScope} map layout cache`);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [cachedGeoMapView, data, isGeoMapMode, mapScope]);

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

  const mapButtonLabel = isGeoMapMode && mapScope === 'world' ? 'China Map' : 'World Map';
  const mapLoadDataSource: GraphDataSource =
    isGeoMapMode && data && !geoMapView ? (geoMapLoadError ? 'error' : 'loading') : dataSource;
  const mapLoadError = isGeoMapMode && data && !geoMapView ? geoMapLoadError : loadError;
  const leftRailToggleLabel = isLeftRailCollapsed ? '展开索引菜单' : '收起索引菜单';
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
                aria-label='清除搜索'
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
              未找到匹配的{categoryTreeNodeKindLabel}
            </div>
          )}
        </div>
      </aside>
      <main className={styles.graphStage}>
        <div aria-label='图谱工具栏' className={styles.canvasToolbar} ref={canvasToolbarRef}>
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
              aria-label='Sphere'
              aria-pressed={layoutMode === 'sphere3d'}
              className={layoutMode === 'sphere3d' ? styles.activeMode : ''}
              onClick={handleSelectSphereMode}
              title='Sphere'
              type='button'
            >
              <GlobalOutlined />
            </button>
            <button
              aria-label='Expanded'
              aria-pressed={layoutMode === 'expanded2d'}
              className={layoutMode === 'expanded2d' ? styles.activeMode : ''}
              onClick={handleSelectExpandedMode}
              title='Expanded'
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
              aria-label='拖拽浏览'
              aria-pressed={interactionMode === 'pan'}
              className={interactionMode === 'pan' ? styles.activeMode : ''}
              onClick={() => setInteractionMode('pan')}
              title='Drag'
              type='button'
            >
              <DragOutlined />
            </button>
            <button
              aria-label='点选节点'
              aria-pressed={interactionMode === 'select'}
              className={interactionMode === 'select' ? styles.activeMode : ''}
              onClick={() => setInteractionMode('select')}
              title='Pick'
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
              aria-label='清除选中'
              disabled={!activeData || !selectedNodeId}
              onClick={clearSelectedNodeWithInspectorExit}
              title='清除选中'
              type='button'
            >
              <ClearOutlined />
            </button>
          </div>
          <dl aria-label='图谱规模' className={styles.graphBadges}>
            <div title='节点'>
              <dt className={styles.graphMetricLabel}>节点</dt>
              <dd className={styles.graphMetricValue}>
                <DotChartOutlined aria-hidden='true' />
                <b>{formatNumber(activeData?.nodes.length ?? 0)}</b>
              </dd>
            </div>
            <div title='连接'>
              <dt className={styles.graphMetricLabel}>连接</dt>
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
              geoMapBackground={activeMapBackground}
              interactionMode={interactionMode}
              layoutMode={activeLayoutMode}
              onNodeClick={handleNodeClick}
              selection={selection}
            />
            {isGeoMapPending && (
              <div className={styles.mapPreparingOverlay}>
                <strong>Loading map cache</strong>
                <span>Waiting for worker-generated geoMap view</span>
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
                  : 'Waiting for worker-generated world and China map cache'
                : undefined
            }
            loadError={mapLoadError}
            title={isGeoMapMode && data && !geoMapView ? 'Loading map layout' : undefined}
          />
        )}
      </main>
    </div>
  );
}
