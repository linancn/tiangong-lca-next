import { FlowModelTable } from '@/services/flows/data';
import { ListPagination } from '@/services/general/data';
import { getProductTable } from '@/services/products/api';
import { CloseOutlined, PartitionOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Drawer, Space, Tooltip } from 'antd';
import type { FC } from 'react';
import { useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import FlowModelCreate from './create';
import FlowModelDelete from './delete';
import FlowModelEdit from './edit';
import FlowModelView from './view';

type Props = {
  flowId: string;
  lang: string;
  buttonType: string;
  dataSource: string;
};
const FlowModel: FC<Props> = ({ flowId, buttonType, lang, dataSource }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  // const [spinning, setSpinning] = useState(false);

  const actionRef = useRef<ActionType>();
  const flowsColumns: ProColumns<FlowModelTable>[] = [
    {
      title: <FormattedMessage id="pages.table.title.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.name" defaultMessage="Name" />,
      dataIndex: 'name',
      sorter: false,
    },
    {
      title: (
        <FormattedMessage id="pages.table.title.generalComment" defaultMessage="General Comment" />
      ),
      dataIndex: 'generalComment',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.createdAt" defaultMessage="Created At" />,
      dataIndex: 'created_at',
      valueType: 'dateTime',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.option" defaultMessage="Option" />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        return [
          <Space size={'small'} key={0}>
            <FlowModelView id={row.id} flowId={flowId} buttonType={'icon'} lang={lang} />
            <FlowModelEdit
              id={row.id}
              flowId={flowId}
              buttonType={'icon'}
              lang={lang}
              actionRef={actionRef}
            />
            <FlowModelDelete
              id={row.id}
              buttonType={'icon'}
              actionRef={actionRef}
              setViewDrawerVisible={() => {}}
            />
          </Space>,
        ];
      },
    },
  ];

  const onView = () => {
    setDrawerVisible(true);
  };

  return (
    <>
      {buttonType === 'icon' ? (
        <Tooltip title={<FormattedMessage id="pages.button.model" defaultMessage="Model" />}>
          <Button shape="circle" icon={<PartitionOutlined />} size="small" onClick={onView} />
        </Tooltip>
      ) : (
        <Button onClick={onView}>
          <FormattedMessage id="pages.button.model" defaultMessage="Model" />
        </Button>
      )}

      <Drawer
        title={
          <FormattedMessage id="pages.flow.model.drawer.title.list" defaultMessage="Model List" />
        }
        width="90%"
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
        maskClosable={true}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        <ProTable<FlowModelTable, ListPagination>
          actionRef={actionRef}
          search={{
            defaultCollapsed: false,
          }}
          pagination={{
            showSizeChanger: false,
            pageSize: 10,
          }}
          toolBarRender={() => {
            if (dataSource === 'my') {
              return [<FlowModelCreate key={0} lang={lang} actionRef={actionRef} id={flowId} />];
            }
            return [];
          }}
          request={async (
            params: {
              pageSize: number;
              current: number;
            },
            sort,
          ) => {
            return getProductTable(params, sort, flowId, lang, dataSource);
          }}
          columns={flowsColumns}
        />
      </Drawer>
    </>
  );
};

export default FlowModel;
