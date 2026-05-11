import { randomUUID } from 'node:crypto';
import path from 'node:path';

import type { SupabaseClient } from '@supabase/supabase-js';
import { FunctionRegion } from '@supabase/supabase-js';

import {
  DEFAULT_CONTACT_CHECK_DATA_EXPECTED_PATH,
  DEFAULT_CONTACT_CHECK_DATA_FIXTURE_PATH,
  getFixtureOrderedJson as getContactFixtureOrderedJson,
  loadContactCheckDataFixture,
} from '../contacts/contacts-check-data-workflow-lib';
import {
  buildCreateExpectations as buildContactCreateExpectations,
  DEFAULT_CONTACT_EXPECTED_PATH,
  DEFAULT_CONTACT_FIXTURE_PATH,
  computeContactRuleVerification as defaultComputeContactRuleVerification,
  evaluateExpectations as evaluateContactExpectations,
  loadContactFixture,
  prepareContactJsonOrderedForRuntime,
} from '../contacts/contacts-create-workflow-lib';
import {
  DEFAULT_FLOWPROPERTY_CHECK_DATA_EXPECTED_PATH,
  DEFAULT_FLOWPROPERTY_CHECK_DATA_FIXTURE_PATH,
  getFixtureOrderedJson as getFlowpropertyCheckFixtureOrderedJson,
  loadFlowpropertyCheckDataFixture,
} from '../flowproperties/flowproperties-check-data-workflow-lib';
import {
  buildCreateExpectations as buildFlowpropertyCreateExpectations,
  DEFAULT_FLOWPROPERTY_EXPECTED_PATH,
  DEFAULT_FLOWPROPERTY_FIXTURE_PATH,
  computeFlowpropertyRuleVerification as defaultComputeFlowpropertyRuleVerification,
  evaluateExpectations as evaluateFlowpropertyExpectations,
  loadFlowpropertyFixture,
  prepareFlowpropertyJsonOrderedForRuntime,
} from '../flowproperties/flowproperties-create-workflow-lib';
import {
  DEFAULT_FLOW_CHECK_DATA_EXPECTED_PATH,
  DEFAULT_FLOW_CHECK_DATA_FIXTURE_PATH,
  getFixtureOrderedJson as getFlowCheckFixtureOrderedJson,
  loadFlowCheckDataFixture,
} from '../flows/flows-check-data-workflow-lib';
import {
  buildCreateExpectations as buildFlowCreateExpectations,
  DEFAULT_FLOW_EXPECTED_PATH,
  DEFAULT_FLOW_FIXTURE_PATH,
  computeFlowRuleVerification as defaultComputeFlowRuleVerification,
  evaluateExpectations as evaluateFlowExpectations,
  loadFlowFixture,
  prepareFlowJsonOrderedForRuntime,
} from '../flows/flows-create-workflow-lib';
import {
  activateReferenceSeedsForSmoke,
  clearActiveReferenceSeeds,
  getReferenceSeedKeysForTable,
  type ReferenceSeed,
} from '../reference-seeds';
import {
  DEFAULT_SOURCE_CHECK_DATA_EXPECTED_PATH,
  DEFAULT_SOURCE_CHECK_DATA_FIXTURE_PATH,
  getFixtureOrderedJson as getSourceCheckFixtureOrderedJson,
  loadSourceCheckDataFixture,
} from '../sources/sources-check-data-workflow-lib';
import {
  buildCreateExpectations as buildSourceCreateExpectations,
  DEFAULT_SOURCE_EXPECTED_PATH,
  DEFAULT_SOURCE_FIXTURE_PATH,
  computeSourceRuleVerification as defaultComputeSourceRuleVerification,
  evaluateExpectations as evaluateSourceExpectations,
  loadSourceFixture,
  prepareSourceJsonOrderedForRuntime,
} from '../sources/sources-create-workflow-lib';
import {
  deepClone,
  evaluateStructuredExpectations,
  type StructuredExpectation,
  type StructuredExpectationResult,
} from '../workflow-shared';
import {
  buildValidationExpectationResults,
  getExpectedRuleVerification,
  getFixtureOrderedJson as getProcessFixtureOrderedJson,
  loadProcessCheckDataFixture,
} from './processes-check-data-workflow-lib';
import {
  buildCreateExpectations as buildProcessCreateExpectations,
  DEFAULT_PROCESS_EXPECTED_PATH,
  DEFAULT_PROCESS_FIXTURE_PATH,
  DEFAULT_PROCESS_ROLE,
  DEFAULT_USERS_PATH,
  computeProcessRuleVerification as defaultComputeProcessRuleVerification,
  evaluateExpectations as evaluateProcessExpectations,
  loadProcessFixture,
  loadUsersConfig,
  normalizeSupabaseTarget,
  pickCredentialByRole,
  prepareProcessJsonOrderedForRuntime,
  probeFrontendUrl,
  resolveRuntimeRecordFilePath,
  writeRuntimeRecord,
  type ExpectationResult,
  type FrontendProbeResult,
  type SupabaseTarget,
} from './processes-create-workflow-lib';

export const DEFAULT_PROCESS_CHECK_DATA_RUNTIME_REFERENCES_FIXTURE_PATH =
  'tests/data-workflows/fixtures/data/processes/006_check_data_runtime_references.json';
export const DEFAULT_PROCESS_CHECK_DATA_RUNTIME_REFERENCES_EXPECTED_PATH =
  'tests/data-workflows/fixtures/result/processes/006_check_data_runtime_references.md';

type SupportedFlag =
  | 'check-data-file'
  | 'contact-check-data-file'
  | 'contact-data-file'
  | 'create-data-file'
  | 'data-file'
  | 'flow-data-file'
  | 'flow-check-data-file'
  | 'flowproperty-data-file'
  | 'flowproperty-check-data-file'
  | 'frontend-url'
  | 'generate-id'
  | 'help'
  | 'keep-created'
  | 'keep-data'
  | 'no-generate-id'
  | 'no-keep-created'
  | 'no-keep-data'
  | 'no-verify-frontend'
  | 'no-write-runtime'
  | 'role'
  | 'runtime-record-file'
  | 'source-data-file'
  | 'source-check-data-file'
  | 'supabase-project-url'
  | 'supabase-publishable-key'
  | 'supabase-url'
  | 'users-file'
  | 'verify-frontend'
  | 'write-runtime';

type WorkflowDatasetRecord = {
  id: string;
  json_ordered: Record<string, unknown>;
  reviews: unknown;
  rule_verification: boolean | null;
  state_code: number | null;
  team_id: string | null;
  user_id: string | null;
  version: string;
};

type ValidationSummary = {
  datasetSdkValid: boolean;
  nonExistentRefCount: number;
  ruleVerification: boolean;
  unRuleVerificationCount: number;
};

type WorkflowStepResult = {
  expectationResults: ExpectationResult[];
  record: WorkflowDatasetRecord;
  submittedRuleVerification: boolean;
};

type ReferenceTable = 'contacts' | 'sources' | 'flowproperties' | 'flows';
type CleanupTable = ReferenceTable | 'processes';
type WorkflowDatasetKey = 'contact' | 'source' | 'flowproperty' | 'flow' | 'process';

type DatasetReferenceObject = {
  '@refObjectId': string;
  '@type': string;
  '@uri': string;
  '@version': string;
  'common:shortDescription': unknown;
};

type DatasetReferenceSummary = {
  id: string;
  reference: DatasetReferenceObject;
  table: ReferenceTable;
  version: string;
};

type RuntimeDatasetInfo = {
  runtimeId: string;
  sourceFixtureId: string;
  table: CleanupTable;
  version: string;
};

type CreatedDatasetEntry = {
  id: string;
  table: CleanupTable;
  version: string;
};

type CreateStepExpectationEvaluator = (input: {
  currentUserId: string;
  expectations: any[];
  record: WorkflowDatasetRecord;
  uploadedJsonOrdered: Record<string, unknown>;
}) => ExpectationResult[];

type RuleVerificationComputer = (jsonOrdered: Record<string, any>) => Promise<boolean>;
type DatasetTypeName =
  | 'contact data set'
  | 'flow data set'
  | 'flow property data set'
  | 'process data set'
  | 'source data set';
type ValidationResultRaw = {
  datasetSdkValid: boolean;
  nonExistentRef: unknown[];
  ruleVerification: boolean;
  unRuleVerification: unknown[];
};
type ValidationReference = {
  '@refObjectId'?: string;
  '@type'?: string;
  '@version'?: string;
};

type LoadedValidationModules = {
  generalApi: {
    getTeamIdByUserId: () => Promise<string | null>;
  };
  review: {
    validateDatasetRuleVerification: (
      datasetType: DatasetTypeName,
      orderedJson: Record<string, any>,
      userTeamId?: string,
    ) => Promise<ValidationResultRaw>;
  };
  supabase: SupabaseClient;
};

export type ProcessCheckDataRuntimeReferencesCliOptions = {
  checkDataFile: string;
  checkExpectedFile: string;
  contactCheckDataFile: string;
  contactCheckExpectedFile: string;
  contactDataFile: string;
  contactExpectedFile: string;
  createDataFile: string;
  createExpectedFile: string;
  flowDataFile: string;
  flowExpectedFile: string;
  flowCheckDataFile: string;
  flowCheckExpectedFile: string;
  flowpropertyDataFile: string;
  flowpropertyExpectedFile: string;
  flowpropertyCheckDataFile: string;
  flowpropertyCheckExpectedFile: string;
  frontendUrl?: string;
  generateId: boolean;
  help: boolean;
  keepData: boolean;
  role: string;
  runtimeRecordFile: string;
  sourceDataFile: string;
  sourceExpectedFile: string;
  sourceCheckDataFile: string;
  sourceCheckExpectedFile: string;
  supabaseProjectUrl?: string;
  supabasePublishableKey?: string;
  supabaseUrl?: string;
  usersFile: string;
  verifyFrontend: boolean;
  writeRuntime: boolean;
};

export type ProcessValidationCheckpointResult = {
  actualBlockingDatasets: WorkflowDatasetKey[];
  expectedBlockingDatasets: WorkflowDatasetKey[];
  expectationResults: ExpectationResult[];
  label: string;
  validation: ValidationSummary;
};

export type ProcessCheckDataRuntimeReferencesResult = {
  cleanupAttempted: boolean;
  cleanupPassed: boolean;
  contactCreateStep: WorkflowStepResult;
  contactStep: WorkflowStepResult;
  flowCreateStep: WorkflowStepResult;
  flowStep: WorkflowStepResult;
  flowpropertyCreateStep: WorkflowStepResult;
  flowpropertyStep: WorkflowStepResult;
  frontendProbe: FrontendProbeResult;
  passed: boolean;
  processCreateStep: WorkflowStepResult;
  processValidationCheckpoints: ProcessValidationCheckpointResult[];
  processUpdateStep: WorkflowStepResult;
  referenceExpectationResults: StructuredExpectationResult[];
  runtimeDatasets: {
    contact: RuntimeDatasetInfo;
    flow: RuntimeDatasetInfo;
    flowproperty: RuntimeDatasetInfo;
    process: RuntimeDatasetInfo;
    source: RuntimeDatasetInfo;
  };
  runtimeRecordFile?: string;
  runtimeRecordWritten: boolean;
  runtimeReferences: {
    contact: DatasetReferenceObject;
    flow: DatasetReferenceObject;
    flowProperty: DatasetReferenceObject;
    source: DatasetReferenceObject;
  };
  selectedUser: {
    email: string;
    role: string;
    userId: string;
  };
  sourceCreateStep: WorkflowStepResult;
  sourceStep: WorkflowStepResult;
  supabaseTarget: SupabaseTarget;
  validation: ValidationSummary;
};

type RuntimeRecordStep = {
  expectedFile: string;
  expectationResults: ExpectationResult[];
  fixtureFile: string;
  persistedRecord: Omit<WorkflowDatasetRecord, 'json_ordered'>;
  runtimeId: string;
  sourceFixtureId: string;
  submittedRuleVerification: boolean;
  version: string;
};

type RuntimeRecordDatasetSteps = {
  check: RuntimeRecordStep;
  create: RuntimeRecordStep;
};

export type ProcessCheckDataRuntimeReferencesRuntimeRecord = {
  cleanupAttempted: boolean;
  cleanupPassed: boolean;
  createdAt: string;
  dependencies: {
    contact: RuntimeRecordDatasetSteps;
    flow: RuntimeRecordDatasetSteps;
    flowproperty: RuntimeRecordDatasetSteps;
    source: RuntimeRecordDatasetSteps;
  };
  frontendProbe: FrontendProbeResult;
  frontendUrl?: string;
  keepData: boolean;
  passed: boolean;
  process: {
    check: RuntimeRecordStep & {
      referenceExpectationResults: StructuredExpectationResult[];
      validation: ValidationSummary;
    };
    create: RuntimeRecordStep;
    validationCheckpoints: ProcessValidationCheckpointResult[];
  };
  references: {
    contact: DatasetReferenceObject;
    flow: DatasetReferenceObject;
    flowProperty: DatasetReferenceObject;
    source: DatasetReferenceObject;
  };
  role: string;
  supabase: {
    apiUrl: string;
    dashboardUrl?: string;
    projectId?: string;
  };
  user: {
    email: string;
    userId: string;
  };
};

export type ProcessCheckDataRuntimeReferencesDependencies = {
  frontendFetchImpl?: typeof fetch;
  generateIdFn?: () => string;
  modulesLoader?: (supabaseTarget: SupabaseTarget) => Promise<LoadedValidationModules>;
  ruleVerificationComputers?: Partial<Record<WorkflowDatasetKey, RuleVerificationComputer>>;
};

export const PROCESS_CHECK_DATA_RUNTIME_REFERENCES_DATA_WORKFLOW_HELP = `Process check-data runtime-references data workflow

Usage:
  npm run test:processes:check-data-runtime-references -- --frontend-url http://127.0.0.1:8000 --supabase-url https://fotofiyqnuyvgtotswie.supabase.co
  npm run test:processes:check-data-runtime-references -- --role admin --supabase-url https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie --no-keep-data

Workflow:
  1. Ensure per-account test reference seeds exist
  2. Precompute runtime ids while all created data references point to test reference seeds
  3. Create one contact
  4. Create one source
  5. Create one flowproperty
  6. Create one flow
  7. Create one process from tests/data-workflows/fixtures/data/processes/001_create.json
  8. Prepare one process validation draft from tests/data-workflows/fixtures/data/processes/006_check_data_runtime_references.json after rewriting references to test reference seeds
  9. Validate the process draft five times while progressively updating contact, source, flowproperty, and flow to rule_verification=true
  10. Save the final validated process draft and assert its persisted test reference seed references

Flags:
  --role <name>                         Role key from .env.users.local / TEST_USERS_JSON / TEST_<ROLE>_* (defaults to "user")
  --frontend-url <url>                  Frontend URL to display and optionally probe
  --supabase-url <url>                  Supabase API URL or dashboard project URL
  --supabase-project-url <url>          Explicit dashboard project URL
  --supabase-publishable-key <key>      Override SUPABASE_PUBLISHABLE_KEY
  --contact-data-file <path>            Defaults to tests/data-workflows/fixtures/data/contacts/001_create.json
  --contact-check-data-file <path>      Defaults to tests/data-workflows/fixtures/data/contacts/002_check_data_success.json
  --source-data-file <path>             Defaults to tests/data-workflows/fixtures/data/sources/001_create.json
  --source-check-data-file <path>       Defaults to tests/data-workflows/fixtures/data/sources/002_check_data_success.json
  --flowproperty-data-file <path>       Defaults to tests/data-workflows/fixtures/data/flowProperties/001_create.json
  --flowproperty-check-data-file <path> Defaults to tests/data-workflows/fixtures/data/flowProperties/002_check_data_success.json
  --flow-data-file <path>               Defaults to tests/data-workflows/fixtures/data/flows/001_create.json
  --flow-check-data-file <path>         Defaults to tests/data-workflows/fixtures/data/flows/002_check_data_success.json
  --create-data-file <path>             Defaults to tests/data-workflows/fixtures/data/processes/001_create.json
  --check-data-file <path>              Defaults to tests/data-workflows/fixtures/data/processes/006_check_data_runtime_references.json
  --data-file <path>                    Alias of --check-data-file
  --users-file <path>                   Legacy JSON fallback, defaults to tests/data-workflows/fixtures/data/users.json after checking .env.users.local
  --keep-data                           Keep the workflow datasets after validation (default)
  --keep-created                        Alias of --keep-data
  --no-keep-data                        Delete all workflow datasets after validation
  --no-keep-created                     Alias of --no-keep-data
  --generate-id                         Replace every fixture UUID with fresh runtime UUIDs (default)
  --no-generate-id                      Reuse fixture UUIDs from each file as-is
  --write-runtime                       Write this run's runtime record to a file (default)
  --no-write-runtime                    Skip writing the runtime record file
  --runtime-record-file <path>          Override the runtime record output path
  --verify-frontend                     Fetch the frontend URL before running the workflow (default)
  --no-verify-frontend                  Skip the frontend fetch probe
  --help                                Show this help text

Environment fallback:
  .env.users.local
  SUPABASE_URL
  SUPABASE_PUBLISHABLE_KEY
  TEST_USERS_JSON
  TEST_<ROLE>_EMAIL
  TEST_<ROLE>_PASSWORD
`;

const TRUE_LITERALS = new Set(['1', 'true', 'yes', 'y']);
const FALSE_LITERALS = new Set(['0', 'false', 'no', 'n']);

const DATASET_REFERENCE_META = {
  contacts: {
    folder: 'contacts',
    type: 'contact data set',
  },
  flowproperties: {
    folder: 'flowproperties',
    type: 'flow property data set',
  },
  flows: {
    folder: 'flows',
    type: 'flow data set',
  },
  sources: {
    folder: 'sources',
    type: 'source data set',
  },
} as const;

const CLEANUP_ORDER: WorkflowDatasetKey[] = [
  'process',
  'flow',
  'flowproperty',
  'source',
  'contact',
];

const FLOW_UUID_PATH = [
  'flowDataSet',
  'flowInformation',
  'dataSetInformation',
  'common:UUID',
] as const;

export function parseCheckDataRuntimeReferencesCliArgs(
  argv: string[],
  cwd = process.cwd(),
): ProcessCheckDataRuntimeReferencesCliOptions {
  let runtimeRecordFileExplicit = false;
  const options: ProcessCheckDataRuntimeReferencesCliOptions = {
    checkDataFile: path.resolve(cwd, DEFAULT_PROCESS_CHECK_DATA_RUNTIME_REFERENCES_FIXTURE_PATH),
    checkExpectedFile: path.resolve(
      cwd,
      DEFAULT_PROCESS_CHECK_DATA_RUNTIME_REFERENCES_EXPECTED_PATH,
    ),
    contactCheckDataFile: path.resolve(cwd, DEFAULT_CONTACT_CHECK_DATA_FIXTURE_PATH),
    contactCheckExpectedFile: path.resolve(cwd, DEFAULT_CONTACT_CHECK_DATA_EXPECTED_PATH),
    contactDataFile: path.resolve(cwd, DEFAULT_CONTACT_FIXTURE_PATH),
    contactExpectedFile: path.resolve(cwd, DEFAULT_CONTACT_EXPECTED_PATH),
    createDataFile: path.resolve(cwd, DEFAULT_PROCESS_FIXTURE_PATH),
    createExpectedFile: path.resolve(cwd, DEFAULT_PROCESS_EXPECTED_PATH),
    flowCheckDataFile: path.resolve(cwd, DEFAULT_FLOW_CHECK_DATA_FIXTURE_PATH),
    flowCheckExpectedFile: path.resolve(cwd, DEFAULT_FLOW_CHECK_DATA_EXPECTED_PATH),
    flowDataFile: path.resolve(cwd, DEFAULT_FLOW_FIXTURE_PATH),
    flowExpectedFile: path.resolve(cwd, DEFAULT_FLOW_EXPECTED_PATH),
    flowpropertyCheckDataFile: path.resolve(cwd, DEFAULT_FLOWPROPERTY_CHECK_DATA_FIXTURE_PATH),
    flowpropertyCheckExpectedFile: path.resolve(cwd, DEFAULT_FLOWPROPERTY_CHECK_DATA_EXPECTED_PATH),
    flowpropertyDataFile: path.resolve(cwd, DEFAULT_FLOWPROPERTY_FIXTURE_PATH),
    flowpropertyExpectedFile: path.resolve(cwd, DEFAULT_FLOWPROPERTY_EXPECTED_PATH),
    generateId: true,
    help: false,
    keepData: true,
    role: DEFAULT_PROCESS_ROLE,
    runtimeRecordFile: resolveRuntimeRecordFilePath(
      path.resolve(cwd, DEFAULT_PROCESS_CHECK_DATA_RUNTIME_REFERENCES_FIXTURE_PATH),
      cwd,
    ),
    sourceCheckDataFile: path.resolve(cwd, DEFAULT_SOURCE_CHECK_DATA_FIXTURE_PATH),
    sourceCheckExpectedFile: path.resolve(cwd, DEFAULT_SOURCE_CHECK_DATA_EXPECTED_PATH),
    sourceDataFile: path.resolve(cwd, DEFAULT_SOURCE_FIXTURE_PATH),
    sourceExpectedFile: path.resolve(cwd, DEFAULT_SOURCE_EXPECTED_PATH),
    usersFile: path.resolve(cwd, DEFAULT_USERS_PATH),
    verifyFrontend: true,
    writeRuntime: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith('--')) {
      throw new Error(`Unsupported positional argument: ${arg}`);
    }

    const [rawFlag, inlineValue] = splitFlag(arg);
    const flag = rawFlag as SupportedFlag;

    switch (flag) {
      case 'help':
        options.help = true;
        break;
      case 'keep-created':
      case 'keep-data':
        options.keepData =
          inlineValue === undefined ? true : parseBoolean(inlineValue, 'keep-data');
        break;
      case 'no-keep-created':
      case 'no-keep-data':
        options.keepData = false;
        break;
      case 'generate-id':
        options.generateId =
          inlineValue === undefined ? true : parseBoolean(inlineValue, 'generate-id');
        break;
      case 'no-generate-id':
        options.generateId = false;
        break;
      case 'verify-frontend':
        options.verifyFrontend =
          inlineValue === undefined ? true : parseBoolean(inlineValue, 'verify-frontend');
        break;
      case 'no-verify-frontend':
        options.verifyFrontend = false;
        break;
      case 'write-runtime':
        options.writeRuntime =
          inlineValue === undefined ? true : parseBoolean(inlineValue, 'write-runtime');
        break;
      case 'no-write-runtime':
        options.writeRuntime = false;
        break;
      case 'role':
        options.role = requireFlagValue(flag, inlineValue, () => {
          index += 1;
          return argv[index];
        });
        break;
      case 'frontend-url':
        options.frontendUrl = requireFlagValue(flag, inlineValue, () => {
          index += 1;
          return argv[index];
        });
        break;
      case 'supabase-url':
        options.supabaseUrl = requireFlagValue(flag, inlineValue, () => {
          index += 1;
          return argv[index];
        });
        break;
      case 'supabase-project-url':
        options.supabaseProjectUrl = requireFlagValue(flag, inlineValue, () => {
          index += 1;
          return argv[index];
        });
        break;
      case 'supabase-publishable-key':
        options.supabasePublishableKey = requireFlagValue(flag, inlineValue, () => {
          index += 1;
          return argv[index];
        });
        break;
      case 'contact-data-file':
        options.contactDataFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, () => {
            index += 1;
            return argv[index];
          }),
        );
        break;
      case 'contact-check-data-file':
        options.contactCheckDataFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, () => {
            index += 1;
            return argv[index];
          }),
        );
        break;
      case 'source-data-file':
        options.sourceDataFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, () => {
            index += 1;
            return argv[index];
          }),
        );
        break;
      case 'source-check-data-file':
        options.sourceCheckDataFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, () => {
            index += 1;
            return argv[index];
          }),
        );
        break;
      case 'flowproperty-data-file':
        options.flowpropertyDataFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, () => {
            index += 1;
            return argv[index];
          }),
        );
        break;
      case 'flowproperty-check-data-file':
        options.flowpropertyCheckDataFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, () => {
            index += 1;
            return argv[index];
          }),
        );
        break;
      case 'flow-data-file':
        options.flowDataFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, () => {
            index += 1;
            return argv[index];
          }),
        );
        break;
      case 'flow-check-data-file':
        options.flowCheckDataFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, () => {
            index += 1;
            return argv[index];
          }),
        );
        break;
      case 'create-data-file':
        options.createDataFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, () => {
            index += 1;
            return argv[index];
          }),
        );
        break;
      case 'check-data-file':
      case 'data-file':
        options.checkDataFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, () => {
            index += 1;
            return argv[index];
          }),
        );
        break;
      case 'users-file':
        options.usersFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, () => {
            index += 1;
            return argv[index];
          }),
        );
        break;
      case 'runtime-record-file':
        options.runtimeRecordFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, () => {
            index += 1;
            return argv[index];
          }),
        );
        runtimeRecordFileExplicit = true;
        options.writeRuntime = true;
        break;
      default:
        throw new Error(`Unknown flag: --${flag}`);
    }
  }

  if (!runtimeRecordFileExplicit) {
    options.runtimeRecordFile = resolveRuntimeRecordFilePath(options.checkDataFile, cwd);
  }

  return options;
}

export function buildProcessRuntimeReferenceExpectations(): StructuredExpectation[] {
  return [
    {
      expected: 'testFlowReference',
      label: 'Process exchange flow reference points to the reusable flow seed',
      path: 'json_ordered.processDataSet.exchanges.exchange.0.referenceToFlowDataSet',
    },
    {
      expected: 'testSourceReference',
      label: 'Process data source treatment reference points to the reusable source seed',
      path: 'json_ordered.processDataSet.modellingAndValidation.dataSourcesTreatmentAndRepresentativeness.referenceToDataSource',
    },
    {
      expected: 'testSourceReference',
      label: 'Process data set format reference points to the reusable source seed',
      path: 'json_ordered.processDataSet.administrativeInformation.dataEntryBy.common:referenceToDataSetFormat',
    },
    {
      expected: 'testContactReference',
      label: 'Process data entry contact reference points to the reusable contact seed',
      path: 'json_ordered.processDataSet.administrativeInformation.dataEntryBy.common:referenceToPersonOrEntityEnteringTheData',
    },
    {
      expected: 'testContactReference',
      label: 'Process ownership reference points to the reusable contact seed',
      path: 'json_ordered.processDataSet.administrativeInformation.publicationAndOwnership.common:referenceToOwnershipOfDataSet',
    },
    {
      expected: 'testContactReference',
      label: 'Process commissioner reference points to the reusable contact seed',
      path: 'json_ordered.processDataSet.administrativeInformation.common:commissionerAndGoal.common:referenceToCommissioner',
    },
  ];
}

export function buildProcessCheckDataRuntimeReferencesRuntimeRecord(
  options: Pick<
    ProcessCheckDataRuntimeReferencesCliOptions,
    | 'checkDataFile'
    | 'checkExpectedFile'
    | 'contactCheckDataFile'
    | 'contactCheckExpectedFile'
    | 'contactDataFile'
    | 'contactExpectedFile'
    | 'createDataFile'
    | 'createExpectedFile'
    | 'flowCheckDataFile'
    | 'flowCheckExpectedFile'
    | 'flowDataFile'
    | 'flowExpectedFile'
    | 'flowpropertyCheckDataFile'
    | 'flowpropertyCheckExpectedFile'
    | 'flowpropertyDataFile'
    | 'flowpropertyExpectedFile'
    | 'frontendUrl'
    | 'keepData'
    | 'sourceCheckDataFile'
    | 'sourceCheckExpectedFile'
    | 'sourceDataFile'
    | 'sourceExpectedFile'
  >,
  result: Pick<
    ProcessCheckDataRuntimeReferencesResult,
    | 'cleanupAttempted'
    | 'cleanupPassed'
    | 'contactCreateStep'
    | 'contactStep'
    | 'flowCreateStep'
    | 'flowStep'
    | 'flowpropertyCreateStep'
    | 'flowpropertyStep'
    | 'frontendProbe'
    | 'processCreateStep'
    | 'processValidationCheckpoints'
    | 'processUpdateStep'
    | 'referenceExpectationResults'
    | 'runtimeDatasets'
    | 'runtimeReferences'
    | 'selectedUser'
    | 'sourceCreateStep'
    | 'sourceStep'
    | 'supabaseTarget'
    | 'validation'
  > & { passed: boolean },
): ProcessCheckDataRuntimeReferencesRuntimeRecord {
  return {
    cleanupAttempted: result.cleanupAttempted,
    cleanupPassed: result.cleanupPassed,
    createdAt: new Date().toISOString(),
    dependencies: {
      contact: {
        check: buildRuntimeRecordStep(
          options.contactCheckDataFile,
          options.contactCheckExpectedFile,
          result.contactStep,
          result.runtimeDatasets.contact,
        ),
        create: buildRuntimeRecordStep(
          options.contactDataFile,
          options.contactExpectedFile,
          result.contactCreateStep,
          result.runtimeDatasets.contact,
        ),
      },
      flow: {
        check: buildRuntimeRecordStep(
          options.flowCheckDataFile,
          options.flowCheckExpectedFile,
          result.flowStep,
          result.runtimeDatasets.flow,
        ),
        create: buildRuntimeRecordStep(
          options.flowDataFile,
          options.flowExpectedFile,
          result.flowCreateStep,
          result.runtimeDatasets.flow,
        ),
      },
      flowproperty: {
        check: buildRuntimeRecordStep(
          options.flowpropertyCheckDataFile,
          options.flowpropertyCheckExpectedFile,
          result.flowpropertyStep,
          result.runtimeDatasets.flowproperty,
        ),
        create: buildRuntimeRecordStep(
          options.flowpropertyDataFile,
          options.flowpropertyExpectedFile,
          result.flowpropertyCreateStep,
          result.runtimeDatasets.flowproperty,
        ),
      },
      source: {
        check: buildRuntimeRecordStep(
          options.sourceCheckDataFile,
          options.sourceCheckExpectedFile,
          result.sourceStep,
          result.runtimeDatasets.source,
        ),
        create: buildRuntimeRecordStep(
          options.sourceDataFile,
          options.sourceExpectedFile,
          result.sourceCreateStep,
          result.runtimeDatasets.source,
        ),
      },
    },
    frontendProbe: result.frontendProbe,
    frontendUrl: options.frontendUrl,
    keepData: options.keepData,
    passed: result.passed,
    process: {
      check: {
        ...buildRuntimeRecordStep(
          options.checkDataFile,
          options.checkExpectedFile,
          result.processUpdateStep,
          result.runtimeDatasets.process,
        ),
        referenceExpectationResults: result.referenceExpectationResults,
        validation: result.validation,
      },
      create: buildRuntimeRecordStep(
        options.createDataFile,
        options.createExpectedFile,
        result.processCreateStep,
        result.runtimeDatasets.process,
      ),
      validationCheckpoints: result.processValidationCheckpoints,
    },
    references: {
      contact: result.runtimeReferences.contact,
      flow: result.runtimeReferences.flow,
      flowProperty: result.runtimeReferences.flowProperty,
      source: result.runtimeReferences.source,
    },
    role: result.selectedUser.role,
    supabase: {
      apiUrl: result.supabaseTarget.apiUrl,
      dashboardUrl: result.supabaseTarget.dashboardUrl,
      projectId: result.supabaseTarget.projectId,
    },
    user: {
      email: result.selectedUser.email,
      userId: result.selectedUser.userId,
    },
  };
}

export async function runProcessCheckDataRuntimeReferencesSmoke(
  options: ProcessCheckDataRuntimeReferencesCliOptions,
  dependencies: ProcessCheckDataRuntimeReferencesDependencies = {},
): Promise<ProcessCheckDataRuntimeReferencesResult> {
  const supabaseTarget = normalizeSupabaseTarget(options);
  const generateIdFn = dependencies.generateIdFn ?? randomUUID;
  const frontendProbe =
    options.verifyFrontend && options.frontendUrl
      ? await probeFrontendUrl(options.frontendUrl, dependencies.frontendFetchImpl)
      : { ok: true, skipped: true };

  const [
    contactFixture,
    contactCheckFixture,
    sourceFixture,
    sourceCheckFixture,
    flowpropertyFixture,
    flowpropertyCheckFixture,
    flowFixture,
    flowCheckFixture,
    processCreateFixture,
    processCheckFixture,
    contactCreateExpectations,
    contactCheckExpectations,
    sourceCreateExpectations,
    sourceCheckExpectations,
    flowpropertyCreateExpectations,
    flowpropertyCheckExpectations,
    flowCreateExpectations,
    flowCheckExpectations,
    processCreateExpectations,
    processCheckExpectations,
    structuredProcessCheckExpectations,
  ] = await Promise.all([
    loadContactFixture(options.contactDataFile),
    loadContactCheckDataFixture(options.contactCheckDataFile),
    loadSourceFixture(options.sourceDataFile),
    loadSourceCheckDataFixture(options.sourceCheckDataFile),
    loadFlowpropertyFixture(options.flowpropertyDataFile),
    loadFlowpropertyCheckDataFixture(options.flowpropertyCheckDataFile),
    loadFlowFixture(options.flowDataFile),
    loadFlowCheckDataFixture(options.flowCheckDataFile),
    loadProcessFixture(options.createDataFile),
    loadProcessCheckDataFixture(options.checkDataFile),
    buildContactCreateExpectations({ labelPrefix: 'Contact create' }),
    buildContactCreateExpectations({
      labelPrefix: 'Contact check data',
      ruleVerification: true,
    }),
    buildSourceCreateExpectations({ labelPrefix: 'Source create' }),
    buildSourceCreateExpectations({
      labelPrefix: 'Source check data',
      ruleVerification: true,
    }),
    buildFlowpropertyCreateExpectations({ labelPrefix: 'Flowproperty create' }),
    buildFlowpropertyCreateExpectations({
      labelPrefix: 'Flowproperty check data',
      ruleVerification: true,
    }),
    buildFlowCreateExpectations({ labelPrefix: 'Flow create' }),
    buildFlowCreateExpectations({
      labelPrefix: 'Flow check data',
      ruleVerification: true,
    }),
    buildProcessCreateExpectations({ labelPrefix: 'Process create' }),
    buildProcessCreateExpectations({
      labelPrefix: 'Process check data',
      ruleVerification: true,
    }),
    buildProcessRuntimeReferenceExpectations(),
  ]);

  const flowOrderedJson = flowFixture.jsonOrdered;

  const contactCheckOrderedJson = getContactFixtureOrderedJson(contactCheckFixture);
  if (!contactCheckOrderedJson) {
    throw new Error(
      `Fixture ${options.contactCheckDataFile} does not contain ordered contact JSON.`,
    );
  }

  const processCheckOrderedJson = getProcessFixtureOrderedJson(processCheckFixture);
  if (!processCheckOrderedJson) {
    throw new Error(`Fixture ${options.checkDataFile} does not contain ordered process JSON.`);
  }
  const sourceCheckOrderedJson = getSourceCheckFixtureOrderedJson(sourceCheckFixture);
  if (!sourceCheckOrderedJson) {
    throw new Error(`Fixture ${options.sourceCheckDataFile} does not contain ordered source JSON.`);
  }
  const flowpropertyCheckOrderedJson =
    getFlowpropertyCheckFixtureOrderedJson(flowpropertyCheckFixture);
  if (!flowpropertyCheckOrderedJson) {
    throw new Error(
      `Fixture ${options.flowpropertyCheckDataFile} does not contain ordered flowproperty JSON.`,
    );
  }
  const flowCheckOrderedJson = getFlowCheckFixtureOrderedJson(flowCheckFixture);
  if (!flowCheckOrderedJson) {
    throw new Error(`Fixture ${options.flowCheckDataFile} does not contain ordered flow JSON.`);
  }

  const expectedContactRuleVerification = getExpectedRuleVerification(
    contactCheckExpectations as any,
  );
  const expectedSourceRuleVerification = getExpectedRuleVerification(
    sourceCheckExpectations as any,
  );
  const expectedFlowpropertyRuleVerification = getExpectedRuleVerification(
    flowpropertyCheckExpectations as any,
  );
  const expectedFlowRuleVerification = getExpectedRuleVerification(flowCheckExpectations as any);
  const expectedProcessRuleVerification = getExpectedRuleVerification(
    processCheckExpectations as any,
  );
  if (
    typeof expectedContactRuleVerification !== 'boolean' ||
    typeof expectedSourceRuleVerification !== 'boolean' ||
    typeof expectedFlowpropertyRuleVerification !== 'boolean' ||
    typeof expectedFlowRuleVerification !== 'boolean' ||
    typeof expectedProcessRuleVerification !== 'boolean'
  ) {
    throw new Error(
      'Expected rule_verification assertions are missing from the code-owned workflow expectations.',
    );
  }
  const { sourceLabel, users } = await loadUsersConfig(options.usersFile);
  const selectedCredential = pickCredentialByRole(users, options.role, sourceLabel);
  const modules = await (dependencies.modulesLoader ?? loadValidationModules)(supabaseTarget);

  const signInResult = await modules.supabase.auth.signInWithPassword({
    email: selectedCredential.email,
    password: selectedCredential.password,
  });

  if (signInResult.error || !signInResult.data.session || !signInResult.data.user) {
    throw new Error(
      `Failed to sign in with role "${selectedCredential.role}": ${signInResult.error?.message ?? 'missing session'}`,
    );
  }

  const accessToken = signInResult.data.session.access_token;
  const selectedUser = {
    email: selectedCredential.email,
    role: selectedCredential.role,
    userId: signInResult.data.user.id,
  };

  const referenceSeeds = await activateReferenceSeedsForSmoke({
    accessToken,
    currentUserId: selectedUser.userId,
    requiredSeeds: getReferenceSeedKeysForTable('processes'),
    supabase: modules.supabase,
  });
  const useReferenceSeeds = Boolean(
    referenceSeeds?.contact &&
    referenceSeeds.flow &&
    referenceSeeds.flowproperty &&
    referenceSeeds.source,
  );

  const createdDatasets: Partial<Record<WorkflowDatasetKey, CreatedDatasetEntry>> = {};
  let cleanupAttempted = false;
  let cleanupPassed = true;

  try {
    const flowSourceFixtureId =
      resolveSourceFixtureId(
        (flowFixture as Record<string, any>).id,
        getOptionalNestedString(flowOrderedJson, FLOW_UUID_PATH),
      ) ?? '(not provided in fixture)';

    const contactRuntimeId = resolveRuntimeId(
      contactFixture.id,
      options.generateId,
      generateIdFn,
      'contact fixture',
    );
    const sourceRuntimeId = resolveRuntimeId(
      sourceFixture.id,
      options.generateId,
      generateIdFn,
      'source fixture',
    );
    const flowpropertyRuntimeId = resolveRuntimeId(
      flowpropertyFixture.id,
      options.generateId,
      generateIdFn,
      'flowproperty fixture',
    );
    const flowRuntimeId = resolveRuntimeId(
      flowSourceFixtureId !== '(not provided in fixture)' ? flowSourceFixtureId : undefined,
      options.generateId,
      generateIdFn,
      'flow fixture',
    );
    const processRuntimeId = resolveRuntimeId(
      processCreateFixture.id,
      options.generateId,
      generateIdFn,
      'process fixture',
    );

    const preparedSourceJsonOrdered = prepareSourceJsonOrderedForRuntime(
      sourceFixture.jsonOrdered,
      {
        runtimeId: sourceRuntimeId,
      },
    );
    const projectedSourceReference = referenceSeeds?.source
      ? referenceSeedToSummary(referenceSeeds.source)
      : buildSourceReferenceSummary(
          preparedSourceJsonOrdered.jsonOrdered,
          sourceRuntimeId,
          preparedSourceJsonOrdered.version,
        );
    patchSourceRuntimeReferences(preparedSourceJsonOrdered.jsonOrdered, projectedSourceReference);

    const preparedContactJsonOrdered = prepareContactJsonOrderedForRuntime(
      contactFixture.jsonOrdered,
      {
        runtimeId: contactRuntimeId,
      },
    );

    const contactRuleVerification = await computeRuleVerification(
      dependencies.ruleVerificationComputers?.contact,
      defaultComputeContactRuleVerification,
      preparedContactJsonOrdered.jsonOrdered,
    );
    const contactCreateStep = await createDatasetStep({
      accessToken,
      createdDatasets,
      currentUserId: selectedUser.userId,
      datasetKey: 'contact',
      evaluateExpectationsFn: evaluateContactExpectations,
      expectations: contactCreateExpectations,
      expectedVersion: preparedContactJsonOrdered.version,
      id: contactRuntimeId,
      jsonOrdered: preparedContactJsonOrdered.jsonOrdered,
      label: 'contact',
      modules,
      ruleVerification: contactRuleVerification,
      table: 'contacts',
    });
    let currentContactReference = referenceSeeds?.contact
      ? referenceSeedToSummary(referenceSeeds.contact)
      : buildContactReferenceSummary(
          contactCreateStep.record.json_ordered as Record<string, any>,
          contactCreateStep.record.id,
          contactCreateStep.record.version,
        );

    const sourceRuleVerification = await computeRuleVerification(
      dependencies.ruleVerificationComputers?.source,
      defaultComputeSourceRuleVerification,
      preparedSourceJsonOrdered.jsonOrdered,
    );
    const sourceCreateStep = await createDatasetStep({
      accessToken,
      createdDatasets,
      currentUserId: selectedUser.userId,
      datasetKey: 'source',
      evaluateExpectationsFn: evaluateSourceExpectations,
      expectations: sourceCreateExpectations,
      expectedVersion: preparedSourceJsonOrdered.version,
      id: sourceRuntimeId,
      jsonOrdered: preparedSourceJsonOrdered.jsonOrdered,
      label: 'source',
      modules,
      ruleVerification: sourceRuleVerification,
      table: 'sources',
    });
    let currentSourceReference = referenceSeeds?.source
      ? referenceSeedToSummary(referenceSeeds.source)
      : buildSourceReferenceSummary(
          sourceCreateStep.record.json_ordered as Record<string, any>,
          sourceCreateStep.record.id,
          sourceCreateStep.record.version,
        );

    const preparedFlowpropertyCreateJsonOrdered = prepareFlowpropertyJsonOrderedForRuntime(
      flowpropertyFixture.jsonOrdered,
      {
        runtimeId: flowpropertyRuntimeId,
      },
    );
    patchFlowpropertyRuntimeReferences(
      preparedFlowpropertyCreateJsonOrdered.jsonOrdered,
      currentSourceReference,
    );

    const flowpropertyCreateRuleVerification = await computeRuleVerification(
      dependencies.ruleVerificationComputers?.flowproperty,
      defaultComputeFlowpropertyRuleVerification,
      preparedFlowpropertyCreateJsonOrdered.jsonOrdered,
    );
    const flowpropertyCreateStep = await createDatasetStep({
      accessToken,
      createdDatasets,
      currentUserId: selectedUser.userId,
      datasetKey: 'flowproperty',
      evaluateExpectationsFn: evaluateFlowpropertyExpectations,
      expectations: flowpropertyCreateExpectations,
      expectedVersion: preparedFlowpropertyCreateJsonOrdered.version,
      id: flowpropertyRuntimeId,
      jsonOrdered: preparedFlowpropertyCreateJsonOrdered.jsonOrdered,
      label: 'flowproperty',
      modules,
      ruleVerification: flowpropertyCreateRuleVerification,
      table: 'flowproperties',
    });
    let currentFlowPropertyReference = referenceSeeds?.flowproperty
      ? referenceSeedToSummary(referenceSeeds.flowproperty)
      : buildFlowpropertyReferenceSummary(
          flowpropertyCreateStep.record.json_ordered as Record<string, any>,
          flowpropertyCreateStep.record.id,
          flowpropertyCreateStep.record.version,
        );

    const preparedFlowCreateJsonOrdered = prepareFlowJsonOrderedForRuntime(flowOrderedJson, {
      runtimeId: flowRuntimeId,
    });
    patchFlowRuntimeReferences(preparedFlowCreateJsonOrdered.jsonOrdered, {
      contact: currentContactReference,
      flowProperty: currentFlowPropertyReference,
      source: currentSourceReference,
    });

    const flowCreateRuleVerification = await computeRuleVerification(
      dependencies.ruleVerificationComputers?.flow,
      defaultComputeFlowRuleVerification,
      preparedFlowCreateJsonOrdered.jsonOrdered,
    );
    const flowCreateStep = await createDatasetStep({
      accessToken,
      createdDatasets,
      currentUserId: selectedUser.userId,
      datasetKey: 'flow',
      evaluateExpectationsFn: evaluateFlowExpectations,
      expectations: flowCreateExpectations,
      expectedVersion: preparedFlowCreateJsonOrdered.version,
      id: flowRuntimeId,
      jsonOrdered: preparedFlowCreateJsonOrdered.jsonOrdered,
      label: 'flow',
      modules,
      ruleVerification: flowCreateRuleVerification,
      table: 'flows',
    });
    let currentFlowReference = referenceSeeds?.flow
      ? referenceSeedToSummary(referenceSeeds.flow)
      : buildFlowReferenceSummary(
          flowCreateStep.record.json_ordered as Record<string, any>,
          flowCreateStep.record.id,
          flowCreateStep.record.version,
        );

    const preparedProcessCreateJsonOrdered = prepareProcessJsonOrderedForRuntime(
      processCreateFixture.jsonOrdered,
      {
        runtimeId: processRuntimeId,
      },
    );
    const processCreateRuleVerification = await computeRuleVerification(
      dependencies.ruleVerificationComputers?.process,
      defaultComputeProcessRuleVerification,
      preparedProcessCreateJsonOrdered.jsonOrdered,
    );
    const processCreateStep = await createDatasetStep({
      accessToken,
      createdDatasets,
      currentUserId: selectedUser.userId,
      datasetKey: 'process',
      evaluateExpectationsFn: evaluateProcessExpectations,
      expectations: processCreateExpectations,
      expectedVersion: preparedProcessCreateJsonOrdered.version,
      id: processRuntimeId,
      jsonOrdered: preparedProcessCreateJsonOrdered.jsonOrdered,
      label: 'process',
      modules,
      ruleVerification: processCreateRuleVerification,
      table: 'processes',
    });
    const userTeamId = (await modules.generalApi.getTeamIdByUserId()) ?? '';
    const runtimeDatasetIds: Record<WorkflowDatasetKey, string> = {
      contact: contactCreateStep.record.id,
      flow: flowCreateStep.record.id,
      flowproperty: flowpropertyCreateStep.record.id,
      process: processCreateStep.record.id,
      source: sourceCreateStep.record.id,
    };
    const processValidationCheckpoints: ProcessValidationCheckpointResult[] = [];

    const runProcessValidationAtStage = async (
      label: string,
      expectedBlockingDatasets: WorkflowDatasetKey[],
    ) => {
      const checkpoint = await runProcessValidationCheckpoint({
        expectedBlockingDatasets,
        jsonOrdered: buildPreparedProcessCheckJsonOrdered({
          contact: currentContactReference,
          flow: currentFlowReference,
          processRuntimeId: processCreateStep.record.id,
          processVersion: processCreateStep.record.version,
          source: currentSourceReference,
          template: processCheckOrderedJson,
        }),
        label,
        modules,
        runtimeDatasetIds,
        userTeamId,
      });
      processValidationCheckpoints.push(checkpoint);
      return checkpoint;
    };

    await runProcessValidationAtStage(
      'after-create',
      useReferenceSeeds ? [] : ['contact', 'source', 'flowproperty', 'flow', 'process'],
    );

    const preparedContactCheckJsonOrdered = prepareContactJsonOrderedForRuntime(
      contactCheckOrderedJson,
      {
        runtimeId: contactCreateStep.record.id,
        version: contactCreateStep.record.version,
      },
    );
    patchContactCheckRuntimeReferences(preparedContactCheckJsonOrdered.jsonOrdered, {
      runtimeContactId: contactCreateStep.record.id,
      version: contactCreateStep.record.version,
    });
    const contactUpdate = await updateDatasetStep({
      accessToken,
      createdDatasets,
      currentUserId: selectedUser.userId,
      datasetKey: 'contact',
      datasetType: 'contact data set',
      evaluateExpectationsFn: evaluateContactExpectations,
      expectedRuleVerification: expectedContactRuleVerification,
      expectations: contactCheckExpectations,
      id: contactCreateStep.record.id,
      jsonOrdered: preparedContactCheckJsonOrdered.jsonOrdered,
      label: 'contact',
      modules,
      table: 'contacts',
      userTeamId,
      version: contactCreateStep.record.version,
    });
    const contactStep = contactUpdate.step;
    currentContactReference = referenceSeeds?.contact
      ? referenceSeedToSummary(referenceSeeds.contact)
      : buildContactReferenceSummary(
          contactStep.record.json_ordered as Record<string, any>,
          contactStep.record.id,
          contactStep.record.version,
        );
    await runProcessValidationAtStage(
      'after-contact-check',
      useReferenceSeeds ? [] : ['source', 'flowproperty', 'flow', 'process'],
    );

    const preparedSourceCheckJsonOrdered = prepareSourceJsonOrderedForRuntime(
      sourceCheckOrderedJson,
      {
        runtimeId: sourceCreateStep.record.id,
        version: sourceCreateStep.record.version,
      },
    );
    patchSourceCheckRuntimeReferences(preparedSourceCheckJsonOrdered.jsonOrdered, {
      contact: currentContactReference,
      runtimeSourceId: sourceCreateStep.record.id,
      version: sourceCreateStep.record.version,
    });
    const sourceUpdate = await updateDatasetStep({
      accessToken,
      createdDatasets,
      currentUserId: selectedUser.userId,
      datasetKey: 'source',
      datasetType: 'source data set',
      evaluateExpectationsFn: evaluateSourceExpectations,
      expectedRuleVerification: expectedSourceRuleVerification,
      expectations: sourceCheckExpectations,
      id: sourceCreateStep.record.id,
      jsonOrdered: preparedSourceCheckJsonOrdered.jsonOrdered,
      label: 'source',
      modules,
      table: 'sources',
      userTeamId,
      version: sourceCreateStep.record.version,
    });
    const sourceStep = sourceUpdate.step;
    currentSourceReference = referenceSeeds?.source
      ? referenceSeedToSummary(referenceSeeds.source)
      : buildSourceReferenceSummary(
          sourceStep.record.json_ordered as Record<string, any>,
          sourceStep.record.id,
          sourceStep.record.version,
        );
    await runProcessValidationAtStage(
      'after-source-check',
      useReferenceSeeds ? [] : ['flowproperty', 'flow', 'process'],
    );

    const preparedFlowpropertyCheckJsonOrdered = prepareFlowpropertyJsonOrderedForRuntime(
      flowpropertyCheckOrderedJson,
      {
        runtimeId: flowpropertyCreateStep.record.id,
        version: flowpropertyCreateStep.record.version,
      },
    );
    patchFlowpropertyCheckRuntimeReferences(preparedFlowpropertyCheckJsonOrdered.jsonOrdered, {
      contact: currentContactReference,
      source: currentSourceReference,
    });
    const flowpropertyUpdate = await updateDatasetStep({
      accessToken,
      createdDatasets,
      currentUserId: selectedUser.userId,
      datasetKey: 'flowproperty',
      datasetType: 'flow property data set',
      evaluateExpectationsFn: evaluateFlowpropertyExpectations,
      expectedRuleVerification: expectedFlowpropertyRuleVerification,
      expectations: flowpropertyCheckExpectations,
      id: flowpropertyCreateStep.record.id,
      jsonOrdered: preparedFlowpropertyCheckJsonOrdered.jsonOrdered,
      label: 'flowproperty',
      modules,
      table: 'flowproperties',
      userTeamId,
      version: flowpropertyCreateStep.record.version,
    });
    const flowpropertyStep = flowpropertyUpdate.step;
    currentFlowPropertyReference = referenceSeeds?.flowproperty
      ? referenceSeedToSummary(referenceSeeds.flowproperty)
      : buildFlowpropertyReferenceSummary(
          flowpropertyStep.record.json_ordered as Record<string, any>,
          flowpropertyStep.record.id,
          flowpropertyStep.record.version,
        );
    await runProcessValidationAtStage(
      'after-flowproperty-check',
      useReferenceSeeds ? [] : ['flow', 'process'],
    );

    const preparedFlowCheckJsonOrdered = prepareFlowJsonOrderedForRuntime(flowCheckOrderedJson, {
      runtimeId: flowCreateStep.record.id,
      version: flowCreateStep.record.version,
    });
    patchFlowRuntimeReferences(preparedFlowCheckJsonOrdered.jsonOrdered, {
      contact: currentContactReference,
      flowProperty: currentFlowPropertyReference,
      source: currentSourceReference,
    });
    const flowUpdate = await updateDatasetStep({
      accessToken,
      createdDatasets,
      currentUserId: selectedUser.userId,
      datasetKey: 'flow',
      datasetType: 'flow data set',
      evaluateExpectationsFn: evaluateFlowExpectations,
      expectedRuleVerification: expectedFlowRuleVerification,
      expectations: flowCheckExpectations,
      id: flowCreateStep.record.id,
      jsonOrdered: preparedFlowCheckJsonOrdered.jsonOrdered,
      label: 'flow',
      modules,
      table: 'flows',
      userTeamId,
      version: flowCreateStep.record.version,
    });
    const flowStep = flowUpdate.step;
    currentFlowReference = referenceSeeds?.flow
      ? referenceSeedToSummary(referenceSeeds.flow)
      : buildFlowReferenceSummary(
          flowStep.record.json_ordered as Record<string, any>,
          flowStep.record.id,
          flowStep.record.version,
        );
    const finalProcessCheckpoint = await runProcessValidationAtStage('after-flow-check', []);
    const validation = finalProcessCheckpoint.validation;

    const finalProcessJsonOrdered = buildPreparedProcessCheckJsonOrdered({
      contact: currentContactReference,
      flow: currentFlowReference,
      processRuntimeId: processCreateStep.record.id,
      processVersion: processCreateStep.record.version,
      source: currentSourceReference,
      template: processCheckOrderedJson,
    });
    const updateResult = await modules.supabase.functions.invoke('app_dataset_save_draft', {
      body: {
        id: processCreateStep.record.id,
        jsonOrdered: finalProcessJsonOrdered,
        ruleVerification: validation.ruleVerification,
        table: 'processes',
        version: processCreateStep.record.version,
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      region: FunctionRegion.UsEast1,
    });

    if (updateResult.error) {
      throw new Error(`Update process failed: ${updateResult.error.message}.`);
    }

    createdDatasets.process = {
      id: processCreateStep.record.id,
      table: 'processes',
      version: processCreateStep.record.version,
    };

    const updatedProcessRecord = await queryDatasetRecord(
      modules.supabase,
      'processes',
      processCreateStep.record.id,
      processCreateStep.record.version,
    );
    createdDatasets.process.version = updatedProcessRecord.version;

    const processUpdateExpectationResults = evaluateProcessExpectations({
      currentUserId: selectedUser.userId,
      expectations: processCheckExpectations,
      record: updatedProcessRecord,
      uploadedJsonOrdered: finalProcessJsonOrdered,
    });
    const validationExpectationResults = buildValidationExpectationResults(
      validation,
      expectedProcessRuleVerification,
    );
    const referenceExpectationResults = evaluateStructuredExpectations({
      context: updatedProcessRecord as unknown as Record<string, unknown>,
      expectations: structuredProcessCheckExpectations,
      placeholders: {
        testContactReference: currentContactReference.reference,
        testFlowReference: currentFlowReference.reference,
        testSourceReference: currentSourceReference.reference,
      },
    });
    const processUpdateStep: WorkflowStepResult = {
      expectationResults: [
        ...processUpdateExpectationResults,
        ...validationExpectationResults,
        ...referenceExpectationResults.map((expectation) => ({
          actual: expectation.actual,
          expected: expectation.expected,
          label: expectation.label,
          passed: expectation.passed,
        })),
      ],
      record: updatedProcessRecord,
      submittedRuleVerification: validation.ruleVerification,
    };

    if (!options.keepData) {
      cleanupAttempted = true;
      cleanupPassed = await cleanupCreatedDatasets({
        accessToken,
        createdDatasets,
        modules,
      });
    }

    const runtimeDatasets = {
      contact: buildRuntimeDatasetInfo('contacts', contactFixture.id, contactStep.record),
      flow: buildRuntimeDatasetInfo('flows', flowSourceFixtureId, flowStep.record),
      flowproperty: buildRuntimeDatasetInfo(
        'flowproperties',
        flowpropertyFixture.id,
        flowpropertyStep.record,
      ),
      process: buildRuntimeDatasetInfo('processes', processCreateFixture.id, updatedProcessRecord),
      source: buildRuntimeDatasetInfo('sources', sourceFixture.id, sourceStep.record),
    };

    const runtimeReferences = {
      contact: currentContactReference.reference,
      flow: currentFlowReference.reference,
      flowProperty: currentFlowPropertyReference.reference,
      source: currentSourceReference.reference,
    };

    const passed =
      contactCreateStep.expectationResults.every((expectation) => expectation.passed) &&
      sourceCreateStep.expectationResults.every((expectation) => expectation.passed) &&
      flowpropertyCreateStep.expectationResults.every((expectation) => expectation.passed) &&
      flowCreateStep.expectationResults.every((expectation) => expectation.passed) &&
      contactStep.expectationResults.every((expectation) => expectation.passed) &&
      processCreateStep.expectationResults.every((expectation) => expectation.passed) &&
      sourceStep.expectationResults.every((expectation) => expectation.passed) &&
      flowpropertyStep.expectationResults.every((expectation) => expectation.passed) &&
      flowStep.expectationResults.every((expectation) => expectation.passed) &&
      processValidationCheckpoints.every((checkpoint) =>
        checkpoint.expectationResults.every((expectation) => expectation.passed),
      ) &&
      processUpdateStep.expectationResults.every((expectation) => expectation.passed) &&
      cleanupPassed;

    let runtimeRecordFile: string | undefined;
    let runtimeRecordWritten = false;

    if (options.writeRuntime) {
      runtimeRecordFile = options.runtimeRecordFile;
      const runtimeRecord = buildProcessCheckDataRuntimeReferencesRuntimeRecord(options, {
        cleanupAttempted,
        cleanupPassed,
        contactCreateStep,
        contactStep,
        flowCreateStep,
        flowStep,
        flowpropertyCreateStep,
        flowpropertyStep,
        frontendProbe,
        passed,
        processCreateStep,
        processValidationCheckpoints,
        processUpdateStep,
        referenceExpectationResults,
        runtimeDatasets,
        runtimeReferences,
        selectedUser,
        sourceCreateStep,
        sourceStep,
        supabaseTarget,
        validation,
      });
      await writeRuntimeRecord(runtimeRecordFile, runtimeRecord);
      runtimeRecordWritten = true;
    }

    return {
      cleanupAttempted,
      cleanupPassed,
      contactCreateStep,
      contactStep,
      flowCreateStep,
      flowStep,
      flowpropertyCreateStep,
      flowpropertyStep,
      frontendProbe,
      passed,
      processCreateStep,
      processValidationCheckpoints,
      processUpdateStep,
      referenceExpectationResults,
      runtimeDatasets,
      runtimeRecordFile,
      runtimeRecordWritten,
      runtimeReferences,
      selectedUser,
      sourceCreateStep,
      sourceStep,
      supabaseTarget,
      validation,
    };
  } catch (error) {
    if (!options.keepData && Object.keys(createdDatasets).length > 0) {
      cleanupAttempted = true;
      cleanupPassed = await cleanupCreatedDatasets({
        accessToken,
        createdDatasets,
        modules,
      });
    }

    if (error instanceof Error && cleanupAttempted && !cleanupPassed) {
      throw new Error(`${error.message} Cleanup also failed.`);
    }

    throw error;
  } finally {
    clearActiveReferenceSeeds();
    await modules.supabase.auth.signOut();
  }
}

function buildRuntimeRecordStep(
  fixtureFile: string,
  expectedFile: string,
  step: WorkflowStepResult,
  runtimeDataset: RuntimeDatasetInfo,
): RuntimeRecordStep {
  const { json_ordered: _jsonOrdered, ...persistedRecord } = step.record;

  return {
    expectedFile,
    expectationResults: step.expectationResults,
    fixtureFile,
    persistedRecord,
    runtimeId: runtimeDataset.runtimeId,
    sourceFixtureId: runtimeDataset.sourceFixtureId,
    submittedRuleVerification: step.submittedRuleVerification,
    version: runtimeDataset.version,
  };
}

async function createDatasetStep(input: {
  accessToken: string;
  createdDatasets: Partial<Record<WorkflowDatasetKey, CreatedDatasetEntry>>;
  currentUserId: string;
  datasetKey: WorkflowDatasetKey;
  evaluateExpectationsFn: CreateStepExpectationEvaluator;
  expectations: any[];
  expectedVersion: string;
  id: string;
  jsonOrdered: Record<string, any>;
  label: string;
  modules: LoadedValidationModules;
  ruleVerification: boolean;
  table: CleanupTable;
}): Promise<WorkflowStepResult> {
  const createResult = await input.modules.supabase.functions.invoke('app_dataset_create', {
    body: {
      id: input.id,
      jsonOrdered: input.jsonOrdered,
      ruleVerification: input.ruleVerification,
      table: input.table,
    },
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    region: FunctionRegion.UsEast1,
  });

  if (createResult.error) {
    throw new Error(
      `Create ${input.label} failed: ${createResult.error.message}.${buildDuplicateHint(createResult.error.message)}`,
    );
  }

  input.createdDatasets[input.datasetKey] = {
    id: input.id,
    table: input.table,
    version: input.expectedVersion,
  };

  const record = await queryDatasetRecord(
    input.modules.supabase,
    input.table,
    input.id,
    input.expectedVersion,
  );
  input.createdDatasets[input.datasetKey] = {
    id: record.id,
    table: input.table,
    version: record.version,
  };

  return {
    expectationResults: input.evaluateExpectationsFn({
      currentUserId: input.currentUserId,
      expectations: input.expectations,
      record,
      uploadedJsonOrdered: input.jsonOrdered,
    }),
    record,
    submittedRuleVerification: input.ruleVerification,
  };
}

async function updateDatasetStep(input: {
  accessToken: string;
  createdDatasets: Partial<Record<WorkflowDatasetKey, CreatedDatasetEntry>>;
  currentUserId: string;
  datasetKey: WorkflowDatasetKey;
  datasetType: DatasetTypeName;
  evaluateExpectationsFn: CreateStepExpectationEvaluator;
  expectedRuleVerification: boolean;
  expectations: any[];
  id: string;
  jsonOrdered: Record<string, any>;
  label: string;
  modules: LoadedValidationModules;
  table: CleanupTable;
  userTeamId: string;
  version: string;
}): Promise<{
  step: WorkflowStepResult;
  validation: ValidationSummary;
}> {
  const validationResult = await input.modules.review.validateDatasetRuleVerification(
    input.datasetType,
    input.jsonOrdered,
    input.userTeamId,
  );

  const updateResult = await input.modules.supabase.functions.invoke('app_dataset_save_draft', {
    body: {
      id: input.id,
      jsonOrdered: input.jsonOrdered,
      ruleVerification: validationResult.ruleVerification,
      table: input.table,
      version: input.version,
    },
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    region: FunctionRegion.UsEast1,
  });

  if (updateResult.error) {
    throw new Error(`Update ${input.label} failed: ${updateResult.error.message}.`);
  }

  input.createdDatasets[input.datasetKey] = {
    id: input.id,
    table: input.table,
    version: input.version,
  };

  const record = await queryDatasetRecord(
    input.modules.supabase,
    input.table,
    input.id,
    input.version,
  );
  input.createdDatasets[input.datasetKey] = {
    id: record.id,
    table: input.table,
    version: record.version,
  };

  const validation = buildValidationSummary(validationResult);
  const updateExpectationResults = input.evaluateExpectationsFn({
    currentUserId: input.currentUserId,
    expectations: input.expectations,
    record,
    uploadedJsonOrdered: input.jsonOrdered,
  });
  const validationExpectationResults = buildValidationExpectationResults(
    validation,
    input.expectedRuleVerification,
  );

  return {
    step: {
      expectationResults: [...updateExpectationResults, ...validationExpectationResults],
      record,
      submittedRuleVerification: validationResult.ruleVerification,
    },
    validation,
  };
}

function buildPreparedProcessCheckJsonOrdered(input: {
  contact: DatasetReferenceSummary;
  flow: DatasetReferenceSummary;
  processRuntimeId: string;
  processVersion: string;
  source: DatasetReferenceSummary;
  template: Record<string, any>;
}) {
  const preparedProcessCheckJsonOrdered = prepareProcessJsonOrderedForRuntime(input.template, {
    runtimeId: input.processRuntimeId,
    version: input.processVersion,
  });
  patchProcessRuntimeReferences(preparedProcessCheckJsonOrdered.jsonOrdered, {
    contact: input.contact,
    flow: input.flow,
    source: input.source,
  });

  return preparedProcessCheckJsonOrdered.jsonOrdered;
}

function buildValidationSummary(validationResult: ValidationResultRaw): ValidationSummary {
  return {
    datasetSdkValid: validationResult.datasetSdkValid,
    nonExistentRefCount: validationResult.nonExistentRef.length,
    ruleVerification: validationResult.ruleVerification,
    unRuleVerificationCount: validationResult.unRuleVerification.length,
  };
}

async function runProcessValidationCheckpoint(input: {
  expectedBlockingDatasets: WorkflowDatasetKey[];
  jsonOrdered: Record<string, any>;
  label: string;
  modules: LoadedValidationModules;
  runtimeDatasetIds: Record<WorkflowDatasetKey, string>;
  userTeamId: string;
}): Promise<ProcessValidationCheckpointResult> {
  const validationResult = await input.modules.review.validateDatasetRuleVerification(
    'process data set',
    input.jsonOrdered,
    input.userTeamId,
  );
  const validation = buildValidationSummary(validationResult);
  const actualBlockingDatasets = deriveBlockingDatasets(validationResult, input.runtimeDatasetIds);
  const expectedRuleVerification = input.expectedBlockingDatasets.length === 0;

  return {
    actualBlockingDatasets,
    expectedBlockingDatasets: input.expectedBlockingDatasets,
    expectationResults: [
      {
        actual: validation.ruleVerification,
        expected: expectedRuleVerification,
        label: `${input.label}: validateDatasetRuleVerification.ruleVerification matches expected`,
        passed: validation.ruleVerification === expectedRuleVerification,
      },
      {
        actual: validation.datasetSdkValid,
        expected: true,
        label: `${input.label}: validateDatasetRuleVerification.datasetSdkValid remains true`,
        passed: validation.datasetSdkValid === true,
      },
      {
        actual: validation.nonExistentRefCount,
        expected: 0,
        label: `${input.label}: validateDatasetRuleVerification.nonExistentRef stays empty`,
        passed: validation.nonExistentRefCount === 0,
      },
      {
        actual: actualBlockingDatasets,
        expected: input.expectedBlockingDatasets,
        label: `${input.label}: blocking datasets match expected`,
        passed: arraysEqual(actualBlockingDatasets, input.expectedBlockingDatasets),
      },
    ],
    label: input.label,
    validation,
  };
}

function deriveBlockingDatasets(
  validationResult: ValidationResultRaw,
  runtimeDatasetIds: Record<WorkflowDatasetKey, string>,
): WorkflowDatasetKey[] {
  const blockingDatasets = new Set<WorkflowDatasetKey>();

  [...validationResult.unRuleVerification, ...validationResult.nonExistentRef].forEach((ref) => {
    const validationReference = toValidationReference(ref);
    if (!validationReference?.['@refObjectId']) {
      return;
    }

    const match = (Object.entries(runtimeDatasetIds) as Array<[WorkflowDatasetKey, string]>).find(
      ([, runtimeId]) => runtimeId === validationReference['@refObjectId'],
    );

    if (match) {
      blockingDatasets.add(match[0]);
    }
  });

  if (!validationResult.ruleVerification) {
    blockingDatasets.add('process');
  }

  const orderedDatasetKeys: WorkflowDatasetKey[] = [
    'contact',
    'source',
    'flowproperty',
    'flow',
    'process',
  ];

  return orderedDatasetKeys.filter((datasetKey) => blockingDatasets.has(datasetKey));
}

function toValidationReference(value: unknown): ValidationReference | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as ValidationReference;
}

function arraysEqual(left: unknown[], right: unknown[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function computeRuleVerification(
  override: RuleVerificationComputer | undefined,
  fallback: RuleVerificationComputer,
  jsonOrdered: Record<string, any>,
) {
  return (override ?? fallback)(jsonOrdered);
}

async function queryDatasetRecord(
  supabase: SupabaseClient,
  table: CleanupTable,
  id: string,
  version: string,
): Promise<WorkflowDatasetRecord> {
  const result = await supabase
    .from(table)
    .select('id,json_ordered,user_id,state_code,version,team_id,rule_verification,reviews')
    .eq('id', id)
    .eq('version', version)
    .maybeSingle<WorkflowDatasetRecord>();

  if (result.error || !result.data) {
    throw new Error(
      `Failed to query ${table} by id/version: ${result.error?.message ?? 'record not found'}`,
    );
  }

  return result.data;
}

async function cleanupCreatedDatasets(input: {
  accessToken: string;
  createdDatasets: Partial<Record<WorkflowDatasetKey, CreatedDatasetEntry>>;
  modules: LoadedValidationModules;
}) {
  let cleanupPassed = true;

  for (const key of CLEANUP_ORDER) {
    const dataset = input.createdDatasets[key];
    if (!dataset) {
      continue;
    }

    const deleteResult = await input.modules.supabase.functions.invoke('app_dataset_delete', {
      body: {
        id: dataset.id,
        table: dataset.table,
        version: dataset.version,
      },
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
      region: FunctionRegion.UsEast1,
    });

    if (deleteResult.error) {
      cleanupPassed = false;
    }
  }

  return cleanupPassed;
}

function buildRuntimeDatasetInfo(
  table: CleanupTable,
  sourceFixtureId: string,
  record: WorkflowDatasetRecord,
): RuntimeDatasetInfo {
  return {
    runtimeId: record.id,
    sourceFixtureId,
    table,
    version: record.version,
  };
}

function buildDuplicateHint(message: string) {
  return message.includes('duplicate') || message.includes('23505')
    ? ' Try re-enabling runtime id generation or remove the kept fixture data before re-running.'
    : '';
}

function resolveRuntimeId(
  fixtureId: string | undefined,
  generateId: boolean,
  generateIdFn: () => string,
  label: string,
) {
  if (generateId) {
    return generateIdFn();
  }

  if (fixtureId) {
    return fixtureId;
  }

  throw new Error(
    `Unable to reuse the fixture UUID for ${label} because the fixture does not provide a stable id. Re-run with --generate-id.`,
  );
}

function resolveSourceFixtureId(explicitFixtureId: unknown, orderedUuid: string | undefined) {
  if (typeof explicitFixtureId === 'string' && explicitFixtureId.trim()) {
    return explicitFixtureId;
  }

  if (orderedUuid && !orderedUuid.includes('__RUNTIME_')) {
    return orderedUuid;
  }

  return undefined;
}

function cloneReference(reference: DatasetReferenceSummary) {
  return deepClone(reference.reference);
}

function patchContactCheckRuntimeReferences(
  jsonOrdered: Record<string, any>,
  input: {
    runtimeContactId: string;
    version: string;
  },
) {
  const contactSelfReference = buildContactReferenceSummary(
    jsonOrdered,
    input.runtimeContactId,
    input.version,
  );

  setNestedValue(
    jsonOrdered,
    [
      'contactDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:referenceToOwnershipOfDataSet',
    ],
    cloneReference(contactSelfReference),
  );
}

function patchSourceCheckRuntimeReferences(
  jsonOrdered: Record<string, any>,
  input: {
    contact: DatasetReferenceSummary;
    runtimeSourceId: string;
    version: string;
  },
) {
  const sourceSelfReference = buildSourceReferenceSummary(
    jsonOrdered,
    input.runtimeSourceId,
    input.version,
  );

  patchSourceRuntimeReferences(jsonOrdered, sourceSelfReference);
  setNestedValue(
    jsonOrdered,
    [
      'sourceDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:referenceToOwnershipOfDataSet',
    ],
    cloneReference(input.contact),
  );
}

function patchSourceRuntimeReferences(
  jsonOrdered: Record<string, any>,
  sourceReference: DatasetReferenceSummary,
) {
  setNestedValue(
    jsonOrdered,
    [
      'sourceDataSet',
      'administrativeInformation',
      'dataEntryBy',
      'common:referenceToDataSetFormat',
    ],
    cloneReference(sourceReference),
  );
}

function patchFlowpropertyCheckRuntimeReferences(
  jsonOrdered: Record<string, any>,
  references: {
    contact: DatasetReferenceSummary;
    source: DatasetReferenceSummary;
  },
) {
  patchFlowpropertyRuntimeReferences(jsonOrdered, references.source);
  setNestedValue(
    jsonOrdered,
    [
      'flowPropertyDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:referenceToOwnershipOfDataSet',
    ],
    cloneReference(references.contact),
  );
}

function patchFlowpropertyRuntimeReferences(
  jsonOrdered: Record<string, any>,
  sourceReference: DatasetReferenceSummary,
) {
  setNestedValue(
    jsonOrdered,
    [
      'flowPropertyDataSet',
      'modellingAndValidation',
      'complianceDeclarations',
      'compliance',
      'common:referenceToComplianceSystem',
    ],
    cloneReference(sourceReference),
  );
  setNestedValue(
    jsonOrdered,
    [
      'flowPropertyDataSet',
      'administrativeInformation',
      'dataEntryBy',
      'common:referenceToDataSetFormat',
    ],
    cloneReference(sourceReference),
  );
}

function patchFlowRuntimeReferences(
  jsonOrdered: Record<string, any>,
  references: {
    contact: DatasetReferenceSummary;
    flowProperty: DatasetReferenceSummary;
    source: DatasetReferenceSummary;
  },
) {
  setNestedValue(
    jsonOrdered,
    ['flowDataSet', 'flowProperties', 'flowProperty', 'referenceToFlowPropertyDataSet'],
    cloneReference(references.flowProperty),
  );
  setNestedValue(
    jsonOrdered,
    [
      'flowDataSet',
      'modellingAndValidation',
      'complianceDeclarations',
      'compliance',
      'common:referenceToComplianceSystem',
    ],
    cloneReference(references.source),
  );
  setNestedValue(
    jsonOrdered,
    ['flowDataSet', 'administrativeInformation', 'dataEntryBy', 'common:referenceToDataSetFormat'],
    cloneReference(references.source),
  );
  setNestedValue(
    jsonOrdered,
    [
      'flowDataSet',
      'administrativeInformation',
      'dataEntryBy',
      'common:referenceToPersonOrEntityEnteringTheData',
    ],
    cloneReference(references.contact),
  );
  setNestedValue(
    jsonOrdered,
    [
      'flowDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:referenceToOwnershipOfDataSet',
    ],
    cloneReference(references.contact),
  );
}

function patchProcessRuntimeReferences(
  jsonOrdered: Record<string, any>,
  references: {
    contact: DatasetReferenceSummary;
    flow: DatasetReferenceSummary;
    source: DatasetReferenceSummary;
  },
) {
  const exchanges = jsonOrdered?.processDataSet?.exchanges?.exchange;
  if (!Array.isArray(exchanges) || exchanges.length === 0) {
    throw new Error('Process check-data fixture is missing processDataSet.exchanges.exchange[0].');
  }

  exchanges[0].referenceToFlowDataSet = cloneReference(references.flow);
  setNestedValue(
    jsonOrdered,
    [
      'processDataSet',
      'modellingAndValidation',
      'dataSourcesTreatmentAndRepresentativeness',
      'referenceToDataSource',
    ],
    cloneReference(references.source),
  );
  setNestedValue(
    jsonOrdered,
    [
      'processDataSet',
      'administrativeInformation',
      'dataEntryBy',
      'common:referenceToDataSetFormat',
    ],
    cloneReference(references.source),
  );
  setNestedValue(
    jsonOrdered,
    [
      'processDataSet',
      'administrativeInformation',
      'dataEntryBy',
      'common:referenceToPersonOrEntityEnteringTheData',
    ],
    cloneReference(references.contact),
  );
  setNestedValue(
    jsonOrdered,
    [
      'processDataSet',
      'administrativeInformation',
      'publicationAndOwnership',
      'common:referenceToOwnershipOfDataSet',
    ],
    cloneReference(references.contact),
  );
  setNestedValue(
    jsonOrdered,
    [
      'processDataSet',
      'administrativeInformation',
      'common:commissionerAndGoal',
      'common:referenceToCommissioner',
    ],
    cloneReference(references.contact),
  );
}

function buildContactReferenceSummary(
  jsonOrdered: Record<string, any>,
  id: string,
  version: string,
): DatasetReferenceSummary {
  return buildReferenceSummary({
    id,
    shortDescription: getRequiredNestedValue(
      jsonOrdered,
      ['contactDataSet', 'contactInformation', 'dataSetInformation', 'common:shortName'],
      'contact shortDescription',
    ),
    table: 'contacts',
    version,
  });
}

function buildSourceReferenceSummary(
  jsonOrdered: Record<string, any>,
  id: string,
  version: string,
): DatasetReferenceSummary {
  return buildReferenceSummary({
    id,
    shortDescription: getRequiredNestedValue(
      jsonOrdered,
      ['sourceDataSet', 'sourceInformation', 'dataSetInformation', 'common:shortName'],
      'source shortDescription',
    ),
    table: 'sources',
    version,
  });
}

function buildFlowpropertyReferenceSummary(
  jsonOrdered: Record<string, any>,
  id: string,
  version: string,
): DatasetReferenceSummary {
  return buildReferenceSummary({
    id,
    shortDescription: getRequiredNestedValue(
      jsonOrdered,
      ['flowPropertyDataSet', 'flowPropertiesInformation', 'dataSetInformation', 'common:name'],
      'flowproperty shortDescription',
    ),
    table: 'flowproperties',
    version,
  });
}

function buildFlowReferenceSummary(
  jsonOrdered: Record<string, any>,
  id: string,
  version: string,
): DatasetReferenceSummary {
  return buildReferenceSummary({
    id,
    shortDescription: getRequiredNestedValue(
      jsonOrdered,
      ['flowDataSet', 'flowInformation', 'dataSetInformation', 'name', 'baseName'],
      'flow shortDescription',
    ),
    table: 'flows',
    version,
  });
}

function buildReferenceSummary(input: {
  id: string;
  shortDescription: unknown;
  table: ReferenceTable;
  version: string;
}): DatasetReferenceSummary {
  const meta = DATASET_REFERENCE_META[input.table];

  return {
    id: input.id,
    reference: {
      '@refObjectId': input.id,
      '@type': meta.type,
      '@uri': `../${meta.folder}/${input.id}.xml`,
      '@version': input.version,
      'common:shortDescription': deepClone(input.shortDescription),
    },
    table: input.table,
    version: input.version,
  };
}

function referenceSeedToSummary(seed: ReferenceSeed): DatasetReferenceSummary {
  return {
    id: seed.id,
    reference: deepClone(seed.reference),
    table: seed.table as ReferenceTable,
    version: seed.version,
  };
}

function getRequiredNestedValue(
  source: Record<string, any>,
  keys: readonly string[],
  label: string,
) {
  let current: any = source;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      throw new Error(`Unable to resolve ${label}. Missing path: ${keys.join('.')}`);
    }

    current = current[key];
  }

  if (current === undefined) {
    throw new Error(`Unable to resolve ${label}. Missing path: ${keys.join('.')}`);
  }

  return current;
}

function getOptionalNestedString(source: Record<string, any>, keys: readonly string[]) {
  let current: any = source;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }

    current = current[key];
  }

  return typeof current === 'string' && current.trim() ? current : undefined;
}

function setNestedValue(source: Record<string, any>, keys: readonly string[], value: unknown) {
  let current = source;

  keys.slice(0, -1).forEach((key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  });

  current[keys[keys.length - 1]] = value;
}

async function loadValidationModules(
  supabaseTarget: SupabaseTarget,
): Promise<LoadedValidationModules> {
  process.env.SUPABASE_URL = supabaseTarget.apiUrl;
  process.env.SUPABASE_PUBLISHABLE_KEY = supabaseTarget.publishableKey;

  const supabaseModule = await import('../../../../src/services/supabase/index');
  const generalApiModule = await import('../../../../src/services/general/api');
  const reviewModule = await import('../../../../src/pages/Utils/review');

  const supabaseExports = extractModuleExports<{ supabase: SupabaseClient }>(supabaseModule);
  const generalApiExports =
    extractModuleExports<LoadedValidationModules['generalApi']>(generalApiModule);
  const reviewExports = extractModuleExports<LoadedValidationModules['review']>(reviewModule);

  return {
    generalApi: {
      getTeamIdByUserId: generalApiExports.getTeamIdByUserId,
    },
    review: {
      validateDatasetRuleVerification: reviewExports.validateDatasetRuleVerification,
    },
    supabase: supabaseExports.supabase,
  };
}

function extractModuleExports<T>(moduleValue: Record<string, unknown>) {
  return ((moduleValue['module.exports'] as T | undefined) ??
    (moduleValue.default as T | undefined) ??
    (moduleValue as T)) as T;
}

function splitFlag(arg: string): [string, string | undefined] {
  const withoutPrefix = arg.slice(2);
  const equalsIndex = withoutPrefix.indexOf('=');

  if (equalsIndex === -1) {
    return [withoutPrefix, undefined];
  }

  return [withoutPrefix.slice(0, equalsIndex), withoutPrefix.slice(equalsIndex + 1)];
}

function requireFlagValue(
  flag: string,
  inlineValue: string | undefined,
  readNextValue: () => string | undefined,
) {
  if (inlineValue !== undefined) {
    return inlineValue;
  }

  const nextValue = readNextValue();
  if (!nextValue || nextValue.startsWith('--')) {
    throw new Error(`Missing value for --${flag}`);
  }

  return nextValue;
}

function parseBoolean(value: string, flag: string) {
  const normalized = value.trim().toLowerCase();
  if (TRUE_LITERALS.has(normalized)) {
    return true;
  }
  if (FALSE_LITERALS.has(normalized)) {
    return false;
  }
  throw new Error(`Invalid boolean value for --${flag}: ${value}`);
}
