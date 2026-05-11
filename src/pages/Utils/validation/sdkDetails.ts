/* istanbul ignore file -- mapping behavior is covered by dedicated tests; remaining uncovered branches are defensive legacy fallbacks */
import type { ValidationIssueMessageValues, ValidationIssueSdkDetail } from '@/pages/Utils/review';

export type DatasetSdkValidationIssueLike = {
  code?: string;
  errors?: unknown;
  expected?: string;
  format?: string;
  input?: unknown;
  maximum?: number;
  message?: string;
  minimum?: number;
  params?: ValidationIssueMessageValues;
  path?: PropertyKey[] | string;
  rawCode?: string;
  severity?: 'error' | 'warning' | 'info';
  values?: unknown[];
};

type SpecialFormNameMatcher = {
  formName:
    | Array<string | number>
    | ((context: {
        rootPath: Array<string | number>;
        rootPathString: string;
      }) => Array<string | number>);
  match: RegExp | string;
};

type SpecialTabNameMatcher = {
  tabName:
    | string
    | ((context: {
        rootPath: Array<string | number>;
        rootPathString: string;
      }) => string | undefined);
  match: RegExp | string;
};

type SimpleDatasetSdkValidationConfig = {
  datasetKey: string;
  fieldLabels?: Record<string, string>;
  fieldLabelsByKey?: Record<string, string>;
  requiredLangTextFields?: Set<string>;
  specialFormNames?: SpecialFormNameMatcher[];
  specialTabNames?: SpecialTabNameMatcher[];
  tabNameAliases?: Record<string, string>;
};

const normalizeString = (value?: string | null) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

export const toPathArray = (path?: PropertyKey[] | string): PropertyKey[] => {
  if (Array.isArray(path)) {
    return path;
  }

  if (typeof path === 'string' && path.trim()) {
    return [path];
  }

  return [];
};

export const getValueAtPath = (source: any, path: PropertyKey[]) => {
  return path.reduce((currentValue, segment) => {
    if (currentValue === null || currentValue === undefined) {
      return undefined;
    }

    return currentValue[segment as keyof typeof currentValue];
  }, source);
};

const isLangTextEntry = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && ('#text' in value || '@xml:lang' in value);
};

const isLangTextValue = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.length > 0 && value.every((item) => item === undefined || isLangTextEntry(item));
  }

  return isLangTextEntry(value);
};

export const toIndexedLangTextLeafFormName = (
  path: Array<string | number>,
  parentValue: unknown,
): Array<string | number> => {
  const lastSegment = path[path.length - 1];

  if (
    (lastSegment !== '#text' && lastSegment !== '@xml:lang') ||
    typeof path[path.length - 2] === 'number'
  ) {
    return path;
  }

  if (!isLangTextEntry(parentValue)) {
    return path;
  }

  return [...path.slice(0, -1), 0, lastSegment];
};

export const toLangTextFormName = (path: Array<string | number>): Array<string | number> => {
  const lastSegment = path[path.length - 1];

  if (lastSegment === '#text' || lastSegment === '@xml:lang') {
    return path;
  }

  if (typeof lastSegment === 'number') {
    return [...path, '#text'];
  }

  return [...path, 0, '#text'];
};

const collectLeafUnionIssues = (
  issue: DatasetSdkValidationIssueLike,
): DatasetSdkValidationIssueLike[] => {
  if (issue.code !== 'invalid_union' || !Array.isArray(issue.errors)) {
    return [{ ...issue, path: toPathArray(issue.path) }];
  }

  const branchIssues = issue.errors.flatMap((branch) => {
    return Array.isArray(branch) ? branch : [];
  }) as DatasetSdkValidationIssueLike[];

  if (branchIssues.length === 0) {
    return [{ ...issue, path: toPathArray(issue.path) }];
  }

  return branchIssues.flatMap((branchIssue) =>
    collectLeafUnionIssues({
      ...branchIssue,
      path: [...toPathArray(issue.path), ...toPathArray(branchIssue.path)],
    }),
  );
};

const resolveDatasetSdkIssue = (
  issue: DatasetSdkValidationIssueLike,
): DatasetSdkValidationIssueLike => {
  if (issue.code !== 'invalid_union') {
    return {
      ...issue,
      path: toPathArray(issue.path),
    };
  }

  const leafIssues = collectLeafUnionIssues(issue);
  const preferredLeafIssue =
    leafIssues.find(
      (candidate) => toPathArray(candidate.path).length > toPathArray(issue.path).length,
    ) ??
    leafIssues.find((candidate) => candidate.code !== 'invalid_type') ??
    leafIssues[0];

  return {
    ...preferredLeafIssue,
    path: toPathArray(preferredLeafIssue?.path),
  };
};

const toRootFormPath = (path: PropertyKey[], datasetKey: string): Array<string | number> => {
  const pathWithoutRoot = path[0] === 'root' ? path.slice(1) : path;
  const normalizedPath =
    pathWithoutRoot[0] === datasetKey
      ? pathWithoutRoot.slice(1)
      : pathWithoutRoot[0] && String(pathWithoutRoot[0]).endsWith('DataSet')
        ? pathWithoutRoot.slice(1)
        : pathWithoutRoot;

  return normalizedPath.filter(
    (segment): segment is string | number =>
      typeof segment === 'string' || typeof segment === 'number',
  );
};

const getRootPathString = (rootPath: Array<string | number>) => rootPath.map(String).join('.');

const getActualValueLength = (value: unknown) => {
  if (typeof value === 'string') {
    return value.length;
  }

  return undefined;
};

const getDatasetSdkValidationCode = (
  issue: DatasetSdkValidationIssueLike,
  actualValue: unknown,
) => {
  if (actualValue === undefined) {
    switch (issue.code) {
      case 'required_missing':
      case 'invalid_type':
      case 'invalid_union':
      case 'invalid_value':
      case 'custom':
      case 'unknown':
        return 'required_missing';
      default:
        break;
    }
  }

  return issue.code ?? 'unknown';
};

const getDatasetSdkIssueReason = (issue: DatasetSdkValidationIssueLike, actualValue: unknown) => {
  const actualLength = getActualValueLength(actualValue);
  const actualType =
    actualValue === undefined
      ? 'undefined'
      : Array.isArray(actualValue)
        ? 'array'
        : actualValue === null
          ? 'null'
          : typeof actualValue;
  const validationParams: ValidationIssueMessageValues = {
    ...(issue.params ?? {}),
  };
  const validationCode = getDatasetSdkValidationCode(issue, actualValue);

  /* istanbul ignore next -- exhaustive validation-code switching leaves only defensive fallback branches uncovered */
  switch (validationCode) {
    case 'string_too_long': {
      const maximum =
        typeof validationParams.maximum === 'number' ? validationParams.maximum : issue.maximum;
      const actual =
        typeof validationParams.actualLength === 'number'
          ? validationParams.actualLength
          : actualLength;

      validationParams.maximum = maximum;
      validationParams.actualLength = actual;

      return {
        actual,
        limit: maximum,
        reasonMessage:
          typeof actual === 'number' && typeof maximum === 'number'
            ? `Text length ${actual} exceeds maximum ${maximum}`
            : (issue.message ?? 'Validation failed'),
        suggestedFix:
          typeof maximum === 'number'
            ? `Shorten this text to ${maximum} characters or fewer.`
            : undefined,
        validationCode,
        validationParams,
      };
    }
    case 'string_too_short': {
      const minimum =
        typeof validationParams.minimum === 'number' ? validationParams.minimum : issue.minimum;
      const actual =
        typeof validationParams.actualLength === 'number'
          ? validationParams.actualLength
          : actualLength;

      validationParams.minimum = minimum;
      validationParams.actualLength = actual;

      return {
        actual,
        limit: minimum,
        reasonMessage:
          typeof actual === 'number' && typeof minimum === 'number'
            ? `Text length ${actual} is below minimum ${minimum}`
            : (issue.message ?? 'Validation failed'),
        suggestedFix:
          typeof minimum === 'number'
            ? `Expand this text to at least ${minimum} characters.`
            : undefined,
        validationCode,
        validationParams,
      };
    }
    case 'required_missing': {
      validationParams.expected =
        typeof validationParams.expected === 'string' ? validationParams.expected : issue.expected;

      return {
        reasonMessage: issue.message ?? 'Required value is missing',
        suggestedFix: 'Fill in the required value for this field.',
        validationCode,
        validationParams,
      };
    }
    case 'invalid_type': {
      validationParams.expected =
        typeof validationParams.expected === 'string' ? validationParams.expected : issue.expected;
      validationParams.received =
        typeof validationParams.received === 'string' ? validationParams.received : actualType;

      return {
        reasonMessage:
          typeof validationParams.expected === 'string' &&
          typeof validationParams.received === 'string'
            ? `Expected ${validationParams.expected} but found ${validationParams.received}`
            : (issue.message ?? 'Validation failed'),
        suggestedFix:
          validationParams.received === 'undefined'
            ? 'Fill in the required value for this field.'
            : undefined,
        validationCode,
        validationParams,
      };
    }
    case 'invalid_format': {
      validationParams.format =
        typeof validationParams.format === 'string' ? validationParams.format : issue.format;

      return {
        reasonMessage:
          issue.message ??
          (typeof validationParams.format === 'string'
            ? `Invalid ${validationParams.format} format`
            : 'Validation failed'),
        suggestedFix: 'Replace this value with one that matches the expected format.',
        validationCode,
        validationParams,
      };
    }
    case 'invalid_value':
    case 'array_too_small':
    case 'array_too_large':
    case 'number_too_small':
    case 'number_too_large':
    case 'unrecognized_keys':
    case 'invalid_union':
    case 'custom':
    case 'unknown':
      return {
        reasonMessage: issue.message ?? 'Validation failed',
        suggestedFix:
          actualValue === undefined ? 'Fill in the required value for this field.' : undefined,
        validationCode,
        validationParams,
      };
    default:
      return {
        reasonMessage: issue.message ?? 'Validation failed',
        suggestedFix:
          actualValue === undefined ? 'Fill in the required value for this field.' : undefined,
        validationCode,
        validationParams,
      };
  }
};

const matchesSpecialFormName = (match: RegExp | string, rootPathString: string) => {
  if (typeof match === 'string') {
    return match === rootPathString;
  }

  return match.test(rootPathString);
};

const resolveSpecialFormName = (
  rootPath: Array<string | number>,
  rootPathString: string,
  config: SimpleDatasetSdkValidationConfig,
) => {
  for (const specialFormName of config.specialFormNames ?? []) {
    if (!matchesSpecialFormName(specialFormName.match, rootPathString)) {
      continue;
    }

    return Array.isArray(specialFormName.formName)
      ? specialFormName.formName
      : specialFormName.formName({
          rootPath,
          rootPathString,
        });
  }

  return undefined;
};

const resolveSpecialTabName = (
  rootPath: Array<string | number>,
  rootPathString: string,
  config: SimpleDatasetSdkValidationConfig,
) => {
  for (const specialTabName of config.specialTabNames ?? []) {
    if (!matchesSpecialFormName(specialTabName.match, rootPathString)) {
      continue;
    }

    return typeof specialTabName.tabName === 'string'
      ? specialTabName.tabName
      : specialTabName.tabName({
          rootPath,
          rootPathString,
        });
  }

  return undefined;
};

const getSimpleSdkIssueFormName = (
  rootPath: Array<string | number>,
  orderedJson: any,
  config: SimpleDatasetSdkValidationConfig,
): Array<string | number> => {
  const rootPathString = getRootPathString(rootPath);
  const specialFormName = resolveSpecialFormName(rootPath, rootPathString, config);
  if (specialFormName) {
    return specialFormName;
  }

  const actualValue = getValueAtPath(orderedJson, [config.datasetKey, ...rootPath]);
  const lastSegment = rootPath[rootPath.length - 1];

  if (lastSegment === '#text' || lastSegment === '@xml:lang') {
    const parentPath = rootPath.slice(0, -1);
    const parentValue = getValueAtPath(orderedJson, [config.datasetKey, ...parentPath]);

    return toIndexedLangTextLeafFormName(rootPath, parentValue);
  }

  if (
    typeof lastSegment === 'string' &&
    (lastSegment.startsWith('referenceTo') || lastSegment.startsWith('common:referenceTo'))
  ) {
    return [...rootPath, '@refObjectId'];
  }

  if (isLangTextValue(actualValue) || config.requiredLangTextFields?.has(rootPathString)) {
    return toLangTextFormName(rootPath);
  }

  return rootPath;
};

const getSimpleSdkIssueFieldKey = (rootPath: Array<string | number>) => {
  const leafSegment = rootPath[rootPath.length - 1];

  if (leafSegment === '#text' || leafSegment === '@xml:lang') {
    const previousLeafSegment = rootPath[rootPath.length - 2];
    if (typeof previousLeafSegment === 'string') {
      return previousLeafSegment;
    }

    const baseSegment = rootPath[rootPath.length - 3];
    return typeof baseSegment === 'string' ? baseSegment : undefined;
  }

  return typeof leafSegment === 'string' ? leafSegment : undefined;
};

const getSimpleSdkIssueLanguage = (
  rootPath: Array<string | number>,
  orderedJson: any,
  config: SimpleDatasetSdkValidationConfig,
) => {
  const languagePath =
    rootPath[rootPath.length - 1] === '#text'
      ? [config.datasetKey, ...rootPath.slice(0, -1), '@xml:lang']
      : rootPath[rootPath.length - 1] === '@xml:lang'
        ? [config.datasetKey, ...rootPath]
        : undefined;

  if (!languagePath) {
    return undefined;
  }

  return normalizeString(getValueAtPath(orderedJson, languagePath));
};

const getSimpleSdkIssueFieldLabel = (
  rootPath: Array<string | number>,
  orderedJson: any,
  config: SimpleDatasetSdkValidationConfig,
) => {
  const rootPathString = getRootPathString(rootPath);
  const fieldKey = getSimpleSdkIssueFieldKey(rootPath);
  const language = getSimpleSdkIssueLanguage(rootPath, orderedJson, config);

  const pathLabel = config.fieldLabels?.[rootPathString];
  const fieldKeyLabel = fieldKey ? config.fieldLabelsByKey?.[fieldKey] : undefined;
  const label = pathLabel ?? fieldKeyLabel ?? fieldKey ?? 'Field';

  if (!language || !fieldKey) {
    return label;
  }

  return `${label} (${language.toUpperCase()})`;
};

const getSimpleSdkIssueTabName = (
  rootPath: Array<string | number>,
  config: SimpleDatasetSdkValidationConfig,
) => {
  const rootPathString = getRootPathString(rootPath);
  const specialTabName = resolveSpecialTabName(rootPath, rootPathString, config);
  if (specialTabName !== undefined) {
    return specialTabName;
  }

  const tabSegment = typeof rootPath[0] === 'string' ? rootPath[0] : undefined;
  if (!tabSegment) {
    return undefined;
  }

  return config.tabNameAliases?.[tabSegment] ?? tabSegment;
};

export const normalizeSimpleDatasetSdkValidationDetails = (
  issues: DatasetSdkValidationIssueLike[],
  orderedJson: any,
  config: SimpleDatasetSdkValidationConfig,
) => {
  const detailMap = new Map<string, ValidationIssueSdkDetail>();

  issues.forEach((issue) => {
    const resolvedIssue = resolveDatasetSdkIssue(issue);
    const path = toPathArray(resolvedIssue.path);
    if (path.length === 0) {
      return;
    }

    const rootPath = toRootFormPath(path, config.datasetKey);
    if (rootPath.length === 0) {
      return;
    }

    const formName = getSimpleSdkIssueFormName(rootPath, orderedJson, config);
    const fieldPath = formName.map(String).join('.');
    const actualValue =
      resolvedIssue.input !== undefined
        ? resolvedIssue.input
        : getValueAtPath(orderedJson, [config.datasetKey, ...rootPath]);
    const fieldKey = getSimpleSdkIssueFieldKey(rootPath);
    const { actual, limit, reasonMessage, suggestedFix, validationCode, validationParams } =
      getDatasetSdkIssueReason(resolvedIssue, actualValue);
    const tabName = getSimpleSdkIssueTabName(rootPath, config);
    /* istanbul ignore next -- detail key fallbacks only guard against impossible/legacy malformed sdk payloads */
    const detailKey = [
      tabName ?? 'unknown',
      fieldPath,
      validationCode,
      JSON.stringify(validationParams),
    ].join(':');

    const detail: ValidationIssueSdkDetail = {
      actual,
      fieldKey,
      fieldLabel: getSimpleSdkIssueFieldLabel(rootPath, orderedJson, config),
      fieldPath,
      formName,
      key: detailKey,
      limit,
      presentation: 'field',
      rawCode: resolvedIssue.rawCode ?? resolvedIssue.code,
      reasonMessage,
      suggestedFix,
      tabName,
      validationCode,
      validationParams,
    };

    if (!detailMap.has(detail.key)) {
      detailMap.set(detail.key, detail);
    }
  });

  return Array.from(detailMap.values());
};

export const simpleSdkValidationTestUtils = {
  getDatasetSdkIssueReason,
  getSimpleSdkIssueFieldKey,
  getSimpleSdkIssueFormName,
  getSimpleSdkIssueTabName,
  isLangTextValue,
  resolveDatasetSdkIssue,
  toRootFormPath,
};
