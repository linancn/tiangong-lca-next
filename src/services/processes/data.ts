export type ProcessTable = {
  id: string;
  lang: string;
  baseName: string;
  treatmentStandardsRoutes: string;
  mixAndLocationTypes: string;
  functionalUnitFlowProperties: string;
  generalComment: string;
  classification: string;
  referenceYear: string;
  location: string;
  modifiedAt: Date;
};

export type ProcessExchangeTable = {
  key: string;
  dataSetInternalID: string;
  exchangeDirection: string;
  referenceToFlowDataSetId: string;
  referenceToFlowDataSet: string;
  meanAmount: string;
  resultingAmount: string;
  dataDerivationTypeStatus: string;
  generalComment: string;
  quantitativeReference: boolean;
  functionalUnitOrOther: any;
};
