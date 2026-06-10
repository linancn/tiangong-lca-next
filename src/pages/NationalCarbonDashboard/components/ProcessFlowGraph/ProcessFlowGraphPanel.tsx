import {
  ApartmentOutlined,
  ClearOutlined,
  CloseCircleOutlined,
  ClusterOutlined,
  DragOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  NodeIndexOutlined,
  SearchOutlined,
  SelectOutlined,
} from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
const maxCacheErrorLength = 96;

function formatNumber(value: number): string {
  return numberFormatter.format(value);
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

function getSearchResults(data: ProcessFlowGraphData, query: string): ProcessFlowGraphSearchItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  return normalizedQuery
    ? data.indexes.searchFlows.filter(
        (flow) =>
          flow.id.toLowerCase().includes(normalizedQuery) ||
          flow.name.toLowerCase().includes(normalizedQuery),
      )
    : data.indexes.searchFlows;
}

function getProcessSearchResults(
  data: ProcessFlowGraphData,
  query: string,
): ProcessFlowGraphNode[] {
  const normalizedQuery = query.trim().toLowerCase();
  const source = data.nodes
    .filter((node) => node.kind === 'process')
    .filter((node) => {
      if (!normalizedQuery) {
        return true;
      }

      return (
        node.id.toLowerCase().includes(normalizedQuery) ||
        node.name.toLowerCase().includes(normalizedQuery) ||
        node.category.toLowerCase().includes(normalizedQuery) ||
        (node.location?.toLowerCase().includes(normalizedQuery) ?? false)
      );
    })
    .sort((left, right) => right.degree - left.degree || left.name.localeCompare(right.name));

  return source;
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

function Inspector({
  data,
  node,
}: {
  data: ProcessFlowGraphData;
  node: ProcessFlowGraphNode | undefined;
}) {
  const edgeRows = useMemo(() => getNodeEdgeRows(data, node), [data, node]);
  const selection = useMemo(() => getProcessFlowGraphSelection(data, node?.id), [data, node]);
  const summary = useMemo(() => summarizeProcessFlowSelection(data, selection), [data, selection]);
  const inputEdges = edgeRows.filter((edge) => edge.direction === 'input');
  const outputEdges = edgeRows.filter((edge) => edge.direction === 'output');

  if (!node) {
    return (
      <aside className={styles.inspector}>
        <div className={styles.inspectorHeader}>
          <span>详情面板</span>
          <ClusterOutlined />
        </div>
        <div className={styles.emptyInspector}>
          <strong>未选择节点</strong>
          <span>全局过程-流关系图</span>
        </div>
        <div className={styles.inspectorMetricGrid}>
          <div>
            <span>流节点</span>
            <strong>{formatNumber(data.stats.flowCount)}</strong>
          </div>
          <div>
            <span>过程节点</span>
            <strong>{formatNumber(data.stats.processCount)}</strong>
          </div>
          <div>
            <span>输入/输出</span>
            <strong>{formatNumber(data.stats.edgeCount)}</strong>
          </div>
          <div>
            <span>最大连接数</span>
            <strong>{formatNumber(data.stats.maxDegree)}</strong>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className={styles.inspector}>
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

function EmptyInspectorPanel({
  dataSource,
  loadError,
}: {
  dataSource: GraphDataSource;
  loadError?: string;
}) {
  const isLoading = dataSource === 'loading';

  return (
    <aside className={styles.inspector}>
      <div className={styles.inspectorHeader}>
        <span>详情面板</span>
        <ClusterOutlined />
      </div>
      <div className={styles.emptyInspector}>
        <strong>{isLoading ? '正在加载缓存' : '缓存不可用'}</strong>
        <span>{isLoading ? '过程-流关系图缓存' : '缓存错误'}</span>
      </div>
      {loadError && <p className={styles.cacheErrorText}>{formatCacheError(loadError)}</p>}
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

  return (
    <div className={styles.graphLoadState}>
      <strong>
        {title ?? (isLoading ? 'Loading process-flow graph' : 'Process-flow graph unavailable')}
      </strong>
      <span>
        {description ??
          (isLoading
            ? 'Waiting for worker S3 cache manifest'
            : loadError
              ? formatCacheError(loadError)
              : 'Cache manifest could not be loaded')}
      </span>
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
  const searchResults = useMemo(
    () => (activeData && !shouldShowProcessSearch ? getSearchResults(activeData, query) : []),
    [activeData, query, shouldShowProcessSearch],
  );
  const processSearchResults = useMemo(
    () => (activeData && shouldShowProcessSearch ? getProcessSearchResults(activeData, query) : []),
    [activeData, query, shouldShowProcessSearch],
  );
  const searchPlaceholder = shouldShowProcessSearch ? 'Search process' : 'Search flow';
  const searchAriaLabel = shouldShowProcessSearch ? '搜索过程节点' : '搜索非基础流';
  const handleSelectProcess = useCallback((processId: string) => {
    setSelectedNodeId(processId);
  }, []);
  useEffect(() => {
    let cancelled = false;

    loadProcessFlowGraphFromCache()
      .then((cacheData) => {
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
    };
  }, []);

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

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId((currentNodeId) => (currentNodeId === nodeId ? undefined : nodeId));
  }, []);

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

  const handleSelectFlow = useCallback((flowId: string) => {
    setSelectedNodeId(flowId);
  }, []);

  const mapButtonLabel = isGeoMapMode && mapScope === 'world' ? 'China Map' : 'World Map';
  const mapLoadDataSource: GraphDataSource =
    isGeoMapMode && data && !geoMapView ? (geoMapLoadError ? 'error' : 'loading') : dataSource;
  const mapLoadError = isGeoMapMode && data && !geoMapView ? geoMapLoadError : loadError;
  const sourceBadge =
    dataSource === 'loading'
      ? 'Loading Cache'
      : dataSource === 'minio'
        ? 'MinIO Cache'
        : 'Cache Error';

  return (
    <div className={styles.panelShell}>
      <div className={styles.topHud}>
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
        <div className={styles.graphBadges}>
          <span>
            <i />
            {sourceBadge}
            <b>{activeData?.buildId ?? data?.buildId ?? '-'}</b>
          </span>
          {loadError && (
            <span>
              <i />
              Cache Error
              <b title={loadError}>{formatCacheError(loadError)}</b>
            </span>
          )}
          <span>
            <i />
            WebGL Active
            <b>Three.js</b>
          </span>
          <span>
            Nodes
            <b>{formatNumber(activeData?.nodes.length ?? 0)}</b>
          </span>
          <span>
            Edges
            <b>{formatNumber(activeData?.edges.length ?? 0)}</b>
          </span>
        </div>
      </div>
      <aside className={styles.leftRail}>
        <div className={styles.leftRailHeader}>
          <label className={styles.searchBox}>
            <SearchOutlined />
            <input
              aria-label={searchAriaLabel}
              disabled={!activeData}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              value={query}
            />
            {query && (
              <button aria-label='清除搜索' onClick={() => setQuery('')} type='button'>
                <CloseCircleOutlined />
              </button>
            )}
          </label>
          <button
            aria-label='清除选中'
            disabled={!activeData || !selectedNodeId}
            onClick={() => setSelectedNodeId(undefined)}
            title='清除选中'
            type='button'
          >
            <ClearOutlined />
          </button>
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
        </div>
      </aside>
      <main className={styles.graphStage}>
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
      {activeData ? (
        <Inspector data={activeData} node={selectedNode} />
      ) : (
        <EmptyInspectorPanel dataSource={mapLoadDataSource} loadError={mapLoadError} />
      )}
    </div>
  );
}
