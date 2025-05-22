import { getProcessTableAll, getProcessTablePgroongaSearch } from '@/services/processes/api';
import { Card, Input, Space, Tooltip, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';

import AllVersionsList from '@/components/AllVersions';
import ContributeData from '@/components/ContributeData';
import ExportData from '@/components/ExportData';
import ImportData from '@/components/ImportData';
import LifeCycleModelCreate from '@/pages/LifeCycleModels/Components/create';
import LifeCycleModelEdit from '@/pages/LifeCycleModels/Components/edit';
import LifeCycleModelView from '@/pages/LifeCycleModels/Components/view';
import { contributeSource } from '@/services/general/api';
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
import ProcessView from './Components/view';

const { Search } = Input;

const getProcesstypeOfDataSetOptions = (value: string) => {
  const option = processtypeOfDataSetOptions.find((opt) => opt.value === value);
  return option ? option.label : '-';
};

const TableList: FC = () => {
  const [keyWord, setKeyWord] = useState<any>('');
  const [team, setTeam] = useState<any>(null);
  const [importData, setImportData] = useState<any>(null);
  const { token } = theme.useToken();
  const location = useLocation();
  const dataSource = getDataSource(location.pathname);

  const searchParams = new URLSearchParams(location.search);
  const tid = searchParams.get('tid');

  const intl = useIntl();

  const lang = getLang(intl.locale);

  const actionRef = useRef<ActionType>();
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
                json->processDataSet->processInformation->geography->locationOfOperationSupplyOrProduction->>"@location",
                version,
                modified_at,
                team_id
              `}
              id={row.id}
            >
              <ProcessCreate
                actionType='createVersion'
                id={row.id}
                version={row.version}
                lang={lang}
                actionRef={actionRef}
              />
            </AllVersionsList>
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
              {row.isFromLifeCycle ? (
                <LifeCycleModelView
                  id={row.id}
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
              {row.isFromLifeCycle ? (
                <LifeCycleModelEdit
                  id={row.id}
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
                    key: 'export',
                    name: <ExportData tableName='processes' id={row.id} version={row.version} />,
                  },
                  {
                    key: 'copy',
                    name: (
                      <>
                        {row.isFromLifeCycle ? (
                          <LifeCycleModelCreate
                            actionType='copy'
                            id={row.id}
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
                          const { error } = await contributeSource(
                            'processes',
                            row.id,
                            row.version,
                          );
                          if (row.isFromLifeCycle) {
                            const { error: lifeCycleError } = await contributeSource(
                              'lifecyclemodels',
                              row.id,
                              row.version,
                            );
                            if (lifeCycleError || error) {
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
        <Search
          size={'large'}
          placeholder={intl.formatMessage({ id: 'pages.search.keyWord' })}
          onSearch={onSearch}
          enterButton
        />
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
              <ProcessCreate
                isInToolbar={true}
                importData={importData}
                onClose={() => setImportData(null)}
                key={0}
                lang={lang}
                actionRef={actionRef}
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
          if (keyWord.length > 0) {
            return getProcessTablePgroongaSearch(params, lang, dataSource, keyWord, {});
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

          return getProcessTableAll(params, convertedSort, lang, dataSource, tid ?? '');
        }}
        columns={processColumns}
      />
    </PageContainer>
  );
};

export default TableList;
