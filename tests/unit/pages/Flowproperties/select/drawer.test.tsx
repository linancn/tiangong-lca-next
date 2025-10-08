// @ts-nocheck
import FlowpropertiesSelectDrawer from '@/pages/Flowproperties/Components/select/drawer';
import userEvent from '@testing-library/user-event';
import { act, renderWithProviders, screen, waitFor } from '../../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

const mockIntl = {
  locale: 'en-US',
  formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
};

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => mockIntl,
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close</span>,
  DatabaseOutlined: () => <span>database</span>,
}));

jest.mock('antd', () => {
  const React = require('react');

  const ConfigProvider = ({ children }: any) => <div>{children}</div>;

  const Button = ({ children, onClick, disabled, icon, ...rest }: any) => (
    <button type='button' onClick={disabled ? undefined : onClick} disabled={disabled} {...rest}>
      {icon}
      {children}
    </button>
  );

  const Tooltip = ({ title, children }: any) => {
    const label = toText(title);
    if (React.isValidElement(children)) {
      return React.cloneElement(children, {
        'aria-label': children.props['aria-label'] ?? label,
      });
    }
    return <span title={label}>{children}</span>;
  };

  const Drawer = ({ open, title, extra, footer, onClose, children }: any) => {
    if (!open) return null;
    return (
      <div role='dialog' aria-label={toText(title) || 'drawer'}>
        <div>{extra}</div>
        <div>{children}</div>
        <div>{footer}</div>
        <button type='button' onClick={onClose}>
          Close
        </button>
      </div>
    );
  };

  const Space = ({ children }: any) => <div>{children}</div>;

  const Card = ({ tabList = [], onTabChange, children }: any) => (
    <div>
      <div role='tablist'>
        {tabList.map((tab: any) => (
          <button key={tab.key} type='button' onClick={() => onTabChange?.(tab.key)}>
            {toText(tab.tab)}
          </button>
        ))}
      </div>
      <div>{children}</div>
    </div>
  );

  const Input = ({ value = '', onChange, placeholder }: any) => (
    <input
      value={value}
      onChange={(event) => onChange?.({ target: { value: event.target.value } })}
      placeholder={placeholder}
    />
  );

  Input.Search = ({ value = '', onChange, onSearch, placeholder }: any) => (
    <div>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange?.({ target: { value: event.target.value } })}
      />
      <button type='button' onClick={() => onSearch?.(value)}>
        Search
      </button>
    </div>
  );

  const theme = {
    useToken: () => ({
      token: {
        colorPrimary: '#1677ff',
        colorError: '#ff4d4f',
      },
    }),
  };

  return {
    __esModule: true,
    Button,
    Tooltip,
    Drawer,
    Space,
    Card,
    Input,
    message: {
      success: jest.fn(),
      error: jest.fn(),
    },
    theme,
    ConfigProvider,
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProTable = ({ request, rowSelection, toolBarRender, actionRef }: any) => {
    const [rows, setRows] = React.useState<any[]>([]);

    const loadRows = React.useCallback(async () => {
      const result = await request?.({ current: 1, pageSize: 10 }, {}, {});
      setRows(result?.data ?? []);
      return result;
    }, [request]);

    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = {
          reload: () => loadRows(),
          setPageInfo: () => loadRows(),
        };
      }
      void loadRows();
      return () => {
        if (actionRef) actionRef.current = undefined;
      };
    }, [actionRef, loadRows]);

    return (
      <div>
        <div>{toolBarRender?.()}</div>
        <ul>
          {rows.map((row) => (
            <li key={`${row.id}:${row.version}`}>
              <button
                type='button'
                onClick={() =>
                  rowSelection?.onChange?.(
                    [`${row.id}:${row.version}`],
                    [
                      {
                        ...row,
                      },
                    ],
                  )
                }
              >
                select {row.name}
              </button>
              <span>{row.name}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return {
    __esModule: true,
    ProTable,
    ActionType: {},
  };
});

jest.mock('@/pages/Flowproperties/Components/create', () => ({
  __esModule: true,
  default: () => <button type='button'>create-flowproperty</button>,
}));

jest.mock('@/pages/Flowproperties/Components/edit', () => ({
  __esModule: true,
  default: () => <button type='button'>edit-flowproperty</button>,
}));

jest.mock('@/pages/Flowproperties/Components/delete', () => ({
  __esModule: true,
  default: () => <button type='button'>delete-flowproperty</button>,
}));

jest.mock('@/pages/Flowproperties/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span>{`view ${id}:${version}`}</span>,
}));

const mockGetFlowpropertyTableAll = jest.fn(async () => ({
  data: [
    {
      id: 'fp-1',
      name: 'Water mass',
      version: '1.0.0',
      refUnitRes: {
        name: { en: 'kilogram' },
        refUnitGeneralComment: { en: 'unit comment' },
        refUnitName: 'kg',
      },
    },
  ],
  success: true,
  total: 1,
}));

jest.mock('@/services/flowproperties/api', () => ({
  __esModule: true,
  getFlowpropertyTableAll: (...args: any[]) => mockGetFlowpropertyTableAll(...args),
  getFlowpropertyTablePgroongaSearch: jest.fn(async () => ({ data: [], success: true })),
  getFlowpropertyDetail: jest.fn(),
  flowproperty_hybrid_search: jest.fn(),
  createFlowproperties: jest.fn(),
  updateFlowproperties: jest.fn(),
  deleteFlowproperties: jest.fn(),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getUnitData: jest.fn(async (_type: string, rows: any[]) => rows),
}));

jest.mock('@/style/custom.less', () => ({
  __esModule: true,
  default: {
    footer_right: 'footer_right',
  },
}));

describe('FlowpropertiesSelectDrawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows selecting a flow property and submits selection', async () => {
    const onData = jest.fn();

    await act(async () => {
      renderWithProviders(
        <FlowpropertiesSelectDrawer buttonType='text' lang='en' onData={onData} />,
      );
    });

    await userEvent.click(screen.getByRole('button', { name: /select/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await waitFor(() => expect(mockGetFlowpropertyTableAll).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: /select Water mass/i }));

    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onData).toHaveBeenCalledWith('fp-1', '1.0.0');
  });
});
