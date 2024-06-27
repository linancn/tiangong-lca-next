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
  exchangeDirection: string;
  referenceToFlowDataSet: string;
  meanAmount: string;
  resultingAmount: string;
  dataDerivationTypeStatus: string;
  generalComment: string;
};
