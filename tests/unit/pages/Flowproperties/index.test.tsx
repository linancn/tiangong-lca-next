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

const mockGetFlowpropertyTableAll = jest.fn();
const mockGetFlowpropertyTablePgroongaSearch = jest.fn();
const mockFlowpropertyHybridSearch = jest.fn();
const mockGetDataSource = jest.fn(() => 'my');
const mockGetLang = jest.fn(() => 'en');
const mockGetLangText = jest.fn((value: any) => value?.[0]?.['#text'] ?? 'Team title');
const mockGetTeamById = jest.fn();
const mockGetUnitData = jest.fn();

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
  default: ({ importData }: any) => (
    <div data-testid='flowproperty-create'>
      {JSON.stringify({ importCount: importData?.length ?? 0 })}
    </div>
  ),
}));

jest.mock('@/pages/Flowproperties/Components/delete', () => ({
  __esModule: true,
  default: () => <div data-testid='flowproperty-delete' />,
}));

jest.mock('@/pages/Flowproperties/Components/edit', () => ({
  __esModule: true,
  default: () => <div data-testid='flowproperty-edit' />,
}));

jest.mock('@/pages/Flowproperties/Components/view', () => ({
  __esModule: true,
  default: () => <div data-testid='flowproperty-view' />,
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

    const reload = jest.fn(async () => requestRef.current?.({ pageSize: 10, current: 1 }, {}));

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
      </section>
    );
  };

  return {
    __esModule: true,
    PageContainer,
    ProTable,
  };
});

describe('FlowpropertiesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation = {
      pathname: '/mydata/flowproperties',
      search: '?tid=team-1',
    };
    mockGetTeamById.mockResolvedValue({
      data: [{ json: { title: [{ '@xml:lang': 'en', '#text': 'Flowproperty Team' }] } }],
    });
    mockGetFlowpropertyTableAll.mockResolvedValue({ data: [], success: true });
    mockGetFlowpropertyTablePgroongaSearch.mockResolvedValue({ data: [], success: true });
    mockFlowpropertyHybridSearch.mockResolvedValue({ data: [], success: true });
    mockGetUnitData.mockResolvedValue([]);
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
    expect(mockGetUnitData).toHaveBeenCalledWith('unitgroup', []);
    expect(screen.getByRole('heading', { name: 'Flowproperty Team' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /import-data/i }));
    expect(screen.getByTestId('flowproperty-create')).toHaveTextContent('"importCount":1');
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
});
