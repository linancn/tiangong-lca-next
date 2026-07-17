import {
  analyzeIcuMessage,
  formatIcuMessage,
  serializeIcuArgumentSignature,
} from '../../helpers/i18n/localeAudit';
import { defaultIntl, renderMessageWithValues } from '../../mocks/i18n';

describe('ICU message audit parser', () => {
  it('extracts deterministic name/type signatures through nested plural and select branches', () => {
    const message =
      '{audience, select, reviewer {{count, plural, one {{label}: # issue} other {{label}: # issues}}} other {{count, number} total}}';

    expect(analyzeIcuMessage(message).argumentSignature).toEqual([
      { name: 'audience', type: 'select' },
      { name: 'count', type: 'number' },
      { name: 'count', type: 'plural' },
      { name: 'label', type: 'simple' },
    ]);
    expect(serializeIcuArgumentSignature(message)).toBe(
      'audience:select, count:number, count:plural, label:simple',
    );
  });

  it('formats plural, number, select, and apostrophe-escaped syntax without dependencies', () => {
    const message =
      "'{count}' {audience, select, reviewer {{count, plural, one {# issue} other {# issues}}} other {{count, number} total}}";

    expect(formatIcuMessage(message, { audience: 'reviewer', count: 1 }, 'en-US')).toBe(
      '{count} 1 issue',
    );
    expect(formatIcuMessage(message, { audience: 'reviewer', count: 2 }, 'en-US')).toBe(
      '{count} 2 issues',
    );
    expect(formatIcuMessage(message, { audience: 'other', count: 1234 }, 'en-US')).toBe(
      '{count} 1,234 total',
    );
  });

  it.each([
    ['unclosed argument', 'Hello {name'],
    ['unexpected closing brace', 'Hello name}'],
    ['unsupported argument type', '{createdAt, date}'],
    ['plural without other', '{count, plural, one {# item}}'],
    ['select without other', '{status, select, ready {Ready}}'],
    ['unbalanced plural option', '{count, plural, other {# items}'],
    ['unclosed apostrophe escape', "Hello '{name}"],
  ])('rejects %s', (_label, message) => {
    expect(() => analyzeIcuMessage(message)).toThrow();
  });

  it('uses the shared formatter in primitive-value i18n mocks', () => {
    const message = '{count, plural, one {# record} other {# records}}';

    expect(defaultIntl.formatMessage({ defaultMessage: message }, { count: 2 })).toBe('2 records');
    expect(renderMessageWithValues(message, { count: 1 })).toBe('1 record');
  });
});
