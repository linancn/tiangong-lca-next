// @ts-nocheck
import userEvent from '@testing-library/user-event';
import { act, renderWithProviders, screen, waitFor } from '../../../../../helpers/testUtils';

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

const mockFlowpropertiesCreate = jest.fn(() => <span>create-flowproperty</span>);
const mockFlowpropertiesEdit = jest.fn(({ id, version }: any) => (
  <span>{`edit ${id}:${version}`}</span>
));
const mockFlowpropertiesDelete = jest.fn(({ id, version, setViewDrawerVisible }: any) => (
  <button type='button' onClick={() => setViewDrawerVisible?.(false)}>
    {`delete ${id}:${version}`}
  </button>
));

jest.mock('@/pages/Flowproperties/Components/create', () => ({
  __esModule: true,
  default: (props: any) => mockFlowpropertiesCreate(props),
}));

jest.mock('@/pages/Flowproperties/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span>{`view ${id}:${version}`}</span>,
}));

jest.mock('@/pages/Flowproperties/Components/edit', () => ({
  __esModule: true,
  default: (props: any) => mockFlowpropertiesEdit(props),
}));

jest.mock('@/pages/Flowproperties/Components/delete', () => ({
  __esModule: true,
  default: (props: any) => mockFlowpropertiesDelete(props),
}));

jest.mock('@/components/AllVersions', () => ({
  __esModule: true,
  default: ({
    id,
    addVersionComponent,
    dataSource,
    stateCode,
    operationRender,
    onSelectVersion,
  }: any) => (
    <div
      data-testid='all-versions'
      data-source={dataSource}
      data-state-code={stateCode === undefined ? '' : String(stateCode)}
    >
      <span>{`all versions `}</span>
      {addVersionComponent?.({ newVersion: '10.00.000' })}
      <button type='button' onClick={() => onSelectVersion?.({ id })}>
        {`select-invalid-version ${id}`}
      </button>
      <button
        type='button'
        onClick={() => onSelectVersion?.({ id, version: '09.00.000' })}
      >{`select-version ${id}`}</button>
      {operationRender?.({ id, version: '09.00.000' })}
    </div>
  ),
}));

const mockGetFlowpropertyTableAll = jest.fn(
  async (_params: any, _sort: any, _lang: string, dataSource: string) => ({
    data: [
      {
        id: `flowproperty-${dataSource}`,
        version: '1.0.0',
        name: `${dataSource} flowproperty`,
        classification: `${dataSource} classification`,
        generalComment: `${dataSource} comment`,
        refUnitRes: {
          name: [{ '@xml:lang': 'en', '#text': `${dataSource} unit group` }],
          refUnitName: `${dataSource} unit`,
          refUnitGeneralComment: `${dataSource} unit comment`,
        },
      },
    ],
    success: true,
  }),
);

const mockGetFlowpropertyTablePgroongaSearch = jest.fn(
  async (_params: any, _lang: string, dataSource: string, keyword: string) => ({
    data: [
      {
        id: `flowproperty-${dataSource}-search`,
        version: '2.0.0',
        name: `${dataSource}:${keyword}`,
        classification: `${dataSource} search classification`,
        generalComment: `${dataSource}:${keyword}`,
        refUnitRes: {
          name: [{ '@xml:lang': 'en', '#text': `${dataSource} search unit group` }],
          refUnitName: `${dataSource} search unit`,
          refUnitGeneralComment: `${dataSource} search unit comment`,
        },
      },
    ],
    success: true,
  }),
);

jest.mock('@/services/flowproperties/api', () => ({
  __esModule: true,
  getFlowpropertyTableAll: (...args: any[]) => mockGetFlowpropertyTableAll(...args),
  flowproperty_hybrid_search: (...args: any[]) => mockGetFlowpropertyTablePgroongaSearch(...args),
}));

const mockGetUnitData = jest.fn(async (_idType: string, data: any[]) => data);
const mockGetLangText = jest.fn(() => 'unitgroup');

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getLangText: (...args: any[]) => mockGetLangText(...args),
  getUnitData: (...args: any[]) => mockGetUnitData(...args),
}));

jest.mock('antd', () => {
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

  const Tooltip = ({ children }: any) => <>{children}</>;

  const Drawer = ({ open, title, extra, footer, children, onClose, getContainer }: any) =>
    open ? (
      <section
        role='dialog'
        aria-label={toText(title) || 'drawer'}
        data-container={getContainer?.() === globalThis.document?.body ? 'body' : 'unknown'}
      >
        <header>
          <div>{extra}</div>
          <button type='button' onClick={onClose}>
            close
          </button>
        </header>
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

describe('FlowpropertySelectDrawer', () => {
  const FlowpropertySelectDrawer =
    require('@/pages/Flowproperties/Components/select/drawer').default;

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
      renderWithProviders(
        <FlowpropertySelectDrawer buttonType='text' lang='en' onData={jest.fn()} />,
      );
      await userEvent.click(screen.getByRole('button', { name: /^select$/i }));
      if (source !== 'tg') await userEvent.click(screen.getByRole('button', { name: title }));
      const input = screen.getByLabelText(source);
      await userEvent.type(input, 'accepted');
      expect(mockGetFlowpropertyTablePgroongaSearch).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole('button', { name: `search-${source}` }));
      await waitFor(() =>
        expect(mockGetFlowpropertyTablePgroongaSearch.mock.calls.at(-1)[3]).toBe('accepted'),
      );
      const api = mockLatestDatasetSelectorTableProps.api;
      const count = mockGetFlowpropertyTablePgroongaSearch.mock.calls.length;
      await userEvent.clear(input);
      await userEvent.type(input, 'draft');
      expect(mockGetFlowpropertyTablePgroongaSearch).toHaveBeenCalledTimes(count);
      await act(async () => {
        await api.request({ current: 3 }, { name: 'descend' });
      });
      expect(mockGetFlowpropertyTablePgroongaSearch.mock.calls.at(-1).slice(0, 5)).toEqual([
        expect.objectContaining({ current: 3, pageSize: 10 }),
        'en',
        source,
        'accepted',
        {},
      ]);
      await act(async () => {
        await api.reload();
      });
      expect(mockGetFlowpropertyTablePgroongaSearch.mock.calls.at(-1)[3]).toBe('accepted');
      await userEvent.selectOptions(screen.getByLabelText('Classification'), 'C');
      await waitFor(() =>
        expect(mockGetFlowpropertyTablePgroongaSearch.mock.calls.at(-1)[0].classification).toEqual([
          { scope: 'classification', code: 'C', path: ['C'] },
        ]),
      );
      expect(mockGetFlowpropertyTablePgroongaSearch.mock.calls.at(-1)[3]).toBe('accepted');
      api.setPageInfo.mockClear();
      await userEvent.click(screen.getByRole('button', { name: `search-${source}` }));
      await waitFor(() =>
        expect(mockGetFlowpropertyTablePgroongaSearch.mock.calls.at(-1)[3]).toBe('draft'),
      );
      expect(api.setPageInfo).toHaveBeenCalledWith({ current: 1 });
      const listCount = mockGetFlowpropertyTableAll.mock.calls.length;
      await userEvent.clear(input);
      await userEvent.click(screen.getByRole('button', { name: `search-${source}` }));
      await waitFor(() =>
        expect(mockGetFlowpropertyTableAll.mock.calls.length).toBeGreaterThan(listCount),
      );
      expect(mockGetFlowpropertyTableAll.mock.calls.at(-1)[3]).toBe(source);
    },
  );

  it('keeps submitted keywords independent when switching tabs', async () => {
    renderWithProviders(
      <FlowpropertySelectDrawer buttonType='text' lang='en' onData={jest.fn()} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^select$/i }));
    await userEvent.type(screen.getByLabelText('tg'), 'accepted-tg');
    await userEvent.click(screen.getByRole('button', { name: 'search-tg' }));
    await waitFor(() =>
      expect(mockGetFlowpropertyTablePgroongaSearch.mock.calls.at(-1)[3]).toBe('accepted-tg'),
    );
    await userEvent.clear(screen.getByLabelText('tg'));
    await userEvent.type(screen.getByLabelText('tg'), 'draft-tg');
    await userEvent.click(screen.getByRole('button', { name: 'Business Data' }));
    await userEvent.type(screen.getByLabelText('co'), 'accepted-co');
    await userEvent.click(screen.getByRole('button', { name: 'search-co' }));
    await waitFor(() =>
      expect(mockGetFlowpropertyTablePgroongaSearch.mock.calls.at(-1)[3]).toBe('accepted-co'),
    );
    await userEvent.click(screen.getByRole('button', { name: 'TianGong Data' }));
    await waitFor(() =>
      expect(mockGetFlowpropertyTablePgroongaSearch.mock.calls.at(-1).slice(2, 4)).toEqual([
        'tg',
        'accepted-tg',
      ]),
    );
    expect(screen.getByLabelText('tg')).toHaveValue('draft-tg');
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await userEvent.click(screen.getByRole('button', { name: /^select$/i }));
    await waitFor(() =>
      expect(mockGetFlowpropertyTablePgroongaSearch.mock.calls.at(-1).slice(2, 4)).toEqual([
        'tg',
        'accepted-tg',
      ]),
    );
    expect(screen.getByLabelText('tg')).toHaveValue('draft-tg');
  });

  it('invalidates an older response synchronously when a new keyword is submitted', async () => {
    renderWithProviders(
      <FlowpropertySelectDrawer buttonType='text' lang='en' onData={jest.fn()} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^select$/i }));
    await userEvent.type(screen.getByLabelText('tg'), 'old');
    await userEvent.click(screen.getByRole('button', { name: 'search-tg' }));
    await waitFor(() =>
      expect(mockGetFlowpropertyTablePgroongaSearch.mock.calls.at(-1)[3]).toBe('old'),
    );
    const api = mockLatestDatasetSelectorTableProps.api;
    let resolveOld;
    mockGetFlowpropertyTablePgroongaSearch.mockImplementationOnce(
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

  it('opens, switches datasets, performs search, and submits the selected flow property', async () => {
    const onData = jest.fn();

    renderWithProviders(<FlowpropertySelectDrawer buttonType='text' lang='en' onData={onData} />);

    await userEvent.click(screen.getByRole('button', { name: /^select$/i }));

    await waitFor(() =>
      expect(mockGetFlowpropertyTableAll).toHaveBeenCalledWith(
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
    expect(screen.getByText('view flowproperty-tg:1.0.0')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('unitgroup'))).toBeInTheDocument();
    expect(screen.getByTestId('all-versions')).toHaveAttribute('data-source', 'tg');
    expect(screen.getByTestId('all-versions')).toHaveAttribute('data-state-code', '');

    await userEvent.click(screen.getByRole('button', { name: /My Data/i }));

    await waitFor(() =>
      expect(mockGetFlowpropertyTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'my',
        [],
        0,
      ),
    );
    expect(screen.getByTestId('all-versions')).toHaveAttribute('data-source', 'my');
    expect(screen.getByTestId('all-versions')).toHaveAttribute('data-state-code', '0');
    expect(screen.getByText('view flowproperty-my:1.0.0')).toBeInTheDocument();
    expect(screen.queryByText('create-flowproperty')).not.toBeInTheDocument();
    expect(screen.queryByText('edit flowproperty-my:1.0.0')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'delete flowproperty-my:1.0.0' }),
    ).not.toBeInTheDocument();
    expect(mockFlowpropertiesCreate).not.toHaveBeenCalled();
    expect(mockFlowpropertiesEdit).not.toHaveBeenCalled();
    expect(mockFlowpropertiesDelete).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('my'), 'alpha');
    await userEvent.click(screen.getByRole('button', { name: 'search-my' }));

    await waitFor(() =>
      expect(mockGetFlowpropertyTablePgroongaSearch).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        'en',
        'my',
        'alpha',
        {},
        0,
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: 'my:alpha' }));
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onData).toHaveBeenCalledWith('flowproperty-my-search', '2.0.0');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('selects a concrete version from the all-versions list', async () => {
    const onData = jest.fn();

    renderWithProviders(<FlowpropertySelectDrawer buttonType='text' lang='en' onData={onData} />);

    await userEvent.click(screen.getByRole('button', { name: /^select$/i }));

    await waitFor(() =>
      expect(mockGetFlowpropertyTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'tg',
        [],
      ),
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'select-invalid-version flowproperty-tg' }),
    );
    expect(onData).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Select Flow property' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'select-version flowproperty-tg' }));

    expect(onData).toHaveBeenCalledWith('flowproperty-tg', '09.00.000');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('searches tg/co/te datasets and clears the selected row when reopened', async () => {
    const onData = jest.fn();

    renderWithProviders(<FlowpropertySelectDrawer buttonType='icon' lang='en' onData={onData} />);

    await userEvent.click(screen.getByRole('button'));

    await screen.findByRole('dialog', { name: 'Select Flow property' });

    await userEvent.type(screen.getByLabelText('tg'), 'beta');
    await userEvent.click(screen.getByRole('button', { name: 'search-tg' }));

    await waitFor(() =>
      expect(mockGetFlowpropertyTablePgroongaSearch).toHaveBeenCalledWith(
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
      expect(mockGetFlowpropertyTablePgroongaSearch).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        'en',
        'co',
        'gamma',
        {},
      ),
    );
    expect(screen.queryByText('edit flowproperty-co:1.0.0')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Team Data/i }));
    await userEvent.type(screen.getByLabelText('te'), 'delta');
    await userEvent.click(screen.getByRole('button', { name: 'search-te' }));

    await waitFor(() =>
      expect(mockGetFlowpropertyTablePgroongaSearch).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        'en',
        'te',
        'delta',
        {},
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: 'te:delta' }));
    await userEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByRole('dialog', { name: 'Select Flow property' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Select Flow property' });
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onData).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Select Flow property' })).not.toBeInTheDocument();
  });

  it('switches back to tg data, exposes getContainer, and closes through extra close and footer cancel', async () => {
    const onData = jest.fn();

    renderWithProviders(<FlowpropertySelectDrawer buttonType='icon' lang='en' onData={onData} />);

    await userEvent.click(screen.getByRole('button'));

    const drawer = await screen.findByRole('dialog', { name: 'Select Flow property' });
    expect(drawer).toHaveAttribute('data-container', 'body');

    await userEvent.click(screen.getByRole('button', { name: /My Data/i }));
    await waitFor(() =>
      expect(mockGetFlowpropertyTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'my',
        [],
        0,
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: /TianGong Data/i }));
    await waitFor(() =>
      expect(mockGetFlowpropertyTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'tg',
        [],
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: 'close-icon' }));
    expect(screen.queryByRole('dialog', { name: 'Select Flow property' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Select Flow property' });
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onData).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Select Flow property' })).not.toBeInTheDocument();
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
      mockGetFlowpropertyTableAll.mockResolvedValue({ data: [row], success: true });
      const onData = jest.fn();
      renderWithProviders(<FlowpropertySelectDrawer buttonType='text' lang='en' onData={onData} />);
      await userEvent.click(screen.getByRole('button', { name: /^select$/i }));
      if (source !== 'tg') await userEvent.click(screen.getByRole('button', { name: tabTitle }));
      await waitFor(() => expect(mockGetFlowpropertyTableAll.mock.calls.at(-1)[3]).toBe(source));
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
        expect(mockGetFlowpropertyTableAll.mock.calls.at(-1)[0].classification).toEqual([
          { scope: 'classification', code: 'C', path: ['C'] },
        ]),
      );
      expect(mockLatestDatasetSelectorTableProps.rowSelection.selectedRowKeys).toEqual([]);
      expect(api.setPageInfo).toHaveBeenCalledWith({ current: 1 });
      expect(mockGetFlowpropertyTableAll.mock.calls.at(-1)[3]).toBe(source);
      await userEvent.selectOptions(screen.getByLabelText('Classification'), '');
      await waitFor(() =>
        expect(mockGetFlowpropertyTableAll.mock.calls.at(-1)[0].classification).toEqual([]),
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
