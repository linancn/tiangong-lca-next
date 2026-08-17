const mockInvokeDataProductCommand = jest.fn();

jest.mock('@/services/dataProducts/api', () => ({
  invokeDataProductCommand: (...args: any[]) =>
    Reflect.apply(mockInvokeDataProductCommand, undefined, args),
}));

import {
  createLciaResultSet,
  decodeLciaResultSet,
  getLciaResultSet,
  listLciaResultSets,
} from '@/services/dataProducts/resultSets';

const resultSet = {
  schemaVersion: 'lcia.result-set.v1' as const,
  resultSetId: '77777777-7777-4777-8777-777777777777',
  name: 'August result set',
  createdAt: '2026-08-17T00:00:00.000Z',
};

describe('dataProducts result sets', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the minimal create/list/get command surface', async () => {
    mockInvokeDataProductCommand
      .mockResolvedValueOnce({ data: resultSet, error: null, status: 200 })
      .mockResolvedValueOnce({ data: { items: [resultSet] }, error: null, status: 200 })
      .mockResolvedValueOnce({ data: resultSet, error: null, status: 200 });

    await expect(createLciaResultSet('August result set')).resolves.toMatchObject({
      data: resultSet,
      error: null,
    });
    await expect(listLciaResultSets()).resolves.toMatchObject({
      data: { items: [resultSet] },
      error: null,
    });
    await expect(getLciaResultSet(resultSet.resultSetId)).resolves.toMatchObject({
      data: resultSet,
      error: null,
    });

    expect(mockInvokeDataProductCommand).toHaveBeenNthCalledWith(1, {
      action: 'create_result_set',
      name: 'August result set',
    });
    expect(mockInvokeDataProductCommand).toHaveBeenNthCalledWith(2, {
      action: 'list_result_sets',
      limit: 200,
    });
    expect(mockInvokeDataProductCommand).toHaveBeenNthCalledWith(3, {
      action: 'get_result_set',
      resultSetId: resultSet.resultSetId,
    });
  });

  it('rejects malformed or expanded projections', async () => {
    expect(decodeLciaResultSet({ ...resultSet, ownerId: 'private-owner' })).toBeNull();
    expect(decodeLciaResultSet({ ...resultSet, resultSetId: 'not-a-uuid' })).toBeNull();

    mockInvokeDataProductCommand.mockResolvedValueOnce({
      data: { items: [{ ...resultSet, status: 'invented-state' }] },
      error: null,
      status: 200,
    });
    await expect(listLciaResultSets()).resolves.toMatchObject({
      data: null,
      error: { code: 'INVALID_RESULT_SET_PROJECTION' },
    });
  });

  it('preserves command errors without reinterpretation', async () => {
    mockInvokeDataProductCommand.mockResolvedValueOnce({
      data: null,
      error: { code: 'not_data_product_manager', message: 'Forbidden' },
      status: 403,
    });
    await expect(listLciaResultSets()).resolves.toMatchObject({
      data: null,
      error: { code: 'not_data_product_manager' },
      status: 403,
    });
  });
});
