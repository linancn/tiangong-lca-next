import { ListPagination } from '@/services/general/data';
import { getLang } from '@/services/general/util';
import { getUnitGroupTable } from '@/services/unitgroups/api';
import { UnitGroupTable } from '@/services/unitgroups/data';
import { PageContainer } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-table';
import ProTable from '@ant-design/pro-table';
import { Space } from 'antd';
import type { FC } from 'react';
import { useRef } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';
import UnitGroupCreate from './Components/create';
import UnitGroupDelete from './Components/delete';
import UnitGroupEdit from './Components/edit';
import UnitGroupView from './Components/view';

const TableList: FC = () => {
  const location = useLocation();
  let dataSource = '';
  if (location.pathname.includes('/mydata')) {
    dataSource = 'my';
  } else if (location.pathname.includes('/tgdata')) {
    dataSource = 'tg';
  }
  const { locale } = useIntl();
  const lang = getLang(locale);
  const actionRef = useRef<ActionType>();
  const unitGroupColumns: ProColumns<UnitGroupTable>[] = [
    {
      title: <FormattedMessage id="pages.table.index" defaultMessage="Index"></FormattedMessage>,
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.unitgroup.name" defaultMessage="Name"></FormattedMessage>,
      dataIndex: 'name',
      sorter: false,
    },
    {
      title: <FormattedMessage id="pages.unitgroup.classification" defaultMessage="Classification"></FormattedMessage>,
      dataIndex: 'classification',
      sorter: false,
      search: false,
    },
    // {
    //   title: <FormattedMessage id="unitGroup.email" defaultMessage="Reference Unit"></FormattedMessage>,
    //   dataIndex: 'referenceToReferenceUnit',
    //   sorter: false,
    //   search: false,
    // },
    {
      title: <FormattedMessage id="pages.unitgroup.createdAt" defaultMessage="Created At"></FormattedMessage>,
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      sorter: true,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.option" defaultMessage="Option"></FormattedMessage>,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        if (dataSource === 'my') {
          return [
            <Space size={'small'} key={0}>
              <UnitGroupView id={row.id} dataSource={dataSource} actionRef={actionRef}></UnitGroupView>
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
            <UnitGroupView id={row.id} dataSource={dataSource} actionRef={actionRef}></UnitGroupView>
          </Space>,
        ];
      },
    },
  ];
  return (
    <PageContainer>
      <ProTable<UnitGroupTable, ListPagination>
        actionRef={actionRef}
        search={{
          defaultCollapsed: false,
        }}
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
          return getUnitGroupTable(params, sort, lang, dataSource);
        }}
        columns={unitGroupColumns}
      ></ProTable>
    </PageContainer>
  );
};

export default TableList;
