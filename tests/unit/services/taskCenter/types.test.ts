import {
  progressFractionFromWorkerValue,
  taskProgressPercent,
  taskRunStateFromRawStatus,
  type TaskSummaryV2,
} from '@/services/taskCenter/types';

describe('TaskSummaryV2 progress and state helpers', () => {
  it('converts canonical 0..1 fractions and keeps transitional 0..100 rows compatible', () => {
    expect(progressFractionFromWorkerValue(0.8)).toBe(0.8);
    expect(progressFractionFromWorkerValue('0.25')).toBe(0.25);
    expect(progressFractionFromWorkerValue(80)).toBe(0.8);
    expect(progressFractionFromWorkerValue(-1)).toBeUndefined();
    expect(progressFractionFromWorkerValue('invalid')).toBeUndefined();
  });

  it('does not collapse blocked, failed, cancelled, and worker-stale statuses', () => {
    expect(taskRunStateFromRawStatus('blocked')).toBe('blocked');
    expect(taskRunStateFromRawStatus('failed')).toBe('failed');
    expect(taskRunStateFromRawStatus('cancelled')).toBe('cancelled');
    expect(taskRunStateFromRawStatus('stale')).toBe('stale');
  });

  it('renders a fraction through the single shared percent converter', () => {
    const task = {
      runState: 'active',
      progressFraction: 0.8,
    } as TaskSummaryV2;
    expect(taskProgressPercent(task)).toBe(80);
  });
});
