import DatasetClassificationFilter from '@/components/DatasetClassificationFilter';
import type { DatasetClassificationFilterValue } from '@/services/general/datasetClassification';
import {
  flowproperty_hybrid_search,
  getFlowpropertyTableAll,
  getFlowpropertyTablePgroongaSearch,
  getFlowpropertyTableUuidMentionSearch,
} from '@/services/flowproperties/api';
import { FlowpropertyImportData, FlowpropertyTable } from '@/services/flowproperties/data';
import { attachStateCodesToRows } from '@/services/general/api';
import {
  guardLocaleMaterializedTableRequest,
  syncLocaleMaterializedTableRequestEpochs,
  type LocaleAwareTableParams,
} from '@/services/general/data';
import {
  DEFAULT_BROWSER_APP_LOCALE,
  normalizeRuntimeLocale,
} from '@/services/general/runtimeLocale';
import {
  getDataSource,
  getLang,
  getLangText,
  getUnitData,
  isDataUnderReview,
} from '@/services/general/util';
import { getRoleByUserId } from '@/services/roles/api';
import { TeamTable } from '@/services/teams/data';
import { InfoCircleOutlined } from '@ant-design/icons';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { Checkbox, Input, Space, Tooltip } from 'antd';
import type { FC, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';

import AllVersionsList from '@/components/AllVersions';
import OpenDataCatalogFilters from '@/components/OpenDataCatalogFilters';
import { getTeamById } from '@/services/teams/api';
import { SearchProps } from 'antd/es/input/Search';
// import ReferenceUnit from '../Unitgroups/Components/Unit/reference';
import { toSuperscript } from '@/components/AlignedNumber';
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
import { getAllVersionsColumns } from '../Utils';
import {
  getReferenceLookupPaginationProps,
  getReferenceLookupTeamId,
  getReferenceLookupUuid,
  showInvalidReferenceLookupUuidMessage,
  showReferenceLookupLimitMessage,
} from '../Utils/referenceLookup';
import ReferenceLookupHelpIcon from '../Utils/ReferenceLookupHelpIcon';
import { useSubmittedDatasetSearch } from '../Utils/useSubmittedDatasetSearch';
import FlowpropertiesCreate from './Components/create';
import FlowpropertiesEdit from './Components/edit';
import FlowpropertyView from './Components/view';

const { Search } = Input;

const TableList: FC = () => {
  const [, setStateCode] = useState<string | number>('all');
  const [team, setTeam] = useState<TeamTable | null>(null);
  const [importData, setImportData] = useState<FlowpropertyImportData | null>(null);
  const { draftMode, setDraftMode, submitted, submittedRef, submitSearch } =
    useSubmittedDatasetSearch();
  const [isSystemAdmin, setIsSystemAdmin] = useState<boolean>(false);
  const [viewDrawerVisible, setViewDrawerVisible] = useState<boolean>(false);
  const [viewId, setViewId] = useState<string>('');
  const [viewVersion, setViewVersion] = useState<string>('');
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

  const intl = useIntl();

  const appLocale = normalizeRuntimeLocale(intl.locale) ?? DEFAULT_BROWSER_APP_LOCALE;
  const lang = getLang(appLocale);
  const currentAppLocaleRef = useRef(appLocale);
  const tableRequestEpochRef = useRef(0);
  syncLocaleMaterializedTableRequestEpochs(currentAppLocaleRef, appLocale, [tableRequestEpochRef]);
  const shouldShowFlowpropertyTip = (dataSource === 'my' && !isSystemAdmin) || dataSource === 'te';

  const actionRef = useRef<ActionType | undefined>(undefined);
  const [classification, setClassification] = useState<DatasetClassificationFilterValue[]>([]);
  const [listPage, setListPage] = useState({ current: 1, pageSize: 50 });
  const stateCodeRef = useRef<string | number>('all');
  const referenceLookupLimitNoticeRef = useRef<string>('');
  const openAI = draftMode === 'smart';
  const referenceLookup = draftMode === 'reference';
  const attachReviewState = async (result: {
    data?: FlowpropertyTable[];
    page?: number;
    success?: boolean;
    total?: number;
  }) => {
    if (dataSource !== 'my' || !Array.isArray(result?.data)) {
      return result;
    }

    return {
      ...result,
      data: await attachStateCodesToRows('flowproperties', result.data),
    };
  };
  const attachRefUnitData = async (result: {
    data?: FlowpropertyTable[];
    page?: number;
    success?: boolean;
    total?: number;
  }) => {
    const resultWithReviewState = await attachReviewState(result);
    return {
      ...resultWithReviewState,
      data: ((await getUnitData('unitgroup', resultWithReviewState?.data ?? [])) ?? []) as
        FlowpropertyTable[] | undefined,
    };
  };

  const renderFlowpropertyActions = (
    row: FlowpropertyTable,
    listActionRef: RefObject<ActionType | undefined> = actionRef,
  ) => {
    if (dataSource === 'my') {
      return [
        <ResponsiveDataListActions
          key={0}
          isMobile={isMobileDataList}
          moreMenus={[
            {
              key: 'export',
              name: <ExportData tableName='flowproperties' id={row.id} version={row.version} />,
            },
          ]}
        >
          <FlowpropertyView
            actionRef={listActionRef}
            lang={lang}
            buttonType={'icon'}
            id={row.id}
            version={row.version}
          />
          {isSystemAdmin && (
            <FlowpropertiesEdit
              disabled={isDataUnderReview(row.stateCode)}
              id={row.id}
              version={row.version}
              buttonType='icon'
              actionRef={listActionRef}
              lang={lang}
            />
          )}
        </ResponsiveDataListActions>,
      ];
    }

    return [
      <ResponsiveDataListActions key={0} isMobile={isMobileDataList}>
        <FlowpropertyView
          actionRef={listActionRef}
          lang={lang}
          buttonType={'icon'}
          id={row.id}
          version={row.version}
        />
        <FlowpropertiesCreate
          disabled={!isSystemAdmin}
          actionType='copy'
          id={row.id}
          version={row.version}
          actionRef={listActionRef}
          lang={lang}
        />
        <ExportData tableName='flowproperties' id={row.id} version={row.version} />
      </ResponsiveDataListActions>,
    ];
  };

  useEffect(() => {
    if (dataSource === 'my' && id && version) {
      setViewId(id);
      setViewVersion(version);
      setViewDrawerVisible(true);
    }
  }, [dataSource, id, version]);
  const flowpropertiesColumns: ProColumns<FlowpropertyTable>[] = [
    {
      ...dataListIndexColumn<FlowpropertyTable>(),
      title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
      dataIndex: 'index',
      valueType: 'index',
    },
    {
      ...dataListTextColumn<FlowpropertyTable>(300),
      title: <FormattedMessage id='pages.table.title.name' defaultMessage='Name' />,
      dataIndex: 'name',
      sorter: false,
      render: (_, row) => dataListText(row.name, row.generalComment),
    },
    {
      ...dataListTextColumn<FlowpropertyTable>(260, DATA_LIST_COLUMN_RESPONSIVE.desktop),
      title: (
        <FormattedMessage
          id='pages.flowproperty.referenceToReferenceUnitGroup'
          defaultMessage='Reference unit'
        />
      ),
      dataIndex: 'refUnitGroup',
      sorter: false,
      search: false,
      render: (_, row) => {
        return [
          <span className='responsive-data-list-cell-text' key={0}>
            {getLangText(row.refUnitRes?.name, lang)} (
            <Tooltip
              placement='topLeft'
              title={getLangText(row.refUnitRes?.refUnitGeneralComment, lang)}
            >
              {toSuperscript((row.refUnitRes?.refUnitName as unknown as string) ?? '')}
            </Tooltip>
            )
          </span>,
        ];
      },
    },
    {
      ...dataListTextColumn<FlowpropertyTable>(132),
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
              searchTableName='flowproperties'
              columns={getAllVersionsColumns(flowpropertiesColumns, 4)}
              searchColume={`
                  id,
                  json->flowPropertyDataSet->flowPropertiesInformation->dataSetInformation->"common:name",
                  json->flowPropertyDataSet->flowPropertiesInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
                  json->flowPropertyDataSet->flowPropertiesInformation->dataSetInformation->"common:generalComment",
                  json->flowPropertyDataSet->flowPropertiesInformation->quantitativeReference->referenceToReferenceUnitGroup->>"@refObjectId",
                  json->flowPropertyDataSet->flowPropertiesInformation->quantitativeReference->referenceToReferenceUnitGroup->"common:shortDescription",
                  version,
                  modified_at,
                  team_id,
                  state_code
              `}
              id={row.id}
              addVersionComponent={
                dataSource === 'my'
                  ? undefined
                  : ({ newVersion }) => (
                      <FlowpropertiesCreate
                        newVersion={newVersion}
                        disabled={!isSystemAdmin}
                        actionType='createVersion'
                        id={row.id}
                        version={row.version}
                        lang={lang}
                        actionRef={actionRef}
                      />
                    )
              }
              operationRender={(versionRow, { actionRef: allVersionsActionRef }) =>
                renderFlowpropertyActions(versionRow as FlowpropertyTable, allVersionsActionRef)
              }
              operationColumnWidth={
                isMobileDataList ? 88 : dataSource === 'my' ? (isSystemAdmin ? 144 : 104) : 184
              }
            ></AllVersionsList>
          </Space>
        );
      },
    },
    {
      ...dataListTextColumn<FlowpropertyTable>(180, DATA_LIST_COLUMN_RESPONSIVE.wide),
      title: <FormattedMessage id='pages.table.title.updatedAt' defaultMessage='Updated at' />,
      dataIndex: 'modifiedAt',
      valueType: 'dateTime',
      sorter: false,
      search: false,
    },
    {
      ...dataListActionColumn<FlowpropertyTable>(
        isMobileDataList ? 72 : dataSource === 'my' ? (isSystemAdmin ? 144 : 104) : 152,
      ),
      title: <FormattedMessage id='pages.table.title.option' defaultMessage='Actions' />,
      dataIndex: 'option',
      render: (_, row) => renderFlowpropertyActions(row),
    },
  ];

  useEffect(() => {
    getTeamById(tid ?? '').then((res) => {
      if (res.data.length > 0) setTeam(res.data[0] as TeamTable);
    });
    getRoleByUserId().then((res) => {
      const systemAdmin = res?.find(
        (item) => item.team_id === '00000000-0000-0000-0000-000000000000' && item.role === 'admin',
      );
      setIsSystemAdmin(!!systemAdmin);
    });
  }, []);

  const onSearch: SearchProps['onSearch'] = (value, _event, info) => {
    if (info?.source === 'clear') return;
    if (!submitSearch(value)) {
      showInvalidReferenceLookupUuidMessage(intl);
      return;
    }
    tableRequestEpochRef.current += 1;
    setListPage((page) => ({ ...page, current: 1 }));
    actionRef.current?.setPageInfo?.({ current: 1 });
    actionRef.current?.reload();
  };

  const handleImportData = (jsonData: FlowpropertyImportData) => {
    setImportData(jsonData);
  };

  return (
    <PageContainer
      header={{
        title: team?.json?.title ? getLangText(team?.json?.title, lang) : false,
        breadcrumb: {},
      }}
    >
      <ResponsiveDataListViewport columns={flowpropertiesColumns}>
        {({ scroll }) => (
          <ProTable<FlowpropertyTable, LocaleAwareTableParams>
            key={`flowproperties-table:${dataSource}:${tid ?? ''}`}
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
                    onChange={(e) => setDraftMode(e.target.checked ? 'smart' : 'normal')}
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
                      onChange={(e) => setDraftMode(e.target.checked ? 'reference' : 'normal')}
                    >
                      <FormattedMessage
                        id='pages.search.referenceLookup'
                        defaultMessage='Reference Lookup'
                      />
                    </Checkbox>
                    <ReferenceLookupHelpIcon />
                  </Space>
                  {shouldShowFlowpropertyTip && (
                    <Tooltip title={<FormattedMessage id='pages.flowproperty.title.tips' />}>
                      <InfoCircleOutlined />
                    </Tooltip>
                  )}
                  <DatasetClassificationFilter
                    datasetKind='flowproperty'
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
              ...getReferenceLookupPaginationProps(submitted.mode === 'reference'),
            }}
            toolBarRender={() => {
              if (dataSource === 'my') {
                return [
                  <TableFilter
                    key={2}
                    width={isMobileDataList ? 120 : 140}
                    onChange={(val) => {
                      stateCodeRef.current = val;
                      setStateCode(val);
                      actionRef.current?.reload();
                    }}
                  />,
                  <FlowpropertiesCreate
                    disabled={!isSystemAdmin}
                    importData={importData}
                    onClose={() => setImportData(null)}
                    lang={lang}
                    key={0}
                    actionRef={actionRef}
                  />,
                  <ImportData disabled={!isSystemAdmin} onJsonData={handleImportData} key={1} />,
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
              const submittedSearch = submittedRef.current;
              return guardLocaleMaterializedTableRequest(
                requestedLocale,
                () => currentAppLocaleRef.current,
                tableRequestEpochRef,
                async ({ isCurrentRequest }) => {
                  const currentKeyWord = submittedSearch.keyword;
                  const currentStateCode = stateCodeRef.current;
                  if (submittedSearch.mode === 'reference') {
                    // Reference snapshots are published only after UUID validation.
                    const referenceLookupUuid = getReferenceLookupUuid(currentKeyWord)!;
                    const referenceLookupTeamId = getReferenceLookupTeamId(tid);

                    const result = await getFlowpropertyTableUuidMentionSearch(
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
                    return attachRefUnitData(result);
                  }
                  if (currentKeyWord.length > 0) {
                    if (submittedSearch.mode === 'smart') {
                      return attachRefUnitData(
                        await flowproperty_hybrid_search(
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
                    return attachRefUnitData(
                      await getFlowpropertyTablePgroongaSearch(
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
                  return attachRefUnitData(
                    await getFlowpropertyTableAll(
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
            columns={orderDataListColumns(flowpropertiesColumns, {
              dataType: <FormattedMessage id='menu.tgdata.flowproperties' />,
              pagination: listPage,
            })}
          />
        )}
      </ResponsiveDataListViewport>

      {viewDrawerVisible && viewId && viewVersion && (
        <FlowpropertyView
          id={viewId}
          version={viewVersion}
          buttonType={'icon'}
          actionRef={actionRef}
          lang={lang}
          autoOpen={true}
          onDrawerClose={() => setViewDrawerVisible(false)}
        />
      )}
    </PageContainer>
  );
};

export default TableList;
