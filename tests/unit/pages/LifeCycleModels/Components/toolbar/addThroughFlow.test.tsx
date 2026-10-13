// @ts-nocheck
import ModelToolbarAddThroughFlow from '@/pages/LifeCycleModels/Components/toolbar/addThroughFlow';
import userEvent from '@testing-library/user-event';
import { act, render, screen, waitFor } from '../../../../../helpers/testUtils';

let latestProTableProps: any = null;
let mockOmitContentLanguageRequestParam = false;

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
  useLocation: () => ({ pathname: '/lifeCycleModels' }),
}));

jest.mock('@/style/custom.less', () => ({
  __esModule: true,
  default: { footer_right: 'footer-right' },
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  BarsOutlined: () => <span>bars-icon</span>,
  CloseOutlined: () => <span>close-icon</span>,
  PlusOutlined: () => <span>plus-icon</span>,
}));

jest.mock('@/pages/Flows/Components/view', () => ({
  __esModule: true,
  default: () => <span>flows-view</span>,
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
      <button type='button' onClick={() => onSelectVersion?.({ id })}>
        select-version-missing-version-{id}
      </button>
    </div>
  ),
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

  const Badge = ({ children }: any) => <span>{children}</span>;
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
  const ConfigProvider = ({ children }: any) => <>{children}</>;
  const Typography = {
    Text: ({ children }: any) => <span>{toText(children)}</span>,
    Title: ({ children }: any) => <h1>{toText(children)}</h1>,
  };
  const theme = {
    defaultAlgorithm: () => ({}),
    darkAlgorithm: () => ({}),
    useToken: () => ({
      token: {
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
    Badge,
    Button,
    ConfigProvider,
    Tooltip,
    Drawer,
    Space,
    Row,
    Col,
    Checkbox,
    Card,
    Input,
    Typography,
    theme,
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProTable = ({
    actionRef,
    params,
    request,
    rowSelection,
    columns,
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
      latestProTableProps = { actionRef, params, request, rowSelection, columns, rowKey };
    }, [actionRef, params, request, rowSelection, columns]);

    const reload = React.useCallback(async () => {
      if (requestRef.current) {
        const requestParams = mockOmitContentLanguageRequestParam
          ? { pageSize: 10, current: 1, classification: paramsRef.current.classification }
          : { pageSize: 10, current: 1, ...paramsRef.current };
        await requestRef.current(requestParams, {});
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
      </div>
    );
  };

  return {
    __esModule: true,
    ProTable,
  };
});

beforeEach(() => {
  latestProTableProps = null;
  mockOmitContentLanguageRequestParam = false;
  mockGetFlowTableAll.mockReset();
  mockGetFlowTablePgroongaSearch.mockReset();
  mockFlowHybridSearch.mockReset();
});

describe('ModelToolbarAddThroughFlow', () => {
  it('renders the localized flow type and missing metadata from the shared column order', async () => {
    mockGetFlowTableAll.mockResolvedValue({ data: [], success: true });
    render(<ModelToolbarAddThroughFlow buttonType='text' lang='en' onData={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
    const dataTypeColumn = latestProTableProps.columns.find(
      (column: any) => column.dataIndex === 'flowType',
    );
    const localized = dataTypeColumn.render(null, { flowType: 'Elementary flow' });
    expect(localized.props.defaultMessage).toBe('Elementary flow');
    expect(dataTypeColumn.render(null, { flowType: '' })).toBe('—');
  });

  it('loads default TianGong flow list on open', async () => {
    mockGetFlowTableAll.mockResolvedValue({ data: [], success: true });
    const onData = jest.fn();

    render(<ModelToolbarAddThroughFlow buttonType='text' lang='en' onData={onData} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));

    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());
    expect(mockGetFlowTableAll).toHaveBeenCalledWith(
      { pageSize: 10, current: 1, classification: [] },
      {},
      'en',
      'tg',
      [],
    );
  });

  it('defaults the content language for both data tabs when ProTable omits it', async () => {
    mockOmitContentLanguageRequestParam = true;
    mockGetFlowTableAll.mockResolvedValue({ data: [], success: true });

    render(<ModelToolbarAddThroughFlow buttonType='text' lang='en' onData={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
    await waitFor(() =>
      expect(mockGetFlowTableAll).toHaveBeenCalledWith(
        { pageSize: 10, current: 1, classification: [] },
        {},
        'en',
        'tg',
        [],
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: 'My Data' }));
    await waitFor(() =>
      expect(mockGetFlowTableAll).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1, classification: [] },
        {},
        'en',
        'my',
        [],
      ),
    );
  });

  it('runs AI search for TianGong tab', async () => {
    mockGetFlowTableAll.mockResolvedValue({ data: [], success: true });
    mockFlowHybridSearch.mockResolvedValue({ data: [], success: true });

    render(<ModelToolbarAddThroughFlow buttonType='text' lang='en' onData={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());

    await userEvent.click(screen.getByText('AI Recommendation'));

    const searchInput = screen.getByRole('textbox', { name: 'tg' });
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, 'hydrogen');
    await userEvent.click(screen.getByRole('button', { name: 'search-tg' }));

    await waitFor(() => expect(mockFlowHybridSearch).toHaveBeenCalled());
    expect(mockFlowHybridSearch).toHaveBeenCalledWith(
      { pageSize: 10, current: 1, classification: [] },
      'en',
      'tg',
      'hydrogen',
      {},
    );
  });

  it('runs keyword search for TianGong tab when AI search is disabled', async () => {
    mockGetFlowTableAll.mockResolvedValue({ data: [], success: true });
    mockGetFlowTablePgroongaSearch.mockResolvedValue({ data: [], success: true });

    render(<ModelToolbarAddThroughFlow buttonType='text' lang='en' onData={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalled());

    const searchInput = screen.getByRole('textbox', { name: 'tg' });
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, 'oxygen');
    await userEvent.click(screen.getByRole('button', { name: 'search-tg' }));

    await waitFor(() => expect(mockGetFlowTablePgroongaSearch).toHaveBeenCalled());
    expect(mockGetFlowTablePgroongaSearch).toHaveBeenCalledWith(
      { pageSize: 10, current: 1, classification: [] },
      'en',
      'tg',
      'oxygen',
      {},
    );
    expect(mockFlowHybridSearch).not.toHaveBeenCalled();
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
        { pageSize: 10, current: 1, classification: [] },
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
      { pageSize: 10, current: 1, classification: [] },
      'en',
      'my',
      'water',
      {},
    );
  });

  it('reloads TianGong data after switching back from My Data', async () => {
    mockGetFlowTableAll.mockResolvedValue({ data: [], success: true });

    render(<ModelToolbarAddThroughFlow buttonType='text' lang='en' onData={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole('button', { name: 'My Data' }));
    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalledTimes(2));

    await userEvent.click(screen.getByRole('button', { name: 'TianGong Data' }));
    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalledTimes(3));
    expect(mockGetFlowTableAll).toHaveBeenLastCalledWith(
      { pageSize: 10, current: 1, classification: [] },
      {},
      'en',
      'tg',
      [],
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
        { pageSize: 10, current: 1, classification: [] },
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

  it('closes without submitting when cancel is clicked', async () => {
    mockGetFlowTableAll.mockResolvedValue({ data: [], success: true });
    const onData = jest.fn();

    render(<ModelToolbarAddThroughFlow buttonType='text' lang='en' onData={onData} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
    expect(await screen.findByRole('dialog', { name: 'Select Flow' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onData).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Select Flow' })).not.toBeInTheDocument();
  });

  it('renders column helpers and supports icon trigger plus both close paths', async () => {
    mockGetFlowTableAll.mockResolvedValue({ data: [], success: true });
    const onData = jest.fn();

    render(<ModelToolbarAddThroughFlow buttonType='icon' lang='en' onData={onData} />);

    await userEvent.click(screen.getByRole('button', { name: 'plus-icon' }));
    expect(await screen.findByRole('dialog', { name: 'Select Flow' })).toBeInTheDocument();

    expect(latestProTableProps?.columns).toHaveLength(9);
    const nameCell = latestProTableProps.columns
      .find((column: any) => column.dataIndex === 'name')
      .render(null, {
        id: 'flow-1',
        version: '01.00.000',
        name: 'Hydrogen',
        synonyms: 'H2',
      });
    expect(String(nameCell[0].props.children)).toContain('Hydrogen');

    const optionCell = latestProTableProps.columns
      .find((column: any) => column.dataIndex === 'option')
      .render(null, {
        id: 'flow-1',
        version: '01.00.000',
      });
    expect(optionCell).toHaveLength(1);

    render(
      <>
        {latestProTableProps.columns
          .find((column: any) => column.dataIndex === 'version')
          .render(null, {
            id: 'flow-1',
            version: '01.00.000',
          })}
      </>,
    );
    expect(screen.getByTestId('all-versions-flow-1')).toBeInTheDocument();
    expect(screen.getByText('flows-view')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'select-version-flow-1' }));
    expect(onData).toHaveBeenCalledWith(['flow-1:02.00.000']);

    await userEvent.click(
      screen.getByRole('button', { name: 'select-version-missing-version-flow-1' }),
    );
    expect(onData).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'plus-icon' }));
    expect(await screen.findByRole('dialog', { name: 'Select Flow' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'close-icon' }));
    expect(screen.queryByRole('dialog', { name: 'Select Flow' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'plus-icon' }));
    expect(await screen.findByRole('dialog', { name: 'Select Flow' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByRole('dialog', { name: 'Select Flow' })).not.toBeInTheDocument();
  });
  it.each([
    ['tg', 'TianGong Data'],
    ['my', 'My Data'],
  ])(
    'keeps exact identities and resets the %s selection/page when classification changes',
    async (source, tabTitle) => {
      mockGetFlowTableAll.mockResolvedValue({ data: [], success: true });
      render(<ModelToolbarAddThroughFlow buttonType='text' lang='en' onData={jest.fn()} />);
      await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
      if (source !== 'tg') await userEvent.click(screen.getByRole('button', { name: tabTitle }));
      await waitFor(() => expect(mockGetFlowTableAll.mock.calls.at(-1)[3]).toBe(source));
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
        expect(mockGetFlowTableAll.mock.calls.at(-1)[0].classification).toEqual([
          { scope: 'classification', code: 'C', path: ['C'] },
        ]),
      );
      expect(latestProTableProps.rowSelection.selectedRowKeys).toEqual([]);
      expect(api.setPageInfo).toHaveBeenCalledWith({ current: 1 });
      expect(mockGetFlowTableAll.mock.calls.at(-1)[3]).toBe(source);
      await userEvent.selectOptions(screen.getByLabelText('Classification'), '');
      await waitFor(() =>
        expect(mockGetFlowTableAll.mock.calls.at(-1)[0].classification).toEqual([]),
      );
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
