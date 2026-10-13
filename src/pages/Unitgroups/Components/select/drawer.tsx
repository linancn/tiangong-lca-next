import DatasetClassificationFilter from '@/components/DatasetClassificationFilter';
import {
  ResponsiveDataListViewport,
  dataListPagination,
  dataListTabProps,
  getDataListToolbar,
  orderDataListColumns,
  responsiveDataListTableProps,
} from '@/components/ResponsiveDataList';
import type { DatasetClassificationFilterValue } from '@/services/general/datasetClassification';
import { toSuperscript } from '@/components/AlignedNumber';
import AllVersionsList from '@/components/AllVersions';
import { renderTableSelectionClearAction } from '@/components/TableSelectionAlert';
import {
  getContentLanguageAwareTableParams,
  guardLocaleMaterializedTableRequest,
  syncLocaleMaterializedTableRequestEpochs,
  type ContentLanguageAwareTableParams,
  type DataTabKey,
} from '@/services/general/data';
import { getUnitGroupTableAll, unitgroup_hybrid_search } from '@/services/unitgroups/api';
import { UnitGroupTable } from '@/services/unitgroups/data';
import styles from '@/style/custom.less';
import { CloseOutlined, DatabaseOutlined } from '@ant-design/icons';
import { ActionType, ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Card, Drawer, Input, Space, Tooltip } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC, Key, ReactNode } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { getAllVersionsColumns } from '../../../Utils';
import UnitGroupView from '../view';

type Props = {
  buttonType: string;
  buttonText?: ReactNode;
  lang: string;
  onData: (rowKey: string, version: string) => void;
};

const { Search } = Input;

const UnitgroupsSelectDrawer: FC<Props> = ({ buttonType, buttonText, lang, onData }) => {
  const [tgKeyWord, setTgKeyWord] = useState<string>('');
  const [coKeyWord, setCoKeyWord] = useState<string>('');
  const [myKeyWord, setMyKeyWord] = useState<string>('');
  const [teKeyWord, setTeKeyWord] = useState<string>('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<DataTabKey>('tg');
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
  const unitGroupAllVersionsSearchColumn = `
    id,
    json->unitGroupDataSet->unitGroupInformation->dataSetInformation->"common:name",
    json->unitGroupDataSet->unitGroupInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
    json->unitGroupDataSet->unitGroupInformation->quantitativeReference->>referenceToReferenceUnit,
    json->unitGroupDataSet->units->unit,
    version,
    modified_at,
    team_id,
    state_code
  `;

  const onSelect = () => {
    setDrawerVisible(true);
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const onSelectVersion = (row: UnitGroupTable) => {
    if (!row.id || !row.version) {
      return;
    }

    onData(row.id, row.version);
    setDrawerVisible(false);
  };

  const renderVersionSelectActions = (row: UnitGroupTable) => {
    return <UnitGroupView id={row.id} version={row.version} lang={lang} buttonType='icon' />;
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
      await myActionRefSelect.current?.setPageInfo?.({ current: 1 });
      myActionRefSelect.current?.reload();
    }
    if (tabKey === 'te') {
      teActionRefSelect.current?.setPageInfo?.({ current: 1 });
      teActionRefSelect.current?.reload();
    }
  };

  const onTgSearch: SearchProps['onSearch'] = async (value) => {
    setSelectedRowKeys([]);
    await setTgKeyWord(value);
    tgActionRefSelect.current?.setPageInfo?.({ current: 1 });
    tgActionRefSelect.current?.reload();
  };

  const onCoSearch: SearchProps['onSearch'] = async (value) => {
    setSelectedRowKeys([]);
    await setCoKeyWord(value);
    coActionRefSelect.current?.setPageInfo?.({ current: 1 });
    coActionRefSelect.current?.reload();
  };

  const onMySearch: SearchProps['onSearch'] = async (value) => {
    setSelectedRowKeys([]);
    await setMyKeyWord(value);
    myActionRefSelect.current?.setPageInfo?.({ current: 1 });
    myActionRefSelect.current?.reload();
  };

  const onTeSearch: SearchProps['onSearch'] = async (value) => {
    setSelectedRowKeys([]);
    await setTeKeyWord(value);
    teActionRefSelect.current?.setPageInfo?.({ current: 1 });
    teActionRefSelect.current?.reload();
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

  const unitGroupColumns: ProColumns<UnitGroupTable>[] = [
    {
      title: (
        <FormattedMessage id='pages.table.title.index' defaultMessage='Index'></FormattedMessage>
      ),
      valueType: 'index',
      search: false,
    },
    {
      title: (
        <FormattedMessage id='pages.table.title.name' defaultMessage='Name'></FormattedMessage>
      ),
      dataIndex: 'name',
      sorter: false,
      search: false,
    },

    {
      title: (
        <FormattedMessage
          id='pages.unitgroup.unit.quantitativeReference'
          defaultMessage='Quantitative reference'
        />
      ),
      dataIndex: 'refUnitName',
      sorter: false,
      search: false,
      render: (_, row) => [
        <Tooltip key={0} placement='topLeft' title={row.refUnitGeneralComment}>
          {toSuperscript(row.refUnitName ?? '-')}
        </Tooltip>,
      ],
    },

    {
      title: (
        <FormattedMessage
          id='pages.table.title.classification'
          defaultMessage='Classification'
        ></FormattedMessage>
      ),
      dataIndex: 'classification',
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
              stateCode={activeTabKey === 'my' ? 0 : undefined}
              searchTableName='unitgroups'
              columns={getAllVersionsColumns(unitGroupColumns, 4)}
              searchColume={unitGroupAllVersionsSearchColumn}
              id={row.id}
              addVersionComponent={() => <></>}
              operationRender={(versionRow) =>
                renderVersionSelectActions(versionRow as UnitGroupTable)
              }
              operationColumnWidth={88}
              onSelectVersion={(versionRow) => onSelectVersion(versionRow as UnitGroupTable)}
            />
          </Space>
        );
      },
    },
    // {
    //   title: <FormattedMessage id="unitGroup.email" defaultMessage="Reference Unit"></FormattedMessage>,
    //   dataIndex: 'referenceToReferenceUnit',
    //   sorter: false,
    //   search: false,
    // },
    {
      title: (
        <FormattedMessage
          id='pages.table.title.modifiedAt'
          defaultMessage='Updated at'
        ></FormattedMessage>
      ),
      dataIndex: 'modifiedAt',
      valueType: 'dateTime',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage id='pages.table.title.option' defaultMessage='Actions'></FormattedMessage>
      ),
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        return [
          <UnitGroupView
            key={0}
            buttonType={'icon'}
            lang={lang}
            id={row.id}
            version={row.version}
          />,
        ];
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
    { key: 'te', tab: <FormattedMessage id='pages.tab.title.tedata' defaultMessage='Team Data' /> },
  ];

  const databaseList: Record<DataTabKey, ReactNode> = {
    my: (
      <>
        <ResponsiveDataListViewport>
          {({ scroll }) => (
            <ProTable<UnitGroupTable, ContentLanguageAwareTableParams>
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
                      datasetKind='unitgroup'
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
              ) =>
                guardLocaleMaterializedTableRequest(
                  params.contentLanguage,
                  () => currentContentLanguageRef.current,
                  myRequestEpochRef,
                  async () => {
                    if (myKeyWord.length > 0) {
                      return unitgroup_hybrid_search(
                        params,
                        params.contentLanguage,
                        'my',
                        myKeyWord,
                        {},
                        0,
                      );
                    }
                    return getUnitGroupTableAll(params, sort, params.contentLanguage, 'my', [], 0);
                  },
                )
              }
              columns={orderDataListColumns(unitGroupColumns, {
                dataType: (
                  <FormattedMessage id='menu.tgdata.unitgroups' defaultMessage='Unit Groups' />
                ),
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
        <ResponsiveDataListViewport>
          {({ scroll }) => (
            <ProTable<UnitGroupTable, ContentLanguageAwareTableParams>
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
                      datasetKind='unitgroup'
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
                    if (tgKeyWord.length > 0) {
                      return unitgroup_hybrid_search(
                        params,
                        params.contentLanguage,
                        'tg',
                        tgKeyWord,
                        {},
                      );
                    }
                    return getUnitGroupTableAll(params, sort, params.contentLanguage, 'tg', []);
                  },
                )
              }
              columns={orderDataListColumns(unitGroupColumns, {
                dataType: (
                  <FormattedMessage id='menu.tgdata.unitgroups' defaultMessage='Unit Groups' />
                ),
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
        <ResponsiveDataListViewport>
          {({ scroll }) => (
            <ProTable<UnitGroupTable, ContentLanguageAwareTableParams>
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
                      datasetKind='unitgroup'
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
                    if (coKeyWord.length > 0) {
                      return unitgroup_hybrid_search(
                        params,
                        params.contentLanguage,
                        'co',
                        coKeyWord,
                        {},
                      );
                    }
                    return getUnitGroupTableAll(params, sort, params.contentLanguage, 'co', []);
                  },
                )
              }
              columns={orderDataListColumns(unitGroupColumns, {
                dataType: (
                  <FormattedMessage id='menu.tgdata.unitgroups' defaultMessage='Unit Groups' />
                ),
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
        <ResponsiveDataListViewport>
          {({ scroll }) => (
            <ProTable<UnitGroupTable, ContentLanguageAwareTableParams>
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
                      datasetKind='unitgroup'
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
                    if (teKeyWord.length > 0) {
                      return unitgroup_hybrid_search(
                        params,
                        params.contentLanguage,
                        'te',
                        teKeyWord,
                        {},
                      );
                    }
                    return getUnitGroupTableAll(params, sort, params.contentLanguage, 'te', '');
                  },
                )
              }
              columns={orderDataListColumns(unitGroupColumns, {
                dataType: (
                  <FormattedMessage id='menu.tgdata.unitgroups' defaultMessage='Unit Groups' />
                ),
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
          <FormattedMessage
            id='pages.unitgroup.drawer.title.select'
            defaultMessage='Select Unit groups'
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

export default UnitgroupsSelectDrawer;
