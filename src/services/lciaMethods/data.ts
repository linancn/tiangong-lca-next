import type { LangTextValue } from '../general/data';

export type LCIAResultTable = {
  key: string;
  referenceToLCIAMethodDataSet: {
    '@refObjectId': string;
    '@type': string;
    '@uri': string;
    '@version': string;
    'common:shortDescription': [
      {
        '@xml:lang': string;
        '#text': string;
      },
    ];
  };
  meanAmount: string | number;
  referenceQuantityDesc?: string;
};

export type LciaMethodListItem = {
  id: string;
  version: string;
  description: LCIAResultTable['referenceToLCIAMethodDataSet']['common:shortDescription'];
  referenceQuantity?: {
    'common:shortDescription'?: LangTextValue;
  };
};

export type LciaMethodListData = {
  files: LciaMethodListItem[];
};

export type LciaFlowFactorEntry = {
  key: string;
  value: string | number;
};

export type LciaFlowFactorGroup = {
  factor?: LciaFlowFactorEntry[];
};

export type LciaFlowFactorMap = Record<string, LciaFlowFactorGroup>;
