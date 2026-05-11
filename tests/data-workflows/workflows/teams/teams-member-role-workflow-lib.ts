import { normalizeSupabaseTarget, pollUntil, writeRuntimeRecord } from '../workflow-shared';
import {
  DEFAULT_TEAM_CREATE_EXPECTED_PATH,
  DEFAULT_TEAM_CREATE_FIXTURE_PATH,
  DEFAULT_TEAM_MEMBER_ROLE_EXPECTED_PATH,
  DEFAULT_TEAM_MEMBER_ROLE_FIXTURE_PATH,
  DEFAULT_TEAM_ROLE_ALIASES,
  buildTeamPlaceholders,
  closeTeamSessions,
  ensureAcceptedTeamMember,
  ensureTeamWorkspace,
  evaluateTeamExpectationFile,
  getTeamAccountSummary,
  loadTeamMemberRoleFixture,
  parseTeamWorkflowCliArgs,
  queryTeamMemberListRole,
  queryTeamRole,
  removeTeamMember,
  resolveTeamAccount,
  updateTeamMemberRole,
  type TeamWorkflowCliOptions,
} from './team-workflow-shared';

export const TEAMS_MEMBER_ROLE_DATA_WORKFLOW_HELP = `Teams member-role data workflow

Usage:
  npm run test:workflows -- --teams:member-role --frontend-url http://127.0.0.1:8000 --supabase-url https://fotofiyqnuyvgtotswie.supabase.co
  npm run test:workflows -- --teams:member-role --owner-role team-owner --member-role invitee-a --frontend-url https://lca.tiangong.earth --supabase-url https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie

Flags:
  --owner-role <name>              Logical owner role (defaults to "team-owner")
  --member-role <name>             Logical member role (defaults to "invitee-a", resolved to "user")
  --frontend-url <url>             Frontend URL to display and optionally probe
  --supabase-url <url>             Supabase API URL or dashboard project URL
  --supabase-project-url <url>     Explicit dashboard project URL
  --supabase-publishable-key <key> Override SUPABASE_PUBLISHABLE_KEY
  --create-data-file <path>        Defaults to tests/data-workflows/fixtures/data/teams/001_create_team.json
  --data-file <path>               Defaults to tests/data-workflows/fixtures/data/teams/005_member_role_management.json
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

export type TeamsMemberRoleCliOptions = Required<
  Pick<
    TeamWorkflowCliOptions,
    | 'createDataFile'
    | 'createExpectedFile'
    | 'dataFile'
    | 'expectedFile'
    | 'memberRole'
    | 'ownerRole'
  >
> &
  Omit<
    TeamWorkflowCliOptions,
    | 'createDataFile'
    | 'createExpectedFile'
    | 'dataFile'
    | 'expectedFile'
    | 'memberRole'
    | 'ownerRole'
  >;

export type TeamsMemberRoleSmokeResult = {
  bootstrapCreated: boolean;
  demoteMemberListRole: Awaited<ReturnType<typeof queryTeamMemberListRole>>;
  demoteRole: Awaited<ReturnType<typeof queryTeamRole>>;
  expectationResults: Awaited<ReturnType<typeof evaluateTeamExpectationFile>>;
  frontendProbe: Awaited<ReturnType<typeof ensureTeamWorkspace>>['frontendProbe'];
  passed: boolean;
  promoteMemberListRole: Awaited<ReturnType<typeof queryTeamMemberListRole>>;
  promoteRole: Awaited<ReturnType<typeof queryTeamRole>>;
  removeMemberListRole: Awaited<ReturnType<typeof queryTeamMemberListRole>>;
  removeRole: Awaited<ReturnType<typeof queryTeamRole>>;
  runtimeRecordFile?: string;
  runtimeRecordWritten: boolean;
  supabaseTarget: ReturnType<typeof normalizeSupabaseTarget>;
  teamId: string;
  workspaceFile: string;
};

export function parseTeamsMemberRoleCliArgs(
  argv: string[],
  cwd = process.cwd(),
): TeamsMemberRoleCliOptions {
  return parseTeamWorkflowCliArgs(
    argv,
    {
      createDataFile: DEFAULT_TEAM_CREATE_FIXTURE_PATH,
      createExpectedFile: DEFAULT_TEAM_CREATE_EXPECTED_PATH,
      dataFile: DEFAULT_TEAM_MEMBER_ROLE_FIXTURE_PATH,
      defaultRoles: {
        memberRole: 'invitee-a',
        ownerRole: 'team-owner',
      },
      expectedFile: DEFAULT_TEAM_MEMBER_ROLE_EXPECTED_PATH,
    },
    cwd,
  ) as TeamsMemberRoleCliOptions;
}

export async function runTeamsMemberRoleSmoke(
  options: TeamsMemberRoleCliOptions,
): Promise<TeamsMemberRoleSmokeResult> {
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
  const memberSession = await resolveTeamAccount({
    role: options.memberRole,
    roleAliases: DEFAULT_TEAM_ROLE_ALIASES,
    supabaseTarget,
    usersFile: options.usersFile,
  });

  try {
    const fixture = await loadTeamMemberRoleFixture(options.dataFile);

    await ensureAcceptedTeamMember({
      inviteeSession: memberSession,
      memberQuery: fixture.memberQuery,
      notificationDays: fixture.notificationDays,
      ownerSession: workspace.ownerSession,
      teamId: workspace.teamId,
    });

    await updateTeamMemberRole({
      ownerSession: workspace.ownerSession,
      role: fixture.promoteTo,
      teamId: workspace.teamId,
      userId: memberSession.user.id,
    });

    const promoteRole = await pollUntil(
      () => queryTeamRole(workspace.ownerSession.client, workspace.teamId, memberSession.user.id),
      (value) => value.exists && value.role === fixture.promoteTo,
    );
    const promoteMemberListRole = await pollUntil(
      () =>
        queryTeamMemberListRole(
          workspace.ownerSession.client,
          workspace.teamId,
          memberSession.user.id,
        ),
      (value) => value.exists && value.role === fixture.promoteTo,
    );

    await updateTeamMemberRole({
      ownerSession: workspace.ownerSession,
      role: fixture.demoteTo,
      teamId: workspace.teamId,
      userId: memberSession.user.id,
    });

    const demoteRole = await pollUntil(
      () => queryTeamRole(workspace.ownerSession.client, workspace.teamId, memberSession.user.id),
      (value) => value.exists && value.role === fixture.demoteTo,
    );
    const demoteMemberListRole = await pollUntil(
      () =>
        queryTeamMemberListRole(
          workspace.ownerSession.client,
          workspace.teamId,
          memberSession.user.id,
        ),
      (value) => value.exists && value.role === fixture.demoteTo,
    );

    await removeTeamMember({
      ownerSession: workspace.ownerSession,
      teamId: workspace.teamId,
      userId: memberSession.user.id,
    });

    const removeRole = await pollUntil(
      () => queryTeamRole(workspace.ownerSession.client, workspace.teamId, memberSession.user.id),
      (value) => !value.exists,
    );
    const removeMemberListRole = await pollUntil(
      () =>
        queryTeamMemberListRole(
          workspace.ownerSession.client,
          workspace.teamId,
          memberSession.user.id,
        ),
      (value) => !value.exists,
    );

    const expectationResults = await evaluateTeamExpectationFile({
      context: {
        steps: {
          demote: {
            memberListRole: demoteMemberListRole,
            role: demoteRole,
          },
          promote: {
            memberListRole: promoteMemberListRole,
            role: promoteRole,
          },
          remove: {
            memberListRole: removeMemberListRole,
            role: removeRole,
          },
        },
      },
      expectedFile: options.expectedFile,
      placeholders: buildTeamPlaceholders({
        memberSession,
        ownerSession: workspace.ownerSession,
        teamId: workspace.teamId,
      }),
    });
    const passed = expectationResults.every((item) => item.passed);

    let runtimeRecordWritten = false;
    let runtimeRecordFile: string | undefined;

    if (options.writeRuntime) {
      runtimeRecordFile = options.runtimeRecordFile;
      await writeRuntimeRecord(runtimeRecordFile, {
        accounts: {
          member: getTeamAccountSummary(memberSession),
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
        teamId: workspace.teamId,
        workspaceFile: options.workspaceFile,
      });
      runtimeRecordWritten = true;
    }

    return {
      bootstrapCreated: workspace.workspaceAction === 'created',
      demoteMemberListRole,
      demoteRole,
      expectationResults,
      frontendProbe: workspace.frontendProbe,
      passed,
      promoteMemberListRole,
      promoteRole,
      removeMemberListRole,
      removeRole,
      runtimeRecordFile,
      runtimeRecordWritten,
      supabaseTarget,
      teamId: workspace.teamId,
      workspaceFile: options.workspaceFile,
    };
  } finally {
    await closeTeamSessions([workspace.ownerSession, memberSession]);
  }
}
