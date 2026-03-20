// @ts-nocheck
import PropertyDelete from '@/pages/Flows/Components/Property/delete';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../../../helpers/testUtils';

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
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  DeleteOutlined: () => <span>delete</span>,
}));

jest.mock('antd', () => {
  const message = {
    success: jest.fn(),
    error: jest.fn(),
  };

  const ConfigProvider = ({ children }: any) => <>{children}</>;
  const Button = ({ children, onClick, disabled, icon }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {icon}
      {toText(children)}
    </button>
  );
  const Tooltip = ({ children }: any) => <>{children}</>;
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

const { message: mockAntdMessage } = jest.requireMock('antd');

describe('FlowPropertyDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes the selected property, reindexes the list, and reloads the table', async () => {
    const onData = jest.fn();
    const actionRef = { current: { reload: jest.fn() } };
    const setViewDrawerVisible = jest.fn();

    renderWithProviders(
      <PropertyDelete
        id='1'
        data={
          [
            { '@dataSetInternalID': '0', meanValue: '1' },
            { '@dataSetInternalID': '1', meanValue: '10' },
            { '@dataSetInternalID': '2', meanValue: '20' },
          ] as any
        }
        buttonType='text'
        actionRef={actionRef as any}
        setViewDrawerVisible={setViewDrawerVisible}
        onData={onData}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(onData).toHaveBeenCalledWith([
      { '@dataSetInternalID': '0', meanValue: '1' },
      { '@dataSetInternalID': '1', meanValue: '20' },
    ]);
    expect(mockAntdMessage.success).toHaveBeenCalledWith('Selected record has been deleted.');
    expect(setViewDrawerVisible).toHaveBeenCalledWith(false);
    expect(actionRef.current.reload).toHaveBeenCalled();
  });

  it('closes without deleting when cancel is clicked', async () => {
    const onData = jest.fn();
    const actionRef = { current: { reload: jest.fn() } };
    const setViewDrawerVisible = jest.fn();

    renderWithProviders(
      <PropertyDelete
        id='1'
        data={[{ '@dataSetInternalID': '1', meanValue: '10' }] as any}
        buttonType='icon'
        actionRef={actionRef as any}
        setViewDrawerVisible={setViewDrawerVisible}
        onData={onData}
      />,
    );

    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onData).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
