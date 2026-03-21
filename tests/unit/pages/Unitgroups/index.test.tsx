// @ts-nocheck
import UnitgroupsPage from '@/pages/Unitgroups';
import userEvent from '@testing-library/user-event';
import { act, renderWithProviders, screen, waitFor } from '../../../helpers/testUtils';

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
  pathname: '/mydata/unitgroups',
  search: '?tid=team-1',
};
let mockUnitGroupCreateCalls: any[] = [];
let mockUnitGroupEditCalls: any[] = [];
let mockUnitGroupDeleteCalls: any[] = [];

const mockContributeSource = jest.fn();
const mockGetDataSource = jest.fn(() => 'my');
const mockGetLang = jest.fn(() => 'en');
const mockGetLangText = jest.fn((value: any) => value?.[0]?.['#text'] ?? 'Team title');
const mockGetRoleByUserId = jest.fn();
const mockGetTeamById = jest.fn();
const mockGetUnitGroupTableAll = jest.fn();
const mockGetUnitGroupTablePgroongaSearch = jest.fn();
const mockUnitgroupHybridSearch = jest.fn();

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    locale: 'en-US',
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
  unitgroup_hybrid_search: (...args: any[]) => mockUnitgroupHybridSearch(...args),
}));

jest.mock('@/components/AlignedNumber', () => ({
  __esModule: true,
  toSuperscript: jest.fn((value: string) => `super(${value})`),
}));

jest.mock('@/components/AllVersions', () => ({
  __esModule: true,
  default: ({ addVersionComponent, disabled }: any) => (
    <div data-testid='all-versions'>
      <span>{`versions-disabled:${String(disabled)}`}</span>
      {addVersionComponent?.({ newVersion: '02.00.000' })}
    </div>
  ),
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
  default: ({ id }: any) => <div data-testid='unitgroup-view'>{`view:${id}`}</div>,
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
    columns = [],
    toolBarRender,
    headerTitle,
    rowKey,
  }: any) => {
    const [rows, setRows] = React.useState<any[]>([]);
    const requestRef = React.useRef(request);

    React.useEffect(() => {
      requestRef.current = request;
    }, [request]);

    const reload = jest.fn(async () => {
      const result = await requestRef.current?.({ pageSize: 10, current: 1 }, {});
      setRows(result?.data ?? []);
      return result;
    });

    React.useEffect(() => {
      latestReloadMock = reload;
      if (actionRef) {
        actionRef.current = {
          reload,
          setPageInfo: jest.fn(),
        };
      }
      void reload();
    }, [actionRef, reload]);

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
    latestReloadMock = null;
    mockUnitGroupCreateCalls = [];
    mockUnitGroupEditCalls = [];
    mockUnitGroupDeleteCalls = [];
    mockLocation = {
      pathname: '/mydata/unitgroups',
      search: '?tid=team-1',
    };
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
    mockUnitgroupHybridSearch.mockResolvedValue({
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
    mockContributeSource.mockResolvedValue({ error: null });
  });

  it('returns an empty locked table for non-admin my-data users', async () => {
    mockGetRoleByUserId.mockResolvedValue([]);

    renderWithProviders(<UnitgroupsPage />);

    await waitFor(() => expect(mockGetTeamById).toHaveBeenCalledWith('team-1'));
    await waitFor(() => expect(screen.getByRole('button', { name: /search/i })).toBeDisabled());

    expect(mockGetUnitGroupTableAll).not.toHaveBeenCalled();
    expect(screen.getByText(/please contact the administrator/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /table-filter/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /import-data/i })).toBeDisabled();
    expect(screen.getAllByTestId('unitgroup-create')[0]).toHaveTextContent('"disabled":true');
  });

  it('loads admin data, supports pgroonga and hybrid search, and contributes successfully', async () => {
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

    expect(screen.getByRole('heading', { name: 'Unit Team' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('unitgroup-view')).toHaveTextContent('view:ug-1'),
    );
    expect(screen.getByTestId('unitgroup-edit')).toHaveTextContent('edit:ug-1');
    expect(screen.getByTestId('unitgroup-delete')).toHaveTextContent('delete:ug-1');
    expect(screen.getAllByTestId('unitgroup-create')[0]).toHaveTextContent('"disabled":false');

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
      ),
    );

    await userEvent.click(screen.getByRole('checkbox', { name: /ai search/i }));
    await userEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() =>
      expect(mockUnitgroupHybridSearch).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'density',
        {},
        '20',
      ),
    );

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /contribute-action/i }));
    });

    await waitFor(() =>
      expect(mockContributeSource).toHaveBeenCalledWith('unitgroups', 'ug-1', '1.0.0'),
    );
    const { message } = jest.requireMock('antd');
    expect(message.success).toHaveBeenCalledWith('Contribute successfully');
    expect(latestReloadMock).toHaveBeenCalled();
  });

  it('logs contribute errors without showing success when the contribute action fails', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockGetRoleByUserId.mockResolvedValue([
      {
        team_id: '00000000-0000-0000-0000-000000000000',
        role: 'admin',
      },
    ]);
    mockContributeSource.mockResolvedValue({ error: 'contribute failed' });

    renderWithProviders(<UnitgroupsPage />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /contribute-action/i })).toBeInTheDocument(),
    );

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /contribute-action/i }));
    });

    const { message } = jest.requireMock('antd');
    expect(consoleSpy).toHaveBeenCalledWith('contribute failed');
    expect(message.success).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('persists imported json into create and reloads when the state filter changes', async () => {
    mockGetRoleByUserId.mockResolvedValue([
      {
        team_id: '00000000-0000-0000-0000-000000000000',
        role: 'admin',
      },
    ]);

    renderWithProviders(<UnitgroupsPage />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /import-data/i })).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole('button', { name: /import-data/i }));
    expect(screen.getAllByTestId('unitgroup-create')[0]).toHaveTextContent('"importCount":1');

    const toolbarCreate = [...mockUnitGroupCreateCalls]
      .reverse()
      .find((call) => (call.actionType ?? 'create') === 'create');
    act(() => {
      toolbarCreate?.onClose?.();
      mockUnitGroupEditCalls[0]?.setViewDrawerVisible?.(true);
      mockUnitGroupDeleteCalls[0]?.setViewDrawerVisible?.(false);
    });
    await waitFor(() =>
      expect(screen.getAllByTestId('unitgroup-create')[0]).toHaveTextContent('"importCount":0'),
    );

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
    expect(screen.getByText('versions-disabled:false')).toBeInTheDocument();
    expect(screen.getByTestId('pro-table')).toHaveTextContent('My Data / Unit Groups');
    expect(screen.getByText('super(m3)')).toBeInTheDocument();
    expect(screen.getByText('2.0.0')).toBeInTheDocument();
    expect(screen.getByText('2024-01-02')).toBeInTheDocument();
    expect(screen.getByText('Fallback units').closest('[data-row-key]')).toHaveAttribute(
      'data-row-key',
      'ug-2-2.0.0',
    );
  });
});
