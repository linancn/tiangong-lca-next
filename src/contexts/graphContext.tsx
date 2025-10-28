import { Graph } from '@antv/x6';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

interface GraphContextValue {
  graph: Graph | null;
  setGraph: (graph: Graph | null) => void;
  nodes: any[];
  edges: any[];
  setNodes: (nodes: any[]) => void;
  setEdges: (edges: any[]) => void;
  addNodes: (nodes: any[]) => void;
  updateNode: (nodeId: string, data: any) => void;
  removeNodes: (nodeIds: string[]) => void;
  updateEdge: (edgeId: string, data: any) => void;
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

export const GraphProvider = ({ children }: { children: ReactNode }) => {
  const graphRef = useRef<Graph | null>(null);
  const [nodes, setNodesState] = useState<any[]>([]);
  const [edges, setEdgesState] = useState<any[]>([]);

  const setGraph = (graph: Graph | null) => {
    graphRef.current = graph;
  };

  const setNodes = (newNodes: any[]) => {
    setNodesState(newNodes);
  };

  const setEdges = (newEdges: any[]) => {
    setEdgesState(newEdges);
  };

  const addNodes = (nodesToAdd: any[]) => {
    if (graphRef.current) {
      nodesToAdd.forEach((node) => {
        graphRef.current?.addNode(node);
      });
      setNodesState((prev) => [...prev, ...nodesToAdd]);
    }
  };

  const updateNode = (nodeId: string, data: any) => {
    if (graphRef.current) {
      const cell = graphRef.current.getCellById(nodeId);
      if (cell && cell.isNode()) {
        const node = cell;
        // 更新节点数据
        if (data.data) {
          const currentData = node.getData() || {};
          node.setData({ ...currentData, ...data.data });
        }

        // 更新工具
        if (data.tools) {
          node.removeTools();
          node.addTools(data.tools);
        }

        // 更新端口
        if (data.ports) {
          node.prop('ports', data.ports);
        }

        // 更新尺寸
        if (data.width !== undefined || data.height !== undefined) {
          node.resize(
            data.width !== undefined ? data.width : node.getSize().width,
            data.height !== undefined ? data.height : node.getSize().height,
          );
        }

        // 更新标签
        if (data.label !== undefined) {
          node.setAttrByPath('label/text', data.label);
        }

        // 更新属性
        if (data.attrs) {
          node.setAttrs(data.attrs);
        }

        // 更新选中状态
        if (data.selected !== undefined) {
          if (data.selected) {
            graphRef.current.select(node);
          } else {
            graphRef.current.unselect(node);
          }
        }

        // 更新本地状态
        setNodesState((prev) =>
          prev.map((n) => {
            if (n.id === nodeId) {
              return { ...n, ...data };
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

  const updateEdge = (edgeId: string, data: any) => {
    if (graphRef.current) {
      const edge = graphRef.current.getCellById(edgeId);
      let isConnect = false;
      if (edge && edge.isEdge()) {
        // 更新边数据
        if (data.data) {
          const currentData = edge.getData() || {};
          edge.setData({ ...currentData, ...data.data });
          if (data?.data?.connection) {
            isConnect = true;
          }
        }

        // 更新属性
        if (data.attrs) {
          edge.setAttrs(data.attrs);
        }

        // 更新标签
        if (data.labels) {
          edge.setLabels(data.labels);
        }

        // 更新目标
        if (data.target) {
          edge.setTarget(data.target);
        }

        // 更新源
        if (data.source) {
          edge.setSource(data.source);
        }

        // 更新选中状态
        if (data.selected !== undefined) {
          if (data.selected) {
            graphRef.current.select(edge);
          } else {
            graphRef.current.unselect(edge);
          }
        }

        // 更新本地状态
        setEdgesState((prev) => {
          const res = prev.map((e) => {
            if (e.id === edgeId) {
              return { ...e, ...data };
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
      graphRef.current.clearCells();
      if (data.nodes && data.nodes.length > 0) {
        graphRef.current.addNodes(data.nodes);
      }
      if (data.edges && data.edges.length > 0) {
        graphRef.current.addEdges(data.edges);
      }
      setNodesState(data.nodes || []);
      setEdgesState(data.edges || []);
    }
  };

  // 同步图中的实际数据到状态
  const syncGraphData = () => {
    if (graphRef.current) {
      const graphNodes = graphRef.current.getNodes().map((node) => node.toJSON());
      const graphEdges = graphRef.current.getEdges().map((edge) => edge.toJSON());
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
