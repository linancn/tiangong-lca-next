// @ts-nocheck
import FlowsDelete from '@/pages/Flows/Components/delete';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

const mockDeleteFlows = jest.fn(async () => ({ status: 204 }));

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  deleteFlows: (...args: any[]) => mockDeleteFlows(...args),
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

jest.mock('@ant-design/pro-components', () => ({
  __esModule: true,
  ActionType: class {},
}));

jest.mock('antd', () => {
  const React = require('react');

  const message = {
    success: jest.fn(),
    error: jest.fn(),
  };

  const ConfigProvider = ({ children }: any) => <>{children}</>;
  const Button = ({ children, onClick, disabled, icon, ...rest }: any) => (
    <button type='button' onClick={disabled ? undefined : onClick} disabled={disabled} {...rest}>
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
  const Modal = ({ open, title, children, onOk, onCancel }: any) =>
    open ? (
      <section role='dialog' aria-label={toText(title) || 'modal'}>
        <div>{toText(children)}</div>
        <button type='button' onClick={onCancel}>
          Cancel
        </button>
        <button type='button' onClick={onOk}>
          Confirm
        </button>
      </section>
    ) : null;

  return {
    __esModule: true,
    Button,
    ConfigProvider,
    Modal,
    Tooltip,
    message,
  };
});

describe('FlowsDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes the selected flow and reloads the table', async () => {
    const actionRef = { current: { reload: jest.fn() } };
    const setViewDrawerVisible = jest.fn();

    renderWithProviders(
      <FlowsDelete
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        actionRef={actionRef as any}
        setViewDrawerVisible={setViewDrawerVisible}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => expect(mockDeleteFlows).toHaveBeenCalledWith('flow-1', '1.0.0'));

    const { message } = jest.requireMock('antd');
    expect(message.success).toHaveBeenCalledWith('Selected record has been deleted.');
    expect(setViewDrawerVisible).toHaveBeenCalledWith(false);
    expect(actionRef.current.reload).toHaveBeenCalledTimes(1);
  });

  it('shows the returned error message when deletion fails', async () => {
    mockDeleteFlows.mockResolvedValueOnce({
      status: 400,
      error: { message: 'Delete failed' },
    });

    const actionRef = { current: { reload: jest.fn() } };
    const setViewDrawerVisible = jest.fn();

    renderWithProviders(
      <FlowsDelete
        id='flow-1'
        version='1.0.0'
        buttonType='icon'
        actionRef={actionRef as any}
        setViewDrawerVisible={setViewDrawerVisible}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    const { message } = jest.requireMock('antd');
    await waitFor(() => expect(message.error).toHaveBeenCalledWith('Delete failed'));
    expect(actionRef.current.reload).not.toHaveBeenCalled();
    expect(setViewDrawerVisible).not.toHaveBeenCalled();
  });

  it('closes the modal without deleting when cancelled', async () => {
    const actionRef = { current: { reload: jest.fn() } };
    const setViewDrawerVisible = jest.fn();

    renderWithProviders(
      <FlowsDelete
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        actionRef={actionRef as any}
        setViewDrawerVisible={setViewDrawerVisible}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockDeleteFlows).not.toHaveBeenCalled();
  });
});
