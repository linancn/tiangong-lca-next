import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

jest.mock('../../workflows/processes/processes-check-data-workflow-lib', () => ({
  __esModule: true,
  DEFAULT_PROCESS_CHECK_DATA_FIXTURE_PATH:
    'tests/data-workflows/fixtures/data/processes/002_check_data_success.json',
  getFixtureOrderedJson: (fixture: any) => fixture.jsonOrdered,
  loadProcessCheckDataFixture: jest.fn(async () => ({
    jsonOrdered: {
      processDataSet: {
        administrativeInformation: {
          publicationAndOwnership: {
            'common:dataSetVersion': '01.01.000',
          },
        },
        processInformation: {
          dataSetInformation: {
            'common:UUID': '__RUNTIME_PROCESS_ID__',
          },
        },
      },
    },
  })),
}));

const mockComputeProcessRuleVerification = jest.fn(async () => true);
const mockPrepareProcessJsonOrderedForRuntime = jest.fn((jsonOrdered: any, options: any) => ({
  jsonOrdered: {
    ...jsonOrdered,
    preparedRuntimeId: options.runtimeId,
  },
  version: options.version ?? '01.01.000',
}));

jest.mock('../../workflows/processes/processes-create-workflow-lib', () => ({
  __esModule: true,
  computeProcessRuleVerification: (...args: any[]) =>
    mockComputeProcessRuleVerification.apply(null, args),
  prepareProcessJsonOrderedForRuntime: (...args: any[]) =>
    mockPrepareProcessJsonOrderedForRuntime.apply(null, args),
}));

import {
  LIFECYCLEMODEL_WORKFLOW_CONFIGS,
  buildLifeCycleModelSmokeHelp,
  cloneLifeCycleModelPayload,
  loadLifeCycleModelFixture,
  parseLifeCycleModelCliArgs,
  runLifeCycleModelDataWorkflow,
} from '../../workflows/lifecyclemodels/lifecyclemodels-workflow-lib';

const buildRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'model-runtime',
  json: {},
  json_tg: {
    submodels: [{ id: 'model-runtime', type: 'primary' }],
    xflow: { edges: [], nodes: [{ id: 'node-primary' }] },
  },
  reviews: null,
  rule_verification: true,
  state_code: 0,
  team_id: null,
  user_id: 'user-1',
  version: '01.01.000',
  ...overrides,
});

const createSupabaseMock = (records: any[]) => {
  const builder: any = {
    eq: jest.fn(() => builder),
    maybeSingle: jest.fn(async () => ({
      data: records.shift() ?? buildRecord(),
      error: null,
    })),
    select: jest.fn(() => builder),
  };

  return {
    auth: {
      signInWithPassword: jest.fn(async () => ({
        data: {
          session: { access_token: 'token-1' },
          user: { id: 'user-1' },
        },
        error: null,
      })),
      signOut: jest.fn(async () => ({})),
    },
    from: jest.fn(() => builder),
    functions: {
      invoke: jest.fn(async () => ({ data: {}, error: null })),
    },
  };
};

describe('lifecyclemodels-workflow-lib', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      TEST_USER_EMAIL: 'user@example.com',
      TEST_USER_PASSWORD: 'secret',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('parses CLI defaults and lifecycle-specific flags', () => {
    const options = parseLifeCycleModelCliArgs(
      [
        '--role',
        'team-member',
        '--frontend-url',
        'http://127.0.0.1:8000',
        '--supabase-url',
        'https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie',
        '--supabase-publishable-key',
        'sb_publishable_test_key',
        '--seed-process-data-file',
        'tests/data-workflows/fixtures/data/processes/custom.json',
        '--no-keep-data',
      ],
      LIFECYCLEMODEL_WORKFLOW_CONFIGS.create,
      '/repo',
    );

    expect(options.role).toBe('team-member');
    expect(options.frontendUrl).toBe('http://127.0.0.1:8000');
    expect(options.supabaseUrl).toBe('https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie');
    expect(options.supabasePublishableKey).toBe('sb_publishable_test_key');
    expect(options.keepData).toBe(false);
    expect(options.seedProcessDataFile).toBe(
      '/repo/tests/data-workflows/fixtures/data/processes/custom.json',
    );
    expect(options.runtimeRecordFile).toBe(
      '/repo/tests/data-workflows/runtime/lifeCycleModels/001_create.last-run.json',
    );
  });

  it('builds help text with shared lifecycle model defaults', () => {
    const helpText = buildLifeCycleModelSmokeHelp(LIFECYCLEMODEL_WORKFLOW_CONFIGS['check-data']);

    expect(helpText).toContain('Lifecycle model check-data data workflow');
    expect(helpText).toContain('--seed-process-data-file');
    expect(helpText).toContain(
      'tests/data-workflows/fixtures/data/lifeCycleModels/002_check_data_success.json',
    );
  });

  it('loads lifecycle model fixture files', async () => {
    const fixture = await loadLifeCycleModelFixture(
      path.resolve(
        process.cwd(),
        'tests/data-workflows/fixtures/data/lifeCycleModels/001_create.json',
      ),
    );

    expect(fixture.table).toBe('lifecyclemodels');
    expect(fixture.payload).toEqual(expect.any(Object));
    expect(fixture.payload).not.toHaveProperty('ruleVerification');
  });

  it('declares runtime placeholders in business bundle fixtures', async () => {
    const fixture = await loadLifeCycleModelFixture(
      path.resolve(
        process.cwd(),
        'tests/data-workflows/fixtures/data/lifeCycleModels/001_create.json',
      ),
    );
    const ordered = fixture.payload.parent.jsonOrdered.lifeCycleModelDataSet;
    const processReference =
      ordered.lifeCycleModelInformation.technology.processes.processInstance.referenceToProcess;

    expect(fixture.payload.modelId).toBe('__RUNTIME_MODEL_ID__');
    expect(ordered.lifeCycleModelInformation.dataSetInformation['common:UUID']).toBe(
      '__RUNTIME_MODEL_ID__',
    );
    expect(
      ordered.administrativeInformation.publicationAndOwnership['common:permanentDataSetURI'],
    ).toContain('uuid=__RUNTIME_MODEL_ID__');
    expect(processReference['@refObjectId']).toBe('__RUNTIME_PRIMARY_PROCESS_ID__');
    expect(processReference['@version']).toBe('__RUNTIME_PRIMARY_PROCESS_VERSION__');
    expect(fixture.payload.parent.jsonTg.xflow.nodes[0].data.id).toBe(
      '__RUNTIME_PRIMARY_PROCESS_ID__',
    );
  });

  it('clones payloads without sharing nested references', () => {
    const payload = { nested: { value: 'original' } };
    const cloned = cloneLifeCycleModelPayload(payload);

    cloned.nested.value = 'changed';

    expect(payload.nested.value).toBe('original');
  });

  it('runs the create workflow with injected modules and evaluates expectations', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'lifecyclemodels-workflow-'));
    const expectedFile = path.join(tempRoot, 'expected.md');
    const runtimeRecordFile = path.join(tempRoot, 'runtime.json');
    const supabase = createSupabaseMock([buildRecord()]);
    const createLifeCycleModel = jest.fn(async () => ({
      ok: true,
      version: '01.01.000',
    }));
    const deleteLifeCycleModel = jest.fn(async () => ({ ok: true }));

    try {
      await writeFile(
        expectedFile,
        [
          '# expected',
          '',
          '1. `create.summary.rowExists` equals `true`',
          '2. `create.record.id` equals `runtimeModelId`',
          '3. `create.record.user_id` equals `currentUserId`',
          '4. `create.summary.primarySubmodelId` equals `runtimeModelId`',
        ].join('\n'),
      );

      const result = await runLifeCycleModelDataWorkflow(
        LIFECYCLEMODEL_WORKFLOW_CONFIGS.create,
        {
          dataFile: path.resolve(
            process.cwd(),
            'tests/data-workflows/fixtures/data/lifeCycleModels/001_create.json',
          ),
          expectedFile,
          generateId: true,
          help: false,
          keepData: false,
          role: 'user',
          runtimeRecordFile,
          seedProcessDataFile: path.resolve(
            process.cwd(),
            'tests/data-workflows/fixtures/data/processes/002_check_data_success.json',
          ),
          supabasePublishableKey: 'sb_publishable_test_key',
          supabaseUrl: 'https://fotofiyqnuyvgtotswie.supabase.co',
          usersFile: path.join(tempRoot, 'missing-users.json'),
          verifyFrontend: false,
          writeRuntime: true,
        },
        {
          generateIdFn: jest
            .fn()
            .mockReturnValueOnce('model-runtime')
            .mockReturnValueOnce('model-copy')
            .mockReturnValueOnce('seed-process'),
          modulesLoader: jest.fn(async () => ({
            lifeCycleModelsApi: {
              contributeLifeCycleModel: jest.fn(),
              createLifeCycleModel,
              deleteLifeCycleModel,
              getLifeCycleModelDetail: jest.fn(),
              getLifeCycleModelTablePgroongaSearch: jest.fn(),
              lifeCycleModel_hybrid_search: jest.fn(),
              updateLifeCycleModel: jest.fn(),
            },
            generalApi: {
              getTeamIdByUserId: jest.fn(async () => null),
            },
            review: {
              validateDatasetRuleVerification: jest.fn(async () => ({
                datasetSdkValid: true,
                nonExistentRef: [],
                ruleVerification: true,
                unRuleVerification: [],
              })),
            },
            supabase: supabase as any,
          })),
        },
      );

      const saveBundleCall = (
        supabase.functions.invoke.mock.calls as unknown as Array<[string, { body: any }]>
      ).find(([functionName]) => functionName === 'save_lifecycle_model_bundle');
      expect(saveBundleCall).toBeDefined();
      const submittedPayload = saveBundleCall![1].body;
      expect(createLifeCycleModel).not.toHaveBeenCalled();
      expect(submittedPayload).toEqual(
        expect.objectContaining({
          mode: 'create',
          modelId: 'model-runtime',
        }),
      );
      expect(submittedPayload.parent.ruleVerification).toBe(true);
      expect(
        submittedPayload.parent.jsonOrdered.lifeCycleModelDataSet.lifeCycleModelInformation
          .dataSetInformation['common:UUID'],
      ).toBe('model-runtime');
      expect(
        submittedPayload.parent.jsonOrdered.lifeCycleModelDataSet.administrativeInformation
          .publicationAndOwnership['common:permanentDataSetURI'],
      ).toBe(
        'https://lcdn.tiangong.earth/datasetdetail/lifecyclemodel.xhtml?uuid=model-runtime&version=01.01.000',
      );
      expect(submittedPayload.parent.jsonTg.xflow.nodes[0].data.id).toBe('seed-process');
      expect(submittedPayload.parent.jsonTg.xflow.nodes[0].data.version).toBe('01.01.000');
      expect(submittedPayload.parent.jsonTg.submodels[0]).toEqual(
        expect.objectContaining({
          id: 'model-runtime',
          type: 'primary',
          version: '01.01.000',
        }),
      );
      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'app_dataset_create',
        expect.objectContaining({
          body: expect.objectContaining({
            id: 'seed-process',
            table: 'processes',
          }),
        }),
      );
      expect(deleteLifeCycleModel).toHaveBeenCalledWith('model-runtime', '01.01.000');
      expect(result.passed).toBe(true);
      expect(result.cleanupAttempted).toBe(true);
      expect(result.runtimeRecordWritten).toBe(true);
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });

  it('exposes view-source detail success in the expectation context', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'lifecyclemodels-view-copy-'));
    const expectedFile = path.join(tempRoot, 'expected.md');
    const runtimeRecordFile = path.join(tempRoot, 'runtime.json');
    const supabase = createSupabaseMock([
      buildRecord(),
      buildRecord({
        id: 'model-copy',
        json_tg: {
          submodels: [{ id: 'model-copy', type: 'primary' }],
          xflow: { edges: [], nodes: [{ id: 'node-primary' }] },
        },
      }),
    ]);
    const deleteLifeCycleModel = jest.fn(async () => ({ ok: true }));

    try {
      await writeFile(
        expectedFile,
        [
          '# expected',
          '',
          '1. `create.summary.rowExists` equals `true`',
          '2. `viewSource.record.json_tg.detailSuccess` equals `true`',
          '3. `copy.summary.primarySubmodelId` equals `runtimeCopyModelId`',
        ].join('\n'),
      );

      const result = await runLifeCycleModelDataWorkflow(
        LIFECYCLEMODEL_WORKFLOW_CONFIGS['create-view-copy'],
        {
          createDataFile: path.resolve(
            process.cwd(),
            'tests/data-workflows/fixtures/data/lifeCycleModels/001_create.json',
          ),
          dataFile: path.resolve(
            process.cwd(),
            'tests/data-workflows/fixtures/data/lifeCycleModels/001_create_view_copy.json',
          ),
          expectedFile,
          generateId: true,
          help: false,
          keepData: true,
          role: 'user',
          runtimeRecordFile,
          seedProcessDataFile: path.resolve(
            process.cwd(),
            'tests/data-workflows/fixtures/data/processes/002_check_data_success.json',
          ),
          supabasePublishableKey: 'sb_publishable_test_key',
          supabaseUrl: 'https://fotofiyqnuyvgtotswie.supabase.co',
          usersFile: path.join(tempRoot, 'missing-users.json'),
          verifyFrontend: false,
          writeRuntime: true,
        },
        {
          generateIdFn: jest
            .fn()
            .mockReturnValueOnce('model-runtime')
            .mockReturnValueOnce('model-copy')
            .mockReturnValueOnce('seed-process'),
          modulesLoader: jest.fn(async () => ({
            generalApi: {
              getTeamIdByUserId: jest.fn(async () => null),
            },
            lifeCycleModelsApi: {
              contributeLifeCycleModel: jest.fn(),
              createLifeCycleModel: jest.fn(),
              deleteLifeCycleModel,
              getLifeCycleModelDetail: jest.fn(async () => ({ data: {}, success: true })),
              getLifeCycleModelTablePgroongaSearch: jest.fn(),
              lifeCycleModel_hybrid_search: jest.fn(),
              updateLifeCycleModel: jest.fn(),
            },
            review: {
              validateDatasetRuleVerification: jest.fn(async () => ({
                datasetSdkValid: true,
                nonExistentRef: [],
                ruleVerification: true,
                unRuleVerification: [],
              })),
            },
            supabase: supabase as any,
          })),
        },
      );

      expect(result.passed).toBe(true);
      expect(deleteLifeCycleModel).not.toHaveBeenCalled();
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });

  it('runs full-text search without the lifecyclemodel stateCode RPC argument', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'lifecyclemodels-search-'));
    const expectedFile = path.join(tempRoot, 'expected.md');
    const runtimeRecordFile = path.join(tempRoot, 'runtime.json');
    const supabase = createSupabaseMock([buildRecord()]);
    const deleteLifeCycleModel = jest.fn(async () => ({ ok: true }));
    const getLifeCycleModelTablePgroongaSearch = jest.fn(async () => ({
      data: [{ id: 'model-runtime' }],
      success: true,
      total: 1,
    }));
    const lifeCycleModelHybridSearch = jest.fn(async () => ({
      data: [{ id: 'model-runtime' }],
      success: true,
      total: 1,
    }));

    try {
      await writeFile(
        expectedFile,
        [
          '# expected',
          '',
          '1. `create.summary.rowExists` equals `true`',
          '2. `fullTextSearch.pgroongaContainsRuntimeId` equals `true`',
        ].join('\n'),
      );

      const result = await runLifeCycleModelDataWorkflow(
        LIFECYCLEMODEL_WORKFLOW_CONFIGS['full-text-search'],
        {
          createDataFile: path.resolve(
            process.cwd(),
            'tests/data-workflows/fixtures/data/lifeCycleModels/001_create.json',
          ),
          dataFile: path.resolve(
            process.cwd(),
            'tests/data-workflows/fixtures/data/lifeCycleModels/007_full_text_search.json',
          ),
          expectedFile,
          generateId: true,
          help: false,
          keepData: false,
          role: 'user',
          runtimeRecordFile,
          seedProcessDataFile: path.resolve(
            process.cwd(),
            'tests/data-workflows/fixtures/data/processes/002_check_data_success.json',
          ),
          supabasePublishableKey: 'sb_publishable_test_key',
          supabaseUrl: 'https://fotofiyqnuyvgtotswie.supabase.co',
          usersFile: path.join(tempRoot, 'missing-users.json'),
          verifyFrontend: false,
          writeRuntime: true,
        },
        {
          generateIdFn: jest
            .fn()
            .mockReturnValueOnce('model-runtime')
            .mockReturnValueOnce('model-copy')
            .mockReturnValueOnce('seed-process'),
          modulesLoader: jest.fn(async () => ({
            generalApi: {
              getTeamIdByUserId: jest.fn(async () => null),
            },
            lifeCycleModelsApi: {
              contributeLifeCycleModel: jest.fn(),
              createLifeCycleModel: jest.fn(async () => ({ ok: true, version: '01.01.000' })),
              deleteLifeCycleModel,
              getLifeCycleModelDetail: jest.fn(),
              getLifeCycleModelTablePgroongaSearch,
              lifeCycleModel_hybrid_search: lifeCycleModelHybridSearch,
              updateLifeCycleModel: jest.fn(),
            },
            review: {
              validateDatasetRuleVerification: jest.fn(async () => ({
                datasetSdkValid: true,
                nonExistentRef: [],
                ruleVerification: true,
                unRuleVerification: [],
              })),
            },
            supabase: supabase as any,
          })),
        },
      );

      expect(result.passed).toBe(true);
      expect(getLifeCycleModelTablePgroongaSearch).toHaveBeenCalledWith(
        { current: 1, pageSize: 10 },
        'en',
        'my',
        'model-runtime',
        {},
      );
      expect(lifeCycleModelHybridSearch).not.toHaveBeenCalled();
      expect(deleteLifeCycleModel).toHaveBeenCalledWith('model-runtime', '01.01.000');
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });
});
