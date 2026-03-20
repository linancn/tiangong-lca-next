// @ts-nocheck
import FlowpropertiesPage from '@/pages/Flowproperties';
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
  pathname: '/mydata/flowproperties',
  search: '?tid=team-1',
};

const mockContributeSource = jest.fn();
const mockGetFlowpropertyTableAll = jest.fn();
const mockGetFlowpropertyTablePgroongaSearch = jest.fn();
const mockFlowpropertyHybridSearch = jest.fn();
const mockGetDataSource = jest.fn(() => 'my');
const mockGetLang = jest.fn(() => 'en');
const mockGetLangText = jest.fn((value: any) => {
  if (Array.isArray(value)) return value[0]?.['#text'] ?? '-';
  if (typeof value === 'string') return value;
  return value?.['#text'] ?? 'Team title';
});
const mockGetTeamById = jest.fn();
const mockGetUnitData = jest.fn();
const mockMessage = {
  success: jest.fn(),
  error: jest.fn(),
};

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    locale: 'en-US',
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
  useLocation: () => mockLocation,
}));

jest.mock('@/services/flowproperties/api', () => ({
  __esModule: true,
  flowproperty_hybrid_search: (...args: any[]) => mockFlowpropertyHybridSearch(...args),
  getFlowpropertyTableAll: (...args: any[]) => mockGetFlowpropertyTableAll(...args),
  getFlowpropertyTablePgroongaSearch: (...args: any[]) =>
    mockGetFlowpropertyTablePgroongaSearch(...args),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getDataSource: (...args: any[]) => mockGetDataSource(...args),
  getLang: (...args: any[]) => mockGetLang(...args),
  getLangText: (...args: any[]) => mockGetLangText(...args),
  getUnitData: (...args: any[]) => mockGetUnitData(...args),
}));

jest.mock('@/services/teams/api', () => ({
  __esModule: true,
  getTeamById: (...args: any[]) => mockGetTeamById(...args),
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  contributeSource: (...args: any[]) => mockContributeSource(...args),
}));

jest.mock('@/components/AllVersions', () => ({
  __esModule: true,
  default: ({ id, addVersionComponent }: any) => (
    <div data-testid='all-versions'>
      <span>{id}</span>
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
    <div data-testid='export-data'>{`${tableName}:${id}:${version}`}</div>
  ),
}));

jest.mock('@/components/ImportData', () => ({
  __esModule: true,
  default: ({ onJsonData }: any) => (
    <button type='button' onClick={() => onJsonData?.([{ flowPropertyDataSet: {} }])}>
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

jest.mock('@/pages/Utils', () => ({
  __esModule: true,
  getAllVersionsColumns: jest.fn(() => []),
  getDataTitle: jest.fn(() => 'My Data'),
}));

jest.mock('@/pages/Flowproperties/Components/create', () => ({
  __esModule: true,
  default: ({ importData, actionType, newVersion, id, version, onClose }: any) => (
    <div>
      <div data-testid='flowproperty-create'>
        {JSON.stringify({
          importCount: importData?.length ?? 0,
          actionType: actionType ?? 'create',
          newVersion: newVersion ?? null,
          id: id ?? null,
          version: version ?? null,
        })}
      </div>
      {onClose ? (
        <button type='button' onClick={() => onClose()}>
          flowproperty-create-close
        </button>
      ) : null}
    </div>
  ),
}));

jest.mock('@/pages/Flowproperties/Components/delete', () => ({
  __esModule: true,
  default: ({ id, version, setViewDrawerVisible }: any) => (
    <button
      type='button'
      data-testid='flowproperty-delete'
      onClick={() => setViewDrawerVisible?.(true)}
    >
      {`${id}:${version}`}
    </button>
  ),
}));

jest.mock('@/pages/Flowproperties/Components/edit', () => ({
  __esModule: true,
  default: () => <div data-testid='flowproperty-edit' />,
}));

jest.mock('@/pages/Flowproperties/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => (
    <div data-testid='flowproperty-view'>{`${id}:${version}`}</div>
  ),
}));

jest.mock('@/components/AlignedNumber', () => ({
  __esModule: true,
  toSuperscript: (value: string) => `sup:${value}`,
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
  const Tooltip = ({ children }: any) => <div>{children}</div>;
  const Search = ({ onSearch, placeholder }: any) => (
    <div>
      <input aria-label='search-input' placeholder={placeholder} />
      <button type='button' onClick={() => onSearch?.('climate')}>
        search
      </button>
    </div>
  );
  const Input = { Search };
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
    Input,
    Row,
    Space,
    Tooltip,
    message: {
      success: (...args: any[]) => mockMessage.success(...args),
      error: (...args: any[]) => mockMessage.error(...args),
    },
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
  const TableDropdown = ({ menus }: any) => (
    <div data-testid='table-dropdown'>
      {menus?.map((menu: any) => (
        <div key={menu.key}>{menu.name}</div>
      ))}
    </div>
  );

  const ProTable = ({ actionRef, request, toolBarRender, headerTitle, columns, rowKey }: any) => {
    const requestRef = React.useRef(request);
    const [rows, setRows] = React.useState<any[]>([]);

    React.useEffect(() => {
      requestRef.current = request;
    }, [request]);

    const reload = jest.fn(async () => {
      const result = await requestRef.current?.({ pageSize: 10, current: 1 }, {});
      setRows(result?.data ?? []);
      return result;
    });

    React.useEffect(() => {
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
        {rows.map((row: any, rowIndex: number) => (
          <div
            data-testid='pro-row'
            key={typeof rowKey === 'function' ? rowKey(row) : (row?.id ?? rowIndex)}
          >
            {columns?.map((column: any, columnIndex: number) => {
              const value = column.dataIndex === 'index' ? rowIndex + 1 : row?.[column.dataIndex];
              const content = column.render ? column.render(value, row, rowIndex) : value;
              return (
                <div data-testid={`cell-${columnIndex}`} key={columnIndex}>
                  {content}
                </div>
              );
            })}
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

describe('FlowpropertiesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation = {
      pathname: '/mydata/flowproperties',
      search: '?tid=team-1',
    };
    mockGetDataSource.mockReturnValue('my');
    mockGetTeamById.mockResolvedValue({
      data: [{ json: { title: [{ '@xml:lang': 'en', '#text': 'Flowproperty Team' }] } }],
    });
    const row = {
      id: 'fp-1',
      version: '01.00.000',
      name: 'Global warming potential',
      generalComment: 'Flowproperty comment',
      classification: 'undefined',
      refUnitRes: {
        name: [{ '@xml:lang': 'en', '#text': 'Mass' }],
        refUnitGeneralComment: [{ '@xml:lang': 'en', '#text': 'Reference unit comment' }],
        refUnitName: 'kg',
      },
      modifiedAt: '2024-01-01T00:00:00.000Z',
      teamId: null,
    };
    mockContributeSource.mockResolvedValue({ error: null });
    mockGetFlowpropertyTableAll.mockResolvedValue({ data: [row], success: true });
    mockGetFlowpropertyTablePgroongaSearch.mockResolvedValue({ data: [row], success: true });
    mockFlowpropertyHybridSearch.mockResolvedValue({ data: [row], success: true });
    mockGetUnitData.mockImplementation(async (_table: string, rows: any[]) => rows ?? []);
  });

  it('loads the default table and keeps imported data in the create action', async () => {
    renderWithProviders(<FlowpropertiesPage />);

    await waitFor(() => expect(mockGetTeamById).toHaveBeenCalledWith('team-1'));
    await waitFor(() => expect(mockGetFlowpropertyTableAll).toHaveBeenCalled());

    expect(mockGetFlowpropertyTableAll).toHaveBeenCalledWith(
      { pageSize: 10, current: 1 },
      {},
      'en',
      'my',
      'team-1',
      'all',
    );
    expect(mockGetUnitData).toHaveBeenCalledWith(
      'unitgroup',
      expect.arrayContaining([
        expect.objectContaining({
          id: 'fp-1',
          version: '01.00.000',
        }),
      ]),
    );
    expect(screen.getByRole('heading', { name: 'Flowproperty Team' })).toBeInTheDocument();
    expect(screen.getByText('Global warming potential')).toBeInTheDocument();
    expect(screen.getByText('sup:kg')).toBeInTheDocument();
    expect(screen.getByTestId('flowproperty-view')).toHaveTextContent('fp-1:01.00.000');
    expect(screen.getByTestId('flowproperty-delete')).toHaveTextContent('fp-1:01.00.000');
    expect(screen.getAllByTestId('flowproperty-create')[1]).toHaveTextContent(
      '"actionType":"createVersion"',
    );
    expect(screen.getByTestId('table-dropdown')).toBeInTheDocument();
    expect(screen.getByTestId('export-data')).toHaveTextContent('flowproperties:fp-1:01.00.000');

    await userEvent.click(screen.getByRole('button', { name: /import-data/i }));
    expect(
      screen
        .getAllByTestId('flowproperty-create')
        .some((node) => node.textContent?.includes('"importCount":1')),
    ).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: /flowproperty-create-close/i }));
    expect(
      screen
        .getAllByTestId('flowproperty-create')
        .some((node) => node.textContent?.includes('"importCount":0')),
    ).toBe(true);
    await userEvent.click(screen.getByTestId('flowproperty-delete'));
  });

  it('reloads the table with the selected state filter', async () => {
    renderWithProviders(<FlowpropertiesPage />);

    await waitFor(() => expect(mockGetFlowpropertyTableAll).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: /table-filter/i }));

    await waitFor(() =>
      expect(mockGetFlowpropertyTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'en',
        'my',
        'team-1',
        '20',
      ),
    );
  });

  it('uses the current state filter for pgroonga and AI search', async () => {
    renderWithProviders(<FlowpropertiesPage />);

    await waitFor(() => expect(mockGetFlowpropertyTableAll).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /table-filter/i }));
    await waitFor(() =>
      expect(mockGetFlowpropertyTableAll).toHaveBeenLastCalledWith(
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
      expect(mockGetFlowpropertyTablePgroongaSearch).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'climate',
        {},
        '20',
      ),
    );

    await userEvent.click(screen.getByRole('checkbox', { name: /ai search/i }));
    await userEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() =>
      expect(mockFlowpropertyHybridSearch).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'climate',
        {},
        '20',
      ),
    );
  });

  it('runs contribute success and non-my option branches', async () => {
    const { rerender } = renderWithProviders(<FlowpropertiesPage />);

    await waitFor(() => expect(mockGetFlowpropertyTableAll).toHaveBeenCalled());
    const initialTableCalls = mockGetFlowpropertyTableAll.mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: /contribute-action/i }));

    await waitFor(() =>
      expect(mockContributeSource).toHaveBeenCalledWith('flowproperties', 'fp-1', '01.00.000'),
    );
    await waitFor(() =>
      expect(mockMessage.success).toHaveBeenCalledWith('Contribute successfully'),
    );
    await waitFor(() =>
      expect(mockGetFlowpropertyTableAll.mock.calls.length).toBeGreaterThan(initialTableCalls),
    );

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockContributeSource.mockResolvedValueOnce({ error: new Error('contribute failed') });
    await userEvent.click(screen.getByRole('button', { name: /contribute-action/i }));
    await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error)));
    consoleSpy.mockRestore();

    mockGetDataSource.mockReturnValue('co');
    mockLocation = {
      pathname: '/codata/flowproperties',
      search: '',
    };

    rerender(<FlowpropertiesPage />);

    await waitFor(() =>
      expect(mockGetFlowpropertyTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'en',
        'co',
        '',
        'all',
      ),
    );
    expect(screen.queryByRole('button', { name: /table-filter/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /import-data/i })).not.toBeInTheDocument();
  });

  it('uses empty-string tid fallback and renders non-empty classification rows without a reference unit name', async () => {
    mockLocation = {
      pathname: '/codata/flowproperties',
      search: '',
    };
    mockGetDataSource.mockReturnValue('co');
    mockGetTeamById.mockResolvedValue({ data: [] });
    mockGetFlowpropertyTableAll.mockResolvedValueOnce({
      data: [
        {
          id: 'fp-2',
          version: '02.00.000',
          name: 'Acidification',
          generalComment: 'Acidification comment',
          classification: 'Impact category',
          refUnitRes: {
            name: [{ '@xml:lang': 'en', '#text': 'Substance amount' }],
            refUnitGeneralComment: [{ '@xml:lang': 'en', '#text': 'No ref unit name' }],
          },
          modifiedAt: '2024-02-01T00:00:00.000Z',
          teamId: 'team-owned',
        },
      ],
      success: true,
    });

    renderWithProviders(<FlowpropertiesPage />);

    await waitFor(() => expect(mockGetTeamById).toHaveBeenCalledWith(''));
    await waitFor(() =>
      expect(mockGetFlowpropertyTableAll).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'en',
        'co',
        '',
        'all',
      ),
    );
    expect(screen.getByText('Impact category')).toBeInTheDocument();
    expect(screen.getByText('sup:')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /contribute-action/i })).not.toBeInTheDocument();
  });

  it('falls back to empty arrays when list and search requests return no data', async () => {
    mockGetFlowpropertyTableAll.mockResolvedValue({ data: undefined, success: true });
    mockGetFlowpropertyTablePgroongaSearch.mockResolvedValue({ data: undefined, success: true });
    mockGetUnitData.mockImplementation(async () => undefined);

    renderWithProviders(<FlowpropertiesPage />);

    await waitFor(() => expect(mockGetUnitData).toHaveBeenCalledWith('unitgroup', []));
    const getUnitDataCallCountBeforeSearch = mockGetUnitData.mock.calls.length;

    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() =>
      expect(mockGetFlowpropertyTablePgroongaSearch).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'climate',
        {},
        'all',
      ),
    );
    await waitFor(() =>
      expect(mockGetUnitData.mock.calls.slice(getUnitDataCallCountBeforeSearch)).toContainEqual([
        'unitgroup',
        [],
      ]),
    );
  });
});
