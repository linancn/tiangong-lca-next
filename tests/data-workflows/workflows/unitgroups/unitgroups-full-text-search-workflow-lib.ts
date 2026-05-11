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
  DEFAULT_UNITGROUP_EXPECTED_PATH,
  DEFAULT_UNITGROUP_FIXTURE_PATH,
  DEFAULT_UNITGROUP_ROLE,
  DEFAULT_USERS_PATH,
  computeUnitGroupRuleVerification,
  loadUnitGroupFixture,
  loadUsersConfig,
  normalizeSupabaseTarget,
  pickCredentialByRole,
  prepareRuntimeFixture,
  probeFrontendUrl,
  resolveRuntimeRecordFilePath,
} from './unitgroups-create-workflow-lib';

export const DEFAULT_UNITGROUP_FULL_TEXT_SEARCH_FIXTURE_PATH =
  'tests/data-workflows/fixtures/data/unitgroups/007_full_text_search.json';
export const DEFAULT_UNITGROUP_FULL_TEXT_SEARCH_EXPECTED_PATH =
  'tests/data-workflows/fixtures/result/unitgroups/007_full_text_search.md';

const UNITGROUP_FULL_TEXT_SEARCH_CONFIG: FullTextSearchWorkflowConfig = {
  computeRuleVerification: computeUnitGroupRuleVerification,
  dataType: 'unit group',
  defaultExpectedPath: DEFAULT_UNITGROUP_FULL_TEXT_SEARCH_EXPECTED_PATH,
  defaultRole: DEFAULT_UNITGROUP_ROLE,
  defaultSearchFixturePath: DEFAULT_UNITGROUP_FULL_TEXT_SEARCH_FIXTURE_PATH,
  defaultSeedExpectedPath: DEFAULT_UNITGROUP_EXPECTED_PATH,
  defaultSeedFixturePath: DEFAULT_UNITGROUP_FIXTURE_PATH,
  defaultUsersPath: DEFAULT_USERS_PATH,
  includeUserIdInSearch: true,
  loadSeedFixture: loadUnitGroupFixture,
  loadUsersConfig,
  normalizeSupabaseTarget,
  pickCredentialByRole,
  prepareRuntimeFixture,
  probeFrontendUrl,
  resolveRuntimeRecordFilePath,
  rpcName: 'pgroonga_search_unitgroups',
  table: 'unitgroups',
  workflowName: 'Unit group full-text search',
};

export const UNITGROUP_FULL_TEXT_SEARCH_DATA_WORKFLOW_HELP = buildFullTextSearchHelpText({
  defaultExpectedPath: DEFAULT_UNITGROUP_FULL_TEXT_SEARCH_EXPECTED_PATH,
  defaultSearchFixturePath: DEFAULT_UNITGROUP_FULL_TEXT_SEARCH_FIXTURE_PATH,
  defaultSeedExpectedPath: DEFAULT_UNITGROUP_EXPECTED_PATH,
  defaultSeedFixturePath: DEFAULT_UNITGROUP_FIXTURE_PATH,
  npmCommand: 'test:unitgroups:full-text-search',
  title: 'Unit group full-text-search data workflow',
});

export type UnitgroupFullTextSearchCliOptions = FullTextSearchCliOptions;
export type UnitgroupFullTextSearchSmokeResult = FullTextSearchSmokeResult;
export type UnitgroupFullTextSearchDependencies = FullTextSearchDependencies;

export function parseUnitgroupFullTextSearchCliArgs(argv: string[], cwd = process.cwd()) {
  return parseFullTextSearchCliArgs(argv, UNITGROUP_FULL_TEXT_SEARCH_CONFIG, cwd);
}

export async function runUnitgroupFullTextSearchSmoke(
  options: UnitgroupFullTextSearchCliOptions,
  dependencies: UnitgroupFullTextSearchDependencies = {},
): Promise<UnitgroupFullTextSearchSmokeResult> {
  return runFullTextSearchSmoke(options, UNITGROUP_FULL_TEXT_SEARCH_CONFIG, dependencies);
}
