// @ts-nocheck
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../../../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

const mockGetFlowTableAll = jest.fn(
  async (_params: any, _sort: any, _lang: string, dataSource: string) => ({
    data: [
      {
        id: `flow-${dataSource}`,
        version: '1.0.0',
        name: `${dataSource} flow`,
        flowType: dataSource === 'co' ? 'UNKNOWN_FLOW' : 'ELEMENTARY_FLOW',
        classification: 'cat',
        CASNumber: '123',
        synonyms: `${dataSource}-synonym`,
      },
    ],
    success: true,
  }),
);

const mockGetFlowTablePgroongaSearch = jest.fn(
  async (_params: any, _lang: string, dataSource: string, keyword: string) => ({
    data: [
      {
        id: `flow-${dataSource}-search`,
        version: '2.0.0',
        name: `${dataSource}:${keyword}`,
        flowType: dataSource === 'co' ? 'UNKNOWN_FLOW' : 'ELEMENTARY_FLOW',
        classification: 'cat',
        CASNumber: '123',
        synonyms: `${dataSource}:${keyword}:synonym`,
      },
    ],
    success: true,
  }),
);

const mockFlowHybridSearch = jest.fn(
  async (_params: any, _lang: string, dataSource: string, keyword: string) => ({
    data: [
      {
        id: `flow-${dataSource}-hybrid`,
        version: '3.0.0',
        name: `${dataSource}:${keyword}:hybrid`,
        flowType: dataSource === 'co' ? 'UNKNOWN_FLOW' : 'ELEMENTARY_FLOW',
        classification: 'cat',
        CASNumber: '123',
        synonyms: `${dataSource}:${keyword}:hybrid:synonym`,
      },
    ],
    success: true,
  }),
);

let mockNextRequestFilter: any = {};

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  flow_hybrid_search: (...args: any[]) => mockFlowHybridSearch(...args),
  getFlowTableAll: (...args: any[]) => mockGetFlowTableAll(...args),
  getFlowTablePgroongaSearch: (...args: any[]) => mockGetFlowTablePgroongaSearch(...args),
}));

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close-icon</span>,
  DatabaseOutlined: () => <span>database-icon</span>,
}));

jest.mock('@/style/custom.less', () => ({
  __esModule: true,
  default: { footer_right: 'footer-right' },
}));

jest.mock('@/pages/Flows/Components/create', () => ({
  __esModule: true,
  default: () => <span>create-flow</span>,
}));

jest.mock('@/pages/Flows/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span>{`view ${id}:${version}`}</span>,
}));

jest.mock('@/pages/Flows/Components/edit', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span>{`edit ${id}:${version}`}</span>,
}));

jest.mock('@/pages/Flows/Components/delete', () => ({
  __esModule: true,
  default: ({ id, version, setViewDrawerVisible }: any) => (
    <button type='button' onClick={() => setViewDrawerVisible?.(false)}>
      {`delete ${id}:${version}`}
    </button>
  ),
}));

jest.mock('@/pages/Flows/Components/optiondata', () => ({
  __esModule: true,
  flowTypeOptions: [{ value: 'ELEMENTARY_FLOW', label: 'Elementary flow' }],
}));

jest.mock('antd', () => {
  const React = require('react');

  const ConfigProvider = ({ children }: any) => <div>{children}</div>;
  const Button = ({ children, onClick, disabled, icon, type, ...rest }: any) => (
    <button
      type='button'
      data-button-type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...rest}
    >
      {icon}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ title, children }: any) => {
    const label = toText(title);
    if (React.isValidElement(children)) {
      return React.cloneElement(children, {
        'aria-label': children.props['aria-label'] ?? label,
      });
    }
    return <>{children}</>;
  };

  const Drawer = ({ open, title, extra, footer, children, onClose, getContainer }: any) => {
    if (!open) return null;
    getContainer?.();
    return (
      <section role='dialog' aria-label={toText(title) || 'drawer'}>
        <header>
          <div>{extra}</div>
          <button type='button' onClick={onClose}>
            close
          </button>
        </header>
        <div>{children}</div>
        <footer>{footer}</footer>
      </section>
    );
  };

  const Card = ({ children, tabList, activeTabKey, onTabChange }: any) => (
    <section>
      {tabList ? (
        <div>
          {tabList.map((tab: any) => (
            <button
              key={tab.key}
              type='button'
              data-active={String(activeTabKey === tab.key)}
              onClick={() => onTabChange?.(tab.key)}
            >
              {toText(tab.tab)}
            </button>
          ))}
        </div>
      ) : null}
      <div>{children}</div>
    </section>
  );

  const Search = ({ name, value = '', onChange, onSearch, placeholder }: any) => (
    <div>
      <input
        aria-label={name}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange?.({ target: { value: event.target.value } })}
      />
      <button type='button' onClick={() => onSearch?.(value)}>
        {`search-${name}`}
      </button>
    </div>
  );

  const Input = (() => null) as any;
  Input.Search = Search;

  const Checkbox = ({ onChange, children }: any) => (
    <label>
      <input
        type='checkbox'
        aria-label='open-ai'
        onChange={(event) => onChange?.({ target: { checked: event.target.checked } })}
      />
      {toText(children)}
    </label>
  );

  const Row = ({ children }: any) => <div>{children}</div>;
  const Col = ({ children }: any) => <div>{children}</div>;
  const Space = ({ children, className }: any) => <div className={className}>{children}</div>;

  return {
    __esModule: true,
    Button,
    Card,
    Checkbox,
    Col,
    ConfigProvider,
    Drawer,
    Input,
    Row,
    Space,
    Tooltip,
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProTable = ({ actionRef, request, rowSelection, toolBarRender, columns = [] }: any) => {
    const [rows, setRows] = React.useState<any[]>([]);
    const latestRequestRef = React.useRef(request);
    latestRequestRef.current = request;

    const api = React.useMemo(
      () => ({
        setPageInfo: jest.fn(),
        reload: jest.fn(async () => {
          const filter = mockNextRequestFilter;
          mockNextRequestFilter = {};
          const result = await latestRequestRef.current({ pageSize: 10, current: 1 }, {}, filter);
          setRows(result?.data ?? []);
          return result;
        }),
      }),
      [],
    );

    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = api;
      }
      api.reload();
    }, [actionRef, api, request]);

    return (
      <div>
        <div>{toolBarRender?.()}</div>
        {rows.map((row) => (
          <div key={`${row.id}:${row.version}`}>
            {columns.map((column: any, index: number) => (
              <div key={`${row.id}:${row.version}:${column.dataIndex ?? index}`}>
                {column.render
                  ? column.render(row[column.dataIndex], row, index)
                  : row[column.dataIndex]}
              </div>
            ))}
            <button
              type='button'
              data-selected={String(
                rowSelection?.selectedRowKeys?.includes?.(`${row.id}:${row.version}`) ?? false,
              )}
              onClick={() => rowSelection?.onChange?.([`${row.id}:${row.version}`])}
            >
              {row.name}
            </button>
          </div>
        ))}
      </div>
    );
  };

  return {
    __esModule: true,
    ActionType: class {},
    ProColumns: class {},
    ProTable,
  };
});

describe('FlowsSelectDrawer', () => {
  const FlowsSelectDrawer = require('@/pages/Flows/Components/select/drawer').default;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNextRequestFilter = {};
  });

  it('opens, switches datasets, renders row actions, performs my-data search, and submits', async () => {
    const onData = jest.fn();

    renderWithProviders(<FlowsSelectDrawer buttonType='text' lang='en' onData={onData} />);

    await userEvent.click(screen.getByRole('button', { name: /^select$/i }));

    await waitFor(() =>
      expect(mockGetFlowTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'tg',
        [],
        { flowType: '', asInput: undefined },
      ),
    );
    expect(screen.getByText('Elementary flow')).toBeInTheDocument();
    expect(screen.getByText('view flow-tg:1.0.0')).toBeInTheDocument();

    mockNextRequestFilter = { flowType: ['ELEMENTARY_FLOW'] };
    await userEvent.click(screen.getByRole('button', { name: /my data/i }));
    await waitFor(() =>
      expect(mockGetFlowTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'my',
        [],
        { flowType: 'ELEMENTARY_FLOW', asInput: undefined },
      ),
    );

    expect(screen.getByText('create-flow')).toBeInTheDocument();
    expect(screen.getByText('view flow-my:1.0.0')).toBeInTheDocument();
    expect(screen.getByText('edit flow-my:1.0.0')).toBeInTheDocument();
    expect(screen.getByText('delete flow-my:1.0.0')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'delete flow-my:1.0.0' }));

    await userEvent.type(screen.getByLabelText('my'), 'alpha');
    await userEvent.click(screen.getByRole('button', { name: 'search-my' }));

    await waitFor(() =>
      expect(mockGetFlowTablePgroongaSearch).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        'en',
        'my',
        'alpha',
        { flowType: '', asInput: undefined },
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: 'my:alpha' }));
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onData).toHaveBeenCalledWith('flow-my-search', '2.0.0');
    expect(screen.queryByRole('dialog', { name: 'Selete Flow' })).not.toBeInTheDocument();
  });

  it('covers tg/co/te searches, non-my option rendering, and my-tab reopen reset', async () => {
    const onData = jest.fn();

    renderWithProviders(<FlowsSelectDrawer buttonType='icon' lang='en' asInput onData={onData} />);

    await userEvent.click(screen.getByRole('button', { name: /^select$/i }));
    await screen.findByRole('dialog', { name: 'Selete Flow' });

    await userEvent.click(screen.getByLabelText('open-ai'));
    await userEvent.click(screen.getByLabelText('open-ai'));
    await userEvent.type(screen.getByLabelText('tg'), 'beta');
    await userEvent.click(screen.getByRole('button', { name: 'search-tg' }));

    await waitFor(() =>
      expect(mockGetFlowTablePgroongaSearch).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        'en',
        'tg',
        'beta',
        { flowType: '', asInput: true },
      ),
    );
    expect(screen.getByText('view flow-tg-search:2.0.0')).toBeInTheDocument();

    mockNextRequestFilter = { flowType: ['ELEMENTARY_FLOW'] };
    await userEvent.click(screen.getByRole('button', { name: /business data/i }));
    await waitFor(() =>
      expect(mockGetFlowTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'co',
        [],
        { flowType: 'ELEMENTARY_FLOW', asInput: true },
      ),
    );
    expect(screen.getByText('UNKNOWN_FLOW')).toBeInTheDocument();
    expect(screen.queryByText('create-flow')).not.toBeInTheDocument();
    expect(screen.queryByText('view flow-co:1.0.0')).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('co'), 'gamma');
    await userEvent.click(screen.getByRole('button', { name: 'search-co' }));

    await waitFor(() =>
      expect(mockGetFlowTablePgroongaSearch).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        'en',
        'co',
        'gamma',
        { flowType: '', asInput: true },
      ),
    );

    await userEvent.click(screen.getByLabelText('open-ai'));
    await userEvent.click(screen.getByRole('button', { name: 'search-co' }));

    await waitFor(() =>
      expect(mockFlowHybridSearch).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        'en',
        'co',
        'gamma',
        { flowType: '' },
      ),
    );

    mockNextRequestFilter = { flowType: ['ELEMENTARY_FLOW'] };
    await userEvent.click(screen.getByRole('button', { name: /tiangong data/i }));
    await waitFor(() =>
      expect(mockGetFlowTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'tg',
        [],
        { flowType: '', asInput: true },
      ),
    );

    mockNextRequestFilter = { flowType: ['ELEMENTARY_FLOW'] };
    await userEvent.click(screen.getByRole('button', { name: /te data/i }));
    await waitFor(() =>
      expect(mockGetFlowTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'te',
        [],
        { flowType: 'ELEMENTARY_FLOW', asInput: true },
      ),
    );
    expect(screen.getByText('create-flow')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('te'), 'delta');
    await userEvent.click(screen.getByRole('button', { name: 'search-te' }));

    await waitFor(() =>
      expect(mockGetFlowTablePgroongaSearch).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        'en',
        'te',
        'delta',
        { flowType: '', asInput: true },
      ),
    );

    mockNextRequestFilter = { flowType: ['ELEMENTARY_FLOW'] };
    await userEvent.click(screen.getByRole('button', { name: /my data/i }));
    await waitFor(() =>
      expect(mockGetFlowTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'my',
        [],
        { flowType: 'ELEMENTARY_FLOW', asInput: true },
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: 'my flow' }));
    expect(screen.getByRole('button', { name: 'my flow' })).toHaveAttribute(
      'data-selected',
      'true',
    );

    await userEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByRole('dialog', { name: 'Selete Flow' })).not.toBeInTheDocument();

    mockNextRequestFilter = { flowType: ['ELEMENTARY_FLOW'] };
    await userEvent.click(screen.getByRole('button', { name: /^select$/i }));
    await screen.findByRole('dialog', { name: 'Selete Flow' });

    await waitFor(() =>
      expect(mockGetFlowTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'my',
        [],
        { flowType: 'ELEMENTARY_FLOW', asInput: true },
      ),
    );
    expect(screen.getByRole('button', { name: 'my flow' })).toHaveAttribute(
      'data-selected',
      'false',
    );

    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onData).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Selete Flow' })).not.toBeInTheDocument();
  });

  it('supports custom text buttons and closes from cancel and the extra close icon', async () => {
    const onData = jest.fn();

    renderWithProviders(
      <FlowsSelectDrawer buttonType='text' buttonText='choose-flow' lang='en' onData={onData} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'choose-flow' }));
    await screen.findByRole('dialog', { name: 'Selete Flow' });

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('dialog', { name: 'Selete Flow' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'choose-flow' }));
    await screen.findByRole('dialog', { name: 'Selete Flow' });
    await userEvent.click(screen.getByRole('button', { name: /close-icon/i }));

    expect(onData).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Selete Flow' })).not.toBeInTheDocument();
  });
});
