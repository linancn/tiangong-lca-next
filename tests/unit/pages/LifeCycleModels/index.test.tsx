// @ts-nocheck
import LifeCycleModelsPage from '@/pages/LifeCycleModels';
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
    <div data-testid='all-versions'>{addVersionComponent?.({ newVersion: '02.00.000' })}</div>
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
  default: ({ actionType = 'create', importData, newVersion }: any) => (
    <div data-testid='lifecycle-create'>
      {JSON.stringify({
        actionType,
        importCount: importData?.length ?? 0,
        newVersion,
      })}
    </div>
  ),
}));

jest.mock('@/pages/LifeCycleModels/Components/delete', () => ({
  __esModule: true,
  default: ({ id }: any) => <div data-testid='lifecycle-delete'>{`delete:${id}`}</div>,
}));

jest.mock('@/pages/LifeCycleModels/Components/edit', () => ({
  __esModule: true,
  default: ({ id }: any) => <div data-testid='lifecycle-edit'>{`edit:${id}`}</div>,
}));

jest.mock('@/pages/LifeCycleModels/Components/view', () => ({
  __esModule: true,
  default: ({ id }: any) => <div data-testid='lifecycle-view'>{`view:${id}`}</div>,
}));

jest.mock('antd', () => {
  const React = require('react');

  const ConfigProvider = ({ children }: any) => <div>{children}</div>;
  const Card = ({ children }: any) => <section>{children}</section>;
  const Col = ({ children }: any) => <div>{children}</div>;
  const Row = ({ children }: any) => <div>{children}</div>;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Tooltip = ({ children }: any) => <>{children}</>;

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

  const Search = ({ onSearch, placeholder }: any) => {
    return (
      <div>
        <input aria-label='search-input' placeholder={placeholder} />
        <button type='button' onClick={() => onSearch?.('steel')}>
          search
        </button>
      </div>
    );
  };

  const Input = { Search };

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

jest.mock('@ant-design/pro-table', () => ({
  __esModule: true,
  TableDropdown: ({ menus = [] }: any) => <div>{menus.map((menu: any) => menu.name)}</div>,
}));

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const PageContainer = ({ children, header }: any) => (
    <div>
      <h1>{toText(header?.title)}</h1>
      {children}
    </div>
  );

  const ProTable = ({ actionRef, request, columns = [], toolBarRender, headerTitle }: any) => {
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
          <div key={`${row.id}-${rowIndex}`}>
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
      data: [
        {
          id: 'model-1',
          version: '1.0.0',
          name: 'Lifecycle model 1',
          generalComment: 'General comment',
          classification: 'Class A',
          modifiedAt: '2024-01-01',
          teamId: '',
        },
      ],
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

  it('loads the default my-data table, team title, and toolbar actions', async () => {
    renderWithProviders(<LifeCycleModelsPage />);

    await waitFor(() => expect(mockGetTeamById).toHaveBeenCalledWith('team-1'));
    await waitFor(() => expect(mockGetLifeCycleModelTableAll).toHaveBeenCalled());

    expect(mockGetLifeCycleModelTableAll).toHaveBeenCalledWith(
      { pageSize: 10, current: 1 },
      {},
      'en',
      'my',
      'team-1',
      'all',
    );

    expect(screen.getByRole('heading', { name: 'Team Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /ai search/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /table-filter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import-data/i })).toBeInTheDocument();
    expect(screen.getAllByTestId('lifecycle-create')[0]).toHaveTextContent('"actionType":"create"');
    expect(screen.getByTestId('lifecycle-view')).toHaveTextContent('view:model-1');
    expect(screen.getByTestId('lifecycle-edit')).toHaveTextContent('edit:model-1');
    expect(screen.getByTestId('lifecycle-delete')).toHaveTextContent('delete:model-1');
  });

  it('switches to pgroonga search and hybrid search from the same page workflow', async () => {
    renderWithProviders(<LifeCycleModelsPage />);
    await waitFor(() => expect(mockGetLifeCycleModelTableAll).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() =>
      expect(mockGetLifeCycleModelTablePgroongaSearch).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'steel',
        {},
        'all',
        undefined,
      ),
    );

    await userEvent.click(screen.getByRole('checkbox', { name: /ai search/i }));
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() =>
      expect(mockLifeCycleModelHybridSearch).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'steel',
        {},
        'all',
      ),
    );
  });

  it('contributes a row and reloads after success', async () => {
    renderWithProviders(<LifeCycleModelsPage />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /contribute-action/i })).toBeInTheDocument(),
    );

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /contribute-action/i }));
    });

    await waitFor(() =>
      expect(mockContributeLifeCycleModel).toHaveBeenCalledWith('model-1', '1.0.0'),
    );

    const { message } = jest.requireMock('antd');
    expect(message.success).toHaveBeenCalledWith('Contribute successfully');
    expect(latestReloadMock).toHaveBeenCalled();
  });

  it('persists imported json into the create action and reloads when the filter changes', async () => {
    renderWithProviders(<LifeCycleModelsPage />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /import-data/i })).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole('button', { name: /import-data/i }));
    expect(screen.getAllByTestId('lifecycle-create')[0]).toHaveTextContent('"importCount":1');

    await userEvent.click(screen.getByRole('button', { name: /table-filter/i }));
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
  });
});
