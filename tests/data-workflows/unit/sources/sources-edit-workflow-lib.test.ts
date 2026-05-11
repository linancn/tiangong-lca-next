import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  buildParsedValidationExpectationResults,
  buildSourceEditRuntimeRecord,
  buildValidationExpectations,
  parseEditCliArgs,
  runSourceEditSmoke,
} from '../../workflows/sources/sources-edit-workflow-lib';

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(filePath: string, value: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, value, 'utf8');
}

describe('sources-edit-workflow-lib', () => {
  it('parses cli arguments with defaults and explicit flags', () => {
    const options = parseEditCliArgs(
      [
        '--role',
        'user',
        '--frontend-url',
        'http://127.0.0.1:8000',
        '--supabase-url',
        'https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie',
        '--create-data-file',
        'fixtures/create.json',
        '--success-data-file',
        'fixtures/success.json',
        '--data-file',
        'fixtures/fail.json',
        '--keep-created',
        '--generate-id',
        '--no-verify-frontend',
        '--runtime-record-file',
        'output/edit-runtime.json',
      ],
      '/repo',
    );

    expect(options.role).toBe('user');
    expect(options.frontendUrl).toBe('http://127.0.0.1:8000');
    expect(options.supabaseUrl).toBe('https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie');
    expect(options.createDataFile).toBe('/repo/fixtures/create.json');
    expect(options.successDataFile).toBe('/repo/fixtures/success.json');
    expect(options.editDataFile).toBe('/repo/fixtures/fail.json');
    expect(options.keepData).toBe(true);
    expect(options.generateId).toBe(true);
    expect(options.verifyFrontend).toBe(false);
    expect(options.writeRuntime).toBe(true);
    expect(options.runtimeRecordFile).toBe('/repo/output/edit-runtime.json');
  });

  it('defaults role to user when --role is omitted', () => {
    const options = parseEditCliArgs([], '/repo');

    expect(options.role).toBe('user');
    expect(options.keepData).toBe(true);
    expect(options.generateId).toBe(true);
    expect(options.writeRuntime).toBe(true);
  });

  it('lets explicit --no-* flags disable the default workflow behaviors', () => {
    const options = parseEditCliArgs(
      ['--no-keep-data', '--no-generate-id', '--no-write-runtime'],
      '/repo',
    );

    expect(options.keepData).toBe(false);
    expect(options.generateId).toBe(false);
    expect(options.writeRuntime).toBe(false);
  });

  it('builds code-owned explicit validation expectations', () => {
    const expectations = buildValidationExpectations({
      datasetSdkValid: false,
      nonExistentRefCount: 0,
      unRuleVerificationCount: 0,
    });

    expect(expectations).toEqual([
      {
        expected: false,
        kind: 'datasetSdkValidEquals',
        label: 'validateDatasetRuleVerification.datasetSdkValid matches code expectation',
      },
      {
        expected: 0,
        kind: 'unRuleVerificationCountEquals',
        label: 'validateDatasetRuleVerification.unRuleVerification.length matches code expectation',
      },
      {
        expected: 0,
        kind: 'nonExistentRefCountEquals',
        label: 'validateDatasetRuleVerification.nonExistentRef.length matches code expectation',
      },
    ]);
  });

  it('evaluates code-owned validation expectations against a validation summary', () => {
    const results = buildParsedValidationExpectationResults(
      {
        datasetSdkValid: false,
        nonExistentRefCount: 0,
        ruleVerification: false,
        unRuleVerificationCount: 0,
      },
      buildValidationExpectations({
        datasetSdkValid: false,
        nonExistentRefCount: 0,
        unRuleVerificationCount: 0,
      }),
    );

    expect(results).toEqual([
      {
        actual: false,
        expected: false,
        label: 'validateDatasetRuleVerification.datasetSdkValid matches code expectation',
        passed: true,
      },
      {
        actual: 0,
        expected: 0,
        label: 'validateDatasetRuleVerification.unRuleVerification.length matches code expectation',
        passed: true,
      },
      {
        actual: 0,
        expected: 0,
        label: 'validateDatasetRuleVerification.nonExistentRef.length matches code expectation',
        passed: true,
      },
    ]);
  });

  it('builds a runtime record with success and failing edit summaries', () => {
    const runtimeRecord = buildSourceEditRuntimeRecord(
      {
        createDataFile: '/repo/tests/data-workflows/fixtures/data/sources/001_create.json',
        createExpectedFile: '/repo/tests/data-workflows/fixtures/result/sources/001_create.md',
        editDataFile:
          '/repo/tests/data-workflows/fixtures/data/sources/003_edit_data_validate_false.json',
        editExpectedFile:
          '/repo/tests/data-workflows/fixtures/result/sources/003_edit_data_validate_false.md',
        frontendUrl: 'http://127.0.0.1:8000',
        keepData: false,
        successDataFile:
          '/repo/tests/data-workflows/fixtures/data/sources/002_check_data_success.json',
        successExpectedFile:
          '/repo/tests/data-workflows/fixtures/result/sources/002_check_data_success.md',
      },
      {
        cleanupAttempted: true,
        cleanupPassed: true,
        createStep: {
          expectationResults: [{ actual: true, label: 'create', passed: true }],
          record: {
            id: 'source-1',
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
        failingEditStep: {
          expectationResults: [{ actual: false, label: 'fail', passed: true }],
          record: {
            id: 'source-1',
            json_ordered: { fail: true },
            reviews: null,
            rule_verification: false,
            state_code: 0,
            team_id: null,
            user_id: 'user-1',
            version: '01.01.000',
          },
          submittedRuleVerification: false,
        },
        failingValidation: {
          datasetSdkValid: false,
          nonExistentRefCount: 0,
          ruleVerification: false,
          unRuleVerificationCount: 0,
        },
        frontendProbe: { ok: true, skipped: true },
        passed: true,
        selectedUser: {
          email: 'test@example.com',
          role: 'user',
          userId: 'user-1',
        },
        successEditStep: {
          expectationResults: [{ actual: true, label: 'success', passed: true }],
          record: {
            id: 'source-1',
            json_ordered: { success: true },
            reviews: null,
            rule_verification: true,
            state_code: 0,
            team_id: null,
            user_id: 'user-1',
            version: '01.01.000',
          },
          submittedRuleVerification: true,
        },
        successValidation: {
          datasetSdkValid: true,
          nonExistentRefCount: 0,
          ruleVerification: true,
          unRuleVerificationCount: 0,
        },
        supabaseTarget: {
          apiUrl: 'https://fotofiyqnuyvgtotswie.supabase.co',
          dashboardUrl: 'https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie',
          projectId: 'fotofiyqnuyvgtotswie',
          publishableKey: 'sb_publishable_test',
        },
      },
    );

    expect(runtimeRecord.successEdit.validation).toEqual({
      datasetSdkValid: true,
      nonExistentRefCount: 0,
      ruleVerification: true,
      unRuleVerificationCount: 0,
    });
    expect(runtimeRecord.failingEdit.validation).toEqual({
      datasetSdkValid: false,
      nonExistentRefCount: 0,
      ruleVerification: false,
      unRuleVerificationCount: 0,
    });
    expect(runtimeRecord.failingEdit.persistedRecord.rule_verification).toBe(false);
  });

  it('runs the create-success-fail edit workflow on a single source record', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'sources-edit-workflow-'));

    try {
      const createDataFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'data',
        'sources',
        '001_create.json',
      );
      const createExpectedFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'result',
        'sources',
        '001_create.md',
      );
      const successDataFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'data',
        'sources',
        '002_check_data_success.json',
      );
      const successExpectedFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'result',
        'sources',
        '002_check_data_success.md',
      );
      const editDataFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'data',
        'sources',
        '003_edit_data_validate_false.json',
      );
      const editExpectedFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'result',
        'sources',
        '003_edit_data_validate_false.md',
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
        'sources',
        '003_edit_data_validate_false.last-run.json',
      );

      await writeJson(createDataFile, {
        id: 'fixture-source-id',
        table: 'sources',
        jsonOrdered: {
          sourceDataSet: {
            sourceInformation: {
              dataSetInformation: {
                'common:UUID': 'fixture-source-id',
              },
            },
            administrativeInformation: {
              publicationAndOwnership: {
                'common:dataSetVersion': '01.01.000',
                'common:permanentDataSetURI':
                  'https://lcdn.tiangong.earth/datasetdetail/source.xhtml?uuid=fixture-source-id&version=01.01.000',
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
      await writeJson(successDataFile, {
        table: 'sources',
        jsonOrdered: {
          sourceDataSet: {
            sourceInformation: {
              dataSetInformation: {
                'common:UUID': '__RUNTIME_SOURCE_ID__',
                'common:name': {
                  '#text': '1',
                  '@xml:lang': 'en',
                },
                'common:shortName': {
                  '#text': 'updated-source-success',
                  '@xml:lang': 'en',
                },
              },
            },
            administrativeInformation: {
              publicationAndOwnership: {
                'common:dataSetVersion': '01.01.000',
                'common:permanentDataSetURI':
                  'https://lcdn.tiangong.earth/datasetdetail/source.xhtml?uuid=__RUNTIME_SOURCE_ID__&version=01.01.000',
                'common:referenceToOwnershipOfDataSet': {
                  '@refObjectId': 'existing-source',
                  '@type': 'source data set',
                  '@uri': '../sources/existing-source.xml',
                  '@version': '01.01.001',
                },
              },
            },
          },
        },
      });
      await writeText(
        successExpectedFile,
        `# success

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
      await writeJson(editDataFile, {
        table: 'sources',
        jsonOrdered: {
          sourceDataSet: {
            sourceInformation: {
              dataSetInformation: {
                'common:UUID': '__RUNTIME_SOURCE_ID__',
                'common:name': {
                  '#text': '2',
                  '@xml:lang': 'en',
                },
                'common:shortName': {
                  '#text': 'updated-source-fail',
                  '@xml:lang': 'en',
                },
              },
            },
            administrativeInformation: {
              publicationAndOwnership: {
                'common:dataSetVersion': '01.01.000',
                'common:permanentDataSetURI':
                  'https://lcdn.tiangong.earth/datasetdetail/source.xhtml?uuid=__RUNTIME_SOURCE_ID__&version=01.01.000',
                'common:referenceToOwnershipOfDataSet': {
                  '@refObjectId': 'missing-source',
                  '@type': 'source data set',
                  '@uri': '../sources/missing-source.xml',
                  '@version': '99.99.999',
                },
              },
            },
          },
        },
      });
      await writeText(
        editExpectedFile,
        `# fail

1. 数据库可根据id查询到已更新的数据
2. \`json_ordered\`字段和第三阶段上传的\`jsonOrdered\`一致
3. \`user_id\`和当前用户\`id\`一致
4. \`state_code\`为0
5. \`version\`为\`01.01.000\`
6. \`team_id\`为\`NULL\`
7. \`rule_verification\`为\`FALSE\`
8. \`reviews\`为\`NULL\`
9. \`validateDatasetRuleVerification.datasetSdkValid\`为\`FALSE\`
10. \`validateDatasetRuleVerification.unRuleVerification.length\`为0
11. \`validateDatasetRuleVerification.nonExistentRef.length\`为0
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
          return { data: { id: request.body.id }, error: null };
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
          return { data: { ok: true }, error: null };
        }

        throw new Error(`Unexpected function invoke: ${functionName}`);
      });
      const validateDatasetRuleVerification = jest
        .fn()
        .mockResolvedValueOnce({
          datasetSdkValid: false,
          nonExistentRef: [],
          ruleVerification: false,
          unRuleVerification: [{ path: 'create-invalid' }],
        })
        .mockResolvedValueOnce({
          datasetSdkValid: true,
          nonExistentRef: [],
          ruleVerification: true,
          unRuleVerification: [],
        })
        .mockResolvedValueOnce({
          datasetSdkValid: false,
          nonExistentRef: [],
          ruleVerification: false,
          unRuleVerification: [],
        });

      const result = await runSourceEditSmoke(
        {
          createDataFile,
          createExpectedFile,
          editDataFile,
          editExpectedFile,
          generateId: false,
          help: false,
          keepData: false,
          role: 'user',
          runtimeRecordFile,
          successDataFile,
          successExpectedFile,
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
      expect(result.createStep.record.id).toBe('fixture-source-id');
      expect(result.successEditStep.record.id).toBe('fixture-source-id');
      expect(result.failingEditStep.record.id).toBe('fixture-source-id');
      expect(result.createStep.record.rule_verification).toBe(false);
      expect(result.successEditStep.record.rule_verification).toBe(true);
      expect(result.failingEditStep.record.rule_verification).toBe(false);
      expect(result.successValidation).toEqual({
        datasetSdkValid: true,
        nonExistentRefCount: 0,
        ruleVerification: true,
        unRuleVerificationCount: 0,
      });
      expect(result.failingValidation).toEqual({
        datasetSdkValid: false,
        nonExistentRefCount: 0,
        ruleVerification: false,
        unRuleVerificationCount: 0,
      });
      expect(result.cleanupAttempted).toBe(true);
      expect(result.cleanupPassed).toBe(true);
      expect(result.runtimeRecordWritten).toBe(true);
      expect(validateDatasetRuleVerification).toHaveBeenCalledTimes(3);
      expect(functionsInvoke).toHaveBeenNthCalledWith(
        1,
        'app_dataset_create',
        expect.objectContaining({
          body: expect.objectContaining({
            id: 'fixture-source-id',
            ruleVerification: false,
            table: 'sources',
          }),
        }),
      );
      expect(functionsInvoke).toHaveBeenNthCalledWith(
        2,
        'app_dataset_save_draft',
        expect.objectContaining({
          body: expect.objectContaining({
            id: 'fixture-source-id',
            ruleVerification: true,
            table: 'sources',
            version: '01.01.000',
          }),
        }),
      );
      expect(functionsInvoke).toHaveBeenNthCalledWith(
        3,
        'app_dataset_save_draft',
        expect.objectContaining({
          body: expect.objectContaining({
            id: 'fixture-source-id',
            ruleVerification: false,
            table: 'sources',
            version: '01.01.000',
          }),
        }),
      );
      expect(functionsInvoke).toHaveBeenNthCalledWith(
        4,
        'app_dataset_delete',
        expect.objectContaining({
          body: {
            id: 'fixture-source-id',
            table: 'sources',
            version: '01.01.000',
          },
        }),
      );
      expect(
        functionsInvoke.mock.calls[2]?.[1]?.body?.jsonOrdered?.sourceDataSet
          ?.administrativeInformation?.publicationAndOwnership?.[
          'common:referenceToOwnershipOfDataSet'
        ]?.['@refObjectId'],
      ).toBe('missing-source');

      const writtenRuntimeRecord = JSON.parse(await readFile(runtimeRecordFile, 'utf8'));
      expect(writtenRuntimeRecord.successEdit.persistedRecord.rule_verification).toBe(true);
      expect(writtenRuntimeRecord.failingEdit.validation).toEqual({
        datasetSdkValid: false,
        nonExistentRefCount: 0,
        ruleVerification: false,
        unRuleVerificationCount: 0,
      });
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });
});
