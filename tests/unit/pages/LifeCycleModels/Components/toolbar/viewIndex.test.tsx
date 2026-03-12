// @ts-nocheck
import ToolbarView from '@/pages/LifeCycleModels/Components/toolbar/viewIndex';
import { render, screen, waitFor } from '../../../../../helpers/testUtils';

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
  default: ({ refNode, drawerVisible, lang }: any) => (
    <div data-testid='target-amount'>{`${refNode?.id ?? refNode?.data?.id ?? 'none'}:${drawerVisible}:${lang}`}</div>
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
  genProcessName: jest.fn((label: any) => label ?? 'process-name'),
}));

jest.mock('@/services/general/data', () => ({
  __esModule: true,
  initVersion: '1.0.0',
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  formatDateTime: () => '2026-03-12 12:00',
  getLangText: () => 'Flow label',
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/utils/edge', () => ({
  __esModule: true,
  getEdgeLabel: jest.fn(() => ({ attrs: { text: { text: 'edge-label' } } })),
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/utils/node', () => ({
  __esModule: true,
  getPortLabelWithAllocation: jest.fn((label: string) => label),
  getPortTextColor: jest.fn(() => '#1677ff'),
  getPortTextStyle: jest.fn(() => 'bold'),
  nodeTitleTool: jest.fn((width: number, title: string) => ({ id: 'nodeTitle', width, title })),
}));

describe('ToolbarView', () => {
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
          ports: { items: [] },
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
});
