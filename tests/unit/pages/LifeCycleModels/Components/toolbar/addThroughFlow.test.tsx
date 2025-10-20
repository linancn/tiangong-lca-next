// @ts-nocheck
import ModelToolbarAddThroughFlow from '@/pages/LifeCycleModels/Components/toolbar/addThroughFlow';
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
}));

jest.mock('@/pages/Flows/Components/view', () => ({
  __esModule: true,
  default: () => <span>flows-view</span>,
}));

const mockGetFlowTableAll = jest.fn();
const mockGetFlowTablePgroongaSearch = jest.fn();
const mockFlowHybridSearch = jest.fn();

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  getFlowTableAll: (...args: any[]) => mockGetFlowTableAll(...args),
  getFlowTablePgroongaSearch: (...args: any[]) => mockGetFlowTablePgroongaSearch(...args),
  flow_hybrid_search: (...args: any[]) => mockFlowHybridSearch(...args),
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

  return {
    __esModule: true,
    Button,
    Tooltip,
    Drawer,
    Space,
    Row,
    Col,
    Checkbox,
    Card,
    Input,
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

beforeEach(() => {
  latestProTableProps = null;
  mockGetFlowTableAll.mockReset();
  mockGetFlowTablePgroongaSearch.mockReset();
  mockFlowHybridSearch.mockReset();
});

describe('ModelToolbarAddThroughFlow', () => {
  it('loads default TianGong flow list on open', async () => {
    mockGetFlowTableAll.mockResolvedValue({ data: [], success: true });
    const onData = jest.fn();

    render(<ModelToolbarAddThroughFlow buttonType='text' lang='en' onData={onData} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));

    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());
    expect(mockGetFlowTableAll).toHaveBeenCalledWith(
      { pageSize: 10, current: 1 },
      {},
      'en',
      'tg',
      [],
    );
  });

  it('runs AI search for TianGong tab', async () => {
    mockGetFlowTableAll.mockResolvedValue({ data: [], success: true });
    mockFlowHybridSearch.mockResolvedValue({ data: [], success: true });

    render(<ModelToolbarAddThroughFlow buttonType='text' lang='en' onData={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());

    await userEvent.click(screen.getByText('AI Search'));

    const searchInput = screen.getByRole('textbox', { name: 'tg' });
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, 'hydrogen');
    await userEvent.click(screen.getByRole('button', { name: 'search-tg' }));

    await waitFor(() => expect(mockFlowHybridSearch).toHaveBeenCalled());
    expect(mockFlowHybridSearch).toHaveBeenCalledWith(
      { pageSize: 10, current: 1 },
      'en',
      'tg',
      'hydrogen',
      {},
    );
  });

  it('searches My Data tab with keyword', async () => {
    mockGetFlowTableAll.mockResolvedValue({ data: [], success: true });
    mockGetFlowTablePgroongaSearch.mockResolvedValue({ data: [], success: true });

    render(<ModelToolbarAddThroughFlow buttonType='text' lang='en' onData={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: 'My Data' }));

    await waitFor(() =>
      expect(mockGetFlowTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'en',
        'my',
        [],
      ),
    );

    const searchInput = screen.getByRole('textbox', { name: 'my' });
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, 'water');
    await userEvent.click(screen.getByRole('button', { name: 'search-my' }));

    await waitFor(() => expect(mockGetFlowTablePgroongaSearch).toHaveBeenCalled());
    expect(mockGetFlowTablePgroongaSearch).toHaveBeenCalledWith(
      { pageSize: 10, current: 1 },
      'en',
      'my',
      'water',
      {},
    );
  });

  it('submits selected flow key list', async () => {
    mockGetFlowTableAll.mockResolvedValue({ data: [], success: true });
    const onData = jest.fn();

    render(<ModelToolbarAddThroughFlow buttonType='text' lang='en' onData={onData} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: 'My Data' }));
    await waitFor(() =>
      expect(mockGetFlowTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'en',
        'my',
        [],
      ),
    );

    expect(latestProTableProps?.rowSelection?.onChange).toBeDefined();
    await act(async () => {
      latestProTableProps?.rowSelection?.onChange?.(['flow:1'], []);
    });

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onData).toHaveBeenCalledWith(['flow:1']);
  });
});
