// @ts-nocheck
import ModelToolbarAdd from '@/pages/LifeCycleModels/Components/toolbar/add';
import userEvent from '@testing-library/user-event';
import { act, render, screen, waitFor } from '../../../../../helpers/testUtils';

let latestProTableProps: any = null;

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@/style/custom.less', () => ({
  __esModule: true,
  default: { footer_right: 'footer-right' },
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close-icon</span>,
  PlusOutlined: () => <span>plus-icon</span>,
  QuestionCircleOutlined: () => <span>question-icon</span>,
}));

jest.mock('@/pages/Processes/Components/create', () => ({
  __esModule: true,
  default: () => <span>process-create</span>,
}));

jest.mock('@/pages/Processes/Components/view', () => ({
  __esModule: true,
  default: () => <span>process-view</span>,
}));

jest.mock('@/components/AISuggestion', () => ({
  __esModule: true,
  default: () => <span>ai-suggestion</span>,
}));

const mockGetProcessTableAll = jest.fn();
const mockGetProcessTablePgroongaSearch = jest.fn();
const mockProcessHybridSearch = jest.fn();

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessTableAll: (...args: any[]) => mockGetProcessTableAll(...args),
  getProcessTablePgroongaSearch: (...args: any[]) => mockGetProcessTablePgroongaSearch(...args),
  process_hybrid_search: (...args: any[]) => mockProcessHybridSearch(...args),
}));

jest.mock('antd', () => {
  const React = require('react');
  const { toText } = require('../../../../../helpers/nodeToText');

  const Button = ({ children, onClick, disabled = false, icon, htmlType = 'button' }: any) => (
    <button
      type={htmlType === 'submit' ? 'submit' : htmlType === 'reset' ? 'reset' : 'button'}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
    >
      {icon}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ children }: any) => <>{children}</>;

  const Typography = {
    Text: ({ children }: any) => <span>{toText(children)}</span>,
    Title: ({ children }: any) => <h1>{toText(children)}</h1>,
  };

  const theme = {
    defaultAlgorithm: () => ({}),
    darkAlgorithm: () => ({}),
    useToken: () => ({
      token: {
        colorBgContainer: '#fff',
        colorFillSecondary: '#eee',
        colorBorder: '#ddd',
        colorBorderSecondary: '#ccc',
        colorSplit: '#bbb',
        colorSuccessBg: '#f6ffed',
        colorSuccess: '#52c41a',
        colorErrorBg: '#fff1f0',
        colorError: '#f5222d',
        colorInfoBg: '#e6f7ff',
        colorInfo: '#1677ff',
        colorSuccessBorder: '#b7eb8f',
        colorWarningBg: '#fffbe6',
        colorWarningBorder: '#ffe58f',
        colorWarning: '#faad14',
        colorPrimary: '#1677ff',
      },
    }),
  };

  const Drawer = ({ open, title, extra, footer, children, onClose }: any) => {
    if (!open) return null;
    const label = toText(title) || 'drawer';
    return (
      <section role='dialog' aria-label={label}>
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

  const Space = ({ children, className }: any) => <div className={className ?? ''}>{children}</div>;

  const Row = ({ children }: any) => <div>{children}</div>;
  const Col = ({ children }: any) => <div>{children}</div>;

  const Checkbox = ({ onChange, children }: any) => {
    const [checked, setChecked] = React.useState(false);
    return (
      <label>
        <input
          type='checkbox'
          checked={checked}
          onChange={(event) => {
            setChecked(event.target.checked);
            onChange?.({ target: { checked: event.target.checked } });
          }}
        />
        <span>{toText(children)}</span>
      </label>
    );
  };

  const Card = ({ tabList = [], activeTabKey, onTabChange, children }: any) => (
    <div>
      <div>
        {tabList.map((tab: any) => (
          <button
            type='button'
            key={tab.key}
            data-active={tab.key === activeTabKey}
            onClick={() => onTabChange?.(tab.key)}
          >
            {toText(tab.tab)}
          </button>
        ))}
      </div>
      <div>{children}</div>
    </div>
  );

  const Input = ({ value, onChange, 'aria-label': ariaLabel }: any) => (
    <input
      value={value ?? ''}
      aria-label={ariaLabel}
      onChange={(event) => onChange?.({ target: { value: event.target.value } })}
    />
  );

  const Search = ({ value = '', onChange, onSearch, placeholder, enterButton, name }: any) => {
    const [inner, setInner] = React.useState(value);
    React.useEffect(() => {
      setInner(value);
    }, [value]);
    return (
      <div>
        <input
          value={inner}
          aria-label={name ?? placeholder ?? 'search'}
          onChange={(event) => {
            setInner(event.target.value);
            onChange?.({ target: { value: event.target.value } });
          }}
        />
        <button
          type='button'
          aria-label={`search-${name ?? 'search'}`}
          onClick={() => onSearch?.(inner)}
        >
          {enterButton ? 'search' : 'submit'}
        </button>
      </div>
    );
  };

  Input.Search = Search;

  const Form = ({ children, onFinish }: any) => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onFinish?.({});
      }}
    >
      {children}
    </form>
  );
  Form.Item = ({ children }: any) => <div>{children}</div>;
  Form.useForm = () => [
    {
      setFieldsValue: jest.fn(),
      validateFields: jest.fn(),
    },
  ];
  Form.List = ({ children }: any) => (
    <div>{children?.([], { add: jest.fn(), remove: jest.fn() })}</div>
  );

  return {
    __esModule: true,
    Button,
    Tooltip,
    Typography,
    theme,
    Drawer,
    Space,
    Row,
    Col,
    Checkbox,
    Card,
    Input,
    Form,
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProTable = ({ actionRef, request, rowSelection }: any) => {
    const requestRef = React.useRef(request);
    const initializedRef = React.useRef(false);

    React.useEffect(() => {
      requestRef.current = request;
    }, [request]);

    React.useEffect(() => {
      latestProTableProps = { actionRef, request, rowSelection };
    }, [actionRef, request, rowSelection]);

    const reload = React.useCallback(async () => {
      if (requestRef.current) {
        await requestRef.current({ pageSize: 10, current: 1 }, {});
      }
    }, []);

    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = {
          reload,
          setPageInfo: jest.fn(),
        };
      }
      if (!initializedRef.current) {
        initializedRef.current = true;
        void reload();
      }
    }, [actionRef, reload]);

    return <div data-testid='pro-table' />;
  };

  return {
    __esModule: true,
    ProTable,
  };
});

jest.mock('@ant-design/pro-table', () => ({
  __esModule: true,
  TableDropdown: () => <span>table-dropdown</span>,
}));

beforeEach(() => {
  latestProTableProps = null;
  mockGetProcessTableAll.mockReset();
  mockGetProcessTablePgroongaSearch.mockReset();
  mockProcessHybridSearch.mockReset();
});

describe('ModelToolbarAdd', () => {
  it('loads TianGong data when opening drawer', async () => {
    mockGetProcessTableAll.mockResolvedValue({ data: [], success: true });
    const onData = jest.fn();
    render(<ModelToolbarAdd buttonType='text' lang='en' onData={onData} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));

    await waitFor(() => {
      expect(mockGetProcessTableAll).toHaveBeenCalled();
    });
    expect(mockGetProcessTableAll).toHaveBeenCalledWith(
      { pageSize: 10, current: 1 },
      {},
      'en',
      'tg',
      [],
    );
    expect(mockProcessHybridSearch).not.toHaveBeenCalled();
  });

  it('uses AI search when checkbox enabled', async () => {
    mockGetProcessTableAll.mockResolvedValue({ data: [], success: true });
    mockProcessHybridSearch.mockResolvedValue({ data: [], success: true });

    render(<ModelToolbarAdd buttonType='text' lang='en' onData={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
    await waitFor(() => {
      expect(mockGetProcessTableAll).toHaveBeenCalled();
    });

    await userEvent.click(screen.getByText('AI Search'));

    const searchInput = screen.getByRole('textbox', { name: 'tg' });
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, 'solar');
    await userEvent.click(screen.getByRole('button', { name: 'search-tg' }));

    await waitFor(() => {
      expect(mockProcessHybridSearch).toHaveBeenCalled();
    });
    expect(mockProcessHybridSearch).toHaveBeenCalledWith(
      { pageSize: 10, current: 1 },
      'en',
      'tg',
      'solar',
      {},
    );
    expect(mockGetProcessTablePgroongaSearch).not.toHaveBeenCalled();
  });

  it('searches My Data tab with keyword', async () => {
    mockGetProcessTableAll.mockResolvedValue({ data: [], success: true });
    mockGetProcessTablePgroongaSearch.mockResolvedValue({ data: [], success: true });

    render(<ModelToolbarAdd buttonType='text' lang='en' onData={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
    await waitFor(() => {
      expect(mockGetProcessTableAll).toHaveBeenCalled();
    });

    await userEvent.click(screen.getByRole('button', { name: 'My Data' }));

    await waitFor(() =>
      expect(mockGetProcessTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'en',
        'my',
        [],
      ),
    );

    const searchInput = screen.getByRole('textbox', { name: 'my' });
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, 'battery');
    await userEvent.click(screen.getByRole('button', { name: 'search-my' }));

    await waitFor(() => {
      expect(mockGetProcessTablePgroongaSearch).toHaveBeenCalled();
    });
    expect(mockGetProcessTablePgroongaSearch).toHaveBeenCalledWith(
      { pageSize: 10, current: 1 },
      'en',
      'my',
      'battery',
      {},
    );
    expect(mockProcessHybridSearch).not.toHaveBeenCalled();
  });

  it('submits selected rows through onData callback', async () => {
    mockGetProcessTableAll.mockResolvedValue({ data: [], success: true });
    const onData = jest.fn();

    render(<ModelToolbarAdd buttonType='text' lang='en' onData={onData} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
    await waitFor(() => expect(mockGetProcessTableAll).toHaveBeenCalled());

    expect(latestProTableProps?.rowSelection?.onChange).toBeDefined();

    await act(async () => {
      latestProTableProps?.rowSelection?.onChange?.(['foo:1'], []);
    });

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onData).toHaveBeenCalledWith([{ id: 'foo', version: '1' }]);
  });
});
