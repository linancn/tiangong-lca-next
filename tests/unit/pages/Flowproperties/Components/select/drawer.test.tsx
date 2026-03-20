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

jest.mock('@/pages/Flowproperties/Components/create', () => ({
  __esModule: true,
  default: () => <span>create-flowproperty</span>,
}));

jest.mock('@/pages/Flowproperties/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span>{`view ${id}:${version}`}</span>,
}));

jest.mock('@/pages/Flowproperties/Components/edit', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span>{`edit ${id}:${version}`}</span>,
}));

jest.mock('@/pages/Flowproperties/Components/delete', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span>{`delete ${id}:${version}`}</span>,
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
  getFlowpropertyTablePgroongaSearch: (...args: any[]) =>
    mockGetFlowpropertyTablePgroongaSearch(...args),
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

  const Drawer = ({ open, title, extra, footer, children, onClose }: any) =>
    open ? (
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

  const ProTable = ({ actionRef, request, rowSelection, toolBarRender, columns = [] }: any) => {
    const [rows, setRows] = React.useState<any[]>([]);
    const latestRequestRef = React.useRef(request);
    latestRequestRef.current = request;

    const api = React.useMemo(
      () => ({
        setPageInfo: jest.fn(),
        reload: jest.fn(async () => {
          await Promise.resolve();
          const result = await latestRequestRef.current({ pageSize: 10, current: 1 }, {});
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

    await userEvent.click(screen.getByRole('button', { name: /My Data/i }));

    await waitFor(() =>
      expect(mockGetFlowpropertyTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'my',
        [],
      ),
    );
    expect(screen.getByText('create-flowproperty')).toBeInTheDocument();
    expect(screen.getByText('edit flowproperty-my:1.0.0')).toBeInTheDocument();
    expect(screen.getByText('delete flowproperty-my:1.0.0')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('my'), 'alpha');
    await userEvent.click(screen.getByRole('button', { name: 'search-my' }));

    await waitFor(() =>
      expect(mockGetFlowpropertyTablePgroongaSearch).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        'en',
        'my',
        'alpha',
        {},
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: 'my:alpha' }));
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onData).toHaveBeenCalledWith('flowproperty-my-search', '2.0.0');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('searches tg/co/te datasets and clears the selected row when reopened', async () => {
    const onData = jest.fn();

    renderWithProviders(<FlowpropertySelectDrawer buttonType='icon' lang='en' onData={onData} />);

    await userEvent.click(screen.getByRole('button'));

    await screen.findByRole('dialog', { name: 'Selete Flow property' });

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

    await userEvent.click(screen.getByRole('button', { name: /TE Data/i }));
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
    expect(screen.queryByRole('dialog', { name: 'Selete Flow property' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Selete Flow property' });
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onData).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Selete Flow property' })).not.toBeInTheDocument();
  });
});
