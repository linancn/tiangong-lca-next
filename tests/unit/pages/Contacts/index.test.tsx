// @ts-nocheck
import ContactsPage from '@/pages/Contacts';
import userEvent from '@testing-library/user-event';
import { act, renderWithProviders, screen, waitFor, within } from '../../../helpers/testUtils';

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
let mockBreakpointScreens: Record<string, boolean | undefined> = {};

const mockContributeSource = jest.fn();
const mockGetContactTableAll = jest.fn();
const mockGetContactTablePgroongaSearch = jest.fn();
const mockContactHybridSearch = jest.fn();
const mockGetDataSource = jest.fn(() => 'my');
const mockGetLang = jest.fn(() => 'en');
const mockGetLangText = jest.fn((value: any) => value?.[0]?.['#text'] ?? 'Team title');
const mockGetTeamById = jest.fn();

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
    locale: 'en-US',
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
  useLocation: () => mockLocation,
}));

jest.mock('@/services/contacts/api', () => ({
  __esModule: true,
  contact_hybrid_search: (...args: any[]) => mockContactHybridSearch(...args),
  getContactTableAll: (...args: any[]) => mockGetContactTableAll(...args),
  getContactTablePgroongaSearch: (...args: any[]) => mockGetContactTablePgroongaSearch(...args),
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
      <button type='button' onClick={() => onSearch?.('alice')}>
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
        {rows.map((row: any, rowIndex: number) => (
          <div key={rowKey?.(row) ?? `${row.id}-${rowIndex}`}>
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

describe('ContactsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestReloadMock = null;
    mockLocation = {
      pathname: '/mydata/contacts',
      search: '?tid=team-1',
    };
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
    mockContributeSource.mockResolvedValue({ error: null });
  });

  it('loads the default table and row actions', async () => {
    renderWithProviders(<ContactsPage />);

    await waitFor(() => expect(mockGetTeamById).toHaveBeenCalledWith('team-1'));
    await waitFor(() => expect(mockGetContactTableAll).toHaveBeenCalled());

    expect(mockGetContactTableAll).toHaveBeenCalledWith(
      { pageSize: 10, current: 1 },
      {},
      'en',
      'my',
      'team-1',
      'all',
    );

    expect(screen.getByRole('heading', { name: 'Contact Team' })).toBeInTheDocument();
    expect(await screen.findByTestId('contact-view')).toHaveTextContent('view:contact-1');
    expect(screen.getByTestId('contact-edit')).toHaveTextContent('edit:contact-1');
    expect(screen.getByTestId('contact-delete')).toHaveTextContent('delete:contact-1');
    expect(screen.getAllByTestId('contact-create')[0]).toHaveTextContent('"actionType":"create"');

    await userEvent.click(screen.getByRole('button', { name: /close-contact-edit/i }));
    await userEvent.click(screen.getByRole('button', { name: /close-contact-delete/i }));
  });

  it('uses compact mobile controls for my data rows', async () => {
    mockBreakpointScreens = { md: false };

    renderWithProviders(<ContactsPage />);

    await waitFor(() => expect(mockGetContactTableAll).toHaveBeenCalled());
    expect(await screen.findByTestId('contact-view')).toHaveTextContent('view:contact-1');
    expect(screen.getByRole('button', { name: /table-filter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import-data/i })).toBeInTheDocument();
  });

  it('supports pgroonga search, AI search, and contribute flows', async () => {
    renderWithProviders(<ContactsPage />);

    await screen.findByTestId('contact-view');

    await userEvent.click(screen.getByRole('button', { name: /table-filter/i }));
    await waitFor(() =>
      expect(mockGetContactTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
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
    expect(message.success).toHaveBeenCalledWith('Contribute successfully');
    expect(latestReloadMock).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() =>
      expect(mockGetContactTablePgroongaSearch).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'alice',
        {},
        '20',
      ),
    );

    await userEvent.click(screen.getByRole('checkbox', { name: /ai search/i }));
    await userEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() =>
      expect(mockContactHybridSearch).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'alice',
        {},
        '20',
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
        { pageSize: 10, current: 1 },
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

  it('renders the non-my toolbar variant without edit, delete, or contribute actions', async () => {
    mockLocation = {
      pathname: '/tgdata/contacts',
      search: '',
    };
    mockGetDataSource.mockReturnValue('tg');
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
  });

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

  it('renders a dash when classification is missing or invalid', async () => {
    mockGetContactTableAll.mockResolvedValue({
      data: [{ ...baseContactRow, classification: 'undefined' }],
      success: true,
    });

    renderWithProviders(<ContactsPage />);

    expect(await screen.findByText('-')).toBeInTheDocument();
  });
});
