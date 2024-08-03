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

export const typeOfDataSetOptions = [
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
