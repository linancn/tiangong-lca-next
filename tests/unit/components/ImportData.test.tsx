/**
 * Tests for ImportData component
 * Path: src/components/ImportData/index.tsx
 */

import ImportData from '@/components/ImportData';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

type ImportDataProps = {
  onJsonData: (data: unknown) => void;
  disabled?: boolean;
};

type ReactNode = import('react').ReactNode;

type MockDraggerProps = {
  beforeUpload?: (file: File) => boolean | void | Promise<boolean | void>;
  onRemove?: () => void;
  fileList?: File[];
  children?: ReactNode;
  [key: string]: unknown;
};

type MockMessage = Record<'warning' | 'error' | 'success' | 'info' | 'loading', jest.Mock>;

type MockFileReaderInstance = {
  onload: ((event: { target: { result: string } }) => void) | null;
  onerror: ((event: Event) => void) | null;
  readAsText: (file: File) => void;
};

let latestDraggerProps: MockDraggerProps | undefined;

jest.mock('@/components/ToolBarButton', () => ({
  __esModule: true,
  default: ({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) => (
    <button type='button' onClick={onClick} disabled={disabled} data-testid='import-trigger'>
      Import
    </button>
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
    warning: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    loading: jest.fn(),
  };

  const Upload = ({ children }: { children?: ReactNode }) => (
    <div data-testid='upload-container'>{children}</div>
  );

  Upload.Dragger = (props: MockDraggerProps) => {
    latestDraggerProps = props;
    return <div data-testid='upload-dragger'>{props.children}</div>;
  };

  const Modal = ({
    open,
    children,
    title,
    onOk,
    onCancel,
    okText,
    cancelText,
  }: {
    open: boolean;
    children: ReactNode;
    title: ReactNode;
    onOk: () => void;
    onCancel: () => void;
    okText?: ReactNode;
    cancelText?: ReactNode;
  }) => {
    if (!open) {
      return null;
    }

    return (
      <div data-testid='import-modal'>
        <div data-testid='modal-title'>{title}</div>
        {children}
        <button type='button' data-testid='modal-ok' onClick={onOk}>
          {okText}
        </button>
        <button type='button' data-testid='modal-cancel' onClick={onCancel}>
          {cancelText}
        </button>
      </div>
    );
  };

  return {
    ...actual,
    Upload,
    Modal,
    message: mockMessage,
  };
});

import { message } from 'antd';

const originalFileReader = (global as any).FileReader;

const mockFileReader = (options: { content?: string; shouldError?: boolean } = {}) => {
  const { content = '', shouldError = false } = options;

  const fileReaderInstance: MockFileReaderInstance = {
    onload: null,
    onerror: null,
    readAsText(file: File) {
      void file;
      if (shouldError) {
        setTimeout(() => {
          if (fileReaderInstance.onerror) {
            fileReaderInstance.onerror(new Event('error'));
          }
        }, 0);
        return;
      }

      setTimeout(() => {
        if (fileReaderInstance.onload) {
          fileReaderInstance.onload({
            target: { result: content },
          });
        }
      }, 0);
    },
  };

  (global as any).FileReader = jest.fn(() => fileReaderInstance as unknown as FileReader);

  return fileReaderInstance;
};

describe('ImportData Component', () => {
  let onJsonDataMock: jest.Mock;

  beforeEach(() => {
    latestDraggerProps = undefined;
    jest.clearAllMocks();

    onJsonDataMock = jest.fn();
  });

  afterAll(() => {
    (global as any).FileReader = originalFileReader;
  });

  const setup = (props: Partial<ImportDataProps> = {}) => {
    render(<ImportData onJsonData={onJsonDataMock} {...props} />);
  };

  const openModal = () => {
    fireEvent.click(screen.getByTestId('import-trigger'));
    expect(screen.getByTestId('import-modal')).toBeInTheDocument();
  };

  it('opens the modal when the toolbar button is clicked', () => {
    setup();

    expect(screen.queryByTestId('import-modal')).not.toBeInTheDocument();

    openModal();
  });

  it('does not open the modal when the import button is disabled', () => {
    setup({ disabled: true });

    const trigger = screen.getByTestId('import-trigger');
    expect(trigger).toBeDisabled();

    fireEvent.click(trigger);

    expect(screen.queryByTestId('import-modal')).not.toBeInTheDocument();
  });

  it('warns the user when attempting to import without selecting a file', () => {
    setup();
    openModal();

    fireEvent.click(screen.getByTestId('modal-ok'));

    expect(message.warning).toHaveBeenCalledWith('Please select a file to import');
  });

  it('accepts a valid JSON file and forwards parsed data', async () => {
    mockFileReader({ content: JSON.stringify({ flows: [] }) });
    setup();
    openModal();

    const file = new File([JSON.stringify({ flows: [] })], 'flows.json', {
      type: 'application/json',
    });

    await act(async () => {
      latestDraggerProps?.beforeUpload?.(file as any);
    });

    await waitFor(() => {
      expect(latestDraggerProps?.fileList).toHaveLength(1);
    });

    fireEvent.click(screen.getByTestId('modal-ok'));

    await waitFor(() => {
      expect(onJsonDataMock).toHaveBeenCalledWith({ flows: [] });
    });

    await waitFor(() => {
      expect(screen.queryByTestId('import-modal')).not.toBeInTheDocument();
    });

    expect(message.error).not.toHaveBeenCalled();
  });

  it('clears the selected file when the user removes it', async () => {
    setup();
    openModal();

    const file = new File(['{}'], 'data.json', { type: 'application/json' });

    await act(async () => {
      latestDraggerProps?.beforeUpload?.(file as any);
    });

    await waitFor(() => {
      expect(latestDraggerProps?.fileList).toHaveLength(1);
    });

    await act(async () => {
      latestDraggerProps?.onRemove?.();
    });

    await waitFor(() => {
      expect(latestDraggerProps?.fileList).toHaveLength(0);
    });
  });

  it('shows an error when JSON parsing fails', async () => {
    mockFileReader({ content: 'not json' });
    setup();
    openModal();

    const file = new File(['not json'], 'invalid.json', { type: 'application/json' });

    await act(async () => {
      latestDraggerProps?.beforeUpload?.(file as any);
    });

    await waitFor(() => {
      expect(latestDraggerProps?.fileList).toHaveLength(1);
    });

    fireEvent.click(screen.getByTestId('modal-ok'));

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith(
        'Failed to parse JSON file, please ensure the file format is correct',
      );
    });

    expect(onJsonDataMock).not.toHaveBeenCalled();
  });

  it('shows an error when the file cannot be read', async () => {
    mockFileReader({ shouldError: true });
    setup();
    openModal();

    const file = new File(['{}'], 'read-error.json', { type: 'application/json' });

    await act(async () => {
      latestDraggerProps?.beforeUpload?.(file as any);
    });

    await waitFor(() => {
      expect(latestDraggerProps?.fileList).toHaveLength(1);
    });

    fireEvent.click(screen.getByTestId('modal-ok'));

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Failed to read file');
    });

    expect(onJsonDataMock).not.toHaveBeenCalled();
  });

  it('rejects files that do not have a JSON mime type or extension', () => {
    setup();
    openModal();

    const file = new File(['{}'], 'data.txt', { type: 'text/plain' });

    const result = latestDraggerProps?.beforeUpload?.(file as any);

    expect(result).toBe(false);
    expect(message.error).toHaveBeenCalledWith('Only JSON files are supported');
    expect(latestDraggerProps?.fileList).toHaveLength(0);
  });

  test.failing('treats uppercase JSON extensions as valid uploads', () => {
    setup();
    openModal();

    const uppercaseJson = new File(['{}'], 'DATA.JSON', { type: 'text/plain' });

    latestDraggerProps?.beforeUpload?.(uppercaseJson as any);

    expect(message.error).not.toHaveBeenCalled();
    expect(latestDraggerProps?.fileList).toHaveLength(1);
  });
});
