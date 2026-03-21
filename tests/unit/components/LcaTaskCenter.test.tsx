// @ts-nocheck
import LcaTaskCenter from '@/components/LcaTaskCenter';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

let mockTasks: any[] = [];
let mockPackageTasks: any[] = [];
const mockClearFinishedLcaTasks = jest.fn();
const mockClearFinishedTidasPackageTasks = jest.fn();
const mockDownloadTidasPackageExportTask = jest.fn();
const mockRemoveLcaTask = jest.fn();
const mockRemoveTidasPackageTask = jest.fn();
const mockSubscribeLcaTasks = jest.fn(() => jest.fn());
const mockSubscribeTidasPackageTasks = jest.fn(() => jest.fn());

const formatWithValues = (message: string, values?: Record<string, any>) =>
  Object.entries(values ?? {}).reduce((text, [key, value]) => {
    return text.replace(`{${key}}`, String(value));
  }, message);

jest.mock('@/services/lca/taskCenter', () => ({
  __esModule: true,
  clearFinishedLcaTasks: () => mockClearFinishedLcaTasks(),
  listLcaTasks: () => mockTasks,
  removeLcaTask: (...args: any[]) => mockRemoveLcaTask(...args),
  subscribeLcaTasks: (...args: any[]) => mockSubscribeLcaTasks(...args),
}));

jest.mock('@/services/tidasPackage/taskCenter', () => ({
  __esModule: true,
  clearFinishedTidasPackageTasks: () => mockClearFinishedTidasPackageTasks(),
  downloadTidasPackageExportTask: (...args: any[]) => mockDownloadTidasPackageExportTask(...args),
  listTidasPackageTasks: () => mockPackageTasks,
  removeTidasPackageTask: (...args: any[]) => mockRemoveTidasPackageTask(...args),
  subscribeTidasPackageTasks: (...args: any[]) => mockSubscribeTidasPackageTasks(...args),
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
  InfoCircleOutlined: () => <span>info-icon</span>,
}));

jest.mock('antd', () => {
  const React = require('react');

  const Badge = ({ count, children }: any) => (
    <div>
      <span data-testid='badge-count'>{count}</span>
      {children}
    </div>
  );

  const Button = ({ children, onClick, disabled, icon }: any) => (
    <button
      type='button'
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

  const Popover = ({ children, content }: any) => (
    <div>
      {children}
      <div>{content}</div>
    </div>
  );

  const Space = ({ children }: any) => <div>{children}</div>;
  const Tag = ({ children }: any) => <span>{children}</span>;
  const Tooltip = ({ children }: any) => <>{children}</>;
  const Typography = {
    Text: ({ children }: any) => <span>{children}</span>,
  };
  const theme = {
    useToken: () => ({
      token: {
        colorFillSecondary: '#fafafa',
        colorTextTertiary: '#595959',
        colorPrimary: '#1677ff',
        colorSuccess: '#52c41a',
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
    Space,
    Tag,
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
    mockDownloadTidasPackageExportTask.mockResolvedValue({ filename: 'downloaded.zip' });
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
    expect(mockSubscribeLcaTasks).toHaveBeenCalled();
    expect(mockSubscribeTidasPackageTasks).toHaveBeenCalled();
  });

  it('renders running and completed tasks, task details, and remove actions', () => {
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

    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('Solving (solve-1)')).toBeInTheDocument();
    expect(screen.getByText('Cache hit (result result-2)')).toBeInTheDocument();
    expect(screen.getByText('Solve failed once')).toBeInTheDocument();
    expect(
      screen.getAllByText((_, element) => element?.textContent?.includes('build_job_id') ?? false)
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText((_, element) => element?.textContent?.includes('result_id') ?? false)
        .length,
    ).toBeGreaterThan(0);

    const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
    fireEvent.click(removeButtons[0]);
    fireEvent.click(removeButtons[1]);

    expect(mockRemoveLcaTask).toHaveBeenNthCalledWith(1, 'task-running');
    expect(mockRemoveLcaTask).toHaveBeenNthCalledWith(2, 'task-completed');

    fireEvent.click(screen.getByRole('button', { name: 'Clear finished' }));
    expect(mockClearFinishedLcaTasks).toHaveBeenCalledTimes(1);
    expect(mockClearFinishedTidasPackageTasks).toHaveBeenCalledTimes(1);
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

    expect(screen.getByText('Building snapshot (build-3)')).toBeInTheDocument();
    expect(screen.getByText('Submitting task')).toBeInTheDocument();
    expect(screen.getByText('Task failed')).toBeInTheDocument();
    expect(screen.getByText('Building snapshot')).toBeInTheDocument();
    expect(screen.getAllByText('Submitting').length).toBeGreaterThan(0);
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Elapsed 500 ms'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText((_, element) => element?.textContent === 'Elapsed 1m 0s').length,
    ).toBeGreaterThan(0);
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
    expect(screen.getByText('Stage duration')).toBeInTheDocument();
    expect(screen.getByText('Total 0 ms')).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'created_at: not-a-date'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'updated_at: still-not-a-date'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Elapsed 0 ms'),
    ).toBeInTheDocument();
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

    expect(screen.getByText('Building snapshot (-)')).toBeInTheDocument();
    expect(screen.getByText('Solving (-)')).toBeInTheDocument();
    expect(screen.getByText('Completed (result result-10)')).toBeInTheDocument();
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText((_, element) => element?.textContent === 'Elapsed 0 ms').length,
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders package tasks, supports download/remove actions, and handles download errors', async () => {
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
    ];
    mockDownloadTidasPackageExportTask
      .mockResolvedValueOnce({ filename: 'downloaded.zip' })
      .mockRejectedValueOnce({})
      .mockRejectedValueOnce(new Error('download broken'));

    render(<LcaTaskCenter />);
    fireEvent.click(screen.getByRole('button', { name: 'open-lca-task-center' }));

    expect(screen.getByTestId('badge-count')).toHaveTextContent('7');
    expect(screen.getAllByText('TIDAS Export').length).toBeGreaterThan(0);
    expect(screen.getByText('Queued')).toBeInTheDocument();
    expect(screen.getAllByText('Submitting').length).toBeGreaterThan(0);
    expect(screen.getByText('Collecting related data')).toBeInTheDocument();
    expect(screen.getByText('Building ZIP')).toBeInTheDocument();
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0);
    expect(screen.getByText('Export package failed')).toBeInTheDocument();
    expect(screen.getByText('Export package ready (custom.zip)')).toBeInTheDocument();
    expect(screen.getByText('Export package ready (tidas-package.zip)')).toBeInTheDocument();
    expect(screen.getByText('queueing')).toBeInTheDocument();
    expect(screen.getByText('package failed')).toBeInTheDocument();

    const detailsButtons = screen.getAllByRole('button', { name: 'Details' });
    fireEvent.click(detailsButtons[0]);
    expect(
      screen.getAllByText((_, element) => element?.textContent?.includes('root_count') ?? false)
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText((_, element) => element?.textContent?.includes('root:') ?? false).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText((_, element) => element?.textContent === 'root: p-1 @ 01.00.000'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText((_, element) => element?.textContent?.includes('root: f-1') ?? false),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'filename: custom.zip'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'job_id: job-1'),
    ).toBeInTheDocument();

    const downloadButtons = screen.getAllByRole('button', { name: 'Download' });
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

    const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
    removeButtons.forEach((button) => {
      fireEvent.click(button);
    });
    expect(mockRemoveTidasPackageTask).toHaveBeenCalledWith('pkg-failed');
    expect(mockRemoveTidasPackageTask).toHaveBeenCalledWith('pkg-completed');
    expect(mockRemoveTidasPackageTask).toHaveBeenCalledWith('pkg-running-queued');
  });
});
