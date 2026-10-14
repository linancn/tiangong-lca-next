import DatasetClassificationFilter from '@/components/DatasetClassificationFilter';
import {
  ResponsiveDataListViewport,
  dataListMetadataText,
  dataListTooltipContent,
  dataListPagination,
  dataListTabProps,
  getDataListToolbar,
  orderDataListColumns,
  responsiveDataListTableProps,
} from '@/components/ResponsiveDataList';
import type { DatasetClassificationFilterValue } from '@/services/general/datasetClassification';
import { renderTableSelectionClearAction } from '@/components/TableSelectionAlert';
import { getProcesstypeOfDataSetOptions } from '@/pages/Processes';
import {
  ContentLanguageAwareTableParams,
  DataTabKey,
  getContentLanguageAwareTableParams,
  guardLocaleMaterializedTableRequest,
  syncLocaleMaterializedTableRequestEpochs,
} from '@/services/general/data';
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
  onData?: (data: Array<{ id: string; version: string }>) => void;
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
  const [classification, setClassification] = useState<DatasetClassificationFilterValue[]>([]);
  const contentLanguageParams = getContentLanguageAwareTableParams(lang);
  const currentContentLanguageRef = useRef(contentLanguageParams.contentLanguage);
  const tgRequestEpochRef = useRef(0);
  const coRequestEpochRef = useRef(0);
  const myRequestEpochRef = useRef(0);
  const teRequestEpochRef = useRef(0);
  syncLocaleMaterializedTableRequestEpochs(
    currentContentLanguageRef,
    contentLanguageParams.contentLanguage,
    [tgRequestEpochRef, coRequestEpochRef, myRequestEpochRef, teRequestEpochRef],
  );
  const searchParams = new URLSearchParams(location.search);
  const tid = searchParams.get('tid');
  const tgActionRefSelect = useRef<ActionType>(null);
  const teActionRefSelect = useRef<ActionType>(null); //team data
  const coActionRefSelect = useRef<ActionType>(null);

  const myActionRefSelect = useRef<ActionType>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<DataTabKey>('tg');
  const activeTabKeyRef = useRef(activeTabKey);
  activeTabKeyRef.current = activeTabKey;
  const [tableLoading, setTableLoading] = useState<boolean>(false);
  const onClassificationChange = (value: DatasetClassificationFilterValue[]) => {
    tgRequestEpochRef.current += 1;
    coRequestEpochRef.current += 1;
    myRequestEpochRef.current += 1;
    teRequestEpochRef.current += 1;
    setClassification(value);
    setSelectedRowKeys([]);
    tgActionRefSelect.current?.setPageInfo?.({ current: 1 });
    teActionRefSelect.current?.setPageInfo?.({ current: 1 });
    coActionRefSelect.current?.setPageInfo?.({ current: 1 });
    myActionRefSelect.current?.setPageInfo?.({ current: 1 });
  };

  const tableAlertOptionRender = renderTableSelectionClearAction(
    <FormattedMessage id='pages.searchTable.clearSelection' defaultMessage='Clear selection' />,
  );

  const onTabChange = async (key: string) => {
    setSelectedRowKeys([]);
    setActiveTabKey(key as DataTabKey);
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
          <Tooltip
            key={0}
            placement='topLeft'
            title={dataListTooltipContent(row.name, row.generalComment)}
          >
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
          defaultMessage='Dataset type'
        />
      ),
      dataIndex: 'typeOfDataSet',
      sorter: false,
      search: false,
      render: (_, row) => {
        return dataListMetadataText(getProcesstypeOfDataSetOptions(row.typeOfDataSet));
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

  const databaseList: Record<DataTabKey, React.ReactNode> = {
    tg: (
      <>
        <ResponsiveDataListViewport columns={processColumns}>
          {({ scroll }) => (
            <ProTable<ProcessTable, ContentLanguageAwareTableParams>
              {...responsiveDataListTableProps}
              rowKey={(row) => `${row.id}:${row.version}`}
              scroll={scroll}
              toolbar={getDataListToolbar({
                filter: (
                  <DatasetClassificationFilter
                    datasetKind='process'
                    lang={lang}
                    value={classification}
                    onChange={onClassificationChange}
                  />
                ),
              })}
              actionRef={tgActionRefSelect}
              params={{ ...contentLanguageParams, classification }}
              loading={tableLoading}
              search={false}
              pagination={dataListPagination}
              request={async (
                params: ContentLanguageAwareTableParams & {
                  pageSize?: number;
                  current?: number;
                },
                sort,
              ) => {
                setTableLoading(true);
                const {
                  contentLanguage = contentLanguageParams.contentLanguage,
                  ...requestParams
                } = params;
                return guardLocaleMaterializedTableRequest(
                  contentLanguage,
                  () => currentContentLanguageRef.current,
                  tgRequestEpochRef,
                  async ({ isCurrentRequest }) => {
                    try {
                      return await getConnectableProcessesTable(
                        requestParams,
                        sort,
                        contentLanguage,
                        'tg',
                        tid ?? '',
                        portId,
                        flowVersion,
                      );
                    } finally {
                      if (isCurrentRequest() && activeTabKeyRef.current === 'tg') {
                        setTableLoading(false);
                      }
                    }
                  },
                );
              }}
              columns={orderDataListColumns(processColumns, {
                dataType: (
                  <FormattedMessage id='menu.tgdata.processes' defaultMessage='Processes' />
                ),
              })}
              tableAlertOptionRender={tableAlertOptionRender}
              rowSelection={
                !readOnly && {
                  alwaysShowAlert: true,
                  preserveSelectedRowKeys: true,
                  selectedRowKeys: selectedRowKeys,
                  onChange: onSelectChange,
                }
              }
            />
          )}
        </ResponsiveDataListViewport>
      </>
    ),
    co: (
      <>
        <ResponsiveDataListViewport columns={processColumns}>
          {({ scroll }) => (
            <ProTable<ProcessTable, ContentLanguageAwareTableParams>
              {...responsiveDataListTableProps}
              rowKey={(row) => `${row.id}:${row.version}`}
              scroll={scroll}
              toolbar={getDataListToolbar({
                filter: (
                  <DatasetClassificationFilter
                    datasetKind='process'
                    lang={lang}
                    value={classification}
                    onChange={onClassificationChange}
                  />
                ),
              })}
              actionRef={coActionRefSelect}
              params={{ ...contentLanguageParams, classification }}
              loading={tableLoading}
              search={false}
              pagination={dataListPagination}
              request={async (
                params: ContentLanguageAwareTableParams & {
                  pageSize?: number;
                  current?: number;
                },
                sort,
              ) => {
                setTableLoading(true);
                const {
                  contentLanguage = contentLanguageParams.contentLanguage,
                  ...requestParams
                } = params;
                return guardLocaleMaterializedTableRequest(
                  contentLanguage,
                  () => currentContentLanguageRef.current,
                  coRequestEpochRef,
                  async ({ isCurrentRequest }) => {
                    try {
                      return await getConnectableProcessesTable(
                        requestParams,
                        sort,
                        contentLanguage,
                        'co',
                        tid ?? '',
                        portId,
                        flowVersion,
                      );
                    } finally {
                      if (isCurrentRequest() && activeTabKeyRef.current === 'co') {
                        setTableLoading(false);
                      }
                    }
                  },
                );
              }}
              columns={orderDataListColumns(processColumns, {
                dataType: (
                  <FormattedMessage id='menu.tgdata.processes' defaultMessage='Processes' />
                ),
              })}
              tableAlertOptionRender={tableAlertOptionRender}
              rowSelection={
                !readOnly && {
                  alwaysShowAlert: true,
                  preserveSelectedRowKeys: true,
                  selectedRowKeys: selectedRowKeys,
                  onChange: onSelectChange,
                }
              }
            />
          )}
        </ResponsiveDataListViewport>
      </>
    ),
    my: (
      <>
        <ResponsiveDataListViewport columns={processColumns}>
          {({ scroll }) => (
            <ProTable<ProcessTable, ContentLanguageAwareTableParams>
              {...responsiveDataListTableProps}
              rowKey={(row) => `${row.id}:${row.version}`}
              scroll={scroll}
              toolbar={getDataListToolbar({
                filter: (
                  <DatasetClassificationFilter
                    datasetKind='process'
                    lang={lang}
                    value={classification}
                    onChange={onClassificationChange}
                  />
                ),
              })}
              actionRef={myActionRefSelect}
              params={{ ...contentLanguageParams, classification }}
              loading={tableLoading}
              search={false}
              pagination={dataListPagination}
              request={async (
                params: ContentLanguageAwareTableParams & {
                  pageSize?: number;
                  current?: number;
                },
                sort,
              ) => {
                setTableLoading(true);
                const {
                  contentLanguage = contentLanguageParams.contentLanguage,
                  ...requestParams
                } = params;
                return guardLocaleMaterializedTableRequest(
                  contentLanguage,
                  () => currentContentLanguageRef.current,
                  myRequestEpochRef,
                  async ({ isCurrentRequest }) => {
                    try {
                      return await getConnectableProcessesTable(
                        requestParams,
                        sort,
                        contentLanguage,
                        'my',
                        tid ?? '',
                        portId,
                        flowVersion,
                      );
                    } finally {
                      if (isCurrentRequest() && activeTabKeyRef.current === 'my') {
                        setTableLoading(false);
                      }
                    }
                  },
                );
              }}
              columns={orderDataListColumns(processColumns, {
                dataType: (
                  <FormattedMessage id='menu.tgdata.processes' defaultMessage='Processes' />
                ),
              })}
              tableAlertOptionRender={tableAlertOptionRender}
              rowSelection={
                !readOnly && {
                  alwaysShowAlert: true,
                  preserveSelectedRowKeys: true,
                  selectedRowKeys: selectedRowKeys,
                  onChange: onSelectChange,
                }
              }
            />
          )}
        </ResponsiveDataListViewport>
      </>
    ),
    te: (
      <>
        <ResponsiveDataListViewport columns={processColumns}>
          {({ scroll }) => (
            <ProTable<ProcessTable, ContentLanguageAwareTableParams>
              {...responsiveDataListTableProps}
              rowKey={(row) => `${row.id}:${row.version}`}
              scroll={scroll}
              toolbar={getDataListToolbar({
                filter: (
                  <DatasetClassificationFilter
                    datasetKind='process'
                    lang={lang}
                    value={classification}
                    onChange={onClassificationChange}
                  />
                ),
              })}
              actionRef={teActionRefSelect}
              params={{ ...contentLanguageParams, classification }}
              search={false}
              loading={tableLoading}
              pagination={dataListPagination}
              request={async (
                params: ContentLanguageAwareTableParams & {
                  pageSize?: number;
                  current?: number;
                },
                sort,
              ) => {
                setTableLoading(true);
                const {
                  contentLanguage = contentLanguageParams.contentLanguage,
                  ...requestParams
                } = params;
                return guardLocaleMaterializedTableRequest(
                  contentLanguage,
                  () => currentContentLanguageRef.current,
                  teRequestEpochRef,
                  async ({ isCurrentRequest }) => {
                    try {
                      return await getConnectableProcessesTable(
                        requestParams,
                        sort,
                        contentLanguage,
                        'te',
                        tid ?? '',
                        portId,
                        flowVersion,
                      );
                    } finally {
                      if (isCurrentRequest() && activeTabKeyRef.current === 'te') {
                        setTableLoading(false);
                      }
                    }
                  },
                );
              }}
              columns={orderDataListColumns(processColumns, {
                dataType: (
                  <FormattedMessage id='menu.tgdata.processes' defaultMessage='Processes' />
                ),
              })}
              tableAlertOptionRender={tableAlertOptionRender}
              rowSelection={
                !readOnly && {
                  alwaysShowAlert: true,
                  preserveSelectedRowKeys: true,
                  selectedRowKeys: selectedRowKeys,
                  onChange: onSelectChange,
                }
              }
            />
          )}
        </ResponsiveDataListViewport>
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
        size='90%'
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
        mask={{ closable: true }}
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
          tabProps={dataListTabProps}
          styles={{ body: { padding: 0 } }}
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
