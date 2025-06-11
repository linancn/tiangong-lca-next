import { ListPagination } from '@/services/general/data';
import { getReviewsTableData } from '@/services/reviews/api';
import { ReviewsTable } from '@/services/reviews/data';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Space } from 'antd';
import { useState } from 'react';
import SelectReviewer from './SelectReviewer';
import ProcessView from '@/pages/Processes/Components/view';
import LifeCycleModelView from '@/pages/LifeCycleModels/Components/view';
import ReviewLifeCycleModelsDetail from './reviewLifeCycleModels';
import ReviewProcessDetail from './reviewProcess';

type AssignmentReviewProps = {
  userData: { user_id: string; role: string } | null;
  tableType: 'unassigned' | 'assigned' | 'review';
  actionRef: any;
};

const AssignmentReview = ({ userData, tableType, actionRef }: AssignmentReviewProps) => {
  // const intl = useIntl();
  const { locale } = useIntl();
  const lang = locale === 'zh-CN' ? 'zh' : 'en';
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const handleRowSelectionChange = (keys: React.Key[]) => {
    setSelectedRowKeys(keys);
  };

  const columns: ProColumns<ReviewsTable>[] = [
    {
      title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id='pages.review.table.column.processName' defaultMessage='Process Name' />,
      dataIndex: 'processName',
      sorter: false,
      search: false,
      render: (_, row) => {
        return [
          <div key={0} style={{ display: 'flex' }}>
            {row.processName}
            {row?.isFromLifeCycle ?
              <LifeCycleModelView
                id={row?.json?.data?.id}
                version={row?.json?.data?.version}
                lang={lang}
                buttonType='icon'
              /> :
              <ProcessView
                id={row?.json?.data?.id}
                version={row?.json?.data?.version}
                lang={lang}
                buttonType='icon'
                disabled={false}
              />}
          </div>
        ];
      },
    },
    {
      title: (
        <FormattedMessage id='pages.review.table.column.teamName' defaultMessage='Team Name' />
      ),
      dataIndex: 'teamName',
      sorter: false,
      search: false,
      render: (_, row) => {
        return [<span key={0}>{row.teamName}</span>];
      },
    },
    {
      title: (
        <FormattedMessage id='pages.review.table.column.userName' defaultMessage='User Name' />
      ),
      dataIndex: 'userName',
      sorter: false,
      search: false,
      render: (_, row) => {
        return [<span key={0}>{row.userName}</span>];
      },
    },
    {
      title: <FormattedMessage id='pages.review.table.column.createAt' defaultMessage='Create At' />,
      dataIndex: 'createAt',
      sorter: false,
      search: false,
      valueType: 'dateTime',
    }
  ];

  if (tableType === 'assigned') {
    columns.push({
      title: <FormattedMessage id='pages.review.actions' defaultMessage='Actions' />,
      dataIndex: 'actions',
      search: false,
      render: (_, record) => {
        return [
          <Space key={0}>
            {record.isFromLifeCycle ? (
              <ReviewLifeCycleModelsDetail
                tabType='assigned'
                type='view'
                actionRef={actionRef}
                id={record.json?.data?.id}
                version={record.json?.data?.version}
                lang={lang}
                reviewId={record.id}
              />
            ) : (
              <ReviewProcessDetail
                tabType='assigned'
                type='view'
                actionRef={actionRef}
                id={record.json?.data?.id}
                version={record.json?.data?.version}
                lang={lang}
                reviewId={record.id}
              />
            )}
          </Space>,
        ];
      },
    });
  }

  if (tableType === 'review') {
    columns.push({
      title: <FormattedMessage id='pages.review.actions' defaultMessage='Actions' />,
      dataIndex: 'actions',
      search: false,
      render: (_, record) => {
        return [
          <Space key={0}>
            {record.isFromLifeCycle ? (
              <>
                <ReviewLifeCycleModelsDetail
                  type='edit'
                  id={record.json?.data?.id}
                  version={record.json?.data?.version}
                  lang={lang}
                  reviewId={record.id}
                  tabType='review'
                  actionRef={actionRef}
                />

                <ReviewLifeCycleModelsDetail
                  reviewId={record.id}
                  tabType='review'
                  type='view'
                  id={record.json?.data?.id}
                  version={record.json?.data?.version}
                  lang={lang}
                  actionRef={actionRef}
                />
              </>
            ) : (
              <>
                <ReviewProcessDetail
                  tabType='review'
                  type='edit'
                  actionRef={actionRef}
                  id={record.json?.data?.id}
                  version={record.json?.data?.version}
                  lang={lang}
                  reviewId={record.id}
                />
                <ReviewProcessDetail
                  tabType='review'
                  type='view'
                  actionRef={actionRef}
                  id={record.json?.data?.id}
                  version={record.json?.data?.version}
                  lang={lang}
                  reviewId={record.id}
                />
              </>
            )}
          </Space>,
        ];
      },
    });
  }

  return (
    <ProTable<ReviewsTable, ListPagination>
      loading={tableLoading}
      columns={columns}
      rowKey='id'
      search={false}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showQuickJumper: true,
      }}
      toolBarRender={() => {
        if (selectedRowKeys && selectedRowKeys?.length > 0 && tableType === 'unassigned') {
          return [<SelectReviewer actionRef={actionRef} reviewIds={selectedRowKeys} key={0} />];
        }
        return [];
      }}
      headerTitle={
        <>
          <FormattedMessage id='menu.review' defaultMessage='Review Management' /> /{' '}
          {tableType === 'unassigned' ? (
            <FormattedMessage id='pages.review.tabs.unassigned' defaultMessage='Unassigned' />
          ) : tableType === 'assigned' ? (
            <FormattedMessage id='pages.review.tabs.assigned' defaultMessage='Assigned' />
          ) : (
            <FormattedMessage id='pages.review.tabs.review' defaultMessage='Review' />
          )}
        </>
      }
      request={async (
        params: {
          pageSize: number;
          current: number;
        },
        sort,
      ) => {
        try {
          if (!userData?.role) {
            return {
              data: [],
              success: true,
              total: 0,
            };
          }
          setTableLoading(true);
          setSelectedRowKeys([]);
          return await getReviewsTableData(params, sort, tableType, lang);
        } catch (error) {
          console.error(error);
          return {
            data: [],
            success: true,
            total: 0,
          };
        } finally {
          setTableLoading(false);
        }
      }}
      actionRef={actionRef}
      rowSelection={
        tableType === 'unassigned'
          ? {
            selectedRowKeys,
            onChange: handleRowSelectionChange,
          }
          : undefined
      }
    />
  );
};

export default AssignmentReview;
