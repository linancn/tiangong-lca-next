// @ts-nocheck
import ConnectableProcesses from '@/pages/LifeCycleModels/Components/connectableProcesses';
import userEvent from '@testing-library/user-event';
import { act, render, screen, waitFor } from '../../../../../helpers/testUtils';

let latestProTableProps: any = null;

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close-icon</span>,
}));

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
}));

jest.mock('@/style/custom.less', () => ({
  __esModule: true,
  default: { footer_right: 'footer-right' },
}));

jest.mock('@/pages/Processes', () => ({
  __esModule: true,
  getProcesstypeOfDataSetOptions: () => 'DataType',
}));

const mockGetConnectableProcessesTable = jest.fn();

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getConnectableProcessesTable: (...args: any[]) => mockGetConnectableProcessesTable(...args),
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

  const Drawer = ({ open, title, extra, footer, children, onClose, getContainer }: any) => {
    if (!open) return null;
    const label = toText(title) || 'drawer';
    const container = getContainer?.();
    const mockBody = global.document?.body;
    return (
      <section
        role='dialog'
        aria-label={label}
        data-container={container === mockBody ? 'body' : 'custom'}
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
    );
  };

  const Space = ({ children, className }: any) => <div className={className ?? ''}>{children}</div>;

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

  return {
    __esModule: true,
    Button,
    Tooltip,
    Drawer,
    Space,
    Card,
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');
  const { toText } = require('../../../../../helpers/nodeToText');

  const ProTable = ({ actionRef, request, rowSelection, columns = [] }: any) => {
    const requestRef = React.useRef(request);
    const initializedRef = React.useRef(false);
    const [rows, setRows] = React.useState<any[]>([]);

    React.useEffect(() => {
      requestRef.current = request;
    }, [request]);

    React.useEffect(() => {
      latestProTableProps = { actionRef, request, rowSelection };
    }, [actionRef, request, rowSelection]);

    const reload = React.useCallback(async () => {
      if (requestRef.current) {
        const result = await requestRef.current({ pageSize: 10, current: 1 }, {});
        setRows(result?.data ?? []);
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

    return (
      <div data-testid='pro-table'>
        {rows.map((row, rowIndex) => (
          <div key={row.id ?? row.key ?? rowIndex}>
            {columns.map((column: any, columnIndex: number) => {
              const cellValue = column.dataIndex ? row[column.dataIndex] : undefined;
              const rendered = column.render ? column.render(cellValue, row, rowIndex) : cellValue;
              return (
                <div key={`${column.key ?? column.dataIndex ?? columnIndex}`}>
                  {toText(rendered)}
                </div>
              );
            })}
          </div>
        ))}
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
  mockGetConnectableProcessesTable.mockReset().mockResolvedValue({
    data: [
      {
        id: 'process-1',
        key: 'process-1',
        name: 'Renderable Process',
        generalComment: 'process-tooltip',
        classification: 'Class A',
        typeOfDataSet: 'unit-process',
        referenceYear: '2024',
        location: 'CN',
        version: '1.0',
        modifiedAt: '2024-01-01T00:00:00.000Z',
      },
    ],
    success: true,
  });
});

describe('ConnectableProcesses', () => {
  const baseProps = {
    portId: 'input:flow-1',
    flowVersion: '1.0',
    lang: 'en',
    drawerVisible: true,
    setDrawerVisible: jest.fn(),
    onData: jest.fn(),
  };

  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('loads TianGong processes when drawer opens', async () => {
    render(<ConnectableProcesses {...baseProps} />);

    await waitFor(() => expect(mockGetConnectableProcessesTable).toHaveBeenCalled());
    expect(mockGetConnectableProcessesTable).toHaveBeenCalledWith(
      { pageSize: 10, current: 1 },
      {},
      'en',
      'tg',
      '',
      'input:flow-1',
      '1.0',
    );
  });

  it('skips loading when the drawer is closed and falls back to default callbacks', async () => {
    render(
      <ConnectableProcesses
        portId='input:flow-1'
        flowVersion='1.0'
        lang='en'
        drawerVisible={false}
      />,
    );

    await waitFor(() => {
      expect(mockGetConnectableProcessesTable).not.toHaveBeenCalled();
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('uses the default noop callbacks without crashing when optional handlers are omitted', async () => {
    render(
      <ConnectableProcesses portId='input:flow-1' flowVersion='1.0' lang='en' drawerVisible />,
    );

    await waitFor(() => expect(mockGetConnectableProcessesTable).toHaveBeenCalled());

    await act(async () => {
      latestProTableProps?.rowSelection?.onChange?.(['proc-1:1.0'], []);
    });

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await userEvent.click(screen.getByRole('button', { name: 'close-icon' }));
  });

  it('reloads when switching to My Data tab', async () => {
    render(<ConnectableProcesses {...baseProps} />);
    await waitFor(() => expect(mockGetConnectableProcessesTable).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: 'My Data' }));

    await waitFor(() =>
      expect(mockGetConnectableProcessesTable.mock.calls.length).toBeGreaterThanOrEqual(2),
    );
    expect(mockGetConnectableProcessesTable).toHaveBeenLastCalledWith(
      { pageSize: 10, current: 1 },
      {},
      'en',
      'my',
      '',
      'input:flow-1',
      '1.0',
    );
  });

  it('reloads when switching to Business Data tab', async () => {
    render(<ConnectableProcesses {...baseProps} />);
    await waitFor(() => expect(mockGetConnectableProcessesTable).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: 'Business Data' }));

    await waitFor(() =>
      expect(mockGetConnectableProcessesTable.mock.calls.length).toBeGreaterThanOrEqual(2),
    );
    expect(mockGetConnectableProcessesTable).toHaveBeenLastCalledWith(
      { pageSize: 10, current: 1 },
      {},
      'en',
      'co',
      '',
      'input:flow-1',
      '1.0',
    );
  });

  it('reloads when switching to Team Data tab', async () => {
    render(<ConnectableProcesses {...baseProps} />);
    await waitFor(() => expect(mockGetConnectableProcessesTable).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: 'Team Data' }));

    await waitFor(() =>
      expect(mockGetConnectableProcessesTable.mock.calls.length).toBeGreaterThanOrEqual(2),
    );
    expect(mockGetConnectableProcessesTable).toHaveBeenLastCalledWith(
      { pageSize: 10, current: 1 },
      {},
      'en',
      'te',
      '',
      'input:flow-1',
      '1.0',
    );
  });

  it('submits selected processes on confirm', async () => {
    const onData = jest.fn();
    const setDrawerVisible = jest.fn();
    render(
      <ConnectableProcesses {...baseProps} onData={onData} setDrawerVisible={setDrawerVisible} />,
    );
    await waitFor(() => expect(mockGetConnectableProcessesTable).toHaveBeenCalled());

    expect(latestProTableProps?.rowSelection?.onChange).toBeDefined();
    await act(async () => {
      latestProTableProps?.rowSelection?.onChange?.(['proc-1:1.0', 'proc-2:2.0'], []);
    });

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() =>
      expect(onData).toHaveBeenCalledWith([
        { id: 'proc-1', version: '1.0' },
        { id: 'proc-2', version: '2.0' },
      ]),
    );
    expect(setDrawerVisible).toHaveBeenCalledWith(false);
  });

  it('hides selection controls in read-only mode', async () => {
    render(<ConnectableProcesses {...baseProps} readOnly />);

    await waitFor(() => expect(mockGetConnectableProcessesTable).toHaveBeenCalled());

    expect(latestProTableProps?.rowSelection).toBe(false);
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('closes through cancel and drawer close actions', async () => {
    const setDrawerVisible = jest.fn();
    render(<ConnectableProcesses {...baseProps} setDrawerVisible={setDrawerVisible} />);

    await waitFor(() => expect(mockGetConnectableProcessesTable).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(setDrawerVisible).toHaveBeenCalledWith(false);

    await userEvent.click(screen.getByText('close'));
    expect(setDrawerVisible).toHaveBeenCalledWith(false);
  });

  it('closes through the extra header close button', async () => {
    const setDrawerVisible = jest.fn();
    render(<ConnectableProcesses {...baseProps} setDrawerVisible={setDrawerVisible} />);

    await waitFor(() => expect(mockGetConnectableProcessesTable).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: 'close-icon' }));

    expect(setDrawerVisible).toHaveBeenCalledWith(false);
  });

  it('passes tid from the current URL into the table request', async () => {
    window.history.pushState({}, '', '/?tid=team-9');

    render(<ConnectableProcesses {...baseProps} />);

    await waitFor(() => expect(mockGetConnectableProcessesTable).toHaveBeenCalled());
    expect(mockGetConnectableProcessesTable).toHaveBeenCalledWith(
      { pageSize: 10, current: 1 },
      {},
      'en',
      'tg',
      'team-9',
      'input:flow-1',
      '1.0',
    );
  });

  it('renders the process name tooltip content and dataset type label', async () => {
    render(<ConnectableProcesses {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('Renderable Process')).toBeInTheDocument();
      expect(screen.getByText('DataType')).toBeInTheDocument();
    });
  });
});
