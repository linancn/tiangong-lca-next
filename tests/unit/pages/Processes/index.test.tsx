// @ts-nocheck
import ProcessesPage from '@/pages/Processes';
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
  pathname: '/mydata/processes',
  search: '?tid=team-1',
};

const mockGetProcessTableAll = jest.fn();
const mockGetProcessTablePgroongaSearch = jest.fn();
const mockProcessHybridSearch = jest.fn();
const mockGetDataSource = jest.fn(() => 'my');
const mockGetLang = jest.fn(() => 'en');
const mockGetLangText = jest.fn((value: any) => value?.[0]?.['#text'] ?? 'Team title');
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

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  contributeProcess: jest.fn(),
  getProcessTableAll: (...args: any[]) => mockGetProcessTableAll(...args),
  getProcessTablePgroongaSearch: (...args: any[]) => mockGetProcessTablePgroongaSearch(...args),
  process_hybrid_search: (...args: any[]) => mockProcessHybridSearch(...args),
}));

jest.mock('@/services/lifeCycleModels/api', () => ({
  __esModule: true,
  contributeLifeCycleModel: jest.fn(),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getDataSource: (...args: any[]) => mockGetDataSource(...args),
  getLang: (...args: any[]) => mockGetLang(...args),
  getLangText: (...args: any[]) => mockGetLangText(...args),
}));

jest.mock('@/services/teams/api', () => ({
  __esModule: true,
  getTeamById: (...args: any[]) => mockGetTeamById(...args),
}));

jest.mock('@/components/AllVersions', () => ({
  __esModule: true,
  default: () => <div data-testid='all-versions' />,
}));

jest.mock('@/components/ContributeData', () => ({
  __esModule: true,
  default: () => <button type='button'>contribute-action</button>,
}));

jest.mock('@/components/ExportData', () => ({
  __esModule: true,
  default: () => <div data-testid='export-data' />,
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

jest.mock('@/pages/Utils', () => ({
  __esModule: true,
  getAllVersionsColumns: jest.fn(() => []),
  getDataTitle: jest.fn(() => 'My Data'),
}));

jest.mock('@/pages/Processes/Components/create', () => ({
  __esModule: true,
  default: ({ importData }: any) => (
    <div data-testid='process-create'>
      {JSON.stringify({ importCount: importData?.length ?? 0 })}
    </div>
  ),
}));

jest.mock('@/pages/Processes/Components/delete', () => ({
  __esModule: true,
  default: () => <div data-testid='process-delete' />,
}));

jest.mock('@/pages/Processes/Components/edit', () => ({
  __esModule: true,
  default: () => <div data-testid='process-edit' />,
}));

jest.mock('@/pages/Processes/Components/view', () => ({
  __esModule: true,
  default: () => <div data-testid='process-view' />,
}));

jest.mock('@/pages/Processes/Components/lcaSolveToolbar', () => ({
  __esModule: true,
  default: () => <div data-testid='lca-solve-toolbar' />,
}));

jest.mock('@/pages/Processes/Components/ReviewDetail', () => ({
  __esModule: true,
  default: () => <div data-testid='review-detail' />,
}));

jest.mock('@/pages/LifeCycleModels/Components/create', () => ({
  __esModule: true,
  default: () => <div data-testid='lifecycle-create' />,
}));

jest.mock('@/pages/LifeCycleModels/Components/edit', () => ({
  __esModule: true,
  default: () => <div data-testid='lifecycle-edit' />,
}));

jest.mock('@/pages/LifeCycleModels/Components/view', () => ({
  __esModule: true,
  default: () => <div data-testid='lifecycle-view' />,
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

jest.mock('@ant-design/pro-table', () => ({
  __esModule: true,
  TableDropdown: () => <div />,
}));

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const PageContainer = ({ children, header }: any) => (
    <div>
      <h1>{toText(header?.title)}</h1>
      {children}
    </div>
  );

  const ProTable = ({ actionRef, request, toolBarRender, headerTitle }: any) => {
    const requestRef = React.useRef(request);

    React.useEffect(() => {
      requestRef.current = request;
    }, [request]);

    const reload = jest.fn(async () => requestRef.current?.({ pageSize: 10, current: 1 }, {}));
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
        <div>{toolBarRender?.()}</div>
      </section>
    );
  };

  return {
    __esModule: true,
    PageContainer,
    ProTable,
  };
});

describe('ProcessesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation = {
      pathname: '/mydata/processes',
      search: '?tid=team-1',
    };
    mockGetTeamById.mockResolvedValue({
      data: [{ json: { title: [{ '@xml:lang': 'en', '#text': 'Process Team' }] } }],
    });
    mockGetProcessTableAll.mockResolvedValue({ data: [], success: true });
    mockGetProcessTablePgroongaSearch.mockResolvedValue({ data: [], success: true });
    mockProcessHybridSearch.mockResolvedValue({ data: [], success: true });
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

    await userEvent.click(screen.getByRole('button', { name: /import-data/i }));
    expect(screen.getByTestId('process-create')).toHaveTextContent('"importCount":1');
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
});
