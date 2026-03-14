import { render } from '@testing-library/react';

import X6GraphComponent from '@/components/X6Graph';

const mockSetGraph = jest.fn();

jest.mock('@/contexts/graphContext', () => ({
  __esModule: true,
  useGraphStore: (selector: any) => selector({ setGraph: mockSetGraph }),
}));

jest.mock('@antv/x6', () => {
  const graphInstances: any[] = [];

  const Graph = jest.fn().mockImplementation((options) => {
    const instance = {
      options,
      use: jest.fn(),
      dispose: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      getNodes: jest.fn(() => []),
    };
    graphInstances.push(instance);
    return instance;
  });

  class Snapline {
    options: any;
    constructor(options: any) {
      this.options = options;
    }
  }
  class History {
    options: any;
    constructor(options: any) {
      this.options = options;
    }
  }
  class Clipboard {
    options: any;
    constructor(options: any) {
      this.options = options;
    }
  }
  class Keyboard {
    options: any;
    constructor(options: any) {
      this.options = options;
    }
  }
  class Selection {
    options: any;
    constructor(options: any) {
      this.options = options;
    }
  }
  class Transform {
    options: any;
    constructor(options: any) {
      this.options = options;
    }
  }

  return {
    __esModule: true,
    Graph,
    Snapline,
    History,
    Clipboard,
    Keyboard,
    Selection,
    Transform,
    __graphInstances: graphInstances,
  };
});

describe('X6Graph component (src/components/X6Graph/index.tsx)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { __graphInstances } = jest.requireMock('@antv/x6');
    __graphInstances.length = 0;
    mockSetGraph.mockReset();
  });

  it('creates graph with default options and plugins', () => {
    const { Graph, Snapline, Selection, __graphInstances } = jest.requireMock('@antv/x6');

    render(<X6GraphComponent />);

    expect(Graph).toHaveBeenCalledTimes(1);
    const instance = __graphInstances[0];
    expect(instance.options.container).toBeInstanceOf(HTMLElement);
    expect(instance.options.panning).toBe(true);
    expect(instance.options.mousewheel).toEqual({ enabled: true, minScale: 0.5, maxScale: 1.5 });
    expect(instance.options.connecting).toMatchObject({
      snap: true,
      allowBlank: false,
      allowLoop: false,
      allowMulti: false,
      allowNode: false,
      allowEdge: false,
      router: 'manhattan',
      connector: 'rounded',
    });
    expect(instance.options.grid).toMatchObject({
      size: 10,
      visible: true,
      type: 'dot',
      args: { color: '#595959', thickness: 1 },
    });

    expect(instance.use).toHaveBeenCalledTimes(2);
    expect(instance.use).toHaveBeenCalledWith(expect.any(Snapline));
    expect(instance.use).toHaveBeenCalledWith(expect.any(Selection));
    expect(mockSetGraph).toHaveBeenCalledWith(instance);
  });

  it('applies custom options and cleans up on unmount', () => {
    const { Graph, Clipboard, History, Keyboard, Snapline, Transform, __graphInstances } =
      jest.requireMock('@antv/x6');

    const { unmount } = render(
      <X6GraphComponent
        zoomable={false}
        pannable={false}
        minScale={0.25}
        selectOptions={{ enabled: false }}
        connectionOptions={{
          allowMulti: 'withPort',
          allowBlank: true,
          allowLoop: true,
          allowNode: true,
          allowEdge: true,
          router: { name: 'er' },
          connector: { name: 'normal' },
        }}
        gridOptions={{ visible: false }}
        transformOptions={{ resizing: true, rotating: true }}
        historyOptions={{ enabled: true }}
        clipboardOptions={{ enabled: true, useLocalStorage: false }}
        keyboardOptions={{ enabled: true, global: false }}
      />,
    );

    expect(Graph).toHaveBeenCalledTimes(1);
    const instance = __graphInstances[0];
    expect(instance.options.mousewheel).toBe(false);
    expect(instance.options.panning).toBe(false);
    expect(instance.options.connecting).toMatchObject({
      allowMulti: 'withPort',
      allowBlank: true,
      allowLoop: true,
      allowNode: true,
      allowEdge: true,
      router: 'er',
      connector: 'normal',
    });
    expect(instance.options.grid).toBe(false);

    expect(instance.use).toHaveBeenCalledTimes(5);
    expect(instance.use).toHaveBeenCalledWith(expect.any(History));
    expect(instance.use).toHaveBeenCalledWith(expect.any(Clipboard));
    expect(instance.use).toHaveBeenCalledWith(expect.any(Keyboard));
    expect(instance.use).toHaveBeenCalledWith(expect.any(Snapline));
    expect(instance.use).toHaveBeenCalledWith(expect.any(Transform));

    const historyPlugin = instance.use.mock.calls.find(
      ([plugin]: [unknown]) => plugin instanceof History,
    )?.[0];

    expect(historyPlugin.options.beforeAddCommand('cell:change:tools', { options: {} })).toBe(true);
    expect(
      historyPlugin.options.beforeAddCommand('cell:change:tools', {
        options: { ignoreHistory: true },
      }),
    ).toBe(false);

    unmount();

    expect(instance.dispose).toHaveBeenCalledTimes(1);
    expect(mockSetGraph).toHaveBeenLastCalledWith(null);
  });

  it('delegates history filtering to a custom beforeAddCommand when provided', () => {
    const { History, __graphInstances } = jest.requireMock('@antv/x6');
    const beforeAddCommand = jest.fn(() => 'custom-result');

    render(
      <X6GraphComponent
        historyOptions={{
          enabled: true,
          beforeAddCommand,
        }}
        clipboardOptions={{ enabled: true, useLocalStorage: true }}
        keyboardOptions={{ enabled: true, global: true }}
      />,
    );

    const instance = __graphInstances[0];
    const historyPlugin = instance.use.mock.calls.find(
      ([plugin]: [unknown]) => plugin instanceof History,
    )?.[0];

    expect(historyPlugin.options.beforeAddCommand('cell:added', { options: {} })).toBe(
      'custom-result',
    );
    expect(beforeAddCommand).toHaveBeenCalledWith('cell:added', { options: {} });
  });

  it('handles custom auto-layout history commands before delegating executeCommand', () => {
    const { History, __graphInstances } = jest.requireMock('@antv/x6');
    const executeCommand = jest.fn();
    const position = { x: 0, y: 0 };
    const fakeNode = {
      id: 'node-1',
      position: jest.fn((x?: number, y?: number, options?: Record<string, any>) => {
        if (typeof x === 'number' && typeof y === 'number') {
          position.x = x;
          position.y = y;
          return options;
        }

        return { ...position };
      }),
    };

    render(
      <X6GraphComponent
        historyOptions={{
          enabled: true,
          executeCommand,
        }}
      />,
    );

    const instance = __graphInstances[0];
    instance.getNodes.mockReturnValue([fakeNode]);

    const historyPlugin = instance.use.mock.calls.find(
      ([plugin]: [unknown]) => plugin instanceof History,
    )?.[0];

    historyPlugin.options.executeCommand(
      {
        event: 'x6:auto-layout',
        data: {
          before: { 'node-1': { x: 0, y: 0 } },
          after: { 'node-1': { x: 48, y: 96 } },
        },
      },
      false,
      { propertyPath: 'position' },
    );

    expect(fakeNode.position).toHaveBeenCalledWith(48, 96, {
      propertyPath: 'position',
      ignoreHistory: true,
    });
    expect(executeCommand).not.toHaveBeenCalled();

    historyPlugin.options.executeCommand({ event: 'custom:event', data: {} }, false, {
      foo: 'bar',
    });

    expect(executeCommand).toHaveBeenCalledWith({ event: 'custom:event', data: {} }, false, {
      foo: 'bar',
    });
  });

  it('falls back to default plugin flags when optional settings are omitted', () => {
    const { Clipboard, Keyboard, Transform, __graphInstances } = jest.requireMock('@antv/x6');

    render(
      <X6GraphComponent
        clipboardOptions={{ enabled: true }}
        keyboardOptions={{ enabled: true }}
        transformOptions={{ rotating: true }}
      />,
    );

    const instance = __graphInstances[0];
    const clipboardPlugin = instance.use.mock.calls.find(
      ([plugin]: [unknown]) => plugin instanceof Clipboard,
    )?.[0];
    const keyboardPlugin = instance.use.mock.calls.find(
      ([plugin]: [unknown]) => plugin instanceof Keyboard,
    )?.[0];
    const transformPlugin = instance.use.mock.calls.find(
      ([plugin]: [unknown]) => plugin instanceof Transform,
    )?.[0];

    expect(clipboardPlugin.options.useLocalStorage).toBe(false);
    expect(keyboardPlugin.options.global).toBe(false);
    expect(transformPlugin.options).toEqual({ resizing: false, rotating: true });
  });

  it('falls back to a non-rotating transform when only resizing is enabled', () => {
    const { Transform, __graphInstances } = jest.requireMock('@antv/x6');

    render(<X6GraphComponent transformOptions={{ resizing: true }} />);

    const instance = __graphInstances[0];
    const transformPlugin = instance.use.mock.calls.find(
      ([plugin]: [unknown]) => plugin instanceof Transform,
    )?.[0];

    expect(transformPlugin.options).toEqual({ resizing: true, rotating: false });
  });
});
