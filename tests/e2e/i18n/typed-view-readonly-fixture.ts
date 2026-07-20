import { AUTHORING_LANGUAGES } from './contracts';
import type { ProductionDataLedger } from './production-data-safety';

export const PROCESS_SAVE_DRAFT_PATH = '/functions/v1/app_dataset_save_draft' as const;
export const PROCESS_SAVE_DRAFT_ROUTE_PATTERN = '**/functions/v1/app_dataset_save_draft*' as const;

type RequestLike = {
  headers: () => Record<string, string>;
  method: () => string;
  postData: () => string | null;
  url: () => string;
};

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Refusing the typed-view read-only save-draft trap: ${message}`);
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return (
    value !== null && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort())
  );
}

function hasExactMarkerMatrix(payload: unknown, ledger: ProductionDataLedger): boolean {
  const root = asRecord(payload);
  const processDataSet = asRecord(root?.processDataSet);
  const processInformation = asRecord(processDataSet?.processInformation);
  const dataSetInformation = asRecord(processInformation?.dataSetInformation);
  const name = asRecord(dataSetInformation?.name);
  if (!dataSetInformation || !name || dataSetInformation['common:UUID'] !== ledger.id) {
    return false;
  }

  return [
    ['baseName', name.baseName],
    ['treatmentStandardsRoutes', name.treatmentStandardsRoutes],
    ['mixAndLocationTypes', name.mixAndLocationTypes],
    ['functionalUnitFlowProperties', name.functionalUnitFlowProperties],
    ['generalComment', dataSetInformation['common:generalComment']],
  ].every(([field, rawElements]) => {
    const elements = (Array.isArray(rawElements) ? rawElements : [rawElements])
      .map((element) => asRecord(element))
      .filter((element): element is Record<string, unknown> => Boolean(element));
    return (
      elements.length === AUTHORING_LANGUAGES.length &&
      AUTHORING_LANGUAGES.every((languageCode) => {
        const matches = elements.filter((element) => element['@xml:lang'] === languageCode);
        return (
          matches.length === 1 &&
          matches[0]['#text'] === `${ledger.marker} ${field} ${languageCode}`
        );
      })
    );
  });
}

export function assertExactReadOnlyProcessValidationDraft(input: {
  expectedOrigin: string;
  expectedPublishableKey: string;
  ledger: ProductionDataLedger;
  request: RequestLike;
}): void {
  const { expectedOrigin, expectedPublishableKey, ledger, request } = input;
  const target = new URL(request.url());
  requireCondition(request.method() === 'POST', 'method must be POST');
  requireCondition(target.origin === expectedOrigin, 'origin must match verified production');
  requireCondition(target.pathname === PROCESS_SAVE_DRAFT_PATH, 'pathname must be exact');
  requireCondition(
    [...target.searchParams.entries()].length === 1 &&
      target.searchParams.get('forceFunctionRegion') === 'us-east-1',
    'query must contain only the pinned function region',
  );
  const headers = Object.fromEntries(
    Object.entries(request.headers()).map(([key, value]) => [key.toLowerCase(), value]),
  );
  requireCondition(headers.apikey === expectedPublishableKey, 'publishable key must be exact');

  let body: Record<string, unknown> | undefined;
  try {
    body = asRecord(JSON.parse(request.postData() ?? ''));
  } catch {
    body = undefined;
  }
  requireCondition(Boolean(body), 'body must be valid JSON object');
  const requiredKeys = ['id', 'jsonOrdered', 'ruleVerification', 'table', 'version'] as const;
  const exactKeys = body!.modelId === undefined ? requiredKeys : [...requiredKeys, 'modelId'];
  requireCondition(hasExactKeys(body!, exactKeys), 'body keys must be exact');
  requireCondition(body!.id === ledger.id, 'dataset UUID must match the ledger');
  requireCondition(body!.version === ledger.version, 'dataset version must match the ledger');
  requireCondition(body!.table === ledger.table, 'dataset table must match the ledger');
  requireCondition(
    typeof body!.ruleVerification === 'boolean',
    'ruleVerification must be an explicit boolean',
  );
  requireCondition(
    body!.modelId === undefined || body!.modelId === null,
    'modelId must be absent or null',
  );
  requireCondition(
    hasExactMarkerMatrix(body!.jsonOrdered, ledger),
    'payload must preserve the exact five-field, four-language marker matrix',
  );
}
