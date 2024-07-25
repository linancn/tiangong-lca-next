import { ListPagination } from '@/services/general/data';
import { getLang } from '@/services/general/util';
import { getUnitGroupTableAll, getUnitGroupTablePgroongaSearch } from '@/services/unitgroups/api';
import { UnitGroupTable } from '@/services/unitgroups/data';
import { PageContainer } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-table';
import ProTable from '@ant-design/pro-table';
import { Card, Input, Space } from 'antd';
import { SearchProps } from 'antd/es/input/Search';
import type { FC } from 'react';
import { useRef, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';
import UnitGroupCreate from './Components/create';
import UnitGroupDelete from './Components/delete';
import UnitGroupEdit from './Components/edit';
import UnitGroupView from './Components/view';

const { Search } = Input;

const TableList: FC = () => {
  const [keyWord, setKeyWord] = useState<any>('');

  const location = useLocation();
  let dataSource = '';
  if (location.pathname.includes('/mydata')) {
    dataSource = 'my';
  } else if (location.pathname.includes('/tgdata')) {
    dataSource = 'tg';
  }

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
          id="pages.table.title.classification"
          defaultMessage="Classification"
        ></FormattedMessage>
      ),
      dataIndex: 'classification',
      sorter: false,
      search: false,
    },
    {
      title: (
        <FormattedMessage
          id="pages.table.title.createdAt"
          defaultMessage="Created At"
        ></FormattedMessage>
      ),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      sorter: true,
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
              <UnitGroupView buttonType={'icon'} lang={lang} id={row.id} />
              <UnitGroupEdit
                id={row.id}
                buttonType={'icon'}
                lang={lang}
                actionRef={actionRef}
                setViewDrawerVisible={() => { }}
              ></UnitGroupEdit>
              <UnitGroupDelete
                id={row.id}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => { }}
              ></UnitGroupDelete>
            </Space>,
          ];
        }
        return [
          <Space size={'small'} key={0}>
            <UnitGroupView buttonType={'icon'} lang={lang} id={row.id} />
          </Space>,
        ];
      },
    },
  ];
  const onSearch: SearchProps['onSearch'] = async (value) => {
    await setKeyWord(value);
    actionRef.current?.setPageInfo?.({ current: 1 });
    actionRef.current?.reload();
  };

  return (
    <PageContainer>
      <Card>
        <Search
          size={'large'}
          placeholder={intl.formatMessage({ id: 'pages.search.keyWord' })}
          onSearch={onSearch}
          enterButton
        />
      </Card>
      <ProTable<UnitGroupTable, ListPagination>
        actionRef={actionRef}
        search={false}
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
          return getUnitGroupTableAll(params, sort, lang, dataSource);
        }}
        columns={unitGroupColumns}
      ></ProTable>
    </PageContainer>
  );
};

export default TableList;
