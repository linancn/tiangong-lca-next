import type { LcaBackgroundTask } from '@/services/lca/taskCenter';
import {
  clearFinishedLcaTasks,
  listLcaTasks,
  removeLcaTask,
  subscribeLcaTasks,
} from '@/services/lca/taskCenter';
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Badge, Button, Drawer, Empty, List, Space, Tag, Typography } from 'antd';
import React, { useMemo, useState, useSyncExternalStore } from 'react';
import { useIntl } from 'umi';

function useLcaTasks(): LcaBackgroundTask[] {
  return useSyncExternalStore(subscribeLcaTasks, listLcaTasks, listLcaTasks);
}

function statusTag(task: LcaBackgroundTask): React.ReactNode {
  if (task.state === 'completed') {
    return (
      <Tag color='success' icon={<CheckCircleOutlined />}>
        completed
      </Tag>
    );
  }
  if (task.state === 'failed') {
    return (
      <Tag color='error' icon={<CloseCircleOutlined />}>
        failed
      </Tag>
    );
  }
  return (
    <Tag color='processing' icon={<ClockCircleOutlined />}>
      running
    </Tag>
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
      <Badge count={runningCount} size='small' offset={[-2, 4]} showZero={false}>
        <ClockCircleOutlined
          style={{ fontSize: 16, opacity: 0.65, cursor: 'pointer' }}
          onClick={() => {
            setOpen(true);
          }}
        />
      </Badge>
      <Drawer
        title={intl.formatMessage({
          id: 'pages.process.lca.taskCenter.title',
          defaultMessage: 'LCA Tasks',
        })}
        placement='right'
        width={460}
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        extra={
          <Space>
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
          </Space>
        }
      >
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
                    {statusTag(task)}
                    <Tag>{task.mode}</Tag>
                    <Typography.Text type='secondary'>{task.scope}</Typography.Text>
                  </Space>
                  <Typography.Text>{task.message}</Typography.Text>
                  {task.error && <Typography.Text type='danger'>{task.error}</Typography.Text>}
                  <Space direction='vertical' size={0}>
                    {task.buildJobId && (
                      <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                        build_job_id: <Typography.Text copyable>{task.buildJobId}</Typography.Text>
                      </Typography.Text>
                    )}
                    {task.solveJobId && (
                      <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                        solve_job_id: <Typography.Text copyable>{task.solveJobId}</Typography.Text>
                      </Typography.Text>
                    )}
                    {task.snapshotId && (
                      <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                        snapshot_id: <Typography.Text copyable>{task.snapshotId}</Typography.Text>
                      </Typography.Text>
                    )}
                    {task.resultId && (
                      <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                        result_id: <Typography.Text copyable>{task.resultId}</Typography.Text>
                      </Typography.Text>
                    )}
                    <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                      updated_at: {task.updatedAt}
                    </Typography.Text>
                  </Space>
                </Space>
              </List.Item>
            )}
          />
        )}
      </Drawer>
    </>
  );
};

export default LcaTaskCenter;
