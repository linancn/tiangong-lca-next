import DatasetClassificationFilter from '@/components/DatasetClassificationFilter';
import type { DatasetClassificationFilterValue } from '@/services/general/datasetClassification';
import AllVersionsList from '@/components/AllVersions';
import OpenDataCatalogFilters from '@/components/OpenDataCatalogFilters';
import ContributeData from '@/components/ContributeData';
import {
  extractContributeDataError,
  getContributeDataErrorMessage,
} from '@/components/ContributeData/utils';
import ExportData from '@/components/ExportData';
import ImportData from '@/components/ImportData';
import {
  DATA_LIST_COLUMN_RESPONSIVE,
  ResponsiveDataListActions,
  dataListActionColumn,
  dataListIndexColumn,
  dataListText,
  dataListTextColumn,
  responsiveDataListTableProps,
  ResponsiveDataListViewport,
  dataListPagination,
  getDataListToolbar,
  orderDataListColumns,
  useResponsiveDataListMobile,
} from '@/components/ResponsiveDataList';
import TableFilter from '@/components/TableFilter';
import {
  DEFAULT_OPEN_DATA_FILTERS,
  getOpenDataCatalogFilterArgs,
  type OpenDataCatalogFilters as OpenDataCatalogFilterValue,
} from '@/services/openDataCatalog/types';
import {
  contact_hybrid_search,
  getContactTableAll,
  getContactTablePgroongaSearch,
  getContactTableUuidMentionSearch,
} from '@/services/contacts/api';
import { ContactImportData, ContactTable } from '@/services/contacts/data';
import { attachStateCodesToRows, contributeSource } from '@/services/general/api';
import {
  guardLocaleMaterializedTableRequest,
  syncLocaleMaterializedTableRequestEpochs,
  type LocaleAwareTableParams,
} from '@/services/general/data';
import { resolveRouteViewState } from '@/services/general/routeViewState';
import {
  DEFAULT_BROWSER_APP_LOCALE,
  normalizeRuntimeLocale,
} from '@/services/general/runtimeLocale';
import { getDataSource, getLang, getLangText, isDataUnderReview } from '@/services/general/util';
import { getTeamById } from '@/services/teams/api';
import { TeamTable } from '@/services/teams/data';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { Checkbox, Input, Space, App } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';
import { getAllVersionsColumns } from '../Utils';
import {
  getReferenceLookupEmptyResult,
  getReferenceLookupPaginationProps,
  getReferenceLookupTeamId,
  getReferenceLookupUuid,
  showInvalidReferenceLookupUuidMessage,
  showReferenceLookupLimitMessage,
  type DatasetSearchMode,
} from '../Utils/referenceLookup';
import ReferenceLookupHelpIcon from '../Utils/ReferenceLookupHelpIcon';
import ContactCreate from './Components/create';
import ContactDelete from './Components/delete';
import ContactEdit from './Components/edit';
import ContactView from './Components/view';

const { Search } = Input;

const TableList: FC = () => {
  const { message } = App.useApp();
  const [, setKeyWord] = useState<string>('');
  const [team, setTeam] = useState<TeamTable | null>(null);
  const [importData, setImportData] = useState<ContactImportData | null>(null);
  const [searchMode, setSearchMode] = useState<DatasetSearchMode>('normal');
  const [editDrawerVisible, setEditDrawerVisible] = useState<boolean>(false);
  const [editId, setEditId] = useState<string>('');
  const [editVersion, setEditVersion] = useState<string>('');
  const isMobileDataList = useResponsiveDataListMobile();
  const location = useLocation();
  const dataSource = getDataSource(location.pathname);
  const [openDataFilters, setOpenDataFilters] = useState<OpenDataCatalogFilterValue>({
    ...DEFAULT_OPEN_DATA_FILTERS,
  });

  const searchParams = new URLSearchParams(location.search);
  const tid = searchParams.get('tid');
  const id = searchParams.get('id');
  const version = searchParams.get('version');
  const required =
    resolveRouteViewState('dataset-required', searchParams.get('required')) === 'required';

  const intl = useIntl();

  const appLocale = normalizeRuntimeLocale(intl.locale) ?? DEFAULT_BROWSER_APP_LOCALE;
  const lang = getLang(appLocale);
  const currentAppLocaleRef = useRef(appLocale);
  const tableRequestEpochRef = useRef(0);
  syncLocaleMaterializedTableRequestEpochs(currentAppLocaleRef, appLocale, [tableRequestEpochRef]);

  const actionRef = useRef<ActionType | undefined>(undefined);
  const [classification, setClassification] = useState<DatasetClassificationFilterValue[]>([]);
  const [listPage, setListPage] = useState({ current: 1, pageSize: 50 });
  const stateCodeRef = useRef<string | number>('all');
  const keyWordRef = useRef<string>('');
  const referenceLookupLimitNoticeRef = useRef<string>('');
  const openAI = searchMode === 'smart';
  const referenceLookup = searchMode === 'reference';
  const attachReviewState = async (result: {
    data?: ContactTable[];
    page?: number;
    success?: boolean;
    total?: number;
  }) => {
    if (dataSource !== 'my' || !Array.isArray(result?.data)) {
      return result;
    }

    return {
      ...result,
      data: await attachStateCodesToRows('contacts', result.data),
    };
  };

  useEffect(() => {
    if (dataSource === 'my' && id && version) {
      setEditId(id);
      setEditVersion(version);
      setEditDrawerVisible(true);
    }
  }, [dataSource, id, version]);

  const renderContactActions = (
    row: ContactTable,
    listActionRef: RefObject<ActionType | undefined> = actionRef,
  ) => {
    const actionDisabled = isDataUnderReview(row.stateCode);
    if (dataSource === 'my') {
      return [
        <ResponsiveDataListActions
          key={0}
          isMobile={isMobileDataList}
          moreMenus={[
            {
              key: 'export',
              name: <ExportData tableName='contacts' id={row.id} version={row.version} />,
            },
            {
              key: 'copy',
              name: (
                <ContactCreate
                  actionType='copy'
                  id={row.id}
                  version={row.version}
                  lang={lang}
                  actionRef={listActionRef}
                />
              ),
            },
            {
              key: 'contribute',
              name: (
                <ContributeData
                  onOk={async () => {
                    const contributeResult = await contributeSource(
                      'contacts',
                      row.id,
                      row.version,
                    );
                    const contributeError = extractContributeDataError(contributeResult);

                    if (contributeError) {
                      message.error(getContributeDataErrorMessage(intl, contributeError));
                      console.log(contributeError);
                    } else {
                      message.success(
                        intl.formatMessage({
                          id: 'component.contributeData.success',
                          defaultMessage: 'Data contributed to the team successfully.',
                        }),
                      );
                      listActionRef.current?.reload();
                    }
                  }}
                  disabled={!!row.teamId}
                />
              ),
            },
          ]}
        >
          <ContactView
            id={row.id}
            version={row.version}
            lang={lang}
            buttonType='icon'
            actionRef={listActionRef}
          />
          <ContactEdit
            disabled={actionDisabled}
            id={row.id}
            version={row.version}
            lang={lang}
            buttonType={'icon'}
            actionRef={listActionRef}
            setViewDrawerVisible={() => {}}
            showSyncOpenDataButton={true}
          />
          <ContactDelete
            disabled={actionDisabled}
            id={row.id}
            version={row.version}
            buttonType={'icon'}
            actionRef={listActionRef}
            setViewDrawerVisible={() => {}}
          />
        </ResponsiveDataListActions>,
      ];
    }

    return [
      <ResponsiveDataListActions key={0} isMobile={isMobileDataList}>
        <ContactView
          id={row.id}
          version={row.version}
          lang={lang}
          buttonType='icon'
          actionRef={listActionRef}
        />
        <ContactCreate
          actionType='copy'
          id={row.id}
          version={row.version}
          lang={lang}
          actionRef={listActionRef}
        />
        <ExportData tableName='contacts' id={row.id} version={row.version} />
      </ResponsiveDataListActions>,
    ];
  };

  const contactColumns: ProColumns<ContactTable>[] = [
    {
      ...dataListIndexColumn<ContactTable>(),
      title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
      dataIndex: 'index',
      valueType: 'index',
    },
    {
      ...dataListTextColumn<ContactTable>(280),
      title: <FormattedMessage id='pages.table.title.name' defaultMessage='Name' />,
      dataIndex: 'shortName',
      sorter: false,
      search: false,
      render: (_, row) => dataListText(row.shortName, row.name),
    },
    {
      ...dataListTextColumn<ContactTable>(220, DATA_LIST_COLUMN_RESPONSIVE.desktop),
      title: <FormattedMessage id='pages.contact.email' defaultMessage='E-mail' />,
      dataIndex: 'email',
      sorter: false,
      search: false,
    },
    {
      ...dataListTextColumn<ContactTable>(132),
      title: <FormattedMessage id='pages.table.title.version' defaultMessage='Version' />,
      dataIndex: 'version',
      sorter: false,
      search: false,
      render: (_, row) => {
        return (
          <Space size={'small'}>
            {row.version}
            <AllVersionsList
              lang={lang}
              searchTableName='contacts'
              columns={getAllVersionsColumns(contactColumns, 4)}
              searchColume={`
                 id,
                json->contactDataSet->contactInformation->dataSetInformation->"common:shortName",
                json->contactDataSet->contactInformation->dataSetInformation->"common:name",
                json->contactDataSet->contactInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
                json->contactDataSet->contactInformation->dataSetInformation->>email,
                version,
                modified_at,
                team_id,
                state_code
              `}
              id={row.id}
              addVersionComponent={({ newVersion }) => (
                <ContactCreate
                  newVersion={newVersion}
                  actionType='createVersion'
                  id={row.id}
                  version={row.version}
                  lang={lang}
                  actionRef={actionRef}
                />
              )}
              operationRender={(versionRow, { actionRef: allVersionsActionRef }) =>
                renderContactActions(versionRow as ContactTable, allVersionsActionRef)
              }
              operationColumnWidth={isMobileDataList ? 88 : dataSource === 'my' ? 216 : 184}
            ></AllVersionsList>
          </Space>
        );
      },
    },
    {
      ...dataListTextColumn<ContactTable>(180, DATA_LIST_COLUMN_RESPONSIVE.wide),
      title: <FormattedMessage id='pages.table.title.updatedAt' defaultMessage='Updated at' />,
      dataIndex: 'modifiedAt',
      valueType: 'dateTime',
      sorter: false,
      search: false,
    },
    {
      ...dataListActionColumn<ContactTable>(
        isMobileDataList ? 72 : dataSource === 'my' ? 184 : 152,
      ),
      title: <FormattedMessage id='pages.table.title.option' defaultMessage='Actions' />,
      dataIndex: 'option',
      render: (_, row) => renderContactActions(row),
    },
  ];

  useEffect(() => {
    getTeamById(tid ?? '').then((res) => {
      if (res.data.length > 0) setTeam(res.data[0]);
    });
  }, []);

  const onSearch: SearchProps['onSearch'] = (value) => {
    keyWordRef.current = value;
    setKeyWord(value);
    actionRef.current?.setPageInfo?.({ current: 1 });
    if (referenceLookup && !getReferenceLookupUuid(value)) {
      showInvalidReferenceLookupUuidMessage(intl);
    }
    actionRef.current?.reload();
  };

  const handleImportData = (jsonData: ContactImportData) => {
    setImportData(jsonData);
  };

  return (
    <PageContainer
      header={{
        title: team?.json?.title ? getLangText(team?.json?.title, lang) : false,
        breadcrumb: {},
      }}
    >
      <ResponsiveDataListViewport>
        {({ scroll }) => (
          <ProTable<ContactTable, LocaleAwareTableParams>
            key={`contacts-table:${dataSource}:${tid ?? ''}`}
            {...responsiveDataListTableProps}
            scroll={scroll}
            toolbar={getDataListToolbar({
              search: (
                <Search
                  allowClear
                  style={{ width: '100%' }}
                  placeholder={
                    referenceLookup
                      ? intl.formatMessage({ id: 'pages.search.referenceLookup.placeholder' })
                      : openAI
                        ? intl.formatMessage({ id: 'pages.search.placeholder' })
                        : intl.formatMessage({ id: 'pages.search.keyWord' })
                  }
                  onSearch={onSearch}
                  enterButton
                />
              ),
              filter: (
                <Space wrap>
                  <Checkbox
                    checked={openAI}
                    onChange={(e) => setSearchMode(e.target.checked ? 'smart' : 'normal')}
                  >
                    <FormattedMessage id='pages.search.openAI' defaultMessage='AI Recommendation' />
                  </Checkbox>
                  <Space
                    className='responsive-data-list-reference-lookup-option'
                    size={4}
                    align='center'
                  >
                    <Checkbox
                      checked={referenceLookup}
                      onChange={(e) => setSearchMode(e.target.checked ? 'reference' : 'normal')}
                    >
                      <FormattedMessage
                        id='pages.search.referenceLookup'
                        defaultMessage='Reference Lookup'
                      />
                    </Checkbox>
                    <ReferenceLookupHelpIcon />
                  </Space>
                  <DatasetClassificationFilter
                    datasetKind='contact'
                    lang={lang}
                    value={classification}
                    onChange={(next) => {
                      setClassification(next);
                      actionRef.current?.setPageInfo?.({ current: 1 });
                    }}
                  />
                </Space>
              ),
            })}
            rowKey={(record) => `${record.id}-${record.version}`}
            headerTitle={false}
            actionRef={actionRef}
            params={{
              locale: appLocale,
              classification,
              ...(dataSource === 'tg'
                ? { openDataFilterRevision: JSON.stringify(openDataFilters) }
                : {}),
            }}
            search={false}
            options={isMobileDataList ? false : { fullScreen: true }}
            pagination={{
              ...dataListPagination,
              onChange: (current, pageSize) => setListPage({ current, pageSize }),
              ...getReferenceLookupPaginationProps(referenceLookup),
            }}
            toolBarRender={() => {
              if (dataSource === 'my') {
                const filters = [
                  <TableFilter
                    key={2}
                    width={isMobileDataList ? 120 : 140}
                    onChange={(val) => {
                      stateCodeRef.current = val;
                      actionRef.current?.reload();
                    }}
                  />,
                ];
                return [
                  ...filters,
                  <ContactCreate
                    importData={importData}
                    onClose={() => setImportData(null)}
                    lang={lang}
                    key={0}
                    actionRef={actionRef}
                  />,
                  <ImportData onJsonData={handleImportData} key={1} />,
                ];
              }
              return dataSource === 'tg'
                ? [
                    <OpenDataCatalogFilters
                      key='open-data-filters'
                      value={openDataFilters}
                      onChange={setOpenDataFilters}
                    />,
                  ]
                : [];
            }}
            request={async (
              params: LocaleAwareTableParams & { pageSize?: number; current?: number },
              sort,
            ) => {
              const {
                locale: requestedLocale,
                openDataFilterRevision: _openDataFilterRevision,
                ...requestParams
              } = params;
              void _openDataFilterRevision;
              return guardLocaleMaterializedTableRequest(
                requestedLocale,
                () => currentAppLocaleRef.current,
                tableRequestEpochRef,
                async ({ isCurrentRequest }) => {
                  const currentKeyWord = keyWordRef.current;
                  const currentStateCode = stateCodeRef.current;
                  if (referenceLookup) {
                    const referenceLookupUuid = getReferenceLookupUuid(currentKeyWord);
                    if (!referenceLookupUuid) {
                      return attachReviewState(
                        getReferenceLookupEmptyResult(requestParams.current),
                      );
                    }
                    const referenceLookupTeamId = getReferenceLookupTeamId(tid);

                    const result = await getContactTableUuidMentionSearch(
                      requestParams,
                      lang,
                      dataSource,
                      referenceLookupUuid,
                      currentStateCode,
                      referenceLookupTeamId,
                      ...getOpenDataCatalogFilterArgs(dataSource, openDataFilters),
                    );
                    const noticeKey = [
                      dataSource,
                      referenceLookupUuid,
                      currentStateCode,
                      referenceLookupTeamId,
                      requestedLocale,
                    ].join(':');
                    if (
                      isCurrentRequest() &&
                      result.capped &&
                      referenceLookupLimitNoticeRef.current !== noticeKey
                    ) {
                      referenceLookupLimitNoticeRef.current = noticeKey;
                      showReferenceLookupLimitMessage(intl);
                    }
                    return attachReviewState(result);
                  }
                  if (currentKeyWord.length > 0) {
                    if (openAI) {
                      return attachReviewState(
                        await contact_hybrid_search(
                          requestParams,
                          lang,
                          dataSource,
                          currentKeyWord,
                          {},
                          currentStateCode,
                          tid ?? '',
                          ...getOpenDataCatalogFilterArgs(dataSource, openDataFilters),
                        ),
                      );
                    }
                    return attachReviewState(
                      await getContactTablePgroongaSearch(
                        requestParams,
                        lang,
                        dataSource,
                        currentKeyWord,
                        {},
                        currentStateCode,
                        tid ?? '',
                        ...getOpenDataCatalogFilterArgs(dataSource, openDataFilters),
                      ),
                    );
                  }
                  return attachReviewState(
                    await getContactTableAll(
                      requestParams,
                      sort,
                      lang,
                      dataSource,
                      tid ?? '',
                      currentStateCode,
                      ...getOpenDataCatalogFilterArgs(dataSource, openDataFilters),
                    ),
                  );
                },
              );
            }}
            columns={orderDataListColumns(contactColumns, {
              dataType: <FormattedMessage id='menu.tgdata.contacts' />,
              pagination: listPage,
            })}
          />
        )}
      </ResponsiveDataListViewport>

      {editDrawerVisible && editId && editVersion && (
        <ContactEdit
          id={editId}
          version={editVersion}
          lang={lang}
          buttonType={'icon'}
          actionRef={actionRef}
          setViewDrawerVisible={setEditDrawerVisible}
          autoOpen={true}
          autoCheckRequired={required}
        />
      )}
    </PageContainer>
  );
};

export default TableList;
