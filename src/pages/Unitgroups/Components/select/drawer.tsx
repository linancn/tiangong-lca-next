import { toSuperscript } from '@/components/AlignedNumber';
import { ListPagination } from '@/services/general/data';
import { getUnitGroupTableAll, getUnitGroupTablePgroongaSearch } from '@/services/unitgroups/api';
import { UnitGroupTable } from '@/services/unitgroups/data';
import styles from '@/style/custom.less';
import { CloseOutlined, DatabaseOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, Drawer, Input, Space, Tooltip } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC, Key } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import UnitGroupCreate from '../create';
import UnitGroupView from '../view';

type Props = {
  buttonType: string;
  buttonText?: any;
  lang: string;
  onData: (rowKey: string, version: string) => void;
};

const { Search } = Input;

const UnitgroupsSelectDrawer: FC<Props> = ({ buttonType, buttonText, lang, onData }) => {
  const [tgKeyWord, setTgKeyWord] = useState<any>('');
  const [myKeyWord, setMyKeyWord] = useState<any>('');
  const [teKeyWord, setTeKeyWord] = useState<any>('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<string>('tg');
  const tgActionRefSelect = useRef<ActionType>();
  const myActionRefSelect = useRef<ActionType>();
  const teActionRefSelect = useRef<ActionType>();
  const intl = useIntl();

  const onSelect = () => {
    setDrawerVisible(true);
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const onTabChange = async (key: string) => {
    await setActiveTabKey(key);
    if (key === 'tg') {
      await tgActionRefSelect.current?.setPageInfo?.({ current: 1 });
      tgActionRefSelect.current?.reload();
    }
    if (key === 'my') {
      myActionRefSelect.current?.setPageInfo?.({ current: 1 });
      myActionRefSelect.current?.reload();
    }
    if (key === 'te') {
      teActionRefSelect.current?.setPageInfo?.({ current: 1 });
      teActionRefSelect.current?.reload();
    }
  };

  const onTgSearch: SearchProps['onSearch'] = async (value) => {
    await setTgKeyWord(value);
    tgActionRefSelect.current?.setPageInfo?.({ current: 1 });
    tgActionRefSelect.current?.reload();
  };

  const onMySearch: SearchProps['onSearch'] = async (value) => {
    await setMyKeyWord(value);
    myActionRefSelect.current?.setPageInfo?.({ current: 1 });
    myActionRefSelect.current?.reload();
  };

  const onTeSearch: SearchProps['onSearch'] = async (value) => {
    await setTeKeyWord(value);
    teActionRefSelect.current?.setPageInfo?.({ current: 1 });
    teActionRefSelect.current?.reload();
  };

  const handleTgKeyWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTgKeyWord(e.target.value);
  };

  const handleMyKeyWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMyKeyWord(e.target.value);
  };

  const handleTeKeyWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTeKeyWord(e.target.value);
  };

  const unitGroupColumns: ProColumns<UnitGroupTable>[] = [
    {
      title: (
        <FormattedMessage id='pages.table.title.index' defaultMessage='Index'></FormattedMessage>
      ),
      valueType: 'index',
      search: false,
    },
    {
      title: (
        <FormattedMessage id='pages.table.title.name' defaultMessage='Name'></FormattedMessage>
      ),
      dataIndex: 'name',
      sorter: false,
      search: false,
    },

    {
      title: (
        <FormattedMessage
          id='pages.unitgroup.unit.quantitativeReference'
          defaultMessage='Quantitative reference'
        />
      ),
      dataIndex: 'refUnitName',
      sorter: false,
      search: false,
      render: (_, row) => [
        <Tooltip key={0} placement='topLeft' title={row.refUnitGeneralComment}>
          {toSuperscript(row.refUnitName ?? '-')}
        </Tooltip>,
      ],
    },

    {
      title: (
        <FormattedMessage
          id='pages.table.title.classification'
          defaultMessage='Classification'
        ></FormattedMessage>
      ),
      dataIndex: 'classification',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id='pages.table.title.version' defaultMessage='Version' />,
      dataIndex: 'version',
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
      title: (
        <FormattedMessage
          id='pages.table.title.modifiedAt'
          defaultMessage='Updated at'
        ></FormattedMessage>
      ),
      dataIndex: 'modifiedAt',
      valueType: 'dateTime',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage id='pages.table.title.option' defaultMessage='Option'></FormattedMessage>
      ),
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        return [
          <UnitGroupView
            key={0}
            buttonType={'icon'}
            lang={lang}
            id={row.id}
            version={row.version}
          />,
        ];
        // if (activeTabKey === 'my') {
        //   return [
        //     <Space size={'small'} key={0}>
        //       <UnitGroupView
        //         buttonType={'icon'}
        //         lang={lang} id={row.id} dataSource={'my'} />
        //       <UnitGroupEdit
        //         id={row.id}
        //         buttonType={'icon'}
        //         lang={lang}
        //         actionRef={myActionRefSelect}
        //         setViewDrawerVisible={() => { }}
        //       ></UnitGroupEdit>
        //       <UnitGroupDelete
        //         id={row.id}
        //         buttonType={'icon'}
        //         actionRef={myActionRefSelect}
        //         setViewDrawerVisible={() => { }}
        //       ></UnitGroupDelete>
        //     </Space>,
        //   ];
        // }
        // return [
        //   <Space size={'small'} key={0}>
        //     <UnitGroupView buttonType={'icon'}
        //       lang={lang} id={row.id} dataSource={'tg'} actionRef={tgActionRefSelect}></UnitGroupView>
        //   </Space>,
        // ];
      },
    },
  ];

  const tabList = [
    {
      key: 'tg',
      tab: <FormattedMessage id='pages.tab.title.tgdata' defaultMessage='TianGong Data' />,
    },
    { key: 'my', tab: <FormattedMessage id='pages.tab.title.mydata' defaultMessage='My Data' /> },
    { key: 'te', tab: <FormattedMessage id='pages.tab.title.tedata' defaultMessage='TE Data' /> },
  ];

  const databaseList: Record<string, React.ReactNode> = {
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
        <ProTable<UnitGroupTable, ListPagination>
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
              return getUnitGroupTablePgroongaSearch(params, lang, 'my', myKeyWord, {});
            }
            return getUnitGroupTableAll(params, sort, lang, 'my', []);
          }}
          columns={unitGroupColumns}
          rowSelection={{
            type: 'radio',
            alwaysShowAlert: true,
            selectedRowKeys,
            onChange: onSelectChange,
          }}
        />
      </>
    ),
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
        <ProTable<UnitGroupTable, ListPagination>
          actionRef={tgActionRefSelect}
          search={false}
          toolBarRender={() => {
            return [<UnitGroupCreate key={0} lang={lang} actionRef={tgActionRefSelect} />];
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
            if (tgKeyWord.length > 0) {
              return getUnitGroupTablePgroongaSearch(params, lang, 'tg', tgKeyWord, {});
            }
            return getUnitGroupTableAll(params, sort, lang, 'tg', []);
          }}
          columns={unitGroupColumns}
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
            value={teKeyWord}
            onChange={handleTeKeyWordChange}
            onSearch={onTeSearch}
            enterButton
          />
        </Card>
        <ProTable<UnitGroupTable, ListPagination>
          actionRef={teActionRefSelect}
          search={false}
          toolBarRender={() => {
            return [<UnitGroupCreate key={0} lang={lang} actionRef={teActionRefSelect} />];
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
            if (teKeyWord.length > 0) {
              return getUnitGroupTablePgroongaSearch(params, lang, 'te', teKeyWord, {});
            }
            return getUnitGroupTableAll(params, sort, lang, 'te', '');
          }}
          columns={unitGroupColumns}
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

  return (
    <>
      {buttonType === 'icon' ? (
        <Tooltip
          title={
            buttonText ?? <FormattedMessage id='pages.button.select' defaultMessage='Select' />
          }
        >
          <Button shape='circle' icon={<DatabaseOutlined />} size='small' onClick={onSelect} />
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
            id='pages.unitgroup.drawer.title.select'
            defaultMessage='Selete Unit group'
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
              {' '}
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

export default UnitgroupsSelectDrawer;
