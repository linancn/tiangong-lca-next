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
  dataSetInternalID: string;
  referenceToFlowDataSet: string;
  exchangeDirection: string;
  meanAmount: string;
  resultingAmount: string;
  dataDerivationTypeStatus: string;
  generalComment: string;
};
