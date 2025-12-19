import { Process } from '@tiangong-lca/tidas-sdk';
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
  modelId: string;
  typeOfDataSet: string;
};

export type ProcessExchangeTable = {
  key: string;
  dataSetInternalID: string;
  exchangeDirection: string;
  referenceToFlowDataSetId: string;
  referenceToFlowDataSetVersion: string;
  referenceToFlowDataSet: string;
  classification: string;
  meanAmount: string;
  resultingAmount: string;
  uncertaintyDistributionType: string;
  dataDerivationTypeStatus: string;
  generalComment: string;
  quantitativeReference: boolean;
  functionalUnitOrOther: any;
  refUnitRes?: any;
  stateCode: number;
  typeOfDataSet?: string;
};

export type ProcessDataSetObjectKeys = Exclude<
  {
    [K in keyof Process['processDataSet']]: Process['processDataSet'][K] extends object | undefined
      ? K
      : never;
  }[keyof Process['processDataSet']],
  undefined
>;

export type FormProcess = Pick<Process['processDataSet'], ProcessDataSetObjectKeys>;
