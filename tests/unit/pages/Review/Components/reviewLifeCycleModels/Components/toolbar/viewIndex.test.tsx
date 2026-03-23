// @ts-nocheck
import ToolbarView from '@/pages/Review/Components/reviewLifeCycleModels/Components/toolbar/viewIndex';
import { act } from '@testing-library/react';
import { render, screen, waitFor } from '../../../../../../../helpers/testUtils';

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
    theme,
  };
});

jest.mock('@/pages/Review/Components/reviewLifeCycleModels/Components/toolbar/viewInfo', () => ({
  __esModule: true,
  default: ({ data, type, reviewId, tabType, lang }: any) => (
    <div data-testid='toolbar-view-info'>
      {`${type}:${reviewId}:${tabType}:${lang}:${
        data?.modellingAndValidation?.validation?.review?.length ?? 0
      }:${data?.modellingAndValidation?.complianceDeclarations?.compliance?.length ?? 0}:${
        data?.administrativeInformation?.dataEntryBy?.['common:timeStamp'] ?? 'none'
      }`}
    </div>
  ),
}));

jest.mock('@/pages/Processes/Components/view', () => ({
  __esModule: true,
  default: ({ id, version, buttonType, disabled, lang }: any) => (
    <div data-testid='process-view'>{`${id}:${version}:${buttonType}:${disabled}:${lang}`}</div>
  ),
}));

jest.mock(
  '@/pages/Review/Components/reviewLifeCycleModels/Components/toolbar/Exchange/index',
  () => ({
    __esModule: true,
    default: ({ disabled, edge, lang }: any) => (
      <div data-testid='edge-exchange'>{`${disabled}:${edge?.id ?? 'none'}:${lang}`}</div>
    ),
  }),
);

jest.mock(
  '@/pages/Review/Components/reviewLifeCycleModels/Components/toolbar/viewTargetAmount',
  () => ({
    __esModule: true,
    default: ({ refNode, drawerVisible, lang, onData }: any) => (
      <div data-testid='target-amount'>
        {`${refNode?.id ?? refNode?.data?.id ?? 'none'}:${drawerVisible}:${lang}`}
        <button type='button' data-testid='target-amount-on-data' onClick={() => onData?.()}>
          target-amount-on-data
        </button>
      </div>
    ),
  }),
);

jest.mock('@/pages/Review/Components/reviewLifeCycleModels/Components/toolbar/control', () => ({
  __esModule: true,
  Control: ({ items }: any) => (
    <div data-testid='control'>{Array.isArray(items) ? items.join('|') : ''}</div>
  ),
}));

jest.mock(
  '@/pages/Review/Components/reviewLifeCycleModels/Components/toolbar/Exchange/ioPortView',
  () => ({
    __esModule: true,
    default: ({ direction, drawerVisible, node, lang }: any) => (
      <div data-testid='io-port-view'>
        {`${direction}:${drawerVisible}:${node?.id ?? node?.data?.id ?? 'none'}:${lang}`}
      </div>
    ),
  }),
);

const mockGetCommentApi = jest.fn();
jest.mock('@/services/comments/api', () => ({
  __esModule: true,
  getCommentApi: (...args: any[]) => mockGetCommentApi(...args),
}));

const mockGetLifeCycleModelDetail = jest.fn();
jest.mock('@/services/lifeCycleModels/api', () => ({
  __esModule: true,
  getLifeCycleModelDetail: (...args: any[]) => mockGetLifeCycleModelDetail(...args),
}));

const mockGenLifeCycleModelInfoFromData = jest.fn((dataset: any) => dataset);
const mockGenLifeCycleModelData = jest.fn();
jest.mock('@/services/lifeCycleModels/util', () => ({
  __esModule: true,
  genLifeCycleModelInfoFromData: (...args: any[]) => mockGenLifeCycleModelInfoFromData(...args),
  genLifeCycleModelData: (...args: any[]) => mockGenLifeCycleModelData(...args),
  genNodeLabel: jest.fn((label: string) => label),
}));

const mockGenProcessName = jest.fn((label: any) => label ?? 'process-name');

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
}));

describe('ReviewLifeCycleModelToolbarView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenProcessName.mockImplementation((label: any) => label ?? 'process-name');
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

    mockGetLifeCycleModelDetail.mockResolvedValue({
      data: {
        json: {
          lifeCycleModelDataSet: {
            modellingAndValidation: {
              validation: {
                review: [{ id: 'base-review' }],
              },
              complianceDeclarations: {
                compliance: [{ id: 'base-compliance' }],
              },
            },
          },
        },
        json_tg: {},
      },
    });
    mockGetCommentApi.mockResolvedValue({
      data: [
        {
          json: {
            modellingAndValidation: {
              validation: {
                review: [{ id: 'review-comment' }],
              },
              complianceDeclarations: {
                compliance: [{ id: 'compliance-comment' }],
              },
            },
          },
        },
      ],
      error: null,
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
          ports: { items: [] },
        },
      ],
      edges: [
        {
          id: 'graph-edge-1',
          data: {
            connection: {
              unbalancedAmount: 1,
              exchangeAmount: 2,
            },
          },
          target: { x: 1, y: 2, cell: 'node-a' },
        },
      ],
    });
  });

  it('merges review comments for reviewer tabs and renders view tools', async () => {
    render(
      <ToolbarView
        type='edit'
        id='model-1'
        version='1.0.0'
        lang='en'
        reviewId='review-1'
        tabType='review'
        drawerVisible
      />,
    );

    await waitFor(() =>
      expect(mockGetLifeCycleModelDetail).toHaveBeenCalledWith('model-1', '1.0.0'),
    );
    await waitFor(() => expect(mockGetCommentApi).toHaveBeenCalledWith('review-1', 'review'));
    await waitFor(() => expect(mockInitData).toHaveBeenCalled());

    expect(screen.getByTestId('toolbar-view-info')).toHaveTextContent(
      'edit:review-1:review:en:1:1',
    );
    expect(screen.getAllByTestId('process-view')[0]).toHaveTextContent(
      'proc-1:1.0:toolIcon:false:en',
    );
    expect(screen.getAllByTestId('process-view')[1]).toHaveTextContent(
      'model-1:1.0.0:toolResultIcon:false:en',
    );
    expect(screen.getByTestId('edge-exchange')).toHaveTextContent('false:edge-1:en');
    expect(screen.getByTestId('target-amount')).toHaveTextContent('node-1:false:en');
    expect(screen.getByTestId('control')).toHaveTextContent('zoomOut|zoomTo|zoomIn');
  });

  it('keeps base review data and appends comments for assigned tabs', async () => {
    render(
      <ToolbarView
        type='view'
        id='model-1'
        version='1.0.0'
        lang='en'
        reviewId='review-1'
        tabType='assigned'
        drawerVisible
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId('toolbar-view-info')).toHaveTextContent(
        'view:review-1:assigned:en:2:2',
      ),
    );
  });

  it('registers graph handlers that clear and update selection', () => {
    render(
      <ToolbarView
        type='view'
        id='model-1'
        version='1.0.0'
        lang='en'
        reviewId='review-1'
        tabType='assigned'
        drawerVisible={false}
      />,
    );

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
      e: { metaKey: true },
    });
    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { selected: false });

    mockUpdateNode.mockClear();
    mockUpdateEdge.mockClear();
    nodeClick({
      node: {
        id: 'node-2',
        isNode: () => true,
      },
      e: {},
    });
    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { selected: false });
    expect(mockUpdateNode).toHaveBeenCalledWith('node-2', { selected: true });

    mockUpdateNode.mockClear();
    mockUpdateEdge.mockClear();
    blankClick();
    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { selected: false });
    expect(mockUpdateEdge).toHaveBeenCalledWith('edge-1', { selected: false });

    mockUpdateEdge.mockClear();
    mockGraphStoreState.edges.push({ id: 'edge-2', selected: false });
    edgeClick({ edge: { id: 'edge-1' } });
    expect(mockUpdateEdge).not.toHaveBeenCalled();

    edgeClick({ edge: { id: 'edge-2' } });
    expect(mockUpdateEdge).toHaveBeenCalledWith('edge-1', { selected: false });
    expect(mockUpdateEdge).toHaveBeenCalledWith('edge-2', { selected: true });

    edgeAdded({ edge: { id: 'edge-new' } });
    expect(mockRemoveEdges).toHaveBeenCalledWith(['edge-new']);
  });

  it('keeps the clicked node selected on repeated plain clicks', () => {
    render(
      <ToolbarView
        type='view'
        id='model-1'
        version='1.0.0'
        lang='en'
        reviewId='review-1'
        tabType='assigned'
        drawerVisible={false}
      />,
    );

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

  it('opens input/output selectors and target amount through generated node tools', async () => {
    render(
      <ToolbarView
        type='edit'
        id='model-1'
        version='1.0.0'
        lang='en'
        reviewId='review-1'
        tabType='review'
        drawerVisible
      />,
    );

    await waitFor(() => expect(mockInitData).toHaveBeenCalled());

    const initModel = mockInitData.mock.calls.at(-1)?.[0];
    const [refTool, , inputTool, outputTool] = initModel.nodes[0].tools;

    await act(async () => {
      await inputTool.args.onClick({
        cell: { store: { data: { id: 'input-node' } } },
      });
    });
    expect(mockUpdateEdge).toHaveBeenCalledWith('edge-1', { selected: false });
    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { selected: false });
    expect(mockUpdateNode).toHaveBeenCalledWith('input-node', { selected: true });
    await waitFor(() =>
      expect(screen.getByTestId('io-port-view')).toHaveTextContent('Input:true:input-node:en'),
    );

    mockUpdateNode.mockClear();
    mockUpdateEdge.mockClear();
    await act(async () => {
      await outputTool.args.onClick({
        cell: { store: { data: { id: 'output-node' } } },
      });
    });
    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { selected: false });
    expect(mockUpdateNode).toHaveBeenCalledWith('output-node', { selected: true });
    await waitFor(() =>
      expect(screen.getByTestId('io-port-view')).toHaveTextContent('Output:true:output-node:en'),
    );

    mockUpdateNode.mockClear();
    mockUpdateEdge.mockClear();
    await act(async () => {
      refTool.args.onClick({
        cell: { store: { data: { id: 'ref-node' } } },
      });
    });
    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { selected: false });
    expect(mockUpdateNode).toHaveBeenCalledWith('ref-node', { selected: true });
    expect(screen.getByTestId('target-amount')).toHaveTextContent('node-1:true:en');
    screen.getByTestId('target-amount-on-data').click();
  });

  it('builds sparse reviewer-rejected graph data with placeholder review items and edge fallbacks', async () => {
    mockGetCommentApi.mockResolvedValue({
      data: [{ json: {} }],
      error: null,
    });
    mockGenProcessName.mockImplementation((label: any) => label);
    mockGenLifeCycleModelData.mockReturnValue({
      nodes: [
        {
          id: 'node-fallback-1',
          data: {
            id: 'proc-3',
            version: '2.0',
            quantitativeReference: '0',
          },
          ports: {
            items: [
              {
                data: {
                  quantitativeReference: '1',
                },
              },
              {
                data: {
                  allocations: {
                    allocation: { '@allocatedFraction': '25%' },
                  },
                },
              },
              {
                attrs: { text: {} },
                data: {
                  allocations: {
                    allocation: { '@allocatedFraction': '0%' },
                  },
                },
              },
            ],
          },
        },
        {
          id: 'node-fallback-2',
          data: {
            id: 'proc-4',
            version: '3.0',
            quantitativeReference: '1',
          },
          ports: { items: [] },
        },
      ],
      edges: [{ id: 'edge-no-target' }],
    });

    render(
      <ToolbarView
        type='view'
        id='model-1'
        version='1.0.0'
        lang='en'
        reviewId='review-1'
        tabType='reviewer-rejected'
        drawerVisible
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId('toolbar-view-info')).toHaveTextContent(
        'view:review-1:reviewer-rejected:en:1:1',
      ),
    );

    const initModel = mockInitData.mock.calls.at(-1)?.[0];
    expect(initModel.nodes[0].tools[0]).toBe('');
    expect(initModel.nodes[0].tools[1].args.markup[0].attrs.width).toBe(350);
    expect(initModel.nodes[0].tools[1].args.markup[1].textContent).toBe('');
    expect(initModel.nodes[1].tools[0].id).toBe('ref');
    expect(initModel.nodes[0].ports.items[0].attrs.text.fill).toBe('#1677ff');
    expect(initModel.nodes[0].ports.items[0].attrs.text['font-weight']).toBe('bold');
    expect(initModel.nodes[0].ports.items[1].attrs.text.fill).toBe('#1677ff');
    expect(initModel.nodes[0].ports.items[1].attrs.text['font-weight']).toBe('normal');
    expect(initModel.nodes[0].ports.items[2].attrs.text.fill).toBe('#8c8c8c');
    expect(initModel.edges).toEqual([{ id: 'edge-no-target' }]);
  });

  it('merges single-object review data for admin-rejected tabs and falls back when nothing is selected', async () => {
    mockGraphStoreState.nodes = [
      {
        selected: false,
        size: {},
        data: {
          quantitativeReference: '0',
        },
        ports: { items: [] },
      },
    ];
    mockGraphStoreState.edges = [];
    mockGetLifeCycleModelDetail.mockResolvedValue({
      data: {
        json: {
          lifeCycleModelDataSet: {
            modellingAndValidation: {
              validation: {
                review: { id: 'base-review-single' },
              },
              complianceDeclarations: {
                compliance: { id: 'base-compliance-single' },
              },
            },
          },
        },
        json_tg: {},
      },
    });

    render(
      <ToolbarView
        type='view'
        id='model-1'
        version='1.0.0'
        lang='en'
        reviewId='review-1'
        tabType='admin-rejected'
        drawerVisible
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId('toolbar-view-info')).toHaveTextContent(
        'view:review-1:admin-rejected:en:2:2',
      ),
    );

    expect(screen.getAllByTestId('process-view')[0]).toHaveTextContent('::toolIcon:true:en');
    expect(screen.getByTestId('edge-exchange')).toHaveTextContent('true:none:en');
    expect(screen.getByTestId('target-amount')).toHaveTextContent('none:false:en');
    await waitFor(() =>
      expect(mockUpdateNode).toHaveBeenCalledWith(
        '',
        expect.objectContaining({ tools: expect.any(Array) }),
      ),
    );
  });

  it('merges comment-only review data when the base review payload is missing', async () => {
    mockGetLifeCycleModelDetail.mockResolvedValue({
      data: {
        json: {
          lifeCycleModelDataSet: {
            modellingAndValidation: {},
          },
        },
        json_tg: {},
      },
    });

    render(
      <ToolbarView
        type='view'
        id='model-1'
        version='1.0.0'
        lang='en'
        reviewId='review-1'
        tabType='assigned'
        drawerVisible
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId('toolbar-view-info')).toHaveTextContent(
        'view:review-1:assigned:en:1:1',
      ),
    );
  });

  it('falls back to empty model graph payloads when the detail response has no model data', async () => {
    mockGetLifeCycleModelDetail.mockResolvedValue({
      data: {
        json: {},
        json_tg: undefined,
      },
    });
    mockGetCommentApi.mockResolvedValue({
      data: [],
      error: null,
    });
    mockGenLifeCycleModelData.mockReturnValue(undefined);

    render(
      <ToolbarView
        type='view'
        id='model-1'
        version='1.0.0'
        lang='en'
        reviewId='review-1'
        tabType='assigned'
        drawerVisible
      />,
    );

    await waitFor(() => expect(mockInitData).toHaveBeenCalledWith({ nodes: [], edges: [] }));
    expect(screen.getByTestId('toolbar-view-info')).toHaveTextContent(
      'view:review-1:assigned:en:0:0',
    );
  });

  it('builds fallback info data when id and version are missing', async () => {
    render(
      <ToolbarView
        type='view'
        id={undefined as any}
        version={undefined as any}
        lang='en'
        reviewId='review-1'
        tabType='assigned'
        drawerVisible
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId('toolbar-view-info')).toHaveTextContent(
        'view:review-1:assigned:en:0:0:2026-03-12 12:00',
      ),
    );
    expect(mockGetLifeCycleModelDetail).not.toHaveBeenCalled();
    expect(mockGetCommentApi).not.toHaveBeenCalled();
  });

  it('falls back to empty ids when clearing unnamed selected nodes and edges', () => {
    mockGraphStoreState.nodes = [
      {
        selected: true,
        size: { width: 300 },
        data: { quantitativeReference: '0' },
        ports: { items: [] },
      },
      {
        id: 'node-2',
        selected: false,
        size: { width: 300 },
        data: { quantitativeReference: '0' },
        ports: { items: [] },
      },
    ];
    mockGraphStoreState.edges = [{ selected: true }];

    render(
      <ToolbarView
        type='view'
        id='model-1'
        version='1.0.0'
        lang='en'
        reviewId='review-1'
        tabType='assigned'
        drawerVisible={false}
      />,
    );

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

    mockUpdateNode.mockClear();
    mockUpdateEdge.mockClear();
    blankClick();
    expect(mockUpdateNode).toHaveBeenCalledWith('', { selected: false });
    expect(mockUpdateEdge).toHaveBeenCalledWith('', { selected: false });
  });

  it('falls back to empty tool labels when genProcessName returns undefined', async () => {
    mockGenProcessName.mockImplementation(() => undefined);

    render(
      <ToolbarView
        type='view'
        id='model-1'
        version='1.0.0'
        lang='en'
        reviewId='review-1'
        tabType='assigned'
        drawerVisible
      />,
    );

    await waitFor(() =>
      expect(mockUpdateNode).toHaveBeenCalledWith(
        'node-1',
        expect.objectContaining({ tools: expect.any(Array) }),
      ),
    );

    const toolUpdate = mockUpdateNode.mock.calls.find(([nodeId]: any[]) => nodeId === 'node-1');
    expect(toolUpdate?.[1]?.tools?.[1]?.args?.markup?.[1]?.textContent).toBe('');
  });
});
