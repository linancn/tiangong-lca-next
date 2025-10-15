// @ts-nocheck
import ProcessExchangeDelete from '@/pages/Processes/Components/Exchange/delete';
import { fireEvent, render, screen } from '@testing-library/react';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

jest.mock('antd', () => {
  const React = require('react');

  const Button = ({ children, onClick, disabled, icon }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {icon ? <span data-testid='icon-button'>{icon}</span> : null}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ children }: any) => <>{children}</>;

  const Modal = ({ open, title, children, onOk, onCancel }: any) => {
    if (!open) return null;

    const label = toText(title) || 'modal';
    return (
      <div role='dialog' aria-label={label}>
        <div>{toText(children)}</div>
        <button type='button' onClick={onOk}>
          Confirm
        </button>
        <button type='button' onClick={onCancel}>
          Cancel
        </button>
      </div>
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

const mockIntl = {
  formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
};

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => mockIntl,
}));

describe('ProcessExchangeDelete', () => {
  const baseProps = {
    id: '1',
    buttonType: 'icon',
    data: [
      { '@dataSetInternalID': '0', name: 'first' },
      { '@dataSetInternalID': '1', name: 'second' },
      { '@dataSetInternalID': '2', name: 'third' },
    ],
    setViewDrawerVisible: jest.fn(),
    onData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('disables delete button when disabled prop is true', () => {
    render(<ProcessExchangeDelete {...baseProps} disabled />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('removes exchange and shows success message on confirm', () => {
    const onData = jest.fn();
    const setViewDrawerVisible = jest.fn();

    render(
      <ProcessExchangeDelete
        {...baseProps}
        onData={onData}
        setViewDrawerVisible={setViewDrawerVisible}
      />,
    );

    fireEvent.click(screen.getByRole('button'));

    const dialog = screen.getByRole('dialog', { name: 'Delete' });
    expect(dialog).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onData).toHaveBeenCalledWith([
      { '@dataSetInternalID': '0', name: 'first' },
      { '@dataSetInternalID': '1', name: 'third' },
    ]);
    expect(mockAntdMessage.success).toHaveBeenCalledWith('Selected record has been deleted.');
    expect(setViewDrawerVisible).toHaveBeenCalledWith(false);
  });

  it('closes dialog without deleting when cancel is clicked', () => {
    const onData = jest.fn();

    render(<ProcessExchangeDelete {...baseProps} onData={onData} />);

    fireEvent.click(screen.getByRole('button'));

    const dialog = screen.getByRole('dialog', { name: 'Delete' });
    expect(dialog).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onData).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Delete' })).not.toBeInTheDocument();
  });
});
