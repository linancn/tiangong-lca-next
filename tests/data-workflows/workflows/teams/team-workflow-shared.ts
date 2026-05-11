import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { FunctionRegion } from '@supabase/supabase-js';

import {
  buildDataWorkflowDataFixturePath,
  buildDataWorkflowExpectedFixturePath,
  buildDataWorkflowRuntimePath,
} from '../../data-workflow-paths';
import {
  DEFAULT_USERS_PATH,
  createSignedInUserSession,
  evaluateStructuredExpectations,
  loadUsersConfig,
  parseBoolean,
  pickCredentialByRole,
  pollUntil,
  probeFrontendUrl,
  readJsonFile,
  requireFlagValue,
  resolveRuntimeRecordFilePath,
  signOutUserSession,
  splitFlag,
  writeRuntimeRecord,
  type FrontendProbeResult,
  type SignedInUserSession,
  type StructuredExpectation,
  type StructuredExpectationResult,
  type SupabaseTarget,
} from '../workflow-shared';

export const DEFAULT_TEAM_CREATE_FIXTURE_PATH = buildDataWorkflowDataFixturePath(
  'teams',
  '001_create_team.json',
);
export const DEFAULT_TEAM_CREATE_EXPECTED_PATH = buildDataWorkflowExpectedFixturePath(
  'teams',
  '001_create_team.md',
);
export const DEFAULT_TEAM_EDIT_FIXTURE_PATH = buildDataWorkflowDataFixturePath(
  'teams',
  '002_edit_team_profile.json',
);
export const DEFAULT_TEAM_EDIT_EXPECTED_PATH = buildDataWorkflowExpectedFixturePath(
  'teams',
  '002_edit_team_profile.md',
);
export const DEFAULT_TEAM_INVITE_ACCEPT_FIXTURE_PATH = buildDataWorkflowDataFixturePath(
  'teams',
  '003_invite_accept_member.json',
);
export const DEFAULT_TEAM_INVITE_ACCEPT_EXPECTED_PATH = buildDataWorkflowExpectedFixturePath(
  'teams',
  '003_invite_accept_member.md',
);
export const DEFAULT_TEAM_REJECT_REINVITE_FIXTURE_PATH = buildDataWorkflowDataFixturePath(
  'teams',
  '004_reject_reinvite_member.json',
);
export const DEFAULT_TEAM_REJECT_REINVITE_EXPECTED_PATH = buildDataWorkflowExpectedFixturePath(
  'teams',
  '004_reject_reinvite_member.md',
);
export const DEFAULT_TEAM_MEMBER_ROLE_FIXTURE_PATH = buildDataWorkflowDataFixturePath(
  'teams',
  '005_member_role_management.json',
);
export const DEFAULT_TEAM_MEMBER_ROLE_EXPECTED_PATH = buildDataWorkflowExpectedFixturePath(
  'teams',
  '005_member_role_management.md',
);
export const DEFAULT_TEAM_HOMEPAGE_RANK_FIXTURE_PATH = buildDataWorkflowDataFixturePath(
  'teams',
  '006_homepage_rank_management.json',
);
export const DEFAULT_TEAM_HOMEPAGE_RANK_EXPECTED_PATH = buildDataWorkflowExpectedFixturePath(
  'teams',
  '006_homepage_rank_management.md',
);
export const DEFAULT_TEAM_WORKSPACE_FILE = buildDataWorkflowRuntimePath(
  'teams',
  'team-workspace.last-run.json',
);

export const DEFAULT_TEAM_ROLE_ALIASES = Object.freeze({
  'invitee-a': 'user',
  'invitee-b': 'user',
  'teamless-user': 'team-owner',
});

const DEFAULT_MEMBER_QUERY = {
  current: 1,
  pageSize: 100,
  sortBy: 'created_at',
  sortOrder: 'desc',
} as const;

type CommonFlag =
  | 'create-data-file'
  | 'data-file'
  | 'frontend-url'
  | 'generate-id'
  | 'help'
  | 'invitee-role'
  | 'member-role'
  | 'no-generate-id'
  | 'no-verify-frontend'
  | 'no-write-runtime'
  | 'owner-role'
  | 'role'
  | 'runtime-record-file'
  | 'supabase-project-url'
  | 'supabase-publishable-key'
  | 'supabase-url'
  | 'system-role'
  | 'users-file'
  | 'verify-frontend'
  | 'workspace-file'
  | 'write-runtime';

export type TeamJson = Record<string, unknown>;

export type TeamCreateFixture = {
  isPublic: boolean;
  json: TeamJson;
  rank: number;
  teamId: string;
};

export type TeamEditFixture = {
  isPublic: boolean;
  json: TeamJson;
  rank?: number;
};

export type TeamInviteWorkflowFixture = {
  memberQuery?: Partial<TeamMemberQueryOptions>;
  notificationDays?: number;
};

export type TeamMemberRoleFixture = {
  demoteTo: 'member';
  memberQuery?: Partial<TeamMemberQueryOptions>;
  notificationDays?: number;
  promoteTo: 'admin';
};

export type TeamHomepageRankFixture = {
  hiddenRank: number;
  visibleRank: number;
};

export type TeamMemberQueryOptions = {
  current: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
};

export type TeamWorkflowCliOptions = {
  createDataFile?: string;
  createExpectedFile?: string;
  dataFile?: string;
  expectedFile?: string;
  frontendUrl?: string;
  generateId: boolean;
  help: boolean;
  inviteeRole?: string;
  memberRole?: string;
  ownerRole?: string;
  role?: string;
  runtimeRecordFile: string;
  supabaseProjectUrl?: string;
  supabasePublishableKey?: string;
  supabaseUrl?: string;
  systemRole?: string;
  usersFile: string;
  verifyFrontend: boolean;
  workspaceFile: string;
  writeRuntime: boolean;
};

export type TeamRowSnapshot = {
  exists: boolean;
  id: string | null;
  is_public: boolean | null;
  json: TeamJson | null;
  rank: number | null;
};

export type TeamRoleSnapshot = {
  display_name: string | null;
  email: string | null;
  exists: boolean;
  role: string | null;
  team_id: string | null;
  user_id: string | null;
};

export type TeamNotificationSnapshot = {
  exists: boolean;
  role: string | null;
  team_id: string | null;
  user_id: string | null;
};

export type TeamCreateStepResult = {
  commandResponse: unknown;
  expectationResults: StructuredExpectationResult[];
  fixture: TeamCreateFixture;
  ownerRole: TeamRoleSnapshot;
  passed: boolean;
  runtimeTeamId: string;
  team: TeamRowSnapshot;
};

export type TeamWorkspaceRecord = {
  createdAt: string;
  latestTeamSnapshot: {
    isPublic: boolean | null;
    rank: number | null;
  };
  owner: {
    email: string;
    requestedRole: string;
    resolvedRole: string;
    userId: string;
  };
  supabase: {
    apiUrl: string;
    dashboardUrl?: string;
    projectId?: string;
  };
  teamId: string;
  updatedAt: string;
  workspaceFile: string;
};

export type EnsuredTeamWorkspace = {
  createStep?: TeamCreateStepResult;
  frontendProbe: FrontendProbeResult;
  ownerSession: SignedInUserSession;
  team: TeamRowSnapshot;
  teamId: string;
  workspaceAction: 'created' | 'reused';
  workspaceFile: string;
  workspaceRecord: TeamWorkspaceRecord;
};

export type TeamWorkflowAccountSummary = {
  email: string;
  requestedRole: string;
  resolvedRole: string;
  userId: string;
};

export function parseTeamWorkflowCliArgs(
  argv: string[],
  config: {
    createDataFile?: string;
    createExpectedFile?: string;
    dataFile?: string;
    defaultRoles?: Partial<
      Pick<
        TeamWorkflowCliOptions,
        'inviteeRole' | 'memberRole' | 'ownerRole' | 'role' | 'systemRole'
      >
    >;
    expectedFile?: string;
  },
  cwd = process.cwd(),
): TeamWorkflowCliOptions {
  let runtimeRecordFileExplicit = false;

  const anchorFile = config.dataFile ?? config.createDataFile ?? DEFAULT_TEAM_CREATE_FIXTURE_PATH;

  const options: TeamWorkflowCliOptions = {
    createDataFile: config.createDataFile ? path.resolve(cwd, config.createDataFile) : undefined,
    createExpectedFile: config.createExpectedFile
      ? path.resolve(cwd, config.createExpectedFile)
      : undefined,
    dataFile: config.dataFile ? path.resolve(cwd, config.dataFile) : undefined,
    expectedFile: config.expectedFile ? path.resolve(cwd, config.expectedFile) : undefined,
    generateId: true,
    help: false,
    runtimeRecordFile: resolveRuntimeRecordFilePath(path.resolve(cwd, anchorFile), cwd),
    usersFile: path.resolve(cwd, DEFAULT_USERS_PATH),
    verifyFrontend: true,
    workspaceFile: path.resolve(cwd, DEFAULT_TEAM_WORKSPACE_FILE),
    writeRuntime: true,
    ...config.defaultRoles,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith('--')) {
      throw new Error(`Unsupported positional argument: ${arg}`);
    }

    const [rawFlag, inlineValue] = splitFlag(arg);
    const flag = rawFlag as CommonFlag;

    switch (flag) {
      case 'help':
        options.help = true;
        break;
      case 'generate-id':
        options.generateId =
          inlineValue === undefined ? true : parseBoolean(inlineValue, 'generate-id');
        break;
      case 'no-generate-id':
        options.generateId = false;
        break;
      case 'verify-frontend':
        options.verifyFrontend =
          inlineValue === undefined ? true : parseBoolean(inlineValue, 'verify-frontend');
        break;
      case 'no-verify-frontend':
        options.verifyFrontend = false;
        break;
      case 'write-runtime':
        options.writeRuntime =
          inlineValue === undefined ? true : parseBoolean(inlineValue, 'write-runtime');
        break;
      case 'no-write-runtime':
        options.writeRuntime = false;
        break;
      case 'role':
      case 'owner-role':
      case 'invitee-role':
      case 'member-role':
      case 'system-role': {
        const resolved = requireFlagValue(flag, inlineValue, () => {
          index += 1;
          return argv[index];
        });

        if (flag === 'role') {
          options.role = resolved;
        } else if (flag === 'owner-role') {
          options.ownerRole = resolved;
        } else if (flag === 'invitee-role') {
          options.inviteeRole = resolved;
        } else if (flag === 'member-role') {
          options.memberRole = resolved;
        } else {
          options.systemRole = resolved;
        }
        break;
      }
      case 'frontend-url':
        options.frontendUrl = requireFlagValue(flag, inlineValue, () => {
          index += 1;
          return argv[index];
        });
        break;
      case 'supabase-url':
        options.supabaseUrl = requireFlagValue(flag, inlineValue, () => {
          index += 1;
          return argv[index];
        });
        break;
      case 'supabase-project-url':
        options.supabaseProjectUrl = requireFlagValue(flag, inlineValue, () => {
          index += 1;
          return argv[index];
        });
        break;
      case 'supabase-publishable-key':
        options.supabasePublishableKey = requireFlagValue(flag, inlineValue, () => {
          index += 1;
          return argv[index];
        });
        break;
      case 'users-file':
        options.usersFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, () => {
            index += 1;
            return argv[index];
          }),
        );
        break;
      case 'workspace-file':
        options.workspaceFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, () => {
            index += 1;
            return argv[index];
          }),
        );
        break;
      case 'runtime-record-file':
        options.runtimeRecordFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, () => {
            index += 1;
            return argv[index];
          }),
        );
        options.writeRuntime = true;
        runtimeRecordFileExplicit = true;
        break;
      case 'create-data-file':
        options.createDataFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, () => {
            index += 1;
            return argv[index];
          }),
        );
        break;
      case 'data-file':
        options.dataFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, () => {
            index += 1;
            return argv[index];
          }),
        );
        if (!runtimeRecordFileExplicit) {
          options.runtimeRecordFile = resolveRuntimeRecordFilePath(options.dataFile, cwd);
        }
        break;
      default:
        throw new Error(`Unknown flag: --${flag}`);
    }
  }

  return options;
}

export async function loadTeamCreateFixture(filePath: string): Promise<TeamCreateFixture> {
  const fixture = await readJsonFile<TeamCreateFixture>(filePath);

  if (!fixture || typeof fixture !== 'object') {
    throw new Error(`Invalid team create fixture: ${filePath}`);
  }

  if (!fixture.teamId || typeof fixture.teamId !== 'string') {
    throw new Error(`Team create fixture is missing a valid "teamId": ${filePath}`);
  }

  if (!fixture.json || typeof fixture.json !== 'object' || Array.isArray(fixture.json)) {
    throw new Error(`Team create fixture is missing a valid "json": ${filePath}`);
  }

  if (typeof fixture.rank !== 'number') {
    throw new Error(`Team create fixture is missing a valid "rank": ${filePath}`);
  }

  if (typeof fixture.isPublic !== 'boolean') {
    throw new Error(`Team create fixture is missing a valid "isPublic": ${filePath}`);
  }

  return fixture;
}

export async function loadTeamEditFixture(filePath: string): Promise<TeamEditFixture> {
  const fixture = await readJsonFile<TeamEditFixture>(filePath);

  if (!fixture || typeof fixture !== 'object') {
    throw new Error(`Invalid team edit fixture: ${filePath}`);
  }

  if (!fixture.json || typeof fixture.json !== 'object' || Array.isArray(fixture.json)) {
    throw new Error(`Team edit fixture is missing a valid "json": ${filePath}`);
  }

  if (typeof fixture.isPublic !== 'boolean') {
    throw new Error(`Team edit fixture is missing a valid "isPublic": ${filePath}`);
  }

  if (typeof fixture.rank !== 'undefined' && typeof fixture.rank !== 'number') {
    throw new Error(`Team edit fixture "rank" must be a number when provided: ${filePath}`);
  }

  return fixture;
}

export async function loadTeamInviteWorkflowFixture(
  filePath: string,
): Promise<TeamInviteWorkflowFixture> {
  const fixture = await readJsonFile<TeamInviteWorkflowFixture>(filePath);

  if (!fixture || typeof fixture !== 'object') {
    throw new Error(`Invalid team invite workflow fixture: ${filePath}`);
  }

  return fixture;
}

export async function loadTeamMemberRoleFixture(filePath: string): Promise<TeamMemberRoleFixture> {
  const fixture = await readJsonFile<TeamMemberRoleFixture>(filePath);

  if (!fixture || typeof fixture !== 'object') {
    throw new Error(`Invalid team member-role fixture: ${filePath}`);
  }

  if (fixture.promoteTo !== 'admin') {
    throw new Error(`Team member-role fixture must set "promoteTo" to "admin": ${filePath}`);
  }

  if (fixture.demoteTo !== 'member') {
    throw new Error(`Team member-role fixture must set "demoteTo" to "member": ${filePath}`);
  }

  return fixture;
}

export async function loadTeamHomepageRankFixture(
  filePath: string,
): Promise<TeamHomepageRankFixture> {
  const fixture = await readJsonFile<TeamHomepageRankFixture>(filePath);

  if (!fixture || typeof fixture !== 'object') {
    throw new Error(`Invalid team homepage-rank fixture: ${filePath}`);
  }

  if (typeof fixture.hiddenRank !== 'number' || typeof fixture.visibleRank !== 'number') {
    throw new Error(
      `Team homepage-rank fixture must provide numeric "hiddenRank" and "visibleRank": ${filePath}`,
    );
  }

  return fixture;
}

export function resolveTeamMemberQuery(
  input?: Partial<TeamMemberQueryOptions>,
): TeamMemberQueryOptions {
  return {
    current: input?.current ?? DEFAULT_MEMBER_QUERY.current,
    pageSize: input?.pageSize ?? DEFAULT_MEMBER_QUERY.pageSize,
    sortBy: input?.sortBy ?? DEFAULT_MEMBER_QUERY.sortBy,
    sortOrder: input?.sortOrder ?? DEFAULT_MEMBER_QUERY.sortOrder,
  };
}

export async function ensureTeamWorkspace(input: {
  createDataFile: string;
  createExpectedFile: string;
  frontendUrl?: string;
  generateId: boolean;
  ownerRole: string;
  roleAliases?: Record<string, string>;
  supabaseTarget: SupabaseTarget;
  usersFile: string;
  verifyFrontend: boolean;
  workspaceFile: string;
}): Promise<EnsuredTeamWorkspace> {
  const { sourceLabel, users } = await loadUsersConfig(input.usersFile);
  const ownerCredential = pickCredentialByRole(
    users,
    input.ownerRole,
    sourceLabel,
    input.roleAliases ?? DEFAULT_TEAM_ROLE_ALIASES,
  );
  const ownerSession = await createSignedInUserSession(input.supabaseTarget, ownerCredential);

  const frontendProbe =
    input.verifyFrontend && input.frontendUrl
      ? await probeFrontendUrl(input.frontendUrl)
      : { ok: true, skipped: true };

  const workspaceRecord = await readTeamWorkspaceRecord(input.workspaceFile);
  if (workspaceRecord && isWorkspaceRecordCompatible(workspaceRecord, input.supabaseTarget)) {
    const [team, ownerRole] = await Promise.all([
      queryTeamRow(ownerSession.client, workspaceRecord.teamId),
      queryTeamRole(ownerSession.client, workspaceRecord.teamId, ownerSession.user.id),
    ]);

    if (team.exists && ownerRole.exists && ownerRole.role === 'owner') {
      const nextWorkspaceRecord = buildTeamWorkspaceRecord({
        ownerSession,
        supabaseTarget: input.supabaseTarget,
        team,
        teamId: workspaceRecord.teamId,
        workspaceFile: input.workspaceFile,
        createdAt: workspaceRecord.createdAt,
      });
      await writeRuntimeRecord(input.workspaceFile, nextWorkspaceRecord);

      return {
        frontendProbe,
        ownerSession,
        team,
        teamId: workspaceRecord.teamId,
        workspaceAction: 'reused',
        workspaceFile: input.workspaceFile,
        workspaceRecord: nextWorkspaceRecord,
      };
    }
  }

  const createStep = await runTeamCreateStep({
    createDataFile: input.createDataFile,
    createExpectedFile: input.createExpectedFile,
    generateId: input.generateId,
    ownerSession,
  });
  const workspace = buildTeamWorkspaceRecord({
    ownerSession,
    supabaseTarget: input.supabaseTarget,
    team: createStep.team,
    teamId: createStep.runtimeTeamId,
    workspaceFile: input.workspaceFile,
  });
  await writeRuntimeRecord(input.workspaceFile, workspace);

  return {
    createStep,
    frontendProbe,
    ownerSession,
    team: createStep.team,
    teamId: createStep.runtimeTeamId,
    workspaceAction: 'created',
    workspaceFile: input.workspaceFile,
    workspaceRecord: workspace,
  };
}

export async function resolveTeamAccount(input: {
  role: string;
  roleAliases?: Record<string, string>;
  supabaseTarget: SupabaseTarget;
  usersFile: string;
}): Promise<SignedInUserSession> {
  const { sourceLabel, users } = await loadUsersConfig(input.usersFile);
  const credential = pickCredentialByRole(
    users,
    input.role,
    sourceLabel,
    input.roleAliases ?? DEFAULT_TEAM_ROLE_ALIASES,
  );
  return createSignedInUserSession(input.supabaseTarget, credential);
}

export async function runTeamCreateStep(input: {
  createDataFile: string;
  createExpectedFile: string;
  generateId: boolean;
  ownerSession: SignedInUserSession;
  generateIdFn?: () => string;
}): Promise<TeamCreateStepResult> {
  const fixture = await loadTeamCreateFixture(input.createDataFile);
  const runtimeTeamId = input.generateId ? (input.generateIdFn ?? randomUUID)() : fixture.teamId;

  const createResult = await invokeTeamCommand(input.ownerSession, 'app_team_create', {
    isPublic: fixture.isPublic,
    json: fixture.json,
    rank: fixture.rank,
    teamId: runtimeTeamId,
  });
  const commandError = getCommandError(createResult);

  if (commandError) {
    const duplicateHint =
      String(commandError.message ?? '')
        .toLowerCase()
        .includes('exist') ||
      String(commandError.code ?? '')
        .toLowerCase()
        .includes('exist')
        ? ' Try the default --generate-id behavior or a different owner account.'
        : '';
    throw new Error(
      `Create team failed: ${commandError.message ?? 'unknown error'}.${duplicateHint}`,
    );
  }

  const team = await pollUntil(
    () => queryTeamRow(input.ownerSession.client, runtimeTeamId),
    (value) => value.exists,
  );
  const ownerRole = await pollUntil(
    () => queryTeamRole(input.ownerSession.client, runtimeTeamId, input.ownerSession.user.id),
    (value) => value.exists && value.role === 'owner',
  );

  const expectationResults = await evaluateTeamExpectationFile({
    expectedFile: input.createExpectedFile,
    placeholders: buildTeamPlaceholders({
      fixtureValues: {
        __FIXTURE_IS_PUBLIC__: fixture.isPublic,
        __FIXTURE_JSON__: fixture.json,
        __FIXTURE_RANK__: fixture.rank,
      },
      ownerSession: input.ownerSession,
      teamId: runtimeTeamId,
    }),
    context: {
      steps: {
        create: {
          ownerRole,
          team,
        },
      },
    },
  });

  const passed = expectationResults.every((item) => item.passed);
  if (!passed) {
    throw new Error('Create team expectations did not pass.');
  }

  return {
    commandResponse: createResult.data,
    expectationResults,
    fixture,
    ownerRole,
    passed,
    runtimeTeamId,
    team,
  };
}

export async function editTeamProfile(input: {
  isPublic: boolean;
  json: TeamJson;
  ownerSession: SignedInUserSession;
  rank?: number;
  teamId: string;
}) {
  const profileResult = await invokeTeamCommand(input.ownerSession, 'app_team_update_profile', {
    isPublic: input.isPublic,
    json: input.json,
    teamId: input.teamId,
  });
  const profileError = getCommandError(profileResult);

  if (profileError) {
    throw new Error(`Edit team profile failed: ${profileError.message ?? 'unknown error'}`);
  }

  if (typeof input.rank !== 'number') {
    return profileResult.data;
  }

  const rankResult = await invokeTeamCommand(input.ownerSession, 'admin_team_set_rank', {
    rank: input.rank,
    teamId: input.teamId,
  });
  const rankError = getCommandError(rankResult);

  if (rankError) {
    throw new Error(`Edit team rank failed: ${rankError.message ?? 'unknown error'}`);
  }

  return {
    profile: profileResult.data,
    rank: rankResult.data,
  };
}

export async function inviteTeamMember(input: {
  inviteeEmail: string;
  ownerSession: SignedInUserSession;
  teamId: string;
}) {
  const userId = await resolveUserIdByEmail(input.ownerSession.client, input.inviteeEmail);
  if (!userId) {
    throw new Error(`Invite target email was not found: ${input.inviteeEmail}`);
  }

  const inviteResult = await invokeTeamCommand(
    input.ownerSession,
    'admin_team_change_member_role',
    {
      action: 'set',
      role: 'is_invited',
      teamId: input.teamId,
      userId,
    },
  );
  const inviteError = getCommandError(inviteResult);

  if (inviteError) {
    throw new Error(`Invite team member failed: ${inviteError.message ?? 'unknown error'}`);
  }

  return {
    inviteResult: inviteResult.data,
    userId,
  };
}

export async function acceptTeamInvitation(input: {
  inviteeSession: SignedInUserSession;
  teamId: string;
}) {
  const acceptResult = await invokeTeamCommand(input.inviteeSession, 'app_team_accept_invitation', {
    teamId: input.teamId,
  });
  const acceptError = getCommandError(acceptResult);

  if (acceptError) {
    throw new Error(`Accept team invitation failed: ${acceptError.message ?? 'unknown error'}`);
  }

  return acceptResult.data;
}

export async function rejectTeamInvitation(input: {
  inviteeSession: SignedInUserSession;
  teamId: string;
}) {
  const rejectResult = await invokeTeamCommand(input.inviteeSession, 'app_team_reject_invitation', {
    teamId: input.teamId,
  });
  const rejectError = getCommandError(rejectResult);

  if (rejectError) {
    throw new Error(`Reject team invitation failed: ${rejectError.message ?? 'unknown error'}`);
  }

  return rejectResult.data;
}

export async function reinviteTeamMember(input: {
  ownerSession: SignedInUserSession;
  teamId: string;
  userId: string;
}) {
  const reinviteResult = await invokeTeamCommand(input.ownerSession, 'admin_team_reinvite_member', {
    teamId: input.teamId,
    userId: input.userId,
  });
  const reinviteError = getCommandError(reinviteResult);

  if (reinviteError) {
    throw new Error(`Re-invite team member failed: ${reinviteError.message ?? 'unknown error'}`);
  }

  return reinviteResult.data;
}

export async function updateTeamMemberRole(input: {
  ownerSession: SignedInUserSession;
  role: 'admin' | 'member';
  teamId: string;
  userId: string;
}) {
  const updateResult = await invokeTeamCommand(
    input.ownerSession,
    'admin_team_change_member_role',
    {
      action: 'set',
      role: input.role,
      teamId: input.teamId,
      userId: input.userId,
    },
  );
  const updateError = getCommandError(updateResult);

  if (updateError) {
    throw new Error(`Update team member role failed: ${updateError.message ?? 'unknown error'}`);
  }

  return updateResult.data;
}

export async function removeTeamMember(input: {
  ownerSession: SignedInUserSession;
  teamId: string;
  userId: string;
}) {
  const removeResult = await invokeTeamCommand(
    input.ownerSession,
    'admin_team_change_member_role',
    {
      action: 'remove',
      teamId: input.teamId,
      userId: input.userId,
    },
  );
  const removeError = getCommandError(removeResult);

  if (removeError) {
    throw new Error(`Remove team member failed: ${removeError.message ?? 'unknown error'}`);
  }

  return removeResult.data;
}

export async function updateHomepageRank(input: {
  rank: number;
  systemSession: SignedInUserSession;
  teamId: string;
}) {
  const rankResult = await invokeTeamCommand(input.systemSession, 'admin_team_set_rank', {
    rank: input.rank,
    teamId: input.teamId,
  });
  const rankError = getCommandError(rankResult);

  if (rankError) {
    throw new Error(`Update homepage rank failed: ${rankError.message ?? 'unknown error'}`);
  }

  return rankResult.data;
}

export async function resetTeamMemberState(input: {
  ownerSession: SignedInUserSession;
  teamId: string;
  userId: string;
}) {
  const existingRole = await queryTeamRole(input.ownerSession.client, input.teamId, input.userId);
  if (!existingRole.exists) {
    return existingRole;
  }

  await removeTeamMember(input);

  return pollUntil(
    () => queryTeamRole(input.ownerSession.client, input.teamId, input.userId),
    (value) => !value.exists,
  );
}

export async function ensureAcceptedTeamMember(input: {
  inviteeSession: SignedInUserSession;
  memberQuery?: Partial<TeamMemberQueryOptions>;
  notificationDays?: number;
  ownerSession: SignedInUserSession;
  teamId: string;
}) {
  await resetTeamMemberState({
    ownerSession: input.ownerSession,
    teamId: input.teamId,
    userId: input.inviteeSession.user.id,
  });

  await inviteTeamMember({
    inviteeEmail: input.inviteeSession.credential.email,
    ownerSession: input.ownerSession,
    teamId: input.teamId,
  });

  await pollUntil(
    () => queryTeamRole(input.ownerSession.client, input.teamId, input.inviteeSession.user.id),
    (value) => value.exists && value.role === 'is_invited',
  );
  await acceptTeamInvitation({
    inviteeSession: input.inviteeSession,
    teamId: input.teamId,
  });

  const role = await pollUntil(
    () => queryTeamRole(input.ownerSession.client, input.teamId, input.inviteeSession.user.id),
    (value) => value.exists && value.role === 'member',
  );
  const memberListRole = await pollUntil(
    () =>
      queryTeamMemberListRole(
        input.ownerSession.client,
        input.teamId,
        input.inviteeSession.user.id,
        resolveTeamMemberQuery(input.memberQuery),
      ),
    (value) => value.exists && value.role === 'member',
  );
  const notification = await queryTeamNotification(
    input.inviteeSession.client,
    input.teamId,
    input.notificationDays ?? 7,
  );

  return {
    memberListRole,
    notification,
    role,
  };
}

export async function queryTeamRow(
  client: SignedInUserSession['client'],
  teamId: string,
): Promise<TeamRowSnapshot> {
  const result = await client
    .from('teams')
    .select('id,json,rank,is_public')
    .eq('id', teamId)
    .maybeSingle();

  if (result.error || !result.data) {
    return {
      exists: false,
      id: null,
      is_public: null,
      json: null,
      rank: null,
    };
  }

  return {
    exists: true,
    id: result.data.id,
    is_public: typeof result.data.is_public === 'boolean' ? result.data.is_public : null,
    json: (result.data.json ?? null) as TeamJson | null,
    rank: typeof result.data.rank === 'number' ? result.data.rank : null,
  };
}

export async function queryTeamRole(
  client: SignedInUserSession['client'],
  teamId: string,
  userId: string,
): Promise<TeamRoleSnapshot> {
  const result = await client
    .from('roles')
    .select('user_id,team_id,role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle();

  if (result.error || !result.data) {
    return emptyTeamRoleSnapshot();
  }

  return {
    display_name: null,
    email: null,
    exists: true,
    role: typeof result.data.role === 'string' ? result.data.role : null,
    team_id: typeof result.data.team_id === 'string' ? result.data.team_id : null,
    user_id: typeof result.data.user_id === 'string' ? result.data.user_id : null,
  };
}

export async function queryTeamNotification(
  client: SignedInUserSession['client'],
  teamId: string,
  notificationDays: number,
): Promise<TeamNotificationSnapshot> {
  const result = await client.rpc('qry_notification_get_my_team_items', {
    p_days: notificationDays,
  });

  if (result.error || !Array.isArray(result.data)) {
    return {
      exists: false,
      role: null,
      team_id: null,
      user_id: null,
    };
  }

  const rows = result.data as Array<Record<string, unknown>>;
  const matched = rows.find((item) => item?.team_id === teamId);
  if (!matched) {
    return {
      exists: false,
      role: null,
      team_id: null,
      user_id: null,
    };
  }

  return {
    exists: true,
    role: typeof matched.role === 'string' ? matched.role : null,
    team_id: typeof matched.team_id === 'string' ? matched.team_id : null,
    user_id: typeof matched.user_id === 'string' ? matched.user_id : null,
  };
}

export async function queryTeamMemberListRole(
  client: SignedInUserSession['client'],
  teamId: string,
  userId: string,
  options: TeamMemberQueryOptions = resolveTeamMemberQuery(),
): Promise<TeamRoleSnapshot> {
  const result = await client.rpc('qry_team_get_member_list', {
    p_page: options.current,
    p_page_size: options.pageSize,
    p_sort_by: options.sortBy,
    p_sort_order: options.sortOrder,
    p_team_id: teamId,
  });

  if (result.error || !Array.isArray(result.data)) {
    return emptyTeamRoleSnapshot();
  }

  const rows = result.data as Array<Record<string, unknown>>;
  const matched = rows.find((item) => item?.user_id === userId);
  if (!matched) {
    return emptyTeamRoleSnapshot();
  }

  return {
    display_name: typeof matched.display_name === 'string' ? matched.display_name : null,
    email: typeof matched.email === 'string' ? matched.email : null,
    exists: true,
    role: typeof matched.role === 'string' ? matched.role : null,
    team_id: typeof matched.team_id === 'string' ? matched.team_id : teamId,
    user_id: typeof matched.user_id === 'string' ? matched.user_id : null,
  };
}

export async function queryHomepageVisibility(
  client: SignedInUserSession['client'],
  teamId: string,
) {
  const result = await client
    .from('teams')
    .select('id')
    .eq('id', teamId)
    .gt('rank', 0)
    .maybeSingle();
  return Boolean(result.data?.id);
}

export async function readTeamWorkspaceRecord(
  filePath: string,
): Promise<TeamWorkspaceRecord | null> {
  try {
    return await readJsonFile<TeamWorkspaceRecord>(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export function buildTeamWorkspaceRecord(input: {
  createdAt?: string;
  ownerSession: SignedInUserSession;
  supabaseTarget: SupabaseTarget;
  team: TeamRowSnapshot;
  teamId: string;
  workspaceFile: string;
}): TeamWorkspaceRecord {
  const now = new Date().toISOString();

  return {
    createdAt: input.createdAt ?? now,
    latestTeamSnapshot: {
      isPublic: input.team.is_public,
      rank: input.team.rank,
    },
    owner: {
      email: input.ownerSession.credential.email,
      requestedRole: input.ownerSession.credential.requestedRole,
      resolvedRole: input.ownerSession.credential.resolvedRole,
      userId: input.ownerSession.user.id,
    },
    supabase: {
      apiUrl: input.supabaseTarget.apiUrl,
      dashboardUrl: input.supabaseTarget.dashboardUrl,
      projectId: input.supabaseTarget.projectId,
    },
    teamId: input.teamId,
    updatedAt: now,
    workspaceFile: input.workspaceFile,
  };
}

export function buildTeamPlaceholders(input: {
  fixtureValues?: Record<string, unknown>;
  inviteeSession?: SignedInUserSession;
  memberSession?: SignedInUserSession;
  ownerSession?: SignedInUserSession;
  systemSession?: SignedInUserSession;
  teamId: string;
}) {
  return {
    __TEAM_ID__: input.teamId,
    __OWNER_EMAIL__: input.ownerSession?.credential.email,
    __OWNER_USER_ID__: input.ownerSession?.user.id,
    __INVITEE_EMAIL__: input.inviteeSession?.credential.email,
    __INVITEE_USER_ID__: input.inviteeSession?.user.id,
    __MEMBER_EMAIL__: input.memberSession?.credential.email,
    __MEMBER_USER_ID__: input.memberSession?.user.id,
    __SYSTEM_USER_ID__: input.systemSession?.user.id,
    ...(input.fixtureValues ?? {}),
  };
}

export async function evaluateTeamExpectationFile(input: {
  context: Record<string, unknown>;
  expectedFile: string;
  placeholders?: Record<string, unknown>;
}) {
  const expectations = buildTeamExpectations(input.context);
  return evaluateStructuredExpectations({
    context: input.context,
    expectations,
    placeholders: input.placeholders,
  });
}

function teamExpectation(path: string, expected: string, label: string): StructuredExpectation {
  return { expected, label, path };
}

export function buildTeamExpectations(context: Record<string, unknown>): StructuredExpectation[] {
  const steps = (context.steps ?? {}) as Record<string, unknown>;

  if ('create' in steps) {
    return [
      teamExpectation('steps.create.team.exists', 'true', 'Created team row exists'),
      teamExpectation('steps.create.team.id', '__TEAM_ID__', 'Created team id matches runtime id'),
      teamExpectation(
        'steps.create.team.is_public',
        '__FIXTURE_IS_PUBLIC__',
        'Created team visibility matches fixture',
      ),
      teamExpectation(
        'steps.create.team.json',
        '__FIXTURE_JSON__',
        'Created team json matches fixture',
      ),
      teamExpectation(
        'steps.create.team.rank',
        '__FIXTURE_RANK__',
        'Created team rank matches fixture',
      ),
      teamExpectation('steps.create.ownerRole.role', 'owner', 'Owner membership role is owner'),
      teamExpectation(
        'steps.create.ownerRole.user_id',
        '__OWNER_USER_ID__',
        'Owner membership user_id matches owner',
      ),
      teamExpectation(
        'steps.create.ownerRole.team_id',
        '__TEAM_ID__',
        'Owner membership team_id matches runtime id',
      ),
    ];
  }

  if ('edit' in steps) {
    return [
      teamExpectation('steps.edit.team.exists', 'true', 'Edited team row exists'),
      teamExpectation('steps.edit.team.id', '__TEAM_ID__', 'Edited team id matches runtime id'),
      teamExpectation(
        'steps.edit.team.is_public',
        '__FIXTURE_IS_PUBLIC__',
        'Edited team visibility matches fixture',
      ),
      teamExpectation(
        'steps.edit.team.json',
        '__FIXTURE_JSON__',
        'Edited team json matches fixture',
      ),
      teamExpectation(
        'steps.edit.team.rank',
        '__FIXTURE_RANK__',
        'Edited team rank matches fixture',
      ),
      teamExpectation('steps.edit.ownerRole.role', 'owner', 'Owner membership role remains owner'),
      teamExpectation(
        'steps.edit.ownerRole.user_id',
        '__OWNER_USER_ID__',
        'Owner membership user_id matches owner',
      ),
      teamExpectation(
        'steps.edit.ownerRole.team_id',
        '__TEAM_ID__',
        'Owner membership team_id matches runtime id',
      ),
    ];
  }

  if ('invite' in steps) {
    return [
      teamExpectation('steps.invite.role.role', 'is_invited', 'Invite role is is_invited'),
      teamExpectation(
        'steps.invite.role.user_id',
        '__INVITEE_USER_ID__',
        'Invite role user_id matches invitee',
      ),
      teamExpectation(
        'steps.invite.role.team_id',
        '__TEAM_ID__',
        'Invite role team_id matches team',
      ),
      teamExpectation('steps.invite.notification.exists', 'true', 'Invite notification exists'),
      teamExpectation(
        'steps.invite.notification.role',
        'is_invited',
        'Invite notification role is is_invited',
      ),
      teamExpectation(
        'steps.invite.notification.user_id',
        '__INVITEE_USER_ID__',
        'Invite notification user_id matches invitee',
      ),
      teamExpectation(
        'steps.invite.notification.team_id',
        '__TEAM_ID__',
        'Invite notification team_id matches team',
      ),
      teamExpectation('steps.accept.role.role', 'member', 'Accepted role is member'),
      teamExpectation(
        'steps.accept.role.user_id',
        '__INVITEE_USER_ID__',
        'Accepted role user_id matches invitee',
      ),
      teamExpectation(
        'steps.accept.role.team_id',
        '__TEAM_ID__',
        'Accepted role team_id matches team',
      ),
      teamExpectation(
        'steps.accept.memberListRole.role',
        'member',
        'Accepted member list role is member',
      ),
      teamExpectation(
        'steps.accept.memberListRole.email',
        '__INVITEE_EMAIL__',
        'Accepted member list email matches invitee',
      ),
      teamExpectation(
        'steps.accept.memberListRole.team_id',
        '__TEAM_ID__',
        'Accepted member list team_id matches team',
      ),
      teamExpectation(
        'steps.accept.notification.exists',
        'false',
        'Invite notification is removed after accept',
      ),
    ];
  }

  if ('reject' in steps) {
    return [
      teamExpectation('steps.reject.role.role', 'rejected', 'Rejected role is rejected'),
      teamExpectation(
        'steps.reject.role.user_id',
        '__INVITEE_USER_ID__',
        'Rejected role user_id matches invitee',
      ),
      teamExpectation(
        'steps.reject.role.team_id',
        '__TEAM_ID__',
        'Rejected role team_id matches team',
      ),
      teamExpectation(
        'steps.reject.notification.exists',
        'false',
        'Invite notification is absent after reject',
      ),
      teamExpectation('steps.reinvite.role.role', 'is_invited', 'Reinvite role is is_invited'),
      teamExpectation(
        'steps.reinvite.role.user_id',
        '__INVITEE_USER_ID__',
        'Reinvite role user_id matches invitee',
      ),
      teamExpectation(
        'steps.reinvite.role.team_id',
        '__TEAM_ID__',
        'Reinvite role team_id matches team',
      ),
      teamExpectation('steps.reinvite.notification.exists', 'true', 'Reinvite notification exists'),
      teamExpectation(
        'steps.reinvite.notification.role',
        'is_invited',
        'Reinvite notification role is is_invited',
      ),
      teamExpectation(
        'steps.reinvite.notification.user_id',
        '__INVITEE_USER_ID__',
        'Reinvite notification user_id matches invitee',
      ),
      teamExpectation(
        'steps.reinvite.notification.team_id',
        '__TEAM_ID__',
        'Reinvite notification team_id matches team',
      ),
    ];
  }

  if ('promote' in steps) {
    return [
      teamExpectation('steps.promote.role.role', 'admin', 'Promoted role is admin'),
      teamExpectation(
        'steps.promote.role.user_id',
        '__MEMBER_USER_ID__',
        'Promoted role user_id matches member',
      ),
      teamExpectation(
        'steps.promote.role.team_id',
        '__TEAM_ID__',
        'Promoted role team_id matches team',
      ),
      teamExpectation(
        'steps.promote.memberListRole.role',
        'admin',
        'Promoted member list role is admin',
      ),
      teamExpectation(
        'steps.promote.memberListRole.user_id',
        '__MEMBER_USER_ID__',
        'Promoted member list user_id matches member',
      ),
      teamExpectation(
        'steps.promote.memberListRole.team_id',
        '__TEAM_ID__',
        'Promoted member list team_id matches team',
      ),
      teamExpectation('steps.demote.role.role', 'member', 'Demoted role is member'),
      teamExpectation(
        'steps.demote.role.user_id',
        '__MEMBER_USER_ID__',
        'Demoted role user_id matches member',
      ),
      teamExpectation(
        'steps.demote.role.team_id',
        '__TEAM_ID__',
        'Demoted role team_id matches team',
      ),
      teamExpectation(
        'steps.demote.memberListRole.role',
        'member',
        'Demoted member list role is member',
      ),
      teamExpectation(
        'steps.demote.memberListRole.user_id',
        '__MEMBER_USER_ID__',
        'Demoted member list user_id matches member',
      ),
      teamExpectation(
        'steps.demote.memberListRole.team_id',
        '__TEAM_ID__',
        'Demoted member list team_id matches team',
      ),
      teamExpectation('steps.remove.role.exists', 'false', 'Removed role no longer exists'),
      teamExpectation(
        'steps.remove.memberListRole.exists',
        'false',
        'Removed member no longer appears in member list',
      ),
    ];
  }

  if ('hide' in steps) {
    return [
      teamExpectation('steps.hide.team.exists', 'true', 'Hidden team row exists'),
      teamExpectation('steps.hide.team.id', '__TEAM_ID__', 'Hidden team id matches runtime id'),
      teamExpectation(
        'steps.hide.team.rank',
        '__FIXTURE_HIDE_RANK__',
        'Hidden team rank matches fixture',
      ),
      teamExpectation('steps.hide.homepageVisible', 'false', 'Hidden team is absent from homepage'),
      teamExpectation('steps.show.team.exists', 'true', 'Shown team row exists'),
      teamExpectation('steps.show.team.id', '__TEAM_ID__', 'Shown team id matches runtime id'),
      teamExpectation(
        'steps.show.team.rank',
        '__FIXTURE_VISIBLE_RANK__',
        'Shown team rank matches fixture',
      ),
      teamExpectation('steps.show.homepageVisible', 'true', 'Shown team is visible on homepage'),
    ];
  }

  throw new Error('Unsupported team workflow expectation context.');
}

export async function closeTeamSessions(sessions: Array<SignedInUserSession | undefined>) {
  await Promise.all(
    sessions
      .filter((session): session is SignedInUserSession => Boolean(session))
      .map(async (session) => {
        await signOutUserSession(session);
      }),
  );
}

export function getTeamAccountSummary(session: SignedInUserSession): TeamWorkflowAccountSummary {
  return {
    email: session.credential.email,
    requestedRole: session.credential.requestedRole,
    resolvedRole: session.credential.resolvedRole,
    userId: session.user.id,
  };
}

function emptyTeamRoleSnapshot(): TeamRoleSnapshot {
  return {
    display_name: null,
    email: null,
    exists: false,
    role: null,
    team_id: null,
    user_id: null,
  };
}

function isWorkspaceRecordCompatible(record: TeamWorkspaceRecord, supabaseTarget: SupabaseTarget) {
  if (record.supabase.projectId && supabaseTarget.projectId) {
    return record.supabase.projectId === supabaseTarget.projectId;
  }

  return record.supabase.apiUrl === supabaseTarget.apiUrl;
}

async function resolveUserIdByEmail(client: SignedInUserSession['client'], email: string) {
  const result = await client
    .from('users')
    .select('id')
    .eq('raw_user_meta_data->>email', email)
    .single();

  if (result.error) {
    return null;
  }

  return typeof result.data.id === 'string' ? result.data.id : null;
}

async function invokeTeamCommand(
  session: SignedInUserSession,
  command: string,
  body: Record<string, unknown>,
) {
  return session.client.functions.invoke(command, {
    body,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    region: FunctionRegion.UsEast1,
  });
}

function getCommandError(result: { data: any; error: any }) {
  return result.error ?? (result.data?.ok === false ? result.data : null);
}
