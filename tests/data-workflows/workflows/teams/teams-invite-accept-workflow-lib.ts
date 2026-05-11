import { normalizeSupabaseTarget, pollUntil, writeRuntimeRecord } from '../workflow-shared';
import {
  DEFAULT_TEAM_CREATE_EXPECTED_PATH,
  DEFAULT_TEAM_CREATE_FIXTURE_PATH,
  DEFAULT_TEAM_INVITE_ACCEPT_EXPECTED_PATH,
  DEFAULT_TEAM_INVITE_ACCEPT_FIXTURE_PATH,
  DEFAULT_TEAM_ROLE_ALIASES,
  acceptTeamInvitation,
  buildTeamPlaceholders,
  closeTeamSessions,
  ensureTeamWorkspace,
  evaluateTeamExpectationFile,
  getTeamAccountSummary,
  inviteTeamMember,
  loadTeamInviteWorkflowFixture,
  parseTeamWorkflowCliArgs,
  queryTeamMemberListRole,
  queryTeamNotification,
  queryTeamRole,
  resetTeamMemberState,
  resolveTeamAccount,
  resolveTeamMemberQuery,
  type TeamWorkflowCliOptions,
} from './team-workflow-shared';

export const TEAMS_INVITE_ACCEPT_DATA_WORKFLOW_HELP = `Teams invite-accept data workflow

Usage:
  npm run test:teams:invite-accept -- --frontend-url http://127.0.0.1:8000 --supabase-url https://fotofiyqnuyvgtotswie.supabase.co
  npm run test:teams:invite-accept -- --owner-role team-owner --invitee-role invitee-a --frontend-url https://lca.tiangong.earth --supabase-url https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie

Flags:
  --owner-role <name>              Logical owner role (defaults to "team-owner")
  --invitee-role <name>            Logical invitee role (defaults to "invitee-a", resolved to "user")
  --frontend-url <url>             Frontend URL to display and optionally probe
  --supabase-url <url>             Supabase API URL or dashboard project URL
  --supabase-project-url <url>     Explicit dashboard project URL
  --supabase-publishable-key <key> Override SUPABASE_PUBLISHABLE_KEY
  --create-data-file <path>        Defaults to tests/data-workflows/fixtures/data/teams/001_create_team.json
  --data-file <path>               Defaults to tests/data-workflows/fixtures/data/teams/003_invite_accept_member.json
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

export type TeamsInviteAcceptCliOptions = Required<
  Pick<
    TeamWorkflowCliOptions,
    | 'createDataFile'
    | 'createExpectedFile'
    | 'dataFile'
    | 'expectedFile'
    | 'inviteeRole'
    | 'ownerRole'
  >
> &
  Omit<
    TeamWorkflowCliOptions,
    | 'createDataFile'
    | 'createExpectedFile'
    | 'dataFile'
    | 'expectedFile'
    | 'inviteeRole'
    | 'ownerRole'
  >;

export type TeamsInviteAcceptSmokeResult = {
  bootstrapCreated: boolean;
  expectationResults: Awaited<ReturnType<typeof evaluateTeamExpectationFile>>;
  frontendProbe: Awaited<ReturnType<typeof ensureTeamWorkspace>>['frontendProbe'];
  inviteeNotificationAfterAccept: Awaited<ReturnType<typeof queryTeamNotification>>;
  inviteeRoleAfterAccept: Awaited<ReturnType<typeof queryTeamRole>>;
  inviteeRoleAfterInvite: Awaited<ReturnType<typeof queryTeamRole>>;
  memberListRoleAfterAccept: Awaited<ReturnType<typeof queryTeamMemberListRole>>;
  passed: boolean;
  runtimeRecordFile?: string;
  runtimeRecordWritten: boolean;
  supabaseTarget: ReturnType<typeof normalizeSupabaseTarget>;
  teamId: string;
  workspaceFile: string;
};

export function parseTeamsInviteAcceptCliArgs(
  argv: string[],
  cwd = process.cwd(),
): TeamsInviteAcceptCliOptions {
  return parseTeamWorkflowCliArgs(
    argv,
    {
      createDataFile: DEFAULT_TEAM_CREATE_FIXTURE_PATH,
      createExpectedFile: DEFAULT_TEAM_CREATE_EXPECTED_PATH,
      dataFile: DEFAULT_TEAM_INVITE_ACCEPT_FIXTURE_PATH,
      defaultRoles: {
        inviteeRole: 'invitee-a',
        ownerRole: 'team-owner',
      },
      expectedFile: DEFAULT_TEAM_INVITE_ACCEPT_EXPECTED_PATH,
    },
    cwd,
  ) as TeamsInviteAcceptCliOptions;
}

export async function runTeamsInviteAcceptSmoke(
  options: TeamsInviteAcceptCliOptions,
): Promise<TeamsInviteAcceptSmokeResult> {
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
  const inviteeSession = await resolveTeamAccount({
    role: options.inviteeRole,
    roleAliases: DEFAULT_TEAM_ROLE_ALIASES,
    supabaseTarget,
    usersFile: options.usersFile,
  });

  try {
    const fixture = await loadTeamInviteWorkflowFixture(options.dataFile);
    const notificationDays = fixture.notificationDays ?? 7;
    const memberQuery = resolveTeamMemberQuery(fixture.memberQuery);

    await resetTeamMemberState({
      ownerSession: workspace.ownerSession,
      teamId: workspace.teamId,
      userId: inviteeSession.user.id,
    });

    await inviteTeamMember({
      inviteeEmail: inviteeSession.credential.email,
      ownerSession: workspace.ownerSession,
      teamId: workspace.teamId,
    });

    const inviteeRoleAfterInvite = await pollUntil(
      () => queryTeamRole(workspace.ownerSession.client, workspace.teamId, inviteeSession.user.id),
      (value) => value.exists && value.role === 'is_invited',
    );
    const inviteeNotificationAfterInvite = await pollUntil(
      () => queryTeamNotification(inviteeSession.client, workspace.teamId, notificationDays),
      (value) => value.exists && value.role === 'is_invited',
    );

    await acceptTeamInvitation({
      inviteeSession,
      teamId: workspace.teamId,
    });

    const inviteeRoleAfterAccept = await pollUntil(
      () => queryTeamRole(workspace.ownerSession.client, workspace.teamId, inviteeSession.user.id),
      (value) => value.exists && value.role === 'member',
    );
    const inviteeNotificationAfterAccept = await pollUntil(
      () => queryTeamNotification(inviteeSession.client, workspace.teamId, notificationDays),
      (value) => !value.exists,
    );
    const memberListRoleAfterAccept = await pollUntil(
      () =>
        queryTeamMemberListRole(
          workspace.ownerSession.client,
          workspace.teamId,
          inviteeSession.user.id,
          memberQuery,
        ),
      (value) => value.exists && value.role === 'member',
    );

    const expectationResults = await evaluateTeamExpectationFile({
      context: {
        steps: {
          accept: {
            memberListRole: memberListRoleAfterAccept,
            notification: inviteeNotificationAfterAccept,
            role: inviteeRoleAfterAccept,
          },
          invite: {
            notification: inviteeNotificationAfterInvite,
            role: inviteeRoleAfterInvite,
          },
        },
      },
      expectedFile: options.expectedFile,
      placeholders: buildTeamPlaceholders({
        inviteeSession,
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
          invitee: getTeamAccountSummary(inviteeSession),
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
      expectationResults,
      frontendProbe: workspace.frontendProbe,
      inviteeNotificationAfterAccept,
      inviteeRoleAfterAccept,
      inviteeRoleAfterInvite,
      memberListRoleAfterAccept,
      passed,
      runtimeRecordFile,
      runtimeRecordWritten,
      supabaseTarget,
      teamId: workspace.teamId,
      workspaceFile: options.workspaceFile,
    };
  } finally {
    await closeTeamSessions([workspace.ownerSession, inviteeSession]);
  }
}
