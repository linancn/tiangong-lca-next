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
import { FlowImportData, FlowTable } from '@/services/flows/data';
import { contributeSource } from '@/services/general/api';
import { ListPagination } from '@/services/general/data';
import { getDataSource, getLang, getLangText } from '@/services/general/util';
import { getCachedFlowCategorizationAll } from '@/services/ilcd/cache';
import { getTeamById } from '@/services/teams/api';
import { TeamTable } from '@/services/teams/data';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { TableDropdown } from '@ant-design/pro-table';
import { theme } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { SortOrder } from 'antd/lib/table/interface';
import type { FC, ReactNode } from 'react';
import { getAllVersionsColumns, getDataTitle } from '../Utils';
import FlowsCreate from './Components/create';
import FlowsDelete from './Components/delete';
import FlowsEdit from './Components/edit';
import { flowTypeOptions } from './Components/optiondata';
import FlowsView from './Components/view';

const { Search } = Input;
type ClassificationFilter = {
  scope: 'elementary' | 'classification';
  code: string;
};

const TableList: FC = () => {
  const [keyWord, setKeyWord] = useState<string>('');
  const [team, setTeam] = useState<TeamTable | null>(null);
  const [importData, setImportData] = useState<FlowImportData | null>(null);
  const [openAI, setOpenAI] = useState<boolean>(false);
  const [classificationFilterOptions, setClassificationFilterOptions] = useState<
    Array<{ text: ReactNode; value: string }>
  >([]);
  const { token } = theme.useToken();
  const location = useLocation();
  const dataSource = getDataSource(location.pathname);
  const [stateCode, setStateCode] = useState<string | number>('all');
  const searchParams = new URLSearchParams(location.search);
  const tid = searchParams.get('tid');

  const intl = useIntl();

  const lang = getLang(intl.locale);
  const keyWordRef = useRef<string>('');
  const stateCodeRef = useRef<string | number>('all');

  const parseClassificationFilter = (
    values?: (string | number | boolean)[] | null,
  ): ClassificationFilter[] => {
    if (!values || values.length === 0) {
      return [];
    }
    const result: ClassificationFilter[] = [];
    values.forEach((item) => {
      const raw = String(item);
      const separatorIndex = raw.indexOf(':');
      if (separatorIndex <= 0) {
        return;
      }
      const scope = raw.slice(0, separatorIndex);
      const code = raw.slice(separatorIndex + 1);
      if (!code) {
        return;
      }
      if (scope === 'elementary' || scope === 'classification') {
        result.push({ scope, code });
      }
    });
    return result;
  };

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
      search: false,
      filters: classificationFilterOptions.length > 0 ? classificationFilterOptions : undefined,
      filterMultiple: true,
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
      const teamData = (res.data as TeamTable[])[0];
      if (teamData) {
        setTeam(teamData);
      }
    });
  }, []);

  useEffect(() => {
    let active = true;
    const loadClassificationFilters = async () => {
      try {
        const data = await getCachedFlowCategorizationAll(lang);
        if (!active) {
          return;
        }
        const elementaryOptions = (data?.categoryElementaryFlow ?? [])
          .filter((item: any) => item?.id)
          .map((item: any) => ({
            text: item?.label ?? item?.value ?? '-',
            value: `elementary:${item?.id}`,
          }));
        const classificationOptions = (data?.category ?? [])
          .filter((item: any) => item?.id)
          .map((item: any) => ({
            text: item?.label ?? item?.value ?? '-',
            value: `classification:${item?.id}`,
          }));
        setClassificationFilterOptions([...elementaryOptions, ...classificationOptions]);
      } catch (error) {
        console.error(error);
        if (active) {
          setClassificationFilterOptions([]);
        }
      }
    };
    loadClassificationFilters();
    return () => {
      active = false;
    };
  }, [lang]);

  const onSearch: SearchProps['onSearch'] = (value) => {
    keyWordRef.current = value;
    setKeyWord(value);
    actionRef.current?.setPageInfo?.({ current: 1 });
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
                onChange={(val) => {
                  stateCodeRef.current = val;
                  setStateCode(val);
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
        request={async (
          params: {
            pageSize: number;
            current: number;
          },
          sort,
          filter,
        ) => {
          const currentKeyWord = keyWordRef.current || keyWord;
          const currentStateCode = stateCodeRef.current ?? stateCode;
          const flowTypeFilter = filter?.flowType ? filter.flowType.join(',') : '';
          const classificationFilter = parseClassificationFilter(filter?.classification);
          const searchFilters = {
            flowType: flowTypeFilter,
            ...(classificationFilter.length > 0 ? { classification: classificationFilter } : {}),
          };
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
              }
            }
            if (openAI) {
              return flow_hybrid_search(
                params,
                lang,
                dataSource,
                currentKeyWord,
                searchFilters,
                currentStateCode,
              );
            }
            return getFlowTablePgroongaSearch(
              params,
              lang,
              dataSource,
              currentKeyWord,
              searchFilters,
              currentStateCode,
              orderBy,
            );
          }

          const sortFields: Record<string, string> = {
            name: 'json->flowDataSet->flowInformation->dataSetInformation->name',
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

          return getFlowTableAll(
            params,
            convertedSort,
            lang,
            dataSource,
            tid ?? '',
            searchFilters,
            currentStateCode,
          );
        }}
        columns={flowsColumns}
      />
    </PageContainer>
  );
};

export default TableList;
