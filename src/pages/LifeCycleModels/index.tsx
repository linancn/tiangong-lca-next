import AllVersionsList from '@/components/AllVersions';
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
  responsiveSearchCardClassName,
  responsiveSearchExtraColProps,
  responsiveSearchPrimaryColProps,
  responsiveSearchRowProps,
  useResponsiveDataListMobile,
} from '@/components/ResponsiveDataList';
import TableFilter from '@/components/TableFilter';
import { attachStateCodesToRows } from '@/services/general/api';
import { ListPagination } from '@/services/general/data';
import { getDataSource, getLang, getLangText, isDataUnderReview } from '@/services/general/util';
import {
  contributeLifeCycleModel,
  getLifeCycleModelTableAll,
  getLifeCycleModelTablePgroongaSearch,
  lifeCycleModel_hybrid_search,
} from '@/services/lifeCycleModels/api';
import type {
  LifeCycleModelImportData,
  LifeCycleModelTable,
} from '@/services/lifeCycleModels/data';
import { getTeamById } from '@/services/teams/api';
import type { TeamTable } from '@/services/teams/data';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { Card, Checkbox, Col, Input, Row, Space, message } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';
import { getAllVersionsColumns, getDataTitle } from '../Utils';
import LifeCycleModelCreate from './Components/create';
import LifeCycleModelDelete from './Components/delete';
import LifeCycleModelEdit from './Components/edit';
import LifeCycleModelView from './Components/view';
const { Search } = Input;

const TableList: FC = () => {
  const [keyWord, setKeyWord] = useState('');
  const [, setStateCode] = useState<string | number>('all');
  const [team, setTeam] = useState<TeamTable | null>(null);
  const [importData, setImportData] = useState<LifeCycleModelImportData | null>(null);
  const [openAI, setOpenAI] = useState<boolean>(false);
  const [editDrawerVisible, setEditDrawerVisible] = useState<boolean>(false);
  const [viewDrawerVisible, setViewDrawerVisible] = useState<boolean>(false);
  const [editId, setEditId] = useState<string>('');
  const [editVersion, setEditVersion] = useState<string>('');
  const isMobileDataList = useResponsiveDataListMobile();
  const location = useLocation();
  const dataSource = getDataSource(location.pathname);

  const searchParams = new URLSearchParams(location.search);
  const tid = searchParams.get('tid');
  const id = searchParams.get('id');
  const version = searchParams.get('version');
  const required = searchParams.get('required') === '1';
  const routeMode = searchParams.get('mode');

  const intl = useIntl();

  const lang = getLang(intl.locale);

  const actionRef = useRef<ActionType>();
  const keyWordRef = useRef('');
  const stateCodeRef = useRef<string | number>('all');
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
      ...dataListTextColumn<LifeCycleModelTable>(260, DATA_LIST_COLUMN_RESPONSIVE.desktop),
      title: (
        <FormattedMessage id='pages.table.title.classification' defaultMessage='Classification' />
      ),
      dataIndex: 'classification',
      sorter: true,
      search: false,
      render: (_, row) => {
        return dataListText(row.classification);
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
      title: <FormattedMessage id='pages.table.title.option' defaultMessage='Option' />,
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
                              defaultMessage: 'Contribute successfully',
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
    keyWordRef.current = value;
    setKeyWord(value);
    actionRef.current?.setPageInfo?.({ current: 1 });
    actionRef.current?.reload();
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
      <Card className={responsiveSearchCardClassName}>
        <Row {...responsiveSearchRowProps}>
          <Col {...responsiveSearchPrimaryColProps}>
            <Search
              size={'large'}
              placeholder={
                openAI
                  ? intl.formatMessage({ id: 'pages.search.placeholder' })
                  : intl.formatMessage({ id: 'pages.search.keyWord' })
              }
              onSearch={onSearch}
              enterButton
            />
          </Col>
          <Col {...responsiveSearchExtraColProps}>
            <Checkbox
              onChange={(e) => {
                setOpenAI(e.target.checked);
              }}
            >
              <FormattedMessage id='pages.search.openAI' defaultMessage='AI Search' />
            </Checkbox>
          </Col>
        </Row>
      </Card>
      <ProTable<LifeCycleModelTable, ListPagination>
        {...responsiveDataListTableProps}
        rowKey={(record) => `${record.id}-${record.version}`}
        headerTitle={
          <>
            {getDataTitle(dataSource)} /{' '}
            <FormattedMessage id='menu.tgdata.products' defaultMessage='Product Models' />
          </>
        }
        actionRef={actionRef}
        search={false}
        options={isMobileDataList ? false : { fullScreen: true }}
        pagination={{
          showSizeChanger: false,
          pageSize: 10,
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
          return [];
        }}
        request={async (
          params: {
            pageSize: number;
            current: number;
          },
          sort,
        ) => {
          const currentKeyWord = keyWordRef.current || keyWord;
          const currentStateCode = stateCodeRef.current;
          if (currentKeyWord.length > 0) {
            let orderBy:
              | { key: 'common:class' | 'baseName'; lang?: 'en' | 'zh'; order: 'asc' | 'desc' }
              | undefined;
            if (sort && Object.keys(sort).length > 0) {
              const field = Object.keys(sort)[0];
              const order = sort[field];
              if (field === 'name') {
                orderBy = {
                  key: 'baseName',
                  lang: lang,
                  order: order === 'ascend' ? 'asc' : 'desc',
                };
              } else if (field === 'classification') {
                orderBy = { key: 'common:class', order: order === 'ascend' ? 'asc' : 'desc' };
              }
            }
            if (openAI) {
              return attachReviewState(
                await lifeCycleModel_hybrid_search(
                  params,
                  lang,
                  dataSource,
                  currentKeyWord,
                  {},
                  currentStateCode,
                ),
              );
            }
            return attachReviewState(
              await getLifeCycleModelTablePgroongaSearch(
                params,
                lang,
                dataSource,
                currentKeyWord,
                {},
                currentStateCode,
                orderBy,
              ),
            );
          }
          return attachReviewState(
            await getLifeCycleModelTableAll(
              params,
              sort,
              lang,
              dataSource,
              tid ?? '',
              currentStateCode,
            ),
          );
        }}
        columns={processColumns}
      />

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
