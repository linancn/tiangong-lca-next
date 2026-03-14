// @ts-nocheck
import LifeCycleModelDelete from '@/pages/LifeCycleModels/Components/delete';
import userEvent from '@testing-library/user-event';
import { act, renderWithProviders, screen, waitFor } from '../../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

const mockDeleteLifeCycleModel = jest.fn(async () => ({ status: 204 }));

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
  const React = require('react');

  const ConfigProvider = ({ children }: any) => <div>{children}</div>;

  const Button = ({ children, onClick, disabled = false, icon, ...rest }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick} {...rest}>
      {icon}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ title, children }: any) => {
    const label = toText(title);
    if (React.isValidElement(children)) {
      return React.cloneElement(children, {
        'aria-label': children.props['aria-label'] ?? label,
      });
    }
    return <span title={label}>{children}</span>;
  };

  const Modal = ({ open, title, children, onOk, onCancel }: any) => {
    if (!open) return null;
    return (
      <div role='dialog' aria-label={toText(title) || 'modal'}>
        <div>{children}</div>
        <button type='button' onClick={onCancel}>
          Cancel
        </button>
        <button type='button' onClick={onOk}>
          Confirm
        </button>
      </div>
    );
  };

  const message = {
    success: jest.fn(),
    error: jest.fn(),
  };

  return {
    __esModule: true,
    Button,
    ConfigProvider,
    Modal,
    Tooltip,
    message,
  };
});

jest.mock('@/services/lifeCycleModels/api', () => ({
  __esModule: true,
  deleteLifeCycleModel: (...args: any[]) => mockDeleteLifeCycleModel(...args),
}));

describe('LifeCycleModelDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes the model and reloads the table on success', async () => {
    const actionRef = { current: { reload: jest.fn() } };
    const setViewDrawerVisible = jest.fn();

    await act(async () => {
      renderWithProviders(
        <LifeCycleModelDelete
          id='model-1'
          version='1.0.0'
          buttonType='text'
          actionRef={actionRef as any}
          setViewDrawerVisible={setViewDrawerVisible}
        />,
      );
    });

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => expect(mockDeleteLifeCycleModel).toHaveBeenCalledWith('model-1', '1.0.0'));

    const { message } = jest.requireMock('antd');
    expect(message.success).toHaveBeenCalledWith('Selected record has been deleted.');
    expect(setViewDrawerVisible).toHaveBeenCalledWith(false);
    expect(actionRef.current.reload).toHaveBeenCalledTimes(1);
  });

  it('shows the backend message when delete fails', async () => {
    mockDeleteLifeCycleModel.mockResolvedValueOnce({
      status: 400,
      error: { message: 'Delete lifecycle model failed' },
    });

    const actionRef = { current: { reload: jest.fn() } };
    const setViewDrawerVisible = jest.fn();

    await act(async () => {
      renderWithProviders(
        <LifeCycleModelDelete
          id='model-1'
          version='1.0.0'
          buttonType='icon'
          actionRef={actionRef as any}
          setViewDrawerVisible={setViewDrawerVisible}
        />,
      );
    });

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    const { message } = jest.requireMock('antd');
    await waitFor(() =>
      expect(message.error).toHaveBeenCalledWith('Delete lifecycle model failed'),
    );
    expect(actionRef.current.reload).not.toHaveBeenCalled();
    expect(setViewDrawerVisible).not.toHaveBeenCalled();
  });

  it('falls back to a generic error when delete fails without a backend message', async () => {
    mockDeleteLifeCycleModel.mockResolvedValueOnce({
      status: 500,
      error: null,
    });

    const actionRef = { current: { reload: jest.fn() } };
    const setViewDrawerVisible = jest.fn();

    await act(async () => {
      renderWithProviders(
        <LifeCycleModelDelete
          id='model-2'
          version='2.0.0'
          buttonType='text'
          actionRef={actionRef as any}
          setViewDrawerVisible={setViewDrawerVisible}
        />,
      );
    });

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    const { message } = jest.requireMock('antd');
    await waitFor(() => expect(message.error).toHaveBeenCalledWith('Error'));
    expect(actionRef.current.reload).not.toHaveBeenCalled();
    expect(setViewDrawerVisible).not.toHaveBeenCalled();
  });

  it('supports the icon trigger and closes the modal after a successful delete', async () => {
    const actionRef = { current: { reload: jest.fn() } };
    const setViewDrawerVisible = jest.fn();

    await act(async () => {
      renderWithProviders(
        <LifeCycleModelDelete
          id='model-icon'
          version='3.0.0'
          buttonType='icon'
          actionRef={actionRef as any}
          setViewDrawerVisible={setViewDrawerVisible}
        />,
      );
    });

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(screen.getByRole('dialog', { name: /delete/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() =>
      expect(mockDeleteLifeCycleModel).toHaveBeenCalledWith('model-icon', '3.0.0'),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(actionRef.current.reload).toHaveBeenCalledTimes(1);
    expect(setViewDrawerVisible).toHaveBeenCalledWith(false);
  });

  it('closes the modal without deleting when cancelled', async () => {
    const actionRef = { current: { reload: jest.fn() } };
    const setViewDrawerVisible = jest.fn();

    await act(async () => {
      renderWithProviders(
        <LifeCycleModelDelete
          id='model-1'
          version='1.0.0'
          buttonType='text'
          actionRef={actionRef as any}
          setViewDrawerVisible={setViewDrawerVisible}
        />,
      );
    });

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockDeleteLifeCycleModel).not.toHaveBeenCalled();
  });
});
