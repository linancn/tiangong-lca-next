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
import { attachStateCodesToRows } from '@/services/general/api';
import {
  getServiceQueryLanguage,
  type SupportedServiceQueryLanguage,
} from '@/services/general/contentLanguageRegistry';
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
import { getActiveTableSort } from '@/services/general/tableSort';
import { getDataSource, getLang, getLangText, isDataUnderReview } from '@/services/general/util';
import {
  contributeLifeCycleModel,
  getLifeCycleModelTableAll,
  getLifeCycleModelTablePgroongaSearch,
  getLifeCycleModelTableUuidMentionSearch,
  lifeCycleModel_hybrid_search,
} from '@/services/lifeCycleModels/api';
import type {
  LifeCycleModelImportData,
  LifeCycleModelTable,
} from '@/services/lifeCycleModels/data';
import { getTeamById } from '@/services/teams/api';
import type { TeamTable } from '@/services/teams/data';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { App, Checkbox, Input, Space } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC } from 'react';
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
} from '../Utils/referenceLookup';
import ReferenceLookupHelpIcon from '../Utils/ReferenceLookupHelpIcon';
import LifeCycleModelCreate from './Components/create';
import LifeCycleModelDelete from './Components/delete';
import LifeCycleModelEdit from './Components/edit';
import LifeCycleModelView from './Components/view';
const { Search } = Input;

type LifeCycleModelTableRequestParams = LocaleAwareTableParams & {
  dataSource: string;
  teamId: string;
  keyword: string;
  searchRevision: number;
  searchMode: 'keyword' | 'ai' | 'reference';
  stateCode: string | number;
};

const TableList: FC = () => {
  const { message } = App.useApp();
  const [keyWord, setKeyWord] = useState('');
  const [searchRevision, setSearchRevision] = useState(0);
  const [stateCode, setStateCode] = useState<string | number>('all');
  const [tableDataSource, setTableDataSource] = useState<LifeCycleModelTable[]>([]);
  const [team, setTeam] = useState<TeamTable | null>(null);
  const [importData, setImportData] = useState<LifeCycleModelImportData | null>(null);
  const [openAI, setOpenAI] = useState<boolean>(false);
  const [referenceLookup, setReferenceLookup] = useState<boolean>(false);
  const [editDrawerVisible, setEditDrawerVisible] = useState<boolean>(false);
  const [viewDrawerVisible, setViewDrawerVisible] = useState<boolean>(false);
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
  const routeMode = resolveRouteViewState('dataset-drawer-mode', searchParams.get('mode'));

  const intl = useIntl();

  const appLocale = normalizeRuntimeLocale(intl.locale) ?? DEFAULT_BROWSER_APP_LOCALE;
  const lang = getLang(appLocale);
  const currentAppLocaleRef = useRef(appLocale);
  const tableRequestEpochRef = useRef(0);
  syncLocaleMaterializedTableRequestEpochs(currentAppLocaleRef, appLocale, [tableRequestEpochRef]);

  const actionRef = useRef<ActionType>(undefined);
  const [classification, setClassification] = useState<DatasetClassificationFilterValue[]>([]);
  const [listPage, setListPage] = useState({ current: 1, pageSize: 50 });
  const referenceLookupLimitNoticeRef = useRef<string>('');
  const attachReviewState = async (result: {
    data?: LifeCycleModelTable[];
    page?: number;
    success?: boolean;
    total?: number;
  }) => {
    if (dataSource !== 'my' || !Array.isArray(result?.data)) {
      return result;
    }

    return {
      ...result,
      data: await attachStateCodesToRows('lifecyclemodels', result.data),
    };
  };

  useEffect(() => {
    if (dataSource === 'my' && id && version) {
      setEditId(id);
      setEditVersion(version);
      if (routeMode === 'view') {
        setEditDrawerVisible(false);
        setViewDrawerVisible(true);
      } else {
        setViewDrawerVisible(false);
        setEditDrawerVisible(true);
      }
    }
  }, [dataSource, id, routeMode, version]);

  const handleRouteDrawerClose = () => {
    setEditDrawerVisible(false);
    setViewDrawerVisible(false);
    setEditId('');
    setEditVersion('');
  };
  const processColumns: ProColumns<LifeCycleModelTable>[] = [
    {
      ...dataListIndexColumn<LifeCycleModelTable>(),
      title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
      dataIndex: 'index',
      valueType: 'index',
    },
    {
      ...dataListTextColumn<LifeCycleModelTable>(320),
      title: <FormattedMessage id='pages.table.title.name' defaultMessage='Name' />,
      dataIndex: 'name',
      sorter: true,
      search: false,
      render: (_, row) => {
        return dataListText(row.name, row.generalComment);
      },
    },
    {
      ...dataListTextColumn<LifeCycleModelTable>(132),
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
              searchTableName='lifecyclemodels'
              columns={getAllVersionsColumns(processColumns, 3)}
              searchColume={`
                id,
                json->lifeCycleModelDataSet->lifeCycleModelInformation->dataSetInformation->name,
                json->lifeCycleModelDataSet->lifeCycleModelInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
                json->lifeCycleModelDataSet->lifeCycleModelInformation->dataSetInformation->"common:generalComment",
                version,
                modified_at,
                state_code,
                team_id
              `}
              id={row.id}
              addVersionComponent={({ newVersion }) => (
                <LifeCycleModelCreate
                  newVersion={newVersion}
                  actionType='createVersion'
                  id={row.id}
                  version={row.version}
                  lang={lang}
                  buttonType={'icon'}
                  actionRef={actionRef}
                />
              )}
              operationRender={(versionRow) => {
                const optionColumn = processColumns.find((column) => column.dataIndex === 'option');
                return optionColumn?.render?.(
                  null as any,
                  versionRow,
                  0,
                  undefined as any,
                  {} as any,
                ) as any;
              }}
              operationColumnWidth={isMobileDataList ? 72 : dataSource === 'my' ? 184 : 152}
            ></AllVersionsList>
          </Space>
        );
      },
    },
    {
      ...dataListTextColumn<LifeCycleModelTable>(180, DATA_LIST_COLUMN_RESPONSIVE.wide),
      title: <FormattedMessage id='pages.table.title.updatedAt' defaultMessage='Updated at' />,
      dataIndex: 'modifiedAt',
      valueType: 'dateTime',
      sorter: false,
      search: false,
    },
    {
      ...dataListActionColumn<LifeCycleModelTable>(
        isMobileDataList ? 72 : dataSource === 'my' ? 184 : 152,
      ),
      title: <FormattedMessage id='pages.table.title.option' defaultMessage='Actions' />,
      dataIndex: 'option',
      render: (_, row) => {
        const actionDisabled = isDataUnderReview(row.stateCode);
        if (dataSource === 'my') {
          return [
            <ResponsiveDataListActions
              key={0}
              isMobile={isMobileDataList}
              moreMenus={[
                {
                  key: 'export',
                  name: (
                    <ExportData tableName='lifecyclemodels' id={row.id} version={row.version} />
                  ),
                },
                {
                  key: 'copy',
                  name: (
                    <LifeCycleModelCreate
                      actionType='copy'
                      id={row.id}
                      version={row.version}
                      lang={lang}
                      actionRef={actionRef}
                      buttonType={'icon'}
                    />
                  ),
                },
                {
                  key: 'contribute',
                  name: (
                    <ContributeData
                      onOk={async () => {
                        const contributeResult = await contributeLifeCycleModel(
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
                          actionRef.current?.reload();
                        }
                      }}
                      disabled={!!row.teamId}
                    />
                  ),
                },
              ]}
            >
              <LifeCycleModelView
                id={row.id}
                version={row.version}
                lang={lang}
                buttonType={'icon'}
                actionRef={actionRef}
              />
              <LifeCycleModelEdit
                disabled={actionDisabled}
                id={row.id}
                version={row.version}
                lang={lang}
                actionRef={actionRef}
                buttonType={'icon'}
              />
              <LifeCycleModelDelete
                disabled={actionDisabled}
                id={row.id}
                version={row.version}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => {}}
              />
            </ResponsiveDataListActions>,
          ];
        }
        return [
          <ResponsiveDataListActions key={0} isMobile={isMobileDataList}>
            <LifeCycleModelView id={row.id} version={row.version} lang={lang} buttonType={'icon'} />
            <LifeCycleModelCreate
              actionType='copy'
              id={row.id}
              version={row.version}
              lang={lang}
              actionRef={actionRef}
              buttonType={'icon'}
            />
            <ExportData tableName='lifecyclemodels' id={row.id} version={row.version} />
          </ResponsiveDataListActions>,
        ];
      },
    },
  ];

  const onSearch: SearchProps['onSearch'] = (value) => {
    setKeyWord(value);
    setSearchRevision((revision) => revision + 1);
    if (referenceLookup && !getReferenceLookupUuid(value)) {
      showInvalidReferenceLookupUuidMessage(intl);
    }
  };

  useEffect(() => {
    getTeamById(tid ?? '').then((res) => {
      if (res.data.length > 0) {
        setTeam(res.data[0] as TeamTable);
      }
    });
  }, []);

  const handleImportData = (jsonData: LifeCycleModelImportData) => {
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
          <ProTable<LifeCycleModelTable, LifeCycleModelTableRequestParams>
            key={`lifecycle-model-table:${dataSource}:${tid ?? ''}`}
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
                    onChange={(e) => {
                      setOpenAI(e.target.checked);
                      if (e.target.checked) {
                        setReferenceLookup(false);
                      }
                    }}
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
                      onChange={(e) => {
                        setReferenceLookup(e.target.checked);
                        if (e.target.checked) {
                          setOpenAI(false);
                        }
                      }}
                    >
                      <FormattedMessage
                        id='pages.search.referenceLookup'
                        defaultMessage='Reference Lookup'
                      />
                    </Checkbox>
                    <ReferenceLookupHelpIcon />
                  </Space>
                  <DatasetClassificationFilter
                    datasetKind='lifecyclemodel'
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
            dataSource={tableDataSource}
            onDataSourceChange={setTableDataSource}
            params={{
              locale: appLocale,
              classification,
              dataSource,
              teamId: tid ?? '',
              keyword: keyWord,
              searchRevision,
              searchMode: referenceLookup ? 'reference' : openAI ? 'ai' : 'keyword',
              stateCode,
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
                      setStateCode(val);
                    }}
                  />,
                ];
                return [
                  ...filters,
                  <LifeCycleModelCreate
                    importData={importData}
                    onClose={() => setImportData(null)}
                    key={0}
                    lang={lang}
                    actionRef={actionRef}
                    buttonType={'icon'}
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
              params: LifeCycleModelTableRequestParams & { pageSize?: number; current?: number },
              sort,
            ) => {
              const {
                locale: requestedLocale,
                dataSource: requestedDataSource,
                teamId: requestedTeamId,
                keyword: requestedKeyword,
                searchRevision: _searchRevision,
                searchMode,
                stateCode: requestedStateCode,
                openDataFilterRevision: _openDataFilterRevision,
                ...requestParams
              } = params;
              void _searchRevision;
              void _openDataFilterRevision;
              setTableDataSource([]);
              return guardLocaleMaterializedTableRequest(
                requestedLocale,
                () => currentAppLocaleRef.current,
                tableRequestEpochRef,
                async ({ isCurrentRequest }) => {
                  if (searchMode === 'reference') {
                    const referenceLookupUuid = getReferenceLookupUuid(requestedKeyword);
                    if (!referenceLookupUuid) {
                      return attachReviewState(
                        getReferenceLookupEmptyResult(requestParams.current),
                      );
                    }
                    const referenceLookupTeamId = getReferenceLookupTeamId(requestedTeamId);

                    const result = await getLifeCycleModelTableUuidMentionSearch(
                      requestParams,
                      lang,
                      requestedDataSource,
                      referenceLookupUuid,
                      requestedStateCode,
                      referenceLookupTeamId,
                      ...getOpenDataCatalogFilterArgs(requestedDataSource, openDataFilters),
                    );
                    const noticeKey = [
                      requestedDataSource,
                      referenceLookupUuid,
                      requestedStateCode,
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
                  if (requestedKeyword.length > 0) {
                    let orderBy:
                      | {
                          key: 'common:class' | 'baseName';
                          lang?: SupportedServiceQueryLanguage;
                          order: 'asc' | 'desc';
                        }
                      | undefined;
                    const activeSort = getActiveTableSort(sort);
                    if (activeSort) {
                      const { field, order } = activeSort;
                      if (field === 'name') {
                        orderBy = {
                          key: 'baseName',
                          lang: getServiceQueryLanguage(lang),
                          order: order === 'ascend' ? 'asc' : 'desc',
                        };
                      } else if (field === 'classification') {
                        orderBy = {
                          key: 'common:class',
                          order: order === 'ascend' ? 'asc' : 'desc',
                        };
                      }
                    }
                    if (searchMode === 'ai') {
                      return attachReviewState(
                        await lifeCycleModel_hybrid_search(
                          requestParams,
                          lang,
                          requestedDataSource,
                          requestedKeyword,
                          {},
                          requestedStateCode,
                          requestedDataSource === 'tg' ? openDataFilters : undefined,
                          requestedTeamId,
                        ),
                      );
                    }
                    return attachReviewState(
                      await getLifeCycleModelTablePgroongaSearch(
                        requestParams,
                        lang,
                        requestedDataSource,
                        requestedKeyword,
                        {},
                        requestedStateCode,
                        orderBy,
                        requestedTeamId,
                        ...getOpenDataCatalogFilterArgs(requestedDataSource, openDataFilters),
                      ),
                    );
                  }
                  return attachReviewState(
                    await getLifeCycleModelTableAll(
                      requestParams,
                      sort,
                      lang,
                      requestedDataSource,
                      requestedTeamId,
                      requestedStateCode,
                      ...getOpenDataCatalogFilterArgs(requestedDataSource, openDataFilters),
                    ),
                  );
                },
              );
            }}
            columns={orderDataListColumns(processColumns, {
              dataType: <FormattedMessage id='menu.tgdata.models' />,
              pagination: listPage,
            })}
          />
        )}
      </ResponsiveDataListViewport>

      {editDrawerVisible && editId && editVersion && (
        <LifeCycleModelEdit
          id={editId}
          version={editVersion}
          lang={lang}
          actionRef={actionRef}
          buttonType={'icon'}
          autoOpen={true}
          autoCheckRequired={required}
          onDrawerClose={handleRouteDrawerClose}
        />
      )}
      {viewDrawerVisible && editId && editVersion && (
        <LifeCycleModelView
          id={editId}
          version={editVersion}
          lang={lang}
          actionRef={actionRef}
          buttonType={'icon'}
          autoOpen={true}
          onDrawerClose={handleRouteDrawerClose}
        />
      )}
    </PageContainer>
  );
};

export default TableList;
