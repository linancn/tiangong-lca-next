// @ts-nocheck
import ReviewDetail from '@/pages/Processes/Components/ReviewDetail';
import { act, fireEvent, render, screen } from '@testing-library/react';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

const mockGetReviewsByProcess = jest.fn();
let mockScreens: Record<string, boolean> = { sm: true };

jest.mock('@/services/reviews/api', () => ({
  __esModule: true,
  getReviewsByProcess: (...args: any[]) => mockGetReviewsByProcess(...args),
}));

jest.mock('@umijs/max', () => ({
  __esModule: true,
  useIntl: () => ({
    locale: 'de-DE',
    formatMessage: ({ defaultMessage, id }: any, values?: Record<string, string>) =>
      Object.entries(values ?? {}).reduce(
        (message, [key, value]) => message.replace(`{${key}}`, value),
        defaultMessage ?? id,
      ),
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  HistoryOutlined: () => <span>history-icon</span>,
  CloseOutlined: () => <span>close-icon</span>,
}));

let mockLastRequest: ((params?: any) => Promise<any>) | null = null;
let mockLastColumns: any[] = [];
let mockLastTableProps: any = null;

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProTable = (props: any) => {
    const { request, columns = [] } = props;
    React.useEffect(() => {
      mockLastRequest = request;
      mockLastColumns = columns;
      mockLastTableProps = props;
    }, [request]);
    return <div data-testid='pro-table'>table</div>;
  };

  return {
    __esModule: true,
    ProTable,
  };
});

jest.mock('antd', () => {
  const React = require('react');

  const Button = ({ children, onClick, disabled, icon }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {icon}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ children }: any) => <>{children}</>;

  const Typography = {
    Text: ({ children }: any) => <span>{children}</span>,
  };

  const Drawer = ({ open, title, extra, children, onClose }: any) => {
    if (!open) return null;
    const label = toText(title) || 'drawer';
    return (
      <section role='dialog' aria-label={label}>
        <header>{extra}</header>
        <button type='button' onClick={() => onClose?.()}>
          drawer-on-close
        </button>
        <div>{children}</div>
      </section>
    );
  };

  return {
    __esModule: true,
    Button,
    Tooltip,
    Drawer,
    Grid: {
      useBreakpoint: () => mockScreens,
    },
    Typography,
  };
});

describe('ReviewDetail component', () => {
  const defaultProps = {
    processId: 'process-1',
    processVersion: '1.0.0',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLastRequest = null;
    mockLastColumns = [];
    mockLastTableProps = null;
    mockScreens = { sm: true };
  });

  it('opens drawer and loads review logs sorted by time', async () => {
    mockGetReviewsByProcess.mockResolvedValue({
      data: [
        {
          id: 'review-1',
          json: {
            logs: [
              { time: '2023-05-02T12:00:00Z', action: 'updated', user: { display_name: 'Alice' } },
              { time: '2023-05-03T08:30:00Z', action: 'created', user: { name: 'Bob' } },
            ],
          },
        },
      ],
      error: null,
    });

    render(<ReviewDetail {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('dialog', { name: 'Review Logs' })).toBeInTheDocument();
    expect(mockLastRequest).toBeInstanceOf(Function);

    let result;
    await act(async () => {
      result = await mockLastRequest?.({});
    });

    expect(mockGetReviewsByProcess).toHaveBeenCalledWith('process-1', '1.0.0');
    expect(result).toEqual(expect.objectContaining({ success: true }));
    expect(result?.data).toHaveLength(2);
    expect(result?.data?.map((item: any) => item.operator)).toEqual(['Bob', 'Alice']);
    expect(result?.data?.map((item: any) => item.action)).toEqual(['created', 'updated']);
    expect(result?.data?.[0]).toEqual(
      expect.objectContaining({
        timestamp: Date.parse('2023-05-03T08:30:00Z'),
        time: new Intl.DateTimeFormat('de-DE', {
          dateStyle: 'medium',
          timeStyle: 'medium',
        }).format(Date.parse('2023-05-03T08:30:00Z')),
      }),
    );
  });

  it('returns empty data set when service responds with error', async () => {
    mockGetReviewsByProcess.mockResolvedValue({
      data: null,
      error: { message: 'Failed' },
    });

    render(<ReviewDetail {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));

    let result;
    await act(async () => {
      result = await mockLastRequest?.({});
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        data: [],
      }),
    );
  });

  it('handles request exception gracefully', async () => {
    mockGetReviewsByProcess.mockRejectedValue(new Error('network error'));

    render(<ReviewDetail {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));

    let result;
    await act(async () => {
      result = await mockLastRequest?.({});
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        data: [],
      }),
    );
  });

  it('falls back to placeholder values when log entries are incomplete', async () => {
    mockGetReviewsByProcess.mockResolvedValue({
      data: [
        {
          id: 'review-2',
          json: {
            logs: [
              { time: undefined, action: undefined, user: {} },
              { time: undefined, action: undefined, user: {} },
            ],
          },
        },
      ],
      error: null,
    });

    render(<ReviewDetail {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));

    let result;
    await act(async () => {
      result = await mockLastRequest?.({});
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        data: [
          {
            key: 'review-2-0',
            operator: '-',
            timestamp: null,
            time: '-',
            action: '-',
          },
          {
            key: 'review-2-1',
            operator: '-',
            timestamp: null,
            time: '-',
            action: '-',
          },
        ],
      }),
    );
  });

  it('treats review records without json logs as empty log collections', async () => {
    mockGetReviewsByProcess.mockResolvedValue({
      data: [
        { id: 'review-no-json' },
        { id: 'review-null-json', json: null },
        { id: 'review-no-logs', json: {} },
      ],
      error: null,
    });

    render(<ReviewDetail {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));

    let result;
    await act(async () => {
      result = await mockLastRequest?.({});
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        data: [],
      }),
    );
  });

  it('renders action labels through the action column formatter', async () => {
    mockGetReviewsByProcess.mockResolvedValue({
      data: [],
      error: null,
    });

    render(<ReviewDetail {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));

    await act(async () => {
      await mockLastRequest?.({});
    });

    expect(toText(mockLastColumns[2].render(undefined, { action: 'submit_review' }))).toBe(
      'Submit Review',
    );
    expect(toText(mockLastColumns[2].render(undefined, { action: 'custom-action' }))).toBe(
      'Unknown review action (custom-action)',
    );
    expect(toText(mockLastColumns[2].render(undefined, { action: '   ' }))).toBe(
      'Unknown review action (-)',
    );
    expect(toText(mockLastColumns[1].render(undefined, { time: '16.07.2026, 10:30:00' }))).toBe(
      '16.07.2026, 10:30:00',
    );
    expect(mockLastTableProps).toEqual(
      expect.objectContaining({ tableLayout: 'fixed', scroll: { x: 580 } }),
    );
  });

  it('uses one readable card column on a 390px-class viewport without hiding fields', () => {
    mockScreens = { sm: false, xs: true };

    render(<ReviewDetail {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));

    expect(mockLastColumns).toHaveLength(1);
    expect(mockLastTableProps.scroll).toBeUndefined();

    render(
      <>
        {mockLastColumns[0].render(undefined, {
          action: 'submit_review',
          operator: 'Ada Reviewer',
          time: '16.07.2026, 10:30:00',
        })}
      </>,
    );

    expect(screen.getByText('Submit Review')).toBeInTheDocument();
    expect(screen.getByText('Ada Reviewer')).toBeInTheDocument();
    expect(screen.getByText('16.07.2026, 10:30:00')).toBeInTheDocument();
    expect(screen.getAllByText('Action Details').length).toBeGreaterThan(0);
  });

  it('closes the drawer when the close button is clicked', () => {
    render(<ReviewDetail {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog', { name: 'Review Logs' })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(screen.queryByRole('dialog', { name: 'Review Logs' })).not.toBeInTheDocument();
  });

  it('closes the drawer through the drawer onClose handler', () => {
    render(<ReviewDetail {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog', { name: 'Review Logs' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'drawer-on-close' }));
    expect(screen.queryByRole('dialog', { name: 'Review Logs' })).not.toBeInTheDocument();
  });
});
