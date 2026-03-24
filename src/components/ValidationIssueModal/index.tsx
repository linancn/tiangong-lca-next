import { ValidationIssue } from '@/pages/Utils/review';
import { CloseOutlined } from '@ant-design/icons';
import { Button, ConfigProvider, Modal, Space, Table, message, theme } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getBrandTheme } from '../../../config/branding';

type IntlShapeLike = {
  formatMessage: (
    descriptor: {
      defaultMessage?: string;
      id: string;
    },
    values?: Record<string, string | number | undefined>,
  ) => string;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getDatasetTabMessageId = (type: string, tabName: string) => {
  switch (type) {
    case 'contact data set':
      return `pages.contact.${tabName}`;
    case 'source data set':
      return `pages.source.view.${tabName}`;
    case 'unit group data set':
      return `pages.unitgroup.${tabName}`;
    case 'flow property data set':
      return `pages.FlowProperties.view.${tabName}`;
    case 'flow data set':
      return `pages.flow.view.${tabName}`;
    case 'process data set':
      return `pages.process.view.${tabName}`;
    case 'lifeCycleModel data set':
      return `pages.lifeCycleModel.view.${tabName}`;
    default:
      return '';
  }
};

const getValidationIssueTabLabels = (intl: IntlShapeLike, issue: ValidationIssue) => {
  const tabNames = (issue.tabNames ?? []).filter(
    (tabName, index, allTabNames) => tabName && allTabNames.indexOf(tabName) === index,
  );

  return tabNames
    .map((tabName) => {
      const messageId = getDatasetTabMessageId(issue.ref['@type'], tabName);

      return intl.formatMessage({
        id: messageId || tabName,
        defaultMessage: tabName,
      });
    })
    .join('，');
};

const getIssueDescription = (intl: IntlShapeLike, issue: ValidationIssue) => {
  switch (issue.code) {
    case 'sdkInvalid': {
      const description = intl.formatMessage({
        id: 'pages.validationIssues.issue.sdkInvalid',
        defaultMessage: 'Current dataset validation failed',
      });
      const tabLabels = getValidationIssueTabLabels(intl, issue);

      return tabLabels ? `${description}(${tabLabels})` : description;
    }
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
      return intl.formatMessage(
        {
          id: 'pages.validationIssues.issue.versionUnderReview',
          defaultMessage:
            'Another version {underReviewVersion} of this dataset is already under review',
        },
        {
          underReviewVersion: issue.underReviewVersion ?? '-',
        },
      );
    case 'versionIsInTg':
      return intl.formatMessage({
        id: 'pages.validationIssues.issue.versionIsInTg',
        defaultMessage: 'Current version is lower than the published version',
      });
    default:
      return issue.code;
  }
};

type GroupedValidationIssue = {
  ref: ValidationIssue['ref'];
  link: string;
  issues: ValidationIssue[];
  ownerName: string;
  ownerUserId?: string;
  isOwnedByCurrentUser?: boolean;
  order: number;
};

const getValidationIssueGroupKey = (issue: Pick<ValidationIssue, 'ref'>) =>
  `${issue.ref['@type']}:${issue.ref['@refObjectId']}:${issue.ref['@version']}`;

const VALIDATION_ISSUE_DATASET_TYPE_ORDER = [
  'contact data set',
  'source data set',
  'unit group data set',
  'flow property data set',
  'flow data set',
  'process data set',
  'lifeCycleModel data set',
] as const;

const VALIDATION_ISSUE_DATASET_TYPE_ORDER_MAP = VALIDATION_ISSUE_DATASET_TYPE_ORDER.reduce<
  Record<string, number>
>((accumulator, type, index) => {
  accumulator[type] = index;
  return accumulator;
}, {});

const getValidationIssueDatasetTypeOrder = (type: string) =>
  VALIDATION_ISSUE_DATASET_TYPE_ORDER_MAP[type] ?? VALIDATION_ISSUE_DATASET_TYPE_ORDER.length;

const sortGroupedValidationIssues = (groupedIssues: GroupedValidationIssue[]) =>
  [...groupedIssues].sort((leftIssue, rightIssue) => {
    const typeOrderDiff =
      getValidationIssueDatasetTypeOrder(leftIssue.ref['@type']) -
      getValidationIssueDatasetTypeOrder(rightIssue.ref['@type']);

    if (typeOrderDiff !== 0) {
      return typeOrderDiff;
    }

    return leftIssue.order - rightIssue.order;
  });

const groupValidationIssues = (issues: ValidationIssue[]): GroupedValidationIssue[] => {
  const groupedIssues = new Map<string, GroupedValidationIssue>();

  issues.forEach((issue) => {
    const key = getValidationIssueGroupKey(issue);
    const existingGroup = groupedIssues.get(key);

    if (!existingGroup) {
      const ownerUserId = issue.ownerUserId?.trim();

      groupedIssues.set(key, {
        ref: issue.ref,
        link: issue.link,
        issues: [issue],
        ownerName: issue.ownerName?.trim() || '-',
        ownerUserId: ownerUserId || undefined,
        isOwnedByCurrentUser: issue.isOwnedByCurrentUser,
        order: groupedIssues.size,
      });
      return;
    }

    const duplicatedIssue = existingGroup.issues.some(
      (existingIssue) =>
        existingIssue.code === issue.code &&
        existingIssue.underReviewVersion === issue.underReviewVersion,
    );

    if (!duplicatedIssue) {
      existingGroup.issues.push(issue);
    }

    if (!existingGroup.link && issue.link) {
      existingGroup.link = issue.link;
    }

    if (existingGroup.ownerName === '-' && issue.ownerName?.trim()) {
      existingGroup.ownerName = issue.ownerName.trim();
    }

    if (!existingGroup.ownerUserId && issue.ownerUserId?.trim()) {
      existingGroup.ownerUserId = issue.ownerUserId.trim();
    }

    if (issue.isOwnedByCurrentUser === false) {
      existingGroup.isOwnedByCurrentUser = false;
    } else if (
      existingGroup.isOwnedByCurrentUser === undefined &&
      typeof issue.isOwnedByCurrentUser === 'boolean'
    ) {
      existingGroup.isOwnedByCurrentUser = issue.isOwnedByCurrentUser;
    }
  });

  return sortGroupedValidationIssues(Array.from(groupedIssues.values()));
};

const getGroupedIssueDescriptions = (
  intl: IntlShapeLike,
  groupedIssue: GroupedValidationIssue,
): string[] => {
  const descriptions = groupedIssue.issues.map((issue) => getIssueDescription(intl, issue));

  return descriptions.filter((description, index) => descriptions.indexOf(description) === index);
};

const isValidationIssueLinkDisabled = (groupedIssue: GroupedValidationIssue) =>
  groupedIssue.issues.some((issue) => issue.code === 'nonExistentRef');

const getValidationIssueActionLabel = (
  intl: IntlShapeLike,
  groupedIssue: GroupedValidationIssue,
  options?: {
    notified?: boolean;
  },
) => {
  const shouldNotifyDataOwner = groupedIssue.isOwnedByCurrentUser === false;

  if (shouldNotifyDataOwner && options?.notified) {
    return intl.formatMessage({
      id: 'pages.validationIssues.dataOwnerNotified',
      defaultMessage: 'Notified',
    });
  }

  return intl.formatMessage({
    id: shouldNotifyDataOwner
      ? 'pages.validationIssues.notifyDataOwner'
      : 'pages.validationIssues.fixIssue',
    defaultMessage: shouldNotifyDataOwner ? 'Notify data owner' : 'Fix issue',
  });
};

const getDatasetTypeLabel = (intl: IntlShapeLike, type: string) => {
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

function getValidationIssueBrandTheme() {
  return getBrandTheme(
    typeof window !== 'undefined' && localStorage.getItem('isDarkMode') === 'true',
  );
}

const buildValidationIssueHtml = (
  intl: IntlShapeLike,
  issues: ValidationIssue[],
  title: string,
) => {
  const brandTheme = getValidationIssueBrandTheme();
  const tableRows = groupValidationIssues(issues)
    .map((groupedIssue) => {
      const typeLabel = getDatasetTypeLabel(intl, groupedIssue.ref['@type']);
      const descriptions = getGroupedIssueDescriptions(intl, groupedIssue);
      const description = descriptions.map((item) => escapeHtml(item)).join('<br />');
      const shouldNotifyDataOwner = groupedIssue.isOwnedByCurrentUser === false;
      const actionLabel = getValidationIssueActionLabel(intl, groupedIssue);
      const action = shouldNotifyDataOwner
        ? '-'
        : groupedIssue.link
          ? isValidationIssueLinkDisabled(groupedIssue)
            ? `<span class="action-link-disabled">${escapeHtml(actionLabel)}</span>`
            : `<a class="action-link" href="${escapeHtml(
                groupedIssue.link,
              )}" target="_blank" rel="noreferrer">${escapeHtml(actionLabel)}</a>`
          : '-';

      return `<tr>
  <td>${escapeHtml(typeLabel)}</td>
  <td>${escapeHtml(groupedIssue.ref['@refObjectId'])}</td>
  <td>${escapeHtml(groupedIssue.ref['@version'])}</td>
  <td>${description}</td>
  <td>${escapeHtml(groupedIssue.ownerName)}</td>
  <td>${action}</td>
</tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #1f1f1f; }
      h1 { font-size: 20px; margin-bottom: 8px; }
      p { color: #595959; margin-bottom: 16px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #d9d9d9; padding: 8px 10px; text-align: left; vertical-align: top; }
      th { background: #fafafa; }
      .action-link { color: ${escapeHtml(brandTheme.colorPrimary)}; font-weight: 600; text-decoration: none; }
      .action-link-disabled { color: #bfbfbf; cursor: not-allowed; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(
      intl.formatMessage({
        id: 'pages.validationIssues.report.generated',
        defaultMessage: 'Generated from TianGong LCA data validation.',
      }),
    )}</p>
    <table>
      <thead>
        <tr>
          <th>${escapeHtml(
            intl.formatMessage({
              id: 'pages.validationIssues.table.datasetType',
              defaultMessage: 'Dataset type',
            }),
          )}</th>
          <th>${escapeHtml(
            intl.formatMessage({
              id: 'pages.validationIssues.table.id',
              defaultMessage: 'ID',
            }),
          )}</th>
          <th>${escapeHtml(
            intl.formatMessage({
              id: 'pages.validationIssues.table.version',
              defaultMessage: 'Version',
            }),
          )}</th>
          <th>${escapeHtml(
            intl.formatMessage({
              id: 'pages.validationIssues.table.issue',
              defaultMessage: 'Issue',
            }),
          )}</th>
          <th>${escapeHtml(
            intl.formatMessage({
              id: 'pages.validationIssues.table.user',
              defaultMessage: 'Data owner',
            }),
          )}</th>
          <th>${escapeHtml(
            intl.formatMessage({
              id: 'pages.validationIssues.table.action',
              defaultMessage: 'Action',
            }),
          )}</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </body>
</html>`;
};

const downloadValidationIssueHtml = (
  intl: IntlShapeLike,
  issues: ValidationIssue[],
  title: string,
) => {
  const report = buildValidationIssueHtml(intl, issues, title);
  const blob = new Blob([report], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const isJsdomEnvironment = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);

  link.href = url;
  link.download = `validation-issues-${timestamp}.html`;
  document.body.appendChild(link);
  if (!isJsdomEnvironment) {
    link.click();
  }
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const openValidationIssueLink = (link: string) => {
  window.open(link, '_blank', 'noopener,noreferrer');
};

const ValidationIssueModalTitle = ({ title }: { title: string }) => {
  const { token } = theme.useToken();

  return (
    <span
      style={{
        color: token.colorTextHeading,
        fontSize: token.fontSizeHeading4,
        fontWeight: token.fontWeightStrong,
        lineHeight: 1.4,
      }}
    >
      {title}
    </span>
  );
};

const ValidationIssueCloseIcon = () => {
  const { token } = theme.useToken();

  return (
    <CloseOutlined
      style={{
        color: token.colorTextSecondary,
        fontSize: token.fontSizeLG,
      }}
    />
  );
};

const ValidationIssueFooter = ({
  intl,
  issues,
  onConfirm,
  title,
}: {
  intl: IntlShapeLike;
  issues: ValidationIssue[];
  onConfirm: () => void;
  title: string;
}) => {
  const { token } = theme.useToken();

  return (
    <Space size={token.marginSM}>
      <Button onClick={() => downloadValidationIssueHtml(intl, issues, title)}>
        {intl.formatMessage({
          id: 'pages.validationIssues.downloadHtml',
          defaultMessage: 'Download HTML',
        })}
      </Button>
      <Button type='primary' onClick={onConfirm}>
        {intl.formatMessage({
          id: 'pages.validationIssues.confirm',
          defaultMessage: 'Got it',
        })}
      </Button>
    </Space>
  );
};

type ValidationIssueModalContentProps = {
  intl: IntlShapeLike;
  issues: ValidationIssue[];
};

const ValidationIssueModalContent = ({ intl, issues }: ValidationIssueModalContentProps) => {
  const { token } = theme.useToken();
  const groupedIssues = useMemo(() => groupValidationIssues(issues), [issues]);
  const [loadingIssueKey, setLoadingIssueKey] = useState<string | null>(null);
  const [notifiedIssueKeys, setNotifiedIssueKeys] = useState<Record<string, boolean>>({});

  const handleNotifyDataOwner = async (groupedIssue: GroupedValidationIssue) => {
    const issueKey = getValidationIssueGroupKey(groupedIssue);

    if (!groupedIssue.ownerUserId) {
      message.error(
        intl.formatMessage({
          id: 'pages.validationIssues.notifyDataOwner.ownerMissing',
          defaultMessage: 'Unable to identify the data owner.',
        }),
      );
      return;
    }

    setLoadingIssueKey(issueKey);
    try {
      const { upsertValidationIssueNotification } =
        require('@/services/notifications/api') as typeof import('@/services/notifications/api');
      const result = await upsertValidationIssueNotification({
        recipientUserId: groupedIssue.ownerUserId,
        ref: groupedIssue.ref,
        link: groupedIssue.link,
        issues: groupedIssue.issues.map((issue) => ({
          code: issue.code,
          tabName: issue.tabName,
          tabNames: issue.tabNames,
          underReviewVersion: issue.underReviewVersion,
        })),
      });

      if (!result.success) {
        throw result.error ?? new Error('notify_data_owner_failed');
      }

      setNotifiedIssueKeys((prev) => ({
        ...prev,
        [issueKey]: true,
      }));
      message.success(
        intl.formatMessage({
          id: 'pages.validationIssues.notifyDataOwner.success',
          defaultMessage: 'Notification sent to the data owner.',
        }),
      );
    } catch (error) {
      message.error(
        intl.formatMessage({
          id: 'pages.validationIssues.notifyDataOwner.error',
          defaultMessage: 'Failed to notify the data owner.',
        }),
      );
    } finally {
      setLoadingIssueKey(null);
    }
  };

  const columns: ColumnsType<GroupedValidationIssue> = [
    {
      title: intl.formatMessage({
        id: 'pages.validationIssues.table.datasetType',
        defaultMessage: 'Dataset type',
      }),
      dataIndex: 'ref',
      key: 'datasetType',
      width: 148,
      render: (_, groupedIssue) => getDatasetTypeLabel(intl, groupedIssue.ref['@type']),
    },
    {
      title: intl.formatMessage({
        id: 'pages.validationIssues.table.id',
        defaultMessage: 'ID',
      }),
      key: 'id',
      render: (_, groupedIssue) => groupedIssue.ref['@refObjectId'],
    },
    {
      title: intl.formatMessage({
        id: 'pages.validationIssues.table.version',
        defaultMessage: 'Version',
      }),
      key: 'version',
      width: 128,
      render: (_, groupedIssue) => groupedIssue.ref['@version'],
    },
    {
      title: intl.formatMessage({
        id: 'pages.validationIssues.table.issue',
        defaultMessage: 'Issue',
      }),
      key: 'issue',
      render: (_, groupedIssue) => {
        const descriptions = getGroupedIssueDescriptions(intl, groupedIssue);

        if (descriptions.length <= 1) {
          return descriptions[0] ?? '-';
        }

        return descriptions.map((description) => (
          <div
            key={description}
            style={{
              color: token.colorText,
              lineHeight: token.lineHeight,
            }}
          >
            {description}
          </div>
        ));
      },
    },
    {
      title: intl.formatMessage({
        id: 'pages.validationIssues.table.user',
        defaultMessage: 'Data owner',
      }),
      key: 'ownerName',
      width: 160,
      render: (_, groupedIssue) => groupedIssue.ownerName,
    },
    {
      title: intl.formatMessage({
        id: 'pages.validationIssues.table.action',
        defaultMessage: 'Action',
      }),
      key: 'action',
      width: 128,
      render: (_, groupedIssue) => {
        const issueKey = getValidationIssueGroupKey(groupedIssue);
        const shouldNotifyDataOwner = groupedIssue.isOwnedByCurrentUser === false;
        const actionLabel = getValidationIssueActionLabel(intl, groupedIssue, {
          notified: notifiedIssueKeys[issueKey],
        });
        const isNotifyActionDisabled = notifiedIssueKeys[issueKey] || loadingIssueKey === issueKey;
        const isOpenActionDisabled = isValidationIssueLinkDisabled(groupedIssue);
        const isDisabled = shouldNotifyDataOwner ? isNotifyActionDisabled : isOpenActionDisabled;

        return groupedIssue.link ? (
          <Button
            type='link'
            disabled={isDisabled}
            loading={loadingIssueKey === issueKey}
            style={{
              color: isDisabled ? token.colorTextDisabled : token.colorPrimary,
              fontWeight: token.fontWeightStrong,
              paddingInline: 0,
            }}
            onClick={() => {
              if (shouldNotifyDataOwner) {
                void handleNotifyDataOwner(groupedIssue);
                return;
              }

              openValidationIssueLink(groupedIssue.link ?? '');
            }}
          >
            {actionLabel}
          </Button>
        ) : (
          '-'
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={groupedIssues}
      pagination={false}
      rowKey={(groupedIssue) => getValidationIssueGroupKey(groupedIssue)}
      scroll={{ y: 360 }}
      sticky
      size='small'
      style={{
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        overflow: 'hidden',
      }}
    />
  );
};

const ValidationIssueModalRenderer = ({
  intl,
  issues,
  onDestroy,
  title,
}: {
  intl: IntlShapeLike;
  issues: ValidationIssue[];
  onDestroy: () => void;
  title: string;
}) => {
  const [open, setOpen] = useState(true);
  const brandTheme = useMemo(() => getValidationIssueBrandTheme(), []);
  const { token } = theme.useToken();
  const modalZIndex = (token as typeof token & { zIndexPopupBase?: number }).zIndexPopupBase
    ? ((token as typeof token & { zIndexPopupBase?: number }).zIndexPopupBase ?? 1000) + 1000
    : 2000;

  useEffect(() => {
    if (!open) {
      const timer = window.setTimeout(() => {
        onDestroy();
      }, 0);

      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [onDestroy, open]);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: brandTheme.colorPrimary,
        },
      }}
    >
      <Modal
        centered
        closable
        closeIcon={<ValidationIssueCloseIcon />}
        destroyOnHidden
        footer={
          <ValidationIssueFooter
            intl={intl}
            issues={issues}
            onConfirm={() => setOpen(false)}
            title={title}
          />
        }
        open={open}
        title={<ValidationIssueModalTitle title={title} />}
        width={1000}
        zIndex={modalZIndex}
        onCancel={() => setOpen(false)}
      >
        <ValidationIssueModalContent intl={intl} issues={issues} />
      </Modal>
    </ConfigProvider>
  );
};

export const showValidationIssueModal = ({
  intl,
  issues,
  title,
}: {
  intl: IntlShapeLike;
  issues: ValidationIssue[];
  title?: string;
}) => {
  if (!issues.length) {
    return null;
  }

  const resolvedTitle =
    title ||
    intl.formatMessage({
      id: 'pages.validationIssues.modal.title',
      defaultMessage: 'Validation issues',
    });

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let destroyed = false;

  const destroy = () => {
    if (destroyed) {
      return;
    }
    destroyed = true;
    root.unmount();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  };

  root.render(
    <ValidationIssueModalRenderer
      intl={intl}
      issues={issues}
      onDestroy={destroy}
      title={resolvedTitle}
    />,
  );

  return { destroy };
};
