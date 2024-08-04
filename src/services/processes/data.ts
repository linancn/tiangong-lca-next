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
  quantitativeReference: boolean;
  functionalUnitOrOther: any;
};

export const processTypeOptions = [
  {
    value: 'Unit process, single operation',
    label: 'Unit process, single operation',
  },
  {
    value: 'Unit processes, black box',
    label: 'Unit processes, black box',
  },
  {
    value: 'LCI result',
    label: 'LCI result',
  },
  {
    value: 'Partly terminated system',
    label: 'Partly terminated system',
  },
  {
    value: 'Avoided product system',
    label: 'Avoided product system',
  },
];

export const copyrightOptions = [
  {
    value: 'True',
    label: 'True',
  },
  {
    value: 'False',
    label: 'False',
  },
];

export const LCIMethodPrincipleOptions = [
  {
    value: 'Attributional',
    label: 'Attributional',
  },
  {
    value: 'Consequential',
    label: 'Consequential',
  },
  {
    value: 'Consequential with attributional components',
    label: 'Consequential with attributional components',
  },
  {
    value: 'Not applicable',
    label: 'Not applicable',
  },
  {
    value: 'Other',
    label: 'Other',
  },
];

export const LCIMethodApproachOptions = [
  {
    value: 'Allocation - market value',
    label: 'Allocation - market value',
  },
  {
    value: 'Allocation - gross calorific value',
    label: 'Allocation - gross calorific value',
  },
  {
    value: 'Allocation - net calorific value',
    label: 'Allocation - net calorific value',
  },
  {
    value: 'Allocation - exergetic content',
    label: 'Allocation - exergetic content',
  },
  {
    value: 'Allocation - element content',
    label: 'Allocation - element content',
  },
  {
    value: 'Allocation - mass',
    label: 'Allocation - mass',
  },
  {
    value: 'Allocation - volume',
    label: 'Allocation - volume',
  },
  {
    value: 'Allocation - ability to bear',
    label: 'Allocation - ability to bear',
  },
  {
    value: 'Allocation - marginal causality',
    label: 'Allocation - marginal causality',
  },
  {
    value: 'Allocation - physical causality',
    label: 'Allocation - physical causality',
  },
  {
    value: 'Allocation - 100% to main function',
    label: 'Allocation - 100% to main function',
  },
  {
    value: 'Allocation - other explicit assignment',
    label: 'Allocation - other explicit assignment',
  },
  {
    value: 'Allocation - equal distribution',
    label: 'Allocation - equal distribution',
  },
  {
    value: 'Allocation - recycled content',
    label: 'Allocation - recycled content',
  },
  {
    value: 'Substitution - BAT',
    label: 'Substitution - BAT',
  },
  {
    value: 'Substitution - average, market price correction',
    label: 'Substitution - average, market price correction',
  },
  {
    value: 'Substitution - average, technical properties correction',
    label: 'Substitution - average, technical properties correction',
  },
  {
    value: 'Substitution - recycling potential',
    label: 'Substitution - recycling potential',
  },
  {
    value: 'Substitution - average, no correction',
    label: 'Substitution - average, no correction',
  },
  {
    value: 'Substitution - specific',
    label: 'Substitution - specific',
  },
  {
    value: 'Consequential effects - other',
    label: 'Consequential effects - other',
  },
  {
    value: 'Not applicable',
    label: 'Not applicable',
  },
  {
    value: 'Other',
    label: 'Other',
  },
];

export const reviewTypeOptions = [
  {
    value: 'Dependent internal review',
    label: 'Dependent internal review',
  },
  {
    value: 'Independent internal review',
    label: 'Independent internal review',
  },
  {
    value: 'Independent external review',
    label: 'Independent external review',
  },
  {
    value: 'Accredited third party review',
    label: 'Accredited third party review',
  },
  {
    value: 'Independent review panel',
    label: 'Independent review panel',
  },
  {
    value: 'Not reviewed',
    label: 'Not reviewed',
  },
];

export const licenseTypeOptions = [
  {
    value: 'Free of charge for all users and uses',
    label: 'Free of charge for all users and uses',
  },
  {
    value: 'Free of charge for some user types or use types',
    label: 'Free of charge for some user types or use types',
  },
  {
    value: 'Free of charge for members only',
    label: 'Free of charge for members only',
  },
  {
    value: 'License fee',
    label: 'License fee',
  },
  {
    value: 'Other',
    label: 'Other',
  },
];