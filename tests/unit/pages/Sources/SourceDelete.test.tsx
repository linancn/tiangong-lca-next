// @ts-nocheck
import SourceDelete from '@/pages/Sources/Components/delete';
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
      { children, onClick, icon, disabled, type = 'button', ...rest }: any,
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
      <div role='dialog' aria-label={label}>
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

  const theme = {
    useToken: () => ({
      token: {
        colorPrimary: '#1677ff',
        colorTextDescription: '#8c8c8c',
      },
    }),
  };

  return {
    __esModule: true,
    Button,
    ConfigProvider,
    Modal,
    Tooltip,
    message,
    theme,
  };
});

const getMockAntdMessage = () => jest.requireMock('antd').message as Record<string, jest.Mock>;

jest.mock('@/services/sources/api', () => ({
  __esModule: true,
  deleteSource: jest.fn(),
  getSourceDetail: jest.fn(),
}));

jest.mock('@/services/sources/util', () => ({
  __esModule: true,
  genSourceFromData: jest.fn(() => ({
    sourceInformation: {
      dataSetInformation: {
        referenceToDigitalFile: [{ '@uri': '../sources/file-to-delete.pdf' }],
      },
    },
  })),
}));

jest.mock('@/services/supabase/storage', () => ({
  __esModule: true,
  getThumbFileUrls: jest.fn(() =>
    Promise.resolve([
      { uid: '../sources/file-to-delete.pdf', url: 'https://cdn/file-to-delete.pdf' },
    ]),
  ),
  removeFile: jest.fn(() => Promise.resolve({ error: null })),
}));

jest.mock('@/services/supabase/key', () => ({
  __esModule: true,
  supabaseStorageBucket: 'sources',
}));

const { deleteSource: mockDeleteSource, getSourceDetail: mockGetSourceDetail } =
  jest.requireMock('@/services/sources/api');
const { removeFile: mockRemoveFile } = jest.requireMock('@/services/supabase/storage');

describe('SourceDelete component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteSource.mockResolvedValue({ status: 204 });
    mockGetSourceDetail.mockResolvedValue({
      data: {
        json: {
          sourceDataSet: {},
        },
      },
    });
    Object.values(getMockAntdMessage()).forEach((fn) => fn.mockClear());
  });

  it('deletes source with associated files and reloads table', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };
    const setViewDrawerVisible = jest.fn();

    renderWithProviders(
      <SourceDelete
        id='source-123'
        version='01.00.000'
        buttonType='icon'
        actionRef={actionRef as any}
        setViewDrawerVisible={setViewDrawerVisible}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    const modal = await screen.findByRole('dialog', { name: 'Delete' });

    await user.click(within(modal).getByRole('button', { name: 'Confirm' }));

    await waitFor(() =>
      expect(mockGetSourceDetail).toHaveBeenCalledWith('source-123', '01.00.000'),
    );
    await waitFor(() => expect(mockRemoveFile).toHaveBeenCalledWith(['file-to-delete.pdf']));
    await waitFor(() => expect(mockDeleteSource).toHaveBeenCalledWith('source-123', '01.00.000'));

    await waitFor(() =>
      expect(getMockAntdMessage().success).toHaveBeenCalledWith(
        'Selected record has been deleted.',
      ),
    );

    expect(actionRef.current.reload).toHaveBeenCalledTimes(1);
    expect(setViewDrawerVisible).toHaveBeenCalledWith(false);

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Delete' })).not.toBeInTheDocument(),
    );
  });
});
