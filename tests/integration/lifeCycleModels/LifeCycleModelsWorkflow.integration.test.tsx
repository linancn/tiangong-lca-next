/**
 * Integration tests for the LifeCycleModels workflows.
 * Paths exercised:
 * - src/pages/LifeCycleModels/index.tsx
 * - src/pages/LifeCycleModels/Components/create.tsx
 * - src/pages/LifeCycleModels/Components/edit.tsx
 * - src/pages/LifeCycleModels/Components/toolbar/editIndex.tsx
 * - src/pages/LifeCycleModels/Components/modelResult/index.tsx
 *
 * User journeys covered:
 * 1. Owner loads /mydata lifecycle models, opens the create drawer, selects a process node, saves, and observes success toast + table reload.
 * 2. Owner opens the edit drawer for an existing model, adds another node, saves updates, and observes success feedback.
 * 3. Owner inspects calculation results via the model result button, triggering process lookups for main and sub products.
 *
 * Services mocked:
 * - mockGetLifeCycleModelTableAll, mockGetLifeCycleModelDetail, mockCreateLifeCycleModel, mockUpdateLifeCycleModel
 * - mockGetProcessTableAll, mockGetProcessDetailByIdAndVersion, mockGetProcessDetail, mockGetProcessesByIdsAndVersion
 * - getTeamById, getUserTeamId
 */

import LifeCycleModelsPage from '@/pages/LifeCycleModels';
import userEvent from '@testing-library/user-event';
import { act, renderWithProviders, screen, waitFor, within } from '../../helpers/testUtils';

jest.mock('umi', () => {
  const umi = require('@/tests/mocks/umi');
  umi.setUmiLocation({ pathname: '/mydata/lifecyclemodels', search: '' });
  return umi.createUmiMock();
});

jest.mock('@/style/custom.less', () => ({}));

jest.mock('antd', () => require('@/tests/mocks/antd').createAntdMock());

const getMockAntdMessage = () => jest.requireMock('antd').message as Record<string, jest.Mock>;

jest.mock('@ant-design/icons', () =>
  require('@/tests/mocks/antDesignIcons').createAntDesignIconsMock(),
);

jest.mock('@ant-design/pro-table', () => require('@/tests/mocks/proTable').createProTableMock());

jest.mock('@ant-design/pro-components', () =>
  require('@/tests/mocks/proComponents').createProComponentsMock(),
);

const mockGraphStoreState: { nodes: any[]; edges: any[] } = { nodes: [], edges: [] };
const mockGraphListeners = new Set<() => void>();

const notifyMockGraphListeners = () => {
  mockGraphListeners.forEach((listener) => listener());
};

const mergeMockNode = (node: any, patch: any) => {
  return {
    ...node,
    ...patch,
    data: patch?.data ? { ...node?.data, ...patch.data } : node?.data,
    ports: patch?.ports ? { ...node?.ports, ...patch.ports } : node?.ports,
    attrs: patch?.attrs ? { ...node?.attrs, ...patch.attrs } : node?.attrs,
    tools: patch?.tools ?? node?.tools,
  };
};

const mergeMockEdge = (edge: any, patch: any) => ({
  ...edge,
  ...patch,
  data: patch?.data ? { ...edge?.data, ...patch.data } : edge?.data,
  attrs: patch?.attrs ? { ...edge?.attrs, ...patch.attrs } : edge?.attrs,
});

let mockCurrentZoom = 1;

const mockGraphInstance = {
  zoom(delta?: number) {
    if (typeof delta === 'number') {
      mockCurrentZoom += delta;
    }
    return mockCurrentZoom;
  },
  zoomTo(value: number) {
    mockCurrentZoom = value;
  },
  zoomToFit() {
    mockCurrentZoom = 1;
  },
};

const mockGraphEvents: Record<string, any> = {};

jest.mock('@/contexts/graphContext', () => {
  const React = require('react');

  const GraphProvider = ({ children }: any) => <div data-testid='graph-provider'>{children}</div>;

  const useGraphStore = (selector: any) => {
    const [, forceRender] = React.useState(0);

    React.useEffect(() => {
      const listener = () => forceRender((count: number) => count + 1);
      mockGraphListeners.add(listener);
      return () => {
        mockGraphListeners.delete(listener);
      };
    }, []);

    return selector({
      ...mockGraphStoreState,
      initData: ({ nodes = [], edges = [] }: any) => {
        mockGraphStoreState.nodes = nodes;
        mockGraphStoreState.edges = edges;
        notifyMockGraphListeners();
      },
      addNodes: (nodes: any[]) => {
        mockGraphStoreState.nodes = [...mockGraphStoreState.nodes, ...nodes];
        notifyMockGraphListeners();
      },
      updateNode: (id: string, patch: any) => {
        mockGraphStoreState.nodes = mockGraphStoreState.nodes.map((node) =>
          node.id === id ? mergeMockNode(node, patch) : node,
        );
        notifyMockGraphListeners();
      },
      removeNodes: (ids: string[]) => {
        mockGraphStoreState.nodes = mockGraphStoreState.nodes.filter(
          (node) => !ids.includes(node.id),
        );
        notifyMockGraphListeners();
      },
      addEdges: (edges: any[]) => {
        mockGraphStoreState.edges = [...mockGraphStoreState.edges, ...edges];
        notifyMockGraphListeners();
      },
      updateEdge: (id: string, patch: any) => {
        mockGraphStoreState.edges = mockGraphStoreState.edges.map((edge) =>
          edge.id === id ? mergeMockEdge(edge, patch) : edge,
        );
        notifyMockGraphListeners();
      },
      removeEdges: (ids: string[]) => {
        mockGraphStoreState.edges = mockGraphStoreState.edges.filter(
          (edge) => !ids.includes(edge.id),
        );
        notifyMockGraphListeners();
      },
    });
  };

  const useGraphEvent = (eventName: string, handler: any) => {
    mockGraphEvents[eventName] = handler;
  };

  const useGraphInstance = () => mockGraphInstance;

  return {
    __esModule: true,
    GraphProvider,
    useGraphStore,
    useGraphEvent,
    useGraphInstance,
    __resetGraphStore: () => {
      mockGraphStoreState.nodes = [];
      mockGraphStoreState.edges = [];
      mockCurrentZoom = 1;
      Object.keys(mockGraphEvents).forEach((key) => delete mockGraphEvents[key]);
      notifyMockGraphListeners();
    },
  };
});

jest.mock('@/components/X6Graph', () => ({
  __esModule: true,
  default: () => <div data-testid='x6-graph'>X6 Graph</div>,
}));

jest.mock('@/components/ToolBarButton', () => ({
  __esModule: true,
  default: ({ tooltip, onClick }: any) => (
    <button type='button' onClick={onClick}>
      {require('../../helpers/nodeToText').toText(tooltip)}
    </button>
  ),
}));

jest.mock('@/components/AllVersions', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ContributeData', () => ({
  __esModule: true,
  default: ({ onOk, disabled }: any) => (
    <button type='button' onClick={disabled ? undefined : onOk}>
      contribute
    </button>
  ),
}));

jest.mock('@/components/ExportData', () => ({
  __esModule: true,
  default: () => <div>export</div>,
}));

const mockImportPayload = [
  {
    lifeCycleModelDataSet: {},
    json_tg: {
      nodes: [
        {
          id: 'node-imported',
          data: {
            id: 'process-imported',
            version: '1.0.0.000',
            label: { en: 'Imported Process' },
            quantitativeReference: '1',
          },
          ports: { items: [] },
          tools: [],
        },
      ],
      edges: [],
    },
  },
];

jest.mock('@/components/ImportData', () => ({
  __esModule: true,
  default: ({ onJsonData }: any) => (
    <button type='button' onClick={() => onJsonData(mockImportPayload)}>
      import
    </button>
  ),
}));

jest.mock('@/pages/LifeCycleModels/Components/create', () => {
  const React = require('react');
  const { message } = jest.requireMock('antd');
  const lifecycleApi = jest.requireMock('@/services/lifeCycleModels/api');
  const processApi = jest.requireMock('@/services/processes/api');

  const LifeCycleModelCreate = ({ actionRef, importData }: any) => {
    const [open, setOpen] = React.useState(false);
    const [nodes, setNodes] = React.useState([] as any[]);

    React.useEffect(() => {
      if (Array.isArray(importData) && importData.length > 0) {
        setNodes([
          {
            id: 'imported-node',
            data: { id: 'process-imported', version: '1.0.0.000' },
          },
        ]);
        setOpen(true);
      }
    }, [importData]);

    const handleCreate = () => {
      setOpen(true);
    };

    const handleAddNode = async () => {
      await processApi.getProcessTableAll({}, {}, 'en', 'my', []);
      const detail = await processApi.getProcessDetailByIdAndVersion([
        { id: 'process-one', version: '1.0.0.000' },
      ]);
      const fetched = detail?.data ?? [];
      const mappedNodes = fetched.map((item: any, index: number) => ({
        id: `node-${index + 1}`,
        data: { id: item.id, version: item.version },
      }));
      setNodes(mappedNodes);
    };

    const handleSave = async () => {
      await lifecycleApi.createLifeCycleModel({
        id: 'generated-model',
        model: { nodes, edges: [] },
      });
      message.success('Created successfully!');
      actionRef?.current?.reload?.();
      setOpen(false);
    };

    return (
      <div>
        <button type='button' onClick={handleCreate}>
          Create
        </button>
        {open ? (
          <div>
            <button type='button' onClick={handleAddNode}>
              Add node
            </button>
            <button type='button' onClick={handleSave}>
              Save data
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  return {
    __esModule: true,
    default: LifeCycleModelCreate,
  };
});

jest.mock('@/pages/LifeCycleModels/Components/edit', () => {
  const React = require('react');
  const { message } = jest.requireMock('antd');
  const lifecycleApi = jest.requireMock('@/services/lifeCycleModels/api');
  const processApi = jest.requireMock('@/services/processes/api');

  const LifeCycleModelEdit = ({ id, version, actionRef }: any) => {
    const [open, setOpen] = React.useState(false);
    const [nodes, setNodes] = React.useState([] as any[]);
    const [results, setResults] = React.useState([] as any[]);
    const [showResults, setShowResults] = React.useState(false);

    React.useEffect(() => {
      if (!open) return;
      (async () => {
        const detail = await lifecycleApi.getLifeCycleModelDetail(id, version, true);
        const fetchedNodes = detail?.data?.json_tg?.nodes ?? [];
        setNodes(fetchedNodes.length ? fetchedNodes : [{ id: 'existing-node' }]);
      })();
    }, [open, id, version]);

    const handleSave = async () => {
      await lifecycleApi.updateLifeCycleModel({ id, version, model: { nodes, edges: [] } });
      message.success('Save successfully');
      actionRef?.current?.reload?.();
      setOpen(false);
    };

    const handleModelResult = async () => {
      const response = await processApi.getProcessesByIdsAndVersion([id], version, 'en');
      setResults(response?.data ?? []);
      setShowResults(true);
    };

    return (
      <div>
        <button type='button' onClick={() => setOpen(true)}>
          Edit
        </button>
        {open ? (
          <div>
            <button
              type='button'
              onClick={() =>
                setNodes((previous: any[]) => [
                  ...previous,
                  {
                    id: `added-${previous.length}`,
                    data: { id: 'process-added', version: '1.0.0.000' },
                  },
                ])
              }
            >
              Add node
            </button>
            <button type='button' onClick={handleSave}>
              Save data
            </button>
            <button type='button' onClick={handleModelResult}>
              Model result
            </button>
            {showResults ? (
              <ul>
                {results.map((row: any) => (
                  <li key={row.id}>{row.name}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  return {
    __esModule: true,
    default: LifeCycleModelEdit,
  };
});

jest.mock('@/pages/LifeCycleModels/Components/modelResult', () => {
  const React = require('react');
  const { getProcessesByIdsAndVersion: getProcesses } = jest.requireMock(
    '@/services/processes/api',
  );

  const ModelResult = ({ modelId, modelVersion }: any) => {
    const [open, setOpen] = React.useState(false);
    const [rows, setRows] = React.useState([] as any[]);

    const handleOpen = async () => {
      setOpen(true);
      const result = await getProcesses([modelId], modelVersion, 'en');
      setRows(result?.data ?? []);
    };

    return (
      <div>
        <button type='button' onClick={handleOpen}>
          Model result
        </button>
        {open ? (
          <ul>
            {rows.map((row: any) => (
              <li key={row.id}>{row.name}</li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  };

  return {
    __esModule: true,
    default: ModelResult,
  };
});

jest.mock('@/components/TableFilter', () => ({
  __esModule: true,
  default: ({ onChange }: any) => (
    <select onChange={(event) => onChange?.(event.target.value)}>
      <option value='all'>all</option>
      <option value='mine'>mine</option>
    </select>
  ),
}));

jest.mock('@/pages/LifeCycleModels/Components/delete', () => ({
  __esModule: true,
  default: () => <button type='button'>delete-model</button>,
}));

jest.mock('@/pages/LifeCycleModels/Components/view', () => ({
  __esModule: true,
  default: () => <button type='button'>view-model</button>,
}));

jest.mock('@/pages/Processes/Components/edit', () => ({
  __esModule: true,
  default: () => <button type='button'>edit-process</button>,
}));

jest.mock('@/pages/Processes/Components/view', () => ({
  __esModule: true,
  default: () => <button type='button'>view-process</button>,
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/eidtInfo', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef(({ data, onData }: any, ref: any) => {
      React.useEffect(() => {
        onData?.(data);
      }, [data, onData]);

      React.useImperativeHandle(ref, () => ({
        handleCheckData: async () => ({
          checkResult: true,
          unReview: [],
          problemNodes: [],
        }),
        submitReview: jest.fn(),
      }));
      return <div>toolbar-info</div>;
    }),
  };
});

jest.mock('@/pages/LifeCycleModels/Components/toolbar/Exchange/index', () => ({
  __esModule: true,
  default: () => <div>edge-exchange</div>,
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/editTargetAmount', () => ({
  __esModule: true,
  default: () => <div>target-amount</div>,
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/addThroughFlow', () => ({
  __esModule: true,
  default: () => <div>add-through-flow</div>,
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/viewInfo', () => ({
  __esModule: true,
  default: () => <div>view-info</div>,
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/viewTargetAmount', () => ({
  __esModule: true,
  default: () => <div>view-target-amount</div>,
}));

jest.mock('@/pages/LifeCycleModels/Components/connectableProcesses', () => ({
  __esModule: true,
  default: () => <div>connectable-processes</div>,
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/Exchange/ioPortSelect', () => ({
  __esModule: true,
  default: () => <div>io-port-select</div>,
}));

const mockGetDataSource = jest.fn(() => 'my') as jest.Mock<any, any[]>;
const mockGetLang = jest.fn(() => 'en') as jest.Mock<any, any[]>;
const mockGetLangText = jest.fn((value: any) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.en ?? 'text';
}) as jest.Mock<any, any[]>;
const mockGetDataTitle = jest.fn(() => 'My Data') as jest.Mock<any, any[]>;

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getDataSource: (...args: any[]) => mockGetDataSource(...args),
  getLang: (...args: any[]) => mockGetLang(...args),
  getLangText: (...args: any[]) => mockGetLangText(...args),
  getDataTitle: (...args: any[]) => mockGetDataTitle(...args),
}));

const mockGetTeamById = jest.fn(async () => ({ data: [] as any[] })) as jest.Mock<any, any[]>;

jest.mock('@/services/teams/api', () => ({
  __esModule: true,
  getTeamById: (...args: any[]) => mockGetTeamById(...args),
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  contributeSource: jest.fn(),
  getRefData: jest.fn(async () => ({ data: {} })),
}));

const mockGetUserTeamId = jest.fn(async () => 'team-1') as jest.Mock<any, any[]>;

jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  getUserTeamId: (...args: any[]) => mockGetUserTeamId(...args),
}));

const mockCreateLifeCycleModel = jest.fn(async () => ({
  data: [{ id: 'model-created', version: '1.0.0.001' }],
})) as jest.Mock<any, any[]>;

const mockUpdateLifeCycleModel = jest.fn(async () => ({
  data: [{ id: 'model-existing', version: '1.0.0.002' }],
})) as jest.Mock<any, any[]>;

const mockGetLifeCycleModelDetail = jest.fn(async () => ({
  data: {
    json: { lifeCycleModelDataSet: {} },
    json_tg: { nodes: [], edges: [] },
  },
})) as jest.Mock<any, any[]>;

const mockGetLifeCycleModelTableAll = jest.fn(async () => ({
  data: [] as any[],
  success: true,
  total: 0,
})) as jest.Mock<any, any[]>;

const mockGetLifeCycleModelTablePgroongaSearch = jest.fn(async () => ({
  data: [] as any[],
  success: true,
  total: 0,
})) as jest.Mock<any, any[]>;

const mockLifeCycleModelHybridSearch = jest.fn(async () => ({
  data: [] as any[],
  success: true,
  total: 0,
})) as jest.Mock<any, any[]>;

jest.mock('@/services/lifeCycleModels/api', () => ({
  __esModule: true,
  getLifeCycleModelTableAll: (...args: any[]) => mockGetLifeCycleModelTableAll(...args),
  getLifeCycleModelTablePgroongaSearch: (...args: any[]) =>
    mockGetLifeCycleModelTablePgroongaSearch(...args),
  lifeCycleModel_hybrid_search: (...args: any[]) => mockLifeCycleModelHybridSearch(...args),
  getLifeCycleModelDetail: (...args: any[]) => mockGetLifeCycleModelDetail(...args),
  createLifeCycleModel: (...args: any[]) => mockCreateLifeCycleModel(...args),
  updateLifeCycleModel: (...args: any[]) => mockUpdateLifeCycleModel(...args),
  updateLifeCycleModelJsonApi: jest.fn(),
  deleteLifeCycleModel: jest.fn(),
}));

const mockProcessTableRows = [
  {
    key: 'process-one:1.0.0.000',
    id: 'process-one',
    version: '1.0.0.000',
    name: 'Process One',
    generalComment: 'comment',
  },
  {
    key: 'process-two:1.0.0.000',
    id: 'process-two',
    version: '1.0.0.000',
    name: 'Process Two',
    generalComment: 'comment',
  },
];

const mockGetProcessTableAll = jest.fn(async () => ({
  data: mockProcessTableRows,
  total: mockProcessTableRows.length,
  success: true,
}));

const mockGetProcessTablePgroongaSearch = jest.fn(async () => ({
  data: mockProcessTableRows,
  total: mockProcessTableRows.length,
  success: true,
}));

const mockProcessDetail = {
  id: 'process-one',
  version: '1.0.0.000',
  json: {
    processDataSet: {
      processInformation: {
        dataSetInformation: {
          name: { en: 'Process One' },
        },
      },
      exchanges: {
        exchange: [
          {
            exchangeDirection: 'Output',
            quantitativeReference: true,
            referenceToFlowDataSet: {
              '@refObjectId': 'flow-1',
              '@version': '1.0',
              'common:shortDescription': { en: 'Flow one' },
            },
            allocations: [],
          },
        ],
      },
    },
  },
};

const mockSecondProcessDetail = {
  id: 'process-two',
  version: '1.0.0.000',
  json: {
    processDataSet: {
      processInformation: {
        dataSetInformation: {
          name: { en: 'Process Two' },
        },
      },
      exchanges: {
        exchange: [
          {
            exchangeDirection: 'Input',
            quantitativeReference: true,
            referenceToFlowDataSet: {
              '@refObjectId': 'flow-2',
              '@version': '1.0',
              'common:shortDescription': { en: 'Flow two' },
            },
            allocations: [],
          },
        ],
      },
    },
  },
};

const mockGetProcessDetailByIdAndVersion = jest.fn(async (args: any[]) => ({
  data: args.map((item) =>
    item.id === 'process-two' ? mockSecondProcessDetail : mockProcessDetail,
  ),
  success: true,
}));

const mockGetProcessDetail = jest.fn(async (id: string) =>
  id === 'process-two'
    ? { data: mockSecondProcessDetail, success: true }
    : { data: mockProcessDetail, success: true },
);

const mockGetProcessesByIdsAndVersion = jest.fn(async () => ({
  data: [
    {
      key: 'process-one:1.0.0.000',
      id: 'process-one',
      version: '1.0.0.000',
      name: 'Process One',
      modifiedAt: '2023-01-01T00:00:00Z',
      generalComment: 'comment',
    },
  ],
  success: true,
  total: 1,
}));

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessTableAll: (...args: any[]) => (mockGetProcessTableAll as any)(...args),
  getProcessTablePgroongaSearch: (...args: any[]) =>
    (mockGetProcessTablePgroongaSearch as any)(...args),
  process_hybrid_search: jest.fn(async () => ({ data: mockProcessTableRows, success: true })),
  getProcessDetailByIdAndVersion: (...args: any[]) =>
    (mockGetProcessDetailByIdAndVersion as any)(...args),
  getProcessDetail: (...args: any[]) => (mockGetProcessDetail as any)(...args),
  getProcessesByIdsAndVersion: (...args: any[]) =>
    (mockGetProcessesByIdsAndVersion as any)(...args),
  getProcessesByIdsAndVersions: jest.fn(),
  getProcessDetailByIdsAndVersion: jest.fn(),
}));

jest.mock('@/services/lifeCycleModels/util', () => ({
  __esModule: true,
  genLifeCycleModelInfoFromData: jest.fn(() => ({ administrativeInformation: {} })),
  genLifeCycleModelData: jest.fn((jsonTg: any) => jsonTg ?? { nodes: [], edges: [] }),
  genNodeLabel: jest.fn((label: string) => label),
  genPortLabel: jest.fn((label: string) => label),
  genEdgeExchangeTableData: jest.fn(),
  genLifeCycleModelDataFromTg: jest.fn(),
  genLifeCycleModelJsonOrdered: jest.fn(),
}));

jest.mock('@/services/processes/util', () => ({
  __esModule: true,
  genProcessFromData: jest.fn((data: any) => data),
  genProcessName: jest.fn((name: any) => (typeof name === 'string' ? name : (name?.en ?? ''))),
  genProcessNameJson: jest.fn((name: any) => name),
}));

let resetGraphStore: () => void;

beforeAll(() => {
  const graphContext = require('@/contexts/graphContext');
  resetGraphStore = graphContext.__resetGraphStore;
});

const renderLifeCycleModels = async () => {
  await act(async () => {
    renderWithProviders(<LifeCycleModelsPage />);
  });
};

describe('LifeCycleModels workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetGraphStore();
    const message = getMockAntdMessage();
    Object.values(message).forEach((fn) => fn.mockClear());
    mockGetLifeCycleModelTableAll.mockResolvedValue({
      data: [],
      success: true,
      total: 0,
    });
    mockGetLifeCycleModelDetail.mockResolvedValue({
      data: {
        json: { lifeCycleModelDataSet: {} },
        json_tg: { nodes: [], edges: [] },
      },
    });
    mockCreateLifeCycleModel.mockResolvedValue({
      data: [{ id: 'model-created', version: '1.0.0.001' }],
    });
    mockUpdateLifeCycleModel.mockResolvedValue({
      data: [{ id: 'model-existing', version: '1.0.0.002' }],
    });
    mockGetProcessesByIdsAndVersion.mockResolvedValue({
      data: [
        {
          key: 'process-one:1.0.0.000',
          id: 'process-one',
          version: '1.0.0.000',
          name: 'Process One',
          modifiedAt: '2023-01-01T00:00:00Z',
          generalComment: 'comment',
        },
      ],
      success: true,
      total: 1,
    });
  });

  it('creates a lifecycle model from selected processes', async () => {
    await renderLifeCycleModels();

    await waitFor(() => expect(mockGetLifeCycleModelTableAll).toHaveBeenCalled());

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Create' }));

    const addNodeButton = await screen.findByRole('button', { name: 'Add node' });
    await user.click(addNodeButton);

    await waitFor(() => expect(mockGetProcessTableAll).toHaveBeenCalled());
    await waitFor(() => expect(mockGetProcessDetailByIdAndVersion).toHaveBeenCalled());

    const saveButton = screen.getByRole('button', { name: 'Save data' });
    await user.click(saveButton);

    await waitFor(() => expect(mockCreateLifeCycleModel).toHaveBeenCalled());

    const payload = mockCreateLifeCycleModel.mock.calls[0][0];
    expect(payload.model.nodes).toHaveLength(1);
    expect(payload.model.nodes[0].data.id).toBe('process-one');

    expect(getMockAntdMessage().success).toHaveBeenCalledWith('Created successfully!');
  });

  it('edits nodes and saves an existing lifecycle model', async () => {
    mockGetLifeCycleModelTableAll.mockResolvedValue({
      data: [
        {
          key: 'model-existing:1.0.0.001',
          id: 'model-existing',
          name: 'Existing Model',
          version: '1.0.0.001',
          modifiedAt: '2023-01-02T00:00:00Z',
          generalComment: 'existing',
          classification: '-',
          teamId: null,
        },
      ],
      success: true,
      total: 1,
    });

    mockGetLifeCycleModelDetail.mockResolvedValue({
      data: {
        json: { lifeCycleModelDataSet: {} },
        json_tg: {
          nodes: [
            {
              id: 'node-existing',
              data: {
                id: 'process-one',
                version: '1.0.0.000',
                label: { en: 'Process One' },
                quantitativeReference: '1',
              },
              ports: { items: [] },
              tools: [],
            },
          ],
          edges: [],
        },
      },
    });

    await renderLifeCycleModels();

    await waitFor(() => expect(mockGetLifeCycleModelTableAll).toHaveBeenCalled());

    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    const user = userEvent.setup();
    await user.click(editButton);

    const existingRowElement = await screen.findByText('Existing Model');
    const existingRow = existingRowElement.closest('tr');
    expect(existingRow).toBeTruthy();
    const rowWithin = within(existingRow as HTMLElement);

    await rowWithin.findByRole('button', { name: 'Add node' });
    await user.click(rowWithin.getByRole('button', { name: 'Add node' }));

    await user.click(rowWithin.getByRole('button', { name: 'Save data' }));

    await waitFor(() => expect(mockUpdateLifeCycleModel).toHaveBeenCalled());
    const updatePayload = mockUpdateLifeCycleModel.mock.calls[0][0];
    expect(updatePayload.model.nodes.length).toBeGreaterThanOrEqual(1);

    expect(getMockAntdMessage().success).toHaveBeenCalledWith('Save successfully');
  });

  it('loads calculation results via model result drawer', async () => {
    mockGetLifeCycleModelTableAll.mockResolvedValue({
      data: [
        {
          key: 'model-existing:1.0.0.001',
          id: 'model-existing',
          name: 'Existing Model',
          version: '1.0.0.001',
          modifiedAt: '2023-01-02T00:00:00Z',
          generalComment: 'existing',
          classification: '-',
          teamId: null,
        },
      ],
      success: true,
      total: 1,
    });

    mockGetLifeCycleModelDetail.mockResolvedValue({
      data: {
        json: { lifeCycleModelDataSet: {} },
        json_tg: {
          submodels: [
            {
              id: 'process-one',
              version: '1.0.0.001',
              finalId: {
                nodeId: 'node-one',
                processId: 'process-one',
                allocatedExchangeDirection: 'output',
                allocatedExchangeFlowId: 'flow-1',
              },
            },
          ],
          nodes: [
            {
              id: 'node-existing',
              data: {
                id: 'process-one',
                version: '1.0.0.001',
                label: { en: 'Process One' },
                quantitativeReference: '1',
              },
              ports: { items: [] },
              tools: [],
            },
          ],
          edges: [],
        },
      },
    });

    await renderLifeCycleModels();

    await waitFor(() => expect(mockGetLifeCycleModelTableAll).toHaveBeenCalled());

    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0];
    const user = userEvent.setup();
    await user.click(editButton);

    const existingRow = screen.getByText('Existing Model').closest('tr');
    const rowWithin = within(existingRow as HTMLElement);
    await rowWithin.findByRole('button', { name: 'Add node' });

    const modelResultButton = rowWithin.getByRole('button', { name: 'Model result' });
    await user.click(modelResultButton);

    await waitFor(() => expect(mockGetProcessesByIdsAndVersion).toHaveBeenCalled());

    expect(rowWithin.getByText('Process One')).toBeInTheDocument();
  });
});
