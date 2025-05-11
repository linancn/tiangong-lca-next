import { ListPagination } from '@/services/general/data';
import { getReviewsApi } from '@/services/reviews/api';
import { ReviewsTable } from '@/services/reviews/data';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Space, Tooltip } from 'antd';
import { useState } from 'react';
import ReviewLifeCycleModelsDetail from './reviewLifeCycleModels';
import ReviewProcessDetail from './reviewProcess';
import SelectReviewer from './SelectReviewer';

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

  const processColumns: ProColumns<ReviewsTable>[] = [
    {
      title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
    },
    {
      title: <FormattedMessage id='pages.table.title.name' defaultMessage='Name' />,
      dataIndex: 'name',
      sorter: false,
      search: false,
      render: (_, row) => {
        return [
          <Tooltip key={0} placement='topLeft'>
            {row.processes.name}
          </Tooltip>,
        ];
      },
    },
    {
      title: (
        <FormattedMessage id='pages.table.title.classification' defaultMessage='Classification' />
      ),
      dataIndex: 'classification',
      sorter: false,
      search: false,
      render: (_, row) => {
        return [<span key={0}>{row.processes.classification}</span>];
      },
    },
    {
      title: <FormattedMessage id='pages.process.referenceYear' defaultMessage='Reference year' />,
      dataIndex: 'referenceYear',
      sorter: false,
      search: false,
      render: (_, row) => {
        return [<span key={0}>{row.processes.referenceYear}</span>];
      },
    },
    {
      title: <FormattedMessage id='pages.process.location' defaultMessage='Location' />,
      dataIndex: 'location',
      sorter: false,
      search: false,
      render: (_, row) => {
        return [<span key={0}>{row.processes.location}</span>];
      },
    },
    {
      title: <FormattedMessage id='pages.table.title.updatedAt' defaultMessage='Updated at' />,
      dataIndex: 'modifiedAt',
      valueType: 'dateTime',
      sorter: false,
      search: false,
    },
  ];

  if (tableType === 'assigned') {
    processColumns.push({
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
                id={record.data_id}
                version={record.data_version}
                lang={lang}
                reviewId={record.id}
              />
            ) : (
              <ReviewProcessDetail
                tabType='assigned'
                type='view'
                actionRef={actionRef}
                id={record.data_id}
                version={record.data_version}
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
    processColumns.push({
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
                  id={record.data_id}
                  version={record.data_version}
                  lang={lang}
                  reviewId={record.id}
                  tabType='review'
                  actionRef={actionRef}
                />

                <ReviewLifeCycleModelsDetail
                  reviewId={record.id}
                  tabType='review'
                  type='view'
                  id={record.data_id}
                  version={record.data_version}
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
                  id={record.data_id}
                  version={record.data_version}
                  lang={lang}
                  reviewId={record.id}
                />
                <ReviewProcessDetail
                  tabType='review'
                  type='view'
                  actionRef={actionRef}
                  id={record.data_id}
                  version={record.data_version}
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
      columns={processColumns}
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
          return await getReviewsApi(params, sort, tableType, lang);
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
