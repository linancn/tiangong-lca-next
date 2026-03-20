import {
  AUTO_LAYOUT_HISTORY_EVENT,
  applyNodePositions,
  captureNodePositions,
  executeX6HistoryCommand,
  haveNodePositionsChanged,
  pushAutoLayoutHistoryCommand,
} from '@/components/X6Graph/history';

const createNode = (id: string, initialX: number, initialY: number) => {
  const positionState = { x: initialX, y: initialY };

  return {
    id,
    position: jest.fn((x?: number, y?: number, options?: Record<string, any>) => {
      if (typeof x === 'number' && typeof y === 'number') {
        positionState.x = x;
        positionState.y = y;
        return options;
      }

      return { ...positionState };
    }),
  };
};

describe('X6Graph history helpers', () => {
  it('captures node positions and detects changes', () => {
    const nodeA = createNode('node-a', 10, 20);
    const nodeB = createNode('node-b', 40, 60);
    const graph = {
      getNodes: () => [nodeA, nodeB],
    } as any;

    const before = captureNodePositions(graph);
    const after = {
      ...before,
      'node-b': { x: 80, y: 120 },
    };

    expect(before).toEqual({
      'node-a': { x: 10, y: 20 },
      'node-b': { x: 40, y: 60 },
    });
    expect(haveNodePositionsChanged(before, before)).toBe(false);
    expect(haveNodePositionsChanged(before, after)).toBe(true);
    expect(haveNodePositionsChanged(before, { 'node-a': before['node-a'] })).toBe(true);
    expect(
      haveNodePositionsChanged(before, {
        'node-a': before['node-a'],
        'node-b': undefined as any,
      }),
    ).toBe(true);
  });

  it('applies node positions and executes custom auto-layout history commands', () => {
    const nodeA = createNode('node-a', 10, 20);
    const nodeB = createNode('node-b', 40, 60);
    const graph = {
      getNodes: () => [nodeA, nodeB],
    } as any;

    applyNodePositions(
      graph,
      {
        'node-a': { x: 30, y: 50 },
        'node-b': { x: 40, y: 60 },
      },
      { propertyPath: 'position' },
    );

    expect(nodeA.position).toHaveBeenCalledWith(30, 50, {
      propertyPath: 'position',
      ignoreHistory: true,
    });
    expect(nodeB.position).not.toHaveBeenCalledWith(
      40,
      60,
      expect.objectContaining({ ignoreHistory: true }),
    );

    applyNodePositions(graph, {
      'node-b': { x: 45, y: 65 },
    });
    expect(nodeB.position).toHaveBeenCalledWith(45, 65, {
      ignoreHistory: true,
    });

    expect(
      executeX6HistoryCommand(
        graph,
        {
          event: AUTO_LAYOUT_HISTORY_EVENT,
          data: {
            before: { 'node-a': { x: 10, y: 20 } },
            after: { 'node-a': { x: 90, y: 120 } },
          },
        },
        false,
        { propertyPath: 'position' },
      ),
    ).toBe(true);
    expect(
      executeX6HistoryCommand(
        graph,
        {
          event: AUTO_LAYOUT_HISTORY_EVENT,
          data: { before: { 'node-b': { x: 25, y: 35 } } },
        },
        true,
      ),
    ).toBe(true);
    expect(
      executeX6HistoryCommand(graph, { event: 'custom:event', data: {} }, false, {
        propertyPath: 'position',
      }),
    ).toBe(false);
    expect(
      executeX6HistoryCommand(
        graph,
        {
          event: AUTO_LAYOUT_HISTORY_EVENT,
          data: { before: { 'node-a': { x: 10, y: 20 } } },
        },
        false,
        { propertyPath: 'position' },
      ),
    ).toBe(true);
  });

  it('pushes auto-layout commands into history only when positions changed', () => {
    const undoStackPush = jest.fn();
    const consolidateCommands = jest.fn();
    const notify = jest.fn();
    const history = {
      disabled: false,
      redoStack: ['stale-redo'],
      undoStackPush,
      consolidateCommands,
      notify,
    };
    const graph = {
      getPlugin: jest.fn(() => history),
    } as any;

    expect(
      pushAutoLayoutHistoryCommand(
        graph,
        { 'node-a': { x: 0, y: 0 } },
        { 'node-a': { x: 120, y: 80 } },
        { reason: 'auto-layout' },
      ),
    ).toBe(true);

    expect(history.redoStack).toEqual([]);
    expect(undoStackPush).toHaveBeenCalledWith(
      expect.objectContaining({
        batch: false,
        event: AUTO_LAYOUT_HISTORY_EVENT,
        data: {
          before: { 'node-a': { x: 0, y: 0 } },
          after: { 'node-a': { x: 120, y: 80 } },
        },
      }),
    );
    expect(consolidateCommands).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(
      'add',
      expect.objectContaining({ event: AUTO_LAYOUT_HISTORY_EVENT }),
      { reason: 'auto-layout' },
    );

    expect(
      pushAutoLayoutHistoryCommand(
        graph,
        { 'node-a': { x: 120, y: 80 } },
        { 'node-a': { x: 120, y: 80 } },
      ),
    ).toBe(false);
  });

  it('returns false when the history plugin is missing or disabled', () => {
    const graphWithoutHistory = {
      getPlugin: jest.fn(() => null),
    } as any;
    const graphWithDisabledHistory = {
      getPlugin: jest.fn(() => ({ disabled: true })),
    } as any;

    expect(
      pushAutoLayoutHistoryCommand(
        graphWithoutHistory,
        { 'node-a': { x: 0, y: 0 } },
        { 'node-a': { x: 1, y: 1 } },
      ),
    ).toBe(false);
    expect(
      pushAutoLayoutHistoryCommand(
        graphWithDisabledHistory,
        { 'node-a': { x: 0, y: 0 } },
        { 'node-a': { x: 1, y: 1 } },
      ),
    ).toBe(false);
  });

  it('falls back to pushing onto undoStack when undoStackPush is unavailable', () => {
    const history = {
      disabled: false,
      redoStack: ['stale-redo'],
      undoStack: [] as any[],
      consolidateCommands: jest.fn(),
      notify: jest.fn(),
    };
    const graph = {
      getPlugin: jest.fn(() => history),
    } as any;

    expect(
      pushAutoLayoutHistoryCommand(
        graph,
        { 'node-a': { x: 0, y: 0 } },
        { 'node-a': { x: 5, y: 5 } },
        { reason: 'fallback-history' },
      ),
    ).toBe(true);

    expect(history.undoStack).toEqual([
      expect.objectContaining({
        event: AUTO_LAYOUT_HISTORY_EVENT,
        data: {
          before: { 'node-a': { x: 0, y: 0 } },
          after: { 'node-a': { x: 5, y: 5 } },
        },
      }),
    ]);
  });
});
