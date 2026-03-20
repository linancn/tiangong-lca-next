import {
  refreshGraphEdgeAnchors,
  scheduleGraphEdgeAnchorRefresh,
} from '@/components/X6Graph/edgeRouting';

describe('edgeRouting (src/components/X6Graph/edgeRouting.ts)', () => {
  it('reapplies cell terminals without transient coordinates', () => {
    const update = jest.fn();
    const edge = {
      getSource: jest.fn(() => ({ cell: 'node-a', port: 'OUTPUT:flow-a', x: 12, y: 18 })),
      getTarget: jest.fn(() => ({ cell: 'node-b', port: 'INPUT:flow-a', x: 88, y: 42 })),
      setSource: jest.fn(),
      setTarget: jest.fn(),
      findView: jest.fn(() => ({ update })),
    };
    const graph = {
      getEdges: () => [edge],
      batchUpdate: jest.fn((_: string, fn: () => void) => fn()),
    } as any;

    expect(refreshGraphEdgeAnchors(graph, { ignoreHistory: true })).toBe(true);
    expect(graph.batchUpdate).toHaveBeenCalledWith('refresh-edge-anchors', expect.any(Function));
    expect(edge.setSource).toHaveBeenCalledWith(
      { cell: 'node-a', port: 'OUTPUT:flow-a' },
      { ignoreHistory: true },
    );
    expect(edge.setTarget).toHaveBeenCalledWith(
      { cell: 'node-b', port: 'INPUT:flow-a' },
      { ignoreHistory: true },
    );
    expect(update).toHaveBeenCalledWith({ ignoreHistory: true });
  });

  it('schedules a delayed refresh so the paper can settle before reconnecting edges', () => {
    const edge = {
      getSource: jest.fn(() => ({ cell: 'node-a', port: 'OUTPUT:flow-a', x: 12, y: 18 })),
      getTarget: jest.fn(() => ({ cell: 'node-b', port: 'INPUT:flow-a', x: 88, y: 42 })),
      setSource: jest.fn(),
      setTarget: jest.fn(),
    };
    const callbacks: Array<FrameRequestCallback | undefined> = [];
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

    globalThis.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      callbacks.push(callback);
      return callbacks.length;
    }) as typeof globalThis.requestAnimationFrame;
    globalThis.cancelAnimationFrame = jest.fn() as typeof globalThis.cancelAnimationFrame;

    const graph = {
      getEdges: () => [edge],
      batchUpdate: jest.fn((_: string, fn: () => void) => fn()),
    } as any;
    scheduleGraphEdgeAnchorRefresh(graph, { ignoreHistory: true });

    expect(edge.setSource).not.toHaveBeenCalled();
    callbacks[0]?.(0);
    expect(edge.setSource).not.toHaveBeenCalled();
    callbacks[1]?.(0);
    expect(edge.setSource).toHaveBeenCalledWith(
      { cell: 'node-a', port: 'OUTPUT:flow-a' },
      { ignoreHistory: true },
    );
    expect(edge.setTarget).toHaveBeenCalledWith(
      { cell: 'node-b', port: 'INPUT:flow-a' },
      { ignoreHistory: true },
    );

    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
  });
});
