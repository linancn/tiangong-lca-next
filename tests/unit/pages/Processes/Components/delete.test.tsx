// @ts-nocheck
import ProcessDelete from '@/pages/Processes/Components/delete';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

const mockDeleteProcess = jest.fn();

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  deleteProcess: (...args: any[]) => mockDeleteProcess(...args),
}));

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  DeleteOutlined: () => <span>delete-icon</span>,
}));

jest.mock('antd', () => {
  const Button = ({ children, onClick, disabled, icon }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {icon}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ children }: any) => <>{children}</>;

  const Modal = ({ open, title, children, onOk, onCancel, confirmLoading }: any) => {
    if (!open) return null;
    const label = toText(title) || 'modal';
    return (
      <section role='dialog' aria-label={label} data-loading={confirmLoading}>
        <div>{toText(children)}</div>
        <button type='button' onClick={onOk}>
          Confirm
        </button>
        <button type='button' onClick={onCancel}>
          Cancel
        </button>
      </section>
    );
  };

  const message = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
  };

  return {
    __esModule: true,
    Button,
    Tooltip,
    Modal,
    message,
  };
});

const { message: mockAntdMessage } = jest.requireMock('antd');

describe('ProcessDelete component', () => {
  const actionRef = { current: { reload: jest.fn() } };
  const setViewDrawerVisible = jest.fn();

  const defaultProps = {
    id: 'process-1',
    version: '1.0.0',
    buttonType: 'icon',
    actionRef,
    setViewDrawerVisible,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    actionRef.current.reload.mockClear();
  });

  it('confirms deletion successfully', async () => {
    mockDeleteProcess.mockResolvedValue({ status: 204 });

    render(<ProcessDelete {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(mockAntdMessage.success).toHaveBeenCalled();
    });

    expect(mockDeleteProcess).toHaveBeenCalledWith('process-1', '1.0.0');
    expect(setViewDrawerVisible).toHaveBeenCalledWith(false);
    expect(actionRef.current.reload).toHaveBeenCalled();
  });

  it('shows error message when delete fails', async () => {
    mockDeleteProcess.mockResolvedValue({
      status: 400,
      error: { message: 'Delete failed' },
    });

    render(<ProcessDelete {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(mockAntdMessage.error).toHaveBeenCalledWith('Delete failed');
    });
  });

  it('hides modal when cancel is clicked', () => {
    render(<ProcessDelete {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
