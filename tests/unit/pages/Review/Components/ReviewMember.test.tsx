// @ts-nocheck
import ReviewMember from '@/pages/Review/Components/ReviewMember';
import userEvent from '@testing-library/user-event';
import { act, fireEvent, render, screen, waitFor } from '../../../../helpers/testUtils';

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
    locale: 'en-US',
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close</span>,
  CrownOutlined: () => <span>crown</span>,
  DeleteOutlined: () => <span>delete</span>,
  PlusOutlined: () => <span>plus</span>,
  UserOutlined: () => <span>user</span>,
}));

jest.mock('@/pages/Review/Components/AddMemberModal', () => ({
  __esModule: true,
  default: ({ open, onSuccess, onCancel }: any) =>
    open ? (
      <div data-testid='add-member-modal'>
        <button type='button' onClick={() => onSuccess?.()}>
          modal-success
        </button>
        <button type='button' onClick={() => onCancel?.()}>
          modal-cancel
        </button>
      </div>
    ) : null,
}));

jest.mock('@/pages/Review/Components/AssignmentReview', () => ({
  __esModule: true,
  default: ({ tableType, userData, actionFrom, hideReviewButton }: any) => (
    <div data-testid='assignment-review'>
      {JSON.stringify({ tableType, userData, actionFrom, hideReviewButton })}
    </div>
  ),
}));

jest.mock('antd', () => {
  const React = require('react');

  const Button = ({ children, onClick, disabled, icon, ...rest }: any) => (
    <button
      type='button'
      aria-label={rest['aria-label'] ?? toText(icon) ?? toText(children)}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
    >
      {icon}
      {toText(children)}
    </button>
  );

  const Drawer = ({ open, title, children, extra, onClose, getContainer }: any) =>
    open ? (
      <section
        data-testid='drawer'
        data-container={getContainer?.() === globalThis.document?.body ? 'body' : 'unknown'}
      >
        <header>{toText(title)}</header>
        <div>{extra}</div>
        <button type='button' onClick={() => onClose?.()}>
          drawer-on-close
        </button>
        <div>{children}</div>
      </section>
    ) : null;

  const Flex = ({ children }: any) => <div>{children}</div>;
  const Tooltip = ({ children }: any) => <>{children}</>;

  const message = {
    success: jest.fn(),
    error: jest.fn(),
  };

  const Modal = {
    confirm: jest.fn(),
  };

  const theme = {
    useToken: () => ({ token: { colorPrimary: '#1677ff' } }),
  };

  return {
    __esModule: true,
    Button,
    Drawer,
    Flex,
    Modal,
    Tooltip,
    message,
    theme,
  };
});

const MockProTable = ({ request, actionRef, columns, toolBarRender, headerTitle }: any) => {
  const React = require('react');
  const [rows, setRows] = React.useState<any[]>([]);
  const requestRef = React.useRef(request);
  const actionRefRef = React.useRef(actionRef);

  requestRef.current = request;
  actionRefRef.current = actionRef;

  React.useEffect(() => {
    const reload = jest.fn(async () => {
      const result = await requestRef.current?.({ pageSize: 10, current: 1 }, {});
      setRows(result?.data ?? []);
      return result;
    });

    if (actionRefRef.current) {
      actionRefRef.current.current = { reload };
    }

    reload();
  }, []);

  return (
    <section data-testid='protable'>
      <div data-testid='header-title'>{headerTitle}</div>
      <div data-testid='toolbar'>{toolBarRender?.()}</div>
      {rows.map((row) => (
        <div key={row.email} data-testid={`row-${row.email}`}>
          {columns.map((column: any, index: number) => (
            <div key={index}>
              {column.render
                ? column.render(row[column.dataIndex], row, index)
                : row[column.dataIndex]}
            </div>
          ))}
        </div>
      ))}
    </section>
  );
};

jest.mock('@ant-design/pro-components', () => ({
  __esModule: true,
  ProTable: (props: any) => <MockProTable {...props} />,
}));

const mockGetUserManageTableData = jest.fn();
const mockUpdateRoleApi = jest.fn();
const mockDelRoleApi = jest.fn();

jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  getUserManageTableData: (...args: any[]) => mockGetUserManageTableData(...args),
  updateRoleApi: (...args: any[]) => mockUpdateRoleApi(...args),
  delRoleApi: (...args: any[]) => mockDelRoleApi(...args),
}));

const { Modal, message } = require('antd');

describe('ReviewMember', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserManageTableData.mockResolvedValue({
      success: true,
      data: [
        {
          email: 'member@example.com',
          pendingCount: 2,
          reviewedCount: 5,
          display_name: 'Member One',
          role: 'review-member',
          user_id: 'user-2',
          team_id: 'team-1',
        },
      ],
      total: 1,
    });
    mockUpdateRoleApi.mockResolvedValue({ error: null });
    mockDelRoleApi.mockResolvedValue({ error: null });
  });

  it('lets admins open member review drawers, promote members, and delete them', async () => {
    render(<ReviewMember userData={{ user_id: 'admin-1', role: 'review-admin' }} />);

    await waitFor(() => expect(mockGetUserManageTableData).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: 'plus' }));
    expect(screen.getByTestId('add-member-modal')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'modal-success' }));
    await waitFor(() => expect(mockGetUserManageTableData).toHaveBeenCalledTimes(2));

    await userEvent.click(screen.getByText('2'));
    expect(screen.getByTestId('drawer')).toBeInTheDocument();
    expect(screen.getByTestId('assignment-review')).toHaveTextContent('"tableType":"pending"');
    expect(screen.getByTestId('assignment-review')).toHaveTextContent('"user_id":"user-2"');

    await userEvent.click(screen.getByRole('button', { name: 'crown' }));
    await waitFor(() =>
      expect(mockUpdateRoleApi).toHaveBeenCalledWith('team-1', 'user-2', 'review-admin'),
    );
    expect(message.success).toHaveBeenCalledWith('Action success!');

    await userEvent.click(screen.getByRole('button', { name: 'delete' }));
    expect(Modal.confirm).toHaveBeenCalled();

    await act(async () => {
      await Modal.confirm.mock.calls[0][0].onOk();
    });

    await waitFor(() =>
      expect(mockDelRoleApi).toHaveBeenCalledWith('team-1', 'user-2', 'review-member'),
    );
    expect(message.success).toHaveBeenCalledWith('Action success!');
  });

  it('opens the reviewed drawer variant when clicking reviewed counts', async () => {
    render(<ReviewMember userData={{ user_id: 'admin-1', role: 'review-admin' }} />);

    await waitFor(() => expect(mockGetUserManageTableData).toHaveBeenCalled());

    await userEvent.click(screen.getByText('5'));
    expect(screen.getByTestId('assignment-review')).toHaveTextContent('"tableType":"reviewed"');
    expect(screen.getByTestId('assignment-review')).toHaveTextContent(
      '"actionFrom":"reviewMember"',
    );
  });

  it('lets admins demote review admins back to members', async () => {
    mockGetUserManageTableData.mockResolvedValueOnce({
      success: true,
      data: [
        {
          email: 'admin@example.com',
          pendingCount: 1,
          reviewedCount: 3,
          display_name: 'Admin One',
          role: 'review-admin',
          user_id: 'user-3',
          team_id: 'team-2',
        },
      ],
      total: 1,
    });

    render(<ReviewMember userData={{ user_id: 'admin-1', role: 'review-admin' }} />);

    await waitFor(() => expect(mockGetUserManageTableData).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: 'user' }));

    await waitFor(() =>
      expect(mockUpdateRoleApi).toHaveBeenCalledWith('team-2', 'user-3', 'review-member'),
    );
    expect(message.success).toHaveBeenCalledWith('Action success!');
  });

  it('closes the add-member modal and review drawer through cancel and close actions', async () => {
    render(<ReviewMember userData={{ user_id: 'admin-1', role: 'review-admin' }} />);

    await waitFor(() => expect(mockGetUserManageTableData).toHaveBeenCalled());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'plus' }));
    });
    expect(screen.getByTestId('add-member-modal')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'modal-cancel' }));
    });
    expect(screen.queryByTestId('add-member-modal')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('2'));
    });
    expect(screen.getByTestId('drawer')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'close' }));
    });
    expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();
  });

  it('shows error feedback when role promotion fails', async () => {
    mockUpdateRoleApi.mockResolvedValueOnce({ error: new Error('failed') });

    render(<ReviewMember userData={{ user_id: 'admin-1', role: 'review-admin' }} />);

    await waitFor(() => expect(mockGetUserManageTableData).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: 'crown' }));

    await waitFor(() =>
      expect(mockUpdateRoleApi).toHaveBeenCalledWith('team-1', 'user-2', 'review-admin'),
    );
    expect(message.error).toHaveBeenCalledWith('Action failed!');
  });

  it('shows error feedback when deleting a member fails', async () => {
    mockDelRoleApi.mockResolvedValueOnce({ error: new Error('failed') });

    render(<ReviewMember userData={{ user_id: 'admin-1', role: 'review-admin' }} />);

    await waitFor(() => expect(mockGetUserManageTableData).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: 'delete' }));
    expect(Modal.confirm).toHaveBeenCalled();

    await act(async () => {
      await Modal.confirm.mock.calls[0][0].onOk();
    });

    await waitFor(() =>
      expect(mockDelRoleApi).toHaveBeenCalledWith('team-1', 'user-2', 'review-member'),
    );
    expect(message.error).toHaveBeenCalledWith('Action failed!');
  });

  it('keeps admin-only controls disabled for review members', async () => {
    render(<ReviewMember userData={{ user_id: 'member-1', role: 'review-member' }} />);

    await waitFor(() => expect(mockGetUserManageTableData).toHaveBeenCalled());

    expect(screen.getByRole('button', { name: 'plus' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'delete' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'crown' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'user' })).toBeDisabled();
  });

  it('logs thrown update and delete failures without crashing', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUpdateRoleApi.mockRejectedValueOnce(new Error('update crashed'));
    mockDelRoleApi.mockRejectedValueOnce(new Error('delete crashed'));

    try {
      render(<ReviewMember userData={{ user_id: 'admin-1', role: 'review-admin' }} />);

      await waitFor(() => expect(mockGetUserManageTableData).toHaveBeenCalled());

      await userEvent.click(screen.getByRole('button', { name: 'crown' }));
      await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalledTimes(1));

      await userEvent.click(screen.getByRole('button', { name: 'delete' }));
      await act(async () => {
        await Modal.confirm.mock.calls[0][0].onOk();
      });

      await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalledTimes(2));
      expect(message.success).not.toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('returns an empty member table when the current user has no role', async () => {
    render(<ReviewMember userData={{ user_id: 'no-role', role: '' as any }} />);

    await waitFor(() => expect(screen.getByTestId('protable')).toBeInTheDocument());

    expect(mockGetUserManageTableData).not.toHaveBeenCalled();
    expect(screen.queryByTestId('row-member@example.com')).not.toBeInTheDocument();
  });

  it('falls back to an empty table when the request throws and closes the drawer via onClose', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetUserManageTableData.mockRejectedValueOnce(new Error('members crashed'));

    try {
      render(<ReviewMember userData={{ user_id: 'admin-1', role: 'review-admin' }} />);

      await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled());
      expect(screen.queryByTestId('row-member@example.com')).not.toBeInTheDocument();

      mockGetUserManageTableData.mockResolvedValueOnce({
        success: true,
        data: [
          {
            email: 'member@example.com',
            pendingCount: 2,
            reviewedCount: 5,
            display_name: 'Member One',
            role: 'review-member',
            user_id: 'user-2',
            team_id: 'team-1',
          },
        ],
        total: 1,
      });

      await act(async () => {
        await screen.getByTestId('protable');
      });

      await userEvent.click(screen.getByRole('button', { name: 'plus' }));
      await userEvent.click(screen.getByRole('button', { name: 'modal-success' }));
      await waitFor(() => expect(mockGetUserManageTableData).toHaveBeenCalledTimes(2));

      await userEvent.click(screen.getByText('2'));
      expect(screen.getByTestId('drawer')).toHaveAttribute('data-container', 'body');

      await userEvent.click(screen.getByRole('button', { name: 'drawer-on-close' }));
      expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('renders an empty role label for unexpected member roles', async () => {
    mockGetUserManageTableData.mockResolvedValueOnce({
      success: true,
      data: [
        {
          email: 'unknown@example.com',
          pendingCount: 0,
          reviewedCount: 0,
          display_name: 'Unknown Role User',
          role: 'unknown-role',
          user_id: 'user-unknown',
          team_id: 'team-3',
        },
      ],
      total: 1,
    });

    render(<ReviewMember userData={{ user_id: 'admin-1', role: 'review-admin' }} />);

    await waitFor(() => expect(mockGetUserManageTableData).toHaveBeenCalled());

    expect(screen.getByTestId('row-unknown@example.com')).toHaveTextContent('unknown@example.com');
    expect(screen.getByTestId('row-unknown@example.com')).not.toHaveTextContent('Admin');
    expect(screen.getByTestId('row-unknown@example.com')).not.toHaveTextContent('Member');
  });
});
