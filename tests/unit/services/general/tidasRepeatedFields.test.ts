import { hasTidasReference, mapTidasRepeated } from '@/services/general/tidasRepeatedFields';

describe('ILCD repeated data boundaries', () => {
  it('keeps singleton and array shapes, including absent and empty values', () => {
    const convert = (value: any, index: number) => ({ value, index });
    expect(mapTidasRepeated(undefined, convert)).toEqual({ value: undefined, index: 0 });
    expect(mapTidasRepeated('a', convert)).toEqual({ value: 'a', index: 0 });
    expect(mapTidasRepeated(['a', 'b'], convert)).toEqual([
      { value: 'a', index: 0 },
      { value: 'b', index: 1 },
    ]);
    expect(mapTidasRepeated([], convert)).toEqual([]);
  });
  it('recognizes every reference while preserving strict identity semantics', () => {
    expect(hasTidasReference('0', '0')).toBe(true);
    expect(hasTidasReference(['0', '2'], '2')).toBe(true);
    expect(hasTidasReference(['0', '2'], '1')).toBe(false);
    expect(hasTidasReference('0', 0)).toBe(false);
    expect(hasTidasReference(undefined, '0')).toBe(false);
  });
});

it('adapts legacy selection shapes without altering empty or repeated data', () => {
  const {
    firstTidasRepeated,
    toTidasMultiSelectValue,
  } = require('@/services/general/tidasRepeatedFields');
  expect(firstTidasRepeated([{ '@name': 'a' }, { '@name': 'b' }])).toEqual({ '@name': 'a' });
  expect(firstTidasRepeated({ '@name': 'a' })).toEqual({ '@name': 'a' });
  expect(firstTidasRepeated([])).toBeUndefined();
  expect(firstTidasRepeated(undefined)).toBeUndefined();
  expect(toTidasMultiSelectValue('CN')).toEqual(['CN']);
  expect(toTidasMultiSelectValue(['CN', 'US'])).toEqual(['CN', 'US']);
  expect(toTidasMultiSelectValue(null)).toBeNull();
  expect(toTidasMultiSelectValue(undefined)).toBeUndefined();
});
