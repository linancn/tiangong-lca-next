import { contributeLifeCycleModel } from '@/services/lifeCycleModels/api';
import {
  contributeProcess,
  getProcessTableAll,
  getProcessTablePgroongaSearch,
  process_hybrid_search,
} from '@/services/processes/api';

import { Card, Checkbox, Col, Input, message, Row, Select, Space, Tooltip } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';

import AllVersionsList from '@/components/AllVersions';
import ContributeData from '@/components/ContributeData';
import ExportData from '@/components/ExportData';
import ImportData from '@/components/ImportData';
import TableFilter from '@/components/TableFilter';
import LifeCycleModelCreate from '@/pages/LifeCycleModels/Components/create';
import LifeCycleModelEdit from '@/pages/LifeCycleModels/Components/edit';
import LifeCycleModelView from '@/pages/LifeCycleModels/Components/view';
import { ListPagination } from '@/services/general/data';
import { getDataSource, getLang, getLangText } from '@/services/general/util';
import { ProcessTable } from '@/services/processes/data';
import { getTeamById } from '@/services/teams/api';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { TableDropdown } from '@ant-design/pro-table';
import { theme } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC } from 'react';
import { getAllVersionsColumns, getDataTitle } from '../Utils';
import ProcessCreate from './Components/create';
import ProcessDelete from './Components/delete';
import ProcessEdit from './Components/edit';
import { processtypeOfDataSetOptions } from './Components/optiondata';
import ReviewDetail from './Components/ReviewDetail';
import ProcessView from './Components/view';

const { Search } = Input;

export const getProcesstypeOfDataSetOptions = (value: string) => {
  const option = processtypeOfDataSetOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};

const TableList: FC = () => {
  const [keyWord, setKeyWord] = useState<any>('');
  const [stateCode, setStateCode] = useState<string | number>('all');
  const [typeOfDataSet, setTypeOfDataSet] = useState<string>('all');
  const [team, setTeam] = useState<any>(null);
  const [importData, setImportData] = useState<any>(null);
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

  const intl = useIntl();

  const lang = getLang(intl.locale);

  const actionRef = useRef<ActionType>();
  const typeOfDataSetFilter = () => {
    const onChange = (value: string) => {
      setTypeOfDataSet(value);
      actionRef.current?.reloadAndRest?.();
    };
    return (
      <Select defaultValue={'all'} style={{ width: 160 }} onChange={onChange}>
        <Select.Option value={'all'}>
          <FormattedMessage id='pages.table.filter.all' />
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
        if (dataSource === 'my') {
          return [
            <Space size={'small'} key={0}>
              {row.modelId ? (
                <LifeCycleModelView
                  id={row.modelId}
                  version={row.version}
                  lang={lang}
                  buttonType={'icon'}
                  actionRef={actionRef}
                />
              ) : (
                <ProcessView
                  id={row.id}
                  version={row.version}
                  // dataSource={dataSource}
                  buttonType={'icon'}
                  lang={lang}
                  disabled={false}
                  actionRef={actionRef}
                />
              )}
              {row.modelId ? (
                <LifeCycleModelEdit
                  id={row.modelId}
                  version={row.version}
                  lang={lang}
                  actionRef={actionRef}
                  buttonType={'icon'}
                />
              ) : (
                <ProcessEdit
                  id={row.id}
                  version={row.version}
                  lang={lang}
                  buttonType={'icon'}
                  actionRef={actionRef}
                  setViewDrawerVisible={() => {}}
                />
              )}

              <ProcessDelete
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
                          if (row.modelId) {
                            const { error: lifeCycleError } = await contributeLifeCycleModel(
                              row.modelId,
                              row.version,
                            );
                            if (lifeCycleError) {
                              console.log(lifeCycleError);
                            } else {
                              message.success(
                                intl.formatMessage({
                                  id: 'component.contributeData.success',
                                  defaultMessage: 'Contribute successfully',
                                }),
                              );
                            }
                          } else {
                            const { error } = await contributeProcess(row.id, row.version);
                            if (error) {
                              console.log(error);
                            } else {
                              message.success(
                                intl.formatMessage({
                                  id: 'component.contributeData.success',
                                  defaultMessage: 'Contribute successfully',
                                }),
                              );
                            }
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
    if (team) {
      return;
    }
    getTeamById(tid ?? '').then((res) => {
      if (res.data.length > 0) setTeam(res.data[0]);
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
    setKeyWord(value);
    actionRef.current?.setPageInfo?.({ current: 1 });
    actionRef.current?.reload();
  };
  const handleImportData = (jsonData: any) => {
    setImportData(jsonData);
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
                onChange={async (val) => {
                  await setStateCode(val);
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
          if (keyWord.length > 0) {
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
              return process_hybrid_search(
                params,
                lang,
                dataSource,
                keyWord,
                {},
                stateCode,
                typeOfDataSet,
              );
            }
            return getProcessTablePgroongaSearch(
              params,
              lang,
              dataSource,
              keyWord,
              {},
              stateCode,
              typeOfDataSet,
              orderBy,
            );
          }

          const sortFields: Record<string, string> = {
            name: 'json->processDataSet->processInformation->dataSetInformation->name',
            classification:
              'json->processDataSet->processInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class"',
          };

          const convertedSort: Record<string, any> = {};
          if (sort && Object.keys(sort).length > 0) {
            const field = Object.keys(sort)[0];
            if (sortFields[field]) {
              convertedSort[sortFields[field]] = sort[field];
            } else {
              convertedSort[field] = sort[field];
            }
          }

          return getProcessTableAll(
            params,
            convertedSort,
            lang,
            dataSource,
            tid ?? '',
            stateCode,
            typeOfDataSet,
          );
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
        />
      )}
    </PageContainer>
  );
};

export default TableList;
