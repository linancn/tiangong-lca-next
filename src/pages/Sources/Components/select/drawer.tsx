import DatasetClassificationFilter from '@/components/DatasetClassificationFilter';
import { useSubmittedDatasetSearch } from '@/pages/Utils/useSubmittedDatasetSearch';
import {
  ResponsiveDataListViewport,
  dataListPagination,
  dataListTabProps,
  getDataListToolbar,
  orderDataListColumns,
  responsiveDataListTableProps,
} from '@/components/ResponsiveDataList';
import type { DatasetClassificationFilterValue } from '@/services/general/datasetClassification';
import AllVersionsList from '@/components/AllVersions';
import { renderTableSelectionClearAction } from '@/components/TableSelectionAlert';
import {
  getContentLanguageAwareTableParams,
  guardLocaleMaterializedTableRequest,
  syncLocaleMaterializedTableRequestEpochs,
  type ContentLanguageAwareTableParams,
  type DataTabKey,
} from '@/services/general/data';
import { getSourceTableAll, source_hybrid_search } from '@/services/sources/api';
import { SourceTable } from '@/services/sources/data';
import styles from '@/style/custom.less';
import { CloseOutlined, DatabaseOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, Drawer, Input, Space, Tooltip } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC, Key, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { getAllVersionsColumns } from '../../../Utils';
import SourceCreate from '../create';
import { default as SourceView } from '../view';

type Props = {
  buttonType: string;
  buttonText?: ReactNode;
  lang: string;
  onData: (rowKey: string, version: string) => void;
  type?: 'reviewReport';
};

const { Search } = Input;

const SourceSelectDrawer: FC<Props> = ({ buttonType, buttonText, lang, onData, type }) => {
  const [tgKeyWord, setTgKeyWord] = useState<string>('');
  const tgSearch = useSubmittedDatasetSearch('smart');
  const [coKeyWord, setCoKeyWord] = useState<string>('');
  const coSearch = useSubmittedDatasetSearch('smart');
  const [myKeyWord, setMyKeyWord] = useState<string>('');
  const mySearch = useSubmittedDatasetSearch('smart');
  const [teKeyWord, setTeKeyWord] = useState<string>('');
  const teSearch = useSubmittedDatasetSearch('smart');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<DataTabKey>(
    type === 'reviewReport' ? 'my' : 'tg',
  );
  const tgActionRefSelect = useRef<ActionType | undefined>(undefined);
  const coActionRefSelect = useRef<ActionType | undefined>(undefined);
  const myActionRefSelect = useRef<ActionType | undefined>(undefined);
  const teActionRefSelect = useRef<ActionType | undefined>(undefined);

  const intl = useIntl();
  const [classification, setClassification] = useState<DatasetClassificationFilterValue[]>([]);
  const contentLanguageAwareTableParams = getContentLanguageAwareTableParams(lang);
  const currentContentLanguageRef = useRef(contentLanguageAwareTableParams.contentLanguage);
  const myRequestEpochRef = useRef(0);
  const tgRequestEpochRef = useRef(0);
  const coRequestEpochRef = useRef(0);
  const teRequestEpochRef = useRef(0);
  syncLocaleMaterializedTableRequestEpochs(
    currentContentLanguageRef,
    contentLanguageAwareTableParams.contentLanguage,
    [myRequestEpochRef, tgRequestEpochRef, coRequestEpochRef, teRequestEpochRef],
  );
  const onClassificationChange = (value: DatasetClassificationFilterValue[]) => {
    myRequestEpochRef.current += 1;
    tgRequestEpochRef.current += 1;
    coRequestEpochRef.current += 1;
    teRequestEpochRef.current += 1;
    setClassification(value);
    setSelectedRowKeys([]);
    tgActionRefSelect.current?.setPageInfo?.({ current: 1 });
    coActionRefSelect.current?.setPageInfo?.({ current: 1 });
    myActionRefSelect.current?.setPageInfo?.({ current: 1 });
    teActionRefSelect.current?.setPageInfo?.({ current: 1 });
  };

  const tableAlertOptionRender = renderTableSelectionClearAction(
    <FormattedMessage id='pages.searchTable.clearSelection' defaultMessage='Clear selection' />,
  );
  const sourceAllVersionsSearchColumn = `
    id,
    json->sourceDataSet->sourceInformation->dataSetInformation->"common:shortName",
    json->sourceDataSet->sourceInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
    json->sourceDataSet->sourceInformation->dataSetInformation->>sourceCitation,
    json->sourceDataSet->sourceInformation->dataSetInformation->>publicationType,
    version,
    modified_at,
    team_id,
    state_code
  `;

  const onSelect = () => {
    setDrawerVisible(true);
  };

  const onSelectChange = (newSelectedRowKeys: Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const onSelectVersion = (row: SourceTable) => {
    if (!row.id || !row.version) {
      return;
    }

    onData(row.id, row.version);
    setDrawerVisible(false);
  };

  const renderVersionSelectActions = (row: SourceTable) => {
    return <SourceView id={row.id} version={row.version} lang={lang} buttonType='icon' />;
  };

  const onTabChange = async (key: string) => {
    setSelectedRowKeys([]);
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
      teActionRefSelect.current?.setPageInfo?.({ current: 1 });
      teActionRefSelect.current?.reload();
    }
  };

  const onTgSearch: SearchProps['onSearch'] = (value) => {
    tgSearch.submitSearch(value);
    tgRequestEpochRef.current += 1;
    setSelectedRowKeys([]);
    setTgKeyWord(value);
    tgActionRefSelect.current?.setPageInfo?.({ current: 1 });
    tgActionRefSelect.current?.reload();
  };

  const onCoSearch: SearchProps['onSearch'] = (value) => {
    coSearch.submitSearch(value);
    coRequestEpochRef.current += 1;
    setSelectedRowKeys([]);
    setCoKeyWord(value);
    coActionRefSelect.current?.setPageInfo?.({ current: 1 });
    coActionRefSelect.current?.reload();
  };

  const onTeSearch: SearchProps['onSearch'] = (value) => {
    teSearch.submitSearch(value);
    teRequestEpochRef.current += 1;
    setSelectedRowKeys([]);
    setTeKeyWord(value);
    teActionRefSelect.current?.setPageInfo?.({ current: 1 });
    teActionRefSelect.current?.reload();
  };

  const onMySearch: SearchProps['onSearch'] = (value) => {
    mySearch.submitSearch(value);
    myRequestEpochRef.current += 1;
    setSelectedRowKeys([]);
    setMyKeyWord(value);
    myActionRefSelect.current?.setPageInfo?.({ current: 1 });
    myActionRefSelect.current?.reload();
  };

  const handleTgKeyWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTgKeyWord(e.target.value);
  };

  const handleCoKeyWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCoKeyWord(e.target.value);
  };

  const handleTeKeyWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTeKeyWord(e.target.value);
  };

  const handleMyKeyWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMyKeyWord(e.target.value);
  };

  const sourceColumns: ProColumns<SourceTable>[] = [
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
        <FormattedMessage id='pages.source.publicationType' defaultMessage='Publication type' />
      ),
      dataIndex: 'publicationType',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id='pages.table.title.version' defaultMessage='Version' />,
      dataIndex: 'version',
      sorter: false,
      search: false,
      render: (_, row) => {
        return (
          <Space size='small'>
            {row.version}
            <AllVersionsList
              lang={lang}
              dataSource={activeTabKey}
              searchTableName='sources'
              columns={getAllVersionsColumns(sourceColumns, 4)}
              searchColume={sourceAllVersionsSearchColumn}
              id={row.id}
              addVersionComponent={() => <></>}
              operationRender={(versionRow) =>
                renderVersionSelectActions(versionRow as SourceTable)
              }
              operationColumnWidth={88}
              onSelectVersion={(versionRow) => onSelectVersion(versionRow as SourceTable)}
            />
          </Space>
        );
      },
    },
    {
      title: <FormattedMessage id='pages.table.title.updatedAt' defaultMessage='Updated at' />,
      dataIndex: 'modifiedAt',
      valueType: 'dateTime',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id='pages.table.title.option' defaultMessage='Actions' />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        return [
          <SourceView key={0} id={row.id} version={row.version} lang={lang} buttonType='icon' />,
        ];
        //  if (activeTabKey === 'tg') {
        //      <Space size={'small'} key={0}>
        //       <SourceView
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
        //       <SourceView
        //         id={row.id}
        //         lang={lang}
        //         dataSource="my"
        //         buttonType="icon"
        //       />
        //        <SourceEdit
        //         id={row.id}
        //         lang={lang}
        //         buttonType={'icon'}
        //         actionRef={myActionRefSelect}
        //         setViewDrawerVisible={() => {}}
        //       />
        //       <SourceDelete
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
  const baseTabList = [
    {
      key: 'tg',
      tab: <FormattedMessage id='pages.tab.title.tgdata' defaultMessage='TianGong Data' />,
    },
    { key: 'co', tab: <FormattedMessage id='pages.tab.title.co' defaultMessage='Business Data' /> },
    { key: 'my', tab: <FormattedMessage id='pages.tab.title.mydata' defaultMessage='My Data' /> },
    { key: 'te', tab: <FormattedMessage id='pages.tab.title.tedata' defaultMessage='Team Data' /> },
  ];
  const tabList = type === 'reviewReport' ? baseTabList.slice(2) : baseTabList;

  const databaseList: Record<DataTabKey, React.ReactNode> = {
    my: (
      <>
        <ResponsiveDataListViewport columns={sourceColumns}>
          {({ scroll }) => (
            <ProTable<SourceTable, ContentLanguageAwareTableParams>
              {...responsiveDataListTableProps}
              rowKey={(row) => `${row.id}:${row.version}`}
              scroll={scroll}
              toolbar={getDataListToolbar({
                search: (
                  <Search
                    name={'my'}
                    placeholder={intl.formatMessage({ id: 'pages.search.keyWord' })}
                    value={myKeyWord}
                    onChange={handleMyKeyWordChange}
                    onSearch={onMySearch}
                    enterButton
                  />
                ),
                filter: (
                  <Space wrap>
                    <DatasetClassificationFilter
                      datasetKind='source'
                      lang={lang}
                      value={classification}
                      onChange={onClassificationChange}
                    />
                  </Space>
                ),
              })}
              className='responsive-data-list-table tg-dataset-selector-table'
              actionRef={myActionRefSelect}
              params={{ ...contentLanguageAwareTableParams, classification }}
              search={false}
              pagination={dataListPagination}
              toolBarRender={() => {
                return [<SourceCreate lang={lang} key={0} actionRef={myActionRefSelect} />];
              }}
              request={async (
                params: ContentLanguageAwareTableParams & {
                  pageSize?: number;
                  current?: number;
                },
                sort,
              ) =>
                guardLocaleMaterializedTableRequest(
                  params.contentLanguage,
                  () => currentContentLanguageRef.current,
                  myRequestEpochRef,
                  async () => {
                    const submittedKeyword = mySearch.submittedRef.current.keyword;
                    if (submittedKeyword.length > 0) {
                      return source_hybrid_search(
                        params,
                        params.contentLanguage,
                        'my',
                        submittedKeyword,
                        {},
                        type === 'reviewReport' ? 0 : undefined,
                      );
                    }
                    return getSourceTableAll(
                      params,
                      sort,
                      params.contentLanguage,
                      'my',
                      [],
                      type === 'reviewReport' ? 0 : undefined,
                    );
                  },
                )
              }
              columns={orderDataListColumns(sourceColumns, {
                dataType: <FormattedMessage id='menu.tgdata.sources' defaultMessage='Sources' />,
              })}
              tableAlertOptionRender={tableAlertOptionRender}
              rowSelection={{
                type: 'radio',
                alwaysShowAlert: true,
                selectedRowKeys,
                onChange: onSelectChange,
              }}
            />
          )}
        </ResponsiveDataListViewport>
      </>
    ),
    tg: (
      <>
        <ResponsiveDataListViewport columns={sourceColumns}>
          {({ scroll }) => (
            <ProTable<SourceTable, ContentLanguageAwareTableParams>
              {...responsiveDataListTableProps}
              rowKey={(row) => `${row.id}:${row.version}`}
              scroll={scroll}
              toolbar={getDataListToolbar({
                search: (
                  <Search
                    name={'tg'}
                    placeholder={intl.formatMessage({ id: 'pages.search.keyWord' })}
                    value={tgKeyWord}
                    onChange={handleTgKeyWordChange}
                    onSearch={onTgSearch}
                    enterButton
                  />
                ),
                filter: (
                  <Space wrap>
                    <DatasetClassificationFilter
                      datasetKind='source'
                      lang={lang}
                      value={classification}
                      onChange={onClassificationChange}
                    />
                  </Space>
                ),
              })}
              className='responsive-data-list-table tg-dataset-selector-table'
              actionRef={tgActionRefSelect}
              params={{ ...contentLanguageAwareTableParams, classification }}
              search={false}
              pagination={dataListPagination}
              request={async (
                params: ContentLanguageAwareTableParams & {
                  pageSize?: number;
                  current?: number;
                },
                sort,
              ) =>
                guardLocaleMaterializedTableRequest(
                  params.contentLanguage,
                  () => currentContentLanguageRef.current,
                  tgRequestEpochRef,
                  async () => {
                    const submittedKeyword = tgSearch.submittedRef.current.keyword;
                    if (submittedKeyword.length > 0) {
                      return source_hybrid_search(
                        params,
                        params.contentLanguage,
                        'tg',
                        submittedKeyword,
                        {},
                      );
                    }
                    return getSourceTableAll(params, sort, params.contentLanguage, 'tg', []);
                  },
                )
              }
              columns={orderDataListColumns(sourceColumns, {
                dataType: <FormattedMessage id='menu.tgdata.sources' defaultMessage='Sources' />,
              })}
              tableAlertOptionRender={tableAlertOptionRender}
              rowSelection={{
                type: 'radio',
                alwaysShowAlert: true,
                selectedRowKeys,
                onChange: onSelectChange,
              }}
            />
          )}
        </ResponsiveDataListViewport>
      </>
    ),
    co: (
      <>
        <ResponsiveDataListViewport columns={sourceColumns}>
          {({ scroll }) => (
            <ProTable<SourceTable, ContentLanguageAwareTableParams>
              {...responsiveDataListTableProps}
              rowKey={(row) => `${row.id}:${row.version}`}
              scroll={scroll}
              toolbar={getDataListToolbar({
                search: (
                  <Search
                    name={'co'}
                    placeholder={intl.formatMessage({ id: 'pages.search.keyWord' })}
                    value={coKeyWord}
                    onChange={handleCoKeyWordChange}
                    onSearch={onCoSearch}
                    enterButton
                  />
                ),
                filter: (
                  <Space wrap>
                    <DatasetClassificationFilter
                      datasetKind='source'
                      lang={lang}
                      value={classification}
                      onChange={onClassificationChange}
                    />
                  </Space>
                ),
              })}
              className='responsive-data-list-table tg-dataset-selector-table'
              actionRef={coActionRefSelect}
              params={{ ...contentLanguageAwareTableParams, classification }}
              search={false}
              pagination={dataListPagination}
              request={async (
                params: ContentLanguageAwareTableParams & {
                  pageSize?: number;
                  current?: number;
                },
                sort,
              ) =>
                guardLocaleMaterializedTableRequest(
                  params.contentLanguage,
                  () => currentContentLanguageRef.current,
                  coRequestEpochRef,
                  async () => {
                    const submittedKeyword = coSearch.submittedRef.current.keyword;
                    if (submittedKeyword.length > 0) {
                      return source_hybrid_search(
                        params,
                        params.contentLanguage,
                        'co',
                        submittedKeyword,
                        {},
                      );
                    }
                    return getSourceTableAll(params, sort, params.contentLanguage, 'co', []);
                  },
                )
              }
              columns={orderDataListColumns(sourceColumns, {
                dataType: <FormattedMessage id='menu.tgdata.sources' defaultMessage='Sources' />,
              })}
              tableAlertOptionRender={tableAlertOptionRender}
              rowSelection={{
                type: 'radio',
                alwaysShowAlert: true,
                selectedRowKeys,
                onChange: onSelectChange,
              }}
            />
          )}
        </ResponsiveDataListViewport>
      </>
    ),
    te: (
      <>
        <ResponsiveDataListViewport columns={sourceColumns}>
          {({ scroll }) => (
            <ProTable<SourceTable, ContentLanguageAwareTableParams>
              {...responsiveDataListTableProps}
              rowKey={(row) => `${row.id}:${row.version}`}
              scroll={scroll}
              toolbar={getDataListToolbar({
                search: (
                  <Search
                    name={'te'}
                    placeholder={intl.formatMessage({ id: 'pages.search.keyWord' })}
                    value={teKeyWord}
                    onChange={handleTeKeyWordChange}
                    onSearch={onTeSearch}
                    enterButton
                  />
                ),
                filter: (
                  <Space wrap>
                    <DatasetClassificationFilter
                      datasetKind='source'
                      lang={lang}
                      value={classification}
                      onChange={onClassificationChange}
                    />
                  </Space>
                ),
              })}
              className='responsive-data-list-table tg-dataset-selector-table'
              actionRef={teActionRefSelect}
              params={{ ...contentLanguageAwareTableParams, classification }}
              search={false}
              pagination={dataListPagination}
              request={async (
                params: ContentLanguageAwareTableParams & {
                  pageSize?: number;
                  current?: number;
                },
                sort,
              ) =>
                guardLocaleMaterializedTableRequest(
                  params.contentLanguage,
                  () => currentContentLanguageRef.current,
                  teRequestEpochRef,
                  async () => {
                    const submittedKeyword = teSearch.submittedRef.current.keyword;
                    if (submittedKeyword.length > 0) {
                      return source_hybrid_search(
                        params,
                        params.contentLanguage,
                        'te',
                        submittedKeyword,
                        {},
                        type === 'reviewReport' ? 0 : undefined,
                      );
                    }
                    return getSourceTableAll(
                      params,
                      sort,
                      params.contentLanguage,
                      'te',
                      [],
                      type === 'reviewReport' ? 0 : undefined,
                    );
                  },
                )
              }
              columns={orderDataListColumns(sourceColumns, {
                dataType: <FormattedMessage id='menu.tgdata.sources' defaultMessage='Sources' />,
              })}
              tableAlertOptionRender={tableAlertOptionRender}
              rowSelection={{
                type: 'radio',
                alwaysShowAlert: true,
                selectedRowKeys,
                onChange: onSelectChange,
              }}
            />
          )}
        </ResponsiveDataListViewport>
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
          <FormattedMessage id='pages.source.drawer.title.select' defaultMessage='Select Source' />
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
        mask={{ closable: false }}
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

export default SourceSelectDrawer;
