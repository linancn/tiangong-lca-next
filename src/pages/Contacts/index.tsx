import { getContactTable } from '@/services/contacts/api';
import { ContactTable } from '@/services/contacts/data';
import { ListPagination } from '@/services/general/data';
import { getLang } from '@/services/general/util';
import { PageContainer } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-table';
import ProTable from '@ant-design/pro-table';
import { Space, Tooltip } from 'antd';
import type { FC } from 'react';
import { useRef } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';
import ContactCreate from './Components/create';
import ContactDelete from './Components/delete';
import ContactEdit from './Components/edit';
import ContactView from './Components/view';

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
  const contactColumns: ProColumns<ContactTable>[] = [
    {
      title: <FormattedMessage id="pages.table.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="pages.contact.shortName" defaultMessage="Short Name" />,
      dataIndex: 'shortName',
      sorter: false,
      render: (_, row) => [
        <Tooltip key={0} placement="topLeft" title={row.name}>
          {row.shortName}
        </Tooltip>,
      ],
    },
    {
      title: <FormattedMessage id="pages.contact.classification" defaultMessage="Classification" />,
      dataIndex: 'classification',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.contact.email" defaultMessage="Email" />,
      dataIndex: 'email',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="pages.contact.createdAt" defaultMessage="Created At" />,
      dataIndex: 'createdAt',
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
              <ContactView id={row.id} dataSource={dataSource} actionRef={actionRef} />
              <ContactEdit
                id={row.id}
                buttonType={'icon'}
                actionRef={actionRef}
                setViewDrawerVisible={() => {}}
              />
              <ContactDelete
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
            <ContactView id={row.id} dataSource={dataSource} actionRef={actionRef} />
          </Space>,
        ];
      },
    },
  ];
  return (
    <PageContainer>
      <ProTable<ContactTable, ListPagination>
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
            return [<ContactCreate key={0} actionRef={actionRef} />];
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
          return getContactTable(params, sort, lang, dataSource);
        }}
        columns={contactColumns}
      />
    </PageContainer>
  );
};

export default TableList;
