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
// import UnitGroupEdit from './Components/edit';
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
      title: <FormattedMessage id="unitGroup.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="unitGroup.name" defaultMessage="Name" />,
      dataIndex: 'name',
      sorter: false,
    },
    {
      title: <FormattedMessage id="unitGroup.classification" defaultMessage="Classification" />,
      dataIndex: 'classification',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="unitGroup.email" defaultMessage="Reference Unit" />,
      dataIndex: 'referenceToReferenceUnit',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="unitGroup.createdAt" defaultMessage="Created At" />,
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      sorter: true,
      search: false,
    },
    {
      title: <FormattedMessage id="options.option" defaultMessage="Option" />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        if (dataSource === 'my') {
          return [
            <Space size={'small'} key={0}>
              <UnitGroupView id={row.id} dataSource={dataSource} actionRef={actionRef} />
              {/* <UnitGroupEdit
                id={row.id}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => { }}
              /> */}
              <UnitGroupDelete
                id={row.id}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => {}}
              />
            </Space>,
          ];
        }
        return [
          <Space size={'small'} key={0}>
            <UnitGroupView id={row.id} dataSource={dataSource} actionRef={actionRef} />
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
            return [<UnitGroupCreate key={0} actionRef={actionRef} />];
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
      />
    </PageContainer>
  );
};

export default TableList;
