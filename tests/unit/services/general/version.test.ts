import {
  compareDataSetVersions,
  getHighestDataSetVersion,
  getNextDataSetVersion,
  getNextDataSetVersionFromRows,
  sortDataSetVersionRows,
} from '@/services/general/version';

describe('dataset version helpers', () => {
  it('compares fixed-width dataset versions numerically', () => {
    expect(compareDataSetVersions('01.00.010', '01.00.002')).toBeGreaterThan(0);
    expect(compareDataSetVersions('01.02.000', '01.10.000')).toBeLessThan(0);
    expect(compareDataSetVersions('02.00.000', '01.99.999')).toBeGreaterThan(0);
    expect(compareDataSetVersions('01.00.000', '01.00.000')).toBe(0);
  });

  it('orders invalid or missing dataset versions after numeric versions', () => {
    expect(compareDataSetVersions('bad-version', 'another-bad-version')).toBeGreaterThan(0);
    expect(compareDataSetVersions(undefined, null)).toBe(0);
    expect(compareDataSetVersions('01.invalid.000', '01.00.001')).toBeLessThan(0);
    expect(compareDataSetVersions(undefined, '01.00.001')).toBeLessThan(0);
    expect(compareDataSetVersions('01.00.001', undefined)).toBeGreaterThan(0);
  });

  it('finds the highest dataset version while ignoring empty values', () => {
    expect(getHighestDataSetVersion(['01.00.001', undefined, '01.00.010'])).toBe('01.00.010');
  });

  it('returns the default first version when no valid versions are loaded', () => {
    expect(getNextDataSetVersion([])).toBe('00.00.000');
    expect(getNextDataSetVersion(['not-a-version'])).toBe('00.00.000');
  });

  it('increments the patch version from the highest loaded version', () => {
    expect(getNextDataSetVersion(['01.00.001', '01.00.010'])).toBe('01.00.011');
  });

  it('rolls over patch and minor versions at their limits', () => {
    expect(getNextDataSetVersion(['01.99.999'])).toBe('02.00.000');
  });

  it('sorts rows by dataset version using the shared comparator', () => {
    const rows = [
      { id: 'invalid', version: 'not-a-version' },
      { id: 'middle', version: '01.00.010' },
      { id: 'latest', version: '02.00.000' },
      { id: 'oldest', version: '00.99.999' },
    ];

    expect(sortDataSetVersionRows(rows).map((row) => row.id)).toEqual([
      'latest',
      'middle',
      'oldest',
      'invalid',
    ]);
    expect(sortDataSetVersionRows(rows, 'asc').map((row) => row.id)).toEqual([
      'invalid',
      'oldest',
      'middle',
      'latest',
    ]);
  });

  it('computes next dataset version from versioned rows', () => {
    expect(
      getNextDataSetVersionFromRows([
        { version: '01.00.001' },
        { version: '01.00.010' },
        { version: undefined },
      ]),
    ).toBe('01.00.011');
  });
});
