// @ts-nocheck
import FlowpropertiesDelete from '@/pages/Flowproperties/Components/delete';
import userEvent from '@testing-library/user-event';
import { act, renderWithProviders, screen, waitFor } from '../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

const mockIntl = {
  locale: 'en-US',
  formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
};

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => mockIntl,
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  DeleteOutlined: () => <span>delete</span>,
}));

jest.mock('antd', () => {
  const React = require('react');

  const message = {
    success: jest.fn(),
    error: jest.fn(),
  };

  const ConfigProvider = ({ children }: any) => <div>{children}</div>;

  const Button = ({ children, onClick, disabled, icon, ...rest }: any) => (
    <button type='button' onClick={disabled ? undefined : onClick} disabled={disabled} {...rest}>
      {icon}
      {children}
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

  return {
    __esModule: true,
    Button,
    Tooltip,
    Modal,
    message,
    ConfigProvider,
  };
});

const mockDeleteFlowproperties = jest.fn(async () => ({ status: 204 }));

jest.mock('@/services/flowproperties/api', () => ({
  __esModule: true,
  deleteFlowproperties: (...args: any[]) => mockDeleteFlowproperties(...args),
}));

describe('FlowpropertiesDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes flow property and reloads table', async () => {
    const actionRef = { current: { reload: jest.fn() } };
    const setViewDrawerVisible = jest.fn();

    await act(async () => {
      renderWithProviders(
        <FlowpropertiesDelete
          id='fp-1'
          version='1.0.0'
          buttonType='text'
          actionRef={actionRef as any}
          setViewDrawerVisible={setViewDrawerVisible}
        />,
      );
    });

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));

    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => expect(mockDeleteFlowproperties).toHaveBeenCalledWith('fp-1', '1.0.0'));

    const { message } = jest.requireMock('antd');
    expect(message.success).toHaveBeenCalledWith('Selected record has been deleted.');
    expect(setViewDrawerVisible).toHaveBeenCalledWith(false);
    expect(actionRef.current.reload).toHaveBeenCalledTimes(1);
  });
});
