import ToolBarButton from '@/components/ToolBarButton';
import type { LcaSolveRequest } from '@/services/lca';
import { submitLcaTask } from '@/services/lca/taskCenter';
import { CalculatorOutlined } from '@ant-design/icons';
import { Modal, Typography, message, theme } from 'antd';
import { useState } from 'react';
import { useIntl } from 'umi';

const SCOPE = 'dev-v1';

const LcaSolveToolbar = () => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const intl = useIntl();
  const { token } = theme.useToken();

  const onOpen = () => {
    setOpen(true);
  };

  const onClose = () => {
    setOpen(false);
  };

  const onSubmit = async () => {
    const request: LcaSolveRequest = {
      scope: SCOPE,
      demand_mode: 'all_unit',
      solve: {
        return_x: false,
        return_g: false,
        return_h: true,
      },
      print_level: 0,
    };

    try {
      setSubmitting(true);
      const task = submitLcaTask(request);
      message.success(
        intl.formatMessage(
          {
            id: 'pages.process.lca.message.taskSubmitted',
            defaultMessage:
              'Task submitted ({taskId}). Track progress in the task center at the top right.',
          },
          { taskId: task.id },
        ),
      );
      setOpen(false);
    } catch (error: any) {
      message.error(
        intl.formatMessage(
          {
            id: 'pages.process.lca.message.requestFailed',
            defaultMessage: 'Failed to submit the calculation request: {message}',
          },
          { message: error?.message ?? String(error) },
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ToolBarButton
        icon={<CalculatorOutlined />}
        tooltip={intl.formatMessage({
          id: 'pages.process.lca.toolbar.tooltip',
          defaultMessage: 'Run LCA',
        })}
        onClick={onOpen}
        disabled={submitting}
      />
      <Modal
        title={intl.formatMessage({
          id: 'pages.process.lca.modal.title',
          defaultMessage: 'Run LCA Calculation',
        })}
        open={open}
        okText={intl.formatMessage({
          id: 'pages.process.lca.modal.ok',
          defaultMessage: 'Run Calculation',
        })}
        cancelText={intl.formatMessage({
          id: 'pages.process.lca.modal.cancel',
          defaultMessage: 'Close',
        })}
        onCancel={onClose}
        onOk={onSubmit}
        confirmLoading={submitting}
        maskClosable={!submitting}
        keyboard={!submitting}
      >
        <div
          style={{
            marginBottom: 16,
            padding: '10px 12px',
            borderRadius: 8,
            border: `1px solid ${token.colorBorderSecondary}`,
            backgroundColor: token.colorFillAlter,
          }}
        >
          <Typography.Text strong style={{ display: 'block' }}>
            {intl.formatMessage({
              id: 'pages.process.lca.mode.allUnit',
              defaultMessage: 'All Processes (Reference Flow = 1)',
            })}
          </Typography.Text>
          <Typography.Text type='secondary' style={{ display: 'block' }}>
            {intl.formatMessage({
              id: 'pages.process.lca.modeHint.all_unit.detail',
              defaultMessage:
                'Calculate all processes in the current snapshot with a fixed demand of 1 reference flow.',
            })}
          </Typography.Text>
        </div>

        <Typography.Text type='secondary'>
          {intl.formatMessage({
            id: 'pages.process.lca.taskCenter.hint',
            defaultMessage: 'Progress is shown in the task center at the top right.',
          })}
        </Typography.Text>
      </Modal>
    </>
  );
};

export default LcaSolveToolbar;
