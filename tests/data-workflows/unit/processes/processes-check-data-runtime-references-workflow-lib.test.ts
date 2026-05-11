import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  buildProcessCheckDataRuntimeReferencesRuntimeRecord,
  parseCheckDataRuntimeReferencesCliArgs,
  runProcessCheckDataRuntimeReferencesSmoke,
} from '../../workflows/processes/processes-check-data-runtime-references-workflow-lib';

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(filePath: string, value: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, value, 'utf8');
}

function buildSeedReference(type: string, uri: string, id: string, version = '01.01.000') {
  return {
    '@refObjectId': id,
    '@type': type,
    '@uri': uri,
    '@version': version,
    'common:shortDescription': {
      '#text': 'seed-reference',
      '@xml:lang': 'en',
    },
  };
}

function buildContactFixture() {
  return {
    id: 'contact-fixture-id',
    table: 'contacts',
    jsonOrdered: {
      contactDataSet: {
        contactInformation: {
          dataSetInformation: {
            'common:UUID': 'contact-fixture-id',
            'common:shortName': {
              '#text': 'Runtime Contact',
              '@xml:lang': 'en',
            },
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:referenceToDataSetFormat': buildSeedReference(
              'source data set',
              '../sources/source-seed.xml',
              'source-seed',
            ),
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.01.000',
            'common:permanentDataSetURI':
              'https://lcdn.tiangong.earth/datasetdetail/contact.xhtml?uuid=contact-fixture-id&version=01.01.000',
          },
        },
      },
    },
  };
}

function buildContactCheckFixture() {
  return {
    table: 'contacts',
    jsonOrdered: {
      contactDataSet: {
        contactInformation: {
          dataSetInformation: {
            'common:UUID': '__RUNTIME_CONTACT_ID__',
            'common:name': {
              '#text': 'Runtime Contact Full Name',
              '@xml:lang': 'en',
            },
            'common:shortName': {
              '#text': 'Runtime Contact Checked',
              '@xml:lang': 'en',
            },
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:referenceToDataSetFormat': buildSeedReference(
              'source data set',
              '../sources/source-seed.xml',
              'source-seed',
            ),
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.01.000',
            'common:permanentDataSetURI':
              'https://lcdn.tiangong.earth/datasetdetail/contact.xhtml?uuid=__RUNTIME_CONTACT_ID__&version=01.01.000',
            'common:referenceToOwnershipOfDataSet': buildSeedReference(
              'contact data set',
              '../contacts/contact-seed.xml',
              'contact-seed',
            ),
          },
        },
      },
    },
  };
}

function buildSourceFixture() {
  return {
    id: 'source-fixture-id',
    table: 'sources',
    jsonOrdered: {
      sourceDataSet: {
        sourceInformation: {
          dataSetInformation: {
            'common:UUID': '__RUNTIME_SOURCE_ID__',
            'common:shortName': {
              '#text': 'Runtime Source',
              '@xml:lang': 'en',
            },
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:referenceToDataSetFormat': {
              '@uri': '../sources/__RUNTIME_SOURCE_ID__.xml',
              '@type': 'source data set',
              '@version': '03.00.003',
              '@refObjectId': '__RUNTIME_SOURCE_ID__',
              'common:shortDescription': {
                '#text': 'seed-source',
                '@xml:lang': 'en',
              },
            },
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.01.000',
            'common:permanentDataSetURI':
              'https://lcdn.tiangong.earth/datasetdetail/source.xhtml?uuid=__RUNTIME_SOURCE_ID__&version=01.01.000',
          },
        },
      },
    },
  };
}

function buildSourceCheckFixture() {
  return {
    table: 'sources',
    jsonOrdered: {
      sourceDataSet: {
        sourceInformation: {
          dataSetInformation: {
            'common:UUID': '__RUNTIME_SOURCE_ID__',
            'common:shortName': {
              '#text': 'Runtime Source Checked',
              '@xml:lang': 'en',
            },
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:referenceToDataSetFormat': buildSeedReference(
              'source data set',
              '../sources/source-seed.xml',
              'source-seed',
            ),
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.01.000',
            'common:permanentDataSetURI':
              'https://lcdn.tiangong.earth/datasetdetail/source.xhtml?uuid=__RUNTIME_SOURCE_ID__&version=01.01.000',
            'common:referenceToOwnershipOfDataSet': buildSeedReference(
              'contact data set',
              '../contacts/contact-seed.xml',
              'contact-seed',
            ),
          },
        },
      },
    },
  };
}

function buildFlowpropertyFixture() {
  return {
    id: 'flowproperty-fixture-id',
    table: 'flowproperties',
    jsonOrdered: {
      flowPropertyDataSet: {
        flowPropertiesInformation: {
          dataSetInformation: {
            'common:UUID': '__RUNTIME_FLOWPROPERTY_ID__',
            'common:name': {
              '#text': 'Runtime Flowproperty',
              '@xml:lang': 'en',
            },
          },
        },
        modellingAndValidation: {
          complianceDeclarations: {
            compliance: {
              'common:referenceToComplianceSystem': buildSeedReference(
                'source data set',
                '../sources/source-seed.xml',
                'source-seed',
              ),
            },
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:referenceToDataSetFormat': buildSeedReference(
              'source data set',
              '../sources/source-seed.xml',
              'source-seed',
            ),
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.01.000',
            'common:permanentDataSetURI':
              'https://lcdn.tiangong.earth/datasetdetail/flowproperty.xhtml?uuid=__RUNTIME_FLOWPROPERTY_ID__&version=01.01.000',
          },
        },
      },
    },
  };
}

function buildFlowpropertyCheckFixture() {
  return {
    table: 'flowproperties',
    jsonOrdered: {
      flowPropertyDataSet: {
        flowPropertiesInformation: {
          dataSetInformation: {
            'common:UUID': '__RUNTIME_FLOWPROPERTY_ID__',
            'common:name': {
              '#text': 'Runtime Flowproperty Checked',
              '@xml:lang': 'en',
            },
          },
          quantitativeReference: {
            referenceToReferenceUnitGroup: buildSeedReference(
              'unit group data set',
              '../unitgroups/unitgroup-seed.xml',
              'unitgroup-seed',
            ),
          },
        },
        modellingAndValidation: {
          complianceDeclarations: {
            compliance: {
              'common:referenceToComplianceSystem': buildSeedReference(
                'source data set',
                '../sources/source-seed.xml',
                'source-seed',
              ),
            },
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:referenceToDataSetFormat': buildSeedReference(
              'source data set',
              '../sources/source-seed.xml',
              'source-seed',
            ),
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.01.000',
            'common:permanentDataSetURI':
              'https://lcdn.tiangong.earth/datasetdetail/flowproperty.xhtml?uuid=__RUNTIME_FLOWPROPERTY_ID__&version=01.01.000',
            'common:referenceToOwnershipOfDataSet': buildSeedReference(
              'contact data set',
              '../contacts/contact-seed.xml',
              'contact-seed',
            ),
          },
        },
      },
    },
  };
}

function buildFlowFixture() {
  return {
    id: 'flow-fixture-id',
    table: 'flows',
    jsonOrdered: {
      flowDataSet: {
        flowInformation: {
          dataSetInformation: {
            'common:UUID': '__RUNTIME_FLOW_ID__',
            name: {
              baseName: {
                '#text': 'Runtime Flow',
                '@xml:lang': 'en',
              },
            },
          },
        },
        flowProperties: {
          flowProperty: {
            referenceToFlowPropertyDataSet: buildSeedReference(
              'flow property data set',
              '../flowproperties/flowproperty-seed.xml',
              'flowproperty-seed',
            ),
          },
        },
        modellingAndValidation: {
          complianceDeclarations: {
            compliance: {
              'common:referenceToComplianceSystem': buildSeedReference(
                'source data set',
                '../sources/source-seed.xml',
                'source-seed',
              ),
            },
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:referenceToDataSetFormat': buildSeedReference(
              'source data set',
              '../sources/source-seed.xml',
              'source-seed',
            ),
            'common:referenceToPersonOrEntityEnteringTheData': buildSeedReference(
              'contact data set',
              '../contacts/contact-seed.xml',
              'contact-seed',
            ),
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.01.000',
            'common:permanentDataSetURI':
              'https://lcdn.tiangong.earth/datasetdetail/productFlow.xhtml?uuid=__RUNTIME_FLOW_ID__&version=01.01.000',
            'common:referenceToOwnershipOfDataSet': buildSeedReference(
              'contact data set',
              '../contacts/contact-seed.xml',
              'contact-seed',
            ),
          },
        },
      },
    },
  };
}

function buildFlowCheckFixture() {
  return {
    table: 'flows',
    jsonOrdered: {
      flowDataSet: {
        flowInformation: {
          dataSetInformation: {
            'common:UUID': '__RUNTIME_FLOW_ID__',
            name: {
              baseName: {
                '#text': 'Runtime Flow Checked',
                '@xml:lang': 'en',
              },
            },
          },
        },
        flowProperties: {
          flowProperty: {
            referenceToFlowPropertyDataSet: buildSeedReference(
              'flow property data set',
              '../flowproperties/flowproperty-seed.xml',
              'flowproperty-seed',
            ),
          },
        },
        modellingAndValidation: {
          complianceDeclarations: {
            compliance: {
              'common:referenceToComplianceSystem': buildSeedReference(
                'source data set',
                '../sources/source-seed.xml',
                'source-seed',
              ),
            },
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:referenceToDataSetFormat': buildSeedReference(
              'source data set',
              '../sources/source-seed.xml',
              'source-seed',
            ),
            'common:referenceToPersonOrEntityEnteringTheData': buildSeedReference(
              'contact data set',
              '../contacts/contact-seed.xml',
              'contact-seed',
            ),
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.01.000',
            'common:permanentDataSetURI':
              'https://lcdn.tiangong.earth/datasetdetail/productFlow.xhtml?uuid=__RUNTIME_FLOW_ID__&version=01.01.000',
            'common:referenceToOwnershipOfDataSet': buildSeedReference(
              'contact data set',
              '../contacts/contact-seed.xml',
              'contact-seed',
            ),
          },
        },
      },
    },
  };
}

function buildProcessCreateFixture() {
  return {
    id: 'process-fixture-id',
    table: 'processes',
    jsonOrdered: {
      processDataSet: {
        processInformation: {
          dataSetInformation: {
            'common:UUID': 'process-fixture-id',
            name: {
              baseName: {
                '#text': 'Runtime Process Create',
                '@xml:lang': 'en',
              },
            },
          },
        },
        administrativeInformation: {
          publicationAndOwnership: {
            'common:dataSetVersion': '01.01.000',
            'common:permanentDataSetURI':
              'https://lcdn.tiangong.earth/datasetdetail/process.xhtml?uuid=process-fixture-id&version=01.01.000',
          },
        },
      },
    },
  };
}

function buildProcessCheckFixture() {
  return {
    table: 'processes',
    jsonOrdered: {
      processDataSet: {
        processInformation: {
          dataSetInformation: {
            'common:UUID': '__RUNTIME_PROCESS_ID__',
            name: {
              baseName: {
                '#text': 'Runtime Process Check',
                '@xml:lang': 'en',
              },
            },
          },
        },
        exchanges: {
          exchange: [
            {
              '@dataSetInternalID': '0',
              exchangeDirection: 'Input',
              referenceToFlowDataSet: buildSeedReference(
                'flow data set',
                '../flows/flow-seed.xml',
                'flow-seed',
              ),
            },
          ],
        },
        modellingAndValidation: {
          dataSourcesTreatmentAndRepresentativeness: {
            referenceToDataSource: buildSeedReference(
              'source data set',
              '../sources/source-seed.xml',
              'source-seed',
            ),
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:referenceToDataSetFormat': buildSeedReference(
              'source data set',
              '../sources/source-seed.xml',
              'source-seed',
            ),
            'common:referenceToPersonOrEntityEnteringTheData': buildSeedReference(
              'contact data set',
              '../contacts/contact-seed.xml',
              'contact-seed',
            ),
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.01.000',
            'common:permanentDataSetURI':
              'https://lcdn.tiangong.earth/datasetdetail/process.xhtml?uuid=__RUNTIME_PROCESS_ID__&version=01.01.000',
            'common:referenceToOwnershipOfDataSet': buildSeedReference(
              'contact data set',
              '../contacts/contact-seed.xml',
              'contact-seed',
            ),
          },
          'common:commissionerAndGoal': {
            'common:referenceToCommissioner': buildSeedReference(
              'contact data set',
              '../contacts/contact-seed.xml',
              'contact-seed',
            ),
          },
        },
      },
    },
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

const contactCreateExpectedMarkdown = `# create

1. 数据库可根据id查询到刚创建的数据
2. \`json_ordered\`字段和创建数据上传的\`jsonOrdered\`一致
3. \`user_id\`和当前用户\`id\`一致
4. \`state_code\`为0
5. \`version\`为\`01.01.000\`
6. \`team_id\`为\`NULL\`
7. \`rule_verification\`为\`FALSE\`
8. \`reviews\`为\`NULL\`
`;

const contactCheckExpectedMarkdown = `# check

1. 数据库可根据id查询到已更新的数据
2. \`json_ordered\`字段和第二阶段上传的\`jsonOrdered\`一致
3. \`user_id\`和当前用户\`id\`一致
4. \`state_code\`为0
5. \`version\`为\`01.01.000\`
6. \`team_id\`为\`NULL\`
7. \`rule_verification\`为\`TRUE\`
8. \`reviews\`为\`NULL\`
`;

const checkExpectedMarkdown = `# check

1. 数据库可根据id查询到已更新的数据
2. \`json_ordered\`字段和第二阶段上传的\`jsonOrdered\`一致
3. \`user_id\`和当前用户\`id\`一致
4. \`state_code\`为0
5. \`version\`为\`01.01.000\`
6. \`team_id\`为\`NULL\`
7. \`rule_verification\`为\`TRUE\`
8. \`reviews\`为\`NULL\`
`;

const processCheckExpectedMarkdown = `# check

1. 数据库可根据id查询到已更新的数据
2. \`json_ordered\`字段和第二阶段上传的\`jsonOrdered\`一致
3. \`user_id\`和当前用户\`id\`一致
4. \`state_code\`为0
5. \`version\`为\`01.01.000\`
6. \`team_id\`为\`NULL\`
7. \`rule_verification\`为\`TRUE\`
8. \`reviews\`为\`NULL\`
9. \`json_ordered.processDataSet.exchanges.exchange.0.referenceToFlowDataSet\` equals \`testFlowReference\`
10. \`json_ordered.processDataSet.modellingAndValidation.dataSourcesTreatmentAndRepresentativeness.referenceToDataSource\` equals \`testSourceReference\`
11. \`json_ordered.processDataSet.administrativeInformation.dataEntryBy.common:referenceToDataSetFormat\` equals \`testSourceReference\`
12. \`json_ordered.processDataSet.administrativeInformation.dataEntryBy.common:referenceToPersonOrEntityEnteringTheData\` equals \`testContactReference\`
13. \`json_ordered.processDataSet.administrativeInformation.publicationAndOwnership.common:referenceToOwnershipOfDataSet\` equals \`testContactReference\`
14. \`json_ordered.processDataSet.administrativeInformation.common:commissionerAndGoal.common:referenceToCommissioner\` equals \`testContactReference\`
`;

function extractVersionFromJsonOrdered(table: string, jsonOrdered: Record<string, any>) {
  switch (table) {
    case 'contacts':
      return jsonOrdered.contactDataSet.administrativeInformation.publicationAndOwnership[
        'common:dataSetVersion'
      ];
    case 'sources':
      return jsonOrdered.sourceDataSet.administrativeInformation.publicationAndOwnership[
        'common:dataSetVersion'
      ];
    case 'flowproperties':
      return jsonOrdered.flowPropertyDataSet.administrativeInformation.publicationAndOwnership[
        'common:dataSetVersion'
      ];
    case 'flows':
      return jsonOrdered.flowDataSet.administrativeInformation.publicationAndOwnership[
        'common:dataSetVersion'
      ];
    case 'processes':
      return jsonOrdered.processDataSet.administrativeInformation.publicationAndOwnership[
        'common:dataSetVersion'
      ];
    default:
      throw new Error(`Unsupported table: ${table}`);
  }
}

describe('processes-check-data-runtime-references-workflow-lib', () => {
  it('parses cli arguments with dependency defaults and explicit overrides', () => {
    const options = parseCheckDataRuntimeReferencesCliArgs(
      [
        '--role',
        'user',
        '--frontend-url',
        'http://127.0.0.1:8000',
        '--supabase-url',
        'https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie',
        '--contact-data-file',
        'fixtures/contact.json',
        '--flow-data-file',
        'fixtures/flow.json',
        '--data-file',
        'fixtures/process-check.json',
        '--runtime-record-file',
        'output/runtime.json',
      ],
      '/repo',
    );

    expect(options.role).toBe('user');
    expect(options.frontendUrl).toBe('http://127.0.0.1:8000');
    expect(options.supabaseUrl).toBe('https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie');
    expect(options.contactDataFile).toBe('/repo/fixtures/contact.json');
    expect(options.flowDataFile).toBe('/repo/fixtures/flow.json');
    expect(options.checkDataFile).toBe('/repo/fixtures/process-check.json');
    expect(options.runtimeRecordFile).toBe('/repo/output/runtime.json');
    expect(options.keepData).toBe(true);
    expect(options.generateId).toBe(true);
    expect(options.writeRuntime).toBe(true);
  });

  it('builds a runtime record without persisting json_ordered fields', () => {
    const runtimeRecord = buildProcessCheckDataRuntimeReferencesRuntimeRecord(
      {
        checkDataFile:
          '/repo/tests/data-workflows/fixtures/data/processes/006_check_data_runtime_references.json',
        checkExpectedFile:
          '/repo/tests/data-workflows/fixtures/result/processes/006_check_data_runtime_references.md',
        contactCheckDataFile:
          '/repo/tests/data-workflows/fixtures/data/contacts/002_check_data_success.json',
        contactCheckExpectedFile:
          '/repo/tests/data-workflows/fixtures/result/contacts/002_check_data_success.md',
        contactDataFile: '/repo/tests/data-workflows/fixtures/data/contacts/001_create.json',
        contactExpectedFile: '/repo/tests/data-workflows/fixtures/result/contacts/001_create.md',
        createDataFile: '/repo/tests/data-workflows/fixtures/data/processes/001_create.json',
        createExpectedFile: '/repo/tests/data-workflows/fixtures/result/processes/001_create.md',
        flowCheckDataFile:
          '/repo/tests/data-workflows/fixtures/data/flows/002_check_data_success.json',
        flowCheckExpectedFile:
          '/repo/tests/data-workflows/fixtures/result/flows/002_check_data_success.md',
        flowDataFile: '/repo/tests/data-workflows/fixtures/data/flows/001_create.json',
        flowExpectedFile: '/repo/tests/data-workflows/fixtures/result/flows/001_create.md',
        flowpropertyCheckDataFile:
          '/repo/tests/data-workflows/fixtures/data/flowProperties/002_check_data_success.json',
        flowpropertyCheckExpectedFile:
          '/repo/tests/data-workflows/fixtures/result/flowProperties/002_check_data_success.md',
        flowpropertyDataFile:
          '/repo/tests/data-workflows/fixtures/data/flowProperties/001_create.json',
        flowpropertyExpectedFile:
          '/repo/tests/data-workflows/fixtures/result/flowProperties/001_create.md',
        frontendUrl: 'http://127.0.0.1:8000',
        keepData: false,
        sourceCheckDataFile:
          '/repo/tests/data-workflows/fixtures/data/sources/002_check_data_success.json',
        sourceCheckExpectedFile:
          '/repo/tests/data-workflows/fixtures/result/sources/002_check_data_success.md',
        sourceDataFile: '/repo/tests/data-workflows/fixtures/data/sources/001_create.json',
        sourceExpectedFile: '/repo/tests/data-workflows/fixtures/result/sources/001_create.md',
      },
      {
        cleanupAttempted: true,
        cleanupPassed: true,
        contactCreateStep: {
          expectationResults: [{ actual: true, label: 'contact-create', passed: true }],
          record: {
            id: 'contact-1',
            json_ordered: { contactCreate: true },
            reviews: null,
            rule_verification: false,
            state_code: 0,
            team_id: null,
            user_id: 'user-1',
            version: '01.01.000',
          },
          submittedRuleVerification: false,
        },
        contactStep: {
          expectationResults: [{ actual: true, label: 'contact', passed: true }],
          record: {
            id: 'contact-1',
            json_ordered: { contact: true },
            reviews: null,
            rule_verification: true,
            state_code: 0,
            team_id: null,
            user_id: 'user-1',
            version: '01.01.000',
          },
          submittedRuleVerification: true,
        },
        flowCreateStep: {
          expectationResults: [{ actual: true, label: 'flow-create', passed: true }],
          record: {
            id: 'flow-1',
            json_ordered: { flowCreate: true },
            reviews: null,
            rule_verification: false,
            state_code: 0,
            team_id: null,
            user_id: 'user-1',
            version: '01.01.000',
          },
          submittedRuleVerification: false,
        },
        flowStep: {
          expectationResults: [{ actual: true, label: 'flow', passed: true }],
          record: {
            id: 'flow-1',
            json_ordered: { flow: true },
            reviews: null,
            rule_verification: true,
            state_code: 0,
            team_id: null,
            user_id: 'user-1',
            version: '01.01.000',
          },
          submittedRuleVerification: true,
        },
        flowpropertyCreateStep: {
          expectationResults: [{ actual: true, label: 'flowproperty-create', passed: true }],
          record: {
            id: 'flowproperty-1',
            json_ordered: { flowpropertyCreate: true },
            reviews: null,
            rule_verification: false,
            state_code: 0,
            team_id: null,
            user_id: 'user-1',
            version: '01.01.000',
          },
          submittedRuleVerification: false,
        },
        flowpropertyStep: {
          expectationResults: [{ actual: true, label: 'flowproperty', passed: true }],
          record: {
            id: 'flowproperty-1',
            json_ordered: { flowproperty: true },
            reviews: null,
            rule_verification: true,
            state_code: 0,
            team_id: null,
            user_id: 'user-1',
            version: '01.01.000',
          },
          submittedRuleVerification: true,
        },
        frontendProbe: { ok: true, skipped: true },
        passed: true,
        processCreateStep: {
          expectationResults: [{ actual: true, label: 'process-create', passed: true }],
          record: {
            id: 'process-1',
            json_ordered: { processCreate: true },
            reviews: null,
            rule_verification: false,
            state_code: 0,
            team_id: null,
            user_id: 'user-1',
            version: '01.01.000',
          },
          submittedRuleVerification: false,
        },
        processValidationCheckpoints: [
          {
            actualBlockingDatasets: ['contact', 'source', 'flowproperty', 'flow', 'process'],
            expectedBlockingDatasets: ['contact', 'source', 'flowproperty', 'flow', 'process'],
            expectationResults: [{ actual: true, label: 'checkpoint', passed: true }],
            label: 'after-create',
            validation: {
              datasetSdkValid: true,
              nonExistentRefCount: 0,
              ruleVerification: false,
              unRuleVerificationCount: 4,
            },
          },
        ],
        processUpdateStep: {
          expectationResults: [{ actual: true, label: 'process-update', passed: true }],
          record: {
            id: 'process-1',
            json_ordered: { processUpdate: true },
            reviews: null,
            rule_verification: true,
            state_code: 0,
            team_id: null,
            user_id: 'user-1',
            version: '01.01.000',
          },
          submittedRuleVerification: true,
        },
        referenceExpectationResults: [
          {
            actual: { any: true },
            expected: { any: true },
            label: 'reference',
            path: 'json_ordered.path',
            passed: true,
          },
        ],
        runtimeDatasets: {
          contact: {
            runtimeId: 'contact-1',
            sourceFixtureId: 'contact-fixture-id',
            table: 'contacts',
            version: '01.01.000',
          },
          flow: {
            runtimeId: 'flow-1',
            sourceFixtureId: 'flow-fixture-id',
            table: 'flows',
            version: '01.01.000',
          },
          flowproperty: {
            runtimeId: 'flowproperty-1',
            sourceFixtureId: 'flowproperty-fixture-id',
            table: 'flowproperties',
            version: '01.01.000',
          },
          process: {
            runtimeId: 'process-1',
            sourceFixtureId: 'process-fixture-id',
            table: 'processes',
            version: '01.01.000',
          },
          source: {
            runtimeId: 'source-1',
            sourceFixtureId: 'source-fixture-id',
            table: 'sources',
            version: '01.01.000',
          },
        },
        runtimeReferences: {
          contact: buildSeedReference('contact data set', '../contacts/contact-1.xml', 'contact-1'),
          flow: buildSeedReference('flow data set', '../flows/flow-1.xml', 'flow-1'),
          flowProperty: buildSeedReference(
            'flow property data set',
            '../flowproperties/flowproperty-1.xml',
            'flowproperty-1',
          ),
          source: buildSeedReference('source data set', '../sources/source-1.xml', 'source-1'),
        },
        selectedUser: {
          email: 'user@example.com',
          role: 'user',
          userId: 'user-1',
        },
        sourceCreateStep: {
          expectationResults: [{ actual: true, label: 'source-create', passed: true }],
          record: {
            id: 'source-1',
            json_ordered: { sourceCreate: true },
            reviews: null,
            rule_verification: false,
            state_code: 0,
            team_id: null,
            user_id: 'user-1',
            version: '01.01.000',
          },
          submittedRuleVerification: false,
        },
        sourceStep: {
          expectationResults: [{ actual: true, label: 'source', passed: true }],
          record: {
            id: 'source-1',
            json_ordered: { source: true },
            reviews: null,
            rule_verification: true,
            state_code: 0,
            team_id: null,
            user_id: 'user-1',
            version: '01.01.000',
          },
          submittedRuleVerification: true,
        },
        supabaseTarget: {
          apiUrl: 'https://fotofiyqnuyvgtotswie.supabase.co',
          dashboardUrl: 'https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie',
          projectId: 'fotofiyqnuyvgtotswie',
          publishableKey: 'sb_publishable_test',
        },
        validation: {
          datasetSdkValid: true,
          nonExistentRefCount: 0,
          ruleVerification: true,
          unRuleVerificationCount: 0,
        },
      },
    );

    expect(runtimeRecord.dependencies.contact.check.persistedRecord).toEqual({
      id: 'contact-1',
      reviews: null,
      rule_verification: true,
      state_code: 0,
      team_id: null,
      user_id: 'user-1',
      version: '01.01.000',
    });
    expect(runtimeRecord.dependencies.contact.create.submittedRuleVerification).toBe(false);
    expect(
      (runtimeRecord.process.check.persistedRecord as Record<string, unknown>).json_ordered,
    ).toBe(undefined);
    expect(runtimeRecord.process.validationCheckpoints).toHaveLength(1);
    expect(runtimeRecord.references.flow['@refObjectId']).toBe('flow-1');
  });

  it('creates dependencies, rewrites references, and cleans up in dependency order', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'process-runtime-refs-'));

    try {
      const contactDataFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'data',
        'contacts',
        '001_create.json',
      );
      const contactCheckDataFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'data',
        'contacts',
        '002_check_data_success.json',
      );
      const sourceDataFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'data',
        'sources',
        '001_create.json',
      );
      const sourceCheckDataFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'data',
        'sources',
        '002_check_data_success.json',
      );
      const flowpropertyDataFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'data',
        'flowProperties',
        '001_create.json',
      );
      const flowpropertyCheckDataFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'data',
        'flowProperties',
        '002_check_data_success.json',
      );
      const flowDataFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'data',
        'flows',
        '001_create.json',
      );
      const flowCheckDataFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'data',
        'flows',
        '002_check_data_success.json',
      );
      const processCreateDataFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'data',
        'processes',
        '001_create.json',
      );
      const processCheckDataFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'data',
        'processes',
        '006_check_data_runtime_references.json',
      );
      const contactExpectedFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'result',
        'contacts',
        '001_create.md',
      );
      const contactCheckExpectedFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'result',
        'contacts',
        '002_check_data_success.md',
      );
      const sourceExpectedFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'result',
        'sources',
        '001_create.md',
      );
      const sourceCheckExpectedFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'result',
        'sources',
        '002_check_data_success.md',
      );
      const flowpropertyExpectedFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'result',
        'flowProperties',
        '001_create.md',
      );
      const flowpropertyCheckExpectedFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'result',
        'flowProperties',
        '002_check_data_success.md',
      );
      const flowExpectedFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'result',
        'flows',
        '001_create.md',
      );
      const flowCheckExpectedFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'result',
        'flows',
        '002_check_data_success.md',
      );
      const processCreateExpectedFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'result',
        'processes',
        '001_create.md',
      );
      const processCheckExpectedFile = path.join(
        tempRoot,
        'tests',
        'data-workflows',
        'fixtures',
        'result',
        'processes',
        '006_check_data_runtime_references.md',
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
        'processes',
        '006_check_data_runtime_references.last-run.json',
      );

      await writeJson(contactDataFile, buildContactFixture());
      await writeJson(contactCheckDataFile, buildContactCheckFixture());
      await writeJson(sourceDataFile, buildSourceFixture());
      await writeJson(sourceCheckDataFile, buildSourceCheckFixture());
      await writeJson(flowpropertyDataFile, buildFlowpropertyFixture());
      await writeJson(flowpropertyCheckDataFile, buildFlowpropertyCheckFixture());
      await writeJson(flowDataFile, buildFlowFixture());
      await writeJson(flowCheckDataFile, buildFlowCheckFixture());
      await writeJson(processCreateDataFile, buildProcessCreateFixture());
      await writeJson(processCheckDataFile, buildProcessCheckFixture());
      await writeText(contactExpectedFile, contactCreateExpectedMarkdown);
      await writeText(contactCheckExpectedFile, contactCheckExpectedMarkdown);
      await writeText(sourceExpectedFile, createExpectedMarkdown);
      await writeText(sourceCheckExpectedFile, checkExpectedMarkdown);
      await writeText(flowpropertyExpectedFile, createExpectedMarkdown);
      await writeText(flowpropertyCheckExpectedFile, checkExpectedMarkdown);
      await writeText(flowExpectedFile, createExpectedMarkdown);
      await writeText(flowCheckExpectedFile, checkExpectedMarkdown);
      await writeText(processCreateExpectedFile, createExpectedMarkdown);
      await writeText(processCheckExpectedFile, processCheckExpectedMarkdown);
      await writeJson(usersFile, {
        user: {
          email: 'user@example.com',
          password: 'secret',
        },
      });

      const state = {
        deleted: [] as Array<{ id: string; table: string; version: string }>,
        records: new Map<string, any>(),
      };

      const from = jest.fn((table: string) => ({
        select: jest.fn(() => {
          const filters: Record<string, string> = {};
          type QueryBuilder = {
            eq: (key: string, value: string) => QueryBuilder;
            maybeSingle: () => Promise<{
              data: any;
              error: null;
            }>;
          };
          const builder: QueryBuilder = {
            eq: jest.fn((key: string, value: string): QueryBuilder => {
              filters[key] = value;
              return builder;
            }),
            maybeSingle: jest.fn(async () => ({
              data: state.records.get(`${table}|${filters.id}|${filters.version}`) ?? null,
              error: null,
            })),
          };
          return builder;
        }),
      }));

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
          const version = extractVersionFromJsonOrdered(
            request.body.table,
            request.body.jsonOrdered,
          );
          state.records.set(`${request.body.table}|${request.body.id}|${version}`, {
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
          state.records.set(`${request.body.table}|${request.body.id}|${request.body.version}`, {
            id: request.body.id,
            json_ordered: request.body.jsonOrdered,
            reviews: null,
            rule_verification: request.body.ruleVerification,
            state_code: 0,
            team_id: null,
            user_id: 'user-id-1',
            version: request.body.version,
          });
          return {
            data: { id: request.body.id, version: request.body.version },
            error: null,
          };
        }

        if (functionName === 'app_dataset_delete') {
          state.records.delete(`${request.body.table}|${request.body.id}|${request.body.version}`);
          state.deleted.push({
            id: request.body.id,
            table: request.body.table,
            version: request.body.version,
          });
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
          datasetSdkValid: true,
          nonExistentRef: [],
          ruleVerification: false,
          unRuleVerification: [
            buildSeedReference(
              'contact data set',
              '../contacts/contact-fixture-id.xml',
              'contact-fixture-id',
            ),
            buildSeedReference(
              'source data set',
              '../sources/source-fixture-id.xml',
              'source-fixture-id',
            ),
            buildSeedReference(
              'flow property data set',
              '../flowproperties/flowproperty-fixture-id.xml',
              'flowproperty-fixture-id',
            ),
            buildSeedReference('flow data set', '../flows/flow-fixture-id.xml', 'flow-fixture-id'),
          ],
        })
        .mockResolvedValueOnce({
          datasetSdkValid: true,
          nonExistentRef: [],
          ruleVerification: true,
          unRuleVerification: [],
        })
        .mockResolvedValueOnce({
          datasetSdkValid: true,
          nonExistentRef: [],
          ruleVerification: false,
          unRuleVerification: [
            buildSeedReference(
              'source data set',
              '../sources/source-fixture-id.xml',
              'source-fixture-id',
            ),
            buildSeedReference(
              'flow property data set',
              '../flowproperties/flowproperty-fixture-id.xml',
              'flowproperty-fixture-id',
            ),
            buildSeedReference('flow data set', '../flows/flow-fixture-id.xml', 'flow-fixture-id'),
          ],
        })
        .mockResolvedValueOnce({
          datasetSdkValid: true,
          nonExistentRef: [],
          ruleVerification: true,
          unRuleVerification: [],
        })
        .mockResolvedValueOnce({
          datasetSdkValid: true,
          nonExistentRef: [],
          ruleVerification: false,
          unRuleVerification: [
            buildSeedReference(
              'flow property data set',
              '../flowproperties/flowproperty-fixture-id.xml',
              'flowproperty-fixture-id',
            ),
            buildSeedReference('flow data set', '../flows/flow-fixture-id.xml', 'flow-fixture-id'),
          ],
        })
        .mockResolvedValueOnce({
          datasetSdkValid: true,
          nonExistentRef: [],
          ruleVerification: true,
          unRuleVerification: [],
        })
        .mockResolvedValueOnce({
          datasetSdkValid: true,
          nonExistentRef: [],
          ruleVerification: false,
          unRuleVerification: [
            buildSeedReference('flow data set', '../flows/flow-fixture-id.xml', 'flow-fixture-id'),
          ],
        })
        .mockResolvedValueOnce({
          datasetSdkValid: true,
          nonExistentRef: [],
          ruleVerification: true,
          unRuleVerification: [],
        })
        .mockResolvedValueOnce({
          datasetSdkValid: true,
          nonExistentRef: [],
          ruleVerification: true,
          unRuleVerification: [],
        });

      const ruleVerificationComputers = {
        contact: jest.fn().mockResolvedValue(false),
        source: jest.fn().mockResolvedValue(false),
        flowproperty: jest.fn().mockResolvedValue(false),
        flow: jest.fn().mockResolvedValue(false),
        process: jest.fn().mockResolvedValue(false),
      };

      const result = await runProcessCheckDataRuntimeReferencesSmoke(
        {
          checkDataFile: processCheckDataFile,
          checkExpectedFile: processCheckExpectedFile,
          contactCheckDataFile,
          contactCheckExpectedFile,
          contactDataFile,
          contactExpectedFile,
          createDataFile: processCreateDataFile,
          createExpectedFile: processCreateExpectedFile,
          flowCheckDataFile,
          flowCheckExpectedFile,
          flowDataFile,
          flowExpectedFile,
          flowpropertyCheckDataFile,
          flowpropertyCheckExpectedFile,
          flowpropertyDataFile,
          flowpropertyExpectedFile,
          generateId: false,
          help: false,
          keepData: false,
          role: 'user',
          runtimeRecordFile,
          sourceCheckDataFile,
          sourceCheckExpectedFile,
          sourceDataFile,
          sourceExpectedFile,
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
          ruleVerificationComputers,
        },
      );

      expect(result.passed).toBe(true);
      expect(result.contactCreateStep.record.id).toBe('contact-fixture-id');
      expect(result.contactCreateStep.record.rule_verification).toBe(false);
      expect(result.contactStep.record.id).toBe('contact-fixture-id');
      expect(result.contactStep.record.rule_verification).toBe(true);
      expect(result.sourceCreateStep.record.rule_verification).toBe(false);
      expect(result.sourceStep.record.id).toBe('source-fixture-id');
      expect(result.sourceStep.record.rule_verification).toBe(true);
      expect(result.flowpropertyCreateStep.record.rule_verification).toBe(false);
      expect(result.flowpropertyStep.record.id).toBe('flowproperty-fixture-id');
      expect(result.flowpropertyStep.record.rule_verification).toBe(true);
      expect(result.flowCreateStep.record.rule_verification).toBe(false);
      expect(result.flowStep.record.id).toBe('flow-fixture-id');
      expect(result.flowStep.record.rule_verification).toBe(true);
      expect(result.processCreateStep.record.rule_verification).toBe(false);
      expect(result.processUpdateStep.record.id).toBe('process-fixture-id');
      expect(result.processValidationCheckpoints).toHaveLength(5);
      expect(
        result.processValidationCheckpoints.map((checkpoint) => checkpoint.actualBlockingDatasets),
      ).toEqual([
        ['contact', 'source', 'flowproperty', 'flow', 'process'],
        ['source', 'flowproperty', 'flow', 'process'],
        ['flowproperty', 'flow', 'process'],
        ['flow', 'process'],
        [],
      ]);
      expect(result.referenceExpectationResults.every((expectation) => expectation.passed)).toBe(
        true,
      );
      expect(result.validation).toEqual({
        datasetSdkValid: true,
        nonExistentRefCount: 0,
        ruleVerification: true,
        unRuleVerificationCount: 0,
      });
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'secret',
      });
      expect(signOut).toHaveBeenCalled();
      expect(validateDatasetRuleVerification).toHaveBeenCalledTimes(9);
      expect(validateDatasetRuleVerification).toHaveBeenNthCalledWith(
        1,
        'process data set',
        expect.any(Object),
        '',
      );
      expect(validateDatasetRuleVerification).toHaveBeenNthCalledWith(
        2,
        'contact data set',
        expect.any(Object),
        '',
      );
      expect(validateDatasetRuleVerification).toHaveBeenNthCalledWith(
        3,
        'process data set',
        expect.any(Object),
        '',
      );
      expect(validateDatasetRuleVerification).toHaveBeenNthCalledWith(
        4,
        'source data set',
        expect.any(Object),
        '',
      );
      expect(validateDatasetRuleVerification).toHaveBeenNthCalledWith(
        5,
        'process data set',
        expect.any(Object),
        '',
      );
      expect(validateDatasetRuleVerification).toHaveBeenNthCalledWith(
        6,
        'flow property data set',
        expect.any(Object),
        '',
      );
      expect(validateDatasetRuleVerification).toHaveBeenNthCalledWith(
        7,
        'process data set',
        expect.any(Object),
        '',
      );
      expect(validateDatasetRuleVerification).toHaveBeenNthCalledWith(
        8,
        'flow data set',
        expect.any(Object),
        '',
      );
      expect(validateDatasetRuleVerification).toHaveBeenNthCalledWith(
        9,
        'process data set',
        expect.any(Object),
        '',
      );

      expect(
        functionsInvoke.mock.calls
          .filter(([functionName]) => functionName !== 'app_dataset_delete')
          .map(([functionName, request]) => `${functionName}:${request.body.table}`),
      ).toEqual([
        'app_dataset_create:contacts',
        'app_dataset_create:sources',
        'app_dataset_create:flowproperties',
        'app_dataset_create:flows',
        'app_dataset_create:processes',
        'app_dataset_save_draft:contacts',
        'app_dataset_save_draft:sources',
        'app_dataset_save_draft:flowproperties',
        'app_dataset_save_draft:flows',
        'app_dataset_save_draft:processes',
      ]);

      const getInvocationBody = (functionName: string, table: string) => {
        const match = functionsInvoke.mock.calls.find(
          ([calledFunctionName, request]) =>
            calledFunctionName === functionName && request?.body?.table === table,
        );

        expect(match).toBeDefined();
        return match?.[1].body;
      };

      const contactCreateBody = getInvocationBody('app_dataset_create', 'contacts');
      expect(contactCreateBody.table).toBe('contacts');
      expect(
        contactCreateBody.jsonOrdered.contactDataSet.administrativeInformation.dataEntryBy[
          'common:referenceToDataSetFormat'
        ],
      ).toEqual({
        '@refObjectId': 'source-seed',
        '@type': 'source data set',
        '@uri': '../sources/source-seed.xml',
        '@version': '01.01.000',
        'common:shortDescription': {
          '#text': 'seed-reference',
          '@xml:lang': 'en',
        },
      });
      expect(contactCreateBody.ruleVerification).toBe(false);

      const contactUpdateBody = getInvocationBody('app_dataset_save_draft', 'contacts');
      expect(contactUpdateBody.ruleVerification).toBe(true);
      expect(
        contactUpdateBody.jsonOrdered.contactDataSet.administrativeInformation.dataEntryBy[
          'common:referenceToDataSetFormat'
        ],
      ).toEqual({
        '@refObjectId': 'source-seed',
        '@type': 'source data set',
        '@uri': '../sources/source-seed.xml',
        '@version': '01.01.000',
        'common:shortDescription': {
          '#text': 'seed-reference',
          '@xml:lang': 'en',
        },
      });
      expect(
        contactUpdateBody.jsonOrdered.contactDataSet.administrativeInformation
          .publicationAndOwnership['common:referenceToOwnershipOfDataSet'],
      ).toEqual({
        '@refObjectId': 'contact-fixture-id',
        '@type': 'contact data set',
        '@uri': '../contacts/contact-fixture-id.xml',
        '@version': '01.01.000',
        'common:shortDescription': {
          '#text': 'Runtime Contact Checked',
          '@xml:lang': 'en',
        },
      });

      const flowCreateBody = getInvocationBody('app_dataset_create', 'flows');
      expect(
        flowCreateBody.jsonOrdered.flowDataSet.flowProperties.flowProperty
          .referenceToFlowPropertyDataSet,
      ).toEqual({
        '@refObjectId': 'flowproperty-fixture-id',
        '@type': 'flow property data set',
        '@uri': '../flowproperties/flowproperty-fixture-id.xml',
        '@version': '01.01.000',
        'common:shortDescription': {
          '#text': 'Runtime Flowproperty',
          '@xml:lang': 'en',
        },
      });
      expect(
        flowCreateBody.jsonOrdered.flowDataSet.administrativeInformation.dataEntryBy[
          'common:referenceToPersonOrEntityEnteringTheData'
        ],
      ).toEqual({
        '@refObjectId': 'contact-fixture-id',
        '@type': 'contact data set',
        '@uri': '../contacts/contact-fixture-id.xml',
        '@version': '01.01.000',
        'common:shortDescription': {
          '#text': 'Runtime Contact',
          '@xml:lang': 'en',
        },
      });

      const sourceUpdateBody = getInvocationBody('app_dataset_save_draft', 'sources');
      expect(sourceUpdateBody.ruleVerification).toBe(true);
      expect(
        sourceUpdateBody.jsonOrdered.sourceDataSet.administrativeInformation.dataEntryBy[
          'common:referenceToDataSetFormat'
        ],
      ).toEqual({
        '@refObjectId': 'source-fixture-id',
        '@type': 'source data set',
        '@uri': '../sources/source-fixture-id.xml',
        '@version': '01.01.000',
        'common:shortDescription': {
          '#text': 'Runtime Source Checked',
          '@xml:lang': 'en',
        },
      });
      expect(
        sourceUpdateBody.jsonOrdered.sourceDataSet.administrativeInformation
          .publicationAndOwnership['common:referenceToOwnershipOfDataSet'],
      ).toEqual({
        '@refObjectId': 'contact-fixture-id',
        '@type': 'contact data set',
        '@uri': '../contacts/contact-fixture-id.xml',
        '@version': '01.01.000',
        'common:shortDescription': {
          '#text': 'Runtime Contact Checked',
          '@xml:lang': 'en',
        },
      });

      const flowpropertyUpdateBody = getInvocationBody('app_dataset_save_draft', 'flowproperties');
      expect(flowpropertyUpdateBody.ruleVerification).toBe(true);
      expect(
        flowpropertyUpdateBody.jsonOrdered.flowPropertyDataSet.modellingAndValidation
          .complianceDeclarations.compliance['common:referenceToComplianceSystem'],
      ).toEqual({
        '@refObjectId': 'source-fixture-id',
        '@type': 'source data set',
        '@uri': '../sources/source-fixture-id.xml',
        '@version': '01.01.000',
        'common:shortDescription': {
          '#text': 'Runtime Source Checked',
          '@xml:lang': 'en',
        },
      });

      const flowUpdateBody = getInvocationBody('app_dataset_save_draft', 'flows');
      expect(flowUpdateBody.ruleVerification).toBe(true);
      expect(
        flowUpdateBody.jsonOrdered.flowDataSet.flowProperties.flowProperty
          .referenceToFlowPropertyDataSet,
      ).toEqual({
        '@refObjectId': 'flowproperty-fixture-id',
        '@type': 'flow property data set',
        '@uri': '../flowproperties/flowproperty-fixture-id.xml',
        '@version': '01.01.000',
        'common:shortDescription': {
          '#text': 'Runtime Flowproperty Checked',
          '@xml:lang': 'en',
        },
      });
      expect(
        flowUpdateBody.jsonOrdered.flowDataSet.administrativeInformation.dataEntryBy[
          'common:referenceToPersonOrEntityEnteringTheData'
        ],
      ).toEqual({
        '@refObjectId': 'contact-fixture-id',
        '@type': 'contact data set',
        '@uri': '../contacts/contact-fixture-id.xml',
        '@version': '01.01.000',
        'common:shortDescription': {
          '#text': 'Runtime Contact Checked',
          '@xml:lang': 'en',
        },
      });

      const processUpdateBody = getInvocationBody('app_dataset_save_draft', 'processes');
      expect(
        processUpdateBody.jsonOrdered.processDataSet.exchanges.exchange[0].referenceToFlowDataSet,
      ).toEqual({
        '@refObjectId': 'flow-fixture-id',
        '@type': 'flow data set',
        '@uri': '../flows/flow-fixture-id.xml',
        '@version': '01.01.000',
        'common:shortDescription': {
          '#text': 'Runtime Flow Checked',
          '@xml:lang': 'en',
        },
      });
      expect(
        processUpdateBody.jsonOrdered.processDataSet.modellingAndValidation
          .dataSourcesTreatmentAndRepresentativeness.referenceToDataSource,
      ).toEqual({
        '@refObjectId': 'source-fixture-id',
        '@type': 'source data set',
        '@uri': '../sources/source-fixture-id.xml',
        '@version': '01.01.000',
        'common:shortDescription': {
          '#text': 'Runtime Source Checked',
          '@xml:lang': 'en',
        },
      });
      expect(
        processUpdateBody.jsonOrdered.processDataSet.administrativeInformation.dataEntryBy[
          'common:referenceToPersonOrEntityEnteringTheData'
        ],
      ).toEqual({
        '@refObjectId': 'contact-fixture-id',
        '@type': 'contact data set',
        '@uri': '../contacts/contact-fixture-id.xml',
        '@version': '01.01.000',
        'common:shortDescription': {
          '#text': 'Runtime Contact Checked',
          '@xml:lang': 'en',
        },
      });

      expect(state.deleted.map((entry) => entry.table)).toEqual([
        'processes',
        'flows',
        'flowproperties',
        'sources',
        'contacts',
      ]);

      const runtimeRecord = JSON.parse(await readFile(runtimeRecordFile, 'utf8'));
      expect(runtimeRecord.passed).toBe(true);
      expect(runtimeRecord.dependencies.contact.create.submittedRuleVerification).toBe(false);
      expect(runtimeRecord.dependencies.source.check.persistedRecord.rule_verification).toBe(true);
      expect(runtimeRecord.references.contact['common:shortDescription']['#text']).toBe(
        'Runtime Contact Checked',
      );
      expect(runtimeRecord.references.source['@refObjectId']).toBe('source-fixture-id');
      expect(runtimeRecord.references.flow['@refObjectId']).toBe('flow-fixture-id');
      expect(runtimeRecord.process.validationCheckpoints).toHaveLength(5);
      expect(runtimeRecord.process.check.referenceExpectationResults).toHaveLength(6);
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });
});
