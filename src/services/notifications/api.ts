import { resolveFunctionInvokeError } from '@/services/general/api';
import { supabase } from '@/services/supabase';
import { FunctionRegion } from '@supabase/supabase-js';
import type {
  NotificationListItem,
  NotificationRef,
  NotificationTableRow,
  ValidationIssueNotificationIssue,
} from './data';

type NotificationQueryRow = NotificationTableRow & {
  total_count?: number | string | null;
};

type NotificationCommandEnvelope = {
  code?: string;
  details?: unknown;
  message?: string;
  ok?: boolean;
  status?: number;
};

const normalizeString = (value?: string | null) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

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

const getNotificationLastViewAt = (lastViewTime?: number) =>
  lastViewTime && lastViewTime > 0 ? new Date(lastViewTime).toISOString() : null;

const toNotificationCommandError = async (error: { message?: string; context?: Response }) => {
  const resolved = await resolveFunctionInvokeError(error);
  return Object.assign(new Error(resolved.message), {
    code: resolved.code,
    details: resolved.details,
    status: resolved.status,
  });
};

const mapNotificationRow = (row: NotificationQueryRow): NotificationListItem => {
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

export async function upsertValidationIssueNotification({
  recipientUserId,
  ref,
  sourceRef,
  link,
  issues,
}: {
  recipientUserId?: string;
  ref: NotificationRef;
  sourceRef?: NotificationRef;
  link?: string;
  issues: ValidationIssueNotificationIssue[];
}) {
  const session = await supabase.auth.getSession();
  const senderUserId = normalizeString(session.data.session?.user?.id);
  const normalizedRecipientUserId = normalizeString(recipientUserId);
  const sourceDatasetType = normalizeString(sourceRef?.['@type']);
  const sourceDatasetId = normalizeString(sourceRef?.['@refObjectId']);
  const sourceDatasetVersion = normalizeString(sourceRef?.['@version']);
  const datasetType = normalizeString(ref?.['@type']);
  const datasetId = normalizeString(ref?.['@refObjectId']);
  const datasetVersion = normalizeString(ref?.['@version']);

  if (
    !senderUserId ||
    !normalizedRecipientUserId ||
    senderUserId === normalizedRecipientUserId ||
    !sourceDatasetType ||
    !sourceDatasetId ||
    !sourceDatasetVersion ||
    !datasetType ||
    !datasetId ||
    !datasetVersion
  ) {
    return {
      success: false,
      error: new Error('Invalid validation issue notification payload'),
    };
  }

  const { data, error } = await supabase.functions.invoke<NotificationCommandEnvelope>(
    'app_notification_send_validation_issue',
    {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: {
        recipientUserId: normalizedRecipientUserId,
        sourceDatasetType,
        sourceDatasetId,
        sourceDatasetVersion,
        datasetType,
        datasetId,
        datasetVersion,
        issueCodes: getNotificationIssueCodes(issues),
        issueCount: issues.length,
        link: normalizeString(link),
        tabNames: getNotificationTabNames(issues),
      },
      region: FunctionRegion.UsEast1,
    },
  );

  if (error) {
    return {
      success: false,
      error: await toNotificationCommandError(error),
    };
  }

  if (data?.ok === false) {
    return {
      success: false,
      error: Object.assign(new Error(data.message || 'Request failed'), {
        code: data.code,
        details: data.details,
        status: data.status,
      }),
    };
  }

  return {
    success: true,
    error: null,
  };
}

export async function getNotifications(
  params: { pageSize: number; current: number },
  timeFilter: number = 3,
) {
  const session = await supabase.auth.getSession();

  if (!session.data.session) {
    return Promise.resolve({
      data: [],
      success: false,
      total: 0,
    });
  }

  const { data, error } = await supabase.rpc('qry_notification_get_my_issue_items', {
    p_page: params.current ?? 1,
    p_page_size: params.pageSize ?? 10,
    p_days: timeFilter,
  });

  if (error || !Array.isArray(data)) {
    return Promise.resolve({
      data: [],
      success: false,
      total: 0,
    });
  }

  if (data.length === 0) {
    return Promise.resolve({
      data: [],
      success: true,
      total: 0,
    });
  }

  const rows = data as NotificationQueryRow[];
  return Promise.resolve({
    data: rows.map((row) => mapNotificationRow(row)),
    page: params?.current ?? 1,
    success: true,
    total: Number(rows[0]?.total_count ?? 0) || 0,
  });
}

export async function getNotificationsCount(timeFilter: number = 3, lastViewTime?: number) {
  const session = await supabase.auth.getSession();

  if (!session.data.session) {
    return Promise.resolve({
      success: false,
      total: 0,
    });
  }

  const { data, error } = await supabase.rpc('qry_notification_get_my_issue_count', {
    p_days: timeFilter,
    p_last_view_at: getNotificationLastViewAt(lastViewTime),
  });

  return Promise.resolve({
    success: !error,
    total: Number(data ?? 0) || 0,
  });
}
