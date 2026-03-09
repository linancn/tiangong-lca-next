import ToolBarButton from '@/components/ToolBarButton';
import type { LcaSolveRequest } from '@/services/lca';
import { submitLcaTask } from '@/services/lca/taskCenter';
import { CalculatorOutlined } from '@ant-design/icons';
import { Form, InputNumber, Modal, Radio, Typography, message } from 'antd';
import { useState } from 'react';
import { useIntl } from 'umi';

type SolveMode = 'single' | 'all_unit';

type FormValues = {
  demand_mode: SolveMode;
  process_index?: number;
  amount?: number;
  unit_batch_size?: number;
};

const DEFAULT_VALUES: FormValues = {
  demand_mode: 'all_unit',
  process_index: 0,
  amount: 1,
  unit_batch_size: undefined,
};

const SCOPE = 'dev-v1';

const LcaSolveToolbar = () => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<FormValues>();
  const intl = useIntl();
  const demandMode = Form.useWatch('demand_mode', form) ?? DEFAULT_VALUES.demand_mode;

  const onOpen = () => {
    form.setFieldsValue(DEFAULT_VALUES);
    setOpen(true);
  };

  const onClose = () => {
    if (submitting) {
      return;
    }
    setOpen(false);
  };

  const onSubmit = async () => {
    const values = await form.validateFields();
    const mode = values.demand_mode ?? DEFAULT_VALUES.demand_mode;

    let request: LcaSolveRequest;
    if (mode === 'single') {
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

      request = {
        scope: SCOPE,
        demand_mode: 'single',
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
      };
    } else {
      const unitBatchSizeValue = values.unit_batch_size;
      if (
        unitBatchSizeValue !== undefined &&
        unitBatchSizeValue !== null &&
        (!Number.isInteger(unitBatchSizeValue) || unitBatchSizeValue < 1)
      ) {
        message.error(
          intl.formatMessage({
            id: 'pages.process.lca.error.unitBatchSizeMustBePositiveInteger',
            defaultMessage: 'unit_batch_size must be an integer > 0',
          }),
        );
        return;
      }

      request = {
        scope: SCOPE,
        demand_mode: 'all_unit',
        solve: {
          return_x: false,
          return_g: false,
          return_h: true,
        },
        unit_batch_size:
          unitBatchSizeValue === undefined || unitBatchSizeValue === null
            ? undefined
            : Number(unitBatchSizeValue),
        print_level: 0,
      };
    }

    try {
      setSubmitting(true);
      const task = submitLcaTask(request);
      message.success(
        intl.formatMessage(
          {
            id: 'pages.process.lca.message.taskSubmitted',
            defaultMessage:
              'Task submitted ({taskId}). Check progress in the top-right task center.',
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
            defaultMessage: 'Calculation request failed: {message}',
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
          defaultMessage: 'Calculate',
        })}
        onClick={onOpen}
        disabled={submitting}
      />
      <Modal
        title={intl.formatMessage({
          id: 'pages.process.lca.modal.title',
          defaultMessage: 'LCA Calculate',
        })}
        open={open}
        okText={
          submitting
            ? intl.formatMessage({
                id: 'pages.process.lca.modal.okRunning',
                defaultMessage: 'Submitting...',
              })
            : intl.formatMessage({ id: 'pages.process.lca.modal.ok', defaultMessage: 'Calculate' })
        }
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
        <Form<FormValues> form={form} layout='vertical' initialValues={DEFAULT_VALUES}>
          <Form.Item
            name='demand_mode'
            label={intl.formatMessage({
              id: 'pages.process.lca.field.solveMode',
              defaultMessage: 'Solve Mode',
            })}
            rules={[
              {
                required: true,
                message: intl.formatMessage({
                  id: 'pages.process.lca.validation.solveModeRequired',
                  defaultMessage: 'Please select solve mode',
                }),
              },
            ]}
          >
            <Radio.Group style={{ width: '100%' }}>
              <Radio.Button value='all_unit' style={{ width: '50%', textAlign: 'center' }}>
                {intl.formatMessage({
                  id: 'pages.process.lca.mode.allUnit',
                  defaultMessage: 'All Processes (unit)',
                })}
              </Radio.Button>
              <Radio.Button value='single' style={{ width: '50%', textAlign: 'center' }}>
                {intl.formatMessage({
                  id: 'pages.process.lca.mode.single',
                  defaultMessage: 'Single Demand',
                })}
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          {demandMode === 'single' ? (
            <>
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
            </>
          ) : (
            <Form.Item
              name='unit_batch_size'
              label={intl.formatMessage({
                id: 'pages.process.lca.field.unitBatchSize',
                defaultMessage: 'Unit Batch Size (optional)',
              })}
            >
              <InputNumber min={1} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          )}
        </Form>

        <Typography.Text type='secondary'>
          {intl.formatMessage({
            id: 'pages.process.lca.taskCenter.hint',
            defaultMessage: 'Progress will be shown in the top-right task center.',
          })}
        </Typography.Text>
      </Modal>
    </>
  );
};

export default LcaSolveToolbar;
