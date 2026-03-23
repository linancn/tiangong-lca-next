export type NotificationType = 'validation_issue';

export type NotificationRef = {
  '@type': string;
  '@refObjectId': string;
  '@version': string;
};

export type ValidationIssueNotificationIssue = {
  code: string;
  tabName?: string | null;
  tabNames?: string[];
  underReviewVersion?: string;
};

export type ValidationIssueNotificationLookupItem = {
  key: string;
  recipientUserId?: string;
  ref: NotificationRef;
};

export type NotificationJson = {
  issueCodes?: string[];
  issueCount?: number;
  link?: string;
  senderName?: string;
  tabNames?: string[];
};

export type NotificationTableRow = {
  id: string;
  recipient_user_id: string;
  sender_user_id: string;
  type: NotificationType;
  dataset_type: string;
  dataset_id: string;
  dataset_version: string;
  json?: NotificationJson | null;
  created_at?: string;
  modified_at?: string;
};

export type NotificationListItem = {
  key: string;
  id: string;
  type: NotificationType;
  datasetType: string;
  datasetId: string;
  datasetVersion: string;
  senderName: string;
  modifiedAt: string;
  link?: string;
  json?: NotificationJson | null;
};
