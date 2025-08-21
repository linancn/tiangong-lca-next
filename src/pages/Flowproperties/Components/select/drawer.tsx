// import ReferenceUnit from '@/pages/Unitgroups/Components/Unit/reference';
import {
  getFlowpropertyTableAll,
  getFlowpropertyTablePgroongaSearch,
} from '@/services/flowproperties/api';
import { FlowpropertyTable } from '@/services/flowproperties/data';
import { ListPagination } from '@/services/general/data';
import { getLangText, getUnitData } from '@/services/general/util';
import styles from '@/style/custom.less';
import { CloseOutlined, DatabaseOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, Drawer, Input, Space, Tooltip } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC, Key } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import FlowpropertiesCreate from '../create';
import FlowpropertiesDelete from '../delete';
import FlowpropertiesEdit from '../edit';
import FlowpropertyView from '../view';

type Props = {
  buttonType: string;
  lang: string;
  onData: (rowKey: string, version: string) => void;
  buttonText?: any;
};

const { Search } = Input;

const FlowpropertiesSelectDrawer: FC<Props> = ({ buttonType, lang, onData, buttonText }) => {
  const [tgKeyWord, setTgKeyWord] = useState<any>('');
  const [coKeyWord, setCoKeyWord] = useState<any>('');
  const [myKeyWord, setMyKeyWord] = useState<any>('');
  const [teKeyWord, setTeKeyWord] = useState<any>('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<string>('tg');
  const tgActionRefSelect = useRef<ActionType>();
  const coActionRefSelect = useRef<ActionType>();
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
    if (key === 'co') {
      coActionRefSelect.current?.setPageInfo?.({ current: 1 });
      coActionRefSelect.current?.reload();
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

  const onCoSearch: SearchProps['onSearch'] = async (value) => {
    await setCoKeyWord(value);
    coActionRefSelect.current?.setPageInfo?.({ current: 1 });
    coActionRefSelect.current?.reload();
  };

  const onTeSearch: SearchProps['onSearch'] = async (value) => {
    await setTeKeyWord(value);
    teActionRefSelect.current?.setPageInfo?.({ current: 1 });
    teActionRefSelect.current?.reload();
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

  const handleTeKeyWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTeKeyWord(e.target.value);
  };

  const FlowpropertyColumns: ProColumns<FlowpropertyTable>[] = [
    {
      title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id='pages.table.title.name' defaultMessage='Name' />,
      dataIndex: 'name',
      sorter: false,
      search: false,
      render: (_, row) => [
        <Tooltip key={0} placement='topLeft' title={row.generalComment}>
          {row.name}
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
      title: (
        <FormattedMessage
          id='pages.flowproperty.referenceToReferenceUnitGroup'
          defaultMessage='Reference unit'
        />
      ),
      dataIndex: 'refUnitGroup',
      sorter: false,
      search: false,
      render: (_, row) => {
        return [
          // <ReferenceUnit
          //   key={0}
          //   id={row.refUnitGroupId}
          //   version={row.version}
          //   idType={'unitgroup'}
          //   lang={lang}
          // />,
          <span key={1}>
            {getLangText(row.refUnitRes?.name, lang)} (
            <Tooltip
              placement='topLeft'
              title={getLangText(row.refUnitRes?.refUnitGeneralComment, lang)}
            >
              {row.refUnitRes?.refUnitName}
            </Tooltip>
            )
          </span>,
        ];
      },
    },
    {
      title: <FormattedMessage id='pages.table.title.createdAt' defaultMessage='Created at' />,
      dataIndex: 'created_at',
      valueType: 'dateTime',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id='pages.table.title.option' defaultMessage='Option' />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        if (activeTabKey === 'tg') {
          return [
            <Space size={'small'} key={0}>
              <FlowpropertyView lang={lang} buttonType={'icon'} id={row.id} version={row.version} />
            </Space>,
          ];
        } else if (activeTabKey === 'my') {
          return [
            <Space size={'small'} key={0}>
              <FlowpropertyView lang={lang} buttonType={'icon'} id={row.id} version={row.version} />
              <FlowpropertiesEdit
                lang={lang}
                id={row.id}
                version={row.version}
                buttonType={'icon'}
                actionRef={myActionRefSelect}
              />
              <FlowpropertiesDelete
                id={row.id}
                version={row.version}
                buttonType={'icon'}
                actionRef={myActionRefSelect}
                setViewDrawerVisible={() => {}}
              />
            </Space>,
          ];
        } else return [];
      },
    },
  ];

  const tabList = [
    {
      key: 'tg',
      tab: <FormattedMessage id='pages.tab.title.tgdata' defaultMessage='TianGong Data' />,
    },
    { key: 'co', tab: <FormattedMessage id='pages.tab.title.co' defaultMessage='Business Data' /> },
    { key: 'my', tab: <FormattedMessage id='pages.tab.title.mydata' defaultMessage='My Data' /> },
    { key: 'te', tab: <FormattedMessage id='pages.tab.title.tedata' defaultMessage='TE Data' /> },
  ];

  const databaseList: Record<string, React.ReactNode> = {
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
        <ProTable<FlowpropertyTable, ListPagination>
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
              return getFlowpropertyTablePgroongaSearch(params, lang, 'tg', tgKeyWord, {}).then(
                (res) => {
                  return getUnitData('unitgroup', res?.data).then((unitRes: any) => {
                    return {
                      ...res,
                      data: unitRes,
                      success: true,
                    };
                  });
                },
              );
            }
            return getFlowpropertyTableAll(params, sort, lang, 'tg', []).then((res: any) => {
              return getUnitData('unitgroup', res?.data).then((unitRes: any) => {
                return {
                  ...res,
                  data: unitRes,
                  success: true,
                };
              });
            });
          }}
          columns={FlowpropertyColumns}
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
        <ProTable<FlowpropertyTable, ListPagination>
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
              return getFlowpropertyTablePgroongaSearch(params, lang, 'co', coKeyWord, {}).then(
                (res) => {
                  return getUnitData('unitgroup', res?.data).then((unitRes: any) => {
                    return {
                      ...res,
                      data: unitRes,
                      success: true,
                    };
                  });
                },
              );
            }
            return getFlowpropertyTableAll(params, sort, lang, 'co', []).then((res: any) => {
              return getUnitData('unitgroup', res?.data).then((unitRes: any) => {
                return {
                  ...res,
                  data: unitRes,
                  success: true,
                };
              });
            });
          }}
          columns={FlowpropertyColumns}
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
        <ProTable<FlowpropertyTable, ListPagination>
          actionRef={teActionRefSelect}
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
            if (teKeyWord.length > 0) {
              return getFlowpropertyTablePgroongaSearch(params, lang, 'te', teKeyWord, {}).then(
                (res) => {
                  return getUnitData('unitgroup', res?.data).then((unitRes: any) => {
                    return {
                      ...res,
                      data: unitRes,
                      success: true,
                    };
                  });
                },
              );
            }
            return getFlowpropertyTableAll(params, sort, lang, 'te', []).then((res: any) => {
              return getUnitData('unitgroup', res?.data).then((unitRes: any) => {
                return {
                  ...res,
                  data: unitRes,
                  success: true,
                };
              });
            });
          }}
          columns={FlowpropertyColumns}
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
        <ProTable<FlowpropertyTable, ListPagination>
          actionRef={myActionRefSelect}
          search={false}
          toolBarRender={() => {
            return [<FlowpropertiesCreate lang={lang} key={0} actionRef={myActionRefSelect} />];
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
            if (myKeyWord.length > 0) {
              return getFlowpropertyTablePgroongaSearch(params, lang, 'my', myKeyWord, {}).then(
                (res) => {
                  return getUnitData('unitgroup', res?.data).then((unitRes: any) => {
                    return {
                      ...res,
                      data: unitRes,
                      success: true,
                    };
                  });
                },
              );
            }
            return getFlowpropertyTableAll(params, sort, lang, 'my', []).then((res: any) => {
              return getUnitData('unitgroup', res?.data).then((unitRes: any) => {
                return {
                  ...res,
                  data: unitRes,
                  success: true,
                };
              });
            });
          }}
          columns={FlowpropertyColumns}
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
        <Tooltip title={<FormattedMessage id='pages.button.select' defaultMessage='Select' />}>
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
            id='pages.flowproperty.drawer.title.select'
            defaultMessage='Selete Flow property'
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

export default FlowpropertiesSelectDrawer;
