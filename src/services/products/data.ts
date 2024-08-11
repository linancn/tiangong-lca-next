export type ProductTable = {
  id: string;
  name: string;
  generalComment: string;
  created_at: Date;
};


export type EdgeExchangeTable = {
  id: string;
  sourceProcessId: string;
  sourceOutputFlowInternalID: string;
  sourceOutputFlowId: string;
  sourceOutputFlowName: string;
  sourceOutputFlowGeneralComment: string;
  targetProcessId: string;
  targetInputFlowInternalID: string;
  targetInputFlowId: string;
  targetInputFlowName: string;
  targetInputFlowGeneralComment: string;
};