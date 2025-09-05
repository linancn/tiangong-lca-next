import { toSuperscript } from '@/components/AlignedNumber';
import AllVersionsList from '@/components/AllVersions';
import ContributeData from '@/components/ContributeData';
import ExportData from '@/components/ExportData';
import ImportData from '@/components/ImportData';
import TableFilter from '@/components/TableFilter';
import { contributeSource } from '@/services/general/api';
import { ListPagination } from '@/services/general/data';
import { getDataSource, getLang, getLangText } from '@/services/general/util';
import { getRoleByUserId } from '@/services/roles/api';
import { getTeamById } from '@/services/teams/api';
import {
  getUnitGroupTableAll,
  getUnitGroupTablePgroongaSearch,
  unitgroup_hybrid_search,
} from '@/services/unitgroups/api';
import { UnitGroupTable } from '@/services/unitgroups/data';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { TableDropdown } from '@ant-design/pro-table';
import { Card, Checkbox, Col, Input, Row, Space, Tooltip, message, theme } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';
import { getAllVersionsColumns, getDataTitle } from '../Utils';
import UnitGroupCreate from './Components/create';
import UnitGroupDelete from './Components/delete';
import UnitGroupEdit from './Components/edit';
import UnitGroupView from './Components/view';

const { Search } = Input;

const TableList: FC = () => {
  const [keyWord, setKeyWord] = useState<any>('');
  const [stateCode, setStateCode] = useState<string | number>('all');
  const [team, setTeam] = useState<any>(null);
  const [importData, setImportData] = useState<any>(null);
  const [openAI, setOpenAI] = useState<boolean>(false);
  const [isSystemAdmin, setIsSystemAdmin] = useState<boolean>(false);
  const { token } = theme.useToken();
  const location = useLocation();
  const dataSource = getDataSource(location.pathname);

  const searchParams = new URLSearchParams(location.search);
  const tid = searchParams.get('tid');

  const intl = useIntl();

  const lang = getLang(intl.locale);

  const actionRef = useRef<ActionType>();
  const unitGroupColumns: ProColumns<UnitGroupTable>[] = [
    {
      title: (
        <FormattedMessage id='pages.table.title.index' defaultMessage='Index'></FormattedMessage>
      ),
      valueType: 'index',
      search: false,
    },
    {
      title: (
        <FormattedMessage id='pages.table.title.name' defaultMessage='Name'></FormattedMessage>
      ),
      dataIndex: 'name',
      sorter: false,
    },
    {
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
        return [
          <Tooltip key={0} placement='topLeft' title={row.refUnitGeneralComment}>
            {toSuperscript(row.refUnitName)}
          </Tooltip>,
        ];
      },
    },
    {
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
        return (
          <div>
            {row.classification && row.classification !== 'undefined' ? row.classification : '-'}
          </div>
        );
      },
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
              disabled={!isSystemAdmin}
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
                team_id
              `}
              id={row.id}
            >
              <UnitGroupCreate
                disabled={!isSystemAdmin}
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
      title: (
        <FormattedMessage id='pages.table.title.option' defaultMessage='Option'></FormattedMessage>
      ),
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        if (dataSource === 'my') {
          return [
            <Space size={'small'} key={0}>
              <UnitGroupView
                actionRef={actionRef}
                lang={lang}
                id={row.id}
                version={row.version}
                buttonType={'icon'}
              />
              <UnitGroupEdit
                id={row.id}
                version={row.version}
                buttonType={'icon'}
                lang={lang}
                actionRef={actionRef}
                setViewDrawerVisible={() => {}}
              ></UnitGroupEdit>
              <UnitGroupDelete
                id={row.id}
                version={row.version}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => {}}
              ></UnitGroupDelete>
              <TableDropdown
                style={{
                  color: token.colorPrimary,
                }}
                menus={[
                  {
                    key: 'export',
                    name: <ExportData tableName='unitgroups' id={row.id} version={row.version} />,
                  },
                  {
                    key: 'copy',
                    name: (
                      <UnitGroupCreate
                        disabled={!isSystemAdmin}
                        actionType='copy'
                        id={row.id}
                        version={row.version}
                        lang={lang}
                        actionRef={actionRef}
                      ></UnitGroupCreate>
                    ),
                  },
                  {
                    key: 'contribute',
                    name: (
                      <ContributeData
                        onOk={async () => {
                          const { error } = await contributeSource(
                            'unitgroups',
                            row.id,
                            row.version,
                          );
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
            <UnitGroupView
              actionRef={actionRef}
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
              actionRef={actionRef}
            ></UnitGroupCreate>
            <ExportData tableName='unitgroups' id={row.id} version={row.version} />
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
    getRoleByUserId().then((res) => {
      const systemAdmin = res?.find(
        (item) => item.team_id === '00000000-0000-0000-0000-000000000000' && item.role === 'admin',
      );
      setIsSystemAdmin(!!systemAdmin);
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
          <Col style={{ display: 'none' }} flex='100px'>
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
      <ProTable<UnitGroupTable, ListPagination>
        rowKey={(record) => `${record.id}-${record.version}`}
        headerTitle={
          <>
            {getDataTitle(dataSource)} /{' '}
            <FormattedMessage id='menu.tgdata.unitgroups' defaultMessage='Unit Groups' />
            {((dataSource === 'my' && !isSystemAdmin) || dataSource === 'te') && (
              <span style={{ color: token.red, fontSize: token.fontSize }}>
                <FormattedMessage
                  id='pages.unitgroup.title.tips'
                  defaultMessage='(Note: If you need to supplement the unit group data, please contact the administrator!)'
                />
              </span>
            )}
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
              <UnitGroupCreate
                disabled={!isSystemAdmin}
                importData={importData}
                onClose={() => setImportData(null)}
                key={0}
                lang={lang}
                actionRef={actionRef}
              />,
              <ImportData disabled={!isSystemAdmin} onJsonData={handleImportData} key={1} />,
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
            if (openAI) {
              return unitgroup_hybrid_search(params, lang, dataSource, keyWord, {}, stateCode);
            }
            return getUnitGroupTablePgroongaSearch(
              params,
              lang,
              dataSource,
              keyWord,
              {},
              stateCode,
            );
          }
          return getUnitGroupTableAll(params, sort, lang, dataSource, tid ?? '', stateCode);
        }}
        columns={unitGroupColumns}
      ></ProTable>
    </PageContainer>
  );
};

export default TableList;
