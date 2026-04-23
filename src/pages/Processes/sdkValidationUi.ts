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

type SchemaRuleLike = {
  defaultMessage?: string;
  message?: unknown;
  messageKey?: string;
  required?: boolean;
};

type RequiredValidationMessageResolution = {
  replacementMessage?: string;
  suppressSdkMessage: boolean;
};

const SDK_MESSAGE_TRAILING_PUNCTUATION_PATTERN = /[。．.!！?？,，;；:：]+$/u;
const PROCESS_REFERENCE_YEAR_FIELD_PATH = 'processInformation.time.common:referenceYear';
const DEFAULT_REQUIRED_MESSAGE = {
  defaultMessage: 'Please complete this field',
  id: 'validator.lang.required',
};

const PROCESS_LOCAL_REQUIRED_LANG_TEXT_FIELDS = new Set<string>([
  'processInformation.dataSetInformation.name.baseName',
  'processInformation.dataSetInformation.name.treatmentStandardsRoutes',
  'processInformation.dataSetInformation.name.mixAndLocationTypes',
  'processInformation.dataSetInformation.common:generalComment',
  'processInformation.technology.technologyDescriptionAndIncludedProcesses',
  'modellingAndValidation.dataSourcesTreatmentAndRepresentativeness.dataCutOffAndCompletenessPrinciples',
  'administrativeInformation.common:commissionerAndGoal.common:intendedApplications',
]);

const isLangTextLeafField = (fieldName?: SdkFieldFormName) => {
  if (!fieldName || fieldName.length < 2) {
    return false;
  }

  const lastSegment = fieldName[fieldName.length - 1];
  const previousSegment = fieldName[fieldName.length - 2];

  return (
    (lastSegment === '#text' || lastSegment === '@xml:lang') && typeof previousSegment === 'number'
  );
};

const getLangTextGroupPath = (fieldName: SdkFieldFormName) => {
  return fieldName.slice(0, -2).map(String).join('.');
};

export const usesProcessLocalRequiredValidationUi = (fieldName?: SdkFieldFormName) => {
  if (!fieldName || fieldName.length === 0) {
    return false;
  }

  const lastSegment = String(fieldName[fieldName.length - 1]);

  if (lastSegment === '@refObjectId' || lastSegment === 'showValue') {
    return true;
  }

  return (
    isLangTextLeafField(fieldName) &&
    PROCESS_LOCAL_REQUIRED_LANG_TEXT_FIELDS.has(getLangTextGroupPath(fieldName))
  );
};

export const usesExchangeLocalRequiredValidationUi = (fieldName?: SdkFieldFormName) => {
  if (!fieldName || fieldName.length === 0) {
    return false;
  }

  return String(fieldName[fieldName.length - 1]) === '@refObjectId';
};

export const shouldSuppressRequiredSdkMessage = ({
  context,
  fieldName,
  retainedErrors,
  validationCode,
}: {
  context: 'exchange' | 'process';
  fieldName?: SdkFieldFormName;
  retainedErrors: string[];
  validationCode?: string;
}) => {
  if (validationCode !== 'required_missing') {
    return false;
  }

  if (retainedErrors.length > 0) {
    return true;
  }

  return context === 'process'
    ? usesProcessLocalRequiredValidationUi(fieldName)
    : usesExchangeLocalRequiredValidationUi(fieldName);
};

const normalizeValidationMessageText = (message?: string) =>
  (message ?? '').trim().replace(SDK_MESSAGE_TRAILING_PUNCTUATION_PATTERN, '').trim();

const getSdkDetailFieldPath = (detail?: SdkValidationDetailMessageLike) => {
  if (!detail) {
    return '';
  }

  if (typeof detail.fieldPath === 'string' && detail.fieldPath.trim()) {
    return detail.fieldPath.replace(/^processDataSet\./, '').trim();
  }

  if (Array.isArray(detail.formName) && detail.formName.length > 0) {
    return detail.formName
      .map(String)
      .join('.')
      .replace(/^processDataSet\./, '')
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

const isRequiredRule = (rule: unknown): rule is SchemaRuleLike =>
  typeof rule === 'object' &&
  rule !== null &&
  'required' in rule &&
  Boolean((rule as { required?: boolean }).required);

const getSchemaNodeAtPath = (schemaRoot: unknown, path: Array<string | number>) => {
  let current: any = schemaRoot;

  for (const segment of path) {
    if (Array.isArray(current)) {
      current = current[typeof segment === 'number' ? segment : 0];

      if (typeof segment === 'number') {
        continue;
      }
    }

    if (!current || typeof current !== 'object') {
      return undefined;
    }

    current = current[segment as keyof typeof current];
  }

  return current;
};

const formatRequiredRuleMessage = (intl: IntlShapeLike, rule?: SchemaRuleLike) => {
  if (!rule) {
    return normalizeValidationMessageText(intl.formatMessage(DEFAULT_REQUIRED_MESSAGE));
  }

  if (typeof rule.message === 'string') {
    return normalizeValidationMessageText(rule.message);
  }

  if (rule.message && typeof rule.message === 'object' && 'props' in (rule.message as object)) {
    const props = (rule.message as { props?: Record<string, unknown> }).props ?? {};
    const id = typeof props.id === 'string' ? props.id : DEFAULT_REQUIRED_MESSAGE.id;
    const defaultMessage =
      typeof props.defaultMessage === 'string'
        ? props.defaultMessage
        : DEFAULT_REQUIRED_MESSAGE.defaultMessage;

    return normalizeValidationMessageText(
      intl.formatMessage(
        {
          id,
          defaultMessage,
        },
        props.values as Record<string, string | number | undefined> | undefined,
      ),
    );
  }

  return normalizeValidationMessageText(
    intl.formatMessage({
      id: rule.messageKey ?? DEFAULT_REQUIRED_MESSAGE.id,
      defaultMessage: rule.defaultMessage ?? DEFAULT_REQUIRED_MESSAGE.defaultMessage,
    }),
  );
};

const getSchemaRequiredRule = ({
  context,
  fieldName,
  schemaRoot,
}: {
  context: 'exchange' | 'process';
  fieldName?: SdkFieldFormName;
  schemaRoot?: unknown;
}) => {
  if (!schemaRoot || !fieldName || fieldName.length === 0) {
    return undefined;
  }

  const schemaPath =
    context === 'process'
      ? ['processDataSet', ...fieldName]
      : ['processDataSet', 'exchanges', 'exchange', 0, ...fieldName];
  const schemaNode = getSchemaNodeAtPath(schemaRoot, schemaPath);
  const rules = Array.isArray((schemaNode as { rules?: unknown[] } | undefined)?.rules)
    ? ((schemaNode as { rules?: unknown[] }).rules ?? [])
    : [];

  return rules.find(isRequiredRule);
};

const getFrontendRequiredMessage = ({
  context,
  fieldName,
  intl,
  schemaRoot,
}: {
  context: 'exchange' | 'process';
  fieldName?: SdkFieldFormName;
  intl: IntlShapeLike;
  schemaRoot?: unknown;
}) => {
  const usesLocalUi =
    context === 'process'
      ? usesProcessLocalRequiredValidationUi(fieldName)
      : usesExchangeLocalRequiredValidationUi(fieldName);

  if (usesLocalUi) {
    return {
      mode: 'custom-ui' as const,
    };
  }

  const requiredRule = getSchemaRequiredRule({
    context,
    fieldName,
    schemaRoot,
  });

  if (!requiredRule) {
    return {
      mode: 'sdk-fallback' as const,
    };
  }

  return {
    message: formatRequiredRuleMessage(intl, requiredRule),
    mode: 'field-message' as const,
  };
};

export const resolveRequiredValidationMessage = ({
  context,
  fieldName,
  frontendRulesEnabled = true,
  intl,
  retainedErrors,
  schemaRoot,
  validationCode,
}: {
  context: 'exchange' | 'process';
  fieldName?: SdkFieldFormName;
  frontendRulesEnabled?: boolean;
  intl: IntlShapeLike;
  retainedErrors: string[];
  schemaRoot?: unknown;
  validationCode?: string;
}): RequiredValidationMessageResolution => {
  if (validationCode !== 'required_missing') {
    return {
      suppressSdkMessage: false,
    };
  }

  if (retainedErrors.length > 0) {
    return {
      suppressSdkMessage: true,
    };
  }

  if (!frontendRulesEnabled) {
    return {
      suppressSdkMessage: false,
    };
  }

  const frontendRequiredMessage = getFrontendRequiredMessage({
    context,
    fieldName,
    intl,
    schemaRoot,
  });

  if (frontendRequiredMessage.mode === 'custom-ui') {
    return {
      suppressSdkMessage: true,
    };
  }

  if (frontendRequiredMessage.mode === 'field-message') {
    return {
      replacementMessage: frontendRequiredMessage.message,
      suppressSdkMessage: false,
    };
  }

  return {
    suppressSdkMessage: false,
  };
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
