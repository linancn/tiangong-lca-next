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
import { contact_hybrid_search, getContactTableAll } from '@/services/contacts/api';
import { ContactTable } from '@/services/contacts/data';
import {
  getContentLanguageAwareTableParams,
  guardLocaleMaterializedTableRequest,
  syncLocaleMaterializedTableRequestEpochs,
  type ContentLanguageAwareTableParams,
  type DataTabKey,
} from '@/services/general/data';
import styles from '@/style/custom.less';
import { CloseOutlined, DatabaseOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, Drawer, Input, Space, Tooltip } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC, Key, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { getAllVersionsColumns } from '../../../Utils';
import ContactCreate from '../create';
import ContactView from '../view';

type Props = {
  buttonType: string;
  buttonText?: ReactNode;
  lang: string;
  onData: (rowKey: string, version: string) => void;
  filterTabs?: DataTabKey[];
};

const { Search } = Input;

const ContactSelectDrawer: FC<Props> = ({ buttonType, buttonText, lang, onData, filterTabs }) => {
  const [tgKeyWord, setTgKeyWord] = useState<string>('');
  const tgSearch = useSubmittedDatasetSearch('smart');
  const [coKeyWord, setCoKeyWord] = useState<string>('');
  const coSearch = useSubmittedDatasetSearch('smart');
  const [myKeyWord, setMyKeyWord] = useState<string>('');
  const mySearch = useSubmittedDatasetSearch('smart');
  const [teamKeyWord, setTeamKeyWord] = useState<string>('');
  const teamSearch = useSubmittedDatasetSearch('smart');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<DataTabKey>(() => {
    if (filterTabs && filterTabs.length > 0) {
      return filterTabs[0];
    }
    return 'tg';
  });
  const tgActionRefSelect = useRef<ActionType | undefined>(undefined);
  const coActionRefSelect = useRef<ActionType | undefined>(undefined);
  const myActionRefSelect = useRef<ActionType | undefined>(undefined);
  const teamActionRefSelect = useRef<ActionType | undefined>(undefined);

  const intl = useIntl();
  const [classification, setClassification] = useState<DatasetClassificationFilterValue[]>([]);
  const contentLanguageAwareTableParams = getContentLanguageAwareTableParams(lang);
  const currentContentLanguageRef = useRef(contentLanguageAwareTableParams.contentLanguage);
  const tgRequestEpochRef = useRef(0);
  const coRequestEpochRef = useRef(0);
  const myRequestEpochRef = useRef(0);
  const teamRequestEpochRef = useRef(0);
  syncLocaleMaterializedTableRequestEpochs(
    currentContentLanguageRef,
    contentLanguageAwareTableParams.contentLanguage,
    [tgRequestEpochRef, coRequestEpochRef, myRequestEpochRef, teamRequestEpochRef],
  );
  const onClassificationChange = (value: DatasetClassificationFilterValue[]) => {
    tgRequestEpochRef.current += 1;
    coRequestEpochRef.current += 1;
    myRequestEpochRef.current += 1;
    teamRequestEpochRef.current += 1;
    setClassification(value);
    setSelectedRowKeys([]);
    tgActionRefSelect.current?.setPageInfo?.({ current: 1 });
    coActionRefSelect.current?.setPageInfo?.({ current: 1 });
    myActionRefSelect.current?.setPageInfo?.({ current: 1 });
    teamActionRefSelect.current?.setPageInfo?.({ current: 1 });
  };

  const tableAlertOptionRender = renderTableSelectionClearAction(
    <FormattedMessage id='pages.searchTable.clearSelection' defaultMessage='Clear selection' />,
  );
  const contactAllVersionsSearchColumn = `
    id,
    json->contactDataSet->contactInformation->dataSetInformation->"common:shortName",
    json->contactDataSet->contactInformation->dataSetInformation->"common:name",
    json->contactDataSet->contactInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
    json->contactDataSet->contactInformation->dataSetInformation->>email,
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

  const onSelectVersion = (row: ContactTable) => {
    if (!row.id || !row.version) {
      return;
    }

    onData(row.id, row.version);
    setDrawerVisible(false);
  };

  const renderVersionSelectActions = (row: ContactTable) => {
    return <ContactView id={row.id} version={row.version} lang={lang} buttonType='icon' />;
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
      teamActionRefSelect.current?.setPageInfo?.({ current: 1 });
      teamActionRefSelect.current?.reload();
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

  const onTeamSearch: SearchProps['onSearch'] = (value) => {
    teamSearch.submitSearch(value);
    teamRequestEpochRef.current += 1;
    setTeamKeyWord(value);
    teamActionRefSelect.current?.setPageInfo?.({ current: 1 });
    teamActionRefSelect.current?.reload();
  };

  const onCoSearch: SearchProps['onSearch'] = (value) => {
    coSearch.submitSearch(value);
    coRequestEpochRef.current += 1;
    setSelectedRowKeys([]);
    setCoKeyWord(value);
    coActionRefSelect.current?.setPageInfo?.({ current: 1 });
    coActionRefSelect.current?.reload();
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

  const handleMyKeyWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMyKeyWord(e.target.value);
  };

  const handleTeamKeyWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTeamKeyWord(e.target.value);
  };

  const allTabList = [
    {
      key: 'tg',
      tab: <FormattedMessage id='pages.tab.title.tgdata' defaultMessage='TianGong Data' />,
    },
    { key: 'co', tab: <FormattedMessage id='pages.tab.title.co' defaultMessage='Business Data' /> },
    { key: 'my', tab: <FormattedMessage id='pages.tab.title.mydata' defaultMessage='My Data' /> },
    {
      key: 'te',
      tab: <FormattedMessage id='pages.tab.title.tedata' defaultMessage='Team Data' />,
    },
  ];

  const tabList = filterTabs
    ? allTabList.filter((tab) => filterTabs.includes(tab.key as DataTabKey))
    : allTabList;

  const contactColumns: ProColumns<ContactTable>[] = [
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
      search: false,
      render: (_, row) => [
        <Tooltip key={0} placement='topLeft' title={row.name}>
          {row.shortName}
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
      title: <FormattedMessage id='pages.contact.email' defaultMessage='E-mail' />,
      dataIndex: 'email',
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
              searchTableName='contacts'
              columns={getAllVersionsColumns(contactColumns, 4)}
              searchColume={contactAllVersionsSearchColumn}
              id={row.id}
              addVersionComponent={() => <></>}
              operationRender={(versionRow) =>
                renderVersionSelectActions(versionRow as ContactTable)
              }
              operationColumnWidth={88}
              onSelectVersion={(versionRow) => onSelectVersion(versionRow as ContactTable)}
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
          <Space size={'small'} key={0}>
            <ContactView id={row.id} version={row.version} lang={lang} buttonType='icon' />
          </Space>,
        ];

        // if (activeTabKey === 'tg') {
        //   return [
        //     <Space size={'small'} key={0}>
        //       <ContactView
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
        //       <ContactView
        //         id={row.id}
        //         lang={lang}
        //         dataSource="my"
        //         buttonType="icon"
        //       />
        //       <ContactEdit
        //         id={row.id}
        //         lang={lang}
        //         buttonType={'icon'}
        //         actionRef={myActionRefSelect}
        //         setViewDrawerVisible={() => {}}
        //       />
        //       <ContactDelete
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

  const databaseList: Record<DataTabKey, React.ReactNode> = {
    tg: (
      <>
        <ResponsiveDataListViewport columns={contactColumns}>
          {({ scroll }) => (
            <ProTable<ContactTable, ContentLanguageAwareTableParams>
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
                      datasetKind='contact'
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
              ) => {
                return guardLocaleMaterializedTableRequest(
                  params.contentLanguage,
                  () => currentContentLanguageRef.current,
                  tgRequestEpochRef,
                  async () => {
                    const submittedKeyword = tgSearch.submittedRef.current.keyword;
                    if (submittedKeyword.length > 0) {
                      return contact_hybrid_search(
                        params,
                        params.contentLanguage,
                        'tg',
                        submittedKeyword,
                        {},
                      );
                    }
                    return getContactTableAll(params, sort, params.contentLanguage, 'tg', []);
                  },
                );
              }}
              columns={orderDataListColumns(contactColumns, {
                dataType: <FormattedMessage id='menu.tgdata.contacts' defaultMessage='Contacts' />,
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
        <ResponsiveDataListViewport columns={contactColumns}>
          {({ scroll }) => (
            <ProTable<ContactTable, ContentLanguageAwareTableParams>
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
                      datasetKind='contact'
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
              ) => {
                return guardLocaleMaterializedTableRequest(
                  params.contentLanguage,
                  () => currentContentLanguageRef.current,
                  coRequestEpochRef,
                  async () => {
                    const submittedKeyword = coSearch.submittedRef.current.keyword;
                    if (submittedKeyword.length > 0) {
                      return contact_hybrid_search(
                        params,
                        params.contentLanguage,
                        'co',
                        submittedKeyword,
                        {},
                      );
                    }
                    return getContactTableAll(params, sort, params.contentLanguage, 'co', []);
                  },
                );
              }}
              columns={orderDataListColumns(contactColumns, {
                dataType: <FormattedMessage id='menu.tgdata.contacts' defaultMessage='Contacts' />,
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
    my: (
      <>
        <ResponsiveDataListViewport columns={contactColumns}>
          {({ scroll }) => (
            <ProTable<ContactTable, ContentLanguageAwareTableParams>
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
                      datasetKind='contact'
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
              request={async (
                params: ContentLanguageAwareTableParams & {
                  pageSize?: number;
                  current?: number;
                },
                sort,
              ) => {
                return guardLocaleMaterializedTableRequest(
                  params.contentLanguage,
                  () => currentContentLanguageRef.current,
                  myRequestEpochRef,
                  async () => {
                    const submittedKeyword = mySearch.submittedRef.current.keyword;
                    if (submittedKeyword.length > 0) {
                      return contact_hybrid_search(
                        params,
                        params.contentLanguage,
                        'my',
                        submittedKeyword,
                        {},
                      );
                    }
                    return getContactTableAll(params, sort, params.contentLanguage, 'my', []);
                  },
                );
              }}
              toolBarRender={() => {
                return [<ContactCreate lang={lang} key={0} actionRef={myActionRefSelect} />];
              }}
              columns={orderDataListColumns(contactColumns, {
                dataType: <FormattedMessage id='menu.tgdata.contacts' defaultMessage='Contacts' />,
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
        <ResponsiveDataListViewport columns={contactColumns}>
          {({ scroll }) => (
            <ProTable<ContactTable, ContentLanguageAwareTableParams>
              {...responsiveDataListTableProps}
              rowKey={(row) => `${row.id}:${row.version}`}
              scroll={scroll}
              toolbar={getDataListToolbar({
                search: (
                  <Search
                    name={'te'}
                    placeholder={intl.formatMessage({ id: 'pages.search.keyWord' })}
                    value={teamKeyWord}
                    onChange={handleTeamKeyWordChange}
                    onSearch={onTeamSearch}
                    enterButton
                  />
                ),
                filter: (
                  <Space wrap>
                    <DatasetClassificationFilter
                      datasetKind='contact'
                      lang={lang}
                      value={classification}
                      onChange={onClassificationChange}
                    />
                  </Space>
                ),
              })}
              className='responsive-data-list-table tg-dataset-selector-table'
              actionRef={teamActionRefSelect}
              params={{ ...contentLanguageAwareTableParams, classification }}
              search={false}
              pagination={dataListPagination}
              request={async (
                params: ContentLanguageAwareTableParams & {
                  pageSize?: number;
                  current?: number;
                },
                sort,
              ) => {
                return guardLocaleMaterializedTableRequest(
                  params.contentLanguage,
                  () => currentContentLanguageRef.current,
                  teamRequestEpochRef,
                  async () => {
                    const submittedKeyword = teamSearch.submittedRef.current.keyword;
                    if (submittedKeyword.length > 0) {
                      return contact_hybrid_search(
                        params,
                        params.contentLanguage,
                        'te',
                        submittedKeyword,
                        {},
                      );
                    }
                    return getContactTableAll(params, sort, params.contentLanguage, 'te', '');
                  },
                );
              }}
              columns={orderDataListColumns(contactColumns, {
                dataType: <FormattedMessage id='menu.tgdata.contacts' defaultMessage='Contacts' />,
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

  // useEffect(() => {
  //   if (filterTabs && filterTabs.length > 0) {
  //     setActiveTabKey(filterTabs[0]);
  //   } else {
  //     setActiveTabKey('tg');
  //   }
  // }, [filterTabs]);

  return (
    <>
      {buttonType === 'icon' ? (
        <Tooltip
          title={
            buttonText ?? <FormattedMessage id='pages.button.select' defaultMessage='Select' />
          }
        >
          <Button type='text' icon={<DatabaseOutlined />} size='small' onClick={onSelect} />
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
            id='pages.contact.drawer.title.select'
            defaultMessage='Select Contact'
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

export default ContactSelectDrawer;
