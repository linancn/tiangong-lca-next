import {
  buildValidationIssues,
  dealModel,
  dealProcress,
  enrichValidationIssuesWithOwner,
  getDatasetDetailPath,
  getDatasetDetailUrl,
  getDatasetPath,
  mapValidationIssuesToRefCheckData,
  validateDatasetRuleVerification,
  validateDatasetWithSdk,
} from '@/pages/Utils/review';

const mockCreateContact = jest.fn();
const mockCreateFlow = jest.fn();
const mockCreateFlowProperty = jest.fn();
const mockCreateLifeCycleModel = jest.fn();
const mockCreateProcess = jest.fn();
const mockCreateSource = jest.fn();
const mockCreateUnitGroup = jest.fn();
const mockGetRefData = jest.fn();
const mockGetRefDataByIds = jest.fn();
const mockGetReviewsOfData = jest.fn();
const mockUpdateDateToReviewState = jest.fn();

jest.mock('@tiangong-lca/tidas-sdk', () => ({
  __esModule: true,
  createContact: (...args: any[]) => mockCreateContact(...args),
  createFlow: (...args: any[]) => mockCreateFlow(...args),
  createFlowProperty: (...args: any[]) => mockCreateFlowProperty(...args),
  createLifeCycleModel: (...args: any[]) => mockCreateLifeCycleModel(...args),
  createProcess: (...args: any[]) => mockCreateProcess(...args),
  createSource: (...args: any[]) => mockCreateSource(...args),
  createUnitGroup: (...args: any[]) => mockCreateUnitGroup(...args),
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  getRefData: (...args: any[]) => mockGetRefData(...args),
  getRefDataByIds: (...args: any[]) => mockGetRefDataByIds(...args),
  getReviewsOfData: (...args: any[]) => mockGetReviewsOfData(...args),
  updateDateToReviewState: (...args: any[]) => mockUpdateDateToReviewState(...args),
}));

jest.mock('@/services/lifeCycleModels/api', () => ({
  __esModule: true,
  getLifeCycleModelDetail: jest.fn(),
}));

jest.mock('@/services/reviews/api', () => ({
  __esModule: true,
  addReviewsApi: jest.fn(),
  getRejectReviewsByProcess: jest.fn(),
}));

jest.mock('@/services/comments/api', () => ({
  __esModule: true,
  getRejectedCommentsByReviewIds: jest.fn(),
}));

jest.mock('@/services/sources/api', () => ({
  __esModule: true,
  getSourcesByIdsAndVersions: jest.fn(),
}));

jest.mock('@/services/teams/api', () => ({
  __esModule: true,
  getTeamMessageApi: jest.fn(),
}));

jest.mock('@/services/users/api', () => ({
  __esModule: true,
  getUserId: jest.fn(),
  getUsersByIds: jest.fn(),
}));

const { getUserId: mockGetUserId, getUsersByIds: mockGetUsersByIds } = jest.requireMock(
  '@/services/users/api',
) as {
  getUserId: jest.Mock;
  getUsersByIds: jest.Mock;
};

const makeSdkFactory = (result: any) =>
  jest.fn(() => ({ validateEnhanced: jest.fn(() => result) }));

describe('review helper coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRefData.mockReset();
    mockGetRefDataByIds.mockReset();
    mockGetReviewsOfData.mockReset();
    mockUpdateDateToReviewState.mockReset();
    mockGetUserId.mockReset();
    mockGetUsersByIds.mockReset();
    mockGetUserId.mockResolvedValue('user-1');

    mockCreateContact.mockImplementation(makeSdkFactory({ success: true }));
    mockCreateSource.mockImplementation(makeSdkFactory({ success: true }));
    mockCreateUnitGroup.mockImplementation(makeSdkFactory({ success: true }));
    mockCreateFlowProperty.mockImplementation(makeSdkFactory({ success: true }));
    mockCreateFlow.mockImplementation(makeSdkFactory({ success: true }));
    mockCreateProcess.mockImplementation(makeSdkFactory({ success: true }));
    mockCreateLifeCycleModel.mockImplementation(makeSdkFactory({ success: true }));
  });

  it('builds dataset paths, detail paths, and detail urls for known and unknown dataset types', () => {
    const ref = {
      '@type': 'process data set',
      '@refObjectId': 'process-1',
      '@version': '01.00.000',
    } as const;

    expect(getDatasetDetailPath(ref)).toBe(
      '/mydata/processes?id=process-1&version=01.00.000&required=1',
    );
    expect(getDatasetPath(ref)).toBe('/mydata/processes?id=process-1&version=01.00.000');
    expect(getDatasetPath(ref, { required: true })).toBe(
      '/mydata/processes?id=process-1&version=01.00.000&required=1',
    );
    expect(getDatasetDetailUrl(ref, 'https://demo.example')).toBe(
      'https://demo.example/#/mydata/processes?id=process-1&version=01.00.000&required=1',
    );
    expect(getDatasetDetailUrl(ref)).toBe(
      'http://localhost:8000/#/mydata/processes?id=process-1&version=01.00.000&required=1',
    );

    const originalWindow = (global as any).window;
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: undefined,
    });
    try {
      expect(getDatasetDetailUrl(ref)).toBe(
        'https://lca.tiangong.earth/#/mydata/processes?id=process-1&version=01.00.000&required=1',
      );
    } finally {
      Object.defineProperty(global, 'window', {
        configurable: true,
        value: originalWindow,
      });
    }

    const unknownRef = {
      '@type': 'unknown data set',
      '@refObjectId': 'missing',
      '@version': '00.00.000',
    } as any;

    expect(getDatasetDetailPath(unknownRef)).toBeNull();
    expect(getDatasetPath(unknownRef)).toBeNull();
    expect(getDatasetDetailUrl(unknownRef)).toBe('');
  });

  it('maps combined validation issues into ref-check data flags', () => {
    const mapped = mapValidationIssuesToRefCheckData([
      {
        code: 'ruleVerificationFailed',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-1',
          '@version': '01.00.000',
        },
        link: '/a',
      },
      {
        code: 'nonExistentRef',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-1',
          '@version': '01.00.000',
        },
        link: '/a',
      },
      {
        code: 'underReview',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-1',
          '@version': '01.00.000',
        },
        link: '/a',
      },
      {
        code: 'versionUnderReview',
        ref: {
          '@type': 'flow data set',
          '@refObjectId': 'flow-1',
          '@version': '01.00.000',
        },
        link: '/b',
        underReviewVersion: '02.00.000',
      },
      {
        code: 'versionIsInTg',
        ref: {
          '@type': 'flow data set',
          '@refObjectId': 'flow-1',
          '@version': '01.00.000',
        },
        link: '/b',
      },
    ]);

    expect(mapped).toEqual([
      {
        id: 'process-1',
        version: '01.00.000',
        ruleVerification: false,
        nonExistent: true,
        stateCode: 20,
        versionUnderReview: true,
        underReviewVersion: '01.00.000',
      },
      {
        id: 'flow-1',
        version: '01.00.000',
        ruleVerification: true,
        nonExistent: false,
        versionUnderReview: true,
        underReviewVersion: '02.00.000',
        versionIsInTg: true,
      },
    ]);
  });

  it('builds deduplicated validation issues for sdk, rule, missing, review, and tg-version problems', () => {
    const rootRef = {
      '@type': 'lifeCycleModel data set',
      '@refObjectId': 'model-1',
      '@version': '01.00.000',
    } as const;

    const issues = buildValidationIssues({
      actionFrom: 'review',
      datasetSdkValid: false,
      sdkInvalidTabNames: ['validation', 'validation', 'compliance'],
      nonExistentRef: [
        {
          '@type': 'source data set',
          '@refObjectId': 'source-1',
          '@version': '01.00.000',
        },
      ],
      problemNodes: [
        {
          '@type': 'process data set',
          '@refObjectId': 'process-1',
          '@version': '01.00.000',
          ruleVerification: true,
          nonExistent: false,
          versionUnderReview: true,
          underReviewVersion: '01.00.000',
        },
        {
          '@type': 'process data set',
          '@refObjectId': 'process-2',
          '@version': '01.00.000',
          ruleVerification: true,
          nonExistent: false,
          versionUnderReview: true,
          underReviewVersion: '02.00.000',
        },
        {
          '@type': 'flow data set',
          '@refObjectId': 'flow-1',
          '@version': '01.00.000',
          ruleVerification: true,
          nonExistent: false,
          versionIsInTg: true,
        },
      ],
      rootRef,
      unRuleVerification: [
        {
          '@type': 'process data set',
          '@refObjectId': 'process-3',
          '@version': '01.00.000',
        },
        {
          '@type': 'process data set',
          '@refObjectId': 'process-3',
          '@version': '01.00.000',
        },
      ],
    });

    expect(issues).toEqual([
      {
        code: 'sdkInvalid',
        link: 'http://localhost:8000/#/mydata/models?id=model-1&version=01.00.000&required=1',
        ref: rootRef,
        sourceRef: rootRef,
        tabNames: ['validation', 'compliance'],
      },
      {
        code: 'ruleVerificationFailed',
        link: 'http://localhost:8000/#/mydata/processes?id=process-3&version=01.00.000&required=1',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-3',
          '@version': '01.00.000',
        },
        sourceRef: rootRef,
      },
      {
        code: 'nonExistentRef',
        link: 'http://localhost:8000/#/mydata/sources?id=source-1&version=01.00.000&required=1',
        ref: {
          '@type': 'source data set',
          '@refObjectId': 'source-1',
          '@version': '01.00.000',
        },
        sourceRef: rootRef,
      },
      {
        code: 'underReview',
        link: 'http://localhost:8000/#/mydata/processes?id=process-1&version=01.00.000&required=1',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-1',
          '@version': '01.00.000',
        },
        sourceRef: rootRef,
        underReviewVersion: '01.00.000',
      },
      {
        code: 'versionUnderReview',
        link: 'http://localhost:8000/#/mydata/processes?id=process-2&version=01.00.000&required=1',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-2',
          '@version': '01.00.000',
        },
        sourceRef: rootRef,
        underReviewVersion: '02.00.000',
      },
      {
        code: 'versionIsInTg',
        link: 'http://localhost:8000/#/mydata/flows?id=flow-1&version=01.00.000&required=1',
        ref: {
          '@type': 'flow data set',
          '@refObjectId': 'flow-1',
          '@version': '01.00.000',
        },
        sourceRef: rootRef,
      },
    ]);
  });

  it('builds validation issues with default optional arrays when only sdk validity is provided', () => {
    expect(
      buildValidationIssues({
        datasetSdkValid: true,
        rootRef: {
          '@type': 'contact data set',
          '@refObjectId': 'contact-1',
          '@version': '01.00.000',
        },
      }),
    ).toEqual([]);
  });

  it('returns the same empty issue list when owner enrichment receives no issues', async () => {
    const issues: any[] = [];

    await expect(enrichValidationIssuesWithOwner(issues)).resolves.toBe(issues);
    expect(mockGetRefData).not.toHaveBeenCalled();
    expect(mockGetUserId).not.toHaveBeenCalled();
    expect(mockGetUsersByIds).not.toHaveBeenCalled();
  });

  it('enriches validation issues with owner names while deduplicating ref lookups', async () => {
    mockGetRefData.mockImplementation(
      async (id: string, version: string, table: string, teamId: string, options: any) => {
        expect(version).toBe('01.00.000');
        expect(teamId).toBe('');
        expect(options).toEqual({ fallbackToLatest: false });

        if (id === 'process-1' && table === 'processes') {
          return { data: { userId: 'user-1' }, success: true };
        }

        if (id === 'process-2' && table === 'processes') {
          return { data: { userId: 'user-2' }, success: true };
        }

        if (id === 'process-3' && table === 'processes') {
          return { data: null, success: false };
        }

        return { data: null, success: false };
      },
    );
    mockGetUsersByIds.mockResolvedValue([
      {
        id: 'user-1',
        raw_user_meta_data: {
          display_name: 'Alice',
        },
      },
      {
        id: 'user-2',
        email: 'bob@example.com',
      },
    ]);

    const issues = [
      {
        code: 'ruleVerificationFailed',
        link: '/a',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-1',
          '@version': '01.00.000',
        },
      },
      {
        code: 'nonExistentRef',
        link: '/a',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-1',
          '@version': '01.00.000',
        },
      },
      {
        code: 'ruleVerificationFailed',
        link: '/b',
        ownerName: 'Provided owner',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-provided',
          '@version': '01.00.000',
        },
      },
      {
        code: 'ruleVerificationFailed',
        link: '/c',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-2',
          '@version': '01.00.000',
        },
      },
      {
        code: 'ruleVerificationFailed',
        link: '/d',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-3',
          '@version': '01.00.000',
        },
      },
      {
        code: 'ruleVerificationFailed',
        link: '/e',
        ref: {
          '@type': 'mystery data set',
          '@refObjectId': 'unknown-1',
          '@version': '01.00.000',
        },
      },
    ] as any[];

    await expect(enrichValidationIssuesWithOwner(issues)).resolves.toEqual([
      {
        code: 'ruleVerificationFailed',
        link: '/a',
        isOwnedByCurrentUser: true,
        ownerName: 'Alice',
        ownerUserId: 'user-1',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-1',
          '@version': '01.00.000',
        },
      },
      {
        code: 'nonExistentRef',
        link: '/a',
        isOwnedByCurrentUser: true,
        ownerName: 'Alice',
        ownerUserId: 'user-1',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-1',
          '@version': '01.00.000',
        },
      },
      {
        code: 'ruleVerificationFailed',
        link: '/b',
        ownerName: 'Provided owner',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-provided',
          '@version': '01.00.000',
        },
      },
      {
        code: 'ruleVerificationFailed',
        link: '/c',
        isOwnedByCurrentUser: false,
        ownerName: 'bob@example.com',
        ownerUserId: 'user-2',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-2',
          '@version': '01.00.000',
        },
      },
      {
        code: 'ruleVerificationFailed',
        link: '/d',
        ownerName: '-',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-3',
          '@version': '01.00.000',
        },
      },
      {
        code: 'ruleVerificationFailed',
        link: '/e',
        ownerName: '-',
        ref: {
          '@type': 'mystery data set',
          '@refObjectId': 'unknown-1',
          '@version': '01.00.000',
        },
      },
    ]);
    expect(mockGetRefData).toHaveBeenCalledTimes(3);
    expect(mockGetUsersByIds).toHaveBeenCalledWith(['user-1', 'user-2']);
  });

  it('keeps provided owner names when the current user id is blank and no owner ids need resolving', async () => {
    mockGetUserId.mockResolvedValue('   ');

    const issues = [
      {
        code: 'ruleVerificationFailed',
        link: '/provided',
        ownerName: ' Provided owner ',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-provided-only',
          '@version': '01.00.000',
        },
      },
    ] as any[];

    await expect(enrichValidationIssuesWithOwner(issues)).resolves.toEqual([
      {
        code: 'ruleVerificationFailed',
        link: '/provided',
        ownerName: 'Provided owner',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-provided-only',
          '@version': '01.00.000',
        },
      },
    ]);
    expect(mockGetRefData).not.toHaveBeenCalled();
    expect(mockGetUsersByIds).not.toHaveBeenCalled();
  });

  it('falls back to a dash when resolved owner profiles have no usable display fields', async () => {
    mockGetRefData.mockResolvedValue({
      data: { userId: 'user-blank' },
      success: true,
    });
    mockGetUsersByIds.mockResolvedValue([
      {
        id: 'user-blank',
        display_name: '   ',
        email: '   ',
        raw_user_meta_data: {
          display_name: '',
          email: '   ',
        },
      },
    ]);

    const issues = [
      {
        code: 'ruleVerificationFailed',
        link: '/blank-owner',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-blank-owner',
          '@version': '01.00.000',
        },
      },
    ] as any[];

    await expect(enrichValidationIssuesWithOwner(issues)).resolves.toEqual([
      {
        code: 'ruleVerificationFailed',
        isOwnedByCurrentUser: false,
        link: '/blank-owner',
        ownerName: '-',
        ownerUserId: 'user-blank',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-blank-owner',
          '@version': '01.00.000',
        },
      },
    ]);
    expect(mockGetUsersByIds).toHaveBeenCalledWith(['user-blank']);
  });

  it('falls back to a dash when owner ids resolve but the user lookup returns no profiles', async () => {
    mockGetRefData.mockResolvedValue({
      data: { userId: 'user-missing' },
      success: true,
    });
    mockGetUsersByIds.mockResolvedValue(undefined);

    const issues = [
      {
        code: 'ruleVerificationFailed',
        link: '/missing-owner-profile',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-missing-owner-profile',
          '@version': '01.00.000',
        },
      },
    ] as any[];

    await expect(enrichValidationIssuesWithOwner(issues)).resolves.toEqual([
      {
        code: 'ruleVerificationFailed',
        isOwnedByCurrentUser: false,
        link: '/missing-owner-profile',
        ownerName: '-',
        ownerUserId: 'user-missing',
        ref: {
          '@type': 'process data set',
          '@refObjectId': 'process-missing-owner-profile',
          '@version': '01.00.000',
        },
      },
    ]);
    expect(mockGetUsersByIds).toHaveBeenCalledWith(['user-missing']);
  });

  it('validates each dataset type through the sdk and filters process/model review issues', () => {
    const sdkIssue = (path: PropertyKey[]) => ({ path });

    mockCreateContact.mockImplementation(
      makeSdkFactory({
        success: false,
        error: { issues: [sdkIssue(['contact'])] },
      }),
    );
    mockCreateSource.mockImplementation(
      makeSdkFactory({
        success: false,
        error: { issues: [sdkIssue(['source'])] },
      }),
    );
    mockCreateUnitGroup.mockImplementation(
      makeSdkFactory({
        success: false,
        error: { issues: [sdkIssue(['unitgroup'])] },
      }),
    );
    mockCreateFlowProperty.mockImplementation(
      makeSdkFactory({
        success: false,
        error: { issues: [sdkIssue(['flowProperty'])] },
      }),
    );
    mockCreateFlow.mockImplementation(
      makeSdkFactory({
        success: false,
        error: { issues: [sdkIssue(['flow'])] },
      }),
    );
    mockCreateProcess.mockImplementation(
      makeSdkFactory({
        success: false,
        error: {
          issues: [
            sdkIssue(['validation']),
            sdkIssue(['compliance']),
            sdkIssue(['processInformation']),
          ],
        },
      }),
    );
    mockCreateLifeCycleModel.mockImplementation(
      makeSdkFactory({
        success: false,
        error: {
          issues: [sdkIssue(['validation']), sdkIssue(['lifeCycleModelInformation'])],
        },
      }),
    );

    expect(validateDatasetWithSdk('contact data set', { id: 'contact' })).toEqual({
      success: false,
      issues: [{ path: ['contact'] }],
    });
    expect(validateDatasetWithSdk('source data set', { id: 'source' })).toEqual({
      success: false,
      issues: [{ path: ['source'] }],
    });
    expect(validateDatasetWithSdk('unit group data set', { id: 'unitgroup' })).toEqual({
      success: false,
      issues: [{ path: ['unitgroup'] }],
    });
    expect(validateDatasetWithSdk('flow property data set', { id: 'flowproperty' })).toEqual({
      success: false,
      issues: [{ path: ['flowProperty'] }],
    });
    expect(validateDatasetWithSdk('flow data set', { id: 'flow' })).toEqual({
      success: false,
      issues: [{ path: ['flow'] }],
    });
    expect(validateDatasetWithSdk('process data set', { id: 'process' })).toEqual({
      success: false,
      issues: [{ path: ['processInformation'] }],
    });
    expect(validateDatasetWithSdk('lifeCycleModel data set', { id: 'model' })).toEqual({
      success: false,
      issues: [{ path: ['lifeCycleModelInformation'] }],
    });
    expect(validateDatasetWithSdk('unknown data set' as any, { id: 'unknown' })).toEqual({
      success: true,
      issues: [],
    });
    expect(validateDatasetWithSdk('contact data set', null)).toEqual({
      success: false,
      issues: [],
    });
  });

  it('treats process/model sdk issues as successful when only review tabs fail', () => {
    mockCreateProcess.mockImplementation(
      makeSdkFactory({
        success: false,
        error: {
          issues: [{ path: ['validation'] }, { path: ['compliance'] }],
        },
      }),
    );
    mockCreateLifeCycleModel.mockImplementation(
      makeSdkFactory({
        success: false,
        error: {
          issues: [{ path: ['validation'] }, { path: ['compliance'] }],
        },
      }),
    );

    expect(validateDatasetWithSdk('process data set', { id: 'process' })).toEqual({
      success: true,
      issues: [],
    });
    expect(validateDatasetWithSdk('lifeCycleModel data set', { id: 'model' })).toEqual({
      success: true,
      issues: [],
    });
  });

  it('returns successful sdk results for process and lifecycle-model datasets', () => {
    expect(validateDatasetWithSdk('process data set', { id: 'process' })).toEqual({
      success: true,
      issues: [],
    });
    expect(validateDatasetWithSdk('lifeCycleModel data set', { id: 'model' })).toEqual({
      success: true,
      issues: [],
    });
  });

  it('falls back to an empty sdk issue list when validation fails without structured issues', () => {
    mockCreateContact.mockImplementation(
      makeSdkFactory({
        success: false,
      }),
    );

    expect(validateDatasetWithSdk('contact data set', { id: 'contact' })).toEqual({
      success: false,
      issues: [],
    });
  });

  it('handles unknown dataset types and datasets without a resolvable root ref during rule verification', async () => {
    await expect(
      validateDatasetRuleVerification('unknown data set' as any, { foo: 'bar' }),
    ).resolves.toEqual({
      datasetSdkValid: true,
      datasetSdkIssues: [],
      nonExistentRef: [],
      ruleVerification: true,
      unRuleVerification: [],
    });

    await expect(
      validateDatasetRuleVerification('contact data set', {
        contactDataSet: {
          contactInformation: {
            dataSetInformation: {},
          },
          administrativeInformation: {
            publicationAndOwnership: {},
          },
        },
      }),
    ).resolves.toEqual({
      datasetSdkValid: true,
      datasetSdkIssues: [],
      nonExistentRef: [],
      ruleVerification: true,
      unRuleVerification: [],
    });
  });

  it('filters out root self references while preserving other refs during rule verification', async () => {
    mockGetRefData.mockResolvedValue({
      success: true,
      data: {
        id: 'contact-2',
        stateCode: 100,
        ruleVerification: true,
        json: {},
      },
    });

    const orderedJson = {
      contactDataSet: {
        contactInformation: {
          dataSetInformation: {
            'common:UUID': 'contact-1',
            ownership: {
              '@type': 'contact data set',
              '@refObjectId': 'contact-1',
              '@version': '01.00.000',
            },
            reviewer: {
              '@type': 'contact data set',
              '@refObjectId': 'contact-2',
              '@version': '01.00.000',
            },
          },
        },
        administrativeInformation: {
          publicationAndOwnership: {
            'common:dataSetVersion': '01.00.000',
          },
        },
      },
    };

    await expect(validateDatasetRuleVerification('contact data set', orderedJson)).resolves.toEqual(
      {
        datasetSdkValid: true,
        datasetSdkIssues: [],
        nonExistentRef: [],
        ruleVerification: true,
        unRuleVerification: [],
      },
    );

    expect(mockGetRefData).toHaveBeenCalledTimes(1);
    expect(mockGetRefData).toHaveBeenCalledWith('contact-2', '01.00.000', 'contacts', '', {
      fallbackToLatest: false,
    });
  });

  it('categorises missing process/model details and can skip rule-verification flags', () => {
    const unReview: any[] = [];
    const underReview: any[] = [];
    const unRuleVerification: any[] = [];
    const nonExistentRef: any[] = [];

    dealProcress(undefined, unReview, underReview, unRuleVerification, nonExistentRef);
    dealProcress(
      {
        id: 'process-1',
        version: '01.00.000',
        stateCode: 10,
        ruleVerification: false,
      },
      unReview,
      underReview,
      unRuleVerification,
      nonExistentRef,
      {
        includeRuleVerification: false,
      },
    );

    dealModel(
      {
        id: 'model-1',
        version: '01.00.000',
        stateCode: 10,
        ruleVerification: false,
      },
      unReview,
      underReview,
      unRuleVerification,
      nonExistentRef,
      {
        includeRuleVerification: false,
      },
    );

    expect(nonExistentRef).toEqual([
      {
        '@type': 'process data set',
        '@refObjectId': '',
        '@version': '',
      },
    ]);
    expect(unReview).toEqual([
      {
        '@type': 'process data set',
        '@refObjectId': 'process-1',
        '@version': '01.00.000',
      },
      {
        '@type': 'lifeCycleModel data set',
        '@refObjectId': 'model-1',
        '@version': '01.00.000',
      },
    ]);
    expect(underReview).toEqual([]);
    expect(unRuleVerification).toEqual([]);
  });
});
