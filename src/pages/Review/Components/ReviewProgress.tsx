import { getCommentApi, updateCommentByreviewerApi } from '@/services/comments/api';
import { updateReviewApi } from '@/services/reviews/api';
import { getUsersByIds } from '@/services/users/api';
import { CloseOutlined, DeleteOutlined, FileSyncOutlined } from '@ant-design/icons';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Button, Drawer, Modal, Tag, Tooltip, message, theme } from 'antd';
import { useRef, useState } from 'react';
import SelectReviewer from './SelectReviewer';

type ReviewProgressProps = {
  reviewId: string;
};

type ReviewerData = {
  id: string;
  reviewer_id: string;
  reviewer_name: string;
  state_code: number;
  updated_at: string;
  comment?: string;
};

export default function ReviewProgress({ reviewId }: ReviewProgressProps) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableData, setTableData] = useState<ReviewerData[]>([]);
  const tableRef = useRef<any>(null);
  const intl = useIntl();
  const { token } = theme.useToken();
  const fetchTableData = async () => {
    setTableLoading(true);
    try {
      const { data: reviewStateResult } = await getCommentApi(reviewId, 'assigned');
      const tableResult: ReviewerData[] = [];
      if (reviewStateResult && reviewStateResult.length) {
        const reviewerIds: string[] = [];
        reviewStateResult.forEach((item: any) => {
          if (item.state_code >= 0) {
            tableResult.push(item);
            reviewerIds.push(item.reviewer_id);
          }
        });
        const userResult = await getUsersByIds(reviewerIds);
        tableResult.forEach((item: any) => {
          const user = userResult?.find((user: any) => user.id === item.reviewer_id);
          item.reviewer_name = user?.display_name;
        });
        setTableData(tableResult);
        return {
          data: tableResult,
          success: true,
          total: tableResult.length,
        };
      }
      return {
        data: [],
        success: true,
        total: 0,
      };
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
  };

  const getStateText = (stateCode: number) => {
    switch (stateCode) {
      case 0:
        return {
          text: intl.formatMessage({
            id: 'pages.review.progress.status.pending',
            defaultMessage: 'Pending Review',
          }),
          color: 'orange',
        };
      case 1:
        return {
          text: intl.formatMessage({
            id: 'pages.review.progress.status.reviewed',
            defaultMessage: 'Reviewed',
          }),
          color: 'blue',
        };
      default:
        return {
          text: intl.formatMessage({
            id: 'pages.review.progress.status.unknown',
            defaultMessage: 'Unknown Status',
          }),
          color: 'default',
        };
    }
  };

  const handleRemoveReviewer = async (reviewerId: string) => {
    Modal.confirm({
      okButtonProps: {
        type: 'primary',
        style: { backgroundColor: token.colorPrimary },
      },
      cancelButtonProps: {
        style: { borderColor: token.colorPrimary, color: token.colorPrimary },
      },
      title: intl.formatMessage({
        id: 'pages.review.progress.confirm.title',
        defaultMessage: 'Confirm Revocation',
      }),
      content: intl.formatMessage({
        id: 'pages.review.progress.confirm.content',
        defaultMessage: 'Are you sure to revoke this reviewer?',
      }),
      onOk: async () => {
        try {
          setTableLoading(true);
          const result = await updateCommentByreviewerApi(reviewId, reviewerId, { state_code: -2 });
          const reivewerIds: string[] = [];
          tableData.forEach((item: ReviewerData) => {
            if (item.reviewer_id !== reviewerId) {
              reivewerIds.push(item.reviewer_id);
            }
          });
          const { data } = await updateReviewApi([reviewId], { reviewer_id: reivewerIds });
          if (!result.error && data && data.length > 0) {
            message.success(
              intl.formatMessage({
                id: 'pages.review.progress.delete.success',
                defaultMessage: 'Successfully revoked the auditor',
              }),
            );
          } else {
            message.error(
              intl.formatMessage({
                id: 'pages.review.progress.delete.error',
                defaultMessage: 'Failed to revoke the auditor',
              }),
            );
          }
          tableRef.current?.reload();
        } catch (error) {
          console.error('Failed to revoke reviewer:', error);
        } finally {
          setTableLoading(false);
        }
      },
    });
  };

  const columns: ProColumns<ReviewerData>[] = [
    {
      title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
      dataIndex: 'index',
      valueType: 'index',
      search: false,
      width: 60,
    },
    {
      title: (
        <FormattedMessage id='pages.review.progress.table.reviewerName' defaultMessage='Name' />
      ),
      dataIndex: 'reviewer_name',
      search: false,
    },
    {
      title: (
        <FormattedMessage id='pages.review.progress.table.status' defaultMessage='Review Status' />
      ),
      dataIndex: 'state_code',
      search: false,
      render: (_, record) => {
        const stateInfo = getStateText(record.state_code);
        return <Tag color={stateInfo.color}>{stateInfo.text}</Tag>;
      },
    },
    {
      title: (
        <FormattedMessage
          id='pages.review.progress.table.updateTime'
          defaultMessage='Update Time'
        />
      ),
      dataIndex: 'modified_at',
      search: false,
      valueType: 'dateTime',
    },
    {
      title: <FormattedMessage id='pages.review.progress.table.actions' defaultMessage='Actions' />,
      dataIndex: 'actions',
      search: false,
      render: (_, record) => [
        <Tooltip
          key='remove'
          title={intl.formatMessage({
            id: 'pages.review.progress.tooltip.revoke',
            defaultMessage: 'Revoke Reviewer',
          })}
        >
          <Button
            disabled={record.state_code !== 0}
            type='text'
            size='small'
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleRemoveReviewer(record.reviewer_id)}
          />
        </Tooltip>,
      ],
    },
  ];

  return (
    <>
      <Tooltip
        title={
          <FormattedMessage
            id='pages.review.progress.editReviewer'
            defaultMessage='Edit Reviewer'
          />
        }
      >
        <Button
          shape='circle'
          size='small'
          icon={<FileSyncOutlined />}
          onClick={() => setDrawerVisible(true)}
        />
      </Tooltip>
      <Drawer
        destroyOnClose={true}
        title={
          <FormattedMessage
            id='pages.review.progress.drawer.title'
            defaultMessage='Review Progress'
          />
        }
        width='80%'
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
        styles={{ body: { paddingTop: 0 } }}
      >
        <ProTable<ReviewerData>
          loading={tableLoading}
          columns={columns}
          rowKey='reviewer_id'
          search={false}
          pagination={false}
          toolBarRender={() => [
            <SelectReviewer
              key={0}
              tabType='assigned'
              reviewIds={[reviewId]}
              actionRef={tableRef}
            />,
          ]}
          request={async () => {
            try {
              return await fetchTableData();
            } catch (error) {
              console.error(error);
              return {
                data: [],
                success: true,
                total: 0,
              };
            }
          }}
          actionRef={tableRef}
        />
      </Drawer>
    </>
  );
}
