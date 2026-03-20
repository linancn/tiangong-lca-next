import ImportTidasPackage from '@/components/ImportTidasPackage';
import { importTidasPackageApi } from '@/services/general/api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { message, Modal } from 'antd';

type ReactNode = import('react').ReactNode;

type MockMessage = Record<'success' | 'error' | 'info' | 'warning' | 'loading', jest.Mock>;

type ModalProps = {
  open?: boolean;
  children?: ReactNode;
  onOk?: () => void;
  onCancel?: () => void;
};

type UploadDraggerProps = {
  beforeUpload?: (file: File) => boolean;
  onRemove?: () => void;
  children?: ReactNode;
};

const OPEN_BUTTON_TEST_ID = 'import-open-button';
const MODAL_OK_TEST_ID = 'import-modal-ok';
const PICK_FILE_TEST_ID = 'import-pick-file';

jest.mock('@ant-design/icons', () => ({
  CloudUploadOutlined: ({ onClick }: { onClick?: () => void }) => (
    <button type='button' data-testid={OPEN_BUTTON_TEST_ID} onClick={onClick} />
  ),
  InboxOutlined: () => <span data-testid='inbox-icon' />,
}));

jest.mock('umi', () => ({
  FormattedMessage: ({
    defaultMessage,
    values,
  }: {
    defaultMessage: string;
    values?: Record<string, any>;
  }) => {
    if (!values) {
      return <span>{defaultMessage}</span>;
    }

    const rendered = Object.entries(values).reduce(
      (output, [key, value]) => output.replace(`{${key}}`, String(value)),
      defaultMessage,
    );

    return <span>{rendered}</span>;
  },
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

  const modalApi = {
    info: jest.fn(),
    error: jest.fn(),
  };

  const Tooltip = ({ children }: { children?: ReactNode }) => <>{children}</>;
  const ModalComponent = ({ open, children, onOk, onCancel }: ModalProps) =>
    open ? (
      <div data-testid='import-modal'>
        <button type='button' data-testid={MODAL_OK_TEST_ID} onClick={onOk} />
        <button type='button' data-testid='import-modal-cancel' onClick={onCancel} />
        {children}
      </div>
    ) : null;

  const uploadFile = new File(['zip'], 'package.zip', { type: 'application/zip' });
  const Dragger = ({ beforeUpload, onRemove, children }: UploadDraggerProps) => (
    <div>
      <button
        type='button'
        data-testid={PICK_FILE_TEST_ID}
        onClick={() => {
          beforeUpload?.(uploadFile);
        }}
      />
      <button
        type='button'
        data-testid='remove-file'
        onClick={() => {
          onRemove?.();
        }}
      />
      {children}
    </div>
  );

  const Upload = {
    Dragger,
  };

  return {
    ...actual,
    Modal: Object.assign(ModalComponent, modalApi),
    Tooltip,
    Upload,
    message: mockMessage,
  };
});

jest.mock('@/services/general/api', () => ({
  importTidasPackageApi: jest.fn(),
}));

const mockedImportTidasPackageApi = jest.mocked(importTidasPackageApi);
const mockMessage = message as unknown as MockMessage;
const modalApi = Modal as any;

describe('ImportTidasPackage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('warns when import is triggered without selecting a file', async () => {
    render(<ImportTidasPackage />);

    fireEvent.click(screen.getByTestId(OPEN_BUTTON_TEST_ID));
    fireEvent.click(screen.getByTestId(MODAL_OK_TEST_ID));

    await waitFor(() => {
      expect(mockMessage.warning).toHaveBeenCalledTimes(1);
    });

    expect(mockedImportTidasPackageApi).not.toHaveBeenCalled();
  });

  it('imports a ZIP package successfully and refreshes listeners', async () => {
    const onImported = jest.fn();
    const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');

    mockedImportTidasPackageApi.mockResolvedValue({
      data: {
        ok: true,
        code: 'IMPORTED',
        message: 'ok',
        summary: {
          total_entries: 1,
          filtered_open_data_count: 0,
          user_conflict_count: 0,
          importable_count: 1,
          imported_count: 1,
        },
        filtered_open_data: [],
        user_conflicts: [],
      },
      error: null,
    } as any);

    render(<ImportTidasPackage onImported={onImported} />);

    fireEvent.click(screen.getByTestId(OPEN_BUTTON_TEST_ID));
    fireEvent.click(screen.getByTestId(PICK_FILE_TEST_ID));
    fireEvent.click(screen.getByTestId(MODAL_OK_TEST_ID));

    await waitFor(() => {
      expect(mockMessage.success).toHaveBeenCalledTimes(1);
    });

    expect(mockedImportTidasPackageApi).toHaveBeenCalledTimes(1);
    expect(onImported).toHaveBeenCalledTimes(1);
    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(Event));
    expect(modalApi.info).not.toHaveBeenCalled();

    dispatchEventSpy.mockRestore();
  });

  it('shows conflict details when the import is rejected by user data conflicts', async () => {
    mockedImportTidasPackageApi.mockResolvedValue({
      data: {
        ok: false,
        code: 'USER_DATA_CONFLICT',
        message: 'conflict',
        summary: {
          total_entries: 2,
          filtered_open_data_count: 0,
          user_conflict_count: 1,
          importable_count: 0,
          imported_count: 0,
        },
        filtered_open_data: [],
        user_conflicts: [
          {
            table: 'flows',
            id: 'flow-1',
            version: '01.00.000',
            state_code: 10,
          },
        ],
      },
      error: null,
    } as any);

    render(<ImportTidasPackage />);

    fireEvent.click(screen.getByTestId(OPEN_BUTTON_TEST_ID));
    fireEvent.click(screen.getByTestId(PICK_FILE_TEST_ID));
    fireEvent.click(screen.getByTestId(MODAL_OK_TEST_ID));

    await waitFor(() => {
      expect(modalApi.error).toHaveBeenCalledTimes(1);
    });

    expect(mockMessage.success).not.toHaveBeenCalled();
    expect(mockedImportTidasPackageApi).toHaveBeenCalledTimes(1);
  });
});
