import { getContactTable } from '@/services/contacts/api';
import { ContactTable } from '@/services/contacts/data';
import { ListPagination } from '@/services/general/data';
import styles from '@/style/custom.less';
import { CloseOutlined, DatabaseOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-table';
import { Button, Card, Drawer, Space, Tooltip } from 'antd';
import type { FC, Key } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import ContactView from '../view';

type Props = {
  buttonType: string;
  lang: string;
  onData: (rowKey: any) => void;
};

const ContactSelectDrawer: FC<Props> = ({ buttonType, lang, onData }) => {
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

  const tabList = [
    { key: 'tg', tab: <FormattedMessage id="pages.tab.title.tgdata" defaultMessage="TianGong Data" /> },
    { key: 'my', tab: <FormattedMessage id="pages.tab.title.mydata" defaultMessage="My Data" /> },
  ];

  const contactColumns: ProColumns<ContactTable>[] = [
    {
      title: <FormattedMessage id="pages.table.title.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.name" defaultMessage="Name" />,
      dataIndex: 'shortName',
      sorter: false,
      render: (_, row) => [
        <Tooltip key={0} placement="topLeft" title={row.name}>
          {row.shortName}
        </Tooltip>,
      ],
    },
    {
      title: <FormattedMessage id="pages.table.title.classification" defaultMessage="Classification" />,
      dataIndex: 'classification',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.contact.email" defaultMessage="Email" />,
      dataIndex: 'email',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.createdAt" defaultMessage="Created At" />,
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      sorter: true,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.option" defaultMessage="Option" />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        return [
          <Space size={'small'} key={0}>
            <ContactView
              id={row.id}
              lang={lang}
              buttonType="icon"
            />
          </Space>,
        ];

        // if (activeTabKey === 'tg') {
        //   return [
        //     <Space size={'small'} key={0}>
        //       <ContactView
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
        //       <ContactView
        //         id={row.id}
        //         lang={lang}
        //         dataSource="my"
        //         buttonType="icon"
        //       />
        //       <ContactEdit
        //         id={row.id}
        //         lang={lang}
        //         buttonType={'icon'}
        //         actionRef={myActionRefSelect}
        //         setViewDrawerVisible={() => {}}
        //       />
        //       <ContactDelete
        //         id={row.id}
        //         buttonType={'icon'}
        //         actionRef={myActionRefSelect}
        //         setViewDrawerVisible={() => {}}
        //       />
        //     </Space>,
        //   ];
        // } else return [];
      },
    },
  ];

  const databaseList: Record<string, React.ReactNode> = {
    tg: (
      <ProTable<ContactTable, ListPagination>
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
          return getContactTable(params, sort, lang, 'tg');
        }}
        columns={contactColumns}
        rowSelection={{
          type: 'radio',
          alwaysShowAlert: true,
          selectedRowKeys,
          onChange: onSelectChange,
        }}
      />
    ),
    my: (
      <ProTable<ContactTable, ListPagination>
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
          return getContactTable(params, sort, lang, 'my');
        }}
        columns={contactColumns}
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
      {buttonType === 'icon' ? (
        <Tooltip
          title={
            <FormattedMessage
              id="pages.button.select"
              defaultMessage="Select"
            />
          }
        ><Button shape="circle" icon={<DatabaseOutlined />} size="small" onClick={onSelect} />
        </Tooltip>
      ) : (
        <Button onClick={onSelect}>
          <FormattedMessage id="pages.button.select" defaultMessage="Select" />
        </Button>
      )}

      <Drawer
        title={
          <FormattedMessage
            id="pages.contact.drawer.title.select"
            defaultMessage="Selete Contact"
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

export default ContactSelectDrawer;
