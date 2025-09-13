import { Flow } from '@tiangong-lca/tidas-sdk';
export type FlowTable = {
  id: string;
  version: string;
  name: string;
  synonyms: string;
  classification: string;
  flowType: string;
  CASNumber: string;
  locationOfSupply: string;
  refFlowPropertyId: string;
  modifiedAt: Date;
  teamId: string;
};

export type FlowModelTable = {
  id: string;
  name: string;
  description: string;
  modifiedAt: Date;
};

export type FlowpropertyTabTable = {
  id: string;
  version: string;
  dataSetInternalID: string;
  meanValue: string;
  referenceToFlowPropertyDataSetId: string;
  referenceToFlowPropertyDataSetVersion: string;
  referenceToFlowPropertyDataSet: string;
  quantitativeReference: boolean;
  refUnitRes?: any;
};

export type FlowDataSetObjectKeys = Exclude<
  {
    [K in keyof Flow['flowDataSet']]: Flow['flowDataSet'][K] extends object | undefined ? K : never;
  }[keyof Flow['flowDataSet']],
  undefined
>;

export type FormFlow = Pick<Flow['flowDataSet'], FlowDataSetObjectKeys>;
