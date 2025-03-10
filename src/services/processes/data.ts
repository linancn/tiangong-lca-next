export type ProcessTable = {
  key: string;
  id: string;
  version: string;
  lang: string;
  name: string;
  generalComment: string;
  classification: string;
  referenceYear: string;
  location: string;
  modifiedAt: Date;
  teamId: string;
  isFromLifeCycle?: boolean;
};

export type ProcessExchangeTable = {
  key: string;
  dataSetInternalID: string;
  exchangeDirection: string;
  referenceToFlowDataSetId: string;
  referenceToFlowDataSetVersion: string;
  referenceToFlowDataSet: string;
  meanAmount: string;
  resultingAmount: string;
  uncertaintyDistributionType: string;
  dataDerivationTypeStatus: string;
  generalComment: string;
  quantitativeReference: boolean;
  functionalUnitOrOther: any;
  refUnitRes?:any
};
