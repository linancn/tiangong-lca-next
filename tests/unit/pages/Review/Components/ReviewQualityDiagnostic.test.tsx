import ReviewQualityDiagnostic from '@/pages/Review/Components/ReviewQualityDiagnostic';
import { requestReviewQualityDiagnosticApi } from '@/services/reviews/api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@umijs/max', () => ({
  __esModule: true,
  useIntl: () => ({
    locale: 'en-US',
    formatMessage: ({ defaultMessage, id }: any, values?: Record<string, unknown>) =>
      Object.entries(values ?? {}).reduce(
        (message, [key, value]) => message.split(`{${key}}`).join(String(value)),
        defaultMessage ?? id,
      ),
  }),
}));

jest.mock('@/services/reviews/api', () => ({
  __esModule: true,
  requestReviewQualityDiagnosticApi: jest.fn(),
}));

const mockRequestReviewQualityDiagnosticApi = jest.mocked(requestReviewQualityDiagnosticApi);

const completedDiagnostic = {
  runId: '22222222-2222-4222-8222-222222222222',
  status: 'completed' as const,
  outcome: 'findings' as const,
  requestedAt: '2026-08-13T08:00:00.000Z',
  updatedAt: '2026-08-13T08:01:00.000Z',
  report: {
    schemaVersion: 'review.quality_diagnostic.report.v1' as const,
    runId: '22222222-2222-4222-8222-222222222222',
    outcome: 'findings' as const,
    informationalOnly: true as const,
    affectsReviewState: false as const,
    scope: {
      kind: 'pending_review' as const,
      reviewCount: 12,
      datasetCount: 9,
      datasetCounts: { processes: 4, flows: 5 },
      pendingProcessCount: 4,
      pendingProcessSample: [{ id: 'process-1', version: '01.00.000' }],
    },
    summary: { findingCount: 1 },
    sections: [
      {
        key: 'completeness' as const,
        status: 'findings' as const,
        findings: [
          {
            code: 'missing_provider',
            category: 'completeness' as const,
            level: 'warning' as const,
            message: 'One provider is missing.',
            workflowBlocking: false as const,
          },
        ],
      },
      {
        key: 'numerical_stability' as const,
        status: 'not_evaluable' as const,
        findings: [],
      },
    ],
    findings: [
      {
        code: 'missing_provider',
        category: 'completeness' as const,
        level: 'warning' as const,
        message: 'One provider is missing.',
        workflowBlocking: false as const,
      },
    ],
  },
};

describe('ReviewQualityDiagnostic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads and renders the latest joint report as informational evidence', async () => {
    mockRequestReviewQualityDiagnosticApi.mockResolvedValue({
      data: [completedDiagnostic],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    });

    render(<ReviewQualityDiagnostic open onClose={jest.fn()} />);

    expect(await screen.findByText('Pending-review quality diagnostic')).toBeInTheDocument();
    await waitFor(() =>
      expect(mockRequestReviewQualityDiagnosticApi).toHaveBeenCalledWith({
        action: 'read',
      }),
    );
    expect(screen.getByText('Informational only')).toBeInTheDocument();
    expect(
      screen.getByText(/never disable assignment, approval, or rejection/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Data completeness')).toBeInTheDocument();
    expect(screen.getByText('Numerical stability')).toBeInTheDocument();
    expect(screen.getByText('processes: 4')).toBeInTheDocument();
    expect(screen.getByText('process-1 @ 01.00.000')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Data completeness/i }));
    expect(await screen.findByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('starts only after the Review Admin clicks the manual action', async () => {
    const setIntervalSpy = jest.spyOn(window, 'setInterval');
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
    mockRequestReviewQualityDiagnosticApi
      .mockResolvedValueOnce({
        data: [],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      })
      .mockResolvedValueOnce({
        data: [
          {
            runId: '33333333-3333-4333-8333-333333333333',
            status: 'queued',
          },
        ],
        error: null,
        count: null,
        status: 202,
        statusText: 'Accepted',
      });

    const { unmount } = render(<ReviewQualityDiagnostic open onClose={jest.fn()} />);

    expect(await screen.findByText('No quality diagnostic has been run yet.')).toBeInTheDocument();
    expect(mockRequestReviewQualityDiagnosticApi).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Run quality diagnostic/i }));

    await waitFor(() =>
      expect(mockRequestReviewQualityDiagnosticApi).toHaveBeenNthCalledWith(2, {
        action: 'start',
      }),
    );
    expect(await screen.findByText(/Review actions remain available/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Run quality diagnostic/i })).toBeDisabled();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 3000);

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('keeps an explicit refresh failure informational and does not start a run', async () => {
    mockRequestReviewQualityDiagnosticApi
      .mockResolvedValueOnce({
        data: [],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      })
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: 'READ_FAILED',
          message: 'Unable to load the latest report',
          details: '',
          hint: '',
        },
        count: null,
        status: 503,
        statusText: 'Service Unavailable',
      });

    render(<ReviewQualityDiagnostic open onClose={jest.fn()} />);

    expect(await screen.findByText('No quality diagnostic has been run yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Refresh report/i }));

    expect(await screen.findByText('Quality diagnostic request failed')).toBeInTheDocument();
    expect(screen.getByText('Unable to load the latest report')).toBeInTheDocument();
    expect(mockRequestReviewQualityDiagnosticApi).toHaveBeenNthCalledWith(2, { action: 'read' });
    expect(mockRequestReviewQualityDiagnosticApi).not.toHaveBeenCalledWith({ action: 'start' });
  });

  it('shows runtime failure as a retryable report state without disabling review actions', async () => {
    mockRequestReviewQualityDiagnosticApi.mockResolvedValue({
      data: [
        {
          runId: '44444444-4444-4444-8444-444444444444',
          status: 'failed',
          error: { code: 'RUNTIME_FAILED', message: 'Worker unavailable' },
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    });

    render(<ReviewQualityDiagnostic open onClose={jest.fn()} />);

    expect(await screen.findByText('The diagnostic did not produce a report.')).toBeInTheDocument();
    expect(screen.getByText('Worker unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Run again/i })).toBeEnabled();
  });
});
