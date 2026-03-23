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
const PICK_BAD_FILE_TEST_ID = 'import-pick-bad-file';
let mockLocale: string | undefined = 'zh-CN';

jest.mock('@ant-design/icons', () => ({
  CloudUploadOutlined: ({
    onClick,
    style,
  }: {
    onClick?: () => void;
    style?: React.CSSProperties;
  }) => <button type='button' data-testid={OPEN_BUTTON_TEST_ID} onClick={onClick} style={style} />,
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
    locale: mockLocale,
    formatMessage: (
      { defaultMessage }: { defaultMessage: string },
      values?: Record<string, any>,
    ) => {
      if (!values) {
        return defaultMessage;
      }

      return Object.entries(values).reduce(
        (output, [key, value]) => output.replace(`{${key}}`, String(value)),
        defaultMessage,
      );
    },
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
  const badFile = new File(['txt'], 'package.txt', { type: 'text/plain' });
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
        data-testid={PICK_BAD_FILE_TEST_ID}
        onClick={() => {
          beforeUpload?.(badFile);
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
    mockLocale = 'zh-CN';
  });

  it('warns when import is triggered without selecting a file', async () => {
    render(<ImportTidasPackage />);

    expect(screen.getByTestId(OPEN_BUTTON_TEST_ID).style.opacity).toBe('0.5');
    expect(screen.getByTestId(OPEN_BUTTON_TEST_ID).style.fontSize).toBe('16px');

    fireEvent.click(screen.getByTestId(OPEN_BUTTON_TEST_ID));
    fireEvent.click(screen.getByTestId(MODAL_OK_TEST_ID));

    await waitFor(() => {
      expect(mockMessage.warning).toHaveBeenCalledTimes(1);
    });

    expect(mockedImportTidasPackageApi).not.toHaveBeenCalled();
  });

  it('shows API import guidance inside the modal', () => {
    render(<ImportTidasPackage />);

    fireEvent.click(screen.getByTestId(OPEN_BUTTON_TEST_ID));

    expect(screen.getByText('API import')).toBeInTheDocument();
    expect(
      screen.getByText(
        'See the API import documentation for the full request flow and integration details.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open API import docs' })).toHaveAttribute(
      'href',
      'https://docs.tiangong.earth/docs/openapi/tidas-package-import',
    );
  });

  it('uses the english API import docs link for english locale', () => {
    mockLocale = 'en-US';

    render(<ImportTidasPackage />);

    fireEvent.click(screen.getByTestId(OPEN_BUTTON_TEST_ID));

    expect(screen.getByRole('link', { name: 'Open API import docs' })).toHaveAttribute(
      'href',
      'https://docs.tiangong.earth/en/docs/openapi/tidas-package-import',
    );
  });

  it('falls back to the default docs link when locale is missing', () => {
    mockLocale = undefined;

    render(<ImportTidasPackage />);

    fireEvent.click(screen.getByTestId(OPEN_BUTTON_TEST_ID));

    expect(screen.getByRole('link', { name: 'Open API import docs' })).toHaveAttribute(
      'href',
      'https://docs.tiangong.earth/docs/openapi/tidas-package-import',
    );
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

  it('shows info modal when open-data rows are filtered during successful import', async () => {
    mockedImportTidasPackageApi.mockResolvedValue({
      data: {
        ok: true,
        code: 'IMPORTED',
        message: 'ok',
        summary: {
          total_entries: 20,
          filtered_open_data_count: 12,
          user_conflict_count: 0,
          importable_count: 8,
          imported_count: undefined,
        },
        filtered_open_data: Array.from({ length: 12 }).map((_, index) => ({
          table: 'flows',
          id: `flow-${index + 1}`,
          version: '01.00.000',
          state_code: 10,
        })),
        user_conflicts: [],
      },
      error: null,
    } as any);

    render(<ImportTidasPackage />);

    fireEvent.click(screen.getByTestId(OPEN_BUTTON_TEST_ID));
    fireEvent.click(screen.getByTestId(PICK_FILE_TEST_ID));
    fireEvent.click(screen.getByTestId(MODAL_OK_TEST_ID));

    await waitFor(() => {
      expect(modalApi.info).toHaveBeenCalledTimes(1);
    });
    expect(mockMessage.success).toHaveBeenCalledTimes(1);
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

    const config = modalApi.error.mock.calls[0][0];
    render(<>{config.content}</>);

    expect(
      screen.getByText('Total: 2, filtered open data: 0, user conflicts: 1, imported: 0'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Download the full details to review skipped open-data records and conflicting user records.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download full details' })).toBeInTheDocument();
    expect(mockMessage.success).not.toHaveBeenCalled();
    expect(mockedImportTidasPackageApi).toHaveBeenCalledTimes(1);
  });

  it('shows localized validation issues when the import is blocked by validation', async () => {
    mockedImportTidasPackageApi.mockResolvedValue({
      data: {
        ok: false,
        code: 'VALIDATION_FAILED',
        message: 'validation failed',
        summary: {
          total_entries: 0,
          filtered_open_data_count: 0,
          user_conflict_count: 0,
          importable_count: 0,
          imported_count: 0,
          validation_issue_count: 2,
          error_count: 1,
          warning_count: 1,
        },
        filtered_open_data: [],
        user_conflicts: [],
        validation_issues: [
          {
            issue_code: 'schema_error',
            severity: 'error',
            category: 'sources',
            file_path: 'sources/a.json',
            location: '<root>',
            message: 'Schema Error at <root>: missing required field',
            context: { validator: 'required' },
          },
          {
            issue_code: 'localized_text_language_error',
            severity: 'warning',
            category: 'processes',
            file_path: 'processes/b.json',
            location: 'processDataSet/name/baseName/0',
            message: 'Localized text error at processDataSet/name/baseName/0: invalid lang',
            context: {},
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

    const config = modalApi.error.mock.calls[0][0];
    render(<>{config.content}</>);

    expect(config.title).toBe('Import blocked by validation issues');
    expect(
      screen.getByText('Validation blocked import. Errors: 1, warnings: 1, total issues: 2.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Download the full details to inspect file paths, issue locations, and validation context.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Schema Error at <root>: missing required field'),
    ).not.toBeInTheDocument();
  });

  it('handles validation failures without issue details by showing zero-count summary', async () => {
    mockedImportTidasPackageApi.mockResolvedValue({
      data: {
        ok: false,
        code: 'VALIDATION_FAILED',
        message: 'validation failed',
        summary: {
          total_entries: 0,
          filtered_open_data_count: 0,
          user_conflict_count: 0,
          importable_count: 0,
          imported_count: 0,
        },
        filtered_open_data: [],
        user_conflicts: [],
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

    const config = modalApi.error.mock.calls[0][0];
    render(<>{config.content}</>);

    expect(
      screen.getByText('Validation blocked import. Errors: 0, warnings: 0, total issues: 0.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Download the full details to inspect file paths, issue locations, and validation context.',
      ),
    ).toBeInTheDocument();
  });

  it('keeps the validation modal compact and points users to the downloadable report', async () => {
    mockedImportTidasPackageApi.mockResolvedValue({
      data: {
        ok: false,
        code: 'VALIDATION_FAILED',
        message: 'validation failed',
        summary: {
          total_entries: 11,
          filtered_open_data_count: 0,
          user_conflict_count: 0,
          importable_count: 0,
          imported_count: 0,
        },
        filtered_open_data: [],
        user_conflicts: [],
        validation_issues: Array.from({ length: 11 }).map((_, index) => ({
          issue_code: index === 0 ? 'unknown_issue_code' : 'validation_error',
          severity: index % 2 === 0 ? 'error' : 'warning',
          category: 'sources',
          file_path: `sources/${index + 1}.json`,
          location: `<root>.${index + 1}`,
          message: `Issue ${index + 1}`,
          context: {},
        })),
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

    const config = modalApi.error.mock.calls[0][0];
    render(<>{config.content}</>);

    expect(
      screen.getByText('Validation blocked import. Errors: 0, warnings: 0, total issues: 11.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Download the full details to inspect file paths, issue locations, and validation context.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Issue 1')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('downloads the full validation report from the modal preview', async () => {
    const originalCreateElement = document.createElement.bind(document);
    const clickSpy = jest.fn();
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const OriginalBlob = Blob;
    let capturedBlobParts: BlobPart[] = [];

    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: jest.fn(),
    });

    Object.defineProperty(globalThis, 'Blob', {
      configurable: true,
      value: class TestBlob extends OriginalBlob {
        constructor(parts: BlobPart[], options?: BlobPropertyBag) {
          capturedBlobParts = parts;
          super(parts, options);
        }
      },
    });

    const createObjectUrlSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:report');
    const revokeObjectUrlSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);

      if (tagName.toLowerCase() === 'a') {
        Object.defineProperty(element, 'click', {
          value: clickSpy,
        });
      }

      return element;
    });

    mockedImportTidasPackageApi.mockResolvedValue({
      data: {
        ok: false,
        code: 'VALIDATION_FAILED',
        message: 'validation failed',
        summary: {
          total_entries: 1,
          filtered_open_data_count: 0,
          user_conflict_count: 0,
          importable_count: 0,
          imported_count: 0,
          validation_issue_count: 1,
          error_count: 1,
          warning_count: 0,
        },
        filtered_open_data: [],
        user_conflicts: [],
        validation_issues: [
          {
            issue_code: 'schema_error',
            severity: 'error',
            category: 'sources',
            file_path: 'sources/a.json',
            location: '<root>',
            message: 'Schema Error at <root>: missing required field',
            context: { validator: 'required' },
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

    const config = modalApi.error.mock.calls[0][0];
    render(<>{config.content}</>);

    fireEvent.click(screen.getByRole('button', { name: 'Download full details' }));

    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlSpy).toHaveBeenCalledTimes(1);

    const downloadedText = String(capturedBlobParts[0] ?? '');

    expect(downloadedText).toContain('"report_format": "tidas-import-report-with-guide"');
    expect(downloadedText).toContain('"readme_markdown"');
    expect(downloadedText).toContain('# How to read this import report');
    expect(downloadedText).toContain('# 如何查看这个导入报告');
    expect(downloadedText).toContain('"report"');
    expect(downloadedText).toContain('"validation_issues"');

    createElementSpy.mockRestore();
    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
    Object.defineProperty(globalThis, 'Blob', {
      configurable: true,
      value: OriginalBlob,
    });

    if (originalRevokeObjectUrl) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: originalRevokeObjectUrl,
      });
    } else {
      // @ts-expect-error test cleanup for shimmed browser API
      delete URL.revokeObjectURL;
    }
  });

  it('rejects non-zip file selections before uploading', async () => {
    render(<ImportTidasPackage />);
    fireEvent.click(screen.getByTestId(OPEN_BUTTON_TEST_ID));
    fireEvent.click(screen.getByTestId(PICK_BAD_FILE_TEST_ID));

    expect(mockMessage.error).toHaveBeenCalledWith('Only ZIP packages are supported');

    fireEvent.click(screen.getByTestId(MODAL_OK_TEST_ID));
    await waitFor(() => {
      expect(mockMessage.warning).toHaveBeenCalledTimes(1);
    });
    expect(mockedImportTidasPackageApi).not.toHaveBeenCalled();
  });

  it('clears selected file on remove and cancel action', async () => {
    render(<ImportTidasPackage />);
    fireEvent.click(screen.getByTestId(OPEN_BUTTON_TEST_ID));
    fireEvent.click(screen.getByTestId(PICK_FILE_TEST_ID));
    fireEvent.click(screen.getByTestId('remove-file'));
    fireEvent.click(screen.getByTestId(MODAL_OK_TEST_ID));

    await waitFor(() => {
      expect(mockMessage.warning).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByTestId('import-modal-cancel'));
    expect(screen.queryByTestId('import-modal')).not.toBeInTheDocument();
  });

  it('shows generic error when api throws without payload', async () => {
    mockedImportTidasPackageApi.mockResolvedValue({
      data: null,
      error: new Error('upload failed'),
    } as any);

    render(<ImportTidasPackage />);
    fireEvent.click(screen.getByTestId(OPEN_BUTTON_TEST_ID));
    fireEvent.click(screen.getByTestId(PICK_FILE_TEST_ID));
    fireEvent.click(screen.getByTestId(MODAL_OK_TEST_ID));

    await waitFor(() => {
      expect(mockMessage.error).toHaveBeenCalledWith('Failed to import TIDAS package');
    });
  });

  it('handles payloads without summary by surfacing generic import failure', async () => {
    mockedImportTidasPackageApi.mockResolvedValue({
      data: {
        ok: false,
        message: 'payload failed',
      },
      error: null,
    } as any);

    render(<ImportTidasPackage />);
    fireEvent.click(screen.getByTestId(OPEN_BUTTON_TEST_ID));
    fireEvent.click(screen.getByTestId(PICK_FILE_TEST_ID));
    fireEvent.click(screen.getByTestId(MODAL_OK_TEST_ID));

    await waitFor(() => {
      expect(mockMessage.error).toHaveBeenCalledWith('Failed to import TIDAS package');
    });
  });

  it('falls back to the default import-failure message when payloads omit summary and message', async () => {
    mockedImportTidasPackageApi.mockResolvedValue({
      data: {
        ok: false,
      },
      error: null,
    } as any);

    render(<ImportTidasPackage />);
    fireEvent.click(screen.getByTestId(OPEN_BUTTON_TEST_ID));
    fireEvent.click(screen.getByTestId(PICK_FILE_TEST_ID));
    fireEvent.click(screen.getByTestId(MODAL_OK_TEST_ID));

    await waitFor(() => {
      expect(mockMessage.error).toHaveBeenCalledWith('Failed to import TIDAS package');
    });
  });
});
