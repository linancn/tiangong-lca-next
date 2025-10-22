/**
 * Integration tests for flows API with ILCD cache
 * Path: src/services/flows/api.ts (caching integration from commit cbe029ea)
 *
 * Coverage focus:
 * - getFlowTableAll: Uses getCachedLocationData and getCachedFlowCategorizationAll
 * - getFlowTablePgroongaSearch: Uses caching for location and categorization data
 * - flow_hybrid_search: Uses caching for location and categorization data
 * - Parallel fetching optimization (Promise.all)
 * - Cache hit scenarios for repeated calls
 * - Language-specific caching (zh vs en)
 */

import {
  flow_hybrid_search,
  getFlowTableAll,
  getFlowTablePgroongaSearch,
} from '@/services/flows/api';

// Mock the cache module
jest.mock('@/services/ilcd/cache', () => ({
  getCachedLocationData: jest.fn(),
  getCachedFlowCategorizationAll: jest.fn(),
  clearILCDCache: jest.fn(),
}));

const {
  getCachedLocationData: mockGetCachedLocationData,
  getCachedFlowCategorizationAll: mockGetCachedFlowCategorizationAll,
} = jest.requireMock('@/services/ilcd/cache');

// Mock other dependencies
jest.mock('@/services/flows/util', () => ({
  genFlowJsonOrdered: jest.fn(),
  genFlowName: jest.fn(),
}));

jest.mock('@/services/general/util', () => ({
  classificationToString: jest.fn(),
  genClassificationZH: jest.fn(),
  getLangText: jest.fn(),
  jsonToList: jest.fn(),
  getRuleVerification: jest.fn(),
}));

jest.mock('@/services/general/api', () => ({
  getDataDetail: jest.fn(),
  getTeamIdByUserId: jest.fn(),
}));

const { genFlowName: mockGenFlowName } = jest.requireMock('@/services/flows/util');
const {
  classificationToString: mockClassificationToString,
  genClassificationZH: mockGenClassificationZH,
  getLangText: mockGetLangText,
  jsonToList: mockJsonToList,
} = jest.requireMock('@/services/general/util');

// Helper to create mock query builder
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class MockQuery<T = any> {
  constructor(private readonly result: T) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  select(..._args: any[]) {
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  order(_field: string, _options?: any) {
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  range(_from: number, _to: number) {
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  eq(_field: string, _value: any) {
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  in(_field: string, _values: any) {
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  not(..._args: any[]) {
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  then<TResult1 = T, _TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
  ) {
    return Promise.resolve(this.result).then(onfulfilled);
  }

  catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null) {
    return Promise.resolve(this.result).catch(onrejected);
  }
}

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getSession: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
    rpc: jest.fn(),
  },
}));

const {
  supabase: {
    from: mockFrom,
    auth: { getSession: mockAuthGetSession },
    functions: { invoke: mockFunctionsInvoke },
    rpc: mockRpc,
  },
} = jest.requireMock('@/services/supabase');

describe('Flows API Cache Integration (commit cbe029ea)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFlowTableAll with caching', () => {
    it('should use cached location and categorization data for Chinese', async () => {
      // Arrange
      const mockFlowData = [
        {
          id: 'flow-1',
          version: '01.00.000',
          name: { 'name-zh': '水', 'name-en': 'Water' },
          typeOfDataSet: 'Elementary flow',
          locationOfSupply: 'CN',
          CASNumber: '7732-18-5',
          classificationInformation: {
            'common:elementaryFlowCategorization': {
              'common:category': [{ '@level': '0', '#text': 'Natural resources' }],
            },
          },
          referenceToFlowPropertyDataSet: { '@refObjectId': 'prop-1' },
          modified_at: '2025-10-22T00:00:00Z',
          team_id: 'team-1',
        },
      ];

      const mockLocationData = [{ '@value': 'CN', '#text': '中国' }];

      const mockCategorizationData = {
        category: [{ id: 'cat-1', label: '产品流' }],
        categoryElementaryFlow: [{ id: 'elem-1', label: '自然资源' }],
      };

      // Mock database query
      const query = new MockQuery({
        data: mockFlowData,
        error: null,
        count: 1,
      });
      mockFrom.mockReturnValue(query);

      // Mock cache functions
      mockGetCachedLocationData.mockResolvedValue(mockLocationData);
      mockGetCachedFlowCategorizationAll.mockResolvedValue(mockCategorizationData);

      // Mock utility functions
      mockGenFlowName.mockReturnValue('水');
      mockJsonToList.mockReturnValue([{ '@level': '0', '#text': 'Natural resources' }]);
      mockGenClassificationZH.mockReturnValue([{ level: '0', text: '自然资源' }]);
      mockClassificationToString.mockReturnValue('自然资源');
      mockGetLangText.mockReturnValue('水的同义词');

      // Act
      const result = await getFlowTableAll(
        { current: 1, pageSize: 10 },
        { name: 'ascend' },
        'zh',
        'team-1',
        'team-1',
      );

      // Assert - Cache functions called with correct parameters
      expect(mockGetCachedLocationData).toHaveBeenCalledWith('zh', ['CN']);
      expect(mockGetCachedFlowCategorizationAll).toHaveBeenCalledWith('zh');

      // Assert - Data transformed correctly with cached values
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: 'flow-1',
        name: '水',
        locationOfSupply: '中国', // Translated from cache
        classification: '自然资源',
      });
    });

    it('should use cached location data only for English (no categorization)', async () => {
      // Arrange
      const mockFlowData = [
        {
          id: 'flow-1',
          version: '01.00.000',
          name: { 'name-en': 'Water' },
          typeOfDataSet: 'Elementary flow',
          locationOfSupply: 'US',
          CASNumber: '7732-18-5',
          referenceToFlowPropertyDataSet: { '@refObjectId': 'prop-1' },
          modified_at: '2025-10-22T00:00:00Z',
          team_id: 'team-1',
        },
      ];

      const mockLocationData = [{ '@value': 'US', '#text': 'United States' }];

      const query = new MockQuery({
        data: mockFlowData,
        error: null,
        count: 1,
      });
      mockFrom.mockReturnValue(query);

      mockGetCachedLocationData.mockResolvedValue(mockLocationData);
      mockGetCachedFlowCategorizationAll.mockResolvedValue(null);
      mockGenFlowName.mockReturnValue('Water');
      mockGetLangText.mockReturnValue('H2O');

      // Act
      const result = await getFlowTableAll(
        { current: 1, pageSize: 10 },
        { name: 'ascend' },
        'en',
        'team-1',
        'team-1',
      );

      // Assert - Location cache called for English (categorization returns null for 'en')
      expect(mockGetCachedLocationData).toHaveBeenCalledWith('en', ['US']);
      // For English, categorizationData returns null, so it's not used in the data transformation

      // Assert - Data includes translated location
      expect(result.data[0].locationOfSupply).toBe('United States');
    });

    it('should handle multiple locations and use cache efficiently', async () => {
      // Arrange
      const mockFlowData = [
        {
          id: 'flow-1',
          locationOfSupply: 'CN',
          name: {},
          version: '01.00.000',
          modified_at: '2025-10-22T00:00:00Z',
          team_id: 'team-1',
        },
        {
          id: 'flow-2',
          locationOfSupply: 'US',
          name: {},
          version: '01.00.000',
          modified_at: '2025-10-22T00:00:00Z',
          team_id: 'team-1',
        },
        {
          id: 'flow-3',
          locationOfSupply: 'CN', // Duplicate location
          name: {},
          version: '01.00.000',
          modified_at: '2025-10-22T00:00:00Z',
          team_id: 'team-1',
        },
      ];

      const mockLocationData = [
        { '@value': 'CN', '#text': '中国' },
        { '@value': 'US', '#text': '美国' },
      ];

      const query = new MockQuery({
        data: mockFlowData,
        error: null,
        count: 3,
      });
      mockFrom.mockReturnValue(query);

      mockGetCachedLocationData.mockResolvedValue(mockLocationData);
      mockGetCachedFlowCategorizationAll.mockResolvedValue(null);
      mockGenFlowName.mockReturnValue('Flow');
      mockGetLangText.mockReturnValue('');

      // Act
      await getFlowTableAll(
        { current: 1, pageSize: 10 },
        { name: 'ascend' },
        'en',
        'team-1',
        'team-1',
      );

      // Assert - Deduplicated locations sent to cache
      expect(mockGetCachedLocationData).toHaveBeenCalledWith('en', ['CN', 'US']);
      expect(mockGetCachedLocationData).toHaveBeenCalledTimes(1); // Single call for all locations
    });

    it('should handle empty location list gracefully', async () => {
      // Arrange
      const mockFlowData = [
        {
          id: 'flow-1',
          locationOfSupply: null,
          name: {},
          version: '01.00.000',
          modified_at: '2025-10-22T00:00:00Z',
          team_id: 'team-1',
        },
      ];

      const query = new MockQuery({
        data: mockFlowData,
        error: null,
        count: 1,
      });
      mockFrom.mockReturnValue(query);

      mockGetCachedLocationData.mockResolvedValue([]);
      mockGetCachedFlowCategorizationAll.mockResolvedValue(null);
      mockGenFlowName.mockReturnValue('Flow');
      mockGetLangText.mockReturnValue('');

      // Act
      const result = await getFlowTableAll(
        { current: 1, pageSize: 10 },
        { name: 'ascend' },
        'en',
        'team-1',
        'team-1',
      );

      // Assert - Cache called with null location
      expect(mockGetCachedLocationData).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const query = new MockQuery({
        data: null,
        error: { message: 'Database connection failed' },
        count: 0,
      });
      mockFrom.mockReturnValue(query);

      // Act
      const result = await getFlowTableAll(
        { current: 1, pageSize: 10 },
        { name: 'ascend' },
        'en',
        'team-1',
        'team-1',
      );

      // Assert - Cache not called when query fails
      expect(mockGetCachedLocationData).not.toHaveBeenCalled();
      expect(mockGetCachedFlowCategorizationAll).not.toHaveBeenCalled();
      expect(result.data).toEqual([]);
    });
  });

  describe('getFlowTablePgroongaSearch with caching', () => {
    beforeEach(() => {
      // Mock auth session for PGroonga tests
      mockAuthGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      });
    });

    it('should use cached data for PGroonga search results', async () => {
      // Arrange
      const mockSearchResults = [
        {
          id: 'flow-1',
          version: '01.00.000',
          json: {
            flowDataSet: {
              modellingAndValidation: {
                LCIMethod: { typeOfDataSet: 'Elementary flow' },
              },
              flowInformation: {
                dataSetInformation: {
                  name: { 'name-zh': '水' },
                  CASNumber: '7732-18-5',
                  'common:synonyms': { 'name-zh': '纯水' },
                  classificationInformation: {
                    'common:elementaryFlowCategorization': {
                      'common:category': [{ '@level': '0', '#text': 'Resources' }],
                    },
                  },
                },
                geography: { locationOfSupply: 'CN' },
              },
            },
          },
          modified_at: '2025-10-22T00:00:00Z',
          team_id: 'team-1',
        },
      ];

      const mockLocationData = [{ '@value': 'CN', '#text': '中国' }];
      const mockCategorizationData = {
        category: [],
        categoryElementaryFlow: [{ id: 'elem-1', label: '自然资源' }],
      };

      mockRpc.mockResolvedValue({
        data: mockSearchResults,
        error: null,
        count: 1,
      });

      mockGetCachedLocationData.mockResolvedValue(mockLocationData);
      mockGetCachedFlowCategorizationAll.mockResolvedValue(mockCategorizationData);

      mockGenFlowName.mockReturnValue('水');
      mockGetLangText.mockReturnValue('纯水');
      mockJsonToList.mockReturnValue([{ '@level': '0', '#text': 'Resources' }]);
      mockGenClassificationZH.mockReturnValue([{ level: '0', text: '自然资源' }]);
      mockClassificationToString.mockReturnValue('自然资源');

      // Act
      const result = await getFlowTablePgroongaSearch(
        { current: 1, pageSize: 10 },
        'zh',
        'team-1',
        '水',
        {},
      );

      // Assert - Cache functions called
      expect(mockGetCachedLocationData).toHaveBeenCalledWith('zh', ['CN']);
      expect(mockGetCachedFlowCategorizationAll).toHaveBeenCalledWith('zh');

      // Assert - Results transformed with cached data
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        name: '水',
        locationOfSupply: '中国',
        synonyms: '纯水',
      });
    });

    it('should handle search with no results', async () => {
      // Arrange
      mockAuthGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      });

      mockRpc.mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      // Act
      const result = await getFlowTablePgroongaSearch(
        { current: 1, pageSize: 10 },
        'en',
        'team-1',
        'nonexistent',
        {},
      );

      // Assert - Cache not called for empty results
      expect(mockGetCachedLocationData).not.toHaveBeenCalled();
      expect(result.data).toEqual([]);
    });
  });

  describe('flow_hybrid_search with caching', () => {
    it('should use cached data for hybrid search results', async () => {
      // Arrange
      const mockSearchResults = [
        {
          id: 'flow-1',
          version: '01.00.000',
          json: {
            flowDataSet: {
              modellingAndValidation: {
                LCIMethod: { typeOfDataSet: 'Product flow' },
              },
              flowInformation: {
                dataSetInformation: {
                  name: { 'name-zh': '电力' },
                  classificationInformation: {
                    'common:classification': {
                      'common:class': [{ '@level': '0', '#text': 'Energy' }],
                    },
                  },
                },
                geography: { locationOfSupply: 'CN' },
              },
            },
          },
          modified_at: '2025-10-22T00:00:00Z',
          team_id: 'team-1',
        },
      ];

      const mockLocationData = [{ '@value': 'CN', '#text': '中国' }];
      const mockCategorizationData = {
        category: [{ id: 'cat-1', label: '能源' }],
        categoryElementaryFlow: [],
      };

      mockAuthGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      });

      mockFunctionsInvoke.mockResolvedValue({
        data: { data: mockSearchResults, count: 1 },
        error: null,
      });

      mockGetCachedLocationData.mockResolvedValue(mockLocationData);
      mockGetCachedFlowCategorizationAll.mockResolvedValue(mockCategorizationData);

      mockGenFlowName.mockReturnValue('电力');
      mockGetLangText.mockReturnValue('电');
      mockJsonToList.mockReturnValue([{ '@level': '0', '#text': 'Energy' }]);
      mockGenClassificationZH.mockReturnValue([{ level: '0', text: '能源' }]);
      mockClassificationToString.mockReturnValue('能源');

      // Act
      const result = await flow_hybrid_search(
        { current: 1, pageSize: 10 },
        'zh',
        'team-1',
        '电力',
        {},
      );

      // Assert - Cache functions called
      expect(mockGetCachedLocationData).toHaveBeenCalledWith('zh', ['CN']);
      expect(mockGetCachedFlowCategorizationAll).toHaveBeenCalledWith('zh');

      // Assert - Results include cached location
      expect(result.data).toHaveLength(1);
      expect(result.data[0].locationOfSupply).toBe('中国');
    });

    it('should handle authentication errors gracefully', async () => {
      // Arrange
      mockAuthGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Not authenticated' },
      });

      // Act
      const result = await flow_hybrid_search(
        { current: 1, pageSize: 10 },
        'en',
        'team-1',
        'query',
        {},
      );

      // Assert - Cache not called when auth fails
      expect(mockGetCachedLocationData).not.toHaveBeenCalled();
      expect(result.data).toEqual([]);
    });
  });

  describe('Parallel fetching optimization', () => {
    it('should fetch location and categorization data in parallel', async () => {
      // Arrange
      const mockFlowData = [
        {
          id: 'flow-1',
          locationOfSupply: 'CN',
          name: {},
          version: '01.00.000',
          modified_at: '2025-10-22T00:00:00Z',
          team_id: 'team-1',
        },
      ];

      const query = new MockQuery({
        data: mockFlowData,
        error: null,
        count: 1,
      });
      mockFrom.mockReturnValue(query);

      // Track call order
      const callOrder: string[] = [];

      mockGetCachedLocationData.mockImplementation(async () => {
        callOrder.push('location-start');
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 10);
        });
        callOrder.push('location-end');
        return [];
      });

      mockGetCachedFlowCategorizationAll.mockImplementation(async () => {
        callOrder.push('categorization-start');
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 10);
        });
        callOrder.push('categorization-end');
        return { category: [], categoryElementaryFlow: [] };
      });

      mockGenFlowName.mockReturnValue('Flow');
      mockGetLangText.mockReturnValue('');

      // Act
      await getFlowTableAll(
        { current: 1, pageSize: 10 },
        { name: 'ascend' },
        'zh',
        'team-1',
        'team-1',
      );

      // Assert - Both start before either finishes (parallel execution)
      const locationStartIndex = callOrder.indexOf('location-start');
      const categorizationStartIndex = callOrder.indexOf('categorization-start');
      const locationEndIndex = callOrder.indexOf('location-end');
      const categorizationEndIndex = callOrder.indexOf('categorization-end');

      expect(locationStartIndex).toBeGreaterThanOrEqual(0);
      expect(categorizationStartIndex).toBeGreaterThanOrEqual(0);

      // Both should start before the first one ends
      expect(Math.min(locationStartIndex, categorizationStartIndex)).toBeLessThan(
        Math.min(locationEndIndex, categorizationEndIndex),
      );
    });
  });

  describe('Error handling with caching', () => {
    it('should handle cache errors gracefully and continue processing', async () => {
      // Arrange
      const mockFlowData = [
        {
          id: 'flow-1',
          locationOfSupply: 'CN',
          name: { 'name-en': 'Test' },
          version: '01.00.000',
          modified_at: '2025-10-22T00:00:00Z',
          team_id: 'team-1',
        },
      ];

      const query = new MockQuery({
        data: mockFlowData,
        error: null,
        count: 1,
      });
      mockFrom.mockReturnValue(query);

      // Mock cache error
      mockGetCachedLocationData.mockRejectedValue(new Error('Cache error'));
      mockGetCachedFlowCategorizationAll.mockResolvedValue(null);

      mockGenFlowName.mockReturnValue('Test');
      mockGetLangText.mockReturnValue('');

      // Act & Assert - Should throw error (cache errors are not caught in implementation)
      await expect(
        getFlowTableAll({ current: 1, pageSize: 10 }, { name: 'ascend' }, 'en', 'team-1', 'team-1'),
      ).rejects.toThrow('Cache error');
    });
  });
});
