import {
  getSdkSuggestedFixMessage,
  normalizeValidationMessageText,
} from '@/pages/Utils/validation/messages';

const intl = {
  formatMessage: (
    { defaultMessage, id }: { defaultMessage?: string; id: string },
    values?: Record<string, string | number | undefined>,
  ) => {
    const templates: Record<string, string> = {
      'pages.validationIssues.sdkDetail.suggestedFix.custom': 'Resolve {count} custom issues.',
      'pages.validationIssues.sdkDetail.suggestedFix.string_too_short':
        'Enter at least {minimum} characters.',
      'validator.Year.pattern': 'Please enter a valid year (e.g., 2023).',
    };

    const template = templates[id] ?? defaultMessage ?? '';
    return template.replace(/\{(\w+)\}/g, (_, key) => String(values?.[key] ?? ''));
  },
};

describe('validation message helpers', () => {
  it('trims trailing punctuation and blank input safely', () => {
    expect(normalizeValidationMessageText('  Please fix this field!!! ')).toBe(
      'Please fix this field',
    );
    expect(normalizeValidationMessageText('')).toBe('');
    expect(normalizeValidationMessageText(undefined)).toBe('');
  });

  it('uses the localized reference-year copy for both fieldPath and formName lookups', () => {
    expect(
      getSdkSuggestedFixMessage(intl, {
        fieldPath: 'processDataSet.processInformation.time.common:referenceYear',
        suggestedFix: 'Enter a value of at least 1900.',
        validationCode: 'number_too_small',
        validationParams: { minimum: 1900 },
      }),
    ).toBe('Please enter a valid year (e.g., 2023)');

    expect(
      getSdkSuggestedFixMessage(intl, {
        formName: ['processDataSet', 'processInformation', 'time', 'common:referenceYear'],
        suggestedFix: 'Enter a value of at most 2100.',
        validationCode: 'number_too_large',
        validationParams: { maximum: 2100 },
      }),
    ).toBe('Please enter a valid year (e.g., 2023)');
  });

  it('falls back across localized templates, raw suggested fixes, and empty details', () => {
    expect(
      getSdkSuggestedFixMessage(intl, {
        validationCode: 'string_too_short',
        suggestedFix: 'Expand this text to at least 3 characters.',
        validationParams: { minimum: 3 },
      }),
    ).toBe('Enter at least 3 characters');

    expect(
      getSdkSuggestedFixMessage(intl, {
        validationCode: 'custom',
        suggestedFix: 'Resolve the custom issue.',
        validationParams: { count: 2 },
      }),
    ).toBe('Resolve 2 custom issues');

    expect(
      getSdkSuggestedFixMessage(intl, {
        validationCode: 'unmapped_validation_code',
        suggestedFix: 'Keep the fallback copy.',
      }),
    ).toBe('Keep the fallback copy');

    expect(
      getSdkSuggestedFixMessage(intl, {
        suggestedFix: 'Use the raw fallback only.',
      }),
    ).toBe('Use the raw fallback only');

    expect(
      getSdkSuggestedFixMessage(intl, {
        validationCode: 'number_too_small',
        suggestedFix: 'Keep the non-year fallback.',
      }),
    ).toBe('Keep the non-year fallback');

    expect(getSdkSuggestedFixMessage(intl, { suggestedFix: undefined })).toBe('');
    expect(getSdkSuggestedFixMessage(intl)).toBe('');
  });
});
