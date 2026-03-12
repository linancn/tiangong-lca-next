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

jest.mock('@/pages/Contacts/Components/create', () => ({
  __esModule: true,
  default: () => <span>create-contact</span>,
}));

jest.mock('@/pages/Contacts/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span>{`view ${id}:${version}`}</span>,
}));

const mockGetContactTableAll = jest.fn(
  async (_params: any, _sort: any, _lang: string, dataSource: string) => ({
    data: [
      {
        id: `contact-${dataSource}`,
        version: '1.0.0',
        shortName: `${dataSource} contact`,
        name: `${dataSource} contact`,
        classification: 'classification',
        email: `${dataSource}@example.com`,
      },
    ],
    success: true,
  }),
);

const mockGetContactTablePgroongaSearch = jest.fn(
  async (_params: any, _lang: string, dataSource: string, keyword: string) => ({
    data: [
      {
        id: `contact-${dataSource}-search`,
        version: '2.0.0',
        shortName: `${dataSource}:${keyword}`,
        name: `${dataSource}:${keyword}`,
        classification: 'classification',
        email: `${dataSource}@example.com`,
      },
    ],
    success: true,
  }),
);

jest.mock('@/services/contacts/api', () => ({
  __esModule: true,
  getContactTableAll: (...args: any[]) => mockGetContactTableAll(...args),
  getContactTablePgroongaSearch: (...args: any[]) => mockGetContactTablePgroongaSearch(...args),
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

describe('ContactSelectDrawer', () => {
  const ContactSelectDrawer = require('@/pages/Contacts/Components/select/drawer').default;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens with filtered tabs, switches datasets, performs search, and submits the selected row', async () => {
    const onData = jest.fn();

    renderWithProviders(
      <ContactSelectDrawer buttonType='text' lang='en' onData={onData} filterTabs={['co', 'my']} />,
    );

    await userEvent.click(screen.getByRole('button', { name: /^select$/i }));

    await waitFor(() =>
      expect(mockGetContactTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'co',
        [],
      ),
    );
    expect(screen.queryByRole('button', { name: /TianGong Data/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Business Data/i })).toHaveAttribute(
      'data-active',
      'true',
    );

    await userEvent.click(screen.getByRole('button', { name: /My Data/i }));

    await waitFor(() =>
      expect(mockGetContactTableAll).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        {},
        'en',
        'my',
        [],
      ),
    );
    expect(screen.getByText('create-contact')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('my'), 'alpha');
    await userEvent.click(screen.getByRole('button', { name: 'search-my' }));

    await waitFor(() =>
      expect(mockGetContactTablePgroongaSearch).toHaveBeenCalledWith(
        expect.objectContaining({ current: 1, pageSize: 10 }),
        'en',
        'my',
        'alpha',
        {},
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: 'my:alpha' }));
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onData).toHaveBeenCalledWith('contact-my-search', '2.0.0');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
