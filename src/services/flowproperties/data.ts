import { FlowProperty } from '@tiangong-lca/tidas-sdk';

export type FlowpropertyTable = {
  id: string;
  version: string;
  name: string;
  classification: string;
  generalComment: string;
  refUnitGroupId: string;
  refUnitGroup: string;
  modifiedAt: Date;
  teamId: string;
  refUnitRes: { [key: string]: any };
};

export type FlowPropertyDataSetObjectKeys = Exclude<
  {
    [K in keyof FlowProperty['flowPropertyDataSet']]: FlowProperty['flowPropertyDataSet'][K] extends
      | object
      | undefined
      ? K
      : never;
  }[keyof FlowProperty['flowPropertyDataSet']],
  undefined
>;

export type FormFlowProperty = Pick<
  FlowProperty['flowPropertyDataSet'],
  FlowPropertyDataSetObjectKeys
>;
