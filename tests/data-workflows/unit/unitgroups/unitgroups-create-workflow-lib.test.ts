import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { UnitGroupCreateFixture } from '../../workflows/unitgroups/unitgroups-create-workflow-lib';
import {
  buildCreateExpectations,
  buildRuntimeRecord,
  evaluateExpectations,
  loadUsersConfig,
  normalizeSupabaseTarget,
  parseCliArgs,
  pickCredentialByRole,
  prepareRuntimeFixture,
  resolveRuntimeRecordFilePath,
  writeRuntimeRecord,
} from '../../workflows/unitgroups/unitgroups-create-workflow-lib';

describe('unitgroups-create-workflow-lib', () => {
  it('parses cli arguments with defaults and explicit flags', () => {
    const options = parseCliArgs(
      [
        '--role',
        'user',
        '--frontend-url',
        'http://127.0.0.1:8000',
        '--supabase-url',
        'https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie',
        '--keep-data',
        '--generate-id',
        '--no-verify-frontend',
      ],
      '/repo',
    );

    expect(options.role).toBe('user');
    expect(options.frontendUrl).toBe('http://127.0.0.1:8000');
    expect(options.supabaseUrl).toBe('https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie');
    expect(options.keepData).toBe(true);
    expect(options.generateId).toBe(true);
    expect(options.verifyFrontend).toBe(false);
    expect(options.writeRuntime).toBe(true);
    expect(options.dataFile).toBe(
      '/repo/tests/data-workflows/fixtures/data/unitgroups/001_create.json',
    );
    expect(options.usersFile).toBe('/repo/tests/data-workflows/fixtures/data/users.json');
    expect(options.runtimeRecordFile).toBe(
      '/repo/tests/data-workflows/runtime/unitgroups/001_create.last-run.json',
    );
  });

  it('defaults role to user when --role is omitted', () => {
    const options = parseCliArgs([], '/repo');

    expect(options.role).toBe('user');
    expect(options.keepData).toBe(true);
    expect(options.generateId).toBe(true);
    expect(options.writeRuntime).toBe(true);
  });

  it('lets explicit --no-* flags disable the default runtime behaviors', () => {
    const options = parseCliArgs(
      ['--no-keep-data', '--no-generate-id', '--no-write-runtime'],
      '/repo',
    );

    expect(options.keepData).toBe(false);
    expect(options.generateId).toBe(false);
    expect(options.writeRuntime).toBe(false);
  });

  it('uses an explicit runtime record path and enables writing when requested', () => {
    const options = parseCliArgs(
      [
        '--role=user',
        '--data-file',
        'tests/data-workflows/fixtures/data/unitgroups/001_create.json',
        '--runtime-record-file',
        'output/custom-unitgroup-runtime.json',
      ],
      '/repo',
    );

    expect(options.writeRuntime).toBe(true);
    expect(options.runtimeRecordFile).toBe('/repo/output/custom-unitgroup-runtime.json');
  });

  it('rejects the removed --write-runtime-id flag', () => {
    expect(() => parseCliArgs(['--write-runtime-id'], '/repo')).toThrow(
      'Unknown flag: --write-runtime-id',
    );
  });

  it('loads users from environment variables without requiring a users file', async () => {
    const loadedUsers = await loadUsersConfig(
      '/repo/tests/data-workflows/fixtures/data/users.json',
      {
        TEST_USER_EMAIL: 'env-user@example.com',
        TEST_USER_PASSWORD: 'env-secret',
      } as NodeJS.ProcessEnv,
    );

    expect(loadedUsers.sourceLabel).toBe('environment variables');
    expect(pickCredentialByRole(loadedUsers.users, 'user', loadedUsers.sourceLabel)).toEqual({
      email: 'env-user@example.com',
      password: 'env-secret',
      role: 'user',
    });
  });

  it('lets direct role env vars override TEST_USERS_JSON for the same role', async () => {
    const loadedUsers = await loadUsersConfig(
      '/repo/tests/data-workflows/fixtures/data/users.json',
      {
        TEST_USERS_JSON: JSON.stringify({
          user: {
            email: 'json-user@example.com',
            password: 'json-secret',
          },
          'team-admin': {
            email: 'json-team-admin@example.com',
            password: 'json-team-secret',
          },
        }),
        TEST_USER_EMAIL: 'override-user@example.com',
      } as NodeJS.ProcessEnv,
    );

    expect(loadedUsers.sourceLabel).toBe('environment variables');
    expect(loadedUsers.users).toEqual({
      user: {
        email: 'override-user@example.com',
        password: 'json-secret',
      },
      'team-admin': {
        email: 'json-team-admin@example.com',
        password: 'json-team-secret',
      },
    });
  });

  it('loads users from .env.users.local before falling back to a users file', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'unitgroups-create-env-file-'));
    const envFile = path.join(tempRoot, '.env.users.local');

    try {
      await writeFile(
        envFile,
        'TEST_TEAM_OWNER_EMAIL=team-owner@example.com\nTEST_TEAM_OWNER_PASSWORD=env-secret\n',
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
        pickCredentialByRole(loadedUsers.users, 'team-owner', loadedUsers.sourceLabel),
      ).toEqual({
        email: 'team-owner@example.com',
        password: 'env-secret',
        role: 'team-owner',
      });
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });

  it('normalizes a dashboard project url into api url and project metadata', () => {
    const target = normalizeSupabaseTarget(
      {
        supabaseProjectUrl: undefined,
        supabasePublishableKey: undefined,
        supabaseUrl: 'https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie',
      },
      {
        SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key',
      } as NodeJS.ProcessEnv,
    );

    expect(target.apiUrl).toBe('https://fotofiyqnuyvgtotswie.supabase.co');
    expect(target.dashboardUrl).toBe('https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie');
    expect(target.projectId).toBe('fotofiyqnuyvgtotswie');
    expect(target.publishableKey).toBe('sb_publishable_test_key');
  });

  it('prepares a runtime fixture with a generated id and updates the embedded uuid fields', () => {
    const fixture: UnitGroupCreateFixture = {
      id: 'fixture-unitgroup-id',
      table: 'unitgroups',
      jsonOrdered: {
        unitGroupDataSet: {
          unitGroupInformation: {
            dataSetInformation: {
              'common:UUID': '__RUNTIME_UNITGROUP_ID__',
            },
          },
          administrativeInformation: {
            publicationAndOwnership: {
              'common:dataSetVersion': '01.01.000',
              'common:referenceToOwnershipOfDataSet': {
                '@refObjectId': 'owner-contact-id',
                '@type': 'contact data set',
                '@uri': '../contacts/owner-contact-id.xml',
                '@version': '01.01.000',
              },
            },
          },
        },
      },
    };

    const runtimeFixture = prepareRuntimeFixture(fixture, {
      generateId: true,
      generateIdFn: () => 'runtime-id',
    });

    expect(runtimeFixture.runtimeId).toBe('runtime-id');
    expect(runtimeFixture.version).toBe('01.01.000');
    expect(
      runtimeFixture.fixture.jsonOrdered.unitGroupDataSet.unitGroupInformation.dataSetInformation[
        'common:UUID'
      ],
    ).toBe('runtime-id');
    expect(
      runtimeFixture.fixture.jsonOrdered.unitGroupDataSet.administrativeInformation
        .publicationAndOwnership['common:permanentDataSetURI'],
    ).toBeUndefined();
    expect(
      runtimeFixture.fixture.jsonOrdered.unitGroupDataSet.administrativeInformation
        .publicationAndOwnership['common:referenceToOwnershipOfDataSet']['@refObjectId'],
    ).toBe('owner-contact-id');
    expect(
      runtimeFixture.fixture.jsonOrdered.unitGroupDataSet.administrativeInformation
        .publicationAndOwnership['common:referenceToOwnershipOfDataSet']['@uri'],
    ).toBe('../contacts/owner-contact-id.xml');
    expect(runtimeFixture.sourceFixtureId).toBe('fixture-unitgroup-id');
  });

  it('derives the default runtime record path from tests/data-workflows/fixtures/data fixtures', () => {
    expect(
      resolveRuntimeRecordFilePath(
        '/repo/tests/data-workflows/fixtures/data/unitgroups/001_create.json',
        '/',
      ),
    ).toBe('/repo/tests/data-workflows/runtime/unitgroups/001_create.last-run.json');
  });

  it('builds code-owned create expectations', () => {
    expect(buildCreateExpectations()).toEqual([
      { kind: 'rowExists', label: 'Create row exists' },
      {
        kind: 'jsonOrderedMatches',
        label: 'Create json_ordered matches submitted jsonOrdered',
      },
      { kind: 'userIdMatches', label: 'Create user_id matches current user' },
      { kind: 'stateCodeEquals', label: 'Create state_code is 0', expected: 0 },
      {
        kind: 'versionEquals',
        label: 'Create version is 01.01.000',
        expected: '01.01.000',
      },
      { kind: 'teamIdNull', label: 'Create team_id is null' },
      {
        kind: 'ruleVerificationEquals',
        label: 'Create rule_verification matches code expectation',
        expected: false,
      },
      { kind: 'reviewsNull', label: 'Create reviews is null' },
    ]);
  });

  it('evaluates code-owned expectations against the created row', () => {
    const expectations = buildCreateExpectations();
    const uploadedJsonOrdered = {
      unitGroupDataSet: {
        unitGroupInformation: {
          dataSetInformation: {
            'common:UUID': 'unitgroup-1',
          },
        },
      },
    };

    const results = evaluateExpectations({
      currentUserId: 'user-1',
      expectations,
      record: {
        id: 'unitgroup-1',
        json_ordered: {
          unitGroupDataSet: {
            unitGroupInformation: {
              dataSetInformation: {
                'common:UUID': 'unitgroup-1',
              },
            },
          },
        },
        reviews: null,
        rule_verification: false,
        state_code: 0,
        team_id: null,
        user_id: 'user-1',
        version: '01.01.000',
      },
      uploadedJsonOrdered,
    });

    expect(results.every((result) => result.passed)).toBe(true);
  });

  it('writes a runtime record file without mutating the source fixture', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'unitgroups-runtime-record-'));

    try {
      const runtimeRecordPath = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'runtime',
        'unitgroups',
        '001.json',
      );
      const runtimeRecord = buildRuntimeRecord(
        {
          dataFile: '/repo/tests/data-workflows/fixtures/data/unitgroups/001_create.json',
          expectedFile: '/repo/tests/data-workflows/fixtures/result/unitgroups/001_create.md',
          frontendUrl: 'http://127.0.0.1:8000',
          keepData: true,
        },
        {
          cleanupAttempted: false,
          cleanupPassed: true,
          expectationResults: [
            {
              actual: true,
              label: '数据库可根据id查询到刚创建的数据',
              passed: true,
            },
          ],
          frontendProbe: {
            ok: true,
            status: 200,
            statusText: 'OK',
            url: 'http://127.0.0.1:8000',
          },
          passed: true,
          record: {
            id: 'runtime-id',
            json_ordered: { any: 'value' },
            reviews: null,
            rule_verification: false,
            state_code: 0,
            team_id: null,
            user_id: 'user-1',
            version: '01.01.000',
          },
          runtimeFixture: {
            fixture: {
              id: 'runtime-id',
              jsonOrdered: { any: 'value' },
              table: 'unitgroups',
            },
            runtimeId: 'runtime-id',
            sourceFixtureId: 'fixture-id',
            version: '01.01.000',
          },
          selectedUser: {
            email: 'user@example.com',
            role: 'user',
            userId: 'user-1',
          },
          submittedRuleVerification: false,
          supabaseTarget: {
            apiUrl: 'https://fotofiyqnuyvgtotswie.supabase.co',
            dashboardUrl: 'https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie',
            projectId: 'fotofiyqnuyvgtotswie',
            publishableKey: 'sb_publishable_test_key',
          },
        },
      );

      await writeRuntimeRecord(runtimeRecordPath, runtimeRecord);

      const persisted = JSON.parse(await readFile(runtimeRecordPath, 'utf8'));
      expect(persisted.runtimeId).toBe('runtime-id');
      expect(persisted.sourceFixtureId).toBe('fixture-id');
      expect(persisted.fixtureFile).toBe(
        '/repo/tests/data-workflows/fixtures/data/unitgroups/001_create.json',
      );
      expect(persisted.persistedRecord.json_ordered).toBeUndefined();
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });
});
