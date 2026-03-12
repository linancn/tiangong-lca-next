// @ts-nocheck
import ReviewMember from '@/pages/Review/Components/ReviewMember';
import userEvent from '@testing-library/user-event';
import { act, render, screen, waitFor } from '../../../../helpers/testUtils';

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

  const Drawer = ({ open, title, children, extra }: any) =>
    open ? (
      <section data-testid='drawer'>
        <header>{toText(title)}</header>
        <div>{extra}</div>
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

    await waitFor(() => expect(mockDelRoleApi).toHaveBeenCalledWith('team-1', 'user-2'));
    expect(message.success).toHaveBeenCalledWith('Action success!');
  });

  it('keeps admin-only controls disabled for review members', async () => {
    render(<ReviewMember userData={{ user_id: 'member-1', role: 'review-member' }} />);

    await waitFor(() => expect(mockGetUserManageTableData).toHaveBeenCalled());

    expect(screen.getByRole('button', { name: 'plus' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'delete' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'crown' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'user' })).toBeDisabled();
  });
});
