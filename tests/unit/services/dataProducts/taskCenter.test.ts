jest.mock('@/services/dataProducts/api', () => ({
  __esModule: true,
  invokeDataProductCommand: jest.fn(),
}));

import { invokeDataProductCommand } from '@/services/dataProducts/api';
import {
  createClosureReportDownload,
  listClosureCheckIssues,
} from '@/services/dataProducts/closure';
import {
  decodeDataProductTaskSummary,
  listDataProductTaskFeed,
  listDataProductTasks,
  upsertDataProductTasks,
} from '@/services/dataProducts/taskCenter';
import { clearTaskSummaries } from '@/services/taskCenter/workerJobStore';

describe('Data Product TaskSummaryV2 safe projection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearTaskSummaries();
  });

  it('keeps worker status and certificate validity separate without accepting raw result fields', () => {
    const summary = decodeDataProductTaskSummary({
      jobId: 'job-1',
      jobKind: 'lcia.scope_closure_check',
      category: 'data_product',
      workerStatus: 'completed',
      domainStatus: 'passed',
      domainValidity: 'stale',
      projectionUpdatedAt: '2026-07-22T00:00:00Z',
      title: 'Data completeness check',
      progressFraction: 0.8,
      capabilities: { canDownloadReport: true },
      deepLink: {
        routeKey: 'data_product.closure_check',
        params: { closureCheckId: 'closure-1' },
      },
      result: { certificateValidity: 'valid', payload: 'must never be read' },
    });

    expect(summary).toMatchObject({
      jobId: 'job-1',
      jobKind: 'lcia.scope_closure_check',
      workerStatus: 'completed',
      runState: 'succeeded',
      domainStatus: 'passed',
      domainValidity: 'stale',
      progressFraction: 0.8,
      capabilities: { canDownloadReport: true },
      deepLink: {
        routeKey: 'data_product.closure_check',
        params: { closureCheckId: 'closure-1' },
      },
    });
    expect(summary).not.toHaveProperty('result');
  });

  it('uses the final list_task_feed contract with category, job kinds, and cursor-ready controls', async () => {
    (invokeDataProductCommand as jest.Mock).mockResolvedValue({ data: { items: [] }, error: null });

    await listDataProductTaskFeed({
      cursor: { updatedAt: '2026-07-22T00:00:00Z', jobId: 'job-1' },
      statuses: ['running'],
    });

    expect(invokeDataProductCommand).toHaveBeenCalledWith({
      action: 'list_task_feed',
      category: 'data_product',
      jobKinds: ['lcia.scope_closure_check', 'lcia_result.package_build'],
      statuses: ['running'],
      cursor: { updatedAt: '2026-07-22T00:00:00Z', jobId: 'job-1' },
      limit: 50,
      rootOnly: false,
    });
  });

  it('deduplicates by job id and rejects unversioned/raw worker rows', () => {
    upsertDataProductTasks([
      {
        jobId: 'safe-job',
        jobKind: 'lcia_result.package_build',
        category: 'data_product',
        workerStatus: 'running',
        domainValidity: 'none',
        projectionUpdatedAt: '2026-07-22T00:00:00Z',
        title: 'Result build',
        capabilities: {},
      },
      { id: 'raw-worker-job', status: 'running', result: { private: true } },
    ]);

    expect(listDataProductTasks().filter((task) => task.jobId === 'safe-job')).toHaveLength(1);
    expect(listDataProductTasks().some((task) => task.jobId === 'raw-worker-job')).toBe(false);
  });

  it('keeps closure issue pagination actor-scoped and out of the task feed', async () => {
    (invokeDataProductCommand as jest.Mock).mockResolvedValue({
      data: { closureCheckId: 'closure-1', issues: [] },
      error: null,
    });

    await listClosureCheckIssues('closure-1', { afterIssueId: 'issue-2', limit: 50 });

    expect(invokeDataProductCommand).toHaveBeenCalledWith({
      action: 'list_closure_issues',
      closureCheckId: 'closure-1',
      afterIssueId: 'issue-2',
      limit: 50,
    });
  });

  it('whitelists only the safe short-lived report descriptor fields', async () => {
    (invokeDataProductCommand as jest.Mock).mockResolvedValue({
      data: {
        signedDownloadUrl: 'https://storage.example.test/reports/closure-1?token=short-lived',
        artifactId: 'artifact-1',
        mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 1024,
        checksumSha256: 'a'.repeat(64),
        expiresInSeconds: 300,
        storagePath: 'private/closure-1.xlsx',
        rawWorkerResult: { shouldNeverReachUi: true },
      },
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    });

    const result = await createClosureReportDownload('closure-1');

    expect(result.data).toEqual({
      signedDownloadUrl: 'https://storage.example.test/reports/closure-1?token=short-lived',
      artifactId: 'artifact-1',
      mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 1024,
      checksumSha256: 'a'.repeat(64),
      expiresInSeconds: 300,
    });
    expect(result.data).not.toHaveProperty('storagePath');
    expect(result.data).not.toHaveProperty('rawWorkerResult');
  });
});
