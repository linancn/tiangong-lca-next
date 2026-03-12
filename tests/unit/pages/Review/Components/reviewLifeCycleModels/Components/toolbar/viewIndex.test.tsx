// @ts-nocheck
import ToolbarView from '@/pages/Review/Components/reviewLifeCycleModels/Components/toolbar/viewIndex';
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
      }:${data?.modellingAndValidation?.complianceDeclarations?.compliance?.length ?? 0}`}
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
    default: ({ refNode, drawerVisible, lang }: any) => (
      <div data-testid='target-amount'>
        {`${refNode?.id ?? refNode?.data?.id ?? 'none'}:${drawerVisible}:${lang}`}
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

jest.mock('@/services/processes/util', () => ({
  __esModule: true,
  genProcessName: jest.fn((label: any) => label ?? 'process-name'),
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
});
