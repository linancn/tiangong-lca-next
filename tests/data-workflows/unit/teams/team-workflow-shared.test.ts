import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  DEFAULT_TEAM_ROLE_ALIASES,
  buildTeamExpectations,
  buildTeamPlaceholders,
  buildTeamWorkspaceRecord,
  parseTeamWorkflowCliArgs,
} from '../../workflows/teams/team-workflow-shared';
import { loadUsersConfig, pickCredentialByRole } from '../../workflows/workflow-shared';

describe('team-workflow-shared', () => {
  it('parses common workflow cli defaults with a shared workspace file', () => {
    const options = parseTeamWorkflowCliArgs(
      [],
      {
        dataFile: 'tests/data-workflows/fixtures/data/teams/002_edit_team_profile.json',
        defaultRoles: {
          ownerRole: 'team-owner',
        },
        expectedFile: 'tests/data-workflows/fixtures/result/teams/002_edit_team_profile.md',
      },
      '/repo',
    );

    expect(options.ownerRole).toBe('team-owner');
    expect(options.generateId).toBe(true);
    expect(options.verifyFrontend).toBe(true);
    expect(options.writeRuntime).toBe(true);
    expect(options.dataFile).toBe(
      '/repo/tests/data-workflows/fixtures/data/teams/002_edit_team_profile.json',
    );
    expect(options.workspaceFile).toBe(
      '/repo/tests/data-workflows/runtime/teams/team-workspace.last-run.json',
    );
    expect(options.runtimeRecordFile).toBe(
      '/repo/tests/data-workflows/runtime/teams/002_edit_team_profile.last-run.json',
    );
  });

  it('supports explicit multi-role arguments and custom workspace/runtime files', () => {
    const options = parseTeamWorkflowCliArgs(
      [
        '--owner-role',
        'team-owner',
        '--invitee-role',
        'invitee-a',
        '--system-role',
        'system-admin',
        '--workspace-file',
        'tmp/shared-team.json',
        '--runtime-record-file',
        'tmp/invite-runtime.json',
      ],
      {
        dataFile: 'tests/data-workflows/fixtures/data/teams/003_invite_accept_member.json',
        expectedFile: 'tests/data-workflows/fixtures/result/teams/003_invite_accept_member.md',
      },
      '/repo',
    );

    expect(options.ownerRole).toBe('team-owner');
    expect(options.inviteeRole).toBe('invitee-a');
    expect(options.systemRole).toBe('system-admin');
    expect(options.workspaceFile).toBe('/repo/tmp/shared-team.json');
    expect(options.runtimeRecordFile).toBe('/repo/tmp/invite-runtime.json');
    expect(options.writeRuntime).toBe(true);
  });

  it('lets explicit --no-* flags disable the default workflow behaviors', () => {
    const options = parseTeamWorkflowCliArgs(
      ['--no-generate-id', '--no-write-runtime'],
      {
        dataFile: 'tests/data-workflows/fixtures/data/teams/001_create_team.json',
        expectedFile: 'tests/data-workflows/fixtures/result/teams/001_create_team.md',
      },
      '/repo',
    );

    expect(options.generateId).toBe(false);
    expect(options.writeRuntime).toBe(false);
  });

  it('rejects the removed --write-runtime-id flag', () => {
    expect(() =>
      parseTeamWorkflowCliArgs(
        ['--write-runtime-id'],
        {
          dataFile: 'tests/data-workflows/fixtures/data/teams/001_create_team.json',
          expectedFile: 'tests/data-workflows/fixtures/result/teams/001_create_team.md',
        },
        '/repo',
      ),
    ).toThrow('Unknown flag: --write-runtime-id');
  });

  it('maps logical team roles onto actual credential roles', () => {
    expect(
      pickCredentialByRole(
        {
          'team-owner': {
            email: 'owner@example.com',
            password: 'secret',
          },
          user: {
            email: 'user@example.com',
            password: 'secret',
          },
        },
        'teamless-user',
        'users file',
        DEFAULT_TEAM_ROLE_ALIASES,
      ),
    ).toEqual({
      email: 'owner@example.com',
      password: 'secret',
      requestedRole: 'teamless-user',
      resolvedRole: 'team-owner',
    });

    expect(
      pickCredentialByRole(
        {
          user: {
            email: 'user@example.com',
            password: 'secret',
          },
        },
        'invitee-a',
        'users file',
        DEFAULT_TEAM_ROLE_ALIASES,
      ),
    ).toEqual({
      email: 'user@example.com',
      password: 'secret',
      requestedRole: 'invitee-a',
      resolvedRole: 'user',
    });
  });

  it('loads team credentials from .env.users.local before using the legacy users file', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'team-workflow-users-env-'));
    const envFile = path.join(tempRoot, '.env.users.local');

    try {
      await writeFile(
        envFile,
        'TEST_TEAM_OWNER_EMAIL=owner@example.com\nTEST_TEAM_OWNER_PASSWORD=env-secret\n',
      );

      const loadedUsers = await loadUsersConfig(
        path.join(tempRoot, 'tests', 'data-workflows', 'fixtures', 'data', 'users.json'),
        {} as NodeJS.ProcessEnv,
        {
          usersEnvFilePath: envFile,
        },
      );

      expect(loadedUsers.sourceLabel).toBe('environment variables');
      expect(
        pickCredentialByRole(
          loadedUsers.users,
          'team-owner',
          loadedUsers.sourceLabel,
          DEFAULT_TEAM_ROLE_ALIASES,
        ),
      ).toEqual({
        email: 'owner@example.com',
        password: 'env-secret',
        requestedRole: 'team-owner',
        resolvedRole: 'team-owner',
      });
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });

  it('builds stable workspace metadata for the shared team', () => {
    const workspace = buildTeamWorkspaceRecord({
      createdAt: '2026-04-20T00:00:00.000Z',
      ownerSession: {
        accessToken: 'token',
        client: {} as never,
        credential: {
          email: 'owner@example.com',
          password: 'secret',
          requestedRole: 'teamless-user',
          resolvedRole: 'team-owner',
        },
        user: {
          id: 'owner-user-id',
        },
      },
      supabaseTarget: {
        apiUrl: 'https://fotofiyqnuyvgtotswie.supabase.co',
        dashboardUrl: 'https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie',
        projectId: 'fotofiyqnuyvgtotswie',
        publishableKey: 'sb_publishable_test_key',
      },
      team: {
        exists: true,
        id: 'team-id',
        is_public: true,
        json: {
          title: [{ '@xml:lang': 'en', '#text': 'Team' }],
        },
        rank: -1,
      },
      teamId: 'team-id',
      workspaceFile: '/repo/tests/data-workflows/runtime/teams/team-workspace.last-run.json',
    });

    expect(workspace.createdAt).toBe('2026-04-20T00:00:00.000Z');
    expect(workspace.owner).toEqual({
      email: 'owner@example.com',
      requestedRole: 'teamless-user',
      resolvedRole: 'team-owner',
      userId: 'owner-user-id',
    });
    expect(workspace.supabase).toEqual({
      apiUrl: 'https://fotofiyqnuyvgtotswie.supabase.co',
      dashboardUrl: 'https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie',
      projectId: 'fotofiyqnuyvgtotswie',
    });
    expect(workspace.teamId).toBe('team-id');
    expect(workspace.latestTeamSnapshot).toEqual({
      isPublic: true,
      rank: -1,
    });
  });

  it('builds placeholder maps for owner, invitee, and member checks', () => {
    expect(
      buildTeamPlaceholders({
        fixtureValues: {
          __FIXTURE_HIDE_RANK__: 0,
        },
        inviteeSession: {
          accessToken: 'token',
          client: {} as never,
          credential: {
            email: 'invitee@example.com',
            password: 'secret',
            requestedRole: 'invitee-a',
            resolvedRole: 'user',
          },
          user: {
            id: 'invitee-id',
          },
        },
        memberSession: {
          accessToken: 'token',
          client: {} as never,
          credential: {
            email: 'member@example.com',
            password: 'secret',
            requestedRole: 'invitee-a',
            resolvedRole: 'user',
          },
          user: {
            id: 'member-id',
          },
        },
        ownerSession: {
          accessToken: 'token',
          client: {} as never,
          credential: {
            email: 'owner@example.com',
            password: 'secret',
            requestedRole: 'team-owner',
            resolvedRole: 'team-owner',
          },
          user: {
            id: 'owner-id',
          },
        },
        teamId: 'team-id',
      }),
    ).toEqual({
      __FIXTURE_HIDE_RANK__: 0,
      __INVITEE_EMAIL__: 'invitee@example.com',
      __INVITEE_USER_ID__: 'invitee-id',
      __MEMBER_EMAIL__: 'member@example.com',
      __MEMBER_USER_ID__: 'member-id',
      __OWNER_EMAIL__: 'owner@example.com',
      __OWNER_USER_ID__: 'owner-id',
      __SYSTEM_USER_ID__: undefined,
      __TEAM_ID__: 'team-id',
    });
  });

  it('does not require consumed invitation notifications to clear', () => {
    const inviteExpectationPaths = buildTeamExpectations({
      steps: {
        accept: {},
        invite: {},
      },
    }).map((expectation) => expectation.path);
    const rejectExpectationPaths = buildTeamExpectations({
      steps: {
        reject: {},
        reinvite: {},
      },
    }).map((expectation) => expectation.path);

    expect(inviteExpectationPaths).toContain('steps.invite.notification.exists');
    expect(inviteExpectationPaths).not.toContain('steps.accept.notification.exists');
    expect(rejectExpectationPaths).not.toContain('steps.reject.notification.exists');
    expect(rejectExpectationPaths).toContain('steps.reinvite.notification.exists');
  });
});
