import {
  AimOutlined,
  ApartmentOutlined,
  ClearOutlined,
  ClusterOutlined,
  FullscreenOutlined,
  GlobalOutlined,
  NodeIndexOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useCallback, useMemo, useState } from 'react';
import ProcessFlowGraphCanvas from './ProcessFlowGraphCanvas.client';
import {
  getProcessFlowGraphNode,
  getProcessFlowGraphSelection,
  summarizeProcessFlowSelection,
} from './graphSelection';
import {
  demoFlowAId,
  type ProcessFlowGraphData,
  type ProcessFlowGraphEdge,
  type ProcessFlowGraphLayoutName,
  type ProcessFlowGraphNode,
  type ProcessFlowGraphSearchItem,
} from './graphTypes';
import { demoProcessFlowGraph } from './mock/mockGraphPresets';
import styles from './styles.module.less';

const numberFormatter = new Intl.NumberFormat('zh-CN');

function formatNumber(value: number): string {
  return numberFormatter.format(value);
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

function getSearchResults(data: ProcessFlowGraphData, query: string): ProcessFlowGraphSearchItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  const flowA = data.indexes.searchFlows.find((flow) => flow.id === demoFlowAId);
  const source = normalizedQuery
    ? data.indexes.searchFlows.filter(
        (flow) =>
          flow.id.toLowerCase().includes(normalizedQuery) ||
          flow.name.toLowerCase().includes(normalizedQuery),
      )
    : data.indexes.searchFlows;
  const results = source.slice(0, 9);

  if (!flowA || results.some((flow) => flow.id === flowA.id)) {
    return results;
  }

  return [flowA, ...results.slice(0, 8)];
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
            <span>Flow A Highlight</span>
            <strong>{formatNumber(data.stats.highlightedDemoEdges)}</strong>
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

export default function ProcessFlowGraphPanel() {
  const data = demoProcessFlowGraph;
  const [layoutMode, setLayoutMode] = useState<ProcessFlowGraphLayoutName>('sphere3d');
  const [query, setQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const selectedNode = useMemo(
    () => getProcessFlowGraphNode(data, selectedNodeId),
    [data, selectedNodeId],
  );
  const selection = useMemo(
    () => getProcessFlowGraphSelection(data, selectedNodeId),
    [data, selectedNodeId],
  );
  const searchResults = useMemo(() => getSearchResults(data, query), [data, query]);
  const selectionSummary = useMemo(
    () => summarizeProcessFlowSelection(data, selection),
    [data, selection],
  );

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId((currentNodeId) => (currentNodeId === nodeId ? undefined : nodeId));
  }, []);

  const handleSelectFlow = useCallback(
    (flowId: string) => {
      setSelectedNodeId(flowId);
      setQuery(getProcessFlowGraphNode(data, flowId)?.name ?? flowId);
    },
    [data],
  );

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
        </div>
        <div className={styles.graphBadges}>
          <span>
            <i />
            S3 Cache Mock
            <b>{data.buildId}</b>
          </span>
          <span>
            <i />
            WebGL Active
            <b>Three.js</b>
          </span>
          <span>
            Nodes
            <b>{formatNumber(data.nodes.length)}</b>
          </span>
          <span>
            Edges
            <b>{formatNumber(data.edges.length)}</b>
          </span>
        </div>
      </div>
      <aside className={styles.leftRail}>
        <label className={styles.searchBox}>
          <SearchOutlined />
          <input
            aria-label='搜索非基础流'
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
          <button onClick={() => handleSelectFlow(demoFlowAId)} type='button'>
            <AimOutlined />
            Flow A
          </button>
          <button onClick={() => setSelectedNodeId(undefined)} type='button'>
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
        <ProcessFlowGraphCanvas
          data={data}
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
      </main>
      <Inspector data={data} node={selectedNode} />
    </div>
  );
}
