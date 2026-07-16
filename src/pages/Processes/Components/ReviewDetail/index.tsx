import { ProcessReviewLog, ProcessReviewRecord } from '@/services/processes/data';
import { getReviewsByProcess } from '@/services/reviews/api';
import { formatLocaleDateTime } from '@/utils/localeFormatting';
import { CloseOutlined, HistoryOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Button, Drawer, Grid, Tooltip, Typography } from 'antd';
import React, { useRef, useState } from 'react';

interface ReviewDetailProps {
  processId: string;
  processVersion: string;
}

interface LogItem {
  key: string;
  operator: string;
  timestamp: number | null;
  time: string;
  action: string;
}

const REVIEW_ACTION_MESSAGES = {
  approved: { defaultMessage: 'Approve Review', id: 'pages.reviewDetail.approved' },
  assign_reviewers: {
    defaultMessage: 'Assign Reviewers',
    id: 'pages.reviewDetail.assign_reviewers',
  },
  assign_reviewers_temporary: {
    defaultMessage: 'Assign Reviewers Temporarily',
    id: 'pages.reviewDetail.assign_reviewers_temporary',
  },
  rejected: { defaultMessage: 'Reject Review', id: 'pages.reviewDetail.rejected' },
  reviewer_rejected: {
    defaultMessage: 'Reviewer Rejected',
    id: 'pages.reviewDetail.reviewer_rejected',
  },
  revoke_reviewer: {
    defaultMessage: 'Reviewer assignment revoked',
    id: 'pages.reviewDetail.revoke_reviewer',
  },
  submit_comments: {
    defaultMessage: 'Submit Comments',
    id: 'pages.reviewDetail.submit_comments',
  },
  submit_comments_temporary: {
    defaultMessage: 'Submit Comments Temporarily',
    id: 'pages.reviewDetail.submit_comments_temporary',
  },
  submit_review: { defaultMessage: 'Submit Review', id: 'pages.reviewDetail.submit_review' },
} as const;

type IntlShapeLike = Pick<ReturnType<typeof useIntl>, 'formatMessage' | 'locale'>;

export const formatReviewDetailAction = (intl: IntlShapeLike, action: string): string => {
  if (Object.prototype.hasOwnProperty.call(REVIEW_ACTION_MESSAGES, action)) {
    return intl.formatMessage(
      REVIEW_ACTION_MESSAGES[action as keyof typeof REVIEW_ACTION_MESSAGES],
    );
  }

  return intl.formatMessage(
    {
      defaultMessage: 'Unknown review action ({action})',
      id: 'pages.reviewDetail.unknownAction',
    },
    { action: action.trim() || '-' },
  );
};

const ReviewDetail: React.FC<ReviewDetailProps> = ({ processId, processVersion }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const actionRef = useRef<ActionType>();
  const intl = useIntl();
  const screens = Grid.useBreakpoint();
  const useCompactLogCards = screens.sm === false;

  const fetchLogData = async () => {
    setLoading(true);
    try {
      const { error, data } = (await getReviewsByProcess(processId, processVersion)) as {
        error: unknown;
        data: ProcessReviewRecord[] | null;
      };

      if (error) {
        console.error('获取日志数据失败:', error);
        return {
          data: [],
          success: false,
          total: 0,
        };
      }

      const logItems: LogItem[] = [];
      data?.forEach((review) => {
        const logs: ProcessReviewLog[] = review.json?.logs ?? [];
        logs.forEach((log, index: number) => {
          const timestamp = log.time ? Date.parse(log.time) : Number.NaN;
          logItems.push({
            key: `${review.id}-${index}`,
            operator: log.user?.display_name || log.user?.name || '-',
            timestamp: Number.isFinite(timestamp) ? timestamp : null,
            time: log.time ? formatLocaleDateTime(log.time, intl.locale) : '-',
            action: log.action || '-',
          });
        });
      });

      logItems.sort(
        (a, b) =>
          (b.timestamp ?? Number.NEGATIVE_INFINITY) - (a.timestamp ?? Number.NEGATIVE_INFINITY),
      );

      return {
        data: logItems,
        success: true,
      };
    } catch (error) {
      console.error('获取日志数据异常:', error);
      return {
        data: [],
        success: false,
        total: 0,
      };
    } finally {
      setLoading(false);
    }
  };

  const operatorTitle = intl.formatMessage({
    id: 'pages.reviewDetail.operator',
    defaultMessage: 'Operator',
  });
  const timeTitle = intl.formatMessage({
    id: 'pages.reviewDetail.time',
    defaultMessage: 'Time',
  });
  const actionTitle = intl.formatMessage({
    id: 'pages.reviewDetail.action',
    defaultMessage: 'Action Details',
  });

  const desktopColumns: ProColumns<LogItem>[] = [
    {
      title: operatorTitle,
      dataIndex: 'operator',
      key: 'operator',
      search: false,
      sorter: false,
      width: 150,
    },
    {
      title: timeTitle,
      dataIndex: 'time',
      key: 'time',
      search: false,
      sorter: false,
      width: 180,
      render: (_, record: LogItem) => (
        <Typography.Text style={{ overflowWrap: 'anywhere', whiteSpace: 'normal' }}>
          {record.time}
        </Typography.Text>
      ),
    },
    {
      title: actionTitle,
      dataIndex: 'action',
      key: 'action',
      search: false,
      sorter: false,
      width: 250,
      render: (_, record: LogItem) => (
        <Typography.Text style={{ overflowWrap: 'anywhere', whiteSpace: 'normal' }}>
          {formatReviewDetailAction(intl, record.action)}
        </Typography.Text>
      ),
    },
  ];
  const compactColumns: ProColumns<LogItem>[] = [
    {
      title: actionTitle,
      key: 'review-log-card',
      search: false,
      sorter: false,
      render: (_, record: LogItem) => (
        <dl
          aria-label={actionTitle}
          style={{ display: 'grid', gap: 8, margin: 0, overflowWrap: 'anywhere' }}
        >
          <div>
            <dt style={{ fontWeight: 600 }}>{actionTitle}</dt>
            <dd style={{ margin: 0 }}>{formatReviewDetailAction(intl, record.action)}</dd>
          </div>
          <div>
            <dt style={{ fontWeight: 600 }}>{operatorTitle}</dt>
            <dd style={{ margin: 0 }}>{record.operator}</dd>
          </div>
          <div>
            <dt style={{ fontWeight: 600 }}>{timeTitle}</dt>
            <dd style={{ margin: 0 }}>{record.time}</dd>
          </div>
        </dl>
      ),
    },
  ];
  const columns = useCompactLogCards ? compactColumns : desktopColumns;

  const handleIconClick = () => {
    setDrawerVisible(true);
  };

  const handleDrawerClose = () => {
    setDrawerVisible(false);
  };

  return (
    <>
      <Tooltip
        title={intl.formatMessage({
          id: 'pages.reviewDetail.tooltip',
          defaultMessage: 'View Review Logs',
        })}
        placement='top'
      >
        <Button shape='circle' icon={<HistoryOutlined />} size='small' onClick={handleIconClick} />
      </Tooltip>

      <Drawer
        title={intl.formatMessage({
          id: 'pages.reviewDetail.title',
          defaultMessage: 'Review Logs',
        })}
        placement='right'
        width='min(600px, 100vw)'
        open={drawerVisible}
        onClose={handleDrawerClose}
        destroyOnHidden
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
      >
        <ProTable<LogItem>
          columns={columns}
          request={fetchLogData}
          actionRef={actionRef}
          rowKey='key'
          search={false}
          pagination={false}
          loading={loading}
          options={false}
          toolBarRender={false}
          tableLayout='fixed'
          scroll={useCompactLogCards ? undefined : { x: 580 }}
        />
      </Drawer>
    </>
  );
};

export default ReviewDetail;
