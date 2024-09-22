export type FlowTable = {
  id: string;
  baseName: string;
  synonyms: string;
  classification: string;
  flowType: string;
  CASNumber: string;
  refFlowPropertyId: string;
  modifiedAt: Date;
};

export type FlowModelTable = {
  id: string;
  name: string;
  description: string;
  modifiedAt: Date;
};

export type FlowpropertyTabTable = {
  id: string;
  dataSetInternalID: string;
  meanValue: string;
  referenceToFlowPropertyDataSetId: string;
  referenceToFlowPropertyDataSet: string;
  quantitativeReference: boolean;
};
