import ReferenceUnit from '@/pages/Unitgroups/Components/Unit/reference';
import {
  getFlowpropertyTableAll,
  getFlowpropertyTablePgroongaSearch,
} from '@/services/flowproperties/api';
import { FlowpropertyTable } from '@/services/flowproperties/data';
import { ListPagination } from '@/services/general/data';
import styles from '@/style/custom.less';
import { CloseOutlined, DatabaseOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-table';
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
  onData: (rowKey: any) => void;
};

const { Search } = Input;

const FlowpropertiesSelectDrawer: FC<Props> = ({ buttonType, lang, onData }) => {
  const [tgKeyWord, setTgKeyWord] = useState<any>('');
  const [myKeyWord, setMyKeyWord] = useState<any>('');

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<string>('tg');
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
      search: false,
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
        <FormattedMessage
          id="pages.flowproperty.referenceToReferenceUnitGroup"
          defaultMessage="Reference unit"
        />
      ),
      dataIndex: 'refUnitGroup',
      sorter: false,
      search: false,
      render: (_, row) => {
        return [<ReferenceUnit key={0} id={row.refUnitGroupId} idType={'unitgroup'} lang={lang} />];
      },
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
              return getFlowpropertyTablePgroongaSearch(params, lang, 'tg', tgKeyWord, {});
            }
            return getFlowpropertyTableAll(params, sort, lang, 'tg');
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
              return getFlowpropertyTablePgroongaSearch(params, lang, 'my', myKeyWord, {});
            }
            return getFlowpropertyTableAll(params, sort, lang, 'my');
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
        <Tooltip title={<FormattedMessage id="pages.button.select" defaultMessage="Select" />}>
          <Button shape="circle" icon={<DatabaseOutlined />} size="small" onClick={onSelect} />
        </Tooltip>
      ) : (
        <Button onClick={onSelect}>
          <FormattedMessage id="pages.button.select" defaultMessage="Select" />
        </Button>
      )}

      <Drawer
        title={
          <FormattedMessage
            id="pages.flowproperty.drawer.title.select"
            defaultMessage="Selete Flow property"
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
