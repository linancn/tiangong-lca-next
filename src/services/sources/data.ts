import type { ReferenceItem } from '@/services/general/data';
import type { Source } from '@tiangong-lca/tidas-sdk';
export type SourceTable = {
  key: React.Key;
  id: string;
  lang: string;
  shortName: string;
  version: string;
  classification: string;
  sourceCitation: string;
  publicationType: string;
  modifiedAt: Date;
  teamId: string;
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
  undefined
>;

export type FormSource = Pick<Source['sourceDataSet'], SourceDataSetObjectKeys>;
