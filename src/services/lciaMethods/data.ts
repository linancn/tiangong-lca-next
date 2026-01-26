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
  meanAmount: number;
  unit?: string;
};
