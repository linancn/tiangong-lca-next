import {
  refreshGraphEdgeAnchors,
  scheduleGraphEdgeAnchorRefresh,
} from '@/components/X6Graph/edgeRouting';

describe('edgeRouting (src/components/X6Graph/edgeRouting.ts)', () => {
  it('returns false when the graph has no edges to refresh', () => {
    const graph = {
      getEdges: () => [],
    } as any;

    expect(refreshGraphEdgeAnchors(graph)).toBe(false);
  });

  it('returns false when the graph does not expose getEdges', () => {
    expect(refreshGraphEdgeAnchors({} as any)).toBe(false);
  });

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

  it('refreshes edges directly when the graph does not provide batchUpdate', () => {
    const edge = {
      getSource: jest.fn(() => ({ cell: 'node-a', port: 'OUTPUT:flow-a', x: 1, y: 2 })),
      getTarget: jest.fn(() => ({ cell: 'node-b', port: 'INPUT:flow-a', x: 3, y: 4 })),
      setSource: jest.fn(),
      setTarget: jest.fn(),
    };
    const graph = {
      getEdges: () => [edge],
    } as any;

    expect(refreshGraphEdgeAnchors(graph, { direct: true })).toBe(true);
    expect(edge.setSource).toHaveBeenCalledWith(
      { cell: 'node-a', port: 'OUTPUT:flow-a' },
      { direct: true },
    );
    expect(edge.setTarget).toHaveBeenCalledWith(
      { cell: 'node-b', port: 'INPUT:flow-a' },
      { direct: true },
    );
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

  it('cancels both queued animation frames when requested', () => {
    const callbacks: Array<FrameRequestCallback | undefined> = [];
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

    globalThis.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      callbacks.push(callback);
      return callbacks.length;
    }) as typeof globalThis.requestAnimationFrame;
    globalThis.cancelAnimationFrame = jest.fn() as typeof globalThis.cancelAnimationFrame;

    const cancel = scheduleGraphEdgeAnchorRefresh({ getEdges: () => [] } as any);
    callbacks[0]?.(0);
    cancel();

    expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(2);

    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  it('falls back to setTimeout scheduling when requestAnimationFrame is unavailable', () => {
    const edge = {
      getSource: jest.fn(() => ({ cell: 'node-a', port: 'OUTPUT:flow-a', x: 12, y: 18 })),
      getTarget: jest.fn(() => ({ cell: 'node-b', port: 'INPUT:flow-a', x: 88, y: 42 })),
      setSource: jest.fn(),
      setTarget: jest.fn(),
    };
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
    const originalSetTimeout = globalThis.setTimeout;
    const originalClearTimeout = globalThis.clearTimeout;
    let scheduledCallback: (() => void) | undefined;

    globalThis.requestAnimationFrame =
      undefined as unknown as typeof globalThis.requestAnimationFrame;
    globalThis.cancelAnimationFrame =
      undefined as unknown as typeof globalThis.cancelAnimationFrame;
    globalThis.setTimeout = jest.fn((callback: any) => {
      scheduledCallback = callback;
      return 99 as any;
    }) as unknown as typeof globalThis.setTimeout;
    globalThis.clearTimeout = jest.fn() as typeof globalThis.clearTimeout;

    const cancel = scheduleGraphEdgeAnchorRefresh(
      {
        getEdges: () => [edge],
        batchUpdate: jest.fn((_: string, fn: () => void) => fn()),
      } as any,
      { fallback: true },
    );

    scheduledCallback?.();
    expect(edge.setSource).toHaveBeenCalledWith(
      { cell: 'node-a', port: 'OUTPUT:flow-a' },
      { fallback: true },
    );
    cancel();
    expect(globalThis.clearTimeout).toHaveBeenCalledWith(99);

    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  });
});
