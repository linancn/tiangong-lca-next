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
