/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';

// Mock TIDAS SDK
jest.mock('@tiangong-lca/tidas-sdk', () => ({
  __esModule: true,
  createContact: jest.fn().mockReturnValue({
    validateEnhanced: jest.fn().mockReturnValue({ success: true }),
  }),
}));

// Mock dependencies
jest.mock('@/services/supabase');
jest.mock('@/services/general/api');
jest.mock('@/services/classifications/cache');
jest.mock('@/services/general/util');
jest.mock('@/services/contacts/util');

describe('Contacts API Service', () => {
  const { supabase } = jest.requireMock('@/services/supabase');
  const { getTeamIdByUserId, getDataDetail, invokeDatasetCommand, normalizeLangPayloadForSave } =
    jest.requireMock('@/services/general/api');
  const { getCachedClassificationData } = jest.requireMock('@/services/classifications/cache');
  const { getLangText, jsonToList, genClassificationZH, classificationToString } =
    jest.requireMock('@/services/general/util');
  const { genContactJsonOrdered } = jest.requireMock('@/services/contacts/util');

  let mockFrom: jest.Mock;
  let mockAuth: jest.Mock;
  let mockFunctions: jest.Mock;
  let mockRpc: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Supabase mock chain
    mockFrom = jest.fn().mockReturnThis();
    mockAuth = jest.fn();
    mockFunctions = jest.fn();
    mockRpc = jest.fn();

    Object.assign(supabase, {
      from: mockFrom,
      auth: { getSession: mockAuth },
      functions: { invoke: mockFunctions },
      rpc: mockRpc,
    });

    // Default mock implementations
    genContactJsonOrdered.mockImplementation((id: string, data: any) => ({
      contactDataSet: {
        contactInformation: {
          dataSetInformation: {
            'common:UUID': id,
            'common:shortName': data?.contactInformation?.dataSetInformation?.['common:shortName'],
          },
        },
      },
    }));
    normalizeLangPayloadForSave.mockImplementation(async (value: any) => ({
      payload: value,
      validationError: undefined,
    }));
    getLangText.mockImplementation((value: any) => value?.[0]?.['#text'] || '');
    jsonToList.mockImplementation((value: any) => (Array.isArray(value) ? value : [value]));
    genClassificationZH.mockReturnValue([{ '@level': '0', '#text': 'Test Classification' }]);
    classificationToString.mockReturnValue('Test Classification');
  });

  describe('createContact', () => {
    it('should create a contact with generated JSON and rule verification', async () => {
      const { createContact } = require('@/services/contacts/api');

      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockResolvedValue({
        data: [{ id: 'contact-123', json_ordered: {} }],
        error: null,
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });
      mockInsert.mockReturnValue({
        select: mockSelect,
      });

      const testData = {
        contactInformation: {
          dataSetInformation: {
            'common:shortName': [{ '@xml:lang': 'en', '#text': 'Test Contact' }],
          },
        },
      };

      const result = await createContact('contact-123', testData);

      expect(genContactJsonOrdered).toHaveBeenCalledWith('contact-123', testData);
      expect(mockFrom).toHaveBeenCalledWith('contacts');
      expect(mockInsert).toHaveBeenCalledWith([
        {
          id: 'contact-123',
          json_ordered: expect.any(Object),
          rule_verification: true,
        },
      ]);
      expect(result.data).toBeDefined();
    });

    it('should handle create with invalid data', async () => {
      const { createContact } = require('@/services/contacts/api');

      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockResolvedValue({
        data: [{ id: 'contact-123', rule_verification: false }],
        error: null,
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });
      mockInsert.mockReturnValue({
        select: mockSelect,
      });

      const result = await createContact('contact-123', {});

      expect(result.data?.[0].rule_verification).toBe(false);
    });

    it('should return a validation error when language normalization fails during create', async () => {
      const { createContact } = require('@/services/contacts/api');

      normalizeLangPayloadForSave.mockResolvedValue({
        payload: undefined,
        validationError: 'invalid_multilang_contact',
      });

      const result = await createContact('contact-123', {});

      expect(mockFrom).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        data: null,
        status: 400,
        statusText: 'LANG_VALIDATION_ERROR',
        error: {
          message: 'invalid_multilang_contact',
          code: 'LANG_VALIDATION_ERROR',
        },
      });
    });
  });

  describe('updateContact', () => {
    it('should update contact via edge function with session', async () => {
      const { updateContact } = require('@/services/contacts/api');
      invokeDatasetCommand.mockResolvedValue({
        data: [{ id: 'contact-123', rule_verification: true }],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      });

      const testData = {
        contactInformation: {
          dataSetInformation: {
            'common:name': [{ '@xml:lang': 'en', '#text': 'Updated Name' }],
          },
        },
      };

      const result = await updateContact('contact-123', 'v1.0', testData);

      expect(invokeDatasetCommand).toHaveBeenCalledWith(
        'app_dataset_save_draft',
        {
          id: 'contact-123',
          version: 'v1.0',
          table: 'contacts',
          jsonOrdered: expect.any(Object),
        },
        {
          ruleVerification: true,
        },
      );
      expect(result).toEqual({
        data: [{ id: 'contact-123', rule_verification: true }],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      });
    });

    it('should not update contact when no session', async () => {
      const { updateContact } = require('@/services/contacts/api');
      invokeDatasetCommand.mockResolvedValue(undefined);

      const result = await updateContact('contact-123', 'v1.0', {});

      expect(invokeDatasetCommand).toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle edge function error', async () => {
      const { updateContact } = require('@/services/contacts/api');
      invokeDatasetCommand.mockResolvedValue({
        data: null,
        error: { message: 'Update failed', code: 'FUNCTION_ERROR', details: '', hint: '' },
        count: null,
        status: 500,
        statusText: 'FUNCTION_ERROR',
      });

      const result = await updateContact('contact-123', 'v1.0', {});

      expect(result).toEqual({
        data: null,
        error: { message: 'Update failed', code: 'FUNCTION_ERROR', details: '', hint: '' },
        count: null,
        status: 500,
        statusText: 'FUNCTION_ERROR',
      });
    });

    it('should return a validation error when language normalization fails during update', async () => {
      const { updateContact } = require('@/services/contacts/api');

      normalizeLangPayloadForSave.mockResolvedValue({
        payload: undefined,
        validationError: 'invalid_contact_update',
      });

      const result = await updateContact('contact-123', 'v1.0', {});

      expect(invokeDatasetCommand).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        data: null,
        status: 400,
        statusText: 'LANG_VALIDATION_ERROR',
        error: {
          message: 'invalid_contact_update',
          code: 'LANG_VALIDATION_ERROR',
        },
      });
    });

    it('should use an empty bearer token and raw payload fallback when the normalized payload is missing', async () => {
      const { updateContact } = require('@/services/contacts/api');

      normalizeLangPayloadForSave.mockResolvedValue({
        payload: undefined,
        validationError: undefined,
      });
      invokeDatasetCommand.mockResolvedValue({
        data: [{ success: true, rule_verification: true }],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      });

      const result = await updateContact('contact-123', 'v1.0', {
        contactInformation: {
          dataSetInformation: {
            'common:name': [{ '@xml:lang': 'en', '#text': 'Fallback Payload' }],
          },
        },
      });

      expect(invokeDatasetCommand).toHaveBeenCalledWith(
        'app_dataset_save_draft',
        {
          id: 'contact-123',
          version: 'v1.0',
          table: 'contacts',
          jsonOrdered: expect.objectContaining({
            contactDataSet: expect.any(Object),
          }),
        },
        {
          ruleVerification: true,
        },
      );
      expect(result).toEqual({
        data: [{ success: true, rule_verification: true }],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      });
    });
  });

  describe('deleteContact', () => {
    it('should delete contact by id and version', async () => {
      const { deleteContact } = require('@/services/contacts/api');

      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();

      mockFrom.mockReturnValue({
        delete: mockDelete,
      });
      mockDelete.mockReturnValue({
        eq: mockEq,
      });
      mockEq
        .mockReturnValueOnce({
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        })
        .mockReturnValueOnce({ data: null, error: null });

      const result = await deleteContact('contact-123', 'v1.0');

      expect(mockFrom).toHaveBeenCalledWith('contacts');
      expect(mockDelete).toHaveBeenCalled();
      expect(result.error).toBeNull();
    });
  });

  describe('getContactTableAll', () => {
    it('should fetch contacts with TG data source', async () => {
      const { getContactTableAll } = require('@/services/contacts/api');

      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();

      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });
      mockRange.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockResolvedValue({
        data: [
          {
            id: 'contact-1',
            'common:shortName': [{ '@xml:lang': 'en', '#text': 'Contact 1' }],
            'common:name': [{ '@xml:lang': 'en', '#text': 'Full Name 1' }],
            'common:class': [{ '@level': '0', '#text': 'Category' }],
            email: 'test@example.com',
            version: 'v1.0',
            modified_at: '2023-01-01T00:00:00Z',
            team_id: 'team-1',
          },
        ],
        count: 1,
        error: null,
      });

      getCachedClassificationData.mockResolvedValue([
        { '@id': 'cat-1', '@level': '0', '#text': 'Category' },
      ]);

      const result = await getContactTableAll(
        { current: 1, pageSize: 10 },
        { modified_at: 'descend' },
        'en',
        'tg',
        [],
      );

      expect(mockFrom).toHaveBeenCalledWith('contacts');
      expect(mockEq).toHaveBeenCalledWith('state_code', 100);
      expect(getCachedClassificationData).toHaveBeenCalledWith('Contact', 'en', ['all']);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should apply team filtering for tg data source when team id is provided', async () => {
      const { getContactTableAll } = require('@/services/contacts/api');

      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const finalEq = jest.fn().mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });
      mockRange.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValueOnce({
        eq: finalEq,
      });

      const result = await getContactTableAll(
        { current: 1, pageSize: 10 },
        {},
        'en',
        'tg',
        'team-1',
      );

      expect(mockEq).toHaveBeenCalledWith('state_code', 100);
      expect(finalEq).toHaveBeenCalledWith('team_id', 'team-1');
      expect(result.success).toBe(true);
    });

    it('should apply collaborative filtering for co data source with default paging', async () => {
      const { getContactTableAll } = require('@/services/contacts/api');

      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const finalEq = jest.fn().mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });
      mockRange.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValueOnce({
        eq: finalEq,
      });

      const result = await getContactTableAll({}, {}, 'en', 'co', 'team-co');

      expect(mockOrder).toHaveBeenCalledWith('modified_at', { ascending: false });
      expect(mockRange).toHaveBeenCalledWith(0, 9);
      expect(mockEq).toHaveBeenCalledWith('state_code', 200);
      expect(finalEq).toHaveBeenCalledWith('team_id', 'team-co');
      expect(result.success).toBe(true);
    });

    it('should fetch contacts with MY data source and user session', async () => {
      const { getContactTableAll } = require('@/services/contacts/api');

      mockAuth.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-123' },
          },
        },
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();

      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });
      mockRange.mockReturnValue({
        eq: mockEq,
      });

      // Setup chain for two eq calls
      const finalMock = jest.fn().mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });
      mockEq.mockReturnValueOnce({
        eq: finalMock,
      });

      const result = await getContactTableAll(
        { current: 1, pageSize: 10 },
        {},
        'en',
        'my',
        [],
        100,
      );

      expect(mockAuth).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('state_code', 100);
      expect(finalMock).toHaveBeenCalledWith('user_id', 'user-123');
      expect(result.success).toBe(true);
    });

    it('should return empty data when MY data source has no session', async () => {
      const { getContactTableAll } = require('@/services/contacts/api');

      mockAuth.mockResolvedValue({
        data: { session: null },
      });

      // Setup the query chain that will be created before session check
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();

      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });
      mockRange.mockReturnValue({
        eq: mockEq,
      });

      const result = await getContactTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'my', []);

      expect(mockFrom).toHaveBeenCalled(); // Query chain is created
      expect(mockAuth).toHaveBeenCalled(); // Session is checked
      expect(result.success).toBe(false); // But returns early with no session
      expect(result.data).toEqual([]);
    });

    it('should fetch contacts with TE data source using team ID', async () => {
      const { getContactTableAll } = require('@/services/contacts/api');

      getTeamIdByUserId.mockResolvedValue('team-123');

      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();

      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });
      mockRange.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      getCachedClassificationData.mockResolvedValue([]);

      const result = await getContactTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'te', []);

      expect(getTeamIdByUserId).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('team_id', 'team-123');
      expect(result.success).toBe(true);
    });

    it('should return empty success when TE data source has no team id', async () => {
      const { getContactTableAll } = require('@/services/contacts/api');

      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockReturnThis();

      getTeamIdByUserId.mockResolvedValue(null);
      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });

      const result = await getContactTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'te', []);

      expect(result).toEqual({
        data: [],
        success: true,
      });
    });

    it('should handle database error gracefully', async () => {
      const { getContactTableAll } = require('@/services/contacts/api');

      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();

      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });
      mockRange.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await getContactTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'tg', []);

      expect(consoleLogSpy).toHaveBeenCalledWith('error', { message: 'Database error' });
      expect(result.success).toBe(false);
      expect(result.data).toEqual([]);

      consoleLogSpy.mockRestore();
    });

    it('should fall back to id-only rows when contact table mapping throws', async () => {
      const { getContactTableAll } = require('@/services/contacts/api');

      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: [
          {
            id: 'contact-1',
            'common:shortName': [{ '@xml:lang': 'en', '#text': 'Contact 1' }],
            'common:name': [{ '@xml:lang': 'en', '#text': 'Full Name 1' }],
            'common:class': [{ '@level': '0', '#text': 'Category' }],
            email: 'test@example.com',
            version: 'v1.0',
            modified_at: '2023-01-01T00:00:00Z',
            team_id: 'team-1',
          },
        ],
        count: 1,
        error: null,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });
      mockRange.mockReturnValue({
        eq: mockEq,
      });
      getCachedClassificationData.mockResolvedValue([]);
      getLangText.mockImplementation(() => {
        throw new Error('Transform failed');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getContactTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'tg', []);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.data[0]).toEqual({ id: 'contact-1' });

      consoleErrorSpy.mockRestore();
    });

    it('should use default sorting and paging values, and fall back empty contact fields', async () => {
      const { getContactTableAll } = require('@/services/contacts/api');

      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: [
          {
            id: 'contact-defaults',
            'common:shortName': [{ '@xml:lang': 'en', '#text': 'Contact Defaults' }],
            'common:name': [{ '@xml:lang': 'en', '#text': 'Full Defaults' }],
            'common:class': [{ '@level': '0', '#text': 'Category' }],
            email: undefined,
            version: 'v2.0',
            modified_at: '2023-01-02T00:00:00Z',
            team_id: 'team-defaults',
          },
        ],
        count: null,
        error: null,
      });

      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });
      mockRange.mockReturnValue({
        eq: mockEq,
      });

      getCachedClassificationData.mockResolvedValue([{ '@id': 'cat-defaults' }]);

      const result = await getContactTableAll({}, {}, 'en', 'tg', []);

      expect(mockOrder).toHaveBeenCalledWith('modified_at', { ascending: false });
      expect(mockRange).toHaveBeenCalledWith(0, 9);
      expect(result).toMatchObject({
        page: 1,
        total: 0,
        success: true,
      });
      expect(result.data[0]).toMatchObject({
        id: 'contact-defaults',
        email: '-',
      });
    });
  });

  describe('getContactTablePgroongaSearch', () => {
    it('should perform full-text search with pgroonga', async () => {
      const { getContactTablePgroongaSearch } = require('@/services/contacts/api');

      mockAuth.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-123' },
          },
        },
      });

      mockRpc.mockResolvedValue({
        data: [
          {
            id: 'contact-1',
            json: {
              contactDataSet: {
                contactInformation: {
                  dataSetInformation: {
                    'common:shortName': [{ '@xml:lang': 'en', '#text': 'Search Result' }],
                    'common:name': [{ '@xml:lang': 'en', '#text': 'Full Name' }],
                    classificationInformation: {
                      'common:classification': {
                        'common:class': [{ '@level': '0', '#text': 'Category' }],
                      },
                    },
                    email: 'search@example.com',
                  },
                },
              },
            },
            version: 'v1.0',
            modified_at: '2023-01-01T00:00:00Z',
            team_id: 'team-1',
            total_count: 1,
          },
        ],
        error: null,
      });

      getCachedClassificationData.mockResolvedValue([]);

      const result = await getContactTablePgroongaSearch(
        { current: 1, pageSize: 10 },
        'en',
        'tg',
        'test query',
        {},
        100,
      );

      expect(mockAuth).toHaveBeenCalled();
      expect(mockRpc).toHaveBeenCalledWith('pgroonga_search_contacts', {
        query_text: 'test query',
        filter_condition: {},
        page_size: 10,
        page_current: 1,
        data_source: 'tg',
        this_user_id: 'user-123',
        state_code: 100,
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should handle empty search results', async () => {
      const { getContactTablePgroongaSearch } = require('@/services/contacts/api');

      mockAuth.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-123' },
          },
        },
      });

      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getContactTablePgroongaSearch(
        { current: 1, pageSize: 10 },
        'en',
        'tg',
        'no results',
        {},
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should search without state_code parameter', async () => {
      const { getContactTablePgroongaSearch } = require('@/services/contacts/api');

      mockAuth.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-123' },
          },
        },
      });

      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      await getContactTablePgroongaSearch({ current: 1, pageSize: 10 }, 'en', 'tg', 'query', {});

      expect(mockRpc).toHaveBeenCalledWith('pgroonga_search_contacts', {
        query_text: 'query',
        filter_condition: {},
        page_size: 10,
        page_current: 1,
        data_source: 'tg',
        this_user_id: 'user-123',
      });
    });

    it('should return the raw result when there is no session for pgroonga search', async () => {
      const { getContactTablePgroongaSearch } = require('@/services/contacts/api');

      mockAuth.mockResolvedValue({
        data: { session: null },
      });

      const result = await getContactTablePgroongaSearch(
        { current: 1, pageSize: 10 },
        'en',
        'tg',
        'query',
        {},
      );

      expect(mockRpc).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('should log rpc errors and return the raw rpc response', async () => {
      const { getContactTablePgroongaSearch } = require('@/services/contacts/api');

      mockAuth.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-123' },
          },
        },
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      });

      const result = await getContactTablePgroongaSearch(
        { current: 1, pageSize: 10 },
        'en',
        'tg',
        'query',
        {},
      );

      expect(consoleLogSpy).toHaveBeenCalledWith('error', { message: 'RPC failed' });
      expect(result).toEqual({
        data: null,
        error: { message: 'RPC failed' },
      });

      consoleLogSpy.mockRestore();
    });

    it('should fall back to id-only rows when pgroonga mapping throws', async () => {
      const { getContactTablePgroongaSearch } = require('@/services/contacts/api');

      mockAuth.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-123' },
          },
        },
      });

      mockRpc.mockResolvedValue({
        data: [
          {
            id: 'contact-1',
            json: {
              contactDataSet: {
                contactInformation: {
                  dataSetInformation: {
                    'common:shortName': [{ '@xml:lang': 'en', '#text': 'Search Result' }],
                    'common:name': [{ '@xml:lang': 'en', '#text': 'Full Name' }],
                    classificationInformation: {
                      'common:classification': {
                        'common:class': [{ '@level': '0', '#text': 'Category' }],
                      },
                    },
                    email: 'search@example.com',
                  },
                },
              },
            },
            version: 'v1.0',
            modified_at: '2023-01-01T00:00:00Z',
            team_id: 'team-1',
            total_count: 1,
          },
        ],
        error: null,
      });
      getCachedClassificationData.mockResolvedValue([]);
      getLangText.mockImplementation(() => {
        throw new Error('Transform failed');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getContactTablePgroongaSearch(
        { current: 1, pageSize: 10 },
        'en',
        'tg',
        'broken query',
        {},
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.data[0]).toEqual({ id: 'contact-1' });

      consoleErrorSpy.mockRestore();
    });

    it('should use default paging with state_code and fall back empty pgroonga fields', async () => {
      const { getContactTablePgroongaSearch } = require('@/services/contacts/api');

      mockAuth.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-defaults' },
          },
        },
      });

      mockRpc.mockResolvedValue({
        data: [
          {
            id: 'contact-search-defaults',
            version: 'v2.0',
            modified_at: '2023-01-02T00:00:00Z',
            team_id: 'team-defaults',
            total_count: null,
            json: {
              contactDataSet: {
                contactInformation: {
                  dataSetInformation: {
                    'common:shortName': [{ '@xml:lang': 'en', '#text': 'Search Defaults' }],
                    'common:name': [{ '@xml:lang': 'en', '#text': 'Search Full Defaults' }],
                    classificationInformation: {
                      'common:classification': {
                        'common:class': [{ '@level': '0', '#text': 'Category' }],
                      },
                    },
                    email: undefined,
                  },
                },
              },
            },
          },
        ],
        error: null,
      });
      getCachedClassificationData.mockResolvedValue([{ '@id': 'cat-search-defaults' }]);

      const result = await getContactTablePgroongaSearch(
        {},
        'en',
        'my',
        'defaults',
        { status: 'active' },
        0,
      );

      expect(mockRpc).toHaveBeenCalledWith('pgroonga_search_contacts', {
        query_text: 'defaults',
        filter_condition: { status: 'active' },
        page_size: 10,
        page_current: 1,
        data_source: 'my',
        this_user_id: 'user-defaults',
        state_code: 0,
      });
      expect(result).toMatchObject({
        page: 1,
        total: 0,
        success: true,
      });
      expect(result.data[0]).toMatchObject({
        id: 'contact-search-defaults',
        email: '-',
      });
    });

    it('should use default paging for pgroonga searches without state_code', async () => {
      const { getContactTablePgroongaSearch } = require('@/services/contacts/api');

      mockAuth.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-defaults' },
          },
        },
      });

      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      await getContactTablePgroongaSearch({}, 'en', 'tg', 'defaults', { level: 1 });

      expect(mockRpc).toHaveBeenCalledWith('pgroonga_search_contacts', {
        query_text: 'defaults',
        filter_condition: { level: 1 },
        page_size: 10,
        page_current: 1,
        data_source: 'tg',
        this_user_id: 'user-defaults',
      });
    });
  });

  describe('contact_hybrid_search', () => {
    it('should perform hybrid search via edge function', async () => {
      const { contact_hybrid_search } = require('@/services/contacts/api');

      mockAuth.mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            user: { id: 'user-123' },
          },
        },
      });

      const mockDataArray = [
        {
          id: 'contact-1',
          json: {
            contactDataSet: {
              contactInformation: {
                dataSetInformation: {
                  'common:shortName': [{ '@xml:lang': 'en', '#text': 'Hybrid Result' }],
                  'common:name': [{ '@xml:lang': 'en', '#text': 'Full Name' }],
                  classificationInformation: {
                    'common:classification': {
                      'common:class': [],
                    },
                  },
                  email: 'hybrid@example.com',
                },
              },
            },
          },
          version: 'v1.0',
          modified_at: '2023-01-01T00:00:00Z',
          team_id: 'team-1',
        },
      ];
      (mockDataArray as any).total_count = 1;

      mockFunctions.mockResolvedValue({
        data: {
          data: mockDataArray,
        },
        error: null,
      });

      getCachedClassificationData.mockResolvedValue([]);

      const result = await contact_hybrid_search(
        { current: 1, pageSize: 10 },
        'en',
        'tg',
        'hybrid query',
        { filter: 'value' },
        200,
      );

      expect(mockAuth).toHaveBeenCalled();
      expect(mockFunctions).toHaveBeenCalledWith('contact_hybrid_search', {
        headers: {
          Authorization: 'Bearer test-token',
        },
        body: {
          query: 'hybrid query',
          filter: { filter: 'value' },
          state_code: 200,
        },
        region: expect.any(String),
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should handle empty hybrid search results', async () => {
      const { contact_hybrid_search } = require('@/services/contacts/api');

      mockAuth.mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
          },
        },
      });

      mockFunctions.mockResolvedValue({
        data: {
          data: [],
        },
        error: null,
      });

      const result = await contact_hybrid_search(
        { current: 1, pageSize: 10 },
        'en',
        'tg',
        'no results',
        {},
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return raw result when there is no session for hybrid search', async () => {
      const { contact_hybrid_search } = require('@/services/contacts/api');

      mockAuth.mockResolvedValue({
        data: { session: null },
      });

      const result = await contact_hybrid_search(
        { current: 1, pageSize: 10 },
        'en',
        'tg',
        'query',
        {},
      );

      expect(mockFunctions).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('should log edge function errors and return the raw error response', async () => {
      const { contact_hybrid_search } = require('@/services/contacts/api');

      mockAuth.mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
          },
        },
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      mockFunctions.mockResolvedValue({
        data: null,
        error: { message: 'Hybrid failed' },
      });

      const result = await contact_hybrid_search(
        { current: 1, pageSize: 10 },
        'en',
        'tg',
        'query',
        {},
      );

      expect(consoleLogSpy).toHaveBeenCalledWith('error', { message: 'Hybrid failed' });
      expect(result).toEqual({
        data: null,
        error: { message: 'Hybrid failed' },
      });

      consoleLogSpy.mockRestore();
    });

    it('should fall back to id-only rows when hybrid mapping throws', async () => {
      const { contact_hybrid_search } = require('@/services/contacts/api');

      mockAuth.mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            user: { id: 'user-123' },
          },
        },
      });

      const hybridRows = [
        {
          id: 'contact-1',
          json: {
            contactDataSet: {
              contactInformation: {
                dataSetInformation: {
                  'common:shortName': [{ '@xml:lang': 'en', '#text': 'Hybrid Result' }],
                  'common:name': [{ '@xml:lang': 'en', '#text': 'Full Name' }],
                  classificationInformation: {
                    'common:classification': {
                      'common:class': [],
                    },
                  },
                  email: 'hybrid@example.com',
                },
              },
            },
          },
          version: 'v1.0',
          modified_at: '2023-01-01T00:00:00Z',
          team_id: 'team-1',
        },
      ] as any;
      hybridRows.total_count = 1;

      mockFunctions.mockResolvedValue({
        data: {
          data: hybridRows,
        },
        error: null,
      });
      getCachedClassificationData.mockResolvedValue([]);
      getLangText.mockImplementation(() => {
        throw new Error('Transform failed');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await contact_hybrid_search(
        { current: 1, pageSize: 10 },
        'en',
        'tg',
        'query',
        {},
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.data[0]).toEqual({ id: 'contact-1' });

      consoleErrorSpy.mockRestore();
    });

    it('should use an empty bearer token and default paging in hybrid search results', async () => {
      const { contact_hybrid_search } = require('@/services/contacts/api');

      mockAuth.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-hybrid' },
          },
        },
      });

      mockFunctions.mockResolvedValue({
        data: {
          data: Object.assign(
            [
              {
                id: 'contact-hybrid-defaults',
                version: 'v3.0',
                modified_at: '2023-01-03T00:00:00Z',
                team_id: 'team-hybrid',
                json: {
                  contactDataSet: {
                    contactInformation: {
                      dataSetInformation: {
                        'common:shortName': [{ '@xml:lang': 'en', '#text': 'Hybrid Defaults' }],
                        'common:name': [{ '@xml:lang': 'en', '#text': 'Hybrid Full Defaults' }],
                        classificationInformation: {
                          'common:classification': {
                            'common:class': [{ '@level': '0', '#text': 'Category' }],
                          },
                        },
                        email: undefined,
                      },
                    },
                  },
                },
              },
            ],
            { total_count: null },
          ),
        },
        error: null,
      });

      getCachedClassificationData.mockResolvedValue([{ '@id': 'cat-hybrid-defaults' }]);

      const result = await contact_hybrid_search({}, 'en', 'tg', 'hybrid', { tag: 'a' });

      expect(mockFunctions).toHaveBeenCalledWith('contact_hybrid_search', {
        headers: {
          Authorization: 'Bearer ',
        },
        body: {
          query: 'hybrid',
          filter: { tag: 'a' },
        },
        region: expect.any(String),
      });
      expect(result).toMatchObject({
        page: 1,
        total: 0,
        success: true,
      });
      expect(result.data[0]).toMatchObject({
        id: 'contact-hybrid-defaults',
        email: '-',
      });
    });
  });

  describe('getContactDetail', () => {
    it('should fetch contact detail via general API', async () => {
      const { getContactDetail } = require('@/services/contacts/api');

      getDataDetail.mockResolvedValue({
        data: {
          id: 'contact-123',
          version: 'v1.0',
          json: {},
        },
        success: true,
      });

      const result = await getContactDetail('contact-123', 'v1.0');

      expect(getDataDetail).toHaveBeenCalledWith('contact-123', 'v1.0', 'contacts');
      expect(result.success).toBe(true);
    });
  });
});
