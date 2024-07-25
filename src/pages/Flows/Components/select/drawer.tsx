import { flow_hybrid_search, getFlowTableAll } from '@/services/flows/api';
import { FlowTable } from '@/services/flows/data';
import { ListPagination } from '@/services/general/data';
import styles from '@/style/custom.less';
import { CloseOutlined, DatabaseOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-table';
import { Button, Card, Drawer, Input, Space, Tooltip } from 'antd';
import type { SearchProps } from 'antd/es/input/Search';
import type { FC, Key } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import FlowsCreate from '../create';
import FlowsDelete from '../delete';
import FlowsEdit from '../edit';
import FlowsView from '../view';

type Props = {
  buttonType: string;
  lang: string;
  onData: (rowKey: any) => void;
};

const FlowsSelectDrawer: FC<Props> = ({ buttonType, lang, onData }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<string>('tg');
  const [dataSource, setDataSource] = useState<any>([]);
  const [tableLoading, setTableLoading] = useState<boolean>(false);
  const tgActionRefSelect = useRef<ActionType>();
  const myActionRefSelect = useRef<ActionType>();

  const intl = useIntl();

  const { Search } = Input;

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

  const FlowsColumns: ProColumns<FlowTable>[] = [
    {
      title: <FormattedMessage id="pages.table.title.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.name" defaultMessage="Base Name" />,
      dataIndex: 'baseName',
      sorter: false,
      search: false,
      render: (_, row) => [
        <Tooltip key={0} placement="topLeft" title={row.generalComment}>
          {row.baseName}
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
      title: <FormattedMessage id="pages.flow.dataType" defaultMessage="Data Type" />,
      dataIndex: 'dataType',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.flow.CASNumber" defaultMessage="CAS Number" />,
      dataIndex: 'CASNumber',
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
              <FlowsView id={row.id} lang={lang} buttonType={'icon'} />
            </Space>,
          ];
        } else if (activeTabKey === 'my') {
          return [
            <Space size={'small'} key={0}>
              <FlowsView id={row.id} lang={lang} buttonType={'icon'} />
              <FlowsEdit
                id={row.id}
                buttonType={'icon'}
                lang={lang}
                actionRef={myActionRefSelect}
              />
              <FlowsDelete
                id={row.id}
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

  const onSearch: SearchProps['onSearch'] = async (value) => {
    setTableLoading(true);
    setDataSource(await flow_hybrid_search(value, {}, lang));
    setTableLoading(false);
  };

  const databaseList: Record<string, React.ReactNode> = {
    tg: (
      <>
        <Card>
          <Search
            size={'large'}
            placeholder={intl.formatMessage({ id: 'pages.search.placeholder' })}
            onSearch={onSearch}
            enterButton
          />
        </Card>
        <ProTable<FlowTable, ListPagination>
          actionRef={tgActionRefSelect}
          loading={tableLoading}
          search={false}
          pagination={{
            showSizeChanger: false,
            pageSize: 10000,
          }}
          dataSource={dataSource}
          // request={async (
          //   params: {
          //     pageSize: number;
          //     current: number;
          //   },
          //   sort,
          // ) => {
          //   return getFlowTable(params, sort, lang, 'tg');
          // }}
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
      <ProTable<FlowTable, ListPagination>
        actionRef={myActionRefSelect}
        search={{
          defaultCollapsed: false,
        }}
        toolBarRender={() => {
          return [<FlowsCreate key={0} lang={lang} actionRef={myActionRefSelect} />];
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
          return getFlowTableAll(params, sort, lang, 'my');
        }}
        columns={FlowsColumns}
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
        <Tooltip title={<FormattedMessage id="pages.button.select" defaultMessage="Select" />}>
          <Button shape="circle" icon={<DatabaseOutlined />} size="small" onClick={onSelect} />
        </Tooltip>
      ) : (
        <Button onClick={onSelect}>
          <FormattedMessage id="pages.button.select" defaultMessage="select" />
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

export default FlowsSelectDrawer;
