// @ts-nocheck
import SelectReviewer from '@/pages/Review/Components/SelectReviewer';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  UsergroupAddOutlined: () => <span data-testid='icon-user' />,
}));

jest.mock('dayjs', () => {
  const actual = jest.requireActual('dayjs');
  return actual;
});

jest.mock('antd', () => {
  const React = require('react');

  const Button = ({ children, onClick, disabled, icon, ...rest }: any) => (
    <button type='button' onClick={disabled ? undefined : onClick} disabled={disabled} {...rest}>
      {icon}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ children }: any) => <>{children}</>;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Spin = ({ spinning, children }: any) =>
    spinning ? <div data-testid='spin'>{children}</div> : <>{children}</>;

  const Drawer = ({ open, children, footer, extra, title }: any) =>
    open ? (
      <section data-testid='drawer'>
        <header>{toText(title)}</header>
        <div>{extra}</div>
        <div>{children}</div>
        <footer>{footer}</footer>
      </section>
    ) : null;

  const DatePicker = ({ onChange, value }: any) => (
    <input
      data-testid='date-picker'
      value={value ? String(value) : ''}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );

  const message = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
  };

  const theme = {
    useToken: () => ({ token: { fontSize: 12 } }),
  };

  return {
    __esModule: true,
    Button,
    DatePicker,
    Drawer,
    Space,
    Spin,
    Tooltip,
    message,
    theme,
  };
});

const ProTable = ({ rowSelection, actionRef, request }: any) => {
  const [rows, setRows] = React.useState<any[]>([]);

  React.useEffect(() => {
    const reload = jest.fn(async () => {
      const result = await request?.({}, {});
      setRows(result?.data ?? []);
    });
    const ref = {
      reload,
      triggerSelect: (keys: any[]) => rowSelection?.onChange?.(keys),
    };
    if (actionRef) {
      actionRef.current = ref;
    }
    reload();
  }, [actionRef, request, rowSelection]);

  return (
    <div data-testid='protable'>
      <button type='button' onClick={() => rowSelection?.onChange?.(['user-2'])}>
        select-row
      </button>
      {rows.map((row) => (
        <div key={row.user_id}>{row.email}</div>
      ))}
    </div>
  );
};

jest.mock('@ant-design/pro-components', () => ({
  __esModule: true,
  ProTable: (props: any) => <ProTable {...props} />,
}));

const mockAddCommentApi = jest.fn();
const mockGetReviewerIdsApi = jest.fn();
const mockGetReviewsDetail = jest.fn();
const mockGetReviewsDetailByReviewIds = jest.fn();
const mockUpdateReviewApi = jest.fn();
const mockGetReviewMembersApi = jest.fn();
const mockGetReviewerIdsByReviewId = jest.fn();

jest.mock('@/services/comments/api', () => ({
  __esModule: true,
  addCommentApi: (...args: any[]) => mockAddCommentApi(...args),
  getReviewerIdsByReviewId: (...args: any[]) => mockGetReviewerIdsByReviewId(...args),
}));

jest.mock('@/services/reviews/api', () => ({
  __esModule: true,
  getReviewerIdsApi: (...args: any[]) => mockGetReviewerIdsApi(...args),
  getReviewsDetail: (...args: any[]) => mockGetReviewsDetail(...args),
  getReviewsDetailByReviewIds: (...args: any[]) => mockGetReviewsDetailByReviewIds(...args),
  updateReviewApi: (...args: any[]) => mockUpdateReviewApi(...args),
}));

jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  getReviewMembersApi: (...args: any[]) => mockGetReviewMembersApi(...args),
}));

const mockGetUserId = jest.fn();
const mockGetUsersByIds = jest.fn();

jest.mock('@/services/users/api', () => ({
  __esModule: true,
  getUserId: (...args: any[]) => mockGetUserId(...args),
  getUsersByIds: (...args: any[]) => mockGetUsersByIds(...args),
}));

const { message } = require('antd');

describe('SelectReviewer component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddCommentApi.mockResolvedValue({ error: null });
    mockGetReviewerIdsApi.mockResolvedValue([]);
    mockGetReviewsDetail.mockResolvedValue(null);
    mockGetReviewsDetailByReviewIds.mockResolvedValue([
      {
        id: 'review-1',
        json: { logs: [] },
      },
    ]);
    mockUpdateReviewApi.mockResolvedValue({ error: null, data: [{}] });
    mockGetReviewMembersApi.mockResolvedValue({
      data: [
        {
          user_id: 'user-2',
          email: 'user2@example.com',
          display_name: 'User Two',
          role: 'review-member',
        },
      ],
      success: true,
      total: 1,
    });
    mockGetReviewerIdsByReviewId.mockResolvedValue([]);
    mockGetUserId.mockResolvedValue('user-1');
    mockGetUsersByIds.mockResolvedValue([{ id: 'user-1', display_name: 'Owner' }]);
    message.success.mockReset();
    message.error.mockReset();
  });

  it('assigns reviewers and saves successfully', async () => {
    const actionRef = { current: { reload: jest.fn() } };

    render(<SelectReviewer reviewIds={['review-1']} tabType='unassigned' actionRef={actionRef} />);

    const openButton = screen.getByTestId('icon-user').closest('button');
    fireEvent.click(openButton);

    await waitFor(() => expect(mockGetReviewerIdsApi).toHaveBeenCalled());
    await waitFor(() => screen.getByTestId('protable'));

    fireEvent.click(screen.getByText('select-row'));

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => expect(mockUpdateReviewApi).toHaveBeenCalled());
    expect(mockAddCommentApi).toHaveBeenCalled();
    expect(message.success).toHaveBeenCalledWith('Save success');
    expect(actionRef.current.reload).toHaveBeenCalled();
  });

  it('temporarily saves selected reviewers without creating review comments', async () => {
    const actionRef = { current: { reload: jest.fn() } };

    render(<SelectReviewer reviewIds={['review-1']} tabType='unassigned' actionRef={actionRef} />);

    fireEvent.click(screen.getByTestId('icon-user').closest('button'));

    await waitFor(() => expect(mockGetReviewerIdsApi).toHaveBeenCalledWith(['review-1']));
    fireEvent.click(screen.getByText('select-row'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Temporary Save' }));
    });

    await waitFor(() =>
      expect(mockUpdateReviewApi).toHaveBeenCalledWith(
        ['review-1'],
        expect.objectContaining({
          reviewer_id: ['user-2'],
        }),
      ),
    );
    expect(mockAddCommentApi).not.toHaveBeenCalled();
    expect(message.success).toHaveBeenCalledWith('Temporary save success');
    expect(actionRef.current.reload).toHaveBeenCalled();
  });

  it('merges default assigned reviewers with new selections when saving assigned reviews', async () => {
    const actionRef = { current: { reload: jest.fn() } };

    mockGetReviewerIdsByReviewId.mockResolvedValue([
      { reviewer_id: 'user-1', state_code: 0 },
      { reviewer_id: 'user-3', state_code: -1 },
    ]);
    mockGetReviewsDetail.mockResolvedValue({
      deadline: '2026-03-20T10:00:00.000Z',
    });
    mockGetReviewMembersApi.mockResolvedValue({
      data: [
        {
          user_id: 'user-1',
          email: 'user1@example.com',
          display_name: 'User One',
          role: 'review-member',
        },
        {
          user_id: 'user-2',
          email: 'user2@example.com',
          display_name: 'User Two',
          role: 'review-member',
        },
      ],
      success: true,
      total: 2,
    });

    render(<SelectReviewer reviewIds={['review-1']} tabType='assigned' actionRef={actionRef} />);

    fireEvent.click(screen.getByTestId('icon-user').closest('button'));

    await waitFor(() => expect(mockGetReviewerIdsByReviewId).toHaveBeenCalledWith('review-1'));
    await waitFor(() => expect(mockGetReviewsDetail).toHaveBeenCalledWith('review-1'));
    await waitFor(() => expect(screen.queryByText('user1@example.com')).not.toBeInTheDocument());
    expect(screen.getByText('user2@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Temporary Save' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('select-row'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    await waitFor(() =>
      expect(mockUpdateReviewApi).toHaveBeenCalledWith(
        ['review-1'],
        expect.objectContaining({
          reviewer_id: ['user-1', 'user-2'],
          state_code: 1,
          deadline: expect.any(String),
        }),
      ),
    );
    expect(mockAddCommentApi).toHaveBeenCalledWith([
      {
        review_id: 'review-1',
        reviewer_id: 'user-2',
        state_code: 0,
      },
    ]);
    expect(message.success).toHaveBeenCalledWith('Save success');
  });

  it('shows an error when temporary save fails', async () => {
    const actionRef = { current: { reload: jest.fn() } };
    mockUpdateReviewApi.mockResolvedValueOnce({ error: new Error('failed') });

    render(<SelectReviewer reviewIds={['review-1']} tabType='unassigned' actionRef={actionRef} />);

    fireEvent.click(screen.getByTestId('icon-user').closest('button'));

    await waitFor(() => expect(mockGetReviewerIdsApi).toHaveBeenCalledWith(['review-1']));
    fireEvent.click(screen.getByText('select-row'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Temporary Save' }));
    });

    await waitFor(() => expect(message.error).toHaveBeenCalledWith('Temporary save failed'));
    expect(mockAddCommentApi).not.toHaveBeenCalled();
    expect(actionRef.current.reload).not.toHaveBeenCalled();
  });

  it('shows an error when reviewer assignment save fails', async () => {
    const actionRef = { current: { reload: jest.fn() } };
    mockUpdateReviewApi.mockResolvedValueOnce({ error: new Error('failed') });

    render(<SelectReviewer reviewIds={['review-1']} tabType='unassigned' actionRef={actionRef} />);

    fireEvent.click(screen.getByTestId('icon-user').closest('button'));

    await waitFor(() => expect(mockGetReviewerIdsApi).toHaveBeenCalled());
    fireEvent.click(screen.getByText('select-row'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    await waitFor(() => expect(message.error).toHaveBeenCalledWith('Save failed'));
    expect(mockAddCommentApi).not.toHaveBeenCalled();
    expect(actionRef.current.reload).not.toHaveBeenCalled();
  });

  it('closes without saving when cancel is clicked', async () => {
    const actionRef = { current: { reload: jest.fn() } };

    render(<SelectReviewer reviewIds={['review-1']} tabType='unassigned' actionRef={actionRef} />);

    fireEvent.click(screen.getByTestId('icon-user').closest('button'));
    await waitFor(() => screen.getByTestId('drawer'));

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByTestId('drawer')).not.toBeInTheDocument());
    expect(mockUpdateReviewApi).not.toHaveBeenCalled();
    expect(mockAddCommentApi).not.toHaveBeenCalled();
  });
});
