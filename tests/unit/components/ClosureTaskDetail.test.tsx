import ClosureTaskDetail, {
  closureArtifactLifecycleState,
  closureCheckNeedsPolling,
  closureCheckPollIntervalMs,
  formatClosureArtifactByteSize,
  formatClosureTimestamp,
} from '@/components/ClosureTaskDetail';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockGetClosureCheck = jest.fn();
const mockCreateClosureReportDownload = jest.fn();

jest.mock('@/services/dataProducts', () => ({
  __esModule: true,
  createClosureReportDownload: (...args: any[]) =>
    Reflect.apply(mockCreateClosureReportDownload, undefined, args),
  getClosureCheck: (...args: any[]) => Reflect.apply(mockGetClosureCheck, undefined, args),
}));

jest.mock('umi', () => ({
  __esModule: true,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  DownloadOutlined: () => <span>download-icon</span>,
  ReloadOutlined: () => <span>reload-icon</span>,
}));

jest.mock('antd', () => {
  const antd = require('../../mocks/antd').createAntdMock();
  return {
    ...antd,
    Alert: ({ action, description, title, type }: any) => (
      <div data-testid={`alert-${type}`} role='alert'>
        <div>{title}</div>
        {description ? <div>{description}</div> : null}
        {action}
      </div>
    ),
    Tag: ({ children }: any) => <span>{children}</span>,
  };
});

const { message } = jest.requireMock('antd') as {
  message: { error: jest.Mock };
};

const checksum = 'a'.repeat(64);
const readyArtifacts = [
  {
    artifactRole: 'closure_report_xlsx',
    artifactState: 'ready',
    filename: 'closure.xlsx',
    format: 'xlsx',
    mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 1536,
    checksumSha256: checksum,
    artifactExpiresAt: '2099-01-01T00:00:00Z',
  },
  {
    artifactRole: 'closure_issue_manifest',
    artifactState: 'ready',
    filename: 'closure.json',
    format: 'json',
    mediaType: 'application/vnd.tiangong.scope-closure-manifest+json',
    size: 512,
    checksumSha256: checksum,
    artifactExpiresAt: '2099-01-01T00:00:00Z',
  },
];

const closureSummary = (overrides: Record<string, any> = {}): any => ({
  schemaVersion: 'lcia.scope-closure-check.v1',
  closureCheckId: 'closure-1',
  runStatus: 'passed',
  certificateValidity: 'valid',
  scanCompleteness: 'complete',
  blockerCodes: [],
  artifacts: readyArtifacts,
  workerJob: {
    jobId: 'worker-1',
    phase: 'complete',
    progressFraction: 1,
  },
  ...overrides,
});

describe('ClosureTaskDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClosureCheck.mockReset().mockResolvedValue({ data: closureSummary(), error: null });
    mockCreateClosureReportDownload
      .mockReset()
      .mockImplementation(async (_closureCheckId: string, artifactRole: string) => ({
        data: {
          signedDownloadUrl: `https://downloads.example/${artifactRole}`,
          filename: artifactRole === 'closure_report_xlsx' ? 'closure.xlsx' : 'closure.json',
        },
        error: null,
      }));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('classifies polling and artifact lifecycle states', () => {
    expect(closureCheckNeedsPolling(null)).toBe(false);
    expect(closureCheckNeedsPolling(closureSummary())).toBe(false);
    expect(closureCheckNeedsPolling(closureSummary({ runStatus: 'running' }))).toBe(true);
    expect(
      closureCheckNeedsPolling(
        closureSummary({
          artifacts: [
            { artifactRole: 'closure_report_xlsx', artifactState: 'pending' },
            readyArtifacts[1],
          ],
        }),
      ),
    ).toBe(true);

    expect(closureArtifactLifecycleState(undefined, 0)).toBe('unavailable');
    expect(
      closureArtifactLifecycleState(
        { artifactRole: 'closure_report_xlsx', artifactState: 'pending' } as any,
        0,
      ),
    ).toBe('preparing');
    expect(closureArtifactLifecycleState(readyArtifacts[0] as any, 0)).toBe('available');
    expect(
      closureArtifactLifecycleState(
        { ...readyArtifacts[0], artifactExpiresAt: '2000-01-01T00:00:00Z' } as any,
        Date.now(),
      ),
    ).toBe('expired');
    expect(
      closureArtifactLifecycleState(
        { artifactRole: 'closure_report_xlsx', artifactState: 'expired' } as any,
        Date.now(),
      ),
    ).toBe('expired');
    expect(closureArtifactLifecycleState(readyArtifacts[0] as any, Date.now(), true)).toBe(
      'expired',
    );
    expect(
      closureArtifactLifecycleState(
        { artifactRole: 'closure_report_xlsx', artifactState: 'failed' } as any,
        0,
      ),
    ).toBe('failed');
    expect(
      closureArtifactLifecycleState(
        { artifactRole: 'closure_report_xlsx', artifactState: 'deleted' } as any,
        0,
      ),
    ).toBe('unavailable');

    expect(formatClosureArtifactByteSize(-1)).toBe('-');
    expect(formatClosureArtifactByteSize('invalid')).toBe('-');
    expect(formatClosureArtifactByteSize(512)).toBe('512 B');
    expect(formatClosureArtifactByteSize(1536)).toBe('1.5 KB');
    expect(formatClosureArtifactByteSize(2 * 1024 * 1024)).toBe('2.00 MB');
    expect(formatClosureTimestamp(undefined)).toBe('-');
    expect(formatClosureTimestamp('invalid')).toBe('invalid');
    expect(formatClosureTimestamp('2026-08-01T01:02:03Z')).toBe('2026-08-01 01:02');
  });

  it('loads exact closure detail and downloads both role-specific artifacts', async () => {
    const anchor = document.createElement('a');
    const anchorClick = jest.fn();
    Object.defineProperty(anchor, 'click', { configurable: true, value: anchorClick });
    const createElement = document.createElement.bind(document);
    jest
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: any, options?: any) =>
        tagName === 'a' ? anchor : createElement(tagName, options),
      );

    render(
      <ClosureTaskDetail
        canDownloadReport
        closureCheckId='closure-1'
        refreshSignal='completed:2026-07-22T00:00:00Z'
      />,
    );

    expect(await screen.findByTestId('closure-task-detail-closure-1')).toBeInTheDocument();
    expect(mockGetClosureCheck).toHaveBeenCalledWith('closure-1');
    expect(screen.getByText('worker-1')).toBeInTheDocument();
    expect(screen.getByText('complete · 100%')).toBeInTheDocument();
    expect(screen.getByText('closure.xlsx')).toBeInTheDocument();
    expect(screen.getByText(/1\.5 KB/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Download issue report/ }));
    await waitFor(() =>
      expect(mockCreateClosureReportDownload).toHaveBeenNthCalledWith(
        1,
        'closure-1',
        'closure_report_xlsx',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: /Download machine result manifest/ }));
    await waitFor(() =>
      expect(mockCreateClosureReportDownload).toHaveBeenNthCalledWith(
        2,
        'closure-1',
        'closure_issue_manifest',
      ),
    );
    expect(anchorClick).toHaveBeenCalledTimes(2);
  });

  it('polls a running check until its artifacts become ready', async () => {
    jest.useFakeTimers();
    mockGetClosureCheck
      .mockResolvedValueOnce({
        data: closureSummary({
          runStatus: 'running',
          certificateValidity: 'unavailable',
          scanCompleteness: 'unknown',
          artifacts: [
            { artifactRole: 'closure_report_xlsx', artifactState: 'pending' },
            { artifactRole: 'closure_issue_manifest', artifactState: 'pending' },
          ],
        }),
        error: null,
      })
      .mockResolvedValueOnce({ data: closureSummary(), error: null });

    render(<ClosureTaskDetail canDownloadReport closureCheckId='closure-1' />);
    await act(async () => undefined);
    expect(screen.getAllByText('Preparing this artifact.')).toHaveLength(2);

    await act(async () => {
      jest.advanceTimersByTime(closureCheckPollIntervalMs);
      await Promise.resolve();
    });

    expect(mockGetClosureCheck).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: /Download issue report/ })).toBeInTheDocument();
  });

  it('shows an opaque load error and retries without navigating', async () => {
    mockGetClosureCheck
      .mockResolvedValueOnce({ data: null, error: { message: 'Detail request failed' } })
      .mockResolvedValueOnce({ data: closureSummary(), error: null });

    render(<ClosureTaskDetail canDownloadReport closureCheckId='closure-1' />);

    expect(await screen.findByText('Detail request failed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Refresh/ }));
    expect(await screen.findByTestId('closure-task-detail-closure-1')).toBeInTheDocument();
    expect(mockGetClosureCheck).toHaveBeenCalledTimes(2);
  });

  it('normalizes thrown detail failures and permits repeated retry', async () => {
    mockGetClosureCheck
      .mockRejectedValueOnce(new Error('Connection failed'))
      .mockRejectedValueOnce('opaque failure')
      .mockResolvedValueOnce({ data: closureSummary(), error: null });

    render(<ClosureTaskDetail canDownloadReport closureCheckId='closure-1' />);

    expect(await screen.findByText('Connection failed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Refresh/ }));
    expect(await screen.findByText('Task details are currently unavailable.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Refresh/ }));
    expect(await screen.findByTestId('closure-task-detail-closure-1')).toBeInTheDocument();
  });

  it('uses the safe fallback when the detail response has no data or error', async () => {
    mockGetClosureCheck.mockResolvedValueOnce({ data: null, error: null });

    render(<ClosureTaskDetail canDownloadReport closureCheckId='closure-1' />);

    expect(await screen.findByText('Task details are currently unavailable.')).toBeInTheDocument();
  });

  it('ignores both resolved and rejected detail requests after unmount', async () => {
    let resolveRequest: ((value: any) => void) | undefined;
    const resolvedAfterUnmount = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    mockGetClosureCheck.mockReturnValueOnce(resolvedAfterUnmount);
    const first = render(<ClosureTaskDetail canDownloadReport closureCheckId='closure-1' />);
    first.unmount();
    await act(async () => {
      resolveRequest?.({ data: closureSummary(), error: null });
      await resolvedAfterUnmount;
    });

    let rejectRequest: ((reason: unknown) => void) | undefined;
    const rejectedAfterUnmount = new Promise((_resolve, reject) => {
      rejectRequest = reject;
    });
    mockGetClosureCheck.mockReturnValueOnce(rejectedAfterUnmount);
    const second = render(<ClosureTaskDetail canDownloadReport closureCheckId='closure-1' />);
    second.unmount();
    await act(async () => {
      rejectRequest?.(new Error('ignored after unmount'));
      await Promise.resolve();
    });
  });

  it('renders blockers, sparse progress, terminal guidance, and retained refresh errors', async () => {
    mockGetClosureCheck
      .mockResolvedValueOnce({
        data: closureSummary({
          runStatus: 'failed',
          workerJob: { jobId: 'worker-1', errorCode: 'CLOSURE_FAILED' },
        }),
        error: null,
      })
      .mockResolvedValueOnce({
        data: closureSummary({
          runStatus: 'failed',
          workerJob: { jobId: 'worker-1', errorCode: 'CLOSURE_FAILED' },
        }),
        error: null,
      })
      .mockResolvedValueOnce({
        data: closureSummary({ runStatus: 'failed', workerJob: { jobId: 'worker-1' } }),
        error: null,
      })
      .mockResolvedValueOnce({
        data: closureSummary({ runStatus: 'cancelled', blockerCodes: undefined, workerJob: null }),
        error: null,
      })
      .mockResolvedValueOnce({
        data: closureSummary({
          blockerCodes: ['MISSING_EXCHANGE'],
          workerJob: { jobId: 'worker-sparse', phase: 'waiting' },
        }),
        error: null,
      })
      .mockResolvedValueOnce({
        data: closureSummary({ blockerCodes: ['MISSING_EXCHANGE'], workerJob: null }),
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: { message: 'Refresh failed' } });

    const { rerender } = render(
      <ClosureTaskDetail
        canDownloadReport
        closureCheckId='closure-1'
        errorSummary='Curated failure summary'
        refreshSignal='1'
      />,
    );
    expect(await screen.findByText('Curated failure summary')).toBeInTheDocument();

    rerender(<ClosureTaskDetail canDownloadReport closureCheckId='closure-1' refreshSignal='2' />);
    expect(await screen.findByText('CLOSURE_FAILED')).toBeInTheDocument();

    rerender(<ClosureTaskDetail canDownloadReport closureCheckId='closure-1' refreshSignal='3' />);
    expect(await screen.findByText(/The check did not complete\. Retry it/)).toBeInTheDocument();

    rerender(<ClosureTaskDetail canDownloadReport closureCheckId='closure-1' refreshSignal='4' />);
    expect(
      await screen.findByText(
        'Data completeness check was cancelled. Run a new check to continue.',
      ),
    ).toBeInTheDocument();

    rerender(<ClosureTaskDetail canDownloadReport closureCheckId='closure-1' refreshSignal='5' />);
    expect(await screen.findByText('MISSING_EXCHANGE')).toBeInTheDocument();
    expect(screen.getByText('waiting')).toBeInTheDocument();
    expect(screen.queryByText(/waiting ·/)).not.toBeInTheDocument();

    rerender(<ClosureTaskDetail canDownloadReport closureCheckId='closure-1' refreshSignal='6' />);
    await waitFor(() => expect(screen.queryByText('worker-sparse')).not.toBeInTheDocument());

    rerender(<ClosureTaskDetail canDownloadReport closureCheckId='closure-1' refreshSignal='7' />);
    expect(await screen.findByText('Refresh failed')).toBeInTheDocument();
    expect(screen.getByTestId('closure-task-detail-closure-1')).toBeInTheDocument();
  });

  it('does not expose download actions without the feed capability', async () => {
    render(<ClosureTaskDetail canDownloadReport={false} closureCheckId='closure-1' />);

    expect(await screen.findByTestId('closure-task-detail-closure-1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download issue report/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Download machine result manifest/ }),
    ).not.toBeInTheDocument();
  });

  it('marks an expired role after 410 and normalizes thrown download failures', async () => {
    mockCreateClosureReportDownload
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'expired_by_status' },
        status: 410,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'closure_report_expired' },
        status: 400,
      })
      .mockRejectedValueOnce(new Error('private transport detail'));

    render(<ClosureTaskDetail canDownloadReport closureCheckId='closure-1' />);
    expect(await screen.findByTestId('closure-task-detail-closure-1')).toBeInTheDocument();

    const reportButton = screen.getByRole('button', { name: /Download issue report/ });
    fireEvent.click(reportButton);
    fireEvent.click(reportButton);
    await waitFor(() =>
      expect(screen.getByTestId('closure-artifact-state-closure_report_xlsx')).toHaveTextContent(
        'This artifact has expired.',
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: /Download machine result manifest/ }));
    await waitFor(() =>
      expect(message.error).toHaveBeenLastCalledWith(
        'This download is currently unavailable. Please try again later.',
      ),
    );
    expect(screen.queryByText('private transport detail')).not.toBeInTheDocument();
  });
});
