import { ListPagination } from '@/services/general/data';
import { getSourceTable } from '@/services/sources/api';
import { SourceTable } from '@/services/sources/data';
import styles from '@/style/custom.less';
import { CloseOutlined, DatabaseOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-table';
import { Button, Card, Drawer, Space, Tooltip } from 'antd';
import type { FC, Key } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import { default as SourceView } from '../view';

type Props = {
  buttonType: string;
  lang: string;
  onData: (rowKey: any) => void;
};

const SourceSelectDrawer: FC<Props> = ({ buttonType, lang, onData }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<string>('my');
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

  const sourceColumns: ProColumns<SourceTable>[] = [
    {
      title: <FormattedMessage id="source.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="source.shortName" defaultMessage="Data Name" />,
      dataIndex: 'shortName',
      sorter: false,
    },
    {
      title: <FormattedMessage id="source.classification" defaultMessage="Classification" />,
      dataIndex: 'classification',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="source.publicationType" defaultMessage="Publication Type" />,
      dataIndex: 'publicationType',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="contact.createdAt" defaultMessage="Created At" />,
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      sorter: true,
      search: false,
    },
    {
      title: <FormattedMessage id="options.option" defaultMessage="Option" />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        if (activeTabKey === 'tg') {
          return [
            <SourceView
              key={0}
              id={row.id}
              lang={lang}
              dataSource="tg"
              buttonType="icon"
            />
            //      <Space size={'small'} key={0}>
            //       <SourceView
            //         id={row.id}
            //         lang={lang}
            //         dataSource="tg"
            //         buttonType="icon"
            //       />
            //     </Space>,
            //   ];
            // } else if (activeTabKey === 'my') {
            //   return [
            //     <Space size={'small'} key={0}>
            //       <SourceView
            //         id={row.id}
            //         lang={lang}
            //         dataSource="my"
            //         buttonType="icon"
            //       />
            //        <SourceEdit
            //         id={row.id}
            //         lang={lang}
            //         buttonType={'icon'}
            //         actionRef={myActionRefSelect}
            //         setViewDrawerVisible={() => {}}
            //       />
            //       <SourceDelete
            //         id={row.id}
            //         buttonType={'icon'}
            //         actionRef={myActionRefSelect}
            //         setViewDrawerVisible={() => {}}
            //       /> 
            //     </Space>,
          ];
        } else return [];
      },
    },
  ];

  const tabList = [
    { key: 'my', tab: 'My Data' },
    { key: 'tg', tab: 'TianGong Data' },
  ];

  const databaseList: Record<string, React.ReactNode> = {
    my: (
      <ProTable<SourceTable, ListPagination>
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
          return getSourceTable(params, sort, lang, 'my');
        }}
        columns={sourceColumns}
        rowSelection={{
          type: 'radio',
          alwaysShowAlert: true,
          selectedRowKeys,
          onChange: onSelectChange,
        }}
      />
    ),
    tg: (
      <ProTable<SourceTable, ListPagination>
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
          return getSourceTable(params, sort, lang, 'tg');
        }}
        columns={sourceColumns}
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
            id="pages.contact.drawer.title.select"
            defaultMessage="Select Source"
          />
        }
      >
        {buttonType === 'icon' ? (
          <Button shape="circle" icon={<DatabaseOutlined />} size="small" onClick={onSelect} />
        ) : (
          <Button onClick={onSelect}>
            <FormattedMessage id="pages.contact.drawer.title.select" defaultMessage="Select" />
          </Button>
        )}
      </Tooltip>
      <Drawer
        title={
          <FormattedMessage
            id="pages.contact.drawer.title.select"
            defaultMessage="Selete Source"
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
              <FormattedMessage id="options.cancel" defaultMessage="Cancel" />
            </Button>
            <Button
              onClick={() => {
                onData(selectedRowKeys);
                setDrawerVisible(false);
              }}
              type="primary"
            >
              <FormattedMessage id="options.submit" defaultMessage="Submit" />
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

export default SourceSelectDrawer;
