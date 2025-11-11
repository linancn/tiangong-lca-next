import {
  flow_hybrid_search,
  getFlowTableAll,
  getFlowTablePgroongaSearch,
} from '@/services/flows/api';
import { Card, Checkbox, Col, Input, Row, Space, Tooltip, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';

import AllVersionsList from '@/components/AllVersions';
import ContributeData from '@/components/ContributeData';
import ExportData from '@/components/ExportData';
import ImportData from '@/components/ImportData';
import TableFilter from '@/components/TableFilter';
import { FlowTable } from '@/services/flows/data';
import { contributeSource } from '@/services/general/api';
import { ListPagination } from '@/services/general/data';
import { getDataSource, getLang, getLangText } from '@/services/general/util';
import { getTeamById } from '@/services/teams/api';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { TableDropdown } from '@ant-design/pro-table';
import { theme } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC } from 'react';
import { getAllVersionsColumns, getDataTitle } from '../Utils';
import FlowsCreate from './Components/create';
import FlowsDelete from './Components/delete';
import FlowsEdit from './Components/edit';
import { flowTypeOptions } from './Components/optiondata';
import FlowsView from './Components/view';

const { Search } = Input;

const TableList: FC = () => {
  const [keyWord, setKeyWord] = useState<any>('');
  const [team, setTeam] = useState<any>(null);
  const [importData, setImportData] = useState<any>(null);
  const [openAI, setOpenAI] = useState<boolean>(false);
  const { token } = theme.useToken();
  const location = useLocation();
  const dataSource = getDataSource(location.pathname);
  const [stateCode, setStateCode] = useState<string | number>('all');
  const searchParams = new URLSearchParams(location.search);
  const tid = searchParams.get('tid');
  const [allFlows, setAllFlows] = useState<any>([]);
  const isSortingRef = useRef(false);
  const sortRef = useRef<null | { field: string; order: string }>(null);

  const intl = useIntl();

  const lang = getLang(intl.locale);

  const actionRef = useRef<ActionType>();
  const flowsColumns: ProColumns<FlowTable>[] = [
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
          <Tooltip key={0} placement='topLeft' title={row.synonyms}>
            {row.name}
          </Tooltip>,
        ];
      },
    },
    {
      title: <FormattedMessage id='pages.flow.flowType' defaultMessage='Flow type' />,
      dataIndex: 'flowType',
      sorter: false,
      search: false,
      filters: flowTypeOptions.map((option) => ({ text: option.label, value: option.value })),
      render: (_, row) => {
        const flowType = flowTypeOptions.find((i) => i.value === row.flowType);
        if (flowType) {
          return flowType.label;
        }
        return row.flowType;
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
        return row?.classification && row?.classification !== 'undefined'
          ? row.classification
          : '-';
      },
    },

    {
      title: <FormattedMessage id='pages.flow.CASNumber' defaultMessage='CAS Number' />,
      dataIndex: 'CASNumber',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage id='pages.flow.locationOfSupply' defaultMessage='Location of supply' />
      ),
      dataIndex: 'locationOfSupply',
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
                team_id
              `}
              id={row.id}
            >
              <FlowsCreate
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
              <FlowsView
                // actionRef={actionRef}
                buttonType={'icon'}
                id={row.id}
                version={row.version}
                lang={lang}
              />
              <FlowsEdit
                id={row.id}
                version={row.version}
                lang={lang}
                buttonType={'icon'}
                actionRef={actionRef}
              />
              <FlowsDelete
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
                          const { error } = await contributeSource('flows', row.id, row.version);
                          if (error) {
                            console.log(error);
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
              />
            </Space>,
          ];
        }
        return [
          <Space size={'small'} key={0}>
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
    sortRef.current = null;
    isSortingRef.current = false;
    actionRef.current?.setPageInfo?.({ current: 1 });
    actionRef.current?.reload();
  };
  const handleImportData = (jsonData: any) => {
    setImportData(jsonData);
  };
  const sortData = () => {
    const collator = new Intl.Collator('en', {
      numeric: true,
      sensitivity: 'variant',
      caseFirst: 'upper',
    });

    const getComparableValue = (item: FlowTable) => {
      if (sortRef.current?.field) {
        return item[sortRef.current.field as keyof FlowTable];
      }
      return item.modifiedAt;
    };

    const compareValues = (valueA: any, valueB: any) => {
      if (valueA === valueB) {
        return 0;
      }

      if (valueA === null || valueA === undefined) {
        return 1;
      }
      if (valueB === null || valueB === undefined) {
        return -1;
      }

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return valueA - valueB;
      }

      const dateA =
        valueA instanceof Date
          ? valueA
          : typeof valueA === 'string' && !Number.isNaN(Date.parse(valueA))
            ? new Date(valueA)
            : null;
      const dateB =
        valueB instanceof Date
          ? valueB
          : typeof valueB === 'string' && !Number.isNaN(Date.parse(valueB))
            ? new Date(valueB)
            : null;

      if (dateA && dateB) {
        return dateA.getTime() - dateB.getTime();
      }

      return collator.compare(String(valueA), String(valueB));
    };

    return [...allFlows].sort((a, b) => {
      const valueA = getComparableValue(a);
      const valueB = getComparableValue(b);
      const comparison = compareValues(valueA, valueB);

      if (sortRef.current?.order === 'descend') {
        return -comparison;
      }

      if (sortRef.current?.order === 'ascend') {
        return comparison;
      }

      return -comparison;
    });
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
      <ProTable<FlowTable, ListPagination>
        rowKey={(record) => `${record.id}-${record.version}`}
        headerTitle={
          <>
            {getDataTitle(dataSource)} /{' '}
            <FormattedMessage id='menu.tgdata.flows' defaultMessage='Flows' />
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
              <TableFilter
                key={2}
                onChange={async (val) => {
                  await setStateCode(val);
                  actionRef.current?.reload();
                }}
              />,
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
          return [];
        }}
        onChange={(pagination, filters, sorter: any) => {
          if (sorter?.field && sorter?.order) {
            isSortingRef.current = true;
            sortRef.current = sorter;
          } else {
            isSortingRef.current = false;
            sortRef.current = null;
          }
        }}
        request={async (
          params: {
            pageSize: number;
            current: number;
          },
          sort,
          filter,
        ) => {
          const flowTypeFilter = filter?.flowType ? filter.flowType.join(',') : '';
          if (keyWord.length > 0) {
            if (isSortingRef.current) {
              const sortedResult = sortData();
              return Promise.resolve({ success: true, data: sortedResult });
            }
            if (openAI) {
              const result = await flow_hybrid_search(
                params,
                lang,
                dataSource,
                keyWord,
                {
                  flowType: flowTypeFilter,
                },
                stateCode,
              );
              if (result.data) {
                setAllFlows(result.data);
              }
              return result;
            }
            const result = await getFlowTablePgroongaSearch(
              params,
              lang,
              dataSource,
              keyWord,
              {
                flowType: flowTypeFilter,
              },
              stateCode,
            );
            if (result.data) {
              setAllFlows(result.data);
            }
            return result;
          }

          const sortFields: Record<string, string> = {
            name: 'json->flowDataSet->flowInformation->dataSetInformation->name',
            classification:
              'json->flowDataSet->flowInformation->dataSetInformation->classificationInformation',
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

          const result = await getFlowTableAll(
            params,
            convertedSort,
            lang,
            dataSource,
            tid ?? '',
            {
              flowType: flowTypeFilter,
            },
            stateCode,
          );
          if (result.data) {
            setAllFlows(result.data);
          }
          return result;
        }}
        columns={flowsColumns}
      />
    </PageContainer>
  );
};

export default TableList;
