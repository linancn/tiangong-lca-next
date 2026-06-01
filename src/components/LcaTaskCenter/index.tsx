import HeaderActionIcon from '@/components/HeaderActionIcon';
import type {
  LcaBackgroundTask,
  LcaTaskPhase,
  LcaTrackedTaskPhase,
} from '@/services/lca/taskCenter';
import {
  clearFinishedLcaTasks,
  listLcaTasks,
  removeLcaTask,
  subscribeLcaTaskCenterOpenRequests,
  subscribeLcaTasks,
} from '@/services/lca/taskCenter';
import type {
  ReviewSubmitBackgroundTask,
  ReviewSubmitTaskPhase,
} from '@/services/reviews/taskCenter';
import {
  cancelReviewSubmitTask,
  clearFinishedReviewSubmitTasks,
  listReviewSubmitTasks,
  refreshReviewSubmitTasks,
  removeReviewSubmitTask,
  retryReviewSubmitTask,
  subscribeReviewSubmitTasks,
} from '@/services/reviews/taskCenter';
import {
  TIDAS_PACKAGE_EXPORT_TOO_LARGE_ERROR,
  classifyTidasPackageExportError,
} from '@/services/tidasPackage/exportErrors';
import type {
  TidasPackageBackgroundTask,
  TidasPackageTaskPhase,
} from '@/services/tidasPackage/taskCenter';
import {
  clearFinishedTidasPackageTasks,
  downloadTidasPackageExportTask,
  listTidasPackageTasks,
  removeTidasPackageTask,
  subscribeTidasPackageTasks,
} from '@/services/tidasPackage/taskCenter';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Button,
  Empty,
  List,
  Modal,
  Popover,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
  theme,
} from 'antd';
import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useIntl } from 'umi';

type IntlShapeLike = ReturnType<typeof useIntl>;

type TaskCenterItem =
  | {
      kind: 'lca';
      task: LcaBackgroundTask;
    }
  | {
      kind: 'package';
      task: TidasPackageBackgroundTask;
    }
  | {
      kind: 'reviewSubmit';
      task: ReviewSubmitBackgroundTask;
    };

function useLcaTasks(): LcaBackgroundTask[] {
  return useSyncExternalStore(subscribeLcaTasks, listLcaTasks, listLcaTasks);
}

function useTidasPackageTasks(): TidasPackageBackgroundTask[] {
  return useSyncExternalStore(
    subscribeTidasPackageTasks,
    listTidasPackageTasks,
    listTidasPackageTasks,
  );
}

function useReviewSubmitTasks(): ReviewSubmitBackgroundTask[] {
  return useSyncExternalStore(
    subscribeReviewSubmitTasks,
    listReviewSubmitTasks,
    listReviewSubmitTasks,
  );
}

function statusTag(
  state: 'running' | 'completed' | 'failed',
  intl: IntlShapeLike,
): React.ReactNode {
  if (state === 'completed') {
    return (
      <Tag color='success' icon={<CheckCircleOutlined />}>
        {intl.formatMessage({
          id: 'pages.process.lca.taskCenter.status.completed',
          defaultMessage: 'Completed',
        })}
      </Tag>
    );
  }
  if (state === 'failed') {
    return (
      <Tag color='error' icon={<CloseCircleOutlined />}>
        {intl.formatMessage({
          id: 'pages.process.lca.taskCenter.status.failed',
          defaultMessage: 'Failed',
        })}
      </Tag>
    );
  }
  return (
    <Tag color='processing' icon={<ClockCircleOutlined />}>
      {intl.formatMessage({
        id: 'pages.process.lca.taskCenter.status.running',
        defaultMessage: 'Running',
      })}
    </Tag>
  );
}

function lcaPhaseLabel(phase: LcaTaskPhase, intl: IntlShapeLike): string {
  if (phase === 'submitting') {
    return intl.formatMessage({
      id: 'pages.process.lca.taskCenter.phase.submitting',
      defaultMessage: 'Submitting',
    });
  }
  if (phase === 'building_snapshot') {
    return intl.formatMessage({
      id: 'pages.process.lca.taskCenter.phase.buildingSnapshot',
      defaultMessage: 'Building snapshot',
    });
  }
  if (phase === 'solving') {
    return intl.formatMessage({
      id: 'pages.process.lca.taskCenter.phase.solving',
      defaultMessage: 'Solving',
    });
  }
  if (phase === 'completed') {
    return intl.formatMessage({
      id: 'pages.process.lca.taskCenter.phase.completed',
      defaultMessage: 'Completed',
    });
  }
  return intl.formatMessage({
    id: 'pages.process.lca.taskCenter.phase.failed',
    defaultMessage: 'Failed',
  });
}

function packagePhaseLabel(phase: TidasPackageTaskPhase, intl: IntlShapeLike): string {
  if (phase === 'submitting') {
    return intl.formatMessage({
      id: 'component.tidasPackage.taskCenter.phase.submitting',
      defaultMessage: 'Submitting',
    });
  }
  if (phase === 'queued') {
    return intl.formatMessage({
      id: 'component.tidasPackage.taskCenter.phase.queued',
      defaultMessage: 'Queued',
    });
  }
  if (phase === 'collect_refs') {
    return intl.formatMessage({
      id: 'component.tidasPackage.taskCenter.phase.collectRefs',
      defaultMessage: 'Collecting related data',
    });
  }
  if (phase === 'finalize_zip') {
    return intl.formatMessage({
      id: 'component.tidasPackage.taskCenter.phase.finalizeZip',
      defaultMessage: 'Building ZIP',
    });
  }
  if (phase === 'completed') {
    return intl.formatMessage({
      id: 'pages.process.lca.taskCenter.phase.completed',
      defaultMessage: 'Completed',
    });
  }
  return intl.formatMessage({
    id: 'pages.process.lca.taskCenter.phase.failed',
    defaultMessage: 'Failed',
  });
}

function reviewSubmitPhaseLabel(phase: ReviewSubmitTaskPhase, intl: IntlShapeLike): string {
  switch (phase) {
    case 'queued':
      return intl.formatMessage({
        id: 'pages.process.reviewSubmitTaskCenter.phase.queued',
        defaultMessage: 'Queued',
      });
    case 'running':
      return intl.formatMessage({
        id: 'pages.process.reviewSubmitTaskCenter.phase.running',
        defaultMessage: 'Gate running',
      });
    case 'waiting_gate':
      return intl.formatMessage({
        id: 'pages.process.reviewSubmitTaskCenter.phase.waitingGate',
        defaultMessage: 'Waiting for gate',
      });
    case 'submitting':
      return intl.formatMessage({
        id: 'pages.process.reviewSubmitTaskCenter.phase.submitting',
        defaultMessage: 'Submitting review',
      });
    case 'submitted':
      return intl.formatMessage({
        id: 'pages.process.reviewSubmitTaskCenter.phase.submitted',
        defaultMessage: 'Submitted',
      });
    case 'passed':
      return intl.formatMessage({
        id: 'pages.process.reviewSubmitTaskCenter.phase.passed',
        defaultMessage: 'Gate passed',
      });
    case 'blocked':
      return intl.formatMessage({
        id: 'pages.process.reviewSubmitTaskCenter.phase.blocked',
        defaultMessage: 'Blocked',
      });
    case 'stale':
      return intl.formatMessage({
        id: 'pages.process.reviewSubmitTaskCenter.phase.stale',
        defaultMessage: 'Stale',
      });
    case 'cancelled':
      return intl.formatMessage({
        id: 'pages.process.reviewSubmitTaskCenter.phase.cancelled',
        defaultMessage: 'Cancelled',
      });
    case 'error':
    default:
      return intl.formatMessage({
        id: 'pages.process.reviewSubmitTaskCenter.phase.error',
        defaultMessage: 'Error',
      });
  }
}

function phaseLabel(item: TaskCenterItem, intl: IntlShapeLike): string {
  if (item.kind === 'lca') {
    return lcaPhaseLabel(item.task.phase, intl);
  }
  if (item.kind === 'reviewSubmit') {
    return reviewSubmitPhaseLabel(item.task.phase, intl);
  }
  return packagePhaseLabel(item.task.phase, intl);
}

function shouldShowPhaseTag(item: TaskCenterItem): boolean {
  return item.kind === 'reviewSubmit' || item.task.state === 'running';
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }
  if (durationMs < 60 * 1000) {
    return `${(durationMs / 1000).toFixed(durationMs < 10_000 ? 2 : 1)} s`;
  }
  const totalSec = Math.round(durationMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
}

function formatDateTime(value: string): string {
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) {
    return value;
  }
  return new Date(ts).toLocaleString();
}

function getTaskElapsedMs(item: TaskCenterItem): number {
  const created = Date.parse(item.task.createdAt);
  if (!Number.isFinite(created)) {
    return 0;
  }
  const end = item.task.state === 'running' ? Date.now() : Date.parse(item.task.updatedAt);
  if (!Number.isFinite(end)) {
    return 0;
  }
  return Math.max(0, end - created);
}

type PhaseDurationSegment = {
  phase: LcaTrackedTaskPhase;
  label: string;
  color: string;
  durationMs: number;
};

const PHASE_ORDER: LcaTrackedTaskPhase[] = ['submitting', 'building_snapshot', 'solving'];
function timelineSegments(
  task: LcaBackgroundTask,
  intl: IntlShapeLike,
  phaseColors: Record<LcaTrackedTaskPhase, string>,
): PhaseDurationSegment[] {
  const phaseText: Record<LcaTrackedTaskPhase, string> = {
    submitting: intl.formatMessage({
      id: 'pages.process.lca.taskCenter.phase.submitting',
      defaultMessage: 'Submitting',
    }),
    building_snapshot: intl.formatMessage({
      id: 'pages.process.lca.taskCenter.phase.buildingShort',
      defaultMessage: 'Build',
    }),
    solving: intl.formatMessage({
      id: 'pages.process.lca.taskCenter.phase.solvingShort',
      defaultMessage: 'Solve',
    }),
  };
  const totals: Record<LcaTrackedTaskPhase, number> = {
    submitting: 0,
    building_snapshot: 0,
    solving: 0,
  };
  const nowMs = Date.now();
  for (const item of task.phaseTimeline) {
    const startMs = Date.parse(item.startedAt);
    const endMs = item.endedAt ? Date.parse(item.endedAt) : nowMs;
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      continue;
    }
    totals[item.phase] += Math.max(0, endMs - startMs);
  }
  const segments = PHASE_ORDER.map((phase) => ({
    phase,
    label: phaseText[phase],
    color: phaseColors[phase],
    durationMs: totals[phase],
  })).filter((item) => item.durationMs > 0);
  if (segments.length > 0) {
    return segments;
  }
  const fallbackPhase = task.phaseTimeline[0]?.phase ?? 'submitting';
  return [
    {
      phase: fallbackPhase,
      label: phaseText[fallbackPhase],
      color: phaseColors[fallbackPhase],
      durationMs: 0,
    },
  ];
}

const TaskTimeline: React.FC<{ task: LcaBackgroundTask; intl: IntlShapeLike }> = ({
  task,
  intl,
}) => {
  const { token } = theme.useToken();
  const phaseColors: Record<LcaTrackedTaskPhase, string> = {
    submitting: token.colorTextTertiary,
    building_snapshot: token.colorPrimary,
    solving: token.colorSuccess,
  };
  const segments = timelineSegments(task, intl, phaseColors);
  const totalMs = segments.reduce((sum, item) => sum + item.durationMs, 0);
  const fallbackWidth = 100 / segments.length;

  return (
    <Space direction='vertical' size={2} style={{ width: '100%' }}>
      <Space size={8} wrap>
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
          {intl.formatMessage({
            id: 'pages.process.lca.taskCenter.stageDuration',
            defaultMessage: 'Stage duration',
          })}
        </Typography.Text>
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
          {intl.formatMessage(
            {
              id: 'pages.process.lca.taskCenter.totalDuration',
              defaultMessage: 'Total {duration}',
            },
            { duration: formatDuration(totalMs) },
          )}
        </Typography.Text>
      </Space>
      <div
        style={{
          width: '100%',
          height: 8,
          display: 'flex',
          borderRadius: 99,
          overflow: 'hidden',
          background: token.colorFillSecondary,
        }}
      >
        {segments.map((segment) => {
          const width =
            totalMs > 0 ? `${(segment.durationMs / totalMs) * 100}%` : `${fallbackWidth}%`;
          return (
            <Tooltip
              key={segment.phase}
              title={`${segment.label}: ${formatDuration(segment.durationMs)}`}
              placement='top'
            >
              <div
                style={{
                  width,
                  minWidth: segments.length > 1 ? 8 : undefined,
                  background: segment.color,
                }}
              />
            </Tooltip>
          );
        })}
      </div>
    </Space>
  );
};

function lcaTaskSummary(task: LcaBackgroundTask, intl: IntlShapeLike): string {
  if (task.state === 'completed') {
    if (task.resultId && task.message.toLowerCase().includes('cache hit')) {
      return intl.formatMessage(
        {
          id: 'pages.process.lca.taskCenter.summary.cacheHit',
          defaultMessage: 'Cache hit (result {resultId})',
        },
        { resultId: task.resultId },
      );
    }
    if (task.resultId) {
      return intl.formatMessage(
        {
          id: 'pages.process.lca.taskCenter.summary.completed',
          defaultMessage: 'Completed (result {resultId})',
        },
        { resultId: task.resultId },
      );
    }
    return intl.formatMessage({
      id: 'pages.process.lca.taskCenter.summary.completedNoResult',
      defaultMessage: 'Completed',
    });
  }
  if (task.phase === 'building_snapshot') {
    return intl.formatMessage(
      {
        id: 'pages.process.lca.taskCenter.summary.buildingSnapshot',
        defaultMessage: 'Building snapshot ({jobId})',
      },
      { jobId: task.buildJobId ?? '-' },
    );
  }
  if (task.phase === 'solving') {
    return intl.formatMessage(
      {
        id: 'pages.process.lca.taskCenter.summary.solving',
        defaultMessage: 'Solving ({jobId})',
      },
      { jobId: task.solveJobId ?? '-' },
    );
  }
  if (task.phase === 'failed') {
    return intl.formatMessage({
      id: 'pages.process.lca.taskCenter.summary.failed',
      defaultMessage: 'Task failed',
    });
  }
  return intl.formatMessage({
    id: 'pages.process.lca.taskCenter.summary.submitting',
    defaultMessage: 'Submitting task',
  });
}

function packageTaskErrorText(
  task: TidasPackageBackgroundTask,
  intl: IntlShapeLike,
): string | undefined {
  if (!task.error) {
    return undefined;
  }

  if (classifyTidasPackageExportError(task.error) === TIDAS_PACKAGE_EXPORT_TOO_LARGE_ERROR) {
    return intl.formatMessage({
      id: 'component.tidasPackage.export.error.tooLarge',
      defaultMessage:
        'Export package is too large for the current storage upload limit. Try exporting a smaller scope, or ask an administrator to enable large-file upload support.',
    });
  }

  return task.error;
}

function packageTaskSummary(task: TidasPackageBackgroundTask, intl: IntlShapeLike): string {
  if (task.state === 'completed') {
    return intl.formatMessage(
      {
        id: 'component.tidasPackage.taskCenter.summary.completed',
        defaultMessage: 'Export package ready ({filename})',
      },
      { filename: task.filename ?? 'tidas-package.zip' },
    );
  }
  if (task.state === 'failed') {
    if (classifyTidasPackageExportError(task.error) === TIDAS_PACKAGE_EXPORT_TOO_LARGE_ERROR) {
      return intl.formatMessage({
        id: 'component.tidasPackage.taskCenter.summary.failedTooLarge',
        defaultMessage: 'Export package exceeded the storage upload limit',
      });
    }
    return intl.formatMessage({
      id: 'component.tidasPackage.taskCenter.summary.failed',
      defaultMessage: 'Export package failed',
    });
  }
  return task.message;
}

function reviewSubmitTaskSummary(task: ReviewSubmitBackgroundTask, intl: IntlShapeLike): string {
  if (task.phase === 'submitted') {
    return intl.formatMessage({
      id: 'pages.process.reviewSubmitTaskCenter.summary.submitted',
      defaultMessage: 'Review submission completed',
    });
  }
  if (task.phase === 'passed') {
    return intl.formatMessage({
      id: 'pages.process.reviewSubmitTaskCenter.summary.passed',
      defaultMessage: 'Numerical stability gate passed; final submission is being coordinated',
    });
  }
  if (task.phase === 'blocked') {
    return intl.formatMessage({
      id: 'pages.process.reviewSubmitTaskCenter.summary.blocked',
      defaultMessage: 'Numerical stability gate blocked this process revision',
    });
  }
  if (task.phase === 'stale') {
    return intl.formatMessage({
      id: 'pages.process.reviewSubmitTaskCenter.summary.stale',
      defaultMessage: 'Gate result is stale; save the latest data and submit again',
    });
  }
  if (task.phase === 'cancelled') {
    return intl.formatMessage({
      id: 'pages.process.reviewSubmitTaskCenter.summary.cancelled',
      defaultMessage: 'Review submission task was cancelled',
    });
  }
  if (task.phase === 'error') {
    return intl.formatMessage({
      id: 'pages.process.reviewSubmitTaskCenter.summary.error',
      defaultMessage: 'Review submission task failed',
    });
  }
  if (task.phase === 'submitting') {
    return intl.formatMessage({
      id: 'pages.process.reviewSubmitTaskCenter.summary.submitting',
      defaultMessage: 'Gate passed; submitting review',
    });
  }
  return intl.formatMessage({
    id: 'pages.process.reviewSubmitTaskCenter.summary.running',
    defaultMessage: 'Numerical stability gate is running before review submission',
  });
}

function taskSummary(item: TaskCenterItem, intl: IntlShapeLike): string {
  if (item.kind === 'lca') {
    return lcaTaskSummary(item.task, intl);
  }
  if (item.kind === 'reviewSubmit') {
    return reviewSubmitTaskSummary(item.task, intl);
  }
  return packageTaskSummary(item.task, intl);
}

const REVIEW_SUBMIT_REASON_GUIDANCE: Record<
  string,
  {
    titleId: string;
    defaultTitle: string;
    descriptionId: string;
    defaultDescription: string;
    actionId: string;
    defaultAction: string;
  }
> = {
  revision_report_stale: {
    titleId: 'pages.process.reviewSubmitGate.reason.revisionReportStale.title',
    defaultTitle: 'Gate result is stale',
    descriptionId: 'pages.process.reviewSubmitGate.reason.revisionReportStale.description',
    defaultDescription: 'The gate result no longer matches the saved process revision.',
    actionId: 'pages.process.reviewSubmitGate.reason.revisionReportStale.action',
    defaultAction: 'Save the latest data and run the submit-review gate again.',
  },
  invalid_scope_state: {
    titleId: 'pages.process.reviewSubmitGate.reason.invalidScopeState.title',
    defaultTitle: 'Dataset lifecycle state is not eligible',
    descriptionId: 'pages.process.reviewSubmitGate.reason.invalidScopeState.description',
    defaultDescription:
      'The process is in a lifecycle state that cannot enter the submit-review gate.',
    actionId: 'pages.process.reviewSubmitGate.reason.invalidScopeState.action',
    defaultAction:
      'Use a draft process or an already reviewed dependency; data under review cannot be submitted again.',
  },
  flow_lcia_semantic_mismatch: {
    titleId: 'pages.process.reviewSubmitGate.reason.flowLciaSemanticMismatch.title',
    defaultTitle: 'Input and output flow semantics conflict',
    descriptionId: 'pages.process.reviewSubmitGate.reason.flowLciaSemanticMismatch.description',
    defaultDescription:
      'The process appears to contain the same flow as both input and output, which can make the numerical system unstable.',
    actionId: 'pages.process.reviewSubmitGate.reason.flowLciaSemanticMismatch.action',
    defaultAction:
      'Check the exchange direction and quantitative reference; split or correct the duplicated flow before submitting again.',
  },
  sparse_matrix_zero_or_near_zero_diagonal: {
    titleId: 'pages.process.reviewSubmitGate.reason.sparseMatrixZeroDiagonal.title',
    defaultTitle: 'Matrix diagonal is zero or near zero',
    descriptionId: 'pages.process.reviewSubmitGate.reason.sparseMatrixZeroDiagonal.description',
    defaultDescription:
      'The generated matrix has a process diagonal that is zero or too close to zero for stable solving.',
    actionId: 'pages.process.reviewSubmitGate.reason.sparseMatrixZeroDiagonal.action',
    defaultAction:
      'Check self-loops, reference exchanges, and process structure before running the gate again.',
  },
  singular_risk_medium_or_high: {
    titleId: 'pages.process.reviewSubmitGate.reason.singularRiskMediumOrHigh.title',
    defaultTitle: 'Matrix singularity risk is too high',
    descriptionId: 'pages.process.reviewSubmitGate.reason.singularRiskMediumOrHigh.description',
    defaultDescription:
      'The snapshot has medium or high singularity risk, so solving may be unstable or fail.',
    actionId: 'pages.process.reviewSubmitGate.reason.singularRiskMediumOrHigh.action',
    defaultAction:
      'Resolve duplicate or linearly dependent process structure, then rebuild and rerun the gate.',
  },
  duplicate_sparse_columns: {
    titleId: 'pages.process.reviewSubmitGate.reason.duplicateSparseColumns.title',
    defaultTitle: 'Duplicate process columns were detected',
    descriptionId: 'pages.process.reviewSubmitGate.reason.duplicateSparseColumns.description',
    defaultDescription:
      'Two or more process columns are numerically identical, which can produce an underdetermined matrix.',
    actionId: 'pages.process.reviewSubmitGate.reason.duplicateSparseColumns.action',
    defaultAction:
      'Review repeated processes, duplicated exchanges, and reference products before submitting again.',
  },
  factorization_probe_failed: {
    titleId: 'pages.process.reviewSubmitGate.reason.factorizationProbeFailed.title',
    defaultTitle: 'Numerical probe failed',
    descriptionId: 'pages.process.reviewSubmitGate.reason.factorizationProbeFailed.description',
    defaultDescription: 'The fast factorization probe could not solve the target process reliably.',
    actionId: 'pages.process.reviewSubmitGate.reason.factorizationProbeFailed.action',
    defaultAction:
      'Check the exchange graph around the target process and rerun the gate after correcting unstable structure.',
  },
  target_process_not_covered_by_probe: {
    titleId: 'pages.process.reviewSubmitGate.reason.targetProcessNotCoveredByProbe.title',
    defaultTitle: 'Target process is outside the probe scope',
    descriptionId:
      'pages.process.reviewSubmitGate.reason.targetProcessNotCoveredByProbe.description',
    defaultDescription:
      'The fast gate could not include the submitted process in the numerical stability probe.',
    actionId: 'pages.process.reviewSubmitGate.reason.targetProcessNotCoveredByProbe.action',
    defaultAction:
      'Confirm the process has valid reference exchanges and connected product flows, then submit again.',
  },
  service_loop_detected: {
    titleId: 'pages.process.reviewSubmitGate.reason.serviceLoopDetected.title',
    defaultTitle: 'Service loop detected',
    descriptionId: 'pages.process.reviewSubmitGate.reason.serviceLoopDetected.description',
    defaultDescription:
      'The process graph contains a service loop that may make the matrix unstable.',
    actionId: 'pages.process.reviewSubmitGate.reason.serviceLoopDetected.action',
    defaultAction:
      'Inspect the referenced processes in the loop and remove unintended circular dependencies.',
  },
};

function formatReviewSubmitReason(
  reason: NonNullable<ReviewSubmitBackgroundTask['blockingReasons']>[number],
  index: number,
  intl: IntlShapeLike,
) {
  const rawCode = typeof reason?.code === 'string' ? reason.code.trim() : '';
  const code =
    rawCode ||
    intl.formatMessage(
      {
        id: 'pages.process.reviewSubmitGate.reasonFallbackCode',
        defaultMessage: 'Reason {index}',
      },
      { index: index + 1 },
    );
  const reasonMessage =
    typeof reason?.message === 'string' && reason.message.trim()
      ? reason.message.trim()
      : intl.formatMessage({
          id: 'pages.process.reviewSubmitGate.reasonFallbackMessage',
          defaultMessage: 'No detailed message returned.',
        });
  const guidance = rawCode ? REVIEW_SUBMIT_REASON_GUIDANCE[rawCode] : undefined;

  if (!guidance) {
    return {
      title: code,
      description: reasonMessage,
      action: undefined,
      diagnostic: `${code}: ${reasonMessage}`,
    };
  }

  return {
    title: intl.formatMessage({
      id: guidance.titleId,
      defaultMessage: guidance.defaultTitle,
    }),
    description: intl.formatMessage({
      id: guidance.descriptionId,
      defaultMessage: guidance.defaultDescription,
    }),
    action: intl.formatMessage({
      id: guidance.actionId,
      defaultMessage: guidance.defaultAction,
    }),
    diagnostic: `${code}: ${reasonMessage}`,
  };
}

function shortJson(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  try {
    const text = JSON.stringify(value);
    return text.length > 360 ? `${text.slice(0, 360)}...` : text;
  } catch (_error) {
    return String(value);
  }
}

function lcaDetailContent(task: LcaBackgroundTask, intl: IntlShapeLike): React.ReactNode {
  return (
    <Space direction='vertical' size={4} style={{ maxWidth: 340 }}>
      <Space size={6} wrap>
        <Tag color='blue'>
          {task.mode === 'all_unit'
            ? intl.formatMessage({
                id: 'pages.process.lca.mode.allUnit',
                defaultMessage: 'All Processes (1 Reference Unit)',
              })
            : intl.formatMessage({
                id: 'pages.process.lca.mode.single',
                defaultMessage: 'Single Demand',
              })}
        </Tag>
        <Tag>{task.scope}</Tag>
      </Space>
      {task.buildJobId && (
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
          {intl.formatMessage({
            id: 'pages.process.lca.taskCenter.detail.buildJobId',
            defaultMessage: 'build_job_id',
          })}
          : <Typography.Text copyable>{task.buildJobId}</Typography.Text>
        </Typography.Text>
      )}
      {task.solveJobId && (
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
          {intl.formatMessage({
            id: 'pages.process.lca.taskCenter.detail.solveJobId',
            defaultMessage: 'solve_job_id',
          })}
          : <Typography.Text copyable>{task.solveJobId}</Typography.Text>
        </Typography.Text>
      )}
      {task.snapshotId && (
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
          {intl.formatMessage({
            id: 'pages.process.lca.taskCenter.detail.snapshotId',
            defaultMessage: 'snapshot_id',
          })}
          : <Typography.Text copyable>{task.snapshotId}</Typography.Text>
        </Typography.Text>
      )}
      {task.resultId && (
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
          {intl.formatMessage({
            id: 'pages.process.lca.taskCenter.detail.resultId',
            defaultMessage: 'result_id',
          })}
          : <Typography.Text copyable>{task.resultId}</Typography.Text>
        </Typography.Text>
      )}
      <Typography.Text type='secondary' style={{ fontSize: 12 }}>
        {intl.formatMessage({
          id: 'pages.process.lca.taskCenter.detail.createdAt',
          defaultMessage: 'created_at',
        })}
        : {formatDateTime(task.createdAt)}
      </Typography.Text>
      <Typography.Text type='secondary' style={{ fontSize: 12 }}>
        {intl.formatMessage({
          id: 'pages.process.lca.taskCenter.detail.updatedAt',
          defaultMessage: 'updated_at',
        })}
        : {formatDateTime(task.updatedAt)}
      </Typography.Text>
    </Space>
  );
}

function packageDetailContent(
  task: TidasPackageBackgroundTask,
  intl: IntlShapeLike,
): React.ReactNode {
  const singleRoot = task.request?.roots?.length === 1 ? task.request.roots[0] : null;

  return (
    <Space direction='vertical' size={4} style={{ maxWidth: 360 }}>
      <Space size={6} wrap>
        <Tag color='geekblue'>
          {intl.formatMessage({
            id: 'component.tidasPackage.taskCenter.detail.exportKind',
            defaultMessage: 'TIDAS Export',
          })}
        </Tag>
        {task.scope && <Tag>{task.scope}</Tag>}
        {singleRoot && <Tag>{singleRoot.table}</Tag>}
      </Space>
      {task.jobId && (
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
          {intl.formatMessage({
            id: 'component.tidasPackage.taskCenter.detail.jobId',
            defaultMessage: 'job_id',
          })}
          : <Typography.Text copyable>{task.jobId}</Typography.Text>
        </Typography.Text>
      )}
      {typeof task.rootCount === 'number' && (
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
          {intl.formatMessage({
            id: 'component.tidasPackage.taskCenter.detail.rootCount',
            defaultMessage: 'root_count',
          })}
          : {task.rootCount}
        </Typography.Text>
      )}
      {task.filename && (
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
          {intl.formatMessage({
            id: 'component.tidasPackage.taskCenter.detail.filename',
            defaultMessage: 'filename',
          })}
          : {task.filename}
        </Typography.Text>
      )}
      {singleRoot && (
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
          {intl.formatMessage({
            id: 'component.tidasPackage.taskCenter.detail.rootRef',
            defaultMessage: 'root',
          })}
          : {singleRoot.id} @ {singleRoot.version}
        </Typography.Text>
      )}
      <Typography.Text type='secondary' style={{ fontSize: 12 }}>
        {intl.formatMessage({
          id: 'pages.process.lca.taskCenter.detail.createdAt',
          defaultMessage: 'created_at',
        })}
        : {formatDateTime(task.createdAt)}
      </Typography.Text>
      <Typography.Text type='secondary' style={{ fontSize: 12 }}>
        {intl.formatMessage({
          id: 'pages.process.lca.taskCenter.detail.updatedAt',
          defaultMessage: 'updated_at',
        })}
        : {formatDateTime(task.updatedAt)}
      </Typography.Text>
    </Space>
  );
}

function reviewSubmitBlockerContent(
  task: ReviewSubmitBackgroundTask,
  intl: IntlShapeLike,
): React.ReactNode {
  const reasons = task.blockingReasons ?? [];
  const blockerCodes = task.blockerCodes ?? [];
  if (reasons.length === 0 && blockerCodes.length === 0) {
    return null;
  }

  const normalizedReasons = reasons.length > 0 ? reasons : blockerCodes.map((code) => ({ code }));

  return (
    <Space direction='vertical' size={6} style={{ maxWidth: 420 }}>
      {normalizedReasons.map((reason, index) => {
        const formattedReason = formatReviewSubmitReason(reason, index, intl);
        const details = shortJson('details' in reason ? reason.details : undefined);
        return (
          <div key={`${reason.code ?? 'reason'}-${index}`}>
            <Typography.Text strong>{formattedReason.title}</Typography.Text>
            <br />
            <Typography.Text>{formattedReason.description}</Typography.Text>
            {formattedReason.action && (
              <>
                <br />
                <Typography.Text type='secondary'>{formattedReason.action}</Typography.Text>
              </>
            )}
            <br />
            <Typography.Text type='secondary' style={{ fontSize: 12 }}>
              {formattedReason.diagnostic}
            </Typography.Text>
            {details && (
              <>
                <br />
                <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                  {details}
                </Typography.Text>
              </>
            )}
          </div>
        );
      })}
    </Space>
  );
}

function reviewSubmitDetailContent(
  task: ReviewSubmitBackgroundTask,
  intl: IntlShapeLike,
): React.ReactNode {
  const revision = task.datasetRevision;
  return (
    <Space direction='vertical' size={4} style={{ maxWidth: 440 }}>
      <Space size={6} wrap>
        <Tag color='gold'>
          {intl.formatMessage({
            id: 'pages.process.reviewSubmitTaskCenter.kind',
            defaultMessage: 'Review Submit',
          })}
        </Tag>
        {revision?.table && <Tag>{revision.table}</Tag>}
      </Space>
      {task.reviewSubmitJobId && (
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
          {intl.formatMessage({
            id: 'pages.process.reviewSubmitTaskCenter.detail.reviewSubmitJobId',
            defaultMessage: 'review_submit_job_id',
          })}
          : <Typography.Text copyable>{task.reviewSubmitJobId}</Typography.Text>
        </Typography.Text>
      )}
      {task.gateWorkerJobId && (
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
          {intl.formatMessage({
            id: 'pages.process.reviewSubmitTaskCenter.detail.gateWorkerJobId',
            defaultMessage: 'gate_worker_job_id',
          })}
          : <Typography.Text copyable>{task.gateWorkerJobId}</Typography.Text>
        </Typography.Text>
      )}
      {task.gateRunId && (
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
          {intl.formatMessage({
            id: 'pages.process.reviewSubmitTaskCenter.detail.gateRunId',
            defaultMessage: 'gate_run_id',
          })}
          : <Typography.Text copyable>{task.gateRunId}</Typography.Text>
        </Typography.Text>
      )}
      {revision?.id && (
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
          {intl.formatMessage({
            id: 'pages.process.reviewSubmitTaskCenter.detail.dataset',
            defaultMessage: 'dataset',
          })}
          : {revision.id} @ {revision.version ?? '-'}
        </Typography.Text>
      )}
      {revision?.revisionChecksum && (
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
          {intl.formatMessage({
            id: 'pages.process.reviewSubmitTaskCenter.detail.revisionChecksum',
            defaultMessage: 'revision_checksum',
          })}
          : <Typography.Text copyable>{revision.revisionChecksum}</Typography.Text>
        </Typography.Text>
      )}
      <Typography.Text type='secondary' style={{ fontSize: 12 }}>
        {intl.formatMessage({
          id: 'pages.process.lca.taskCenter.detail.createdAt',
          defaultMessage: 'created_at',
        })}
        : {formatDateTime(task.createdAt)}
      </Typography.Text>
      <Typography.Text type='secondary' style={{ fontSize: 12 }}>
        {intl.formatMessage({
          id: 'pages.process.lca.taskCenter.detail.updatedAt',
          defaultMessage: 'updated_at',
        })}
        : {formatDateTime(task.updatedAt)}
      </Typography.Text>
      {reviewSubmitBlockerContent(task, intl)}
    </Space>
  );
}

function taskDetailContent(item: TaskCenterItem, intl: IntlShapeLike): React.ReactNode {
  if (item.kind === 'lca') {
    return lcaDetailContent(item.task, intl);
  }
  if (item.kind === 'reviewSubmit') {
    return reviewSubmitDetailContent(item.task, intl);
  }
  return packageDetailContent(item.task, intl);
}

const LcaTaskCenter: React.FC = () => {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const [downloadingTaskId, setDownloadingTaskId] = useState<string | null>(null);
  const [cancellingTaskId, setCancellingTaskId] = useState<string | null>(null);
  const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null);
  const [refreshingReviewTasks, setRefreshingReviewTasks] = useState(false);
  const lcaTasks = useLcaTasks();
  const packageTasks = useTidasPackageTasks();
  const reviewSubmitTasks = useReviewSubmitTasks();

  useEffect(() => {
    void refreshReviewSubmitTasks().catch(() => undefined);
    const interval = window.setInterval(() => {
      void refreshReviewSubmitTasks().catch(() => undefined);
    }, 5000);
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(
    () =>
      subscribeLcaTaskCenterOpenRequests(() => {
        setOpen(true);
        void refreshReviewSubmitTasks().catch(() => undefined);
      }),
    [],
  );

  const items = useMemo<TaskCenterItem[]>(
    () =>
      [
        ...lcaTasks.map((task) => ({ kind: 'lca' as const, task })),
        ...packageTasks.map((task) => ({ kind: 'package' as const, task })),
        ...reviewSubmitTasks.map((task) => ({ kind: 'reviewSubmit' as const, task })),
      ].sort((left, right) => Date.parse(right.task.updatedAt) - Date.parse(left.task.updatedAt)),
    [lcaTasks, packageTasks, reviewSubmitTasks],
  );

  const runningCount = useMemo(
    () => items.filter((item) => item.task.state === 'running').length,
    [items],
  );
  const attentionCount = useMemo(
    () =>
      items.filter((item) => item.kind === 'reviewSubmit' && item.task.state === 'failed').length,
    [items],
  );

  const handleDownload = async (task: TidasPackageBackgroundTask) => {
    try {
      setDownloadingTaskId(task.id);
      const result = await downloadTidasPackageExportTask(task.id);
      message.success(
        intl.formatMessage(
          {
            id: 'component.tidasPackage.taskCenter.download.success',
            defaultMessage: 'Downloaded {filename}',
          },
          { filename: result.filename },
        ),
      );
    } catch (error: any) {
      message.error(
        error?.message ||
          intl.formatMessage({
            id: 'component.tidasPackage.taskCenter.download.error',
            defaultMessage: 'Failed to download TIDAS package',
          }),
      );
    } finally {
      setDownloadingTaskId(null);
    }
  };

  const handleRefreshReviewSubmitTasks = async () => {
    try {
      setRefreshingReviewTasks(true);
      await refreshReviewSubmitTasks();
    } catch (error: any) {
      message.error(
        error?.message ||
          intl.formatMessage({
            id: 'pages.process.reviewSubmitTaskCenter.refresh.error',
            defaultMessage: 'Failed to refresh review-submit tasks',
          }),
      );
    } finally {
      setRefreshingReviewTasks(false);
    }
  };

  const handleCancelReviewSubmit = async (task: ReviewSubmitBackgroundTask) => {
    try {
      setCancellingTaskId(task.id);
      await cancelReviewSubmitTask(task.id);
      message.success(
        intl.formatMessage({
          id: 'pages.process.reviewSubmitTaskCenter.cancel.success',
          defaultMessage: 'Review-submit task cancelled',
        }),
      );
    } catch (error: any) {
      message.error(
        error?.message ||
          intl.formatMessage({
            id: 'pages.process.reviewSubmitTaskCenter.cancel.error',
            defaultMessage: 'Failed to cancel review-submit task',
          }),
      );
    } finally {
      setCancellingTaskId(null);
    }
  };

  const handleRetryReviewSubmit = async (task: ReviewSubmitBackgroundTask) => {
    try {
      setRetryingTaskId(task.id);
      await retryReviewSubmitTask(task.id);
      message.success(
        intl.formatMessage({
          id: 'pages.process.reviewSubmitTaskCenter.retry.success',
          defaultMessage: 'Review-submit task restarted',
        }),
      );
    } catch (error: any) {
      message.error(
        error?.message ||
          intl.formatMessage({
            id: 'pages.process.reviewSubmitTaskCenter.retry.error',
            defaultMessage: 'Failed to retry review-submit task',
          }),
      );
    } finally {
      setRetryingTaskId(null);
    }
  };

  return (
    <>
      <HeaderActionIcon
        title={intl.formatMessage({
          id: 'pages.process.lca.taskCenter.title',
          defaultMessage: 'Task Center',
        })}
        icon={<ClockCircleOutlined />}
        badgeCount={runningCount + attentionCount}
        badgeStyle={attentionCount > 0 ? { backgroundColor: '#cf1322' } : undefined}
        onClick={() => {
          setOpen(true);
          void refreshReviewSubmitTasks().catch(() => undefined);
        }}
      />
      <Modal
        title={intl.formatMessage({
          id: 'pages.process.lca.taskCenter.title',
          defaultMessage: 'Task Center',
        })}
        open={open}
        onCancel={() => {
          setOpen(false);
        }}
        footer={null}
        width={760}
      >
        <Space direction='vertical' size={12} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button
              size='small'
              icon={<ReloadOutlined />}
              loading={refreshingReviewTasks}
              onClick={() => {
                void handleRefreshReviewSubmitTasks();
              }}
            >
              {intl.formatMessage({
                id: 'pages.process.lca.taskCenter.refresh',
                defaultMessage: 'Refresh',
              })}
            </Button>
            <Button
              size='small'
              onClick={() => {
                clearFinishedLcaTasks();
                clearFinishedTidasPackageTasks();
                clearFinishedReviewSubmitTasks();
              }}
            >
              {intl.formatMessage({
                id: 'pages.process.lca.taskCenter.clearFinished',
                defaultMessage: 'Clear finished',
              })}
            </Button>
          </div>
          <div style={{ maxHeight: '68vh', overflowY: 'auto' }}>
            {items.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={intl.formatMessage({
                  id: 'pages.process.lca.taskCenter.empty',
                  defaultMessage: 'No tasks',
                })}
              />
            ) : (
              <List
                dataSource={items}
                itemLayout='vertical'
                renderItem={(item) => (
                  <List.Item
                    key={item.task.id}
                    actions={[
                      item.kind === 'package' && item.task.state === 'completed' ? (
                        <Button
                          key='download'
                          type='link'
                          size='small'
                          icon={<DownloadOutlined />}
                          loading={downloadingTaskId === item.task.id}
                          onClick={() => {
                            void handleDownload(item.task);
                          }}
                        >
                          {intl.formatMessage({
                            id: 'component.tidasPackage.taskCenter.download',
                            defaultMessage: 'Download',
                          })}
                        </Button>
                      ) : null,
                      item.kind === 'reviewSubmit' && item.task.state === 'running' ? (
                        <Button
                          key='cancel'
                          type='link'
                          size='small'
                          icon={<CloseCircleOutlined />}
                          loading={cancellingTaskId === item.task.id}
                          onClick={() => {
                            void handleCancelReviewSubmit(item.task);
                          }}
                        >
                          {intl.formatMessage({
                            id: 'pages.process.reviewSubmitTaskCenter.cancel',
                            defaultMessage: 'Cancel',
                          })}
                        </Button>
                      ) : null,
                      item.kind === 'reviewSubmit' && item.task.state === 'failed' ? (
                        <Button
                          key='retry'
                          type='link'
                          size='small'
                          icon={<ReloadOutlined />}
                          loading={retryingTaskId === item.task.id}
                          onClick={() => {
                            void handleRetryReviewSubmit(item.task);
                          }}
                        >
                          {intl.formatMessage({
                            id: 'pages.process.reviewSubmitTaskCenter.retry',
                            defaultMessage: 'Retry',
                          })}
                        </Button>
                      ) : null,
                      <Popover
                        key='details'
                        trigger='click'
                        placement='leftTop'
                        content={taskDetailContent(item, intl)}
                      >
                        <Button size='small' type='link' icon={<InfoCircleOutlined />}>
                          {intl.formatMessage({
                            id: 'pages.process.lca.taskCenter.details',
                            defaultMessage: 'Details',
                          })}
                        </Button>
                      </Popover>,
                      <Button
                        key='remove'
                        type='link'
                        size='small'
                        disabled={item.kind === 'reviewSubmit' && item.task.state === 'running'}
                        onClick={() => {
                          if (item.kind === 'lca') {
                            removeLcaTask(item.task.id);
                            return;
                          }
                          if (item.kind === 'reviewSubmit') {
                            removeReviewSubmitTask(item.task.id);
                            return;
                          }
                          removeTidasPackageTask(item.task.id);
                        }}
                      >
                        {intl.formatMessage({
                          id: 'pages.process.lca.taskCenter.remove',
                          defaultMessage: 'Remove',
                        })}
                      </Button>,
                    ].filter(Boolean)}
                  >
                    <Space direction='vertical' size={4} style={{ width: '100%' }}>
                      <Space size={8} wrap>
                        {'sequence' in item.task && (
                          <Typography.Text strong>#{item.task.sequence}</Typography.Text>
                        )}
                        <Tag
                          color={
                            item.kind === 'lca'
                              ? 'blue'
                              : item.kind === 'reviewSubmit'
                                ? 'gold'
                                : 'geekblue'
                          }
                        >
                          {item.kind === 'lca'
                            ? intl.formatMessage({
                                id: 'component.tidasPackage.taskCenter.kind.lca',
                                defaultMessage: 'LCA',
                              })
                            : item.kind === 'reviewSubmit'
                              ? intl.formatMessage({
                                  id: 'pages.process.reviewSubmitTaskCenter.kind',
                                  defaultMessage: 'Review Submit',
                                })
                              : intl.formatMessage({
                                  id: 'component.tidasPackage.taskCenter.kind.packageExport',
                                  defaultMessage: 'TIDAS Export',
                                })}
                        </Tag>
                        {statusTag(item.task.state, intl)}
                        {shouldShowPhaseTag(item) && (
                          <Tag color='default'>{phaseLabel(item, intl)}</Tag>
                        )}
                        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                          {intl.formatMessage({
                            id: 'pages.process.lca.taskCenter.updated',
                            defaultMessage: 'Updated',
                          })}{' '}
                          {formatDateTime(item.task.updatedAt)}
                        </Typography.Text>
                      </Space>
                      <Typography.Text>{taskSummary(item, intl)}</Typography.Text>
                      {item.kind === 'package' && packageTaskErrorText(item.task, intl) && (
                        <Typography.Text type='danger'>
                          {packageTaskErrorText(item.task, intl)}
                        </Typography.Text>
                      )}
                      {item.kind === 'lca' && item.task.error && (
                        <Typography.Text type='danger'>{item.task.error}</Typography.Text>
                      )}
                      {item.kind === 'reviewSubmit' && item.task.error && (
                        <Typography.Text type='danger'>{item.task.error}</Typography.Text>
                      )}
                      {item.kind === 'reviewSubmit' &&
                        item.task.state === 'failed' &&
                        reviewSubmitBlockerContent(item.task, intl)}
                      <Space size={12} wrap>
                        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                          {intl.formatMessage({
                            id: 'pages.process.lca.taskCenter.created',
                            defaultMessage: 'Created',
                          })}{' '}
                          {formatDateTime(item.task.createdAt)}
                        </Typography.Text>
                        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                          {intl.formatMessage({
                            id: 'pages.process.lca.taskCenter.elapsed',
                            defaultMessage: 'Elapsed',
                          })}{' '}
                          {formatDuration(getTaskElapsedMs(item))}
                        </Typography.Text>
                      </Space>
                      {item.kind === 'lca' && item.task.state === 'completed' && (
                        <TaskTimeline task={item.task} intl={intl} />
                      )}
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default LcaTaskCenter;
