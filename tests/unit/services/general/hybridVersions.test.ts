import { readMatchedHybridRows } from '@/services/general/hybridVersions';

describe('matched Hybrid version contract', () => {
  const row = { id: '11111111-1111-4111-8111-111111111111', version: '01.00.000' };

  it('accepts exact-version rows and a genuine acknowledged empty result', () => {
    const rows = [row, { ...row, version: '01.00.001' }];
    expect(readMatchedHybridRows({ versionScope: 'matched', data: rows })).toBe(rows);
    expect(readMatchedHybridRows({ versionScope: 'matched', data: [] })).toEqual([]);
  });

  it.each([
    null,
    false,
    'value',
    [],
    {},
    { versionScope: 'latest', data: [] },
    { data: [row] },
    { versionScope: 'matched', data: null },
  ])('rejects unacknowledged or malformed envelopes %#', (value) => {
    expect(readMatchedHybridRows(value)).toBeNull();
  });

  it.each([
    null,
    false,
    'row',
    1,
    [],
    {},
    { version: '01.00.000' },
    { ...row, id: ' ' },
    { ...row, id: 1 },
    { id: row.id },
    { ...row, version: 1 },
    { ...row, version: 'latest' },
    { ...row, version: '01.00.000 ' },
  ])('rejects incomplete exact identity %#', (value) => {
    expect(readMatchedHybridRows({ versionScope: 'matched', data: [value] })).toBeNull();
  });

  it('rejects duplicate exact identities without collapsing different versions', () => {
    expect(readMatchedHybridRows({ versionScope: 'matched', data: [row, row] })).toBeNull();
  });
});
