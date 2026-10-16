import { ResponsiveDataListViewport } from '@/components/ResponsiveDataList';
import type { LciaResultPublication, LciaResultSetV1 } from '@/services/dataProducts';
import type { TaskSummaryV2 } from '@/services/taskCenter/types';
import { PlusOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Alert, Button, Card, Input, Select, Space, Table, Typography } from 'antd';
import {
  deriveResultSetWorkflowSummary,
  resultSetActionMessage,
  resultSetStatusMessage,
} from './resultSetWorkflow';
import styles from './index.less';

type Props = {
  resultSets: LciaResultSetV1[];
  tasks: TaskSummaryV2[];
  publications: LciaResultPublication[];
  loading: boolean;
  error: string | null;
  search: string;
  onQueryChange: (search: string) => void;
  onOpen: (resultSet: LciaResultSetV1) => void;
  onCreate: () => void;
  onRefresh: () => void;
};

export default function ResultSetDirectory(props: Props) {
  const intl = useIntl();
  const t = (id: string, defaultMessage: string) => intl.formatMessage({ id, defaultMessage });
  const params = new URLSearchParams(props.search);
  const query = params.get('rsQuery') ?? '';
  const filter = params.get('rsStatus') ?? 'all';
  const oldestFirst = params.get('rsOrder') === 'oldest';
  const pageSize = [20, 50, 100].includes(Number(params.get('rsSize')))
    ? Number(params.get('rsSize'))
    : 50;
  const update = (values: Record<string, string>) => {
    const next = new URLSearchParams(props.search);
    Object.entries(values).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    props.onQueryChange(`?${next}`);
  };
  const rows = props.resultSets
    .map((resultSet) => ({
      ...resultSet,
      summary: deriveResultSetWorkflowSummary(
        resultSet.resultSetId,
        props.tasks,
        props.publications,
      ),
    }))
    .filter(
      (row) =>
        `${row.name} ${row.resultSetId}`
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase()) &&
        (filter === 'all' || row.summary.buildStatus === filter),
    )
    .sort(
      (a, b) =>
        (oldestFirst ? 1 : -1) *
        (a.createdAt.localeCompare(b.createdAt) || a.resultSetId.localeCompare(b.resultSetId)),
    );
  const requestedPage = Number(params.get('rsPage'));
  const page = Math.min(
    Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    Math.max(1, Math.ceil(rows.length / pageSize)),
  );
  return (
    <Card
      className={styles.resultSetWorkspace}
      title={t('pages.dataProcessing.resultSets.title', 'Result sets')}
    >
      <Space orientation='vertical' size='middle' className={styles.resultSetWorkspaceContent}>
        <div className={styles.directoryToolbar}>
          <Input.Search
            aria-label={t('pages.dataProcessing.workspace.search', 'Search loaded names or IDs')}
            placeholder={t('pages.dataProcessing.workspace.search', 'Search loaded names or IDs')}
            value={query}
            allowClear
            onChange={(event) => update({ rsQuery: event.target.value, rsPage: '1' })}
          />
          <Select
            aria-label={t('pages.dataProcessing.resultSets.status.build', 'Calculation')}
            value={filter}
            onChange={(value) => update({ rsStatus: value, rsPage: '1' })}
            options={[
              {
                value: 'all',
                label: t('pages.dataProcessing.workspace.allStatuses', 'All calculation states'),
              },
              ...['ready', 'running', 'failed', 'unknown'].map((value) => ({
                value,
                label: resultSetStatusMessage(t, 'build', value),
              })),
            ]}
          />
          <Select
            aria-label={t('pages.dataProcessing.workspace.sort', 'Creation order')}
            value={oldestFirst ? 'oldest' : 'newest'}
            onChange={(value) => update({ rsOrder: value, rsPage: '1' })}
            options={[
              {
                value: 'newest',
                label: t('pages.dataProcessing.workspace.newest', 'Newest first'),
              },
              {
                value: 'oldest',
                label: t('pages.dataProcessing.workspace.oldest', 'Oldest first'),
              },
            ]}
          />
          <Button onClick={props.onRefresh} loading={props.loading}>
            {t('pages.dataProcessing.resultSets.refresh', 'Refresh')}
          </Button>
          <Button
            type='primary'
            aria-label={t('pages.dataProcessing.resultSets.create', 'Create result set')}
            icon={<PlusOutlined />}
            onClick={props.onCreate}
          >
            {t('pages.dataProcessing.resultSets.create', 'Create result set')}
          </Button>
        </div>
        <Typography.Text type='secondary'>
          {intl.formatMessage(
            {
              id: 'pages.dataProcessing.workspace.loaded',
              defaultMessage:
                '{count} records loaded (up to 200). Search and filters apply only to these records.',
            },
            { count: props.resultSets.length },
          )}
        </Typography.Text>
        {props.error ? <Alert type='error' title={props.error} /> : null}
        <ResponsiveDataListViewport>
          {({ scroll }) => (
            <Table
              rowKey='resultSetId'
              loading={props.loading}
              dataSource={rows}
              scroll={{ ...scroll, x: 900 }}
              onRow={(row) =>
                ({
                  'data-testid': `data-processing-result-set-${row.resultSetId}`,
                }) as React.HTMLAttributes<HTMLTableRowElement>
              }
              pagination={{
                current: page,
                pageSize,
                total: rows.length,
                pageSizeOptions: [20, 50, 100],
                showSizeChanger: true,
                onChange: (nextPage, size) =>
                  update({
                    rsPage: String(size !== pageSize ? 1 : nextPage),
                    rsSize: String(size),
                  }),
              }}
              columns={[
                {
                  title: t('pages.dataProcessing.form.packageName', 'Result set name'),
                  dataIndex: 'name',
                  width: 280,
                  render: (name, row) => (
                    <Button
                      type='link'
                      className={styles.resultSetName}
                      onClick={() => props.onOpen(row)}
                    >
                      {name}
                    </Button>
                  ),
                },
                ...(['closure', 'build', 'publication'] as const).map((kind) => ({
                  title: {
                    closure: t('pages.dataProcessing.resultSets.status.closure', 'Completeness'),
                    build: t('pages.dataProcessing.resultSets.status.build', 'Calculation'),
                    publication: t('pages.dataProcessing.tabs.publication', 'Publication'),
                  }[kind],
                  key: kind,
                  render: (_: unknown, row: (typeof rows)[number]) =>
                    resultSetStatusMessage(t, kind, row.summary[`${kind}Status`]),
                })),
                {
                  title: t('pages.dataProcessing.workspace.created', 'Created'),
                  dataIndex: 'createdAt',
                  width: 180,
                  render: (value: string) => new Date(value).toLocaleString(intl.locale),
                },
                {
                  title: t('pages.dataProcessing.jobs.action', 'Action'),
                  key: 'action',
                  render: (_, row) => (
                    <Button onClick={() => props.onOpen(row)}>
                      {resultSetActionMessage(t, row.summary.nextAction)}
                    </Button>
                  ),
                },
              ]}
            />
          )}
        </ResponsiveDataListViewport>
      </Space>
    </Card>
  );
}
