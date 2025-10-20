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
  id: string; //upstreamId + '->' + downstreamId + ':' + dependence
  flowUUID: string;
  upstreamId: string;
  downstreamId: string;
  dependence?: string;
  mainDependence?: string;
  mainScalingFactor?: number;
  mainOutputFlowUUID: string;
  mainInputFlowUUID: string;
  downScalingFactor?: number;
  upScalingFactor?: number;
  scalingFactor?: number;
  exchangeAmount?: number;
  unbalancedAmount?: number;
  isBalanced?: boolean;
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
