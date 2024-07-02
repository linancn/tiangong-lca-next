import { getUnitGroupTable } from '@/services/unitgroups/api';
import { UnitGroupTable } from '@/services/unitgroups/data';
import { ListPagination } from '@/services/general/data';
import styles from '@/style/custom.less';
import { CloseOutlined, DatabaseOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-table';
import { Button, Card, Drawer, Space, Tooltip } from 'antd';
import type { FC, Key } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import UnitGroupDelete from '../delete';
import UnitGroupEdit from '../edit';
import UnitGroupView from '../view';

type Props = {
  buttonType: string;
  lang: string;
  onData: (rowKey: any) => void;
};

const UnitgroupsSelectDrawer: FC<Props> = ({ buttonType, lang, onData }) => {
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

  const unitGroupColumns: ProColumns<UnitGroupTable>[] = [
    {
      title: <FormattedMessage id="pages.table.index" defaultMessage="Index"></FormattedMessage>,
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.unitgroup.name" defaultMessage="Name"></FormattedMessage>,
      dataIndex: 'name',
      sorter: false,
    },
    {
      title: <FormattedMessage id="pages.unitgroup.classification" defaultMessage="Classification"></FormattedMessage>,
      dataIndex: 'classification',
      sorter: false,
      search: false,
    },
    // {
    //   title: <FormattedMessage id="unitGroup.email" defaultMessage="Reference Unit"></FormattedMessage>,
    //   dataIndex: 'referenceToReferenceUnit',
    //   sorter: false,
    //   search: false,
    // },
    {
      title: <FormattedMessage id="pages.unitgroup.createdAt" defaultMessage="Created At"></FormattedMessage>,
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      sorter: true,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.option" defaultMessage="Option"></FormattedMessage>,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        if (activeTabKey === 'my') {
          return [
            <Space size={'small'} key={0}>
              <UnitGroupView
                buttonType={'icon'}
                lang={lang} id={row.id} dataSource={'my'} actionRef={myActionRefSelect}></UnitGroupView>
              <UnitGroupEdit
                id={row.id}
                buttonType={'icon'}
                lang={lang}
                actionRef={myActionRefSelect}
                setViewDrawerVisible={() => { }}
              ></UnitGroupEdit>
              <UnitGroupDelete
                id={row.id}
                buttonType={'icon'}
                actionRef={myActionRefSelect}
                setViewDrawerVisible={() => { }}
              ></UnitGroupDelete>
            </Space>,
          ];
        }
        return [
          <Space size={'small'} key={0}>
            <UnitGroupView buttonType={'icon'}
              lang={lang} id={row.id} dataSource={'tg'} actionRef={tgActionRefSelect}></UnitGroupView>
          </Space>,
        ];
      },
    },
  ];

  const tabList = [
    { key: 'tg', tab: 'TianGong Data' },
    { key: 'my', tab: 'My Data' },
  ];

  const databaseList: Record<string, React.ReactNode> = {
    tg: (
      <ProTable<UnitGroupTable, ListPagination>
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
          return getUnitGroupTable(params, sort, lang, 'tg');
        }}
        columns={unitGroupColumns}
        rowSelection={{
          type: 'radio',
          alwaysShowAlert: true,
          selectedRowKeys,
          onChange: onSelectChange,
        }}
      />
    ),
    my: (
      <ProTable<UnitGroupTable, ListPagination>
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
          return getUnitGroupTable(params, sort, lang, 'my');
        }}
        columns={unitGroupColumns}
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
            id="pages.unitgroup.drawer.title.select"
            defaultMessage="Select UnitGroups"
          />
        }
      >
        {buttonType === 'icon' ? (
          <Button shape="circle" icon={<DatabaseOutlined />} size="small" onClick={onSelect} />
        ) : (
          <Button onClick={onSelect} style={{ marginTop: '6px' }}>
            <FormattedMessage
              id="pages.unitgroup.drawer.title.select"
              defaultMessage="select UnitGroups"
            />
          </Button>
        )}
      </Tooltip>
      <Drawer
        title={
          <FormattedMessage
            id="pages.unitgroup.drawer.title.select"
            defaultMessage="Selete UnitGroups"
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
              <FormattedMessage id="pages.table.option.cancel" defaultMessage="Cancel" />
            </Button>
            <Button
              onClick={() => {
                onData(selectedRowKeys);
                setDrawerVisible(false);
              }}
              type="primary"
            >
              <FormattedMessage id="pages.table.option.submit" defaultMessage="Submit" />
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

export default UnitgroupsSelectDrawer;
