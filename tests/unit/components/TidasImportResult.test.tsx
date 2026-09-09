import TidasImportResult, {
  importOutcomeLabel,
} from '@/components/ImportTidasPackage/ImportResult';
import { fetchPackageReport, getTidasPackageJobApi } from '@/services/general/api';
import { act, fireEvent, render, screen } from '@testing-library/react';

jest.mock('@/services/general/api', () => ({
  getTidasPackageJobApi: jest.fn(),
  fetchPackageReport: jest.fn(),
}));
jest.mock('umi', () => ({
  useIntl: () => ({
    formatMessage: (
      { defaultMessage }: { defaultMessage: string },
      values?: Record<string, unknown>,
    ) =>
      Object.entries(values ?? {}).reduce(
        (text, [key, value]) => text.replace(`{${key}}`, String(value)),
        defaultMessage,
      ),
  }),
}));
const readJob = jest.mocked(getTidasPackageJobApi);
const readReport = jest.mocked(fetchPackageReport);

beforeEach(() => jest.clearAllMocks());

it('shows partial success, the blocking reference path and complete downloads', async () => {
  readJob.mockResolvedValue({
    data: {
      ok: true,
      artifacts_by_kind: {
        import_report: {
          artifact_format: 'tidas-package-import-report:v2',
          signed_download_url: 'https://example.com/report',
        },
        import_details: { signed_download_url: 'https://example.com/details' },
      },
    },
    error: null,
  } as any);
  readReport.mockResolvedValue({
    report_version: 2,
    outcome: 'partial',
    summary: { imported_count: 2, existing_count: 1, successful_root_count: 1 },
    roots: [
      {
        root: { table: 'processes', id: 'process-a', version: '01.00.000' },
        status: 'blocked',
        blocking_path: [{ table: 'flows', id: 'bad-flow', version: '01.00.000' }],
      },
    ],
    roots_truncated: true,
  });
  render(<TidasImportResult jobId='job-a' />);
  expect(await screen.findByText('Partially imported')).toBeInTheDocument();
  expect(
    screen.getByText('Imported: 2; already present: 1; successful groups: 1'),
  ).toBeInTheDocument();
  expect(screen.getByText(/bad-flow/)).toBeInTheDocument();
  expect(screen.getByText(/Validation blocked this group/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Download complete details' })).toHaveAttribute(
    'href',
    'https://example.com/details',
  );
});

it('retains actual committed counts when there is no final report', async () => {
  readJob.mockResolvedValue({
    data: {
      ok: true,
      artifacts_by_kind: {},
      import_progress: {
        imported_count: 3,
        existing_count: 0,
        successful_root_count: 1,
        source: 'committed_receipts',
      },
    },
    error: null,
  } as any);
  render(<TidasImportResult jobId='job-b' />);
  expect(
    await screen.findByText('Imported: 3; already present: 0; successful groups: 1'),
  ).toBeInTheDocument();
  expect(screen.getByText(/final report is not yet available/)).toBeInTheDocument();
  expect(readReport).not.toHaveBeenCalled();
});

it('keeps historical v1 reports downloadable without treating them as v2', async () => {
  readJob.mockResolvedValue({
    data: {
      ok: true,
      artifacts_by_kind: {
        import_report: {
          artifact_format: 'tidas-package-import-report:v1',
          signed_download_url: 'https://example.com/legacy',
        },
      },
    },
    error: null,
  } as any);
  render(<TidasImportResult jobId='legacy' />);
  expect(await screen.findByRole('link', { name: 'Download report' })).toHaveAttribute(
    'href',
    'https://example.com/legacy',
  );
  expect(readReport).not.toHaveBeenCalled();
});

const artifactJob = () =>
  ({
    data: {
      ok: true,
      artifacts_by_kind: {
        import_report: {
          artifact_format: 'tidas-package-import-report:v2',
          signed_download_url: 'https://example.com/report',
        },
      },
    },
    error: null,
  }) as any;

it.each(['success', 'none', 'interrupted'])(
  'renders %s and each group disposition',
  async (outcome) => {
    readJob.mockResolvedValue(artifactJob());
    readReport.mockResolvedValue({
      report_version: 2,
      outcome,
      roots: ['imported', 'reused', 'write_failed', 'not_attempted', 'future'].map((status) => ({
        root: { table: 'processes', id: status, version: '01.00.000' },
        status,
        blocking_path: [],
      })),
    } as any);
    render(<TidasImportResult jobId='outcomes' />);
    expect(await screen.findByText(/rolled back after a write failure/)).toBeInTheDocument();
    expect(screen.getByText(/This group was not attempted/)).toBeInTheDocument();
    expect(screen.queryByText(/processes · imported/)).not.toBeInTheDocument();
    expect(screen.queryByText(/processes · reused/)).not.toBeInTheDocument();
    expect(importOutcomeLabel('future', { formatMessage: () => 'unsupported' })).toBe('');
  },
);

it.each([
  { report_version: 1, outcome: 'success', roots: [] },
  { report_version: 2, outcome: 'future', roots: [] },
  { report_version: 2, outcome: 'partial', roots: null },
])('rejects incompatible report envelopes', async (report) => {
  readJob.mockResolvedValue(artifactJob());
  readReport.mockResolvedValue(report as any);
  render(<TidasImportResult jobId='invalid' />);
  expect(await screen.findByText(/Unable to load the latest result/)).toBeInTheDocument();
});

it.each([
  { data: null, error: new Error('offline') },
  { data: null, error: null },
  { data: { ok: false }, error: null },
])('shows read failures and can refresh', async (result) => {
  readJob
    .mockResolvedValueOnce(result as any)
    .mockResolvedValueOnce({ data: { ok: true, artifacts_by_kind: {} }, error: null } as any);
  render(<TidasImportResult jobId='refresh' />);
  expect(await screen.findByText(/Unable to load the latest result/)).toBeInTheDocument();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Refresh result' }));
  });
  expect(readJob).toHaveBeenCalledTimes(2);
  expect(screen.queryByText(/Unable to load the latest result/)).not.toBeInTheDocument();
});

it('does not fetch a v2 report without a download URL', async () => {
  const job = artifactJob();
  delete job.data.artifacts_by_kind.import_report.signed_download_url;
  readJob.mockResolvedValue(job);
  await act(async () => {
    render(<TidasImportResult jobId='no-url' />);
  });
  expect(readReport).not.toHaveBeenCalled();
});

it('ignores an old job lookup after switching jobs', async () => {
  let resolve!: (value: any) => void;
  readJob.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const view = render(<TidasImportResult jobId='old' />);
  view.unmount();
  await act(async () => {
    resolve(artifactJob());
  });
  expect(readReport).not.toHaveBeenCalled();
});

it.each([false, true])(
  'ignores report completion or failure after unmount (%s)',
  async (reject) => {
    let resolve!: (value: any) => void;
    let fail!: (value: any) => void;
    readJob.mockResolvedValue(artifactJob());
    readReport.mockReturnValue(
      new Promise((r, j) => {
        resolve = r;
        fail = j;
      }),
    );
    const view = render(<TidasImportResult jobId='old-report' />);
    await act(async () => {});
    view.unmount();
    await act(async () => {
      if (reject) fail(new Error('aborted'));
      else resolve({ report_version: 2, outcome: 'success', roots: [] });
    });
    expect(readReport.mock.calls[0][1]?.aborted).toBe(true);
  },
);
