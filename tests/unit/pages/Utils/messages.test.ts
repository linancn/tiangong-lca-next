import {
  formatRequiredRuleMessage,
  getSchemaRequiredRule,
  getSdkSuggestedFixMessage,
  normalizeValidationMessageText,
  resolveRequiredValidationMessage,
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

  it('resolves sdk required_missing to frontend required copy when schema rules exist', () => {
    const schema = {
      flowDataSet: {
        modellingAndValidation: {
          LCIMethod: {
            typeOfDataSet: {
              rules: [
                {
                  defaultMessage: 'Please input type of flow',
                  messageKey: 'pages.flow.validator.typeOfDataSet.required',
                  required: true,
                },
              ],
            },
          },
        },
      },
    };

    expect(
      resolveRequiredValidationMessage({
        fieldName: ['modellingAndValidation', 'LCIMethod', 'typeOfDataSet'],
        frontendRulesEnabled: true,
        intl,
        retainedErrors: [],
        schemaPathPrefix: ['flowDataSet'],
        schemaRoot: schema,
        validationCode: 'required_missing',
      }),
    ).toEqual({
      replacementMessage: 'Please input type of flow',
      suppressSdkMessage: false,
    });
  });

  it('finds lang-text required rules on the frontend group field', () => {
    const schema = {
      contactDataSet: {
        contactInformation: {
          dataSetInformation: {
            'common:shortName': {
              rules: [
                {
                  defaultMessage: 'Please input contact short name',
                  messageKey: 'pages.contact.validator.shortName.required',
                  required: true,
                },
              ],
            },
          },
        },
      },
    };

    expect(
      getSchemaRequiredRule({
        fieldName: ['contactInformation', 'dataSetInformation', 'common:shortName', 0, '#text'],
        schemaPathPrefix: ['contactDataSet'],
        schemaRoot: schema,
      }),
    ).toMatchObject({
      defaultMessage: 'Please input contact short name',
    });
  });

  it('suppresses sdk required_missing when local frontend errors already exist', () => {
    expect(
      resolveRequiredValidationMessage({
        fieldName: ['meanValue'],
        frontendRulesEnabled: true,
        intl,
        retainedErrors: ['Please input mean value'],
        validationCode: 'required_missing',
      }),
    ).toEqual({
      suppressSdkMessage: true,
    });
  });

  it('keeps sdk fallback when no frontend required rule is available', () => {
    expect(
      resolveRequiredValidationMessage({
        fieldName: ['optionalComment'],
        frontendRulesEnabled: true,
        intl,
        retainedErrors: [],
        schemaPathPrefix: ['flowDataSet'],
        schemaRoot: { flowDataSet: { optionalComment: {} } },
        validationCode: 'required_missing',
      }),
    ).toEqual({
      suppressSdkMessage: false,
    });

    expect(formatRequiredRuleMessage(intl)).toBe('Please complete this field');
  });
});
