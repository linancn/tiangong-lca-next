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