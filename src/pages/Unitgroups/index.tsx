import { toSuperscript } from '@/components/AlignedNumber';
import AllVersionsList from '@/components/AllVersions';
import ExportData from '@/components/ExportData';
import {
  DATA_LIST_COLUMN_RESPONSIVE,
  ResponsiveDataListActions,
  dataListActionColumn,
  dataListIndexColumn,
  dataListText,
  dataListTextColumn,
  responsiveDataListTableProps,
  responsiveSearchCardClassName,
  responsiveSearchExtraColProps,
  responsiveSearchPrimaryColProps,
  responsiveSearchRowProps,
  useResponsiveDataListMobile,
} from '@/components/ResponsiveDataList';
import TableFilter from '@/components/TableFilter';
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
import { getDataSource, getLang, getLangText } from '@/services/general/util';
import { getRoleByUserId } from '@/services/roles/api';
import { getTeamById } from '@/services/teams/api';
import { TeamTable } from '@/services/teams/data';
import {
  getUnitGroupTableAll,
  getUnitGroupTablePgroongaSearch,
  getUnitGroupTableUuidMentionSearch,
} from '@/services/unitgroups/api';
import { UnitGroupTable } from '@/services/unitgroups/data';
import { InfoCircleOutlined } from '@ant-design/icons';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { Card, Checkbox, Col, Input, Row, Space, theme } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC, MutableRefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';
import { getAllVersionsColumns, getDataTitle } from '../Utils';
import {
  getReferenceLookupEmptyResult,
  getReferenceLookupPaginationProps,
  getReferenceLookupTeamId,
  getReferenceLookupUuid,
  showInvalidReferenceLookupUuidMessage,
  showReferenceLookupLimitMessage,
} from '../Utils/referenceLookup';
import ReferenceLookupHelpIcon from '../Utils/ReferenceLookupHelpIcon';
import UnitGroupCreate from './Components/create';
import UnitGroupView from './Components/view';

const { Search } = Input;

const TableList: FC = () => {
  const [keyWord, setKeyWord] = useState<string>('');
  const [, setStateCode] = useState<string | number>('all');
  const [team, setTeam] = useState<TeamTable | null>(null);
  const [referenceLookup, setReferenceLookup] = useState<boolean>(false);
  const [isSystemAdmin, setIsSystemAdmin] = useState<boolean>(false);
  const [viewDrawerVisible, setViewDrawerVisible] = useState<boolean>(false);
  const [viewId, setViewId] = useState<string>('');
  const [viewVersion, setViewVersion] = useState<string>('');
  const { token } = theme.useToken();
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
  const shouldShowUnitGroupTip = dataSource === 'my' || dataSource === 'te';

  const actionRef = useRef<ActionType>();
  const keyWordRef = useRef<string>('');
  const stateCodeRef = useRef<string | number>('all');
  const referenceLookupLimitNoticeRef = useRef<string>('');
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
    listActionRef: MutableRefObject<ActionType | undefined> = actionRef,
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
      ...dataListTextColumn<UnitGroupTable>(260, DATA_LIST_COLUMN_RESPONSIVE.desktop),
      title: (
        <FormattedMessage
          id='pages.table.title.classification'
          defaultMessage='Classification'
        ></FormattedMessage>
      ),
      dataIndex: 'classification',
      sorter: false,
      search: false,
      render: (_, row) => {
        return dataListText(row.classification);
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
              operationColumnWidth={isMobileDataList ? 88 : dataSource === 'my' ? 104 : 184}
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
        isMobileDataList ? 72 : dataSource === 'my' ? 104 : 152,
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
  const onSearch: SearchProps['onSearch'] = (value) => {
    keyWordRef.current = value;
    setKeyWord(value);
    actionRef.current?.setPageInfo?.({ current: 1 });
    if (referenceLookup && !getReferenceLookupUuid(value)) {
      showInvalidReferenceLookupUuidMessage(intl);
    }
    actionRef.current?.reload();
  };

  return (
    <PageContainer
      header={{
        title: team?.json?.title ? getLangText(team?.json?.title, lang) : false,
        breadcrumb: {},
      }}
    >
      <Card className={responsiveSearchCardClassName}>
        <Row {...responsiveSearchRowProps}>
          <Col {...responsiveSearchPrimaryColProps}>
            <Search
              size={'large'}
              placeholder={intl.formatMessage({
                id: referenceLookup
                  ? 'pages.search.referenceLookup.placeholder'
                  : 'pages.search.keyWord',
              })}
              onSearch={onSearch}
              enterButton
            />
          </Col>
          <Col {...responsiveSearchExtraColProps}>
            <Space className='responsive-data-list-reference-lookup-option' size={4} align='center'>
              <Checkbox
                checked={referenceLookup}
                onChange={(e) => setReferenceLookup(e.target.checked)}
              >
                <FormattedMessage
                  id='pages.search.referenceLookup'
                  defaultMessage='Reference Lookup'
                />
              </Checkbox>
              <ReferenceLookupHelpIcon />
            </Space>
          </Col>
        </Row>
      </Card>
      <ProTable<UnitGroupTable, LocaleAwareTableParams>
        {...responsiveDataListTableProps}
        rowKey={(record) => `${record.id}-${record.version}`}
        headerTitle={
          <Space size={8} align='center' wrap>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              {getDataTitle(dataSource)} /{' '}
              <FormattedMessage id='menu.tgdata.unitgroups' defaultMessage='Unit Groups' />
            </span>
            {shouldShowUnitGroupTip && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: token.marginXXS,
                  color: token.colorTextDescription,
                  fontSize: token.fontSizeSM,
                  fontWeight: 400,
                  lineHeight: 1,
                }}
              >
                <InfoCircleOutlined />
                <FormattedMessage
                  id='pages.unitgroup.title.tips'
                  defaultMessage='Need to add or supplement unit groups? Contact an administrator.'
                />
              </span>
            )}
          </Space>
        }
        actionRef={actionRef}
        params={{ locale: appLocale }}
        search={false}
        options={isMobileDataList ? false : { fullScreen: true }}
        pagination={{
          showSizeChanger: false,
          pageSize: 10,
          ...getReferenceLookupPaginationProps(referenceLookup),
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
            ];
          }
          return [];
        }}
        request={async (
          params: LocaleAwareTableParams & { pageSize?: number; current?: number },
          sort,
        ) => {
          const { locale: requestedLocale, ...requestParams } = params;
          return guardLocaleMaterializedTableRequest(
            requestedLocale,
            () => currentAppLocaleRef.current,
            tableRequestEpochRef,
            async ({ isCurrentRequest }) => {
              const currentKeyWord = keyWordRef.current || keyWord;
              const currentStateCode = stateCodeRef.current;
              if (referenceLookup) {
                const referenceLookupUuid = getReferenceLookupUuid(currentKeyWord);
                if (!referenceLookupUuid) {
                  return attachReviewState(getReferenceLookupEmptyResult(requestParams.current));
                }
                const referenceLookupTeamId = getReferenceLookupTeamId(tid);

                const result = await getUnitGroupTableUuidMentionSearch(
                  requestParams,
                  lang,
                  dataSource,
                  referenceLookupUuid,
                  currentStateCode,
                  referenceLookupTeamId,
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
                return attachReviewState(
                  await getUnitGroupTablePgroongaSearch(
                    requestParams,
                    lang,
                    dataSource,
                    currentKeyWord,
                    {},
                    currentStateCode,
                    tid ?? '',
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
                ),
              );
            },
          );
        }}
        columns={unitGroupColumns}
      ></ProTable>

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
