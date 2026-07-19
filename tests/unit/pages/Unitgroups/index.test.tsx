// @ts-nocheck
import UnitgroupsPage from '@/pages/Unitgroups';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

let mockLocation = {
  pathname: '/mydata/unitgroups',
  search: '?tid=team-1',
};
let mockIntlLocale = 'en-US';
let mockBreakpointScreens: Record<string, boolean | undefined> = {};
let mockUnitGroupCreateCalls: any[] = [];
let mockUnitGroupEditCalls: any[] = [];
let mockUnitGroupDeleteCalls: any[] = [];
let mockUnitGroupViewCalls: any[] = [];
let mockAllVersionsOperationWidths: Array<number | undefined> = [];

const mockContributeSource = jest.fn();
const mockGetDataSource = jest.fn(() => 'my');
const mockGetLang = jest.fn(() => 'en');
const mockGetLangText = jest.fn((value: any) => value?.[0]?.['#text'] ?? 'Team title');
const mockGetRoleByUserId = jest.fn();
const mockGetTeamById = jest.fn();
const mockGetUnitGroupTableAll = jest.fn();
const mockGetUnitGroupTablePgroongaSearch = jest.fn();
const mockGetUnitGroupTableUuidMentionSearch = jest.fn();
const mockDatasetUuidMentionSearch = jest.fn();

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    locale: mockIntlLocale,
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
  useLocation: () => mockLocation,
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

jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  getRoleByUserId: (...args: any[]) => mockGetRoleByUserId(...args),
}));

jest.mock('@/services/teams/api', () => ({
  __esModule: true,
  getTeamById: (...args: any[]) => mockGetTeamById(...args),
}));

jest.mock('@/services/unitgroups/api', () => ({
  __esModule: true,
  getUnitGroupTableAll: (...args: any[]) => mockGetUnitGroupTableAll(...args),
  getUnitGroupTablePgroongaSearch: (...args: any[]) => mockGetUnitGroupTablePgroongaSearch(...args),
  getUnitGroupTableUuidMentionSearch: (...args: any[]) =>
    mockGetUnitGroupTableUuidMentionSearch(...args),
}));

jest.mock('@/components/AlignedNumber', () => ({
  __esModule: true,
  toSuperscript: jest.fn((value: string) => `super(${value})`),
}));

jest.mock('@/components/AllVersions', () => ({
  __esModule: true,
  default: ({ addVersionComponent, disabled, operationColumnWidth, operationRender }: any) => {
    mockAllVersionsOperationWidths.push(operationColumnWidth);
    operationRender?.(
      {
        id: 'ug-version',
        version: '0.9.0',
        name: 'Historical unit group',
        refUnitName: 'cm',
        refUnitGeneralComment: 'Historical unit',
        classification: 'Historical',
        modifiedAt: '2024-01-03',
        teamId: '',
      },
      { actionRef: { current: { reload: jest.fn() } } },
    );

    return (
      <div data-testid='all-versions'>
        <span>{`versions-disabled:${String(disabled)}`}</span>
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
  default: ({ onJsonData, disabled }: any) => (
    <button
      type='button'
      disabled={disabled}
      onClick={() => onJsonData?.([{ unitGroupDataSet: { unitGroupInformation: {} } }])}
    >
      import-data
    </button>
  ),
}));

jest.mock('@/components/TableFilter', () => ({
  __esModule: true,
  default: ({ onChange, disabled }: any) => (
    <button type='button' disabled={disabled} onClick={() => onChange?.('20')}>
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

jest.mock('@/pages/Unitgroups/Components/create', () => ({
  __esModule: true,
  default: (props: any) => {
    mockUnitGroupCreateCalls.push(props);
    const { actionType = 'create', importData, newVersion, disabled } = props;
    return (
      <div data-testid='unitgroup-create'>
        {JSON.stringify({
          actionType,
          importCount: importData?.length ?? 0,
          newVersion,
          disabled: !!disabled,
        })}
      </div>
    );
  },
}));

jest.mock('@/pages/Unitgroups/Components/delete', () => ({
  __esModule: true,
  default: (props: any) => {
    mockUnitGroupDeleteCalls.push(props);
    return <div data-testid='unitgroup-delete'>{`delete:${props.id}`}</div>;
  },
}));

jest.mock('@/pages/Unitgroups/Components/edit', () => ({
  __esModule: true,
  default: (props: any) => {
    mockUnitGroupEditCalls.push(props);
    return <div data-testid='unitgroup-edit'>{`edit:${props.id}`}</div>;
  },
}));

jest.mock('@/pages/Unitgroups/Components/view', () => ({
  __esModule: true,
  default: (props: any) => {
    mockUnitGroupViewCalls.push(props);
    return (
      <div data-testid='unitgroup-view'>
        {`view:${props.id}`}
        {props.autoOpen ? (
          <button type='button' onClick={() => props.onDrawerClose?.()}>
            unitgroup-view-close
          </button>
        ) : null}
      </div>
    );
  },
}));

jest.mock('antd', () => {
  const React = require('react');

  const ConfigProvider = ({ children }: any) => <div>{children}</div>;
  const Card = ({ children }: any) => <section>{children}</section>;
  const Col = ({ children }: any) => <div>{children}</div>;
  const Row = ({ children }: any) => <div>{children}</div>;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Tooltip = ({ title, children }: any) => {
    const label = toText(title);
    return <div title={label}>{children}</div>;
  };

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

  const Search = ({ onSearch, placeholder, disabled }: any) => (
    <div>
      <input aria-label='search-input' disabled={disabled} placeholder={placeholder} />
      <button type='button' disabled={disabled} onClick={() => onSearch?.('density')}>
        search
      </button>
      <button
        type='button'
        disabled={disabled}
        onClick={() => onSearch?.('D1380000-0000-4000-8000-000000000001')}
      >
        uuid-lookup
      </button>
    </div>
  );
  const Input = { Search };

  const message = {
    success: jest.fn(),
    error: jest.fn(),
  };

  const theme = {
    useToken: () => ({
      token: {
        colorPrimary: '#1677ff',
        red: '#ff4d4f',
        fontSize: 14,
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
    toolBarRender,
    headerTitle,
    rowKey,
  }: any) => {
    const [rows, setRows] = React.useState<any[]>([]);
    const requestRef = React.useRef(request);
    const paramsRef = React.useRef(params);
    const pageInfoRef = React.useRef({ pageSize: 10, current: 1 });

    requestRef.current = request;
    paramsRef.current = params;

    const reload = React.useMemo(
      () =>
        jest.fn(async () => {
          const result = await requestRef.current?.(
            { ...pageInfoRef.current, ...paramsRef.current },
            {},
          );
          if (result?.success !== false) {
            setRows(result?.data ?? []);
          }
          return result;
        }),
      [],
    );
    const paramsKey = JSON.stringify(params);

    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = {
          reload,
          setPageInfo: jest.fn((nextPageInfo: any) => {
            pageInfoRef.current = { ...pageInfoRef.current, ...nextPageInfo };
          }),
        };
      }
      void reload();
    }, [actionRef, paramsKey, reload]);

    return (
      <section data-testid='pro-table'>
        <div>{toText(headerTitle)}</div>
        <div>{toolBarRender?.()}</div>
        {rows.map((row, rowIndex) => (
          <div
            key={String(rowKey ? rowKey(row) : `${row.id}-${rowIndex}`)}
            data-row-key={String(rowKey ? rowKey(row) : `${row.id}-${rowIndex}`)}
          >
            {columns.map((column: any, columnIndex: number) => (
              <div key={`${row.id}-${columnIndex}`}>
                {column.render ? column.render(undefined, row) : row[column.dataIndex]}
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

describe('UnitgroupsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUnitGroupCreateCalls = [];
    mockUnitGroupEditCalls = [];
    mockUnitGroupDeleteCalls = [];
    mockUnitGroupViewCalls = [];
    mockAllVersionsOperationWidths = [];
    mockLocation = {
      pathname: '/mydata/unitgroups',
      search: '?tid=team-1',
    };
    mockIntlLocale = 'en-US';
    mockBreakpointScreens = {};
    mockGetDataSource.mockReturnValue('my');
    mockGetLang.mockReturnValue('en');
    mockGetLangText.mockImplementation((value: any) => value?.[0]?.['#text'] ?? 'Team title');
    mockGetTeamById.mockResolvedValue({
      data: [
        {
          json: {
            title: [{ '@xml:lang': 'en', '#text': 'Unit Team' }],
          },
        },
      ],
    });
    mockGetUnitGroupTableAll.mockResolvedValue({
      data: [
        {
          id: 'ug-1',
          version: '1.0.0',
          name: 'Length units',
          refUnitName: 'm2',
          refUnitGeneralComment: 'Area unit',
          classification: 'Physical',
          modifiedAt: '2024-01-01',
          teamId: '',
        },
      ],
      success: true,
    });
    mockGetUnitGroupTablePgroongaSearch.mockResolvedValue({
      data: [
        {
          id: 'ug-1',
          version: '1.0.0',
          name: 'Length units',
          refUnitName: 'm2',
          refUnitGeneralComment: 'Area unit',
          classification: 'Physical',
          modifiedAt: '2024-01-01',
          teamId: '',
        },
      ],
      success: true,
    });
    mockGetUnitGroupTableUuidMentionSearch.mockResolvedValue({
      data: [],
      success: true,
      total: 0,
    });
    mockContributeSource.mockResolvedValue({ error: null });
  });

  it('falls back to the default browser locale when the runtime locale is unsupported', async () => {
    mockIntlLocale = 'unsupported-locale';
    mockGetRoleByUserId.mockResolvedValue([]);

    renderWithProviders(<UnitgroupsPage />);

    await waitFor(() => expect(mockGetLang).toHaveBeenCalledWith('zh-CN'));
  });

  it('loads existing my-data unit groups as read-only for non-admin users', async () => {
    mockGetRoleByUserId.mockResolvedValue([]);

    renderWithProviders(<UnitgroupsPage />);

    await waitFor(() => expect(mockGetTeamById).toHaveBeenCalledWith('team-1'));
    await waitFor(() => expect(mockGetUnitGroupTableAll).toHaveBeenCalled());

    expect(mockGetUnitGroupTableAll).toHaveBeenCalledWith(
      { pageSize: 10, current: 1 },
      {},
      'en',
      'my',
      'team-1',
      'all',
    );
    expect(screen.getByRole('button', { name: /search/i })).not.toBeDisabled();
    expect(screen.getByText(/contact an administrator/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /table-filter/i })).not.toBeDisabled();
    expect(screen.queryByRole('button', { name: /import-data/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('unitgroup-create')).not.toBeInTheDocument();
    expect(screen.queryByTestId('unitgroup-edit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('unitgroup-delete')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /contribute-action/i })).not.toBeInTheDocument();
    expect(screen.getAllByTestId('unitgroup-view')[0]).toHaveTextContent('view:ug-1');
    expect(screen.getByText(/export:ug-1:1.0.0/i)).toBeInTheDocument();
    expect(mockAllVersionsOperationWidths).toContain(104);
  });

  it('loads admin my data read-only and supports pgroonga search', async () => {
    mockGetRoleByUserId.mockResolvedValue([
      {
        team_id: '00000000-0000-0000-0000-000000000000',
        role: 'admin',
      },
    ]);

    renderWithProviders(<UnitgroupsPage />);

    await waitFor(() => expect(mockGetUnitGroupTableAll).toHaveBeenCalled());
    expect(mockGetUnitGroupTableAll).toHaveBeenCalledWith(
      { pageSize: 10, current: 1 },
      {},
      'en',
      'my',
      'team-1',
      'all',
    );
    expect(screen.getByRole('checkbox', { name: 'Reference Lookup' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Unit Team' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('unitgroup-view')).toHaveTextContent('view:ug-1'),
    );
    expect(screen.queryByTestId('unitgroup-edit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('unitgroup-delete')).not.toBeInTheDocument();
    expect(screen.queryByTestId('unitgroup-create')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /contribute-action/i })).not.toBeInTheDocument();
    expect(mockAllVersionsOperationWidths).toContain(104);

    await userEvent.click(screen.getByRole('button', { name: /table-filter/i }));
    await waitFor(() =>
      expect(mockGetUnitGroupTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'en',
        'my',
        'team-1',
        '20',
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() =>
      expect(mockGetUnitGroupTablePgroongaSearch).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'density',
        {},
        '20',
        'team-1',
      ),
    );
  });

  it('uses the main table for reference lookup and clears rows for incomplete UUIDs', async () => {
    const { message } = jest.requireMock('antd');
    mockGetRoleByUserId.mockResolvedValue([
      {
        team_id: '00000000-0000-0000-0000-000000000000',
        role: 'admin',
      },
    ]);
    const referenceRows = [
      {
        id: 'ug-ref',
        version: '1.0.0',
        name: 'Referenced unit group',
        refUnitName: 'kg',
        refUnitGeneralComment: 'Mass unit',
        classification: 'Physical',
        modifiedAt: '2024-01-01',
        teamId: '',
      },
    ];
    mockGetUnitGroupTableUuidMentionSearch.mockResolvedValue({
      data: referenceRows,
      success: true,
      total: 1,
      capped: true,
    });

    renderWithProviders(<UnitgroupsPage />);

    await screen.findByTestId('unitgroup-view');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Reference Lookup' }));
    expect(screen.getByRole('textbox', { name: /search-input/i })).toHaveAttribute(
      'placeholder',
      'pages.search.referenceLookup.placeholder',
    );

    await userEvent.click(screen.getByRole('button', { name: 'search' }));
    await waitFor(() =>
      expect(message.error).toHaveBeenCalledWith(
        'Enter a complete dataset UUID before running Reference Lookup.',
      ),
    );
    await waitFor(() => expect(screen.queryByTestId('unitgroup-view')).not.toBeInTheDocument());
    expect(mockGetUnitGroupTableUuidMentionSearch).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'uuid-lookup' }));
    await waitFor(() =>
      expect(mockGetUnitGroupTableUuidMentionSearch).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'd1380000-0000-4000-8000-000000000001',
        'all',
        'team-1',
      ),
    );
    expect(await screen.findByText('Referenced unit group')).toBeInTheDocument();
    expect(message.error).toHaveBeenCalledWith(
      'Showing up to the first 50 reference lookup results.',
    );

    const callCountBeforeUncappedLookup = mockGetUnitGroupTableUuidMentionSearch.mock.calls.length;
    mockGetUnitGroupTableUuidMentionSearch.mockResolvedValue({
      data: referenceRows,
      success: true,
      total: 1,
      capped: false,
    });
    await userEvent.click(screen.getByRole('button', { name: 'uuid-lookup' }));
    await waitFor(() =>
      expect(mockGetUnitGroupTableUuidMentionSearch.mock.calls.length).toBeGreaterThan(
        callCountBeforeUncappedLookup,
      ),
    );
  });

  it('uses compact mobile controls for my data rows without import actions', async () => {
    mockBreakpointScreens = { md: false };
    mockGetRoleByUserId.mockResolvedValue([
      {
        team_id: '00000000-0000-0000-0000-000000000000',
        role: 'admin',
      },
    ]);

    renderWithProviders(<UnitgroupsPage />);

    await waitFor(() => expect(mockGetUnitGroupTableAll).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /table-filter/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /import-data/i })).not.toBeInTheDocument();
    await waitFor(() => expect(mockAllVersionsOperationWidths).toContain(88));
  });

  it('opens the view drawer from my-data query parameters', async () => {
    mockLocation = {
      pathname: '/mydata/unitgroups',
      search: '?tid=team-1&id=ug-deep-link&version=01.00.000&required=1',
    };
    mockGetRoleByUserId.mockResolvedValue([
      {
        team_id: '00000000-0000-0000-0000-000000000000',
        role: 'admin',
      },
    ]);

    renderWithProviders(<UnitgroupsPage />);

    await waitFor(() =>
      expect(mockUnitGroupViewCalls).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'ug-deep-link',
            version: '01.00.000',
            autoOpen: true,
          }),
        ]),
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: /unitgroup-view-close/i }));
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /unitgroup-view-close/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it('does not render contribute actions for my-data rows', async () => {
    mockGetRoleByUserId.mockResolvedValue([
      {
        team_id: '00000000-0000-0000-0000-000000000000',
        role: 'admin',
      },
    ]);

    renderWithProviders(<UnitgroupsPage />);

    await waitFor(() =>
      expect(screen.getByTestId('unitgroup-view')).toHaveTextContent('view:ug-1'),
    );

    expect(screen.queryByRole('button', { name: /contribute-action/i })).not.toBeInTheDocument();
    expect(mockContributeSource).not.toHaveBeenCalled();
  });

  it('reloads when the state filter changes without import or create actions', async () => {
    mockGetRoleByUserId.mockResolvedValue([
      {
        team_id: '00000000-0000-0000-0000-000000000000',
        role: 'admin',
      },
    ]);

    renderWithProviders(<UnitgroupsPage />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /table-filter/i })).toBeInTheDocument(),
    );

    expect(screen.queryByRole('button', { name: /import-data/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('unitgroup-create')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /table-filter/i }));
    await waitFor(() =>
      expect(mockGetUnitGroupTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'en',
        'my',
        'team-1',
        '20',
      ),
    );
  });

  it('renders the non-my toolbar branch, fallback classification text, and empty tid requests', async () => {
    mockLocation = {
      pathname: '/tgdata/unitgroups',
      search: '',
    };
    mockGetDataSource.mockReturnValue('tg');
    mockGetUnitGroupTableAll.mockResolvedValue({
      data: [
        {
          id: 'ug-2',
          version: '2.0.0',
          name: 'Fallback units',
          refUnitName: 'm3',
          refUnitGeneralComment: 'Volume unit',
          classification: 'undefined',
          modifiedAt: '2024-01-02',
          teamId: '',
        },
      ],
      success: true,
    });

    renderWithProviders(<UnitgroupsPage />);

    await waitFor(() =>
      expect(mockGetUnitGroupTableAll).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'en',
        'tg',
        '',
        'all',
      ),
    );

    expect(screen.queryByRole('button', { name: /table-filter/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /import-data/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('unitgroup-edit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('unitgroup-delete')).not.toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText(/export:ug-2:2.0.0/i)).toBeInTheDocument();
    expect(screen.getByTestId('unitgroup-view')).toHaveTextContent('view:ug-2');
    expect(
      screen
        .getAllByTestId('unitgroup-create')
        .find((node) => node.textContent?.includes('"actionType":"copy"')),
    ).toHaveTextContent('"actionType":"copy"');
    expect(screen.getByText('versions-disabled:undefined')).toBeInTheDocument();
    expect(screen.getByTestId('pro-table')).toHaveTextContent('My Data / Unit Groups');
    expect(screen.getByText('super(m3)')).toBeInTheDocument();
    expect(screen.getByText('2.0.0')).toBeInTheDocument();
    expect(screen.getByText('2024-01-02')).toBeInTheDocument();
    expect(mockAllVersionsOperationWidths).toContain(184);
    expect(screen.getByText('Fallback units').closest('[data-row-key]')).toHaveAttribute(
      'data-row-key',
      'ug-2-2.0.0',
    );

    await userEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() =>
      expect(mockGetUnitGroupTablePgroongaSearch).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'tg',
        'density',
        {},
        'all',
        '',
      ),
    );
  });
});
