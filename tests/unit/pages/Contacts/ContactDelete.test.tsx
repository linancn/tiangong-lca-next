// @ts-nocheck
import ContactDelete from '@/pages/Contacts/Components/delete';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor, within } from '../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    locale: 'en-US',
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
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
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
  };

  const Button = React.forwardRef(
    (
      { children, onClick, disabled, icon, type = 'button', ...rest }: any,
      ref: React.Ref<HTMLButtonElement>,
    ) => (
      <button
        ref={ref}
        type='button'
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        data-button-type={type}
        {...rest}
      >
        {icon}
        {children}
      </button>
    ),
  );
  Button.displayName = 'MockButton';

  const Tooltip = ({ title, children }: any) => {
    const label = toText(title);
    if (React.isValidElement(children)) {
      return React.cloneElement(children, {
        'aria-label': children.props['aria-label'] ?? label,
      });
    }
    return <span title={label}>{children}</span>;
  };

  const Modal = ({ open, title, onOk, onCancel, children }: any) => {
    if (!open) return null;
    const label = toText(title) || 'modal';
    return (
      <div role='alertdialog' aria-label={label}>
        <div>{children}</div>
        <button type='button' onClick={onOk}>
          Confirm
        </button>
        <button type='button' onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  };

  const ConfigProvider = ({ children }: any) => <>{children}</>;

  return {
    __esModule: true,
    Button,
    ConfigProvider,
    Modal,
    Tooltip,
    message,
  };
});

const getMockAntdMessage = () => jest.requireMock('antd').message as Record<string, jest.Mock>;

jest.mock('@ant-design/pro-components', () => ({
  __esModule: true,
}));

jest.mock('@/services/contacts/api', () => ({
  __esModule: true,
  deleteContact: jest.fn(),
}));

const { deleteContact: mockDeleteContact } = jest.requireMock('@/services/contacts/api');

describe('ContactDelete component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteContact.mockResolvedValue({ status: 204 });
    Object.values(getMockAntdMessage()).forEach((fn) => fn.mockClear());
  });

  it('confirms deletion and reloads table', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };
    const setViewDrawerVisible = jest.fn();

    renderWithProviders(
      <ContactDelete
        id='contact-delete'
        version='01.00.000'
        buttonType='icon'
        actionRef={actionRef as any}
        setViewDrawerVisible={setViewDrawerVisible}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    const modal = await screen.findByRole('alertdialog', { name: 'Delete Contact' });
    await user.click(within(modal).getByRole('button', { name: 'Confirm' }));

    await waitFor(() =>
      expect(mockDeleteContact).toHaveBeenCalledWith('contact-delete', '01.00.000'),
    );

    await waitFor(() =>
      expect(getMockAntdMessage().success).toHaveBeenCalledWith(
        'Selected record has been deleted.',
      ),
    );
    expect(actionRef.current.reload).toHaveBeenCalledTimes(1);
    expect(setViewDrawerVisible).toHaveBeenCalledWith(false);
  });
});
