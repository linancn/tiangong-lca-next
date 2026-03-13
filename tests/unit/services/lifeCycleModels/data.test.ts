import type {
  LifeCycleModelCheckResult,
  LifeCycleModelGraphData,
  LifeCycleModelSubModel,
  LifeCycleModelTable,
  LifeCycleModelTargetAmount,
  LifeCycleModelToolbarEditInfoHandle,
  Up2DownEdge,
} from '@/services/lifeCycleModels/data';

describe('lifeCycleModels data shapes', () => {
  it('supports graph, table, and edge payloads used by the editor', () => {
    const table: LifeCycleModelTable = {
      id: 'model-1',
      name: 'Battery model',
      generalComment: 'Main lifecycle model',
      classification: 'Energy storage',
      version: '01.00.000',
      modifiedAt: new Date('2026-03-13T00:00:00Z'),
      teamId: 'team-1',
    };
    const graph: LifeCycleModelGraphData = {
      nodes: [
        {
          id: 'node-1',
          data: {
            id: 'proc-1',
            version: '01.00.000',
            index: '0',
            quantitativeReference: '1',
          },
          ports: {
            items: [
              {
                id: 'port-1',
                group: 'groupOutput',
                data: { flowId: 'flow-1', quantitativeReference: true },
              },
            ],
          },
        },
      ],
      edges: [
        {
          id: 'edge-1',
          source: { cell: 'node-1', port: 'port-1' },
          target: { cell: 'node-2', port: 'port-2' },
          data: {
            connection: {
              outputExchange: {
                '@flowUUID': 'flow-1',
                downstreamProcess: { '@id': '1', '@flowUUID': 'flow-2' },
              },
            },
          },
        },
      ],
    };
    const edge: Up2DownEdge = {
      id: 'proc-1->proc-2:main',
      flowUUID: 'flow-1',
      flowIsRef: true,
      upstreamId: 'proc-1',
      downstreamId: 'proc-2',
      mainOutputFlowUUID: 'flow-1',
      mainInputFlowUUID: 'flow-2',
      scalingFactor: 1.25,
      isBalanced: true,
    };

    expect(table.name).toBe('Battery model');
    expect(graph.nodes[0].ports?.items?.[0].group).toBe('groupOutput');
    expect(edge.isBalanced).toBe(true);
  });

  it('supports toolbar/edit helper contracts and target amount payloads', async () => {
    const submodel: LifeCycleModelSubModel = {
      id: 'sub-1',
      version: '01.00.000',
      type: 'secondary',
    };
    const target: LifeCycleModelTargetAmount = {
      targetAmount: '5',
      originalAmount: '3',
    };
    const checkResult: LifeCycleModelCheckResult<string> = {
      checkResult: true,
      unReview: ['ref-1'],
      problemNodes: ['node-1'],
    };
    const handle: LifeCycleModelToolbarEditInfoHandle<string> = {
      submitReview: async (unReview) => {
        expect(unReview).toEqual(['ref-1']);
      },
      handleCheckData: async () => checkResult,
      updateReferenceDescription: async (formData) => {
        expect(formData.id).toBe('model-1');
      },
    };

    expect(submodel.type).toBe('secondary');
    expect(target.targetAmount).toBe('5');
    await expect(handle.handleCheckData('review', [], [])).resolves.toEqual(checkResult);
    await expect(handle.submitReview(['ref-1'])).resolves.toBeUndefined();
    await expect(handle.updateReferenceDescription({ id: 'model-1' })).resolves.toBeUndefined();
  });
});
