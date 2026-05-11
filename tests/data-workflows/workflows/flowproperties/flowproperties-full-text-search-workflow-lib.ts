import {
  buildFullTextSearchHelpText,
  parseFullTextSearchCliArgs,
  runFullTextSearchSmoke,
  type FullTextSearchCliOptions,
  type FullTextSearchDependencies,
  type FullTextSearchSmokeResult,
  type FullTextSearchWorkflowConfig,
} from '../full-text-search-shared';
import {
  DEFAULT_FLOWPROPERTY_EXPECTED_PATH,
  DEFAULT_FLOWPROPERTY_FIXTURE_PATH,
  DEFAULT_FLOWPROPERTY_ROLE,
  DEFAULT_USERS_PATH,
  computeFlowpropertyRuleVerification,
  loadFlowpropertyFixture,
  loadUsersConfig,
  normalizeSupabaseTarget,
  pickCredentialByRole,
  prepareRuntimeFixture,
  probeFrontendUrl,
  resolveRuntimeRecordFilePath,
} from './flowproperties-create-workflow-lib';

export const DEFAULT_FLOWPROPERTY_FULL_TEXT_SEARCH_FIXTURE_PATH =
  'tests/data-workflows/fixtures/data/flowProperties/007_full_text_search.json';
export const DEFAULT_FLOWPROPERTY_FULL_TEXT_SEARCH_EXPECTED_PATH =
  'tests/data-workflows/fixtures/result/flowProperties/007_full_text_search.md';

const FLOWPROPERTY_FULL_TEXT_SEARCH_CONFIG: FullTextSearchWorkflowConfig = {
  computeRuleVerification: computeFlowpropertyRuleVerification,
  dataType: 'flow property',
  defaultExpectedPath: DEFAULT_FLOWPROPERTY_FULL_TEXT_SEARCH_EXPECTED_PATH,
  defaultRole: DEFAULT_FLOWPROPERTY_ROLE,
  defaultSearchFixturePath: DEFAULT_FLOWPROPERTY_FULL_TEXT_SEARCH_FIXTURE_PATH,
  defaultSeedExpectedPath: DEFAULT_FLOWPROPERTY_EXPECTED_PATH,
  defaultSeedFixturePath: DEFAULT_FLOWPROPERTY_FIXTURE_PATH,
  defaultUsersPath: DEFAULT_USERS_PATH,
  includeUserIdInSearch: true,
  loadSeedFixture: loadFlowpropertyFixture,
  loadUsersConfig,
  normalizeSupabaseTarget,
  pickCredentialByRole,
  prepareRuntimeFixture,
  probeFrontendUrl,
  resolveRuntimeRecordFilePath,
  rpcName: 'pgroonga_search_flowproperties',
  table: 'flowproperties',
  workflowName: 'Flow property full-text search',
};

export const FLOWPROPERTY_FULL_TEXT_SEARCH_DATA_WORKFLOW_HELP = buildFullTextSearchHelpText({
  defaultExpectedPath: DEFAULT_FLOWPROPERTY_FULL_TEXT_SEARCH_EXPECTED_PATH,
  defaultSearchFixturePath: DEFAULT_FLOWPROPERTY_FULL_TEXT_SEARCH_FIXTURE_PATH,
  defaultSeedExpectedPath: DEFAULT_FLOWPROPERTY_EXPECTED_PATH,
  defaultSeedFixturePath: DEFAULT_FLOWPROPERTY_FIXTURE_PATH,
  npmCommand: 'test:flowproperties:full-text-search',
  title: 'Flow property full-text-search data workflow',
});

export type FlowpropertyFullTextSearchCliOptions = FullTextSearchCliOptions;
export type FlowpropertyFullTextSearchSmokeResult = FullTextSearchSmokeResult;
export type FlowpropertyFullTextSearchDependencies = FullTextSearchDependencies;

export function parseFlowpropertyFullTextSearchCliArgs(argv: string[], cwd = process.cwd()) {
  return parseFullTextSearchCliArgs(argv, FLOWPROPERTY_FULL_TEXT_SEARCH_CONFIG, cwd);
}

export async function runFlowpropertyFullTextSearchSmoke(
  options: FlowpropertyFullTextSearchCliOptions,
  dependencies: FlowpropertyFullTextSearchDependencies = {},
): Promise<FlowpropertyFullTextSearchSmokeResult> {
  return runFullTextSearchSmoke(options, FLOWPROPERTY_FULL_TEXT_SEARCH_CONFIG, dependencies);
}
