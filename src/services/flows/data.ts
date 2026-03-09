import type { LangTextValue, ReferenceItem } from '@/services/general/data';
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
  meanValue?: string;
  referenceToFlowPropertyDataSetId: string;
  referenceToFlowPropertyDataSetVersion: string;
  referenceToFlowPropertyDataSet: string;
  quantitativeReference: boolean;
  location?: string;
  minimumValue?: string;
  maximumValue?: string;
  uncertaintyDistributionType?: string;
  relativeStandardDeviation95In?: string;
  dataDerivationTypeStatus?: string;
  generalComment?: string;
  'common:generalComment'?: string;
  refUnitRes?: FlowRefUnitDisplay;
};

export type FlowRefUnitDisplay = {
  name?: LangTextValue;
  refUnitName?: string;
  refUnitGeneralComment?: LangTextValue;
  [key: string]: unknown;
};

export type FlowPropertyData = {
  '@dataSetInternalID'?: string;
  referenceToFlowPropertyDataSet?: ReferenceItem;
  meanValue?: string;
  minimumValue?: string;
  maximumValue?: string;
  uncertaintyDistributionType?: string;
  relativeStandardDeviation95In?: string | number;
  dataDerivationTypeStatus?: string;
  quantitativeReference?: boolean;
  generalComment?: LangTextValue;
  'common:generalComment'?: LangTextValue;
  [key: string]: unknown;
};

export type FlowDetailData = {
  id?: string;
  version?: string;
  json?: { flowDataSet?: Flow['flowDataSet'] };
  modifiedAt?: string | Date;
  stateCode?: number;
  ruleVerification?: boolean;
  userId?: string;
};

export type FlowDetailResponse = {
  data?: FlowDetailData | null;
  success?: boolean;
};

export type FlowImportItem = {
  flowDataSet: Flow['flowDataSet'];
};

export type FlowImportData = FlowImportItem[];

export type FlowDataSetObjectKeys = Exclude<
  {
    [K in keyof Flow['flowDataSet']]: Flow['flowDataSet'][K] extends object | undefined ? K : never;
  }[keyof Flow['flowDataSet']],
  undefined
>;

export type FormFlow = Pick<Flow['flowDataSet'], FlowDataSetObjectKeys>;

export type FormFlowWithId = FormFlow & { id?: string };
