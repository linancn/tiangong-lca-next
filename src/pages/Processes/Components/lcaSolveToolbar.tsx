import ToolBarButton from '@/components/ToolBarButton';
import {
  getLcaResult,
  pollLcaJobUntilTerminal,
  submitLcaSolve,
  type LcaJobResponse,
} from '@/services/lca';
import { CalculatorOutlined } from '@ant-design/icons';
import { Form, InputNumber, Modal, Space, Typography, message } from 'antd';
import { useState } from 'react';
import { useIntl } from 'umi';

type FormValues = {
  process_index: number;
  amount: number;
};

const DEFAULT_VALUES: FormValues = {
  process_index: 0,
  amount: 1,
};
const DEFAULT_POLL_TIMEOUT_MS = 120000;

const LcaSolveToolbar = () => {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [form] = Form.useForm<FormValues>();
  const [lastJob, setLastJob] = useState<LcaJobResponse | null>(null);
  const [lastResultId, setLastResultId] = useState<string | null>(null);
  const intl = useIntl();

  const onOpen = () => {
    form.setFieldsValue(DEFAULT_VALUES);
    setOpen(true);
  };

  const onClose = () => {
    if (running) {
      return;
    }
    setOpen(false);
  };

  const onSubmit = async () => {
    const values = await form.validateFields();
    const processIndex = Number(values.process_index);
    const amount = Number(values.amount);

    if (!Number.isInteger(processIndex) || processIndex < 0) {
      message.error(
        intl.formatMessage({
          id: 'pages.process.lca.error.processIndexMustBeInteger',
          defaultMessage: 'process_index must be an integer >= 0',
        }),
      );
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      message.error(
        intl.formatMessage({
          id: 'pages.process.lca.error.amountMustBePositive',
          defaultMessage: 'amount must be > 0',
        }),
      );
      return;
    }

    setRunning(true);
    setLastJob(null);
    setLastResultId(null);
    try {
      const submit = await submitLcaSolve({
        scope: 'prod',
        demand: {
          process_index: processIndex,
          amount,
        },
        solve: {
          return_x: false,
          return_g: true,
          return_h: true,
        },
        print_level: 0,
      });

      if (submit.mode === 'cache_hit') {
        setLastResultId(submit.result_id);
        await getLcaResult(submit.result_id);
        message.success(
          intl.formatMessage(
            {
              id: 'pages.process.lca.message.cacheHit',
              defaultMessage: 'Cache hit, result_id: {resultId}',
            },
            { resultId: submit.result_id },
          ),
        );
        return;
      }

      message.loading({
        key: 'lca-running',
        content: intl.formatMessage(
          {
            id: 'pages.process.lca.message.jobSubmitted',
            defaultMessage: 'Job submitted, job_id: {jobId}',
          },
          { jobId: submit.job_id },
        ),
        duration: 0,
      });

      const job = await pollLcaJobUntilTerminal(submit.job_id, {
        timeoutMs: DEFAULT_POLL_TIMEOUT_MS,
      });
      setLastJob(job);

      if (job.status === 'failed' || job.status === 'stale') {
        message.error({
          key: 'lca-running',
          content: intl.formatMessage(
            {
              id: 'pages.process.lca.message.jobFailed',
              defaultMessage: 'Calculation failed, job_id: {jobId}',
            },
            { jobId: job.job_id },
          ),
        });
        return;
      }

      const resultId = job.result?.result_id ?? null;
      if (!resultId) {
        message.warning({
          key: 'lca-running',
          content: intl.formatMessage(
            {
              id: 'pages.process.lca.message.jobNoResult',
              defaultMessage: 'Job finished but result_id is missing, job_id: {jobId}',
            },
            { jobId: job.job_id },
          ),
        });
        return;
      }

      setLastResultId(resultId);
      await getLcaResult(resultId);
      message.success({
        key: 'lca-running',
        content: intl.formatMessage(
          {
            id: 'pages.process.lca.message.jobCompleted',
            defaultMessage: 'Calculation completed, result_id: {resultId}',
          },
          { resultId },
        ),
      });
    } catch (error: any) {
      message.error({
        key: 'lca-running',
        content: intl.formatMessage(
          {
            id: 'pages.process.lca.message.requestFailed',
            defaultMessage: 'Calculation request failed: {message}',
          },
          { message: error?.message ?? String(error) },
        ),
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <ToolBarButton
        icon={<CalculatorOutlined />}
        tooltip={intl.formatMessage({
          id: 'pages.process.lca.toolbar.tooltip',
          defaultMessage: 'Calculate',
        })}
        onClick={onOpen}
        disabled={running}
      />
      <Modal
        title={intl.formatMessage({
          id: 'pages.process.lca.modal.title',
          defaultMessage: 'LCA Calculate',
        })}
        open={open}
        okText={
          running
            ? intl.formatMessage({
                id: 'pages.process.lca.modal.okRunning',
                defaultMessage: 'Calculating...',
              })
            : intl.formatMessage({ id: 'pages.process.lca.modal.ok', defaultMessage: 'Calculate' })
        }
        cancelText={intl.formatMessage({
          id: 'pages.process.lca.modal.cancel',
          defaultMessage: 'Close',
        })}
        onCancel={onClose}
        onOk={onSubmit}
        confirmLoading={running}
        maskClosable={!running}
        keyboard={!running}
      >
        <Form<FormValues> form={form} layout='vertical' initialValues={DEFAULT_VALUES}>
          <Form.Item
            name='process_index'
            label={intl.formatMessage({
              id: 'pages.process.lca.field.processIndex',
              defaultMessage: 'Process Index',
            })}
            rules={[
              {
                required: true,
                message: intl.formatMessage({
                  id: 'pages.process.lca.validation.processIndexRequired',
                  defaultMessage: 'Please input process index',
                }),
              },
            ]}
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name='amount'
            label={intl.formatMessage({
              id: 'pages.process.lca.field.amount',
              defaultMessage: 'Amount',
            })}
            rules={[
              {
                required: true,
                message: intl.formatMessage({
                  id: 'pages.process.lca.validation.amountRequired',
                  defaultMessage: 'Please input amount',
                }),
              },
            ]}
          >
            <InputNumber min={0.0000001} precision={6} style={{ width: '100%' }} />
          </Form.Item>
        </Form>

        <Space direction='vertical' size={4}>
          {lastJob && (
            <Typography.Text type='secondary'>
              {intl.formatMessage(
                {
                  id: 'pages.process.lca.latestJob',
                  defaultMessage: 'latest job: {jobId} ({status})',
                },
                { jobId: lastJob.job_id, status: lastJob.status },
              )}
            </Typography.Text>
          )}
          {lastResultId && (
            <Typography.Text type='secondary'>
              {intl.formatMessage(
                {
                  id: 'pages.process.lca.latestResult',
                  defaultMessage: 'latest result: {resultId}',
                },
                { resultId: lastResultId },
              )}
            </Typography.Text>
          )}
        </Space>
      </Modal>
    </>
  );
};

export default LcaSolveToolbar;
