import { normalizeSupabaseTarget, probeFrontendUrl, writeRuntimeRecord } from '../workflow-shared';
import {
  DEFAULT_TEAM_CREATE_EXPECTED_PATH,
  DEFAULT_TEAM_CREATE_FIXTURE_PATH,
  DEFAULT_TEAM_ROLE_ALIASES,
  buildTeamPlaceholders,
  buildTeamWorkspaceRecord,
  closeTeamSessions,
  evaluateTeamExpectationFile,
  getTeamAccountSummary,
  parseTeamWorkflowCliArgs,
  queryTeamRole,
  resolveTeamAccount,
  runTeamCreateStep,
  type TeamWorkflowCliOptions,
} from './team-workflow-shared';

export const TEAMS_CREATE_DATA_WORKFLOW_HELP = `Teams create data workflow

Usage:
  npm run test:teams:create -- --frontend-url http://127.0.0.1:8000 --supabase-url https://fotofiyqnuyvgtotswie.supabase.co
  npm run test:teams:create -- --role teamless-user --frontend-url https://lca.tiangong.earth --supabase-url https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie

Flags:
  --role <name>                    Logical role for the creator (defaults to "teamless-user", resolved to "team-owner")
  --frontend-url <url>             Frontend URL to display and optionally probe
  --supabase-url <url>             Supabase API URL or dashboard project URL
  --supabase-project-url <url>     Explicit dashboard project URL
  --supabase-publishable-key <key> Override SUPABASE_PUBLISHABLE_KEY
  --data-file <path>               Defaults to tests/data-workflows/fixtures/data/teams/001_create_team.json
  --users-file <path>              Legacy JSON fallback, defaults to tests/data-workflows/fixtures/data/users.json after checking .env.users.local
  --workspace-file <path>          Defaults to tests/data-workflows/runtime/teams/team-workspace.last-run.json
  --generate-id                    Generate a fresh runtime team id before create (default)
  --no-generate-id                 Reuse the fixture team id as-is
  --write-runtime                  Write this run's runtime record to a file (default)
  --no-write-runtime               Skip writing the runtime record file
  --runtime-record-file <path>     Override the runtime record output path
  --verify-frontend                Fetch the frontend URL before create (default)
  --no-verify-frontend             Skip the frontend fetch probe
  --help                           Show this help text

Role aliases:
  teamless-user -> team-owner
  invitee-a -> user
  invitee-b -> user
`;

export type TeamsCreateCliOptions = Required<
  Pick<TeamWorkflowCliOptions, 'dataFile' | 'expectedFile' | 'role'>
> &
  Omit<TeamWorkflowCliOptions, 'dataFile' | 'expectedFile' | 'role'>;

export type TeamsCreateSmokeResult = {
  frontendProbe: Awaited<ReturnType<typeof probeFrontendUrl>>;
  ownerRole: Awaited<ReturnType<typeof queryTeamRole>>;
  passed: boolean;
  runtimeRecordFile?: string;
  runtimeRecordWritten: boolean;
  step: Awaited<ReturnType<typeof runTeamCreateStep>>;
  supabaseTarget: ReturnType<typeof normalizeSupabaseTarget>;
  workspaceFile: string;
};

export function parseTeamsCreateCliArgs(
  argv: string[],
  cwd = process.cwd(),
): TeamsCreateCliOptions {
  return parseTeamWorkflowCliArgs(
    argv,
    {
      dataFile: DEFAULT_TEAM_CREATE_FIXTURE_PATH,
      defaultRoles: {
        role: 'teamless-user',
      },
      expectedFile: DEFAULT_TEAM_CREATE_EXPECTED_PATH,
    },
    cwd,
  ) as TeamsCreateCliOptions;
}

export async function runTeamsCreateSmoke(
  options: TeamsCreateCliOptions,
): Promise<TeamsCreateSmokeResult> {
  const supabaseTarget = normalizeSupabaseTarget(options);
  const frontendProbe =
    options.verifyFrontend && options.frontendUrl
      ? await probeFrontendUrl(options.frontendUrl)
      : { ok: true, skipped: true };

  const ownerSession = await resolveTeamAccount({
    role: options.role,
    roleAliases: DEFAULT_TEAM_ROLE_ALIASES,
    supabaseTarget,
    usersFile: options.usersFile,
  });

  try {
    const step = await runTeamCreateStep({
      createDataFile: options.dataFile,
      createExpectedFile: options.expectedFile,
      generateId: options.generateId,
      ownerSession,
    });
    const ownerRole = await queryTeamRole(
      ownerSession.client,
      step.runtimeTeamId,
      ownerSession.user.id,
    );
    const expectationResults = await evaluateTeamExpectationFile({
      context: {
        steps: {
          create: {
            ownerRole,
            team: step.team,
          },
        },
      },
      expectedFile: options.expectedFile,
      placeholders: buildTeamPlaceholders({
        fixtureValues: {
          __FIXTURE_IS_PUBLIC__: step.fixture.isPublic,
          __FIXTURE_JSON__: step.fixture.json,
          __FIXTURE_RANK__: step.fixture.rank,
        },
        ownerSession,
        teamId: step.runtimeTeamId,
      }),
    });
    const passed = expectationResults.every((item) => item.passed);

    const workspaceRecord = buildTeamWorkspaceRecord({
      ownerSession,
      supabaseTarget,
      team: step.team,
      teamId: step.runtimeTeamId,
      workspaceFile: options.workspaceFile,
    });
    await writeRuntimeRecord(options.workspaceFile, workspaceRecord);

    let runtimeRecordWritten = false;
    let runtimeRecordFile: string | undefined;

    if (options.writeRuntime) {
      runtimeRecordFile = options.runtimeRecordFile;
      await writeRuntimeRecord(runtimeRecordFile, {
        accounts: {
          owner: getTeamAccountSummary(ownerSession),
        },
        createdAt: new Date().toISOString(),
        expectationResults,
        fixtureFile: options.dataFile,
        frontendProbe,
        passed,
        requestedRole: options.role,
        runtimeTeamId: step.runtimeTeamId,
        sourceTeamId: step.fixture.teamId,
        step,
        supabase: {
          apiUrl: supabaseTarget.apiUrl,
          dashboardUrl: supabaseTarget.dashboardUrl,
          projectId: supabaseTarget.projectId,
        },
        workspaceFile: options.workspaceFile,
      });
      runtimeRecordWritten = true;
    }

    return {
      frontendProbe,
      ownerRole,
      passed,
      runtimeRecordFile,
      runtimeRecordWritten,
      step,
      supabaseTarget,
      workspaceFile: options.workspaceFile,
    };
  } finally {
    await closeTeamSessions([ownerSession]);
  }
}
