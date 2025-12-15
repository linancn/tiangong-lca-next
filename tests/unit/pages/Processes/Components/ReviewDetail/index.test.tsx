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

jest.mock('@/services/reviews/api', () => ({
  __esModule: true,
  getReviewsByProcess: (...args: any[]) => mockGetReviewsByProcess(...args),
}));

jest.mock('@umijs/max', () => ({
  __esModule: true,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  HistoryOutlined: () => <span>history-icon</span>,
  CloseOutlined: () => <span>close-icon</span>,
}));

let mockLastRequest: ((params?: any) => Promise<any>) | null = null;

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProTable = ({ request }: any) => {
    React.useEffect(() => {
      mockLastRequest = request;
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

  const Drawer = ({ open, title, extra, children }: any) => {
    if (!open) return null;
    const label = toText(title) || 'drawer';
    return (
      <section role='dialog' aria-label={label}>
        <header>{extra}</header>
        <div>{children}</div>
      </section>
    );
  };

  return {
    __esModule: true,
    Button,
    Tooltip,
    Drawer,
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
});
