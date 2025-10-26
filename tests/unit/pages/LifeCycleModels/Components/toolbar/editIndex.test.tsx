// @ts-nocheck
import ToolbarEdit from '@/pages/LifeCycleModels/Components/toolbar/editIndex';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../../../helpers/testUtils';

const mockUpdateNode = jest.fn();
const mockAddNodes = jest.fn();
const mockRemoveNodes = jest.fn();
const mockRemoveEdges = jest.fn();
const mockUpdateEdge = jest.fn();
const mockInitData = jest.fn();

let mockGraphStoreState: any = { nodes: [], edges: [] };

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@antv/xflow', () => ({
  __esModule: true,
  useGraphStore: (selector: any) => selector(mockGraphStoreState),
  useGraphEvent: jest.fn(),
}));

const { useGraphEvent: mockUseGraphEvent } = jest.requireMock('@antv/xflow');

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CopyOutlined: () => <span>copy-icon</span>,
  DeleteOutlined: () => <span>delete-icon</span>,
  SaveOutlined: () => <span>save-icon</span>,
  SendOutlined: () => <span>send-icon</span>,
  CheckCircleOutlined: () => <span>check-icon</span>,
}));

jest.mock('@/style/custom.less', () => ({
  __esModule: true,
  default: { footer_right: 'footer-right' },
}));

jest.mock('antd', () => {
  const React = require('react');
  const { toText } = require('../../../../../helpers/nodeToText');
  const Button = ({ children, onClick, disabled = false, icon, htmlType = 'button' }: any) => (
    <button
      type={htmlType === 'submit' ? 'submit' : htmlType === 'reset' ? 'reset' : 'button'}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
    >
      {icon}
      {toText(children)}
    </button>
  );
  const Tooltip = ({ children }: any) => <>{children}</>;
  const Space = ({ children, direction }: any) => <div data-direction={direction}>{children}</div>;
  const Spin = ({ spinning, children }: any) =>
    spinning ? <div data-testid='spin'>{children}</div> : <div>{children}</div>;
  const message = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
  };
  const theme = {
    useToken: () => ({
      token: {
        colorPrimary: '#1890ff',
        colorBgContainer: '#fff',
        colorBorder: '#ddd',
        colorBgBase: '#fafafa',
        colorTextBase: '#000',
        colorTextDescription: '#666',
        colorError: '#ff4d4f',
      },
    }),
  };
  return {
    __esModule: true,
    Button,
    Tooltip,
    Space,
    Spin,
    message,
    theme,
  };
});

jest.mock('@/pages/LifeCycleModels/Components/toolbar/editTargetAmount', () => ({
  __esModule: true,
  default: ({ onData }: any) => (
    <button
      type='button'
      onClick={() => onData({ targetAmount: 20, originalAmount: 10, scalingFactor: '2' })}
    >
      trigger-target-amount
    </button>
  ),
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/add', () => ({
  __esModule: true,
  default: () => <div>model-toolbar-add</div>,
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/control', () => ({
  __esModule: true,
  Control: () => <div>control</div>,
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/eidtInfo', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        handleCheckData: jest.fn(),
        submitReview: jest.fn(),
      }));
      return <div>toolbar-edit-info</div>;
    }),
  };
});

jest.mock('@/pages/LifeCycleModels/Components/connectableProcesses', () => ({
  __esModule: true,
  default: () => <div>connectable-processes</div>,
}));

jest.mock('@/pages/LifeCycleModels/Components/edit', () => ({
  __esModule: true,
  default: () => <div>life-cycle-model-edit</div>,
}));

jest.mock('@/pages/LifeCycleModels/Components/modelResult', () => ({
  __esModule: true,
  default: () => <div>model-result</div>,
}));

jest.mock('@/pages/LifeCycleModels/Components/view', () => ({
  __esModule: true,
  default: () => <div>life-cycle-model-view</div>,
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/Exchange/index', () => ({
  __esModule: true,
  default: () => <div>edge-exchange</div>,
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/Exchange/ioPortSelect', () => ({
  __esModule: true,
  default: () => <div>io-port-select</div>,
}));

jest.mock('@/pages/Processes/Components/edit', () => ({
  __esModule: true,
  default: () => <div>process-edit</div>,
}));

jest.mock('@/pages/Processes/Components/view', () => ({
  __esModule: true,
  default: () => <div>process-view</div>,
}));

const mockCreateLifeCycleModel = jest.fn().mockResolvedValue({});
const mockGetLifeCycleModelDetail = jest.fn().mockResolvedValue({ data: {} });
const mockUpdateLifeCycleModel = jest.fn().mockResolvedValue({});

jest.mock('@/services/lifeCycleModels/api', () => ({
  __esModule: true,
  createLifeCycleModel: (...args: any[]) => mockCreateLifeCycleModel(...args),
  getLifeCycleModelDetail: (...args: any[]) => mockGetLifeCycleModelDetail(...args),
  updateLifeCycleModel: (...args: any[]) => mockUpdateLifeCycleModel(...args),
}));

const mockGenLifeCycleModelData = jest.fn().mockReturnValue({ json: {} });
const mockGenLifeCycleModelInfoFromData = jest.fn().mockReturnValue({});
const mockGenNodeLabel = jest.fn().mockReturnValue('Node Label');
const mockGenPortLabel = jest.fn().mockReturnValue('Port Label');

jest.mock('@/services/lifeCycleModels/util', () => ({
  __esModule: true,
  genLifeCycleModelData: (...args: any[]) => mockGenLifeCycleModelData(...args),
  genLifeCycleModelInfoFromData: (...args: any[]) => mockGenLifeCycleModelInfoFromData(...args),
  genNodeLabel: (...args: any[]) => mockGenNodeLabel(...args),
  genPortLabel: (...args: any[]) => mockGenPortLabel(...args),
}));

const mockGetProcessDetail = jest.fn();
const mockGetProcessDetailByIdAndVersion = jest.fn().mockResolvedValue({ data: {} });

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessDetail: (...args: any[]) => mockGetProcessDetail(...args),
  getProcessDetailByIdAndVersion: (...args: any[]) => mockGetProcessDetailByIdAndVersion(...args),
}));

const mockGenProcessFromData = jest.fn().mockReturnValue({ exchanges: { exchange: [] } });
const mockGenProcessName = jest.fn().mockReturnValue('Updated Process');
const mockGenProcessNameJson = jest.fn().mockReturnValue('updated-process');

jest.mock('@/services/processes/util', () => ({
  __esModule: true,
  genProcessFromData: (...args: any[]) => mockGenProcessFromData(...args),
  genProcessName: (...args: any[]) => mockGenProcessName(...args),
  genProcessNameJson: (...args: any[]) => mockGenProcessNameJson(...args),
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  getRefData: jest.fn().mockResolvedValue({ data: {} }),
}));

jest.mock('@/services/general/data', () => ({
  __esModule: true,
  initVersion: '1.0',
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  formatDateTime: () => '2024-01-01 00:00',
  getLangText: () => 'Flow Name',
}));

jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  getUserTeamId: jest.fn().mockResolvedValue('team-1'),
}));

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  checkReferences: jest.fn(),
  getAllRefObj: jest.fn().mockReturnValue([]),
  getRefTableName: jest.fn().mockReturnValue('process'),
  ReffPath: class {
    findProblemNodes() {
      return [];
    }
  },
}));

jest.mock('uuid', () => ({
  __esModule: true,
  v4: () => 'uuid-123',
}));

beforeEach(() => {
  mockUpdateNode.mockReset();
  mockAddNodes.mockReset();
  mockRemoveNodes.mockReset();
  mockRemoveEdges.mockReset();
  mockUpdateEdge.mockReset();
  mockInitData.mockReset();
  mockUseGraphEvent.mockClear();
  mockGetProcessDetail.mockReset();
  mockGenProcessFromData.mockReset().mockReturnValue({ exchanges: { exchange: [] } });
  mockGraphStoreState = {
    initData: mockInitData,
    addNodes: mockAddNodes,
    updateNode: mockUpdateNode,
    removeNodes: mockRemoveNodes,
    removeEdges: mockRemoveEdges,
    updateEdge: mockUpdateEdge,
    nodes: [
      {
        id: 'node-1',
        size: { width: 350 },
        data: {
          id: 'proc-1',
          version: '1.0',
          label: 'Node 1',
          quantitativeReference: '1',
        },
        tools: [],
        ports: {
          items: [],
        },
      },
      {
        id: 'node-2',
        size: { width: 350 },
        data: {
          id: 'proc-2',
          version: '1.0',
          label: 'Node 2',
          quantitativeReference: '0',
        },
        tools: [],
        ports: {
          items: [],
        },
      },
    ],
    edges: [],
  };
});

describe('ToolbarEdit', () => {
  const baseProps = {
    id: 'model-1',
    version: '1.0',
    lang: 'en',
    drawerVisible: false,
    isSave: false,
    action: 'edit',
    setIsSave: jest.fn(),
    onClose: jest.fn(),
  };

  it('updates reference node target amounts via TargetAmount callback', async () => {
    render(<ToolbarEdit {...baseProps} />);

    await userEvent.click(screen.getByRole('button', { name: 'trigger-target-amount' }));

    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', {
      data: expect.objectContaining({
        targetAmount: 20,
        originalAmount: 10,
        scalingFactor: '2',
      }),
    });
  });

  it('refreshes node data when update reference is triggered', async () => {
    mockGetProcessDetail.mockResolvedValue({
      data: {
        version: '2.0',
        json: {
          processDataSet: {},
          json: {},
        },
      },
    });
    mockGenProcessFromData.mockReturnValue({
      exchanges: {
        exchange: [
          {
            exchangeDirection: 'input',
            referenceToFlowDataSet: {
              '@refObjectId': 'flow-1',
              '@version': '1.0',
              'common:shortDescription': [],
            },
            allocations: null,
          },
        ],
      },
    });

    render(<ToolbarEdit {...baseProps} />);

    await userEvent.click(screen.getByRole('button', { name: 'copy-icon' }));

    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalledTimes(2));
    expect(mockGetProcessDetail).toHaveBeenCalledWith('proc-1', '1.0');
    expect(mockGetProcessDetail).toHaveBeenCalledWith('proc-2', '1.0');
    expect(mockUpdateNode).toHaveBeenCalled();
  });

  it('toggles node selection when modifier key is pressed', () => {
    render(<ToolbarEdit {...baseProps} />);

    const nodeClickCall = mockUseGraphEvent.mock.calls.find(
      (call: any[]) => call[0] === 'node:click',
    );
    const nodeClickHandler = nodeClickCall?.[1];
    expect(typeof nodeClickHandler).toBe('function');

    const fakeNode = {
      id: 'node-1',
      isNode: () => true,
      getPorts: jest.fn(() => []),
    };

    mockUpdateNode.mockClear();
    mockGraphStoreState.nodes[0].selected = false;
    nodeClickHandler({
      node: fakeNode,
      e: { ctrlKey: true, target: null },
    });
    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { selected: true });

    mockUpdateNode.mockClear();
    mockGraphStoreState.nodes[0].selected = true;
    nodeClickHandler({
      node: fakeNode,
      e: { metaKey: true, target: null },
    });
    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { selected: false });
  });

  it('selects only the clicked node when no modifier is pressed', () => {
    render(<ToolbarEdit {...baseProps} />);

    const nodeClickCall = mockUseGraphEvent.mock.calls.find(
      (call: any[]) => call[0] === 'node:click',
    );
    const nodeClickHandler = nodeClickCall?.[1];
    expect(typeof nodeClickHandler).toBe('function');

    mockUpdateNode.mockClear();
    mockGraphStoreState.nodes[0].selected = false;
    mockGraphStoreState.nodes[1].selected = true;

    const fakeNode = {
      id: 'node-1',
      isNode: () => true,
      getPorts: jest.fn(() => []),
    };

    nodeClickHandler({
      node: fakeNode,
      e: { target: null },
    });

    expect(mockUpdateNode).toHaveBeenCalledWith('node-2', { selected: false });
    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { selected: true });
  });

  it('clears all selections when blank area is clicked', () => {
    render(<ToolbarEdit {...baseProps} />);

    const blankClickCall = mockUseGraphEvent.mock.calls.find(
      (call: any[]) => call[0] === 'blank:click',
    );
    const blankClickHandler = blankClickCall?.[1];
    expect(typeof blankClickHandler).toBe('function');

    mockUpdateNode.mockClear();
    mockGraphStoreState.nodes[0].selected = true;
    mockGraphStoreState.nodes[1].selected = true;

    blankClickHandler();

    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { selected: false });
    expect(mockUpdateNode).toHaveBeenCalledWith('node-2', { selected: false });
  });
});
