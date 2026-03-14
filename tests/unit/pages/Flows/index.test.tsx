// @ts-nocheck
import FlowsPage from '@/pages/Flows';
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
  pathname: '/mydata/flows',
  search: '?tid=team-1',
};

const mockGetFlowTableAll = jest.fn();
const mockGetFlowTablePgroongaSearch = jest.fn();
const mockFlowHybridSearch = jest.fn();
const mockGetCachedFlowCategorizationAll = jest.fn();
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

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  flow_hybrid_search: (...args: any[]) => mockFlowHybridSearch(...args),
  getFlowTableAll: (...args: any[]) => mockGetFlowTableAll(...args),
  getFlowTablePgroongaSearch: (...args: any[]) => mockGetFlowTablePgroongaSearch(...args),
}));

jest.mock('@/services/ilcd/cache', () => ({
  __esModule: true,
  getCachedFlowCategorizationAll: (...args: any[]) => mockGetCachedFlowCategorizationAll(...args),
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
  default: ({ importData }: any) => (
    <div data-testid='flow-create'>{JSON.stringify({ importCount: importData?.length ?? 0 })}</div>
  ),
}));

jest.mock('@/pages/Flows/Components/delete', () => ({
  __esModule: true,
  default: () => <div data-testid='flow-delete' />,
}));

jest.mock('@/pages/Flows/Components/edit', () => ({
  __esModule: true,
  default: () => <div data-testid='flow-edit' />,
}));

jest.mock('@/pages/Flows/Components/view', () => ({
  __esModule: true,
  default: () => <div data-testid='flow-view' />,
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
      <button type='button' onClick={() => onSearch?.('steel')}>
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

    const reload = jest.fn(async () => requestRef.current?.({ pageSize: 10, current: 1 }, {}, {}));
    const requestWith = jest.fn(
      async (sort: Record<string, string> = {}, filter: Record<string, any> = {}) =>
        requestRef.current?.({ pageSize: 10, current: 1 }, sort, filter),
    );

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
        <button type='button' onClick={() => requestWith({ modifiedAt: 'descend' }, {})}>
          request-unknown-sort
        </button>
      </section>
    );
  };

  return {
    __esModule: true,
    PageContainer,
    ProTable,
  };
});

describe('FlowsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation = {
      pathname: '/mydata/flows',
      search: '?tid=team-1',
    };
    mockGetTeamById.mockResolvedValue({
      data: [{ json: { title: [{ '@xml:lang': 'en', '#text': 'Flow Team' }] } }],
    });
    mockGetCachedFlowCategorizationAll.mockResolvedValue({
      categoryElementaryFlow: [],
      category: [],
    });
    mockGetFlowTableAll.mockResolvedValue({ data: [], success: true });
    mockGetFlowTablePgroongaSearch.mockResolvedValue({ data: [], success: true });
    mockFlowHybridSearch.mockResolvedValue({ data: [], success: true });
  });

  it('loads the default table and keeps imported data in the create action', async () => {
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

    await userEvent.click(screen.getByRole('button', { name: /import-data/i }));
    expect(screen.getByTestId('flow-create')).toHaveTextContent('"importCount":1');
  });

  it('reloads the table with the selected state filter', async () => {
    renderWithProviders(<FlowsPage />);

    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: /table-filter/i }));

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
  });

  it('uses the current state filter for pgroonga and AI search', async () => {
    renderWithProviders(<FlowsPage />);

    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /table-filter/i }));
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

    await userEvent.click(screen.getByRole('button', { name: /search/i }));
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

    await userEvent.click(screen.getByRole('checkbox', { name: /ai search/i }));
    await userEvent.click(screen.getByRole('button', { name: /search/i }));
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

  it('parses classification filters and converts sort fields for table requests', async () => {
    renderWithProviders(<FlowsPage />);

    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: /request-filter-sort/i }));

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

    await userEvent.click(screen.getByRole('button', { name: /request-unknown-sort/i }));

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

  it('omits my-data toolbar actions for non-my data sources', async () => {
    mockLocation = {
      pathname: '/tgdata/flows',
      search: '',
    };
    mockGetDataSource.mockReturnValue('tg');

    renderWithProviders(<FlowsPage />);

    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());

    expect(screen.queryByRole('button', { name: /table-filter/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /import-data/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('flow-create')).not.toBeInTheDocument();
  });
});
