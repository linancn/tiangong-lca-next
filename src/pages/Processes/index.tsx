import { contributeLifeCycleModel } from '@/services/lifeCycleModels/api';
import {
  contributeProcess,
  getProcessTableAll,
  getProcessTablePgroongaSearch,
  process_hybrid_search,
} from '@/services/processes/api';
import { BarChartOutlined } from '@ant-design/icons';

import { Card, Checkbox, Col, Input, message, Row, Select, Space, Tooltip } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, history, useIntl, useLocation } from 'umi';

import AllVersionsList from '@/components/AllVersions';
import ContributeData from '@/components/ContributeData';
import {
  extractContributeDataError,
  getContributeDataErrorMessage,
} from '@/components/ContributeData/utils';
import ExportData from '@/components/ExportData';
import ImportData from '@/components/ImportData';
import TableFilter from '@/components/TableFilter';
import ToolBarButton from '@/components/ToolBarButton';
import LifeCycleModelCreate from '@/pages/LifeCycleModels/Components/create';
import LifeCycleModelEdit from '@/pages/LifeCycleModels/Components/edit';
import LifeCycleModelView from '@/pages/LifeCycleModels/Components/view';
import { attachStateCodesToRows } from '@/services/general/api';
import { ListPagination } from '@/services/general/data';
import { getDataSource, getLang, getLangText, isDataUnderReview } from '@/services/general/util';
import { ProcessImportData, ProcessTable } from '@/services/processes/data';
import { getTeamById } from '@/services/teams/api';
import type { TeamTable } from '@/services/teams/data';
import {
  ActionType,
  PageContainer,
  ProColumns,
  ProTable,
  TableDropdown,
} from '@ant-design/pro-components';
import { theme } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { SortOrder } from 'antd/es/table/interface';
import type { FC, ReactElement } from 'react';
import { getAllVersionsColumns, getDataTitle } from '../Utils';
import ProcessCreate from './Components/create';
import ProcessDelete from './Components/delete';
import ProcessEdit from './Components/edit';
import LcaSolveToolbar from './Components/lcaSolveToolbar';
import { processtypeOfDataSetOptions } from './Components/optiondata';
import ReviewDetail from './Components/ReviewDetail';
import ProcessView from './Components/view';

const { Search } = Input;

export const getProcesstypeOfDataSetOptions = (value: string) => {
  const option = processtypeOfDataSetOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};

const TableList: FC = () => {
  const [keyWord, setKeyWord] = useState('');
  const [, setStateCode] = useState<string | number>('all');
  const [, setTypeOfDataSet] = useState<string>('all');
  const [team, setTeam] = useState<TeamTable | null>(null);
  const [importData, setImportData] = useState<ProcessImportData | null>(null);
  const [openAI, setOpenAI] = useState<boolean>(false);
  const [editDrawerVisible, setEditDrawerVisible] = useState<boolean>(false);
  const [editId, setEditId] = useState<string>('');
  const [editVersion, setEditVersion] = useState<string>('');
  const { token } = theme.useToken();
  const location = useLocation();
  const dataSource = getDataSource(location.pathname);

  const searchParams = new URLSearchParams(location.search);
  const tid = searchParams.get('tid');
  const id = searchParams.get('id');
  const version = searchParams.get('version');
  const required = searchParams.get('required') === '1';

  const intl = useIntl();

  const lang = getLang(intl.locale);

  const actionRef = useRef<ActionType>();
  const attachReviewState = async (result: {
    data?: ProcessTable[];
    page?: number;
    success?: boolean;
    total?: number;
  }) => {
    if (dataSource !== 'my' || !Array.isArray(result.data)) {
      return result;
    }

    return {
      ...result,
      data: await attachStateCodesToRows('processes', result.data),
    };
  };
  const keyWordRef = useRef('');
  const stateCodeRef = useRef<string | number>('all');
  const typeOfDataSetRef = useRef<string>('all');
  const typeOfDataSetFilter = () => {
    const onChange = (value: string) => {
      typeOfDataSetRef.current = value;
      setTypeOfDataSet(value);
      actionRef.current?.reloadAndRest?.();
    };
    return (
      <Select defaultValue={'all'} style={{ width: 160 }} onChange={onChange}>
        <Select.Option value={'all'}>
          <FormattedMessage id='pages.table.filter.all.datasetType' />
        </Select.Option>
        {processtypeOfDataSetOptions.map((option) => (
          <Select.Option key={option.value} value={option.value}>
            {option.label}
          </Select.Option>
        ))}
      </Select>
    );
  };
  const processColumns: ProColumns<ProcessTable>[] = [
    {
      title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id='pages.table.title.name' defaultMessage='Name' />,
      dataIndex: 'name',
      sorter: true,
      search: false,
      render: (_, row) => {
        return [
          <Tooltip key={0} placement='topLeft' title={row.generalComment}>
            {row.name}
          </Tooltip>,
        ];
      },
    },
    {
      title: (
        <FormattedMessage id='pages.table.title.classification' defaultMessage='Classification' />
      ),
      dataIndex: 'classification',
      sorter: true,
      search: false,
      render: (_, row) => {
        return (
          <div>
            {row.classification && row.classification !== 'undefined' ? row.classification : '-'}
          </div>
        );
      },
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.view.modellingAndValidation.typeOfDataSet'
          defaultMessage='Type of data set'
        />
      ),
      dataIndex: 'typeOfDataSet',
      sorter: false,
      search: false,
      render: (_, row) => {
        return getProcesstypeOfDataSetOptions(row.typeOfDataSet);
      },
    },
    {
      title: <FormattedMessage id='pages.process.referenceYear' defaultMessage='Reference year' />,
      dataIndex: 'referenceYear',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id='pages.process.location' defaultMessage='Location' />,
      dataIndex: 'location',
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
          <Space size={'small'}>
            {row.version}
            <AllVersionsList
              lang={lang}
              searchTableName='processes'
              columns={getAllVersionsColumns(processColumns, 5)}
              searchColume={`
                id,
                json->processDataSet->processInformation->dataSetInformation->name,
                json->processDataSet->processInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
                json->processDataSet->processInformation->dataSetInformation->"common:generalComment",
                json->processDataSet->processInformation->time->>"common:referenceYear",
                json->processDataSet->modellingAndValidation->LCIMethodAndAllocation->typeOfDataSet,
                json->processDataSet->processInformation->geography->locationOfOperationSupplyOrProduction->>"@location",
                version,
                modified_at,
                team_id
              `}
              id={row.id}
              addVersionComponent={({ newVersion }) => (
                <ProcessCreate
                  newVersion={newVersion}
                  actionType='createVersion'
                  id={row.id}
                  version={row.version}
                  lang={lang}
                  actionRef={actionRef}
                />
              )}
            ></AllVersionsList>
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
      title: <FormattedMessage id='pages.table.title.option' defaultMessage='Option' />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        const actionDisabled = isDataUnderReview(row.stateCode);
        if (dataSource === 'my') {
          return [
            <Space size={'small'} key={0}>
              <ProcessView
                id={row.id}
                version={row.version}
                // dataSource={dataSource}
                buttonType={'icon'}
                lang={lang}
                disabled={false}
                actionRef={actionRef}
              />
              <LifeCycleModelView
                disabled={!row.modelId}
                id={row.modelId}
                version={row.version}
                lang={lang}
                buttonType={'iconModel'}
                actionRef={actionRef}
              />
              {row.modelId ? (
                <LifeCycleModelEdit
                  disabled={actionDisabled}
                  id={row.modelId}
                  version={row.version}
                  lang={lang}
                  actionRef={actionRef}
                  buttonType={'icon'}
                />
              ) : (
                <ProcessEdit
                  disabled={actionDisabled}
                  id={row.id}
                  version={row.version}
                  lang={lang}
                  buttonType={'icon'}
                  actionRef={actionRef}
                  setViewDrawerVisible={() => {}}
                />
              )}

              <ProcessDelete
                disabled={actionDisabled}
                id={row.id}
                version={row.version}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => {}}
              />
              <TableDropdown
                style={{
                  color: token.colorPrimary,
                }}
                menus={[
                  {
                    key: 'logs',
                    name: <ReviewDetail processId={row.id} processVersion={row.version} />,
                  },
                  {
                    key: 'export',
                    name: <ExportData tableName='processes' id={row.id} version={row.version} />,
                  },
                  {
                    key: 'copy',
                    name: (
                      <>
                        {row.modelId ? (
                          <LifeCycleModelCreate
                            actionType='copy'
                            id={row.modelId}
                            version={row.version}
                            lang={lang}
                            actionRef={actionRef}
                            buttonType={'icon'}
                          />
                        ) : (
                          <ProcessCreate
                            actionType='copy'
                            id={row.id}
                            version={row.version}
                            lang={lang}
                            actionRef={actionRef}
                          />
                        )}
                      </>
                    ),
                  },
                  {
                    key: 'contribute',
                    name: (
                      <ContributeData
                        onOk={async () => {
                          const contributeResult = row.modelId
                            ? await contributeLifeCycleModel(row.modelId, row.version)
                            : await contributeProcess(row.id, row.version);
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
                          }
                          actionRef.current?.reload();
                        }}
                        disabled={!!row.teamId}
                      />
                    ),
                  },
                ]}
              />
            </Space>,
          ];
        }
        if (dataSource === 'tg') {
          return [
            <Space size={'small'} key={0}>
              <ProcessView
                id={row.id}
                version={row.version}
                // dataSource={dataSource}
                buttonType={'icon'}
                lang={lang}
                disabled={false}
                actionRef={actionRef}
              />
              <LifeCycleModelView
                disabled={!row.modelId}
                id={row.modelId}
                version={row.version}
                lang={lang}
                buttonType={'iconModel'}
                actionRef={actionRef}
              />
              <ReviewDetail processId={row.id} processVersion={row.version} />

              <TableDropdown
                style={{
                  color: token.colorPrimary,
                }}
                menus={[
                  {
                    key: 'copy',
                    name: (
                      <ProcessCreate
                        actionType='copy'
                        id={row.id}
                        version={row.version}
                        lang={lang}
                        actionRef={actionRef}
                      />
                    ),
                  },
                  {
                    key: 'export',
                    name: <ExportData tableName='processes' id={row.id} version={row.version} />,
                  },
                ]}
              />
            </Space>,
          ];
        }
        return [
          <Space size={'small'} key={0}>
            <ProcessView
              id={row.id}
              version={row.version}
              // dataSource={dataSource}
              buttonType={'icon'}
              lang={lang}
              disabled={false}
              actionRef={actionRef}
            />
            <LifeCycleModelView
              disabled={!row.modelId}
              id={row.modelId}
              version={row.version}
              lang={lang}
              buttonType={'iconModel'}
              actionRef={actionRef}
            />
            <ProcessCreate
              actionType='copy'
              id={row.id}
              version={row.version}
              lang={lang}
              actionRef={actionRef}
            />
            <ExportData tableName='processes' id={row.id} version={row.version} />
          </Space>,
        ];
      },
    },
  ];

  useEffect(() => {
    getTeamById(tid ?? '').then((res) => {
      if (res.data.length > 0) setTeam(res.data[0] ?? null);
    });
  }, []);

  useEffect(() => {
    if (id && version && dataSource === 'my') {
      setEditId(id);
      setEditVersion(version);
      setEditDrawerVisible(true);
    }
  }, [id, version, dataSource]);

  const handleEditClose = () => {
    setEditDrawerVisible(false);
    setEditId('');
    setEditVersion('');
  };

  const onSearch: SearchProps['onSearch'] = (value) => {
    keyWordRef.current = value;
    setKeyWord(value);
    actionRef.current?.setPageInfo?.({ current: 1 });
    actionRef.current?.reload();
  };
  const handleImportData = (jsonData: ProcessImportData) => {
    setImportData(jsonData);
  };

  const applyProcessTableResult = async (result?: {
    data?: ProcessTable[];
    success?: boolean;
    total?: number;
  }) => {
    const resolvedResult = result ?? { data: [], success: false, total: 0 };
    return attachReviewState(resolvedResult);
  };

  return (
    <PageContainer
      header={{
        title: team?.json?.title ? getLangText(team?.json?.title, lang) : false,
        breadcrumb: {},
      }}
    >
      <Card>
        <Row align={'middle'}>
          <Col flex='auto' style={{ marginRight: '10px' }}>
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
          <Col flex='100px'>
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
      <ProTable<ProcessTable, ListPagination>
        rowKey={(record) => `${record.id}-${record.version}`}
        headerTitle={
          <>
            {getDataTitle(dataSource)} /{' '}
            <FormattedMessage id='menu.tgdata.processes' defaultMessage='Processes' />
          </>
        }
        actionRef={actionRef}
        search={false}
        options={{ fullScreen: true }}
        optionsRender={(_, defaultOptions) => {
          const settings = (defaultOptions ?? []) as ReactElement[];
          if (dataSource !== 'my') {
            return settings;
          }
          const calcOption = <LcaSolveToolbar key='lca-calc-option' />;
          const analysisPageOption = (
            <ToolBarButton
              key='lca-analysis-page-option'
              icon={<BarChartOutlined />}
              tooltip={intl.formatMessage({
                id: 'pages.process.lca.page.title',
                defaultMessage: 'LCA Analysis',
              })}
              onClick={() => {
                history.push('/mydata/processes/analysis');
              }}
            />
          );
          const reloadIndex = settings.findIndex((item) => item.key === 'reload');
          if (reloadIndex < 0) {
            return [...settings, calcOption, analysisPageOption];
          }
          return [
            ...settings.slice(0, reloadIndex + 1),
            calcOption,
            analysisPageOption,
            ...settings.slice(reloadIndex + 1),
          ];
        }}
        pagination={{
          showSizeChanger: false,
          pageSize: 10,
        }}
        toolBarRender={() => {
          if (dataSource === 'my') {
            return [
              <span key={3}>{typeOfDataSetFilter()}</span>,
              <TableFilter
                key={2}
                onChange={(val) => {
                  stateCodeRef.current = val;
                  setStateCode(val);
                  actionRef.current?.reload();
                }}
              />,
              <ProcessCreate
                importData={importData}
                onClose={() => setImportData(null)}
                key={0}
                lang={lang}
                actionRef={actionRef}
              />,
              <ImportData onJsonData={handleImportData} key={1} />,
            ];
          }
          return [<span key={0}>{typeOfDataSetFilter()}</span>];
        }}
        request={async (
          params: {
            pageSize: number;
            current: number;
          },
          sort,
        ) => {
          try {
            const currentKeyWord = keyWordRef.current || keyWord;
            const currentStateCode = stateCodeRef.current;
            const currentTypeOfDataSet = typeOfDataSetRef.current;
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
                return applyProcessTableResult(
                  await process_hybrid_search(
                    params,
                    lang,
                    dataSource,
                    currentKeyWord,
                    {},
                    currentStateCode,
                    currentTypeOfDataSet,
                  ),
                );
              }
              return applyProcessTableResult(
                await getProcessTablePgroongaSearch(
                  params,
                  lang,
                  dataSource,
                  currentKeyWord,
                  {},
                  currentStateCode,
                  currentTypeOfDataSet,
                  orderBy,
                ),
              );
            }

            const sortFields: Record<string, string> = {
              name: 'json->processDataSet->processInformation->dataSetInformation->name',
              classification:
                'json->processDataSet->processInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class"',
            };

            const convertedSort: Record<string, SortOrder> = {};
            if (sort && Object.keys(sort).length > 0) {
              const field = Object.keys(sort)[0];
              if (sortFields[field]) {
                convertedSort[sortFields[field]] = sort[field];
              } else {
                convertedSort[field] = sort[field];
              }
            }

            return applyProcessTableResult(
              await getProcessTableAll(
                params,
                convertedSort,
                lang,
                dataSource,
                tid ?? '',
                currentStateCode,
                currentTypeOfDataSet,
              ),
            );
          } catch (error) {
            message.error(
              intl.formatMessage({
                id: 'pages.process.list.loadError',
                defaultMessage: 'Failed to load process list.',
              }),
            );
            return applyProcessTableResult();
          }
        }}
        columns={processColumns}
      />

      {editDrawerVisible && editId && editVersion && (
        <ProcessEdit
          id={editId}
          version={editVersion}
          lang={lang}
          buttonType={'icon'}
          actionRef={actionRef}
          setViewDrawerVisible={handleEditClose}
          autoOpen={true}
          autoCheckRequired={required}
        />
      )}
    </PageContainer>
  );
};

export default TableList;
