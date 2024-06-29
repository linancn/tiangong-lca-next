export type UnitGroupTable = {
  id: string;
  lang: string;
  name: string;
  classification: string;
  referenceToReferenceUnit: string;
  createdAt: Date;
};

export type UnitTable = {
  id: string;
  dataSetInternalID: string;
  name: string;
  meanValue: string;
  selected: boolean;
};
