jest.mock('@/services/dataProducts/api', () => ({
  __esModule: true,
  invokeDataProductCommand: jest.fn(),
}));

import { invokeDataProductCommand } from '@/services/dataProducts/api';
import {
  createClosureCheck,
  createClosureReportDownload,
  decodeClosureArtifact,
  decodeClosureCheckCreateResult,
  decodeClosureCheckIssue,
  decodeClosureCheckIssuePage,
  decodeClosureCheckSummary,
  decodeClosureCheckWorkerJob,
  decodeClosureReportDownloadDescriptor,
  getClosureCheck,
  listClosureCheckIssues,
} from '@/services/dataProducts/closure';
import {
  decodeDataProductTaskSummary,
  listDataProductTaskFeed,
  listDataProductTasks,
  refreshDataProductTasks,
  subscribeDataProductTasks,
  upsertDataProductTasks,
} from '@/services/dataProducts/taskCenter';
import {
  clearTaskSummaries,
  listTaskSummaries,
  registerTaskSummaryPresenter,
  subscribeTaskSummaries,
  upsertTaskSummaries,
} from '@/services/taskCenter/workerJobStore';

const databaseArtifactContract = require('../../../fixtures/contracts/20260729_scope_closure_public_artifact_contract.json');

describe('Data Product TaskSummaryV2 safe projection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearTaskSummaries();
  });

  it('keeps worker status and certificate validity separate without accepting raw result fields', () => {
    const summary = decodeDataProductTaskSummary({
      schemaVersion: 'task-summary.v2',
      jobId: 'job-1',
      jobKind: 'lcia.scope_closure_check',
      category: 'data_product',
      workerStatus: 'completed',
      domainStatus: 'passed',
      domainValidity: 'stale',
      projectionUpdatedAt: '2026-07-22T00:00:00Z',
      title: 'Data completeness check',
      progressFraction: 0.8,
      progressCounters: { scanned: 8, completed: 7, total: 10, unit: 'documents' },
      capabilities: { canDownloadReport: true },
      resultSetId: '77777777-7777-4777-8777-777777777777',
      resultSetName: 'August result set',
      deepLink: {
        routeKey: 'data_product.closure_check',
        params: {
          resultSetId: '77777777-7777-4777-8777-777777777777',
          closureCheckId: 'closure-1',
        },
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
      progressCounters: { scanned: 8, completed: 7, total: 10, unit: 'documents' },
      capabilities: { canDownloadReport: true },
      resultSetId: '77777777-7777-4777-8777-777777777777',
      resultSetName: 'August result set',
      deepLink: {
        routeKey: 'data_product.closure_check',
        params: {
          resultSetId: '77777777-7777-4777-8777-777777777777',
          closureCheckId: 'closure-1',
        },
      },
    });
    expect(summary).not.toHaveProperty('result');
  });

  it('keeps create receipts separate from full reads and whitelists the worker-job projection', async () => {
    (invokeDataProductCommand as jest.Mock)
      .mockResolvedValueOnce({
        data: {
          closureCheckId: 'closure-1',
          requestedScopeHash: 'scope-hash',
          policyFingerprint: 'policy-hash',
          reused: false,
          workerJob: {
            id: 'job-1',
            jobKind: 'lcia.scope_closure_check',
            status: 'queued',
            progress: 0,
            payload: { never: 'exposed' },
            result: { never: 'exposed' },
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          schemaVersion: 'lcia.scope-closure-check.v1',
          closureCheckId: 'closure-1',
          runStatus: 'passed',
          certificateValidity: 'valid',
          scanCompleteness: 'complete',
          requestedScopeHash: 'scope-hash',
          effectiveScopeHash: 'effective-hash',
          policyFingerprint: 'policy-hash',
          dataSnapshotToken: 'snapshot-token',
          blockerCodes: [],
          summary: { evidenceHash: 'evidence-hash' },
          artifacts: [
            {
              artifactRole: 'closure_report_xlsx',
              artifactState: 'ready',
              format: 'xlsx',
              filename: 'closure-issues.xlsx',
              mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              size: 1024,
              checksumSha256: 'a'.repeat(64),
              artifactExpiresAt: '2026-07-29T00:00:00Z',
            },
            {
              artifactRole: 'closure_issue_manifest',
              artifactState: 'pending',
              filename: 'scope-closure-closure-1-manifest.json',
              format: 'json',
              mediaType: 'application/vnd.tiangong.scope-closure-manifest+json',
              size: null,
              checksumSha256: null,
              artifactExpiresAt: null,
            },
          ],
          scanExecutionId: 'scan-1',
          reusedFromCheckId: 'closure-0',
          createdAt: '2026-07-22T00:00:00Z',
          updatedAt: '2026-07-22T00:01:00Z',
          finishedAt: '2026-07-22T00:01:00Z',
          workerJob: {
            jobId: 'job-1',
            status: 'completed',
            phase: 'complete',
            progressFraction: 1,
            result: { never: 'exposed' },
          },
        },
        error: null,
      });

    const created = await createClosureCheck({
      requestedScope: {
        coverageMode: 'global_eligible',
        lciaMethods: [{ id: '11111111-1111-4111-8111-111111111111', version: '01.00.000' }],
      },
      requestIdempotencyToken: 'request-1',
    });
    const summary = await getClosureCheck('closure-1');

    expect(invokeDataProductCommand).toHaveBeenNthCalledWith(1, {
      action: 'create_closure_check',
      requestedScope: {
        coverageMode: 'global_eligible',
        lciaMethods: [{ id: '11111111-1111-4111-8111-111111111111', version: '01.00.000' }],
      },
      requestIdempotencyToken: 'request-1',
    });
    expect(created.data).toEqual({
      closureCheckId: 'closure-1',
      requestedScopeHash: 'scope-hash',
      policyFingerprint: 'policy-hash',
      reused: false,
      workerJob: {
        jobId: 'job-1',
        jobKind: 'lcia.scope_closure_check',
        status: 'queued',
        progressFraction: 0,
      },
    });
    expect(created.data?.workerJob).not.toHaveProperty('payload');
    expect(summary.data).toMatchObject({
      schemaVersion: 'lcia.scope-closure-check.v1',
      effectiveScopeHash: 'effective-hash',
      dataSnapshotToken: 'snapshot-token',
      scanExecutionId: 'scan-1',
      reusedFromCheckId: 'closure-0',
      workerJob: { jobId: 'job-1', status: 'completed', progressFraction: 1 },
      artifacts: [
        expect.objectContaining({
          artifactRole: 'closure_report_xlsx',
          artifactState: 'ready',
          filename: 'closure-issues.xlsx',
        }),
        expect.objectContaining({
          artifactRole: 'closure_issue_manifest',
          artifactState: 'pending',
          size: null,
          checksumSha256: null,
          artifactExpiresAt: null,
        }),
      ],
    });
    expect(summary.data?.workerJob).not.toHaveProperty('result');
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
      limit: 200,
      rootOnly: false,
    });
  });

  it('deduplicates by job id and rejects unversioned/raw worker rows', () => {
    upsertDataProductTasks([
      {
        schemaVersion: 'task-summary.v2',
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

  it('preserves pending certificate validity and rejects an unversioned task projection', () => {
    expect(
      decodeDataProductTaskSummary({
        schemaVersion: 'task-summary.v2',
        jobId: 'job-pending',
        jobKind: 'lcia.scope_closure_check',
        category: 'data_product',
        workerStatus: 'queued',
        domainValidity: 'pending',
        projectionUpdatedAt: '2026-07-22T00:00:00Z',
        capabilities: {},
      })?.domainValidity,
    ).toBe('pending');

    expect(
      decodeDataProductTaskSummary({
        jobId: 'unversioned',
        jobKind: 'lcia.scope_closure_check',
        category: 'data_product',
        workerStatus: 'queued',
        domainValidity: 'pending',
        projectionUpdatedAt: '2026-07-22T00:00:00Z',
        capabilities: {},
      }),
    ).toBeNull();
  });

  it('keeps closure issue pagination actor-scoped and out of the task feed', async () => {
    (invokeDataProductCommand as jest.Mock).mockResolvedValue({
      data: {
        schemaVersion: 'lcia.scope-closure-issues-page.v1',
        closureCheckId: 'closure-1',
        totalCount: 1,
        nextCursor: null,
        issues: [
          {
            issueId: 'issue-1',
            severity: 'blocker',
            blocking: true,
            code: 'missing_reference',
            title: 'missing_reference',
            occurrenceCount: 2,
            affectedRootCount: 1,
            affectedProcess: { id: 'must-not-survive' },
          },
        ],
      },
      error: null,
    });

    const result = await listClosureCheckIssues('closure-1', {
      afterIssueId: 'issue-2',
      limit: 50,
    });

    expect(invokeDataProductCommand).toHaveBeenCalledWith({
      action: 'list_closure_issues',
      closureCheckId: 'closure-1',
      afterIssueId: 'issue-2',
      limit: 50,
    });
    expect(result.data?.issues[0]).toEqual({
      issueId: 'issue-1',
      severity: 'blocker',
      blocking: true,
      code: 'missing_reference',
      title: 'missing_reference',
      occurrenceCount: 2,
      affectedRootCount: 1,
    });
    expect(result.data?.issues[0]).not.toHaveProperty('affectedProcess');
    expect(result.data?.totalCount).toBe(1);
    expect(result.data).not.toHaveProperty('nextCursor');
  });

  it('whitelists only the safe short-lived report descriptor fields', async () => {
    (invokeDataProductCommand as jest.Mock).mockResolvedValue({
      data: {
        signedDownloadUrl: 'https://storage.example.test/reports/closure-1?token=short-lived',
        artifactId: '11111111-1111-4111-8111-111111111111',
        artifactRole: 'closure_report_xlsx',
        artifactState: 'ready',
        format: 'xlsx',
        filename: 'closure-issues.xlsx',
        mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 1024,
        checksumSha256: 'a'.repeat(64),
        artifactExpiresAt: '2026-08-05T00:00:00Z',
        signedUrlExpiresAt: '2026-07-29T00:05:00Z',
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
      artifactId: '11111111-1111-4111-8111-111111111111',
      artifactRole: 'closure_report_xlsx',
      artifactState: 'ready',
      format: 'xlsx',
      filename: 'closure-issues.xlsx',
      mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 1024,
      checksumSha256: 'a'.repeat(64),
      artifactExpiresAt: '2026-08-05T00:00:00Z',
      signedUrlExpiresAt: '2026-07-29T00:05:00Z',
      expiresInSeconds: 300,
    });
    expect(invokeDataProductCommand).toHaveBeenCalledWith({
      action: 'create_closure_report_download',
      closureCheckId: 'closure-1',
      artifactRole: 'closure_report_xlsx',
    });
    expect(result.data).not.toHaveProperty('storagePath');
    expect(result.data).not.toHaveProperty('rawWorkerResult');
  });

  it('sends each bounded primary role exactly and rejects a mismatched response role', async () => {
    const manifestDescriptor = {
      signedDownloadUrl: 'https://storage.example.test/reports/closure-1-manifest?token=short',
      artifactId: '22222222-2222-4222-8222-222222222222',
      artifactRole: 'closure_issue_manifest',
      artifactState: 'ready',
      format: 'json',
      filename: 'scope-closure-closure-1-manifest.json',
      mediaType: 'application/vnd.tiangong.scope-closure-manifest+json',
      size: 2048,
      checksumSha256: 'b'.repeat(64),
      artifactExpiresAt: '2026-08-05T00:00:00Z',
      signedUrlExpiresAt: '2026-07-29T00:05:00Z',
      expiresInSeconds: 300,
    };
    (invokeDataProductCommand as jest.Mock)
      .mockResolvedValueOnce({ data: manifestDescriptor, error: null })
      .mockResolvedValueOnce({ data: manifestDescriptor, error: null });

    await expect(
      createClosureReportDownload('closure-1', 'closure_issue_manifest'),
    ).resolves.toMatchObject({
      data: { artifactRole: 'closure_issue_manifest', format: 'json' },
      error: null,
    });
    expect(invokeDataProductCommand).toHaveBeenNthCalledWith(1, {
      action: 'create_closure_report_download',
      closureCheckId: 'closure-1',
      artifactRole: 'closure_issue_manifest',
    });

    await expect(
      createClosureReportDownload('closure-1', 'closure_report_xlsx'),
    ).resolves.toMatchObject({
      data: null,
      error: { code: 'INVALID_CLOSURE_REPORT_DESCRIPTOR' },
    });
    expect(invokeDataProductCommand).toHaveBeenNthCalledWith(2, {
      action: 'create_closure_report_download',
      closureCheckId: 'closure-1',
      artifactRole: 'closure_report_xlsx',
    });
  });

  it('covers optional task projection fields, presenter fallbacks, and feed overrides', async () => {
    const projected = decodeDataProductTaskSummary({
      schemaVersion: 'task-summary.v2',
      jobId: 'job-complete',
      jobKind: 'lcia.scope_closure_check',
      category: 'data_product',
      requestedBy: 'user-1',
      workerStatus: 'blocked',
      domainStatus: 'blocked',
      domainValidity: 'unsupported-value',
      projectionUpdatedAt: '2026-07-22T00:02:00Z',
      phase: 'finalize',
      progressFraction: 50,
      progressCounters: {
        completed: 'invalid',
        scanned: 4,
        total: 10,
        unit: 'rows',
      },
      capabilities: {
        canCancel: true,
        canDownloadReport: true,
        canOpenWorkbench: true,
        canPreviewResult: true,
      },
      deepLink: {
        routeKey: 'data_product.package',
        params: { packageId: 'package-1', closureCheckId: '' },
      },
      closureCheckId: 'closure-1',
      resultPackageId: 'package-1',
      blockerCodes: ['blocked', 42],
      errorSummary: 'Blocked by data quality',
    });

    expect(projected).toMatchObject({
      requestedBy: 'user-1',
      domainValidity: 'none',
      phase: 'finalize',
      progressFraction: 0.5,
      progressCounters: { scanned: 4, total: 10, unit: 'rows' },
      capabilities: {
        canCancel: true,
        canDownloadReport: true,
        canOpenWorkbench: true,
        canPreviewResult: true,
      },
      deepLink: { routeKey: 'data_product.package', params: { packageId: 'package-1' } },
      closureCheckId: 'closure-1',
      resultPackageId: 'package-1',
      blockerCodes: ['blocked'],
      errorSummary: 'Blocked by data quality',
    });
    expect(
      decodeDataProductTaskSummary({
        ...projected,
        progressCounters: {
          completed: 1,
          scanned: 'invalid',
          total: 'invalid',
          unit: '',
        },
      })?.progressCounters,
    ).toEqual({ completed: 1 });
    expect(
      decodeDataProductTaskSummary({
        ...projected,
        schemaVersion: 'task-summary.v2',
        category: 'other',
      }),
    ).toBeNull();

    upsertDataProductTasks([
      {
        schemaVersion: 'task-summary.v2',
        jobId: 'closure-fallback',
        jobKind: 'lcia.scope_closure_check',
        category: 'data_product',
        workerStatus: 'queued',
        domainValidity: 'none',
        projectionUpdatedAt: '2026-07-22T00:00:00Z',
        capabilities: {},
      },
      {
        schemaVersion: 'task-summary.v2',
        jobId: 'package-fallback',
        jobKind: 'lcia_result.package_build',
        category: 'data_product',
        workerStatus: 'queued',
        domainValidity: 'none',
        projectionUpdatedAt: '2026-07-22T00:01:00Z',
        capabilities: {},
      },
    ]);
    expect(listDataProductTasks().map((task) => task.title)).toEqual([
      'Result set generation',
      'Data completeness check',
    ]);
    expect(listDataProductTasks()).toBe(listDataProductTasks());

    (invokeDataProductCommand as jest.Mock).mockResolvedValue({ data: { items: [] }, error: null });
    await listDataProductTaskFeed({
      category: 'data_product',
      jobKinds: ['custom'],
      statuses: [],
      updatedSince: '2026-07-22T00:00:00Z',
      limit: 5,
      rootOnly: true,
    });
    expect(invokeDataProductCommand).toHaveBeenLastCalledWith({
      action: 'list_task_feed',
      category: 'data_product',
      jobKinds: ['custom'],
      updatedSince: '2026-07-22T00:00:00Z',
      limit: 5,
      rootOnly: true,
    });
  });

  it('refreshes and subscribes to the shared safe task store while surfacing feed errors', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeDataProductTasks(listener);
    const item = {
      schemaVersion: 'task-summary.v2',
      jobId: 'refreshed-job',
      jobKind: 'lcia_result.package_build',
      category: 'data_product',
      workerStatus: 'completed',
      domainValidity: 'valid',
      projectionUpdatedAt: '2026-07-22T00:03:00Z',
      capabilities: {},
    };
    (invokeDataProductCommand as jest.Mock).mockResolvedValueOnce({
      data: { items: [item] },
      error: null,
    });
    await expect(refreshDataProductTasks()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ jobId: 'refreshed-job' })]),
    );
    expect(listener).toHaveBeenCalled();
    unsubscribe();

    clearTaskSummaries();
    (invokeDataProductCommand as jest.Mock).mockResolvedValueOnce({
      data: { items: 'invalid' },
      error: null,
    });
    await expect(refreshDataProductTasks()).resolves.toEqual([]);

    (invokeDataProductCommand as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { message: 'feed failed' },
    });
    await expect(refreshDataProductTasks()).rejects.toThrow('feed failed');
  });

  it('orders, presents, replaces, notifies, and unsubscribes shared task summaries', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeTaskSummaries(listener);
    const unregister = registerTaskSummaryPresenter({
      key: 'test.custom.presenter',
      matches: (summary) => summary.jobKind === 'custom',
      present: (summary) => ({ ...summary, title: `Presented ${summary.title}` }),
    });
    const base = {
      schemaVersion: 'task-summary.v2' as const,
      category: 'data_product' as const,
      workerStatus: 'running' as const,
      domainValidity: 'none' as const,
      capabilities: {
        canCancel: false,
        canDownloadReport: false,
        canOpenWorkbench: false,
        canPreviewResult: false,
      },
      runState: 'active' as const,
      createdAt: '2026-07-22T00:00:00Z',
    };
    upsertTaskSummaries([
      {
        ...base,
        jobId: 'older',
        id: 'older',
        jobKind: 'custom',
        title: 'older',
        projectionUpdatedAt: '2026-07-22T00:00:00Z',
        updatedAt: '2026-07-22T00:00:00Z',
      },
      {
        ...base,
        jobId: 'newer',
        id: 'newer',
        jobKind: 'unmatched',
        title: 'newer',
        projectionUpdatedAt: '2026-07-22T00:01:00Z',
        updatedAt: '2026-07-22T00:01:00Z',
      },
    ]);
    expect(listTaskSummaries().map(({ jobId }) => jobId)).toEqual(['newer', 'older']);
    expect(listTaskSummaries()[1].title).toBe('Presented older');

    upsertTaskSummaries([
      {
        ...base,
        jobId: 'older',
        id: 'older',
        jobKind: 'unmatched',
        title: 'replacement',
        projectionUpdatedAt: '2026-07-22T00:02:00Z',
        updatedAt: '2026-07-22T00:02:00Z',
      },
    ]);
    expect(listTaskSummaries()[0].title).toBe('replacement');
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    clearTaskSummaries();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(unregister()).toBe(true);
  });

  it('fails closed for every malformed closure projection and accepts sparse safe variants', () => {
    expect(decodeClosureCheckWorkerJob(null)).toBeNull();
    expect(decodeClosureCheckWorkerJob({})).toBeNull();
    expect(
      decodeClosureCheckWorkerJob({
        id: 'job-sparse',
        status: 3,
        progress: Number.NaN,
        blockerCodes: 'invalid',
      }),
    ).toEqual({ jobId: 'job-sparse' });
    expect(
      decodeClosureCheckWorkerJob({
        jobId: 'job-full',
        jobKind: 'lcia.scope_closure_check',
        status: 'failed',
        phase: 'finalize',
        progressFraction: 0.75,
        errorCode: 'FAILED',
        blockerCodes: ['a', '', 2],
        createdAt: 'created',
        updatedAt: 'updated',
        finishedAt: 'finished',
      }),
    ).toEqual({
      jobId: 'job-full',
      jobKind: 'lcia.scope_closure_check',
      status: 'failed',
      phase: 'finalize',
      progressFraction: 0.75,
      errorCode: 'FAILED',
      blockerCodes: ['a'],
      createdAt: 'created',
      updatedAt: 'updated',
      finishedAt: 'finished',
    });

    const createBase = {
      closureCheckId: 'closure-1',
      requestedScopeHash: 'scope',
      policyFingerprint: 'policy',
      reused: true,
      workerJob: null,
    };
    expect(decodeClosureCheckCreateResult(null)).toBeNull();
    for (const patch of [
      { closureCheckId: '' },
      { requestedScopeHash: '' },
      { policyFingerprint: '' },
      { reused: 'yes' },
      { workerJob: {} },
    ]) {
      expect(decodeClosureCheckCreateResult({ ...createBase, ...patch })).toBeNull();
    }
    expect(decodeClosureCheckCreateResult(createBase)).toEqual(createBase);

    const summaryBase = {
      schemaVersion: 'lcia.scope-closure-check.v1',
      closureCheckId: 'closure-1',
      runStatus: 'passed',
      certificateValidity: 'valid',
      scanCompleteness: 'complete',
    };
    expect(decodeClosureCheckSummary(null)).toBeNull();
    for (const patch of [
      { schemaVersion: 'wrong' },
      { closureCheckId: '' },
      { runStatus: 'unknown' },
      { certificateValidity: 'unknown' },
      { scanCompleteness: 'invalid' },
    ]) {
      expect(decodeClosureCheckSummary({ ...summaryBase, ...patch })).toBeNull();
    }
    expect(
      decodeClosureCheckSummary({
        ...summaryBase,
        artifacts: [
          { artifactRole: 'unsupported', artifactState: 'pending' },
          {
            artifactRole: 'closure_report_xlsx',
            artifactState: 'ready',
            size: 'not-a-number',
          },
        ],
      }),
    ).toBeNull();
    const exactArtifacts = databaseArtifactContract.ownerCheckRead.artifacts.map(
      (artifact: Record<string, unknown>, index: number) => ({
        ...artifact,
        filename: String(artifact.filename).replace('<closureCheckId>', 'closure-1'),
        checksumSha256: index === 0 ? 'a'.repeat(64) : 'b'.repeat(64),
        artifactExpiresAt: '2026-08-05T00:00:00Z',
      }),
    );
    expect(decodeClosureCheckSummary({ ...summaryBase, artifacts: exactArtifacts })).toMatchObject({
      ...summaryBase,
      artifacts: exactArtifacts,
    });
    for (const artifacts of [
      [...exactArtifacts].reverse(),
      [...exactArtifacts, exactArtifacts[0]],
      [exactArtifacts[0], exactArtifacts[0]],
      [exactArtifacts[0], { ...exactArtifacts[1], size: 'malformed' }],
      { 0: exactArtifacts[0], 1: exactArtifacts[1] },
    ]) {
      expect(decodeClosureCheckSummary({ ...summaryBase, artifacts })).toBeNull();
    }
    expect(decodeClosureCheckSummary({ ...summaryBase, artifacts: null })).toEqual(summaryBase);
    expect(decodeClosureCheckSummary({ ...summaryBase, workerJob: null })).toMatchObject({
      ...summaryBase,
      workerJob: null,
    });
    expect(decodeClosureCheckSummary({ ...summaryBase, workerJob: {} })).toEqual(summaryBase);
  });

  it('validates closure issues, pages, and report descriptors field by field', () => {
    const issueBase = {
      issueId: 'issue-1',
      severity: 'blocker',
      blocking: true,
      code: 'missing_ref',
      title: 'Missing reference',
      occurrenceCount: 2,
      affectedRootCount: 1,
    };
    expect(decodeClosureCheckIssue(null)).toBeNull();
    for (const patch of [
      { issueId: '' },
      { severity: 'blocking' },
      { severity: 'invalid' },
      { blocking: 'yes' },
      { code: '' },
      { title: '' },
      { occurrenceCount: Number.NaN },
      { occurrenceCount: -1 },
      { affectedRootCount: undefined },
      { affectedRootCount: -1 },
    ]) {
      expect(decodeClosureCheckIssue({ ...issueBase, ...patch })).toBeNull();
    }
    expect(
      decodeClosureCheckIssue({
        ...issueBase,
        summary: 'summary',
        suggestedAction: 'repair',
      }),
    ).toMatchObject({ summary: 'summary', suggestedAction: 'repair' });

    const pageBase = {
      schemaVersion: 'lcia.scope-closure-issues-page.v1',
      closureCheckId: 'closure-1',
      issues: [issueBase],
      totalCount: 1,
    };
    expect(decodeClosureCheckIssuePage(null)).toBeNull();
    expect(decodeClosureCheckIssuePage({ ...pageBase, schemaVersion: 'wrong' })).toBeNull();
    for (const patch of [
      { closureCheckId: '' },
      { issues: null },
      { totalCount: undefined },
      { totalCount: 1.5 },
      { totalCount: -1 },
      { issues: [{}] },
    ]) {
      expect(decodeClosureCheckIssuePage({ ...pageBase, ...patch })).toBeNull();
    }
    expect(decodeClosureCheckIssuePage({ ...pageBase, nextCursor: 'issue-1' })).toMatchObject({
      nextCursor: 'issue-1',
    });

    const descriptor = {
      signedDownloadUrl: 'https://storage.example.test/report.xlsx',
      artifactId: '11111111-1111-4111-8111-111111111111',
      artifactRole: 'closure_report_xlsx',
      artifactState: 'ready',
      format: 'xlsx',
      filename: 'closure-issues.xlsx',
      mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 0,
      checksumSha256: 'a'.repeat(64),
      artifactExpiresAt: '2026-08-05T00:00:00Z',
      signedUrlExpiresAt: '2026-07-29T00:01:00Z',
      expiresInSeconds: 60,
    };
    expect(decodeClosureReportDownloadDescriptor(null)).toBeNull();
    expect(decodeClosureReportDownloadDescriptor([])).toBeNull();
    for (const patch of [
      { signedDownloadUrl: 'not a url' },
      { signedDownloadUrl: 'ftp://example.test/report.xlsx' },
      { artifactId: '' },
      { artifactId: 'not-a-uuid' },
      { artifactRole: 'unsupported' },
      { artifactState: 'expired' },
      { format: '' },
      { format: 'json' },
      { filename: '' },
      { filename: '../closure-issues.xlsx' },
      { mediaType: '' },
      { size: '0' },
      { size: 1.5 },
      { size: -1 },
      { checksumSha256: '' },
      { checksumSha256: 'abc' },
      { artifactExpiresAt: 'invalid' },
      { signedUrlExpiresAt: 'invalid' },
      { signedUrlExpiresAt: '2026-08-06T00:00:00Z' },
      { expiresInSeconds: Number.NaN },
      { expiresInSeconds: 0 },
      { expiresInSeconds: 901 },
    ]) {
      expect(decodeClosureReportDownloadDescriptor({ ...descriptor, ...patch })).toBeNull();
    }
    expect(decodeClosureReportDownloadDescriptor(descriptor)).toEqual(descriptor);

    expect(decodeClosureArtifact(null)).toBeNull();
    expect(
      decodeClosureArtifact({
        artifactRole: 'unsupported',
        artifactState: 'pending',
      }),
    ).toBeNull();
    expect(
      decodeClosureArtifact({
        artifactRole: 'closure_report_xlsx',
        artifactState: 'unknown',
      }),
    ).toBeNull();
    expect(
      decodeClosureArtifact({
        artifactRole: 'closure_issue_manifest',
        artifactState: 'pending',
        filename: 'scope-closure-closure-1-manifest.json',
        format: 'json',
        mediaType: 'application/vnd.tiangong.scope-closure-manifest+json',
        size: null,
        checksumSha256: null,
        artifactExpiresAt: null,
      }),
    ).toEqual({
      artifactRole: 'closure_issue_manifest',
      artifactState: 'pending',
      filename: 'scope-closure-closure-1-manifest.json',
      format: 'json',
      mediaType: 'application/vnd.tiangong.scope-closure-manifest+json',
      size: null,
      checksumSha256: null,
      artifactExpiresAt: null,
    });
    expect(
      decodeClosureArtifact({
        artifactRole: 'closure_report_xlsx',
        artifactState: 'ready',
        filename: null,
        format: null,
        mediaType: null,
        size: null,
        checksumSha256: null,
        artifactExpiresAt: null,
      }),
    ).toBeNull();
    expect(
      decodeClosureArtifact({
        artifactRole: 'closure_report_xlsx',
        artifactState: 'deleted',
        filename: null,
        format: null,
        mediaType: null,
        size: null,
        checksumSha256: null,
        artifactExpiresAt: null,
      }),
    ).toEqual({
      artifactRole: 'closure_report_xlsx',
      artifactState: 'deleted',
      filename: null,
      format: null,
      mediaType: null,
      size: null,
      checksumSha256: null,
      artifactExpiresAt: null,
    });
    expect(
      decodeClosureArtifact({
        artifactRole: 'closure_report_xlsx',
        artifactState: 'expired',
        filename: 'closure-issues.xlsx',
        format: 'xlsx',
        mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 128,
        checksumSha256: 'c'.repeat(64),
        artifactExpiresAt: '2026-07-29T00:00:00Z',
      }),
    ).toEqual({
      artifactRole: 'closure_report_xlsx',
      artifactState: 'expired',
      filename: 'closure-issues.xlsx',
      format: 'xlsx',
      mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 128,
      checksumSha256: 'c'.repeat(64),
      artifactExpiresAt: '2026-07-29T00:00:00Z',
    });
    const availabilityDescriptor = {
      artifactRole: 'closure_report_xlsx',
      artifactState: 'ready',
      format: 'xlsx',
      filename: 'closure-issues.xlsx',
      mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 0,
      checksumSha256: 'a'.repeat(64),
      artifactExpiresAt: '2026-08-05T00:00:00Z',
    };
    expect(decodeClosureArtifact(availabilityDescriptor)).toEqual(availabilityDescriptor);
    expect(
      decodeClosureArtifact({
        ...availabilityDescriptor,
        artifactRole: 'closure_issue_manifest',
        format: 'json',
        filename: 'closure-issues-manifest.json',
        mediaType: 'application/vnd.tiangong.scope-closure-manifest+json',
      }),
    ).toMatchObject({
      artifactRole: 'closure_issue_manifest',
      artifactState: 'ready',
      format: 'json',
    });
    expect(
      decodeClosureArtifact({
        ...availabilityDescriptor,
        artifactRole: 'closure_issues_partition_000001',
        format: 'ndjson+zstd',
        filename: 'closure-issues-000001.ndjson.zst',
        mediaType: 'application/x-ndjson+zstd',
      }),
    ).toBeNull();

    for (const patch of [
      { filename: '../closure-issues.xlsx' },
      { size: '1024' },
      { size: -1 },
      { checksumSha256: 'not-a-hash' },
      { artifactExpiresAt: 'not-a-timestamp' },
      { format: 'json' },
      { mediaType: 'application/json' },
    ]) {
      expect(decodeClosureArtifact({ ...availabilityDescriptor, ...patch })).toBeNull();
    }
    expect(
      decodeClosureArtifact({
        artifactRole: 'closure_report_xlsx',
        artifactState: 'deleted',
        format: null,
        filename: null,
        mediaType: null,
        size: null,
        checksumSha256: null,
        artifactExpiresAt: null,
        bucket: 'must-not-survive',
      }),
    ).toBeNull();
  });

  it('decodes the exact Database owner-artifact fixture shape without identifiers or locators', () => {
    const expectedProjectionFields = [
      'artifactRole',
      'artifactState',
      'filename',
      'format',
      'mediaType',
      'size',
      'checksumSha256',
      'artifactExpiresAt',
    ];
    expect(databaseArtifactContract.schemaVersion).toBe('lcia.scope-closure-cross-repo-fixture.v1');
    expect(Object.keys(databaseArtifactContract)).toEqual([
      'schemaVersion',
      'ownerCheckRead',
      'download',
      'workerGc',
      'publicationStaging',
    ]);
    expect(databaseArtifactContract.ownerCheckRead.artifactOrder).toEqual([
      'closure_report_xlsx',
      'closure_issue_manifest',
    ]);
    expect(databaseArtifactContract.ownerCheckRead.artifactStates).toEqual([
      'pending',
      'ready',
      'expired',
      'deleted',
      'failed',
    ]);
    expect(databaseArtifactContract.download.selectors).toEqual([
      'closure_report_xlsx',
      'closure_issue_manifest',
    ]);
    expect(databaseArtifactContract.workerGc).toEqual(
      expect.objectContaining({
        previewSignature: 'svc_lcia_scope_closure_artifact_gc_preview(integer)',
        claimSignature: 'svc_lcia_scope_closure_artifact_gc_claim(integer,integer)',
        renewSignature: 'svc_lcia_scope_closure_artifact_gc_renew(uuid,integer)',
        previewIsNonMutating: true,
        renewalRequiresUnexpiredCurrentToken: true,
      }),
    );
    expect(databaseArtifactContract.publicationStaging).toEqual(
      expect.objectContaining({
        acl: 'service_role only',
        createSignature:
          'svc_lcia_scope_closure_artifact_write_set_create(uuid,text,jsonb,integer,uuid)',
        finalizeSignature: 'svc_lcia_scope_closure_artifact_write_set_finalize(uuid,uuid)',
        publicationInvariant:
          'all planned locators are registered before upload and all artifacts become ready in one finalize transaction',
      }),
    );

    const decoded = databaseArtifactContract.ownerCheckRead.artifacts.map(
      (artifact: Record<string, unknown>, index: number) => {
        expect(Object.keys(artifact)).toEqual(expectedProjectionFields);
        databaseArtifactContract.ownerCheckRead.forbiddenFields.forEach((field: string) => {
          expect(artifact).not.toHaveProperty(field);
        });
        return decodeClosureArtifact({
          ...artifact,
          filename: String(artifact.filename).replace('<closureCheckId>', 'closure-1'),
          checksumSha256: index === 0 ? 'a'.repeat(64) : 'b'.repeat(64),
          artifactExpiresAt: '2026-08-05T00:00:00Z',
        });
      },
    );

    expect(decoded).toEqual([
      expect.objectContaining({
        artifactRole: 'closure_report_xlsx',
        artifactState: 'ready',
        format: 'xlsx',
      }),
      expect.objectContaining({
        artifactRole: 'closure_issue_manifest',
        artifactState: 'ready',
        format: 'json',
      }),
    ]);
  });

  it('normalizes closure command transport errors, empty data, and invalid payloads', async () => {
    (invokeDataProductCommand as jest.Mock)
      .mockResolvedValueOnce({ data: null, error: { message: 'transport failed' } })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { invalid: true }, error: null })
      .mockResolvedValueOnce({ data: { invalid: true }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'download failed' } })
      .mockResolvedValueOnce({ data: { invalid: true }, error: null })
      .mockResolvedValueOnce({
        data: {
          schemaVersion: 'lcia.scope-closure-issues-page.v1',
          closureCheckId: 'closure-1',
          issues: [],
          totalCount: 0,
        },
        error: null,
      });

    await expect(getClosureCheck('closure-1')).resolves.toMatchObject({
      error: { message: 'transport failed' },
    });
    await expect(getClosureCheck('closure-1')).resolves.toMatchObject({ data: null, error: null });
    await expect(getClosureCheck('closure-1')).resolves.toMatchObject({
      data: null,
      error: { code: 'INVALID_CLOSURE_CHECK_SUMMARY' },
    });
    await expect(
      createClosureCheck({
        requestedScope: {
          coverageMode: 'global_eligible',
          lciaMethods: [{ id: '11111111-1111-4111-8111-111111111111', version: '01.00.000' }],
        },
        requestIdempotencyToken: 'invalid-result',
      }),
    ).resolves.toMatchObject({
      data: null,
      error: { code: 'INVALID_CLOSURE_CHECK_CREATE_RESULT' },
    });
    await expect(createClosureReportDownload('closure-1')).resolves.toMatchObject({
      error: { message: 'download failed' },
    });
    await expect(createClosureReportDownload('closure-1')).resolves.toMatchObject({
      data: null,
      error: { code: 'INVALID_CLOSURE_REPORT_DESCRIPTOR' },
    });
    await expect(listClosureCheckIssues('closure-1')).resolves.toMatchObject({
      data: { issues: [], totalCount: 0 },
    });
    expect(invokeDataProductCommand).toHaveBeenLastCalledWith({
      action: 'list_closure_issues',
      closureCheckId: 'closure-1',
    });
  });
});
