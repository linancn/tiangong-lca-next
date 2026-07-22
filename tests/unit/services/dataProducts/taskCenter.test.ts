jest.mock('@/services/workerJobs/api', () => ({
  __esModule: true,
  requestWorkerJobsApi: jest.fn(),
}));

import { presentDataProductWorkerJob } from '@/services/dataProducts/taskCenter';

describe('Data Product TaskSummaryV2 presenter', () => {
  it('keeps worker status and certificate validity as separate facts', () => {
    const summary = presentDataProductWorkerJob({
      id: 'job-1',
      jobKind: 'lcia.scope_closure_check',
      subjectType: 'lcia_scope_closure_check',
      subjectId: 'closure-1',
      status: 'completed',
      progress: 0.8,
      canDownloadReport: true,
      result: {
        runStatus: 'passed',
        certificateValidity: 'stale',
        scanCompleteness: 'complete',
      },
    });

    expect(summary).toMatchObject({
      jobId: 'job-1',
      kind: 'lcia.scope_closure_check',
      workerStatus: 'completed',
      runState: 'succeeded',
      domainStatus: 'passed',
      domainValidity: 'stale',
      progressFraction: 0.8,
      capabilities: { canDownloadReport: true },
      deepLink: { route: 'data-processing', tab: 'builds', closureCheckId: 'closure-1' },
    });
  });
});
