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

    const [openButton] = screen.getAllByRole('button');
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
});
