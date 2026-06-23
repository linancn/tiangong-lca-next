import AccessDenied from '@/components/AccessDenied';
import {
  createLciaResultBuildRequest,
  previewLciaResultPackage,
  publishLciaResultPackage,
  unpublishLciaResultPublication,
} from '@/services/dataProducts';
import { getSystemUserRoleApi } from '@/services/roles/api';
import { requestWorkerJobsApi, type WorkerJobResult } from '@/services/workerJobs/api';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Progress,
  Select,
  Space,
  Spin,
  Tabs,
} from 'antd';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import styles from './index.less';

type CommandStatus = {
  kind: 'success' | 'error';
  message: ReactNode;
};

type CommandAction = 'createBuild' | 'previewPackage' | 'publishPackage' | 'unpublishPublication';

type CommandSummaryRow = {
  label: string;
  value: string;
};

type LciaMethodListPayload = {
  files?: Array<{
    id?: string;
    version?: string;
    description?: unknown;
    referenceQuantity?: {
      'common:shortDescription'?: unknown;
    };
  }>;
};

type ImpactCategoryOption = {
  label: string;
  value: string;
};

const submittedBuildPendingPhase = 'waiting_for_worker_processing';

function stringifyCommandData(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.trim() !== '');
}

export function createSubmittedBuildJob(data: unknown): WorkerJobResult | null {
  const record = isRecord(data) ? data : null;
  const workerJob = isRecord(record?.workerJob) ? record.workerJob : null;
  const buildId = firstString(
    record?.buildId,
    record?.build_id,
    record?.id,
    workerJob?.subjectId,
    workerJob?.subject_id,
  );
  const workerJobId = firstString(
    record?.workerJobId,
    record?.worker_job_id,
    workerJob?.id,
    workerJob?.workerJobId,
    workerJob?.worker_job_id,
  );
  const jobId = workerJobId ?? buildId;

  if (!jobId) {
    return null;
  }

  return {
    id: jobId,
    jobKind: firstString(workerJob?.jobKind, workerJob?.job_kind) ?? 'lcia_result.package_build',
    subjectType:
      firstString(workerJob?.subjectType, workerJob?.subject_type) ?? 'lcia_result_build',
    subjectId: buildId,
    status: (firstString(workerJob?.status) as WorkerJobResult['status'] | undefined) ?? 'queued',
    phase: firstString(workerJob?.phase) ?? submittedBuildPendingPhase,
    createdAt: firstString(workerJob?.createdAt, workerJob?.created_at),
    updatedAt: firstString(workerJob?.updatedAt, workerJob?.updated_at),
  };
}

export function mergeSubmittedBuildJobs(
  submittedJobs: WorkerJobResult[],
  serverJobs: WorkerJobResult[],
): WorkerJobResult[] {
  const rows = new Map<string, WorkerJobResult>();
  [...submittedJobs, ...serverJobs].forEach((job, index) => {
    rows.set(firstString(job.id, job.subjectId) ?? `job-${index}`, job);
  });
  return Array.from(rows.values());
}

export function resolveLocalizedText(value: unknown, locale: string): string {
  const targetLang = locale.toLowerCase().startsWith('zh') ? 'zh' : 'en';

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    const exact = value.find(
      (item) =>
        item &&
        typeof item === 'object' &&
        String((item as Record<string, unknown>)['@xml:lang'] ?? '').toLowerCase() === targetLang,
    );
    const english = value.find(
      (item) =>
        item &&
        typeof item === 'object' &&
        String((item as Record<string, unknown>)['@xml:lang'] ?? '').toLowerCase() === 'en',
    );
    const fallback = exact ?? english ?? value[0];
    return fallback && typeof fallback === 'object'
      ? String((fallback as Record<string, unknown>)['#text'] ?? '')
      : '';
  }

  if (value && typeof value === 'object') {
    return String((value as Record<string, unknown>)['#text'] ?? '');
  }

  return '';
}

export function buildImpactCategoryOptions(
  payload: LciaMethodListPayload,
  locale: string,
): ImpactCategoryOption[] {
  return (payload.files ?? [])
    .filter((file) => file.id)
    .map((file) => {
      const name = resolveLocalizedText(file.description, locale) || (file.id as string);
      const unit = resolveLocalizedText(
        file.referenceQuantity?.['common:shortDescription'],
        locale,
      );
      const suffix = [file.version, unit].filter(Boolean).join(' / ');
      return {
        value: file.id as string,
        label: suffix ? `${name} (${suffix})` : name,
      };
    });
}

const DataProcessing = () => {
  const intl = useIntl();
  const locale = intl.locale ?? 'en-US';
  const t = useCallback(
    (id: string, defaultMessage: string) => intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const [authResolved, setAuthResolved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<string | undefined>();
  const [activeTabKey, setActiveTabKey] = useState('builds');
  const [commandStatus, setCommandStatus] = useState<CommandStatus | null>(null);
  const [submittingAction, setSubmittingAction] = useState<CommandAction | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, any> | null>(null);
  const [impactCategoryOptions, setImpactCategoryOptions] = useState<ImpactCategoryOption[]>([]);
  const [buildJobs, setBuildJobs] = useState<WorkerJobResult[]>([]);
  const [submittedBuildJobs, setSubmittedBuildJobs] = useState<WorkerJobResult[]>([]);
  const [buildJobsLoading, setBuildJobsLoading] = useState(false);
  const [buildJobsError, setBuildJobsError] = useState<string | null>(null);
  const [buildForm] = Form.useForm();
  const [previewForm] = Form.useForm();
  const [publishForm] = Form.useForm();
  const [unpublishForm] = Form.useForm();

  useEffect(() => {
    let cancelled = false;

    const loadRole = async () => {
      setLoading(true);
      try {
        const userRole = await getSystemUserRoleApi();
        if (!cancelled) {
          setRole(userRole?.role);
        }
      } catch (error) {
        if (!cancelled) {
          setRole(undefined);
        }
      } finally {
        if (!cancelled) {
          setAuthResolved(true);
          setLoading(false);
        }
      }
    };

    void loadRole();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadImpactCategories = async () => {
      try {
        const response = await fetch('/lciamethods/list.json');
        if (!response.ok) {
          throw new Error('LCIA method list request failed');
        }
        const payload = (await response.json()) as LciaMethodListPayload;
        if (!cancelled) {
          setImpactCategoryOptions(buildImpactCategoryOptions(payload, locale));
        }
      } catch (_error) {
        if (!cancelled) {
          setImpactCategoryOptions([]);
        }
      }
    };

    void loadImpactCategories();

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const isAuthorized = role === 'data_product_manager';

  const loadBuildJobs = useCallback(async () => {
    setBuildJobsLoading(true);
    setBuildJobsError(null);
    const result = await requestWorkerJobsApi({
      action: 'list',
      subjectType: 'lcia_result_build',
      limit: 25,
    });
    setBuildJobs(result.data ?? []);
    setBuildJobsError(result.error?.message ?? null);
    setBuildJobsLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      void loadBuildJobs();
    }
  }, [isAuthorized, loadBuildJobs]);

  const visibleBuildJobs = useMemo(
    () => mergeSubmittedBuildJobs(submittedBuildJobs, buildJobs),
    [buildJobs, submittedBuildJobs],
  );

  const coverageModeOptions = useMemo(
    () => [
      {
        label: t('pages.dataProcessing.coverage.globalEligible', 'Global eligible'),
        value: 'global_eligible',
      },
      { label: t('pages.dataProcessing.coverage.subset', 'Subset'), value: 'subset' },
    ],
    [t],
  );

  const commandSuccessTitle = (action: CommandAction) => {
    const messages: Record<CommandAction, { defaultMessage: string; id: string }> = {
      createBuild: {
        id: 'pages.dataProcessing.command.createBuildSuccess',
        defaultMessage: 'Build request submitted',
      },
      previewPackage: {
        id: 'pages.dataProcessing.command.previewPackageSuccess',
        defaultMessage: 'Package preview loaded',
      },
      publishPackage: {
        id: 'pages.dataProcessing.command.publishPackageSuccess',
        defaultMessage: 'Package published',
      },
      unpublishPublication: {
        id: 'pages.dataProcessing.command.unpublishPublicationSuccess',
        defaultMessage: 'Publication unpublished',
      },
    };
    return t(messages[action].id, messages[action].defaultMessage);
  };

  const commandSummaryRows = (action: CommandAction, data: unknown): CommandSummaryRow[] => {
    const record = isRecord(data) ? data : null;
    const workerJob = isRecord(record?.workerJob) ? record.workerJob : null;

    const rows: CommandSummaryRow[] = [];
    const addRow = (label: string, value?: string) => {
      if (value) {
        rows.push({ label, value });
      }
    };

    if (action === 'createBuild') {
      addRow(
        t('pages.dataProcessing.command.buildId', 'Build ID'),
        firstString(record?.buildId, record?.build_id, record?.id),
      );
      addRow(
        t('pages.dataProcessing.command.workerJobId', 'Worker job'),
        firstString(
          record?.workerJobId,
          record?.worker_job_id,
          workerJob?.id,
          workerJob?.workerJobId,
          workerJob?.worker_job_id,
        ),
      );
      return rows;
    }

    if (action === 'previewPackage') {
      return rows;
    }

    if (action === 'publishPackage') {
      addRow(
        t('pages.dataProcessing.command.publicationId', 'Publication ID'),
        firstString(record?.publicationId, record?.publication_id, record?.id),
      );
      addRow(
        t('pages.dataProcessing.command.packageId', 'Package ID'),
        firstString(record?.packageId, record?.package_id),
      );
      addRow(t('pages.dataProcessing.command.status', 'Status'), firstString(record?.status));
      return rows;
    }

    addRow(
      t('pages.dataProcessing.command.publicationId', 'Publication ID'),
      firstString(record?.publicationId, record?.publication_id, record?.id),
    );
    addRow(
      t('pages.dataProcessing.command.status', 'Status'),
      firstString(record?.status, typeof data === 'string' ? data : undefined),
    );
    return rows;
  };

  const commandSuccessMessage = (action: CommandAction, data: unknown) => {
    const rows = commandSummaryRows(action, data);

    return (
      <div className={styles.commandMessage}>
        <strong>{commandSuccessTitle(action)}</strong>
        {rows.length > 0 ? (
          <div className={styles.commandMeta}>
            {rows.map((row) => (
              <span key={`${row.label}:${row.value}`} className={styles.commandMetaItem}>
                {row.label}: <code className={styles.commandMetaValue}>{row.value}</code>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  const showResult = (
    action: CommandAction,
    result: { data: unknown; error: { message?: string } | null },
  ) => {
    if (result.error) {
      setCommandStatus({
        kind: 'error',
        message: result.error.message ?? t('pages.dataProcessing.command.failed', 'Command failed'),
      });
      return;
    }

    setCommandStatus({
      kind: 'success',
      message: commandSuccessMessage(action, result.data),
    });
  };

  const runCommand = async (
    action: CommandAction,
    command: () => Promise<{ data: unknown; error: { message?: string } | null }>,
  ) => {
    setSubmittingAction(action);
    try {
      const result = await command();
      showResult(action, result);
      return result;
    } catch (error) {
      setCommandStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
      return null;
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleCreateBuild = async () => {
    const values = await buildForm.validateFields();
    const result = await runCommand('createBuild', () =>
      createLciaResultBuildRequest({
        name: values.name,
        coverageMode: values.coverageMode || 'global_eligible',
        ...(values.defaultImpactCategory
          ? { defaultImpactCategory: values.defaultImpactCategory }
          : {}),
        lciaMethodSet: [],
      }),
    );

    if (result && !result.error) {
      const submittedJob = createSubmittedBuildJob(result.data);
      if (submittedJob) {
        setSubmittedBuildJobs((currentJobs) =>
          mergeSubmittedBuildJobs([submittedJob], currentJobs),
        );
      }
      void loadBuildJobs();
    }
  };

  const handlePreviewPackage = async () => {
    const values = await previewForm.validateFields();
    const result = await runCommand('previewPackage', () =>
      previewLciaResultPackage(values.packageId),
    );
    setPreviewData(result?.error ? null : ((result?.data ?? null) as Record<string, any> | null));
  };

  const handlePublishPackage = async () => {
    const values = await publishForm.validateFields();
    await runCommand('publishPackage', () =>
      publishLciaResultPackage({
        packageId: values.packageId,
        displayDefaultImpactCategory: values.displayDefaultImpactCategory,
        ...(values.reason ? { reason: values.reason } : {}),
      }),
    );
  };

  const handleUnpublishPublication = async () => {
    const values = await unpublishForm.validateFields();
    await runCommand('unpublishPublication', () =>
      unpublishLciaResultPublication({
        publicationId: values.publicationId,
        ...(values.reason ? { reason: values.reason } : {}),
      }),
    );
  };

  const handleTabChange = (key: string) => {
    setActiveTabKey(key);
    setCommandStatus(null);
  };

  const renderCommandStatus = () =>
    commandStatus ? (
      <Alert
        message={commandStatus.message}
        type={commandStatus.kind === 'success' ? 'success' : 'error'}
      />
    ) : null;

  const renderJobProgress = (job: WorkerJobResult) => {
    const numericProgress = typeof job.progress === 'number' ? job.progress : Number(job.progress);
    if (!Number.isFinite(numericProgress)) {
      return null;
    }

    return (
      <Progress
        percent={Math.max(0, Math.min(100, Math.round(numericProgress)))}
        showInfo={false}
      />
    );
  };

  const renderJobPhase = (phase: WorkerJobResult['phase']) =>
    phase === submittedBuildPendingPhase
      ? t('pages.dataProcessing.jobs.waitingForWorker', 'Waiting for worker processing')
      : phase;

  const renderBuildJobs = () => (
    <Card
      title={t('pages.dataProcessing.jobs.title', 'Package build jobs')}
      extra={
        <Button onClick={loadBuildJobs} loading={buildJobsLoading}>
          {t('pages.dataProcessing.jobs.refresh', 'Refresh jobs')}
        </Button>
      }
    >
      <Spin spinning={buildJobsLoading}>
        <Space direction='vertical' size='small' className={styles.jobList}>
          <div className={styles.jobHint}>
            {t(
              'pages.dataProcessing.jobs.hint',
              'Builds run asynchronously. Refresh jobs to update progress, then preview the package after completion.',
            )}
          </div>
          {buildJobsError ? <Alert message={buildJobsError} type='error' /> : null}
          {visibleBuildJobs.length === 0 ? (
            <div className={styles.emptyJobs} data-testid='data-product-jobs-empty'>
              {t('pages.dataProcessing.jobs.empty', 'No package build jobs')}
            </div>
          ) : (
            visibleBuildJobs.map((job, index) => {
              const jobId = job.id ?? `${job.subjectId ?? 'job'}-${index}`;
              return (
                <section
                  key={jobId}
                  className={styles.jobItem}
                  data-testid={`data-product-job-${jobId}`}
                >
                  <div className={styles.jobHeader}>
                    <strong>{jobId}</strong>
                    <span className={styles.jobStatus}>{job.status}</span>
                  </div>
                  <div className={styles.jobMeta}>
                    <span>
                      {t('pages.dataProcessing.jobs.build', 'Build')}: {job.subjectId ?? '-'}
                    </span>
                    {job.phase ? <span>{renderJobPhase(job.phase)}</span> : null}
                    <span>
                      {t('pages.dataProcessing.jobs.updatedAt', 'Updated at')}:{' '}
                      {job.updatedAt ?? '-'}
                    </span>
                  </div>
                  {job.errorMessage ? <Alert message={job.errorMessage} type='error' /> : null}
                  {renderJobProgress(job)}
                </section>
              );
            })
          )}
        </Space>
      </Spin>
    </Card>
  );

  const renderImpactCategorySelect = (ariaLabel: string) => (
    <Select
      aria-label={ariaLabel}
      allowClear
      showSearch
      optionFilterProp='label'
      options={impactCategoryOptions}
      placeholder={t(
        'pages.dataProcessing.form.defaultImpactCategory.placeholder',
        'Select an impact category',
      )}
    />
  );

  const renderBuildRequests = () => (
    <Space direction='vertical' size='middle' className={styles.workbenchPanel}>
      <Card>
        <Form
          form={buildForm}
          initialValues={{
            coverageMode: 'global_eligible',
          }}
        >
          <Form.Item
            label={t('pages.dataProcessing.form.packageName', 'Package name')}
            name='name'
            rules={[
              {
                required: true,
                message: t(
                  'pages.dataProcessing.validation.packageNameRequired',
                  'Package name is required',
                ),
              },
            ]}
          >
            <Input aria-label={t('pages.dataProcessing.form.packageName', 'Package name')} />
          </Form.Item>
          <Form.Item
            label={t('pages.dataProcessing.form.coverageMode', 'Coverage mode')}
            name='coverageMode'
          >
            <Select
              aria-label={t('pages.dataProcessing.form.coverageMode', 'Coverage mode')}
              options={coverageModeOptions}
            />
          </Form.Item>
          <Form.Item
            label={t('pages.dataProcessing.form.defaultImpactCategory', 'Default impact category')}
            name='defaultImpactCategory'
          >
            {renderImpactCategorySelect(
              t('pages.dataProcessing.form.defaultImpactCategory', 'Default impact category'),
            )}
          </Form.Item>
          <Button
            type='primary'
            loading={submittingAction === 'createBuild'}
            onClick={handleCreateBuild}
          >
            {t('pages.dataProcessing.action.createBuild', 'Create build')}
          </Button>
        </Form>
      </Card>
      {renderCommandStatus()}
      {renderBuildJobs()}
    </Space>
  );

  const previewSummary = previewData?.summary ?? {};

  const renderPackagePreview = () => (
    <Space direction='vertical' size='middle' className={styles.workbenchPanel}>
      <Card>
        <Form form={previewForm}>
          <Form.Item
            label={t('pages.dataProcessing.form.previewPackageId', 'Preview package id')}
            name='packageId'
            rules={[
              {
                required: true,
                message: t(
                  'pages.dataProcessing.validation.packageIdRequired',
                  'Package id is required',
                ),
              },
            ]}
          >
            <Input
              aria-label={t('pages.dataProcessing.form.previewPackageId', 'Preview package id')}
            />
          </Form.Item>
          <Button
            type='primary'
            loading={submittingAction === 'previewPackage'}
            onClick={handlePreviewPackage}
          >
            {t('pages.dataProcessing.action.previewPackage', 'Preview package')}
          </Button>
        </Form>
      </Card>
      {renderCommandStatus()}
      {previewData ? (
        <Descriptions bordered size='small' column={1}>
          <Descriptions.Item label={t('pages.dataProcessing.preview.packageId', 'Package id')}>
            {stringifyCommandData(previewSummary.packageId)}
          </Descriptions.Item>
          <Descriptions.Item
            label={t('pages.dataProcessing.preview.packageVersion', 'Package version')}
          >
            {stringifyCommandData(previewSummary.packageVersion)}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.dataProcessing.preview.status', 'Status')}>
            {stringifyCommandData(previewSummary.status)}
          </Descriptions.Item>
          <Descriptions.Item
            label={t('pages.dataProcessing.preview.includedInputs', 'Included inputs')}
          >
            {stringifyCommandData(previewSummary.includedInputCount)}
          </Descriptions.Item>
          <Descriptions.Item
            label={t('pages.dataProcessing.preview.eligibleInputs', 'Eligible inputs')}
          >
            {stringifyCommandData(previewSummary.eligibleInputCount)}
          </Descriptions.Item>
        </Descriptions>
      ) : null}
    </Space>
  );

  const renderPublication = () => (
    <Space direction='vertical' size='middle' className={styles.workbenchPanel}>
      <Card>
        <Form form={publishForm}>
          <Form.Item
            label={t('pages.dataProcessing.form.publishPackageId', 'Publish package id')}
            name='packageId'
            rules={[
              {
                required: true,
                message: t(
                  'pages.dataProcessing.validation.packageIdRequired',
                  'Package id is required',
                ),
              },
            ]}
          >
            <Input
              aria-label={t('pages.dataProcessing.form.publishPackageId', 'Publish package id')}
            />
          </Form.Item>
          <Form.Item
            label={t(
              'pages.dataProcessing.form.publishDefaultImpactCategory',
              'Publish default impact category',
            )}
            name='displayDefaultImpactCategory'
            rules={[
              {
                required: true,
                message: t(
                  'pages.dataProcessing.validation.defaultImpactCategoryRequired',
                  'Default impact category is required',
                ),
              },
            ]}
          >
            {renderImpactCategorySelect(
              t(
                'pages.dataProcessing.form.publishDefaultImpactCategory',
                'Publish default impact category',
              ),
            )}
          </Form.Item>
          <Form.Item
            label={t('pages.dataProcessing.form.publishReason', 'Publish reason')}
            name='reason'
          >
            <Input aria-label={t('pages.dataProcessing.form.publishReason', 'Publish reason')} />
          </Form.Item>
          <Button
            type='primary'
            loading={submittingAction === 'publishPackage'}
            onClick={handlePublishPackage}
          >
            {t('pages.dataProcessing.action.publishPackage', 'Publish package')}
          </Button>
        </Form>
      </Card>
      <Card>
        <Form form={unpublishForm}>
          <Form.Item
            label={t(
              'pages.dataProcessing.form.unpublishPublicationId',
              'Unpublish publication id',
            )}
            name='publicationId'
            rules={[
              {
                required: true,
                message: t(
                  'pages.dataProcessing.validation.publicationIdRequired',
                  'Publication id is required',
                ),
              },
            ]}
          >
            <Input
              aria-label={t(
                'pages.dataProcessing.form.unpublishPublicationId',
                'Unpublish publication id',
              )}
            />
          </Form.Item>
          <Form.Item
            label={t('pages.dataProcessing.form.unpublishReason', 'Unpublish reason')}
            name='reason'
          >
            <Input
              aria-label={t('pages.dataProcessing.form.unpublishReason', 'Unpublish reason')}
            />
          </Form.Item>
          <Button
            danger
            loading={submittingAction === 'unpublishPublication'}
            onClick={handleUnpublishPublication}
          >
            {t('pages.dataProcessing.action.unpublishPublication', 'Unpublish publication')}
          </Button>
        </Form>
      </Card>
      {renderCommandStatus()}
    </Space>
  );

  return (
    <PageContainer title={t('pages.dataProcessing.title', 'Data Processing')}>
      <Spin spinning={loading}>
        {!authResolved ? null : !isAuthorized ? (
          <AccessDenied />
        ) : (
          <Tabs
            activeKey={activeTabKey}
            onChange={handleTabChange}
            items={[
              {
                key: 'builds',
                label: t('pages.dataProcessing.tabs.builds', 'Build Requests'),
                children: renderBuildRequests(),
              },
              {
                key: 'preview',
                label: t('pages.dataProcessing.tabs.preview', 'Package Preview'),
                children: renderPackagePreview(),
              },
              {
                key: 'publication',
                label: t('pages.dataProcessing.tabs.publication', 'Publication'),
                children: renderPublication(),
              },
            ]}
          />
        )}
      </Spin>
    </PageContainer>
  );
};

export default DataProcessing;
