import ExportData from '@/components/ExportData';
import { submitTidasPackageExportTask } from '@/services/tidasPackage/taskCenter';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { message } from 'antd';

type ReactNode = import('react').ReactNode;

type MockMessage = Record<'success' | 'error' | 'info' | 'warning' | 'loading', jest.Mock>;

type ButtonProps = {
  onClick?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
};

const EXPORT_BUTTON_TEST_ID = 'export-button';
const EXPORT_SPINNER_TEST_ID = 'export-spinner';

jest.mock('@ant-design/icons', () => ({
  DownloadOutlined: () => <span data-testid='download-icon' />,
}));

jest.mock('@umijs/max', () => ({
  FormattedMessage: ({ defaultMessage }: { defaultMessage: string }) => (
    <span>{defaultMessage}</span>
  ),
  useIntl: () => ({
    formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
  }),
}));

jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  const mockMessage: MockMessage = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
  };

  const Button = ({ onClick, disabled, icon, children }: ButtonProps) => (
    <button type='button' onClick={onClick} disabled={disabled} data-testid={EXPORT_BUTTON_TEST_ID}>
      {icon}
      {children}
    </button>
  );

  const Spin = ({ spinning, children }: { spinning: boolean; children?: ReactNode }) => (
    <div data-testid={EXPORT_SPINNER_TEST_ID} data-spinning={spinning ? 'true' : 'false'}>
      {children}
    </div>
  );

  const Tooltip = ({ children }: { children?: ReactNode }) => <>{children}</>;

  return {
    ...actual,
    Button,
    Spin,
    Tooltip,
    message: mockMessage,
  };
});

jest.mock('@/services/tidasPackage/taskCenter', () => ({
  submitTidasPackageExportTask: jest.fn(),
}));

const mockedSubmitTidasPackageExportTask = jest.mocked(submitTidasPackageExportTask);
const mockMessage = message as unknown as MockMessage;

const baseProps = {
  tableName: 'flows',
  id: 'test-id',
  version: 'v00000001',
} as const;

const renderComponent = (props: Partial<typeof baseProps> = {}) =>
  render(<ExportData {...baseProps} {...props} />);

const clickExportButton = () => {
  fireEvent.click(screen.getByTestId(EXPORT_BUTTON_TEST_ID));
};

describe('ExportData Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSubmitTidasPackageExportTask.mockReturnValue({
      id: 'task-1',
    } as any);
  });

  it('submits a background export task and shows success feedback', async () => {
    renderComponent();

    expect(screen.getByTestId(EXPORT_SPINNER_TEST_ID)).toHaveAttribute('data-spinning', 'false');

    clickExportButton();

    expect(mockedSubmitTidasPackageExportTask).toHaveBeenCalledWith({
      roots: [
        {
          table: 'flows',
          id: 'test-id',
          version: 'v00000001',
        },
      ],
    });

    await waitFor(() =>
      expect(mockMessage.success).toHaveBeenCalledWith(
        'Export task submitted. Check the task center for progress and download.',
      ),
    );
    expect(mockMessage.error).not.toHaveBeenCalled();
    expect(screen.getByTestId(EXPORT_SPINNER_TEST_ID)).toHaveAttribute('data-spinning', 'false');
  });

  it('uses the provided root table when submitting lifecycle model exports', async () => {
    renderComponent({ tableName: 'lifecyclemodels' });

    clickExportButton();

    expect(mockedSubmitTidasPackageExportTask).toHaveBeenCalledWith({
      roots: [
        {
          table: 'lifecyclemodels',
          id: 'test-id',
          version: 'v00000001',
        },
      ],
    });
    await waitFor(() => expect(mockMessage.success).toHaveBeenCalledTimes(1));
  });

  it('shows the thrown error message when task submission throws an Error', async () => {
    mockedSubmitTidasPackageExportTask.mockImplementationOnce(() => {
      throw new Error('network down');
    });

    renderComponent();
    clickExportButton();

    await waitFor(() => expect(mockMessage.error).toHaveBeenCalledWith('network down'));
    expect(mockMessage.success).not.toHaveBeenCalled();
  });

  it('falls back to the generic export error message for non-Error throws', async () => {
    mockedSubmitTidasPackageExportTask.mockImplementationOnce(() => {
      throw 'non-error failure';
    });

    renderComponent();
    clickExportButton();

    await waitFor(() => expect(mockMessage.error).toHaveBeenCalledWith('Export data failed'));
    expect(mockMessage.success).not.toHaveBeenCalled();
  });
});
