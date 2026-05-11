import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  buildCreateVersionUpdateReferenceExpectations,
  buildUnitGroupCreateVersionUpdateReferenceRuntimeRecord,
  incrementDatasetVersion,
  parseCreateVersionUpdateReferenceCliArgs,
  runUnitGroupCreateVersionUpdateReferenceSmoke,
} from '../../workflows/unitgroups/unitgroups-create-version-update-reference-workflow-lib';

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

const OWNER_CONTACT_ID = 'a1d95758-6904-4802-a061-fedc6ac4b4b4';
const OWNER_CONTACT_URI = `../contacts/${OWNER_CONTACT_ID}.xml`;
const OWNER_DESCRIPTION = [
  {
    '#text': 'TianGong Think Tank',
    '@xml:lang': 'en',
  },
  {
    '#text': '天工智库中心',
    '@xml:lang': 'zh',
  },
];
const UPDATED_OWNER_DESCRIPTION = [
  {
    '#text': 'Version Contact',
    '@xml:lang': 'en',
  },
];

function buildUnitGroupJsonOrdered(
  id: string,
  version: string,
  ownerVersion: string,
  ownerShortDescription: any,
  timestamp = `generated-${version}`,
) {
  return {
    unitGroupDataSet: {
      '@xmlns': 'http://lca.jrc.it/ILCD/UnitGroup',
      '@xmlns:common': 'http://lca.jrc.it/ILCD/Common',
      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@version': '1.1',
      '@xsi:schemaLocation':
        'http://lca.jrc.it/ILCD/UnitGroup ../../schemas/ILCD_UnitGroupDataSet.xsd',
      unitGroupInformation: {
        dataSetInformation: {
          'common:UUID': id,
          'common:name': {
            '#text': 'test-unitgroup004_create_version_update_reference',
            '@xml:lang': 'en',
          },
          classificationInformation: {
            'common:classification': {
              'common:class': {
                '#text': 'Technical unit groups',
                '@classId': '1',
                '@level': '0',
              },
            },
          },
        },
        quantitativeReference: {
          referenceToReferenceUnit: '0',
        },
      },
      modellingAndValidation: {
        complianceDeclarations: {
          compliance: {
            'common:approvalOfOverallCompliance': 'Fully compliant',
            'common:referenceToComplianceSystem': {
              '@refObjectId': '9ba3ac1e-6797-4cc0-afd5-1b8f7bf28c6a',
              '@type': 'source data set',
              '@uri': '../sources/9ba3ac1e-6797-4cc0-afd5-1b8f7bf28c6a.xml',
              '@version': '03.00.003',
              'common:shortDescription': {
                '#text': 'ILCD Data Network - compliance (non-Process)',
                '@xml:lang': 'en',
              },
            },
          },
        },
      },
      administrativeInformation: {
        dataEntryBy: {
          'common:referenceToDataSetFormat': {
            '@refObjectId': 'a97a0155-0234-4b87-b4ce-a45da52f2a40',
            '@type': 'source data set',
            '@uri': '../sources/a97a0155-0234-4b87-b4ce-a45da52f2a40.xml',
            '@version': '03.00.003',
            'common:shortDescription': [
              {
                '#text': 'ILCD format',
                '@xml:lang': 'en',
              },
              {
                '#text': 'ILCD 数据格式',
                '@xml:lang': 'zh',
              },
            ],
          },
          'common:timeStamp': timestamp,
        },
        publicationAndOwnership: {
          'common:dataSetVersion': version,
          'common:referenceToOwnershipOfDataSet': {
            '@refObjectId': OWNER_CONTACT_ID,
            '@type': 'contact data set',
            '@uri': OWNER_CONTACT_URI,
            '@version': ownerVersion,
            'common:shortDescription': ownerShortDescription,
          },
        },
      },
      units: {
        unit: [
          {
            '@dataSetInternalID': '0',
            meanValue: '1',
            name: '长度',
          },
        ],
      },
    },
  };
}

function buildVersionComparisonFixture(id = '__RUNTIME_UNITGROUP_ID__') {
  return {
    id: '87d48aa7-35cb-4e15-8f32-449d8bd1f569',
    table: 'unitgroups',
    jsonOrdered: buildUnitGroupJsonOrdered(id, '01.01.000', '01.01.000', OWNER_DESCRIPTION),
  };
}

const expectedMarkdown = `# create

1. 数据库可根据id查询到刚创建的数据
2. \`json_ordered\`字段和创建数据上传的\`jsonOrdered\`一致
3. \`user_id\`和当前用户\`id\`一致
4. \`state_code\`为0
5. \`version\`为\`01.01.000\`
6. \`team_id\`为\`NULL\`
7. \`rule_verification\`为\`TRUE\`
8. \`reviews\`为\`NULL\`
9. \`json_ordered\`中的\`common:referenceToOwnershipOfDataSet.@refObjectId\`为\`${OWNER_CONTACT_ID}\`
10. \`json_ordered\`中的\`common:referenceToOwnershipOfDataSet.@uri\`和夹具中的联系人数据一致
11. \`json_ordered\`中的\`common:referenceToOwnershipOfDataSet.@version\`为\`01.01.000\`

# create version

12. 数据库可根据相同\`id\`和新\`version\`查询到新增版本数据
13. \`id\`和刚创建数据一致
14. \`version\`为\`01.01.001\`
15. \`json_ordered\`中除\`common:dataSetVersion\`、\`common:timeStamp\`、\`common:permanentDataSetURI\`外其余字段和刚创建数据一致
16. \`rule_verification\`为\`TRUE\`
17. \`json_ordered\`中的\`common:referenceToOwnershipOfDataSet.@version\`仍为\`01.01.000\`

# update reference

18. 数据库可根据相同\`id\`和新\`version\`查询到更新引用后的数据
19. \`version\`仍为\`01.01.001\`
20. \`rule_verification\`为\`TRUE\`
21. \`json_ordered\`中的\`common:referenceToOwnershipOfDataSet.@refObjectId\`仍为\`${OWNER_CONTACT_ID}\`
22. \`json_ordered\`中的\`common:referenceToOwnershipOfDataSet.common:shortDescription\`和当前数据中的联系人描述一致
23. \`json_ordered\`中的\`common:referenceToOwnershipOfDataSet.@version\`为\`01.01.001\`
`;

describe('unitgroups-create-version-update-reference-workflow-lib', () => {
  it('parses cli arguments with defaults and explicit flags', () => {
    const options = parseCreateVersionUpdateReferenceCliArgs(
      [
        '--role',
        'system-admin',
        '--frontend-url',
        'http://127.0.0.1:8000',
        '--supabase-url',
        'https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie',
        '--data-file',
        'fixtures/004.json',
        '--keep-created',
        '--generate-id',
        '--runtime-record-file',
        'output/workflow-runtime.json',
      ],
      '/repo',
    );

    expect(options.role).toBe('system-admin');
    expect(options.frontendUrl).toBe('http://127.0.0.1:8000');
    expect(options.supabaseUrl).toBe('https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie');
    expect(options.dataFile).toBe('/repo/fixtures/004.json');
    expect(options.keepData).toBe(true);
    expect(options.generateId).toBe(true);
    expect(options.writeRuntime).toBe(true);
    expect(options.runtimeRecordFile).toBe('/repo/output/workflow-runtime.json');
  });

  it('defaults role to user when --role is omitted', () => {
    const options = parseCreateVersionUpdateReferenceCliArgs([], '/repo');

    expect(options.role).toBe('user');
    expect(options.keepData).toBe(true);
    expect(options.generateId).toBe(true);
    expect(options.writeRuntime).toBe(true);
  });

  it('lets explicit --no-* flags disable the default workflow behaviors', () => {
    const options = parseCreateVersionUpdateReferenceCliArgs(
      ['--no-keep-data', '--no-generate-id', '--no-write-runtime'],
      '/repo',
    );

    expect(options.keepData).toBe(false);
    expect(options.generateId).toBe(false);
    expect(options.writeRuntime).toBe(false);
  });

  it('builds code-owned workflow expectations and increments versions', () => {
    const expectations = buildCreateVersionUpdateReferenceExpectations();

    expect(expectations).toEqual(
      expect.arrayContaining([
        {
          expected: '01.01.000',
          key: 'create.version',
          label: 'Create version is 01.01.000',
        },
        {
          expected: '01.01.001',
          key: 'createVersion.version',
          label: 'Create-version version is 01.01.001',
        },
        {
          expected: true,
          key: 'updateReference.ruleVerification',
          label: 'Update-reference rule_verification is true',
        },
      ]),
    );
    expect(incrementDatasetVersion('01.01.000')).toBe('01.01.001');
    expect(incrementDatasetVersion('01.99.999')).toBe('02.00.000');
  });

  it('builds a runtime record with version and update-reference summaries', () => {
    const runtimeRecord = buildUnitGroupCreateVersionUpdateReferenceRuntimeRecord(
      {
        dataFile:
          '/repo/tests/data-workflows/fixtures/data/unitgroups/004_create_version_update_reference.json',
        expectedFile:
          '/repo/tests/data-workflows/fixtures/result/unitgroups/004_create_version_update_reference.md',
        frontendUrl: 'http://127.0.0.1:8000',
        keepData: false,
      },
      {
        cleanupAttempted: true,
        cleanupPassed: true,
        createStep: {
          expectationResults: [{ actual: true, label: '`create.rowExists`为`TRUE`', passed: true }],
          record: {
            id: 'unitgroup-1',
            json_ordered: { create: true },
            reviews: null,
            rule_verification: true,
            state_code: 0,
            team_id: null,
            user_id: 'user-1',
            version: '01.01.000',
          },
          submittedRuleVerification: true,
        },
        createVersionStep: {
          expectationResults: [
            {
              actual: true,
              label: '`createVersion.sameIdAsCreate`为`TRUE`',
              passed: true,
            },
          ],
          record: {
            id: 'unitgroup-1',
            json_ordered: { version: true },
            reviews: null,
            rule_verification: true,
            state_code: 0,
            team_id: null,
            user_id: 'user-1',
            version: '01.01.001',
          },
          submittedRuleVerification: true,
        },
        createdVersions: ['01.01.000', '01.01.001'],
        frontendProbe: { ok: true, skipped: true },
        passed: true,
        referenceUpdate: {
          availableNewRefCount: 1,
          currentOwnerDescription: [{ lang: 'en', text: 'Version Contact' }],
          ownerReference: {
            refObjectId: OWNER_CONTACT_ID,
            shortDescription: [{ lang: 'en', text: 'Version Contact' }],
            uri: OWNER_CONTACT_URI,
            version: '01.01.001',
          },
          selectedNewRef: {
            currentVersion: '01.01.000',
            id: OWNER_CONTACT_ID,
            newVersion: '01.01.001',
            type: 'contact data set',
          },
        },
        runtimeFixture: {
          fixture: {
            id: 'unitgroup-1',
            jsonOrdered: { any: 'value' },
            table: 'unitgroups',
          },
          runtimeId: 'unitgroup-1',
          sourceFixtureId: 'fixture-id',
          version: '01.01.000',
        },
        selectedUser: {
          email: 'system-admin@example.com',
          role: 'system-admin',
          userId: 'user-1',
        },
        supabaseTarget: {
          apiUrl: 'https://fotofiyqnuyvgtotswie.supabase.co',
          dashboardUrl: 'https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie',
          projectId: 'fotofiyqnuyvgtotswie',
          publishableKey: 'sb_publishable_test',
        },
        updateReferenceStep: {
          expectationResults: [
            {
              actual: true,
              label: '`updateReference.ownerRefVersionEqualsUpdatedVersion`为`TRUE`',
              passed: true,
            },
          ],
          record: {
            id: 'unitgroup-1',
            json_ordered: { update: true },
            reviews: null,
            rule_verification: true,
            state_code: 0,
            team_id: null,
            user_id: 'user-1',
            version: '01.01.001',
          },
          submittedRuleVerification: true,
        },
        versionCreation: {
          comparableJsonMatchesCreate: true,
          newVersion: '01.01.001',
          ownerReference: {
            refObjectId: OWNER_CONTACT_ID,
            shortDescription: [{ lang: 'en', text: 'TianGong Think Tank' }],
            uri: OWNER_CONTACT_URI,
            version: '01.01.000',
          },
          permanentDataSetUri: undefined,
        },
      },
    );

    expect(runtimeRecord.createdVersions).toEqual(['01.01.000', '01.01.001']);
    expect(runtimeRecord.createVersion.summary.newVersion).toBe('01.01.001');
    expect(runtimeRecord.updateReference.summary.selectedNewRef?.newVersion).toBe('01.01.001');
    expect(
      (runtimeRecord.updateReference.persistedRecord as Record<string, unknown>).json_ordered,
    ).toBeUndefined();
  });

  it('runs the create-version-update-reference workflow on the same unit group id', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'unitgroups-version-reference-'));

    try {
      const dataFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'data',
        'unitgroups',
        '004_create_version_update_reference.json',
      );
      const expectedFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'result',
        'unitgroups',
        '004_create_version_update_reference.md',
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
        '004_create_version_update_reference.last-run.json',
      );

      await writeJson(dataFile, buildVersionComparisonFixture());
      await writeText(expectedFile, expectedMarkdown);
      await writeJson(usersFile, {
        'system-admin': {
          email: 'system-admin@example.com',
          password: 'secret',
        },
      });

      const state = {
        deletedVersions: [] as string[],
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
            data: state.records.get(filters.version) ?? null,
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
            request.body.jsonOrdered.unitGroupDataSet.administrativeInformation
              .publicationAndOwnership['common:dataSetVersion'];
          state.records.set(version, {
            id: request.body.id,
            json_ordered: request.body.jsonOrdered,
            reviews: null,
            rule_verification: request.body.ruleVerification,
            state_code: 0,
            team_id: null,
            user_id: 'user-id-1',
            version,
          });
          return {
            data: { id: request.body.id, version },
            error: null,
          };
        }

        if (functionName === 'app_dataset_save_draft') {
          state.records.set(request.body.version, {
            ...state.records.get(request.body.version),
            json_ordered: request.body.jsonOrdered,
            rule_verification: request.body.ruleVerification,
          });
          return {
            data: { id: request.body.id, version: request.body.version },
            error: null,
          };
        }

        if (functionName === 'app_dataset_delete') {
          state.records.delete(request.body.version);
          state.deletedVersions.push(request.body.version);
          return {
            data: { ok: true },
            error: null,
          };
        }

        throw new Error(`Unexpected function invoke: ${functionName}`);
      });

      const updateRefsData = (obj: any, refs: any[], updateVersion: boolean) => {
        const refsByKey = new Map(refs.map((ref) => [`${ref.id}|${ref.type}`, ref]));
        const traverse = (current: any) => {
          if (!current || typeof current !== 'object') {
            return;
          }
          if (
            current['@refObjectId'] &&
            current['@type'] &&
            refsByKey.has(`${current['@refObjectId']}|${current['@type']}`)
          ) {
            const matched = refsByKey.get(`${current['@refObjectId']}|${current['@type']}`);
            if (matched && updateVersion) {
              current['@version'] = matched.newVersion;
            }
            if (matched?.newDescription) {
              current['common:shortDescription'] = deepClone(matched.newDescription);
            }
          }
          if (Array.isArray(current)) {
            current.forEach((item) => traverse(item));
            return;
          }
          Object.values(current).forEach((value) => traverse(value));
        };

        traverse(obj);
        return obj;
      };

      const result = await runUnitGroupCreateVersionUpdateReferenceSmoke(
        {
          dataFile,
          expectedFile,
          generateId: true,
          help: false,
          keepData: false,
          role: 'system-admin',
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
                validateDatasetRuleVerification: jest.fn().mockResolvedValue({
                  datasetSdkValid: true,
                  nonExistentRef: [],
                  ruleVerification: true,
                  unRuleVerification: [],
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
              unitgroupsUtil: {
                genUnitGroupFromData: (unitGroupDataSet: any) => ({
                  administrativeInformation: deepClone(unitGroupDataSet.administrativeInformation),
                  modellingAndValidation: deepClone(unitGroupDataSet.modellingAndValidation),
                  unitGroupInformation: deepClone(unitGroupDataSet.unitGroupInformation),
                  units: deepClone(unitGroupDataSet.units),
                }),
                genUnitGroupJsonOrdered: (id: string, data: any) => {
                  const version =
                    data.administrativeInformation.publicationAndOwnership['common:dataSetVersion'];
                  return {
                    unitGroupDataSet: {
                      '@xmlns': 'http://lca.jrc.it/ILCD/UnitGroup',
                      '@xmlns:common': 'http://lca.jrc.it/ILCD/Common',
                      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                      '@version': '1.1',
                      '@xsi:schemaLocation':
                        'http://lca.jrc.it/ILCD/UnitGroup ../../schemas/ILCD_UnitGroupDataSet.xsd',
                      unitGroupInformation: deepClone(data.unitGroupInformation),
                      modellingAndValidation: deepClone(data.modellingAndValidation),
                      administrativeInformation: {
                        dataEntryBy: {
                          ...deepClone(data.administrativeInformation.dataEntryBy),
                          'common:timeStamp': `generated-${version}`,
                        },
                        publicationAndOwnership: {
                          ...deepClone(data.administrativeInformation.publicationAndOwnership),
                          'common:dataSetVersion': version,
                        },
                      },
                      units: deepClone(data.units),
                    },
                  };
                },
              },
              updateReference: {
                getRefsOfCurrentVersion: jest.fn(async (initData: any) => {
                  const currentReference =
                    initData.administrativeInformation.publicationAndOwnership[
                      'common:referenceToOwnershipOfDataSet'
                    ];
                  return {
                    oldRefs: [
                      {
                        currentVersion: currentReference['@version'],
                        id: currentReference['@refObjectId'],
                        key: `owner:${currentReference['@version']}`,
                        newDescription: deepClone(UPDATED_OWNER_DESCRIPTION),
                        newVersion: currentReference['@version'],
                        type: currentReference['@type'],
                      },
                    ],
                  };
                }),
                getRefsOfNewVersion: jest.fn(async (initData: any) => {
                  const currentReference =
                    initData.administrativeInformation.publicationAndOwnership[
                      'common:referenceToOwnershipOfDataSet'
                    ];
                  return {
                    newRefs: [
                      {
                        currentVersion: currentReference['@version'],
                        id: currentReference['@refObjectId'],
                        key: `owner:${currentReference['@version']}->01.01.001`,
                        newDescription: deepClone(UPDATED_OWNER_DESCRIPTION),
                        newVersion: '01.01.001',
                        type: currentReference['@type'],
                      },
                    ],
                    oldRefs: [],
                  };
                }),
                updateRefsData,
              },
            }) as any,
        },
      );

      expect(result.passed).toBe(true);
      expect(result.runtimeFixture.runtimeId).not.toBe('87d48aa7-35cb-4e15-8f32-449d8bd1f569');
      expect(result.createdVersions).toEqual(['01.01.000', '01.01.001']);
      expect(result.createStep.record.id).toBe(result.runtimeFixture.runtimeId);
      expect(result.createVersionStep.record.version).toBe('01.01.001');
      expect(result.versionCreation.comparableJsonMatchesCreate).toBe(true);
      expect(result.versionCreation.permanentDataSetUri).toBeUndefined();
      expect(result.updateReferenceStep.record.version).toBe('01.01.001');
      expect(result.referenceUpdate.selectedNewRef?.newVersion).toBe('01.01.001');
      expect(result.referenceUpdate.ownerReference.version).toBe('01.01.001');
      expect(state.deletedVersions).toEqual(['01.01.001', '01.01.000']);

      const runtimeRecord = JSON.parse(await readFile(runtimeRecordFile, 'utf8'));
      expect(runtimeRecord.passed).toBe(true);
      expect(runtimeRecord.createdVersions).toEqual(['01.01.000', '01.01.001']);
      expect(runtimeRecord.updateReference.summary.selectedNewRef.newVersion).toBe('01.01.001');
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });
});
