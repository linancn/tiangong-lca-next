import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  buildUnitGroupCheckDataRuntimeRecord,
  buildValidationExpectationResults,
  getExpectedRuleVerification,
  getFixtureOrderedJson,
  parseCheckDataCliArgs,
  runUnitGroupCheckDataSmoke,
  type UnitGroupCheckDataFixture,
} from '../../workflows/unitgroups/unitgroups-check-data-workflow-lib';
import { buildCreateExpectations } from '../../workflows/unitgroups/unitgroups-create-workflow-lib';

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(filePath: string, value: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, value, 'utf8');
}

describe('unitgroups-check-data-workflow-lib', () => {
  it('parses cli arguments with workflow defaults and explicit flags', () => {
    const options = parseCheckDataCliArgs(
      [
        '--role',
        'user',
        '--frontend-url',
        'http://127.0.0.1:8000',
        '--supabase-url',
        'https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie',
        '--create-data-file',
        'fixtures/create.json',
        '--data-file',
        'fixtures/check.json',
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
    expect(options.checkDataFile).toBe('/repo/fixtures/check.json');
    expect(options.keepData).toBe(true);
    expect(options.generateId).toBe(true);
    expect(options.verifyFrontend).toBe(false);
    expect(options.writeRuntime).toBe(true);
    expect(options.runtimeRecordFile).toBe('/repo/output/workflow-runtime.json');
    expect(options.usersFile).toBe('/repo/tests/data-workflows/fixtures/data/users.json');
  });

  it('defaults role to system-admin when --role is omitted', () => {
    const options = parseCheckDataCliArgs([], '/repo');

    expect(options.role).toBe('system-admin');
    expect(options.keepData).toBe(true);
    expect(options.generateId).toBe(true);
    expect(options.writeRuntime).toBe(true);
  });

  it('lets explicit --no-* flags disable the default workflow behaviors', () => {
    const options = parseCheckDataCliArgs(
      ['--no-keep-data', '--no-generate-id', '--no-write-runtime'],
      '/repo',
    );

    expect(options.keepData).toBe(false);
    expect(options.generateId).toBe(false);
    expect(options.writeRuntime).toBe(false);
  });

  it('prefers jsonOrdered and falls back to json_ordered then json in validation fixtures', () => {
    const withJsonOrdered: UnitGroupCheckDataFixture = {
      json: { from: 'json' },
      json_ordered: { from: 'json_ordered' },
      jsonOrdered: { from: 'jsonOrdered' },
      table: 'unitgroups',
    };
    const withOrderedJson: UnitGroupCheckDataFixture = {
      json: { from: 'json' },
      json_ordered: { from: 'json_ordered' },
      table: 'unitgroups',
    };
    const withJsonOnly: UnitGroupCheckDataFixture = {
      json: { from: 'json' },
      table: 'unitgroups',
    };

    expect(getFixtureOrderedJson(withJsonOrdered)).toEqual({ from: 'jsonOrdered' });
    expect(getFixtureOrderedJson(withOrderedJson)).toEqual({ from: 'json_ordered' });
    expect(getFixtureOrderedJson(withJsonOnly)).toEqual({ from: 'json' });
  });

  it('extracts expected rule_verification values from code-owned expectations', () => {
    const expectations = buildCreateExpectations({ ruleVerification: true });

    expect(getExpectedRuleVerification(expectations)).toBe(true);
  });

  it('builds validation expectation results for success cases', () => {
    const results = buildValidationExpectationResults(
      {
        datasetSdkValid: true,
        nonExistentRefCount: 0,
        ruleVerification: true,
        unRuleVerificationCount: 0,
      },
      true,
    );

    expect(results).toEqual([
      {
        actual: true,
        expected: true,
        label:
          'validateDatasetRuleVerification.ruleVerification matches expected rule_verification',
        passed: true,
      },
      {
        actual: true,
        expected: true,
        label: 'validateDatasetRuleVerification.datasetSdkValid remains true for success cases',
        passed: true,
      },
      {
        actual: 0,
        expected: 0,
        label: 'validateDatasetRuleVerification.unRuleVerification stays empty for success cases',
        passed: true,
      },
      {
        actual: 0,
        expected: 0,
        label: 'validateDatasetRuleVerification.nonExistentRef stays empty for success cases',
        passed: true,
      },
    ]);
  });

  it('builds only the top-level ruleVerification expectation for failure-oriented cases', () => {
    const results = buildValidationExpectationResults(
      {
        datasetSdkValid: true,
        nonExistentRefCount: 1,
        ruleVerification: false,
        unRuleVerificationCount: 1,
      },
      false,
    );

    expect(results).toEqual([
      {
        actual: false,
        expected: false,
        label:
          'validateDatasetRuleVerification.ruleVerification matches expected rule_verification',
        passed: true,
      },
    ]);
  });

  it('builds a workflow runtime record without persisting json_ordered', () => {
    const runtimeRecord = buildUnitGroupCheckDataRuntimeRecord(
      {
        checkDataFile:
          '/repo/tests/data-workflows/fixtures/data/unitgroups/002_check_data_success.json',
        checkExpectedFile:
          '/repo/tests/data-workflows/fixtures/result/unitgroups/002_check_data_success.md',
        createDataFile: '/repo/tests/data-workflows/fixtures/data/unitgroups/001_create.json',
        createExpectedFile: '/repo/tests/data-workflows/fixtures/result/unitgroups/001_create.md',
        frontendUrl: 'http://127.0.0.1:8000',
        keepData: true,
      },
      {
        cleanupAttempted: false,
        cleanupPassed: true,
        createStep: {
          expectationResults: [{ actual: true, label: 'create', passed: true }],
          record: {
            id: 'unitgroup-1',
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
            id: 'unitgroup-1',
            jsonOrdered: { create: true },
            table: 'unitgroups',
          },
          runtimeId: 'unitgroup-1',
          sourceFixtureId: 'fixture-id',
          version: '01.01.000',
        },
        selectedUser: {
          email: 'test@example.com',
          role: 'user',
          userId: 'user-1',
        },
        supabaseTarget: {
          apiUrl: 'https://fotofiyqnuyvgtotswie.supabase.co',
          dashboardUrl: 'https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie',
          projectId: 'fotofiyqnuyvgtotswie',
          publishableKey: 'sb_publishable_test',
        },
        updateStep: {
          expectationResults: [{ actual: true, label: 'check', passed: true }],
          record: {
            id: 'unitgroup-1',
            json_ordered: { check: true },
            reviews: null,
            rule_verification: true,
            state_code: 0,
            team_id: null,
            user_id: 'user-1',
            version: '01.01.000',
          },
          submittedRuleVerification: true,
        },
        validation: {
          datasetSdkValid: true,
          nonExistentRefCount: 0,
          ruleVerification: true,
          unRuleVerificationCount: 0,
        },
      },
    );

    expect(runtimeRecord.check.persistedRecord).toEqual({
      id: 'unitgroup-1',
      reviews: null,
      rule_verification: true,
      state_code: 0,
      team_id: null,
      user_id: 'user-1',
      version: '01.01.000',
    });
    expect(runtimeRecord.create.runtimeId).toBe('unitgroup-1');
    expect(runtimeRecord.supabase.projectId).toBe('fotofiyqnuyvgtotswie');
  });

  it('runs the create-then-update workflow against one unit group record and writes a runtime record', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'unitgroups-check-data-workflow-'));

    try {
      const createDataFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'data',
        'unitgroups',
        '001_create.json',
      );
      const createExpectedFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'result',
        'unitgroups',
        '001_create.md',
      );
      const checkDataFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'data',
        'unitgroups',
        '002_check_data_success.json',
      );
      const checkExpectedFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'result',
        'unitgroups',
        '002_check_data_success.md',
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
        'unitgroups',
        '002_check_data_success.last-run.json',
      );

      await writeJson(createDataFile, {
        id: 'fixture-unitgroup-id',
        table: 'unitgroups',
        jsonOrdered: {
          unitGroupDataSet: {
            unitGroupInformation: {
              dataSetInformation: {
                'common:UUID': 'fixture-unitgroup-id',
              },
            },
            administrativeInformation: {
              publicationAndOwnership: {
                'common:dataSetVersion': '01.01.000',
              },
            },
          },
        },
      });
      await writeText(
        createExpectedFile,
        `# create

1. 数据库可根据id查询到刚创建的数据
2. \`json_ordered\`字段和创建数据上传的\`jsonOrdered\`一致
3. \`user_id\`和当前用户\`id\`一致
4. \`state_code\`为0
5. \`version\`为\`01.01.000\`
6. \`team_id\`为\`NULL\`
7. \`rule_verification\`为\`FALSE\`
8. \`reviews\`为\`NULL\`
`,
      );
      await writeJson(checkDataFile, {
        table: 'unitgroups',
        jsonOrdered: {
          unitGroupDataSet: {
            unitGroupInformation: {
              dataSetInformation: {
                'common:UUID': '__RUNTIME_UNITGROUP_ID__',
                'common:shortName': {
                  '#text': 'updated-unitgroup',
                  '@xml:lang': 'en',
                },
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
      });
      await writeText(
        checkExpectedFile,
        `# check

1. 数据库可根据id查询到已更新的数据
2. \`json_ordered\`字段和第二阶段上传的\`jsonOrdered\`一致
3. \`user_id\`和当前用户\`id\`一致
4. \`state_code\`为0
5. \`version\`为\`01.01.000\`
6. \`team_id\`为\`NULL\`
7. \`rule_verification\`为\`TRUE\`
8. \`reviews\`为\`NULL\`
`,
      );
      await writeJson(usersFile, {
        user: {
          email: 'user@example.com',
          password: 'secret',
        },
      });

      const state: {
        deleted: boolean;
        record: any;
      } = {
        deleted: false,
        record: null,
      };

      const maybeSingle = jest.fn(async () => ({
        data: state.deleted ? null : state.record,
        error: null,
      }));
      const queryBuilder = {
        eq: jest.fn().mockImplementation(() => queryBuilder),
        maybeSingle,
      };
      const select = jest.fn().mockReturnValue(queryBuilder);
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
          state.deleted = false;
          state.record = {
            id: request.body.id,
            json_ordered: request.body.jsonOrdered,
            reviews: null,
            rule_verification: request.body.ruleVerification,
            state_code: 0,
            team_id: null,
            user_id: 'user-id-1',
            version: '01.01.000',
          };
          return {
            data: { id: request.body.id },
            error: null,
          };
        }

        if (functionName === 'app_dataset_save_draft') {
          state.record = {
            ...state.record,
            json_ordered: request.body.jsonOrdered,
            rule_verification: request.body.ruleVerification,
            version: request.body.version,
          };
          return {
            data: { id: request.body.id, version: request.body.version },
            error: null,
          };
        }

        if (functionName === 'app_dataset_delete') {
          state.deleted = true;
          return {
            data: { ok: true },
            error: null,
          };
        }

        throw new Error(`Unexpected function invoke: ${functionName}`);
      });
      const validateDatasetRuleVerification = jest
        .fn()
        .mockResolvedValueOnce({
          datasetSdkValid: false,
          nonExistentRef: [],
          ruleVerification: false,
          unRuleVerification: [{ path: 'missing-shortName' }],
        })
        .mockResolvedValueOnce({
          datasetSdkValid: true,
          nonExistentRef: [],
          ruleVerification: true,
          unRuleVerification: [],
        });

      const result = await runUnitGroupCheckDataSmoke(
        {
          checkDataFile,
          checkExpectedFile,
          createDataFile,
          createExpectedFile,
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
          modulesLoader: async () =>
            ({
              generalApi: {
                getTeamIdByUserId: jest.fn().mockResolvedValue(''),
              },
              review: {
                validateDatasetRuleVerification,
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
      expect(result.runtimeFixture.runtimeId).toBe('fixture-unitgroup-id');
      expect(result.createStep.record.id).toBe('fixture-unitgroup-id');
      expect(result.updateStep.record.id).toBe('fixture-unitgroup-id');
      expect(result.createStep.record.rule_verification).toBe(false);
      expect(result.updateStep.record.rule_verification).toBe(true);
      expect(result.validation).toEqual({
        datasetSdkValid: true,
        nonExistentRefCount: 0,
        ruleVerification: true,
        unRuleVerificationCount: 0,
      });
      expect(result.cleanupAttempted).toBe(true);
      expect(result.cleanupPassed).toBe(true);
      expect(result.runtimeRecordWritten).toBe(true);
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'secret',
      });
      expect(validateDatasetRuleVerification).toHaveBeenCalledTimes(2);
      expect(functionsInvoke).toHaveBeenNthCalledWith(
        1,
        'app_dataset_create',
        expect.objectContaining({
          body: expect.objectContaining({
            id: 'fixture-unitgroup-id',
            ruleVerification: false,
            table: 'unitgroups',
          }),
        }),
      );
      expect(functionsInvoke).toHaveBeenNthCalledWith(
        2,
        'app_dataset_save_draft',
        expect.objectContaining({
          body: expect.objectContaining({
            id: 'fixture-unitgroup-id',
            ruleVerification: true,
            table: 'unitgroups',
            version: '01.01.000',
          }),
        }),
      );
      expect(
        functionsInvoke.mock.calls[1]?.[1]?.body?.jsonOrdered?.unitGroupDataSet
          ?.unitGroupInformation?.dataSetInformation?.['common:UUID'],
      ).toBe('fixture-unitgroup-id');
      expect(
        functionsInvoke.mock.calls[1]?.[1]?.body?.jsonOrdered?.unitGroupDataSet
          ?.administrativeInformation?.publicationAndOwnership?.[
          'common:referenceToOwnershipOfDataSet'
        ]?.['@refObjectId'],
      ).toBe('owner-contact-id');
      expect(
        functionsInvoke.mock.calls[1]?.[1]?.body?.jsonOrdered?.unitGroupDataSet
          ?.administrativeInformation?.publicationAndOwnership?.['common:permanentDataSetURI'],
      ).toBeUndefined();
      expect(functionsInvoke).toHaveBeenNthCalledWith(
        3,
        'app_dataset_delete',
        expect.objectContaining({
          body: {
            id: 'fixture-unitgroup-id',
            table: 'unitgroups',
            version: '01.01.000',
          },
        }),
      );
      expect(signOut).toHaveBeenCalled();

      const writtenRuntimeRecord = JSON.parse(await readFile(runtimeRecordFile, 'utf8'));
      expect(writtenRuntimeRecord.create.runtimeId).toBe('fixture-unitgroup-id');
      expect(writtenRuntimeRecord.check.persistedRecord).toEqual({
        id: 'fixture-unitgroup-id',
        reviews: null,
        rule_verification: true,
        state_code: 0,
        team_id: null,
        user_id: 'user-id-1',
        version: '01.01.000',
      });
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });
});
