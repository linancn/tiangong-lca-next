import type { FlowTable } from '@/services/flows/data';
import { z } from 'zod';

export const basicFlowType = 'Elementary flow';
export const topologyFlowTypeFilter = 'Product flow,Waste flow,Other flow';
export const defaultFlowTopologyCacheBaseUrl = '/national-carbon/flow-topology/v1';

const topologyFlowSchema = z.object({
  flowType: z.string(),
  id: z.string(),
  name: z.string(),
  version: z.string(),
});

const topologyNodeSchema = z.object({
  classification: z.string().optional(),
  id: z.string(),
  location: z.string().optional(),
  name: z.string(),
  referenceYear: z.string().optional(),
  type: z.enum(['flow', 'process']),
  typeOfDataSet: z.string().optional(),
  version: z.string(),
});

const topologyEdgeSchema = z.object({
  dataDerivationTypeStatus: z.string().optional(),
  exchangeDirection: z.enum(['input', 'output']),
  id: z.string(),
  meanAmount: z.union([z.string(), z.number()]).optional(),
  quantitativeReference: z.boolean().optional(),
  relation: z.enum(['provider', 'consumer']),
  resultingAmount: z.union([z.string(), z.number()]).optional(),
  source: z.string(),
  target: z.string(),
});

export const flowTopologySnapshotSchema = z.object({
  buildId: z.string(),
  dataAsOf: z.string(),
  edges: z.array(topologyEdgeSchema),
  flow: topologyFlowSchema,
  nodes: z.array(topologyNodeSchema),
  schemaVersion: z.literal('flow_process_topology_v1'),
  stats: z.object({
    consumers: z.number(),
    processCount: z.number(),
    providers: z.number(),
  }),
});

export type FlowTopologySnapshot = z.infer<typeof flowTopologySnapshotSchema>;
export type FlowTopologyNode = FlowTopologySnapshot['nodes'][number];
export type FlowTopologyEdge = FlowTopologySnapshot['edges'][number];

export type FlowTopologyLatestPointer = {
  buildId?: string;
  topologyPath?: string;
  topologyUrl?: string;
};

export function parseFlowTopologySnapshot(input: unknown): FlowTopologySnapshot {
  return flowTopologySnapshotSchema.parse(input);
}

export function isTopologyEligibleFlow(
  flow?: Partial<Pick<FlowTable, 'flowType' | 'id' | 'name' | 'version'>> | null,
): flow is FlowTable {
  return Boolean(
    flow?.id &&
    flow?.name &&
    flow?.version &&
    typeof flow.flowType === 'string' &&
    flow.flowType !== basicFlowType,
  );
}

export function filterTopologyFlowCandidates(flows: FlowTable[]): FlowTable[] {
  return flows.filter(isTopologyEligibleFlow);
}

export function getFlowTopologyCacheBaseUrl(): string {
  const rawBaseUrl = process.env.FLOW_TOPOLOGY_CACHE_BASE_URL || defaultFlowTopologyCacheBaseUrl;
  return rawBaseUrl.replace(/\/+$/, '');
}

export function getFlowTopologyHashPrefix(flowId: string): string {
  const normalized = flowId.replace(/-/g, '').toLowerCase();
  return normalized.slice(0, 2) || '00';
}

export function resolveFlowTopologyUrl(baseUrl: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  if (pathOrUrl.startsWith('/')) {
    return pathOrUrl;
  }

  return `${baseUrl}/${pathOrUrl.replace(/^\/+/, '')}`;
}

export function getFlowTopologyLatestPointerPath(buildId: string, flowId: string): string {
  const hashPrefix = getFlowTopologyHashPrefix(flowId);
  return `builds/${buildId}/by-flow/${hashPrefix}/${flowId}/latest.json`;
}

export function getFlowTopologyObjectPath(
  buildId: string,
  flowId: string,
  flowVersion: string,
): string {
  const hashPrefix = getFlowTopologyHashPrefix(flowId);
  return `builds/${buildId}/by-flow/${hashPrefix}/${flowId}/${flowVersion}/topology.json`;
}
