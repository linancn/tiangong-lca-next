import { getProcesstypeOfDataSetOptions } from '@/pages/Processes';
import { ListPagination } from '@/services/general/data';
import { getConnectableProcessesTable } from '@/services/processes/api';
import { ProcessTable } from '@/services/processes/data';
import styles from '@/style/custom.less';
import { CloseOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, Drawer, Space, Tooltip } from 'antd';
import type { FC, Key } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  portId: string; //direction:flowId
  flowVersion: string;
  lang: string;
  drawerVisible?: boolean;
  setDrawerVisible?: (visible: boolean) => void;
  onData?: (data: any) => void;
  readOnly?: boolean;
};

const ConnectableProcesses: FC<Props> = ({
  portId,
  lang,
  flowVersion,
  drawerVisible,
  setDrawerVisible = () => {},
  onData = () => {},
  readOnly = false,
}) => {
  const searchParams = new URLSearchParams(location.search);
  const tid = searchParams.get('tid');
  const tgActionRefSelect = useRef<ActionType>(null);
  const teActionRefSelect = useRef<ActionType>(null); //team data
  const coActionRefSelect = useRef<ActionType>(null);

  const myActionRefSelect = useRef<ActionType>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<string>('tg');
  const [tableLoading, setTableLoading] = useState<boolean>(false);

  const onTabChange = async (key: string) => {
    setActiveTabKey(key);
  };

  useEffect(() => {
    if (!drawerVisible) return;
    setSelectedRowKeys([]);
    if (activeTabKey === 'tg') {
      tgActionRefSelect.current?.setPageInfo?.({ current: 1 });
      tgActionRefSelect.current?.reload();
    }
    if (activeTabKey === 'co') {
      coActionRefSelect.current?.setPageInfo?.({ current: 1 });
      coActionRefSelect.current?.reload();
    }
    if (activeTabKey === 'te') {
      teActionRefSelect.current?.setPageInfo?.({ current: 1 });
      teActionRefSelect.current?.reload();
    }
    if (activeTabKey === 'my') {
      myActionRefSelect.current?.setPageInfo?.({ current: 1 });
      myActionRefSelect.current?.reload();
    }
  }, [drawerVisible, activeTabKey]);

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
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
      sorter: true,
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
      sorter: true,
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.view.modellingAndValidation.typeOfDataSet'
          defaultMessage='Type of data set'
        />
      ),
      dataIndex: 'typeOfDataSet',
      sorter: false,
      search: false,
      render: (_, row) => {
        return getProcesstypeOfDataSetOptions(row.typeOfDataSet);
      },
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
      title: <FormattedMessage id='pages.table.title.updatedAt' defaultMessage='Updated at' />,
      dataIndex: 'modifiedAt',
      valueType: 'dateTime',
      sorter: false,
      search: false,
    },
  ];

  const tabList = [
    {
      key: 'tg',
      tab: <FormattedMessage id='pages.tab.title.tgdata' defaultMessage='TianGong Data' />,
    },
    { key: 'co', tab: <FormattedMessage id='pages.tab.title.co' defaultMessage='Business Data' /> },
    { key: 'my', tab: <FormattedMessage id='pages.tab.title.mydata' defaultMessage='My Data' /> },
    { key: 'te', tab: <FormattedMessage id='pages.tab.title.tedata' defaultMessage='Team Data' /> },
  ];

  const databaseList: Record<string, React.ReactNode> = {
    tg: (
      <>
        <ProTable<ProcessTable, ListPagination>
          actionRef={tgActionRefSelect}
          loading={tableLoading}
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
            setTableLoading(true);
            const data = await getConnectableProcessesTable(
              params,
              sort,
              lang,
              'tg',
              tid ?? '',
              portId,
              flowVersion,
            );
            setTableLoading(false);
            return data;
          }}
          columns={processColumns}
          rowSelection={
            !readOnly && {
              alwaysShowAlert: true,
              preserveSelectedRowKeys: true,
              selectedRowKeys: selectedRowKeys,
              onChange: onSelectChange,
            }
          }
        />
      </>
    ),
    co: (
      <>
        <ProTable<ProcessTable, ListPagination>
          actionRef={coActionRefSelect}
          loading={tableLoading}
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
            setTableLoading(true);
            const data = await getConnectableProcessesTable(
              params,
              sort,
              lang,
              'co',
              tid ?? '',
              portId,
              flowVersion,
            );
            setTableLoading(false);
            return data;
          }}
          columns={processColumns}
          rowSelection={
            !readOnly && {
              alwaysShowAlert: true,
              preserveSelectedRowKeys: true,
              selectedRowKeys: selectedRowKeys,
              onChange: onSelectChange,
            }
          }
        />
      </>
    ),
    my: (
      <>
        <ProTable<ProcessTable, ListPagination>
          actionRef={myActionRefSelect}
          loading={tableLoading}
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
            setTableLoading(true);
            const data = await getConnectableProcessesTable(
              params,
              sort,
              lang,
              'my',
              tid ?? '',
              portId,
              flowVersion,
            );
            setTableLoading(false);
            return data;
          }}
          columns={processColumns}
          rowSelection={
            !readOnly && {
              alwaysShowAlert: true,
              preserveSelectedRowKeys: true,
              selectedRowKeys: selectedRowKeys,
              onChange: onSelectChange,
            }
          }
        />
      </>
    ),
    te: (
      <>
        <ProTable<ProcessTable, ListPagination>
          actionRef={teActionRefSelect}
          search={false}
          loading={tableLoading}
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
            setTableLoading(true);
            const data = await getConnectableProcessesTable(
              params,
              sort,
              lang,
              'te',
              tid ?? '',
              portId,
              flowVersion,
            );
            setTableLoading(false);
            return data;
          }}
          columns={processColumns}
          rowSelection={
            !readOnly && {
              alwaysShowAlert: true,
              preserveSelectedRowKeys: true,
              selectedRowKeys: selectedRowKeys,
              onChange: onSelectChange,
            }
          }
        />
      </>
    ),
  };

  return (
    <>
      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage
            id='component.connectableProcesses.title'
            defaultMessage='Connectable Processes'
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
        maskClosable={true}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        footer={
          !readOnly && (
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
          )
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

export default ConnectableProcesses;
