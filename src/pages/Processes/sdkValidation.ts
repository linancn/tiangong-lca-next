import type { ValidationIssueSdkDetail } from '@/pages/Utils/review';

type ProcessSdkValidationIssueLike = {
  code?: string;
  errors?: unknown;
  exact?: boolean;
  expected?: string;
  format?: string;
  input?: unknown;
  maximum?: number;
  message?: string;
  minimum?: number;
  origin?: string;
  path?: PropertyKey[] | string;
};

const PROCESS_EXCHANGE_FIELD_LABELS: Record<string, string> = {
  dataDerivationTypeStatus: 'Data derivation type / status',
  dataSourceType: 'Data source type',
  exchangeDirection: 'Exchange direction',
  functionalUnitOrOther: 'Functional unit or other',
  functionType: 'Function type',
  generalComment: 'Comment',
  location: 'Location',
  maximumAmount: 'Maximum amount',
  meanAmount: 'Mean amount',
  minimumAmount: 'Minimum amount',
  quantitativeReference: 'Quantitative reference',
  referenceToFlowDataSet: 'Flow',
  referenceToVariable: 'Reference to variable',
  referencesToDataSource: 'Data source',
  relativeStandardDeviation95In: 'Relative standard deviation (95%)',
  resultingAmount: 'Resulting amount',
  uncertaintyDistributionType: 'Uncertainty distribution type',
};

const PROCESS_TOP_LEVEL_FIELD_LABELS: Record<string, string> = {
  'common:generalComment': 'General comment on data set',
  'quantitativeReference.functionalUnitOrOther': 'Functional unit or other',
  'quantitativeReference.referenceToReferenceFlow': 'Reference flow(s)',
  'quantitativeReference.@type': 'Quantitative reference',
};

const normalizeString = (value?: string | null) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const toPathArray = (path?: PropertyKey[] | string): PropertyKey[] => {
  if (Array.isArray(path)) {
    return path;
  }

  if (typeof path === 'string' && path.trim()) {
    return [path];
  }

  return [];
};

const getValueAtPath = (source: any, path: PropertyKey[]) => {
  return path.reduce((currentValue, segment) => {
    if (currentValue === null || currentValue === undefined) {
      return undefined;
    }

    return currentValue[segment as keyof typeof currentValue];
  }, source);
};

const getArrayValues = (value: unknown): any[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || value === undefined) {
    return [];
  }

  return [value];
};

const getProcessSdkIssueLanguage = (
  orderedJson: any,
  path: PropertyKey[],
  exchangeIndex?: number,
) => {
  if (typeof exchangeIndex !== 'number') {
    return undefined;
  }

  const generalCommentIndex = path.findIndex((segment) => segment === 'generalComment');
  if (generalCommentIndex < 0) {
    return undefined;
  }

  const localizedValueIndex = path[generalCommentIndex + 1];
  if (typeof localizedValueIndex !== 'number') {
    return undefined;
  }

  return normalizeString(
    getValueAtPath(orderedJson, [
      'processDataSet',
      'exchanges',
      'exchange',
      exchangeIndex,
      'generalComment',
      localizedValueIndex,
      '@xml:lang',
    ]),
  );
};

const collectLeafUnionIssues = (
  issue: ProcessSdkValidationIssueLike,
): ProcessSdkValidationIssueLike[] => {
  if (issue.code !== 'invalid_union' || !Array.isArray(issue.errors)) {
    return [{ ...issue, path: toPathArray(issue.path) }];
  }

  const branchIssues = issue.errors.flatMap((branch) => {
    return Array.isArray(branch) ? branch : [];
  }) as ProcessSdkValidationIssueLike[];

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

const resolveProcessSdkIssue = (
  issue: ProcessSdkValidationIssueLike,
): ProcessSdkValidationIssueLike => {
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

export const getProcessSdkIssueTabName = (issue: ProcessSdkValidationIssueLike) => {
  const issuePath = toPathArray(issue.path);
  const section = typeof issuePath[1] === 'string' ? issuePath[1] : undefined;

  if (section === 'processInformation' && issuePath[2] === 'quantitativeReference') {
    return 'exchanges';
  }

  return section;
};

const getProcessSdkIssueFieldPath = (path: PropertyKey[], exchangeInternalId?: string) => {
  const exchangeIndex = path.findIndex((segment) => segment === 'exchange');
  if (exchangeIndex >= 0 && typeof path[exchangeIndex + 1] === 'number') {
    const exchangeFieldPath = path
      .slice(exchangeIndex + 2)
      .map(String)
      .filter(Boolean);
    const exchangePrefix = exchangeInternalId
      ? `exchange[#${exchangeInternalId}]`
      : `exchange[${Number(path[exchangeIndex + 1]) + 1}]`;

    return exchangeFieldPath.length > 0
      ? `${exchangePrefix}.${exchangeFieldPath.join('.')}`
      : exchangePrefix;
  }

  return path.slice(1).map(String).filter(Boolean).join('.');
};

const getProcessSdkIssueFieldKey = (path: PropertyKey[]) => {
  const exchangeIndex = path.findIndex((segment) => segment === 'exchange');

  if (exchangeIndex >= 0 && typeof path[exchangeIndex + 1] === 'number') {
    const fieldSegment = path[exchangeIndex + 2];
    return typeof fieldSegment === 'string' ? fieldSegment : undefined;
  }

  if (path[1] === 'processInformation' && path[2] === 'quantitativeReference') {
    return 'quantitativeReference';
  }

  const fieldSegment = path[path.length - 1];
  if (fieldSegment === '#text' || fieldSegment === '@xml:lang') {
    const previousSegment = path[path.length - 2];
    return typeof previousSegment === 'string' ? previousSegment : undefined;
  }

  return typeof fieldSegment === 'string' ? fieldSegment : undefined;
};

const getProcessSdkIssueFieldLabel = (
  path: PropertyKey[],
  orderedJson: any,
  exchangeIndex?: number,
) => {
  const fieldKey = getProcessSdkIssueFieldKey(path);
  const language = getProcessSdkIssueLanguage(orderedJson, path, exchangeIndex);

  if (fieldKey && fieldKey in PROCESS_EXCHANGE_FIELD_LABELS) {
    if (fieldKey === 'generalComment' && language) {
      return `${PROCESS_EXCHANGE_FIELD_LABELS[fieldKey]} (${language.toUpperCase()})`;
    }

    return PROCESS_EXCHANGE_FIELD_LABELS[fieldKey];
  }

  if (path[1] === 'processInformation' && typeof path[2] === 'string') {
    const topLevelPath = path.slice(2).map(String).join('.');
    if (topLevelPath in PROCESS_TOP_LEVEL_FIELD_LABELS) {
      return PROCESS_TOP_LEVEL_FIELD_LABELS[topLevelPath];
    }
  }

  if (fieldKey === '#text' && typeof path[path.length - 2] === 'string') {
    return String(path[path.length - 2]);
  }

  return fieldKey ? fieldKey : 'Field';
};

const getActualValueLength = (value: unknown) => {
  if (typeof value === 'string') {
    return value.length;
  }

  return undefined;
};

const getProcessSdkIssueReason = (
  issue: ProcessSdkValidationIssueLike,
  actualValue: unknown,
  fieldKey?: string,
) => {
  const actualLength = getActualValueLength(actualValue);

  if (
    issue.code === 'too_big' &&
    typeof issue.maximum === 'number' &&
    typeof actualLength === 'number'
  ) {
    const suggestionTarget = fieldKey === 'generalComment' ? 'comment' : 'text';
    return {
      actual: actualLength,
      limit: issue.maximum,
      reasonMessage: `Text length ${actualLength} exceeds maximum ${issue.maximum}`,
      suggestedFix: `Shorten this ${suggestionTarget} to ${issue.maximum} characters or fewer.`,
    };
  }

  if (
    issue.code === 'too_small' &&
    typeof issue.minimum === 'number' &&
    typeof actualLength === 'number'
  ) {
    return {
      actual: actualLength,
      limit: issue.minimum,
      reasonMessage: `Text length ${actualLength} is below minimum ${issue.minimum}`,
      suggestedFix: `Expand this text to at least ${issue.minimum} characters.`,
    };
  }

  if (issue.code === 'invalid_type' && issue.expected) {
    const actualType =
      actualValue === undefined
        ? 'undefined'
        : Array.isArray(actualValue)
          ? 'array'
          : typeof actualValue;

    return {
      reasonMessage: `Expected ${issue.expected} but found ${actualType}`,
      suggestedFix:
        actualValue === undefined ? 'Fill in the required value for this field.' : undefined,
    };
  }

  if (issue.code === 'invalid_format' && issue.format) {
    return {
      reasonMessage: issue.message ?? `Invalid ${issue.format} format`,
      suggestedFix: 'Replace this value with one that matches the expected format.',
    };
  }

  return {
    reasonMessage: issue.message ?? 'Validation failed',
    suggestedFix:
      actualValue === undefined ? 'Fill in the required value for this field.' : undefined,
  };
};

const getExchangeContext = (orderedJson: any, exchangeIndex?: number) => {
  if (typeof exchangeIndex !== 'number') {
    return undefined;
  }

  const exchange = getValueAtPath(orderedJson, [
    'processDataSet',
    'exchanges',
    'exchange',
    exchangeIndex,
  ]);
  if (!exchange || typeof exchange !== 'object') {
    return undefined;
  }

  const flowReference = exchange.referenceToFlowDataSet;
  const flowLabel =
    normalizeString(
      getArrayValues(flowReference?.['common:shortDescription'])
        .map((item) => normalizeString(item?.['#text']))
        .find(Boolean),
    ) ?? normalizeString(flowReference?.['@refObjectId']);

  return {
    exchangeDirection: normalizeString(exchange.exchangeDirection)?.toLowerCase(),
    exchangeFlowId: normalizeString(flowReference?.['@refObjectId']),
    exchangeFlowLabel: flowLabel,
    exchangeInternalId: normalizeString(exchange['@dataSetInternalID']),
  };
};

const toProcessSdkValidationDetail = (
  issue: ProcessSdkValidationIssueLike,
  orderedJson: any,
): ValidationIssueSdkDetail | null => {
  const resolvedIssue = resolveProcessSdkIssue(issue);
  const path = toPathArray(resolvedIssue.path);
  if (path.length === 0) {
    return null;
  }

  const exchangeIndexPosition = path.findIndex((segment) => segment === 'exchange');
  const exchangeIndex =
    exchangeIndexPosition >= 0 && typeof path[exchangeIndexPosition + 1] === 'number'
      ? Number(path[exchangeIndexPosition + 1])
      : undefined;
  const exchangeContext = getExchangeContext(orderedJson, exchangeIndex);
  const actualValue =
    resolvedIssue.input !== undefined ? resolvedIssue.input : getValueAtPath(orderedJson, path);
  const fieldKey = getProcessSdkIssueFieldKey(path);
  const { actual, limit, reasonMessage, suggestedFix } = getProcessSdkIssueReason(
    resolvedIssue,
    actualValue,
    fieldKey,
  );

  return {
    actual,
    exchangeDirection: exchangeContext?.exchangeDirection,
    exchangeFlowId: exchangeContext?.exchangeFlowId,
    exchangeFlowLabel: exchangeContext?.exchangeFlowLabel,
    exchangeIndex,
    exchangeInternalId: exchangeContext?.exchangeInternalId,
    fieldKey,
    fieldLabel: getProcessSdkIssueFieldLabel(path, orderedJson, exchangeIndex),
    fieldPath: getProcessSdkIssueFieldPath(path, exchangeContext?.exchangeInternalId),
    key: [
      getProcessSdkIssueTabName(resolvedIssue) ?? 'unknown',
      exchangeContext?.exchangeInternalId ?? exchangeIndex ?? 'root',
      getProcessSdkIssueFieldPath(path, exchangeContext?.exchangeInternalId),
      resolvedIssue.code ?? 'unknown',
      reasonMessage,
    ].join(':'),
    limit,
    reasonMessage,
    suggestedFix,
    tabName: getProcessSdkIssueTabName(resolvedIssue),
  };
};

export const normalizeProcessSdkValidationDetails = (
  issues: ProcessSdkValidationIssueLike[],
  orderedJson: any,
) => {
  const detailMap = new Map<string, ValidationIssueSdkDetail>();

  issues.forEach((issue) => {
    const detail = toProcessSdkValidationDetail(issue, orderedJson);
    if (!detail) {
      return;
    }

    if (!detailMap.has(detail.key)) {
      detailMap.set(detail.key, detail);
    }
  });

  return Array.from(detailMap.values());
};
