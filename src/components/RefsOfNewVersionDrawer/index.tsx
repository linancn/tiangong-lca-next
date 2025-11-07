import { getLang, getLangText, RefVersionItem } from '@/services/general/util';
import { ActionType, ProTable } from '@ant-design/pro-components';
import { Button, Drawer, Space } from 'antd';
import type { FC } from 'react';
import { useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';

type Props = {
  open: boolean;
  loading?: boolean;
  dataSource: RefVersionItem[];
  onCancel: () => void;
  onKeep: () => void;
  onUpdate: (rows: RefVersionItem[]) => void;
};

const RefsOfNewVersionDrawer: FC<Props> = ({
  open,
  loading = false,
  dataSource,
  onCancel,
  onKeep,
  onUpdate,
}) => {
  const actionRef = useRef<ActionType>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<RefVersionItem[]>([]);
  const intl = useIntl();
  const lang = getLang(intl.locale);
  return (
    <Drawer
      getContainer={() => document.body}
      destroyOnClose
      width={800}
      open={open}
      title={
        <FormattedMessage
          id={'component.refsOfNewVersionDrawer.title'}
          defaultMessage={'References Newer Versions'}
        />
      }
      onClose={onCancel}
      footer={
        <Space>
          <Button onClick={onKeep}>
            <FormattedMessage
              id={'component.refsOfNewVersionDrawer.keep'}
              defaultMessage={'Keep current versions'}
            />
          </Button>
          <Button
            type='primary'
            onClick={() => onUpdate(selectedRows)}
            disabled={selectedRows.length === 0}
          >
            <FormattedMessage
              id={'component.refsOfNewVersionDrawer.update'}
              defaultMessage={'Update to latest versions'}
            />
          </Button>
        </Space>
      }
    >
      <ProTable<RefVersionItem>
        rowKey='key'
        actionRef={actionRef}
        search={false}
        options={false}
        loading={loading}
        dataSource={dataSource}
        pagination={{ pageSize: 10 }}
        rowSelection={{
          selectedRowKeys,
          onSelect: (record, selected) => {
            const currentKey = record.key;
            const currentId = record.id;
            if (selected) {
              const filteredRows = (selectedRows as RefVersionItem[]).filter(
                (r) => r.id !== currentId,
              );
              const filteredKeys = selectedRowKeys.filter((k) => {
                const r = (selectedRows as RefVersionItem[]).find((sr) => sr.key === k);
                return r ? r.id !== currentId : true;
              });
              const newRows = [...filteredRows, record as RefVersionItem];
              const newKeys = [...filteredKeys, currentKey];
              setSelectedRows(newRows);
              setSelectedRowKeys(newKeys);
            } else {
              const newRows = (selectedRows as RefVersionItem[]).filter(
                (r) => r.key !== currentKey,
              );
              const newKeys = selectedRowKeys.filter((k) => k !== currentKey);
              setSelectedRows(newRows);
              setSelectedRowKeys(newKeys);
            }
          },
          onSelectAll: (selected, selectedRowsAll) => {
            if (selected) {
              const byId = new Map<string, RefVersionItem>();
              // 确保同 id 仅一条
              (selectedRowsAll as RefVersionItem[]).forEach((r) => {
                byId.set(r.id, r);
              });
              const uniqueRows = Array.from(byId.values());
              setSelectedRows(uniqueRows);
              setSelectedRowKeys(uniqueRows.map((r) => r.key));
            } else {
              setSelectedRows([]);
              setSelectedRowKeys([]);
            }
          },
        }}
        columns={[
          {
            title: (
              <FormattedMessage
                id={'component.refsOfNewVersionDrawer.col.id'}
                defaultMessage={'ID'}
              />
            ),
            dataIndex: 'id',
            width: 280,
          },
          {
            title: (
              <FormattedMessage
                id={'component.refsOfNewVersionDrawer.col.type'}
                defaultMessage={'Type'}
              />
            ),
            dataIndex: 'type',
            width: 120,
          },
          {
            title: (
              <FormattedMessage
                id={'component.refsOfNewVersionDrawer.col.desc'}
                defaultMessage={'Description'}
              />
            ),
            dataIndex: 'description',
            ellipsis: true,
            render: (_, r) => {
              return <>{getLangText(r.description, lang)}</>;
            },
          },
          {
            title: (
              <FormattedMessage
                id={'component.refsOfNewVersionDrawer.col.current'}
                defaultMessage={'Current version'}
              />
            ),
            dataIndex: 'currentVersion',
          },
          {
            title: (
              <FormattedMessage
                id={'component.refsOfNewVersionDrawer.col.new'}
                defaultMessage={'New version'}
              />
            ),
            dataIndex: 'newVersion',
          },
        ]}
      />
    </Drawer>
  );
};

export type { RefVersionItem };
export default RefsOfNewVersionDrawer;
