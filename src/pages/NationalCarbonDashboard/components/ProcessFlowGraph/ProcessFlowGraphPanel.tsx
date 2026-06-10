import {
  AimOutlined,
  ApartmentOutlined,
  ClearOutlined,
  CloseCircleOutlined,
  DotChartOutlined,
  DragOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  NodeIndexOutlined,
  SearchOutlined,
  SelectOutlined,
} from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  type ProcessFlowGraphSearchItem,
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
const maxRenderedSearchResults = 96;
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

function getCategoryLabel(category?: string) {
  if (!category) {
    return '-';
  }

  return category
    .split(';')
    .map((part) => {
      const trimmedPart = part.trim();
      return categoryLabelTranslations[trimmedPart] ?? trimmedPart;
    })
    .join('；');
}

function getLocationLabel(location?: string) {
  if (!location || location === '-') {
    return '-';
  }

  if (location.toLowerCase() === 'global') {
    return '全球';
  }

  return location;
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
type SearchResultSlice<T> = {
  hasMore: boolean;
  items: T[];
};
const emptyFlowSearchResultSlice: SearchResultSlice<ProcessFlowGraphSearchItem> = {
  hasMore: false,
  items: [],
};
const emptyProcessSearchResultSlice: SearchResultSlice<ProcessFlowGraphNode> = {
  hasMore: false,
  items: [],
};

function getSearchResults(
  data: ProcessFlowGraphData,
  query: string,
  limit = maxRenderedSearchResults,
): SearchResultSlice<ProcessFlowGraphSearchItem> {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return {
      hasMore: data.indexes.searchFlows.length > limit,
      items: data.indexes.searchFlows.slice(0, limit),
    };
  }

  const results: ProcessFlowGraphSearchItem[] = [];
  let hasMore = false;

  for (const flow of data.indexes.searchFlows) {
    if (
      flow.id.toLowerCase().includes(normalizedQuery) ||
      flow.name.toLowerCase().includes(normalizedQuery)
    ) {
      if (results.length < limit) {
        results.push(flow);
      } else {
        hasMore = true;
        break;
      }
    }
  }

  return {
    hasMore,
    items: results,
  };
}

function compareProcessSearchResult(left: ProcessFlowGraphNode, right: ProcessFlowGraphNode) {
  return right.degree - left.degree || left.name.localeCompare(right.name);
}

function appendLimitedProcessSearchResult(
  results: ProcessFlowGraphNode[],
  processNode: ProcessFlowGraphNode,
  limit: number,
) {
  const insertIndex = results.findIndex(
    (currentProcessNode) => compareProcessSearchResult(processNode, currentProcessNode) < 0,
  );

  if (insertIndex === -1) {
    if (results.length < limit) {
      results.push(processNode);
    }
    return;
  }

  results.splice(insertIndex, 0, processNode);
  if (results.length > limit) {
    results.pop();
  }
}

function getProcessSearchResults(
  data: ProcessFlowGraphData,
  query: string,
  limit = maxRenderedSearchResults,
): SearchResultSlice<ProcessFlowGraphNode> {
  const normalizedQuery = query.trim().toLowerCase();
  const results: ProcessFlowGraphNode[] = [];
  let matchedCount = 0;

  for (const node of data.nodes) {
    if (node.kind !== 'process') {
      continue;
    }

    if (
      normalizedQuery &&
      !node.id.toLowerCase().includes(normalizedQuery) &&
      !node.name.toLowerCase().includes(normalizedQuery) &&
      !node.category.toLowerCase().includes(normalizedQuery) &&
      !(node.location?.toLowerCase().includes(normalizedQuery) ?? false)
    ) {
      continue;
    }

    matchedCount += 1;
    appendLimitedProcessSearchResult(results, node, limit);
  }

  return {
    hasMore: matchedCount > limit,
    items: results,
  };
}

function FlowSearchResult({
  flow,
  isSelected,
  onSelect,
}: {
  flow: ProcessFlowGraphSearchItem;
  isSelected: boolean;
  onSelect: (flowId: string) => void;
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={[styles.searchResult, isSelected ? styles.searchResultActive : '']
        .filter(Boolean)
        .join(' ')}
      onClick={() => onSelect(flow.id)}
      type='button'
    >
      <span>{getFlowTypeLabel(flow.flowType)}</span>
      <strong>{flow.name}</strong>
      <small>{flow.id}</small>
      <em>{formatNumber(flow.degree)} exchanges</em>
    </button>
  );
}

function ProcessSearchResult({
  isSelected,
  onSelect,
  processNode,
}: {
  isSelected: boolean;
  onSelect: (processId: string) => void;
  processNode: ProcessFlowGraphNode;
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={[styles.searchResult, isSelected ? styles.searchResultActive : '']
        .filter(Boolean)
        .join(' ')}
      onClick={() => onSelect(processNode.id)}
      type='button'
    >
      <span>Process</span>
      <strong>{processNode.name}</strong>
      <small>{processNode.category}</small>
      <em>
        {processNode.location ?? 'global'} / {formatNumber(processNode.degree)} exchanges
      </em>
    </button>
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
      <div className={styles.inspectorHeader}>
        <span>{node.kind === 'flow' ? '已选流' : '已选过程'}</span>
        <NodeIndexOutlined />
      </div>
      <div className={styles.nodeIdentity}>
        <strong>{node.name}</strong>
        <span>{node.kind === 'flow' ? getFlowTypeLabel(node.flowType) : '过程节点'}</span>
      </div>
      <dl className={styles.nodeDetails}>
        <div>
          <dt>ID</dt>
          <dd>{node.id}</dd>
        </div>
        <div>
          <dt>版本</dt>
          <dd>{node.version}</dd>
        </div>
        <div>
          <dt>分类</dt>
          <dd title={node.category}>{getCategoryLabel(node.category)}</dd>
        </div>
        <div>
          <dt>位置</dt>
          <dd>{getLocationLabel(node.location)}</dd>
        </div>
      </dl>
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [exitingInspector, setExitingInspector] = useState<InspectorSnapshot | undefined>();
  const [isLeftRailCollapsed, setIsLeftRailCollapsed] = useState(true);
  const inspectorExitTimeoutRef = useRef<number | undefined>();
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
  const searchResultSlice = useMemo(
    () =>
      activeData && !shouldShowProcessSearch
        ? getSearchResults(activeData, query)
        : emptyFlowSearchResultSlice,
    [activeData, query, shouldShowProcessSearch],
  );
  const processSearchResultSlice = useMemo(
    () =>
      activeData && shouldShowProcessSearch
        ? getProcessSearchResults(activeData, query)
        : emptyProcessSearchResultSlice,
    [activeData, query, shouldShowProcessSearch],
  );
  const searchResults = shouldShowProcessSearch ? [] : searchResultSlice.items;
  const processSearchResults = shouldShowProcessSearch ? processSearchResultSlice.items : [];
  const hasMoreSearchResults = shouldShowProcessSearch
    ? processSearchResultSlice.hasMore
    : searchResultSlice.hasMore;
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

  const handleSelectProcess = useCallback(
    (processId: string) => {
      selectNode(processId);
    },
    [selectNode],
  );
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

  const handleSelectFlow = useCallback(
    (flowId: string) => {
      selectNode(flowId);
    },
    [selectNode],
  );

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
  const leftRailToggleLabel = isLeftRailCollapsed ? '展开左侧区域' : '折叠左侧区域';
  const panelShellClassName = [
    styles.panelShell,
    isLeftRailCollapsed ? styles.panelShellLeftCollapsed : '',
  ]
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
      <aside aria-hidden={isLeftRailCollapsed} className={leftRailClassName}>
        <div className={styles.leftRailHeader}>
          <label className={styles.searchBox}>
            <SearchOutlined />
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
        <div className={styles.searchResults}>
          {shouldShowProcessSearch
            ? processSearchResults.map((processNode) => (
                <ProcessSearchResult
                  isSelected={selectedNodeId === processNode.id}
                  key={processNode.id}
                  onSelect={handleSelectProcess}
                  processNode={processNode}
                />
              ))
            : searchResults.map((flow) => (
                <FlowSearchResult
                  flow={flow}
                  isSelected={selectedNodeId === flow.id}
                  key={flow.id}
                  onSelect={handleSelectFlow}
                />
              ))}
          {hasMoreSearchResults && (
            <div className={styles.searchMoreHint} role='status'>
              <span>仅显示前 {formatNumber(maxRenderedSearchResults)} 条</span>
              <strong>更多数据，请输入关键词查询查看</strong>
            </div>
          )}
        </div>
      </aside>
      <main className={styles.graphStage}>
        <div aria-label='图谱工具栏' className={styles.canvasToolbar}>
          <div className={styles.railToggleTools}>
            <button
              aria-label={leftRailToggleLabel}
              aria-pressed={isLeftRailCollapsed}
              onClick={handleToggleLeftRail}
              title={leftRailToggleLabel}
              type='button'
            >
              {isLeftRailCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
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
