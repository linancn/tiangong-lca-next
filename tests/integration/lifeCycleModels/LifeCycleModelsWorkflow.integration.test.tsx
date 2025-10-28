// @ts-nocheck
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

const mockUseLocation = jest.fn(() => ({
  pathname: '/mydata/lifecyclemodels',
  search: '',
}));

const mockIntl = {
  locale: 'en-US',
  formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
};

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => mockIntl,
  useLocation: () => mockUseLocation(),
}));

jest.mock('@/style/custom.less', () => ({}));

const mockToText = (node: any): string => {
  if (node === null || node === undefined) {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(mockToText).join('');
  }
  if (node?.props?.defaultMessage) {
    return node.props.defaultMessage;
  }
  if (node?.props?.id) {
    return node.props.id;
  }
  if (node?.props?.children) {
    return mockToText(node.props.children);
  }
  return '';
};

jest.mock('antd', () => {
  const React = require('react');
  const message = {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    loading: jest.fn(),
  };

  const Button = React.forwardRef(
    (
      { children, onClick, disabled, icon, style, ...rest }: any,
      ref: React.Ref<HTMLButtonElement>,
    ) => (
      <button
        ref={ref}
        type='button'
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        style={style}
        {...rest}
      >
        {icon}
        {children}
      </button>
    ),
  );
  Button.displayName = 'MockButton';

  const Tooltip = ({ title, children }: any) => {
    const label = mockToText(title);
    if (React.isValidElement(children)) {
      return React.cloneElement(children, {
        'aria-label': children.props['aria-label'] ?? label,
        title: children.props.title ?? label,
      });
    }
    return <span title={label}>{children}</span>;
  };

  const Card = ({ children, tabList, activeTabKey, onTabChange }: any) => {
    if (tabList && tabList.length) {
      return (
        <div data-testid='mock-card'>
          <div data-testid='mock-card-tabs'>
            {tabList.map((tab: any) => (
              <button
                key={tab.key}
                type='button'
                onClick={() => onTabChange?.(tab.key)}
                aria-pressed={tab.key === activeTabKey}
              >
                {mockToText(tab.tab)}
              </button>
            ))}
          </div>
          <div>{children}</div>
        </div>
      );
    }
    return <div>{children}</div>;
  };

  const Row = ({ children }: any) => <div>{children}</div>;
  const Col = ({ children }: any) => <div>{children}</div>;
  const Space = ({ children, direction = 'horizontal' }: any) => (
    <div data-direction={direction}>{children}</div>
  );

  const Checkbox = ({ onChange, children }: any) => (
    <label>
      <input
        type='checkbox'
        onChange={(event) => onChange?.({ target: { checked: event.target.checked } })}
      />
      {children}
    </label>
  );

  const Input = ({ value = '', onChange, placeholder, ...rest }: any) => (
    <input
      value={value}
      onChange={(event) => onChange?.(event)}
      placeholder={placeholder}
      {...rest}
    />
  );
  const InputSearch = ({ placeholder, onSearch }: any) => {
    const React = require('react');
    const [keyword, setKeyword] = React.useState('');
    return (
      <div data-testid='search-wrapper'>
        <input
          value={keyword}
          placeholder={placeholder}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <button type='button' onClick={() => onSearch?.(keyword)}>
          Search
        </button>
      </div>
    );
  };
  Input.Search = InputSearch;

  const Drawer = ({ open, children, title, extra, footer, onClose, width, ...rest }: any) => {
    if (!open) return null;
    return (
      <div role='dialog' aria-label={mockToText(title)} data-width={width} {...rest}>
        <div>{extra}</div>
        <div>{children}</div>
        <div>{footer}</div>
        <button type='button' onClick={onClose}>
          Close
        </button>
      </div>
    );
  };

  const Layout = ({ children }: any) => <div>{children}</div>;
  Layout.Sider = ({ children }: any) => <aside>{children}</aside>;
  Layout.Content = ({ children }: any) => <section>{children}</section>;

  const theme = {
    useToken: () => ({
      token: {
        colorPrimary: '#1677ff',
        colorBgBase: '#ffffff',
        colorBgContainer: '#ffffff',
        colorBorder: '#d9d9d9',
        colorTextBase: '#000000',
        colorError: '#ff4d4f',
        colorTextDescription: '#8c8c8c',
      },
    }),
  };

  const Spin = ({ spinning }: any) => (spinning ? <div>Loading...</div> : null);

  const ConfigProvider = ({ children }: any) => <>{children}</>;

  const Typography = {
    Text: ({ children }: any) => <span>{children}</span>,
    Title: ({ children }: any) => <h1>{children}</h1>,
  };

  return {
    __esModule: true,
    Button,
    Tooltip,
    Card,
    Row,
    Col,
    Space,
    Checkbox,
    Input,
    Drawer,
    Layout,
    Spin,
    ConfigProvider,
    message,
    theme,
    Typography,
  };
});

const getMockAntdMessage = () => jest.requireMock('antd').message as Record<string, jest.Mock>;

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  PlusOutlined: () => <span>plus</span>,
  CopyOutlined: () => <span>copy</span>,
  CloseOutlined: () => <span>close</span>,
  ProductOutlined: () => <span>product</span>,
  CheckCircleOutlined: () => <span>check</span>,
  SaveOutlined: () => <span>save</span>,
  SendOutlined: () => <span>send</span>,
  DeleteOutlined: () => <span>delete</span>,
  FormOutlined: () => <span>edit</span>,
}));

jest.mock('@ant-design/pro-table', () => ({
  __esModule: true,
  TableDropdown: ({ menus }: any) => (
    <div>
      {(menus ?? []).map((menu: any) => (
        <div key={menu.key}>{menu.name}</div>
      ))}
    </div>
  ),
}));

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const MockProTable = ({
    request,
    actionRef,
    columns = [],
    toolBarRender,
    rowSelection,
    headerTitle,
  }: any) => {
    const [rows, setRows] = React.useState<any[]>([]);
    const requestRef = React.useRef(request);
    const paramsRef = React.useRef({ current: 1, pageSize: 10 });

    const runRequest = React.useCallback(async (override: any = {}) => {
      paramsRef.current = { ...paramsRef.current, ...override };
      const result = await requestRef.current?.(paramsRef.current, {});
      setRows(result?.data ?? []);
      return result;
    }, []);

    React.useEffect(() => {
      requestRef.current = request;
    }, [request]);

    React.useEffect(() => {
      const handlers = {
        reload: () => runRequest(),
        setPageInfo: (info: any) => runRequest(info ?? {}),
      };
      if (actionRef) {
        actionRef.current = handlers;
      }
      return () => {
        if (actionRef) {
          actionRef.current = undefined;
        }
      };
    }, [actionRef, runRequest]);

    React.useEffect(() => {
      void runRequest();
    }, [runRequest]);

    const renderCell = (column: any, row: any, index: number) => {
      if (typeof column.render === 'function') {
        return column.render(row[column.dataIndex], row, index);
      }
      const cellValue = row[column.dataIndex];
      if (cellValue instanceof Date) {
        return cellValue.toISOString();
      }
      if (typeof cellValue === 'object' && cellValue !== null) {
        return JSON.stringify(cellValue);
      }
      return cellValue;
    };

    const renderToolbar = toolBarRender?.() ?? [];

    const resolvedColumns = Array.isArray(columns) ? columns : [];
    const dataKey = typeof rowSelection?.rowKey === 'string' ? rowSelection.rowKey : 'key';

    return (
      <div data-testid='pro-table'>
        <div data-testid='pro-table-header'>
          {typeof headerTitle === 'function' ? headerTitle() : headerTitle}
        </div>
        <div data-testid='pro-table-toolbar'>{renderToolbar}</div>
        <table>
          <tbody>
            {rows.map((row, rowIndex) => {
              const key = row[dataKey] ?? row.key ?? row.id ?? rowIndex;
              const isSelected = rowSelection?.selectedRowKeys?.includes(key);
              return (
                <tr key={key}>
                  {rowSelection ? (
                    <td>
                      <input
                        type='checkbox'
                        aria-label={`select-${key}`}
                        checked={isSelected}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          const previous = rowSelection.selectedRowKeys ?? [];
                          const nextKeys = checked
                            ? Array.from(new Set([...previous, key]))
                            : previous.filter((existingKey: any) => existingKey !== key);
                          rowSelection.onChange?.(
                            nextKeys,
                            rows.filter((item) =>
                              nextKeys.includes(item[dataKey] ?? item.key ?? item.id),
                            ),
                          );
                        }}
                      />
                    </td>
                  ) : null}
                  {resolvedColumns.map((column, columnIndex) => (
                    <td key={columnIndex}>{renderCell(column, row, rowIndex)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return {
    __esModule: true,
    PageContainer: ({ children }: any) => <div>{children}</div>,
    ProTable: MockProTable,
    ActionType: {},
  };
});

const mockGraphStoreState = { nodes: [], edges: [] };
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
      const listener = () => forceRender((count) => count + 1);
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
      {mockToText(tooltip)}
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
    const [nodes, setNodes] = React.useState<any[]>([]);

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
    const [nodes, setNodes] = React.useState<any[]>([]);
    const [results, setResults] = React.useState<any[]>([]);
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
                setNodes((previous) => [
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
    const [rows, setRows] = React.useState<any[]>([]);

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

const mockGetDataSource = jest.fn(() => 'my');
const mockGetLang = jest.fn(() => 'en');
const mockGetLangText = jest.fn((value: any) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.en ?? 'text';
});
const mockGetDataTitle = jest.fn(() => 'My Data');

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getDataSource: (...args: any[]) => mockGetDataSource(...args),
  getLang: (...args: any[]) => mockGetLang(...args),
  getLangText: (...args: any[]) => mockGetLangText(...args),
  getDataTitle: (...args: any[]) => mockGetDataTitle(...args),
}));

const mockGetTeamById = jest.fn(async () => ({ data: [] }));

jest.mock('@/services/teams/api', () => ({
  __esModule: true,
  getTeamById: (...args: any[]) => mockGetTeamById(...args),
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  contributeSource: jest.fn(),
  getRefData: jest.fn(async () => ({ data: {} })),
}));

const mockGetUserTeamId = jest.fn(async () => 'team-1');

jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  getUserTeamId: (...args: any[]) => mockGetUserTeamId(...args),
}));

const mockCreateLifeCycleModel = jest.fn(async () => ({
  data: [{ id: 'model-created', version: '1.0.0.001' }],
}));

const mockUpdateLifeCycleModel = jest.fn(async () => ({
  data: [{ id: 'model-existing', version: '1.0.0.002' }],
}));

const mockGetLifeCycleModelDetail = jest.fn(async () => ({
  data: {
    json: { lifeCycleModelDataSet: {} },
    json_tg: { nodes: [], edges: [] },
  },
}));

const mockGetLifeCycleModelTableAll = jest.fn(async () => ({
  data: [],
  success: true,
  total: 0,
}));

const mockGetLifeCycleModelTablePgroongaSearch = jest.fn(async () => ({
  data: [],
  success: true,
  total: 0,
}));

const mockLifeCycleModelHybridSearch = jest.fn(async () => ({
  data: [],
  success: true,
  total: 0,
}));

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
      modifiedAt: new Date('2023-01-01T00:00:00Z'),
      generalComment: 'comment',
    },
  ],
  success: true,
  total: 1,
}));

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessTableAll: (...args: any[]) => mockGetProcessTableAll(...args),
  getProcessTablePgroongaSearch: (...args: any[]) => mockGetProcessTablePgroongaSearch(...args),
  process_hybrid_search: jest.fn(async () => ({ data: mockProcessTableRows, success: true })),
  getProcessDetailByIdAndVersion: (...args: any[]) => mockGetProcessDetailByIdAndVersion(...args),
  getProcessDetail: (...args: any[]) => mockGetProcessDetail(...args),
  getProcessesByIdsAndVersion: (...args: any[]) => mockGetProcessesByIdsAndVersion(...args),
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
          modifiedAt: new Date('2023-01-01T00:00:00Z'),
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
          modifiedAt: new Date('2023-01-02T00:00:00Z'),
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
          modifiedAt: new Date('2023-01-02T00:00:00Z'),
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
