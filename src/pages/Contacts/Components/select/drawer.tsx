import { getContactTableAll, getContactTablePgroongaSearch } from '@/services/contacts/api';
import { ContactTable } from '@/services/contacts/data';
import { DataTabKey, ListPagination } from '@/services/general/data';
import styles from '@/style/custom.less';
import { CloseOutlined, DatabaseOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, Drawer, Input, Space, Tooltip } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC, Key, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import ContactCreate from '../create';
import ContactView from '../view';

type Props = {
  buttonType: string;
  buttonText?: ReactNode;
  lang: string;
  onData: (rowKey: string, version: string) => void;
  filterTabs?: DataTabKey[];
};

const { Search } = Input;

const ContactSelectDrawer: FC<Props> = ({ buttonType, buttonText, lang, onData, filterTabs }) => {
  const [tgKeyWord, setTgKeyWord] = useState<string>('');
  const [coKeyWord, setCoKeyWord] = useState<string>('');
  const [myKeyWord, setMyKeyWord] = useState<string>('');
  const [teamKeyWord, setTeamKeyWord] = useState<string>('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<DataTabKey>(() => {
    if (filterTabs && filterTabs.length > 0) {
      return filterTabs[0];
    }
    return 'tg';
  });
  const tgActionRefSelect = useRef<ActionType>();
  const coActionRefSelect = useRef<ActionType>();
  const myActionRefSelect = useRef<ActionType>();
  const teamActionRefSelect = useRef<ActionType>();

  const intl = useIntl();

  const onSelect = () => {
    setDrawerVisible(true);
  };

  const onSelectChange = (newSelectedRowKeys: Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const onTabChange = async (key: string) => {
    const tabKey = key as DataTabKey;
    await setActiveTabKey(tabKey);
    if (tabKey === 'tg') {
      await tgActionRefSelect.current?.setPageInfo?.({ current: 1 });
      tgActionRefSelect.current?.reload();
    }
    if (tabKey === 'co') {
      coActionRefSelect.current?.setPageInfo?.({ current: 1 });
      coActionRefSelect.current?.reload();
    }
    if (tabKey === 'my') {
      myActionRefSelect.current?.setPageInfo?.({ current: 1 });
      myActionRefSelect.current?.reload();
    }
    if (tabKey === 'te') {
      teamActionRefSelect.current?.setPageInfo?.({ current: 1 });
      teamActionRefSelect.current?.reload();
    }
  };

  const onTgSearch: SearchProps['onSearch'] = async (value) => {
    await setTgKeyWord(value);
    tgActionRefSelect.current?.setPageInfo?.({ current: 1 });
    tgActionRefSelect.current?.reload();
  };

  const onTeamSearch: SearchProps['onSearch'] = async (value) => {
    await setTeamKeyWord(value);
    teamActionRefSelect.current?.setPageInfo?.({ current: 1 });
    teamActionRefSelect.current?.reload();
  };

  const onCoSearch: SearchProps['onSearch'] = async (value) => {
    await setCoKeyWord(value);
    coActionRefSelect.current?.setPageInfo?.({ current: 1 });
    coActionRefSelect.current?.reload();
  };

  const onMySearch: SearchProps['onSearch'] = async (value) => {
    await setMyKeyWord(value);
    myActionRefSelect.current?.setPageInfo?.({ current: 1 });
    myActionRefSelect.current?.reload();
  };

  const handleTgKeyWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTgKeyWord(e.target.value);
  };

  const handleCoKeyWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCoKeyWord(e.target.value);
  };

  const handleMyKeyWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMyKeyWord(e.target.value);
  };

  const handleTeamKeyWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTeamKeyWord(e.target.value);
  };

  const allTabList = [
    {
      key: 'tg',
      tab: <FormattedMessage id='pages.tab.title.tgdata' defaultMessage='TianGong Data' />,
    },
    { key: 'co', tab: <FormattedMessage id='pages.tab.title.co' defaultMessage='Business Data' /> },
    { key: 'my', tab: <FormattedMessage id='pages.tab.title.mydata' defaultMessage='My Data' /> },
    {
      key: 'te',
      tab: <FormattedMessage id='pages.tab.title.tedata' defaultMessage='Team Data' />,
    },
  ];

  const tabList = filterTabs
    ? allTabList.filter((tab) => filterTabs.includes(tab.key as DataTabKey))
    : allTabList;

  const contactColumns: ProColumns<ContactTable>[] = [
    {
      title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id='pages.table.title.name' defaultMessage='Name' />,
      dataIndex: 'shortName',
      sorter: false,
      search: false,
      render: (_, row) => [
        <Tooltip key={0} placement='topLeft' title={row.name}>
          {row.shortName}
        </Tooltip>,
      ],
    },
    {
      title: (
        <FormattedMessage id='pages.table.title.classification' defaultMessage='Classification' />
      ),
      dataIndex: 'classification',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id='pages.contact.email' defaultMessage='E-mail' />,
      dataIndex: 'email',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id='pages.table.title.version' defaultMessage='Version' />,
      dataIndex: 'version',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id='pages.table.title.updatedAt' defaultMessage='Updated at' />,
      dataIndex: 'modifiedAt',
      valueType: 'dateTime',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id='pages.table.title.option' defaultMessage='Option' />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        return [
          <Space size={'small'} key={0}>
            <ContactView id={row.id} version={row.version} lang={lang} buttonType='icon' />
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

  const databaseList: Record<DataTabKey, React.ReactNode> = {
    tg: (
      <>
        <Card>
          <Search
            name={'tg'}
            size={'large'}
            placeholder={intl.formatMessage({ id: 'pages.search.keyWord' })}
            value={tgKeyWord}
            onChange={handleTgKeyWordChange}
            onSearch={onTgSearch}
            enterButton
          />
        </Card>
        <ProTable<ContactTable, ListPagination>
          actionRef={tgActionRefSelect}
          search={false}
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
            if (tgKeyWord.length > 0) {
              return getContactTablePgroongaSearch(params, lang, 'tg', tgKeyWord, {});
            }
            return getContactTableAll(params, sort, lang, 'tg', []);
          }}
          columns={contactColumns}
          rowSelection={{
            type: 'radio',
            alwaysShowAlert: true,
            selectedRowKeys,
            onChange: onSelectChange,
          }}
        />
      </>
    ),
    co: (
      <>
        <Card>
          <Search
            name={'co'}
            size={'large'}
            placeholder={intl.formatMessage({ id: 'pages.search.keyWord' })}
            value={coKeyWord}
            onChange={handleCoKeyWordChange}
            onSearch={onCoSearch}
            enterButton
          />
        </Card>
        <ProTable<ContactTable, ListPagination>
          actionRef={coActionRefSelect}
          search={false}
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
            if (coKeyWord.length > 0) {
              return getContactTablePgroongaSearch(params, lang, 'co', coKeyWord, {});
            }
            return getContactTableAll(params, sort, lang, 'co', []);
          }}
          columns={contactColumns}
          rowSelection={{
            type: 'radio',
            alwaysShowAlert: true,
            selectedRowKeys,
            onChange: onSelectChange,
          }}
        />
      </>
    ),
    my: (
      <>
        <Card>
          <Search
            name={'my'}
            size={'large'}
            placeholder={intl.formatMessage({ id: 'pages.search.keyWord' })}
            value={myKeyWord}
            onChange={handleMyKeyWordChange}
            onSearch={onMySearch}
            enterButton
          />
        </Card>
        <ProTable<ContactTable, ListPagination>
          actionRef={myActionRefSelect}
          search={false}
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
            if (myKeyWord.length > 0) {
              return getContactTablePgroongaSearch(params, lang, 'my', myKeyWord, {});
            }
            return getContactTableAll(params, sort, lang, 'my', []);
          }}
          toolBarRender={() => {
            return [<ContactCreate lang={lang} key={0} actionRef={myActionRefSelect} />];
          }}
          columns={contactColumns}
          rowSelection={{
            type: 'radio',
            alwaysShowAlert: true,
            selectedRowKeys,
            onChange: onSelectChange,
          }}
        />
      </>
    ),
    te: (
      <>
        <Card>
          <Search
            name={'te'}
            size={'large'}
            placeholder={intl.formatMessage({ id: 'pages.search.keyWord' })}
            value={teamKeyWord}
            onChange={handleTeamKeyWordChange}
            onSearch={onTeamSearch}
            enterButton
          />
        </Card>
        <ProTable<ContactTable, ListPagination>
          actionRef={teamActionRefSelect}
          search={false}
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
            if (teamKeyWord.length > 0) {
              return getContactTablePgroongaSearch(params, lang, 'te', teamKeyWord, {});
            }
            return getContactTableAll(params, sort, lang, 'te', '');
          }}
          columns={contactColumns}
          rowSelection={{
            type: 'radio',
            alwaysShowAlert: true,
            selectedRowKeys,
            onChange: onSelectChange,
          }}
        />
      </>
    ),
  };

  useEffect(() => {
    if (!drawerVisible) return;
    setSelectedRowKeys([]);
  }, [drawerVisible]);

  // useEffect(() => {
  //   if (filterTabs && filterTabs.length > 0) {
  //     setActiveTabKey(filterTabs[0]);
  //   } else {
  //     setActiveTabKey('tg');
  //   }
  // }, [filterTabs]);

  return (
    <>
      {buttonType === 'icon' ? (
        <Tooltip
          title={
            buttonText ?? <FormattedMessage id='pages.button.select' defaultMessage='Select' />
          }
        >
          <Button type='text' icon={<DatabaseOutlined />} size='small' onClick={onSelect} />
        </Tooltip>
      ) : (
        <Button onClick={onSelect}>
          {buttonText ?? <FormattedMessage id='pages.button.select' defaultMessage='Select' />}
        </Button>
      )}

      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage
            id='pages.contact.drawer.title.select'
            defaultMessage='Selete Contact'
          />
        }
        width='90%'
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
              <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel' />
            </Button>
            <Button
              onClick={() => {
                const keys = selectedRowKeys?.[0]?.toString().split(':');
                if (keys && keys.length) {
                  onData(keys[0], keys[1]);
                }
                setDrawerVisible(false);
              }}
              type='primary'
            >
              <FormattedMessage id='pages.button.submit' defaultMessage='Submit' />
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
