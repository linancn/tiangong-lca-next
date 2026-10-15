import DatasetClassificationFilter from '@/components/DatasetClassificationFilter';
import type { DatasetClassificationFilterValue } from '@/services/general/datasetClassification';
import { toSuperscript } from '@/components/AlignedNumber';
import AllVersionsList from '@/components/AllVersions';
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
import { getOpenDataCatalogArgs } from '@/services/openDataCatalog/types';
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
import { getDataSource, getLang, getLangText, isDataUnderReview } from '@/services/general/util';
import { getRoleByUserId } from '@/services/roles/api';
import { getTeamById } from '@/services/teams/api';
import { TeamTable } from '@/services/teams/data';
import {
  getUnitGroupTableAll,
  getUnitGroupTablePgroongaSearch,
  getUnitGroupTableUuidMentionSearch,
  unitgroup_hybrid_search,
} from '@/services/unitgroups/api';
import { UnitGroupImportItem, UnitGroupTable } from '@/services/unitgroups/data';
import { InfoCircleOutlined } from '@ant-design/icons';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { Checkbox, Input, Space, Tooltip } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';
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
import UnitGroupCreate from './Components/create';
import UnitGroupEdit from './Components/edit';
import UnitGroupView from './Components/view';

const { Search } = Input;

const TableList: FC = () => {
  const [, setStateCode] = useState<string | number>('all');
  const [team, setTeam] = useState<TeamTable | null>(null);
  const [importData, setImportData] = useState<UnitGroupImportItem[] | null>(null);
  const { draftMode, setDraftMode, submitted, submittedRef, submitSearch } =
    useSubmittedDatasetSearch();
  const [isSystemAdmin, setIsSystemAdmin] = useState<boolean>(false);
  const [viewDrawerVisible, setViewDrawerVisible] = useState<boolean>(false);
  const [viewId, setViewId] = useState<string>('');
  const [viewVersion, setViewVersion] = useState<string>('');
  const isMobileDataList = useResponsiveDataListMobile();
  const location = useLocation();
  const dataSource = getDataSource(location.pathname);

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
  const shouldShowUnitGroupTip = (dataSource === 'my' && !isSystemAdmin) || dataSource === 'te';

  const actionRef = useRef<ActionType | undefined>(undefined);
  const [classification, setClassification] = useState<DatasetClassificationFilterValue[]>([]);
  const [listPage, setListPage] = useState({ current: 1, pageSize: 50 });
  const stateCodeRef = useRef<string | number>('all');
  const referenceLookupLimitNoticeRef = useRef<string>('');
  const openAI = draftMode === 'smart';
  const referenceLookup = draftMode === 'reference';
  const attachReviewState = async (result: {
    data?: UnitGroupTable[];
    page?: number;
    success?: boolean;
    total?: number;
  }) => {
    if (dataSource !== 'my' || !Array.isArray(result?.data)) {
      return result;
    }

    return {
      ...result,
      data: await attachStateCodesToRows('unitgroups', result.data),
    };
  };

  useEffect(() => {
    if (dataSource === 'my' && id && version) {
      setViewId(id);
      setViewVersion(version);
      setViewDrawerVisible(true);
    }
  }, [dataSource, id, version]);

  const renderUnitGroupActions = (
    row: UnitGroupTable,
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
              name: <ExportData tableName='unitgroups' id={row.id} version={row.version} />,
            },
          ]}
        >
          <UnitGroupView
            actionRef={listActionRef}
            lang={lang}
            id={row.id}
            version={row.version}
            buttonType={'icon'}
          />
          {isSystemAdmin && (
            <UnitGroupEdit
              disabled={isDataUnderReview(row.stateCode)}
              id={row.id}
              version={row.version}
              buttonType='icon'
              lang={lang}
              actionRef={listActionRef}
              setViewDrawerVisible={setViewDrawerVisible}
            />
          )}
        </ResponsiveDataListActions>,
      ];
    }

    return [
      <ResponsiveDataListActions key={0} isMobile={isMobileDataList}>
        <UnitGroupView
          actionRef={listActionRef}
          lang={lang}
          id={row.id}
          version={row.version}
          buttonType={'icon'}
        />
        <UnitGroupCreate
          disabled={!isSystemAdmin}
          actionType='copy'
          id={row.id}
          version={row.version}
          lang={lang}
          actionRef={listActionRef}
        />
        <ExportData tableName='unitgroups' id={row.id} version={row.version} />
      </ResponsiveDataListActions>,
    ];
  };

  const unitGroupColumns: ProColumns<UnitGroupTable>[] = [
    {
      ...dataListIndexColumn<UnitGroupTable>(),
      title: (
        <FormattedMessage id='pages.table.title.index' defaultMessage='Index'></FormattedMessage>
      ),
      valueType: 'index',
    },
    {
      ...dataListTextColumn<UnitGroupTable>(300),
      title: (
        <FormattedMessage id='pages.table.title.name' defaultMessage='Name'></FormattedMessage>
      ),
      dataIndex: 'name',
      sorter: false,
      render: (_, row) => dataListText(row.name),
    },
    {
      ...dataListTextColumn<UnitGroupTable>(180, DATA_LIST_COLUMN_RESPONSIVE.desktop),
      title: (
        <FormattedMessage
          id='pages.unitgroup.unit.quantitativeReference'
          defaultMessage='Quantitative reference'
        />
      ),
      dataIndex: 'refUnitName',
      sorter: false,
      search: false,
      render: (_, row) => {
        return dataListText(toSuperscript(row.refUnitName), row.refUnitGeneralComment);
      },
    },
    {
      ...dataListTextColumn<UnitGroupTable>(132),
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
              searchTableName='unitgroups'
              columns={getAllVersionsColumns(unitGroupColumns, 4)}
              searchColume={`
                id,
                json->unitGroupDataSet->unitGroupInformation->dataSetInformation->"common:name",
                json->unitGroupDataSet->unitGroupInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
                json->unitGroupDataSet->unitGroupInformation->quantitativeReference->>referenceToReferenceUnit,
                json->unitGroupDataSet->units->unit,
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
                      <UnitGroupCreate
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
                renderUnitGroupActions(versionRow as UnitGroupTable, allVersionsActionRef)
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
      ...dataListTextColumn<UnitGroupTable>(180, DATA_LIST_COLUMN_RESPONSIVE.wide),
      title: (
        <FormattedMessage
          id='pages.table.title.updatedAt'
          defaultMessage='Updated at'
        ></FormattedMessage>
      ),
      dataIndex: 'modifiedAt',
      valueType: 'dateTime',
      sorter: false,
      search: false,
    },
    {
      ...dataListActionColumn<UnitGroupTable>(
        isMobileDataList ? 72 : dataSource === 'my' ? (isSystemAdmin ? 144 : 104) : 152,
      ),
      title: (
        <FormattedMessage id='pages.table.title.option' defaultMessage='Actions'></FormattedMessage>
      ),
      dataIndex: 'option',
      render: (_, row) => renderUnitGroupActions(row),
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

  const handleImportData = (jsonData: UnitGroupImportItem[]) => {
    setImportData(jsonData);
  };

  return (
    <PageContainer
      header={{
        title: team?.json?.title ? getLangText(team?.json?.title, lang) : false,
        breadcrumb: {},
      }}
    >
      <ResponsiveDataListViewport columns={unitGroupColumns}>
        {({ scroll }) => (
          <ProTable<UnitGroupTable, LocaleAwareTableParams>
            key={`unitgroups-table:${dataSource}:${tid ?? ''}`}
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
                  {shouldShowUnitGroupTip && (
                    <Tooltip title={<FormattedMessage id='pages.unitgroup.title.tips' />}>
                      <InfoCircleOutlined />
                    </Tooltip>
                  )}
                  <DatasetClassificationFilter
                    datasetKind='unitgroup'
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
                  <UnitGroupCreate
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
              return [];
            }}
            request={async (
              params: LocaleAwareTableParams & { pageSize?: number; current?: number },
              sort,
            ) => {
              const { locale: requestedLocale, ...requestParams } = params;
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

                    const result = await getUnitGroupTableUuidMentionSearch(
                      requestParams,
                      lang,
                      dataSource,
                      referenceLookupUuid,
                      currentStateCode,
                      referenceLookupTeamId,
                      ...getOpenDataCatalogArgs(dataSource),
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
                    if (submittedSearch.mode === 'smart') {
                      return attachReviewState(
                        await unitgroup_hybrid_search(
                          requestParams,
                          lang,
                          dataSource,
                          currentKeyWord,
                          {},
                          currentStateCode,
                          tid ?? '',
                          ...getOpenDataCatalogArgs(dataSource),
                        ),
                      );
                    }
                    return attachReviewState(
                      await getUnitGroupTablePgroongaSearch(
                        requestParams,
                        lang,
                        dataSource,
                        currentKeyWord,
                        {},
                        currentStateCode,
                        tid ?? '',
                        ...getOpenDataCatalogArgs(dataSource),
                      ),
                    );
                  }
                  return attachReviewState(
                    await getUnitGroupTableAll(
                      requestParams,
                      sort,
                      lang,
                      dataSource,
                      tid ?? '',
                      currentStateCode,
                      ...getOpenDataCatalogArgs(dataSource),
                    ),
                  );
                },
              );
            }}
            columns={orderDataListColumns(unitGroupColumns, {
              dataType: <FormattedMessage id='menu.tgdata.unitgroups' />,
              pagination: listPage,
            })}
          />
        )}
      </ResponsiveDataListViewport>

      {viewDrawerVisible && viewId && viewVersion && (
        <UnitGroupView
          id={viewId}
          version={viewVersion}
          buttonType={'icon'}
          lang={lang}
          actionRef={actionRef}
          autoOpen={true}
          onDrawerClose={() => setViewDrawerVisible(false)}
        ></UnitGroupView>
      )}
    </PageContainer>
  );
};

export default TableList;
