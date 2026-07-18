import type { Key } from 'react';

import { CONTENT_LANGUAGE_OPTIONS } from './contentLanguageRegistry';

export type ListPagination = {
  total: number;
  pageSize: number;
  current: number;
};

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
