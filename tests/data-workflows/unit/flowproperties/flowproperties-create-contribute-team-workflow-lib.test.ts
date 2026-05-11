import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { runFlowpropertyCreateContributeTeamSmoke } from '../../workflows/flowproperties/flowproperties-create-contribute-team-workflow-lib';

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildPermanentUri(id: string, version: string) {
  return `https://lcdn.tiangong.earth/datasetdetail/flowproperty.xhtml?uuid=${id}&version=${version}`;
}

function buildFlowpropertyJsonOrdered(id: string, version: string, timestamp: string) {
  return {
    flowPropertyDataSet: {
      flowPropertiesInformation: {
        dataSetInformation: {
          'common:UUID': id,
          'common:name': {
            '#text': 'team-flowproperty',
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

describe('flowproperties-create-contribute-team-workflow-lib', () => {
  it('matches create rule_verification to the submitted rule verification result', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'flowproperties-create-contribute-'));

    try {
      const flowpropertyId = '96926fa6-658a-465e-8f2e-022259ef9e6d';
      const createDataFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'data',
        'flowProperties',
        '005_create_contribute_team.json',
      );
      const createExpectedFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'result',
        'flowProperties',
        '005_create_contribute_team_create.md',
      );
      const followUpExpectedFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'result',
        'flowProperties',
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
        'flowProperties',
        '005_create_contribute_team.last-run.json',
      );

      await writeJson(createDataFile, {
        id: flowpropertyId,
        table: 'flowproperties',
        jsonOrdered: buildFlowpropertyJsonOrdered(
          flowpropertyId,
          '01.01.000',
          '2026-04-20T09:36:36.892Z',
        ),
      });
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
      const from = jest.fn().mockReturnValue({ select });

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
            request.body.jsonOrdered.flowPropertyDataSet.administrativeInformation
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

      const result = await runFlowpropertyCreateContributeTeamSmoke(
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
          computeCreateRuleVerificationFn: async () => true,
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

      const createRuleExpectation = result.createStep.expectationResults.find(
        (expectation) =>
          expectation.label ===
          'Create before contribute rule_verification matches code expectation',
      );

      expect(result.passed).toBe(true);
      expect(result.createStep.submittedRuleVerification).toBe(true);
      expect(createRuleExpectation).toEqual(
        expect.objectContaining({
          actual: true,
          expected: true,
          passed: true,
        }),
      );
      expect(functionsInvoke).toHaveBeenNthCalledWith(
        1,
        'app_dataset_create',
        expect.objectContaining({
          body: expect.objectContaining({
            id: flowpropertyId,
            ruleVerification: true,
            table: 'flowproperties',
          }),
        }),
      );
      expect(contributeSource).toHaveBeenCalledWith('flowproperties', flowpropertyId, '01.01.000');
      expect(state.deletedKeys).toEqual([`${flowpropertyId}|01.01.000`]);

      const runtimeRecord = JSON.parse(await readFile(runtimeRecordFile, 'utf8'));
      const runtimeRuleExpectation = runtimeRecord.create.expectationResults.find(
        (expectation: { label: string }) =>
          expectation.label ===
          'Create before contribute rule_verification matches code expectation',
      );
      expect(runtimeRuleExpectation.expected).toBe(true);
      expect(runtimeRuleExpectation.passed).toBe(true);
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });
});
