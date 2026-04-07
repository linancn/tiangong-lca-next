// @ts-nocheck
import ReviewProgress from '@/pages/Review/Components/ReviewProgress';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

jest.mock('@umijs/max', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span data-testid='icon-close' />,
  DeleteOutlined: () => <span data-testid='icon-delete' />,
  FileSyncOutlined: () => <span data-testid='icon-sync' />,
}));

jest.mock('@/style/custom.less', () => ({
  __esModule: true,
  default: { footer_right: 'footer_right' },
}));

jest.mock('@/pages/Review/Components/SelectReviewer', () => ({
  __esModule: true,
  default: () => <div data-testid='select-reviewer-stub' />,
}));

const mockRejectReview = jest.fn((props: any) => (
  <div data-testid='reject-review-stub'>{props.isModel ? 'model' : 'process'}</div>
));

jest.mock('@/pages/Review/Components/RejectReview', () => ({
  __esModule: true,
  default: (props: any) => mockRejectReview(props),
}));

jest.mock('antd', () => {
  const React = require('react');

  const Button = ({ children, onClick, disabled, icon, ...rest }: any) => (
    <button type='button' onClick={disabled ? undefined : onClick} disabled={disabled} {...rest}>
      {icon}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ children }: any) => <>{children}</>;

  const Drawer = ({ open, children, title, extra, footer, onClose }: any) =>
    open ? (
      <section data-testid='drawer'>
        <header>{toText(title)}</header>
        <div>{extra}</div>
        <div>{children}</div>
        <div>{footer}</div>
        <button type='button' data-testid='drawer-close' onClick={onClose}>
          close-drawer
        </button>
      </section>
    ) : null;

  const Tag = ({ children }: any) => <span data-testid='tag'>{children}</span>;
  const Space = ({ children, className }: any) => <div className={className}>{children}</div>;
  const Spin = ({ children, spinning }: any) =>
    spinning ? <div data-testid='spin'>Loading...</div> : <>{children}</>;

  const Modal = {
    confirm: jest.fn((config: any) => {
      void config?.onOk?.();
      return { destroy: jest.fn() };
    }),
  };

  const message = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
  };

  const theme = {
    useToken: () => ({ token: { colorPrimary: '#1677ff' } }),
  };

  return {
    __esModule: true,
    Button,
    Drawer,
    Modal,
    Space,
    Spin,
    Tag,
    Tooltip,
    message,
    theme,
  };
});

let latestColumns: any[] = [];

const ProTable = ({ columns, request, actionRef, rowKey, toolBarRender }: any) => {
  const [rows, setRows] = React.useState<any[]>([]);

  latestColumns = columns;

  React.useEffect(() => {
    const reload = jest.fn(async () => {
      const result = await request?.();
      setRows(result?.data ?? []);
    });

    if (actionRef) {
      actionRef.current = { reload };
    }

    void reload();
  }, [actionRef, request]);

  return (
    <div data-testid='protable'>
      <div data-testid='protable-toolbar'>{toolBarRender?.()}</div>
      {rows.map((row: any) => (
        <div key={row[rowKey]}>
          {columns.map((column: any, index: number) => {
            if (column.dataIndex === 'actions' && column.render) {
              const rendered = column.render(null, row);
              const element = Array.isArray(rendered) ? rendered[0] : rendered;
              let onClick: (() => void) | undefined;
              let candidate = element;

              if (
                React.isValidElement(candidate) &&
                candidate.props?.children &&
                !candidate.props?.onClick
              ) {
                const child = Array.isArray(candidate.props.children)
                  ? candidate.props.children[0]
                  : candidate.props.children;
                if (React.isValidElement(child)) {
                  candidate = child;
                }
              }

              if (React.isValidElement(candidate)) {
                onClick = candidate.props?.onClick;
              }

              return (
                <button
                  key={`action-${index}`}
                  type='button'
                  data-testid={`remove-${row[rowKey]}`}
                  onClick={onClick}
                >
                  remove
                </button>
              );
            }

            const rendered =
              typeof column.render === 'function'
                ? column.render(row[column.dataIndex], row)
                : row[column.dataIndex];

            return <span key={String(column.dataIndex) ?? index}>{rendered}</span>;
          })}
        </div>
      ))}
    </div>
  );
};

jest.mock('@ant-design/pro-components', () => ({
  __esModule: true,
  ProTable: (props: any) => <ProTable {...props} />,
}));

const mockGetCommentApi = jest.fn();
jest.mock('@/services/comments/api', () => ({
  __esModule: true,
  getCommentApi: (...args: any[]) => mockGetCommentApi(...args),
}));

const mockApproveReviewApi = jest.fn();
const mockRevokeReviewerApi = jest.fn();
jest.mock('@/services/reviews/api', () => ({
  __esModule: true,
  approveReviewApi: (...args: any[]) => mockApproveReviewApi(...args),
  revokeReviewerApi: (...args: any[]) => mockRevokeReviewerApi(...args),
}));

const mockGetUsersByIds = jest.fn();
jest.mock('@/services/users/api', () => ({
  __esModule: true,
  getUsersByIds: (...args: any[]) => mockGetUsersByIds(...args),
}));

const { message, Modal } = require('antd');

describe('ReviewProgress component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCommentApi.mockResolvedValue({
      data: [
        {
          id: 'row-1',
          reviewer_id: 'user-2',
          reviewer_name: '',
          state_code: 0,
          updated_at: '2024-01-01T00:00:00Z',
          json: {},
        },
      ],
    });
    mockGetUsersByIds.mockResolvedValue([{ id: 'user-2', display_name: 'Reviewer Two' }]);
    mockRevokeReviewerApi.mockResolvedValue({
      data: [{ review: { id: 'review-1' } }],
      error: null,
    });
    mockApproveReviewApi.mockResolvedValue({
      data: [{ review: { id: 'review-1' } }],
      error: null,
    });
    message.success.mockReset();
    message.error.mockReset();
    Modal.confirm.mockClear();
    mockRejectReview.mockClear();
  });

  const renderComponent = (props: any = {}) => {
    const actionRef = props.actionRef ?? { current: { reload: jest.fn() } };

    render(
      <ReviewProgress
        reviewId='review-1'
        dataId='process-1'
        dataVersion='01'
        actionType='process'
        tabType='assigned'
        actionRef={actionRef}
        {...props}
      />,
    );

    return { actionRef };
  };

  it('loads assigned reviewers and filters out negative comment states', async () => {
    mockGetCommentApi.mockResolvedValue({
      data: [
        {
          id: 'row-1',
          reviewer_id: 'user-2',
          reviewer_name: '',
          state_code: 0,
          updated_at: '2024-01-01T00:00:00Z',
          json: {},
        },
        {
          id: 'row-2',
          reviewer_id: 'user-3',
          reviewer_name: '',
          state_code: -3,
          updated_at: '2024-01-01T00:00:00Z',
          json: { comment: { message: 'Rejected' } },
        },
      ],
    });
    mockGetUsersByIds.mockResolvedValue([
      { id: 'user-2', display_name: 'Reviewer Two' },
      { id: 'user-3', display_name: 'Reviewer Three' },
    ]);

    renderComponent();

    fireEvent.click(screen.getByTestId('icon-sync').closest('button') as HTMLButtonElement);

    await waitFor(() => expect(mockGetCommentApi).toHaveBeenCalledWith('review-1', 'assigned'));
    await waitFor(() => expect(screen.getByText('Reviewer Two')).toBeInTheDocument());
    expect(screen.queryByText('Reviewer Three')).not.toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
  });

  it('revokes reviewers through the review workflow command boundary', async () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('icon-sync').closest('button') as HTMLButtonElement);
    await waitFor(() => expect(screen.getByTestId('remove-user-2')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('remove-user-2'));

    await waitFor(() => expect(mockRevokeReviewerApi).toHaveBeenCalledWith('review-1', 'user-2'));
    expect(message.success).toHaveBeenCalledWith('Successfully revoked the auditor');
  });

  it('shows an error toast when revoking a reviewer fails', async () => {
    mockRevokeReviewerApi.mockResolvedValueOnce({
      data: [],
      error: new Error('failed'),
    });

    renderComponent();

    fireEvent.click(screen.getByTestId('icon-sync').closest('button') as HTMLButtonElement);
    await waitFor(() => expect(screen.getByTestId('remove-user-2')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('remove-user-2'));

    await waitFor(() => expect(message.error).toHaveBeenCalledWith('Failed to revoke the auditor'));
  });

  it('approves process reviews through the review workflow command boundary', async () => {
    const { actionRef } = renderComponent();

    fireEvent.click(screen.getByTestId('icon-sync').closest('button') as HTMLButtonElement);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Approve Review' })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Approve Review' }));

    await waitFor(() => expect(mockApproveReviewApi).toHaveBeenCalledWith('review-1', 'processes'));
    expect(message.success).toHaveBeenCalledWith('Review approved successfully');
    expect(actionRef.current.reload).toHaveBeenCalled();
  });

  it('surfaces command errors when approval fails', async () => {
    mockApproveReviewApi.mockResolvedValueOnce({
      data: [],
      error: { message: 'Approval failed' },
    });

    renderComponent();

    fireEvent.click(screen.getByTestId('icon-sync').closest('button') as HTMLButtonElement);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Approve Review' })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Approve Review' }));

    await waitFor(() => expect(message.error).toHaveBeenCalledWith('Approval failed'));
  });

  it('passes the corrected model rejection props to RejectReview', async () => {
    renderComponent({
      actionType: 'model',
      dataId: 'model-1',
      dataVersion: '03',
    });

    fireEvent.click(screen.getByTestId('icon-sync').closest('button') as HTMLButtonElement);

    await waitFor(() => expect(mockRejectReview).toHaveBeenCalled());
    expect(mockRejectReview.mock.calls.at(-1)?.[0]).toMatchObject({
      isModel: true,
      reviewId: 'review-1',
      dataId: 'model-1',
      dataVersion: '03',
    });
  });

  it('renders reviewed and unknown reviewer statuses for non-pending rows', async () => {
    mockGetCommentApi.mockResolvedValue({
      data: [
        {
          id: 'row-reviewed',
          reviewer_id: 'user-reviewed',
          reviewer_name: '',
          state_code: 1,
          updated_at: '2024-01-01T00:00:00Z',
          json: {},
        },
        {
          id: 'row-unknown',
          reviewer_id: 'user-unknown',
          reviewer_name: '',
          state_code: 9,
          updated_at: '2024-01-01T00:00:00Z',
          json: {},
        },
      ],
    });
    mockGetUsersByIds.mockResolvedValue([
      { id: 'user-reviewed', display_name: 'Reviewed User' },
      { id: 'user-unknown', display_name: 'Unknown User' },
    ]);

    renderComponent();

    fireEvent.click(screen.getByTestId('icon-sync').closest('button') as HTMLButtonElement);

    await waitFor(() => expect(screen.getByText('Reviewed')).toBeInTheDocument());
    expect(screen.getByText('Unknown Status')).toBeInTheDocument();
  });

  it('renders rejected status and review-comment helpers for rejected reviewer rows', async () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('icon-sync').closest('button') as HTMLButtonElement);
    await waitFor(() => expect(latestColumns).toHaveLength(6));

    const statusColumn = latestColumns.find((column) => column.dataIndex === 'state_code');
    const commentColumn = latestColumns.find((column) => column.dataIndex === 'comment');

    render(
      <>
        {statusColumn.render(null, { state_code: -3 })}
        {commentColumn.render(null, {
          state_code: -3,
          json: { comment: '{"message":"Detailed rejection"}' },
        })}
      </>,
    );

    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('Detailed rejection')).toBeInTheDocument();
    expect(
      commentColumn.render(null, {
        state_code: -3,
        json: { comment: { message: 'Object rejection' } },
      }),
    ).not.toBeNull();
    expect(
      commentColumn.render(null, {
        state_code: -3,
        json: { comment: '{"reason":"Missing details"}' },
      }),
    ).toBeNull();
    expect(commentColumn.render(null, { state_code: -3, json: { comment: {} } })).toBeNull();
    expect(commentColumn.render(null, { state_code: -3, json: { comment: '{' } })).toBeNull();
    expect(commentColumn.render(null, { state_code: -3, json: {} })).toBeNull();
  });

  it('handles empty and failed reviewer loads and supports both close actions', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockGetCommentApi.mockResolvedValue({ data: [] });

    renderComponent();

    fireEvent.click(screen.getByTestId('icon-sync').closest('button') as HTMLButtonElement);
    await waitFor(() => expect(screen.getByTestId('drawer')).toBeInTheDocument());
    expect(screen.queryByText('Reviewer Two')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('icon-close').closest('button') as HTMLButtonElement);
    await waitFor(() => expect(screen.queryByTestId('drawer')).not.toBeInTheDocument());

    mockGetCommentApi.mockRejectedValueOnce(new Error('load failed'));

    fireEvent.click(screen.getByTestId('icon-sync').closest('button') as HTMLButtonElement);
    await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error)));
    expect(screen.getByTestId('drawer')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('drawer-close'));
    await waitFor(() => expect(screen.queryByTestId('drawer')).not.toBeInTheDocument());

    consoleSpy.mockRestore();
  });

  it('logs unexpected revoke failures without showing a success toast', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockRevokeReviewerApi.mockRejectedValueOnce(new Error('revoke failed'));

    renderComponent();

    fireEvent.click(screen.getByTestId('icon-sync').closest('button') as HTMLButtonElement);
    await waitFor(() => expect(screen.getByTestId('remove-user-2')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('remove-user-2'));

    await waitFor(() =>
      expect(consoleSpy).toHaveBeenCalledWith('Failed to revoke reviewer:', expect.any(Error)),
    );
    expect(message.success).not.toHaveBeenCalledWith('Successfully revoked the auditor');
    consoleSpy.mockRestore();
  });

  it('falls back to the revoke error toast when the revoke command omits its data payload', async () => {
    mockRevokeReviewerApi.mockResolvedValueOnce({
      data: undefined,
      error: null,
    });

    renderComponent();

    fireEvent.click(screen.getByTestId('icon-sync').closest('button') as HTMLButtonElement);
    await waitFor(() => expect(screen.getByTestId('remove-user-2')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('remove-user-2'));

    await waitFor(() => expect(message.error).toHaveBeenCalledWith('Failed to revoke the auditor'));
  });

  it('surfaces thrown approval errors from the review workflow command boundary', async () => {
    mockApproveReviewApi.mockRejectedValueOnce(new Error('Approval exploded'));

    renderComponent();

    fireEvent.click(screen.getByTestId('icon-sync').closest('button') as HTMLButtonElement);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Approve Review' })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Approve Review' }));

    await waitFor(() => expect(message.error).toHaveBeenCalledWith('Approval exploded'));
  });

  it('uses the lifecyclemodels table and generic approval errors when approval messages are missing', async () => {
    mockApproveReviewApi.mockResolvedValueOnce({
      data: [],
      error: {},
    });

    renderComponent({ actionType: 'model' });

    fireEvent.click(screen.getByTestId('icon-sync').closest('button') as HTMLButtonElement);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Approve Review' })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Approve Review' }));

    await waitFor(() =>
      expect(mockApproveReviewApi).toHaveBeenCalledWith('review-1', 'lifecyclemodels'),
    );
    await waitFor(() => expect(message.error).toHaveBeenCalledWith('Failed to approve review'));

    mockApproveReviewApi.mockRejectedValueOnce({});

    fireEvent.click(screen.getByRole('button', { name: 'Approve Review' }));

    await waitFor(() => expect(message.error).toHaveBeenCalledWith('Failed to approve review'));
  });
});
