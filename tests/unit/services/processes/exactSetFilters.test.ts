import {
  matchesProcessExactSetClassification,
  matchesProcessExactSetKeyword,
  validateProcessExactSetFilters,
} from '@/services/processes/exactSetFilters';

const leaf = (code: unknown, level?: unknown, label = 'The same translated label') => ({
  '@classId': code,
  ...(level === undefined ? {} : { '@level': level }),
  '#text': label,
});

describe('Process exact-set canonical classification', () => {
  it('accepts empty filters and validates the same bounded selector shape as SQL', () => {
    expect(() => validateProcessExactSetFilters({})).not.toThrow();
    expect(() => validateProcessExactSetFilters({ classification: [] })).not.toThrow();
    expect(() =>
      validateProcessExactSetFilters({
        classification: [{ scope: 'classification', code: 'C', system: 'ISIC', path: ['A', 'C'] }],
      }),
    ).not.toThrow();
    expect(matchesProcessExactSetClassification(undefined)).toBe(true);
    expect(matchesProcessExactSetClassification(undefined, [])).toBe(true);
  });

  it.each([
    { keyword: 1 },
    { classification: 'C' },
    { classification: Array.from({ length: 51 }, () => ({ scope: 'classification', code: 'C' })) },
    { classification: [null] },
    { classification: [{ scope: 'unknown', code: 'C' }] },
    { classification: [{ scope: 'classification', code: '' }] },
    { classification: [{ scope: 'classification', code: 'C'.repeat(201) }] },
    { classification: [{ scope: 'classification', code: 'C', system: '' }] },
    { classification: [{ scope: 'classification', code: 'C', path: 'C' }] },
    { classification: [{ scope: 'classification', code: 'C', path: [] }] },
    { classification: [{ scope: 'classification', code: 'C', path: Array(21).fill('C') }] },
    { classification: [{ scope: 'classification', code: 'C', path: ['A', ''] }] },
    { classification: [{ scope: 'classification', code: 'C', path: ['A', 'B'] }] },
  ])('rejects invalid filters %j before reading/filtering a dataset collection', (filters) => {
    expect(() => validateProcessExactSetFilters(filters as any)).toThrow();
  });

  it.each([
    { '@name': 'ISIC', 'common:class': leaf('A', 0) },
    [{ '@name': 'ISIC', 'common:class': leaf('A', '0') }],
    { '@name': 'ISIC', 'common:class': [leaf('A', 0), leaf('B', 1)] },
    [{ '@name': 'ISIC', 'common:class': [leaf('A'), leaf('B')] }],
  ])('handles object/array forms at both container levels: %j', (containers) => {
    expect(
      matchesProcessExactSetClassification({ 'common:classification': containers }, [
        { scope: 'classification', code: 'A', system: 'ISIC' },
      ]),
    ).toBe(true);
  });

  it('matches ordered ancestor prefixes in one system and ignores translated labels', () => {
    const information = {
      'common:classification': [
        { '@name': 'Wrong system', 'common:class': [leaf('A', 0), leaf('B', 1)] },
        { '@name': 'ISIC', 'common:class': [leaf('C', 2), leaf('B', 1), leaf('A', 0)] },
      ],
    };
    expect(
      matchesProcessExactSetClassification(information, [
        { scope: 'classification', code: ' B ', system: ' ISIC ', path: [' A ', ' B '] },
      ]),
    ).toBe(true);
    expect(
      matchesProcessExactSetClassification(information, [
        { scope: 'classification', code: 'C', system: 'ISIC', path: ['A', 'B', 'C'] },
      ]),
    ).toBe(true);
    expect(
      matchesProcessExactSetClassification(information, [
        { scope: 'classification', code: 'B', system: 'Other', path: ['A', 'B'] },
      ]),
    ).toBe(false);
    expect(
      matchesProcessExactSetClassification(information, [
        { scope: 'classification', code: 'B', system: 'ISIC', path: ['X', 'B'] },
      ]),
    ).toBe(false);
    expect(
      matchesProcessExactSetClassification(information, [
        { scope: 'classification', code: 'The same translated label' },
      ]),
    ).toBe(false);
  });

  it('cannot assemble a path across systems, duplicate levels, gaps or malformed nodes', () => {
    const selector = [{ scope: 'classification' as const, code: 'B', path: ['A', 'B'] }];
    const nonmatching = [
      [
        { '@name': 'One', 'common:class': leaf('A', 0) },
        { '@name': 'Two', 'common:class': leaf('B', 1) },
      ],
      { 'common:class': [leaf('A', 0), leaf('B', 0)] },
      { 'common:class': [leaf('A', 0), leaf('B', 2)] },
      { 'common:class': [null, leaf('B')] },
      { 'common:class': [leaf('A'), leaf(undefined)] },
      ['unexpected-container'],
      'unexpected-container',
    ];
    for (const containers of nonmatching) {
      expect(
        matchesProcessExactSetClassification({ 'common:classification': containers }, selector),
      ).toBe(false);
    }
    expect(matchesProcessExactSetClassification(null, selector)).toBe(false);
    expect(matchesProcessExactSetClassification([], selector)).toBe(false);
    expect(matchesProcessExactSetClassification({}, [{ scope: 'elementary', code: 'air' }])).toBe(
      false,
    );
  });

  it('uses ordinal fallback for absent/invalid levels and SQL JSON text for canonical codes', () => {
    expect(
      matchesProcessExactSetClassification(
        {
          'common:classification': {
            'common:class': [leaf('A', 'invalid'), leaf('B')],
          },
        },
        [{ scope: 'classification', code: 'B', path: ['A', 'B'] }],
      ),
    ).toBe(true);
    expect(
      matchesProcessExactSetClassification(
        { 'common:classification': { 'common:class': leaf(12) } },
        [{ scope: 'classification', code: '12' }],
      ),
    ).toBe(true);
    expect(
      matchesProcessExactSetClassification(
        { 'common:classification': { 'common:class': leaf({ code: 'C' }) } },
        [{ scope: 'classification', code: '{"code":"C"}' }],
      ),
    ).toBe(true);
    expect(
      matchesProcessExactSetClassification(
        { 'common:classification': { 'common:class': leaf(null) } },
        [{ scope: 'classification', code: 'C' }],
      ),
    ).toBe(false);
  });
});

describe('Process exact-set original-text keyword', () => {
  const row = {
    id: 'id-1',
    version: '01.00.002',
    name: {
      baseName: [
        { '@xml:lang': 'en', '#text': 'Steel recycling' },
        { '@xml:lang': 'de', '#text': 'Stahl' },
      ],
    },
    'common:generalComment': { '#text': 'regional plant', ignored: false, empty: null, ordinal: 2 },
  };
  it('searches original multilingual name/comment and identity before localization', () => {
    expect(matchesProcessExactSetKeyword(row)).toBe(true);
    expect(matchesProcessExactSetKeyword(row, '   ')).toBe(true);
    expect(matchesProcessExactSetKeyword(row, 'STEEL plant')).toBe(true);
    expect(matchesProcessExactSetKeyword(row, 'stahl')).toBe(true);
    expect(matchesProcessExactSetKeyword(row, 'id-1 01.00.002')).toBe(true);
    expect(matchesProcessExactSetKeyword(row, '2')).toBe(true);
    expect(matchesProcessExactSetKeyword(row, 'xml:lang')).toBe(false);
    expect(matchesProcessExactSetKeyword(row, 'steel missing')).toBe(false);
    expect(matchesProcessExactSetKeyword({}, 'steel')).toBe(false);
  });
});
