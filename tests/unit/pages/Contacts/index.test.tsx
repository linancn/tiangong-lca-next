// @ts-nocheck
import ContactsPage from '@/pages/Contacts';
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

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

let latestReloadMock: jest.Mock | null = null;
let mockLocation = {
  pathname: '/mydata/contacts',
  search: '?tid=team-1',
};
let mockIntlLocale = 'en-US';
let mockBreakpointScreens: Record<string, boolean | undefined> = {};

const mockContributeSource = jest.fn();
const mockGetContactTableAll = jest.fn();
const mockGetContactTablePgroongaSearch = jest.fn();
const mockContactHybridSearch = jest.fn();
const mockGetContactTableUuidMentionSearch = jest.fn();
const mockGetDataSource = jest.fn(() => 'my');
const mockGetLang = jest.fn(() => 'en');
const mockGetLangText = jest.fn((value: any) => value?.[0]?.['#text'] ?? 'Team title');
const mockGetTeamById = jest.fn();
const mockDatasetUuidMentionSearch = jest.fn();

const baseContactRow = {
  id: 'contact-1',
  version: '1.0.0',
  shortName: 'Alice',
  name: 'Alice Team Contact',
  classification: 'Stakeholder',
  email: 'alice@example.com',
  modifiedAt: '2024-01-01',
  teamId: '',
};

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    locale: mockIntlLocale,
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
  useLocation: () => mockLocation,
}));

jest.mock('@/services/contacts/api', () => ({
  __esModule: true,
  getContactTableAll: (...args: any[]) => mockGetContactTableAll(...args),
  getContactTablePgroongaSearch: (...args: any[]) => mockGetContactTablePgroongaSearch(...args),
  contact_hybrid_search: (...args: any[]) => mockContactHybridSearch(...args),
  getContactTableUuidMentionSearch: (...args: any[]) =>
    mockGetContactTableUuidMentionSearch(...args),
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

jest.mock('@/components/AllVersions', () => ({
  __esModule: true,
  default: function MockAllVersions({
    addVersionComponent,
    operationColumnWidth,
    operationRender,
  }: any) {
    const React = require('react');
    const [showOperation, setShowOperation] = React.useState(false);
    const allVersionsActionRef = React.useMemo(
      () => ({
        current: {
          reload: () => undefined,
        },
      }),
      [],
    );

    return (
      <div data-testid='all-versions' data-operation-column-width={operationColumnWidth}>
        <button type='button' onClick={() => setShowOperation(true)}>
          render-all-version-actions
        </button>
        {showOperation && (
          <div data-testid='all-version-operation-render'>
            {operationRender?.(
              {
                id: 'contact-version',
                version: '0.9.0',
                teamId: '',
                stateCode: 10,
              },
              { actionRef: allVersionsActionRef },
            )}
          </div>
        )}
        {addVersionComponent?.({ newVersion: '02.00.000' })}
      </div>
    );
  },
}));

jest.mock('@/components/ContributeData', () => ({
  __esModule: true,
  default: ({ onOk, disabled }: any) => (
    <button type='button' disabled={disabled} onClick={() => void onOk?.()}>
      contribute-action
    </button>
  ),
}));

jest.mock('@/components/ExportData', () => ({
  __esModule: true,
  default: ({ id, version }: any) => (
    <div data-testid='export-data'>{`export:${id}:${version}`}</div>
  ),
}));

jest.mock('@/components/ImportData', () => ({
  __esModule: true,
  default: ({ onJsonData }: any) => (
    <button type='button' onClick={() => onJsonData?.([{ contactDataSet: {} }])}>
      import-data
    </button>
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

jest.mock('@/pages/Contacts/Components/create', () => ({
  __esModule: true,
  default: ({ actionType = 'create', importData, newVersion, onClose }: any) => (
    <div data-testid='contact-create'>
      {JSON.stringify({
        actionType,
        importCount: importData?.length ?? 0,
        newVersion,
      })}
      <button type='button' onClick={() => onClose?.()}>
        close-contact-create
      </button>
    </div>
  ),
}));

jest.mock('@/pages/Contacts/Components/delete', () => ({
  __esModule: true,
  default: ({ id, setViewDrawerVisible }: any) => (
    <div data-testid='contact-delete'>
      {`delete:${id}`}
      <button type='button' onClick={() => setViewDrawerVisible?.(false)}>
        close-contact-delete
      </button>
    </div>
  ),
}));

jest.mock('@/pages/Contacts/Components/edit', () => ({
  __esModule: true,
  default: ({ id, setViewDrawerVisible }: any) => (
    <div data-testid='contact-edit'>
      {`edit:${id}`}
      <button type='button' onClick={() => setViewDrawerVisible?.(false)}>
        close-contact-edit
      </button>
    </div>
  ),
}));

jest.mock('@/pages/Contacts/Components/view', () => ({
  __esModule: true,
  default: ({ id }: any) => <div data-testid='contact-view'>{`view:${id}`}</div>,
}));

jest.mock('antd', () => {
  const React = require('react');

  const ConfigProvider = ({ children }: any) => <div>{children}</div>;
  const Card = ({ children }: any) => <section>{children}</section>;
  const Col = ({ children }: any) => <div>{children}</div>;
  const Row = ({ children }: any) => <div>{children}</div>;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Tooltip = ({ title, children }: any) => <div title={toText(title)}>{children}</div>;

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
      <button type='button' onClick={() => onSearch?.('alice')}>
        search
      </button>
      <button type='button' onClick={() => onSearch?.('D1380000-0000-4000-8000-000000000001')}>
        uuid-lookup
      </button>
    </div>
  );
  const Input = { Search };

  const message = {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
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
      <h1>{toText(header?.title)}</h1>
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
    columns = [],
    toolbar,
    toolBarRender,
    headerTitle,
    rowKey,
    pagination,
  }: any) => {
    mockCapturedTableProps = { columns, pagination, params, request, actionRef };
    const [rows, setRows] = React.useState<any[]>([]);
    const headerTitleText = toText(headerTitle);
    const paramsKey = JSON.stringify(params);
    const latestRequestRef = React.useRef(request);
    const latestParamsRef = React.useRef(params);
    latestRequestRef.current = request;
    latestParamsRef.current = params;

    const api = React.useMemo(
      () => ({
        reload: jest.fn(async () => {
          const result = await latestRequestRef.current?.(
            { ...latestParamsRef.current, pageSize: 50, current: 1 },
            {},
          );
          setRows(result?.data ?? []);
          return result;
        }),
        setPageInfo: jest.fn(),
      }),
      [],
    );

    React.useEffect(() => {
      latestReloadMock = api.reload;
      if (actionRef) {
        actionRef.current = api;
      }
      void api.reload();
    }, [actionRef, api, headerTitleText, paramsKey]);

    return (
      <section data-testid='pro-table'>
        <div>{headerTitleText}</div>
        <div>
          {toolbar?.search}
          {toolbar?.filter}
          {toolBarRender?.()}
        </div>
        {rows.map((row: any, rowIndex: number) => (
          <div key={rowKey?.(row) ?? `${row.id}-${rowIndex}`}>
            {columns.map((column: any, columnIndex: number) => (
              <div key={`${row.id}-${columnIndex}`}>
                {column.render
                  ? column.render(row[column.dataIndex], row, rowIndex)
                  : row[column.dataIndex]}
              </div>
            ))}
          </div>
        ))}
      </section>
    );
  };

  return {
    __esModule: true,
    PageContainer,
    ProTable,
    TableDropdown,
  };
});

describe('ContactsPage', () => {
  beforeEach(() => {
    mockCapturedTableProps = undefined;
    jest.clearAllMocks();
    latestReloadMock = null;
    mockLocation = {
      pathname: '/mydata/contacts',
      search: '?tid=team-1',
    };
    mockIntlLocale = 'en-US';
    mockBreakpointScreens = {};
    mockGetDataSource.mockReturnValue('my');
    mockGetLang.mockReturnValue('en');
    mockGetLangText.mockImplementation((value: any) => value?.[0]?.['#text'] ?? 'Team title');
    mockGetTeamById.mockResolvedValue({
      data: [{ json: { title: [{ '@xml:lang': 'en', '#text': 'Contact Team' }] } }],
    });
    mockGetContactTableAll.mockResolvedValue({ data: [baseContactRow], success: true });
    mockGetContactTablePgroongaSearch.mockResolvedValue({ data: [baseContactRow], success: true });
    mockContactHybridSearch.mockResolvedValue({ data: [baseContactRow], success: true });
    mockGetContactTableUuidMentionSearch.mockResolvedValue({ data: [], success: true, total: 0 });
    mockContributeSource.mockResolvedValue({ error: null });
  });

  it('keeps the Open Data catalog route and classification control without a source toggle', async () => {
    mockGetDataSource.mockReturnValue('tg');
    mockLocation = { pathname: '/tgdata/contacts', search: '' };
    renderWithProviders(<ContactsPage />);
    await waitFor(() => expect(mockGetContactTableAll).toHaveBeenCalled());
    expect(mockGetContactTableAll.mock.calls.at(-1)?.at(-1)).toBe(true);
    expect(screen.getByTestId('dataset-classification-filter')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^(All data|Enterprise data|Literature data)$/i }),
    ).not.toBeInTheDocument();
  });

  it('uses the shared six-column native pagination layout and sends toolbar classification to the complete query', async () => {
    renderWithProviders(<ContactsPage />);
    await waitFor(() => expect(mockGetContactTableAll).toHaveBeenCalled());
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
      expect(mockGetContactTableAll.mock.calls.at(-1)?.[0]).toEqual(
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

    renderWithProviders(<ContactsPage />);

    await waitFor(() => expect(mockGetLang).toHaveBeenCalledWith('en-US'));
  });

  it('loads the default table and row actions', async () => {
    renderWithProviders(<ContactsPage />);

    await waitFor(() => expect(mockGetTeamById).toHaveBeenCalledWith('team-1'));
    await waitFor(() => expect(mockGetContactTableAll).toHaveBeenCalled());

    expect(mockGetContactTableAll).toHaveBeenCalledWith(
      { pageSize: 50, current: 1, classification: [] },
      {},
      'en',
      'my',
      'team-1',
      'all',
    );

    expect(screen.getByRole('heading', { name: 'Contact Team' })).toBeInTheDocument();
    expect(await screen.findByTestId('contact-view')).toHaveTextContent('view:contact-1');
    expect(screen.getByTestId('all-versions')).toHaveAttribute(
      'data-operation-column-width',
      '216',
    );
    expect(screen.getByTestId('contact-edit')).toHaveTextContent('edit:contact-1');
    expect(screen.getByTestId('contact-delete')).toHaveTextContent('delete:contact-1');
    expect(screen.getAllByTestId('contact-create')[0]).toHaveTextContent('"actionType":"create"');
    expect(screen.getByRole('checkbox', { name: 'AI Recommendation' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Reference Lookup' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /close-contact-edit/i }));
    await userEvent.click(screen.getByRole('button', { name: /close-contact-delete/i }));
  });

  it('renders all-version rows with the same contact actions as the outer list', async () => {
    renderWithProviders(<ContactsPage />);

    await screen.findByTestId('contact-view');
    await userEvent.click(screen.getByRole('button', { name: /render-all-version-actions/i }));

    const allVersionActions = screen.getByTestId('all-version-operation-render');
    expect(within(allVersionActions).getByTestId('contact-view')).toHaveTextContent(
      'view:contact-version',
    );
    expect(within(allVersionActions).getByTestId('contact-edit')).toHaveTextContent(
      'edit:contact-version',
    );
    expect(within(allVersionActions).getByTestId('contact-delete')).toHaveTextContent(
      'delete:contact-version',
    );
    expect(within(allVersionActions).getByTestId('export-data')).toHaveTextContent(
      'export:contact-version:0.9.0',
    );
    expect(within(allVersionActions).getByTestId('contact-create')).toHaveTextContent(
      '"actionType":"copy"',
    );
    expect(
      within(allVersionActions).getByRole('button', { name: /contribute-action/i }),
    ).toBeInTheDocument();
  });

  it('uses compact mobile controls for my data rows', async () => {
    mockBreakpointScreens = { md: false };

    renderWithProviders(<ContactsPage />);

    await waitFor(() => expect(mockGetContactTableAll).toHaveBeenCalled());
    expect(await screen.findByTestId('contact-view')).toHaveTextContent('view:contact-1');
    expect(screen.getByRole('button', { name: /table-filter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import-data/i })).toBeInTheDocument();
  });

  it('supports pgroonga search and contribute flows', async () => {
    renderWithProviders(<ContactsPage />);

    await screen.findByTestId('contact-view');

    await userEvent.click(screen.getByRole('button', { name: /table-filter/i }));
    await waitFor(() =>
      expect(mockGetContactTableAll).toHaveBeenLastCalledWith(
        { pageSize: 50, current: 1, classification: [] },
        {},
        'en',
        'my',
        'team-1',
        '20',
      ),
    );

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /contribute-action/i }));
    });

    await waitFor(() =>
      expect(mockContributeSource).toHaveBeenCalledWith('contacts', 'contact-1', '1.0.0'),
    );
    const { message } = jest.requireMock('antd');
    expect(message.success).toHaveBeenCalledWith('Data contributed to the team successfully.');
    expect(latestReloadMock).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() =>
      expect(mockGetContactTablePgroongaSearch).toHaveBeenCalledWith(
        { pageSize: 50, current: 1, classification: [] },
        'en',
        'my',
        'alice',
        {},
        '20',
        'team-1',
      ),
    );
  });

  it('uses an empty team id for pgroonga search when the route omits tid', async () => {
    mockLocation = { pathname: '/mydata/contacts', search: '' };

    renderWithProviders(<ContactsPage />);

    await userEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() =>
      expect(mockGetContactTablePgroongaSearch).toHaveBeenCalledWith(
        { pageSize: 50, current: 1, classification: [] },
        'en',
        'my',
        'alice',
        {},
        'all',
        '',
      ),
    );
  });

  it('routes smart search to hybrid search and keeps search modes mutually exclusive', async () => {
    renderWithProviders(<ContactsPage />);

    const smartSearch = screen.getByRole('checkbox', { name: 'AI Recommendation' });
    const referenceSearch = screen.getByRole('checkbox', { name: 'Reference Lookup' });
    await userEvent.click(smartSearch);

    expect(smartSearch).toBeChecked();
    expect(referenceSearch).not.toBeChecked();
    expect(screen.getByRole('textbox', { name: /search-input/i })).toHaveAttribute(
      'placeholder',
      'pages.search.placeholder',
    );

    await userEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() =>
      expect(mockContactHybridSearch).toHaveBeenCalledWith(
        { pageSize: 50, current: 1, classification: [] },
        'en',
        'my',
        'alice',
        {},
        'all',
        'team-1',
      ),
    );
    expect(mockGetContactTablePgroongaSearch).not.toHaveBeenCalled();

    await userEvent.click(smartSearch);
    expect(smartSearch).not.toBeChecked();
    await userEvent.click(smartSearch);
    await userEvent.click(referenceSearch);
    expect(smartSearch).not.toBeChecked();
    expect(referenceSearch).toBeChecked();
    await userEvent.click(referenceSearch);
    expect(referenceSearch).not.toBeChecked();
  });

  it('uses an empty team id for smart search when the route omits tid', async () => {
    mockLocation = { pathname: '/mydata/contacts', search: '' };
    renderWithProviders(<ContactsPage />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'AI Recommendation' }));
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() =>
      expect(mockContactHybridSearch).toHaveBeenCalledWith(
        { pageSize: 50, current: 1, classification: [] },
        'en',
        'my',
        'alice',
        {},
        'all',
        '',
      ),
    );
  });

  it('persists imported json into create and reloads with the selected state filter', async () => {
    renderWithProviders(<ContactsPage />);

    await userEvent.click(screen.getByRole('button', { name: /import-data/i }));
    expect(screen.getAllByTestId('contact-create')[0]).toHaveTextContent('"importCount":1');

    await userEvent.click(screen.getByRole('button', { name: /table-filter/i }));
    await waitFor(() =>
      expect(mockGetContactTableAll).toHaveBeenLastCalledWith(
        { pageSize: 50, current: 1, classification: [] },
        {},
        'en',
        'my',
        'team-1',
        '20',
      ),
    );

    await userEvent.click(
      within(screen.getAllByTestId('contact-create')[0]).getByRole('button', {
        name: /close-contact-create/i,
      }),
    );
    expect(screen.getAllByTestId('contact-create')[0]).toHaveTextContent('"importCount":0');
  });

  it.each(['tg', 'ex'])(
    'renders the %s toolbar variant without edit, delete, or contribute actions',
    async (scope) => {
      mockLocation = {
        pathname: '/tgdata/contacts',
        search: '',
      };
      mockGetDataSource.mockReturnValue(scope);
      mockGetTeamById.mockResolvedValue({ data: [] });

      renderWithProviders(<ContactsPage />);

      await waitFor(() => expect(mockGetContactTableAll).toHaveBeenCalled());
      expect(await screen.findByTestId('contact-view')).toHaveTextContent('view:contact-1');
      expect(screen.queryByTestId('contact-edit')).not.toBeInTheDocument();
      expect(screen.queryByTestId('contact-delete')).not.toBeInTheDocument();
      expect(
        screen
          .getAllByTestId('contact-create')
          .find((node) => node.textContent?.includes('"actionType":"copy"')),
      ).toBeTruthy();
      expect(screen.queryByRole('button', { name: /table-filter/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /import-data/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /contribute-action/i })).not.toBeInTheDocument();
    },
  );

  it('logs contribute failures without showing success for my data rows', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockContributeSource.mockResolvedValue({ error: { message: 'contribute failed' } });

    renderWithProviders(<ContactsPage />);

    await screen.findByTestId('contact-view');
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /contribute-action/i }));
    });

    await waitFor(() =>
      expect(mockContributeSource).toHaveBeenCalledWith('contacts', 'contact-1', '1.0.0'),
    );
    const { message } = jest.requireMock('antd');
    expect(message.success).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith({ message: 'contribute failed' });
    consoleLogSpy.mockRestore();
  });

  it('keeps clear as an edit and applies empty input only on Enter', async () => {
    renderWithProviders(<ContactsPage />);
    await waitFor(() => expect(mockCapturedTableProps.actionRef.current).toBeDefined());
    await userEvent.click(screen.getByRole('button', { name: 'search' }));
    const reload = mockCapturedTableProps.actionRef.current.reload;
    const count = reload.mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'clear' }));
    expect(reload).toHaveBeenCalledTimes(count);
    await userEvent.type(screen.getByRole('textbox', { name: 'search-input' }), '{enter}');
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(count + 1));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Reference Lookup' }));
    await userEvent.click(screen.getByRole('button', { name: 'clear' }));
    expect(jest.requireMock('antd').message.warning).not.toHaveBeenCalled();
    await userEvent.type(screen.getByRole('textbox', { name: 'search-input' }), '{enter}');
    expect(jest.requireMock('antd').message.warning).toHaveBeenCalled();
    expect(reload).toHaveBeenCalledTimes(count + 1);
  });

  it('keeps draft modes staged across paging, sorting, classification, and reload until submission', async () => {
    renderWithProviders(<ContactsPage />);
    await waitFor(() => expect(mockGetContactTableAll).toHaveBeenCalled());
    const smartSearch = screen.getByRole('checkbox', { name: 'AI Recommendation' });
    const referenceSearch = screen.getByRole('checkbox', { name: 'Reference Lookup' });
    const initialReloadCount = mockCapturedTableProps.actionRef.current.reload.mock.calls.length;
    await userEvent.click(smartSearch);
    await userEvent.click(referenceSearch);
    await userEvent.click(screen.getByRole('button', { name: 'clear' }));
    expect(jest.requireMock('antd').message.warning).not.toHaveBeenCalled();
    expect(mockCapturedTableProps.actionRef.current.reload).toHaveBeenCalledTimes(
      initialReloadCount,
    );
    expect(mockContactHybridSearch).not.toHaveBeenCalled();
    expect(mockGetContactTableUuidMentionSearch).not.toHaveBeenCalled();

    await userEvent.click(referenceSearch);
    await userEvent.click(screen.getByRole('button', { name: 'search' }));
    await waitFor(() => expect(mockGetContactTablePgroongaSearch).toHaveBeenCalled());
    await userEvent.click(smartSearch);
    await act(async () => {
      await mockCapturedTableProps.request(
        { ...mockCapturedTableProps.params, current: 3, pageSize: 20 },
        { modifiedAt: 'descend' },
      );
      await mockCapturedTableProps.actionRef.current.reload();
    });
    expect(mockGetContactTablePgroongaSearch.mock.calls.at(-2)[0]).toEqual(
      expect.objectContaining({ current: 3, pageSize: 20 }),
    );
    expect(mockGetContactTablePgroongaSearch.mock.calls.at(-1)[3]).toBe('alice');
    expect(mockContactHybridSearch).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId('dataset-classification-filter'));
    await waitFor(() =>
      expect(mockGetContactTablePgroongaSearch.mock.calls.at(-1)[0].classification).toEqual([
        { scope: 'classification', code: 'C', path: ['C'] },
      ]),
    );
    expect(mockContactHybridSearch).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'search' }));
    await waitFor(() => expect(mockContactHybridSearch).toHaveBeenCalled());
    expect(mockContactHybridSearch.mock.calls.at(-1)[3]).toBe('alice');
    const appliedCount = mockContactHybridSearch.mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'search' }));
    await waitFor(() => expect(mockContactHybridSearch).toHaveBeenCalledTimes(appliedCount + 1));
    await userEvent.click(referenceSearch);
    await act(async () => {
      await mockCapturedTableProps.request(
        { ...mockCapturedTableProps.params, current: 2, pageSize: 20 },
        {},
      );
    });
    expect(mockContactHybridSearch.mock.calls.at(-1)[0]).toEqual(
      expect.objectContaining({ current: 2, pageSize: 20 }),
    );
    expect(mockContactHybridSearch.mock.calls.at(-1)[3]).toBe('alice');
    expect(mockGetContactTableUuidMentionSearch).not.toHaveBeenCalled();
  });

  it('uses the main table for reference lookup and retains rows for incomplete UUIDs', async () => {
    const { message } = jest.requireMock('antd');
    const referenceRows = [
      { ...baseContactRow, id: 'contact-ref', shortName: 'Referenced contact' },
    ];
    mockGetContactTableUuidMentionSearch.mockResolvedValue({
      data: referenceRows,
      success: true,
      total: 1,
      capped: true,
    });

    renderWithProviders(<ContactsPage />);

    await screen.findByTestId('contact-view');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Reference Lookup' }));
    expect(screen.getByRole('textbox', { name: /search-input/i })).toHaveAttribute(
      'placeholder',
      'pages.search.referenceLookup.placeholder',
    );

    const initialReloadCount = mockCapturedTableProps.actionRef.current.reload.mock.calls.length;
    mockCapturedTableProps.actionRef.current.setPageInfo.mockClear();
    await userEvent.click(screen.getByRole('button', { name: 'search' }));
    await waitFor(() =>
      expect(message.warning).toHaveBeenCalledWith(
        'Enter a complete dataset UUID before running Reference Lookup.',
      ),
    );
    expect(screen.getByTestId('contact-view')).toBeInTheDocument();
    expect(mockCapturedTableProps.actionRef.current.reload).toHaveBeenCalledTimes(
      initialReloadCount,
    );
    expect(mockCapturedTableProps.actionRef.current.setPageInfo).not.toHaveBeenCalled();
    expect(mockGetContactTableUuidMentionSearch).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'uuid-lookup' }));
    await waitFor(() =>
      expect(mockGetContactTableUuidMentionSearch).toHaveBeenCalledWith(
        { pageSize: 50, current: 1, classification: [] },
        'en',
        'my',
        'd1380000-0000-4000-8000-000000000001',
        'all',
        'team-1',
      ),
    );
    expect(await screen.findByText('Referenced contact')).toBeInTheDocument();
    expect(message.info).toHaveBeenCalledWith(
      'Showing up to the first 50 reference lookup results.',
    );

    await userEvent.click(screen.getByRole('checkbox', { name: 'AI Recommendation' }));
    await act(async () => {
      await mockCapturedTableProps.request(
        { ...mockCapturedTableProps.params, current: 2, pageSize: 20 },
        { modifiedAt: 'ascend' },
      );
    });
    expect(mockGetContactTableUuidMentionSearch.mock.calls.at(-1)[0]).toEqual(
      expect.objectContaining({ current: 2, pageSize: 20 }),
    );
    expect(mockGetContactTableUuidMentionSearch.mock.calls.at(-1)[3]).toBe(
      'd1380000-0000-4000-8000-000000000001',
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Reference Lookup' }));

    const appliedReloadCount = mockCapturedTableProps.actionRef.current.reload.mock.calls.length;
    const appliedLookupCount = mockGetContactTableUuidMentionSearch.mock.calls.length;
    act(() => mockCapturedTableProps.pagination.onChange(3, 20));
    expect(mockCapturedTableProps.columns[0].render(null, {}, 0)).toBe(41);
    mockCapturedTableProps.actionRef.current.setPageInfo.mockClear();
    await userEvent.click(screen.getByRole('button', { name: 'search' }));
    expect(screen.getByText('Referenced contact')).toBeInTheDocument();
    expect(mockCapturedTableProps.actionRef.current.reload).toHaveBeenCalledTimes(
      appliedReloadCount,
    );
    expect(mockGetContactTableUuidMentionSearch).toHaveBeenCalledTimes(appliedLookupCount);
    expect(mockCapturedTableProps.actionRef.current.setPageInfo).not.toHaveBeenCalled();
    expect(mockCapturedTableProps.columns[0].render(null, {}, 0)).toBe(41);

    const callCountBeforeUncappedLookup = mockGetContactTableUuidMentionSearch.mock.calls.length;
    mockGetContactTableUuidMentionSearch.mockResolvedValue({
      data: referenceRows,
      success: true,
      total: 1,
      capped: false,
    });
    await userEvent.click(screen.getByRole('button', { name: 'uuid-lookup' }));
    await waitFor(() =>
      expect(mockGetContactTableUuidMentionSearch.mock.calls.length).toBeGreaterThan(
        callCountBeforeUncappedLookup,
      ),
    );
    expect(mockCapturedTableProps.columns[0].render(null, {}, 0)).toBe(1);
    expect(mockCapturedTableProps.actionRef.current.setPageInfo).toHaveBeenCalledWith({
      current: 1,
    });
  });

  it('renders missing base metadata without a row classification column', async () => {
    mockGetContactTableAll.mockResolvedValue({
      data: [{ ...baseContactRow, classification: 'undefined' }],
      success: true,
    });

    renderWithProviders(<ContactsPage />);

    expect((await screen.findAllByText('—')).length).toBeGreaterThan(0);
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
