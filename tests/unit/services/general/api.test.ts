/**
 * Tests for general service API functions
 * Path: src/services/general/api.ts
 */

const mockFrom = jest.fn();
const mockAuthGetSession = jest.fn();
const mockFunctionsInvoke = jest.fn();
const mockGetLocale = jest.fn(() => 'en-US');
const mockGetILCDClassification = jest.fn();
const mockGetILCDFlowCategorizationAll = jest.fn();
const mockGetILCDLocationByValues = jest.fn();
const mockGenClassificationZH = jest.fn(() => ['classification-zh']);
const mockClassificationToString = jest.fn(() => 'classification-string');
const mockGetLangText = jest.fn((value: any, lang: string) => {
  if (!value) return '-';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const item = value.find((entry: any) => entry?.['@xml:lang'] === lang);
    return item?.['#text'] ?? '-';
  }
  if (typeof value === 'object') {
    return value?.[lang] ?? value?.['#text'] ?? '-';
  }
  return String(value);
});

jest.mock('@/services/supabase', () => ({
  __esModule: true,
  supabase: {
    from: (...args: any[]) => mockFrom.apply(null, args),
    auth: {
      getSession: (...args: any[]) => mockAuthGetSession.apply(null, args),
    },
    functions: {
      invoke: (...args: any[]) => mockFunctionsInvoke.apply(null, args),
    },
  },
}));

jest.mock('antd', () => ({
  __esModule: true,
  message: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('umi', () => ({
  __esModule: true,
  getLocale: (...args: any[]) => mockGetLocale.apply(null, args),
}));

jest.mock('@/services/ilcd/api', () => ({
  __esModule: true,
  getILCDClassification: (...args: any[]) => mockGetILCDClassification.apply(null, args),
  getILCDFlowCategorizationAll: (...args: any[]) =>
    mockGetILCDFlowCategorizationAll.apply(null, args),
  getILCDLocationByValues: (...args: any[]) => mockGetILCDLocationByValues.apply(null, args),
}));

jest.mock('@/services/general/util', () => {
  const actual: any = jest.requireActual('@/services/general/util');
  return {
    __esModule: true,
    ...actual,
    genClassificationZH: (...args: any[]) => mockGenClassificationZH.apply(null, args),
    classificationToString: (...args: any[]) => mockClassificationToString.apply(null, args),
    getLangText: (...args: any[]) => mockGetLangText.apply(null, args),
  };
});

import * as generalApi from '@/services/general/api';
import { message as antdMessage } from 'antd';

type MessageMock = { error: jest.Mock; success: jest.Mock };
const messageMock = antdMessage as unknown as MessageMock;

const createQueryBuilder = <T>(resolvedValue: T) => {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(resolvedValue),
    then: (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject),
  };
  return builder;
};

beforeEach(() => {
  mockFrom.mockReset();
  mockAuthGetSession.mockReset();
  mockFunctionsInvoke.mockReset();
  mockGetLocale.mockReset();
  mockGetLocale.mockReturnValue('en-US');
  messageMock.error.mockReset();
  messageMock.success.mockReset();
  mockGetILCDClassification.mockReset();
  mockGetILCDClassification.mockResolvedValue({ data: {} });
  mockGetILCDFlowCategorizationAll.mockReset();
  mockGetILCDFlowCategorizationAll.mockResolvedValue({ data: {} });
  mockGetILCDLocationByValues.mockReset();
  mockGetILCDLocationByValues.mockResolvedValue({ data: [] });
  mockGenClassificationZH.mockReset();
  mockGenClassificationZH.mockReturnValue(['classification-zh']);
  mockClassificationToString.mockReset();
  mockClassificationToString.mockReturnValue('classification-string');
  mockGetLangText.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

const sampleId = '12345678-1234-1234-1234-123456789012';
const sampleVersion = '01.00.000';

describe('exportDataApi', () => {
  it('should select lifecycle model fields when table is lifecyclemodels', async () => {
    const resultPayload = { data: [{ json_ordered: { foo: 'bar' }, json_tg: {} }] };
    const builder = createQueryBuilder(resultPayload);
    mockFrom.mockReturnValueOnce(builder);

    const result = await generalApi.exportDataApi('lifecyclemodels', sampleId, sampleVersion);

    expect(mockFrom).toHaveBeenCalledWith('lifecyclemodels');
    expect(builder.select).toHaveBeenCalledWith('json_ordered,json_tg');
    expect(builder.eq).toHaveBeenCalledWith('version', sampleVersion);
    expect(result).toBe(resultPayload);
  });

  it('should select json_ordered for other tables', async () => {
    const payload = { data: [{ json_ordered: { foo: 'bar' } }] };
    const builder = createQueryBuilder(payload);
    mockFrom.mockReturnValueOnce(builder);

    const result = await generalApi.exportDataApi('flows', sampleId, sampleVersion);

    expect(mockFrom).toHaveBeenCalledWith('flows');
    expect(builder.select).toHaveBeenCalledWith('json_ordered');
    expect(builder.eq).toHaveBeenCalledWith('version', sampleVersion);
    expect(result).toBe(payload);
  });
});

describe('getDataDetail', () => {
  it('should return transformed detail when record is found', async () => {
    const payload = {
      data: [
        {
          version: sampleVersion,
          json: { foo: 'bar' },
          modified_at: '2023-01-01T00:00:00Z',
          state_code: 100,
          rule_verification: 'ok',
          user_id: 'user-1',
        },
      ],
    };
    const builder = createQueryBuilder(payload);
    mockFrom.mockReturnValueOnce(builder);

    const result = await generalApi.getDataDetail(sampleId, sampleVersion, 'flows');

    expect(builder.select).toHaveBeenCalledWith(
      'json,version, modified_at,id,state_code,rule_verification,user_id',
    );
    expect(result).toEqual({
      data: {
        id: sampleId,
        version: sampleVersion,
        json: { foo: 'bar' },
        modifiedAt: '2023-01-01T00:00:00Z',
        stateCode: 100,
        ruleVerification: 'ok',
        userId: 'user-1',
      },
      success: true,
    });
  });

  it('should fallback to latest version when version is not provided', async () => {
    const fallbackPayload = {
      data: [
        {
          version: sampleVersion,
          json: { foo: 'bar' },
          modified_at: '2023-01-02T00:00:00Z',
          state_code: 200,
          rule_verification: 'pending',
          user_id: 'user-2',
        },
      ],
    };
    const builder = createQueryBuilder(fallbackPayload);
    mockFrom.mockReturnValueOnce(builder);

    const result = await generalApi.getDataDetail(sampleId, 'latest', 'flows');

    expect(builder.order).toHaveBeenCalledWith('version', { ascending: false });
    expect(builder.range).toHaveBeenCalledWith(0, 0);
    expect(result.data?.version).toBe(sampleVersion);
  });
});

describe('getRefData', () => {
  it('should short-circuit when table is not provided', async () => {
    const result = await generalApi.getRefData(sampleId, sampleVersion, '');
    expect(result).toEqual({ data: null, success: false });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('should return reference data when found', async () => {
    const primaryPayload = {
      data: [
        {
          state_code: 100,
          json: { foo: 'bar' },
          rule_verification: 'ok',
          user_id: 'user-1',
        },
      ],
    };
    const builder = createQueryBuilder(primaryPayload);
    mockFrom.mockReturnValueOnce(builder);

    const result = await generalApi.getRefData(sampleId, sampleVersion, 'flows');

    expect(builder.select).toHaveBeenCalledWith('state_code,json,rule_verification,user_id');
    expect(builder.eq).toHaveBeenCalledWith('version', sampleVersion);
    expect(result).toEqual({
      data: {
        stateCode: 100,
        json: { foo: 'bar' },
        ruleVerification: 'ok',
        userId: 'user-1',
      },
      success: true,
    });
  });

  test.failing('should request team_id when filtering by team', async () => {
    const primaryPayload = {
      data: [
        {
          team_id: 'team-1',
          state_code: 100,
          json: { foo: 'bar' },
          rule_verification: 'ok',
          user_id: 'user-1',
        },
      ],
    };
    const builder = createQueryBuilder(primaryPayload);
    mockFrom.mockReturnValueOnce(builder);

    await generalApi.getRefData(sampleId, sampleVersion, 'flows', 'team-1');

    expect(builder.select).toHaveBeenCalledWith(
      'state_code,json,rule_verification,user_id,team_id',
    );
  });
});

describe('updateStateCodeApi', () => {
  it('should invoke edge function when session exists', async () => {
    mockAuthGetSession.mockResolvedValue({ data: { session: { access_token: 'token-1' } } });
    mockFunctionsInvoke.mockResolvedValue({ data: { updated: true } });

    const result = await generalApi.updateStateCodeApi(sampleId, sampleVersion, 'flows', 300);

    expect(mockFunctionsInvoke).toHaveBeenCalledWith('update_data', {
      headers: { Authorization: 'Bearer token-1' },
      body: { id: sampleId, version: sampleVersion, table: 'flows', data: { state_code: 300 } },
      region: expect.anything(),
    });
    expect(result).toEqual({ updated: true });
  });

  it('should return undefined when session is missing', async () => {
    mockAuthGetSession.mockResolvedValue({ data: { session: null } });

    const result = await generalApi.updateStateCodeApi(sampleId, sampleVersion, 'flows', 100);

    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});

describe('getReviewsOfData', () => {
  it('should return reviews array when present', async () => {
    const payload = { data: [{ reviews: ['review-1'] }] };
    const builder = createQueryBuilder(payload);
    mockFrom.mockReturnValueOnce(builder);

    const result = await generalApi.getReviewsOfData(sampleId, sampleVersion, 'flows');

    expect(builder.select).toHaveBeenCalledWith('reviews');
    expect(result).toEqual(['review-1']);
  });

  it('should return empty array when no reviews exist', async () => {
    const payload = { data: [{}] };
    const builder = createQueryBuilder(payload);
    mockFrom.mockReturnValueOnce(builder);

    const result = await generalApi.getReviewsOfData(sampleId, sampleVersion, 'flows');

    expect(result).toEqual([]);
  });
});

describe('updateDateToReviewState', () => {
  it('should invoke edge function with provided data', async () => {
    mockAuthGetSession.mockResolvedValue({ data: { session: { access_token: 'token-2' } } });
    mockFunctionsInvoke.mockResolvedValue({ data: { ok: true } });
    const payload = { foo: 'bar' };

    const result = await generalApi.updateDateToReviewState(
      sampleId,
      sampleVersion,
      'flows',
      payload,
    );

    expect(mockFunctionsInvoke).toHaveBeenCalledWith('update_data', {
      headers: { Authorization: 'Bearer token-2' },
      body: { id: sampleId, version: sampleVersion, table: 'flows', data: payload },
      region: expect.anything(),
    });
    expect(result).toEqual({ ok: true });
  });
});

describe('getTeamIdByUserId', () => {
  it('should return first non-invited team id', async () => {
    mockAuthGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
    const payload = {
      data: [
        {
          user_id: 'user-1',
          team_id: 'team-123',
          role: 'member',
        },
      ],
    };
    const builder = createQueryBuilder(payload);
    mockFrom.mockReturnValueOnce(builder);

    const result = await generalApi.getTeamIdByUserId();

    expect(builder.select.mock.calls[0][0]).toContain('team_id');
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(builder.neq).toHaveBeenCalledWith('team_id', '00000000-0000-0000-0000-000000000000');
    expect(result).toBe('team-123');
  });

  it('should return null when user is invited', async () => {
    mockAuthGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
    const payload = {
      data: [
        {
          user_id: 'user-1',
          team_id: 'team-123',
          role: 'is_invited',
        },
      ],
    };
    const builder = createQueryBuilder(payload);
    mockFrom.mockReturnValueOnce(builder);

    const result = await generalApi.getTeamIdByUserId();

    expect(result).toBeNull();
  });
});

describe('contributeSource', () => {
  it('should invoke update when user belongs to a team', async () => {
    const sessionValue = {
      data: {
        session: {
          user: { id: 'user-1' },
          access_token: 'token-3',
        },
      },
    };
    mockAuthGetSession.mockResolvedValue(sessionValue);
    const rolesBuilder = createQueryBuilder({
      data: [
        {
          user_id: 'user-1',
          team_id: 'team-123',
          role: 'member',
        },
      ],
    });
    mockFrom.mockReturnValueOnce(rolesBuilder);
    mockFunctionsInvoke.mockResolvedValue({ data: { contributed: true } });

    const result = await generalApi.contributeSource('flows', sampleId, sampleVersion);

    expect(mockFunctionsInvoke).toHaveBeenCalledWith('update_data', {
      headers: { Authorization: 'Bearer token-3' },
      body: {
        id: sampleId,
        version: sampleVersion,
        table: 'flows',
        data: { team_id: 'team-123' },
      },
      region: expect.anything(),
    });
    expect(result).toEqual({ contributed: true });
  });

  it('should show error when user is not in a team', async () => {
    mockAuthGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1' },
        },
      },
    });
    const rolesBuilder = createQueryBuilder({
      data: [
        {
          user_id: 'user-1',
          team_id: 'team-123',
          role: 'is_invited',
        },
      ],
    });
    mockFrom.mockReturnValueOnce(rolesBuilder);

    const result = await generalApi.contributeSource('flows', sampleId, sampleVersion);

    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    expect(messageMock.error).toHaveBeenCalledWith('You are not a member of any team');
    expect(result).toEqual({ error: true, message: 'Contribute failed' });
  });
});

describe('getAllVersions', () => {
  it('should return mapped contact data when query succeeds', async () => {
    const payload = {
      data: [
        {
          id: sampleId,
          version: sampleVersion,
          modified_at: '2023-01-03T00:00:00Z',
          team_id: 'team-9',
          email: 'contact@example.com',
          'common:shortName': [{ '@xml:lang': 'en', '#text': 'Short EN' }],
          'common:name': [{ '@xml:lang': 'en', '#text': 'Name EN' }],
          'common:class': [{ value: 'class-a' }],
        },
      ],
      count: 1,
    };
    const builder = createQueryBuilder(payload);
    mockFrom.mockReturnValueOnce(builder);

    const result = await generalApi.getAllVersions(
      'common:shortName',
      'contacts',
      sampleId,
      { pageSize: 10, current: 1 },
      {},
      'en',
      'tg',
    );

    expect(mockGetILCDClassification).toHaveBeenCalledWith('Contact', 'en', ['all']);
    expect(mockGetLangText).toHaveBeenCalled();
    expect(mockClassificationToString).toHaveBeenCalled();
    expect(result).toEqual({
      data: [
        {
          key: `${sampleId}:${sampleVersion}`,
          id: sampleId,
          shortName: 'Short EN',
          name: 'Name EN',
          classification: 'classification-string',
          email: 'contact@example.com',
          version: sampleVersion,
          modifiedAt: new Date('2023-01-03T00:00:00Z'),
          teamId: 'team-9',
        },
      ],
      page: 1,
      success: true,
      total: 1,
    });
  });

  it('should return failure when my data has no active session', async () => {
    mockAuthGetSession.mockResolvedValue({ data: { session: null } });
    const payload = { data: [], count: 0 };
    const builder = createQueryBuilder(payload);
    mockFrom.mockReturnValueOnce(builder);

    const result = await generalApi.getAllVersions(
      'name',
      'contacts',
      sampleId,
      { pageSize: 10, current: 1 },
      {},
      'en',
      'my',
    );

    expect(result).toEqual({ data: [], success: false, total: 0 });
  });
});

describe('getAISuggestion', () => {
  it('should invoke ai_suggest function with serialized payload', async () => {
    mockAuthGetSession.mockResolvedValue({ data: { session: { access_token: 'token-4' } } });
    mockFunctionsInvoke.mockResolvedValue({ data: { suggestion: { foo: 'bar' } } });
    const tidasData = { toJSONString: () => 'serialized' } as any;

    const result = await generalApi.getAISuggestion(tidasData, 'process', { maxRetries: 1 });

    expect(mockFunctionsInvoke).toHaveBeenCalledWith('ai_suggest', {
      headers: { Authorization: 'Bearer token-4' },
      body: { tidasData, dataType: 'process', options: { maxRetries: 1 } },
      region: expect.anything(),
    });
    expect(result).toEqual({ suggestion: { foo: 'bar' } });
  });
});
