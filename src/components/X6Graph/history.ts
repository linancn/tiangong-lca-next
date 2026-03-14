import type { Graph } from '@antv/x6';

export const AUTO_LAYOUT_HISTORY_EVENT = 'x6:auto-layout';

export type NodePositionSnapshot = Record<string, { x: number; y: number }>;

type AutoLayoutHistoryCommand = {
  batch: false;
  event: typeof AUTO_LAYOUT_HISTORY_EVENT;
  data: {
    before: NodePositionSnapshot;
    after: NodePositionSnapshot;
  };
  options?: Record<string, any>;
};

type HistoryLike = {
  disabled?: boolean;
  redoStack?: unknown[];
  undoStack?: unknown[];
  undoStackPush?: (cmd: unknown) => void;
  consolidateCommands?: () => void;
  notify?: (event: string, cmd: unknown, options: Record<string, any>) => void;
};

const getHistoryPlugin = (graph: Graph) =>
  (graph as any).getPlugin?.('history') as HistoryLike | null;

export const captureNodePositions = (graph: Graph): NodePositionSnapshot => {
  const snapshot: NodePositionSnapshot = {};

  graph.getNodes().forEach((node) => {
    const position = node.position();
    snapshot[node.id] = { x: position.x, y: position.y };
  });

  return snapshot;
};

export const haveNodePositionsChanged = (
  before: NodePositionSnapshot,
  after: NodePositionSnapshot,
) => {
  const beforeIds = Object.keys(before);
  const afterIds = Object.keys(after);

  if (beforeIds.length !== afterIds.length) {
    return true;
  }

  return beforeIds.some((id) => {
    const next = after[id];
    if (!next) {
      return true;
    }

    return before[id].x !== next.x || before[id].y !== next.y;
  });
};

export const applyNodePositions = (
  graph: Graph,
  positions: NodePositionSnapshot,
  options: Record<string, any> = {},
) => {
  graph.getNodes().forEach((node) => {
    const nextPosition = positions[node.id];
    if (!nextPosition) {
      return;
    }

    const currentPosition = node.position();
    if (currentPosition.x === nextPosition.x && currentPosition.y === nextPosition.y) {
      return;
    }

    node.position(nextPosition.x, nextPosition.y, {
      ...options,
      ignoreHistory: true,
    });
  });
};

export const executeX6HistoryCommand = (
  graph: Graph,
  cmd: {
    event?: string;
    data?: Record<string, any> & {
      before?: NodePositionSnapshot;
      after?: NodePositionSnapshot;
    };
  },
  revert: boolean,
  options: Record<string, any> = {},
) => {
  if (cmd.event !== AUTO_LAYOUT_HISTORY_EVENT) {
    return false;
  }

  const snapshot = revert ? cmd.data?.before : cmd.data?.after;
  if (!snapshot) {
    return true;
  }

  applyNodePositions(graph, snapshot, options);
  return true;
};

export const pushAutoLayoutHistoryCommand = (
  graph: Graph,
  before: NodePositionSnapshot,
  after: NodePositionSnapshot,
  options: Record<string, any> = {},
) => {
  if (!haveNodePositionsChanged(before, after)) {
    return false;
  }

  const history = getHistoryPlugin(graph);
  if (!history || history.disabled) {
    return false;
  }

  const command: AutoLayoutHistoryCommand = {
    batch: false,
    event: AUTO_LAYOUT_HISTORY_EVENT,
    data: { before, after },
    options,
  };

  history.redoStack = [];

  if (typeof history.undoStackPush === 'function') {
    history.undoStackPush(command);
  } else if (Array.isArray(history.undoStack)) {
    history.undoStack.push(command);
  }

  history.consolidateCommands?.();
  history.notify?.('add', command, options);

  return true;
};
