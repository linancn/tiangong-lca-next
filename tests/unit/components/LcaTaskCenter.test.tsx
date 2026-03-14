// @ts-nocheck
import LcaTaskCenter from '@/components/LcaTaskCenter';
import { fireEvent, render, screen } from '@testing-library/react';

let mockTasks: any[] = [];
const mockClearFinishedLcaTasks = jest.fn();
const mockRemoveLcaTask = jest.fn();
const mockSubscribeLcaTasks = jest.fn(() => jest.fn());

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

  const Modal = ({ open, title, children }: any) =>
    open ? (
      <div role='dialog'>
        <h1>{title}</h1>
        {children}
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
  };
});

describe('LcaTaskCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTasks = [];
  });

  it('shows the empty state when there are no tracked tasks', () => {
    render(<LcaTaskCenter />);

    expect(screen.getByTestId('badge-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByRole('button', { name: 'open-lca-task-center' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('LCA Tasks')).toBeInTheDocument();
    expect(screen.getByTestId('empty')).toHaveTextContent('No tasks');

    fireEvent.click(screen.getByRole('button', { name: 'Clear finished' }));
    expect(mockClearFinishedLcaTasks).toHaveBeenCalledTimes(1);
    expect(mockSubscribeLcaTasks).toHaveBeenCalled();
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
  });
});
