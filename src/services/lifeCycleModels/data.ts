export type LifeCycleModelTable = {
  id: string;
  name: string;
  generalComment: string;
  classification: string;
  version: string;
  modifiedAt: Date;
  teamId: string;
};

export type Up2DownEdge = {
  flowUUID: string;
  upstreamId: string;
  upstreamProcessId: string;
  upstreamProcessVersion: string;
  downstreamId: string;
  downstreamProcessId: string;
  downstreamProcessVersion: string;
  dependence?: string;
  mainDependence?: string;
  mainOutputFlowUUID: string;
  mainInputFlowUUID: string;
};
