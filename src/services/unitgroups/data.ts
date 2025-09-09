import { UnitGroup } from '@tiangong-lca/tidas-sdk';
export type UnitGroupTable = {
  id: string;
  lang: string;
  name: string;
  classification: string;
  refUnitId: string;
  refUnitName: string;
  refUnitGeneralComment: string;
  version: string;
  modifiedAt: Date;
  teamId: string;
};

export type UnitTable = {
  id: string;
  dataSetInternalID: string;
  name: string;
  meanValue: string;
  generalComment: any;
  quantitativeReference: boolean;
};

export type UnitGroupDataSetObjectKeys = Exclude<
  {
    [K in keyof UnitGroup['unitGroupDataSet']]: UnitGroup['unitGroupDataSet'][K] extends
      | object
      | undefined
      ? K
      : never;
  }[keyof UnitGroup['unitGroupDataSet']],
  undefined
>;

export type FormUnitGroup = Pick<UnitGroup['unitGroupDataSet'], UnitGroupDataSetObjectKeys>;
