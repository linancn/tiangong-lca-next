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

jest.mock('@/components/AlignedNumber', () => ({
  __esModule: true,
  toSuperscript: (value: string) => `sup:${value}`,
}));

jest.mock('@/pages/Unitgroups/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span>{`view ${id}:${version}`}</span>,
}));

const mockGetUnitGroupTableAll = jest.fn(
  async (_params: any, _sort: any, _lang: string, dataSource: string) => ({
    data: [
      {
        id: `unit-group-${dataSource}`,
        version: '1.0.0',
        name: `${dataSource} unit group`,
        refUnitName: 'kg',
        refUnitGeneralComment: 'ref comment',
        classification: 'classification',
        modifiedAt: '2024-01-01',
      },
    ],
    success: true,
  }),
);

const mockGetUnitGroupTablePgroongaSearch = jest.fn(
  async (_params: any, _lang: string, dataSource: string, keyword: string) => ({
    data: [
      {
        id: `unit-group-${dataSource}-search`,
        version: '2.0.0',
        name: `${dataSource}:${keyword}`,
        refUnitName: 'kg',
        refUnitGeneralComment: 'ref comment',
        classification: 'classification',
        modifiedAt: '2024-01-02',
      },
    ],
    success: true,
  }),
);

jest.mock('@/services/unitgroups/api', () => ({
  __esModule: true,
  getUnitGroupTableAll: (...args: any[]) => mockGetUnitGroupTableAll(...args),
  getUnitGroupTablePgroongaSearch: (...args: any[]) => mockGetUnitGroupTablePgroongaSearch(...args),
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
      <div>
        {(tabList ?? []).map((tab: any) => (
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

  const ProTable = ({ actionRef, request, rowSelection, columns = [] }: any) => {
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
                (rowSelection?.selectedRowKeys ?? []).includes(`${row.id}:${row.version}`),
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

describe('UnitgroupsSelectDrawer', () => {
  const UnitgroupsSelectDrawer = require('@/pages/Unitgroups/Components/select/drawer').default;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads tg data by default, supports tab switching/search, and submits the selected row', async () => {
    const onData = jest.fn();

    renderWithProviders(<UnitgroupsSelectDrawer buttonType='text' lang='en' onData={onData} />);

    await userEvent.click(screen.getByRole('button', { name: /^select$/i }));

    await waitFor(() =>
      expect(mockGetUnitGroupTableAll).toHaveBeenCalledWith(
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
    expect(screen.getByText('view unit-group-tg:1.0.0')).toBeInTheDocument();
    expect(screen.getByText('sup:kg')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Business Data/i }));

    await waitFor(() =>
      expect(mockGetUnitGroupTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'co',
        [],
      ),
    );

    await userEvent.type(screen.getByLabelText('co'), 'beta');
    await userEvent.click(screen.getByRole('button', { name: 'search-co' }));

    await waitFor(() =>
      expect(mockGetUnitGroupTablePgroongaSearch).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        'en',
        'co',
        'beta',
        {},
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: 'co:beta' }));
    await userEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    expect(onData).toHaveBeenCalledWith('unit-group-co-search', '2.0.0');
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /Selete Unit group/i })).not.toBeInTheDocument(),
    );
  });

  it('supports icon trigger, tg search, reopen reset, and all close paths', async () => {
    const onData = jest.fn();

    renderWithProviders(
      <UnitgroupsSelectDrawer
        buttonType='icon'
        buttonText='pick-unitgroup'
        lang='en'
        onData={onData}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /pick-unitgroup/i }));

    await waitFor(() =>
      expect(mockGetUnitGroupTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'tg',
        [],
      ),
    );

    mockGetUnitGroupTableAll.mockClear();
    mockGetUnitGroupTablePgroongaSearch.mockClear();

    await userEvent.click(screen.getByRole('button', { name: /Business Data/i }));
    await waitFor(() =>
      expect(mockGetUnitGroupTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'co',
        [],
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: /TianGong Data/i }));
    await waitFor(() =>
      expect(mockGetUnitGroupTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'tg',
        [],
      ),
    );

    await userEvent.type(screen.getByLabelText('tg'), 'alpha');
    await userEvent.click(screen.getByRole('button', { name: 'search-tg' }));

    await waitFor(() =>
      expect(mockGetUnitGroupTablePgroongaSearch).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        'en',
        'tg',
        'alpha',
        {},
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: 'tg:alpha' }));
    expect(screen.getByRole('button', { name: 'tg:alpha' })).toHaveAttribute(
      'data-selected',
      'true',
    );

    await userEvent.click(screen.getByRole('button', { name: /close-icon/i }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /Selete Unit group/i })).not.toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole('button', { name: /pick-unitgroup/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'tg:alpha' })).toHaveAttribute(
        'data-selected',
        'false',
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: 'close' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /Selete Unit group/i })).not.toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole('button', { name: /pick-unitgroup/i }));
    await screen.findByRole('dialog', { name: /Selete Unit group/i });
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /Selete Unit group/i })).not.toBeInTheDocument(),
    );
    expect(onData).not.toHaveBeenCalled();
  });

  it('falls back to the default icon tooltip text and placeholder reference unit', async () => {
    mockGetUnitGroupTableAll.mockImplementation(
      async (_params: any, _sort: any, _lang: string, dataSource: string) => ({
        data: [
          {
            id: `unit-group-${dataSource}`,
            version: '1.0.0',
            name: `${dataSource} unit group`,
            refUnitName: undefined,
            refUnitGeneralComment: undefined,
            classification: 'classification',
            modifiedAt: '2024-01-01',
          },
        ],
        success: true,
      }),
    );

    renderWithProviders(<UnitgroupsSelectDrawer buttonType='icon' lang='en' onData={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /^select$/i }));

    expect(await screen.findByText('sup:-')).toBeInTheDocument();
  });
});
