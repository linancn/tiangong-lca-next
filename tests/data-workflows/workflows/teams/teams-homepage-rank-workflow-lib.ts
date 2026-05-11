import { normalizeSupabaseTarget, pollUntil, writeRuntimeRecord } from '../workflow-shared';
import {
  DEFAULT_TEAM_CREATE_EXPECTED_PATH,
  DEFAULT_TEAM_CREATE_FIXTURE_PATH,
  DEFAULT_TEAM_HOMEPAGE_RANK_EXPECTED_PATH,
  DEFAULT_TEAM_HOMEPAGE_RANK_FIXTURE_PATH,
  DEFAULT_TEAM_ROLE_ALIASES,
  buildTeamPlaceholders,
  buildTeamWorkspaceRecord,
  closeTeamSessions,
  ensureTeamWorkspace,
  evaluateTeamExpectationFile,
  getTeamAccountSummary,
  loadTeamHomepageRankFixture,
  parseTeamWorkflowCliArgs,
  queryHomepageVisibility,
  queryTeamRow,
  resolveTeamAccount,
  updateHomepageRank,
  type TeamWorkflowCliOptions,
} from './team-workflow-shared';

export const TEAMS_HOMEPAGE_RANK_DATA_WORKFLOW_HELP = `Teams homepage-rank data workflow

Usage:
  npm run test:teams:homepage-rank -- --frontend-url http://127.0.0.1:8000 --supabase-url https://fotofiyqnuyvgtotswie.supabase.co
  npm run test:teams:homepage-rank -- --owner-role team-owner --system-role system-admin --frontend-url https://lca.tiangong.earth --supabase-url https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie

Flags:
  --owner-role <name>              Logical owner role (defaults to "team-owner")
  --system-role <name>             Logical system admin role (defaults to "system-admin")
  --frontend-url <url>             Frontend URL to display and optionally probe
  --supabase-url <url>             Supabase API URL or dashboard project URL
  --supabase-project-url <url>     Explicit dashboard project URL
  --supabase-publishable-key <key> Override SUPABASE_PUBLISHABLE_KEY
  --create-data-file <path>        Defaults to tests/data-workflows/fixtures/data/teams/001_create_team.json
  --data-file <path>               Defaults to tests/data-workflows/fixtures/data/teams/006_homepage_rank_management.json
  --workspace-file <path>          Defaults to tests/data-workflows/runtime/teams/team-workspace.last-run.json
  --users-file <path>              Legacy JSON fallback, defaults to tests/data-workflows/fixtures/data/users.json after checking .env.users.local
  --generate-id                    When bootstrap create is needed, generate a fresh team id (default)
  --no-generate-id                 When bootstrap create is needed, reuse the fixture team id as-is
  --write-runtime                  Write this run's runtime record to a file (default)
  --no-write-runtime               Skip writing the runtime record file
  --runtime-record-file <path>     Override the runtime record output path
  --verify-frontend                Fetch the frontend URL before run (default)
  --no-verify-frontend             Skip the frontend fetch probe
  --help                           Show this help text
`;

export type TeamsHomepageRankCliOptions = Required<
  Pick<
    TeamWorkflowCliOptions,
    | 'createDataFile'
    | 'createExpectedFile'
    | 'dataFile'
    | 'expectedFile'
    | 'ownerRole'
    | 'systemRole'
  >
> &
  Omit<
    TeamWorkflowCliOptions,
    | 'createDataFile'
    | 'createExpectedFile'
    | 'dataFile'
    | 'expectedFile'
    | 'ownerRole'
    | 'systemRole'
  >;

export type TeamsHomepageRankSmokeResult = {
  bootstrapCreated: boolean;
  expectationResults: Awaited<ReturnType<typeof evaluateTeamExpectationFile>>;
  frontendProbe: Awaited<ReturnType<typeof ensureTeamWorkspace>>['frontendProbe'];
  hiddenHomepageVisible: boolean;
  hiddenTeam: Awaited<ReturnType<typeof queryTeamRow>>;
  passed: boolean;
  runtimeRecordFile?: string;
  runtimeRecordWritten: boolean;
  shownHomepageVisible: boolean;
  shownTeam: Awaited<ReturnType<typeof queryTeamRow>>;
  supabaseTarget: ReturnType<typeof normalizeSupabaseTarget>;
  teamId: string;
  workspaceFile: string;
};

export function parseTeamsHomepageRankCliArgs(
  argv: string[],
  cwd = process.cwd(),
): TeamsHomepageRankCliOptions {
  return parseTeamWorkflowCliArgs(
    argv,
    {
      createDataFile: DEFAULT_TEAM_CREATE_FIXTURE_PATH,
      createExpectedFile: DEFAULT_TEAM_CREATE_EXPECTED_PATH,
      dataFile: DEFAULT_TEAM_HOMEPAGE_RANK_FIXTURE_PATH,
      defaultRoles: {
        ownerRole: 'team-owner',
        systemRole: 'system-admin',
      },
      expectedFile: DEFAULT_TEAM_HOMEPAGE_RANK_EXPECTED_PATH,
    },
    cwd,
  ) as TeamsHomepageRankCliOptions;
}

export async function runTeamsHomepageRankSmoke(
  options: TeamsHomepageRankCliOptions,
): Promise<TeamsHomepageRankSmokeResult> {
  const supabaseTarget = normalizeSupabaseTarget(options);
  const workspace = await ensureTeamWorkspace({
    createDataFile: options.createDataFile,
    createExpectedFile: options.createExpectedFile,
    frontendUrl: options.frontendUrl,
    generateId: options.generateId,
    ownerRole: options.ownerRole,
    roleAliases: DEFAULT_TEAM_ROLE_ALIASES,
    supabaseTarget,
    usersFile: options.usersFile,
    verifyFrontend: options.verifyFrontend,
    workspaceFile: options.workspaceFile,
  });
  const systemSession = await resolveTeamAccount({
    role: options.systemRole,
    roleAliases: DEFAULT_TEAM_ROLE_ALIASES,
    supabaseTarget,
    usersFile: options.usersFile,
  });

  try {
    const fixture = await loadTeamHomepageRankFixture(options.dataFile);

    await updateHomepageRank({
      rank: fixture.hiddenRank,
      systemSession,
      teamId: workspace.teamId,
    });

    const hiddenTeam = await pollUntil(
      () => queryTeamRow(workspace.ownerSession.client, workspace.teamId),
      (value) => value.exists && value.rank === fixture.hiddenRank,
    );
    const hiddenHomepageVisible = await pollUntil(
      () => queryHomepageVisibility(systemSession.client, workspace.teamId),
      (value) => value === false,
    );

    await updateHomepageRank({
      rank: fixture.visibleRank,
      systemSession,
      teamId: workspace.teamId,
    });

    const shownTeam = await pollUntil(
      () => queryTeamRow(workspace.ownerSession.client, workspace.teamId),
      (value) => value.exists && value.rank === fixture.visibleRank,
    );
    const shownHomepageVisible = await pollUntil(
      () => queryHomepageVisibility(systemSession.client, workspace.teamId),
      (value) => value === true,
    );

    const expectationResults = await evaluateTeamExpectationFile({
      context: {
        steps: {
          hide: {
            homepageVisible: hiddenHomepageVisible,
            team: hiddenTeam,
          },
          show: {
            homepageVisible: shownHomepageVisible,
            team: shownTeam,
          },
        },
      },
      expectedFile: options.expectedFile,
      placeholders: buildTeamPlaceholders({
        fixtureValues: {
          __FIXTURE_HIDE_RANK__: fixture.hiddenRank,
          __FIXTURE_VISIBLE_RANK__: fixture.visibleRank,
        },
        ownerSession: workspace.ownerSession,
        systemSession,
        teamId: workspace.teamId,
      }),
    });
    const passed = expectationResults.every((item) => item.passed);

    await writeRuntimeRecord(
      options.workspaceFile,
      buildTeamWorkspaceRecord({
        createdAt: workspace.workspaceRecord.createdAt,
        ownerSession: workspace.ownerSession,
        supabaseTarget,
        team: shownTeam,
        teamId: workspace.teamId,
        workspaceFile: options.workspaceFile,
      }),
    );

    let runtimeRecordWritten = false;
    let runtimeRecordFile: string | undefined;

    if (options.writeRuntime) {
      runtimeRecordFile = options.runtimeRecordFile;
      await writeRuntimeRecord(runtimeRecordFile, {
        accounts: {
          owner: getTeamAccountSummary(workspace.ownerSession),
          system: getTeamAccountSummary(systemSession),
        },
        bootstrapCreated: workspace.workspaceAction === 'created',
        bootstrapStep: workspace.createStep ?? null,
        createdAt: new Date().toISOString(),
        expectationResults,
        fixtureFile: options.dataFile,
        frontendProbe: workspace.frontendProbe,
        passed,
        supabase: {
          apiUrl: supabaseTarget.apiUrl,
          dashboardUrl: supabaseTarget.dashboardUrl,
          projectId: supabaseTarget.projectId,
        },
        teamId: workspace.teamId,
        workspaceFile: options.workspaceFile,
      });
      runtimeRecordWritten = true;
    }

    return {
      bootstrapCreated: workspace.workspaceAction === 'created',
      expectationResults,
      frontendProbe: workspace.frontendProbe,
      hiddenHomepageVisible,
      hiddenTeam,
      passed,
      runtimeRecordFile,
      runtimeRecordWritten,
      shownHomepageVisible,
      shownTeam,
      supabaseTarget,
      teamId: workspace.teamId,
      workspaceFile: options.workspaceFile,
    };
  } finally {
    await closeTeamSessions([workspace.ownerSession, systemSession]);
  }
}
