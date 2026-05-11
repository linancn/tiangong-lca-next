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
  DEFAULT_SOURCE_EXPECTED_PATH,
  DEFAULT_SOURCE_FIXTURE_PATH,
  DEFAULT_SOURCE_ROLE,
  DEFAULT_USERS_PATH,
  computeSourceRuleVerification,
  loadSourceFixture,
  loadUsersConfig,
  normalizeSupabaseTarget,
  pickCredentialByRole,
  prepareRuntimeFixture,
  probeFrontendUrl,
  resolveRuntimeRecordFilePath,
} from './sources-create-workflow-lib';

export const DEFAULT_SOURCE_FULL_TEXT_SEARCH_FIXTURE_PATH =
  'tests/data-workflows/fixtures/data/sources/007_full_text_search.json';
export const DEFAULT_SOURCE_FULL_TEXT_SEARCH_EXPECTED_PATH =
  'tests/data-workflows/fixtures/result/sources/007_full_text_search.md';

const SOURCE_FULL_TEXT_SEARCH_CONFIG: FullTextSearchWorkflowConfig = {
  computeRuleVerification: computeSourceRuleVerification,
  dataType: 'source',
  defaultExpectedPath: DEFAULT_SOURCE_FULL_TEXT_SEARCH_EXPECTED_PATH,
  defaultRole: DEFAULT_SOURCE_ROLE,
  defaultSearchFixturePath: DEFAULT_SOURCE_FULL_TEXT_SEARCH_FIXTURE_PATH,
  defaultSeedExpectedPath: DEFAULT_SOURCE_EXPECTED_PATH,
  defaultSeedFixturePath: DEFAULT_SOURCE_FIXTURE_PATH,
  defaultUsersPath: DEFAULT_USERS_PATH,
  includeUserIdInSearch: true,
  loadSeedFixture: loadSourceFixture,
  loadUsersConfig,
  normalizeSupabaseTarget,
  pickCredentialByRole,
  prepareRuntimeFixture,
  probeFrontendUrl,
  resolveRuntimeRecordFilePath,
  rpcName: 'pgroonga_search_sources',
  table: 'sources',
  workflowName: 'Source full-text search',
};

export const SOURCE_FULL_TEXT_SEARCH_DATA_WORKFLOW_HELP = buildFullTextSearchHelpText({
  defaultExpectedPath: DEFAULT_SOURCE_FULL_TEXT_SEARCH_EXPECTED_PATH,
  defaultSearchFixturePath: DEFAULT_SOURCE_FULL_TEXT_SEARCH_FIXTURE_PATH,
  defaultSeedExpectedPath: DEFAULT_SOURCE_EXPECTED_PATH,
  defaultSeedFixturePath: DEFAULT_SOURCE_FIXTURE_PATH,
  npmCommand: 'test:sources:full-text-search',
  title: 'Source full-text-search data workflow',
});

export type SourceFullTextSearchCliOptions = FullTextSearchCliOptions;
export type SourceFullTextSearchSmokeResult = FullTextSearchSmokeResult;
export type SourceFullTextSearchDependencies = FullTextSearchDependencies;

export function parseSourceFullTextSearchCliArgs(argv: string[], cwd = process.cwd()) {
  return parseFullTextSearchCliArgs(argv, SOURCE_FULL_TEXT_SEARCH_CONFIG, cwd);
}

export async function runSourceFullTextSearchSmoke(
  options: SourceFullTextSearchCliOptions,
  dependencies: SourceFullTextSearchDependencies = {},
): Promise<SourceFullTextSearchSmokeResult> {
  return runFullTextSearchSmoke(options, SOURCE_FULL_TEXT_SEARCH_CONFIG, dependencies);
}
