import { normalizeExchangeLocationCode } from '@/services/processes/exchangeLocation';

describe('normalizeExchangeLocationCode', () => {
  it('normalizes primitive location codes', () => {
    expect(normalizeExchangeLocationCode(' CN ')).toBe('CN');
    expect(normalizeExchangeLocationCode(123)).toBe('123');
    expect(normalizeExchangeLocationCode('   ')).toBeUndefined();
    expect(normalizeExchangeLocationCode(null)).toBeUndefined();
    expect(normalizeExchangeLocationCode(undefined)).toBeUndefined();
  });

  it('returns the first non-empty normalized array value', () => {
    expect(normalizeExchangeLocationCode([' ', { '#text': ' RER ' }])).toBe('RER');
    expect(normalizeExchangeLocationCode([])).toBeUndefined();
  });

  it('normalizes legacy object-shaped location values', () => {
    expect(normalizeExchangeLocationCode({ '#text': ' CN ', '@value': 'GLO', value: 'US' })).toBe(
      'CN',
    );
    expect(normalizeExchangeLocationCode({ '#text': ' ', '@value': ' GLO ', value: 'US' })).toBe(
      'GLO',
    );
    expect(
      normalizeExchangeLocationCode({ '#text': undefined, '@value': undefined, value: ' US ' }),
    ).toBe('US');
    expect(normalizeExchangeLocationCode({})).toBeUndefined();
  });

  it('ignores unsupported value types', () => {
    expect(normalizeExchangeLocationCode(true)).toBeUndefined();
  });
});
