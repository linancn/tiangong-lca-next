import type { LangTextValue, ReferenceItem } from '@/services/general/data';
import type { UnitGroup } from '@tiangong-lca/tidas-sdk';

export type UnitGroupImportItem = {
  unitGroupDataSet?: UnitGroup['unitGroupDataSet'];
};

type UnitRefValue = {
  name?: string;
  generalComment?: LangTextValue;
};

export type UnitGroupTable = {
  key?: React.Key;
  id: string;
  lang: string;
  name: string;
  classification: string;
  refUnitId: string;
  refUnitName: string;
  refUnitGeneralComment: string;
  version: string;
  modifiedAt: Date;
  teamId: string;
};

export type UnitGroupDetailData = {
  id?: string;
  version?: string;
  json?: {
    unitGroupDataSet?: UnitGroup['unitGroupDataSet'];
  };
  modifiedAt?: string | Date;
  stateCode?: number;
  ruleVerification?: boolean;
  userId?: string;
};

export type UnitGroupDetailResponse = {
  data?: UnitGroupDetailData | null;
  success?: boolean;
};

export type UnitGroupDataSetObjectKeys = Exclude<
  {
    [K in keyof UnitGroup['unitGroupDataSet']]: UnitGroup['unitGroupDataSet'][K] extends
      | object
      | undefined
      ? K
      : never;
  }[keyof UnitGroup['unitGroupDataSet']],
  undefined
>;

export type FormUnitGroup = Pick<UnitGroup['unitGroupDataSet'], UnitGroupDataSetObjectKeys>;
export type UnitGroupFormState = FormUnitGroup & { id?: string };

export type UnitItem = {
  '@dataSetInternalID'?: string;
  name?: string;
  meanValue?: string;
  generalComment?: LangTextValue;
  quantitativeReference?: boolean;
};

export type UnitDraft = Omit<UnitItem, '@dataSetInternalID'> & {
  '@dataSetInternalID'?: string;
};

export type UnitTable = {
  id: string;
  dataSetInternalID: string;
  name: string;
  meanValue: string;
  generalComment: LangTextValue;
  quantitativeReference: boolean;
};

export type UnitReferenceData = {
  id?: string;
  version?: string;
  name?: LangTextValue;
  refUnitId?: string;
  refUnitName?: string;
  refUnitGeneralComment?: LangTextValue;
  unit?: UnitItem[];
};

export type FlowPropertyUnitGroupData = {
  id?: string;
  version?: string;
  refUnitGroupId?: string;
  refUnitGroupShortDescription?: LangTextValue;
};

export type UnitGroupRefObject = Omit<ReferenceItem, 'common:shortDescription'> & {
  'common:shortDescription'?: LangTextValue;
};

export type UnitGroupRefFormValue = UnitGroupRefObject & {
  refUnit?: UnitRefValue;
};
