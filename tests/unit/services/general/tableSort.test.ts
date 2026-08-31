import {
  getActiveTableSort,
  mapActiveTableSort,
  resolveTableSort,
} from '@/services/general/tableSort';

describe('tableSort', () => {
  describe('getActiveTableSort', () => {
    it.each([undefined, null, {}, { name: undefined }, { name: null }])(
      'returns no active sort for %p',
      (sort) => {
        expect(getActiveTableSort(sort)).toBeUndefined();
      },
    );

    it.each([
      ['ascend' as const, { field: 'name', order: 'ascend' as const }],
      ['descend' as const, { field: 'name', order: 'descend' as const }],
    ])('preserves an active %s order', (order, expected) => {
      expect(getActiveTableSort({ name: order })).toEqual(expected);
    });

    it('skips inactive entries before an active sorter', () => {
      expect(getActiveTableSort({ name: undefined, modifiedAt: 'ascend' })).toEqual({
        field: 'modifiedAt',
        order: 'ascend',
      });
    });
  });

  describe('resolveTableSort', () => {
    it('uses the configured fallback when no sorter is active', () => {
      expect(resolveTableSort({ name: undefined }, 'modified_at')).toEqual({
        field: 'modified_at',
        order: 'descend',
      });
    });

    it('supports an ascending fallback', () => {
      expect(resolveTableSort({}, 'version', 'ascend')).toEqual({
        field: 'version',
        order: 'ascend',
      });
    });
  });

  describe('mapActiveTableSort', () => {
    it('does not forward inactive sorter keys', () => {
      expect(mapActiveTableSort({ name: undefined }, { name: 'json->name' })).toEqual({});
    });

    it('maps an active sorter field', () => {
      expect(mapActiveTableSort({ name: 'descend' }, { name: 'json->name' })).toEqual({
        'json->name': 'descend',
      });
    });

    it('preserves an unmapped active sorter field', () => {
      expect(mapActiveTableSort({ modifiedAt: 'ascend' }, {})).toEqual({
        modifiedAt: 'ascend',
      });
    });
  });
});
