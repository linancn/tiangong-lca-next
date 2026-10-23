// @ts-nocheck
import userEvent from '@testing-library/user-event';
import {
  act,
  renderWithProviders,
  screen,
  waitFor,
  within,
} from '../../../../../helpers/testUtils';

let mockLatestDatasetSelectorTableProps: any = null;

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

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

jest.mock('@/components/AllVersions', () => ({
  __esModule: true,
  default: function MockAllVersions({
    addVersionComponent,
    dataSource,
    onSelectVersion,
    operationRender,
  }: any) {
    const React = require('react');
    const [showOperation, setShowOperation] = React.useState(false);
    const [selectedVersionRow, setSelectedVersionRow] = React.useState<any | null>(null);
    const versionRow = {
      id: `source-${dataSource}-version`,
      version: '0.9.0',
      shortName: `${dataSource} old source`,
      classification: 'classification',
      publicationType: 'report',
    };

    return (
      <div data-testid={`all-versions-${dataSource}`}>
        <button type='button' onClick={() => setShowOperation(true)}>
          {`all-versions-${dataSource}`}
        </button>
        {showOperation && (
          <div data-testid='all-version-operation-render'>
            <label>
              <input
                aria-label={`select-version-${dataSource}`}
                checked={selectedVersionRow?.version === versionRow.version}
                type='radio'
                onChange={() => setSelectedVersionRow(versionRow)}
              />
              {versionRow.version}
            </label>
            <div data-testid={`all-versions-add-version-${dataSource}`}>
              {addVersionComponent?.({ newVersion: '01.00.001' })}
            </div>
            {operationRender?.(versionRow)}
            <button type='button' onClick={() => onSelectVersion?.({ id: '', version: '' })}>
              Invalid Version
            </button>
            <button
              type='button'
              disabled={!selectedVersionRow}
              onClick={() => selectedVersionRow && onSelectVersion?.(selectedVersionRow)}
            >
              Submit
            </button>
          </div>
        )}
      </div>
    );
  },
}));

jest.mock('@/pages/Sources/Components/create', () => ({
  __esModule: true,
  default: () => <span>create-source</span>,
}));

jest.mock('@/pages/Sources/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span>{`view ${id}:${version}`}</span>,
}));

const mockGetSourceTableAll = jest.fn(
  async (
    _params: any,
    _sort: any,
    _lang: string,
    dataSource: string,
    _filters: any,
    stateCode?: number,
  ) => ({
    data: [
      {
        id: `source-${dataSource}`,
        version: stateCode === 0 ? '0.0.1' : '1.0.0',
        shortName: `${dataSource} source`,
        classification: 'classification',
        publicationType: 'report',
      },
    ],
    success: true,
  }),
);

const mockGetSourceTablePgroongaSearch = jest.fn(
  async (_params: any, _lang: string, dataSource: string, keyword: string) => ({
    data: [
      {
        id: `source-${dataSource}-search`,
        version: '2.0.0',
        shortName: `${dataSource}:${keyword}`,
        classification: 'classification',
        publicationType: 'report',
      },
    ],
    success: true,
  }),
);

jest.mock('@/services/sources/api', () => ({
  __esModule: true,
  getSourceTableAll: (...args: any[]) => mockGetSourceTableAll(...args),
  source_hybrid_search: (...args: any[]) => mockGetSourceTablePgroongaSearch(...args),
}));

jest.mock('antd', () => {
  const React = require('react');
  const ConfigProvider = ({ children }: any) => <div>{children}</div>;
  const Button = ({ children, onClick, disabled, icon, type }: any) => (
    <button
      type='button'
      data-button-type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
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

  const Drawer = ({ open, title, extra, footer, children, onClose, getContainer }: any) =>
    open ? (
      <section role='dialog' aria-label={toText(title) || 'drawer'}>
        <header>
          <div>{extra}</div>
          <button type='button' onClick={onClose}>
            close
          </button>
        </header>
        <div data-testid='drawer-container'>
          {getContainer?.() === globalThis.document?.body ? 'body' : 'custom'}
        </div>
        <div>{children}</div>
        <footer>{footer}</footer>
      </section>
    ) : null;

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

  const Space = ({ children, className }: any) => <div className={className}>{children}</div>;

  return {
    __esModule: true,
    Button,
    Card,
    ConfigProvider,
    Drawer,
    Input,
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
    const latestRequestRef = React.useRef(request);
    const latestParamsRef = React.useRef(params);
    latestRequestRef.current = request;
    latestParamsRef.current = params;

    const paramsKey = JSON.stringify(params);
    const api = React.useMemo(
      () => ({
        request: (nextParams = {}, sort = {}) =>
          latestRequestRef.current(
            { ...latestParamsRef.current, pageSize: 10, current: 1, ...nextParams },
            sort,
          ),
        setPageInfo: jest.fn(),
        reload: jest.fn(async () => {
          await Promise.resolve();
          const result = await latestRequestRef.current(
            { ...latestParamsRef.current, pageSize: 10, current: 1 },
            {},
          );
          setRows(result?.data ?? []);
          return result;
        }),
      }),
      [],
    );

    mockLatestDatasetSelectorTableProps = { rowKey, rowSelection, params, api };

    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = api;
      }
      api.reload();
    }, [actionRef, api, paramsKey]);

    return (
      <div>
        {toolbar?.search}
        {toolbar?.filter}
        <div>{toolBarRender?.()}</div>
        {rows.map((row) => (
          <div key={rowKey(row)}>
            {columns.map((column: any, index: number) => (
              <div key={`${row.id}:${row.version}:${column.dataIndex ?? index}`}>
                {column.render
                  ? column.render(row[column.dataIndex], row, index)
                  : row[column.dataIndex]}
              </div>
            ))}
            <button
              type='button'
              onClick={() => rowSelection?.onChange?.([`${row.id}:${row.version}`])}
            >
              {row.shortName}
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

describe('SourceSelectDrawer', () => {
  const SourceSelectDrawer = require('@/pages/Sources/Components/select/drawer').default;

  beforeEach(() => {
    jest.clearAllMocks();
  });
  it.each([
    ['tg', 'TianGong Data'],
    ['co', 'Business Data'],
    ['my', 'My Data'],
    ['te', 'Team Data'],
  ])(
    'keeps the submitted %s keyword for paging, sorting and classification',
    async (source, title) => {
      renderWithProviders(<SourceSelectDrawer buttonType='text' lang='en' onData={jest.fn()} />);
      await userEvent.click(screen.getByRole('button', { name: /^select$/i }));
      if (source !== 'tg') await userEvent.click(screen.getByRole('button', { name: title }));
      const input = screen.getByLabelText(source);
      await userEvent.type(input, 'accepted');
      expect(mockGetSourceTablePgroongaSearch).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole('button', { name: `search-${source}` }));
      await waitFor(() =>
        expect(mockGetSourceTablePgroongaSearch.mock.calls.at(-1)[3]).toBe('accepted'),
      );
      const api = mockLatestDatasetSelectorTableProps.api;
      const count = mockGetSourceTablePgroongaSearch.mock.calls.length;
      await userEvent.clear(input);
      await userEvent.type(input, 'draft');
      expect(mockGetSourceTablePgroongaSearch).toHaveBeenCalledTimes(count);
      await act(async () => {
        await api.request({ current: 3 }, { name: 'descend' });
      });
      expect(mockGetSourceTablePgroongaSearch.mock.calls.at(-1).slice(0, 5)).toEqual([
        expect.objectContaining({ current: 3, pageSize: 10 }),
        'en',
        source,
        'accepted',
        {},
      ]);
      await act(async () => {
        await api.reload();
      });
      expect(mockGetSourceTablePgroongaSearch.mock.calls.at(-1)[3]).toBe('accepted');
      await userEvent.selectOptions(screen.getByLabelText('Classification'), 'C');
      await waitFor(() =>
        expect(mockGetSourceTablePgroongaSearch.mock.calls.at(-1)[0].classification).toEqual([
          { scope: 'classification', code: 'C', path: ['C'] },
        ]),
      );
      expect(mockGetSourceTablePgroongaSearch.mock.calls.at(-1)[3]).toBe('accepted');
      api.setPageInfo.mockClear();
      await userEvent.click(screen.getByRole('button', { name: `search-${source}` }));
      await waitFor(() =>
        expect(mockGetSourceTablePgroongaSearch.mock.calls.at(-1)[3]).toBe('draft'),
      );
      expect(api.setPageInfo).toHaveBeenCalledWith({ current: 1 });
      const listCount = mockGetSourceTableAll.mock.calls.length;
      await userEvent.clear(input);
      await userEvent.click(screen.getByRole('button', { name: `search-${source}` }));
      await waitFor(() =>
        expect(mockGetSourceTableAll.mock.calls.length).toBeGreaterThan(listCount),
      );
      expect(mockGetSourceTableAll.mock.calls.at(-1)[3]).toBe(source);
    },
  );

  it('keeps submitted keywords independent when switching tabs', async () => {
    renderWithProviders(<SourceSelectDrawer buttonType='text' lang='en' onData={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /^select$/i }));
    await userEvent.type(screen.getByLabelText('tg'), 'accepted-tg');
    await userEvent.click(screen.getByRole('button', { name: 'search-tg' }));
    await waitFor(() =>
      expect(mockGetSourceTablePgroongaSearch.mock.calls.at(-1)[3]).toBe('accepted-tg'),
    );
    await userEvent.clear(screen.getByLabelText('tg'));
    await userEvent.type(screen.getByLabelText('tg'), 'draft-tg');
    await userEvent.click(screen.getByRole('button', { name: 'Business Data' }));
    await userEvent.type(screen.getByLabelText('co'), 'accepted-co');
    await userEvent.click(screen.getByRole('button', { name: 'search-co' }));
    await waitFor(() =>
      expect(mockGetSourceTablePgroongaSearch.mock.calls.at(-1)[3]).toBe('accepted-co'),
    );
    await userEvent.click(screen.getByRole('button', { name: 'TianGong Data' }));
    await waitFor(() =>
      expect(mockGetSourceTablePgroongaSearch.mock.calls.at(-1).slice(2, 4)).toEqual([
        'tg',
        'accepted-tg',
      ]),
    );
    expect(screen.getByLabelText('tg')).toHaveValue('draft-tg');
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await userEvent.click(screen.getByRole('button', { name: /^select$/i }));
    await waitFor(() =>
      expect(mockGetSourceTablePgroongaSearch.mock.calls.at(-1).slice(2, 4)).toEqual([
        'tg',
        'accepted-tg',
      ]),
    );
    expect(screen.getByLabelText('tg')).toHaveValue('draft-tg');
  });

  it('invalidates an older response synchronously when a new keyword is submitted', async () => {
    renderWithProviders(<SourceSelectDrawer buttonType='text' lang='en' onData={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /^select$/i }));
    await userEvent.type(screen.getByLabelText('tg'), 'old');
    await userEvent.click(screen.getByRole('button', { name: 'search-tg' }));
    await waitFor(() => expect(mockGetSourceTablePgroongaSearch.mock.calls.at(-1)[3]).toBe('old'));
    const api = mockLatestDatasetSelectorTableProps.api;
    let resolveOld;
    mockGetSourceTablePgroongaSearch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    const oldRequest = api.request({ current: 2 });
    await userEvent.clear(screen.getByLabelText('tg'));
    await userEvent.type(screen.getByLabelText('tg'), 'new');
    // Hold the reload so the submit handler itself must invalidate the old request.
    api.reload.mockImplementationOnce(async () => undefined);
    await userEvent.click(screen.getByRole('button', { name: 'search-tg' }));
    resolveOld({ data: [{ id: 'stale' }], success: true });
    await expect(oldRequest).resolves.toEqual({ data: [], success: false });
  });

  it('uses review-report defaults, searches within allowed tabs, and submits the selected source', async () => {
    const onData = jest.fn();

    renderWithProviders(
      <SourceSelectDrawer buttonType='text' lang='en' onData={onData} type='reviewReport' />,
    );

    await userEvent.click(screen.getByRole('button', { name: /^select$/i }));

    await waitFor(() =>
      expect(mockGetSourceTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'my',
        [],
        0,
      ),
    );
    expect(screen.queryByRole('button', { name: /TianGong Data/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Business Data/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /My Data/i })).toHaveAttribute('data-active', 'true');
    expect(screen.getByText('create-source')).toBeInTheDocument();
    expect(screen.getByText('view source-my:0.0.1')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('my'), 'review');
    await userEvent.click(screen.getByRole('button', { name: 'search-my' }));
    await waitFor(() =>
      expect(mockGetSourceTablePgroongaSearch).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        'en',
        'my',
        'review',
        {},
        0,
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: /Team Data/i }));

    await waitFor(() =>
      expect(mockGetSourceTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'te',
        [],
        0,
      ),
    );

    await userEvent.type(screen.getByLabelText('te'), 'delta');
    await userEvent.click(screen.getByRole('button', { name: 'search-te' }));

    await waitFor(() =>
      expect(mockGetSourceTablePgroongaSearch).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        'en',
        'te',
        'delta',
        {},
        0,
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: 'te:delta' }));
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onData).toHaveBeenCalledWith('source-te-search', '2.0.0');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens all source tabs, supports tg/co search, and clears selection when reopened', async () => {
    const onData = jest.fn();

    renderWithProviders(
      <SourceSelectDrawer buttonType='icon' buttonText='pick-source' lang='en' onData={onData} />,
    );

    await userEvent.click(screen.getByRole('button', { name: /database-icon/i }));

    await waitFor(() =>
      expect(mockGetSourceTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'tg',
        [],
      ),
    );
    expect(screen.getByRole('button', { name: /TianGong Data/i })).toHaveAttribute(
      'data-active',
      'true',
    );
    expect(screen.getByRole('button', { name: /Business Data/i })).toBeInTheDocument();
    expect(screen.getByText('view source-tg:1.0.0')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('tg'), 'beta');
    await userEvent.click(screen.getByRole('button', { name: 'search-tg' }));

    await waitFor(() =>
      expect(mockGetSourceTablePgroongaSearch).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        'en',
        'tg',
        'beta',
        {},
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: /Business Data/i }));
    await userEvent.type(screen.getByLabelText('co'), 'gamma');
    await userEvent.click(screen.getByRole('button', { name: 'search-co' }));

    await waitFor(() =>
      expect(mockGetSourceTablePgroongaSearch).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        'en',
        'co',
        'gamma',
        {},
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: 'co:gamma' }));
    await userEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByRole('dialog', { name: 'Select Source' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /database-icon/i }));
    await screen.findByRole('dialog', { name: 'Select Source' });
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onData).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Select Source' })).not.toBeInTheDocument();
  });

  it('selects a concrete source version with radio selection from the all-versions drawer entry', async () => {
    const onData = jest.fn();

    renderWithProviders(<SourceSelectDrawer buttonType='text' lang='en' onData={onData} />);

    await userEvent.click(screen.getByRole('button', { name: /^select$/i }));

    await waitFor(() => expect(screen.getByTestId('all-versions-tg')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'all-versions-tg' }));

    const allVersionActions = screen.getByTestId('all-version-operation-render');
    expect(within(allVersionActions).getByText('view source-tg-version:0.9.0')).toBeInTheDocument();
    expect(screen.getByTestId('all-versions-add-version-tg')).toBeInTheDocument();

    await userEvent.click(
      within(allVersionActions).getByRole('button', { name: /invalid version/i }),
    );
    expect(onData).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Select Source' })).toBeInTheDocument();

    const submitButton = within(allVersionActions).getByRole('button', { name: /^submit$/i });
    expect(submitButton).toBeDisabled();

    await userEvent.click(
      within(allVersionActions).getByRole('radio', { name: /select-version-tg/i }),
    );
    expect(submitButton).not.toBeDisabled();

    await userEvent.click(submitButton);

    expect(onData).toHaveBeenCalledWith('source-tg-version', '0.9.0');
    expect(screen.queryByRole('dialog', { name: 'Select Source' })).not.toBeInTheDocument();
  });

  it('reloads tg and my tabs, supports my search, and closes from footer cancel and extra close', async () => {
    renderWithProviders(<SourceSelectDrawer buttonType='text' lang='en' onData={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /^select$/i }));

    await screen.findByRole('dialog', { name: 'Select Source' });
    expect(screen.getByTestId('drawer-container')).toHaveTextContent('body');

    await userEvent.click(screen.getByRole('button', { name: /My Data/i }));
    await waitFor(() =>
      expect(mockGetSourceTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'my',
        [],
        undefined,
      ),
    );

    await userEvent.type(screen.getByLabelText('my'), 'mine');
    await userEvent.click(screen.getByRole('button', { name: 'search-my' }));
    await waitFor(() =>
      expect(mockGetSourceTablePgroongaSearch).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        'en',
        'my',
        'mine',
        {},
        undefined,
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: /TianGong Data/i }));
    await waitFor(() =>
      expect(mockGetSourceTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'tg',
        [],
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('dialog', { name: 'Select Source' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^select$/i }));
    await screen.findByRole('dialog', { name: 'Select Source' });
    await userEvent.click(screen.getByRole('button', { name: /close-icon/i }));
    expect(screen.queryByRole('dialog', { name: 'Select Source' })).not.toBeInTheDocument();
  });

  it('uses the default icon tooltip text and loads TE data without review-report state filtering', async () => {
    renderWithProviders(<SourceSelectDrawer buttonType='icon' lang='en' onData={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /database-icon/i }));
    await screen.findByRole('dialog', { name: 'Select Source' });

    await userEvent.click(screen.getByRole('button', { name: /Team Data/i }));
    await waitFor(() =>
      expect(mockGetSourceTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'te',
        [],
        undefined,
      ),
    );

    await userEvent.type(screen.getByLabelText('te'), 'shared');
    await userEvent.click(screen.getByRole('button', { name: 'search-te' }));
    await waitFor(() =>
      expect(mockGetSourceTablePgroongaSearch).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        'en',
        'te',
        'shared',
        {},
        undefined,
      ),
    );
  });
  it.each([
    ['tg', 'TianGong Data'],
    ['co', 'Business Data'],
    ['my', 'My Data'],
    ['te', 'Team Data'],
  ])(
    'clears exact-version selection and resets the %s query when classification changes',
    async (source, tabTitle) => {
      const row = {
        id: 'same-dataset',
        version: '01.00.000',
        name: 'Dataset row',
        shortName: 'Dataset row',
        classification: 'Class C',
        email: 'dataset@example.com',
        publicationType: 'report',
        refUnitRes: { name: [], refUnitName: 'unit', refUnitGeneralComment: '' },
      };
      mockGetSourceTableAll.mockResolvedValue({ data: [row], success: true });
      const onData = jest.fn();
      renderWithProviders(<SourceSelectDrawer buttonType='text' lang='en' onData={onData} />);
      await userEvent.click(screen.getByRole('button', { name: /^select$/i }));
      if (source !== 'tg') await userEvent.click(screen.getByRole('button', { name: tabTitle }));
      await waitFor(() => expect(mockGetSourceTableAll.mock.calls.at(-1)[3]).toBe(source));
      await userEvent.click(await screen.findByRole('button', { name: 'Dataset row' }));
      expect(mockLatestDatasetSelectorTableProps.rowSelection.selectedRowKeys).toEqual([
        'same-dataset:01.00.000',
      ]);
      expect(mockLatestDatasetSelectorTableProps.rowKey(row)).toBe('same-dataset:01.00.000');
      expect(mockLatestDatasetSelectorTableProps.rowKey({ ...row, version: '02.00.000' })).toBe(
        'same-dataset:02.00.000',
      );
      const api = mockLatestDatasetSelectorTableProps.api;
      api.setPageInfo.mockClear();
      await userEvent.selectOptions(screen.getByLabelText('Classification'), 'C');
      await waitFor(() =>
        expect(mockGetSourceTableAll.mock.calls.at(-1)[0].classification).toEqual([
          { scope: 'classification', code: 'C', path: ['C'] },
        ]),
      );
      expect(mockLatestDatasetSelectorTableProps.rowSelection.selectedRowKeys).toEqual([]);
      expect(api.setPageInfo).toHaveBeenCalledWith({ current: 1 });
      expect(mockGetSourceTableAll.mock.calls.at(-1)[3]).toBe(source);
      await userEvent.selectOptions(screen.getByLabelText('Classification'), '');
      await waitFor(() =>
        expect(mockGetSourceTableAll.mock.calls.at(-1)[0].classification).toEqual([]),
      );
      expect(onData).not.toHaveBeenCalled();
    },
  );
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
