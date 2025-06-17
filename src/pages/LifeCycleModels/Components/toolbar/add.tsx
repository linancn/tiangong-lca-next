import ProcessCreate from '@/pages/Processes/Components/create';
import ProcessView from '@/pages/Processes/Components/view';
import { ListPagination } from '@/services/general/data';
import { getProcessTableAll, getProcessTablePgroongaSearch } from '@/services/processes/api';
import { ProcessTable } from '@/services/processes/data';
import styles from '@/style/custom.less';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, Drawer, Input, Space, Tooltip } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC, Key } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';

type Props = {
  buttonType: string;
  lang: string;
  onData: (processes: { id: string; version: string }[]) => void;
};

const { Search } = Input;

const ModelToolbarAdd: FC<Props> = ({ buttonType, lang, onData }) => {
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

  const processColumns: ProColumns<ProcessTable>[] = [
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
      render: (_, row) => {
        return [
          <Tooltip key={0} placement='topLeft' title={row.generalComment}>
            {row.name}
          </Tooltip>,
        ];
      },
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
      title: <FormattedMessage id='pages.process.referenceYear' defaultMessage='Reference year' />,
      dataIndex: 'referenceYear',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id='pages.process.location' defaultMessage='Location' />,
      dataIndex: 'location',
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
      title: <FormattedMessage id='pages.table.title.modifiedAt' defaultMessage='Updated at' />,
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
            <ProcessView
              id={row.id}
              version={row.version}
              buttonType={'icon'}
              lang={lang}
              disabled={false}
            />
          </Space>,
        ];
      },
    },
  ];

  const tabList = [
    {
      key: 'tg',
      tab: <FormattedMessage id='pages.tab.title.tgdata' defaultMessage='TianGong Data' />,
    },
    { key: 'my', tab: <FormattedMessage id='pages.tab.title.mydata' defaultMessage='My Data' /> },
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
        <ProTable<ProcessTable, ListPagination>
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
            let result;
            if (tgKeyWord.length > 0) {
              result = await getProcessTablePgroongaSearch(params, lang, 'tg', tgKeyWord, {});
            } else {
              result = await getProcessTableAll(params, sort, lang, 'tg', []);
            }
            return result || { data: [], success: false };
          }}
          columns={processColumns}
          rowSelection={{
            alwaysShowAlert: true,
            preserveSelectedRowKeys: true,
            selectedRowKeys: selectedRowKeys,
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
        <ProTable<ProcessTable, ListPagination>
          actionRef={myActionRefSelect}
          search={false}
          pagination={{
            showSizeChanger: false,
            pageSize: 10,
          }}
          toolBarRender={() => {
            return [<ProcessCreate key={0} lang={lang} actionRef={myActionRefSelect} />];
          }}
          request={async (
            params: {
              pageSize: number;
              current: number;
            },
            sort,
          ) => {
            let result;
            if (myKeyWord.length > 0) {
              result = await getProcessTablePgroongaSearch(params, lang, 'my', myKeyWord, {});
            } else {
              result = await getProcessTableAll(params, sort, lang, 'my', []);
            }
            return result || { data: [], success: false };
          }}
          columns={processColumns}
          rowSelection={{
            alwaysShowAlert: true,
            preserveSelectedRowKeys: true,
            selectedRowKeys: selectedRowKeys,
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
          title={<FormattedMessage id='pages.button.model.add' defaultMessage='Add node' />}
          placement='left'
        >
          <Button
            type='primary'
            icon={<PlusOutlined />}
            size='small'
            style={{ boxShadow: 'none' }}
            onClick={onSelect}
          />
        </Tooltip>
      ) : (
        <Button onClick={onSelect}>
          <FormattedMessage id='pages.button.model.add' defaultMessage='Add node' />
        </Button>
      )}

      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage
            id='pages.process.drawer.title.addProcess'
            defaultMessage='Add process'
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
                const keys = selectedRowKeys as string[];
                const selectedRowSplit = keys.map((key) => {
                  const [id, version] = key.split(':');
                  return { id, version };
                });
                onData(selectedRowSplit);
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

export default ModelToolbarAdd;
