import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  buildContactCreateViewCopyRuntimeRecord,
  buildCreateViewCopyExpectations,
  normalizeJsonForCopyComparison,
  parseCreateViewCopyCliArgs,
  resolveCreateViewCopyRuntimeRecordFilePath,
  runContactCreateViewCopySmoke,
} from '../../workflows/contacts/contacts-create-view-copy-workflow-lib';

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

function buildContactJsonOrdered(
  id: string,
  version: string,
  timestamp: string,
  shortName: any = {
    '#text': 'test-contact',
    '@xml:lang': 'en',
  },
) {
  return {
    contactDataSet: {
      contactInformation: {
        dataSetInformation: {
          'common:UUID': id,
          'common:shortName': shortName,
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
    json: deepClone(jsonOrdered),
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

const followUpExpectedMarkdown = `# view source

1. 调用\`getContactDetail(id, version)\`成功
2. 返回的\`id\`和创建数据的\`id\`一致
3. 返回的\`version\`为\`01.01.000\`
4. 返回的\`json\`和数据库中的\`json\`一致

# copy

5. 数据库可根据复制后的新\`id\`查询到复制后的数据
6. 复制后的\`id\`不等于原数据\`id\`
7. 复制后的\`version\`为\`01.01.000\`
8. 复制后的\`state_code\`为0
9. 复制后的\`user_id\`和当前用户\`id\`一致
10. 复制后的\`team_id\`为\`NULL\`
11. 复制后的\`rule_verification\`和复制提交时计算结果一致
12. 复制后的\`json_ordered\`中除\`common:UUID\`、\`common:timeStamp\`、\`common:permanentDataSetURI\`外其余字段和创建数据一致
13. 复制后的\`json_ordered\`中的\`common:UUID\`为复制后的\`id\`
14. 复制后的\`json_ordered\`中的\`common:permanentDataSetURI\`和复制后的\`id\`、\`version\`一致

# view copy

15. 调用\`getContactDetail(copyId, version)\`成功
16. 返回的\`id\`和复制后的数据\`id\`一致
17. 返回的\`version\`为\`01.01.000\`
18. 返回的\`json\`和数据库中的\`json\`一致
`;

describe('contacts-create-view-copy-workflow-lib', () => {
  it('parses cli arguments with workflow defaults and explicit flags', () => {
    const options = parseCreateViewCopyCliArgs(
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

  it('defaults role to user when --role is omitted', () => {
    const options = parseCreateViewCopyCliArgs([], '/repo');

    expect(options.createDataFile).toBe(
      '/repo/tests/data-workflows/fixtures/data/contacts/001_create_view_copy.json',
    );
    expect(options.role).toBe('user');
    expect(options.keepData).toBe(true);
    expect(options.generateId).toBe(true);
    expect(options.writeRuntime).toBe(true);
  });

  it('lets explicit --no-* flags disable the default workflow behaviors', () => {
    const options = parseCreateViewCopyCliArgs(
      ['--no-keep-data', '--no-generate-id', '--no-write-runtime'],
      '/repo',
    );

    expect(options.keepData).toBe(false);
    expect(options.generateId).toBe(false);
    expect(options.writeRuntime).toBe(false);
  });

  it('builds code-owned workflow expectations and resolves the default runtime record path', () => {
    const expectations = buildCreateViewCopyExpectations();

    expect(expectations).toEqual(
      expect.arrayContaining([
        {
          expected: true,
          key: 'viewSource.detailSuccess',
          label: 'View source detail succeeds',
        },
        {
          expected: '01.01.000',
          key: 'copy.version',
          label: 'Copied version is 01.01.000',
        },
        {
          expected: true,
          key: 'viewCopy.jsonMatchesDatabase',
          label: 'View copy json matches database json',
        },
      ]),
    );
    expect(
      resolveCreateViewCopyRuntimeRecordFilePath(
        '/repo/tests/data-workflows/fixtures/result/contacts/001_create_view_copy.md',
        '/',
      ),
    ).toBe('/repo/tests/data-workflows/runtime/contacts/001_create_view_copy.last-run.json');
  });

  it('normalizes copy-comparison JSON by excluding runtime-only fields', () => {
    const sourceJson = buildContactJsonOrdered(
      'source-id',
      '01.01.000',
      '2026-04-16T05:31:26.289Z',
    );
    const copiedJson = buildContactJsonOrdered('copy-id', '01.01.000', '2026-04-19T00:00:00.000Z');

    expect(normalizeJsonForCopyComparison(sourceJson)).toEqual(
      normalizeJsonForCopyComparison(copiedJson),
    );
  });

  it('treats missing empty objects and arrays as equivalent during copy comparison', () => {
    const sourceJson = buildContactJsonOrdered(
      'source-id',
      '01.01.000',
      '2026-04-16T05:31:26.289Z',
    );
    const copiedJson = buildContactJsonOrdered('copy-id', '01.01.000', '2026-04-19T00:00:00.000Z');
    const sourceDataSetInformation = sourceJson.contactDataSet.contactInformation
      .dataSetInformation as Record<string, unknown>;

    sourceDataSetInformation.classificationInformation = {};
    sourceDataSetInformation['common:generalComment'] = [];
    sourceDataSetInformation['common:name'] = [];
    sourceDataSetInformation['common:synonyms'] = [];

    expect(normalizeJsonForCopyComparison(sourceJson)).toEqual(
      normalizeJsonForCopyComparison(copiedJson),
    );
  });

  it('builds a workflow runtime record without persisting json/json_ordered', () => {
    const runtimeRecord = buildContactCreateViewCopyRuntimeRecord(
      {
        createDataFile:
          '/repo/tests/data-workflows/fixtures/data/contacts/001_create_view_copy.json',
        createExpectedFile: '/repo/tests/data-workflows/fixtures/result/contacts/001_create.md',
        followUpExpectedFile:
          '/repo/tests/data-workflows/fixtures/result/contacts/001_create_view_copy.md',
        frontendUrl: 'http://127.0.0.1:8000',
        keepData: false,
      },
      {
        cleanupAttempted: true,
        cleanupPassed: true,
        copy: {
          comparableJsonMatchesSource: true,
          copiedId: 'copy-id',
          copiedVersion: '01.01.000',
          submittedRuleVerification: false,
        },
        copyStep: {
          expectationResults: [{ actual: true, label: 'copy', passed: true }],
          record: {
            id: 'copy-id',
            json: { copy: true },
            json_ordered: { copy: true },
            reviews: null,
            rule_verification: false,
            state_code: 0,
            team_id: null,
            user_id: 'user-1',
            version: '01.01.000',
          },
          submittedRuleVerification: false,
        },
        createStep: {
          expectationResults: [{ actual: true, label: 'create', passed: true }],
          record: {
            id: 'source-id',
            json: { create: true },
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
            id: 'source-id',
            jsonOrdered: { create: true },
            table: 'contacts',
          },
          runtimeId: 'source-id',
          sourceFixtureId: 'fixture-id',
          version: '01.01.000',
        },
        selectedUser: {
          email: 'user@example.com',
          role: 'user',
          userId: 'user-1',
        },
        sourceViewStep: {
          detail: {
            id: 'source-id',
            success: true,
            version: '01.01.000',
          },
          expectationResults: [{ actual: true, label: 'view source', passed: true }],
        },
        supabaseTarget: {
          apiUrl: 'https://fotofiyqnuyvgtotswie.supabase.co',
          dashboardUrl: 'https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie',
          projectId: 'fotofiyqnuyvgtotswie',
          publishableKey: 'sb_publishable_test',
        },
        viewCopyStep: {
          detail: {
            id: 'copy-id',
            success: true,
            version: '01.01.000',
          },
          expectationResults: [{ actual: true, label: 'view copy', passed: true }],
        },
      },
    );

    expect(runtimeRecord.create.persistedRecord).toEqual({
      id: 'source-id',
      reviews: null,
      rule_verification: false,
      state_code: 0,
      team_id: null,
      user_id: 'user-1',
      version: '01.01.000',
    });
    expect(runtimeRecord.copy.summary.copiedId).toBe('copy-id');
    expect(runtimeRecord.viewCopy.detail.id).toBe('copy-id');
  });

  it('runs the create-view-copy workflow and writes a runtime record', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'contacts-create-view-copy-'));

    try {
      const sourceId = '96926fa6-658a-465e-8f2e-022259ef9e6d';
      const copiedId = '11111111-1111-4111-8111-111111111111';
      const createDataFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'data',
        'contacts',
        '001_create_view_copy.json',
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
        '001_create_view_copy.md',
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
        '001_create_view_copy.last-run.json',
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

      const getContactDetail = jest.fn(async (id: string, version: string) => {
        const record = state.records.get(`${id}|${version}`);
        if (!record) {
          return {
            data: null,
            success: false,
          };
        }

        return {
          data: {
            id: record.id,
            json: deepClone(record.json),
            ruleVerification: record.rule_verification,
            userId: record.user_id,
            version: record.version,
          },
          success: true,
        };
      });

      const createContact = jest.fn(async (id: string, formData: any) => {
        const version =
          formData.administrativeInformation?.publicationAndOwnership?.['common:dataSetVersion'] ??
          '01.01.000';
        const shortName = deepClone(
          formData.contactInformation?.dataSetInformation?.['common:shortName'] ?? {
            '#text': 'test-contact',
            '@xml:lang': 'en',
          },
        );
        const jsonOrdered = buildContactJsonOrdered(
          id,
          version,
          '2026-04-19T00:00:00.000Z',
          shortName,
        );
        state.records.set(`${id}|${version}`, buildRecord(id, jsonOrdered, false, version));
        return {
          count: null,
          data: [
            {
              id,
              rule_verification: false,
              version,
            },
          ],
          error: null,
          status: 200,
          statusText: 'OK',
        };
      });

      const result = await runContactCreateViewCopySmoke(
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
          generateIdFn: () => copiedId,
          modulesLoader: async () =>
            ({
              contactsApi: {
                createContact,
                getContactDetail,
              },
              contactsUtil: {
                genContactFromData: (contactDataSet: any) => ({
                  administrativeInformation: deepClone(contactDataSet.administrativeInformation),
                  contactInformation: deepClone(contactDataSet.contactInformation),
                }),
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
      expect(result.sourceViewStep.detail).toEqual({
        id: sourceId,
        ruleVerification: false,
        success: true,
        userId: 'user-id-1',
        version: '01.01.000',
      });
      expect(result.copy.copiedId).toBe(copiedId);
      expect(result.copy.copiedVersion).toBe('01.01.000');
      expect(result.copy.comparableJsonMatchesSource).toBe(true);
      expect(result.copyStep.record.id).toBe(copiedId);
      expect(result.copyStep.submittedRuleVerification).toBe(false);
      expect(result.viewCopyStep.detail).toEqual({
        id: copiedId,
        ruleVerification: false,
        success: true,
        userId: 'user-id-1',
        version: '01.01.000',
      });
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
      expect(createContact).toHaveBeenCalledWith(
        copiedId,
        expect.objectContaining({
          administrativeInformation: expect.any(Object),
          contactInformation: expect.any(Object),
        }),
      );
      expect(state.deletedKeys).toEqual([`${copiedId}|01.01.000`, `${sourceId}|01.01.000`]);
      expect(signOut).toHaveBeenCalled();

      const runtimeRecord = JSON.parse(await readFile(runtimeRecordFile, 'utf8'));
      expect(runtimeRecord.create.runtimeId).toBe(sourceId);
      expect(runtimeRecord.copy.summary.copiedId).toBe(copiedId);
      expect(runtimeRecord.viewCopy.detail.id).toBe(copiedId);
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });
});
