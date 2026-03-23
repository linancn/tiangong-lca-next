// @ts-nocheck
import ToolbarView from '@/pages/LifeCycleModels/Components/toolbar/viewIndex';
import { act, fireEvent, render, screen, waitFor } from '../../../../../helpers/testUtils';

const mockUpdateNode = jest.fn();
const mockUpdateEdge = jest.fn();
const mockRemoveEdges = jest.fn();
const mockInitData = jest.fn();

let mockGraphStoreState: any = {};

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@/contexts/graphContext', () => ({
  __esModule: true,
  useGraphStore: (selector: any) => selector(mockGraphStoreState),
  useGraphEvent: jest.fn(),
}));

const { useGraphEvent: mockUseGraphEvent } = jest.requireMock('@/contexts/graphContext');

jest.mock('antd', () => {
  const React = require('react');

  const Space = ({ children }: any) => <div>{children}</div>;
  const Spin = ({ children }: any) => <div>{children}</div>;
  const message = {
    error: jest.fn(),
    success: jest.fn(),
  };
  const theme = {
    useToken: () => ({
      token: {
        colorPrimary: '#1677ff',
        colorBgContainer: '#fff',
        colorBorder: '#d9d9d9',
        colorBgBase: '#fafafa',
        colorTextBase: '#000',
        colorTextDescription: '#8c8c8c',
      },
    }),
  };

  return {
    __esModule: true,
    Space,
    Spin,
    message,
    theme,
  };
});

const mockMessage = jest.requireMock('antd').message as Record<string, jest.Mock>;

jest.mock('@/pages/LifeCycleModels/Components/toolbar/viewInfo', () => ({
  __esModule: true,
  default: ({ data, lang }: any) => (
    <div data-testid='toolbar-view-info'>{`${lang}:${data?.id}:${data?.version ?? ''}`}</div>
  ),
}));

jest.mock('@/pages/Processes/Components/view', () => ({
  __esModule: true,
  default: ({ id, version, buttonType, disabled, lang }: any) => (
    <div data-testid='process-view'>{`${id}:${version}:${buttonType}:${disabled}:${lang}`}</div>
  ),
}));

jest.mock('@/pages/LifeCycleModels/Components/view', () => ({
  __esModule: true,
  default: ({ id, version, buttonType, lang }: any) => (
    <div data-testid='life-cycle-model-view'>{`${id}:${version}:${buttonType}:${lang}`}</div>
  ),
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/Exchange/index', () => ({
  __esModule: true,
  default: ({ disabled, edge, lang }: any) => (
    <div data-testid='edge-exchange'>{`${disabled}:${edge?.id ?? 'none'}:${lang}`}</div>
  ),
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/viewTargetAmount', () => ({
  __esModule: true,
  default: ({ refNode, drawerVisible, lang, onData }: any) => (
    <div>
      <div data-testid='target-amount'>{`${refNode?.id ?? refNode?.data?.id ?? 'none'}:${drawerVisible}:${lang}`}</div>
      <button type='button' data-testid='target-amount-on-data' onClick={onData}>
        target-amount-on-data
      </button>
    </div>
  ),
}));

jest.mock('@/pages/LifeCycleModels/Components/modelResult', () => ({
  __esModule: true,
  default: ({ modelId, modelVersion, actionType, submodels }: any) => (
    <div data-testid='model-result'>{`${modelId}:${modelVersion}:${actionType}:${submodels?.length ?? 0}`}</div>
  ),
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/control', () => ({
  __esModule: true,
  Control: ({ items }: any) => (
    <div data-testid='control'>{Array.isArray(items) ? items.join('|') : ''}</div>
  ),
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/Exchange/ioPortView', () => ({
  __esModule: true,
  default: ({ direction, drawerVisible, node, lang }: any) => (
    <div data-testid='io-port-view'>{`${direction}:${drawerVisible}:${node?.id ?? node?.data?.id ?? 'none'}:${lang}`}</div>
  ),
}));

const mockGetLifeCycleModelDetail = jest.fn();
jest.mock('@/services/lifeCycleModels/api', () => ({
  __esModule: true,
  getLifeCycleModelDetail: (...args: any[]) => mockGetLifeCycleModelDetail(...args),
}));

const mockGenLifeCycleModelInfoFromData = jest.fn();
const mockGenLifeCycleModelData = jest.fn();
const mockGenProcessName = jest.fn();
const mockGetLangText = jest.fn();
const mockGetPortLabelWithAllocation = jest.fn();
const mockGetPortTextColor = jest.fn();
const mockGetPortTextStyle = jest.fn();
const mockNodeTitleTool = jest.fn();
jest.mock('@/services/lifeCycleModels/util', () => ({
  __esModule: true,
  genLifeCycleModelInfoFromData: (...args: any[]) => mockGenLifeCycleModelInfoFromData(...args),
  genLifeCycleModelData: (...args: any[]) => mockGenLifeCycleModelData(...args),
  genPortLabel: jest.fn((label: string) => label),
}));

const mockGetProcessesByIdAndVersion = jest.fn();
jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessesByIdAndVersion: (...args: any[]) => mockGetProcessesByIdAndVersion(...args),
}));

jest.mock('@/services/processes/util', () => ({
  __esModule: true,
  genProcessName: (...args: any[]) => mockGenProcessName(...args),
}));

jest.mock('@/services/general/data', () => ({
  __esModule: true,
  initVersion: '1.0.0',
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  formatDateTime: () => '2026-03-12 12:00',
  getLangText: (...args: any[]) => mockGetLangText(...args),
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/utils/edge', () => ({
  __esModule: true,
  getEdgeLabel: jest.fn(() => ({ attrs: { text: { text: 'edge-label' } } })),
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/utils/node', () => ({
  __esModule: true,
  getPortLabelWithAllocation: (...args: any[]) => mockGetPortLabelWithAllocation(...args),
  getPortTextColor: (...args: any[]) => mockGetPortTextColor(...args),
  getPortTextStyle: (...args: any[]) => mockGetPortTextStyle(...args),
  nodeTitleTool: (...args: any[]) => mockNodeTitleTool(...args),
}));

describe('ToolbarView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenProcessName.mockImplementation((label: any) => label ?? 'process-name');
    mockGetLangText.mockReturnValue('Flow label');
    mockGetPortLabelWithAllocation.mockImplementation((label: string) => label);
    mockGetPortTextColor.mockReturnValue('#1677ff');
    mockGetPortTextStyle.mockReturnValue('bold');
    mockNodeTitleTool.mockImplementation((width: number, title: string) => ({
      id: 'nodeTitle',
      width,
      title,
    }));
    mockGraphStoreState = {
      initData: mockInitData,
      updateNode: mockUpdateNode,
      updateEdge: mockUpdateEdge,
      removeEdges: mockRemoveEdges,
      nodes: [
        {
          id: 'node-1',
          selected: true,
          size: { width: 300 },
          data: {
            id: 'proc-1',
            version: '1.0',
            label: 'Process One',
            quantitativeReference: '1',
          },
          ports: { items: [] },
        },
        {
          id: 'node-2',
          selected: false,
          size: { width: 300 },
          data: {
            id: 'proc-2',
            version: '1.0',
            label: 'Process Two',
            quantitativeReference: '0',
          },
          ports: { items: [] },
        },
      ],
      edges: [
        {
          id: 'edge-1',
          selected: true,
          data: {
            node: {
              sourceProcessId: 'proc-1',
              sourceProcessVersion: '1.0',
              targetProcessId: 'proc-2',
              targetProcessVersion: '1.0',
            },
            connection: {
              outputExchange: {
                '@flowUUID': 'flow-1',
                downstreamProcess: {
                  '@flowUUID': 'flow-2',
                },
              },
            },
          },
        },
      ],
    };

    mockGenLifeCycleModelInfoFromData.mockReturnValue({
      lifeCycleModelInformation: {
        dataSetInformation: {
          'common:UUID': 'model-uuid',
        },
      },
    });
    mockGenLifeCycleModelData.mockReturnValue({
      nodes: [
        {
          id: 'node-a',
          size: { width: 320 },
          data: {
            id: 'proc-1',
            version: '1.0',
            label: 'Graph Process',
            quantitativeReference: '1',
          },
          ports: {
            items: [
              {
                id: 'port-input',
                group: 'groupInput',
                data: {
                  textLang: 'Input Flow',
                  allocations: [1],
                  quantitativeReference: '0',
                },
                attrs: { text: {} },
              },
              {
                id: 'port-output',
                group: 'groupOutput',
                data: {
                  textLang: 'Output Flow',
                  allocations: [2],
                  quantitativeReference: '1',
                },
                attrs: { text: {} },
              },
            ],
          },
        },
      ],
      edges: [
        {
          id: 'graph-edge-1',
          data: {
            connection: {
              unbalancedAmount: 2,
              exchangeAmount: 5,
            },
          },
          target: { x: 1, y: 2, cell: 'node-a' },
        },
        {
          id: 'graph-edge-2',
          data: {
            connection: {
              exchangeAmount: 1,
            },
          },
        },
      ],
    });
    mockGetLifeCycleModelDetail.mockResolvedValue({
      success: true,
      data: {
        json: {
          lifeCycleModelDataSet: {
            mocked: true,
          },
        },
        json_tg: {
          submodels: [{ id: 'sub-1' }],
          xflow: {
            nodes: [{ data: { id: 'proc-1', version: '1.0' } }],
          },
        },
      },
    });
    mockGetProcessesByIdAndVersion.mockResolvedValue({
      data: [{ id: 'proc-1', version: '1.0' }],
    });
  });

  it('loads graph data and renders process-oriented tools when the drawer is visible', async () => {
    render(<ToolbarView id='model-1' version='1.0.0' lang='en' drawerVisible />);

    await waitFor(() =>
      expect(mockGetLifeCycleModelDetail).toHaveBeenCalledWith('model-1', '1.0.0'),
    );
    await waitFor(() => expect(mockInitData).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockGetProcessesByIdAndVersion).toHaveBeenCalledWith([
        { id: 'proc-1', version: '1.0' },
      ]),
    );

    expect(screen.getByTestId('toolbar-view-info')).toHaveTextContent('en:model-1');
    expect(screen.getByTestId('process-view')).toHaveTextContent('proc-1:1.0:toolIcon:false:en');
    expect(screen.getByTestId('edge-exchange')).toHaveTextContent('false:edge-1:en');
    expect(screen.getByTestId('target-amount')).toHaveTextContent('node-1:false:en');
    expect(screen.getByTestId('model-result')).toHaveTextContent('model-1:1.0.0:view:1');
    expect(screen.getByTestId('control')).toHaveTextContent('zoomOut|zoomTo|zoomIn');

    const initGraph = mockInitData.mock.calls[0][0];
    expect(initGraph.nodes[0].ports.items[0].attrs.text.title).toBe('Flow label');
    expect(initGraph.nodes[0].ports.items[1].attrs.text.title).toBe('Flow label');
    expect(initGraph.edges.find((edge: any) => edge.id === 'graph-edge-2')).toEqual(
      expect.objectContaining({ id: 'graph-edge-2' }),
    );
  });

  it('opens input/output port selectors and the target amount drawer from generated node tools', async () => {
    mockGraphStoreState.nodes.push({
      selected: true,
      size: { width: 300 },
      data: {
        id: 'proc-3',
        version: '1.0',
        label: 'Process Three',
        quantitativeReference: '0',
      },
      ports: { items: [] },
    });
    mockGraphStoreState.edges.unshift({ selected: true });

    render(<ToolbarView id='model-1' version='1.0.0' lang='en' drawerVisible />);

    await waitFor(() => expect(mockInitData).toHaveBeenCalled());

    const initGraph = mockInitData.mock.calls[0][0];
    const tools = initGraph.nodes[0].tools.filter(Boolean);
    const inputTool = tools.find((tool: any) => tool.id === 'inputFlow');
    const outputTool = tools.find((tool: any) => tool.id === 'outputFlow');
    const referenceTool = tools.find((tool: any) => tool.id === 'ref');

    await act(async () => {
      await inputTool.args.onClick({
        cell: {
          store: {
            data: { id: 'node-a' },
          },
        },
      });
    });
    expect(mockUpdateEdge).toHaveBeenCalledWith('', { selected: false });
    expect(mockUpdateEdge).toHaveBeenCalledWith('edge-1', { selected: false });
    expect(mockUpdateNode).toHaveBeenCalledWith('', { selected: false });
    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { selected: false });
    expect(mockUpdateNode).toHaveBeenCalledWith('node-a', { selected: true });
    expect(screen.getByTestId('io-port-view')).toHaveTextContent('Input:true:node-a:en');

    mockUpdateNode.mockClear();
    mockUpdateEdge.mockClear();
    await act(async () => {
      await outputTool.args.onClick({
        cell: {
          store: {
            data: { id: 'node-b' },
          },
        },
      });
    });
    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { selected: false });
    expect(mockUpdateNode).toHaveBeenCalledWith('node-b', { selected: true });
    expect(screen.getByTestId('io-port-view')).toHaveTextContent('Output:true:node-b:en');

    mockUpdateNode.mockClear();
    mockUpdateEdge.mockClear();
    await act(async () => {
      referenceTool.args.onClick({
        cell: {
          store: {
            data: { id: 'node-ref' },
          },
        },
      });
    });
    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { selected: false });
    expect(mockUpdateNode).toHaveBeenCalledWith('node-ref', { selected: true });
    expect(screen.getByTestId('target-amount')).toHaveTextContent('node-1:true:en');
    fireEvent.click(screen.getByTestId('target-amount-on-data'));
  });

  it('does not change selection when a view tool click has no node id', async () => {
    render(<ToolbarView id='model-1' version='1.0.0' lang='en' drawerVisible />);

    await waitFor(() => expect(mockInitData).toHaveBeenCalled());

    const initGraph = mockInitData.mock.calls[0][0];
    const inputTool = initGraph.nodes[0].tools.find((tool: any) => tool.id === 'inputFlow');

    mockUpdateNode.mockClear();
    mockUpdateEdge.mockClear();

    await act(async () => {
      await inputTool.args.onClick({
        cell: {
          store: {
            data: {},
          },
        },
      });
    });

    expect(mockUpdateNode).not.toHaveBeenCalled();
    expect(mockUpdateEdge).not.toHaveBeenCalled();
    expect(screen.getByTestId('io-port-view')).toHaveTextContent('Input:true:none:en');
  });

  it('renders life cycle model view when the selected process instance belongs to a submodel', async () => {
    mockGetProcessesByIdAndVersion.mockResolvedValue({
      data: [{ id: 'proc-1', version: '1.0', modelId: 'submodel-1' }],
    });

    render(<ToolbarView id='model-1' version='1.0.0' lang='en' drawerVisible />);

    await waitFor(() => expect(screen.getByTestId('life-cycle-model-view')).toBeInTheDocument());
    expect(screen.getByTestId('life-cycle-model-view')).toHaveTextContent(
      'submodel-1:1.0:toolIcon:en',
    );
  });

  it('shows an error when the model is not public', async () => {
    mockGetLifeCycleModelDetail.mockResolvedValueOnce({
      success: false,
    });

    render(<ToolbarView id='model-1' version='1.0.0' lang='en' drawerVisible />);

    await waitFor(() => expect(mockMessage.error).toHaveBeenCalledWith('Model is not public'));
  });

  it('builds default view state without loading a model and keeps process and edge actions disabled', async () => {
    mockGraphStoreState.nodes = [
      {
        id: 'node-1',
        selected: false,
        size: { width: 300 },
        data: {
          id: 'proc-1',
          version: '1.0',
          label: 'Process One',
          quantitativeReference: '0',
        },
        ports: { items: [] },
      },
    ];
    mockGraphStoreState.edges = [
      {
        id: 'edge-1',
        selected: false,
        data: {
          connection: {
            outputExchange: {
              '@flowUUID': 'flow-1',
            },
          },
        },
      },
    ];

    render(<ToolbarView id='' version='' lang='en' drawerVisible />);

    await waitFor(() => expect(mockGetLifeCycleModelDetail).not.toHaveBeenCalled());
    expect(screen.getByTestId('toolbar-view-info')).toHaveTextContent('en::');
    expect(screen.getByTestId('process-view')).toHaveTextContent('::toolIcon:true:en');
    expect(screen.getByTestId('edge-exchange')).toHaveTextContent('true:none:en');
    expect(screen.getByTestId('target-amount')).toHaveTextContent('none:false:en');
  });

  it('uses empty defaults when the model payload is sparse or missing', async () => {
    mockGraphStoreState.nodes = [
      {
        id: 'node-width',
        selected: false,
        width: 280,
        data: {
          id: 'proc-2',
          version: '2.0',
          quantitativeReference: '0',
        },
        ports: { items: [] },
      },
      {
        selected: false,
        data: {
          id: 'proc-3',
          version: '3.0',
          quantitativeReference: '0',
        },
        ports: { items: [] },
      },
    ];
    mockGraphStoreState.edges = [];

    mockGenLifeCycleModelInfoFromData.mockReturnValueOnce({});
    mockGenLifeCycleModelData.mockReturnValueOnce({
      nodes: [
        {
          id: 'node-b',
          width: 280,
          data: {
            id: 'proc-2',
            version: '2.0',
            quantitativeReference: '0',
          },
          ports: {
            items: [
              {
                id: 'port-width',
                group: 'groupInput',
                data: {
                  textLang: 'Input Flow',
                  quantitativeReference: '0',
                },
                attrs: { text: {} },
              },
            ],
          },
        },
        {
          id: 'node-c',
          data: {
            id: 'proc-3',
            version: '3.0',
            quantitativeReference: '0',
          },
          ports: {
            items: [
              {
                id: 'port-default-width',
                group: 'groupOutput',
                data: {
                  textLang: 'Output Flow',
                  quantitativeReference: '0',
                },
                attrs: { text: {} },
              },
            ],
          },
        },
      ],
    });
    mockGetLifeCycleModelDetail.mockResolvedValueOnce({
      success: true,
      data: {
        json: {},
        json_tg: {
          xflow: {
            nodes: [{ data: { id: 'proc-2', version: '2.0' } }],
          },
        },
      },
    });
    mockGetProcessesByIdAndVersion.mockResolvedValueOnce({});
    mockGetLangText.mockReturnValueOnce(undefined);
    mockGetPortLabelWithAllocation.mockReturnValueOnce(undefined);
    mockGenProcessName.mockReturnValue(undefined);

    render(<ToolbarView id='model-1' version='1.0.0' lang='en' drawerVisible />);

    await waitFor(() => expect(mockInitData).toHaveBeenCalled());

    const initGraph = mockInitData.mock.calls[0][0];
    expect(initGraph.edges).toEqual([]);
    expect(initGraph.nodes[0].tools.some((tool: any) => tool && tool.id === 'ref')).toBe(false);
    expect(initGraph.nodes[0].ports.items[0].attrs.text.text).toBe('');
    expect(initGraph.nodes[0].ports.items[0].attrs.text.title).toBeUndefined();
    expect(initGraph.nodes[0].tools.find((tool: any) => tool?.id === 'nodeTitle')).toEqual(
      expect.objectContaining({ width: 280, title: '' }),
    );
    expect(initGraph.nodes[1].tools.find((tool: any) => tool?.id === 'nodeTitle')).toEqual(
      expect.objectContaining({ width: 350, title: '' }),
    );

    await waitFor(() =>
      expect(mockUpdateNode).toHaveBeenCalledWith(
        'node-width',
        expect.objectContaining({
          tools: expect.arrayContaining([
            expect.objectContaining({ id: 'nodeTitle', width: 280, title: '' }),
          ]),
        }),
      ),
    );
    expect(mockUpdateNode).toHaveBeenCalledWith(
      '',
      expect.objectContaining({
        tools: expect.arrayContaining([
          expect.objectContaining({ id: 'nodeTitle', width: 350, title: '' }),
        ]),
      }),
    );
  });

  it('falls back to empty model detail payloads and empty graph data', async () => {
    mockGenLifeCycleModelInfoFromData.mockReturnValueOnce({});
    mockGenLifeCycleModelData.mockReturnValueOnce(undefined);
    mockGetLifeCycleModelDetail.mockResolvedValueOnce({
      success: true,
      data: {},
    });

    render(<ToolbarView id='model-1' version='1.0.0' lang='en' drawerVisible />);

    await waitFor(() => expect(mockGenLifeCycleModelInfoFromData).toHaveBeenCalledWith({}));
    await waitFor(() => expect(mockGenLifeCycleModelData).toHaveBeenCalledWith({}, 'en'));
    await waitFor(() =>
      expect(mockInitData).toHaveBeenCalledWith({
        nodes: [],
        edges: [],
      }),
    );
    expect(mockGetProcessesByIdAndVersion).not.toHaveBeenCalled();
  });

  it('falls back to an empty selected version when the chosen process instance points to a submodel', async () => {
    mockGraphStoreState.nodes = [
      {
        id: 'node-1',
        selected: true,
        size: { width: 300 },
        data: {
          id: 'proc-1',
          label: 'Process One',
          quantitativeReference: '1',
        },
        ports: { items: [] },
      },
    ];
    mockGraphStoreState.edges = [];
    mockGetProcessesByIdAndVersion.mockResolvedValueOnce({
      data: [{ id: 'proc-1', version: undefined, modelId: 'submodel-1' }],
    });

    render(<ToolbarView id='model-1' version='1.0.0' lang='en' drawerVisible />);

    await waitFor(() => expect(screen.getByTestId('life-cycle-model-view')).toBeInTheDocument());
    expect(screen.getByTestId('life-cycle-model-view')).toHaveTextContent(
      'submodel-1::toolIcon:en',
    );
  });

  it('registers graph handlers that toggle node and edge selection', () => {
    render(<ToolbarView id='model-1' version='1.0.0' lang='en' drawerVisible={false} />);

    const nodeClick = mockUseGraphEvent.mock.calls.find(
      (call: any[]) => call[0] === 'node:click',
    )?.[1];
    const blankClick = mockUseGraphEvent.mock.calls.find(
      (call: any[]) => call[0] === 'blank:click',
    )?.[1];
    const edgeClick = mockUseGraphEvent.mock.calls.find(
      (call: any[]) => call[0] === 'edge:click',
    )?.[1];
    const edgeAdded = mockUseGraphEvent.mock.calls.find(
      (call: any[]) => call[0] === 'edge:added',
    )?.[1];

    nodeClick({
      node: {
        id: 'node-1',
        isNode: () => true,
      },
      e: { ctrlKey: true },
    });
    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { selected: false });

    mockUpdateNode.mockClear();
    mockUpdateEdge.mockClear();

    blankClick();
    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { selected: false });
    expect(mockUpdateEdge).toHaveBeenCalledWith('edge-1', { selected: false });

    mockUpdateEdge.mockClear();
    mockGraphStoreState.edges.push({ id: 'edge-2', selected: false });
    edgeClick({ edge: { id: 'edge-2' } });
    expect(mockUpdateEdge).toHaveBeenCalledWith('edge-1', { selected: false });
    expect(mockUpdateEdge).toHaveBeenCalledWith('edge-2', { selected: true });

    edgeAdded({ edge: { id: 'edge-new' } });
    expect(mockRemoveEdges).toHaveBeenCalledWith(['edge-new']);
  });

  it('enforces exclusive node selection on plain clicks and ignores repeated edge clicks', () => {
    render(<ToolbarView id='model-1' version='1.0.0' lang='en' drawerVisible={false} />);

    const nodeClick = mockUseGraphEvent.mock.calls.find(
      (call: any[]) => call[0] === 'node:click',
    )?.[1];
    const edgeClick = mockUseGraphEvent.mock.calls.find(
      (call: any[]) => call[0] === 'edge:click',
    )?.[1];

    nodeClick({
      node: {
        id: 'node-2',
        isNode: () => true,
      },
      e: {},
    });
    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { selected: false });
    expect(mockUpdateNode).toHaveBeenCalledWith('node-2', { selected: true });

    mockUpdateEdge.mockClear();
    edgeClick({ edge: { id: 'edge-1' } });
    expect(mockUpdateEdge).not.toHaveBeenCalled();
  });

  it('keeps the clicked node selected on repeated plain clicks', () => {
    render(<ToolbarView id='model-1' version='1.0.0' lang='en' drawerVisible={false} />);

    const nodeClick = mockUseGraphEvent.mock.calls.find(
      (call: any[]) => call[0] === 'node:click',
    )?.[1];

    mockUpdateNode.mockClear();
    mockGraphStoreState.nodes[0].selected = true;

    nodeClick({
      node: {
        id: 'node-1',
        isNode: () => true,
      },
      e: {},
    });

    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { selected: true });
    expect(mockUpdateNode).not.toHaveBeenCalledWith('node-1', { selected: false });
  });

  it('falls back to empty ids when deselecting nodes and edges without ids', () => {
    mockGraphStoreState.nodes = [
      {
        selected: true,
        data: {
          quantitativeReference: '0',
        },
        ports: { items: [] },
      },
      {
        id: 'node-2',
        selected: false,
        data: {
          quantitativeReference: '0',
        },
        ports: { items: [] },
      },
    ];
    mockGraphStoreState.edges = [{ selected: true }];

    render(<ToolbarView id='model-1' version='1.0.0' lang='en' drawerVisible={false} />);

    const nodeClick = mockUseGraphEvent.mock.calls.find(
      (call: any[]) => call[0] === 'node:click',
    )?.[1];
    const blankClick = mockUseGraphEvent.mock.calls.find(
      (call: any[]) => call[0] === 'blank:click',
    )?.[1];

    nodeClick({
      node: {
        id: 'node-2',
        isNode: () => true,
      },
      e: {},
    });
    expect(mockUpdateNode).toHaveBeenCalledWith('', { selected: false });
    expect(mockUpdateNode).toHaveBeenCalledWith('node-2', { selected: true });

    mockUpdateNode.mockClear();
    mockUpdateEdge.mockClear();

    blankClick();
    expect(mockUpdateNode).toHaveBeenCalledWith('', { selected: false });
    expect(mockUpdateEdge).toHaveBeenCalledWith('', { selected: false });
  });
});
