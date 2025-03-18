import { contributeSource } from '@/services/general/api';
import { getSourceTableAll, getSourceTablePgroongaSearch } from '@/services/sources/api';
import { Card, Input, Space, Tooltip, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';

import AllVersionsList from '@/components/AllVersions';
import ContributeData from '@/components/ContributeData';
import { ListPagination } from '@/services/general/data';
import { getDataSource, getLang, getLangText } from '@/services/general/util';
import { SourceTable } from '@/services/sources/data';
import { getTeamById } from '@/services/teams/api';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { SearchProps } from 'antd/es/input/Search';
import type { FC } from 'react';
import { getAllVersionsColumns, getDataTitle } from '../Utils';
import SourceCreate from './Components/create';
import SourceDelete from './Components/delete';
import SourceEdit from './Components/edit';
import SourceView from './Components/view';
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
  const sourceColumns: ProColumns<SourceTable>[] = [
    {
      title: <FormattedMessage id="pages.table.title.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.name" defaultMessage="Name" />,
      dataIndex: 'shortName',
      sorter: false,
      search: false,
      render: (_, row) => [
        <Tooltip key={0} placement="topLeft" title={row.shortName}>
          {row.shortName}
        </Tooltip>,
      ],
    },
    {
      title: (
        <FormattedMessage id="pages.table.title.classification" defaultMessage="Classification" />
      ),
      dataIndex: 'classification',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage id="pages.source.publicationType" defaultMessage="Publication type" />
      ),
      dataIndex: 'publicationType',
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
              searchTableName="sources"
              columns={getAllVersionsColumns(sourceColumns, 4)}
              searchColume={`
                 id,
                json->sourceDataSet->sourceInformation->dataSetInformation->"common:shortName",
                json->sourceDataSet->sourceInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class",
                json->sourceDataSet->sourceInformation->dataSetInformation->>sourceCitation,
                json->sourceDataSet->sourceInformation->dataSetInformation->>publicationType,
                version,
                modified_at,
                team_id
              `}
              id={row.id}
            >
              <SourceCreate
                actionType="createVersion"
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
      title: <FormattedMessage id="pages.table.title.updatedAt" defaultMessage="Updated at" />,
      dataIndex: 'modifiedAt',
      valueType: 'dateTime',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.option" defaultMessage="Option" />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        if (dataSource === 'my') {
          return [
            <Space size={'small'} key={0}>
              <SourceView
                actionRef={actionRef}
                lang={lang}
                id={row.id}
                version={row.version}
                buttonType={'icon'}
              />
              <SourceEdit
                id={row.id}
                version={row.version}
                lang={lang}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => {}}
              />
              <SourceCreate
                actionType="copy"
                id={row.id}
                version={row.version}
                lang={lang}
                actionRef={actionRef}
              />
              <SourceDelete
                id={row.id}
                version={row.version}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => {}}
              />
              <ContributeData
                onOk={async () => {
                  const { error } = await contributeSource('sources', row.id, row.version);
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
            <SourceView
              actionRef={actionRef}
              lang={lang}
              id={row.id}
              version={row.version}
              buttonType={'icon'}
            />
            <SourceCreate
              actionType="copy"
              id={row.id}
              version={row.version}
              lang={lang}
              actionRef={actionRef}
            />
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
          placeholder={intl.formatMessage({ id: 'pages.search.keyWord',defaultMessage: 'Full-text search: Enter one or more keywords.' })}
          onSearch={onSearch}
          enterButton
        />
      </Card>
      <ProTable<SourceTable, ListPagination>
        rowKey={(record) => `${record.id}-${record.version}`}
        headerTitle={
          <>
            {getDataTitle(dataSource)} /{' '}
            <FormattedMessage id="menu.tgdata.sources" defaultMessage="Sources" />
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
            return [<SourceCreate lang={lang} key={0} actionRef={actionRef} />];
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
            return getSourceTablePgroongaSearch(params, lang, dataSource, keyWord, {});
          }
          return getSourceTableAll(params, sort, lang, dataSource, tid ?? '');
        }}
        columns={sourceColumns}
      />
    </PageContainer>
  );
};

export default TableList;
