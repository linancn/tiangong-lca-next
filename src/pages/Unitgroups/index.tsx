import { getUnitGroupTableAll, getUnitGroupTablePgroongaSearch } from '@/services/unitgroups/api';
import { Card, Input, Space, Tooltip } from 'antd';
import { useRef, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';

import { ListPagination } from '@/services/general/data';
import { getDataSource, getLang, getLangText } from '@/services/general/util';
import { UnitGroupTable } from '@/services/unitgroups/data';
import { ActionType, PageContainer, ProColumns, ProTable } from '@ant-design/pro-components';
import { SearchProps } from 'antd/es/input/Search';
import type { FC } from 'react';
import { Teams } from '../TeamList/info';
import { getDataTitle } from '../Utils';
import UnitGroupCreate from './Components/create';
import UnitGroupDelete from './Components/delete';
import UnitGroupEdit from './Components/edit';
import UnitGroupView from './Components/view';

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
  const tname = getLangText(Teams.find((team) => team.id === tid)?.title, lang) || '';

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
              <UnitGroupView buttonType={'icon'} lang={lang} id={row.id} version={row.version} />
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
            </Space>,
          ];
        }
        return [
          <Space size={'small'} key={0}>
            <UnitGroupView buttonType={'icon'} lang={lang} id={row.id} version={row.version} />
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
    <PageContainer header={{ title: tname ?? false, breadcrumb: {} }}>
      <Card>
        <Search
          size={'large'}
          placeholder={intl.formatMessage({ id: 'pages.search.keyWord' })}
          onSearch={onSearch}
          enterButton
        />
      </Card>
      <ProTable<UnitGroupTable, ListPagination>
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
          return getUnitGroupTableAll(params, sort, lang, dataSource, tids);
        }}
        columns={unitGroupColumns}
      ></ProTable>
    </PageContainer>
  );
};

export default TableList;
