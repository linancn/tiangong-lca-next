import { getReviewsTableData } from '@/services/reviews/api';
import type { ReviewsTable } from '@/services/reviews/data';
import { Button, Space, Table, Tag, Tooltip, theme } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useEffect, useState } from 'react';
import { useIntl } from 'umi';

interface DataNotificationItem {
  key: string;
  id: string;
  name: string;
  teamName: string;
  userName: string;
  createAt: string;
  isFromLifeCycle: boolean;
  status: 'unassigned' | 'assigned' | 'review' | 'rejected';
  rejectReason?: string;
  json: any;
}

const DataNotification: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DataNotificationItem[]>([]);
  const intl = useIntl();
  const { token } = theme.useToken();

  const fetchDataNotifications = async () => {
    setLoading(true);
    try {
      const rejectedRes = await getReviewsTableData(
        { pageSize: 10, current: 1 },
        {},
        'rejected',
        intl.locale,
      );

      const rejectedData =
        rejectedRes.data?.map((item: ReviewsTable) => ({
          key: item.id,
          id: item.id,
          name: item.name,
          teamName: item.teamName,
          userName: item.userName,
          createAt: item.createAt,
          isFromLifeCycle: item.isFromLifeCycle,
          status: 'rejected' as const,
          rejectReason: (item.json as any)?.comment?.message || '',
          json: item.json,
        })) || [];

      setData(rejectedData);
    } catch (error) {
      console.error('获取数据通知失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataNotifications();
  }, []);

  const getStatusTag = (status: string) => {
    const statusMap = {
      empty: {
        color: 'gray',
        text: intl.formatMessage({ id: 'teams.members.role.empty', defaultMessage: 'Empty' }),
      },
      rejected: {
        color: 'red',
        text: intl.formatMessage({ id: 'pages.review.tabs.rejected', defaultMessage: 'Rejected' }),
      },
    };
    const { color, text } = statusMap[status as keyof typeof statusMap] || statusMap.empty;
    return <Tag color={color}>{text}</Tag>;
  };

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
      render: (status: string, record: DataNotificationItem) => {
        const statusTag = getStatusTag(status);
        if (status === 'rejected' && record.rejectReason) {
          return (
            <Tooltip title={record.rejectReason} placement='topLeft'>
              {statusTag}
            </Tooltip>
          );
        }
        return statusTag;
      },
    },
    {
      title: intl.formatMessage({
        id: 'pages.review.table.createTime',
        defaultMessage: 'Create Time',
      }),
      dataIndex: 'createAt',
      key: 'createAt',
      render: (time: string) => new Date(time).toLocaleString(),
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
            onClick={() => {
              window.open(
                `/mydata/processes?id=${record?.json?.data?.id}&version=${record?.json?.data?.version}`,
                '_blank',
              );
            }}
          >
            {intl.formatMessage({ id: 'pages.review.table.view', defaultMessage: 'View' })}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={{
        pageSize: 10,
        showSizeChanger: false,
        showQuickJumper: false,
      }}
      size='small'
    />
  );
};

export default DataNotification;
