// @ts-nocheck
import LcaTaskCenter from '@/components/LcaTaskCenter';
import {
  REVIEW_SUBMIT_GATE_BLOCKER_CODES,
  REVIEW_SUBMIT_GATE_REASON_GUIDANCE,
} from '@/utils/reviewSubmitGateGuidance';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

let mockTasks: any[] = [];
let mockPackageTasks: any[] = [];
let mockReviewSubmitTasks: any[] = [];
const mockClearFinishedLcaTasks = jest.fn();
const mockClearFinishedTidasPackageTasks = jest.fn();
const mockClearFinishedReviewSubmitTasks = jest.fn();
const mockDownloadTidasPackageExportTask = jest.fn();
const mockCancelReviewSubmitTask = jest.fn();
const mockRefreshLcaTasksFromWorkerJobs = jest.fn();
const mockRefreshTidasPackageTasksFromWorkerJobs = jest.fn();
const mockRefreshReviewSubmitTasks = jest.fn();
const mockRetryReviewSubmitTask = jest.fn();
const mockSubscribeLcaTasks = jest.fn(() => jest.fn());
const mockSubscribeTidasPackageTasks = jest.fn(() => jest.fn());
const mockSubscribeReviewSubmitTasks = jest.fn(() => jest.fn());
const mockSubscribeLcaTaskCenterOpenRequests = jest.fn(() => jest.fn());

const formatWithValues = (message: string, values?: Record<string, any>) =>
  Object.entries(values ?? {}).reduce((text, [key, value]) => {
    return text.replace(`{${key}}`, String(value));
  }, message);

jest.mock('@/services/lca/taskCenter', () => ({
  __esModule: true,
  clearFinishedLcaTasks: () => mockClearFinishedLcaTasks(),
  listLcaTasks: () => mockTasks,
  refreshLcaTasksFromWorkerJobs: (...args: any[]) => mockRefreshLcaTasksFromWorkerJobs(...args),
  subscribeLcaTaskCenterOpenRequests: (...args: any[]) =>
    mockSubscribeLcaTaskCenterOpenRequests(...args),
  subscribeLcaTasks: (...args: any[]) => mockSubscribeLcaTasks(...args),
}));

jest.mock('@/services/tidasPackage/taskCenter', () => ({
  __esModule: true,
  clearFinishedTidasPackageTasks: () => mockClearFinishedTidasPackageTasks(),
  downloadTidasPackageExportTask: (...args: any[]) => mockDownloadTidasPackageExportTask(...args),
  listTidasPackageTasks: () => mockPackageTasks,
  refreshTidasPackageTasksFromWorkerJobs: (...args: any[]) =>
    mockRefreshTidasPackageTasksFromWorkerJobs(...args),
  subscribeTidasPackageTasks: (...args: any[]) => mockSubscribeTidasPackageTasks(...args),
}));

jest.mock('@/services/reviews/taskCenter', () => ({
  __esModule: true,
  cancelReviewSubmitTask: (...args: any[]) => mockCancelReviewSubmitTask(...args),
  clearFinishedReviewSubmitTasks: () => mockClearFinishedReviewSubmitTasks(),
  listReviewSubmitTasks: () => mockReviewSubmitTasks,
  refreshReviewSubmitTasks: (...args: any[]) => mockRefreshReviewSubmitTasks(...args),
  retryReviewSubmitTask: (...args: any[]) => mockRetryReviewSubmitTask(...args),
  subscribeReviewSubmitTasks: (...args: any[]) => mockSubscribeReviewSubmitTasks(...args),
}));

jest.mock('umi', () => ({
  __esModule: true,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any, values?: Record<string, any>) =>
      formatWithValues(defaultMessage ?? id, values),
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CheckCircleOutlined: () => <span>check-icon</span>,
  ClockCircleOutlined: ({ onClick }: any) => (
    <button type='button' aria-label='open-lca-task-center' onClick={onClick}>
      clock-icon
    </button>
  ),
  CloseCircleOutlined: () => <span>close-icon</span>,
  DownloadOutlined: () => <span>download-icon</span>,
  EyeOutlined: () => <span>eye-icon</span>,
  InfoCircleOutlined: () => <span>info-icon</span>,
  ReloadOutlined: () => <span>reload-icon</span>,
}));

jest.mock('antd', () => {
  const React = require('react');

  const Badge = ({ count, children }: any) => (
    <div>
      <span data-testid='badge-count'>{count}</span>
      {children}
    </div>
  );

  const Button = ({ children, onClick, disabled, icon, 'aria-label': ariaLabel }: any) => (
    <button
      type='button'
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          onClick?.();
        }
      }}
    >
      {children ?? icon}
    </button>
  );

  const Empty: any = ({ description }: any) => <div data-testid='empty'>{description}</div>;
  Empty.PRESENTED_IMAGE_SIMPLE = 'simple';

  const List: any = ({ dataSource = [], renderItem }: any) => (
    <div data-testid='list'>{dataSource.map((item: any) => renderItem(item))}</div>
  );
  List.Item = ({ children, actions = [] }: any) => (
    <div data-testid='list-item'>
      <div>{children}</div>
      <div>{actions}</div>
    </div>
  );

  const Modal = ({ open, title, children, onCancel }: any) =>
    open ? (
      <div role='dialog'>
        <h1>{title}</h1>
        {children}
        <button type='button' onClick={onCancel}>
          Close
        </button>
      </div>
    ) : null;

  const Popover = ({ children, content }: any) => {
    const [open, setOpen] = React.useState(false);
    const trigger = React.isValidElement(children)
      ? React.cloneElement(children, {
          onClick: (...args: any[]) => {
            children.props.onClick?.(...args);
            setOpen((current: boolean) => !current);
          },
        })
      : children;

    return (
      <div>
        {trigger}
        {open ? <div>{content}</div> : null}
      </div>
    );
  };

  const Progress = ({ percent }: any) => <div role='progressbar'>{percent}%</div>;
  const Space = ({ children, style, ...props }: any) => {
    const domProps = { ...props };
    delete domProps.align;
    delete domProps.direction;
    delete domProps.size;
    delete domProps.split;
    delete domProps.wrap;
    return (
      <div style={style} {...domProps}>
        {children}
      </div>
    );
  };
  const Tag = ({ children }: any) => <span>{children}</span>;
  const Tabs = ({ activeKey, items = [], onChange }: any) => (
    <div role='tablist'>
      {items.map((item: any) => (
        <button
          key={item.key}
          aria-selected={activeKey === item.key}
          role='tab'
          type='button'
          onClick={() => onChange?.(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
  const Tooltip = ({ children, ...props }: any) =>
    React.isValidElement(children) ? React.cloneElement(children, props) : <>{children}</>;
  const Typography = {
    Text: ({ children }: any) => <span>{children}</span>,
    Title: ({ children }: any) => <h2>{children}</h2>,
  };
  const theme = {
    useToken: () => ({
      token: {
        colorBgContainer: '#fff',
        colorBorder: '#d9d9d9',
        colorBorderSecondary: '#d9d9d9',
        colorError: '#ff4d4f',
        colorFillSecondary: '#fafafa',
        colorPrimary: '#1677ff',
        colorSuccess: '#52c41a',
        colorTextTertiary: '#595959',
        colorWhite: '#fff',
      },
    }),
  };

  return {
    __esModule: true,
    Badge,
    Button,
    Empty,
    List,
    Modal,
    Popover,
    Progress,
    Space,
    Tag,
    Tabs,
    Tooltip,
    Typography,
    message: {
      success: jest.fn(),
      error: jest.fn(),
    },
    theme,
  };
});

const { message } = jest.requireMock('antd') as {
  message: {
    success: jest.Mock;
    error: jest.Mock;
  };
};

describe('LcaTaskCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTasks = [];
    mockPackageTasks = [];
    mockReviewSubmitTasks = [];
    mockDownloadTidasPackageExportTask.mockResolvedValue({ filename: 'downloaded.zip' });
    mockCancelReviewSubmitTask.mockResolvedValue(undefined);
    mockRefreshLcaTasksFromWorkerJobs.mockResolvedValue([]);
    mockRefreshTidasPackageTasksFromWorkerJobs.mockResolvedValue([]);
    mockRefreshReviewSubmitTasks.mockResolvedValue([]);
    mockRetryReviewSubmitTask.mockResolvedValue(undefined);
  });

  it('shows the empty state when there are no tracked tasks', () => {
    render(<LcaTaskCenter />);

    expect(screen.getByTestId('badge-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByRole('button', { name: 'open-lca-task-center' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Task Center')).toBeInTheDocument();
    expect(screen.getByTestId('empty')).toHaveTextContent('No tasks');

    fireEvent.click(screen.getByRole('button', { name: 'Clear finished' }));
    expect(mockClearFinishedLcaTasks).toHaveBeenCalledTimes(1);
    expect(mockClearFinishedTidasPackageTasks).toHaveBeenCalledTimes(1);
    expect(mockClearFinishedReviewSubmitTasks).toHaveBeenCalledTimes(1);
    expect(mockSubscribeLcaTasks).toHaveBeenCalled();
    expect(mockSubscribeTidasPackageTasks).toHaveBeenCalled();
    expect(mockSubscribeReviewSubmitTasks).toHaveBeenCalled();
    expect(mockSubscribeLcaTaskCenterOpenRequests).toHaveBeenCalled();
  });

  it('renders running and completed tasks, task details, and diagnostics', () => {
    mockTasks = [
      {
        id: 'task-running',
        sequence: 1,
        mode: 'single',
        scope: 'team',
        state: 'running',
        phase: 'solving',
        message: 'running message',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:01:00.000Z',
        workerJobId: 'worker-lca-1',
        solveJobId: 'solve-1',
        error: 'Solve failed once',
        phaseTimeline: [
          {
            phase: 'submitting',
            startedAt: '2026-03-12T12:00:00.000Z',
            endedAt: '2026-03-12T12:00:05.000Z',
          },
          {
            phase: 'solving',
            startedAt: '2026-03-12T12:00:05.000Z',
          },
        ],
      },
      {
        id: 'task-completed',
        sequence: 2,
        mode: 'all_unit',
        scope: 'prod',
        state: 'completed',
        phase: 'completed',
        message: 'cache hit for recent result',
        createdAt: '2026-03-12T11:00:00.000Z',
        updatedAt: '2026-03-12T11:00:10.000Z',
        buildJobId: 'build-2',
        solveJobId: 'solve-2',
        snapshotId: 'snapshot-2',
        resultId: 'result-2',
        phaseTimeline: [
          {
            phase: 'submitting',
            startedAt: '2026-03-12T11:00:00.000Z',
            endedAt: '2026-03-12T11:00:01.000Z',
          },
          {
            phase: 'building_snapshot',
            startedAt: '2026-03-12T11:00:01.000Z',
            endedAt: '2026-03-12T11:00:04.000Z',
          },
          {
            phase: 'solving',
            startedAt: '2026-03-12T11:00:04.000Z',
            endedAt: '2026-03-12T11:00:10.000Z',
          },
        ],
      },
    ];

    render(<LcaTaskCenter />);

    expect(screen.getByTestId('badge-count')).toHaveTextContent('1');

    fireEvent.click(screen.getByRole('button', { name: 'open-lca-task-center' }));

    expect(screen.queryByText('#1')).not.toBeInTheDocument();
    expect(screen.queryByText('#2')).not.toBeInTheDocument();
    expect(screen.getAllByText('LCA Calculation').length).toBeGreaterThan(0);
    expect(screen.getByText('Solving')).toBeInTheDocument();
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('65%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
    expect(screen.queryByText('Solving LCA result')).not.toBeInTheDocument();
    expect(screen.queryByText('Cache hit; result is ready')).not.toBeInTheDocument();
    expect(screen.queryByText('solve-1')).not.toBeInTheDocument();
    expect(screen.queryByText('result-2')).not.toBeInTheDocument();
    expect(screen.queryByText('Solve failed once')).not.toBeInTheDocument();

    const viewButtons = screen.getAllByRole('button', { name: 'View' });
    fireEvent.click(viewButtons[0]);
    expect(screen.getByText('Detail information')).toBeInTheDocument();
    expect(screen.getByText('Demand type')).toBeInTheDocument();
    expect(screen.getByText('Single-Process Calculation')).toBeInTheDocument();
    expect(screen.getByText('Data scope')).toBeInTheDocument();
    expect(screen.getByText('team')).toBeInTheDocument();
    expect(screen.queryByText('Solving LCA result')).not.toBeInTheDocument();
    fireEvent.click(viewButtons[1]);
    expect(screen.queryByText('Cache hit; result is ready')).not.toBeInTheDocument();
    expect(screen.queryByText('The calculation result is ready.')).not.toBeInTheDocument();
    expect(screen.getAllByText('Execution stages').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Submit task').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Solve').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Organize result').length).toBeGreaterThan(0);
    expect(screen.getByText('Build snapshot')).toBeInTheDocument();
    expect(screen.getByText('Took 3.00 s')).toBeInTheDocument();

    screen.getAllByRole('button', { name: 'Diagnostics' }).forEach((button) => {
      fireEvent.click(button);
    });
    expect(screen.getAllByText('build_job_id').length).toBeGreaterThan(0);
    expect(screen.getByText('worker_job_id')).toBeInTheDocument();
    expect(screen.getByText('worker-lca-1')).toBeInTheDocument();
    expect(screen.getAllByText('result_id').length).toBeGreaterThan(0);
    expect(screen.queryByText('Solve failed once')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear finished' }));
    expect(mockClearFinishedLcaTasks).toHaveBeenCalledTimes(1);
    expect(mockClearFinishedTidasPackageTasks).toHaveBeenCalledTimes(1);
    expect(mockClearFinishedReviewSubmitTasks).toHaveBeenCalledTimes(1);
  });

  it('renders failed, building, and submitting summaries with their status labels', () => {
    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-03-12T12:10:00.000Z').valueOf());
    mockTasks = [
      {
        id: 'task-build',
        sequence: 3,
        mode: 'single',
        scope: 'team',
        state: 'running',
        phase: 'building_snapshot',
        message: 'build message',
        createdAt: '2026-03-12T12:09:59.500Z',
        updatedAt: '2026-03-12T12:10:00.000Z',
        buildJobId: 'build-3',
        phaseTimeline: [
          {
            phase: 'building_snapshot',
            startedAt: '2026-03-12T12:09:59.500Z',
          },
        ],
      },
      {
        id: 'task-submit',
        sequence: 4,
        mode: 'single',
        scope: 'private',
        state: 'running',
        phase: 'submitting',
        message: 'submit message',
        createdAt: '2026-03-12T12:09:00.000Z',
        updatedAt: '2026-03-12T12:10:00.000Z',
        phaseTimeline: [
          {
            phase: 'submitting',
            startedAt: '2026-03-12T12:09:00.000Z',
          },
        ],
      },
      {
        id: 'task-failed',
        sequence: 5,
        mode: 'all_unit',
        scope: 'prod',
        state: 'failed',
        phase: 'failed',
        message: 'failed message',
        error: 'Server failure',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:01:00.000Z',
        phaseTimeline: [],
      },
    ];

    render(<LcaTaskCenter />);

    expect(screen.getByTestId('badge-count')).toHaveTextContent('2');
    fireEvent.click(screen.getByRole('button', { name: 'open-lca-task-center' }));

    expect(screen.getByText('Building snapshot')).toBeInTheDocument();
    expect(screen.getAllByText('Submitting').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0);
    expect(screen.queryByText('Building calculation snapshot')).not.toBeInTheDocument();
    expect(screen.queryByText('Submitting calculation')).not.toBeInTheDocument();
    expect(screen.queryByText('Calculation failed')).not.toBeInTheDocument();
    expect(screen.queryByText('build-3')).not.toBeInTheDocument();
    expect(screen.queryByText('Server failure')).not.toBeInTheDocument();

    const viewButtons = screen.getAllByRole('button', { name: 'View' });
    fireEvent.click(viewButtons[0]);
    expect(screen.getByText('Demand type')).toBeInTheDocument();
    expect(screen.getByText('Single-Process Calculation')).toBeInTheDocument();
    expect(screen.queryByText('Building calculation snapshot')).not.toBeInTheDocument();

    fireEvent.click(viewButtons[1]);
    expect(screen.queryByText('Submitting calculation')).not.toBeInTheDocument();
    fireEvent.click(viewButtons[2]);
    expect(screen.queryByText('Calculation failed')).not.toBeInTheDocument();
    expect(screen.getByText('Server failure')).toBeInTheDocument();
    nowSpy.mockRestore();
  });

  it('shows completed tasks without result ids and falls back to raw invalid timestamps', () => {
    mockTasks = [
      {
        id: 'task-no-result',
        sequence: 6,
        mode: 'single',
        scope: 'demo',
        state: 'completed',
        phase: 'completed',
        message: 'completed without result',
        createdAt: 'not-a-date',
        updatedAt: 'still-not-a-date',
        phaseTimeline: [],
      },
    ];

    render(<LcaTaskCenter />);
    fireEvent.click(screen.getByRole('button', { name: 'open-lca-task-center' }));

    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    expect(screen.queryByText('Calculation completed')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    expect(screen.queryByText('Calculation completed')).not.toBeInTheDocument();
    expect(screen.getByText('The task completed without a returned result.')).toBeInTheDocument();
    expect(screen.queryByText('0 ms')).not.toBeInTheDocument();
    expect(
      screen.queryByText((_, element) => element?.textContent === 'Created not-a-date'),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByText((_, element) => element?.textContent === 'Updated still-not-a-date')
        .length,
    ).toBeGreaterThan(0);
  });

  it('renders service-backed review-submit tasks with blocker guidance and cancel actions', async () => {
    mockReviewSubmitTasks = [
      {
        id: 'submit-worker-running',
        submitWorkerJobId: 'submit-worker-running',
        gateWorkerJobId: 'gate-worker-running',
        reviewSubmitJobId: 'review-job-running',
        state: 'running',
        phase: 'waiting_gate',
        message: 'waiting',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:01:00.000Z',
        datasetRevision: {
          table: 'processes',
          id: 'process-1',
          version: '01.00.000',
          revisionChecksum: 'a'.repeat(64),
        },
      },
      {
        id: 'submit-worker-blocked',
        submitWorkerJobId: 'submit-worker-blocked',
        rootJobId: 'root-worker-blocked',
        gateWorkerJobId: 'gate-worker-blocked',
        reviewSubmitJobId: 'review-job-blocked',
        state: 'failed',
        phase: 'blocked',
        message: 'blocked',
        createdAt: '2026-03-12T11:00:00.000Z',
        updatedAt: '2026-03-12T11:02:00.000Z',
        datasetRevision: {
          table: 'processes',
          id: 'process-2',
          version: '01.00.000',
          revisionChecksum: 'b'.repeat(64),
        },
        blockingReasons: [
          {
            code: 'flow_lcia_semantic_mismatch',
            message: 'same input/output flow',
            details: { flowId: 'flow-1' },
          },
        ],
      },
    ];

    render(<LcaTaskCenter />);

    expect(screen.getByTestId('badge-count')).toHaveTextContent('2');
    fireEvent.click(screen.getByRole('button', { name: 'open-lca-task-center' }));

    expect(screen.getAllByText('Review Submit').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Waiting for gate').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Blocked').length).toBeGreaterThan(0);
    expect(screen.queryByText('Flow and LCIA semantics are inconsistent')).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'Check flow types, biosphere exchanges, and LCIA factor mappings, then correct the mismatched data before retrying.',
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('same input/output flow')).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        (_, element) => element?.textContent?.includes('flow_lcia_semantic_mismatch') ?? false,
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText((_, element) => element?.textContent?.includes('"flowId"') ?? false),
    ).not.toBeInTheDocument();

    const viewButtons = screen.getAllByRole('button', { name: 'View' });
    fireEvent.click(viewButtons[1]);
    expect(screen.getByText('Dataset')).toBeInTheDocument();
    expect(screen.getByText('processes')).toBeInTheDocument();
    expect(screen.getByText('Version')).toBeInTheDocument();
    expect(screen.getAllByText('01.00.000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Flow and LCIA semantics are inconsistent').length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getAllByText(
        'Check flow types, biosphere exchanges, and LCIA factor mappings, then correct the mismatched data before retrying.',
      ).length,
    ).toBeGreaterThan(0);

    const diagnosticsButtons = screen.getAllByRole('button', { name: 'Diagnostics' });
    fireEvent.click(diagnosticsButtons[1]);
    expect(screen.getByText('Submit worker job ID')).toBeInTheDocument();
    expect(screen.getAllByText('submit-worker-blocked').length).toBeGreaterThan(0);
    expect(screen.getByText('Root job ID')).toBeInTheDocument();
    expect(screen.getAllByText('root-worker-blocked').length).toBeGreaterThan(0);
    expect(screen.getByText('same input/output flow')).toBeInTheDocument();
    expect(screen.getAllByText('flow_lcia_semantic_mismatch').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText((_, element) => element?.textContent?.includes('"flowId"') ?? false)
        .length,
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(mockRefreshLcaTasksFromWorkerJobs).toHaveBeenCalled());
    await waitFor(() => expect(mockRefreshTidasPackageTasksFromWorkerJobs).toHaveBeenCalled());
    await waitFor(() => expect(mockRefreshReviewSubmitTasks).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() =>
      expect(mockRetryReviewSubmitTask).toHaveBeenCalledWith('submit-worker-blocked'),
    );
    await waitFor(() =>
      expect(message.success).toHaveBeenCalledWith('Review-submit task restarted'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(mockCancelReviewSubmitTask).toHaveBeenCalledWith('submit-worker-running'),
    );
    await waitFor(() =>
      expect(message.success).toHaveBeenCalledWith('Review-submit task cancelled'),
    );
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('refreshes worker-backed task families on mount, timer, open request, and manual refresh failures', async () => {
    jest.useFakeTimers();
    let openRequestListener: (() => void) | undefined;
    mockSubscribeLcaTaskCenterOpenRequests.mockImplementation((listener: () => void) => {
      openRequestListener = listener;
      return jest.fn();
    });
    mockRefreshReviewSubmitTasks.mockRejectedValue({});

    render(<LcaTaskCenter />);

    await waitFor(() => expect(mockRefreshReviewSubmitTasks).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockRefreshLcaTasksFromWorkerJobs).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mockRefreshTidasPackageTasksFromWorkerJobs).toHaveBeenCalledTimes(1),
    );

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    await waitFor(() => expect(mockRefreshReviewSubmitTasks).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockRefreshLcaTasksFromWorkerJobs).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(mockRefreshTidasPackageTasksFromWorkerJobs).toHaveBeenCalledTimes(2),
    );

    act(() => {
      openRequestListener?.();
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await waitFor(() => expect(mockRefreshReviewSubmitTasks).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(mockRefreshLcaTasksFromWorkerJobs).toHaveBeenCalledTimes(3));
    await waitFor(() =>
      expect(mockRefreshTidasPackageTasksFromWorkerJobs).toHaveBeenCalledTimes(3),
    );

    fireEvent.click(screen.getByRole('button', { name: 'open-lca-task-center' }));
    await waitFor(() => expect(mockRefreshReviewSubmitTasks).toHaveBeenCalledTimes(4));
    await waitFor(() => expect(mockRefreshLcaTasksFromWorkerJobs).toHaveBeenCalledTimes(4));
    await waitFor(() =>
      expect(mockRefreshTidasPackageTasksFromWorkerJobs).toHaveBeenCalledTimes(4),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() =>
      expect(message.error).toHaveBeenCalledWith('Failed to refresh review-submit tasks'),
    );

    mockRefreshReviewSubmitTasks.mockRejectedValueOnce(new Error('refresh failed'));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(message.error).toHaveBeenCalledWith('refresh failed'));

    jest.useRealTimers();
  });

  it('renders all review-submit phases and sparse blocker diagnostics', () => {
    const circularDetails: any = { flowId: 'flow-circular' };
    circularDetails.self = circularDetails;
    const longDetails = { note: 'x'.repeat(400) };
    mockReviewSubmitTasks = [
      {
        id: 'review-queued',
        state: 'running',
        phase: 'queued',
        message: 'queued',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:01.000Z',
      },
      {
        id: 'review-running',
        state: 'running',
        phase: 'running',
        message: 'running',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:02.000Z',
      },
      {
        id: 'review-submitting',
        state: 'running',
        phase: 'submitting',
        message: 'submitting',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:03.000Z',
      },
      {
        id: 'review-submitted',
        state: 'completed',
        phase: 'submitted',
        message: 'submitted',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:04.000Z',
        gateRunId: 'gate-run-submitted',
        datasetRevision: {
          id: 'process-no-version',
          revisionChecksum: 'checksum-submitted',
        },
      },
      {
        id: 'review-passed',
        state: 'completed',
        phase: 'passed',
        message: 'passed',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:05.000Z',
      },
      {
        id: 'review-stale',
        state: 'failed',
        phase: 'stale',
        message: 'stale',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:06.000Z',
        blockerCodes: ['revision_report_stale'],
      },
      {
        id: 'review-cancelled',
        state: 'failed',
        phase: 'cancelled',
        message: 'cancelled',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:07.000Z',
        blockingReasons: [
          {
            code: '  ',
            message: '  ',
            details: null,
          },
        ],
      },
      {
        id: 'review-error',
        state: 'failed',
        phase: 'error',
        message: 'error',
        error: 'worker failed',
        workerJob: {
          status: 'failed',
          errorCode: 'worker_error_code',
          errorMessage: 'worker backend message',
        },
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:08.000Z',
        blockingReasons: [
          {
            code: 'custom_blocker',
            message: 'custom blocker message',
            details: circularDetails,
          },
          {
            message: 'missing code reason',
            details: longDetails,
          },
        ],
      },
    ];

    render(<LcaTaskCenter />);
    fireEvent.click(screen.getByRole('button', { name: 'open-lca-task-center' }));

    expect(screen.getAllByText('Queued').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Gate running').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Submitting review').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Submitted').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Gate passed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Stale').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cancelled').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Error').length).toBeGreaterThan(0);
    expect(screen.queryByText('Review submission completed')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Numerical stability gate passed; final submission is being coordinated'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Gate passed; submitting review')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Gate result is stale; save the latest data and submit again'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Review submission task was cancelled')).not.toBeInTheDocument();
    expect(screen.queryByText('Review submission task failed')).not.toBeInTheDocument();
    expect(screen.queryByText('Review submission did not complete')).not.toBeInTheDocument();

    const reviewViewButtons = screen.getAllByRole('button', { name: 'View' });
    reviewViewButtons.forEach((button) => {
      fireEvent.click(button);
    });
    expect(
      screen.queryByText('Numerical stability gate passed; final submission is being coordinated'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Review submission completed')).not.toBeInTheDocument();
    expect(screen.queryByText('Gate passed; submitting review')).not.toBeInTheDocument();
    expect(screen.getByText('Gate result is stale')).toBeInTheDocument();
    expect(
      screen.getByText('Save the current data and submit for review again.'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Execution stages').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Run gate').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Submit review').length).toBeGreaterThan(0);
    expect(screen.queryByText('Review submission task was cancelled')).not.toBeInTheDocument();
    expect(screen.queryByText('Review submission task failed')).not.toBeInTheDocument();
    expect(screen.getAllByText('Review submission did not complete')).toHaveLength(2);
    expect(screen.queryByText('worker failed')).not.toBeInTheDocument();
    expect(screen.queryByText('custom_blocker')).not.toBeInTheDocument();
    expect(screen.queryByText('custom blocker message')).not.toBeInTheDocument();
    expect(screen.queryByText('missing code reason')).not.toBeInTheDocument();

    expect(
      screen.getAllByText('Save the data and retry. If it still fails, contact an administrator.')
        .length,
    ).toBeGreaterThan(0);

    const reviewDiagnosticsButtons = screen.getAllByRole('button', { name: 'Diagnostics' });
    fireEvent.click(reviewDiagnosticsButtons[0]);
    expect(screen.getAllByText('worker failed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('worker_error_code').length).toBeGreaterThan(0);
    expect(screen.getAllByText('worker backend message').length).toBeGreaterThan(0);
    expect(screen.getAllByText('custom_blocker').length).toBeGreaterThan(0);
    expect(screen.getAllByText('custom blocker message').length).toBeGreaterThan(0);
    expect(screen.getAllByText('missing code reason').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText((_, element) => element?.textContent?.includes('"note"') ?? false).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('[object Object]').length).toBeGreaterThan(0);

    fireEvent.click(reviewDiagnosticsButtons[4]);
    expect(screen.getByText('Gate run ID')).toBeInTheDocument();
    expect(screen.getByText('gate-run-submitted')).toBeInTheDocument();
    expect(screen.getByText('Revision checksum')).toBeInTheDocument();
    expect(screen.getByText('checksum-submitted')).toBeInTheDocument();
    expect(
      screen.queryByText(
        (_, element) => element?.textContent?.includes('process-no-version') ?? false,
      ),
    ).not.toBeInTheDocument();
  });

  it('renders friendly task-center guidance for every stable review-submit blocker code', () => {
    mockReviewSubmitTasks = [
      {
        id: 'review-all-stable-blockers',
        state: 'failed',
        phase: 'blocked',
        message: 'blocked',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:01:00.000Z',
        datasetRevision: {
          table: 'processes',
          id: 'process-all-blockers',
          version: '01.00.000',
        },
        blockingReasons: REVIEW_SUBMIT_GATE_BLOCKER_CODES.map((code) => ({
          code,
          message: `worker message for ${code}`,
          details: { code },
        })),
      },
    ];

    render(<LcaTaskCenter />);
    fireEvent.click(screen.getByRole('button', { name: 'open-lca-task-center' }));
    fireEvent.click(screen.getByRole('button', { name: 'View' }));

    expect(screen.getByTestId('review-submit-blocker-summary')).toHaveStyle({
      width: '100%',
    });
    expect(screen.queryByText('Review submission did not complete')).not.toBeInTheDocument();
    for (const code of REVIEW_SUBMIT_GATE_BLOCKER_CODES) {
      const guidance = REVIEW_SUBMIT_GATE_REASON_GUIDANCE[code];
      expect(screen.getByText(guidance.defaultTitle)).toBeInTheDocument();
      expect(screen.getByText(guidance.defaultAction)).toBeInTheDocument();
    }
  });

  it('reports review-submit refresh, cancel, and retry errors with fallback and explicit messages', async () => {
    mockReviewSubmitTasks = [
      {
        id: 'review-running',
        state: 'running',
        phase: 'running',
        message: 'running',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:01.000Z',
      },
      {
        id: 'review-failed',
        state: 'failed',
        phase: 'error',
        message: 'failed',
        error: 'transient worker failure',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:02.000Z',
      },
    ];
    mockCancelReviewSubmitTask
      .mockRejectedValueOnce({})
      .mockRejectedValueOnce(new Error('cancel failed'));
    mockRetryReviewSubmitTask
      .mockRejectedValueOnce({})
      .mockRejectedValueOnce(new Error('retry failed'));

    render(<LcaTaskCenter />);
    fireEvent.click(screen.getByRole('button', { name: 'open-lca-task-center' }));

    expect(screen.getAllByText('Error').length).toBeGreaterThan(0);
    expect(screen.queryByText('Review submission task failed')).not.toBeInTheDocument();
    expect(screen.queryByText('Review submission did not complete')).not.toBeInTheDocument();
    expect(screen.queryByText('transient worker failure')).not.toBeInTheDocument();

    const viewButtons = screen.getAllByRole('button', { name: 'View' });
    fireEvent.click(viewButtons[0]);
    expect(screen.queryByText('Review submission task failed')).not.toBeInTheDocument();
    expect(screen.getByText('Review submission did not complete')).toBeInTheDocument();
    expect(
      screen.getByText('The current data could not complete the pre-review check.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(message.error).toHaveBeenCalledWith('Failed to cancel review-submit task'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(message.error).toHaveBeenCalledWith('cancel failed'));

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() =>
      expect(message.error).toHaveBeenCalledWith('Failed to retry review-submit task'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(message.error).toHaveBeenCalledWith('retry failed'));
  });

  it('covers modal close and task-summary fallbacks for sparse or inconsistent task metadata', () => {
    mockTasks = [
      {
        id: 'task-running-completed',
        sequence: 7,
        mode: 'single',
        scope: 'team',
        state: 'running',
        phase: 'completed',
        message: 'running with completed phase',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:01.000Z',
        phaseTimeline: [],
      },
      {
        id: 'task-build-no-id',
        sequence: 8,
        mode: 'single',
        scope: 'team',
        state: 'running',
        phase: 'building_snapshot',
        message: 'build without id',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:01.000Z',
        phaseTimeline: [{ phase: 'building_snapshot', startedAt: '2026-03-12T12:00:00.000Z' }],
      },
      {
        id: 'task-running-failed-phase',
        sequence: 8.5,
        mode: 'single',
        scope: 'team',
        state: 'running',
        phase: 'failed',
        message: 'failed phase while still running',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:01.000Z',
        phaseTimeline: [],
      },
      {
        id: 'task-solve-no-id',
        sequence: 9,
        mode: 'single',
        scope: 'team',
        state: 'running',
        phase: 'solving',
        message: 'solve without id',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:01.000Z',
        phaseTimeline: [{ phase: 'solving', startedAt: '2026-03-12T12:00:00.000Z' }],
      },
      {
        id: 'task-completed-result',
        sequence: 10,
        mode: 'single',
        scope: 'team',
        state: 'completed',
        phase: 'completed',
        message: 'completed normally',
        resultId: 'result-10',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: 'invalid-updated-at',
        phaseTimeline: [{ phase: 'solving', startedAt: 'invalid-start' }],
      },
    ];

    render(<LcaTaskCenter />);
    fireEvent.click(screen.getByRole('button', { name: 'open-lca-task-center' }));

    expect(screen.getByText('Building snapshot')).toBeInTheDocument();
    expect(screen.getByText('Solving')).toBeInTheDocument();
    expect(screen.queryByText('Building calculation snapshot')).not.toBeInTheDocument();
    expect(screen.queryByText('Solving LCA result')).not.toBeInTheDocument();
    expect(screen.queryByText('Calculation completed; result is ready')).not.toBeInTheDocument();
    screen.getAllByRole('button', { name: 'View' }).forEach((button) => {
      fireEvent.click(button);
    });
    expect(screen.queryByText('Building calculation snapshot')).not.toBeInTheDocument();
    expect(screen.queryByText('Solving LCA result')).not.toBeInTheDocument();
    expect(screen.queryByText('Calculation completed; result is ready')).not.toBeInTheDocument();
    expect(screen.getAllByText('Detail information').length).toBeGreaterThan(0);
    expect(screen.queryByText('result-10')).not.toBeInTheDocument();
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('filters task tabs, collapses inline details, and handles sparse diagnostics and progress', () => {
    mockTasks = [
      {
        id: '',
        mode: 'single',
        scope: 'prod',
        state: 'completed',
        phase: 'completed',
        workerJobId: '   ',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:05:00.000Z',
        phaseTimeline: [],
      },
      {
        id: 'lca-building-filter',
        mode: 'all_unit',
        scope: 'prod',
        state: 'running',
        phase: 'building_snapshot',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:04:00.000Z',
        phaseTimeline: [
          {
            phase: 'building_snapshot',
            startedAt: '2026-03-12T12:01:00.000Z',
            endedAt: '2026-03-12T12:02:00.000Z',
          },
          {
            phase: 'building_snapshot',
            startedAt: '2026-03-12T12:00:30.000Z',
            endedAt: '2026-03-12T12:03:00.000Z',
          },
        ],
      },
    ];
    mockPackageTasks = [
      {
        id: 'pkg-export-combined-scope',
        kind: 'tidas_package_export',
        state: 'completed',
        phase: 'completed',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:03:00.000Z',
        scope: 'current_user_and_open_data',
        rootCount: 0,
      },
      {
        id: 'pkg-import-filter',
        kind: 'tidas_package_import',
        state: 'running',
        phase: 'queued',
        filename: 'package.zip',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:02:00.000Z',
        rootCount: 0,
      },
    ];
    mockReviewSubmitTasks = [
      {
        id: 'review-progress-string',
        state: 'running',
        phase: 'running',
        progress: '67.4',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:01:00.000Z',
        datasetRevision: {
          table: 'processes',
          id: 'process-progress-string',
          version: '01.00.000',
        },
      },
      {
        id: 'review-progress-infinity',
        state: 'running',
        phase: 'waiting_gate',
        progress: Number.POSITIVE_INFINITY,
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:30.000Z',
        datasetRevision: {
          table: 'processes',
          id: 'process-progress-infinity',
          version: '01.00.000',
        },
      },
      {
        id: 'review-progress-invalid',
        state: 'running',
        phase: 'submitting',
        progress: 'not-a-number',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:10.000Z',
        datasetRevision: {
          table: 'processes',
          id: 'process-progress-invalid',
          version: '01.00.000',
        },
      },
      {
        id: 'review-empty-blocker',
        state: 'failed',
        phase: 'blocked',
        blockingReasons: [{ code: ' ', message: ' ' }],
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:05.000Z',
        datasetRevision: {
          table: 'processes',
          id: 'process-empty-blocker',
          version: '01.00.000',
        },
      },
    ];

    render(<LcaTaskCenter />);
    fireEvent.click(screen.getByRole('button', { name: 'open-lca-task-center' }));

    expect(screen.getAllByRole('progressbar').map((bar) => bar.textContent)).toEqual(
      expect.arrayContaining(['67%', '0%']),
    );

    fireEvent.click(screen.getByRole('tab', { name: 'LCA Calculation' }));
    expect(screen.queryByText('Import TIDAS package')).not.toBeInTheDocument();

    const lcaViewButton = screen.getAllByRole('button', { name: 'View' })[0];
    fireEvent.click(lcaViewButton);
    expect(screen.getByText('Detail information')).toBeInTheDocument();
    fireEvent.click(lcaViewButton);
    expect(screen.queryByText('Detail information')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Diagnostics' })[0]);
    expect(screen.getByText('No diagnostics')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'View' })[1]);
    expect(screen.getByText('Build snapshot')).toBeInTheDocument();

    act(() => {
      mockTasks = [];
      mockSubscribeLcaTasks.mock.calls[0][0]();
    });
    expect(screen.queryByText('Build snapshot')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'TIDAS Export' }));
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    expect(screen.getByText('Current user data + open data')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'TIDAS Import' }));
    expect(screen.getByText('Import package: package.zip')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Review Submit' }));
    expect(screen.getAllByText('Review Submit').length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: 'Diagnostics' })[3]);
    expect(screen.getByText('No detailed message returned.')).toBeInTheDocument();
  });

  it('renders package tasks, supports download actions, and handles download errors', async () => {
    mockTasks = [
      {
        id: 'lca-task-running',
        sequence: 1,
        mode: 'single',
        scope: 'team',
        state: 'running',
        phase: 'submitting',
        message: 'lca running',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:01.000Z',
        phaseTimeline: [],
      },
    ];
    mockPackageTasks = [
      {
        id: 'pkg-completed',
        sequence: 2,
        kind: 'tidas_package_export',
        state: 'completed',
        phase: 'completed',
        message: 'finished',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:04.000Z',
        workerJobId: 'worker-package-1',
        filename: 'custom.zip',
        jobId: 'job-1',
        scope: 'current_user',
        rootCount: 1,
        request: {
          roots: [{ table: 'processes', id: 'p-1', version: '01.00.000' }],
        },
      },
      {
        id: 'pkg-completed-default-name',
        sequence: 2.1,
        kind: 'tidas_package_export',
        state: 'completed',
        phase: 'completed',
        message: 'finished without filename',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:04.500Z',
        scope: 'open_data',
        rootCount: 0,
      },
      {
        id: 'pkg-running-queued',
        sequence: 3,
        kind: 'tidas_package_export',
        state: 'running',
        phase: 'queued',
        message: 'queueing',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:03.000Z',
        rootCount: 2,
        request: {
          roots: [
            { table: 'flows', id: 'f-1', version: '01.00.000' },
            { table: 'flows', id: 'f-2', version: '01.00.000' },
          ],
        },
      },
      {
        id: 'pkg-running-collect',
        sequence: 4,
        kind: 'tidas_package_export',
        state: 'running',
        phase: 'collect_refs',
        message: 'collecting refs',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:02.000Z',
        rootCount: 0,
      },
      {
        id: 'pkg-running-submit',
        sequence: 4.5,
        kind: 'tidas_package_export',
        state: 'running',
        phase: 'submitting',
        message: 'submitting package',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:02.500Z',
        rootCount: 0,
      },
      {
        id: 'pkg-running-finalize',
        sequence: 5,
        kind: 'tidas_package_export',
        state: 'running',
        phase: 'finalize_zip',
        message: 'finalizing',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:01.000Z',
        rootCount: 0,
      },
      {
        id: 'pkg-running-completed-phase',
        sequence: 5.5,
        kind: 'tidas_package_export',
        state: 'running',
        phase: 'completed',
        message: 'completed phase while running',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:05.500Z',
        rootCount: 0,
      },
      {
        id: 'pkg-running-failed-phase',
        sequence: 5.6,
        kind: 'tidas_package_export',
        state: 'running',
        phase: 'failed',
        message: 'failed phase while running',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:05.600Z',
        rootCount: 0,
      },
      {
        id: 'pkg-import-running',
        sequence: 5.7,
        kind: 'tidas_package_import',
        state: 'running',
        phase: 'import_package',
        message: 'importing package data',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:05.700Z',
        workerJobId: 'worker-package-import-running',
        jobId: 'import-job-1',
        rootCount: 0,
      },
      {
        id: 'pkg-import-completed',
        sequence: 5.8,
        kind: 'tidas_package_import',
        state: 'completed',
        phase: 'completed',
        message: 'import completed',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:05.800Z',
        workerJobId: 'worker-package-import-completed',
        jobId: 'import-job-2',
        rootCount: 0,
      },
      {
        id: 'pkg-import-failed',
        sequence: 5.9,
        kind: 'tidas_package_import',
        state: 'failed',
        phase: 'failed',
        message: 'import failed',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:05.900Z',
        workerJobId: 'worker-package-import-failed',
        jobId: 'import-job-3',
        error: 'import validation failed',
        rootCount: 0,
      },
      {
        id: 'pkg-failed',
        sequence: 6,
        kind: 'tidas_package_export',
        state: 'failed',
        phase: 'failed',
        message: 'backend failed',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:05.000Z',
        error: 'package failed',
        rootCount: 0,
      },
      {
        id: 'pkg-failed-too-large',
        sequence: 6.1,
        kind: 'tidas_package_export',
        state: 'failed',
        phase: 'failed',
        message: 'backend failed',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:05.100Z',
        error:
          'object upload failed status=413 Payload Too Large body=<?xml version="1.0"?><Error><Code>EntityTooLarge</Code><Message>The object exceeded the maximum allowed size</Message></Error>',
        rootCount: 0,
      },
    ];
    mockDownloadTidasPackageExportTask
      .mockResolvedValueOnce({ filename: 'downloaded.zip' })
      .mockRejectedValueOnce({})
      .mockRejectedValueOnce(new Error('download broken'));

    render(<LcaTaskCenter />);
    fireEvent.click(screen.getByRole('button', { name: 'open-lca-task-center' }));

    expect(screen.getByTestId('badge-count')).toHaveTextContent('8');
    expect(screen.getAllByText('TIDAS Export').length).toBeGreaterThan(0);
    expect(screen.getAllByText('TIDAS Import').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Queued').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Submitting').length).toBeGreaterThan(0);
    expect(screen.getByText('Collecting related data')).toBeInTheDocument();
    expect(screen.getByText('Importing data')).toBeInTheDocument();
    expect(screen.getByText('Building ZIP')).toBeInTheDocument();
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0);
    expect(screen.queryByText('Export package failed')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Export package exceeded the storage upload limit'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Export package ready (custom.zip)')).not.toBeInTheDocument();
    expect(screen.queryByText('Export package ready (tidas-package.zip)')).not.toBeInTheDocument();
    expect(screen.queryByText('Import package completed')).not.toBeInTheDocument();
    expect(screen.queryByText('Import package failed')).not.toBeInTheDocument();
    expect(screen.queryByText('queueing')).not.toBeInTheDocument();
    expect(screen.queryByText('importing package data')).not.toBeInTheDocument();
    expect(screen.queryByText('import validation failed')).not.toBeInTheDocument();
    expect(screen.queryByText('package failed')).not.toBeInTheDocument();

    screen.getAllByRole('button', { name: 'View' }).forEach((button) => {
      fireEvent.click(button);
    });
    expect(screen.queryByText('Export package failed')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Export package exceeded the storage upload limit'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Export package ready (custom.zip)')).not.toBeInTheDocument();
    expect(screen.queryByText('Export package ready (tidas-package.zip)')).not.toBeInTheDocument();
    expect(screen.queryByText('Import package completed')).not.toBeInTheDocument();
    expect(screen.queryByText('Import package failed')).not.toBeInTheDocument();
    expect(screen.queryByText('queueing')).not.toBeInTheDocument();
    expect(screen.queryByText('importing package data')).not.toBeInTheDocument();
    expect(screen.getAllByText('File name').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Root records').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Execution stages').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Prepare upload').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Validate package').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Import data').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Build report').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Collect related data').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Build ZIP').length).toBeGreaterThan(0);
    expect(screen.getByText('import validation failed')).toBeInTheDocument();
    expect(screen.getByText('package failed')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Export package is too large for the current storage upload limit. Try exporting a smaller scope, or ask an administrator to enable large-file upload support.',
      ),
    ).toBeInTheDocument();

    const diagnosticsButtons = screen.getAllByRole('button', { name: 'Diagnostics' });
    diagnosticsButtons.forEach((button) => {
      fireEvent.click(button);
    });
    expect(
      screen.queryByText((_, element) => element?.textContent?.includes('root_count') ?? false),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('filename')).not.toBeInTheDocument();
    expect(screen.getAllByText('job_id').length).toBeGreaterThan(0);
    expect(screen.getByText('job-1')).toBeInTheDocument();
    expect(screen.getAllByText('worker_job_id').length).toBeGreaterThan(0);
    expect(screen.getByText('worker-package-1')).toBeInTheDocument();
    expect(
      screen.getAllByText((_, element) => element?.textContent?.includes('"id": "p-1"') ?? false)
        .length,
    ).toBeGreaterThan(0);

    const downloadButtons = screen.getAllByRole('button', { name: 'Download' });
    expect(downloadButtons).toHaveLength(2);
    fireEvent.click(downloadButtons[0]);
    await waitFor(() => {
      expect(mockDownloadTidasPackageExportTask).toHaveBeenNthCalledWith(
        1,
        'pkg-completed-default-name',
      );
    });
    await waitFor(() => {
      expect(message.success).toHaveBeenCalledWith('Downloaded downloaded.zip');
    });

    fireEvent.click(downloadButtons[1]);
    await waitFor(() => {
      expect(mockDownloadTidasPackageExportTask).toHaveBeenNthCalledWith(2, 'pkg-completed');
    });
    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Failed to download TIDAS package');
    });

    fireEvent.click(downloadButtons[0]);
    await waitFor(() => {
      expect(mockDownloadTidasPackageExportTask).toHaveBeenNthCalledWith(
        3,
        'pkg-completed-default-name',
      );
    });
    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('download broken');
    });
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });
});
