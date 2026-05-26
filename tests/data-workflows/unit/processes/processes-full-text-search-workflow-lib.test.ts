import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  loadProcessFullTextSearchFixture,
  parseProcessFullTextSearchCliArgs,
  runProcessFullTextSearchSmoke,
} from '../../workflows/processes/processes-full-text-search-workflow-lib';

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(filePath: string, value: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, value, 'utf8');
}

describe('processes-full-text-search-workflow-lib', () => {
  it('parses cli arguments with defaults and aliases', () => {
    const options = parseProcessFullTextSearchCliArgs(
      [
        '--role',
        'admin',
        '--frontend-url=http://127.0.0.1:8000',
        '--supabase-url',
        'https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie',
        '--data-file',
        'custom/search.json',
        '--seed-data-file',
        'custom/seed.json',
        '--no-keep-data',
        '--no-verify-frontend',
      ],
      '/repo',
    );

    expect(options.role).toBe('admin');
    expect(options.frontendUrl).toBe('http://127.0.0.1:8000');
    expect(options.supabaseUrl).toBe('https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie');
    expect(options.dataFile).toBe('/repo/custom/search.json');
    expect(options.seedDataFile).toBe('/repo/custom/seed.json');
    expect(options.keepData).toBe(false);
    expect(options.verifyFrontend).toBe(false);
    expect(options.runtimeRecordFile).toBe('/repo/custom/search.last-run.json');
  });

  it('uses full-text search defaults and supports explicit runtime output', () => {
    const options = parseProcessFullTextSearchCliArgs(
      ['--runtime-record-file', 'runtime/process-search.json'],
      '/repo',
    );

    expect(options.dataFile).toBe(
      '/repo/tests/data-workflows/fixtures/data/processes/007_full_text_search.json',
    );
    expect(options.seedDataFile).toBe(
      '/repo/tests/data-workflows/fixtures/data/processes/001_create.json',
    );
    expect(options.writeRuntime).toBe(true);
    expect(options.runtimeRecordFile).toBe('/repo/runtime/process-search.json');
  });

  it('validates the search fixture shape', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'process-search-fixture-'));
    const fixturePath = path.join(tempRoot, 'search.json');

    try {
      await writeJson(fixturePath, {
        table: 'processes',
        queries: [
          {
            keyword: 'cement',
            label: 'cement search',
          },
        ],
      });

      await expect(loadProcessFullTextSearchFixture(fixturePath)).resolves.toMatchObject({
        table: 'processes',
        queries: [
          {
            keyword: 'cement',
            label: 'cement search',
          },
        ],
      });

      await writeJson(fixturePath, { table: 'flows', queries: [] });
      await expect(loadProcessFullTextSearchFixture(fixturePath)).rejects.toThrow(
        'Full-text search fixture table must be "processes"',
      );
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });

  it('creates a runtime process, searches through pgroonga, evaluates expectations, and cleans up', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'process-search-run-'));
    const fixturePath = path.join(tempRoot, 'search.json');
    const expectedPath = path.join(tempRoot, 'expected.md');
    const runtimeRecordFile = path.join(tempRoot, 'runtime.json');
    const usersFile = path.join(tempRoot, 'users.json');
    const invoke = jest
      .fn()
      .mockResolvedValueOnce({ data: { id: 'created' } })
      .mockResolvedValueOnce({ data: { id: 'deleted' } });
    const rpc = jest
      .fn()
      .mockResolvedValueOnce({
        data: [{ id: 'runtime-process-id', total_count: 1 }],
      })
      .mockResolvedValueOnce({
        data: [],
      });
    const signOut = jest.fn().mockResolvedValue({});
    const supabase = {
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: {
            session: { access_token: 'token-1' },
            user: { id: 'user-1' },
          },
        }),
        signOut,
      },
      functions: {
        invoke,
      },
      rpc,
    };
    const createClientImpl = jest.fn(() => supabase as any);

    try {
      await writeJson(fixturePath, {
        table: 'processes',
        queries: [
          {
            dataSource: 'my',
            expectedContainsRuntimeId: true,
            expectedMinCount: 1,
            keyword: 'test-process001_create',
            label: 'runtime search',
          },
          {
            expectedCount: 0,
            keyword: '__none__',
            label: 'empty search',
          },
        ],
      });
      await writeText(
        expectedPath,
        [
          '`queries.0.containsRuntimeId` equals `true`',
          '`queries.0.minCountPassed` equals `true`',
          '`queries.1.count` equals `0`',
          '`cleanupAttempted` equals `true`',
        ].join('\n'),
      );
      await writeJson(usersFile, {
        user: {
          email: 'user@example.com',
          password: 'secret',
        },
      });

      const result = await runProcessFullTextSearchSmoke(
        {
          dataFile: fixturePath,
          expectedFile: expectedPath,
          generateId: true,
          help: false,
          keepData: false,
          role: 'user',
          runtimeRecordFile,
          seedDataFile: path.resolve(
            process.cwd(),
            'tests/data-workflows/fixtures/data/processes/001_create.json',
          ),
          seedExpectedFile: path.resolve(
            process.cwd(),
            'tests/data-workflows/fixtures/result/processes/001_create.md',
          ),
          supabasePublishableKey: 'publishable-key',
          supabaseUrl: 'https://fotofiyqnuyvgtotswie.supabase.co',
          usersFile,
          verifyFrontend: false,
          writeRuntime: true,
        },
        {
          createClientImpl: createClientImpl as any,
          generateIdFn: () => 'runtime-process-id',
        },
      );

      expect(createClientImpl).toHaveBeenCalledWith(
        'https://fotofiyqnuyvgtotswie.supabase.co',
        'publishable-key',
        expect.objectContaining({
          auth: expect.objectContaining({ persistSession: false }),
        }),
      );
      expect(invoke).toHaveBeenNthCalledWith(
        1,
        'app_dataset_create',
        expect.objectContaining({
          body: expect.objectContaining({
            id: 'runtime-process-id',
            table: 'processes',
          }),
        }),
      );
      expect(rpc).toHaveBeenNthCalledWith(
        1,
        'search_processes_latest',
        expect.objectContaining({
          data_source: 'my',
          page_current: 1,
          page_size: 10,
          query_text: 'test-process001_create',
        }),
      );
      expect(invoke).toHaveBeenNthCalledWith(
        2,
        'app_dataset_delete',
        expect.objectContaining({
          body: {
            id: 'runtime-process-id',
            table: 'processes',
            version: '01.01.000',
          },
        }),
      );
      expect(signOut).toHaveBeenCalledTimes(1);
      expect(result.passed).toBe(true);
      expect(result.cleanupAttempted).toBe(true);
      expect(result.queryResults).toEqual([
        expect.objectContaining({
          containsRuntimeId: true,
          count: 1,
          success: true,
        }),
        expect.objectContaining({
          count: 0,
          success: true,
        }),
      ]);

      const runtimeRecord = JSON.parse(await readFile(runtimeRecordFile, 'utf8'));
      expect(runtimeRecord).toMatchObject({
        cleanupAttempted: true,
        passed: true,
        runtimeId: 'runtime-process-id',
      });
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });

  it('marks expectation failures without deleting kept data', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'process-search-fail-'));
    const fixturePath = path.join(tempRoot, 'search.json');
    const expectedPath = path.join(tempRoot, 'expected.md');
    const usersFile = path.join(tempRoot, 'users.json');
    const supabase = {
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: {
            session: { access_token: 'token-1' },
            user: { id: 'user-1' },
          },
        }),
        signOut: jest.fn().mockResolvedValue({}),
      },
      functions: {
        invoke: jest.fn().mockResolvedValue({ data: {} }),
      },
      rpc: jest.fn().mockResolvedValue({ data: [] }),
    };

    try {
      await writeJson(fixturePath, {
        table: 'processes',
        queries: [
          {
            expectedContainsRuntimeId: true,
            expectedMinCount: 1,
            keyword: 'missing',
            label: 'missing runtime search',
          },
        ],
      });
      await writeText(expectedPath, '`queries.0.containsRuntimeId` equals `true`\n');
      await writeJson(usersFile, {
        user: {
          email: 'user@example.com',
          password: 'secret',
        },
      });

      const result = await runProcessFullTextSearchSmoke(
        {
          dataFile: fixturePath,
          expectedFile: expectedPath,
          generateId: true,
          help: false,
          keepData: true,
          role: 'user',
          runtimeRecordFile: path.join(tempRoot, 'runtime.json'),
          seedDataFile: path.resolve(
            process.cwd(),
            'tests/data-workflows/fixtures/data/processes/001_create.json',
          ),
          seedExpectedFile: path.resolve(
            process.cwd(),
            'tests/data-workflows/fixtures/result/processes/001_create.md',
          ),
          supabasePublishableKey: 'publishable-key',
          supabaseUrl: 'https://fotofiyqnuyvgtotswie.supabase.co',
          usersFile,
          verifyFrontend: false,
          writeRuntime: false,
        },
        {
          createClientImpl: jest.fn(() => supabase as any) as any,
          generateIdFn: () => 'runtime-process-id',
          searchPollOptions: {
            timeoutMs: 0,
          },
        },
      );

      expect(result.passed).toBe(false);
      expect(result.cleanupAttempted).toBe(false);
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
      expect(result.expectationResults[0]).toMatchObject({
        actual: false,
        expected: true,
        passed: false,
      });
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });
});
