import { getFlowpropertyTable } from '@/services/flowproperties/api';
import { FlowpropertyTable } from '@/services/flowproperties/data';
import { ListPagination } from '@/services/general/data';
import styles from '@/style/custom.less';
import { CloseOutlined, DatabaseOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-table';
import { Button, Card, Drawer, Space, Tooltip } from 'antd';
import type { FC, Key } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import FlowpropertiesDelete from '../delete';
import FlowpropertiesEdit from '../edit';
import FlowpropertyView from '../view';

type Props = {
  buttonType: string;
  lang: string;
  onData: (rowKey: any) => void;
};

const FlowpropertiesSelectDrawer: FC<Props> = ({ buttonType, lang, onData }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<string>('tg');
  const tgActionRefSelect = useRef<ActionType>();
  const myActionRefSelect = useRef<ActionType>();

  const onSelect = () => {
    setDrawerVisible(true);
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const onTabChange = async (key: string) => {
    await setActiveTabKey(key);
    if (key === 'tg') {
      tgActionRefSelect.current?.reload();
    }
    if (key === 'my') {
      myActionRefSelect.current?.reload();
    }
  };

  const FlowpropertyColumns: ProColumns<FlowpropertyTable>[] = [
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
      render: (_, row) => [
        <Tooltip key={0} placement="topLeft" title={row.generalComment}>
          {row.name}
        </Tooltip>,
      ],
    },
    {
      title: (
        <FormattedMessage id="pages.table.title.classification" defaultMessage="Classification" />
      ),
      dataIndex: 'classification',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage id="pages.flowproperties.referenceToReferenceUnitGroup" defaultMessage="Reference Unit Group" />
      ),
      dataIndex: 'referenceToReferenceUnitGroup',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.createdAt" defaultMessage="Created At" />,
      dataIndex: 'created_at',
      valueType: 'dateTime',
      sorter: true,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.option" defaultMessage="Option" />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        if (activeTabKey === 'tg') {
          return [
            <Space size={'small'} key={0}>
              <FlowpropertyView lang={lang} buttonType={'icon'} id={row.id} />
            </Space>,
          ];
        } else if (activeTabKey === 'my') {
          return [
            <Space size={'small'} key={0}>
              <FlowpropertyView lang={lang} buttonType={'icon'} id={row.id} />
              <FlowpropertiesEdit
                lang={lang}
                id={row.id}
                buttonType={'icon'}
                actionRef={myActionRefSelect}
              />
              <FlowpropertiesDelete
                id={row.id}
                buttonType={'icon'}
                actionRef={myActionRefSelect}
                setViewDrawerVisible={() => { }}
              />
            </Space>,
          ];
        } else return [];
      },
    },
  ];

  const tabList = [
    { key: 'tg', tab: 'TianGong Data' },
    { key: 'my', tab: 'My Data' },
  ];

  const databaseList: Record<string, React.ReactNode> = {
    tg: (
      <ProTable<FlowpropertyTable, ListPagination>
        actionRef={tgActionRefSelect}
        search={{
          defaultCollapsed: false,
        }}
        pagination={{
          showSizeChanger: false,
          pageSize: 10,
        }}
        request={async (
          params: {
            pageSize: number;
            current: number;
          },
          sort,
        ) => {
          return getFlowpropertyTable(params, sort, lang, 'tg');
        }}
        columns={FlowpropertyColumns}
        rowSelection={{
          type: 'radio',
          alwaysShowAlert: true,
          selectedRowKeys,
          onChange: onSelectChange,
        }}
      />
    ),
    my: (
      <ProTable<FlowpropertyTable, ListPagination>
        actionRef={myActionRefSelect}
        search={{
          defaultCollapsed: false,
        }}
        pagination={{
          showSizeChanger: false,
          pageSize: 10,
        }}
        request={async (
          params: {
            pageSize: number;
            current: number;
          },
          sort,
        ) => {
          return getFlowpropertyTable(params, sort, lang, 'my');
        }}
        columns={FlowpropertyColumns}
        rowSelection={{
          type: 'radio',
          alwaysShowAlert: true,
          selectedRowKeys,
          onChange: onSelectChange,
        }}
      />
    ),
  };

  useEffect(() => {
    if (!drawerVisible) return;
    setSelectedRowKeys([]);
  }, [drawerVisible]);

  return (
    <>
      <Tooltip
        title={
          <FormattedMessage
            id="pages.flowproperties.drawer.title.select"
            defaultMessage="Select Flowproperties"
          />
        }
      >
        {buttonType === 'icon' ? (
          <Button shape="circle" icon={<DatabaseOutlined />} size="small" onClick={onSelect} />
        ) : (
          <Button onClick={onSelect} style={{ marginTop: '6px' }}>
            <FormattedMessage
              id="pages.flowproperties.drawer.title.select"
              defaultMessage="select Flowproperties"
            />
          </Button>
        )}
      </Tooltip>
      <Drawer
        title={
          <FormattedMessage
            id="pages.flowproperties.drawer.title.select"
            defaultMessage="Selete Flowproperties"
          />
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
        maskClosable={false}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <Button onClick={() => setDrawerVisible(false)}>
              {' '}
              <FormattedMessage id="pages.button.cancel" defaultMessage="Cancel" />
            </Button>
            <Button
              onClick={() => {
                onData(selectedRowKeys);
                setDrawerVisible(false);
              }}
              type="primary"
            >
              <FormattedMessage id="pages.button.submit" defaultMessage="Submit" />
            </Button>
          </Space>
        }
      >
        <Card
          style={{ width: '100%' }}
          tabList={tabList}
          activeTabKey={activeTabKey}
          onTabChange={onTabChange}
        >
          {databaseList[activeTabKey]}
        </Card>
      </Drawer>
    </>
  );
};

export default FlowpropertiesSelectDrawer;
