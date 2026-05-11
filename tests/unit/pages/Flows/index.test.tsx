// @ts-nocheck
import FlowsPage from '@/pages/Flows';
import userEvent from '@testing-library/user-event';
import { act, renderWithProviders, screen, waitFor, within } from '../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

let mockLocation = {
  pathname: '/mydata/flows',
  search: '?tid=team-1',
};
let mockBreakpointScreens: Record<string, boolean | undefined> = {};

const mockContributeSource = jest.fn();
const mockGetFlowTableAll = jest.fn();
const mockGetFlowTablePgroongaSearch = jest.fn();
const mockFlowHybridSearch = jest.fn();
const mockGetCachedFlowCategorizationAll = jest.fn();
const mockGetDataSource = jest.fn(() => 'my');
const mockGetLang = jest.fn(() => 'en');
const mockGetLangText = jest.fn((value: any) => value?.[0]?.['#text'] ?? 'Team title');
const mockGetTeamById = jest.fn();
const mockMessageSuccess = jest.fn();
const mockMessageError = jest.fn();

const flowRows = [
  {
    id: 'flow-1',
    version: '01.00.000',
    name: 'Flow One',
    synonyms: 'Flow One Synonym',
    flowType: 'Elementary flow',
    classification: 'Class A',
    CASNumber: '50-00-0',
    locationOfSupply: 'CN',
    modifiedAt: '2026-03-01T00:00:00Z',
    teamId: '',
  },
  {
    id: 'flow-2',
    version: '01.00.001',
    name: 'Flow Two',
    synonyms: '',
    flowType: 'UNKNOWN_FLOW',
    classification: 'undefined',
    CASNumber: '',
    locationOfSupply: 'US',
    modifiedAt: '2026-03-02T00:00:00Z',
    teamId: 'team-2',
  },
];

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    locale: 'en-US',
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
  useLocation: () => mockLocation,
}));

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  flow_hybrid_search: (...args: any[]) => mockFlowHybridSearch(...args),
  getFlowTableAll: (...args: any[]) => mockGetFlowTableAll(...args),
  getFlowTablePgroongaSearch: (...args: any[]) => mockGetFlowTablePgroongaSearch(...args),
}));

jest.mock('@/services/classifications/cache', () => ({
  __esModule: true,
  getCachedFlowCategorizationAll: (...args: any[]) => mockGetCachedFlowCategorizationAll(...args),
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  attachStateCodesToRows: jest.fn(async (_table: string, rows: any[]) => rows),
  contributeSource: (...args: any[]) => mockContributeSource(...args),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getDataSource: (...args: any[]) => mockGetDataSource(...args),
  getLang: (...args: any[]) => mockGetLang(...args),
  getLangText: (...args: any[]) => mockGetLangText(...args),
  isDataUnderReview: () => false,
}));

jest.mock('@/services/teams/api', () => ({
  __esModule: true,
  getTeamById: (...args: any[]) => mockGetTeamById(...args),
}));

jest.mock('@/components/ImportData', () => ({
  __esModule: true,
  default: ({ onJsonData }: any) => (
    <button type='button' onClick={() => onJsonData?.([{ flowDataSet: {} }])}>
      import-data
    </button>
  ),
}));

jest.mock('@/components/AllVersions', () => ({
  __esModule: true,
  default: ({ addVersionComponent }: any) => (
    <div data-testid='all-versions'>
      all-versions
      {addVersionComponent?.({ newVersion: '02.00.000' })}
    </div>
  ),
}));

jest.mock('@/components/ContributeData', () => ({
  __esModule: true,
  default: ({ onOk, disabled }: any) => (
    <button type='button' disabled={disabled} onClick={() => onOk?.()}>
      contribute-action
    </button>
  ),
}));

jest.mock('@/components/ExportData', () => ({
  __esModule: true,
  default: ({ tableName, id, version }: any) => (
    <button type='button'>{`export-${tableName}-${id}-${version}`}</button>
  ),
}));

jest.mock('@/components/TableFilter', () => ({
  __esModule: true,
  default: ({ onChange }: any) => (
    <button type='button' onClick={() => onChange?.('20')}>
      table-filter
    </button>
  ),
}));

jest.mock('@/pages/Utils', () => ({
  __esModule: true,
  getAllVersionsColumns: jest.fn(() => []),
  getDataTitle: jest.fn(() => 'My Data'),
}));

jest.mock('@/pages/Flows/Components/create', () => ({
  __esModule: true,
  default: ({ importData, actionType, newVersion, onClose }: any) => (
    <div>
      <div data-testid={`flow-create-${actionType ?? 'create'}`}>
        {JSON.stringify({
          importCount: importData?.length ?? 0,
          actionType: actionType ?? 'create',
          newVersion: newVersion ?? null,
        })}
      </div>
      {onClose ? (
        <button type='button' onClick={() => onClose()}>
          close-flow-create-{actionType ?? 'create'}
        </button>
      ) : null}
    </div>
  ),
}));

jest.mock('@/pages/Flows/Components/delete', () => ({
  __esModule: true,
  default: ({ setViewDrawerVisible }: any) => (
    <button type='button' onClick={() => setViewDrawerVisible?.(false)}>
      flow-delete
    </button>
  ),
}));

jest.mock('@/pages/Flows/Components/edit', () => ({
  __esModule: true,
  default: ({ id, version, autoOpen, onDrawerClose }: any) => (
    <div data-testid='flow-edit'>
      {JSON.stringify({ id, version, autoOpen })}
      <button type='button'>flow-edit</button>
      <button type='button' onClick={() => onDrawerClose?.()}>
        flow-edit-close
      </button>
    </div>
  ),
}));

jest.mock('@/pages/Flows/Components/view', () => ({
  __esModule: true,
  default: () => <button type='button'>flow-view</button>,
}));

jest.mock('antd', () => {
  const React = require('react');

  const ConfigProvider = ({ children }: any) => <div>{children}</div>;
  const Card = ({ children }: any) => <section>{children}</section>;
  const Checkbox = ({ children, onChange }: any) => {
    const [checked, setChecked] = React.useState(false);
    return (
      <label>
        <input
          aria-label={toText(children)}
          checked={checked}
          type='checkbox'
          onChange={() => {
            const next = !checked;
            setChecked(next);
            onChange?.({ target: { checked: next } });
          }}
        />
        {toText(children)}
      </label>
    );
  };
  const Col = ({ children }: any) => <div>{children}</div>;
  const Row = ({ children }: any) => <div>{children}</div>;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Tooltip = ({ title, children }: any) => (
    <div data-tooltip-title={toText(title)}>{children}</div>
  );
  const Search = ({ onSearch, placeholder }: any) => (
    <div>
      <input aria-label='search-input' placeholder={placeholder} />
      <button type='button' onClick={() => onSearch?.('steel')}>
        search
      </button>
    </div>
  );
  const Input = { Search };
  const message = {
    success: (...args: any[]) => mockMessageSuccess(...args),
    error: (...args: any[]) => mockMessageError(...args),
  };
  const theme = {
    useToken: () => ({
      token: {
        colorPrimary: '#1677ff',
      },
    }),
  };

  return {
    __esModule: true,
    Card,
    Checkbox,
    Col,
    ConfigProvider,
    Grid: {
      useBreakpoint: () => mockBreakpointScreens,
    },
    Input,
    Row,
    Space,
    Tooltip,
    message,
    theme,
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const PageContainer = ({ children, header }: any) => (
    <div>
      {header?.title ? <h1>{toText(header.title)}</h1> : null}
      {children}
    </div>
  );
  const TableDropdown = ({ menus = [] }: any) => (
    <div>
      {menus.map((menu: any) => (
        <div key={menu.key}>{menu.name}</div>
      ))}
    </div>
  );

  const ProTable = ({ actionRef, request, toolBarRender, headerTitle, columns, rowKey }: any) => {
    const requestRef = React.useRef(request);
    const [rows, setRows] = React.useState<any[]>([]);
    const [pageInfo, setPageInfoState] = React.useState({ pageSize: 10, current: 1 });

    React.useEffect(() => {
      requestRef.current = request;
    }, [request]);

    const runRequest = React.useCallback(
      async (
        sort: Record<string, string> = {},
        filter: Record<string, any> = {},
        params = pageInfo,
      ) => {
        const result = await requestRef.current?.(params, sort, filter);
        setRows(result?.data ?? []);
        return result;
      },
      [pageInfo],
    );

    const reload = jest.fn(async () => runRequest());
    const requestWith = jest.fn(
      async (sort: Record<string, string> = {}, filter: Record<string, any> = {}) =>
        runRequest(sort, filter),
    );

    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = {
          reload,
          setPageInfo: jest.fn((nextPageInfo: any) => {
            setPageInfoState((prev: any) => ({ ...prev, ...nextPageInfo }));
          }),
        };
      }
      void reload();
    }, [actionRef, reload]);

    const classificationFilters =
      columns?.find((column: any) => column.dataIndex === 'classification')?.filters ?? [];

    return (
      <section data-testid='pro-table'>
        <div>{toText(headerTitle)}</div>
        <div>{toolBarRender?.()}</div>
        <div data-testid='classification-filters'>{JSON.stringify(classificationFilters)}</div>
        <button
          type='button'
          onClick={() =>
            requestWith(
              { name: 'ascend' },
              {
                flowType: ['ELEMENTARY_FLOW'],
                classification: ['classification:class-1', 'elementary:elem-1', 'broken', 'x:'],
              },
            )
          }
        >
          request-filter-sort
        </button>
        <button
          type='button'
          onClick={() =>
            requestWith(
              { name: 'descend' },
              {
                flowType: ['ELEMENTARY_FLOW'],
                classification: ['classification:class-1', 'elementary:elem-1'],
              },
            )
          }
        >
          request-filter-sort-desc
        </button>
        <button type='button' onClick={() => requestWith({ modifiedAt: 'descend' }, {})}>
          request-unknown-sort
        </button>
        <button type='button' onClick={() => requestWith({ CASNumber: 'descend' }, {})}>
          request-search-unknown-sort
        </button>
        {rows.map((row: any, rowIndex: number) => {
          const key = rowKey ? rowKey(row) : `row-${rowIndex}`;
          return (
            <div data-testid={`row-${key}`} key={key}>
              {columns?.map((column: any, columnIndex: number) => {
                const value = column.dataIndex ? row[column.dataIndex] : undefined;
                const rendered = column.render ? column.render(value, row, rowIndex) : value;
                return <div key={`${column.dataIndex ?? 'col'}-${columnIndex}`}>{rendered}</div>;
              })}
            </div>
          );
        })}
      </section>
    );
  };

  return {
    __esModule: true,
    ActionType: {},
    PageContainer,
    ProColumns: {},
    ProTable,
    TableDropdown,
  };
});

describe('FlowsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation = {
      pathname: '/mydata/flows',
      search: '?tid=team-1',
    };
    mockBreakpointScreens = {};
    mockGetDataSource.mockReturnValue('my');
    mockGetTeamById.mockResolvedValue({
      data: [{ json: { title: [{ '@xml:lang': 'en', '#text': 'Flow Team' }] } }],
    });
    mockGetCachedFlowCategorizationAll.mockResolvedValue({
      categoryElementaryFlow: [
        { id: 'elem-1', label: 'Elementary 1', value: 'Elementary fallback' },
        { id: 'elem-empty' },
        { id: '', label: 'Ignore me' },
      ],
      category: [
        { id: 'class-1', value: 'Classification 1' },
        { id: 'class-empty' },
        { id: null, label: 'Ignore me too' },
      ],
    });
    mockGetFlowTableAll.mockResolvedValue({ data: flowRows, success: true });
    mockGetFlowTablePgroongaSearch.mockResolvedValue({ data: [], success: true });
    mockFlowHybridSearch.mockResolvedValue({ data: [], success: true });
    mockContributeSource.mockResolvedValue({ error: null });
  });

  it('loads the default table, row renders, classification filters, and import/create interactions', async () => {
    const user = userEvent.setup();

    renderWithProviders(<FlowsPage />);

    await waitFor(() => expect(mockGetTeamById).toHaveBeenCalledWith('team-1'));
    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());

    expect(mockGetFlowTableAll).toHaveBeenCalledWith(
      { pageSize: 10, current: 1 },
      {},
      'en',
      'my',
      'team-1',
      { flowType: '' },
      'all',
    );
    expect(screen.getByRole('heading', { name: 'Flow Team' })).toBeInTheDocument();
    expect(screen.getByText('Flow One')).toBeInTheDocument();
    expect(screen.getByText('Elementary flow')).toBeInTheDocument();
    expect(screen.getByText('UNKNOWN_FLOW')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getAllByTestId('all-versions')).toHaveLength(2);
    expect(screen.getByTestId('classification-filters')).toHaveTextContent('elementary:elem-1');
    expect(screen.getByTestId('classification-filters')).toHaveTextContent('elementary:elem-empty');
    expect(screen.getByTestId('classification-filters')).toHaveTextContent(
      'classification:class-1',
    );
    expect(screen.getByTestId('classification-filters')).toHaveTextContent(
      '"text":"-","value":"classification:class-empty"',
    );
    expect(screen.getAllByTestId('flow-create-createVersion')).toHaveLength(2);
    expect(screen.getAllByTestId('flow-create-createVersion')[0]).toHaveTextContent(
      '"newVersion":"02.00.000"',
    );

    await user.click(screen.getByRole('button', { name: /import-data/i }));
    expect(screen.getByTestId('flow-create-create')).toHaveTextContent('"importCount":1');

    await user.click(screen.getByRole('button', { name: /close-flow-create-create/i }));
    expect(screen.getByTestId('flow-create-create')).toHaveTextContent('"importCount":0');
  });

  it('uses compact mobile controls for my data rows', async () => {
    mockBreakpointScreens = { md: false };

    renderWithProviders(<FlowsPage />);

    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());
    expect(await screen.findByText('Flow One')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /table-filter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import-data/i })).toBeInTheDocument();
  });

  it('reloads the table with the selected state filter and uses search placeholders for both modes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FlowsPage />);

    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());
    expect(screen.getByRole('textbox', { name: /search-input/i })).toHaveAttribute(
      'placeholder',
      'pages.search.keyWord',
    );

    await user.click(screen.getByRole('button', { name: /table-filter/i }));

    await waitFor(() =>
      expect(mockGetFlowTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'en',
        'my',
        'team-1',
        { flowType: '' },
        '20',
      ),
    );

    await user.click(screen.getByRole('checkbox', { name: /ai search/i }));
    expect(screen.getByRole('textbox', { name: /search-input/i })).toHaveAttribute(
      'placeholder',
      'pages.search.placeholder',
    );
  });

  it('uses the current state filter for pgroonga, name-sorted search, unknown-sorted search, and AI search', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FlowsPage />);

    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /table-filter/i }));

    await user.click(screen.getByRole('button', { name: 'search' }));
    await waitFor(() =>
      expect(mockGetFlowTablePgroongaSearch).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'steel',
        { flowType: '' },
        '20',
        undefined,
      ),
    );

    await user.click(screen.getByRole('button', { name: 'request-filter-sort' }));
    await waitFor(() =>
      expect(mockGetFlowTablePgroongaSearch).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'steel',
        {
          flowType: 'ELEMENTARY_FLOW',
          classification: [
            { scope: 'classification', code: 'class-1' },
            { scope: 'elementary', code: 'elem-1' },
          ],
        },
        '20',
        { key: 'baseName', lang: 'en', order: 'asc' },
      ),
    );

    await user.click(screen.getByRole('button', { name: /request-filter-sort-desc/i }));
    await waitFor(() =>
      expect(mockGetFlowTablePgroongaSearch).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'steel',
        {
          flowType: 'ELEMENTARY_FLOW',
          classification: [
            { scope: 'classification', code: 'class-1' },
            { scope: 'elementary', code: 'elem-1' },
          ],
        },
        '20',
        { key: 'baseName', lang: 'en', order: 'desc' },
      ),
    );

    await user.click(screen.getByRole('button', { name: /request-search-unknown-sort/i }));
    await waitFor(() =>
      expect(mockGetFlowTablePgroongaSearch).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'steel',
        { flowType: '' },
        '20',
        undefined,
      ),
    );

    await user.click(screen.getByRole('checkbox', { name: /ai search/i }));
    await user.click(screen.getByRole('button', { name: 'search' }));
    await waitFor(() =>
      expect(mockFlowHybridSearch).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'steel',
        { flowType: '' },
        '20',
      ),
    );
  });

  it('parses classification filters, converts known sort fields, and keeps unknown sort fields on table-all requests', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FlowsPage />);

    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: 'request-filter-sort' }));
    await waitFor(() =>
      expect(mockGetFlowTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        { 'json->flowDataSet->flowInformation->dataSetInformation->name': 'ascend' },
        'en',
        'my',
        'team-1',
        {
          flowType: 'ELEMENTARY_FLOW',
          classification: [
            { scope: 'classification', code: 'class-1' },
            { scope: 'elementary', code: 'elem-1' },
          ],
        },
        'all',
      ),
    );

    await user.click(screen.getByRole('button', { name: /request-unknown-sort/i }));
    await waitFor(() =>
      expect(mockGetFlowTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        { modifiedAt: 'descend' },
        'en',
        'my',
        'team-1',
        { flowType: '' },
        'all',
      ),
    );
  });

  it('renders my-data row actions and contributes rows successfully or with logged errors', async () => {
    const user = userEvent.setup();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    renderWithProviders(<FlowsPage />);

    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());

    const contributeButtons = screen.getAllByRole('button', { name: /contribute-action/i });
    expect(contributeButtons).toHaveLength(2);
    expect(contributeButtons[1]).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'flow-view' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'flow-edit' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'flow-delete' })).toHaveLength(2);
    expect(
      screen.getByRole('button', { name: /export-flows-flow-1-01.00.000/i }),
    ).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'flow-delete' })[0]);

    await user.click(contributeButtons[0]);
    await waitFor(() =>
      expect(mockContributeSource).toHaveBeenCalledWith('flows', 'flow-1', '01.00.000'),
    );
    expect(mockMessageSuccess).toHaveBeenCalledWith('Contribute successfully');

    mockContributeSource.mockResolvedValueOnce({ error: { message: 'failed' } });
    await user.click(contributeButtons[0]);
    await waitFor(() =>
      expect(mockContributeSource).toHaveBeenCalledWith('flows', 'flow-1', '01.00.000'),
    );
    expect(logSpy).toHaveBeenCalledWith({ message: 'failed' });

    logSpy.mockRestore();
  });

  it('handles missing teams and categorization failures, and ignores late categorization responses after unmount', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockGetTeamById.mockResolvedValueOnce({ data: [] });
    mockGetCachedFlowCategorizationAll.mockRejectedValueOnce(new Error('classification failed'));

    renderWithProviders(<FlowsPage />);

    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByTestId('classification-filters')).toHaveTextContent('[]'),
    );
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));

    let resolveCategorization: ((value: any) => void) | undefined;
    mockGetCachedFlowCategorizationAll.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCategorization = resolve;
      }),
    );

    const { unmount } = renderWithProviders(<FlowsPage />);
    await waitFor(() => expect(mockGetCachedFlowCategorizationAll).toHaveBeenCalled());

    unmount();
    await act(async () => {
      resolveCategorization?.({
        categoryElementaryFlow: [{ id: 'late-elem', label: 'Late Elementary' }],
        category: [{ id: 'late-class', label: 'Late Classification' }],
      });
      await Promise.resolve();
    });

    consoleErrorSpy.mockRestore();
  });

  it('falls back to empty classification arrays when categorization payload omits both groups', async () => {
    mockGetCachedFlowCategorizationAll.mockResolvedValueOnce({});

    renderWithProviders(<FlowsPage />);

    await waitFor(() =>
      expect(screen.getByTestId('classification-filters')).toHaveTextContent('[]'),
    );
  });

  it('omits my-data toolbar actions for non-my data sources while keeping public row actions', async () => {
    mockLocation = {
      pathname: '/tgdata/flows',
      search: '',
    };
    mockGetDataSource.mockReturnValue('tg');

    renderWithProviders(<FlowsPage />);

    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());

    expect(screen.queryByRole('button', { name: /table-filter/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /import-data/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /contribute-action/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'flow-view' })).toHaveLength(2);
    expect(
      screen.getByRole('button', { name: /export-flows-flow-1-01.00.000/i }),
    ).toBeInTheDocument();
  });

  it('opens and closes the route-driven edit drawer for my-data links', async () => {
    mockLocation = {
      pathname: '/mydata/flows',
      search: '?tid=team-1&id=flow-route&version=9.9.9',
    };

    renderWithProviders(<FlowsPage />);

    await waitFor(() =>
      expect(
        screen
          .getAllByTestId('flow-edit')
          .some((node) => node.textContent?.includes('"autoOpen":true')),
      ).toBe(true),
    );

    const autoOpenEdit = screen
      .getAllByTestId('flow-edit')
      .find((node) => node.textContent?.includes('"autoOpen":true'));

    expect(autoOpenEdit).toHaveTextContent('"id":"flow-route"');
    expect(autoOpenEdit).toHaveTextContent('"version":"9.9.9"');

    await userEvent.click(within(autoOpenEdit!).getByRole('button', { name: /flow-edit-close/i }));

    await waitFor(() =>
      expect(
        screen
          .getAllByTestId('flow-edit')
          .some((node) => node.textContent?.includes('"autoOpen":true')),
      ).toBe(false),
    );
  });
});
