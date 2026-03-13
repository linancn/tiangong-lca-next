import type {
  ProcessDetailResponse,
  ProcessExchangeTable,
  ProcessReviewRecord,
  ProcessTable,
} from '@/services/processes/data';

describe('processes data shapes', () => {
  it('supports process table rows and exchange table rows used by process pages', () => {
    const process: ProcessTable = {
      key: 'proc-1',
      id: 'proc-1',
      version: '01.00.000',
      lang: 'en',
      name: 'Steel production',
      generalComment: 'Primary route',
      classification: 'Materials',
      referenceYear: '2025',
      location: 'CN',
      modifiedAt: new Date('2026-03-13T00:00:00Z'),
      teamId: 'team-1',
      modelId: 'model-1',
      typeOfDataSet: 'Unit process, single operation',
    };
    const exchange: ProcessExchangeTable = {
      key: 'INPUT:flow-1',
      dataSetInternalID: '1',
      exchangeDirection: 'input',
      referenceToFlowDataSetId: 'flow-1',
      referenceToFlowDataSetVersion: '01.00.000',
      referenceToFlowDataSet: 'Iron ore',
      classification: 'Input flow',
      meanAmount: '10',
      resultingAmount: '10',
      uncertaintyDistributionType: 'normal',
      dataDerivationTypeStatus: 'Measured',
      generalComment: 'Measured input',
      quantitativeReference: false,
      functionalUnitOrOther: '1 kg steel',
      stateCode: 20,
      typeOfDataSet: 'Product flow',
    };

    expect(process.typeOfDataSet).toContain('Unit process');
    expect(exchange.referenceToFlowDataSetId).toBe('flow-1');
  });

  it('supports process detail responses with review logs', () => {
    const review: ProcessReviewRecord = {
      id: 'review-1',
      json: {
        logs: [
          {
            user: { display_name: 'Alice', name: 'alice' },
            time: '2026-03-13T10:00:00Z',
            action: 'approved',
          },
        ],
      },
    };
    const response: ProcessDetailResponse = {
      success: true,
      data: {
        id: 'proc-2',
        version: '02.00.000',
        modifiedAt: '2026-03-13T00:00:00Z',
        stateCode: 30,
        ruleVerification: true,
        teamId: 'team-2',
        reviews: [review],
      },
    };

    expect(response.data?.reviews?.[0].json?.logs?.[0].action).toBe('approved');
    expect(response.data?.teamId).toBe('team-2');
  });
});
