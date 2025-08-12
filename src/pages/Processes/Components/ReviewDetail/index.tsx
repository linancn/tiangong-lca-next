import { getReviewsByProcess } from '@/services/reviews/api';
import { CloseOutlined, HistoryOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Button, Drawer, Tooltip } from 'antd';
import React, { useRef, useState } from 'react';

interface ReviewDetailProps {
  processId: string;
  processVersion: string;
}

interface LogItem {
  key: string;
  operator: string;
  time: string;
  action: string;
}

const ReviewDetail: React.FC<ReviewDetailProps> = ({ processId, processVersion }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const actionRef = useRef<ActionType>();
  const intl = useIntl();

  const fetchLogData = async () => {
    setLoading(true);
    try {
      const { error, data } = await getReviewsByProcess(processId, processVersion);

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
        const logs = review.json?.logs || [];
        logs.forEach((log: any, index: number) => {
          logItems.push({
            key: `${review.id}-${index}`,
            operator: log.user?.display_name || log.user?.name || '-',
            time: new Date(log.time).toLocaleString('zh-CN'),
            action: log.action || '-',
          });
        });
      });

      logItems.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

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

  const columns: ProColumns<LogItem>[] = [
    {
      title: intl.formatMessage({
        id: 'pages.reviewDetail.operator',
        defaultMessage: 'Operator',
      }),
      dataIndex: 'operator',
      key: 'operator',
      search: false,
      sorter: false,
      width: 150,
    },
    {
      title: intl.formatMessage({
        id: 'pages.reviewDetail.time',
        defaultMessage: 'Time',
      }),
      dataIndex: 'time',
      key: 'time',
      search: false,
      sorter: false,
      width: 180,
    },
    {
      title: intl.formatMessage({
        id: 'pages.reviewDetail.action',
        defaultMessage: 'Action Details',
      }),
      dataIndex: 'action',
      key: 'action',
      search: false,
      sorter: false,
      ellipsis: true,
      render: (_, record: LogItem) => {
        return intl.formatMessage({
          id: `pages.reviewDetail.${record.action}`,
          defaultMessage: record.action,
        });
      },
    },
  ];

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
        width={600}
        open={drawerVisible}
        onClose={handleDrawerClose}
        destroyOnClose
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
        />
      </Drawer>
    </>
  );
};

export default ReviewDetail;
