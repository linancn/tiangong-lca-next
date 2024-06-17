import { ListPagination } from '@/services/general/data';
import { getLang } from '@/services/general/util';
import { getProcessTable } from '@/services/processes/api';
import { ProcessTable } from '@/services/processes/data';
import { PageContainer } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-table';
import ProTable from '@ant-design/pro-table';
import { Space, Tooltip } from 'antd';
import type { FC } from 'react';
import { useRef } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';
import ProcessCreate from './Components/create';
import ProcessDelete from './Components/delete';
import ProcessView from './Components/view';

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
  const processColumns: ProColumns<ProcessTable>[] = [
    {
      title: <FormattedMessage id="process.index" defaultMessage="Index" />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id="process.baseName" defaultMessage="Base Name" />,
      dataIndex: 'baseName',
      sorter: false,
      render: (_, row) => [
        <Tooltip key={0} placement="topLeft" title={row.generalComment ?? '-'}>
          {row.baseName}
        </Tooltip>,
      ],
    },
    {
      title: <FormattedMessage id="process.classification" defaultMessage="Classification" />,
      dataIndex: 'classification',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="process.referenceYear" defaultMessage="Reference Year" />,
      dataIndex: 'referenceYear',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="process.location" defaultMessage="Location" />,
      dataIndex: 'location',
      sorter: false,
      search: false,
    },
    {
      title: <FormattedMessage id="process.createdAt" defaultMessage="Created At" />,
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
              <ProcessView id={row.id} dataSource={dataSource} lang={lang} actionRef={actionRef} />
              {/* //       //   <ContactEdit
            //       //     id={row.id}
            //       //     buttonType={'icon'}
            //       //     actionRef={actionRef}
            //       //     setViewDrawerVisible={() => {}}
            //       //   />*/}
              <ProcessDelete
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
            <ProcessView id={row.id} dataSource={dataSource} lang={lang} actionRef={actionRef} />
          </Space>,
        ];
      },
    },
  ];
  return (
    <PageContainer>
      <ProTable<ProcessTable, ListPagination>
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
            return [<ProcessCreate key={0} lang={lang} actionRef={actionRef} />];
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
          return getProcessTable(params, sort, lang, dataSource);
        }}
        columns={processColumns}
      />
    </PageContainer>
  );
};

export default TableList;
