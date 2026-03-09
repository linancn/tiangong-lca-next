import type { LangTextValue, ReferenceItem } from '@/services/general/data';
import type { FlowProperty } from '@tiangong-lca/tidas-sdk';

export type FlowpropertyReference = ReferenceItem | ReferenceItem[];

export type FlowpropertyRefUnitDisplay = {
  name?: LangTextValue;
  refUnitName?: string;
  refUnitGeneralComment?: LangTextValue;
};

export type FlowpropertyRefUnit = Record<string, unknown>;

export type FlowpropertyTable = {
  key?: React.Key;
  id: string;
  version: string;
  name: string;
  classification: string;
  generalComment: string;
  refUnitGroupId: string;
  refUnitGroupVersion?: string;
  refUnitGroup: string;
  modifiedAt: Date;
  teamId: string;
  refUnitRes: FlowpropertyRefUnit;
};

export type FlowpropertyImportItem = {
  flowPropertyDataSet: FlowProperty['flowPropertyDataSet'];
};

export type FlowpropertyImportData = FlowpropertyImportItem[];

export type FlowpropertyDetailData = {
  id?: string;
  version?: string;
  json?: { flowPropertyDataSet?: FlowProperty['flowPropertyDataSet'] };
  modifiedAt?: string | Date;
  stateCode?: number;
  ruleVerification?: boolean;
  userId?: string;
};

export type FlowpropertyDetailResponse = {
  data?: FlowpropertyDetailData | null;
  success?: boolean;
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
