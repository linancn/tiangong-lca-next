import { scheduleGraphEdgeAnchorRefresh } from '@/components/X6Graph/edgeRouting';
import { Graph } from '@antv/x6';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

interface GraphContextValue {
  graph: Graph | null;
  setGraph: (graph: Graph | null) => void;
  nodes: any[];
  edges: any[];
  setNodes: (nodes: any[]) => void;
  setEdges: (edges: any[]) => void;
  addNodes: (nodes: any[], options?: Record<string, any>) => void;
  updateNode: (nodeId: string, data: any, options?: Record<string, any>) => void;
  removeNodes: (nodeIds: string[]) => void;
  updateEdge: (edgeId: string, data: any, options?: Record<string, any>) => void;
  removeEdges: (edgeIds: string[]) => void;
  initData: (data: { nodes: any[]; edges: any[] }) => void;
  syncGraphData: () => void;
}

export interface GraphNode {
  id?: string;
  data?: any;
  tools?: any;
  ports?: any;
  selected?: boolean;
  size?: { width: number; height: number };
  width?: number;
  height?: number;
  isMyProcess?: boolean;
  modelData?: any;
  [key: string]: any;
}

export interface GraphEdge {
  id?: string;
  source?: any;
  target?: any;
  data?: any;
  attrs?: any;
  labels?: any;
  selected?: boolean;
  [key: string]: any;
}

const GraphContext = createContext<GraphContextValue | null>(null);

const getCellSelectionState = (graph: Graph | null, cellId: string, fallback?: boolean) => {
  if (typeof fallback === 'boolean') {
    return fallback;
  }

  if (!graph || typeof graph.getSelectedCells !== 'function') {
    return false;
  }

  return graph.getSelectedCells().some((cell) => cell?.id === cellId);
};

const syncNodeSelectionAttrs = (node: any, selected: boolean, options: Record<string, any>) => {
  const currentAttrs = typeof node?.getAttrs === 'function' ? node.getAttrs() : (node?.attrs ?? {});
  if (!currentAttrs?.body || typeof currentAttrs.body !== 'object') {
    return undefined;
  }

  const nextAttrs = {
    ...currentAttrs,
    body: {
      ...currentAttrs.body,
      strokeWidth: selected ? 2 : 1,
    },
  };

  node.setAttrs(nextAttrs, options);
  return nextAttrs;
};

const syncEdgeSelectionAttrs = (edge: any, selected: boolean, options: Record<string, any>) => {
  const currentAttrs = typeof edge?.getAttrs === 'function' ? edge.getAttrs() : (edge?.attrs ?? {});
  if (!currentAttrs?.line || typeof currentAttrs.line !== 'object') {
    return undefined;
  }

  const nextAttrs = {
    ...currentAttrs,
    line: {
      ...currentAttrs.line,
      strokeWidth: selected ? 2 : 1,
    },
  };

  edge.setAttrs(nextAttrs, options);
  return nextAttrs;
};

export const GraphProvider = ({ children }: { children: ReactNode }) => {
  const graphRef = useRef<Graph | null>(null);
  const pendingEdgeAnchorRefreshRef = useRef<(() => void) | null>(null);
  const [nodes, setNodesState] = useState<any[]>([]);
  const [edges, setEdgesState] = useState<any[]>([]);

  const setGraph = (graph: Graph | null) => {
    if (!graph) {
      pendingEdgeAnchorRefreshRef.current?.();
      pendingEdgeAnchorRefreshRef.current = null;
    }
    graphRef.current = graph;
  };

  const setNodes = (newNodes: any[]) => {
    setNodesState(newNodes);
  };

  const setEdges = (newEdges: any[]) => {
    setEdgesState(newEdges);
  };

  const addNodes = (nodesToAdd: any[], options: Record<string, any> = {}) => {
    if (graphRef.current) {
      graphRef.current.addNodes(nodesToAdd, options);
      setNodesState((prev) => [...prev, ...nodesToAdd]);
    }
  };

  const updateNode = (nodeId: string, data: any, options: Record<string, any> = {}) => {
    if (graphRef.current) {
      const cell = graphRef.current.getCellById(nodeId);
      if (cell && cell.isNode()) {
        const node = cell;
        let resolvedAttrs = data.attrs;
        // 更新节点数据
        if (data.data) {
          const currentData = node.getData() || {};
          node.setData({ ...currentData, ...data.data }, options);
        }

        // 更新工具
        if (data.tools) {
          node.addTools(data.tools, { ...options, reset: true });
        }

        // 更新端口
        if (data.ports) {
          node.prop('ports', data.ports, options);
        }

        // 更新尺寸
        if (data.width !== undefined || data.height !== undefined) {
          node.resize(
            data.width !== undefined ? data.width : node.getSize().width,
            data.height !== undefined ? data.height : node.getSize().height,
            options,
          );
        }

        // 更新标签
        if (data.label !== undefined) {
          node.setAttrByPath('label/text', data.label, options);
        }

        // 更新属性
        if (data.attrs) {
          node.setAttrs(data.attrs, options);
        }

        // 更新选中状态
        if (data.selected !== undefined) {
          if (data.selected) {
            graphRef.current.select(node);
          } else {
            graphRef.current.unselect(node);
          }
        }

        const isSelected = getCellSelectionState(graphRef.current, nodeId, data.selected);
        const selectionAttrs = syncNodeSelectionAttrs(node, isSelected, options);
        if (selectionAttrs) {
          resolvedAttrs = selectionAttrs;
        }

        // 更新本地状态
        setNodesState((prev) =>
          prev.map((n) => {
            if (n.id === nodeId) {
              return {
                ...n,
                ...data,
                ...(resolvedAttrs ? { attrs: resolvedAttrs } : {}),
              };
            }
            return n;
          }),
        );
      }
    }
  };

  const removeNodes = (nodeIds: string[]) => {
    if (graphRef.current) {
      nodeIds.forEach((id) => {
        const cell = graphRef.current?.getCellById(id);
        if (cell && cell.isNode()) {
          graphRef.current?.removeNode(cell);
        }
      });
      setNodesState((prev) => prev.filter((n) => !nodeIds.includes(n.id)));
    }
  };

  const updateEdge = (edgeId: string, data: any, options: Record<string, any> = {}) => {
    if (graphRef.current) {
      const edge = graphRef.current.getCellById(edgeId);
      let isConnect = false;
      if (edge && edge.isEdge()) {
        let resolvedAttrs = data.attrs;
        // 更新边数据
        if (data.data) {
          const currentData = edge.getData() || {};
          edge.setData({ ...currentData, ...data.data }, options);
          if (data?.data?.connection) {
            isConnect = true;
          }
        }

        // 更新属性
        if (data.attrs) {
          edge.setAttrs(data.attrs, options);
        }

        // 更新标签
        if (data.labels) {
          edge.setLabels(data.labels, options);
        }

        // 更新目标
        if (data.target) {
          edge.setTarget(data.target, options);
        }

        // 更新源
        if (data.source) {
          edge.setSource(data.source, options);
        }

        // 更新选中状态
        if (data.selected !== undefined) {
          if (data.selected) {
            graphRef.current.select(edge);
          } else {
            graphRef.current.unselect(edge);
          }
        }

        const isSelected = getCellSelectionState(graphRef.current, edgeId, data.selected);
        const selectionAttrs = syncEdgeSelectionAttrs(edge, isSelected, options);
        if (selectionAttrs) {
          resolvedAttrs = selectionAttrs;
        }

        // 更新本地状态
        setEdgesState((prev) => {
          const res = prev.map((e) => {
            if (e.id === edgeId) {
              return {
                ...e,
                ...data,
                ...(resolvedAttrs ? { attrs: resolvedAttrs } : {}),
              };
            }
            return e;
          });
          if (isConnect) {
            isConnect = false;
            return [...res, { ...edge }];
          }
          return res;
        });
      }
    }
  };

  const removeEdges = (edgeIds: string[]) => {
    if (graphRef.current) {
      edgeIds.forEach((id) => {
        const cell = graphRef.current?.getCellById(id);
        if (cell && cell.isEdge()) {
          graphRef.current?.removeEdge(cell);
        }
      });
      setEdgesState((prev) => prev.filter((e) => !edgeIds.includes(e.id)));
    }
  };

  const initData = (data: { nodes: any[]; edges: any[] }) => {
    if (graphRef.current) {
      pendingEdgeAnchorRefreshRef.current?.();
      graphRef.current.clearCells();
      if (data.nodes && data.nodes.length > 0) {
        graphRef.current.addNodes(data.nodes);
      }
      if (data.edges && data.edges.length > 0) {
        graphRef.current.addEdges(data.edges);
      }
      pendingEdgeAnchorRefreshRef.current = scheduleGraphEdgeAnchorRefresh(graphRef.current, {
        ignoreHistory: true,
      });
      setNodesState(data.nodes || []);
      setEdgesState(data.edges || []);
    }
  };

  // 同步图中的实际数据到状态
  const syncGraphData = () => {
    if (graphRef.current) {
      const selectedCellIds = new Set(
        (typeof graphRef.current.getSelectedCells === 'function'
          ? graphRef.current.getSelectedCells()
          : []
        ).map((cell) => cell.id),
      );
      const graphNodes = graphRef.current.getNodes().map((node) => ({
        ...node.toJSON(),
        selected: selectedCellIds.has(node.id),
      }));
      const graphEdges = graphRef.current.getEdges().map((edge) => ({
        ...edge.toJSON(),
        selected: selectedCellIds.has(edge.id),
      }));
      setNodesState(graphNodes);
      setEdgesState(graphEdges);
    }
  };

  const value: GraphContextValue = {
    graph: graphRef.current,
    setGraph,
    nodes,
    edges,
    setNodes,
    setEdges,
    addNodes,
    updateNode,
    removeNodes,
    updateEdge,
    removeEdges,
    initData,
    syncGraphData,
  };

  useEffect(
    () => () => {
      pendingEdgeAnchorRefreshRef.current?.();
      pendingEdgeAnchorRefreshRef.current = null;
    },
    [],
  );

  return <GraphContext.Provider value={value}>{children}</GraphContext.Provider>;
};

export const useGraphStore = (selector: (state: GraphContextValue) => any) => {
  const context = useContext(GraphContext);
  if (!context) {
    throw new Error('useGraphStore must be used within GraphProvider');
  }
  return selector(context);
};

export const useGraphInstance = () => {
  const context = useContext(GraphContext);
  if (!context) {
    throw new Error('useGraphInstance must be used within GraphProvider');
  }
  return context.graph;
};

export const useGraphEvent = (eventName: string, handler: (evt: any) => void) => {
  const graph = useGraphInstance();

  useEffect(() => {
    if (graph) {
      graph.on(eventName, handler);
      return () => {
        graph.off(eventName, handler);
      };
    }
  }, [graph, eventName, handler]);
};
