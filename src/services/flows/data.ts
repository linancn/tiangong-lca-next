export type FlowTable = {
  id: string;
  baseName: string;
  classification: string;
  flowType: string;
  generalComment: string;
  CASNumber: string;
  created_at: Date;
};

export type FlowModelTable = {
  id: string;
  name: string;
  description: string;
  created_at: Date;
};

export const flowTypeOptions = [
  {
    value: 'Elementary flow',
    label: 'Elementary flow',
  },
  {
    value: 'Product flow',
    label: 'Product flow',
  },
  {
    value: 'Waste flow',
    label: 'Waste flow',
  },
  {
    value: 'Other flow',
    label: 'Other flow',
  },
];

export const complianceOptions = [
  {
    value: 'Fully compliant',
    label: 'Fully compliant',
  },
  {
    value: 'Not compliant',
    label: 'Not compliant',
  },
  {
    value: 'Not defined',
    label: 'Not defined',
  },
];
