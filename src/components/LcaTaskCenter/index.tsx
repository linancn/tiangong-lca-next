import type {
  LcaBackgroundTask,
  LcaTaskPhase,
  LcaTrackedTaskPhase,
} from '@/services/lca/taskCenter';
import {
  clearFinishedLcaTasks,
  listLcaTasks,
  removeLcaTask,
  subscribeLcaTasks,
} from '@/services/lca/taskCenter';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { Badge, Button, Empty, List, Modal, Popover, Space, Tag, Tooltip, Typography } from 'antd';
import React, { useMemo, useState, useSyncExternalStore } from 'react';
import { useIntl } from 'umi';

type IntlShapeLike = ReturnType<typeof useIntl>;

function useLcaTasks(): LcaBackgroundTask[] {
  return useSyncExternalStore(subscribeLcaTasks, listLcaTasks, listLcaTasks);
}

function statusTag(task: LcaBackgroundTask, intl: IntlShapeLike): React.ReactNode {
  if (task.state === 'completed') {
    return (
      <Tag color='success' icon={<CheckCircleOutlined />}>
        {intl.formatMessage({
          id: 'pages.process.lca.taskCenter.status.completed',
          defaultMessage: 'Completed',
        })}
      </Tag>
    );
  }
  if (task.state === 'failed') {
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

function phaseLabel(phase: LcaTaskPhase, intl: IntlShapeLike): string {
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

function shouldShowPhaseTag(task: LcaBackgroundTask): boolean {
  return task.state === 'running';
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

function getTaskElapsedMs(task: LcaBackgroundTask): number {
  const created = Date.parse(task.createdAt);
  if (!Number.isFinite(created)) {
    return 0;
  }
  const end = task.state === 'running' ? Date.now() : Date.parse(task.updatedAt);
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
const PHASE_COLOR: Record<LcaTrackedTaskPhase, string> = {
  submitting: '#8c8c8c',
  building_snapshot: '#1677ff',
  solving: '#52c41a',
};
function timelineSegments(task: LcaBackgroundTask, intl: IntlShapeLike): PhaseDurationSegment[] {
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
    color: PHASE_COLOR[phase],
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
      color: PHASE_COLOR[fallbackPhase],
      durationMs: 0,
    },
  ];
}

const TaskTimeline: React.FC<{ task: LcaBackgroundTask; intl: IntlShapeLike }> = ({
  task,
  intl,
}) => {
  const segments = timelineSegments(task, intl);
  if (segments.length === 0) {
    return null;
  }
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
          background: '#f0f0f0',
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

function taskSummary(task: LcaBackgroundTask, intl: IntlShapeLike): string {
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

function taskDetailContent(task: LcaBackgroundTask, intl: IntlShapeLike): React.ReactNode {
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

const LcaTaskCenter: React.FC = () => {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const tasks = useLcaTasks();
  const runningCount = useMemo(
    () => tasks.filter((task) => task.state === 'running').length,
    [tasks],
  );

  return (
    <>
      <Badge count={runningCount} size='small' offset={[-5, 6]} showZero={false}>
        <ClockCircleOutlined
          style={{ fontSize: 16, opacity: 0.5, cursor: 'pointer' }}
          onClick={() => {
            setOpen(true);
          }}
        />
      </Badge>
      <Modal
        title={intl.formatMessage({
          id: 'pages.process.lca.taskCenter.title',
          defaultMessage: 'LCA Tasks',
        })}
        open={open}
        onCancel={() => {
          setOpen(false);
        }}
        footer={null}
        width={760}
      >
        <Space direction='vertical' size={12} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              size='small'
              onClick={() => {
                clearFinishedLcaTasks();
              }}
            >
              {intl.formatMessage({
                id: 'pages.process.lca.taskCenter.clearFinished',
                defaultMessage: 'Clear finished',
              })}
            </Button>
          </div>
          <div style={{ maxHeight: '68vh', overflowY: 'auto' }}>
            {tasks.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={intl.formatMessage({
                  id: 'pages.process.lca.taskCenter.empty',
                  defaultMessage: 'No tasks',
                })}
              />
            ) : (
              <List
                dataSource={tasks}
                itemLayout='vertical'
                renderItem={(task) => (
                  <List.Item
                    key={task.id}
                    actions={[
                      <Popover
                        key='details'
                        trigger='click'
                        placement='leftTop'
                        content={taskDetailContent(task, intl)}
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
                        onClick={() => {
                          removeLcaTask(task.id);
                        }}
                      >
                        {intl.formatMessage({
                          id: 'pages.process.lca.taskCenter.remove',
                          defaultMessage: 'Remove',
                        })}
                      </Button>,
                    ]}
                  >
                    <Space direction='vertical' size={4} style={{ width: '100%' }}>
                      <Space size={8} wrap>
                        <Typography.Text strong>#{task.sequence}</Typography.Text>
                        {statusTag(task, intl)}
                        {shouldShowPhaseTag(task) && (
                          <Tag color='default'>{phaseLabel(task.phase, intl)}</Tag>
                        )}
                        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                          {intl.formatMessage({
                            id: 'pages.process.lca.taskCenter.updated',
                            defaultMessage: 'Updated',
                          })}{' '}
                          {formatDateTime(task.updatedAt)}
                        </Typography.Text>
                      </Space>
                      <Typography.Text>{taskSummary(task, intl)}</Typography.Text>
                      {task.error && <Typography.Text type='danger'>{task.error}</Typography.Text>}
                      <Space size={12} wrap>
                        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                          {intl.formatMessage({
                            id: 'pages.process.lca.taskCenter.created',
                            defaultMessage: 'Created',
                          })}{' '}
                          {formatDateTime(task.createdAt)}
                        </Typography.Text>
                        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                          {intl.formatMessage({
                            id: 'pages.process.lca.taskCenter.elapsed',
                            defaultMessage: 'Elapsed',
                          })}{' '}
                          {formatDuration(getTaskElapsedMs(task))}
                        </Typography.Text>
                      </Space>
                      {task.state === 'completed' && <TaskTimeline task={task} intl={intl} />}
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
