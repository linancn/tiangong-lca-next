/**
 * Tests for ExportData component
 * Path: src/components/ExportData/index.tsx
 */

import ExportData from '@/components/ExportData';
import { exportDataApi } from '@/services/general/api';
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
jest.mock('@/services/general/api', () => ({
  exportDataApi: jest.fn(),
}));

const mockedExportDataApi = jest.mocked(exportDataApi);
const mockMessage = message as unknown as MockMessage;

const baseProps = {
  tableName: 'flows',
  id: 'test-id',
  version: 'v00000001',
};

const renderComponent = (props: Partial<typeof baseProps> = {}) =>
  render(<ExportData {...baseProps} {...props} />);

let createObjectURLSpy: jest.SpyInstance<string, [Blob | MediaSource]>;
let revokeObjectURLSpy: jest.Mock<void, [string]>;
let originalRevokeObjectURL: typeof URL.revokeObjectURL | undefined;
let anchorClickSpy: jest.SpyInstance<void, []>;
let appendChildSpy: jest.SpyInstance<Node, [Node]>;
let removeChildSpy: jest.SpyInstance<Node, [Node]>;
let blobMock: jest.SpyInstance<
  Blob,
  [blobParts?: BlobPart[] | undefined, options?: BlobPropertyBag | undefined]
>;
let blobArgs: { parts: BlobPart[]; options?: BlobPropertyBag } | undefined;

beforeEach(() => {
  jest.clearAllMocks();

  blobArgs = undefined;
  createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
  originalRevokeObjectURL = URL.revokeObjectURL;
  revokeObjectURLSpy = jest.fn();
  (URL as any).revokeObjectURL = revokeObjectURLSpy;
  anchorClickSpy = jest
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => undefined);
  appendChildSpy = jest.spyOn(document.body, 'appendChild');
  removeChildSpy = jest.spyOn(document.body, 'removeChild');
  blobMock = jest
    .spyOn(globalThis as unknown as { Blob: typeof Blob }, 'Blob')
    .mockImplementation((parts: BlobPart[] = [], options?: BlobPropertyBag) => {
      blobArgs = { parts, options };
      return {
        parts,
        options,
      } as unknown as Blob;
    });
});

afterEach(() => {
  createObjectURLSpy.mockRestore();
  if (originalRevokeObjectURL) {
    URL.revokeObjectURL = originalRevokeObjectURL;
  } else {
    delete (URL as any).revokeObjectURL;
  }
  anchorClickSpy.mockRestore();
  appendChildSpy.mockRestore();
  removeChildSpy.mockRestore();
  blobMock.mockRestore();
});

const clickExportButton = () => {
  fireEvent.click(screen.getByTestId(EXPORT_BUTTON_TEST_ID));
};

describe('ExportData Component', () => {
  it('exports data successfully for non-lifecycle tables', async () => {
    mockedExportDataApi.mockResolvedValue({
      data: [{ json_ordered: { foo: 'bar' } }],
      error: null,
    } as any);

    renderComponent();

    expect(screen.getByTestId(EXPORT_SPINNER_TEST_ID)).toHaveAttribute('data-spinning', 'false');

    const initialAppendCalls = appendChildSpy.mock.calls.length;
    const initialRemoveCalls = removeChildSpy.mock.calls.length;

    clickExportButton();

    expect(mockedExportDataApi).toHaveBeenCalledWith(
      baseProps.tableName,
      baseProps.id,
      baseProps.version,
    );
    expect(screen.getByTestId(EXPORT_SPINNER_TEST_ID)).toHaveAttribute('data-spinning', 'true');

    await waitFor(() => {
      expect(mockMessage.success).toHaveBeenCalledTimes(1);
    });

    expect(mockMessage.success.mock.calls[0][0]).toBe('Export data successfully');
    expect(mockMessage.error).not.toHaveBeenCalled();

    expect(blobMock).toHaveBeenCalledTimes(1);
    expect(blobArgs?.parts[0]).toBe(JSON.stringify([{ foo: 'bar' }], null, 2));
    expect(blobArgs?.options?.type).toBe('application/json');

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:url');
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);

    const appendedAnchors = appendChildSpy.mock.calls
      .slice(initialAppendCalls)
      .map(([node]) => node)
      .filter((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement);
    expect(appendedAnchors).toHaveLength(1);
    const appendedAnchor = appendedAnchors[0];
    expect(appendedAnchor.getAttribute('download')).toBe('flows_test-id_v00000001.json');
    expect(appendedAnchor.getAttribute('href')).toBe('blob:url');

    const removedAnchors = removeChildSpy.mock.calls
      .slice(initialRemoveCalls)
      .map(([node]) => node)
      .filter((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement);
    expect(removedAnchors).toHaveLength(1);
    expect(removedAnchors[0]).toBe(appendedAnchor);

    await waitFor(() => {
      expect(screen.getByTestId(EXPORT_SPINNER_TEST_ID)).toHaveAttribute('data-spinning', 'false');
    });
  });

  it('includes lifecycle model metadata when exporting lifecyclemodels table', async () => {
    mockedExportDataApi.mockResolvedValue({
      data: [
        {
          json_ordered: { foo: 'bar' },
          json_tg: { baz: 'qux' },
        },
      ],
      error: null,
    } as any);

    renderComponent({ tableName: 'lifecyclemodels' });
    clickExportButton();

    await waitFor(() => {
      expect(mockMessage.success).toHaveBeenCalledTimes(1);
    });

    expect(blobArgs?.parts[0]).toBe(
      JSON.stringify(
        [
          {
            foo: 'bar',
            json_tg: { baz: 'qux' },
          },
        ],
        null,
        2,
      ),
    );
  });

  it('shows error feedback when the export request returns an error', async () => {
    mockedExportDataApi.mockResolvedValue({
      data: null,
      error: new Error('failure'),
    } as any);

    renderComponent();

    clickExportButton();

    await waitFor(() => {
      expect(mockMessage.error).toHaveBeenCalledTimes(1);
    });

    expect(mockMessage.error.mock.calls[0][0]).toBe('Export data failed');
    expect(mockMessage.success).not.toHaveBeenCalled();
    expect(blobMock).not.toHaveBeenCalled();
    expect(createObjectURLSpy).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByTestId(EXPORT_SPINNER_TEST_ID)).toHaveAttribute('data-spinning', 'false');
    });
  });

  it('does not create a download when the export returns no data', async () => {
    mockedExportDataApi.mockResolvedValue({
      data: [],
      error: null,
    } as any);

    renderComponent();
    const initialAppendCalls = appendChildSpy.mock.calls.length;
    clickExportButton();

    await waitFor(() => {
      expect(mockedExportDataApi).toHaveBeenCalledTimes(1);
    });

    expect(mockMessage.success).not.toHaveBeenCalled();
    expect(mockMessage.error).not.toHaveBeenCalled();
    expect(blobMock).not.toHaveBeenCalled();
    expect(createObjectURLSpy).not.toHaveBeenCalled();

    const appendedAnchors = appendChildSpy.mock.calls
      .slice(initialAppendCalls)
      .map(([node]) => node)
      .filter((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement);
    expect(appendedAnchors).toHaveLength(0);

    await waitFor(() => {
      expect(screen.getByTestId(EXPORT_SPINNER_TEST_ID)).toHaveAttribute('data-spinning', 'false');
    });
  });
});
