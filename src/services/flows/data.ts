export type FlowTable = {
  id: string;
  baseName: string;
  synonyms: string;
  classification: string;
  flowType: string;
  CASNumber: string;
  refFlowPropertyId: string;
  created_at: Date;
};

export type FlowModelTable = {
  id: string;
  name: string;
  description: string;
  created_at: Date;
};

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
