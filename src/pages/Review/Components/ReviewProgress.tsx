import { getCommentApi } from '@/services/comments/api';
import { isCurrentAssignedReviewerCommentState } from '@/services/reviews/util';
import { getUsersByIds } from '@/services/users/api';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Button, Drawer, Tag, Tooltip } from 'antd';
import { useState } from 'react';

type ReviewProgressProps = {
  reviewId: string;
};

type ReviewerData = {
  id: string;
  reviewer_id: string;
  reviewer_name: string;
  state_code: number;
  modified_at?: string;
  comment?: string;
  json: any;
};

export default function ReviewProgress({ reviewId }: ReviewProgressProps) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const intl = useIntl();
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
            id: 'pages.review.result.approved',
            defaultMessage: 'Approved',
          }),
          color: 'green',
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
          defaultMessage='Review Comment'
        />
      ),
      dataIndex: 'comment',
      search: false,
      width: 300,
      render: (_, record) => {
        if (record.state_code !== -3) return null;
        let msg = typeof record.json?.reason === 'string' ? record.json.reason : '';
        const comment = record.json?.comment;
        try {
          if (!msg && typeof comment === 'string') {
            const parsed = JSON.parse(comment);
            msg = parsed?.message ?? '';
          } else if (!msg && typeof comment === 'object') {
            msg = (comment as any)?.message ?? '';
          }
        } catch (e) {
          msg = msg || '';
        }
        if (!msg) return null;
        return (
          <Tooltip
            title={
              <div
                style={{
                  maxHeight: 'min(360px, 50vh)',
                  overflowY: 'auto',
                  overflowWrap: 'anywhere',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg}
              </div>
            }
            placement='topLeft'
            styles={{ root: { maxWidth: 'min(420px, calc(100vw - 32px))' } }}
          >
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
  ];

  return (
    <>
      <Tooltip
        title={
          <FormattedMessage
            id='pages.review.progress.viewDetails'
            defaultMessage='View review progress'
          />
        }
      >
        <Button
          shape='circle'
          size='small'
          type='text'
          aria-label={intl.formatMessage({
            id: 'pages.review.progress.viewDetails',
            defaultMessage: 'View review progress',
          })}
          icon={<ProfileOutlined />}
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
        size='80%'
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
          options={false}
          request={fetchTableData}
        />
      </Drawer>
    </>
  );
}
