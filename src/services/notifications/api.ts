import { getCurrentUser } from '@/services/auth';
import { supabase } from '@/services/supabase';
import { getUserId } from '@/services/users/api';
import type {
  NotificationListItem,
  NotificationRef,
  NotificationTableRow,
  ValidationIssueNotificationIssue,
} from './data';

const VALIDATION_ISSUE_NOTIFICATION_TYPE = 'validation_issue' as const;

const normalizeString = (value?: string | null) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const getNotificationSenderName = (user?: Auth.CurrentUser | null) =>
  normalizeString(user?.name) ?? normalizeString(user?.email) ?? '-';

const getNotificationIssueCodes = (issues: ValidationIssueNotificationIssue[]) =>
  issues
    .map((issue) => normalizeString(issue.code))
    .filter(
      (code, index, allCodes): code is string => Boolean(code) && allCodes.indexOf(code) === index,
    );

const getNotificationTabNames = (issues: ValidationIssueNotificationIssue[]) =>
  issues
    .flatMap((issue) => [
      ...(Array.isArray(issue.tabNames) ? issue.tabNames : []),
      issue.tabName ?? undefined,
    ])
    .map((tabName) => normalizeString(tabName))
    .filter(
      (tabName, index, allTabNames): tabName is string =>
        Boolean(tabName) && allTabNames.indexOf(tabName) === index,
    );

export async function upsertValidationIssueNotification({
  recipientUserId,
  ref,
  link,
  issues,
}: {
  recipientUserId?: string;
  ref: NotificationRef;
  link?: string;
  issues: ValidationIssueNotificationIssue[];
}) {
  const senderUserId = normalizeString(await getUserId());
  const normalizedRecipientUserId = normalizeString(recipientUserId);
  const datasetType = normalizeString(ref?.['@type']);
  const datasetId = normalizeString(ref?.['@refObjectId']);
  const datasetVersion = normalizeString(ref?.['@version']);

  if (
    !senderUserId ||
    !normalizedRecipientUserId ||
    senderUserId === normalizedRecipientUserId ||
    !datasetType ||
    !datasetId ||
    !datasetVersion
  ) {
    return {
      success: false,
      error: new Error('Invalid validation issue notification payload'),
    };
  }

  const currentUser = await getCurrentUser();
  const { error } = await supabase.from('notifications').upsert(
    {
      recipient_user_id: normalizedRecipientUserId,
      sender_user_id: senderUserId,
      type: VALIDATION_ISSUE_NOTIFICATION_TYPE,
      dataset_type: datasetType,
      dataset_id: datasetId,
      dataset_version: datasetVersion,
      modified_at: new Date().toISOString(),
      json: {
        issueCodes: getNotificationIssueCodes(issues),
        issueCount: issues.length,
        link: normalizeString(link),
        senderName: getNotificationSenderName(currentUser),
        tabNames: getNotificationTabNames(issues),
      },
    },
    {
      onConflict: 'recipient_user_id,sender_user_id,type,dataset_type,dataset_id,dataset_version',
    },
  );

  return {
    success: !error,
    error,
  };
}

const mapNotificationRow = (row: NotificationTableRow): NotificationListItem => {
  const modifiedAt = normalizeString(row.modified_at);
  const normalizedModifiedAt =
    modifiedAt && !Number.isNaN(new Date(modifiedAt).getTime())
      ? new Date(modifiedAt).toISOString()
      : '';

  return {
    key: row.id,
    id: row.id,
    type: row.type,
    datasetType: row.dataset_type,
    datasetId: row.dataset_id,
    datasetVersion: row.dataset_version,
    senderName: normalizeString(row.json?.senderName) ?? '-',
    modifiedAt: normalizedModifiedAt,
    link: normalizeString(row.json?.link),
    json: row.json ?? undefined,
  };
};

export async function getNotifications(
  params: { pageSize: number; current: number },
  timeFilter: number = 3,
) {
  const userId = normalizeString(await getUserId());

  if (!userId) {
    return Promise.resolve({
      data: [],
      success: false,
      total: 0,
    });
  }

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('recipient_user_id', userId)
    .eq('type', VALIDATION_ISSUE_NOTIFICATION_TYPE)
    .order('modified_at', { ascending: false });

  if (timeFilter > 0) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeFilter);
    query = query.gte('modified_at', cutoffDate.toISOString());
  }

  const result = await query.range(
    ((params.current ?? 1) - 1) * (params.pageSize ?? 10),
    (params.current ?? 1) * (params.pageSize ?? 10) - 1,
  );

  if (result?.data) {
    if (result.data.length === 0) {
      return Promise.resolve({
        data: [],
        success: true,
        total: 0,
      });
    }

    return Promise.resolve({
      data: result.data.map((item: NotificationTableRow) => mapNotificationRow(item)),
      page: params?.current ?? 1,
      success: true,
      total: result?.count ?? 0,
    });
  }

  return Promise.resolve({
    data: [],
    success: false,
    total: 0,
  });
}

export async function getNotificationsCount(timeFilter: number = 3, lastViewTime?: number) {
  const userId = normalizeString(await getUserId());

  if (!userId) {
    return Promise.resolve({
      success: false,
      total: 0,
    });
  }

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_user_id', userId)
    .eq('type', VALIDATION_ISSUE_NOTIFICATION_TYPE);

  if (lastViewTime && lastViewTime > 0) {
    query = query.gt('modified_at', new Date(lastViewTime).toISOString());
  } else if (timeFilter > 0) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeFilter);
    query = query.gte('modified_at', cutoffDate.toISOString());
  }

  const { count, error } = await query;

  return Promise.resolve({
    success: !error,
    total: count ?? 0,
  });
}
