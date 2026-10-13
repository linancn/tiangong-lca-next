import { dispatchAntdAppAction } from '@/contexts/AntdAppContext';
import { normalizeDatasetUuidSearchQuery } from '@/services/datasetUuidMentionSearch/api';

export type DatasetSearchMode = 'normal' | 'smart' | 'reference';

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
  // The paged RPC now returns the complete filtered count in reference mode too.
  // Preserve the public helper signature while allowing native total rendering.
  void enabled;
  return {};
}

export function getReferenceLookupTeamId(tid?: string | null): string {
  return tid ?? '';
}

export function showInvalidReferenceLookupUuidMessage(intl: IntlLike) {
  const text = intl.formatMessage({
    defaultMessage: 'Enter a complete dataset UUID before running Reference Lookup.',
    id: 'pages.datasetUuidMention.invalidUuid',
  });
  dispatchAntdAppAction(({ message }) => message.warning(text));
}

export function showReferenceLookupLimitMessage(intl: IntlLike) {
  const text = intl.formatMessage({
    defaultMessage: 'Showing up to the first 50 reference lookup results.',
    id: 'pages.datasetUuidMention.maxResults',
  });
  dispatchAntdAppAction(({ message }) => message.info(text));
}
