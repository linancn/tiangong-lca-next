import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  buildContactCreateContributeTeamRuntimeRecord,
  buildCreateContributeTeamExpectations,
  parseCreateContributeTeamCliArgs,
  resolveCreateContributeTeamRuntimeRecordFilePath,
  runContactCreateContributeTeamSmoke,
} from '../../workflows/contacts/contacts-create-contribute-team-workflow-lib';

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(filePath: string, value: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, value, 'utf8');
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildPermanentUri(id: string, version: string) {
  return `https://lcdn.tiangong.earth/datasetdetail/contact.xhtml?uuid=${id}&version=${version}`;
}

function buildContactJsonOrdered(id: string, version: string, timestamp: string) {
  return {
    contactDataSet: {
      contactInformation: {
        dataSetInformation: {
          'common:UUID': id,
          'common:shortName': {
            '#text': 'team-contact',
            '@xml:lang': 'en',
          },
        },
      },
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': timestamp,
        },
        publicationAndOwnership: {
          'common:dataSetVersion': version,
          'common:permanentDataSetURI': buildPermanentUri(id, version),
        },
      },
    },
  };
}

function buildRecord(
  id: string,
  jsonOrdered: Record<string, unknown>,
  ruleVerification: boolean,
  version = '01.01.000',
) {
  return {
    id,
    json_ordered: deepClone(jsonOrdered),
    reviews: null,
    rule_verification: ruleVerification,
    state_code: 0,
    team_id: null,
    user_id: 'user-id-1',
    version,
  };
}

const createExpectedMarkdown = `# create

1. 数据库可根据id查询到刚创建的数据
2. \`json_ordered\`字段和创建数据上传的\`jsonOrdered\`一致
3. \`user_id\`和当前用户\`id\`一致
4. \`state_code\`为0
5. \`version\`为\`01.01.000\`
6. \`team_id\`为\`NULL\`
7. \`rule_verification\`为\`FALSE\`
8. \`reviews\`为\`NULL\`
`;

const followUpExpectedMarkdown = `# contribute

1. 调用\`contributeSource("contacts", id, version)\`成功
2. 数据库可根据相同\`id\`和\`version\`查询到贡献后的数据
3. \`team_id\`和当前用户所在团队\`id\`一致
4. \`id\`和贡献前一致
5. \`version\`仍为\`01.01.000\`
6. \`user_id\`和贡献前一致
7. \`state_code\`和贡献前一致
8. \`rule_verification\`和贡献前一致
9. \`reviews\`和贡献前一致
10. \`json_ordered\`和贡献前一致
`;

describe('contacts-create-contribute-team-workflow-lib', () => {
  it('parses cli arguments with workflow defaults and explicit flags', () => {
    const options = parseCreateContributeTeamCliArgs(
      [
        '--role',
        'user',
        '--frontend-url',
        'http://127.0.0.1:8000',
        '--supabase-url',
        'https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie',
        '--create-data-file',
        'fixtures/create.json',
        '--keep-created',
        '--generate-id',
        '--no-verify-frontend',
        '--runtime-record-file',
        'output/workflow-runtime.json',
      ],
      '/repo',
    );

    expect(options.role).toBe('user');
    expect(options.frontendUrl).toBe('http://127.0.0.1:8000');
    expect(options.supabaseUrl).toBe('https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie');
    expect(options.createDataFile).toBe('/repo/fixtures/create.json');
    expect(options.keepData).toBe(true);
    expect(options.generateId).toBe(true);
    expect(options.verifyFrontend).toBe(false);
    expect(options.writeRuntime).toBe(true);
    expect(options.runtimeRecordFile).toBe('/repo/output/workflow-runtime.json');
    expect(options.usersFile).toBe('/repo/tests/data-workflows/fixtures/data/users.json');
  });

  it('defaults role to team-member when --role is omitted', () => {
    const options = parseCreateContributeTeamCliArgs([], '/repo');

    expect(options.createDataFile).toBe(
      '/repo/tests/data-workflows/fixtures/data/contacts/005_create_contribute_team.json',
    );
    expect(options.role).toBe('team-member');
    expect(options.keepData).toBe(true);
    expect(options.generateId).toBe(true);
    expect(options.writeRuntime).toBe(true);
  });

  it('lets explicit --no-* flags disable the default workflow behaviors', () => {
    const options = parseCreateContributeTeamCliArgs(
      ['--no-keep-data', '--no-generate-id', '--no-write-runtime'],
      '/repo',
    );

    expect(options.keepData).toBe(false);
    expect(options.generateId).toBe(false);
    expect(options.writeRuntime).toBe(false);
  });

  it('builds code-owned workflow expectations and resolves the default runtime record path', () => {
    const expectations = buildCreateContributeTeamExpectations();

    expect(expectations).toHaveLength(10);
    expect(expectations).toEqual(
      expect.arrayContaining([
        {
          expected: true,
          key: 'contribute.commandSucceeded',
          label: 'Contribute command succeeds',
        },
        {
          expected: '01.01.000',
          key: 'contribute.version',
          label: 'Contributed version is 01.01.000',
        },
        {
          expected: true,
          key: 'contribute.jsonOrderedMatchesCreate',
          label: 'Contributed json_ordered matches created record',
        },
      ]),
    );
    expect(
      resolveCreateContributeTeamRuntimeRecordFilePath(
        '/repo/tests/data-workflows/fixtures/result/contacts/005_create_contribute_team.md',
        '/',
      ),
    ).toBe('/repo/tests/data-workflows/runtime/contacts/005_create_contribute_team.last-run.json');
  });

  it('builds a workflow runtime record without persisting json_ordered', () => {
    const runtimeRecord = buildContactCreateContributeTeamRuntimeRecord(
      {
        createDataFile:
          '/repo/tests/data-workflows/fixtures/data/contacts/005_create_contribute_team.json',
        createExpectedFile:
          '/repo/tests/data-workflows/fixtures/result/contacts/005_create_contribute_team_create.md',
        followUpExpectedFile:
          '/repo/tests/data-workflows/fixtures/result/contacts/005_create_contribute_team.md',
        frontendUrl: 'http://127.0.0.1:8000',
        keepData: false,
      },
      {
        cleanupAttempted: true,
        cleanupPassed: true,
        contribute: {
          commandSucceeded: true,
          currentTeamId: 'team-123',
          jsonOrderedMatchesCreate: true,
          reviewsMatchCreate: true,
          ruleVerificationMatchesCreate: true,
          stateCodeMatchesCreate: true,
          teamIdMatchesCurrentTeam: true,
          userIdMatchesCreate: true,
        },
        contributeStep: {
          expectationResults: [{ actual: true, label: 'contribute', passed: true }],
          record: {
            id: 'contact-1',
            json_ordered: { contribute: true },
            reviews: null,
            rule_verification: false,
            state_code: 0,
            team_id: 'team-123',
            user_id: 'user-1',
            version: '01.01.000',
          },
        },
        createStep: {
          expectationResults: [{ actual: true, label: 'create', passed: true }],
          record: {
            id: 'contact-1',
            json_ordered: { create: true },
            reviews: null,
            rule_verification: false,
            state_code: 0,
            team_id: null,
            user_id: 'user-1',
            version: '01.01.000',
          },
          submittedRuleVerification: false,
        },
        frontendProbe: { ok: true, skipped: true },
        passed: true,
        runtimeFixture: {
          fixture: {
            id: 'contact-1',
            jsonOrdered: { create: true },
            table: 'contacts',
          },
          runtimeId: 'contact-1',
          sourceFixtureId: 'fixture-id',
          version: '01.01.000',
        },
        selectedUser: {
          email: 'user@example.com',
          role: 'user',
          userId: 'user-1',
        },
        supabaseTarget: {
          apiUrl: 'https://fotofiyqnuyvgtotswie.supabase.co',
          dashboardUrl: 'https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie',
          projectId: 'fotofiyqnuyvgtotswie',
          publishableKey: 'sb_publishable_test',
        },
      },
    );

    expect(runtimeRecord.create.persistedRecord).toEqual({
      id: 'contact-1',
      reviews: null,
      rule_verification: false,
      state_code: 0,
      team_id: null,
      user_id: 'user-1',
      version: '01.01.000',
    });
    expect(runtimeRecord.contribute.persistedRecord).toEqual({
      id: 'contact-1',
      reviews: null,
      rule_verification: false,
      state_code: 0,
      team_id: 'team-123',
      user_id: 'user-1',
      version: '01.01.000',
    });
    expect(runtimeRecord.contribute.summary.currentTeamId).toBe('team-123');
  });

  it('runs the create-contribute-team workflow and writes a runtime record', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'contacts-create-contribute-team-'));

    try {
      const sourceId = '96926fa6-658a-465e-8f2e-022259ef9e6d';
      const createDataFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'data',
        'contacts',
        '005_create_contribute_team.json',
      );
      const createExpectedFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'result',
        'contacts',
        '001_create.md',
      );
      const followUpExpectedFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'result',
        'contacts',
        '005_create_contribute_team.md',
      );
      const usersFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'data',
        'users.json',
      );
      const runtimeRecordFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'runtime',
        'contacts',
        '005_create_contribute_team.last-run.json',
      );

      await writeJson(createDataFile, {
        id: sourceId,
        table: 'contacts',
        jsonOrdered: buildContactJsonOrdered(sourceId, '01.01.000', '2026-04-16T05:31:26.289Z'),
      });
      await writeText(createExpectedFile, createExpectedMarkdown);
      await writeText(followUpExpectedFile, followUpExpectedMarkdown);
      await writeJson(usersFile, {
        user: {
          email: 'user@example.com',
          password: 'secret',
        },
      });

      const state = {
        deletedKeys: [] as string[],
        records: new Map<string, any>(),
      };

      const select = jest.fn().mockImplementation(() => {
        const filters: Record<string, string> = {};
        const builder = {
          eq: jest.fn().mockImplementation((key: string, value: string) => {
            filters[key] = value;
            return builder;
          }),
          maybeSingle: jest.fn(async () => ({
            data: state.records.get(`${filters.id}|${filters.version}`) ?? null,
            error: null,
          })),
        };
        return builder;
      });
      const from = jest.fn().mockReturnValue({
        select,
      });

      const signInWithPassword = jest.fn().mockResolvedValue({
        data: {
          session: { access_token: 'access-token' },
          user: { id: 'user-id-1' },
        },
        error: null,
      });
      const signOut = jest.fn().mockResolvedValue({ error: null });
      const functionsInvoke = jest.fn(async (functionName: string, request: any) => {
        if (functionName === 'app_dataset_create') {
          const version =
            request.body.jsonOrdered.contactDataSet.administrativeInformation
              .publicationAndOwnership['common:dataSetVersion'];
          state.records.set(
            `${request.body.id}|${version}`,
            buildRecord(
              request.body.id,
              request.body.jsonOrdered,
              request.body.ruleVerification,
              version,
            ),
          );
          return {
            data: { id: request.body.id, version },
            error: null,
          };
        }

        if (functionName === 'app_dataset_delete') {
          state.records.delete(`${request.body.id}|${request.body.version}`);
          state.deletedKeys.push(`${request.body.id}|${request.body.version}`);
          return {
            data: { ok: true },
            error: null,
          };
        }

        throw new Error(`Unexpected function invoke: ${functionName}`);
      });

      const contributeSource = jest.fn(async (_tableName: string, id: string, version: string) => {
        const key = `${id}|${version}`;
        const record = state.records.get(key);

        state.records.set(key, {
          ...record,
          team_id: 'team-123',
        });

        return {
          count: null,
          data: [{ id, team_id: 'team-123' }],
          error: null,
          status: 200,
          statusText: 'OK',
        };
      });
      const getTeamIdByUserId = jest.fn().mockResolvedValue('team-123');

      const result = await runContactCreateContributeTeamSmoke(
        {
          createDataFile,
          createExpectedFile,
          followUpExpectedFile,
          generateId: false,
          help: false,
          keepData: false,
          role: 'user',
          runtimeRecordFile,
          supabasePublishableKey: 'sb_publishable_test',
          supabaseUrl: 'https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie',
          usersFile,
          verifyFrontend: false,
          writeRuntime: true,
        },
        {
          computeCreateRuleVerificationFn: async () => false,
          modulesLoader: async () =>
            ({
              generalApi: {
                contributeSource,
                getTeamIdByUserId,
              },
              supabase: {
                auth: {
                  signInWithPassword,
                  signOut,
                },
                from,
                functions: {
                  invoke: functionsInvoke,
                },
              } as any,
            }) as any,
        },
      );

      expect(result.passed).toBe(true);
      expect(result.runtimeFixture.runtimeId).toBe(sourceId);
      expect(result.createStep.record.id).toBe(sourceId);
      expect(result.contribute.currentTeamId).toBe('team-123');
      expect(result.contribute.commandSucceeded).toBe(true);
      expect(result.contributeStep.record.id).toBe(sourceId);
      expect(result.contributeStep.record.team_id).toBe('team-123');
      expect(result.cleanupAttempted).toBe(true);
      expect(result.cleanupPassed).toBe(true);
      expect(result.runtimeRecordWritten).toBe(true);
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'secret',
      });
      expect(functionsInvoke).toHaveBeenNthCalledWith(
        1,
        'app_dataset_create',
        expect.objectContaining({
          body: expect.objectContaining({
            id: sourceId,
            ruleVerification: false,
            table: 'contacts',
          }),
        }),
      );
      expect(getTeamIdByUserId).toHaveBeenCalled();
      expect(contributeSource).toHaveBeenCalledWith('contacts', sourceId, '01.01.000');
      expect(state.deletedKeys).toEqual([`${sourceId}|01.01.000`]);
      expect(signOut).toHaveBeenCalled();

      const runtimeRecord = JSON.parse(await readFile(runtimeRecordFile, 'utf8'));
      expect(runtimeRecord.create.runtimeId).toBe(sourceId);
      expect(runtimeRecord.contribute.summary.currentTeamId).toBe('team-123');
      expect(runtimeRecord.contribute.persistedRecord.team_id).toBe('team-123');
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });
});
