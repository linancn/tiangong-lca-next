import type { STMultiLang } from '@tiangong-lca/tidas-sdk';

export type ListPagination = {
  total: number;
  pageSize: number;
  current: number;
};

export type DataTabKey = 'tg' | 'co' | 'my' | 'te';

export type ReferenceItem = {
  '@refObjectId'?: string;
  '@type'?: string;
  '@uri'?: string;
  '@version'?: string;
  'common:shortDescription'?: STMultiLang;
};

export type Classification = {
  id: string;
  value: string;
  label: string;
  children: Classification[];
};

export const langOptions = [
  {
    value: 'en',
    label: 'English',
  },
  {
    value: 'zh',
    label: '简体中文',
  },
];

export const initVersion = '01.01.000';
