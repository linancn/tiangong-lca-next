import { getNotifyReviews } from '@/services/reviews/api';
import type { ReviewsTable } from '@/services/reviews/data';
import { buildAppAbsoluteUrl } from '@/utils/appUrl';
import { Button, Modal, Space, Table, Tag, Typography, theme } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useEffect, useState } from 'react';
import { useIntl } from 'umi';

interface DataNotificationItem {
  key: string;
  id: string;
  name: string;
  teamName: string;
  userName: string;
  modifiedAt: string;
  isFromLifeCycle: boolean;
  stateCode?: number;
  rejectReason?: string;
  json: any;
}

interface DataNotificationProps {
  timeFilter: number;
  onDataLoaded?: () => Promise<void>;
}

const DataNotification: React.FC<DataNotificationProps> = ({ timeFilter, onDataLoaded }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DataNotificationItem[]>([]);
  const [selectedRejectedRecord, setSelectedRejectedRecord] = useState<DataNotificationItem | null>(
    null,
  );
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const intl = useIntl();
  const { token } = theme.useToken();

  const getNotificationDataPath = (
    record: DataNotificationItem,
    mode: 'view' | 'edit',
    options: { forceProcess?: boolean } = {},
  ) => {
    const dataId = record?.json?.data?.id ?? '';
    const dataVersion = record?.json?.data?.version ?? '';
    const basePath =
      options.forceProcess || !record.isFromLifeCycle ? '/mydata/processes' : '/mydata/models';
    return buildAppAbsoluteUrl(
      `${basePath}?id=${encodeURIComponent(dataId)}&version=${encodeURIComponent(
        dataVersion,
      )}&mode=${mode}`,
    );
  };

  const openNotificationData = (
    record: DataNotificationItem,
    mode: 'view' | 'edit',
    options?: { forceProcess?: boolean },
  ) => {
    window.open(getNotificationDataPath(record, mode, options), '_blank', 'noopener,noreferrer');
  };

  const getRejectReason = (item: ReviewsTable) => {
    const comment = (item.json as any)?.comment;
    if (!comment) return '';
    if (typeof comment === 'string') {
      try {
        return JSON.parse(comment)?.message ?? '';
      } catch {
        return '';
      }
    }
    return comment?.message ?? '';
  };

  const fetchDataNotifications = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const reviewsRes = await getNotifyReviews(
        { pageSize, current: page },
        intl.locale,
        timeFilter,
      );
      if (!reviewsRes.success) {
        return;
      }
      const rejectedData =
        reviewsRes.data?.map((item: ReviewsTable) => ({
          key: item.id,
          id: item.id,
          name: item.name,
          teamName: item.teamName,
          userName: item.userName,
          modifiedAt: item.modifiedAt ?? '',
          isFromLifeCycle: item.isFromLifeCycle,
          rejectReason: getRejectReason(item),
          stateCode: item.stateCode,
          json: item.json,
        })) || [];

      setData(rejectedData);
      setPagination({
        current: page,
        pageSize,
        total: reviewsRes.total || 0,
      });
      // Call callback after data is loaded (only on initial load, not pagination)
      if (page === 1 && onDataLoaded) {
        await onDataLoaded();
      }
    } catch (error) {
      console.error('获取数据通知失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataNotifications();
  }, [timeFilter]);

  const handleTableChange = (page: number, pageSize: number) => {
    fetchDataNotifications(page, pageSize);
  };

  const getStatusTag = (stateCode?: number) => {
    switch (stateCode) {
      case -1:
        return {
          color: token.red,
          text: intl.formatMessage({
            id: 'pages.review.data.rejected',
            defaultMessage: 'Rejected',
          }),
        };
      case 1:
        return {
          color: token.blue,
          text: intl.formatMessage({
            id: 'pages.review.data.assigned',
            defaultMessage: 'Assigned',
          }),
        };
      case 2:
        return {
          color: token.green,
          text: intl.formatMessage({
            id: 'pages.review.data.approved',
            defaultMessage: 'Approved',
          }),
        };
      default:
        return {
          color: token.colorTextDisabled,
          text: intl.formatMessage({
            id: 'pages.review.data.empty',
            defaultMessage: 'No information',
          }),
        };
    }
  };

  const handleActionClick = (record: DataNotificationItem) => {
    if (record.stateCode === -1) {
      setSelectedRejectedRecord(record);
      return;
    }
    openNotificationData(record, 'view');
  };

  const handleFixRejectedData = () => {
    openNotificationData(selectedRejectedRecord as DataNotificationItem, 'edit', {
      forceProcess: true,
    });
    setSelectedRejectedRecord(null);
  };

  const rejectReason = selectedRejectedRecord?.rejectReason;

  const columns: ColumnsType<DataNotificationItem> = [
    {
      title: intl.formatMessage({ id: 'pages.review.table.name', defaultMessage: 'Name' }),
      dataIndex: 'name',
      key: 'name',
      render: (name: any) => {
        if (typeof name === 'object' && name !== null) {
          return intl.locale === 'zh-CN'
            ? (name.find((item: any) => item['@xml:lang'] === 'zh')?.['#text'] ??
                name[0]?.['#text'])
            : (name.find((item: any) => item['@xml:lang'] === 'en')?.['#text'] ??
                name[0]?.['#text']);
        }
        return name;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.review.table.teamName', defaultMessage: 'Team' }),
      dataIndex: 'teamName',
      key: 'teamName',
    },
    {
      title: intl.formatMessage({ id: 'pages.review.table.status', defaultMessage: 'Status' }),
      dataIndex: 'status',
      key: 'status',
      render: (_stateCode: number, record: DataNotificationItem) => {
        const statusTag = getStatusTag(record.stateCode);
        return <Tag color={statusTag.color}>{statusTag.text}</Tag>;
      },
    },
    {
      title: intl.formatMessage({
        id: 'pages.review.table.modifiedAt',
        defaultMessage: 'Modified At',
      }),
      dataIndex: 'modifiedAt',
      key: 'modifiedAt',
      render: (time: string) => {
        if (!time || time === '-') return '-';
        const date = new Date(time);
        if (Number.isNaN(date.getTime())) return '-';
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hour = date.getHours();
        const minute = date.getMinutes();
        const second = date.getSeconds();
        return `${year}-${month}-${day} ${hour.toString().padStart(2, '0')}:${minute
          .toString()
          .padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
      },
    },
    {
      title: intl.formatMessage({ id: 'pages.review.table.actions', defaultMessage: 'Actions' }),
      key: 'actions',
      render: (record: DataNotificationItem) => (
        <Space>
          <Button
            type='link'
            size='small'
            style={{ color: token.colorPrimary }}
            onClick={() => handleActionClick(record)}
          >
            {intl.formatMessage({ id: 'pages.review.table.view', defaultMessage: 'View' })}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          // showSizeChanger: true,
          // showQuickJumper: true,
          showTotal: (total, range) =>
            intl.formatMessage(
              {
                id: 'pages.pagination.showTotal',
                defaultMessage: 'Items {start}-{end} of {total}',
              },
              { start: range[0], end: range[1], total },
            ),
          onChange: handleTableChange,
        }}
        size='small'
      />
      <Modal
        title={intl.formatMessage({
          id: 'notifications.data.rejectionModal.title',
          defaultMessage: 'Review Comment',
        })}
        open={!!selectedRejectedRecord}
        onCancel={() => setSelectedRejectedRecord(null)}
        onOk={handleFixRejectedData}
        cancelText={intl.formatMessage({
          id: 'notifications.data.rejectionModal.close',
          defaultMessage: 'Close',
        })}
        okText={intl.formatMessage({
          id: 'notifications.data.rejectionModal.fix',
          defaultMessage: 'Fix Data',
        })}
        width={640}
      >
        <Typography.Paragraph
          style={{
            maxHeight: 320,
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            marginBottom: 0,
          }}
        >
          {rejectReason ||
            intl.formatMessage({
              id: 'notifications.data.rejectionModal.empty',
              defaultMessage: 'No review comment available.',
            })}
        </Typography.Paragraph>
      </Modal>
    </>
  );
};

export default DataNotification;
