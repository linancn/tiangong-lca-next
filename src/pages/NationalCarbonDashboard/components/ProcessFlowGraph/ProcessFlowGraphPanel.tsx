import {
  AimOutlined,
  ApartmentOutlined,
  ClearOutlined,
  ClusterOutlined,
  DragOutlined,
  EnvironmentOutlined,
  FullscreenOutlined,
  GlobalOutlined,
  NodeIndexOutlined,
  SearchOutlined,
  SelectOutlined,
} from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ProcessFlowGraphCanvas from './ProcessFlowGraphCanvas.client';
import {
  buildProcessFlowGraphGeoMapView,
  loadProcessFlowGeoMapAssets,
  type ProcessFlowGraphGeoMapAssets,
} from './geoMapLayout';
import {
  getProcessFlowGraphNode,
  getProcessFlowGraphSelection,
  summarizeProcessFlowSelection,
} from './graphSelection';
import {
  type ProcessFlowGraphData,
  type ProcessFlowGraphEdge,
  type ProcessFlowGraphInteractionMode,
  type ProcessFlowGraphLayoutName,
  type ProcessFlowGraphMapScope,
  type ProcessFlowGraphNode,
  type ProcessFlowGraphNodeSummary,
  type ProcessFlowGraphSearchItem,
} from './graphTypes';
import { loadProcessFlowGraphFromCache } from './processFlowGraphCacheLoader';
import styles from './styles.module.less';

const numberFormatter = new Intl.NumberFormat('zh-CN');
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

const emptySelectionSummary: ProcessFlowGraphNodeSummary = {
  highlightedEdges: 0,
  inputEdges: 0,
  outputEdges: 0,
  relatedFlows: 0,
  relatedProcesses: 0,
};

function getFeaturedFlow(data: ProcessFlowGraphData): ProcessFlowGraphSearchItem | undefined {
  return data.indexes.searchFlows[0];
}

function getSearchResults(
  data: ProcessFlowGraphData,
  query: string,
  featuredFlowId: string | undefined,
): ProcessFlowGraphSearchItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  const featuredFlow = featuredFlowId
    ? data.indexes.searchFlows.find((flow) => flow.id === featuredFlowId)
    : undefined;
  const source = normalizedQuery
    ? data.indexes.searchFlows.filter(
        (flow) =>
          flow.id.toLowerCase().includes(normalizedQuery) ||
          flow.name.toLowerCase().includes(normalizedQuery),
      )
    : data.indexes.searchFlows;
  const results = source.slice(0, 9);

  if (!featuredFlow || results.some((flow) => flow.id === featuredFlow.id)) {
    return results;
  }

  return [featuredFlow, ...results.slice(0, 8)];
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
          <span>INSPECTOR</span>
          <ClusterOutlined />
        </div>
        <div className={styles.emptyInspector}>
          <strong>No selection</strong>
          <span>GLOBAL PROCESS-FLOW GRAPH</span>
        </div>
        <div className={styles.inspectorMetricGrid}>
          <div>
            <span>Flow Nodes</span>
            <strong>{formatNumber(data.stats.flowCount)}</strong>
          </div>
          <div>
            <span>Process Nodes</span>
            <strong>{formatNumber(data.stats.processCount)}</strong>
          </div>
          <div>
            <span>Exchange Edges</span>
            <strong>{formatNumber(data.stats.edgeCount)}</strong>
          </div>
          <div>
            <span>Max Degree</span>
            <strong>{formatNumber(data.stats.maxDegree)}</strong>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className={styles.inspector}>
      <div className={styles.inspectorHeader}>
        <span>{node.kind === 'flow' ? 'SELECTED FLOW' : 'SELECTED PROCESS'}</span>
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
          <dt>Version</dt>
          <dd>{node.version}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{node.category}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{node.location ?? '-'}</dd>
        </div>
      </dl>
      <div className={styles.inspectorMetricGrid}>
        <div>
          <span>Referenced Processes</span>
          <strong>{formatNumber(summary.relatedProcesses)}</strong>
        </div>
        <div>
          <span>Related Flows</span>
          <strong>{formatNumber(summary.relatedFlows)}</strong>
        </div>
        <div>
          <span>Input Edges</span>
          <strong>{formatNumber(summary.inputEdges || inputEdges.length)}</strong>
        </div>
        <div>
          <span>Output Edges</span>
          <strong>{formatNumber(summary.outputEdges || outputEdges.length)}</strong>
        </div>
      </div>
      <div className={styles.edgeList}>
        <span>Highlighted exchanges</span>
        {edgeRows.slice(0, 7).map((edge) => (
          <div key={edge.id}>
            <i className={edge.direction === 'input' ? styles.inputDot : styles.outputDot} />
            <strong>{edge.direction === 'input' ? 'Input' : 'Output'}</strong>
            <em>{getConnectedNodeName(data, edge, node.id)}</em>
            <b>
              {edge.amount?.toFixed(2)} {edge.unit}
            </b>
          </div>
        ))}
        {edgeRows.length > 7 && <small>... and {formatNumber(edgeRows.length - 7)} more</small>}
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
        <span>INSPECTOR</span>
        <ClusterOutlined />
      </div>
      <div className={styles.emptyInspector}>
        <strong>{isLoading ? 'Loading cache' : 'Cache unavailable'}</strong>
        <span>{isLoading ? 'PROCESS-FLOW GRAPH CACHE' : 'CACHE ERROR'}</span>
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
  const [mapScope, setMapScope] = useState<ProcessFlowGraphMapScope>('world');
  const [geoMapAssets, setGeoMapAssets] = useState<ProcessFlowGraphGeoMapAssets | undefined>();
  const [geoMapLoadError, setGeoMapLoadError] = useState<string | undefined>();
  const [interactionMode, setInteractionMode] = useState<ProcessFlowGraphInteractionMode>('select');
  const [query, setQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const isGeoMapMode = layoutMode === 'geoMap2d';
  const geoMapView = useMemo(
    () =>
      data && geoMapAssets
        ? buildProcessFlowGraphGeoMapView(data, mapScope, geoMapAssets)
        : undefined,
    [data, geoMapAssets, mapScope],
  );
  const activeData = isGeoMapMode ? geoMapView?.data : data;
  const activeMapBackground = isGeoMapMode ? geoMapView?.background : undefined;
  const featuredFlow = useMemo(
    () => (activeData ? getFeaturedFlow(activeData) : undefined),
    [activeData],
  );
  const selectedNode = useMemo(
    () => (activeData ? getProcessFlowGraphNode(activeData, selectedNodeId) : undefined),
    [activeData, selectedNodeId],
  );
  const selection = useMemo(
    () => (activeData ? getProcessFlowGraphSelection(activeData, selectedNodeId) : undefined),
    [activeData, selectedNodeId],
  );
  const searchResults = useMemo(
    () => (activeData ? getSearchResults(activeData, query, featuredFlow?.id) : []),
    [activeData, featuredFlow?.id, query],
  );
  const selectionSummary = useMemo(
    () =>
      activeData && selection
        ? summarizeProcessFlowSelection(activeData, selection)
        : emptySelectionSummary,
    [activeData, selection],
  );

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
    if (!isGeoMapMode || geoMapAssets) {
      return undefined;
    }

    let cancelled = false;

    loadProcessFlowGeoMapAssets()
      .then((assets) => {
        if (cancelled) {
          return;
        }
        setGeoMapAssets(assets);
        setGeoMapLoadError(undefined);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setGeoMapAssets(undefined);
        setGeoMapLoadError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      cancelled = true;
    };
  }, [geoMapAssets, isGeoMapMode]);

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
    if (layoutMode !== 'geoMap2d') {
      setMapScope('world');
      setLayoutMode('geoMap2d');
      return;
    }

    setMapScope((currentScope) => (currentScope === 'world' ? 'china' : 'world'));
  }, [layoutMode]);

  const handleSelectFlow = useCallback(
    (flowId: string) => {
      if (!activeData) {
        return;
      }
      setSelectedNodeId(flowId);
      setQuery(getProcessFlowGraphNode(activeData, flowId)?.name ?? flowId);
    },
    [activeData],
  );

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
            className={layoutMode === 'sphere3d' ? styles.activeMode : ''}
            onClick={() => setLayoutMode('sphere3d')}
            type='button'
          >
            <GlobalOutlined />
            <span>Sphere</span>
          </button>
          <button
            className={layoutMode === 'expanded2d' ? styles.activeMode : ''}
            onClick={() => setLayoutMode('expanded2d')}
            type='button'
          >
            <ApartmentOutlined />
            <span>Expanded</span>
          </button>
          <button
            className={layoutMode === 'geoMap2d' ? styles.activeMode : ''}
            onClick={handleToggleMapMode}
            type='button'
          >
            <EnvironmentOutlined />
            <span>{mapButtonLabel}</span>
          </button>
        </div>
        <div className={styles.mouseTools}>
          <button
            aria-label='拖拽浏览'
            aria-pressed={interactionMode === 'pan'}
            className={interactionMode === 'pan' ? styles.activeMode : ''}
            onClick={() => setInteractionMode('pan')}
            type='button'
          >
            <DragOutlined />
            <span>Drag</span>
          </button>
          <button
            aria-label='点选节点'
            aria-pressed={interactionMode === 'select'}
            className={interactionMode === 'select' ? styles.activeMode : ''}
            onClick={() => setInteractionMode('select')}
            type='button'
          >
            <SelectOutlined />
            <span>Pick</span>
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
        <label className={styles.searchBox}>
          <SearchOutlined />
          <input
            aria-label='搜索非基础流'
            disabled={!activeData}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Search flow'
            value={query}
          />
          {query && (
            <button aria-label='清除搜索' onClick={() => setQuery('')} type='button'>
              <ClearOutlined />
            </button>
          )}
        </label>
        <div className={styles.quickActions}>
          {featuredFlow && (
            <button onClick={() => handleSelectFlow(featuredFlow.id)} type='button'>
              <AimOutlined />
              Focus Flow
            </button>
          )}
          <button
            disabled={!activeData || !selectedNodeId}
            onClick={() => setSelectedNodeId(undefined)}
            type='button'
          >
            <FullscreenOutlined />
            Clear
          </button>
        </div>
        <div className={styles.searchResults}>
          {searchResults.map((flow) => (
            <FlowSearchResult
              flow={flow}
              isSelected={selectedNodeId === flow.id}
              key={flow.id}
              onSelect={handleSelectFlow}
            />
          ))}
        </div>
        <div className={styles.legendBox}>
          <span>LEGEND</span>
          <p>
            <i className={styles.selectedDot} />
            Selected Flow
          </p>
          <p>
            <i className={styles.processDot} />
            Process
          </p>
          <p>
            <i className={styles.inputDot} />
            Input Flow
          </p>
          <p>
            <i className={styles.outputDot} />
            Output Flow
          </p>
        </div>
      </aside>
      <main className={styles.graphStage}>
        {activeData && selection ? (
          <>
            <ProcessFlowGraphCanvas
              data={activeData}
              geoMapBackground={activeMapBackground}
              interactionMode={interactionMode}
              layoutMode={layoutMode}
              onNodeClick={handleNodeClick}
              selection={selection}
            />
            <div className={styles.selectionStrip}>
              <span>{selectedNode ? selectedNode.name : 'Global Graph'}</span>
              <strong>{formatNumber(selectionSummary.highlightedEdges)}</strong>
              <em>highlighted exchanges</em>
              <strong>{formatNumber(selectionSummary.relatedProcesses)}</strong>
              <em>processes</em>
              <strong>{formatNumber(selectionSummary.relatedFlows)}</strong>
              <em>non-basic flows</em>
            </div>
          </>
        ) : (
          <GraphLoadState
            dataSource={mapLoadDataSource}
            description={
              isGeoMapMode && data && !geoMapView
                ? mapLoadError
                  ? formatCacheError(mapLoadError)
                  : 'Preparing world and China map assets'
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
