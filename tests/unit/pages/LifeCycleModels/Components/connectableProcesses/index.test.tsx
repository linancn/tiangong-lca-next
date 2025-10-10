// @ts-nocheck
import ConnectableProcesses from '@/pages/LifeCycleModels/Components/connectableProcesses';
import userEvent from '@testing-library/user-event';
import { act, render, screen, waitFor } from '../../../../../helpers/testUtils';

let latestProTableProps: any = null;

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
  mockGetConnectableProcessesTable.mockReset().mockResolvedValue({ data: [], success: true });
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

  it('submits selected processes on confirm', async () => {
    const onData = jest.fn();
    render(<ConnectableProcesses {...baseProps} onData={onData} />);
    await waitFor(() => expect(mockGetConnectableProcessesTable).toHaveBeenCalled());

    expect(latestProTableProps?.rowSelection?.onChange).toBeDefined();
    await act(async () => {
      latestProTableProps?.rowSelection?.onChange?.(['proc-1:1.0'], []);
    });

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(onData).toHaveBeenCalledWith([{ id: 'proc-1', version: '1.0' }]));
  });
});
