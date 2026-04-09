import { getNotifications } from '@/services/notifications/api';
import type { NotificationListItem } from '@/services/notifications/data';
import { normalizeNotificationLink } from '@/services/notifications/link';
import { Button, Space, Table, theme } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useEffect, useState } from 'react';
import { useIntl } from 'umi';

interface IssueNotificationProps {
  timeFilter: number;
  onDataLoaded?: () => Promise<void>;
}

const formatNotificationTime = (time: string) => {
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
};

const getDatasetTypeLabel = (intl: ReturnType<typeof useIntl>, type: string) => {
  switch (type) {
    case 'contact data set':
      return intl.formatMessage({
        id: 'pages.validationIssues.datasetType.contact',
        defaultMessage: 'Contact',
      });
    case 'source data set':
      return intl.formatMessage({
        id: 'pages.validationIssues.datasetType.source',
        defaultMessage: 'Source',
      });
    case 'unit group data set':
      return intl.formatMessage({
        id: 'pages.validationIssues.datasetType.unitgroup',
        defaultMessage: 'Unit group',
      });
    case 'flow property data set':
      return intl.formatMessage({
        id: 'pages.validationIssues.datasetType.flowproperty',
        defaultMessage: 'Flow property',
      });
    case 'flow data set':
      return intl.formatMessage({
        id: 'pages.validationIssues.datasetType.flow',
        defaultMessage: 'Flow',
      });
    case 'process data set':
      return intl.formatMessage({
        id: 'pages.validationIssues.datasetType.process',
        defaultMessage: 'Process',
      });
    case 'lifeCycleModel data set':
      return intl.formatMessage({
        id: 'pages.validationIssues.datasetType.lifecyclemodel',
        defaultMessage: 'Lifecycle model',
      });
    default:
      return type;
  }
};

const getNotificationIssueLabel = (intl: ReturnType<typeof useIntl>, issueCode: string) => {
  switch (issueCode) {
    case 'sdkInvalid':
      return intl.formatMessage({
        id: 'pages.validationIssues.issue.sdkInvalid',
        defaultMessage: 'Current dataset validation failed',
      });
    case 'ruleVerificationFailed':
      return intl.formatMessage({
        id: 'pages.validationIssues.issue.ruleVerificationFailed',
        defaultMessage: 'Dataset validation did not pass',
      });
    case 'nonExistentRef':
      return intl.formatMessage({
        id: 'pages.validationIssues.issue.nonExistentRef',
        defaultMessage: 'Dataset does not exist',
      });
    case 'underReview':
      return intl.formatMessage({
        id: 'pages.validationIssues.issue.underReview',
        defaultMessage: 'Dataset is under review',
      });
    case 'versionUnderReview':
      return intl.formatMessage({
        id: 'notifications.validationIssue.issue.versionUnderReview',
        defaultMessage: 'Another version of this dataset is already under review.',
      });
    case 'versionIsInTg':
      return intl.formatMessage({
        id: 'pages.validationIssues.issue.versionIsInTg',
        defaultMessage: 'Current version is lower than the published version',
      });
    default:
      return intl.formatMessage({
        id: 'notifications.validationIssue.issue.unknown',
        defaultMessage: 'Validation issue',
      });
  }
};

const getNotificationIssueTexts = (
  intl: ReturnType<typeof useIntl>,
  notification: NotificationListItem,
) => {
  const issueCodes = Array.isArray(notification.json?.issueCodes)
    ? notification.json.issueCodes
    : [];

  return issueCodes
    .filter((issueCode): issueCode is string => typeof issueCode === 'string')
    .map((issueCode) => issueCode.trim())
    .filter(
      (issueCode, index, allIssueCodes) =>
        Boolean(issueCode) && allIssueCodes.indexOf(issueCode) === index,
    )
    .map((issueCode) => getNotificationIssueLabel(intl, issueCode));
};

const IssueNotification: React.FC<IssueNotificationProps> = ({ timeFilter, onDataLoaded }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<NotificationListItem[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const intl = useIntl();
  const { token } = theme.useToken();

  const fetchIssueNotifications = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const notificationRes = await getNotifications({ pageSize, current: page }, timeFilter);

      if (!notificationRes.success) {
        return;
      }

      setData(notificationRes.data ?? []);
      setPagination({
        current: page,
        pageSize,
        total: notificationRes.total || 0,
      });

      if (page === 1 && onDataLoaded) {
        await onDataLoaded();
      }
    } catch (error) {
      console.error('获取问题通知失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssueNotifications();
  }, [timeFilter]);

  const handleTableChange = (page: number, pageSize: number) => {
    fetchIssueNotifications(page, pageSize);
  };

  const columns: ColumnsType<NotificationListItem> = [
    {
      title: intl.formatMessage({
        id: 'pages.validationIssues.table.datasetType',
        defaultMessage: 'Dataset type',
      }),
      dataIndex: 'datasetType',
      key: 'datasetType',
      render: (datasetType: string) => getDatasetTypeLabel(intl, datasetType),
    },
    {
      title: intl.formatMessage({
        id: 'pages.validationIssues.table.id',
        defaultMessage: 'ID',
      }),
      dataIndex: 'datasetId',
      key: 'datasetId',
    },
    {
      title: intl.formatMessage({
        id: 'pages.validationIssues.table.version',
        defaultMessage: 'Version',
      }),
      dataIndex: 'datasetVersion',
      key: 'datasetVersion',
    },
    {
      title: intl.formatMessage({
        id: 'notifications.table.requestUser',
        defaultMessage: 'Requester',
      }),
      dataIndex: 'senderName',
      key: 'senderName',
      render: (senderName: string) =>
        senderName === '-'
          ? intl.formatMessage({
              id: 'notifications.validationIssue.unknownSender',
              defaultMessage: 'A user',
            })
          : senderName,
    },
    {
      title: intl.formatMessage({
        id: 'notifications.table.issue',
        defaultMessage: 'Issue',
      }),
      key: 'issue',
      render: (_, record) => {
        const issueTexts = getNotificationIssueTexts(intl, record);

        return issueTexts.length > 0 ? (
          <Space direction='vertical' size={0}>
            {issueTexts.map((issueText, index) => (
              <span key={`${record.id}-${issueText}-${index}`}>{issueText}</span>
            ))}
          </Space>
        ) : (
          '-'
        );
      },
    },
    {
      title: intl.formatMessage({
        id: 'pages.review.table.modifiedAt',
        defaultMessage: 'Modified At',
      }),
      dataIndex: 'modifiedAt',
      key: 'modifiedAt',
      render: (time: string) => formatNotificationTime(time),
    },
    {
      title: intl.formatMessage({ id: 'pages.review.table.actions', defaultMessage: 'Actions' }),
      key: 'actions',
      render: (_, record) => {
        const safeLink = normalizeNotificationLink(record.link);

        return safeLink ? (
          <Space>
            <Button
              type='link'
              size='small'
              style={{ color: token.colorPrimary }}
              onClick={() => {
                window.open(safeLink, '_blank', 'noopener,noreferrer');
              }}
            >
              {intl.formatMessage({ id: 'pages.review.table.view', defaultMessage: 'View' })}
            </Button>
          </Space>
        ) : (
          '-'
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showTotal: (total, range) =>
          intl.formatMessage(
            { id: 'pages.pagination.showTotal', defaultMessage: 'Items {start}-{end} of {total}' },
            { start: range[0], end: range[1], total },
          ),
        onChange: handleTableChange,
      }}
      size='small'
    />
  );
};

export default IssueNotification;
