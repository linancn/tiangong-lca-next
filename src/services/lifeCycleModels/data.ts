import { LifeCycleModel } from '@tiangong-lca/tidas-sdk';
import type { LangTextValue } from '../general/data';
import type { ProcessExchangeData, ProcessTable } from '../processes/data';

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
  flowIsRef: boolean;
  upstreamId: string;
  upstreamNodeId?: string;
  downstreamId: string;
  downstreamNodeId?: string;
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
  isCycle?: boolean;
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

type DeepPartial<T> =
  T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;

export type LifeCycleModelFormData = DeepPartial<FormLifeCycleModel> & {
  [key: string]: unknown;
};

export type LifeCycleModelFormState = LifeCycleModelFormData & {
  id?: string;
  version?: string;
};

export type LifeCycleModelPortGroup = 'groupInput' | 'groupOutput';

export type LifeCycleModelPortData = {
  textLang?: LangTextValue;
  flowId?: string;
  flowVersion?: string;
  quantitativeReference?: boolean;
  allocations?: ProcessExchangeData['allocations'];
  [key: string]: unknown;
};

export type LifeCycleModelPortItem = {
  id: string;
  args?: { x?: number | string; y?: number };
  attrs?: {
    text?: {
      text?: string;
      title?: string;
      cursor?: string;
      fill?: string;
      'font-weight'?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  group: LifeCycleModelPortGroup | string;
  data?: LifeCycleModelPortData;
  [key: string]: unknown;
};

export type LifeCycleModelNodeData = {
  id?: string;
  version?: string;
  index?: string;
  label?: unknown;
  shortDescription?: unknown;
  quantitativeReference?: '0' | '1';
  targetAmount?: string | number;
  originalAmount?: string | number;
  scalingFactor?: string | number;
  [key: string]: unknown;
};

export type LifeCycleModelGraphNode = {
  id?: string;
  shape?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  size?: { width: number; height: number };
  attrs?: Record<string, unknown>;
  data?: LifeCycleModelNodeData;
  ports?: {
    groups?: Record<string, unknown>;
    items?: LifeCycleModelPortItem[];
  };
  tools?: Array<{ id?: string; [key: string]: unknown } | string>;
  selected?: boolean;
  [key: string]: unknown;
};

export type LifeCycleModelEdgeConnection = {
  outputExchange?: {
    '@flowUUID'?: string;
    downstreamProcess?: {
      '@flowUUID'?: string;
      '@id'?: string;
    };
  };
  isBalanced?: boolean;
  exchangeAmount?: number;
  unbalancedAmount?: number;
  [key: string]: unknown;
};

export type LifeCycleModelEdgeNodeData = {
  sourceNodeID?: string;
  targetNodeID?: string;
  sourceProcessId?: string;
  sourceProcessVersion?: string;
  targetProcessId?: string;
  targetProcessVersion?: string;
  [key: string]: unknown;
};

export type LifeCycleModelEdgeData = {
  connection?: LifeCycleModelEdgeConnection;
  node?: LifeCycleModelEdgeNodeData;
  [key: string]: unknown;
};

export type LifeCycleModelGraphEdge = {
  id?: string;
  source?: {
    cell?: string;
    port?: string;
    [key: string]: unknown;
  };
  target?: {
    cell?: string;
    port?: string;
    [key: string]: unknown;
  };
  attrs?: Record<string, unknown>;
  labels?: unknown[];
  data?: LifeCycleModelEdgeData;
  selected?: boolean;
  [key: string]: unknown;
};

export type LifeCycleModelGraphData = {
  nodes: LifeCycleModelGraphNode[];
  edges: LifeCycleModelGraphEdge[];
};

export type LifeCycleModelEditorFormState = LifeCycleModelFormState & {
  model?: LifeCycleModelGraphData;
};

export type LifeCycleModelValidationIssue = {
  path: PropertyKey[];
};

export type LifeCycleModelCheckContext = 'review' | 'checkData';

export type LifeCycleModelCheckResult<TRefData = unknown> = {
  checkResult: boolean;
  unReview: TRefData[];
  problemNodes?: TRefData[];
};

export type LifeCycleModelToolbarEditInfoHandle<TRefData = unknown> = {
  submitReview: (unReview: TRefData[]) => Promise<void>;
  handleCheckData: (
    from: LifeCycleModelCheckContext,
    nodes: LifeCycleModelGraphNode[],
    edges: LifeCycleModelGraphEdge[],
  ) => Promise<LifeCycleModelCheckResult<TRefData>>;
  updateReferenceDescription: (formData: LifeCycleModelFormState) => Promise<void>;
};

export type LifeCycleModelSubModel = {
  id: string;
  version: string;
  type?: 'primary' | 'secondary' | string;
  [key: string]: unknown;
};

export type LifeCycleModelJsonTg = {
  xflow?: {
    nodes?: LifeCycleModelGraphNode[];
    edges?: LifeCycleModelGraphEdge[];
  };
  submodels?: LifeCycleModelSubModel[];
  [key: string]: unknown;
};

export type LifeCycleModelDetailData = {
  id: string;
  version: string;
  json: { lifeCycleModelDataSet?: FormLifeCycleModel };
  json_tg?: LifeCycleModelJsonTg;
  stateCode: number;
  ruleVerification: boolean;
  teamId?: string;
};

export type LifeCycleModelDetailResponse =
  | {
      data: LifeCycleModelDetailData;
      success: true;
    }
  | {
      data: object;
      success: false;
    };

export type LifeCycleModelImportData = Array<{
  lifeCycleModelDataSet?: FormLifeCycleModel;
  json_tg?: LifeCycleModelJsonTg;
  [key: string]: unknown;
}>;

export type LifeCycleModelProcessInstance = Pick<ProcessTable, 'id' | 'version'> & {
  modelId?: string;
  userId?: string;
};

export type LifeCycleModelTargetAmount = {
  targetAmount?: string | number;
  originalAmount?: string | number;
  scalingFactor?: string | number;
};

export type LifeCycleModelSelectedPortPayload = {
  selectedRowData: ProcessExchangeData[];
};

export type LifeCycleModelThemeToken = {
  colorPrimary: string;
  colorTextDescription: string;
  colorText: string;
  colorBgBase: string;
};
