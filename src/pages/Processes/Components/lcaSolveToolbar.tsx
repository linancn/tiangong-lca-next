import ToolBarButton from '@/components/ToolBarButton';
import type { LcaSolveRequest } from '@/services/lca';
import { submitLcaTask } from '@/services/lca/taskCenter';
import { listMyProcessesForLca } from '@/services/processes/api';
import { CalculatorOutlined } from '@ant-design/icons';
import { Form, Modal, Radio, Select, Typography, message } from 'antd';
import { useState } from 'react';
import { useIntl } from 'umi';

type SolveMode = 'single' | 'all_unit';

type FormValues = {
  demand_mode: SolveMode;
  process_ref?: string;
};

type MyProcessOption = {
  value: string;
  label: string;
};

const DEFAULT_VALUES: FormValues = {
  demand_mode: 'all_unit',
  process_ref: undefined,
};

const SCOPE = 'dev-v1';

function localeToLang(locale?: string): string {
  return (locale ?? '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

function toProcessRef(processId: string, processVersion: string): string {
  return `${processId}::${processVersion}`;
}

function parseProcessRef(value?: string): { process_id: string; process_version: string } | null {
  const text = (value ?? '').trim();
  const delimiterIndex = text.indexOf('::');
  if (delimiterIndex <= 0 || delimiterIndex >= text.length - 2) {
    return null;
  }
  const processId = text.slice(0, delimiterIndex).trim();
  const processVersion = text.slice(delimiterIndex + 2).trim();
  return {
    process_id: processId,
    process_version: processVersion,
  };
}

const LcaSolveToolbar = () => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myProcessesLoading, setMyProcessesLoading] = useState(false);
  const [myProcessOptions, setMyProcessOptions] = useState<MyProcessOption[]>([]);
  const [form] = Form.useForm<FormValues>();
  const intl = useIntl();
  const demandMode = Form.useWatch('demand_mode', form) ?? DEFAULT_VALUES.demand_mode;

  const loadMyProcesses = async () => {
    setMyProcessesLoading(true);
    try {
      const result = await listMyProcessesForLca(localeToLang(intl.locale), {
        limit: 300,
      });
      if (!result.success) {
        setMyProcessOptions([]);
        message.error(
          intl.formatMessage({
            id: 'pages.process.lca.message.loadMyProcessesFailed',
            defaultMessage: 'Failed to load your process list',
          }),
        );
        return;
      }
      setMyProcessOptions(
        result.data.map((item) => ({
          value: toProcessRef(item.id, item.version),
          label: `${item.name} (${item.version})`,
        })),
      );
    } catch (_error) {
      setMyProcessOptions([]);
      message.error(
        intl.formatMessage({
          id: 'pages.process.lca.message.loadMyProcessesFailed',
          defaultMessage: 'Failed to load your process list',
        }),
      );
    } finally {
      setMyProcessesLoading(false);
    }
  };

  const onOpen = () => {
    form.setFieldsValue(DEFAULT_VALUES);
    setOpen(true);
    void loadMyProcesses();
  };

  const onClose = () => {
    setOpen(false);
  };

  const onSubmit = async () => {
    const values = await form.validateFields();
    const mode = values.demand_mode;

    let request: LcaSolveRequest;
    if (mode === 'single') {
      const processRef = parseProcessRef(values.process_ref);

      if (!processRef) {
        message.error(
          intl.formatMessage({
            id: 'pages.process.lca.error.processRequired',
            defaultMessage: 'Please select a process',
          }),
        );
        return;
      }

      request = {
        scope: SCOPE,
        demand_mode: 'single',
        demand: {
          process_id: processRef.process_id,
          process_version: processRef.process_version,
          amount: 1,
        },
        solve: {
          return_x: false,
          return_g: true,
          return_h: true,
        },
        print_level: 0,
      };
    } else {
      request = {
        scope: SCOPE,
        demand_mode: 'all_unit',
        solve: {
          return_x: false,
          return_g: false,
          return_h: true,
        },
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
        okText={intl.formatMessage({
          id: 'pages.process.lca.modal.ok',
          defaultMessage: 'Calculate',
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
                  defaultMessage: 'All Processes (1 Reference Unit)',
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

          <div
            style={{
              marginBottom: 16,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #f0f0f0',
              backgroundColor: '#fafafa',
            }}
          >
            <Typography.Text strong style={{ display: 'block' }}>
              {intl.formatMessage({
                id: `pages.process.lca.modeHint.${demandMode}`,
                defaultMessage:
                  demandMode === 'single'
                    ? 'Single process calculation'
                    : 'All-process calculation',
              })}
            </Typography.Text>
            <Typography.Text type='secondary' style={{ display: 'block' }}>
              {intl.formatMessage({
                id: `pages.process.lca.modeHint.${demandMode}.detail`,
                defaultMessage:
                  demandMode === 'single'
                    ? 'Calculate one selected process with a fixed amount of 1.'
                    : 'Calculate all processes in the current snapshot using 1 reference unit demand.',
              })}
            </Typography.Text>
          </div>

          {demandMode === 'single' ? (
            <Form.Item
              name='process_ref'
              label={intl.formatMessage({
                id: 'pages.process.lca.field.processSelect',
                defaultMessage: 'Process (My Data)',
              })}
              rules={[
                {
                  required: true,
                  message: intl.formatMessage({
                    id: 'pages.process.lca.validation.processRequired',
                    defaultMessage: 'Please select a process',
                  }),
                },
              ]}
            >
              <Select
                showSearch
                optionFilterProp='label'
                options={myProcessOptions}
                loading={myProcessesLoading}
                disabled={submitting}
                placeholder={intl.formatMessage({
                  id: 'pages.process.lca.placeholder.processSelect',
                  defaultMessage: 'Select one of your processes',
                })}
                notFoundContent={intl.formatMessage({
                  id: 'pages.process.lca.empty.processSelect',
                  defaultMessage: 'No process available',
                })}
              />
            </Form.Item>
          ) : null}
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
