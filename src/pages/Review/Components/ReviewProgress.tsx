import { getCommentApi } from '@/services/comments/api';
import {
  approveReviewApi,
  revokeReviewerApi,
  type ReviewSubmitDatasetTable,
} from '@/services/reviews/api';
import { isCurrentAssignedReviewerCommentState } from '@/services/reviews/util';
import { getUsersByIds } from '@/services/users/api';
import styles from '@/style/custom.less';
import { CloseOutlined, DeleteOutlined, FileSyncOutlined } from '@ant-design/icons';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Button, Drawer, Modal, Space, Spin, Tag, Tooltip, message, theme } from 'antd';
import { useRef, useState } from 'react';
import RejectReview from './RejectReview';
import SelectReviewer from './SelectReviewer';

type ReviewProgressProps = {
  reviewId: string;
  dataId: string;
  dataVersion: string;
  actionType: 'process' | 'model'; // to identify the type of data being reviewed
  tabType: 'assigned' | 'review' | 'reviewer-rejected' | 'admin-rejected';
  actionRef: any;
};

type ReviewerData = {
  id: string;
  reviewer_id: string;
  reviewer_name: string;
  state_code: number;
  updated_at: string;
  comment?: string;
  json: any;
};

export default function ReviewProgress({
  reviewId,
  dataId,
  dataVersion,
  actionType,
  actionRef,
}: ReviewProgressProps) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const tableRef = useRef<any>(null);
  const intl = useIntl();
  const { token } = theme.useToken();
  const [modal, contextHolder] = Modal.useModal();
  const fetchTableData = async () => {
    setTableLoading(true);
    try {
      const { data: reviewStateResult } = await getCommentApi(reviewId, 'assigned');
      const tableResult: ReviewerData[] = [];
      if (reviewStateResult && reviewStateResult.length) {
        const reviewerIds: string[] = [];
        reviewStateResult.forEach((item: any) => {
          if (isCurrentAssignedReviewerCommentState(item.state_code)) {
            tableResult.push(item);
            reviewerIds.push(item.reviewer_id);
          }
        });
        const userResult = await getUsersByIds(reviewerIds);
        tableResult.forEach((item: any) => {
          const user = userResult?.find((user: any) => user.id === item.reviewer_id);
          item.reviewer_name = user?.display_name;
        });
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
      case -3:
        return {
          text: intl.formatMessage({
            id: 'pages.review.progress.status.rejected',
            defaultMessage: 'Rejected',
          }),
          color: 'red',
        };
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
    modal.confirm({
      okButtonProps: {
        type: 'primary',
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
          const result = await revokeReviewerApi(reviewId, reviewerId);
          if (!result.error && (result.data?.length ?? 0) > 0) {
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
          id='pages.review.progress.table.reviewComment'
          defaultMessage='审核意见'
        />
      ),
      dataIndex: 'comment',
      search: false,
      width: 300,
      render: (_, record) => {
        if (record.state_code !== -3) return null;
        let msg = '';
        const comment = record.json?.comment;
        try {
          if (!comment) {
            msg = '';
          } else if (typeof comment === 'string') {
            const parsed = JSON.parse(comment);
            msg = parsed?.message ?? '';
          } else if (typeof comment === 'object') {
            msg = (comment as any)?.message ?? '';
          }
        } catch (e) {
          msg = '';
        }
        if (!msg) return null;
        return (
          <Tooltip title={msg} placement='topLeft'>
            <div
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 300,
              }}
            >
              {msg}
            </div>
          </Tooltip>
        );
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

  const approveReview = async (table: ReviewSubmitDatasetTable) => {
    setSpinning(true);
    try {
      const result = await approveReviewApi(reviewId, table);

      if (!result.error) {
        message.success(
          intl.formatMessage({
            id: 'pages.review.ReviewProcessDetail.assigned.success',
            defaultMessage: 'Review approved successfully',
          }),
        );
        setDrawerVisible(false);
        actionRef.current?.reload();
        return;
      }

      message.error(result.error.message || 'Failed to approve review');
    } catch (error: any) {
      message.error(error?.message ?? 'Failed to approve review');
    } finally {
      setSpinning(false);
    }
  };

  return (
    <>
      {contextHolder}
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
        destroyOnHidden
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
        footer={
          <Space className={styles.footer_right}>
            <Button
              type='primary'
              onClick={() =>
                approveReview(actionType === 'process' ? 'processes' : 'lifecyclemodels')
              }
            >
              <FormattedMessage
                id='pages.review.ReviewProcessDetail.assigned.save'
                defaultMessage='Approve Review'
              />
            </Button>
            <RejectReview
              buttonType='text'
              isModel={actionType === 'model'}
              dataId={dataId}
              dataVersion={dataVersion}
              reviewId={reviewId}
              key={0}
              actionRef={actionRef}
            />
          </Space>
        }
      >
        <Spin spinning={spinning}>
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
            request={fetchTableData}
            actionRef={tableRef}
          />
        </Spin>
      </Drawer>
    </>
  );
}
