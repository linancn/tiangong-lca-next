import type { ReferenceItem, VersionedDataRow } from '@/services/general/data';
import type { Source } from '@tiangong-lca/tidas-sdk/types';
export type SourceTable = VersionedDataRow & {
  key: React.Key;
  lang: string;
  shortName: string;
  classification: string;
  sourceCitation: string;
  publicationType: string;
};

export type SourceImportItem = {
  sourceDataSet: Source['sourceDataSet'];
};

export type SourceImportData = SourceImportItem[];

export type SourceDetailData = {
  id?: string;
  version?: string;
  json?: { sourceDataSet?: Source['sourceDataSet'] };
  modifiedAt?: string | Date;
  stateCode?: number;
  ruleVerification?: boolean;
  userId?: string;
};

export type SourceDetailResponse = {
  data?: SourceDetailData | null;
  success?: boolean;
};

export type SourceReference = ReferenceItem | ReferenceItem[];

export type SourceDataSetObjectKeys = Exclude<
  {
    [K in keyof Source['sourceDataSet']]: Source['sourceDataSet'][K] extends object | undefined
      ? K
      : never;
  }[keyof Source['sourceDataSet']],
  undefined | 'common:other'
>;

export type FormSource = Pick<Source['sourceDataSet'], SourceDataSetObjectKeys>;
