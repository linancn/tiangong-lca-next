import { normalizeDatasetUuidSearchQuery } from '@/services/datasetUuidMentionSearch/api';
import { message } from 'antd';

type IntlLike = {
  formatMessage: (descriptor: { defaultMessage?: string; id: string }) => string;
};

type ReferenceLookupPaginationProps = {
  showTotal?: (total: number, range: [number, number]) => null;
};

export function getReferenceLookupUuid(queryText: string): string | null {
  return normalizeDatasetUuidSearchQuery(queryText);
}

export function getReferenceLookupEmptyResult(current = 1) {
  return {
    data: [],
    page: current,
    success: true,
    total: 0,
  };
}

export function getReferenceLookupPaginationProps(
  enabled: boolean,
): ReferenceLookupPaginationProps {
  return enabled
    ? {
        showTotal: () => null,
      }
    : {};
}

export function getReferenceLookupTeamId(tid?: string | null): string {
  return tid ?? '';
}

export function showInvalidReferenceLookupUuidMessage(intl: IntlLike) {
  const text = intl.formatMessage({
    defaultMessage: 'Enter a complete dataset UUID before running Reference Lookup.',
    id: 'pages.datasetUuidMention.invalidUuid',
  });
  (message.warning ?? message.error)?.(text);
}

export function showReferenceLookupLimitMessage(intl: IntlLike) {
  const text = intl.formatMessage({
    defaultMessage: 'Showing up to the first 50 reference lookup results.',
    id: 'pages.datasetUuidMention.maxResults',
  });
  (message.info ?? message.warning ?? message.error)?.(text);
}
