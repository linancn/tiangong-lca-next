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
  getSourceTablePgroongaSearch: (...args: any[]) => mockGetSourceTablePgroongaSearch(...args),
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

  const ProTable = ({ actionRef, request, rowSelection, toolBarRender }: any) => {
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
          <button
            key={`${row.id}:${row.version}`}
            type='button'
            onClick={() => rowSelection?.onChange?.([`${row.id}:${row.version}`])}
          >
            {row.shortName}
          </button>
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

    await userEvent.click(screen.getByRole('button', { name: /TE Data/i }));

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
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: 'te:delta' }));
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onData).toHaveBeenCalledWith('source-te-search', '2.0.0');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
