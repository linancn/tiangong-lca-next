import ExportTidasPackage from '@/components/ExportTidasPackage';
import { getSystemUserRoleApi } from '@/services/roles/api';
import { submitTidasPackageExportTask } from '@/services/tidasPackage/taskCenter';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { message } from 'antd';

type ReactNode = import('react').ReactNode;

type ModalProps = {
  open?: boolean;
  children?: ReactNode;
  onOk?: () => void;
  onCancel?: () => void;
};

type RadioGroupProps = {
  value?: string;
  onChange?: (event: { target: { value: string } }) => void;
  children?: ReactNode;
};

type MockMessage = Record<'success' | 'error' | 'info' | 'warning' | 'loading', jest.Mock>;

const OPEN_BUTTON_TEST_ID = 'export-open-button';
const OK_BUTTON_TEST_ID = 'export-ok-button';
const CANCEL_BUTTON_TEST_ID = 'export-cancel-button';
const OPTION_PREFIX = 'scope-option-';

jest.mock('@ant-design/icons', () => ({
  CloudDownloadOutlined: ({ onClick }: { onClick?: () => void }) => (
    <button type='button' data-testid={OPEN_BUTTON_TEST_ID} onClick={onClick} />
  ),
}));

jest.mock('umi', () => ({
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

  const Tooltip = ({ children }: { children?: ReactNode }) => <>{children}</>;
  const Spin = ({ children }: { children?: ReactNode }) => <>{children}</>;
  const Modal = ({ open, children, onOk, onCancel }: ModalProps) =>
    open ? (
      <div data-testid='export-modal'>
        <button type='button' data-testid={OK_BUTTON_TEST_ID} onClick={onOk} />
        <button type='button' data-testid={CANCEL_BUTTON_TEST_ID} onClick={onCancel} />
        {children}
      </div>
    ) : null;
  const Radio = ({ value, children }: { value: string; children?: ReactNode }) => (
    <div data-testid={`${OPTION_PREFIX}${value}`}>{children}</div>
  );
  const RadioGroup = ({ value, onChange, children }: RadioGroupProps) => (
    <div data-testid='scope-group' data-value={value}>
      {children}
      <button
        type='button'
        data-testid='set-open-data'
        onClick={() => onChange?.({ target: { value: 'open_data' } })}
      />
      <button
        type='button'
        data-testid='set-open-and-user'
        onClick={() => onChange?.({ target: { value: 'current_user_and_open_data' } })}
      />
    </div>
  );
  (Radio as any).Group = RadioGroup;

  return {
    ...actual,
    message: mockMessage,
    Modal,
    Radio,
    Spin,
    Tooltip,
  };
});

jest.mock('@/services/roles/api', () => ({
  getSystemUserRoleApi: jest.fn(),
}));

jest.mock('@/services/tidasPackage/taskCenter', () => ({
  submitTidasPackageExportTask: jest.fn(),
}));

const mockedGetSystemUserRoleApi = jest.mocked(getSystemUserRoleApi);
const mockedSubmitTidasPackageExportTask = jest.mocked(submitTidasPackageExportTask);
const mockMessage = message as unknown as MockMessage;

describe('ExportTidasPackage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetSystemUserRoleApi.mockResolvedValue({ role: 'viewer' } as any);
  });

  it('shows current-user scope for non-admin users and submits default scope', async () => {
    render(<ExportTidasPackage />);
    fireEvent.click(screen.getByTestId(OPEN_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(screen.getByTestId(`${OPTION_PREFIX}current_user`)).toBeInTheDocument();
    });

    expect(screen.queryByTestId(`${OPTION_PREFIX}open_data`)).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(`${OPTION_PREFIX}current_user_and_open_data`),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId(OK_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(mockedSubmitTidasPackageExportTask).toHaveBeenCalledWith({ scope: 'current_user' });
    });
    expect(mockMessage.success).toHaveBeenCalledTimes(1);
  });

  it('supports admin scopes and submits selected value', async () => {
    mockedGetSystemUserRoleApi.mockResolvedValueOnce({ role: 'admin' } as any);

    render(<ExportTidasPackage />);
    fireEvent.click(screen.getByTestId(OPEN_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(screen.getByTestId(`${OPTION_PREFIX}open_data`)).toBeInTheDocument();
      expect(screen.getByTestId(`${OPTION_PREFIX}current_user_and_open_data`)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('set-open-and-user'));
    fireEvent.click(screen.getByTestId(OK_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(mockedSubmitTidasPackageExportTask).toHaveBeenCalledWith({
        scope: 'current_user_and_open_data',
      });
    });
  });

  it('supports owner role and handles submit errors with fallback message', async () => {
    mockedGetSystemUserRoleApi.mockResolvedValueOnce({ role: 'owner' } as any);
    mockedSubmitTidasPackageExportTask.mockImplementationOnce(() => {
      throw undefined;
    });

    render(<ExportTidasPackage />);
    fireEvent.click(screen.getByTestId(OPEN_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(screen.getByTestId(`${OPTION_PREFIX}open_data`)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('set-open-data'));
    fireEvent.click(screen.getByTestId(OK_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(mockMessage.error).toHaveBeenCalledWith('Failed to export TIDAS package');
    });
  });

  it('ignores late role responses after unmount and supports explicit cancel', async () => {
    let resolveRole: (value: any) => void = () => {};
    mockedGetSystemUserRoleApi.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRole = resolve;
        }) as any,
    );

    const { unmount } = render(<ExportTidasPackage />);
    unmount();
    await act(async () => {
      resolveRole({ role: 'admin' });
      await Promise.resolve();
    });

    render(<ExportTidasPackage />);
    fireEvent.click(screen.getByTestId(OPEN_BUTTON_TEST_ID));
    fireEvent.click(screen.getByTestId(CANCEL_BUTTON_TEST_ID));

    expect(screen.queryByTestId('export-modal')).not.toBeInTheDocument();
  });

  it('keeps modal open during loading cancel guard and then closes after settle', async () => {
    mockedSubmitTidasPackageExportTask.mockImplementationOnce(() => {
      throw new Error('boom');
    });

    render(<ExportTidasPackage />);
    fireEvent.click(screen.getByTestId(OPEN_BUTTON_TEST_ID));
    fireEvent.click(screen.getByTestId(OK_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(mockMessage.error).toHaveBeenCalledWith('boom');
    });

    fireEvent.click(screen.getByTestId(CANCEL_BUTTON_TEST_ID));
    expect(screen.queryByTestId('export-modal')).not.toBeInTheDocument();
  });
});
