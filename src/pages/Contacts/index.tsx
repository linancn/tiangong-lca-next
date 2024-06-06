// import { getFlowGrid } from '@/services/flow/api';
// import type { Flow } from '@/services/flow/data';
// import type { ListPagination } from '@/services/home/data';
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

type QueryProps = {
  location: {
    query: {
      datatype: string;
    };
  };
};

const TableList: FC<QueryProps> = () => {
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
  const flowColumns: ProColumns<ContactTable>[] = [
    {
      title: <FormattedMessage id="contact.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="contact.shortName" defaultMessage="Data Name" />,
      dataIndex: 'shortName',
      sorter: false,
      render: (_, row) => [
        <Tooltip key={0} placement="topLeft" title={row.name}>
          {row.shortName}
        </Tooltip>,
      ],
    },
    {
      title: <FormattedMessage id="contact.classification" defaultMessage="Classification" />,
      dataIndex: 'classification',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="contact.email" defaultMessage="Email" />,
      dataIndex: 'email',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="contact.createdAt" defaultMessage="Created At" />,
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      sorter: true,
      search: false,
    },
    {
      title: <FormattedMessage id="options.option" defaultMessage="Option" />,
      dataIndex: 'option',
      search: false,
      render: () => [
        <Space size={'small'} key={0}>
          {/* <FlowView pkid={row.pkid} actionRef={actionRef} />
          <FlowEdit
            pkid={row.pkid}
            buttonType={'icon'}
            actionRef={actionRef}
            setViewDrawerVisible={() => {}}
          />
          <FlowDelete
            pkid={row.pkid}
            buttonType={'icon'}
            actionRef={actionRef}
            setViewDrawerVisible={() => {}}
          /> */}
        </Space>,
      ],
    },
  ];
  // useEffect(() => {
  //   getProject(projectid).then((result) => setProjectName(result.name + ' - '));
  // }, [projectid]);
  return (
    <PageContainer
    // header={{
    //   title: (
    //     <>
    //       {projectName}
    //       <FormattedMessage id="menu.flows" defaultMessage="Flows" />
    //     </>
    //   ),
    // }}
    >
      <ProTable<ContactTable, ListPagination>
        actionRef={actionRef}
        search={{
          defaultCollapsed: false,
        }}
        pagination={{
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
        columns={flowColumns}
      />
    </PageContainer>
  );
};

export default TableList;
