import DatasetClassificationFilter from '@/components/DatasetClassificationFilter';
import type { DatasetClassificationFilterValue } from '@/services/general/datasetClassification';
import {
  flow_hybrid_search,
  getFlowTableAll,
  getFlowTablePgroongaSearch,
  getFlowTableUuidMentionSearch,
} from '@/services/flows/api';
import { Checkbox, Input, Space, App, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';

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
import { FlowImportData, FlowTable } from '@/services/flows/data';
import { attachStateCodesToRows, contributeSource } from '@/services/general/api';
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
import { getActiveTableSort, mapActiveTableSort } from '@/services/general/tableSort';
import { getDataSource, getLang, getLangText, isDataUnderReview } from '@/services/general/util';
import { getTeamById } from '@/services/teams/api';
import { TeamTable } from '@/services/teams/data';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { SearchProps } from 'antd/es/input/Search';
import type { FC } from 'react';
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
import FlowsCreate from './Components/create';
import FlowsDelete from './Components/delete';
import FlowsEdit from './Components/edit';
import { flowTypeOptions } from './Components/optiondata';
import FlowsView from './Components/view';

const { Search } = Input;

const TableList: FC = () => {
  const { message } = App.useApp();
  const [, setKeyWord] = useState<string>('');
  const [team, setTeam] = useState<TeamTable | null>(null);
  const [importData, setImportData] = useState<FlowImportData | null>(null);
  const [openAI, setOpenAI] = useState<boolean>(false);
  const [referenceLookup, setReferenceLookup] = useState<boolean>(false);
  const [editDrawerVisible, setEditDrawerVisible] = useState<boolean>(false);
  const [editId, setEditId] = useState<string>('');
  const [editVersion, setEditVersion] = useState<string>('');
  const [flowType, setFlowType] = useState('');
  const isMobileDataList = useResponsiveDataListMobile();
  const location = useLocation();
  const dataSource = getDataSource(location.pathname);
  const [openDataFilters, setOpenDataFilters] = useState<OpenDataCatalogFilterValue>({
    ...DEFAULT_OPEN_DATA_FILTERS,
  });
  const [, setStateCode] = useState<string | number>('all');
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
  const keyWordRef = useRef<string>('');
  const stateCodeRef = useRef<string | number>('all');
  const referenceLookupLimitNoticeRef = useRef<string>('');

  const actionRef = useRef<ActionType | undefined>(undefined);
  const [classification, setClassification] = useState<DatasetClassificationFilterValue[]>([]);
  const [listPage, setListPage] = useState({ current: 1, pageSize: 50 });
  const attachReviewState = async (result: {
    data?: FlowTable[];
    page?: number;
    success?: boolean;
    total?: number;
  }) => {
    if (dataSource !== 'my' || !Array.isArray(result?.data)) {
      return result;
    }

    return {
      ...result,
      data: await attachStateCodesToRows('flows', result.data),
    };
  };

  useEffect(() => {
    if (dataSource === 'my' && id && version) {
      setEditId(id);
      setEditVersion(version);
      setEditDrawerVisible(true);
    }
  }, [dataSource, id, version]);
  const flowsColumns: ProColumns<FlowTable>[] = [
    {
      ...dataListIndexColumn<FlowTable>(),
      title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
      dataIndex: 'index',
      valueType: 'index',
    },
    {
      ...dataListTextColumn<FlowTable>(300),
      title: <FormattedMessage id='pages.table.title.name' defaultMessage='Name' />,
      dataIndex: 'name',
      sorter: true,
      search: false,
      render: (_, row) => {
        return dataListText(row.name, row.synonyms);
      },
    },
    {
      ...dataListTextColumn<FlowTable>(160, DATA_LIST_COLUMN_RESPONSIVE.desktop),
      title: <FormattedMessage id='pages.flow.flowType' defaultMessage='Flow type' />,
      dataIndex: 'flowType',
      sorter: false,
      search: false,
      render: (_, row) => {
        const flowType = flowTypeOptions.find((i) => i.value === row.flowType);
        if (flowType) {
          return dataListText(flowType.label);
        }
        return dataListText(row.flowType);
      },
    },

    {
      ...dataListTextColumn<FlowTable>(132, DATA_LIST_COLUMN_RESPONSIVE.wide),
      title: <FormattedMessage id='pages.flow.CASNumber' defaultMessage='CAS Number' />,
      dataIndex: 'CASNumber',
      sorter: false,
      search: false,
    },
    {
      ...dataListTextColumn<FlowTable>(168, DATA_LIST_COLUMN_RESPONSIVE.wide),
      title: (
        <FormattedMessage id='pages.flow.locationOfSupply' defaultMessage='Location of supply' />
      ),
      dataIndex: 'locationOfSupply',
      sorter: false,
      search: false,
    },
    {
      ...dataListTextColumn<FlowTable>(132),
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
              searchTableName='flows'
              columns={getAllVersionsColumns(flowsColumns, 6)}
              searchColume={`
                id,
                json->flowDataSet->flowInformation->dataSetInformation->name,
                json->flowDataSet->flowInformation->dataSetInformation->classificationInformation,
                json->flowDataSet->flowInformation->dataSetInformation->"common:synonyms",
                json->flowDataSet->flowInformation->dataSetInformation->>CASNumber,
                json->flowDataSet->flowInformation->geography->>locationOfSupply,
                json->flowDataSet->modellingAndValidation->LCIMethod->>typeOfDataSet,
                json->flowDataSet->flowProperties->flowProperty->referenceToFlowPropertyDataSet,
                version,
                modified_at,
                state_code,
                team_id
              `}
              id={row.id}
              addVersionComponent={({ newVersion }) => (
                <FlowsCreate
                  newVersion={newVersion}
                  actionType='createVersion'
                  id={row.id}
                  version={row.version}
                  lang={lang}
                  actionRef={actionRef}
                />
              )}
              operationRender={(versionRow) => {
                const optionColumn = flowsColumns.find((column) => column.dataIndex === 'option');
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
      ...dataListTextColumn<FlowTable>(180, DATA_LIST_COLUMN_RESPONSIVE.wide),
      title: <FormattedMessage id='pages.table.title.updatedAt' defaultMessage='Updated at' />,
      dataIndex: 'modifiedAt',
      valueType: 'dateTime',
      sorter: false,
      search: false,
    },
    {
      ...dataListActionColumn<FlowTable>(isMobileDataList ? 72 : dataSource === 'my' ? 184 : 152),
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
                  name: <ExportData tableName='flows' id={row.id} version={row.version} />,
                },
                {
                  key: 'copy',
                  name: (
                    <FlowsCreate
                      actionType='copy'
                      id={row.id}
                      version={row.version}
                      lang={lang}
                      actionRef={actionRef}
                    />
                  ),
                },
                {
                  key: 'contribute',
                  name: (
                    <ContributeData
                      onOk={async () => {
                        const contributeResult = await contributeSource(
                          'flows',
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
              <FlowsView
                // actionRef={actionRef}
                buttonType={'icon'}
                id={row.id}
                version={row.version}
                lang={lang}
              />
              <FlowsEdit
                disabled={actionDisabled}
                id={row.id}
                version={row.version}
                lang={lang}
                buttonType={'icon'}
                actionRef={actionRef}
              />
              <FlowsDelete
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
            <FlowsView
              // actionRef={actionRef}
              buttonType={'icon'}
              id={row.id}
              version={row.version}
              lang={lang}
            />
            <FlowsCreate
              actionType='copy'
              id={row.id}
              version={row.version}
              lang={lang}
              actionRef={actionRef}
            />
            <ExportData tableName='flows' id={row.id} version={row.version} />
          </ResponsiveDataListActions>,
        ];
      },
    },
  ];

  useEffect(() => {
    getTeamById(tid ?? '').then((res) => {
      const teamData = (res.data as TeamTable[])[0];
      if (teamData) {
        setTeam(teamData);
      }
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
  const handleImportData = (jsonData: FlowImportData) => {
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
          <ProTable<FlowTable, LocaleAwareTableParams>
            key={`flows-table:${dataSource}:${tid ?? ''}`}
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
                  <Select
                    aria-label={intl.formatMessage({ id: 'pages.flow.flowType' })}
                    placeholder={intl.formatMessage({ id: 'pages.flow.flowType' })}
                    allowClear
                    value={flowType || undefined}
                    options={flowTypeOptions}
                    style={{ width: 180 }}
                    onChange={(next) => {
                      setFlowType(next ?? '');
                      setClassification([]);
                      actionRef.current?.setPageInfo?.({ current: 1 });
                    }}
                  />
                  <DatasetClassificationFilter
                    datasetKind='flow'
                    flowType={flowType}
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
              datasetFilters: { flowType },
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
                      setStateCode(val);
                      actionRef.current?.reload();
                    }}
                  />,
                ];
                return [
                  ...filters,
                  <FlowsCreate
                    importData={importData}
                    onClose={() => setImportData(null)}
                    key={0}
                    lang={lang}
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
                  const flowTypeFilter = flowType;
                  const classificationFilter = requestParams.classification ?? [];
                  const searchFilters = {
                    flowType: flowTypeFilter,
                    ...(classificationFilter.length > 0
                      ? { classification: classificationFilter }
                      : {}),
                  };
                  if (referenceLookup) {
                    const referenceLookupUuid = getReferenceLookupUuid(currentKeyWord);
                    if (!referenceLookupUuid) {
                      return attachReviewState(
                        getReferenceLookupEmptyResult(requestParams.current),
                      );
                    }
                    const referenceLookupTeamId = getReferenceLookupTeamId(tid);

                    const result = await getFlowTableUuidMentionSearch(
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
                      JSON.stringify(searchFilters),
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
                      }
                    }
                    if (openAI) {
                      return attachReviewState(
                        await flow_hybrid_search(
                          requestParams,
                          lang,
                          dataSource,
                          currentKeyWord,
                          searchFilters,
                          currentStateCode,
                          tid ?? '',
                          ...getOpenDataCatalogFilterArgs(dataSource, openDataFilters),
                        ),
                      );
                    }
                    return attachReviewState(
                      await getFlowTablePgroongaSearch(
                        requestParams,
                        lang,
                        dataSource,
                        currentKeyWord,
                        searchFilters,
                        currentStateCode,
                        orderBy,
                        tid ?? '',
                        ...getOpenDataCatalogFilterArgs(dataSource, openDataFilters),
                      ),
                    );
                  }

                  const sortFields: Record<string, string> = {
                    name: 'json->flowDataSet->flowInformation->dataSetInformation->name',
                  };

                  const convertedSort = mapActiveTableSort(sort, sortFields);

                  return attachReviewState(
                    await getFlowTableAll(
                      requestParams,
                      convertedSort,
                      lang,
                      dataSource,
                      tid ?? '',
                      searchFilters,
                      currentStateCode,
                      ...getOpenDataCatalogFilterArgs(dataSource, openDataFilters),
                    ),
                  );
                },
              );
            }}
            columns={orderDataListColumns(flowsColumns, {
              dataType: <FormattedMessage id='menu.tgdata.flows' />,
              pagination: listPage,
            })}
          />
        )}
      </ResponsiveDataListViewport>

      {editDrawerVisible && editId && editVersion && (
        <FlowsEdit
          id={editId}
          version={editVersion}
          lang={lang}
          buttonType={'icon'}
          actionRef={actionRef}
          autoOpen={true}
          autoCheckRequired={required}
          onDrawerClose={() => setEditDrawerVisible(false)}
        />
      )}
    </PageContainer>
  );
};

export default TableList;
