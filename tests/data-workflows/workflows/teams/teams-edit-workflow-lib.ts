import { normalizeSupabaseTarget, pollUntil, writeRuntimeRecord } from '../workflow-shared';
import {
  DEFAULT_TEAM_CREATE_EXPECTED_PATH,
  DEFAULT_TEAM_CREATE_FIXTURE_PATH,
  DEFAULT_TEAM_EDIT_EXPECTED_PATH,
  DEFAULT_TEAM_EDIT_FIXTURE_PATH,
  DEFAULT_TEAM_ROLE_ALIASES,
  buildTeamPlaceholders,
  buildTeamWorkspaceRecord,
  closeTeamSessions,
  editTeamProfile,
  ensureTeamWorkspace,
  evaluateTeamExpectationFile,
  getTeamAccountSummary,
  loadTeamEditFixture,
  parseTeamWorkflowCliArgs,
  queryTeamRole,
  queryTeamRow,
  type TeamWorkflowCliOptions,
} from './team-workflow-shared';

export const TEAMS_EDIT_DATA_WORKFLOW_HELP = `Teams edit data workflow

Usage:
  npm run test:workflows -- --teams:edit --frontend-url http://127.0.0.1:8000 --supabase-url https://fotofiyqnuyvgtotswie.supabase.co
  npm run test:workflows -- --teams:edit --owner-role team-owner --frontend-url https://lca.tiangong.earth --supabase-url https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie

Flags:
  --owner-role <name>              Logical owner role (defaults to "team-owner")
  --frontend-url <url>             Frontend URL to display and optionally probe
  --supabase-url <url>             Supabase API URL or dashboard project URL
  --supabase-project-url <url>     Explicit dashboard project URL
  --supabase-publishable-key <key> Override SUPABASE_PUBLISHABLE_KEY
  --create-data-file <path>        Defaults to tests/data-workflows/fixtures/data/teams/001_create_team.json
  --data-file <path>               Defaults to tests/data-workflows/fixtures/data/teams/002_edit_team_profile.json
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

export type TeamsEditCliOptions = Required<
  Pick<
    TeamWorkflowCliOptions,
    'createDataFile' | 'createExpectedFile' | 'dataFile' | 'expectedFile' | 'ownerRole'
  >
> &
  Omit<
    TeamWorkflowCliOptions,
    'createDataFile' | 'createExpectedFile' | 'dataFile' | 'expectedFile' | 'ownerRole'
  >;

export type TeamsEditSmokeResult = {
  bootstrapCreated: boolean;
  expectationResults: Awaited<ReturnType<typeof evaluateTeamExpectationFile>>;
  frontendProbe: Awaited<ReturnType<typeof ensureTeamWorkspace>>['frontendProbe'];
  ownerRole: Awaited<ReturnType<typeof queryTeamRole>>;
  passed: boolean;
  runtimeRecordFile?: string;
  runtimeRecordWritten: boolean;
  supabaseTarget: ReturnType<typeof normalizeSupabaseTarget>;
  team: Awaited<ReturnType<typeof queryTeamRow>>;
  teamId: string;
  workspaceFile: string;
};

export function parseTeamsEditCliArgs(argv: string[], cwd = process.cwd()): TeamsEditCliOptions {
  return parseTeamWorkflowCliArgs(
    argv,
    {
      createDataFile: DEFAULT_TEAM_CREATE_FIXTURE_PATH,
      createExpectedFile: DEFAULT_TEAM_CREATE_EXPECTED_PATH,
      dataFile: DEFAULT_TEAM_EDIT_FIXTURE_PATH,
      defaultRoles: {
        ownerRole: 'team-owner',
      },
      expectedFile: DEFAULT_TEAM_EDIT_EXPECTED_PATH,
    },
    cwd,
  ) as TeamsEditCliOptions;
}

export async function runTeamsEditSmoke(
  options: TeamsEditCliOptions,
): Promise<TeamsEditSmokeResult> {
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

  try {
    const fixture = await loadTeamEditFixture(options.dataFile);

    await editTeamProfile({
      isPublic: fixture.isPublic,
      json: fixture.json,
      ownerSession: workspace.ownerSession,
      rank: fixture.rank,
      teamId: workspace.teamId,
    });

    const team = await pollUntil(
      () => queryTeamRow(workspace.ownerSession.client, workspace.teamId),
      (value) =>
        value.exists &&
        JSON.stringify(value.json) === JSON.stringify(fixture.json) &&
        value.is_public === fixture.isPublic &&
        (typeof fixture.rank !== 'number' || value.rank === fixture.rank),
    );
    const ownerRole = await queryTeamRole(
      workspace.ownerSession.client,
      workspace.teamId,
      workspace.ownerSession.user.id,
    );

    const expectationResults = await evaluateTeamExpectationFile({
      context: {
        steps: {
          edit: {
            ownerRole,
            team,
          },
        },
      },
      expectedFile: options.expectedFile,
      placeholders: buildTeamPlaceholders({
        fixtureValues: {
          __FIXTURE_IS_PUBLIC__: fixture.isPublic,
          __FIXTURE_JSON__: fixture.json,
          __FIXTURE_RANK__: fixture.rank ?? team.rank,
        },
        ownerSession: workspace.ownerSession,
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
        team,
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
        team,
        teamId: workspace.teamId,
        workspaceFile: options.workspaceFile,
      });
      runtimeRecordWritten = true;
    }

    return {
      bootstrapCreated: workspace.workspaceAction === 'created',
      expectationResults,
      frontendProbe: workspace.frontendProbe,
      ownerRole,
      passed,
      runtimeRecordFile,
      runtimeRecordWritten,
      supabaseTarget,
      team,
      teamId: workspace.teamId,
      workspaceFile: options.workspaceFile,
    };
  } finally {
    await closeTeamSessions([workspace.ownerSession]);
  }
}
