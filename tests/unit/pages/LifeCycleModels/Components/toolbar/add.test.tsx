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

jest.mock('@/components/AllVersions', () => ({
  __esModule: true,
  default: ({ id, addVersionComponent, operationRender, onSelectVersion }: any) => (
    <div data-testid={`all-versions-${id}`}>
      {addVersionComponent?.({ newVersion: '02.00.000' })}
      <div data-testid={`all-versions-operation-${id}`}>
        {operationRender?.({ id, version: '02.00.000' })}
      </div>
      <button type='button' onClick={() => onSelectVersion?.({ id, version: '02.00.000' })}>
        select-version-{id}
      </button>
      <button type='button' onClick={() => onSelectVersion?.({ version: '02.00.000' })}>
        select-version-missing-id-{id}
      </button>
    </div>
  ),
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

  const Drawer = ({ open, title, extra, footer, children, onClose, getContainer }: any) => {
    if (!open) return null;
    getContainer?.();
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

  const Checkbox = ({ checked, onChange, children }: any) => (
    <label>
      <input
        type='checkbox'
        checked={checked}
        onChange={(event) => onChange?.({ target: { checked: event.target.checked } })}
      />
      <span>{toText(children)}</span>
    </label>
  );

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
  const TableDropdown = () => <span>table-dropdown</span>;

  const ProTable = ({
    actionRef,
    params,
    request,
    rowSelection,
    columns,
    toolBarRender,
    toolbar,
    rowKey,
  }: any) => {
    const requestRef = React.useRef(request);
    const paramsRef = React.useRef(params);
    const serializedParams = JSON.stringify(params ?? {});

    React.useEffect(() => {
      requestRef.current = request;
    }, [request]);
    paramsRef.current = params;

    React.useEffect(() => {
      latestProTableProps = {
        actionRef,
        params,
        request,
        rowSelection,
        columns,
        toolBarRender,
        rowKey,
      };
    }, [actionRef, params, request, rowSelection, columns, toolBarRender]);

    const reload = React.useCallback(async () => {
      if (requestRef.current) {
        await requestRef.current({ pageSize: 10, current: 1, ...paramsRef.current }, {});
      }
    }, []);

    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = {
          reload,
          setPageInfo: jest.fn(),
        };
      }
    }, [actionRef, reload]);

    React.useEffect(() => {
      void reload();
    }, [reload, serializedParams]);

    return (
      <div data-testid='pro-table'>
        {toolbar?.search}
        {toolbar?.filter}
        <div>{toolBarRender?.()}</div>
      </div>
    );
  };

  return {
    __esModule: true,
    ProTable,
    TableDropdown,
  };
});

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
      { pageSize: 10, current: 1, classification: [] },
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

    await userEvent.click(screen.getByText('AI Recommendation'));

    const searchInput = screen.getByRole('textbox', { name: 'tg' });
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, 'solar');
    await userEvent.click(screen.getByRole('button', { name: 'search-tg' }));

    await waitFor(() => {
      expect(mockProcessHybridSearch).toHaveBeenCalled();
    });
    expect(mockProcessHybridSearch).toHaveBeenCalledWith(
      { pageSize: 10, current: 1, classification: [] },
      'en',
      'tg',
      'solar',
      {},
    );
    expect(mockGetProcessTablePgroongaSearch).not.toHaveBeenCalled();
  });

  it('renders icon trigger, column renderers, and closes from drawer controls', async () => {
    mockGetProcessTableAll.mockResolvedValue({ data: [], success: true });
    const onData = jest.fn();

    render(<ModelToolbarAdd buttonType='icon' lang='en' onData={onData} />);

    await userEvent.click(screen.getByRole('button', { name: 'plus-icon' }));
    await waitFor(() => {
      expect(mockGetProcessTableAll).toHaveBeenCalled();
    });

    const sampleRow = {
      id: 'process-1',
      version: '01.00.000',
      name: 'Sample process',
      generalComment: 'row comment',
      typeOfDataSet: 'Unit process, black box',
      referenceYear: '2024',
      location: 'CN',
      modifiedAt: '2026-03-15T00:00:00.000Z',
    };

    render(
      <>
        {latestProTableProps.columns
          .find((column: any) => column.dataIndex === 'name')
          .render?.(null, sampleRow)}
        {latestProTableProps.columns
          .find((column: any) => column.dataIndex === 'typeOfDataSet')
          .render?.(null, sampleRow)}
        {latestProTableProps.columns
          .find((column: any) => column.dataIndex === 'version')
          .render?.(null, sampleRow)}
        {latestProTableProps.columns
          .find((column: any) => column.dataIndex === 'option')
          .render?.(null, sampleRow)}
      </>,
    );

    expect(screen.getByText('Sample process')).toBeInTheDocument();
    expect(screen.getAllByText('process-view').length).toBeGreaterThan(0);
    expect(screen.getByTestId('all-versions-process-1')).toBeInTheDocument();
    await act(async () => {
      latestProTableProps?.rowSelection?.onChange?.(['process-1:01.00.000'], []);
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'select-version-missing-id-process-1' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'select-version-process-1' }));
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onData).toHaveBeenCalledWith([{ id: 'process-1', version: '02.00.000' }]);

    await userEvent.click(screen.getByRole('button', { name: 'plus-icon' }));
    expect(await screen.findByRole('dialog', { name: 'Add process' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByRole('dialog', { name: 'Add process' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'plus-icon' }));
    expect(await screen.findByRole('dialog', { name: 'Add process' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'close-icon' }));
    expect(screen.queryByRole('dialog', { name: 'Add process' })).not.toBeInTheDocument();
  });

  it('searches TianGong and Business Data tabs with non-AI keywords', async () => {
    mockGetProcessTableAll.mockResolvedValue({ data: [], success: true });
    mockGetProcessTablePgroongaSearch.mockResolvedValue({ data: [], success: true });

    render(<ModelToolbarAdd buttonType='text' lang='en' onData={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
    await waitFor(() => {
      expect(mockGetProcessTableAll).toHaveBeenCalledWith(
        { pageSize: 10, current: 1, classification: [] },
        {},
        'en',
        'tg',
        [],
      );
    });

    await userEvent.click(screen.getByRole('button', { name: 'Business Data' }));
    await waitFor(() =>
      expect(mockGetProcessTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1, classification: [] },
        {},
        'en',
        'co',
        [],
      ),
    );

    const coSearchInput = screen.getByRole('textbox', { name: 'co' });
    await userEvent.clear(coSearchInput);
    await userEvent.type(coSearchInput, 'cement');
    await userEvent.click(screen.getByRole('button', { name: 'search-co' }));

    await waitFor(() => {
      expect(mockGetProcessTablePgroongaSearch).toHaveBeenCalledWith(
        { pageSize: 10, current: 1, classification: [] },
        'en',
        'co',
        'cement',
        {},
      );
    });

    await userEvent.click(screen.getByRole('button', { name: 'TianGong Data' }));
    await waitFor(() =>
      expect(mockGetProcessTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1, classification: [] },
        {},
        'en',
        'tg',
        [],
      ),
    );

    const tgSearchInput = screen.getByRole('textbox', { name: 'tg' });
    await userEvent.clear(tgSearchInput);
    await userEvent.type(tgSearchInput, 'solar');
    await userEvent.click(screen.getByRole('button', { name: 'search-tg' }));

    await waitFor(() => {
      expect(mockGetProcessTablePgroongaSearch).toHaveBeenCalledWith(
        { pageSize: 10, current: 1, classification: [] },
        'en',
        'tg',
        'solar',
        {},
      );
    });
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
        { pageSize: 10, current: 1, classification: [] },
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
      { pageSize: 10, current: 1, classification: [] },
      'en',
      'my',
      'battery',
      {},
    );
    expect(mockProcessHybridSearch).not.toHaveBeenCalled();
  });

  it('renders My Data toolbar create action and supports AI search for My/Team Data', async () => {
    mockGetProcessTableAll.mockResolvedValue({ data: [], success: true });
    mockProcessHybridSearch.mockResolvedValue({ data: [], success: true });

    render(<ModelToolbarAdd buttonType='text' lang='en' onData={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
    await waitFor(() => {
      expect(mockGetProcessTableAll).toHaveBeenCalled();
    });

    await userEvent.click(screen.getByRole('button', { name: 'My Data' }));
    expect(await screen.findByText('process-create')).toBeInTheDocument();

    await userEvent.click(screen.getByText('AI Recommendation'));

    const mySearchInput = screen.getByRole('textbox', { name: 'my' });
    await userEvent.clear(mySearchInput);
    await userEvent.type(mySearchInput, 'battery');
    await userEvent.click(screen.getByRole('button', { name: 'search-my' }));

    await waitFor(() => {
      expect(mockProcessHybridSearch).toHaveBeenCalledWith(
        { pageSize: 10, current: 1, classification: [] },
        'en',
        'my',
        'battery',
        {},
      );
    });

    await userEvent.click(screen.getByRole('button', { name: 'Team Data' }));
    await waitFor(() =>
      expect(mockGetProcessTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1, classification: [] },
        {},
        'en',
        'te',
        [],
      ),
    );

    expect(screen.getByRole('checkbox')).not.toBeChecked();
    await userEvent.click(screen.getByRole('checkbox'));

    const teSearchInput = screen.getByRole('textbox', { name: 'te' });
    await userEvent.clear(teSearchInput);
    await userEvent.type(teSearchInput, 'steam');
    await userEvent.click(screen.getByRole('button', { name: 'search-te' }));

    await waitFor(() => {
      expect(mockProcessHybridSearch).toHaveBeenCalledWith(
        { pageSize: 10, current: 1, classification: [] },
        'en',
        'te',
        'steam',
        {},
      );
    });
  });

  it('uses AI search on Team Data tab from a clean checkbox state', async () => {
    mockGetProcessTableAll.mockResolvedValue({ data: [], success: true });
    mockProcessHybridSearch.mockResolvedValue({ data: [], success: true });

    render(<ModelToolbarAdd buttonType='text' lang='en' onData={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
    await waitFor(() => {
      expect(mockGetProcessTableAll).toHaveBeenCalled();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Team Data' }));
    await waitFor(() =>
      expect(mockGetProcessTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1, classification: [] },
        {},
        'en',
        'te',
        [],
      ),
    );

    await userEvent.click(screen.getByText('AI Recommendation'));

    const teSearchInput = screen.getByRole('textbox', { name: 'te' });
    await userEvent.clear(teSearchInput);
    await userEvent.type(teSearchInput, 'steam');
    await userEvent.click(screen.getByRole('button', { name: 'search-te' }));

    await waitFor(() => {
      expect(mockProcessHybridSearch).toHaveBeenCalledWith(
        { pageSize: 10, current: 1, classification: [] },
        'en',
        'te',
        'steam',
        {},
      );
    });
  });

  it('uses AI search on Business Data tab', async () => {
    mockGetProcessTableAll.mockResolvedValue({ data: [], success: true });
    mockProcessHybridSearch.mockResolvedValue({ data: [], success: true });

    render(<ModelToolbarAdd buttonType='text' lang='en' onData={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
    await waitFor(() => {
      expect(mockGetProcessTableAll).toHaveBeenCalled();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Business Data' }));
    await waitFor(() =>
      expect(mockGetProcessTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1, classification: [] },
        {},
        'en',
        'co',
        [],
      ),
    );

    await userEvent.click(screen.getByText('AI Recommendation'));

    const searchInput = screen.getByRole('textbox', { name: 'co' });
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, 'cement');
    await userEvent.click(screen.getByRole('button', { name: 'search-co' }));

    await waitFor(() => {
      expect(mockProcessHybridSearch).toHaveBeenCalled();
    });
    expect(mockProcessHybridSearch).toHaveBeenCalledWith(
      { pageSize: 10, current: 1, classification: [] },
      'en',
      'co',
      'cement',
      {},
    );
  });

  it('returns fallback table payloads when list queries resolve undefined', async () => {
    mockGetProcessTableAll.mockResolvedValue(undefined);

    render(<ModelToolbarAdd buttonType='text' lang='en' onData={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));

    await waitFor(async () => {
      await expect(latestProTableProps.request({ pageSize: 10, current: 1 }, {})).resolves.toEqual({
        data: [],
        success: false,
      });
    });

    await userEvent.click(screen.getByRole('button', { name: 'Business Data' }));
    await waitFor(async () => {
      await expect(latestProTableProps.request({ pageSize: 10, current: 1 }, {})).resolves.toEqual({
        data: [],
        success: false,
      });
    });

    await userEvent.click(screen.getByRole('button', { name: 'My Data' }));
    await waitFor(async () => {
      await expect(latestProTableProps.request({ pageSize: 10, current: 1 }, {})).resolves.toEqual({
        data: [],
        success: false,
      });
    });

    await userEvent.click(screen.getByRole('button', { name: 'Team Data' }));
    await waitFor(async () => {
      await expect(latestProTableProps.request({ pageSize: 10, current: 1 }, {})).resolves.toEqual({
        data: [],
        success: false,
      });
    });
  });

  it('searches Team Data tab with keyword', async () => {
    mockGetProcessTableAll.mockResolvedValue({ data: [], success: true });
    mockGetProcessTablePgroongaSearch.mockResolvedValue({ data: [], success: true });

    render(<ModelToolbarAdd buttonType='text' lang='en' onData={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
    await waitFor(() => {
      expect(mockGetProcessTableAll).toHaveBeenCalled();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Team Data' }));
    await waitFor(() =>
      expect(mockGetProcessTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1, classification: [] },
        {},
        'en',
        'te',
        [],
      ),
    );

    const searchInput = screen.getByRole('textbox', { name: 'te' });
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, 'steam');
    await userEvent.click(screen.getByRole('button', { name: 'search-te' }));

    await waitFor(() => {
      expect(mockGetProcessTablePgroongaSearch).toHaveBeenCalled();
    });
    expect(mockGetProcessTablePgroongaSearch).toHaveBeenCalledWith(
      { pageSize: 10, current: 1, classification: [] },
      'en',
      'te',
      'steam',
      {},
    );
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

  it('closes without submitting when cancel is clicked', async () => {
    mockGetProcessTableAll.mockResolvedValue({ data: [], success: true });
    const onData = jest.fn();

    render(<ModelToolbarAdd buttonType='text' lang='en' onData={onData} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
    expect(await screen.findByRole('dialog', { name: 'Add process' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onData).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Add process' })).not.toBeInTheDocument();
  });
  it.each([
    ['tg', 'TianGong Data'],
    ['co', 'Business Data'],
    ['my', 'My Data'],
    ['te', 'Team Data'],
  ])(
    'keeps exact identities and resets the %s selection/page when classification changes',
    async (source, tabTitle) => {
      mockGetProcessTableAll.mockResolvedValue({ data: [], success: true });
      render(<ModelToolbarAdd buttonType='text' lang='en' onData={jest.fn()} />);
      await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
      if (source !== 'tg') await userEvent.click(screen.getByRole('button', { name: tabTitle }));
      await waitFor(() => expect(mockGetProcessTableAll.mock.calls.at(-1)[3]).toBe(source));
      const row = { id: 'same-dataset', version: '01.00.000' };
      expect(latestProTableProps.rowKey(row)).toBe('same-dataset:01.00.000');
      expect(latestProTableProps.rowKey({ ...row, version: '02.00.000' })).toBe(
        'same-dataset:02.00.000',
      );
      await act(async () => latestProTableProps.rowSelection.onChange(['same-dataset:01.00.000']));
      expect(latestProTableProps.rowSelection.selectedRowKeys).toEqual(['same-dataset:01.00.000']);
      const api = latestProTableProps.actionRef.current;
      api.setPageInfo.mockClear();
      await userEvent.selectOptions(screen.getByLabelText('Classification'), 'C');
      await waitFor(() =>
        expect(mockGetProcessTableAll.mock.calls.at(-1)[0].classification).toEqual([
          { scope: 'classification', code: 'C', path: ['C'] },
        ]),
      );
      expect(latestProTableProps.rowSelection.selectedRowKeys).toEqual([]);
      expect(api.setPageInfo).toHaveBeenCalledWith({ current: 1 });
      expect(mockGetProcessTableAll.mock.calls.at(-1)[3]).toBe(source);
      await userEvent.selectOptions(screen.getByLabelText('Classification'), '');
      await waitFor(() =>
        expect(mockGetProcessTableAll.mock.calls.at(-1)[0].classification).toEqual([]),
      );
    },
  );
});

describe('ModelToolbarAdd submitted search', () => {
  it.each([
    ['tg', 'TianGong Data', true],
    ['co', 'Business Data', true],
    ['my', 'My Data', true],
    ['te', 'Team Data', true],
  ])(
    'uses only submitted keyword and mode for %s paging and reloads',
    async (source, label, hasAI) => {
      mockGetProcessTableAll.mockResolvedValue({ data: [], success: true });
      mockGetProcessTablePgroongaSearch.mockResolvedValue({ data: [], success: true });
      mockProcessHybridSearch.mockResolvedValue({ data: [], success: true });
      render(<ModelToolbarAdd buttonType='text' lang='en' onData={jest.fn()} />);
      await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
      if (source !== 'tg') await userEvent.click(screen.getByRole('button', { name: label }));
      await waitFor(() => expect(mockGetProcessTableAll.mock.calls.at(-1)?.[3]).toBe(source));
      await userEvent.type(screen.getByRole('textbox', { name: source }), 'applied');
      await userEvent.click(screen.getByRole('button', { name: `search-${source}` }));
      expect(mockGetProcessTablePgroongaSearch.mock.calls.at(-1)?.slice(2, 4)).toEqual([
        source,
        'applied',
      ]);
      await act(async () => latestProTableProps.rowSelection.onChange(['selected:1']));
      const api = latestProTableProps.actionRef.current;
      api.setPageInfo.mockClear();
      const count = () =>
        mockGetProcessTableAll.mock.calls.length +
        mockGetProcessTablePgroongaSearch.mock.calls.length +
        mockProcessHybridSearch.mock.calls.length;
      const beforeDraft = count();
      if (hasAI) await userEvent.click(screen.getByRole('checkbox'));
      await userEvent.clear(screen.getByRole('textbox', { name: source }));
      await userEvent.type(screen.getByRole('textbox', { name: source }), 'draft');
      expect(count()).toBe(beforeDraft);
      expect(latestProTableProps.rowSelection.selectedRowKeys).toEqual(['selected:1']);
      expect(api.setPageInfo).not.toHaveBeenCalled();
      await act(async () => {
        await latestProTableProps.request(
          { ...latestProTableProps.params, current: 3, pageSize: 10 },
          {},
          {},
        );
      });
      expect(mockGetProcessTablePgroongaSearch.mock.calls.at(-1)?.slice(2, 4)).toEqual([
        source,
        'applied',
      ]);
      expect(mockGetProcessTablePgroongaSearch.mock.calls.at(-1)?.[0].current).toBe(3);
      await userEvent.click(screen.getByRole('button', { name: `search-${source}` }));
      const submittedService = hasAI ? mockProcessHybridSearch : mockGetProcessTablePgroongaSearch;
      expect(submittedService.mock.calls.at(-1)?.slice(2, 4)).toEqual([source, 'draft']);
      expect(latestProTableProps.rowSelection.selectedRowKeys).toEqual([]);
      expect(api.setPageInfo).toHaveBeenCalledWith({ current: 1 });
      const beforeToggle = count();
      if (hasAI) await userEvent.click(screen.getByRole('checkbox'));
      expect(count()).toBe(beforeToggle);
      await act(async () => {
        await latestProTableProps.request(
          { ...latestProTableProps.params, current: 3, pageSize: 10 },
          {},
          {},
        );
      });
      expect(submittedService.mock.calls.at(-1)?.slice(2, 4)).toEqual([source, 'draft']);
      if (hasAI) await userEvent.click(screen.getByRole('button', { name: `search-${source}` }));
      expect(mockGetProcessTablePgroongaSearch.mock.calls.at(-1)?.slice(2, 4)).toEqual([
        source,
        'draft',
      ]);
      const beforeRepeat = mockGetProcessTablePgroongaSearch.mock.calls.length;
      await userEvent.click(screen.getByRole('button', { name: `search-${source}` }));
      expect(mockGetProcessTablePgroongaSearch.mock.calls.length).toBeGreaterThan(beforeRepeat);
    },
  );

  it('preserves each tab draft and submitted mode through tab changes and reopening', async () => {
    mockGetProcessTableAll.mockResolvedValue({ data: [], success: true });
    mockGetProcessTablePgroongaSearch.mockResolvedValue({ data: [], success: true });
    mockProcessHybridSearch.mockResolvedValue({ data: [], success: true });
    render(<ModelToolbarAdd buttonType='text' lang='en' onData={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
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
    expect(mockGetProcessTablePgroongaSearch.mock.calls.at(-1)?.slice(2, 4)).toEqual([
      'co',
      'second query',
    ]);
    await userEvent.click(screen.getByRole('button', { name: 'TianGong Data' }));
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('textbox', { name: 'tg' })).toHaveValue('unsubmitted');
    await act(async () => {
      await latestProTableProps.request(
        { ...latestProTableProps.params, current: 2, pageSize: 10 },
        {},
        {},
      );
    });
    expect(mockProcessHybridSearch.mock.calls.at(-1)?.slice(2, 4)).toEqual(['tg', 'first query']);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
    expect(screen.getByRole('textbox', { name: 'tg' })).toHaveValue('unsubmitted');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    await act(async () => {
      await latestProTableProps.request(
        { ...latestProTableProps.params, current: 2, pageSize: 10 },
        {},
        {},
      );
    });
    expect(mockProcessHybridSearch.mock.calls.at(-1)?.slice(2, 4)).toEqual(['tg', 'first query']);
  });

  it('invalidates a pending result immediately when a new search is submitted', async () => {
    mockGetProcessTableAll.mockResolvedValue({ data: [], success: true });
    mockGetProcessTablePgroongaSearch.mockResolvedValue({ data: [], success: true });
    render(<ModelToolbarAdd buttonType='text' lang='en' onData={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
    await waitFor(() => expect(mockGetProcessTableAll).toHaveBeenCalled());
    let resolveOld;
    mockGetProcessTableAll.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    const pending = latestProTableProps.request(
      { ...latestProTableProps.params, current: 3, pageSize: 10 },
      {},
      {},
    );
    await userEvent.type(screen.getByRole('textbox', { name: 'tg' }), 'new query');
    // Prevent the replacement request from invalidating the old request on its own.
    const heldReload = jest
      .spyOn(latestProTableProps.actionRef.current, 'reload')
      .mockResolvedValueOnce(undefined);
    heldReload.mockClear();
    const previousListCount = mockGetProcessTableAll.mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'search-tg' }));
    expect(heldReload).toHaveBeenCalledTimes(1);
    expect(mockGetProcessTableAll).toHaveBeenCalledTimes(previousListCount);
    expect(mockGetProcessTablePgroongaSearch).not.toHaveBeenCalled();
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
