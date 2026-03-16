import {
  getLcaJob,
  getLcaResult,
  isTerminalJobStatus,
  pollLcaJobUntilTerminal,
  queryLcaResults,
  submitLcaSolve,
} from '@/services/lca/api';
import { supabase } from '@/services/supabase';
import { FunctionRegion } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js', () => ({
  FunctionRegion: {
    UsEast1: 'us-east-1',
  },
}));

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
  },
}));

type LcaMockSupabase = {
  auth: {
    getSession: jest.Mock;
  };
  functions: {
    invoke: jest.Mock;
  };
};

const supabaseMock = supabase as unknown as LcaMockSupabase;
const createMockResponse = (body: string, status: number) => ({
  status,
  text: jest.fn().mockResolvedValue(body),
});

describe('LCA service API (src/services/lca/api.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabaseMock.auth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-123',
        },
      },
      error: null,
    });
  });

  describe('isTerminalJobStatus', () => {
    it('returns true for terminal statuses', () => {
      expect(isTerminalJobStatus('ready')).toBe(true);
      expect(isTerminalJobStatus('completed')).toBe(true);
      expect(isTerminalJobStatus('failed')).toBe(true);
      expect(isTerminalJobStatus('stale')).toBe(true);
    });

    it('returns false for non-terminal statuses', () => {
      expect(isTerminalJobStatus('queued')).toBe(false);
      expect(isTerminalJobStatus('running')).toBe(false);
    });
  });

  describe('submitLcaSolve', () => {
    it('invokes lca_solve with explicit idempotency key', async () => {
      supabaseMock.functions.invoke.mockResolvedValueOnce({
        data: {
          mode: 'queued',
          snapshot_id: 'snap-1',
          cache_key: 'key-1',
          job_id: 'job-1',
        },
        error: null,
      });

      await submitLcaSolve(
        {
          demand: {
            process_index: 0,
            amount: 1,
          },
        },
        { idempotencyKey: 'idem-1' },
      );

      expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('lca_solve', {
        method: 'POST',
        body: {
          demand: {
            process_index: 0,
            amount: 1,
          },
        },
        headers: {
          Authorization: 'Bearer token-123',
          'X-Idempotency-Key': 'idem-1',
        },
        region: FunctionRegion.UsEast1,
      });
    });

    it('uses crypto.randomUUID() fallback when idempotency key is absent', async () => {
      const fallbackUuid = '11111111-1111-4111-8111-111111111111';
      const uuidSpy = jest.spyOn(global.crypto, 'randomUUID').mockReturnValue(fallbackUuid);
      supabaseMock.functions.invoke.mockResolvedValueOnce({
        data: {
          mode: 'queued',
          snapshot_id: 'snap-2',
          cache_key: 'key-2',
          job_id: 'job-2',
        },
        error: null,
      });

      await submitLcaSolve({
        demand: {
          process_index: 1,
          amount: 2,
        },
      });

      expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('lca_solve', {
        method: 'POST',
        body: {
          demand: {
            process_index: 1,
            amount: 2,
          },
        },
        headers: {
          Authorization: 'Bearer token-123',
          'X-Idempotency-Key': fallbackUuid,
        },
        region: FunctionRegion.UsEast1,
      });

      uuidSpy.mockRestore();
    });

    it('converts snapshot_build_queued edge errors into snapshot_building responses', async () => {
      supabaseMock.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'invoke_failed',
          context: createMockResponse(
            JSON.stringify({
              error: 'snapshot_build_queued',
              detail: 'build queued',
              build_job_id: 'build-1',
              build_snapshot_id: 'snapshot-build',
            }),
            409,
          ),
        },
      });

      await expect(
        submitLcaSolve({
          demand_mode: 'all_unit',
          solve: { return_h: true },
        }),
      ).resolves.toEqual({
        mode: 'snapshot_building',
        snapshot_id: 'snapshot-build',
        build_job_id: 'build-1',
        build_snapshot_id: 'snapshot-build',
      });
    });

    it('rethrows snapshot_build_queued errors when build identifiers are missing', async () => {
      supabaseMock.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'invoke_failed',
          context: createMockResponse(
            JSON.stringify({
              error: 'snapshot_build_queued',
              detail: 'build queued',
            }),
            409,
          ),
        },
      });

      await expect(
        submitLcaSolve({
          demand: {
            process_index: 0,
            amount: 1,
          },
        }),
      ).rejects.toMatchObject({
        name: 'LcaFunctionInvokeError',
        message: 'snapshot_build_queued: build queued',
        status: 409,
        code: 'snapshot_build_queued',
      });
    });
  });

  describe('getLcaJob/getLcaResult', () => {
    it('trims id and queries lca_jobs', async () => {
      supabaseMock.functions.invoke.mockResolvedValueOnce({
        data: {
          job_id: 'job-1',
          snapshot_id: 'snap-1',
          job_type: 'solve_one',
          status: 'queued',
          timestamps: {
            created_at: '2026-03-01T00:00:00Z',
            started_at: null,
            finished_at: null,
            updated_at: '2026-03-01T00:00:01Z',
          },
          payload: {},
          diagnostics: {},
          result: null,
        },
        error: null,
      });

      await getLcaJob('  job-1  ');

      expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('lca_jobs', {
        method: 'POST',
        body: { job_id: 'job-1' },
        headers: {
          Authorization: 'Bearer token-123',
        },
        region: FunctionRegion.UsEast1,
      });
    });

    it('trims id and queries lca_results', async () => {
      supabaseMock.functions.invoke.mockResolvedValueOnce({
        data: {
          result_id: 'res-1',
          snapshot_id: 'snap-1',
          created_at: '2026-03-01T00:00:00Z',
          diagnostics: {},
          artifact: {
            artifact_url: 'https://example.com/a.h5',
            artifact_format: 'hdf5:v1',
            artifact_byte_size: 100,
            artifact_sha256: 'abc',
          },
          job: {
            job_id: 'job-1',
            job_type: 'solve_one',
            status: 'completed',
            timestamps: {
              created_at: '2026-03-01T00:00:00Z',
              started_at: '2026-03-01T00:00:01Z',
              finished_at: '2026-03-01T00:00:02Z',
              updated_at: '2026-03-01T00:00:02Z',
            },
          },
        },
        error: null,
      });

      await getLcaResult('  res-1 ');

      expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('lca_results', {
        method: 'POST',
        body: { result_id: 'res-1' },
        headers: {
          Authorization: 'Bearer token-123',
        },
        region: FunctionRegion.UsEast1,
      });
    });

    it('throws for missing ids', async () => {
      await expect(getLcaJob('   ')).rejects.toThrow('job_id_required');
      await expect(getLcaResult('')).rejects.toThrow('result_id_required');
      expect(supabaseMock.functions.invoke).not.toHaveBeenCalled();
    });
  });

  describe('invoke guardrails', () => {
    it('throws unauthorized when session token is missing', async () => {
      supabaseMock.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      await expect(getLcaJob('job-unauthorized')).rejects.toThrow('unauthorized');
      expect(supabaseMock.functions.invoke).not.toHaveBeenCalled();
    });

    it('throws edge function error message', async () => {
      supabaseMock.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'edge_error' },
      });

      await expect(getLcaJob('job-edge-error')).rejects.toThrow('edge_error');
    });

    it('uses raw response text when function error payload is not JSON', async () => {
      supabaseMock.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'invoke_failed',
          context: createMockResponse('plain-text-error', 500),
        },
      });

      await expect(getLcaResult('result-raw-error')).rejects.toThrow(
        'invoke_failed: plain-text-error',
      );
    });

    it('falls back to the base edge message when reading context text fails', async () => {
      supabaseMock.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'invoke_failed',
          context: {
            status: 502,
            text: jest.fn().mockRejectedValue(new Error('stream_closed')),
          },
        },
      });

      await expect(getLcaResult('result-broken-error')).rejects.toMatchObject({
        name: 'LcaFunctionInvokeError',
        message: 'invoke_failed',
        status: 502,
      });
    });
  });

  describe('queryLcaResults', () => {
    it('invokes lca_query_results with auth headers and payload', async () => {
      supabaseMock.functions.invoke.mockResolvedValueOnce({
        data: {
          snapshot_id: 'snapshot-1',
          result_id: 'result-1',
          source: 'all_unit',
          mode: 'process_all_impacts',
          data: { impacts: [] },
          meta: {
            cache_hit: true,
            computed_at: '2026-03-12T12:00:00.000Z',
          },
        },
        error: null,
      });

      await queryLcaResults({
        scope: 'prod',
        data_scope: 'current_user',
        mode: 'process_all_impacts',
        process_id: 'process-1',
        process_version: '1.0.0',
      });

      expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('lca_query_results', {
        method: 'POST',
        body: {
          scope: 'prod',
          data_scope: 'current_user',
          mode: 'process_all_impacts',
          process_id: 'process-1',
          process_version: '1.0.0',
        },
        headers: {
          Authorization: 'Bearer token-123',
        },
        region: FunctionRegion.UsEast1,
      });
    });

    it('supports hotspot ranking requests without explicit process_ids', async () => {
      supabaseMock.functions.invoke.mockResolvedValueOnce({
        data: {
          snapshot_id: 'snapshot-2',
          result_id: 'result-2',
          source: 'all_unit',
          mode: 'processes_one_impact',
          data: {
            kind: 'ranked_processes',
            impact_id: 'impact-1',
            values: [],
          },
          meta: {
            cache_hit: false,
            computed_at: '2026-03-12T12:30:00.000Z',
          },
        },
        error: null,
      });

      await queryLcaResults({
        scope: 'prod',
        data_scope: 'all_data',
        mode: 'processes_one_impact',
        impact_id: 'impact-1',
        top_n: 50,
        offset: 20,
        sort_by: 'absolute_value',
        sort_direction: 'desc',
        allow_fallback: false,
      });

      expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('lca_query_results', {
        method: 'POST',
        body: {
          scope: 'prod',
          data_scope: 'all_data',
          mode: 'processes_one_impact',
          impact_id: 'impact-1',
          top_n: 50,
          offset: 20,
          sort_by: 'absolute_value',
          sort_direction: 'desc',
          allow_fallback: false,
        },
        headers: {
          Authorization: 'Bearer token-123',
        },
        region: FunctionRegion.UsEast1,
      });
    });
  });

  describe('pollLcaJobUntilTerminal', () => {
    it('returns when terminal status is reached and emits onTick', async () => {
      const onTick = jest.fn();
      supabaseMock.functions.invoke
        .mockResolvedValueOnce({
          data: {
            job_id: 'job-1',
            snapshot_id: 'snap-1',
            job_type: 'solve_one',
            status: 'running',
            timestamps: {
              created_at: '2026-03-01T00:00:00Z',
              started_at: '2026-03-01T00:00:01Z',
              finished_at: null,
              updated_at: '2026-03-01T00:00:01Z',
            },
            payload: {},
            diagnostics: {},
            result: null,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            job_id: 'job-1',
            snapshot_id: 'snap-1',
            job_type: 'solve_one',
            status: 'completed',
            timestamps: {
              created_at: '2026-03-01T00:00:00Z',
              started_at: '2026-03-01T00:00:01Z',
              finished_at: '2026-03-01T00:00:03Z',
              updated_at: '2026-03-01T00:00:03Z',
            },
            payload: {},
            diagnostics: {},
            result: null,
          },
          error: null,
        });

      const result = await pollLcaJobUntilTerminal('job-1', {
        intervalsMs: [1],
        timeoutMs: 2000,
        onTick,
      });

      expect(result.status).toBe('completed');
      expect(onTick).toHaveBeenCalledTimes(2);
    });

    it('throws poll_timeout when terminal status is not reached before timeout', async () => {
      const nowSpy = jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(10_000);

      supabaseMock.functions.invoke
        .mockResolvedValueOnce({
          data: {
            job_id: 'job-timeout',
            snapshot_id: 'snap-1',
            job_type: 'solve_one',
            status: 'running',
            timestamps: {
              created_at: '2026-03-01T00:00:00Z',
              started_at: '2026-03-01T00:00:01Z',
              finished_at: null,
              updated_at: '2026-03-01T00:00:01Z',
            },
            payload: {},
            diagnostics: {},
            result: null,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            job_id: 'job-timeout',
            snapshot_id: 'snap-1',
            job_type: 'solve_one',
            status: 'running',
            timestamps: {
              created_at: '2026-03-01T00:00:00Z',
              started_at: '2026-03-01T00:00:01Z',
              finished_at: null,
              updated_at: '2026-03-01T00:00:02Z',
            },
            payload: {},
            diagnostics: {},
            result: null,
          },
          error: null,
        });

      await expect(
        pollLcaJobUntilTerminal('job-timeout', {
          intervalsMs: [1],
          timeoutMs: 2000,
        }),
      ).rejects.toThrow('poll_timeout');

      nowSpy.mockRestore();
    });

    it('throws poll_aborted when signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        pollLcaJobUntilTerminal('job-abort', {
          signal: controller.signal,
        }),
      ).rejects.toThrow('poll_aborted');

      expect(supabaseMock.functions.invoke).not.toHaveBeenCalled();
    });
  });
});
