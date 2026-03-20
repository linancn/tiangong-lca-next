/**
 * Tests for ExportData component
 * Path: src/components/ExportData/index.tsx
 */

import ExportData from '@/components/ExportData';
import { submitTidasPackageExportTask } from '@/services/tidasPackage/taskCenter';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { message } from 'antd';

type ReactNode = import('react').ReactNode;
type TidasPackageRootTable = import('@/services/general/api').TidasPackageRootTable;

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

const baseProps: {
  tableName: TidasPackageRootTable;
  id: string;
  version: string;
} = {
  tableName: 'flows',
  id: 'test-id',
  version: 'v00000001',
};

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
      sequence: 1,
      kind: 'tidas_package_export',
      state: 'running',
      phase: 'submitting',
      message: 'Submitting export task',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rootCount: 1,
    } as any);
  });

  it('submits a ZIP export task successfully for a selected root dataset', async () => {
    renderComponent();

    expect(screen.getByTestId(EXPORT_SPINNER_TEST_ID)).toHaveAttribute('data-spinning', 'false');

    clickExportButton();

    expect(mockedSubmitTidasPackageExportTask).toHaveBeenCalledWith({
      roots: [
        {
          table: baseProps.tableName,
          id: baseProps.id,
          version: baseProps.version,
        },
      ],
    });

    await waitFor(() => {
      expect(mockMessage.success).toHaveBeenCalledTimes(1);
    });

    expect(mockMessage.success.mock.calls[0][0]).toBe(
      'Export task submitted. Check the task center for progress and download.',
    );
    expect(mockMessage.error).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByTestId(EXPORT_SPINNER_TEST_ID)).toHaveAttribute('data-spinning', 'false');
    });
  });

  it('uses lifecyclemodels as the export root table when exporting lifecycle models', async () => {
    renderComponent({ tableName: 'lifecyclemodels' as const });
    clickExportButton();

    await waitFor(() => {
      expect(mockMessage.success).toHaveBeenCalledTimes(1);
    });

    expect(mockedSubmitTidasPackageExportTask).toHaveBeenCalledWith({
      roots: [
        {
          table: 'lifecyclemodels',
          id: baseProps.id,
          version: baseProps.version,
        },
      ],
    });
  });

  it('shows error feedback when task submission throws', async () => {
    mockedSubmitTidasPackageExportTask.mockImplementation(() => {
      throw new Error('failure');
    });

    renderComponent();
    clickExportButton();

    await waitFor(() => {
      expect(mockMessage.error).toHaveBeenCalledTimes(1);
    });

    expect(mockMessage.error.mock.calls[0][0]).toBe('failure');
    expect(mockMessage.success).not.toHaveBeenCalled();
  });
});
