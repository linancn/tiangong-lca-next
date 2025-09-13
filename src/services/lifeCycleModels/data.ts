import { LifeCycleModel } from '@tiangong-lca/tidas-sdk';

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
  // upstreamProcessId: string;
  // upstreamProcessVersion: string;
  downstreamId: string;
  // downstreamProcessId: string;
  // downstreamProcessVersion: string;
  dependence?: string;
  mainDependence?: string;
  mainScalingFactor?: number;
  mainOutputFlowUUID: string;
  mainInputFlowUUID: string;
  scalingFactor?: number;
};

export type LifeCycleModelDataSetObjectKeys = Exclude<
  {
    [K in keyof LifeCycleModel['lifeCycleModelDataSet']]: LifeCycleModel['lifeCycleModelDataSet'][K] extends
      | object
      | undefined
      ? K
      : never;
  }[keyof LifeCycleModel['lifeCycleModelDataSet']],
  undefined
>;

export type FormLifeCycleModel = Pick<
  LifeCycleModel['lifeCycleModelDataSet'],
  LifeCycleModelDataSetObjectKeys
>;
