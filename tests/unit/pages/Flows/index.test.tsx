// @ts-nocheck
import FlowsPage from '@/pages/Flows';
import userEvent from '@testing-library/user-event';
import { act, renderWithProviders, screen, waitFor, within } from '../../../helpers/testUtils';

jest.mock('@/contexts/AntdAppContext', () => ({
  __esModule: true,
  dispatchAntdAppAction: (action: (api: unknown) => void) =>
    action(jest.requireMock('antd').App.useApp()),
}));

jest.mock('@/components/ToolBarButton', () => ({
  __esModule: true,
  default: ({ onClick, placement = 'option', tooltip }: any) => (
    <button data-placement={placement} type='button' onClick={onClick}>
      {tooltip}
    </button>
  ),
}));

let mockCapturedTableProps: any;
let mockOmitClassificationParam = false;

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
let mockIntlLocale = 'en-US';
let mockBreakpointScreens: Record<string, boolean | undefined> = {};

const mockContributeSource = jest.fn();
const mockGetFlowTableAll = jest.fn();
const mockGetFlowTablePgroongaSearch = jest.fn();
const mockGetFlowTableUuidMentionSearch = jest.fn();
const mockFlowHybridSearch = jest.fn();
const mockGetCachedFlowCategorizationAll = jest.fn();
const mockGetDataSource = jest.fn(() => 'my');
const mockGetLang = jest.fn(() => 'en');
const mockGetLangText = jest.fn((value: any) => value?.[0]?.['#text'] ?? 'Team title');
const mockGetTeamById = jest.fn();
const mockDatasetUuidMentionSearch = jest.fn();
const mockMessageSuccess = jest.fn();
const mockMessageError = jest.fn();
const mockMessageWarning = jest.fn();
const mockMessageInfo = jest.fn();

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
    locale: mockIntlLocale,
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
  useLocation: () => mockLocation,
}));

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  flow_hybrid_search: (...args: any[]) => mockFlowHybridSearch(...args),
  getFlowTableAll: (...args: any[]) => mockGetFlowTableAll(...args),
  getFlowTablePgroongaSearch: (...args: any[]) => mockGetFlowTablePgroongaSearch(...args),
  getFlowTableUuidMentionSearch: (...args: any[]) => mockGetFlowTableUuidMentionSearch(...args),
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
  default: ({ id, addVersionComponent, operationRender }: any) => {
    operationRender?.({ id, version: '02.00.000' });
    return (
      <div data-testid='all-versions'>
        all-versions
        {addVersionComponent?.({ newVersion: '02.00.000' })}
      </div>
    );
  },
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

jest.mock('@/components/DatasetUuidMentionSearch', () => ({
  __esModule: true,
  default: (props: any) => {
    mockDatasetUuidMentionSearch(props);
    return (
      <div data-testid='dataset-uuid-mention-search'>
        {JSON.stringify({
          dataSource: props.dataSource,
          queryText: props.queryText,
          sourceEntityKinds: props.sourceEntityKinds,
          stateCode: props.getStateCodeFilter?.(),
          teamId: props.teamId,
        })}
      </div>
    );
  },
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
  const Checkbox = ({ checked = false, children, onChange }: any) => {
    return (
      <label>
        <input
          aria-label={toText(children)}
          checked={checked}
          type='checkbox'
          onChange={() => {
            const next = !checked;
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
      <input
        aria-label='search-input'
        placeholder={placeholder}
        onKeyDown={(event) => {
          if (event.key === 'Enter')
            onSearch?.(event.currentTarget.value, event, { source: 'input' });
        }}
      />
      <button type='button' onClick={() => onSearch?.('', undefined, { source: 'clear' })}>
        clear
      </button>
      <button type='button' onClick={() => onSearch?.('steel')}>
        search
      </button>
      <button type='button' onClick={() => onSearch?.('D1380000-0000-4000-8000-000000000001')}>
        uuid-lookup
      </button>
    </div>
  );
  const Input = { Search };
  const message = {
    success: (...args: any[]) => mockMessageSuccess(...args),
    error: (...args: any[]) => mockMessageError(...args),
    warning: (...args: any[]) => mockMessageWarning(...args),
    info: (...args: any[]) => mockMessageInfo(...args),
  };
  const theme = {
    useToken: () => ({
      token: {
        colorPrimary: '#1677ff',
      },
    }),
  };

  return (() => {
    const antdModuleMock = {
      __esModule: true,
      Card,
      Checkbox,
      Col,
      ConfigProvider,
      Grid: {
        useBreakpoint: () => mockBreakpointScreens,
      },
      Select: ({ onChange, options, value, ...props }: any) => (
        <select
          aria-label={props['aria-label']}
          value={value ?? ''}
          onChange={(event) =>
            onChange(props.allowClear && event.target.value === '' ? undefined : event.target.value)
          }
        >
          <option value=''>All types</option>
          {options.map((option: any) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ),
      Input,
      Row,
      Space,
      Tooltip,
      message,
      theme,
    };
    return {
      ...antdModuleMock,
      App: {
        useApp: () => ({
          message: antdModuleMock.message,
        }),
      },
    };
  })();
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

  const ProTable = ({
    actionRef,
    request,
    params = {},
    toolbar,
    toolBarRender,
    headerTitle,
    columns,
    rowKey,
    pagination,
  }: any) => {
    mockCapturedTableProps = { columns, pagination, params, request, actionRef };
    const [rows, setRows] = React.useState<any[]>([]);
    const headerTitleText = toText(headerTitle);
    const paramsKey = JSON.stringify(params);
    const [pageInfo, setPageInfoState] = React.useState({
      pageSize: 50,
      current: 1,
    });
    const latestRequestRef = React.useRef(request);
    const latestParamsRef = React.useRef(params);
    const latestPageInfoRef = React.useRef(pageInfo);
    latestRequestRef.current = request;
    latestParamsRef.current = params;
    latestPageInfoRef.current = pageInfo;

    const runRequest = React.useCallback(
      async (
        sort: Record<string, string | undefined> = {},
        filter: Record<string, any> = {},
        requestParams = latestPageInfoRef.current,
      ) => {
        const nextParams = { ...requestParams, ...latestParamsRef.current };
        if (mockOmitClassificationParam) delete nextParams.classification;
        const result = await latestRequestRef.current?.(nextParams, sort, filter);
        setRows(result?.data ?? []);
        return result;
      },
      [],
    );

    const api = React.useMemo(
      () => ({
        reload: jest.fn(async () => runRequest()),
        setPageInfo: jest.fn((nextPageInfo: any) => {
          latestPageInfoRef.current = { ...latestPageInfoRef.current, ...nextPageInfo };
          setPageInfoState(latestPageInfoRef.current);
        }),
      }),
      [runRequest],
    );
    const requestWith = React.useMemo(
      () =>
        jest.fn(
          async (sort: Record<string, string | undefined> = {}, filter: Record<string, any> = {}) =>
            runRequest(sort, filter),
        ),
      [runRequest],
    );

    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = api;
      }
      void api.reload();
    }, [actionRef, api, headerTitleText, paramsKey]);

    const classificationFilters =
      columns?.find((column: any) => column.dataIndex === 'classification')?.filters ?? [];

    return (
      <section data-testid='pro-table'>
        <div>{headerTitleText}</div>
        <div>
          {toolbar?.search}
          {toolbar?.filter}
          {toolBarRender?.()}
        </div>
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
        <button type='button' onClick={() => requestWith({ name: undefined }, {})}>
          request-inactive-sort
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
    mockCapturedTableProps = undefined;
    mockOmitClassificationParam = false;
    jest.clearAllMocks();
    mockLocation = {
      pathname: '/mydata/flows',
      search: '?tid=team-1',
    };
    mockIntlLocale = 'en-US';
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
    mockGetFlowTableUuidMentionSearch.mockResolvedValue({ data: [], success: true, total: 0 });
    mockFlowHybridSearch.mockResolvedValue({ data: [], success: true });
    mockContributeSource.mockResolvedValue({ error: null });
  });

  it('keeps the Open Data catalog route and classification control without a source toggle', async () => {
    mockGetDataSource.mockReturnValue('tg');
    mockLocation = { pathname: '/tgdata/flows', search: '' };
    renderWithProviders(<FlowsPage />);
    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());
    expect(mockGetFlowTableAll.mock.calls.at(-1)?.at(-1)).toBe(true);
    expect(screen.getByTestId('dataset-classification-filter')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^(All data|Enterprise data|Literature data)$/i }),
    ).not.toBeInTheDocument();
  });

  it('uses the shared six-column native pagination layout and sends toolbar classification to the complete query', async () => {
    renderWithProviders(<FlowsPage />);
    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());
    expect(mockCapturedTableProps.pagination).toEqual(
      expect.objectContaining({
        defaultPageSize: 50,
        showSizeChanger: true,
        pageSizeOptions: [20, 50, 100],
      }),
    );
    expect(
      mockCapturedTableProps.columns.slice(0, 6).map((column: any) => toText(column.title)),
    ).toEqual(['Index', 'Name', 'Location', 'Reference year', 'Type of data set', 'Version']);
    expect(
      mockCapturedTableProps.columns.some((column: any) => column.dataIndex === 'classification'),
    ).toBe(false);
    act(() => mockCapturedTableProps.pagination.onChange(3, 20));
    expect(mockCapturedTableProps.columns[0].render(null, {}, 0)).toBe(41);
    act(() => mockCapturedTableProps.pagination.onChange(1, 50));
    expect(mockCapturedTableProps.columns[0].render(null, {}, 0)).toBe(1);
    await userEvent.click(screen.getByTestId('dataset-classification-filter'));
    await waitFor(() =>
      expect(mockGetFlowTableAll.mock.calls.at(-1)?.[0]).toEqual(
        expect.objectContaining({
          current: 1,
          pageSize: 50,
          classification: [{ scope: 'classification', code: 'C', path: ['C'] }],
        }),
      ),
    );
  });

  it('falls back to the English browser locale when the runtime locale is unsupported', async () => {
    mockIntlLocale = 'unsupported-locale';

    renderWithProviders(<FlowsPage />);

    await waitFor(() => expect(mockGetLang).toHaveBeenCalledWith('en-US'));
  });

  it('loads the default table, row renders, classification filters, and import/create interactions', async () => {
    const user = userEvent.setup();

    renderWithProviders(<FlowsPage />);

    await waitFor(() => expect(mockGetTeamById).toHaveBeenCalledWith('team-1'));
    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());

    expect(mockGetFlowTableAll).toHaveBeenCalledWith(
      { pageSize: 50, current: 1, classification: [], datasetFilters: { flowType: '' } },
      {},
      'en',
      'my',
      'team-1',
      { flowType: '' },
      'all',
    );
    expect(screen.getByRole('heading', { name: 'Flow Team' })).toBeInTheDocument();
    expect(screen.getByText('Flow One')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('pro-table')).getAllByText('Elementary flow').length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('UNKNOWN_FLOW')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('all-versions')).toHaveLength(2);
    expect(screen.getByTestId('dataset-classification-filter')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Reference Lookup' })).toBeInTheDocument();
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
        { pageSize: 50, current: 1, classification: [], datasetFilters: { flowType: '' } },
        {},
        'en',
        'my',
        'team-1',
        { flowType: '' },
        '20',
      ),
    );

    await user.click(screen.getByRole('checkbox', { name: /ai recommendation/i }));
    expect(screen.getByRole('textbox', { name: /search-input/i })).toHaveAttribute(
      'placeholder',
      'pages.search.placeholder',
    );
  });

  it('uses the current state filter for pgroonga, name-sorted search, unknown-sorted search, and AI recommendation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FlowsPage />);

    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /table-filter/i }));

    await user.click(screen.getByRole('button', { name: 'search' }));
    await waitFor(() =>
      expect(mockGetFlowTablePgroongaSearch).toHaveBeenCalledWith(
        { pageSize: 50, current: 1, classification: [], datasetFilters: { flowType: '' } },
        'en',
        'my',
        'steel',
        { flowType: '' },
        '20',
        undefined,
        'team-1',
      ),
    );

    await user.click(screen.getByRole('button', { name: 'request-filter-sort' }));
    await waitFor(() =>
      expect(mockGetFlowTablePgroongaSearch).toHaveBeenLastCalledWith(
        { pageSize: 50, current: 1, classification: [], datasetFilters: { flowType: '' } },
        'en',
        'my',
        'steel',
        { flowType: '' },
        '20',
        { key: 'baseName', lang: 'en', order: 'asc' },
        'team-1',
      ),
    );

    await user.click(screen.getByRole('button', { name: /request-filter-sort-desc/i }));
    await waitFor(() =>
      expect(mockGetFlowTablePgroongaSearch).toHaveBeenLastCalledWith(
        { pageSize: 50, current: 1, classification: [], datasetFilters: { flowType: '' } },
        'en',
        'my',
        'steel',
        { flowType: '' },
        '20',
        { key: 'baseName', lang: 'en', order: 'desc' },
        'team-1',
      ),
    );

    await user.click(screen.getByRole('button', { name: /request-search-unknown-sort/i }));
    await waitFor(() =>
      expect(mockGetFlowTablePgroongaSearch).toHaveBeenLastCalledWith(
        { pageSize: 50, current: 1, classification: [], datasetFilters: { flowType: '' } },
        'en',
        'my',
        'steel',
        { flowType: '' },
        '20',
        undefined,
        'team-1',
      ),
    );

    await user.click(screen.getByRole('button', { name: /request-inactive-sort/i }));
    await waitFor(() =>
      expect(mockGetFlowTablePgroongaSearch).toHaveBeenLastCalledWith(
        { pageSize: 50, current: 1, classification: [], datasetFilters: { flowType: '' } },
        'en',
        'my',
        'steel',
        { flowType: '' },
        '20',
        undefined,
        'team-1',
      ),
    );

    await user.click(screen.getByRole('checkbox', { name: /ai recommendation/i }));
    await user.click(screen.getByRole('button', { name: 'search' }));
    await waitFor(() =>
      expect(mockFlowHybridSearch).toHaveBeenCalledWith(
        { pageSize: 50, current: 1, classification: [], datasetFilters: { flowType: '' } },
        'en',
        'my',
        'steel',
        { flowType: '' },
        '20',
        'team-1',
      ),
    );
  });

  it('clears the selected flow type and classification when the native allowClear control reports undefined', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FlowsPage />);
    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());
    const typeSelector = screen.getByRole('combobox', { name: 'pages.flow.flowType' });
    await user.selectOptions(typeSelector, 'Elementary flow');
    await user.click(screen.getByTestId('dataset-classification-filter'));
    await waitFor(() =>
      expect(mockGetFlowTableAll.mock.calls.at(-1)[0].classification).toEqual([
        { scope: 'classification', code: 'C', path: ['C'] },
      ]),
    );
    await user.selectOptions(typeSelector, '');
    await waitFor(() =>
      expect(mockGetFlowTableAll).toHaveBeenLastCalledWith(
        { current: 1, pageSize: 50, classification: [], datasetFilters: { flowType: '' } },
        {},
        'en',
        'my',
        'team-1',
        { flowType: '' },
        'all',
      ),
    );
    expect(typeSelector).toHaveValue('');
    expect(screen.getByTestId('dataset-classification-filter')).toHaveAttribute('data-value', '[]');
  });

  it('uses an empty classification filter when the native request omits the optional parameter', async () => {
    mockOmitClassificationParam = true;
    renderWithProviders(<FlowsPage />);
    await waitFor(() =>
      expect(mockGetFlowTableAll).toHaveBeenLastCalledWith(
        { current: 1, pageSize: 50, datasetFilters: { flowType: '' } },
        {},
        'en',
        'my',
        'team-1',
        { flowType: '' },
        'all',
      ),
    );
    expect(mockGetFlowTableAll.mock.calls.at(-1)[0]).not.toHaveProperty('classification');
  });

  it('passes toolbar classification and type through every table request and keeps sort mapping', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FlowsPage />);
    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'pages.flow.flowType' }),
      'Elementary flow',
    );
    await user.click(screen.getByTestId('dataset-classification-filter'));
    await user.click(screen.getByRole('button', { name: 'request-filter-sort' }));
    await waitFor(() =>
      expect(mockGetFlowTableAll).toHaveBeenLastCalledWith(
        expect.objectContaining({
          classification: [{ scope: 'classification', code: 'C', path: ['C'] }],
          datasetFilters: { flowType: 'Elementary flow' },
        }),
        { 'json->flowDataSet->flowInformation->dataSetInformation->name': 'ascend' },
        'en',
        'my',
        'team-1',
        {
          flowType: 'Elementary flow',
          classification: [{ scope: 'classification', code: 'C', path: ['C'] }],
        },
        'all',
      ),
    );
    await user.click(screen.getByRole('button', { name: 'request-unknown-sort' }));
    expect(mockGetFlowTableAll.mock.calls.at(-1)[1]).toEqual({ modifiedAt: 'descend' });
  });

  it('renders my-data row actions and contributes rows successfully or with logged errors', async () => {
    const user = userEvent.setup();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    renderWithProviders(<FlowsPage />);

    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());

    const contributeButtons = await screen.findAllByRole('button', { name: /contribute-action/i });
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
    expect(mockMessageSuccess).toHaveBeenCalledWith('Data contributed to the team successfully.');

    mockContributeSource.mockResolvedValueOnce({ error: { message: 'failed' } });
    await user.click(contributeButtons[0]);
    await waitFor(() =>
      expect(mockContributeSource).toHaveBeenCalledWith('flows', 'flow-1', '01.00.000'),
    );
    expect(logSpy).toHaveBeenCalledWith({ message: 'failed' });

    logSpy.mockRestore();
  });

  it('keeps classification in the shared toolbar when no team title is available', async () => {
    mockGetTeamById.mockResolvedValueOnce({ data: [] });
    renderWithProviders(<FlowsPage />);
    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByTestId('dataset-classification-filter')).toBeInTheDocument();
  });

  it.each(['tg', 'ex'])(
    'keeps read, export and copy actions without authoring controls for %s',
    async (scope) => {
      mockLocation = {
        pathname: '/tgdata/flows',
        search: '',
      };
      mockGetDataSource.mockReturnValue(scope);

      renderWithProviders(<FlowsPage />);

      await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());

      expect(screen.queryByRole('button', { name: /table-filter/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /import-data/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /contribute-action/i })).not.toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'flow-view' })).toHaveLength(2);
      expect(
        screen.getByRole('button', { name: /export-flows-flow-1-01.00.000/i }),
      ).toBeInTheDocument();
    },
  );

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

  it('uses an empty team id for both search modes when the route omits tid', async () => {
    mockLocation = {
      pathname: '/mydata/flows',
      search: '',
    };
    mockGetTeamById.mockResolvedValueOnce({ data: [undefined] });

    renderWithProviders(<FlowsPage />);

    await waitFor(() => expect(mockGetTeamById).toHaveBeenCalledWith(''));
    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: 'search' }));

    await waitFor(() =>
      expect(mockGetFlowTablePgroongaSearch).toHaveBeenCalledWith(
        { pageSize: 50, current: 1, classification: [], datasetFilters: { flowType: '' } },
        'en',
        'my',
        'steel',
        { flowType: '' },
        'all',
        undefined,
        '',
      ),
    );

    await userEvent.click(screen.getByRole('checkbox', { name: /ai recommendation/i }));
    await userEvent.click(screen.getByRole('button', { name: 'search' }));

    await waitFor(() =>
      expect(mockFlowHybridSearch).toHaveBeenCalledWith(
        { pageSize: 50, current: 1, classification: [], datasetFilters: { flowType: '' } },
        'en',
        'my',
        'steel',
        { flowType: '' },
        'all',
        '',
      ),
    );
  });

  it('stages clearing until Enter and rejects an empty Reference submission without changing the list', async () => {
    renderWithProviders(<FlowsPage />);
    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: 'search' }));
    await waitFor(() => expect(mockGetFlowTablePgroongaSearch).toHaveBeenCalledTimes(1));
    const appliedParams = mockCapturedTableProps.params;
    const initialListCount = mockGetFlowTableAll.mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'clear' }));
    expect(mockCapturedTableProps.params).toEqual(appliedParams);
    expect(mockGetFlowTableAll).toHaveBeenCalledTimes(initialListCount);
    expect(mockGetFlowTablePgroongaSearch).toHaveBeenCalledTimes(1);

    await userEvent.type(screen.getByRole('textbox', { name: /search-input/i }), '{enter}');
    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalledTimes(initialListCount + 1));
    const emptyParams = mockCapturedTableProps.params;
    await userEvent.click(screen.getByRole('checkbox', { name: 'Reference Lookup' }));
    await userEvent.type(screen.getByRole('textbox', { name: /search-input/i }), '{enter}');
    expect(mockMessageWarning).toHaveBeenCalledWith(
      'Enter a complete dataset UUID before running Reference Lookup.',
    );
    expect(mockCapturedTableProps.params).toEqual(emptyParams);
    expect(mockGetFlowTableAll).toHaveBeenCalledTimes(initialListCount + 1);
    expect(mockGetFlowTableUuidMentionSearch).not.toHaveBeenCalled();
  });

  it('keeps the applied AI search after unchecking AI until Search submits normal mode', async () => {
    renderWithProviders(<FlowsPage />);
    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('checkbox', { name: /ai recommendation/i }));
    await userEvent.click(screen.getByRole('button', { name: 'search' }));
    await waitFor(() => expect(mockFlowHybridSearch).toHaveBeenCalledTimes(1));
    const appliedParams = mockCapturedTableProps.params;
    act(() => mockCapturedTableProps.pagination.onChange(3, 20));
    await userEvent.click(screen.getByRole('checkbox', { name: /ai recommendation/i }));
    expect(screen.getByRole('checkbox', { name: /ai recommendation/i })).not.toBeChecked();
    expect(mockCapturedTableProps.params).toEqual(appliedParams);
    expect(mockFlowHybridSearch).toHaveBeenCalledTimes(1);
    expect(mockGetFlowTablePgroongaSearch).not.toHaveBeenCalled();

    await act(async () => {
      await mockCapturedTableProps.request(
        { ...mockCapturedTableProps.params, current: 3, pageSize: 20 },
        {},
      );
      await mockCapturedTableProps.actionRef.current.reload();
    });
    expect(mockFlowHybridSearch).toHaveBeenCalledTimes(3);
    expect(mockFlowHybridSearch.mock.calls.at(-2)[0]).toEqual(
      expect.objectContaining({ current: 3, pageSize: 20 }),
    );
    expect(mockFlowHybridSearch.mock.calls.at(-1)[3]).toBe('steel');
    expect(mockGetFlowTablePgroongaSearch).not.toHaveBeenCalled();
    expect(mockCapturedTableProps.columns[0].render(null, {}, 0)).toBe(41);

    await userEvent.click(screen.getByRole('button', { name: 'search' }));
    await waitFor(() => expect(mockGetFlowTablePgroongaSearch).toHaveBeenCalledTimes(1));
    expect(mockGetFlowTablePgroongaSearch.mock.calls.at(-1)[0]).toEqual(
      expect.objectContaining({ current: 1 }),
    );
    expect(mockGetFlowTablePgroongaSearch.mock.calls.at(-1)[3]).toBe('steel');
    expect(mockFlowHybridSearch).toHaveBeenCalledTimes(3);
    expect(mockCapturedTableProps.columns[0].render(null, {}, 0)).toBe(1);
  });

  it('keeps draft modes staged through paging, sorting, classification, and reload until submission', async () => {
    renderWithProviders(<FlowsPage />);
    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());
    const smartSearch = screen.getByRole('checkbox', { name: /ai recommendation/i });
    const referenceSearch = screen.getByRole('checkbox', { name: 'Reference Lookup' });
    const initialParams = mockCapturedTableProps.params;
    const initialListCount = mockGetFlowTableAll.mock.calls.length;
    await userEvent.click(smartSearch);
    await userEvent.click(referenceSearch);
    expect(mockCapturedTableProps.params).toEqual(initialParams);
    expect(mockGetFlowTableAll).toHaveBeenCalledTimes(initialListCount);
    expect(mockFlowHybridSearch).not.toHaveBeenCalled();
    expect(mockGetFlowTableUuidMentionSearch).not.toHaveBeenCalled();

    await userEvent.click(referenceSearch);
    await userEvent.click(screen.getByRole('button', { name: 'search' }));
    await waitFor(() => expect(mockGetFlowTablePgroongaSearch).toHaveBeenCalledTimes(1));
    const normalParams = mockCapturedTableProps.params;
    await userEvent.click(smartSearch);
    expect(mockCapturedTableProps.params).toEqual(normalParams);
    await act(async () => {
      await mockCapturedTableProps.request(
        { ...mockCapturedTableProps.params, current: 3, pageSize: 20 },
        { modifiedAt: 'descend' },
      );
      await mockCapturedTableProps.actionRef.current.reload();
    });
    expect(mockGetFlowTablePgroongaSearch.mock.calls.at(-2)[0]).toEqual(
      expect.objectContaining({ current: 3, pageSize: 20 }),
    );
    expect(mockGetFlowTablePgroongaSearch.mock.calls.at(-1)[3]).toBe('steel');
    expect(mockFlowHybridSearch).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId('dataset-classification-filter'));
    await waitFor(() =>
      expect(mockGetFlowTablePgroongaSearch.mock.calls.at(-1)[0].classification).toEqual([
        { scope: 'classification', code: 'C', path: ['C'] },
      ]),
    );
    expect(mockFlowHybridSearch).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'search' }));
    await waitFor(() => expect(mockFlowHybridSearch).toHaveBeenCalledTimes(1));
    expect(mockFlowHybridSearch.mock.calls.at(-1)[3]).toBe('steel');
    await userEvent.click(screen.getByRole('button', { name: 'search' }));
    await waitFor(() => expect(mockFlowHybridSearch).toHaveBeenCalledTimes(2));
    await userEvent.click(referenceSearch);
    await act(async () => {
      await mockCapturedTableProps.request(
        { ...mockCapturedTableProps.params, current: 2, pageSize: 20 },
        {},
      );
    });
    expect(mockFlowHybridSearch.mock.calls.at(-1)[0]).toEqual(
      expect.objectContaining({ current: 2, pageSize: 20 }),
    );
    expect(mockFlowHybridSearch.mock.calls.at(-1)[3]).toBe('steel');
    expect(mockGetFlowTableUuidMentionSearch).not.toHaveBeenCalled();
  });

  it('uses the main table for reference lookup and retains rows for incomplete UUIDs', async () => {
    const referenceRows = [{ ...flowRows[0], id: 'flow-ref', name: 'Referenced flow' }];
    mockGetFlowTableUuidMentionSearch.mockResolvedValue({
      data: referenceRows,
      success: true,
      total: 1,
      capped: true,
    });

    renderWithProviders(<FlowsPage />);

    await screen.findByText('Flow One');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Reference Lookup' }));
    expect(screen.getByRole('textbox', { name: /search-input/i })).toHaveAttribute(
      'placeholder',
      'pages.search.referenceLookup.placeholder',
    );

    const unappliedParams = mockCapturedTableProps.params;
    const initialListCount = mockGetFlowTableAll.mock.calls.length;
    mockCapturedTableProps.actionRef.current.setPageInfo.mockClear();
    await userEvent.click(screen.getByRole('button', { name: 'search' }));
    await waitFor(() =>
      expect(mockMessageWarning).toHaveBeenCalledWith(
        'Enter a complete dataset UUID before running Reference Lookup.',
      ),
    );
    expect(screen.getByText('Flow One')).toBeInTheDocument();
    expect(mockCapturedTableProps.params).toEqual(unappliedParams);
    expect(mockGetFlowTableAll).toHaveBeenCalledTimes(initialListCount);
    expect(mockCapturedTableProps.actionRef.current.setPageInfo).not.toHaveBeenCalled();
    expect(mockGetFlowTableUuidMentionSearch).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'uuid-lookup' }));
    await waitFor(() =>
      expect(mockGetFlowTableUuidMentionSearch).toHaveBeenCalledWith(
        { pageSize: 50, current: 1, classification: [], datasetFilters: { flowType: '' } },
        'en',
        'my',
        'd1380000-0000-4000-8000-000000000001',
        'all',
        'team-1',
      ),
    );
    expect(await screen.findByText('Referenced flow')).toBeInTheDocument();
    expect(mockMessageInfo).toHaveBeenCalledWith(
      'Showing up to the first 50 reference lookup results.',
    );

    await userEvent.click(screen.getByRole('checkbox', { name: 'AI Recommendation' }));
    await act(async () => {
      await mockCapturedTableProps.request(
        { ...mockCapturedTableProps.params, current: 2, pageSize: 20 },
        { modifiedAt: 'ascend' },
      );
    });
    expect(mockGetFlowTableUuidMentionSearch.mock.calls.at(-1)[0]).toEqual(
      expect.objectContaining({ current: 2, pageSize: 20 }),
    );
    expect(mockGetFlowTableUuidMentionSearch.mock.calls.at(-1)[3]).toBe(
      'd1380000-0000-4000-8000-000000000001',
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Reference Lookup' }));
    const appliedParams = mockCapturedTableProps.params;
    const appliedLookupCount = mockGetFlowTableUuidMentionSearch.mock.calls.length;
    act(() => mockCapturedTableProps.pagination.onChange(3, 20));
    mockCapturedTableProps.actionRef.current.setPageInfo.mockClear();
    await userEvent.click(screen.getByRole('button', { name: 'search' }));
    expect(screen.getAllByText('Referenced flow').length).toBeGreaterThan(0);
    expect(mockCapturedTableProps.params).toEqual(appliedParams);
    expect(mockGetFlowTableUuidMentionSearch).toHaveBeenCalledTimes(appliedLookupCount);
    expect(mockCapturedTableProps.actionRef.current.setPageInfo).not.toHaveBeenCalled();
    expect(mockCapturedTableProps.columns[0].render(null, {}, 0)).toBe(41);

    const callCountBeforeUncappedLookup = mockGetFlowTableUuidMentionSearch.mock.calls.length;
    mockGetFlowTableUuidMentionSearch.mockResolvedValue({
      data: referenceRows,
      success: true,
      total: 1,
      capped: false,
    });
    await userEvent.click(screen.getByRole('button', { name: 'uuid-lookup' }));
    await waitFor(() =>
      expect(mockGetFlowTableUuidMentionSearch.mock.calls.length).toBeGreaterThan(
        callCountBeforeUncappedLookup,
      ),
    );
    expect(mockCapturedTableProps.columns[0].render(null, {}, 0)).toBe(1);
  });
});

jest.mock('@/components/DatasetClassificationFilter', () => ({
  __esModule: true,
  default: ({ onChange, value }: any) => (
    <button
      type='button'
      data-testid='dataset-classification-filter'
      data-value={JSON.stringify(value)}
      onClick={() => onChange([{ scope: 'classification', code: 'C', path: ['C'] }])}
    >
      Filter classification
    </button>
  ),
}));
