import { applyDagreLayout } from '@/pages/LifeCycleModels/Components/toolbar/utils/layout';

type MockNode = {
  id: string;
  getSize: () => { width: number; height: number };
  position: (x: number, y: number) => void;
};

type MockEdge = {
  id: string;
  getSourceCellId: () => string | null;
  getTargetCellId: () => string | null;
};

const createNode = (
  id: string,
  positions: Record<string, { x: number; y: number }>,
  width = 120,
  height = 80,
): MockNode => ({
  id,
  getSize: () => ({ width, height }),
  position: (x: number, y: number) => {
    positions[id] = { x, y };
  },
});

const createEdge = (id: string, source: string | null, target: string | null): MockEdge => ({
  id,
  getSourceCellId: () => source,
  getTargetCellId: () => target,
});

describe('applyDagreLayout (src/pages/LifeCycleModels/Components/toolbar/utils/layout.ts)', () => {
  beforeAll(() => {
    if (typeof globalThis.structuredClone !== 'function') {
      (globalThis as { structuredClone?: (value: unknown) => unknown }).structuredClone = (
        value: unknown,
      ) => JSON.parse(JSON.stringify(value));
    }
  });

  it('returns false for empty graph', () => {
    const graph = {
      getNodes: () => [],
      getEdges: () => [],
    } as any;

    expect(applyDagreLayout(graph, 'LR')).toBe(false);
  });

  it('places downstream nodes to the right in LR layout', () => {
    const positions: Record<string, { x: number; y: number }> = {};
    const nodeA = createNode('A', positions);
    const nodeB = createNode('B', positions);
    const edgeAB = createEdge('edge-ab', 'A', 'B');
    const graph = {
      getNodes: () => [nodeA, nodeB],
      getEdges: () => [edgeAB],
    } as any;

    const didLayout = applyDagreLayout(graph, 'LR');

    expect(didLayout).toBe(true);
    expect(positions.A).toBeDefined();
    expect(positions.B).toBeDefined();
    expect(positions.B.x).toBeGreaterThan(positions.A.x);
  });

  it('ignores dangling edges and still computes positions', () => {
    const positions: Record<string, { x: number; y: number }> = {};
    const nodeA = createNode('A', positions);
    const nodeB = createNode('B', positions);
    const validEdge = createEdge('edge-ab', 'A', 'B');
    const danglingEdge = createEdge('edge-missing', 'A', null);
    const missingNodeEdge = createEdge('edge-ghost', 'A', 'ghost');
    const selfLoop = createEdge('edge-loop', 'A', 'A');
    const graph = {
      getNodes: () => [nodeA, nodeB],
      getEdges: () => [validEdge, danglingEdge, missingNodeEdge, selfLoop],
    } as any;

    const didLayout = applyDagreLayout(graph, 'LR');

    expect(didLayout).toBe(true);
    expect(positions.A).toBeDefined();
    expect(positions.B).toBeDefined();
  });
});
