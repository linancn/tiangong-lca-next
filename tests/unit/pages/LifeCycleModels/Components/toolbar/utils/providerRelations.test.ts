/**
 * Unit tests for provider relation extraction with canvas UUIDs distinct
 * from process instance indices (review finding 4).
 */

import {
  collectCanvasProviderRelations,
  collectMultiProviderConflictNodeIds,
  findConflictingProviderEdges,
} from '@/pages/LifeCycleModels/Components/toolbar/utils/providerRelations';

const node = (id: string, index: string) => ({
  id,
  data: { index },
});

const edge = (id: string, sourceCell: string, targetCell: string, flowId: string) => ({
  id,
  source: { cell: sourceCell },
  target: { cell: targetCell },
  data: {
    connection: {
      outputExchange: {
        '@flowUUID': flowId,
        downstreamProcess: { '@flowUUID': flowId },
      },
    },
  },
});

// 画布 UUID 与实例序号完全不同：uuid-node-1 ↔ index 0 等
const nodes = [
  node('uuid-node-1', '0'),
  node('uuid-node-2', '1'),
  node('uuid-node-3', '2'),
] as any[];

const edges = [
  edge('edge-A', 'uuid-node-1', 'uuid-node-2', 'flow-1'),
  edge('edge-B', 'uuid-node-2', 'uuid-node-3', 'flow-1'),
] as any[];

describe('collectCanvasProviderRelations', () => {
  it('resolves instance indices from canvas nodes (UUID ≠ index)', () => {
    expect(collectCanvasProviderRelations(nodes, edges)).toEqual([
      { upstreamIndex: '0', downstreamIndex: '1', inputFlowId: 'flow-1', edgeId: 'edge-A' },
      { upstreamIndex: '1', downstreamIndex: '2', inputFlowId: 'flow-1', edgeId: 'edge-B' },
    ]);
  });

  it('skips edges whose endpoints cannot be resolved to instances', () => {
    const dangling = [edge('edge-X', 'uuid-ghost', 'uuid-node-2', 'flow-1')] as any[];
    expect(collectCanvasProviderRelations(nodes, dangling)).toEqual([]);
  });

  it('skips nodes without a data index and edges without flow identifiers or endpoints', () => {
    // 缺少 data.index 的节点不进入标识域；缺少输出/输入流或两端画布节点
    // 的边同样跳过；缺少边 id 时以空串保留关系
    const partialNodes = [...nodes, { id: 'uuid-node-no-index', data: {} }] as any[];
    const brokenEdges = [
      {
        id: 'edge-no-output',
        source: { cell: 'uuid-node-1' },
        target: { cell: 'uuid-node-2' },
        data: {
          connection: { outputExchange: { downstreamProcess: { '@flowUUID': 'flow-1' } } },
        },
      },
      {
        id: 'edge-no-input',
        source: { cell: 'uuid-node-1' },
        target: { cell: 'uuid-node-2' },
        data: { connection: { outputExchange: { '@flowUUID': 'flow-1' } } },
      },
      {
        id: 'edge-no-endpoints',
        data: {
          connection: {
            outputExchange: { '@flowUUID': 'flow-1', downstreamProcess: { '@flowUUID': 'flow-1' } },
          },
        },
      },
      {
        data: {
          connection: {
            outputExchange: { '@flowUUID': 'flow-1', downstreamProcess: { '@flowUUID': 'flow-1' } },
          },
        },
        source: { cell: 'uuid-node-1' },
        target: { cell: 'uuid-node-2' },
      },
    ] as any[];
    expect(collectCanvasProviderRelations(partialNodes, brokenEdges)).toEqual([
      { upstreamIndex: '0', downstreamIndex: '1', inputFlowId: 'flow-1', edgeId: '' },
    ]);
  });
});

describe('findConflictingProviderEdges', () => {
  const relations = collectCanvasProviderRelations(nodes, edges);

  it('detects a second provider for the same target input across UUID-resolved relations', () => {
    // uuid-node-3 也连到 uuid-node-2 的 flow-1 输入：与 edge-A 冲突
    const conflicts = findConflictingProviderEdges(
      [
        ...relations,
        ...collectCanvasProviderRelations(nodes, [
          edge('edge-C', 'uuid-node-3', 'uuid-node-2', 'flow-1'),
        ] as any[]),
      ],
      { upstreamIndex: '2', downstreamIndex: '1', inputFlowId: 'flow-1' },
      ['edge-C'],
    );
    expect(conflicts).toEqual(['edge-A']);
  });

  it('ignores excluded edges when reconnecting the same edge', () => {
    const conflicts = findConflictingProviderEdges(
      relations,
      { upstreamIndex: '0', downstreamIndex: '1', inputFlowId: 'flow-1' },
      ['edge-A'],
    );
    expect(conflicts).toEqual([]);
  });

  it('defaults to excluding nothing when no edge ids are passed', () => {
    const conflicts = findConflictingProviderEdges(relations, {
      upstreamIndex: '0',
      downstreamIndex: '1',
      inputFlowId: 'flow-1',
    });
    expect(conflicts).toEqual([]);
  });
});

describe('collectMultiProviderConflictNodeIds', () => {
  it('returns canvas node ids for conflicted downstream instances', () => {
    // uuid-node-3 也供应 uuid-node-2 的 flow-1：冲突节点是 uuid-node-2
    const conflictEdges = [
      ...edges,
      edge('edge-C', 'uuid-node-3', 'uuid-node-2', 'flow-1'),
    ] as any[];
    expect(collectMultiProviderConflictNodeIds(nodes, conflictEdges)).toEqual(['uuid-node-2']);
  });

  it('returns no conflicts when every input has a single provider', () => {
    expect(collectMultiProviderConflictNodeIds(nodes, edges)).toEqual([]);
  });

  it('ignores nodes without a data index when reversing the id lookup', () => {
    expect(
      collectMultiProviderConflictNodeIds(
        [...nodes, { id: 'uuid-no-index', data: {} }] as any[],
        edges,
      ),
    ).toEqual([]);
  });
});
