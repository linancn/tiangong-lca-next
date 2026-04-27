export type SdkFieldFormName = Array<string | number>;

type IntlShapeLike = {
  formatMessage: (
    descriptor: {
      defaultMessage?: string;
      id: string;
    },
    values?: Record<string, string | number | undefined>,
  ) => string;
};

type SdkValidationDetailMessageLike = {
  fieldPath?: string;
  formName?: SdkFieldFormName;
  suggestedFix?: string;
  validationCode?: string;
  validationParams?: Record<string, string | number | boolean | null | undefined>;
};

const SDK_MESSAGE_TRAILING_PUNCTUATION_PATTERN = /[。．.!！?？,，;；:：]+$/u;
const PROCESS_REFERENCE_YEAR_FIELD_PATH = 'processInformation.time.common:referenceYear';

export const normalizeValidationMessageText = (message?: string) =>
  (message ?? '').trim().replace(SDK_MESSAGE_TRAILING_PUNCTUATION_PATTERN, '').trim();

const getSdkDetailFieldPath = (detail?: SdkValidationDetailMessageLike) => {
  if (typeof detail?.fieldPath === 'string' && detail.fieldPath.trim()) {
    return detail.fieldPath.replace(/^[a-zA-Z]+DataSet\./, '').trim();
  }

  if (Array.isArray(detail?.formName) && detail.formName.length > 0) {
    return detail.formName
      .map(String)
      .join('.')
      .replace(/^[a-zA-Z]+DataSet\./, '')
      .trim();
  }

  return '';
};

const getSdkFieldSpecificSuggestedFixMessage = (
  intl: IntlShapeLike,
  detail?: SdkValidationDetailMessageLike,
) => {
  if (!detail?.validationCode) {
    return undefined;
  }

  const fieldPath = getSdkDetailFieldPath(detail);

  if (
    fieldPath === PROCESS_REFERENCE_YEAR_FIELD_PATH &&
    (detail.validationCode === 'number_too_small' || detail.validationCode === 'number_too_large')
  ) {
    return intl.formatMessage({
      id: 'validator.Year.pattern',
      defaultMessage: 'Please enter a valid year (e.g., 2023)',
    });
  }

  return undefined;
};

export const getSdkSuggestedFixMessage = (
  intl: IntlShapeLike,
  detail?: SdkValidationDetailMessageLike,
) => {
  if (!detail) {
    return '';
  }

  const fieldSpecificMessage = getSdkFieldSpecificSuggestedFixMessage(intl, detail);
  if (fieldSpecificMessage) {
    return normalizeValidationMessageText(fieldSpecificMessage);
  }

  const localizedMessage = detail.validationCode
    ? intl.formatMessage(
        {
          id: `pages.validationIssues.sdkDetail.suggestedFix.${detail.validationCode}`,
          defaultMessage: detail.suggestedFix ?? '',
        },
        detail.validationParams as Record<string, string | number | undefined> | undefined,
      )
    : detail.suggestedFix;

  return normalizeValidationMessageText(localizedMessage ?? detail.suggestedFix ?? '');
};
