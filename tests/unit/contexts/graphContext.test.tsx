import { act, render, renderHook, waitFor } from '@testing-library/react';
import { useEffect } from 'react';

import {
  GraphProvider,
  useGraphEvent,
  useGraphInstance,
  useGraphStore,
} from '@/contexts/graphContext';

class MockNode {
  id: string;
  data: any;
  tools: any;
  ports: any;
  attrs: any;
  width?: number;
  height?: number;
  selected?: boolean;
  lastDataOptions?: any;
  lastToolOptions?: any;
  lastPropOptions?: Record<string, any>;
  lastResizeOptions?: any;
  lastAttrPathOptions?: any;
  lastAttrsOptions?: any;

  constructor(config: any) {
    this.id = config.id;
    this.data = config.data;
    this.tools = config.tools;
    this.ports = config.ports;
    this.attrs = config.attrs;
    this.width = config.width;
    this.height = config.height;
    this.selected = config.selected;
  }

  isNode() {
    return true;
  }

  isEdge() {
    return false;
  }

  getData() {
    return this.data;
  }

  setData(data: any, options?: any) {
    this.data = { ...this.data, ...data };
    this.lastDataOptions = options;
  }

  removeTools() {
    this.tools = undefined;
  }

  addTools(tools: any, options?: any) {
    this.tools = tools;
    this.lastToolOptions = options;
  }

  prop(key: string, value: any, options?: any) {
    if (typeof value !== 'undefined') {
      (this as any)[key] = value;
      this.lastPropOptions = { key, options };
    }
    return (this as any)[key];
  }

  getSize() {
    return { width: this.width ?? 0, height: this.height ?? 0 };
  }

  resize(width: number, height: number, options?: any) {
    this.width = width;
    this.height = height;
    this.lastResizeOptions = options;
  }

  setAttrByPath(path: string, value: any, options?: any) {
    this.attrs = { ...(this.attrs || {}), [path]: value };
    this.lastAttrPathOptions = options;
  }

  setAttrs(attrs: any, options?: any) {
    this.attrs = { ...(this.attrs || {}), ...attrs };
    this.lastAttrsOptions = options;
  }

  toJSON() {
    return {
      id: this.id,
      data: this.data,
      tools: this.tools,
      ports: this.ports,
      attrs: this.attrs,
      width: this.width,
      height: this.height,
      selected: this.selected,
    };
  }
}

class MockEdge {
  id: string;
  data: any;
  attrs: any;
  labels: any;
  target: any;
  source: any;
  selected?: boolean;
  lastDataOptions?: any;
  lastAttrsOptions?: any;
  lastLabelsOptions?: any;
  lastTargetOptions?: any;
  lastSourceOptions?: any;

  constructor(config: any) {
    this.id = config.id;
    this.data = config.data;
    this.attrs = config.attrs;
    this.labels = config.labels;
    this.target = config.target;
    this.source = config.source;
    this.selected = config.selected;
  }

  isNode() {
    return false;
  }

  isEdge() {
    return true;
  }

  getData() {
    return this.data;
  }

  setData(data: any, options?: any) {
    this.data = { ...this.data, ...data };
    this.lastDataOptions = options;
  }

  setAttrs(attrs: any, options?: any) {
    this.attrs = { ...(this.attrs || {}), ...attrs };
    this.lastAttrsOptions = options;
  }

  setLabels(labels: any, options?: any) {
    this.labels = labels;
    this.lastLabelsOptions = options;
  }

  setTarget(target: any, options?: any) {
    this.target = target;
    this.lastTargetOptions = options;
  }

  setSource(source: any, options?: any) {
    this.source = source;
    this.lastSourceOptions = options;
  }

  toJSON() {
    return {
      id: this.id,
      data: this.data,
      attrs: this.attrs,
      labels: this.labels,
      target: this.target,
      source: this.source,
      selected: this.selected,
    };
  }
}

class MockGraph {
  nodes: MockNode[] = [];
  edges: MockEdge[] = [];
  events: Record<string, Set<(evt: any) => void>> = {};
  lastAddNodesOptions?: any;

  addNode(nodeConfig: any) {
    const node = nodeConfig instanceof MockNode ? nodeConfig : new MockNode(nodeConfig);
    this.nodes.push(node);
    return node;
  }

  addNodes(nodes: any[], options?: any) {
    this.lastAddNodesOptions = options;
    nodes.forEach((node) => this.addNode(node));
  }

  addEdges(edges: any[]) {
    edges.forEach((edge) => this.addEdge(edge));
  }

  addEdge(edgeConfig: any) {
    const edge = edgeConfig instanceof MockEdge ? edgeConfig : new MockEdge(edgeConfig);
    this.edges.push(edge);
    return edge;
  }

  getCellById(id: string) {
    return this.nodes.find((node) => node.id === id) || this.edges.find((edge) => edge.id === id);
  }

  removeNode(cell: any) {
    this.nodes = this.nodes.filter((node) => node.id !== cell?.id);
  }

  removeEdge(cell: any) {
    this.edges = this.edges.filter((edge) => edge.id !== cell?.id);
  }

  getNodes() {
    return this.nodes;
  }

  getEdges() {
    return this.edges;
  }

  getSelectedCells() {
    return [...this.nodes, ...this.edges].filter((cell) => cell.selected);
  }

  clearCells() {
    this.nodes = [];
    this.edges = [];
  }

  select(cell: any) {
    if (cell) {
      cell.selected = true;
    }
  }

  unselect(cell: any) {
    if (cell) {
      cell.selected = false;
    }
  }

  on(eventName: string, handler: (evt: any) => void) {
    if (!this.events[eventName]) {
      this.events[eventName] = new Set();
    }
    this.events[eventName].add(handler);
  }

  off(eventName: string, handler: (evt: any) => void) {
    if (this.events[eventName]) {
      this.events[eventName].delete(handler);
    }
  }

  trigger(eventName: string, payload: any) {
    this.events[eventName]?.forEach((handler) => handler(payload));
  }
}

jest.mock('@antv/x6', () => ({
  __esModule: true,
  Graph: MockGraph,
}));

describe('graphContext (src/contexts/graphContext.tsx)', () => {
  it('throws when hooks are used outside the provider', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const useStoreOutside = () =>
      // eslint-disable-next-line react-hooks/rules-of-hooks
      renderHook(() => useGraphStore((state) => state));
    const useInstanceOutside = () =>
      // eslint-disable-next-line react-hooks/rules-of-hooks
      renderHook(() => useGraphInstance());

    expect(() => useStoreOutside()).toThrow('useGraphStore must be used within GraphProvider');
    expect(() => useInstanceOutside()).toThrow(
      'useGraphInstance must be used within GraphProvider',
    );
    consoleErrorSpy.mockRestore();
  });

  it('manages nodes and edges and syncs graph data', () => {
    const wrapper = ({ children }: { children: any }) => <GraphProvider>{children}</GraphProvider>;
    const graph = new MockGraph();

    const { result } = renderHook(() => useGraphStore((state) => state), { wrapper });

    act(() => {
      result.current.setGraph(graph as any);
    });

    act(() => {
      result.current.addNodes([{ id: 'node-1', data: { value: 1 } }]);
    });

    expect(graph.getNodes()).toHaveLength(1);
    expect(result.current.nodes).toEqual([{ id: 'node-1', data: { value: 1 } }]);

    act(() => {
      result.current.updateNode('node-1', {
        data: { extra: true },
        tools: { name: 'tool' },
        ports: { items: ['p1'] },
        width: 80,
        height: 40,
        label: 'Node label',
        attrs: { stroke: 'blue' },
        selected: true,
      });
    });

    expect(graph.getCellById('node-1')?.getData()).toEqual({ value: 1, extra: true });
    expect(result.current.nodes[0]).toMatchObject({
      id: 'node-1',
      data: { extra: true },
      tools: { name: 'tool' },
      ports: { items: ['p1'] },
      width: 80,
      height: 40,
      label: 'Node label',
      attrs: { stroke: 'blue' },
      selected: true,
    });

    act(() => {
      result.current.removeNodes(['node-1']);
    });

    expect(graph.getNodes()).toHaveLength(0);
    expect(result.current.nodes).toEqual([]);

    act(() => {
      result.current.initData({
        nodes: [{ id: 'init-node' }],
        edges: [{ id: 'edge-1', data: { existing: true } }],
      });
    });

    expect(graph.getNodes()).toHaveLength(1);
    expect(graph.getEdges()).toHaveLength(1);
    expect(result.current.nodes).toEqual([{ id: 'init-node' }]);
    expect(result.current.edges).toEqual([{ id: 'edge-1', data: { existing: true } }]);

    act(() => {
      result.current.updateEdge('edge-1', {
        data: { connection: true, weight: 2 },
        attrs: { stroke: 'red' },
        labels: ['Edge'],
        target: 'target',
        source: 'source',
        selected: true,
      });
    });

    expect(graph.getCellById('edge-1')?.getData()).toEqual({
      existing: true,
      connection: true,
      weight: 2,
    });
    expect(result.current.edges[0]).toMatchObject({
      id: 'edge-1',
      data: { connection: true, weight: 2 },
      attrs: { stroke: 'red' },
      labels: ['Edge'],
      target: 'target',
      source: 'source',
      selected: true,
    });
    expect(result.current.edges[1]).toMatchObject({
      id: 'edge-1',
      data: { existing: true, connection: true, weight: 2 },
    });

    act(() => {
      result.current.removeEdges(['edge-1']);
    });

    expect(graph.getEdges()).toHaveLength(0);
    expect(result.current.edges).toEqual([]);

    graph.addNode({ id: 'sync-node', data: { synced: true }, attrs: { color: 'green' } });
    graph.addEdge({ id: 'sync-edge', data: { synced: true }, attrs: { color: 'blue' } });
    graph.select(graph.getCellById('sync-node'));
    graph.select(graph.getCellById('sync-edge'));

    act(() => {
      result.current.syncGraphData();
    });

    expect(result.current.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'init-node' }),
        expect.objectContaining({ id: 'sync-node', data: { synced: true }, selected: true }),
      ]),
    );
    expect(result.current.nodes).toHaveLength(2);
    expect(result.current.edges).toEqual([
      expect.objectContaining({ id: 'sync-edge', data: { synced: true }, selected: true }),
    ]);
  });

  it('passes mutation options through and covers fallback branches', () => {
    const wrapper = ({ children }: { children: any }) => <GraphProvider>{children}</GraphProvider>;
    const graph = new MockGraph();

    const { result } = renderHook(() => useGraphStore((state) => state), { wrapper });

    act(() => {
      result.current.setGraph(graph as any);
      result.current.setNodes([{ id: 'node-preserved', data: { keep: true } }]);
      result.current.setEdges([
        { id: 'seed-edge' },
        { id: 'edge-preserved', data: { keep: true } },
      ]);
      result.current.addNodes([{ id: 'node-fallback' }], { silent: true, ignoreHistory: true });
    });

    const node = graph.getCellById('node-fallback') as MockNode;
    expect(graph.lastAddNodesOptions).toEqual({ silent: true, ignoreHistory: true });

    act(() => {
      result.current.updateNode(
        'node-fallback',
        {
          data: { fallback: true },
          tools: { name: 'reset-tool' },
          width: 120,
          selected: false,
        },
        { ignoreHistory: true },
      );
    });

    expect(node.getData()).toEqual({ fallback: true });
    expect(node.lastDataOptions).toEqual({ ignoreHistory: true });
    expect(node.lastToolOptions).toEqual({ ignoreHistory: true, reset: true });
    expect(node.lastResizeOptions).toEqual({ ignoreHistory: true });
    expect(result.current.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'node-preserved', data: { keep: true } }),
        expect.objectContaining({
          id: 'node-fallback',
          data: { fallback: true },
          tools: { name: 'reset-tool' },
          width: 120,
          selected: false,
        }),
      ]),
    );

    act(() => {
      result.current.updateNode(
        'node-fallback',
        {
          height: 75,
        },
        { silent: true },
      );
    });

    expect(node.width).toBe(120);
    expect(node.height).toBe(75);
    expect(node.lastResizeOptions).toEqual({ silent: true });

    act(() => {
      result.current.initData({
        nodes: undefined as any,
        edges: undefined as any,
      });
    });

    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);

    act(() => {
      result.current.initData({
        nodes: [{ id: 'node-fallback-2', selected: true }],
        edges: [{ id: 'edge-fallback' }, { id: 'edge-preserved', data: { keep: true } }],
      });
      result.current.updateEdge(
        'edge-fallback',
        {
          data: { weight: 1 },
          selected: false,
        },
        { ignoreHistory: true },
      );
    });

    const edge = graph.getCellById('edge-fallback') as MockEdge;
    expect(edge.getData()).toEqual({ weight: 1 });
    expect(edge.lastDataOptions).toEqual({ ignoreHistory: true });
    expect(result.current.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'edge-fallback',
          data: { weight: 1 },
          selected: false,
        }),
        expect.objectContaining({ id: 'edge-preserved', data: { keep: true } }),
      ]),
    );

    graph.addNode({ id: 'node-no-selection-api', data: { keep: false } });
    (graph as any).getSelectedCells = undefined;

    act(() => {
      result.current.syncGraphData();
    });

    expect(result.current.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'node-no-selection-api',
          selected: false,
        }),
      ]),
    );
  });

  it('registers and cleans up graph events', async () => {
    const graph = new MockGraph();
    const handler = jest.fn();

    const EventConsumer = () => {
      const { setGraph, setNodes } = useGraphStore((state) => ({
        setGraph: state.setGraph,
        setNodes: state.setNodes,
      }));

      useEffect(() => {
        setGraph(graph as any);
        setNodes([]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      useGraphEvent('node:click', handler);
      return null;
    };

    const { unmount } = render(
      <GraphProvider>
        <EventConsumer />
      </GraphProvider>,
    );

    await waitFor(() => {
      expect(graph.events['node:click']?.size).toBe(1);
    });

    act(() => {
      graph.trigger('node:click', { id: 'n1' });
    });

    expect(handler).toHaveBeenCalledWith({ id: 'n1' });

    unmount();

    expect(graph.events['node:click']?.size || 0).toBe(0);
  });
});
