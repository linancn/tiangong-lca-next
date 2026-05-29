import { SearchOutlined } from '@ant-design/icons';
import { Alert, Button, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';

import {
  type DatasetUuidMentionEntityKind,
  type DatasetUuidMentionRow,
  normalizeDatasetUuidSearchQuery,
  searchDatasetJsonUuidMentions,
} from '@/services/datasetUuidMentionSearch/api';

type DatasetUuidMentionSearchProps = {
  dataSource: string;
  getStateCodeFilter?: () => number | string | null | undefined;
  queryText: string;
  sourceEntityKinds: DatasetUuidMentionEntityKind[];
  teamId?: string | null;
};

const ENTITY_KIND_LABELS: Record<DatasetUuidMentionEntityKind, string> = {
  contact: 'Contact',
  flow: 'Flow',
  flowproperty: 'Flow property',
  lifecyclemodel: 'Model',
  process: 'Process',
  source: 'Source',
  unitgroup: 'Unit group',
};

const ENTITY_KIND_MESSAGE_IDS: Record<DatasetUuidMentionEntityKind, string> = {
  contact: 'menu.tgdata.contacts',
  flow: 'menu.tgdata.flows',
  flowproperty: 'menu.tgdata.flowproperties',
  lifecyclemodel: 'menu.tgdata.products',
  process: 'menu.tgdata.processes',
  source: 'menu.tgdata.sources',
  unitgroup: 'menu.tgdata.unitgroups',
};

export default function DatasetUuidMentionSearch({
  dataSource,
  getStateCodeFilter,
  queryText,
  sourceEntityKinds,
  teamId,
}: DatasetUuidMentionSearchProps) {
  const intl = useIntl();
  const normalizedUuid = normalizeDatasetUuidSearchQuery(queryText);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [rows, setRows] = useState<DatasetUuidMentionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sourceEntityKindsKey = sourceEntityKinds.join(',');

  useEffect(() => {
    setHasSearched(false);
    setRows([]);
    setError(null);
  }, [dataSource, normalizedUuid, sourceEntityKindsKey, teamId]);

  const columns = useMemo<ColumnsType<DatasetUuidMentionRow>>(
    () => [
      {
        dataIndex: 'source_entity_kind',
        title: <FormattedMessage id='pages.datasetUuidMention.entityKind' />,
        width: 132,
        render: (value: DatasetUuidMentionEntityKind) =>
          intl.formatMessage({
            defaultMessage: ENTITY_KIND_LABELS[value] ?? value,
            id: ENTITY_KIND_MESSAGE_IDS[value],
          }),
      },
      {
        dataIndex: 'source_name',
        ellipsis: true,
        title: <FormattedMessage id='pages.table.title.name' defaultMessage='Name' />,
        render: (value?: string | null) => value || '-',
      },
      {
        dataIndex: 'source_version',
        title: <FormattedMessage id='pages.table.title.version' defaultMessage='Version' />,
        width: 112,
      },
      {
        dataIndex: 'source_id',
        title: 'ID',
        width: 300,
        render: (value: string) => (
          <Typography.Text copyable={{ text: value }} ellipsis>
            {value}
          </Typography.Text>
        ),
      },
    ],
    [intl],
  );

  if (!normalizedUuid) {
    return null;
  }

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    setError(null);
    try {
      const result = await searchDatasetJsonUuidMentions({
        dataSource,
        sourceEntityKinds,
        stateCode: getStateCodeFilter?.(),
        teamId,
        uuid: normalizedUuid,
      });
      setRows(result.data);
      if (!result.success) {
        setError(result.error ?? 'search_failed');
      }
    } catch (caughtError) {
      setRows([]);
      setError(caughtError instanceof Error ? caughtError.message : 'search_failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space direction='vertical' size='small' style={{ marginTop: 12, width: '100%' }}>
      <Button icon={<SearchOutlined />} loading={loading} onClick={handleSearch}>
        <FormattedMessage id='pages.datasetUuidMention.searchButton' />
      </Button>
      {error && (
        <Alert
          message={intl.formatMessage({ id: 'pages.datasetUuidMention.error' })}
          showIcon
          type='error'
        />
      )}
      {hasSearched && !error && rows.length === 0 && (
        <Alert
          message={intl.formatMessage({ id: 'pages.datasetUuidMention.empty' })}
          showIcon
          type='info'
        />
      )}
      {rows.length > 0 && (
        <Table<DatasetUuidMentionRow>
          columns={columns}
          dataSource={rows}
          pagination={false}
          rowKey={(row) => `${row.source_entity_kind}-${row.source_id}-${row.source_version}`}
          size='small'
        />
      )}
    </Space>
  );
}
