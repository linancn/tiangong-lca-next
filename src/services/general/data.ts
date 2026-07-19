import type { Key } from 'react';

import {
  CONTENT_LANGUAGE_OPTIONS,
  resolveContentLanguage,
  type SupportedContentLanguage,
} from './contentLanguageRegistry';
import type { SupportedAppLocale } from './localeRegistry';

export type ListPagination = {
  total: number;
  pageSize: number;
  current: number;
};

/**
 * External parameters that participate in ProTable's request lifecycle.
 * Changing the canonical locale forces locale-materialized rows to refetch.
 */
export type LocaleAwareTableParams = {
  locale: SupportedAppLocale;
};

/**
 * ProTable parameters for rows whose labels are materialized from ILCD/TIDAS
 * content. Keep this distinct from the UI locale: future UI locales may share
 * one declared content-language capability.
 */
export type ContentLanguageAwareTableParams = {
  contentLanguage: SupportedContentLanguage;
};

export function getContentLanguageAwareTableParams(
  value?: string | null,
): ContentLanguageAwareTableParams {
  return { contentLanguage: resolveContentLanguage(value) };
}

export type MutableRequestEpochRef = { current: number };
export type MutableLanguageRef = { current: string };

/**
 * Invalidates every independently mounted table as soon as a new language is
 * observed during render. This closes the window before locale-driven effects
 * run and also handles A -> B -> A transitions without relying on language
 * equality alone.
 */
export function syncLocaleMaterializedTableRequestEpochs(
  currentLanguageRef: MutableLanguageRef,
  nextLanguage: string,
  requestEpochRefs: readonly MutableRequestEpochRef[],
): void {
  if (currentLanguageRef.current === nextLanguage) return;

  currentLanguageRef.current = nextLanguage;
  requestEpochRefs.forEach((requestEpochRef) => {
    requestEpochRef.current += 1;
  });
}

export type LocaleMaterializedTableRequestContext = {
  isCurrentRequest: () => boolean;
};

/**
 * ProTable aborts its own request race, but the underlying business promise can
 * still settle and write rows after a locale switch. Convert that late result
 * into an unsuccessful empty response so only the currently mounted language
 * may materialize table rows. Errors continue to propagate unchanged.
 */
export async function guardLocaleMaterializedTableRequest<
  TResult extends { data?: unknown; success?: boolean },
>(
  requestedLanguage: string,
  getCurrentLanguage: () => string,
  requestEpochRef: MutableRequestEpochRef,
  request: (context: LocaleMaterializedTableRequestContext) => Promise<TResult>,
): Promise<TResult> {
  const requestEpoch = ++requestEpochRef.current;
  const isCurrentRequest = () =>
    requestedLanguage === getCurrentLanguage() && requestEpoch === requestEpochRef.current;
  const result = await request({ isCurrentRequest });
  if (isCurrentRequest()) {
    return result;
  }

  return {
    ...result,
    data: [],
    success: false,
  };
}

export type DataTabKey = 'tg' | 'co' | 'my' | 'te';

export type VersionedDataRow = {
  key?: Key;
  id: string;
  version: string;
  modifiedAt: Date;
  stateCode?: number;
  teamId: string;
};

export type LangTextEntry = {
  '@xml:lang'?: string;
  '#text'?: string;
};

export type LangTextValue = LangTextEntry | LangTextEntry[] | null | undefined;

export type ReferenceItem = {
  '@refObjectId'?: string;
  '@type'?: string;
  '@uri'?: string;
  '@version'?: string;
  'common:shortDescription'?: LangTextValue;
};

export type Classification = {
  id: string;
  value: string;
  label: string;
  children: Classification[];
};

/** @deprecated Prefer getAuthoringLanguageOptions for new consumers. */
export const langOptions = CONTENT_LANGUAGE_OPTIONS;

export const initVersion = '01.01.000';
