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
  DEFAULT_FLOW_EXPECTED_PATH,
  DEFAULT_FLOW_FIXTURE_PATH,
  DEFAULT_FLOW_ROLE,
  DEFAULT_USERS_PATH,
  computeFlowRuleVerification,
  loadFlowFixture,
  loadUsersConfig,
  normalizeSupabaseTarget,
  pickCredentialByRole,
  prepareRuntimeFixture,
  probeFrontendUrl,
  resolveRuntimeRecordFilePath,
} from './flows-create-workflow-lib';

export const DEFAULT_FLOW_FULL_TEXT_SEARCH_FIXTURE_PATH =
  'tests/data-workflows/fixtures/data/flows/007_full_text_search.json';
export const DEFAULT_FLOW_FULL_TEXT_SEARCH_EXPECTED_PATH =
  'tests/data-workflows/fixtures/result/flows/007_full_text_search.md';

const FLOW_FULL_TEXT_SEARCH_CONFIG: FullTextSearchWorkflowConfig = {
  computeRuleVerification: computeFlowRuleVerification,
  dataType: 'flow',
  defaultExpectedPath: DEFAULT_FLOW_FULL_TEXT_SEARCH_EXPECTED_PATH,
  defaultRole: DEFAULT_FLOW_ROLE,
  defaultSearchFixturePath: DEFAULT_FLOW_FULL_TEXT_SEARCH_FIXTURE_PATH,
  defaultSeedExpectedPath: DEFAULT_FLOW_EXPECTED_PATH,
  defaultSeedFixturePath: DEFAULT_FLOW_FIXTURE_PATH,
  defaultUsersPath: DEFAULT_USERS_PATH,
  loadSeedFixture: loadFlowFixture,
  loadUsersConfig,
  normalizeSupabaseTarget,
  pickCredentialByRole,
  prepareRuntimeFixture,
  probeFrontendUrl,
  resolveRuntimeRecordFilePath,
  rpcName: 'search_flows_latest',
  table: 'flows',
  workflowName: 'Flow full-text search',
};

export const FLOW_FULL_TEXT_SEARCH_DATA_WORKFLOW_HELP = buildFullTextSearchHelpText({
  defaultExpectedPath: DEFAULT_FLOW_FULL_TEXT_SEARCH_EXPECTED_PATH,
  defaultSearchFixturePath: DEFAULT_FLOW_FULL_TEXT_SEARCH_FIXTURE_PATH,
  defaultSeedExpectedPath: DEFAULT_FLOW_EXPECTED_PATH,
  defaultSeedFixturePath: DEFAULT_FLOW_FIXTURE_PATH,
  npmCommand: 'test:flows:full-text-search',
  title: 'Flow full-text-search data workflow',
});

export type FlowFullTextSearchCliOptions = FullTextSearchCliOptions;
export type FlowFullTextSearchSmokeResult = FullTextSearchSmokeResult;
export type FlowFullTextSearchDependencies = FullTextSearchDependencies;

export function parseFlowFullTextSearchCliArgs(argv: string[], cwd = process.cwd()) {
  return parseFullTextSearchCliArgs(argv, FLOW_FULL_TEXT_SEARCH_CONFIG, cwd);
}

export async function runFlowFullTextSearchSmoke(
  options: FlowFullTextSearchCliOptions,
  dependencies: FlowFullTextSearchDependencies = {},
): Promise<FlowFullTextSearchSmokeResult> {
  return runFullTextSearchSmoke(options, FLOW_FULL_TEXT_SEARCH_CONFIG, dependencies);
}
