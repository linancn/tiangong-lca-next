// @ts-nocheck
import LifeCycleModelsPage from '@/pages/LifeCycleModels';
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

let latestReloadMock: jest.Mock | null = null;
let mockLocation = {
  pathname: '/mydata/lifecyclemodels',
  search: '?tid=team-1',
};

const mockGetDataSource = jest.fn(() => 'my');
const mockGetLang = jest.fn(() => 'en');
const mockGetLangText = jest.fn((value: any) => value?.[0]?.['#text'] ?? 'Team title');
const mockGetLifeCycleModelTableAll = jest.fn();
const mockGetLifeCycleModelTablePgroongaSearch = jest.fn();
const mockLifeCycleModelHybridSearch = jest.fn();
const mockContributeLifeCycleModel = jest.fn();
const mockGetTeamById = jest.fn();
const mockMessageSuccess = jest.fn();

const modelRows = [
  {
    id: 'model-1',
    version: '1.0.0',
    name: 'Lifecycle model 1',
    generalComment: 'General comment',
    classification: 'Class A',
    modifiedAt: '2024-01-01',
    teamId: '',
  },
  {
    id: 'model-2',
    version: '1.0.1',
    name: 'Lifecycle model 2',
    generalComment: '',
    classification: 'undefined',
    modifiedAt: '2024-01-02',
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

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getDataSource: (...args: any[]) => mockGetDataSource(...args),
  getLang: (...args: any[]) => mockGetLang(...args),
  getLangText: (...args: any[]) => mockGetLangText(...args),
  isDataUnderReview: () => false,
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  attachStateCodesToRows: jest.fn(async (_table: string, rows: any[]) => rows),
}));

jest.mock('@/services/lifeCycleModels/api', () => ({
  __esModule: true,
  contributeLifeCycleModel: (...args: any[]) => mockContributeLifeCycleModel(...args),
  getLifeCycleModelTableAll: (...args: any[]) => mockGetLifeCycleModelTableAll(...args),
  getLifeCycleModelTablePgroongaSearch: (...args: any[]) =>
    mockGetLifeCycleModelTablePgroongaSearch(...args),
  lifeCycleModel_hybrid_search: (...args: any[]) => mockLifeCycleModelHybridSearch(...args),
}));

jest.mock('@/services/teams/api', () => ({
  __esModule: true,
  getTeamById: (...args: any[]) => mockGetTeamById(...args),
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
    <button type='button' disabled={disabled} onClick={() => void onOk?.()}>
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

jest.mock('@/components/ImportData', () => ({
  __esModule: true,
  default: ({ onJsonData }: any) => (
    <button type='button' onClick={() => onJsonData?.([{ id: 'import-1' }])}>
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

jest.mock('@/pages/LifeCycleModels/Components/create', () => ({
  __esModule: true,
  default: ({ actionType = 'create', importData, newVersion, id, version, onClose }: any) => (
    <div>
      <div data-testid={`lifecycle-create-${actionType}`}>
        {JSON.stringify({
          actionType,
          importCount: importData?.length ?? 0,
          newVersion: newVersion ?? null,
          id: id ?? null,
          version: version ?? null,
        })}
      </div>
      {onClose ? (
        <button type='button' onClick={() => onClose()}>
          close-lifecycle-create-{actionType}
        </button>
      ) : null}
    </div>
  ),
}));

jest.mock('@/pages/LifeCycleModels/Components/delete', () => ({
  __esModule: true,
  default: ({ id, setViewDrawerVisible }: any) => (
    <button type='button' onClick={() => setViewDrawerVisible?.(false)}>
      lifecycle-delete-{id}
    </button>
  ),
}));

jest.mock('@/pages/LifeCycleModels/Components/edit', () => ({
  __esModule: true,
  default: ({ id, version, autoOpen, onDrawerClose }: any) => (
    <div data-testid='lifecycle-edit'>
      {JSON.stringify({ id, version, autoOpen })}
      <button type='button' onClick={() => onDrawerClose?.()}>
        lifecycle-edit-close
      </button>
    </div>
  ),
}));

jest.mock('@/pages/LifeCycleModels/Components/view', () => ({
  __esModule: true,
  default: ({ id }: any) => <button type='button'>{`lifecycle-view-${id}`}</button>,
}));

jest.mock('antd', () => {
  const React = require('react');

  const Card = ({ children }: any) => <section>{children}</section>;
  const Col = ({ children }: any) => <div>{children}</div>;
  const ConfigProvider = ({ children }: any) => <div>{children}</div>;
  const Row = ({ children }: any) => <div>{children}</div>;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Tooltip = ({ title, children }: any) => (
    <div data-tooltip-title={toText(title)}>{children}</div>
  );

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
    error: jest.fn(),
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

  const ProTable = ({
    actionRef,
    request,
    columns = [],
    toolBarRender,
    headerTitle,
    rowKey,
  }: any) => {
    const requestRef = React.useRef(request);
    const [rows, setRows] = React.useState<any[]>([]);
    const [pageInfo, setPageInfoState] = React.useState({ pageSize: 10, current: 1 });

    React.useEffect(() => {
      requestRef.current = request;
    }, [request]);

    const runRequest = React.useCallback(
      async (sort: Record<string, string> = {}, params = pageInfo) => {
        const result = await requestRef.current?.(params, sort);
        setRows(result?.data ?? []);
        return result;
      },
      [pageInfo],
    );

    const reload = jest.fn(async () => runRequest());
    const requestWith = jest.fn(async (sort: Record<string, string> = {}) => runRequest(sort));

    React.useEffect(() => {
      latestReloadMock = reload;
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

    return (
      <section data-testid='pro-table'>
        <div>{toText(headerTitle)}</div>
        <div>{toolBarRender?.()}</div>
        <button type='button' onClick={() => requestWith({ name: 'ascend' })}>
          request-name-sort-asc
        </button>
        <button type='button' onClick={() => requestWith({ name: 'descend' })}>
          request-name-sort-desc
        </button>
        <button type='button' onClick={() => requestWith({ classification: 'ascend' })}>
          request-classification-sort-asc
        </button>
        <button type='button' onClick={() => requestWith({ classification: 'descend' })}>
          request-classification-sort-desc
        </button>
        <button type='button' onClick={() => requestWith({ modifiedAt: 'descend' })}>
          request-unknown-sort
        </button>
        {rows.map((row: any, rowIndex: number) => {
          const key = rowKey ? rowKey(row) : `row-${rowIndex}`;
          return (
            <div data-testid={`row-${key}`} key={key}>
              {columns.map((column: any, columnIndex: number) => {
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

describe('LifeCycleModelsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestReloadMock = null;
    mockLocation = {
      pathname: '/mydata/lifecyclemodels',
      search: '?tid=team-1',
    };
    mockGetDataSource.mockReturnValue('my');
    mockGetLang.mockReturnValue('en');
    mockGetLangText.mockImplementation((value: any) => value?.[0]?.['#text'] ?? 'Team title');
    mockGetTeamById.mockResolvedValue({
      data: [
        {
          json: {
            title: [{ '@xml:lang': 'en', '#text': 'Team Alpha' }],
          },
        },
      ],
    });
    mockGetLifeCycleModelTableAll.mockResolvedValue({
      data: modelRows,
      success: true,
    });
    mockGetLifeCycleModelTablePgroongaSearch.mockResolvedValue({
      data: [],
      success: true,
    });
    mockLifeCycleModelHybridSearch.mockResolvedValue({
      data: [],
      success: true,
    });
    mockContributeLifeCycleModel.mockResolvedValue({ error: null });
  });

  it('loads the default table, row actions, version actions, and import reset workflow', async () => {
    const user = userEvent.setup();

    renderWithProviders(<LifeCycleModelsPage />);

    await waitFor(() => expect(mockGetTeamById).toHaveBeenCalledWith('team-1'));
    await waitFor(() => expect(mockGetLifeCycleModelTableAll).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /export-lifecyclemodels-model-1-1.0.0/i }),
      ).toBeInTheDocument(),
    );

    expect(mockGetLifeCycleModelTableAll).toHaveBeenCalledWith(
      { pageSize: 10, current: 1 },
      {},
      'en',
      'my',
      'team-1',
      'all',
    );
    expect(screen.getByRole('heading', { name: 'Team Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /search-input/i })).toHaveAttribute(
      'placeholder',
      'pages.search.keyWord',
    );
    expect(screen.getByTestId('row-model-1-1.0.0')).toBeInTheDocument();
    expect(screen.getByText('Lifecycle model 1')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getAllByTestId('all-versions')).toHaveLength(2);
    expect(screen.getAllByTestId('lifecycle-create-createVersion')[0]).toHaveTextContent(
      '"newVersion":"02.00.000"',
    );
    expect(screen.getAllByTestId('lifecycle-create-createVersion')[0]).toHaveTextContent(
      '"id":"model-1"',
    );
    expect(screen.getAllByRole('button', { name: /lifecycle-view-/i })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /lifecycle-edit-/i })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /lifecycle-delete-/i })).toHaveLength(2);
    expect(
      screen.getByRole('button', { name: /export-lifecyclemodels-model-1-1.0.0/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /table-filter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import-data/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /import-data/i }));
    expect(screen.getByTestId('lifecycle-create-create')).toHaveTextContent('"importCount":1');

    await user.click(screen.getByRole('button', { name: /close-lifecycle-create-create/i }));
    expect(screen.getByTestId('lifecycle-create-create')).toHaveTextContent('"importCount":0');
  });

  it('uses current state filters for pgroonga search, sort conversion, and AI search', async () => {
    const user = userEvent.setup();

    renderWithProviders(<LifeCycleModelsPage />);

    await waitFor(() => expect(mockGetLifeCycleModelTableAll).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /table-filter/i }));
    await waitFor(() =>
      expect(mockGetLifeCycleModelTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'en',
        'my',
        'team-1',
        '20',
      ),
    );

    await user.click(screen.getByRole('button', { name: 'search' }));
    await waitFor(() =>
      expect(mockGetLifeCycleModelTablePgroongaSearch).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'steel',
        {},
        '20',
        undefined,
      ),
    );

    await user.click(screen.getByRole('button', { name: 'request-name-sort-asc' }));
    await waitFor(() =>
      expect(mockGetLifeCycleModelTablePgroongaSearch).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'steel',
        {},
        '20',
        { key: 'baseName', lang: 'en', order: 'asc' },
      ),
    );

    await user.click(screen.getByRole('button', { name: 'request-name-sort-desc' }));
    await waitFor(() =>
      expect(mockGetLifeCycleModelTablePgroongaSearch).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'steel',
        {},
        '20',
        { key: 'baseName', lang: 'en', order: 'desc' },
      ),
    );

    await user.click(screen.getByRole('button', { name: 'request-classification-sort-desc' }));
    await waitFor(() =>
      expect(mockGetLifeCycleModelTablePgroongaSearch).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'steel',
        {},
        '20',
        { key: 'common:class', order: 'desc' },
      ),
    );

    await user.click(screen.getByRole('button', { name: 'request-classification-sort-asc' }));
    await waitFor(() =>
      expect(mockGetLifeCycleModelTablePgroongaSearch).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'steel',
        {},
        '20',
        { key: 'common:class', order: 'asc' },
      ),
    );

    await user.click(screen.getByRole('button', { name: 'request-unknown-sort' }));
    await waitFor(() =>
      expect(mockGetLifeCycleModelTablePgroongaSearch).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'steel',
        {},
        '20',
        undefined,
      ),
    );

    await user.click(screen.getByRole('checkbox', { name: /ai search/i }));
    expect(screen.getByRole('textbox', { name: /search-input/i })).toHaveAttribute(
      'placeholder',
      'pages.search.placeholder',
    );

    await user.click(screen.getByRole('button', { name: 'search' }));
    await waitFor(() =>
      expect(mockLifeCycleModelHybridSearch).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'steel',
        {},
        '20',
      ),
    );
  });

  it('contributes rows successfully or with logged errors and executes the delete callback prop', async () => {
    const user = userEvent.setup();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    renderWithProviders(<LifeCycleModelsPage />);

    await waitFor(() => expect(mockGetLifeCycleModelTableAll).toHaveBeenCalled());

    const contributeButtons = screen.getAllByRole('button', { name: /contribute-action/i });
    expect(contributeButtons).toHaveLength(2);
    expect(contributeButtons[1]).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'lifecycle-delete-model-1' }));

    await act(async () => {
      await user.click(contributeButtons[0]);
    });

    await waitFor(() =>
      expect(mockContributeLifeCycleModel).toHaveBeenCalledWith('model-1', '1.0.0'),
    );
    expect(mockMessageSuccess).toHaveBeenCalledWith('Contribute successfully');
    expect(latestReloadMock).toHaveBeenCalled();

    mockContributeLifeCycleModel.mockResolvedValueOnce({ error: { message: 'failed' } });

    await act(async () => {
      await user.click(contributeButtons[0]);
    });

    await waitFor(() =>
      expect(mockContributeLifeCycleModel).toHaveBeenCalledWith('model-1', '1.0.0'),
    );
    expect(logSpy).toHaveBeenCalledWith({ message: 'failed' });

    logSpy.mockRestore();
  });

  it('renders public actions without my-data toolbar and omits the heading when team lookup is empty', async () => {
    mockLocation = {
      pathname: '/tgdata/lifecyclemodels',
      search: '',
    };
    mockGetDataSource.mockReturnValue('tg');
    mockGetTeamById.mockResolvedValueOnce({ data: [] });

    renderWithProviders(<LifeCycleModelsPage />);

    await waitFor(() => expect(mockGetLifeCycleModelTableAll).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /export-lifecyclemodels-model-1-1.0.0/i }),
      ).toBeInTheDocument(),
    );

    expect(mockGetLifeCycleModelTableAll).toHaveBeenCalledWith(
      { pageSize: 10, current: 1 },
      {},
      'en',
      'tg',
      '',
      'all',
    );
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /table-filter/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /import-data/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /contribute-action/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /lifecycle-view-/i })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /lifecycle-edit-/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /lifecycle-delete-/i })).not.toBeInTheDocument();
    expect(screen.getAllByTestId('lifecycle-create-copy')).toHaveLength(2);
    expect(
      screen.getByRole('button', { name: /export-lifecyclemodels-model-1-1.0.0/i }),
    ).toBeInTheDocument();
  });

  it('opens and closes the route-driven edit drawer for my-data links', async () => {
    mockLocation = {
      pathname: '/mydata/lifecyclemodels',
      search: '?tid=team-1&id=model-route&version=9.9.9',
    };

    renderWithProviders(<LifeCycleModelsPage />);

    await waitFor(() =>
      expect(
        screen
          .getAllByTestId('lifecycle-edit')
          .some((node) => node.textContent?.includes('"autoOpen":true')),
      ).toBe(true),
    );

    const autoOpenEdit = screen
      .getAllByTestId('lifecycle-edit')
      .find((node) => node.textContent?.includes('"autoOpen":true'));

    expect(autoOpenEdit).toHaveTextContent('"id":"model-route"');
    expect(autoOpenEdit).toHaveTextContent('"version":"9.9.9"');

    await userEvent.click(
      within(autoOpenEdit!).getByRole('button', { name: /lifecycle-edit-close/i }),
    );

    await waitFor(() =>
      expect(
        screen
          .getAllByTestId('lifecycle-edit')
          .some((node) => node.textContent?.includes('"autoOpen":true')),
      ).toBe(false),
    );
  });
});
