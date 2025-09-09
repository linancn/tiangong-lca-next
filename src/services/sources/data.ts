import { Source } from '@tiangong-lca/tidas-sdk';
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

export type SourceDataSetObjectKeys = Exclude<
  {
    [K in keyof Source['sourceDataSet']]: Source['sourceDataSet'][K] extends object ? K : never;
  }[keyof Source['sourceDataSet']],
  undefined
>;

export type FormSource = Pick<Source['sourceDataSet'], SourceDataSetObjectKeys>;
