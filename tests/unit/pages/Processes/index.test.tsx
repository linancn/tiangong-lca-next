// @ts-nocheck
import ProcessesPage, { getProcesstypeOfDataSetOptions } from '@/pages/Processes';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor, within } from '../../../helpers/testUtils';

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
  pathname: '/mydata/processes',
  search: '?tid=team-1',
};

const mockGetProcessTableAll = jest.fn();
const mockGetProcessTablePgroongaSearch = jest.fn();
const mockProcessHybridSearch = jest.fn();
const mockContributeProcess = jest.fn();
const mockContributeLifeCycleModel = jest.fn();
const mockGetDataSource = jest.fn(() => 'my');
const mockGetLang = jest.fn(() => 'en');
const mockGetLangText = jest.fn((value: any) => value?.[0]?.['#text'] ?? 'Team title');
const mockGetTeamById = jest.fn();
let latestRequest: any = null;

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  history: {
    push: jest.fn(),
  },
  useIntl: () => ({
    locale: 'en-US',
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
  useLocation: () => mockLocation,
}));

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  contributeProcess: (...args: any[]) => mockContributeProcess(...args),
  getProcessTableAll: (...args: any[]) => mockGetProcessTableAll(...args),
  getProcessTablePgroongaSearch: (...args: any[]) => mockGetProcessTablePgroongaSearch(...args),
  process_hybrid_search: (...args: any[]) => mockProcessHybridSearch(...args),
}));

jest.mock('@/services/lifeCycleModels/api', () => ({
  __esModule: true,
  contributeLifeCycleModel: (...args: any[]) => mockContributeLifeCycleModel(...args),
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  attachStateCodesToRows: jest.fn(async (_table: string, rows: any[]) => rows),
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
  default: ({ addVersionComponent }: any) => (
    <div data-testid='all-versions'>{addVersionComponent?.({ newVersion: '2.0.0' })}</div>
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
    <button type='button' onClick={() => onJsonData?.([{ processDataSet: {} }])}>
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

jest.mock('@/components/ToolBarButton', () => ({
  __esModule: true,
  default: ({ tooltip, onClick }: any) => (
    <button type='button' onClick={onClick}>
      {toText(tooltip)}
    </button>
  ),
}));

jest.mock('@/pages/Utils', () => ({
  __esModule: true,
  getAllVersionsColumns: jest.fn(() => []),
  getDataTitle: jest.fn(() => 'My Data'),
}));

jest.mock('@/pages/Processes/Components/create', () => ({
  __esModule: true,
  default: ({ actionType = 'create', id, version, newVersion, importData, onClose }: any) => (
    <div data-testid='process-create'>
      {JSON.stringify({
        actionType,
        id,
        version,
        newVersion,
        importCount: importData?.length ?? 0,
      })}
      <button type='button' onClick={() => onClose?.()}>
        process-create-close
      </button>
    </div>
  ),
}));

jest.mock('@/pages/Processes/Components/delete', () => ({
  __esModule: true,
  default: ({ id, version, setViewDrawerVisible }: any) => (
    <div data-testid='process-delete'>
      {`${id}:${version}`}
      <button type='button' onClick={() => setViewDrawerVisible?.()}>
        process-delete-close
      </button>
    </div>
  ),
}));

jest.mock('@/pages/Processes/Components/edit', () => ({
  __esModule: true,
  default: ({ id, version, autoOpen, setViewDrawerVisible }: any) => (
    <div data-testid='process-edit'>
      {JSON.stringify({ id, version, autoOpen })}
      <button type='button' onClick={() => setViewDrawerVisible?.()}>
        process-edit-close
      </button>
    </div>
  ),
}));

jest.mock('@/pages/Processes/Components/view', () => ({
  __esModule: true,
  default: ({ id, version, autoOpen, onDrawerClose }: any) => (
    <div data-testid='process-view'>
      {JSON.stringify({ id, version, autoOpen })}
      <button type='button' onClick={() => onDrawerClose?.()}>
        process-view-close
      </button>
    </div>
  ),
}));

jest.mock('@/pages/Processes/Components/lcaSolveToolbar', () => ({
  __esModule: true,
  default: () => <div data-testid='lca-solve-toolbar' />,
}));

jest.mock('@/pages/Processes/Components/ReviewDetail', () => ({
  __esModule: true,
  default: ({ processId, processVersion }: any) => (
    <div data-testid='review-detail'>{`${processId}:${processVersion}`}</div>
  ),
}));

jest.mock('@/pages/LifeCycleModels/Components/create', () => ({
  __esModule: true,
  default: ({ actionType = 'create', id, version }: any) => (
    <div data-testid='lifecycle-create'>{JSON.stringify({ actionType, id, version })}</div>
  ),
}));

jest.mock('@/pages/LifeCycleModels/Components/edit', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <div data-testid='lifecycle-edit'>{`${id}:${version}`}</div>,
}));

jest.mock('@/pages/LifeCycleModels/Components/view', () => ({
  __esModule: true,
  default: ({ id, version, disabled }: any) => (
    <div data-testid='lifecycle-view'>{JSON.stringify({ id, version, disabled })}</div>
  ),
}));

jest.mock('antd', () => {
  const React = require('react');

  const ConfigProvider = ({ children }: any) => <div>{children}</div>;
  const Card = ({ children }: any) => <section>{children}</section>;
  const Button = ({ children, icon, onClick }: any) => (
    <button type='button' onClick={onClick}>
      {icon}
      {children}
    </button>
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
  const Col = ({ children }: any) => <div>{children}</div>;
  const Row = ({ children }: any) => <div>{children}</div>;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Tooltip = ({ children, title }: any) => (
    <div>
      {toText(title)}
      {children}
    </div>
  );
  const Search = ({ onSearch, placeholder }: any) => (
    <div>
      <input aria-label='search-input' placeholder={placeholder} />
      <button type='button' onClick={() => onSearch?.('cement')}>
        search
      </button>
    </div>
  );
  const Input = { Search };
  const Select = ({ onChange }: any) => (
    <button type='button' onClick={() => onChange?.('gate to gate')}>
      dataset-filter
    </button>
  );
  Select.Option = ({ children }: any) => <>{children}</>;
  const message = {
    success: jest.fn(),
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
    Button,
    Checkbox,
    Col,
    ConfigProvider,
    Input,
    Select,
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
    <div data-testid='table-dropdown'>
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
    optionsRender,
    rowKey,
  }: any) => {
    const [rows, setRows] = React.useState<any[]>([]);
    const requestRef = React.useRef(request);

    React.useEffect(() => {
      requestRef.current = request;
      latestRequest = request;
    }, [request]);

    const reload = jest.fn(async () => {
      const result = await requestRef.current?.({ pageSize: 10, current: 1 }, {});
      setRows(result?.data ?? []);
      return result;
    });
    const reloadAndRest = jest.fn(async () =>
      requestRef.current?.({ pageSize: 10, current: 1 }, {}),
    );

    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = {
          reload,
          reloadAndRest,
          setPageInfo: jest.fn(),
        };
      }
      void reload();
    }, [actionRef, reload, reloadAndRest]);

    return (
      <section data-testid='pro-table'>
        <div>{toText(headerTitle)}</div>
        <div data-testid='options-with-reload'>
          {optionsRender?.({}, [
            <button key='reload' type='button'>
              reload-option
            </button>,
            <button key='density' type='button'>
              density-option
            </button>,
          ])}
        </div>
        <div data-testid='options-without-reload'>
          {optionsRender?.({}, [
            <button key='density' type='button'>
              density-option-2
            </button>,
          ])}
        </div>
        <div data-testid='options-with-undefined'>{optionsRender?.({}, undefined)}</div>
        <div>{toolBarRender?.()}</div>
        {rows.map((row: any, rowIndex: number) => (
          <div key={rowKey ? rowKey(row) : `${row.id}-${rowIndex}`}>
            {columns.map((column: any, columnIndex: number) => (
              <div key={`${row.id ?? 'row'}-${columnIndex}`}>
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

const { message } = require('antd');

describe('ProcessesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestRequest = null;
    mockLocation = {
      pathname: '/mydata/processes',
      search: '?tid=team-1',
    };
    mockGetDataSource.mockReturnValue('my');
    mockContributeProcess.mockResolvedValue({ error: null });
    mockContributeLifeCycleModel.mockResolvedValue({ error: null });
    mockGetTeamById.mockResolvedValue({
      data: [{ json: { title: [{ '@xml:lang': 'en', '#text': 'Process Team' }] } }],
    });
    mockGetProcessTableAll.mockResolvedValue({
      data: [
        {
          id: 'proc-1',
          version: '1.0.0',
          name: 'Cement process',
          generalComment: 'General comment',
          classification: 'Materials',
          typeOfDataSet: 'gate to gate',
          referenceYear: '2024',
          location: 'CN',
          modifiedAt: '2024-01-01T00:00:00Z',
          modelId: '',
          teamId: '',
        },
      ],
      success: true,
    });
    mockGetProcessTablePgroongaSearch.mockResolvedValue({ data: [], success: true });
    mockProcessHybridSearch.mockResolvedValue({ data: [], success: true });
    message.success.mockReset();
    message.error.mockReset();
  });

  it('maps known process dataset types and falls back to dash for unknown ones', () => {
    expect(toText(getProcesstypeOfDataSetOptions('LCI result'))).toBe('LCI result');
    expect(getProcesstypeOfDataSetOptions('not-a-real-type')).toBe('-');
  });

  it('loads the default table and keeps imported data in the create action', async () => {
    renderWithProviders(<ProcessesPage />);

    await waitFor(() => expect(mockGetTeamById).toHaveBeenCalledWith('team-1'));
    await waitFor(() => expect(mockGetProcessTableAll).toHaveBeenCalled());

    expect(mockGetProcessTableAll).toHaveBeenCalledWith(
      { pageSize: 10, current: 1 },
      {},
      'en',
      'my',
      'team-1',
      'all',
      'all',
    );
    expect(screen.getByRole('heading', { name: 'Process Team' })).toBeInTheDocument();
    expect(
      screen.getAllByText(
        (_content, element) => element?.textContent === 'General commentCement process',
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('Materials')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();
    expect(screen.getByText('CN')).toBeInTheDocument();
    expect(screen.getAllByTestId('lca-solve-toolbar')).toHaveLength(3);

    await userEvent.click(screen.getByRole('button', { name: /import-data/i }));
    const createAction = screen
      .getAllByTestId('process-create')
      .find((node) => node.textContent?.includes('"actionType":"create"'));
    expect(createAction).toHaveTextContent('"importCount":1');

    await userEvent.click(
      within(createAction!).getByRole('button', { name: /process-create-close/i }),
    );
    await waitFor(() => expect(createAction).toHaveTextContent('"importCount":0'));
  });

  it('navigates to the analysis page from the my-data toolbar action', async () => {
    const { history } = jest.requireMock('umi');

    renderWithProviders(<ProcessesPage />);

    await waitFor(() => expect(mockGetProcessTableAll).toHaveBeenCalled());

    await userEvent.click(screen.getAllByRole('button', { name: 'LCA Analysis' })[0]);

    expect(history.push).toHaveBeenCalledWith('/mydata/processes/analysis');
  });

  it('reloads the table when dataset type and state filters change', async () => {
    renderWithProviders(<ProcessesPage />);

    await waitFor(() => expect(mockGetProcessTableAll).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: /dataset-filter/i }));
    await waitFor(() =>
      expect(mockGetProcessTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'en',
        'my',
        'team-1',
        'all',
        'gate to gate',
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: /table-filter/i }));
    await waitFor(() =>
      expect(mockGetProcessTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'en',
        'my',
        'team-1',
        '20',
        'gate to gate',
      ),
    );
  });

  it('uses the current dataset type and state filter for pgroonga and AI search', async () => {
    renderWithProviders(<ProcessesPage />);

    await waitFor(() => expect(mockGetProcessTableAll).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /dataset-filter/i }));
    await waitFor(() =>
      expect(mockGetProcessTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'en',
        'my',
        'team-1',
        'all',
        'gate to gate',
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: /table-filter/i }));
    await waitFor(() =>
      expect(mockGetProcessTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'en',
        'my',
        'team-1',
        '20',
        'gate to gate',
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() =>
      expect(mockGetProcessTablePgroongaSearch).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'cement',
        {},
        '20',
        'gate to gate',
        undefined,
      ),
    );

    await userEvent.click(screen.getByRole('checkbox', { name: /ai search/i }));
    await userEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() =>
      expect(mockProcessHybridSearch).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'cement',
        {},
        '20',
        'gate to gate',
      ),
    );
  });

  it('maps search and table sort fields for pgroonga and table-all requests', async () => {
    renderWithProviders(<ProcessesPage />);

    await waitFor(() => expect(mockGetProcessTableAll).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => expect(mockGetProcessTablePgroongaSearch).toHaveBeenCalled());

    await latestRequest({ pageSize: 10, current: 1 }, { name: 'ascend' });
    expect(mockGetProcessTablePgroongaSearch).toHaveBeenLastCalledWith(
      { pageSize: 10, current: 1 },
      'en',
      'my',
      'cement',
      {},
      'all',
      'all',
      { key: 'baseName', lang: 'en', order: 'asc' },
    );

    await latestRequest({ pageSize: 10, current: 1 }, { name: 'descend' });
    expect(mockGetProcessTablePgroongaSearch).toHaveBeenLastCalledWith(
      { pageSize: 10, current: 1 },
      'en',
      'my',
      'cement',
      {},
      'all',
      'all',
      { key: 'baseName', lang: 'en', order: 'desc' },
    );

    await latestRequest({ pageSize: 10, current: 1 }, { classification: 'descend' });
    expect(mockGetProcessTablePgroongaSearch).toHaveBeenLastCalledWith(
      { pageSize: 10, current: 1 },
      'en',
      'my',
      'cement',
      {},
      'all',
      'all',
      { key: 'common:class', order: 'desc' },
    );

    await latestRequest({ pageSize: 10, current: 1 }, { classification: 'ascend' });
    expect(mockGetProcessTablePgroongaSearch).toHaveBeenLastCalledWith(
      { pageSize: 10, current: 1 },
      'en',
      'my',
      'cement',
      {},
      'all',
      'all',
      { key: 'common:class', order: 'asc' },
    );

    mockLocation = {
      pathname: '/mydata/processes',
      search: '?tid=team-1',
    };
    renderWithProviders(<ProcessesPage />);

    await waitFor(() => expect(mockGetProcessTableAll).toHaveBeenCalled());
    await latestRequest({ pageSize: 10, current: 1 }, { name: 'ascend' });
    expect(mockGetProcessTableAll).toHaveBeenLastCalledWith(
      { pageSize: 10, current: 1 },
      {
        'json->processDataSet->processInformation->dataSetInformation->name': 'ascend',
      },
      'en',
      'my',
      'team-1',
      'all',
      'all',
    );

    await latestRequest({ pageSize: 10, current: 1 }, { location: 'descend' });
    expect(mockGetProcessTableAll).toHaveBeenLastCalledWith(
      { pageSize: 10, current: 1 },
      { location: 'descend' },
      'en',
      'my',
      'team-1',
      'all',
      'all',
    );
  });

  it('opens and closes the route-driven edit drawer for my-data links', async () => {
    mockLocation = {
      pathname: '/mydata/processes',
      search: '?tid=team-1&id=proc-99&version=9.9.9',
    };

    renderWithProviders(<ProcessesPage />);

    await waitFor(() =>
      expect(
        screen
          .getAllByTestId('process-edit')
          .some((node) => node.textContent?.includes('"autoOpen":true')),
      ).toBe(true),
    );

    const autoOpenEdit = screen
      .getAllByTestId('process-edit')
      .find((node) => node.textContent?.includes('"autoOpen":true'));
    expect(autoOpenEdit).toHaveTextContent('"id":"proc-99"');
    expect(autoOpenEdit).toHaveTextContent('"version":"9.9.9"');

    await userEvent.click(
      within(autoOpenEdit!).getByRole('button', { name: /process-edit-close/i }),
    );

    await waitFor(() =>
      expect(
        screen
          .queryAllByTestId('process-edit')
          .some((node) => node.textContent?.includes('"autoOpen":true')),
      ).toBe(false),
    );
  });

  it('opens and closes the route-driven view drawer for my-data view links', async () => {
    mockLocation = {
      pathname: '/mydata/processes',
      search: '?tid=team-1&id=proc-view&version=8.8.8&mode=view',
    };

    renderWithProviders(<ProcessesPage />);

    await waitFor(() =>
      expect(
        screen
          .getAllByTestId('process-view')
          .some((node) => node.textContent?.includes('"autoOpen":true')),
      ).toBe(true),
    );

    const autoOpenView = screen
      .getAllByTestId('process-view')
      .find((node) => node.textContent?.includes('"autoOpen":true'));
    expect(autoOpenView).toHaveTextContent('"id":"proc-view"');
    expect(autoOpenView).toHaveTextContent('"version":"8.8.8"');
    expect(
      screen
        .queryAllByTestId('process-edit')
        .some((node) => node.textContent?.includes('"autoOpen":true')),
    ).toBe(false);

    await userEvent.click(
      within(autoOpenView!).getByRole('button', { name: /process-view-close/i }),
    );

    await waitFor(() =>
      expect(
        screen
          .queryAllByTestId('process-view')
          .some((node) => node.textContent?.includes('"autoOpen":true')),
      ).toBe(false),
    );
  });

  it('renders my-data process actions and contributes process data successfully', async () => {
    renderWithProviders(<ProcessesPage />);

    await waitFor(() => expect(mockGetProcessTableAll).toHaveBeenCalled());

    expect(screen.getByTestId('process-view')).toHaveTextContent('"id":"proc-1"');
    expect(screen.getByTestId('process-view')).toHaveTextContent('"version":"1.0.0"');
    expect(screen.getByTestId('process-delete')).toHaveTextContent('proc-1:1.0.0');
    expect(screen.getByTestId('review-detail')).toHaveTextContent('proc-1:1.0.0');
    expect(screen.getByTestId('export-data')).toHaveTextContent('processes:proc-1:1.0.0');
    expect(screen.getByTestId('lifecycle-view')).toHaveTextContent('"disabled":true');
    expect(
      screen
        .getAllByTestId('process-create')
        .some((node) => node.textContent?.includes('"actionType":"copy"')),
    ).toBe(true);
    expect(
      screen
        .getAllByTestId('process-create')
        .some((node) => node.textContent?.includes('"actionType":"createVersion"')),
    ).toBe(true);

    await userEvent.click(
      within(screen.getByTestId('process-edit')).getByRole('button', {
        name: /process-edit-close/i,
      }),
    );
    await userEvent.click(
      within(screen.getByTestId('process-delete')).getByRole('button', {
        name: /process-delete-close/i,
      }),
    );

    await userEvent.click(screen.getByRole('button', { name: /contribute-action/i }));
    await waitFor(() => expect(mockContributeProcess).toHaveBeenCalledWith('proc-1', '1.0.0'));
    expect(message.success).toHaveBeenCalledWith('Contribute successfully');
  });

  it('logs process contribution errors without showing success', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockContributeProcess.mockResolvedValue({ error: { message: 'failed' } });

    renderWithProviders(<ProcessesPage />);

    await waitFor(() => expect(mockGetProcessTableAll).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /contribute-action/i }));

    await waitFor(() => expect(consoleLogSpy).toHaveBeenCalledWith({ message: 'failed' }));
    expect(message.success).not.toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  it('logs lifecycle-model contribution errors for model-backed rows', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockContributeLifeCycleModel.mockResolvedValue({ error: { message: 'model-failed' } });
    mockGetProcessTableAll.mockResolvedValue({
      data: [
        {
          id: 'proc-2',
          version: '2.0.0',
          name: 'Model-backed process',
          generalComment: '',
          classification: 'Energy',
          typeOfDataSet: 'LCI result',
          referenceYear: '2024',
          location: 'EU',
          modifiedAt: '2024-02-01T00:00:00Z',
          modelId: 'model-2',
          teamId: '',
        },
      ],
      success: true,
    });

    renderWithProviders(<ProcessesPage />);

    await waitFor(() => expect(mockGetProcessTableAll).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /contribute-action/i }));

    await waitFor(() =>
      expect(mockContributeLifeCycleModel).toHaveBeenCalledWith('model-2', '2.0.0'),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith({ message: 'model-failed' });
    expect(message.success).not.toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  it('renders model-backed my-data actions and contributes lifecycle models', async () => {
    mockGetProcessTableAll.mockResolvedValue({
      data: [
        {
          id: 'proc-2',
          version: '2.0.0',
          name: 'Model-backed process',
          generalComment: '',
          classification: 'undefined',
          typeOfDataSet: 'unknown',
          referenceYear: '',
          location: '',
          modifiedAt: '2024-02-01T00:00:00Z',
          modelId: 'model-2',
          teamId: '',
        },
      ],
      success: true,
    });

    renderWithProviders(<ProcessesPage />);

    await waitFor(() => expect(mockGetProcessTableAll).toHaveBeenCalled());

    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('lifecycle-view')).toHaveTextContent('"id":"model-2"');
    expect(screen.getByTestId('lifecycle-edit')).toHaveTextContent('model-2:2.0.0');
    expect(screen.queryByTestId('process-edit')).not.toBeInTheDocument();
    expect(screen.getByTestId('lifecycle-create')).toHaveTextContent('"actionType":"copy"');

    await userEvent.click(screen.getByRole('button', { name: /contribute-action/i }));
    await waitFor(() =>
      expect(mockContributeLifeCycleModel).toHaveBeenCalledWith('model-2', '2.0.0'),
    );
    expect(message.success).toHaveBeenCalledWith('Contribute successfully');
  });

  it('renders tgdata and shared-data action layouts without my-data controls', async () => {
    mockGetProcessTableAll.mockResolvedValue({
      data: [
        {
          id: 'proc-3',
          version: '3.0.0',
          name: 'TG process',
          generalComment: '',
          classification: 'Energy',
          typeOfDataSet: 'gate to gate',
          referenceYear: '2023',
          location: 'EU',
          modifiedAt: '2024-03-01T00:00:00Z',
          modelId: '',
          teamId: 'team-1',
        },
      ],
      success: true,
    });
    mockGetDataSource.mockReturnValue('tg');

    const { rerender } = renderWithProviders(<ProcessesPage />);

    await waitFor(() => expect(mockGetProcessTableAll).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /table-filter/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /import-data/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('process-delete')).not.toBeInTheDocument();
    expect(screen.getByTestId('review-detail')).toHaveTextContent('proc-3:3.0.0');
    expect(screen.getByText('reload-option')).toBeInTheDocument();
    expect(screen.queryByTestId('lca-solve-toolbar')).not.toBeInTheDocument();

    mockGetDataSource.mockReturnValue('co');
    rerender(<ProcessesPage />);

    await waitFor(() => expect(mockGetProcessTableAll).toHaveBeenCalled());
    expect(screen.queryByTestId('review-detail')).not.toBeInTheDocument();
    expect(screen.queryByTestId('process-delete')).not.toBeInTheDocument();
    expect(
      screen
        .getAllByTestId('process-create')
        .some((node) => node.textContent?.includes('"actionType":"copy"')),
    ).toBe(true);
  });

  it('falls back to empty tid and null team when the route has no team query or team data payload', async () => {
    mockLocation = {
      pathname: '/mydata/processes',
      search: '',
    };
    mockGetTeamById.mockResolvedValue({
      data: [undefined],
    });

    renderWithProviders(<ProcessesPage />);

    await waitFor(() => expect(mockGetTeamById).toHaveBeenCalledWith(''));
    await waitFor(() =>
      expect(mockGetProcessTableAll).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'en',
        'my',
        '',
        'all',
        'all',
      ),
    );
    expect(screen.getByRole('heading').textContent).toBe('');
  });

  it('falls back to an empty table result when the process list request returns undefined', async () => {
    mockGetProcessTableAll.mockResolvedValueOnce(undefined);

    renderWithProviders(<ProcessesPage />);

    await waitFor(() => expect(mockGetProcessTableAll).toHaveBeenCalled());
    expect(screen.getByRole('heading', { name: 'Process Team' })).toBeInTheDocument();
    expect(screen.queryAllByTestId('process-view')).toHaveLength(0);
  });

  it('falls back to an empty table and shows a toast when loading the process list throws', async () => {
    mockGetProcessTableAll.mockRejectedValue(new Error('network down'));

    renderWithProviders(<ProcessesPage />);

    await waitFor(() => expect(mockGetProcessTableAll).toHaveBeenCalled());
    await waitFor(() => expect(message.error).toHaveBeenCalledWith('Failed to load process list.'));
    expect(screen.queryAllByTestId('process-view')).toHaveLength(0);
  });
});
