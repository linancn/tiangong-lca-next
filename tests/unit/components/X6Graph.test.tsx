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
    };
    graphInstances.push(instance);
    return instance;
  });

  return { __esModule: true, Graph, __graphInstances: graphInstances };
});

jest.mock('@antv/x6-plugin-snapline', () => {
  class Snapline {
    options: any;
    constructor(options: any) {
      this.options = options;
    }
  }
  return { __esModule: true, Snapline };
});

jest.mock('@antv/x6-plugin-selection', () => {
  class Selection {
    options: any;
    constructor(options: any) {
      this.options = options;
    }
  }
  return { __esModule: true, Selection };
});

jest.mock('@antv/x6-plugin-transform', () => {
  class Transform {
    options: any;
    constructor(options: any) {
      this.options = options;
    }
  }
  return { __esModule: true, Transform };
});

describe('X6Graph component (src/components/X6Graph/index.tsx)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { __graphInstances } = jest.requireMock('@antv/x6');
    __graphInstances.length = 0;
    mockSetGraph.mockReset();
  });

  it('creates graph with default options and plugins', () => {
    const { Graph, __graphInstances } = jest.requireMock('@antv/x6');
    const { Snapline } = jest.requireMock('@antv/x6-plugin-snapline');
    const { Selection } = jest.requireMock('@antv/x6-plugin-selection');

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
    const { Graph, __graphInstances } = jest.requireMock('@antv/x6');
    const { Snapline } = jest.requireMock('@antv/x6-plugin-snapline');
    const { Transform } = jest.requireMock('@antv/x6-plugin-transform');

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

    expect(instance.use).toHaveBeenCalledTimes(2);
    expect(instance.use).toHaveBeenCalledWith(expect.any(Snapline));
    expect(instance.use).toHaveBeenCalledWith(expect.any(Transform));

    unmount();

    expect(instance.dispose).toHaveBeenCalledTimes(1);
    expect(mockSetGraph).toHaveBeenLastCalledWith(null);
  });
});
