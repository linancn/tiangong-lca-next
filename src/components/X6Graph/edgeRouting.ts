import type { Graph } from '@antv/x6';

type EdgeTerminalLike = Record<string, unknown>;
type EdgeViewLike = {
  update?: (options?: Record<string, any>) => void;
};

const isCellTerminal = (terminal: unknown): terminal is EdgeTerminalLike =>
  terminal !== null && typeof terminal === 'object' && 'cell' in terminal;

const stripTransientCoordinates = <T extends EdgeTerminalLike>(terminal: T): T => {
  const rest = { ...terminal };
  delete rest.x;
  delete rest.y;
  return rest as T;
};

export const refreshGraphEdgeAnchors = (graph: Graph, options: Record<string, any> = {}) => {
  const edges =
    typeof (graph as Graph & { getEdges?: () => any[] }).getEdges === 'function'
      ? graph.getEdges()
      : [];

  if (edges.length === 0) {
    return false;
  }

  const refresh = () => {
    edges.forEach((edge) => {
      if (typeof edge?.getSource === 'function' && typeof edge?.setSource === 'function') {
        const source = edge.getSource();
        if (isCellTerminal(source)) {
          edge.setSource(stripTransientCoordinates(source), options);
        }
      }

      if (typeof edge?.getTarget === 'function' && typeof edge?.setTarget === 'function') {
        const target = edge.getTarget();
        if (isCellTerminal(target)) {
          edge.setTarget(stripTransientCoordinates(target), options);
        }
      }

      const edgeView =
        typeof edge?.findView === 'function' ? (edge.findView(graph) as EdgeViewLike | null) : null;
      edgeView?.update?.(options);
    });
  };

  if (
    typeof (graph as Graph & { batchUpdate?: (name: string, fn: () => void) => void })
      .batchUpdate === 'function'
  ) {
    graph.batchUpdate('refresh-edge-anchors', refresh);
  } else {
    refresh();
  }

  return true;
};

export const scheduleGraphEdgeAnchorRefresh = (graph: Graph, options: Record<string, any> = {}) => {
  const requestFrame = globalThis.requestAnimationFrame?.bind(globalThis);
  const cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis);

  if (requestFrame && cancelFrame) {
    let secondFrame = 0;
    const firstFrame = requestFrame(() => {
      secondFrame = requestFrame(() => {
        refreshGraphEdgeAnchors(graph, options);
      });
    });

    return () => {
      cancelFrame(firstFrame);
      if (secondFrame) {
        cancelFrame(secondFrame);
      }
    };
  }

  const timeoutId = globalThis.setTimeout(() => {
    refreshGraphEdgeAnchors(graph, options);
  }, 0);

  return () => {
    globalThis.clearTimeout(timeoutId);
  };
};
