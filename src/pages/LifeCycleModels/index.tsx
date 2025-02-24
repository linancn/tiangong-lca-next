import ContributeData from '@/components/ContributeData';
import { contributeSource } from '@/services/general/api';
import { ListPagination } from '@/services/general/data';
import { getDataSource, getLang, getLangText } from '@/services/general/util';
import {
  getLifeCycleModelTableAll,
  getLifeCycleModelTablePgroongaSearch,
} from '@/services/lifeCycleModels/api';
import { LifeCycleModelTable } from '@/services/lifeCycleModels/data';
import { getTeamById } from '@/services/teams/api';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { Card, Input, Space, Tooltip, message } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';
import { getDataTitle } from '../Utils';
import LifeCycleModelCreate from './Components/create';
import LifeCycleModelDelete from './Components/delete';
import LifeCycleModelEdit from './Components/edit';
import LifeCycleModelView from './Components/view';

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
  const processColumns: ProColumns<LifeCycleModelTable>[] = [
    {
      title: <FormattedMessage id="pages.table.title.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.title.name" defaultMessage="Name" />,
      dataIndex: 'name',
      sorter: false,
      search: false,
      render: (_, row) => {
        return [
          <Tooltip key={0} placement="topLeft" title={row.generalComment}>
            {row.name}
          </Tooltip>,
        ];
      },
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
      title: <FormattedMessage id="pages.table.title.version" defaultMessage="Version" />,
      dataIndex: 'version',
      sorter: false,
      search: false,
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
              <LifeCycleModelView
                id={row.id}
                version={row.version}
                lang={lang}
                buttonType={'icon'}
              />
              <LifeCycleModelEdit
                id={row.id}
                version={row.version}
                lang={lang}
                actionRef={actionRef}
                buttonType={'icon'}
              />
              <LifeCycleModelEdit
                type="copy"
                id={row.id}
                version={row.version}
                lang={lang}
                actionRef={actionRef}
                buttonType={'icon'}
              />
              <LifeCycleModelDelete
                id={row.id}
                version={row.version}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => {}}
              />
              <ContributeData
                onOk={async () => {
                  const { error } = await contributeSource('lifecyclemodels', row.id, row.version);
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
            <LifeCycleModelView id={row.id} version={row.version} lang={lang} buttonType={'icon'} />
            <LifeCycleModelEdit
              type="copy"
              id={row.id}
              version={row.version}
              lang={lang}
              actionRef={actionRef}
              buttonType={'icon'}
            />
          </Space>,
        ];
      },
    },
  ];

  const onSearch: SearchProps['onSearch'] = (value) => {
    setKeyWord(value);
    actionRef.current?.setPageInfo?.({ current: 1 });
    actionRef.current?.reload();
  };

  useEffect(() => {
    if (team) {
      return;
    }
    getTeamById(tid ?? '').then((res) => {
      if (res.data.length > 0) setTeam(res.data[0]);
    });
  }, []);

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
      <ProTable<LifeCycleModelTable, ListPagination>
        headerTitle={
          <>
            {getDataTitle(dataSource)} /{' '}
            <FormattedMessage id="menu.tgdata.products" defaultMessage="Product Models" />
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
              <LifeCycleModelCreate
                key={0}
                lang={lang}
                actionRef={actionRef}
                buttonType={'icon'}
              />,
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
            return getLifeCycleModelTablePgroongaSearch(params, lang, dataSource, keyWord, {});
          }
          return getLifeCycleModelTableAll(params, sort, lang, dataSource, tid ?? '');
        }}
        columns={processColumns}
      />
    </PageContainer>
  );
};

export default TableList;
