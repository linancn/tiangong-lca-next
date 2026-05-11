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
  DEFAULT_CONTACT_EXPECTED_PATH,
  DEFAULT_CONTACT_FIXTURE_PATH,
  DEFAULT_CONTACT_ROLE,
  DEFAULT_USERS_PATH,
  computeContactRuleVerification,
  loadContactFixture,
  loadUsersConfig,
  normalizeSupabaseTarget,
  pickCredentialByRole,
  prepareRuntimeFixture,
  probeFrontendUrl,
  resolveRuntimeRecordFilePath,
} from './contacts-create-workflow-lib';

export const DEFAULT_CONTACT_FULL_TEXT_SEARCH_FIXTURE_PATH =
  'tests/data-workflows/fixtures/data/contacts/007_full_text_search.json';
export const DEFAULT_CONTACT_FULL_TEXT_SEARCH_EXPECTED_PATH =
  'tests/data-workflows/fixtures/result/contacts/007_full_text_search.md';

const CONTACT_FULL_TEXT_SEARCH_CONFIG: FullTextSearchWorkflowConfig = {
  computeRuleVerification: computeContactRuleVerification,
  dataType: 'contact',
  defaultExpectedPath: DEFAULT_CONTACT_FULL_TEXT_SEARCH_EXPECTED_PATH,
  defaultRole: DEFAULT_CONTACT_ROLE,
  defaultSearchFixturePath: DEFAULT_CONTACT_FULL_TEXT_SEARCH_FIXTURE_PATH,
  defaultSeedExpectedPath: DEFAULT_CONTACT_EXPECTED_PATH,
  defaultSeedFixturePath: DEFAULT_CONTACT_FIXTURE_PATH,
  defaultUsersPath: DEFAULT_USERS_PATH,
  includeUserIdInSearch: true,
  loadSeedFixture: loadContactFixture,
  loadUsersConfig,
  normalizeSupabaseTarget,
  pickCredentialByRole,
  prepareRuntimeFixture,
  probeFrontendUrl,
  resolveRuntimeRecordFilePath,
  rpcName: 'pgroonga_search_contacts',
  table: 'contacts',
  workflowName: 'Contact full-text search',
};

export const CONTACT_FULL_TEXT_SEARCH_DATA_WORKFLOW_HELP = buildFullTextSearchHelpText({
  defaultExpectedPath: DEFAULT_CONTACT_FULL_TEXT_SEARCH_EXPECTED_PATH,
  defaultSearchFixturePath: DEFAULT_CONTACT_FULL_TEXT_SEARCH_FIXTURE_PATH,
  defaultSeedExpectedPath: DEFAULT_CONTACT_EXPECTED_PATH,
  defaultSeedFixturePath: DEFAULT_CONTACT_FIXTURE_PATH,
  npmCommand: 'test:contacts:full-text-search',
  title: 'Contact full-text-search data workflow',
});

export type ContactFullTextSearchCliOptions = FullTextSearchCliOptions;
export type ContactFullTextSearchSmokeResult = FullTextSearchSmokeResult;
export type ContactFullTextSearchDependencies = FullTextSearchDependencies;

export function parseContactFullTextSearchCliArgs(argv: string[], cwd = process.cwd()) {
  return parseFullTextSearchCliArgs(argv, CONTACT_FULL_TEXT_SEARCH_CONFIG, cwd);
}

export async function runContactFullTextSearchSmoke(
  options: ContactFullTextSearchCliOptions,
  dependencies: ContactFullTextSearchDependencies = {},
): Promise<ContactFullTextSearchSmokeResult> {
  return runFullTextSearchSmoke(options, CONTACT_FULL_TEXT_SEARCH_CONFIG, dependencies);
}
