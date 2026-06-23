import AccessDenied from '@/components/AccessDenied';
import {
  createLciaResultBuildRequest,
  previewLciaResultPackage,
  publishLciaResultPackage,
  unpublishLciaResultPublication,
} from '@/services/dataProducts';
import { getSystemUserRoleApi } from '@/services/roles/api';
import { requestWorkerJobsApi, type WorkerJobResult } from '@/services/workerJobs/api';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { Alert, Button, Descriptions, Form, Input, Select, Space, Spin, Tabs } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';

type CommandStatus = {
  kind: 'success' | 'error';
  message: string;
};

function stringifyCommandData(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

const DataProcessing = () => {
  const [authResolved, setAuthResolved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<string | undefined>();
  const [activeTabKey, setActiveTabKey] = useState('builds');
  const [commandStatus, setCommandStatus] = useState<CommandStatus | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, any> | null>(null);
  const [buildForm] = Form.useForm();
  const [previewForm] = Form.useForm();
  const [publishForm] = Form.useForm();
  const [unpublishForm] = Form.useForm();
  const buildJobsActionRef = useRef<ActionType>();

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

  const workerJobColumns = useMemo<ProColumns<WorkerJobResult>[]>(
    () => [
      {
        title: 'Worker job',
        dataIndex: 'id',
      },
      {
        title: 'Build',
        dataIndex: 'subjectId',
      },
      {
        title: 'Status',
        dataIndex: 'status',
      },
      {
        title: 'Updated at',
        dataIndex: 'updatedAt',
      },
    ],
    [],
  );

  const isAuthorized = role === 'data_product_manager';

  const showResult = (result: { data: unknown; error: { message?: string } | null }) => {
    if (result.error) {
      setCommandStatus({
        kind: 'error',
        message: result.error.message ?? 'Command failed',
      });
      return;
    }

    setCommandStatus({
      kind: 'success',
      message: stringifyCommandData(result.data),
    });
  };

  const handleCreateBuild = async () => {
    const values = await buildForm.validateFields();
    const result = await createLciaResultBuildRequest({
      name: values.name,
      coverageMode: values.coverageMode || 'global_eligible',
      ...(values.defaultImpactCategory
        ? { defaultImpactCategory: values.defaultImpactCategory }
        : {}),
      lciaMethodSet: [],
    });

    showResult(result);
    if (!result.error) {
      void buildJobsActionRef.current?.reload();
    }
  };

  const handlePreviewPackage = async () => {
    const values = await previewForm.validateFields();
    const result = await previewLciaResultPackage(values.packageId);
    showResult(result);
    setPreviewData(result.error ? null : (result.data as Record<string, any>));
  };

  const handlePublishPackage = async () => {
    const values = await publishForm.validateFields();
    const result = await publishLciaResultPackage({
      packageId: values.packageId,
      displayDefaultImpactCategory: values.displayDefaultImpactCategory,
      ...(values.reason ? { reason: values.reason } : {}),
    });
    showResult(result);
  };

  const handleUnpublishPublication = async () => {
    const values = await unpublishForm.validateFields();
    const result = await unpublishLciaResultPublication({
      publicationId: values.publicationId,
      ...(values.reason ? { reason: values.reason } : {}),
    });
    showResult(result);
  };

  const renderCommandStatus = () =>
    commandStatus ? (
      <Alert
        message={commandStatus.message}
        type={commandStatus.kind === 'success' ? 'success' : 'error'}
      />
    ) : null;

  const renderBuildRequests = () => (
    <Space direction='vertical' size='middle' style={{ width: '100%' }}>
      <Form
        form={buildForm}
        initialValues={{
          coverageMode: 'global_eligible',
        }}
      >
        <Form.Item
          label='Package name'
          name='name'
          rules={[{ required: true, message: 'Package name is required' }]}
        >
          <Input aria-label='Package name' />
        </Form.Item>
        <Form.Item label='Coverage mode' name='coverageMode'>
          <Select
            aria-label='Coverage mode'
            options={[
              { label: 'Global eligible', value: 'global_eligible' },
              { label: 'Subset', value: 'subset' },
            ]}
          />
        </Form.Item>
        <Form.Item label='Default impact category' name='defaultImpactCategory'>
          <Input aria-label='Default impact category' />
        </Form.Item>
        <Button type='primary' onClick={handleCreateBuild}>
          Create build
        </Button>
      </Form>
      {renderCommandStatus()}
      <ProTable<WorkerJobResult>
        actionRef={buildJobsActionRef}
        columns={workerJobColumns}
        rowKey='id'
        search={false}
        options={false}
        pagination={{
          pageSize: 25,
        }}
        headerTitle='Package build jobs'
        request={async () => {
          const result = await requestWorkerJobsApi({
            action: 'list',
            subjectType: 'lcia_result_build',
            limit: 25,
          });
          return {
            data: result.data ?? [],
            success: !result.error,
            total: result.data?.length ?? 0,
          };
        }}
      />
    </Space>
  );

  const previewSummary = previewData?.summary ?? {};

  const renderPackagePreview = () => (
    <Space direction='vertical' size='middle' style={{ width: '100%' }}>
      <Form form={previewForm}>
        <Form.Item
          label='Preview package id'
          name='packageId'
          rules={[{ required: true, message: 'Package id is required' }]}
        >
          <Input aria-label='Preview package id' />
        </Form.Item>
        <Button type='primary' onClick={handlePreviewPackage}>
          Preview package
        </Button>
      </Form>
      {renderCommandStatus()}
      {previewData ? (
        <Descriptions bordered size='small' column={1}>
          <Descriptions.Item label='Package id'>
            {stringifyCommandData(previewSummary.packageId)}
          </Descriptions.Item>
          <Descriptions.Item label='Package version'>
            {stringifyCommandData(previewSummary.packageVersion)}
          </Descriptions.Item>
          <Descriptions.Item label='Status'>
            {stringifyCommandData(previewSummary.status)}
          </Descriptions.Item>
          <Descriptions.Item label='Included inputs'>
            {stringifyCommandData(previewSummary.includedInputCount)}
          </Descriptions.Item>
          <Descriptions.Item label='Eligible inputs'>
            {stringifyCommandData(previewSummary.eligibleInputCount)}
          </Descriptions.Item>
        </Descriptions>
      ) : null}
    </Space>
  );

  const renderPublication = () => (
    <Space direction='vertical' size='middle' style={{ width: '100%' }}>
      <Form form={publishForm}>
        <Form.Item
          label='Publish package id'
          name='packageId'
          rules={[{ required: true, message: 'Package id is required' }]}
        >
          <Input aria-label='Publish package id' />
        </Form.Item>
        <Form.Item
          label='Publish default impact category'
          name='displayDefaultImpactCategory'
          rules={[{ required: true, message: 'Default impact category is required' }]}
        >
          <Input aria-label='Publish default impact category' />
        </Form.Item>
        <Form.Item label='Publish reason' name='reason'>
          <Input aria-label='Publish reason' />
        </Form.Item>
        <Button type='primary' onClick={handlePublishPackage}>
          Publish package
        </Button>
      </Form>
      <Form form={unpublishForm}>
        <Form.Item
          label='Unpublish publication id'
          name='publicationId'
          rules={[{ required: true, message: 'Publication id is required' }]}
        >
          <Input aria-label='Unpublish publication id' />
        </Form.Item>
        <Form.Item label='Unpublish reason' name='reason'>
          <Input aria-label='Unpublish reason' />
        </Form.Item>
        <Button danger onClick={handleUnpublishPublication}>
          Unpublish publication
        </Button>
      </Form>
      {renderCommandStatus()}
    </Space>
  );

  return (
    <PageContainer title='Data Processing'>
      <Spin spinning={loading}>
        {!authResolved ? null : !isAuthorized ? (
          <AccessDenied />
        ) : (
          <Tabs
            activeKey={activeTabKey}
            onChange={setActiveTabKey}
            items={[
              {
                key: 'builds',
                label: 'Build Requests',
                children: renderBuildRequests(),
              },
              {
                key: 'preview',
                label: 'Package Preview',
                children: renderPackagePreview(),
              },
              {
                key: 'publication',
                label: 'Publication',
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
