import {
  getFlowpropertyTableAll,
  getFlowpropertyTablePgroongaSearch,
} from '@/services/flowproperties/api';
import { FlowpropertyTable } from '@/services/flowproperties/data';
import { ListPagination } from '@/services/general/data';
import { getDataSource, getLang, getLangText } from '@/services/general/util';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { Card, Input, Space, Tooltip, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';

import AllVersionsList from '@/components/AllVersions';
import ContributeData from '@/components/ContributeData';
import { contributeSource } from '@/services/general/api';
import { getTeamById } from '@/services/teams/api';
import { SearchProps } from 'antd/es/input/Search';
import type { FC } from 'react';
// import ReferenceUnit from '../Unitgroups/Components/Unit/reference';
import ExportData from '@/components/ExportData';
import { getUnitData } from '@/services/general/util';
import { getAllVersionsColumns, getDataTitle } from '../Utils';
import FlowpropertiesCreate from './Components/create';
import FlowpropertiesDelete from './Components/delete';
import FlowpropertiesEdit from './Components/edit';
import FlowpropertyView from './Components/view';
const { Search } = Input;

const TableList: FC = () => {
  const [keyWord, setKeyWord] = useState<any>('');
  const [team, setTeam] = useState<any>(null);

  const location = useLocation();
  const dataSource = getDataSource(location.pathname);

  const searchParams = new URLSearchParams(location.search);
  const tid = searchParams.get('tid');

  const intl = useIntl();

  const lang = getLang(intl.locale);

  const actionRef = useRef<ActionType>();
  const flowpropertiesColumns: ProColumns<FlowpropertyTable>[] = [
    {
      title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id='pages.table.title.name' defaultMessage='Name' />,
      dataIndex: 'name',
      sorter: false,
      render: (_, row) => [
        <Tooltip key={0} placement='topLeft' title={row.generalComment}>
          {row.name}
        </Tooltip>,
      ],
    },
    {
      title: (
        <FormattedMessage id='pages.table.title.classification' defaultMessage='Classification' />
      ),
      dataIndex: 'classification',
      sorter: false,
      search: false,
    },
    {
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
          <span key={0}>
            {getLangText(row.refUnitRes?.name, lang)} (
            <Tooltip
              placement='topLeft'
              title={getLangText(row.refUnitRes?.refUnitGeneralComment, lang)}
            >
              {row.refUnitRes?.refUnitName}
            </Tooltip>
            )
          </span>,
          // <ReferenceUnit
          //   key={1}
          //   id={row.refUnitGroupId}
          //   version={row.version}
          //   idType={'unitgroup'}
          //   lang={lang}
          // />,
        ];
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
                  team_id
              `}
              id={row.id}
            >
              <FlowpropertiesCreate
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
              <FlowpropertyView
                actionRef={actionRef}
                lang={lang}
                buttonType={'icon'}
                id={row.id}
                version={row.version}
              />
              <FlowpropertiesEdit
                id={row.id}
                version={row.version}
                buttonType={'icon'}
                actionRef={actionRef}
                lang={lang}
              />
              <FlowpropertiesCreate
                actionType='copy'
                id={row.id}
                version={row.version}
                actionRef={actionRef}
                lang={lang}
              />
              <FlowpropertiesDelete
                id={row.id}
                version={row.version}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => {}}
              />
              <ContributeData
                onOk={async () => {
                  const { error } = await contributeSource('flowproperties', row.id, row.version);
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
              <ExportData tableName='flowproperties' id={row.id} version={row.version} />
            </Space>,
          ];
        }
        return [
          <Space size={'small'} key={0}>
            <FlowpropertyView
              actionRef={actionRef}
              lang={lang}
              buttonType={'icon'}
              id={row.id}
              version={row.version}
            />
            <FlowpropertiesCreate
              actionType='copy'
              id={row.id}
              version={row.version}
              actionRef={actionRef}
              lang={lang}
            />
            <ExportData tableName='flowproperties' id={row.id} version={row.version} />
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
      <ProTable<FlowpropertyTable, ListPagination>
        rowKey={(record) => `${record.id}-${record.version}`}
        headerTitle={
          <>
            {getDataTitle(dataSource)} /{' '}
            <FormattedMessage id='menu.tgdata.flowproperties' defaultMessage='Flow Properties' />
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
            return [<FlowpropertiesCreate lang={lang} key={0} actionRef={actionRef} />];
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
            return getFlowpropertyTablePgroongaSearch(params, lang, dataSource, keyWord, {});
          }
          return getFlowpropertyTableAll(params, sort, lang, dataSource, tid ?? '').then((res) => {
            return getUnitData('unitgroup', res?.data ?? []).then((refUnitGroupResp: any) => {
              return {
                ...res,
                data: refUnitGroupResp ?? [],
              };
            });
          });
        }}
        columns={flowpropertiesColumns}
      />
    </PageContainer>
  );
};

export default TableList;
