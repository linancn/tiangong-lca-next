export type ProcessTable = {
  id: string;
  lang: string;
  baseName: string;
  generalComment: string;
  classification: string;
  referenceYear: string;
  location: string;
  createdAt: Date;
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