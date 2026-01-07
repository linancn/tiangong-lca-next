// @ts-nocheck
import {
  ConcurrencyController,
  ReffPath,
  checkData,
  checkReferences,
  checkRequiredFields,
  checkReviewReport,
  checkVersions,
  dealModel,
  dealProcress,
  getAllRefObj,
  getErrRefTab,
  getRefTableName,
  updateReviewsAfterCheckData,
  updateUnReviewToUnderReview,
} from '@/pages/Utils/review';

const mockGetRefData = jest.fn();
const mockGetRefDataByIds = jest.fn();
const mockGetReviewsOfData = jest.fn();
const mockUpdateDateToReviewState = jest.fn();
const mockUpdateStateCodeApi = jest.fn();

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  getRefData: (...args: any[]) => mockGetRefData(...args),
  getRefDataByIds: (...args: any[]) => mockGetRefDataByIds(...args),
  getReviewsOfData: (...args: any[]) => mockGetReviewsOfData(...args),
  updateDateToReviewState: (...args: any[]) => mockUpdateDateToReviewState(...args),
  updateStateCodeApi: (...args: any[]) => mockUpdateStateCodeApi(...args),
}));

const mockGetLifeCycleModelDetail = jest.fn();

jest.mock('@/services/lifeCycleModels/api', () => ({
  __esModule: true,
  getLifeCycleModelDetail: (...args: any[]) => mockGetLifeCycleModelDetail(...args),
}));

const mockAddReviewsApi = jest.fn();

jest.mock('@/services/reviews/api', () => ({
  __esModule: true,
  addReviewsApi: (...args: any[]) => mockAddReviewsApi(...args),
}));

const mockGetSourcesByIdsAndVersions = jest.fn();

jest.mock('@/services/sources/api', () => ({
  __esModule: true,
  getSourcesByIdsAndVersions: (...args: any[]) => mockGetSourcesByIdsAndVersions(...args),
}));

const mockGetTeamMessageApi = jest.fn();

jest.mock('@/services/teams/api', () => ({
  __esModule: true,
  getTeamMessageApi: (...args: any[]) => mockGetTeamMessageApi(...args),
}));

const mockGetUserId = jest.fn();
const mockGetUsersByIds = jest.fn();

jest.mock('@/services/users/api', () => ({
  __esModule: true,
  getUserId: (...args: any[]) => mockGetUserId(...args),
  getUsersByIds: (...args: any[]) => mockGetUsersByIds(...args),
}));

describe('review utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRefData.mockReset();
    mockGetRefDataByIds.mockReset();
    mockGetReviewsOfData.mockReset();
    mockUpdateDateToReviewState.mockReset();
    mockUpdateStateCodeApi.mockReset();
    mockGetLifeCycleModelDetail.mockReset();
    mockAddReviewsApi.mockReset();
    mockGetSourcesByIdsAndVersions.mockReset();
    mockGetTeamMessageApi.mockReset();
    mockGetUserId.mockReset();
    mockGetUsersByIds.mockReset();
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('limits concurrency and resolves tasks in order', async () => {
    const controller = new ConcurrencyController(2);
    const starts: number[] = [];
    const runningCounts: number[] = [];
    let running = 0;
    const gateResolvers: Array<() => void> = [];

    const tasks = Array.from({ length: 4 }, (_, index) =>
      controller.add(async () => {
        starts.push(index);
        running += 1;
        runningCounts.push(running);
        await new Promise<void>((resolve) => {
          gateResolvers.push(() => {
            resolve();
            running -= 1;
          });
        });
        return index;
      }),
    );

    await Promise.resolve();
    expect(starts).toEqual([0, 1]);

    gateResolvers.splice(0, 2).forEach((unlock) => unlock());
    await new Promise((resolve) => {
      process.nextTick(resolve);
    });
    expect(starts).toEqual([0, 1, 2, 3]);
    gateResolvers.splice(0, 2).forEach((unlock) => unlock());
    const results = await Promise.all(tasks);
    expect(results).toEqual([0, 1, 2, 3]);
    expect(Math.max(...runningCounts)).toBeLessThanOrEqual(2);
  });

  it('returns correct table names', () => {
    expect(getRefTableName('process data set')).toBe('processes');
    expect(getRefTableName('lifeCycleModel data set')).toBe('lifecyclemodels');
    expect(getRefTableName('unknown')).toBeUndefined();
  });

  it('collects nested references without double counting shared objects', () => {
    const ref = {
      '@refObjectId': 'ref-1',
      '@version': '01.00.000',
      '@type': 'flow data set',
    };
    const result = getAllRefObj({
      top: ref,
      nested: {
        again: ref,
        list: [
          {
            '@refObjectId': 'ref-2',
            '@version': '01.00.000',
            '@type': 'process data set',
          },
        ],
      },
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toBe(ref);
    expect(result[1]).toMatchObject({
      '@refObjectId': 'ref-2',
      '@type': 'process data set',
    });
  });

  it('marks process states correctly', () => {
    const unReview: any[] = [];
    const underReview: any[] = [];
    const unRuleVerification: any[] = [];
    const nonExistent: any[] = [];

    dealProcress(
      {
        id: 'proc-1',
        version: '01',
        stateCode: 10,
        ruleVerification: false,
      },
      unReview,
      underReview,
      unRuleVerification,
      nonExistent,
    );
    expect(unReview).toEqual([
      {
        '@refObjectId': 'proc-1',
        '@version': '01',
        '@type': 'process data set',
      },
    ]);
    expect(unRuleVerification[0]).toMatchObject({
      '@refObjectId': 'proc-1',
    });

    dealProcress(
      {
        id: 'proc-2',
        version: '02',
        stateCode: 50,
        ruleVerification: true,
      },
      unReview,
      underReview,
      unRuleVerification,
      nonExistent,
    );
    expect(underReview).toHaveLength(1);
  });

  it('marks model states correctly', () => {
    const unReview: any[] = [];
    const underReview: any[] = [];
    const unRuleVerification: any[] = [];
    const nonExistent: any[] = [];

    dealModel(
      {
        id: 'model-1',
        version: '01',
        stateCode: 80,
        ruleVerification: false,
      },
      unReview,
      underReview,
      unRuleVerification,
      nonExistent,
    );
    expect(underReview[0]).toMatchObject({
      '@refObjectId': 'model-1',
      '@type': 'lifeCycleModel data set',
    });
    expect(unRuleVerification[0]).toMatchObject({
      '@refObjectId': 'model-1',
    });

    dealModel(undefined, unReview, underReview, unRuleVerification, nonExistent);
    expect(nonExistent[0]['@type']).toBe('lifeCycleModel data set');
  });

  it('walks reference graph and categorises states', async () => {
    const unReview: any[] = [];
    const underReview: any[] = [];
    const unRuleVerification: any[] = [];
    const nonExistent: any[] = [];

    mockGetRefData.mockImplementation(async (id: string) => {
      if (id === 'flow-1') {
        return {
          success: true,
          data: {
            id: 'flow-1',
            stateCode: 10,
            ruleVerification: true,
            json: {
              nested: {
                '@refObjectId': 'flow-2',
                '@version': '01',
                '@type': 'flow data set',
              },
            },
          },
        };
      }
      if (id === 'flow-2') {
        return {
          success: true,
          data: {
            id: 'flow-2',
            stateCode: 30,
            ruleVerification: false,
            json: {},
          },
        };
      }
      if (id === 'missing') {
        return { success: false, data: null };
      }
      return { success: true, data: null };
    });
    mockGetLifeCycleModelDetail.mockResolvedValue({ success: false });

    const refs = [
      {
        '@refObjectId': 'flow-1',
        '@version': '01',
        '@type': 'flow data set',
      },
      {
        '@refObjectId': 'missing',
        '@version': '01',
        '@type': 'source data set',
      },
    ];

    await checkReferences(
      refs,
      new Map(),
      'team-1',
      unReview,
      underReview,
      unRuleVerification,
      nonExistent,
    );

    expect(mockGetRefData).toHaveBeenCalledTimes(3);
    expect(unReview).toHaveLength(1);
    expect(underReview).toHaveLength(1);
    expect(unRuleVerification).toHaveLength(1);
    expect(nonExistent).toHaveLength(1);
  });

  it('marks versions under review and in TG on reference path via checkVersions', async () => {
    const path = new ReffPath(
      {
        '@refObjectId': 'proc-1',
        '@version': '01',
        '@type': 'process data set',
      },
      true,
      false,
    );

    const child = new ReffPath(
      {
        '@refObjectId': 'flow-1',
        '@version': '01',
        '@type': 'flow data set',
      },
      true,
      false,
    );

    path.addChild(child);

    mockGetRefDataByIds.mockImplementation(async (ids: string[], tableName: string) => {
      if (tableName === 'processes') {
        return {
          data: [
            {
              id: 'proc-1',
              version: '01',
              state_code: 30,
            },
          ],
        };
      }
      if (tableName === 'flows') {
        return {
          data: [
            {
              id: 'flow-1',
              version: '02',
              state_code: 100,
            },
          ],
        };
      }
      return { data: [] };
    });

    await checkVersions(new Set(['proc-1:01:process data set', 'flow-1:01:flow data set']), path);

    expect(mockGetRefDataByIds).toHaveBeenCalledTimes(2);
    expect(mockGetRefDataByIds).toHaveBeenCalledWith(['proc-1'], 'processes');
    expect(mockGetRefDataByIds).toHaveBeenCalledWith(['flow-1'], 'flows');

    expect((path as any).versionUnderReview).toBe(true);
    expect((path as any).underReviewVersion).toBe('01');
    expect((child as any).versionIsInTg).toBe(true);
  });

  it('checks data wrapper using checkReferences', async () => {
    mockGetRefData.mockImplementation(async (id: string) => {
      if (id === 'flow-3') {
        return {
          success: true,
          data: {
            stateCode: 10,
            ruleVerification: true,
            json: {
              nested: {
                '@refObjectId': 'flow-4',
                '@version': '01',
                '@type': 'flow data set',
              },
            },
          },
        };
      }
      if (id === 'flow-4') {
        return {
          success: true,
          data: {
            stateCode: 30,
            ruleVerification: false,
            json: {},
          },
        };
      }
      return { success: false, data: null };
    });
    mockGetLifeCycleModelDetail.mockResolvedValue({ success: false, data: null });

    const unRuleVerification: any[] = [];
    const nonExistent: any[] = [];
    const path = new ReffPath({
      '@refObjectId': 'root',
      '@version': '01',
      '@type': 'process data set',
    });

    await checkData(
      {
        '@refObjectId': 'flow-3',
        '@version': '01',
        '@type': 'flow data set',
      },
      unRuleVerification,
      nonExistent,
      path,
    );

    expect(mockGetRefData).toHaveBeenCalledWith('flow-3', '01', 'flows');
    expect(unRuleVerification).toHaveLength(1);
  });

  it('updates under review items to pending review', async () => {
    mockGetReviewsOfData.mockResolvedValue([{ id: 'existing-review' }]);
    mockUpdateDateToReviewState.mockResolvedValue({ success: true });

    const items = [
      { '@refObjectId': 'item-1', '@version': '01', '@type': 'process data set' },
      { '@refObjectId': 'item-2', '@version': '01', '@type': 'flow data set' },
    ];

    const results = await updateUnReviewToUnderReview(items, 'review-1');

    expect(mockGetReviewsOfData).toHaveBeenCalledTimes(2);
    expect(mockUpdateDateToReviewState).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(2);
    expect(mockUpdateDateToReviewState).toHaveBeenCalledWith(
      'item-1',
      '01',
      'processes',
      expect.objectContaining({
        state_code: 20,
      }),
    );
  });

  it('validates required fields and returns unique tab names', () => {
    const requiredFields = {
      'modellingAndValidation.validation.review': 'validation',
      'modellingAndValidation.complianceDeclarations.compliance': 'complianceDeclarations',
      'common:classification.common:class': 'classification',
    };
    const formData = {
      modellingAndValidation: {
        validation: {
          review: [
            {
              '@type': 'type',
              'common:scope': [{ '@name': 'scope', 'common:method': { '@name': 'method' } }],
              'common:reviewDetails': ['detail'],
            },
          ],
        },
        complianceDeclarations: {
          compliance: [
            {
              foo: 'bar',
              'common:referenceToComplianceSystem': {
                '@refObjectId': 'sys',
              },
            },
          ],
        },
      },
      'common:classification': {
        'common:class': {
          id: ['', ''],
        },
      },
    };

    const result = checkRequiredFields(requiredFields, formData);

    expect(result.checkResult).toBe(false);
    expect(result.errTabNames).toEqual(['classification']);
  });

  it('locates tab for erroneous reference', () => {
    const ref = {
      '@refObjectId': 'ref-10',
      '@version': '01',
      '@type': 'source data set',
    };
    const data = {
      modellingAndValidation: {
        complianceDeclarations: {
          compliance: [ref],
        },
      },
    };

    expect(getErrRefTab(ref, data)).toBe('modellingAndValidation');
  });

  it('collects problem nodes from reference path', () => {
    const parent = new ReffPath(
      {
        '@refObjectId': 'parent',
        '@version': '01',
        '@type': 'flow data set',
      },
      true,
      false,
    );
    const child = new ReffPath(
      {
        '@refObjectId': 'child',
        '@version': '01',
        '@type': 'flow data set',
      },
      false,
      false,
    );
    parent.addChild(child);

    expect(parent.findProblemNodes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ '@refObjectId': 'child' }),
        expect.objectContaining({ '@refObjectId': 'parent' }),
      ]),
    );
  });

  it('aggregates review data and submits to reviews API', async () => {
    mockGetTeamMessageApi.mockResolvedValue({
      data: [{ json: { title: 'Team Title' } }],
    });
    mockGetUserId.mockResolvedValue('user-1');
    mockGetUsersByIds.mockResolvedValue([
      { id: 'user-1', display_name: 'Tester', email: 't@ex.com' },
    ]);
    mockAddReviewsApi.mockResolvedValue({ success: true });

    await updateReviewsAfterCheckData('team-1', { foo: 'bar' }, 'review-7');

    expect(mockAddReviewsApi).toHaveBeenCalledWith(
      'review-7',
      expect.objectContaining({
        team: expect.objectContaining({ id: 'team-1', name: 'Team Title' }),
        user: expect.objectContaining({ id: 'user-1', name: 'Tester' }),
        data: { foo: 'bar' },
        logs: expect.arrayContaining([expect.objectContaining({ action: 'submit_review' })]),
      }),
    );
  });

  it('returns references that remain under review when checking reports', async () => {
    mockGetSourcesByIdsAndVersions.mockResolvedValue({
      data: [
        { id: 'report-1', version: '01', state_code: 30 },
        { id: 'report-2', version: '01', state_code: 100 },
      ],
    });

    const result = await checkReviewReport([
      {
        'common:referenceToCompleteReviewReport': {
          '@refObjectId': 'report-1',
          '@version': '01',
        },
      },
      {
        'common:referenceToCompleteReviewReport': {
          '@refObjectId': 'report-2',
          '@version': '01',
        },
      },
    ]);

    expect(mockGetSourcesByIdsAndVersions).toHaveBeenCalledWith([
      { id: 'report-1', version: '01' },
      { id: 'report-2', version: '01' },
    ]);
    expect(result).toEqual([
      {
        id: 'report-1',
        version: '01',
        stateCode: 30,
      },
    ]);
  });
});
