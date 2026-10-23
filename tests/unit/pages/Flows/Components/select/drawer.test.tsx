// @ts-nocheck
import userEvent from '@testing-library/user-event';
import {
  act,
  renderWithProviders,
  screen,
  waitFor,
  within,
} from '../../../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

let mockLatestFlowSelectorTableProps: any;

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
  useLocation: () => ({ pathname: '/flows' }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  BarsOutlined: () => <span>bars-icon</span>,
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

jest.mock('@/components/AllVersions', () => ({
  __esModule: true,
  default: ({
    id,
    addVersionComponent,
    operationRender,
    operationColumnWidth,
    onSelectVersion,
  }: any) => (
    <div data-testid={`all-versions-${id}`} data-operation-width={operationColumnWidth}>
      {addVersionComponent?.({ newVersion: '02.00.000' })}
      <div data-testid={`all-versions-operation-${id}`}>
        {operationRender?.({ id, version: '02.00.000' })}
      </div>
      <button type='button' onClick={() => onSelectVersion?.({ id, version: '02.00.000' })}>
        select-version-{id}
      </button>
      <button type='button' onClick={() => onSelectVersion?.({ id })}>
        select-version-missing-version-{id}
      </button>
    </div>
  ),
}));

jest.mock('antd', () => {
  const React = require('react');

  const Badge = ({ children }: any) => <span>{children}</span>;
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

  const Checkbox = ({ checked, onChange, children }: any) => (
    <label>
      <input
        type='checkbox'
        aria-label='open-ai'
        checked={checked}
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
    Badge,
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

  const ProTable = ({
    actionRef,
    request,
    params = {},
    rowSelection,
    toolBarRender,
    columns = [],
    toolbar,
    rowKey,
  }: any) => {
    const [rows, setRows] = React.useState<any[]>([]);
    const [flowTypeFilter, setFlowTypeFilter] = React.useState('');
    const flowTypeFilterRef = React.useRef(flowTypeFilter);
    flowTypeFilterRef.current = flowTypeFilter;
    const latestRequestRef = React.useRef(request);
    const latestParamsRef = React.useRef(params);
    latestRequestRef.current = request;
    latestParamsRef.current = params;

    const api = React.useMemo(
      () => ({
        setPageInfo: jest.fn(),
        reload: jest.fn(async () => {
          const filter = flowTypeFilterRef.current ? { flowType: [flowTypeFilterRef.current] } : {};
          const result = await latestRequestRef.current(
            { ...latestParamsRef.current, pageSize: 10, current: 1 },
            {},
            filter,
          );
          setRows(result?.data ?? []);
          return result;
        }),
      }),
      [],
    );

    mockLatestFlowSelectorTableProps = { rowKey, rowSelection, params, api, request };
    const serializedParams = JSON.stringify(params);

    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = api;
      }
      api.reload();
    }, [actionRef, api, serializedParams, flowTypeFilter]);

    return (
      <div>
        <select
          aria-label='Flow type filter'
          value={flowTypeFilter}
          onChange={(event) => setFlowTypeFilter(event.target.value)}
        >
          <option value=''>All flow types</option>
          {(columns.find((column: any) => column.dataIndex === 'flowType')?.filters ?? []).map(
            (option: any) => (
              <option key={option.value} value={option.value}>
                {option.text}
              </option>
            ),
          )}
        </select>
        {toolbar?.search}
        {toolbar?.filter}
        <div>{toolBarRender?.()}</div>
        {rows.map((row) => (
          <div key={rowKey(row)} data-testid={`flow-selector-row-${rowKey(row)}`}>
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
    mockLatestFlowSelectorTableProps = undefined;
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
    expect(
      screen.getByText('Elementary flow', { selector: '.responsive-data-list-cell-text' }),
    ).toHaveAttribute('title', 'Elementary flow');
    expect(screen.getByText('view flow-tg:1.0.0')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /my data/i }));
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Flow type filter' }),
      'ELEMENTARY_FLOW',
    );
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
    expect(screen.getByTestId('all-versions-flow-my')).toHaveAttribute(
      'data-operation-width',
      '184',
    );
    await userEvent.click(screen.getByRole('button', { name: 'delete flow-my:1.0.0' }));

    await userEvent.click(screen.getByRole('button', { name: 'select-version-flow-my' }));
    expect(onData).toHaveBeenCalledWith('flow-my', '02.00.000');
    expect(screen.queryByRole('dialog', { name: 'Select Flow' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^select$/i }));
    await screen.findByRole('dialog', { name: 'Select Flow' });
    // The native table remounts after version selection closes the drawer.
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Flow type filter' }),
      'ELEMENTARY_FLOW',
    );

    await userEvent.type(screen.getByLabelText('my'), 'alpha');
    await userEvent.click(screen.getByRole('button', { name: 'search-my' }));

    await waitFor(() =>
      expect(mockGetFlowTablePgroongaSearch).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        'en',
        'my',
        'alpha',
        { flowType: 'ELEMENTARY_FLOW', asInput: undefined },
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: 'my:alpha' }));
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onData).toHaveBeenCalledWith('flow-my-search', '2.0.0');
    expect(screen.queryByRole('dialog', { name: 'Select Flow' })).not.toBeInTheDocument();
  });

  it('covers tg/co/te searches, non-my option rendering, and my-tab reopen reset', async () => {
    const onData = jest.fn();

    renderWithProviders(<FlowsSelectDrawer buttonType='icon' lang='en' asInput onData={onData} />);

    await userEvent.click(screen.getByRole('button', { name: /^select$/i }));
    await screen.findByRole('dialog', { name: 'Select Flow' });

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

    await userEvent.click(screen.getByRole('button', { name: /business data/i }));
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Flow type filter' }),
      'ELEMENTARY_FLOW',
    );
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
        { flowType: 'ELEMENTARY_FLOW', asInput: true },
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
        { flowType: 'ELEMENTARY_FLOW' },
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: /tiangong data/i }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Flow type filter' }), '');
    await userEvent.clear(screen.getByLabelText('tg'));
    await userEvent.click(screen.getByRole('button', { name: 'search-tg' }));
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

    await userEvent.click(screen.getByRole('button', { name: /team data/i }));
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Flow type filter' }),
      'ELEMENTARY_FLOW',
    );
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
        { flowType: 'ELEMENTARY_FLOW', asInput: true },
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: /my data/i }));
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Flow type filter' }),
      'ELEMENTARY_FLOW',
    );
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
    expect(screen.queryByRole('dialog', { name: 'Select Flow' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^select$/i }));
    await screen.findByRole('dialog', { name: 'Select Flow' });
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Flow type filter' }),
      'ELEMENTARY_FLOW',
    );

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
    expect(screen.queryByRole('dialog', { name: 'Select Flow' })).not.toBeInTheDocument();
  });

  it('supports custom text buttons and closes from cancel and the extra close icon', async () => {
    const onData = jest.fn();

    renderWithProviders(
      <FlowsSelectDrawer buttonType='text' buttonText='choose-flow' lang='en' onData={onData} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'choose-flow' }));
    await screen.findByRole('dialog', { name: 'Select Flow' });

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('dialog', { name: 'Select Flow' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'choose-flow' }));
    await screen.findByRole('dialog', { name: 'Select Flow' });
    await userEvent.click(screen.getByRole('button', { name: /close-icon/i }));

    expect(onData).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Select Flow' })).not.toBeInTheDocument();
  });
  it.each([
    ['tg', 'TianGong Data'],
    ['co', 'Business Data'],
    ['my', 'My Data'],
    ['te', 'Team Data'],
  ])(
    'clears exact-version selection and returns the %s query to the first page when classification changes',
    async (scope, tabLabel) => {
      const first = {
        id: 'same-dataset',
        version: '01.00.000',
        name: 'Versioned flow',
        flowType: 'ELEMENTARY_FLOW',
      };
      const second = { ...first, version: '02.00.000' };
      mockGetFlowTableAll.mockResolvedValue({ data: [first, second], success: true, total: 2 });
      renderWithProviders(
        <FlowsSelectDrawer
          buttonType='text'
          buttonText='Choose versioned flow'
          lang='en'
          onData={jest.fn()}
        />,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Choose versioned flow' }));
      if (scope !== 'tg') await userEvent.click(screen.getByRole('button', { name: tabLabel }));
      await waitFor(() => expect(mockGetFlowTableAll.mock.calls.at(-1)?.[3]).toBe(scope));
      expect(mockLatestFlowSelectorTableProps.rowKey(first)).toBe('same-dataset:01.00.000');
      expect(mockLatestFlowSelectorTableProps.rowKey(second)).toBe('same-dataset:02.00.000');
      const firstRow = screen.getByTestId('flow-selector-row-same-dataset:01.00.000');
      await userEvent.click(within(firstRow).getByRole('button', { name: 'Versioned flow' }));
      expect(mockLatestFlowSelectorTableProps.rowSelection.selectedRowKeys).toEqual([
        'same-dataset:01.00.000',
      ]);
      mockLatestFlowSelectorTableProps.api.setPageInfo.mockClear();
      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Classification' }), 'C');
      await waitFor(() =>
        expect(mockGetFlowTableAll.mock.calls.at(-1)?.[0].classification).toEqual([
          { scope: 'classification', code: 'C', path: ['C'] },
        ]),
      );
      expect(mockLatestFlowSelectorTableProps.rowSelection.selectedRowKeys).toEqual([]);
      expect(mockLatestFlowSelectorTableProps.api.setPageInfo).toHaveBeenCalledWith({ current: 1 });
      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Classification' }), '');
      await waitFor(() =>
        expect(mockGetFlowTableAll.mock.calls.at(-1)?.[0].classification).toEqual([]),
      );
      expect(mockGetFlowTableAll.mock.calls.at(-1)?.[3]).toBe(scope);
    },
  );
  it.each([
    ['co', 'Business Data'],
    ['te', 'Team Data'],
  ])(
    'requests unfiltered %s lists and full-text results when no header flow type is selected',
    async (scope, label) => {
      renderWithProviders(
        <FlowsSelectDrawer
          buttonType='text'
          buttonText='Choose unfiltered flow'
          lang='en'
          onData={jest.fn()}
        />,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Choose unfiltered flow' }));
      await userEvent.click(screen.getByRole('button', { name: label }));
      await waitFor(() =>
        expect(mockGetFlowTableAll).toHaveBeenCalledWith(
          expect.objectContaining({ current: 1, pageSize: 10, classification: [] }),
          {},
          'en',
          scope,
          [],
          { flowType: '', asInput: undefined },
        ),
      );
      expect(screen.getByRole('combobox', { name: 'Flow type filter' })).toHaveValue('');
      await userEvent.type(screen.getByLabelText(scope), 'unfiltered keyword');
      await userEvent.click(screen.getByRole('button', { name: `search-${scope}` }));
      await waitFor(() =>
        expect(mockGetFlowTablePgroongaSearch).toHaveBeenCalledWith(
          expect.objectContaining({ current: 1, pageSize: 10, classification: [] }),
          'en',
          scope,
          'unfiltered keyword',
          { flowType: '', asInput: undefined },
        ),
      );
    },
  );
});

describe('FlowsSelectDrawer submitted search', () => {
  const FlowsSelectDrawer = require('@/pages/Flows/Components/select/drawer').default;

  beforeEach(() => {
    mockGetFlowTableAll.mockReset();
    mockGetFlowTablePgroongaSearch.mockReset();
    mockFlowHybridSearch.mockReset();
    mockLatestFlowSelectorTableProps = undefined;
  });
  it.each([
    ['tg', 'TianGong Data', true],
    ['co', 'Business Data', true],
    ['my', 'My Data', false],
    ['te', 'Team Data', false],
  ])(
    'uses only submitted keyword and mode for %s paging and reloads',
    async (source, label, hasAI) => {
      mockGetFlowTableAll.mockResolvedValue({ data: [], success: true });
      mockGetFlowTablePgroongaSearch.mockResolvedValue({ data: [], success: true });
      mockFlowHybridSearch.mockResolvedValue({ data: [], success: true });
      renderWithProviders(
        <FlowsSelectDrawer
          buttonType='text'
          buttonText='Choose submitted flow'
          lang='en'
          onData={jest.fn()}
        />,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Choose submitted flow' }));
      if (source !== 'tg') await userEvent.click(screen.getByRole('button', { name: label }));
      await waitFor(() => expect(mockGetFlowTableAll.mock.calls.at(-1)?.[3]).toBe(source));
      await userEvent.type(screen.getByRole('textbox', { name: source }), 'applied');
      await userEvent.click(screen.getByRole('button', { name: `search-${source}` }));
      expect(mockGetFlowTablePgroongaSearch.mock.calls.at(-1)?.slice(2, 4)).toEqual([
        source,
        'applied',
      ]);
      await act(async () => mockLatestFlowSelectorTableProps.rowSelection.onChange(['selected:1']));
      const api = mockLatestFlowSelectorTableProps.api;
      api.setPageInfo.mockClear();
      const count = () =>
        mockGetFlowTableAll.mock.calls.length +
        mockGetFlowTablePgroongaSearch.mock.calls.length +
        mockFlowHybridSearch.mock.calls.length;
      const beforeDraft = count();
      if (hasAI) await userEvent.click(screen.getByRole('checkbox'));
      await userEvent.clear(screen.getByRole('textbox', { name: source }));
      await userEvent.type(screen.getByRole('textbox', { name: source }), 'draft');
      expect(count()).toBe(beforeDraft);
      expect(mockLatestFlowSelectorTableProps.rowSelection.selectedRowKeys).toEqual(['selected:1']);
      expect(api.setPageInfo).not.toHaveBeenCalled();
      await act(async () => {
        await mockLatestFlowSelectorTableProps.request(
          { ...mockLatestFlowSelectorTableProps.params, current: 3, pageSize: 10 },
          {},
          {},
        );
      });
      expect(mockGetFlowTablePgroongaSearch.mock.calls.at(-1)?.slice(2, 4)).toEqual([
        source,
        'applied',
      ]);
      expect(mockGetFlowTablePgroongaSearch.mock.calls.at(-1)?.[0].current).toBe(3);
      await userEvent.click(screen.getByRole('button', { name: `search-${source}` }));
      const submittedService = hasAI ? mockFlowHybridSearch : mockGetFlowTablePgroongaSearch;
      expect(submittedService.mock.calls.at(-1)?.slice(2, 4)).toEqual([source, 'draft']);
      expect(mockLatestFlowSelectorTableProps.rowSelection.selectedRowKeys).toEqual([]);
      expect(api.setPageInfo).toHaveBeenCalledWith({ current: 1 });
      const beforeToggle = count();
      if (hasAI) await userEvent.click(screen.getByRole('checkbox'));
      expect(count()).toBe(beforeToggle);
      await act(async () => {
        await mockLatestFlowSelectorTableProps.request(
          { ...mockLatestFlowSelectorTableProps.params, current: 3, pageSize: 10 },
          {},
          {},
        );
      });
      expect(submittedService.mock.calls.at(-1)?.slice(2, 4)).toEqual([source, 'draft']);
      if (hasAI) await userEvent.click(screen.getByRole('button', { name: `search-${source}` }));
      expect(mockGetFlowTablePgroongaSearch.mock.calls.at(-1)?.slice(2, 4)).toEqual([
        source,
        'draft',
      ]);
      const beforeRepeat = mockGetFlowTablePgroongaSearch.mock.calls.length;
      await userEvent.click(screen.getByRole('button', { name: `search-${source}` }));
      expect(mockGetFlowTablePgroongaSearch.mock.calls.length).toBeGreaterThan(beforeRepeat);
    },
  );

  it('preserves each tab draft and submitted mode through tab changes and reopening', async () => {
    mockGetFlowTableAll.mockResolvedValue({ data: [], success: true });
    mockGetFlowTablePgroongaSearch.mockResolvedValue({ data: [], success: true });
    mockFlowHybridSearch.mockResolvedValue({ data: [], success: true });
    renderWithProviders(
      <FlowsSelectDrawer
        buttonType='text'
        buttonText='Choose submitted flow'
        lang='en'
        onData={jest.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Choose submitted flow' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'tg' }), 'first query');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'search-tg' }));
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.clear(screen.getByRole('textbox', { name: 'tg' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'tg' }), 'unsubmitted');
    await userEvent.click(screen.getByRole('button', { name: 'Business Data' }));
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    await userEvent.type(screen.getByRole('textbox', { name: 'co' }), 'second query');
    await userEvent.click(screen.getByRole('button', { name: 'search-co' }));
    expect(mockGetFlowTablePgroongaSearch.mock.calls.at(-1)?.slice(2, 4)).toEqual([
      'co',
      'second query',
    ]);
    await userEvent.click(screen.getByRole('button', { name: 'TianGong Data' }));
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('textbox', { name: 'tg' })).toHaveValue('unsubmitted');
    await act(async () => {
      await mockLatestFlowSelectorTableProps.request(
        { ...mockLatestFlowSelectorTableProps.params, current: 2, pageSize: 10 },
        {},
        {},
      );
    });
    expect(mockFlowHybridSearch.mock.calls.at(-1)?.slice(2, 4)).toEqual(['tg', 'first query']);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Choose submitted flow' }));
    expect(screen.getByRole('textbox', { name: 'tg' })).toHaveValue('unsubmitted');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    await act(async () => {
      await mockLatestFlowSelectorTableProps.request(
        { ...mockLatestFlowSelectorTableProps.params, current: 2, pageSize: 10 },
        {},
        {},
      );
    });
    expect(mockFlowHybridSearch.mock.calls.at(-1)?.slice(2, 4)).toEqual(['tg', 'first query']);
  });

  it('invalidates a pending result immediately when a new search is submitted', async () => {
    mockGetFlowTableAll.mockResolvedValue({ data: [], success: true });
    mockGetFlowTablePgroongaSearch.mockResolvedValue({ data: [], success: true });
    renderWithProviders(
      <FlowsSelectDrawer
        buttonType='text'
        buttonText='Choose submitted flow'
        lang='en'
        onData={jest.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Choose submitted flow' }));
    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());
    let resolveOld;
    mockGetFlowTableAll.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    const pending = mockLatestFlowSelectorTableProps.request(
      { ...mockLatestFlowSelectorTableProps.params, current: 3, pageSize: 10 },
      {},
      {},
    );
    await userEvent.type(screen.getByRole('textbox', { name: 'tg' }), 'new query');
    // Prevent the replacement request from invalidating the old request on its own.
    const heldReload = jest
      .spyOn(mockLatestFlowSelectorTableProps.api, 'reload')
      .mockResolvedValueOnce(undefined);
    heldReload.mockClear();
    const previousListCount = mockGetFlowTableAll.mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'search-tg' }));
    expect(heldReload).toHaveBeenCalledTimes(1);
    expect(mockGetFlowTableAll).toHaveBeenCalledTimes(previousListCount);
    expect(mockGetFlowTablePgroongaSearch).not.toHaveBeenCalled();
    resolveOld({ data: [{ id: 'stale', version: '1' }], success: true });
    await expect(pending).resolves.toEqual({ data: [], success: false });
    heldReload.mockRestore();
  });
});

jest.mock('@/components/DatasetClassificationFilter', () => ({
  __esModule: true,
  default: ({ value = [], onChange }: any) => (
    <select
      aria-label='Classification'
      value={value[0]?.code ?? ''}
      onChange={(event) =>
        onChange(
          event.target.value
            ? [{ scope: 'classification', code: event.target.value, path: [event.target.value] }]
            : [],
        )
      }
    >
      <option value=''>All classifications</option>
      <option value='C'>Classification C</option>
    </select>
  ),
}));
