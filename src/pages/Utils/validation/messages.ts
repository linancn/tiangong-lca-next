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

const isRequiredRule = (rule: unknown): rule is SchemaRuleLike =>
  typeof rule === 'object' &&
  rule !== null &&
  'required' in rule &&
  Boolean((rule as { required?: boolean }).required);

export const getSchemaNodeAtPath = (schemaRoot: unknown, path: Array<string | number>) => {
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

const isIndexedLangTextLeafFormName = (fieldName: SdkFieldFormName) => {
  if (fieldName.length < 2) {
    return false;
  }

  const lastSegment = fieldName[fieldName.length - 1];
  const previousSegment = fieldName[fieldName.length - 2];

  return (
    (lastSegment === '#text' || lastSegment === '@xml:lang') && typeof previousSegment === 'number'
  );
};

const getRequiredRuleCandidatePaths = (
  fieldName: SdkFieldFormName,
  schemaPathPrefix: Array<string | number>,
) => {
  const paths = [[...schemaPathPrefix, ...fieldName]];

  if (isIndexedLangTextLeafFormName(fieldName)) {
    paths.unshift([...schemaPathPrefix, ...fieldName.slice(0, -2)]);
  }

  return paths;
};

export const getSchemaRequiredRule = ({
  fieldName,
  schemaPathPrefix = [],
  schemaRoot,
}: {
  fieldName?: SdkFieldFormName;
  schemaPathPrefix?: Array<string | number>;
  schemaRoot?: unknown;
}) => {
  if (!schemaRoot || !fieldName || fieldName.length === 0) {
    return undefined;
  }

  for (const schemaPath of getRequiredRuleCandidatePaths(fieldName, schemaPathPrefix)) {
    const schemaNode = getSchemaNodeAtPath(schemaRoot, schemaPath);
    const schemaRules = (schemaNode as { rules?: unknown[] } | undefined)?.rules;
    const rules = Array.isArray(schemaRules) ? schemaRules : [];
    const requiredRule = rules.find(isRequiredRule);

    if (requiredRule) {
      return requiredRule;
    }
  }

  return undefined;
};

export const formatRequiredRuleMessage = (intl: IntlShapeLike, rule?: SchemaRuleLike) => {
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

export const resolveRequiredValidationMessage = ({
  fieldName,
  frontendRulesEnabled = true,
  intl,
  retainedErrors,
  schemaPathPrefix = [],
  schemaRoot,
  usesLocalRequiredValidationUi,
  validationCode,
}: {
  fieldName?: SdkFieldFormName;
  frontendRulesEnabled?: boolean;
  intl: IntlShapeLike;
  retainedErrors: string[];
  schemaPathPrefix?: Array<string | number>;
  schemaRoot?: unknown;
  usesLocalRequiredValidationUi?: (fieldName?: SdkFieldFormName) => boolean;
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

  if (usesLocalRequiredValidationUi?.(fieldName)) {
    return {
      suppressSdkMessage: true,
    };
  }

  const requiredRule = getSchemaRequiredRule({
    fieldName,
    schemaPathPrefix,
    schemaRoot,
  });

  if (!requiredRule) {
    return {
      suppressSdkMessage: false,
    };
  }

  return {
    replacementMessage: formatRequiredRuleMessage(intl, requiredRule),
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
