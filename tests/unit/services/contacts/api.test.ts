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
  const {
    attachLangNormalizationMetadata,
    buildLangNormalizationMetadata,
    getTeamIdByUserId,
    invokeDatasetCommand,
    normalizeLangPayloadForSave,
  } = jest.requireMock('@/services/general/api');
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
    mockAuth.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123' },
        },
      },
    });
    getTeamIdByUserId.mockResolvedValue('team-123');

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
    buildLangNormalizationMetadata.mockImplementation((normalizedResult: any, rawPayload: any) => ({
      normalizedJsonOrdered: normalizedResult?.payload ?? rawPayload,
      langSupplementedPlaceholderPaths: normalizedResult?.supplementedEnglishPlaceholderPaths ?? [],
      langTranslatedPaths: normalizedResult?.translatedPaths ?? [],
    }));
    attachLangNormalizationMetadata.mockImplementation((result: any) => result);
    getLangText.mockImplementation((value: any) => value?.[0]?.['#text'] || '');
    jsonToList.mockImplementation((value: any) => (Array.isArray(value) ? value : [value]));
    genClassificationZH.mockReturnValue([{ '@level': '0', '#text': 'Test Classification' }]);
    classificationToString.mockReturnValue('Test Classification');
  });

  describe('createContact', () => {
    it('should create a contact with generated JSON and rule verification', async () => {
      const { createContact } = require('@/services/contacts/api');
      invokeDatasetCommand.mockResolvedValue({
        data: [{ id: 'contact-123', json_ordered: {} }],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
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
      expect(invokeDatasetCommand).toHaveBeenCalledWith(
        'app_dataset_create',
        expect.objectContaining({
          id: 'contact-123',
          table: 'contacts',
          jsonOrdered: expect.any(Object),
          ruleVerification: true,
        }),
        {
          ruleVerification: true,
        },
      );
      expect(result.data).toBeDefined();
    });

    it('should create a contact when the user has no team id', async () => {
      const { createContact } = require('@/services/contacts/api');
      getTeamIdByUserId.mockResolvedValue(null);
      invokeDatasetCommand.mockResolvedValue({
        data: [{ id: 'contact-no-team', json_ordered: {} }],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      });

      const result = await createContact('contact-no-team', {});

      expect(invokeDatasetCommand).toHaveBeenCalledWith(
        'app_dataset_create',
        expect.objectContaining({
          id: 'contact-no-team',
          table: 'contacts',
        }),
        expect.any(Object),
      );
      expect(result.data).toBeDefined();
    });

    it('should handle create with invalid data', async () => {
      const { createContact } = require('@/services/contacts/api');
      invokeDatasetCommand.mockResolvedValue({
        data: [{ id: 'contact-123', rule_verification: false }],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
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
          ruleVerification: true,
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
          ruleVerification: true,
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

    it('should update a contact when the user has no team id', async () => {
      const { updateContact } = require('@/services/contacts/api');
      getTeamIdByUserId.mockResolvedValue(null);
      invokeDatasetCommand.mockResolvedValue({
        data: [{ success: true, rule_verification: true }],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      });

      const result = await updateContact('contact-no-team', '01.00.000', {});

      expect(invokeDatasetCommand).toHaveBeenCalledWith(
        'app_dataset_save_draft',
        expect.objectContaining({
          id: 'contact-no-team',
          table: 'contacts',
        }),
        expect.any(Object),
      );
      expect(result.data).toEqual([{ success: true, rule_verification: true }]);
    });
  });

  describe('deleteContact', () => {
    it('should delete contact by id and version', async () => {
      const { deleteContact } = require('@/services/contacts/api');
      invokeDatasetCommand.mockResolvedValue({
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      });

      const result = await deleteContact('contact-123', 'v1.0');

      expect(invokeDatasetCommand).toHaveBeenCalledWith('app_dataset_delete', {
        id: 'contact-123',
        version: 'v1.0',
        table: 'contacts',
      });
      expect(result).toEqual({
        data: null,
        error: null,
        count: null,
        status: 204,
        statusText: 'No Content',
      });
    });
  });

  describe('getContactTableAll', () => {
    const latestContactRow = (overrides: any = {}) => ({
      id: 'contact-1',
      version: '01.00.002',
      modified_at: '2023-01-01T00:00:00Z',
      team_id: 'team-1',
      total_count: 1,
      json: {
        contactDataSet: {
          contactInformation: {
            dataSetInformation: {
              'common:shortName': [{ '@xml:lang': 'en', '#text': 'Contact 1' }],
              'common:name': [{ '@xml:lang': 'en', '#text': 'Full Name 1' }],
              classificationInformation: {
                'common:classification': {
                  'common:class': [{ '@level': '0', '#text': 'Category' }],
                },
              },
              email: 'test@example.com',
            },
          },
        },
      },
      ...overrides,
    });

    it('should fetch latest contact versions with pagination and sorting', async () => {
      const { getContactTableAll } = require('@/services/contacts/api');
      mockRpc.mockResolvedValue({ data: [latestContactRow()], error: null });
      getLangText.mockImplementation((value: any) => value?.[0]?.['#text'] ?? '-');
      jsonToList.mockReturnValue([{ '@level': '0', '#text': 'Category' }]);
      classificationToString.mockReturnValue('Category');

      const result = await getContactTableAll(
        { current: 1, pageSize: 10 },
        { modifiedAt: 'descend' },
        'en',
        'tg',
        [],
      );

      expect(mockRpc).toHaveBeenCalledWith('get_latest_contact_versions', {
        page_size: 10,
        page_current: 1,
        data_source: 'tg',
        this_user_id: 'user-123',
        team_id_filter: null,
        state_code_filter: null,
        sort_by: 'modified_at',
        sort_direction: 'desc',
      });
      expect(result).toMatchObject({ page: 1, success: true, total: 1 });
      expect(result.data[0]).toMatchObject({
        id: 'contact-1',
        shortName: 'Contact 1',
        version: '01.00.002',
      });
      expect(result.data[0]).not.toHaveProperty('latestVersion');
    });

    it('should map Chinese classification rows', async () => {
      const { getContactTableAll } = require('@/services/contacts/api');
      mockRpc.mockResolvedValue({ data: [latestContactRow()], error: null });
      getCachedClassificationData.mockResolvedValue([{ '@id': 'cat-1' }]);
      genClassificationZH.mockReturnValue(['联系人分类']);
      classificationToString.mockReturnValue('联系人分类');
      getLangText.mockReturnValue('联系人');

      const result = await getContactTableAll({ current: 1, pageSize: 10 }, {}, 'zh', 'tg', []);

      expect(getCachedClassificationData).toHaveBeenCalledWith('Contact', 'zh', ['all']);
      expect(genClassificationZH).toHaveBeenCalled();
      expect(result.data[0]).toMatchObject({
        shortName: '联系人',
        classification: '联系人分类',
      });
    });

    it('should map sparse Chinese contact rows with default display fields', async () => {
      const { getContactTableAll } = require('@/services/contacts/api');
      mockRpc.mockResolvedValue({
        data: [
          latestContactRow({
            modified_at: null,
            json: {
              contactDataSet: {
                contactInformation: {
                  dataSetInformation: {
                    'common:shortName': [{ '@xml:lang': 'zh', '#text': '稀疏联系人' }],
                    'common:name': [{ '@xml:lang': 'zh', '#text': '稀疏联系人全称' }],
                    classificationInformation: {
                      'common:classification': { 'common:class': [] },
                    },
                    email: undefined,
                  },
                },
              },
            },
          }),
        ],
        error: null,
      });
      getCachedClassificationData.mockResolvedValue([{ '@id': 'cat-1' }]);
      genClassificationZH.mockReturnValue(['联系人分类']);
      classificationToString.mockReturnValue('联系人分类');
      getLangText.mockImplementation((value: any) => value?.[0]?.['#text'] ?? '-');

      const result = await getContactTableAll({}, {}, 'zh', 'tg', []);

      expect(result.data[0]).toMatchObject({
        email: '-',
      });
      expect(result.data[0].modifiedAt).toBeInstanceOf(Date);
    });

    it('should normalize createdAt sorting and fall back on Chinese mapping errors', async () => {
      const { getContactTableAll } = require('@/services/contacts/api');
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockRpc.mockResolvedValue({ data: [latestContactRow()], error: null });
      jsonToList.mockImplementation(() => {
        throw new Error('Chinese contact transformation error');
      });

      const result = await getContactTableAll(
        { current: 1, pageSize: 10 },
        { createdAt: 'ascend' },
        'zh',
        'tg',
        [],
      );

      expect(mockRpc).toHaveBeenCalledWith(
        'get_latest_contact_versions',
        expect.objectContaining({
          sort_by: 'created_at',
          sort_direction: 'asc',
        }),
      );
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.data[0]).toEqual({ id: 'contact-1' });

      consoleErrorSpy.mockRestore();
    });

    it('should include team filters for public and collaborative data', async () => {
      const { getContactTableAll } = require('@/services/contacts/api');
      mockRpc.mockResolvedValue({ data: [latestContactRow()], error: null });

      await getContactTableAll({}, {}, 'en', 'co', 'team-co');

      expect(mockRpc).toHaveBeenCalledWith(
        'get_latest_contact_versions',
        expect.objectContaining({
          data_source: 'co',
          team_id_filter: 'team-co',
        }),
      );
    });

    it('should use an empty user id when the session omits user details', async () => {
      const { getContactTableAll } = require('@/services/contacts/api');
      mockAuth.mockResolvedValue({ data: { session: {} } });
      mockRpc.mockResolvedValue({ data: [latestContactRow()], error: null });

      await getContactTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'tg', []);

      expect(mockRpc).toHaveBeenCalledWith(
        'get_latest_contact_versions',
        expect.objectContaining({
          this_user_id: '',
        }),
      );
    });

    it('should include owner and state filters for my data', async () => {
      const { getContactTableAll } = require('@/services/contacts/api');
      mockRpc.mockResolvedValue({ data: [latestContactRow()], error: null });

      await getContactTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'my', [], 100);

      expect(mockRpc).toHaveBeenCalledWith(
        'get_latest_contact_versions',
        expect.objectContaining({
          data_source: 'my',
          this_user_id: 'user-123',
          team_id_filter: null,
          state_code_filter: 100,
        }),
      );
    });

    it('should return empty data when my data has no session', async () => {
      const { getContactTableAll } = require('@/services/contacts/api');
      mockAuth.mockResolvedValue({ data: { session: null } });

      const result = await getContactTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'my', []);

      expect(mockRpc).not.toHaveBeenCalled();
      expect(result).toEqual({ data: [], success: false });
    });

    it('should include team filters for team data and skip when no team exists', async () => {
      const { getContactTableAll } = require('@/services/contacts/api');
      mockRpc.mockResolvedValue({ data: [latestContactRow()], error: null });

      await getContactTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'te', [], 100);

      expect(getTeamIdByUserId).toHaveBeenCalled();
      expect(mockRpc).toHaveBeenCalledWith(
        'get_latest_contact_versions',
        expect.objectContaining({
          data_source: 'te',
          team_id_filter: 'team-123',
          state_code_filter: 100,
        }),
      );

      mockRpc.mockClear();
      getTeamIdByUserId.mockResolvedValue(null);

      const result = await getContactTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'te', []);

      expect(mockRpc).not.toHaveBeenCalled();
      expect(result).toEqual({ data: [], success: true });
    });

    it('should handle empty and error results', async () => {
      const { getContactTableAll } = require('@/services/contacts/api');
      mockRpc.mockResolvedValueOnce({ data: [], error: null });

      await expect(
        getContactTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'tg', []),
      ).resolves.toEqual({
        data: [],
        success: true,
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } });

      const result = await getContactTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'tg', []);

      expect(consoleLogSpy).toHaveBeenCalledWith('error', { message: 'Database error' });
      expect(result).toEqual({ data: [], success: false });
      consoleLogSpy.mockRestore();
    });

    it('should fall back to id-only rows when contact table mapping throws', async () => {
      const { getContactTableAll } = require('@/services/contacts/api');
      mockRpc.mockResolvedValue({ data: [latestContactRow()], error: null });
      getLangText.mockImplementation(() => {
        throw new Error('Transform failed');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getContactTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'tg', []);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.data[0]).toEqual({ id: 'contact-1' });
      consoleErrorSpy.mockRestore();
    });

    it('should use default paging and sparse field fallbacks', async () => {
      const { getContactTableAll } = require('@/services/contacts/api');
      mockRpc.mockResolvedValue({
        data: [
          latestContactRow({
            id: 'contact-defaults',
            modified_at: null,
            total_count: null,
            json: {
              contactDataSet: {
                contactInformation: {
                  dataSetInformation: {
                    'common:shortName': [{ '@xml:lang': 'en', '#text': 'Contact Defaults' }],
                    'common:name': [{ '@xml:lang': 'en', '#text': 'Full Defaults' }],
                    classificationInformation: {
                      'common:classification': { 'common:class': [] },
                    },
                    email: undefined,
                  },
                },
              },
            },
          }),
        ],
        error: null,
      });

      const result = await getContactTableAll({}, {}, 'en', 'tg', []);

      expect(mockRpc).toHaveBeenCalledWith(
        'get_latest_contact_versions',
        expect.objectContaining({
          page_size: 10,
          page_current: 1,
          sort_by: 'modified_at',
          sort_direction: 'desc',
        }),
      );
      expect(result).toMatchObject({ page: 1, total: 0, success: true });
      expect(result.data[0]).toMatchObject({
        id: 'contact-defaults',
        email: '-',
      });
    });
  });

  describe('getContactTablePgroongaSearch', () => {
    const latestSearchRow = (overrides: any = {}) => ({
      id: 'contact-1',
      version: '01.00.002',
      modified_at: '2023-01-01T00:00:00Z',
      team_id: 'team-1',
      total_count: 1,
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
      ...overrides,
    });

    it('should perform latest-version full-text search with pgroonga', async () => {
      const { getContactTablePgroongaSearch } = require('@/services/contacts/api');
      mockRpc.mockResolvedValue({ data: [latestSearchRow()], error: null });
      getLangText.mockImplementation((value: any) => value?.[0]?.['#text'] ?? '-');
      jsonToList.mockReturnValue([{ '@level': '0', '#text': 'Category' }]);
      classificationToString.mockReturnValue('Category');

      const result = await getContactTablePgroongaSearch(
        { current: 1, pageSize: 10 },
        'en',
        'tg',
        'test query',
        {},
        100,
        'team-1',
      );

      expect(mockAuth).toHaveBeenCalled();
      expect(mockRpc).toHaveBeenCalledWith('search_contacts_latest', {
        query_text: 'test query',
        filter_condition: {},
        page_size: 10,
        page_current: 1,
        data_source: 'tg',
        this_user_id: 'user-123',
        team_id_filter: 'team-1',
        state_code_filter: 100,
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0]).not.toHaveProperty('latestVersion');
    });

    it('should handle empty search results', async () => {
      const { getContactTablePgroongaSearch } = require('@/services/contacts/api');

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

      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      await getContactTablePgroongaSearch({ current: 1, pageSize: 10 }, 'en', 'tg', 'query', {});

      expect(mockRpc).toHaveBeenCalledWith('search_contacts_latest', {
        query_text: 'query',
        filter_condition: {},
        page_size: 10,
        page_current: 1,
        data_source: 'tg',
        this_user_id: 'user-123',
        team_id_filter: null,
        state_code_filter: null,
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
      mockRpc.mockResolvedValue({ data: [latestSearchRow()], error: null });
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
          latestSearchRow({
            id: 'contact-search-defaults',
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
          }),
        ],
        error: null,
      });

      const result = await getContactTablePgroongaSearch(
        {},
        'en',
        'my',
        'defaults',
        { status: 'active' },
        0,
      );

      expect(mockRpc).toHaveBeenCalledWith('search_contacts_latest', {
        query_text: 'defaults',
        filter_condition: { status: 'active' },
        page_size: 10,
        page_current: 1,
        data_source: 'my',
        this_user_id: 'user-defaults',
        team_id_filter: null,
        state_code_filter: 0,
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

      expect(mockRpc).toHaveBeenCalledWith('search_contacts_latest', {
        query_text: 'defaults',
        filter_condition: { level: 1 },
        page_size: 10,
        page_current: 1,
        data_source: 'tg',
        this_user_id: 'user-defaults',
        team_id_filter: null,
        state_code_filter: null,
      });
    });

    it('should map Chinese search rows and skip team data without a team id', async () => {
      const { getContactTablePgroongaSearch } = require('@/services/contacts/api');
      mockRpc.mockResolvedValue({ data: [latestSearchRow({ total_count: 3 })], error: null });
      getCachedClassificationData.mockResolvedValue([{ '@id': 'cat-zh' }]);
      genClassificationZH.mockReturnValue(['联系人分类']);
      classificationToString.mockReturnValue('联系人分类');
      getLangText.mockReturnValue('联系人');

      const result = await getContactTablePgroongaSearch({}, 'zh', 'tg', '联系人', {});

      expect(getCachedClassificationData).toHaveBeenCalledWith('Contact', 'zh', ['all']);
      expect(result).toMatchObject({ page: 1, success: true, total: 3 });
      expect(result.data[0]).toMatchObject({
        shortName: '联系人',
        classification: '联系人分类',
      });

      mockRpc.mockClear();
      getTeamIdByUserId.mockResolvedValue(null);

      await expect(getContactTablePgroongaSearch({}, 'en', 'te', 'team', {})).resolves.toEqual({
        data: [],
        success: true,
      });
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe('getContactDetail', () => {
    it('should delegate to getDataDetail with contacts table', async () => {
      const { getContactDetail } = require('@/services/contacts/api');
      const { getDataDetail } = jest.requireMock('@/services/general/api');
      const mockDetail = { data: { id: 'contact-detail' }, success: true };

      getDataDetail.mockResolvedValue(mockDetail);

      const result = await getContactDetail('contact-detail', '01.00.000');

      expect(getDataDetail).toHaveBeenCalledWith('contact-detail', '01.00.000', 'contacts');
      expect(result).toBe(mockDetail);
    });
  });
});
