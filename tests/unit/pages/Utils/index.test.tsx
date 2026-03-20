import {
  getAllVersionsColumns,
  getClassificationValues,
  getDataTitle,
  getLocalValueProps,
  getRules,
  validateRefObjectId,
} from '@/pages/Utils';
import { render, screen } from '@testing-library/react';

jest.mock('umi', () => ({
  FormattedMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) => (
    <span data-testid={id}>{defaultMessage ?? id}</span>
  ),
}));

describe('Utils page helpers', () => {
  it('returns localized titles for known data sources and empty string for unknown ones', () => {
    render(
      <>
        {getDataTitle('my')}
        {getDataTitle('tg')}
        {getDataTitle('co')}
        {getDataTitle('te')}
      </>,
    );

    expect(screen.getByText('My Data')).toBeInTheDocument();
    expect(screen.getByText('Open Data')).toBeInTheDocument();
    expect(screen.getByText('Commercial Data')).toBeInTheDocument();
    expect(screen.getByText('Team Data')).toBeInTheDocument();
    expect(getDataTitle('unknown')).toBe('');
  });

  it('removes the trailing column and clears the render function on the version column', () => {
    const renderVersion = jest.fn();
    const columns = [
      { title: 'Name', dataIndex: 'name' },
      { title: 'Version', dataIndex: 'version', render: renderVersion },
      { title: 'Action', dataIndex: 'action' },
    ];

    const newColumns = getAllVersionsColumns(columns as any, 1);

    expect(newColumns).toHaveLength(2);
    expect(newColumns[1]).toMatchObject({
      title: 'Version',
      dataIndex: 'version',
      render: undefined,
    });
    expect(columns[1].render).toBe(renderVersion);
  });

  it('normalizes validation rules and replaces named patterns with regular expressions', () => {
    const rules = getRules([
      {
        pattern: 'dataSetVersion',
        messageKey: 'rule.version',
        defaultMessage: 'Version is invalid',
      },
      {
        pattern: 'CASNumber',
        messageKey: 'rule.cas',
        defaultMessage: 'CAS number is invalid',
      },
      {
        pattern: 'year',
        messageKey: 'rule.year',
        defaultMessage: 'Year is invalid',
      },
      {
        pattern: /foo/,
        messageKey: 'rule.raw',
        defaultMessage: 'Raw pattern is invalid',
      },
    ] as any);

    expect(rules[0].pattern.test('01.02.003')).toBe(true);
    expect(rules[0].pattern.test('1.2.3')).toBe(false);
    expect(rules[1].pattern.test('50-00-0')).toBe(true);
    expect(rules[1].pattern.test('invalid')).toBe(false);
    expect(rules[2].pattern.test('2026')).toBe(true);
    expect(rules[2].pattern.test('26')).toBe(false);
    expect(rules[3].pattern).toEqual(/foo/);
    expect(rules[0]).not.toHaveProperty('defaultMessage');
    expect(rules[0]).not.toHaveProperty('messageKey');

    render(
      <>
        {rules.map((rule, index) => (
          <div key={index}>{rule.message}</div>
        ))}
      </>,
    );

    expect(screen.getByText('Version is invalid')).toBeInTheDocument();
    expect(screen.getByText('CAS number is invalid')).toBeInTheDocument();
    expect(screen.getByText('Year is invalid')).toBeInTheDocument();
    expect(screen.getByText('Raw pattern is invalid')).toBeInTheDocument();
  });

  it('validates nested reference object ids with and without parent names', () => {
    const validateFields = jest.fn();
    const formRef = {
      current: {
        validateFields,
      },
    };

    validateRefObjectId(formRef as any, ['exchanges', 1]);
    expect(validateFields).toHaveBeenNthCalledWith(1, [['exchanges', 1, '@refObjectId']]);

    validateRefObjectId(formRef as any, ['child', 0], ['parent', 2]);
    expect(validateFields).toHaveBeenNthCalledWith(2, [['parent', 2, 'child', 0, '@refObjectId']]);
  });

  it('maps local language values into display labels', () => {
    expect(getLocalValueProps('en')).toEqual({ value: 'English' });
    expect(getLocalValueProps('zh')).toEqual({ value: '简体中文' });
    expect(getLocalValueProps('fr')).toEqual({ value: 'fr' });
  });

  it('extracts classification values only from supported object shapes', () => {
    expect(getClassificationValues(undefined)).toBeUndefined();
    expect(getClassificationValues('invalid')).toBeUndefined();
    expect(getClassificationValues({})).toBeUndefined();
    expect(getClassificationValues({ value: 'not-an-array' })).toBeUndefined();
    expect(getClassificationValues({ value: ['air', 3, 'water', null] })).toEqual(['air', 'water']);
  });
});
