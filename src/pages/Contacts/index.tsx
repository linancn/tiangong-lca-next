// import { getFlowGrid } from '@/services/flow/api';
// import type { Flow } from '@/services/flow/data';
// import type { ListPagination } from '@/services/home/data';
import { getContactTable } from '@/services/contacts/api';
import { ContactTable } from '@/services/contacts/data';
import { ListPagination } from '@/services/share/data';
import { PageContainer } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-table';
import ProTable from '@ant-design/pro-table';
import { Space } from 'antd';
import type { FC } from 'react';
import { useRef } from 'react';
import { FormattedMessage } from 'umi';
// import FlowCreate from './components/create';
// import FlowDelete from './components/delete';
// import FlowEdit from './components/edit';
// import FlowPropertyJsonList from './components/propertyjson';
// import FlowView from './components/view';

type QueryProps = {
  location: {
    query: {
      datatype: string;
    };
  };
};

const TableList: FC<QueryProps> = () => {
  // const { datatype } = porps.location.query;
  // const [projectName, setProjectName] = useState('');
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
    },
    {
      title: <FormattedMessage id="contact.classification" defaultMessage="Classification" />,
      dataIndex: 'classification',
      sorter: false,
      search: false,
      // render: (_, row) => [
      //   <Space size={'small'} key={0}>
      //     {row.categoryId === null
      //       ? '-'
      //       : row.categoryPath.replaceAll('", "', ' > ').replaceAll('["', '').replaceAll('"]', '')}
      //     {/* <CategoryViewByParent
      //       projectId={row.projectId}
      //       id={row.categoryId}
      //       parentType={'flow'}
      //       parentId={row.id}
      //       actionRef={actionRef}
      //     /> */}
      //   </Space>,
      // ],
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
        // toolBarRender={() => [
        //   <FlowCreate key={0} actionRef={actionRef} />,
        // <FlowSelect key={1} parentActionRef={actionRef} />,
        // ]}
        request={async (
          params: {
            pageSize: number;
            current: number;
          },
          sort,
        ) => {
          return getContactTable(params, sort);
        }}
        columns={flowColumns}
      />
    </PageContainer>
  );
};

export default TableList;
