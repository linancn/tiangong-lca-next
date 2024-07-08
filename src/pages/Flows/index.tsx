import { getFlowTable } from '@/services/flows/api';
import { FlowsTable } from '@/services/flows/data';
import { ListPagination } from '@/services/general/data';
import { getLang } from '@/services/general/util';
import { PageContainer } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-table';
import ProTable from '@ant-design/pro-table';
import { Space, Tooltip } from 'antd';
import type { FC } from 'react';
import { useRef } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';
import FlowsCreate from './Components/create';
import FlowsDelete from './Components/delete';
import FlowsEdit from './Components/edit';
import FlowsView from './Components/view';

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
  const flowsColumns: ProColumns<FlowsTable>[] = [
    {
      title: <FormattedMessage id="pages.table.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.flows.baseName" defaultMessage="Base Name" />,
      dataIndex: 'baseName',
      sorter: false,
      render: (_, row) => [
        <Tooltip key={0} placement="topLeft" title={row.generalComment}>
          {row.baseName}
        </Tooltip>,
      ],
    },
    {
      title: <FormattedMessage id="pages.flows.classification" defaultMessage="Classification" />,
      dataIndex: 'classification',
      sorter: false,
      search: false,
    },

    {
      title: (
        <FormattedMessage id="pages.flows.CASNumber" defaultMessage="CAS Number" />
      ),
      dataIndex: 'CASNumber',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.flows.createdAt" defaultMessage="Created At" />,
      dataIndex: 'created_at',
      valueType: 'dateTime',
      sorter: true,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.table.option" defaultMessage="Option" />,
      dataIndex: 'option',
      search: false,
      render: (_, row) => {
        if (dataSource === 'my') {
          return [
            <Space size={'small'} key={0}>
              <FlowsView
                buttonType={'icon'}
                id={row.id}
                dataSource={dataSource}
                lang={lang}
                actionRef={actionRef} />
              <FlowsEdit
                id={row.id}
                lang={lang}
                buttonType={'icon'}
                actionRef={actionRef}
              />
              <FlowsDelete
                id={row.id}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => { }}
              />
            </Space>,
          ];
        }
        return [
          <Space size={'small'} key={0}>
            <FlowsView
              buttonType={'icon'}
              id={row.id}
              dataSource={dataSource}
              lang={lang}
              actionRef={actionRef} />
          </Space>,
        ];
      },
    },
  ];
  return (
    <PageContainer>
      <ProTable<FlowsTable, ListPagination>
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
            return [<FlowsCreate key={0} lang={lang} actionRef={actionRef} />];
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
          return getFlowTable(params, sort, lang, dataSource);
        }}
        columns={flowsColumns}
      />
    </PageContainer>
  );
};

export default TableList;
