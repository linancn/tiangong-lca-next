import schema from '@/pages/Processes/processes_schema.json';
import {
  getSdkSuggestedFixMessage,
  resolveRequiredValidationMessage,
  shouldSuppressRequiredSdkMessage,
  usesExchangeLocalRequiredValidationUi,
  usesProcessLocalRequiredValidationUi,
} from '@/pages/Processes/sdkValidationUi';

describe('process sdk validation ui helpers', () => {
  it('detects process fields that already provide local required feedback', () => {
    expect(
      usesProcessLocalRequiredValidationUi([
        'processInformation',
        'dataSetInformation',
        'name',
        'treatmentStandardsRoutes',
        0,
        '#text',
      ]),
    ).toBe(true);

    expect(
      usesProcessLocalRequiredValidationUi([
        'processInformation',
        'dataSetInformation',
        'classificationInformation',
        'common:classification',
        'common:class',
        'showValue',
      ]),
    ).toBe(true);

    expect(
      usesProcessLocalRequiredValidationUi([
        'administrativeInformation',
        'dataEntryBy',
        'common:referenceToPersonOrEntityEnteringTheData',
        '@refObjectId',
      ]),
    ).toBe(true);
  });

  it('only treats exchange reference selectors as local required ui owners', () => {
    expect(usesExchangeLocalRequiredValidationUi(['referenceToFlowDataSet', '@refObjectId'])).toBe(
      true,
    );

    expect(usesExchangeLocalRequiredValidationUi(['functionalUnitOrOther', 0, '#text'])).toBe(
      false,
    );
  });

  it('suppresses required sdk messages when the ui already has a better required hint', () => {
    expect(
      shouldSuppressRequiredSdkMessage({
        context: 'process',
        fieldName: ['processInformation', 'dataSetInformation', 'name', 'baseName', 0, '#text'],
        retainedErrors: [],
        validationCode: 'required_missing',
      }),
    ).toBe(true);

    expect(
      shouldSuppressRequiredSdkMessage({
        context: 'process',
        fieldName: ['modellingAndValidation', 'LCIMethodAndAllocation', 'typeOfDataSet'],
        retainedErrors: ['Please select a data set type.'],
        validationCode: 'required_missing',
      }),
    ).toBe(true);

    expect(
      shouldSuppressRequiredSdkMessage({
        context: 'exchange',
        fieldName: ['functionalUnitOrOther', 0, '#text'],
        retainedErrors: [],
        validationCode: 'required_missing',
      }),
    ).toBe(false);
  });

  it('formats suggested fix copy from locale codes and trims legacy punctuation', () => {
    const intl = {
      formatMessage: (
        descriptor: { defaultMessage?: string; id: string },
        values?: Record<string, string | number | undefined>,
      ) => {
        const messages: Record<string, string> = {
          'pages.validationIssues.sdkDetail.suggestedFix.invalid_union':
            'Complete this field as required',
          'pages.validationIssues.sdkDetail.suggestedFix.string_too_short':
            'Enter at least {minimum} characters',
          'pages.validationIssues.sdkDetail.suggestedFix.number_too_small':
            'Enter a value of at least {minimum}',
          'pages.validationIssues.sdkDetail.suggestedFix.exchanges_required':
            'Add at least one exchange',
          'pages.validationIssues.sdkDetail.suggestedFix.quantitative_reference_count_invalid':
            'The following data must contain exactly one reference flow',
          'pages.validationIssues.sdkDetail.suggestedFix.localized_text_zh_must_include_chinese_character':
            'Chinese text must include at least one Chinese character',
          'pages.validationIssues.sdkDetail.suggestedFix.localized_text_en_must_not_contain_chinese_character':
            'English text must not contain Chinese characters',
          'validator.Year.pattern': 'Please enter a valid year (e.g., 2023)',
        };

        const template = messages[descriptor.id] ?? descriptor.defaultMessage ?? '';
        return template.replace(/\{(\w+)\}/g, (_, key) => String(values?.[key] ?? ''));
      },
    };

    expect(
      getSdkSuggestedFixMessage(intl, {
        validationCode: 'invalid_union',
        suggestedFix: 'Adjust the value so it matches one supported structure.',
      }),
    ).toBe('Complete this field as required');

    expect(
      getSdkSuggestedFixMessage(intl, {
        validationCode: 'string_too_short',
        suggestedFix: 'Expand this text to at least 3 characters.',
        validationParams: { minimum: 3 },
      }),
    ).toBe('Enter at least 3 characters');

    expect(
      getSdkSuggestedFixMessage(intl, {
        suggestedFix: 'Fill in the required value for this field.',
      }),
    ).toBe('Fill in the required value for this field');

    expect(
      getSdkSuggestedFixMessage(intl, {
        fieldPath: 'processInformation.time.common:referenceYear',
        suggestedFix: 'Enter a value of at least 1900.',
        validationCode: 'number_too_small',
        validationParams: { minimum: 1900 },
      }),
    ).toBe('Please enter a valid year (e.g., 2023)');

    expect(
      getSdkSuggestedFixMessage(intl, {
        formName: ['processInformation', 'time', 'common:referenceYear'],
        suggestedFix: 'Enter a value of at least 1.',
        validationCode: 'number_too_small',
        validationParams: { minimum: 1 },
      }),
    ).toBe('Please enter a valid year (e.g., 2023)');

    expect(
      getSdkSuggestedFixMessage(intl, {
        fieldPath: 'processInformation.someNumericField',
        suggestedFix: 'Enter a value of at least 1.',
        validationCode: 'number_too_small',
        validationParams: { minimum: 1 },
      }),
    ).toBe('Enter a value of at least 1');

    expect(
      getSdkSuggestedFixMessage(intl, {
        fieldPath: 'processInformation.time.common:timeRepresentativenessDescription.1.#text',
        suggestedFix:
          "@xml:lang values starting with 'zh' must include at least one Chinese character.",
        validationCode: 'localized_text_zh_must_include_chinese_character',
      }),
    ).toBe('Chinese text must include at least one Chinese character');

    expect(
      getSdkSuggestedFixMessage(intl, {
        fieldPath: 'processInformation.time.common:timeRepresentativenessDescription.0.#text',
        suggestedFix: "@xml:lang values starting with 'en' must not contain Chinese characters.",
        validationCode: 'localized_text_en_must_not_contain_chinese_character',
      }),
    ).toBe('English text must not contain Chinese characters');

    expect(
      getSdkSuggestedFixMessage(intl, {
        fieldPath: 'exchanges.requiredSummary',
        suggestedFix: 'Add at least one exchange',
        validationCode: 'exchanges_required',
      }),
    ).toBe('Add at least one exchange');

    expect(
      getSdkSuggestedFixMessage(intl, {
        fieldPath: 'exchanges.quantitativeReferenceSummary',
        suggestedFix: 'Select exactly one reference flow.',
        validationCode: 'quantitative_reference_count_invalid',
      }),
    ).toBe('The following data must contain exactly one reference flow');
  });

  it('uses frontend required copy for direct fields with required schema rules', () => {
    const intl = {
      formatMessage: (
        descriptor: { defaultMessage?: string; id: string },
        values?: Record<string, string | number | undefined>,
      ) => {
        const template = descriptor.defaultMessage ?? descriptor.id;
        return template.replace(/\{(\w+)\}/g, (_, key) => String(values?.[key] ?? ''));
      },
    };

    expect(
      resolveRequiredValidationMessage({
        context: 'process',
        fieldName: ['processInformation', 'time', 'common:referenceYear'],
        frontendRulesEnabled: true,
        intl,
        retainedErrors: [],
        schemaRoot: schema,
        validationCode: 'required_missing',
      }),
    ).toEqual({
      replacementMessage: 'Please input reference year',
      suppressSdkMessage: false,
    });
  });

  it('keeps sdk fallback for fields without frontend required rules', () => {
    const intl = {
      formatMessage: ({ defaultMessage, id }: { defaultMessage?: string; id: string }) =>
        defaultMessage ?? id,
    };

    expect(
      resolveRequiredValidationMessage({
        context: 'process',
        fieldName: ['modellingAndValidation', 'validation', 'review'],
        frontendRulesEnabled: true,
        intl,
        retainedErrors: [],
        schemaRoot: schema,
        validationCode: 'required_missing',
      }),
    ).toEqual({
      suppressSdkMessage: false,
    });
  });

  it('suppresses sdk required copy for custom frontend required owners', () => {
    const intl = {
      formatMessage: ({ defaultMessage, id }: { defaultMessage?: string; id: string }) =>
        defaultMessage ?? id,
    };

    expect(
      resolveRequiredValidationMessage({
        context: 'exchange',
        fieldName: ['referenceToFlowDataSet', '@refObjectId'],
        frontendRulesEnabled: true,
        intl,
        retainedErrors: [],
        schemaRoot: schema,
        validationCode: 'required_missing',
      }),
    ).toEqual({
      suppressSdkMessage: true,
    });
  });

  it('keeps sdk fallback when frontend rules are not enabled', () => {
    const intl = {
      formatMessage: ({ defaultMessage, id }: { defaultMessage?: string; id: string }) =>
        defaultMessage ?? id,
    };

    expect(
      resolveRequiredValidationMessage({
        context: 'process',
        fieldName: ['processInformation', 'time', 'common:referenceYear'],
        frontendRulesEnabled: false,
        intl,
        retainedErrors: [],
        schemaRoot: schema,
        validationCode: 'required_missing',
      }),
    ).toEqual({
      suppressSdkMessage: false,
    });
  });
});
