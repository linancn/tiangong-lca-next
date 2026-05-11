import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  buildContactCreateVersionUpdateReferenceRuntimeRecord,
  buildCreateVersionUpdateReferenceExpectations,
  incrementDatasetVersion,
  parseCreateVersionUpdateReferenceCliArgs,
  runContactCreateVersionUpdateReferenceSmoke,
} from '../../workflows/contacts/contacts-create-version-update-reference-workflow-lib';

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

function buildContactUri(id: string) {
  return `../contacts/${id}.xml`;
}

function buildContactJsonOrdered(
  id: string,
  version: string,
  ownerVersion: string,
  ownerShortName: any,
) {
  return {
    contactDataSet: {
      contactInformation: {
        dataSetInformation: {
          'common:UUID': id,
          'common:name': {
            '#text': '1',
            '@xml:lang': 'en',
          },
          'common:shortName': {
            '#text': 'Version Contact',
            '@xml:lang': 'en',
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
          },
          'common:timeStamp': `generated-${version}`,
        },
        publicationAndOwnership: {
          'common:dataSetVersion': version,
          'common:permanentDataSetURI': buildPermanentUri(id, version),
          'common:referenceToOwnershipOfDataSet': {
            '@refObjectId': id,
            '@type': 'contact data set',
            '@uri': buildContactUri(id),
            '@version': ownerVersion,
            'common:shortDescription': ownerShortName,
          },
        },
      },
    },
  };
}

function buildVersionComparisonFixture(id = '__RUNTIME_CONTACT_ID__') {
  return {
    id: '87d48aa7-35cb-4e15-8f32-449d8bd1f569',
    table: 'contacts',
    jsonOrdered: {
      contactDataSet: {
        contactInformation: {
          dataSetInformation: {
            'common:UUID': id,
            'common:name': {
              '#text': '1',
              '@xml:lang': 'en',
            },
            'common:shortName': {
              '#text': 'Version Contact',
              '@xml:lang': 'en',
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
            },
            'common:timeStamp': '2026-04-17T08:09:18.504Z',
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.01.000',
            'common:permanentDataSetURI':
              'https://lcdn.tiangong.earth/datasetdetail/contact.xhtml?uuid=__RUNTIME_CONTACT_ID__&version=01.01.000',
            'common:referenceToOwnershipOfDataSet': {
              '@refObjectId': '__RUNTIME_CONTACT_ID__',
              '@type': 'contact data set',
              '@uri': '../contacts/__RUNTIME_CONTACT_ID__.xml',
              '@version': '01.01.000',
              'common:shortDescription': {
                '#text': 'test-updatereference',
                '@xml:lang': 'en',
              },
            },
          },
        },
      },
    },
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
9. \`json_ordered\`中的\`common:referenceToOwnershipOfDataSet.@refObjectId\`和刚创建数据的\`id\`一致
10. \`json_ordered\`中的\`common:referenceToOwnershipOfDataSet.@uri\`和刚创建数据的\`id\`一致
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
21. \`json_ordered\`中的\`common:referenceToOwnershipOfDataSet.@version\`更新为\`01.01.001\`
22. \`json_ordered\`中的\`common:referenceToOwnershipOfDataSet.common:shortDescription\`和当前数据的\`common:shortName\`一致
`;

describe('contacts-create-version-update-reference-workflow-lib', () => {
  it('parses cli arguments with defaults and explicit flags', () => {
    const options = parseCreateVersionUpdateReferenceCliArgs(
      [
        '--role',
        'user',
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

    expect(options.role).toBe('user');
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
    const runtimeRecord = buildContactCreateVersionUpdateReferenceRuntimeRecord(
      {
        dataFile:
          '/repo/tests/data-workflows/fixtures/data/contacts/004_create_version_update_reference.json',
        expectedFile:
          '/repo/tests/data-workflows/fixtures/result/contacts/004_create_version_update_reference.md',
        frontendUrl: 'http://127.0.0.1:8000',
        keepData: false,
      },
      {
        cleanupAttempted: true,
        cleanupPassed: true,
        createStep: {
          expectationResults: [{ actual: true, label: '`create.rowExists`为`TRUE`', passed: true }],
          record: {
            id: 'contact-1',
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
            id: 'contact-1',
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
          currentShortName: [{ lang: 'en', text: 'Version Contact' }],
          ownerReference: {
            refObjectId: 'contact-1',
            shortDescription: [{ lang: 'en', text: 'Version Contact' }],
            uri: '../contacts/contact-1.xml',
            version: '01.01.001',
          },
          selectedNewRef: {
            currentVersion: '01.01.000',
            id: 'contact-1',
            newVersion: '01.01.001',
            type: 'contact data set',
          },
        },
        runtimeFixture: {
          fixture: {
            id: 'contact-1',
            jsonOrdered: { any: 'value' },
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
        updateReferenceStep: {
          expectationResults: [
            {
              actual: true,
              label: '`updateReference.ownerRefVersionEqualsCreatedVersion`为`TRUE`',
              passed: true,
            },
          ],
          record: {
            id: 'contact-1',
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
            refObjectId: 'contact-1',
            shortDescription: [{ lang: 'en', text: 'test-updatereference' }],
            uri: '../contacts/contact-1.xml',
            version: '01.01.000',
          },
          permanentDataSetUri:
            'https://lcdn.tiangong.earth/datasetdetail/contact.xhtml?uuid=contact-1&version=01.01.001',
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

  it('runs the create-version-update-reference workflow on the same contact id', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'contacts-version-reference-'));

    try {
      const dataFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'data',
        'contacts',
        '004_create_version_update_reference.json',
      );
      const expectedFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'result',
        'contacts',
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
        'contacts',
        '004_create_version_update_reference.last-run.json',
      );

      await writeJson(dataFile, buildVersionComparisonFixture());
      await writeText(expectedFile, expectedMarkdown);
      await writeJson(usersFile, {
        user: {
          email: 'user@example.com',
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

      const functionsInvoke = jest.fn(async (_functionName: string, request: any) => {
        if (_functionName === 'app_dataset_create') {
          const version =
            request.body.jsonOrdered.contactDataSet.administrativeInformation
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

        if (_functionName === 'app_dataset_save_draft') {
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

        if (_functionName === 'app_dataset_delete') {
          state.records.delete(request.body.version);
          state.deletedVersions.push(request.body.version);
          return {
            data: { ok: true },
            error: null,
          };
        }

        throw new Error(`Unexpected function invoke: ${_functionName}`);
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

      const result = await runContactCreateVersionUpdateReferenceSmoke(
        {
          dataFile,
          expectedFile,
          generateId: true,
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
              contactsUtil: {
                genContactFromData: (contactDataSet: any) => ({
                  administrativeInformation: deepClone(contactDataSet.administrativeInformation),
                  contactInformation: deepClone(contactDataSet.contactInformation),
                }),
                genContactJsonOrdered: (id: string, data: any) => {
                  const version =
                    data.administrativeInformation.publicationAndOwnership['common:dataSetVersion'];
                  const ownerReference =
                    data.administrativeInformation.publicationAndOwnership[
                      'common:referenceToOwnershipOfDataSet'
                    ];
                  return buildContactJsonOrdered(
                    id,
                    version,
                    ownerReference['@version'],
                    ownerReference['common:shortDescription'],
                  );
                },
              },
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
                        newDescription: [
                          {
                            '#text': 'Version Contact',
                            '@xml:lang': 'en',
                          },
                        ],
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
                  const availableVersions = Array.from(state.records.keys()).sort();
                  const latestVersion =
                    availableVersions.find((version) => version !== currentReference['@version']) ??
                    currentReference['@version'];

                  return {
                    newRefs: [
                      {
                        currentVersion: currentReference['@version'],
                        id: currentReference['@refObjectId'],
                        key: `owner:${currentReference['@version']}->${latestVersion}`,
                        newDescription: [
                          {
                            '#text': 'Version Contact',
                            '@xml:lang': 'en',
                          },
                        ],
                        newVersion: latestVersion,
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
