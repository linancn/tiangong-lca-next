import FlowsView from '@/pages/Flows/Components/view';
import {
  flow_hybrid_search,
  getFlowTableAll,
  getFlowTablePgroongaSearch,
} from '@/services/flows/api';
import { FlowTable } from '@/services/flows/data';
import { ListPagination } from '@/services/general/data';
import styles from '@/style/custom.less';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, Checkbox, Col, Drawer, Input, Row, Space, Tooltip } from 'antd';
import type { SearchProps } from 'antd/es/input/Search';
import type { FC, Key } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';

type Props = {
  buttonType: string;
  lang: string;
  onData: (rowKey: any) => void;
};

const { Search } = Input;

const ModelToolbarAddThroughFlow: FC<Props> = ({ buttonType, lang, onData }) => {
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
      title: <FormattedMessage id="pages.table.title.name" defaultMessage="Base name" />,
      dataIndex: 'name',
      sorter: false,
      search: false,
      render: (_, row) => [
        <Tooltip key={0} placement="topLeft" title={row.synonyms}>
          {row.name}
        </Tooltip>,
      ],
    },
    {
      title: <FormattedMessage id="pages.flow.flowType" defaultMessage="Flow type" />,
      dataIndex: 'flowType',
      sorter: false,
      search: false,
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
      title: <FormattedMessage id="pages.table.title.createdAt" defaultMessage="Created at" />,
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
            <FlowsView id={row.id} version={row.version} lang={lang} buttonType={'icon'} />
          </Space>,
        ];
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
          ) => {
            if (tgKeyWord.length > 0) {
              if (openAI) {
                return flow_hybrid_search(params, lang, 'tg', tgKeyWord, {});
              }
              return getFlowTablePgroongaSearch(params, lang, 'tg', tgKeyWord, {});
            }
            return getFlowTableAll(params, sort, lang, 'tg', []);
          }}
          columns={FlowsColumns}
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
          ) => {
            if (myKeyWord.length > 0) {
              return getFlowTablePgroongaSearch(params, lang, 'my', myKeyWord, {});
            }
            return getFlowTableAll(params, sort, lang, 'my', []);
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
  };

  useEffect(() => {
    if (!drawerVisible) return;
    setSelectedRowKeys([]);
  }, [drawerVisible]);

  return (
    <>
      {buttonType === 'icon' ? (
        <Tooltip
          title={<FormattedMessage id="pages.button.model.add" defaultMessage="Add node" />}
          placement="left"
        >
          <Button
            shape="circle"
            icon={<PlusOutlined />}
            size="small"
            style={{ boxShadow: 'none' }}
            onClick={onSelect}
          />
        </Tooltip>
      ) : (
        <Button onClick={onSelect}>
          <FormattedMessage id="pages.button.model.add" defaultMessage="Add node" />
        </Button>
      )}

      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage id="pages.flow.drawer.title.select" defaultMessage="Selete flow" />
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

export default ModelToolbarAddThroughFlow;
