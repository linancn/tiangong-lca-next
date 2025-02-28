import AllVersionsList from '@/components/AllVersions';
import ContributeData from '@/components/ContributeData';
import { contributeSource } from '@/services/general/api';
import { ListPagination } from '@/services/general/data';
import { getDataSource, getLang, getLangText } from '@/services/general/util';
import { getTeamById } from '@/services/teams/api';
import { getUnitGroupTableAll, getUnitGroupTablePgroongaSearch } from '@/services/unitgroups/api';
import { UnitGroupTable } from '@/services/unitgroups/data';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { Card, Input, Space, Tooltip, message } from 'antd';
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
  const [team, setTeam] = useState<any>(null);

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
        <FormattedMessage id="pages.table.title.index" defaultMessage="Index"></FormattedMessage>
      ),
      valueType: 'index',
      search: false,
    },
    {
      title: (
        <FormattedMessage id="pages.table.title.name" defaultMessage="Name"></FormattedMessage>
      ),
      dataIndex: 'name',
      sorter: false,
    },
    {
      title: (
        <FormattedMessage
          id="pages.unitgroup.unit.quantitativeReference"
          defaultMessage="Quantitative reference"
        />
      ),
      dataIndex: 'refUnitName',
      sorter: false,
      search: false,
      render: (_, row) => [
        <Tooltip key={0} placement="topLeft" title={row.refUnitGeneralComment}>
          {row.refUnitName}
        </Tooltip>,
      ],
    },
    {
      title: (
        <FormattedMessage
          id="pages.table.title.classification"
          defaultMessage="Classification"
        ></FormattedMessage>
      ),
      dataIndex: 'classification',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.version" defaultMessage="Version" />,
      dataIndex: 'version',
      sorter: false,
      search: false,
      render: (_, row) => {
        return (
          <Space size={'small'}>
            {row.version}
            <AllVersionsList
              lang={lang}
              searchTableName="unitgroups"
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
              <UnitGroupEdit
                type="createVersion"
                id={row.id}
                version={row.version}
                lang={lang}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => {}}
              />
            </AllVersionsList>
          </Space>
        );
      },
    },
    {
      title: (
        <FormattedMessage
          id="pages.table.title.updatedAt"
          defaultMessage="Updated at"
        ></FormattedMessage>
      ),
      dataIndex: 'modifiedAt',
      valueType: 'dateTime',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage id="pages.table.title.option" defaultMessage="Option"></FormattedMessage>
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
              <UnitGroupEdit
                type="copy"
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
              <ContributeData
                onOk={async () => {
                  const { error } = await contributeSource('unitgroups', row.id, row.version);
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
            <UnitGroupEdit
              type="copy"
              id={row.id}
              version={row.version}
              buttonType={'icon'}
              lang={lang}
              actionRef={actionRef}
              setViewDrawerVisible={() => {}}
            ></UnitGroupEdit>
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
      <ProTable<UnitGroupTable, ListPagination>
        rowKey={(record) => `${record.id}-${record.version}`}
        headerTitle={
          <>
            {getDataTitle(dataSource)} /{' '}
            <FormattedMessage id="menu.tgdata.unitgroups" defaultMessage="Unit Groups" />
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
            return [<UnitGroupCreate key={0} lang={lang} actionRef={actionRef} />];
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
            return getUnitGroupTablePgroongaSearch(params, lang, dataSource, keyWord, {});
          }
          return getUnitGroupTableAll(params, sort, lang, dataSource, tid ?? '');
        }}
        columns={unitGroupColumns}
      ></ProTable>
    </PageContainer>
  );
};

export default TableList;
