import {
  flow_hybrid_search,
  getFlowTableAll,
  getFlowTablePgroongaSearch,
} from '@/services/flows/api';
import { FlowTable } from '@/services/flows/data';
import { ListPagination } from '@/services/general/data';
import styles from '@/style/custom.less';
import { CloseOutlined, DatabaseOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, Checkbox, Col, Drawer, Input, Row, Space, Tooltip } from 'antd';
import type { SearchProps } from 'antd/es/input/Search';
import type { FC, Key } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import FlowsCreate from '../create';
import FlowsDelete from '../delete';
import FlowsEdit from '../edit';
import { flowTypeOptions } from '../optiondata';
import FlowsView from '../view';

type Props = {
  buttonType: string;
  buttonText?: any;
  lang: string;
  onData: (id: string, version: string) => void;
};

const { Search } = Input;

const FlowsSelectDrawer: FC<Props> = ({ buttonType, buttonText, lang, onData }) => {
  const [tgKeyWord, setTgKeyWord] = useState<any>('');
  const [myKeyWord, setMyKeyWord] = useState<any>('');

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<string>('tg');
  const [openAI, setOpenAI] = useState<boolean>(false);
  // const [dataSource, setDataSource] = useState<any>([]);
  // const [tableLoading, setTableLoading] = useState<boolean>(false);
  const tgActionRefSelect = useRef<ActionType>();
  const myActionRefSelect = useRef<ActionType>();

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
  };

  const onTgSearch: SearchProps['onSearch'] = async (value) => {
    await setTgKeyWord(value);
    tgActionRefSelect.current?.setPageInfo?.({ current: 1 });
    tgActionRefSelect.current?.reload();
  };

  // const onTgSearch: SearchProps['onSearch'] = async (value) => {
  //   setTableLoading(true);
  //   setDataSource(await flow_hybrid_search(value, {}, lang));
  //   setTableLoading(false);
  // };

  const onMySearch: SearchProps['onSearch'] = async (value) => {
    await setMyKeyWord(value);
    myActionRefSelect.current?.setPageInfo?.({ current: 1 });
    myActionRefSelect.current?.reload();
  };

  const handleTgKeyWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTgKeyWord(e.target.value);
  };

  const handleMyKeyWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMyKeyWord(e.target.value);
  };

  const FlowsColumns: ProColumns<FlowTable>[] = [
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
      search: false,
      render: (_, row) => {
        return [
          <Tooltip key={0} placement="topLeft" title={row.synonyms}>
            {row.name}
          </Tooltip>,
        ];
      },
    },
    {
      title: <FormattedMessage id="pages.flow.flowType" defaultMessage="Flow type" />,
      dataIndex: 'flowType',
      sorter: false,
      search: false,
      filters: flowTypeOptions.map((option) => ({ text: option.label, value: option.value })),
      render: (_, row) => {
        const flowType = flowTypeOptions.find((i) => i.value === row.flowType);
        if (flowType) {
          return flowType.label;
        }
        return row.flowType;
      },
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
      title: <FormattedMessage id="pages.flow.CASNumber" defaultMessage="CAS Number" />,
      dataIndex: 'CASNumber',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.version" defaultMessage="Version" />,
      dataIndex: 'version',
      sorter: false,
      search: false,
    },
    // {
    //   title: <FormattedMessage id="pages.table.title.createdAt" defaultMessage="Created At" />,
    //   dataIndex: 'created_at',
    //   valueType: 'dateTime',
    //   sorter: false,
    //   search: false,
    // },
    {
      title: <FormattedMessage id="pages.table.title.option" defaultMessage="Option" />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        if (activeTabKey === 'tg') {
          return [
            <Space size={'small'} key={0}>
              <FlowsView id={row.id} version={row.version} lang={lang} buttonType={'icon'} />
            </Space>,
          ];
        } else if (activeTabKey === 'my') {
          return [
            <Space size={'small'} key={0}>
              <FlowsView id={row.id} version={row.version} lang={lang} buttonType={'icon'} />
              <FlowsEdit
                id={row.id}
                version={row.version}
                buttonType={'icon'}
                lang={lang}
                actionRef={myActionRefSelect}
              />
              <FlowsDelete
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
      tab: <FormattedMessage id="pages.tab.title.tgdata" defaultMessage="TianGong Data" />,
    },
    { key: 'my', tab: <FormattedMessage id="pages.tab.title.mydata" defaultMessage="My Data" /> },
  ];

  const databaseList: Record<string, React.ReactNode> = {
    tg: (
      <>
        <Card>
          <Row align={'middle'}>
            <Col flex="auto" style={{ marginRight: '10px' }}>
              <Search
                name={'tg'}
                size={'large'}
                placeholder={
                  openAI
                    ? intl.formatMessage({ id: 'pages.search.placeholder' })
                    : intl.formatMessage({ id: 'pages.search.keyWord' })
                }
                value={tgKeyWord}
                onChange={handleTgKeyWordChange}
                onSearch={onTgSearch}
                enterButton
              />
            </Col>
            <Col flex="100px">
              <Checkbox
                onChange={(e) => {
                  setOpenAI(e.target.checked);
                }}
              >
                <FormattedMessage id="pages.search.openAI" defaultMessage="AI Search" />
              </Checkbox>
            </Col>
          </Row>
        </Card>
        <ProTable<FlowTable, ListPagination>
          actionRef={tgActionRefSelect}
          // loading={tableLoading}
          search={false}
          pagination={{
            showSizeChanger: false,
            pageSize: 10,
          }}
          // dataSource={dataSource}
          request={async (
            params: {
              pageSize: number;
              current: number;
            },
            sort,
            filter,
          ) => {
            const flowTypeFilter = filter?.flowType ? filter.flowType.join(',') : '';
            if (tgKeyWord.length > 0) {
              if (openAI) {
                return flow_hybrid_search(params, lang, 'tg', tgKeyWord, {
                  flowType: flowTypeFilter,
                });
              }
              return getFlowTablePgroongaSearch(params, lang, 'tg', tgKeyWord, {
                flowType: flowTypeFilter,
              });
            }
            return getFlowTableAll(params, sort, lang, 'tg', { flowType: flowTypeFilter });
          }}
          columns={FlowsColumns}
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
        <ProTable<FlowTable, ListPagination>
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
            filter,
          ) => {
            const flowTypeFilter = filter?.flowType ? filter.flowType.join(',') : '';
            if (myKeyWord.length > 0) {
              return getFlowTablePgroongaSearch(params, lang, 'my', myKeyWord, {
                flowType: flowTypeFilter,
              });
            }
            return getFlowTableAll(params, sort, lang, 'my', { flowType: flowTypeFilter });
          }}
          columns={FlowsColumns}
          toolBarRender={() => {
            return [<FlowsCreate key={0} lang={lang} actionRef={myActionRefSelect} />];
          }}
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
            buttonText ?? <FormattedMessage id="pages.button.select" defaultMessage="Select" />
          }
        >
          <Button shape="circle" icon={<DatabaseOutlined />} size="small" onClick={onSelect} />
        </Tooltip>
      ) : (
        <Button onClick={onSelect}>
          {buttonText ?? <FormattedMessage id="pages.button.select" defaultMessage="Select" />}
        </Button>
      )}
      <Drawer
        title={
          <FormattedMessage id="pages.flow.drawer.title.select" defaultMessage="Selete Flow" />
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
                const keys = selectedRowKeys?.[0]?.toString().split(':');
                onData(keys[0], keys[1]);
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

export default FlowsSelectDrawer;
