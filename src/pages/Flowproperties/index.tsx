import {
  getFlowpropertyTableAll,
  getFlowpropertyTablePgroongaSearch,
} from '@/services/flowproperties/api';
import { FlowpropertyTable } from '@/services/flowproperties/data';
import { ListPagination } from '@/services/general/data';
import { getDataSource, getLang, getLangText } from '@/services/general/util';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { Card, Input, Space, Tooltip } from 'antd';
import { useRef, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';

import { SearchProps } from 'antd/es/input/Search';
import type { FC } from 'react';
import { Teams } from '../TeamList/info';
import ReferenceUnit from '../Unitgroups/Components/Unit/reference';
import { getDataTitle } from '../Utils';
import FlowpropertiesCreate from './Components/create';
import FlowpropertiesDelete from './Components/delete';
import FlowpropertiesEdit from './Components/edit';
import FlowpropertyView from './Components/view';

const { Search } = Input;

const TableList: FC = () => {
  const [keyWord, setKeyWord] = useState<any>('');

  const location = useLocation();
  const dataSource = getDataSource(location.pathname);

  const searchParams = new URLSearchParams(location.search);
  const tid = searchParams.get('tid');
  const tids = tid ? tid.split(',') : [];

  const intl = useIntl();

  const lang = getLang(intl.locale);
  const titleJson = Teams.find((team) => team.id === tid)?.title;
  const tname = titleJson ? getLangText(Teams.find((team) => team.id === tid)?.title, lang) : false;

  const actionRef = useRef<ActionType>();
  const flowpropertiesColumns: ProColumns<FlowpropertyTable>[] = [
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
      render: (_, row) => [
        <Tooltip key={0} placement="topLeft" title={row.generalComment}>
          {row.name}
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
        <FormattedMessage
          id="pages.flowproperty.referenceToReferenceUnitGroup"
          defaultMessage="Reference unit"
        />
      ),
      dataIndex: 'refUnitGroup',
      sorter: false,
      search: false,
      render: (_, row) => {
        return [
          <ReferenceUnit
            key={0}
            id={row.refUnitGroupId}
            version={row.version}
            idType={'unitgroup'}
            lang={lang}
          />,
        ];
      },
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
              <FlowpropertyView lang={lang} buttonType={'icon'} id={row.id} version={row.version} />
              <FlowpropertiesEdit
                id={row.id}
                version={row.version}
                buttonType={'icon'}
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
            </Space>,
          ];
        }
        return [
          <Space size={'small'} key={0}>
            <FlowpropertyView lang={lang} buttonType={'icon'} id={row.id} version={row.version} />
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

  return (
    <PageContainer header={{ title: tname, breadcrumb: {} }}>
      <Card>
        <Search
          size={'large'}
          placeholder={intl.formatMessage({ id: 'pages.search.keyWord' })}
          onSearch={onSearch}
          enterButton
        />
      </Card>
      <ProTable<FlowpropertyTable, ListPagination>
        headerTitle={
          <>
            {getDataTitle(dataSource)} /{' '}
            <FormattedMessage id="menu.tgdata.flowproperties" defaultMessage="Flow Properties" />
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
          return getFlowpropertyTableAll(params, sort, lang, dataSource, tids);
        }}
        columns={flowpropertiesColumns}
      />
    </PageContainer>
  );
};

export default TableList;
