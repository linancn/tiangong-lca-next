import { readFileSync } from 'node:fs';
import type { MatrixExchangePayload } from '@/services/lifeCycleModels/matrixCalculation/types';

export const version = '01.00.000';
export const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const ref = (n: number, type = 'flow data set') => ({
  '@type': type,
  '@refObjectId': uuid(n),
  '@version': version,
  '@uri': `../datasets/${uuid(n)}.xml`,
  'common:shortDescription': { '@xml:lang': 'en', '#text': `Item ${n}` },
});
export const exchange = (
  id: string,
  n: number,
  amount: number,
  direction: 'INPUT' | 'OUTPUT',
  fraction?: number,
): MatrixExchangePayload => ({
  internalId: id,
  flowId: uuid(n),
  amount,
  direction,
  allocations:
    fraction === undefined ? undefined : { allocation: { '@allocatedFraction': String(fraction) } },
  raw: {
    '@dataSetInternalID': id,
    referenceToFlowDataSet: ref(n),
    exchangeDirection: direction === 'INPUT' ? 'Input' : 'Output',
    resultingAmount: String(amount),
    meanAmount: String(amount),
    referenceToVariable: 'sourceFormula',
  },
});

export function productDemandFixture() {
  const original = JSON.parse(
    readFileSync(
      'tests/data-workflows/fixtures/data/processes/002_check_data_success.json',
      'utf8',
    ),
  ).jsonOrdered.processDataSet;
  original.administrativeInformation.publicationAndOwnership['common:dataSetVersion'] = version;
  original.modellingAndValidation.dataSourcesTreatmentAndRepresentativeness.annualSupplyOrProductionVolume =
    { '@xml:lang': 'en', '#text': '1 kg' };
  original.modellingAndValidation.complianceDeclarations = {
    compliance: {
      'common:referenceToComplianceSystem': ref(30, 'source data set'),
      'common:approvalOfOverallCompliance': 'Fully compliant',
    },
  };
  const model = {
    lifeCycleModelDataSet: {
      administrativeInformation: {
        ...original.administrativeInformation,
        publicationAndOwnership: {
          ...original.administrativeInformation.publicationAndOwnership,
          'common:dataSetVersion': version,
        },
      },
      lifeCycleModelInformation: {
        dataSetInformation: {},
        quantitativeReference: { referenceToReferenceProcess: 0 },
        technology: {
          processes: {
            processInstance: [
              { '@dataSetInternalID': '0', referenceToProcess: ref(1, 'process data set') },
              {
                '@dataSetInternalID': '1',
                referenceToProcess: ref(2, 'process data set'),
                groups: { memberOf: { '@groupId': '0' } },
              },
            ],
          },
        },
      },
    },
  };
  const payload = {
    refInstanceIndex: '0',
    targetAmount: 1,
    instances: [
      {
        instanceIndex: '0',
        processId: uuid(1),
        processVersion: version,
        connections: [],
        process: {
          id: uuid(1),
          version,
          refExchangeInternalId: '1',
          exchanges: [
            exchange('1', 10, 1, 'OUTPUT'),
            exchange('2', 11, 100, 'INPUT'),
            exchange('3', 12, 30, 'INPUT'),
          ],
        },
      },
      {
        instanceIndex: '1',
        processId: uuid(2),
        processVersion: version,
        connections: [11, 12].map((n) => ({
          upstreamIndex: '1',
          downstreamIndex: '0',
          inputFlowId: uuid(n),
          outputFlowId: uuid(n),
          inputFlowVersion: version,
          outputFlowVersion: version,
          edgeId: String(n),
        })),
        process: {
          id: uuid(2),
          version,
          refExchangeInternalId: '1',
          exchanges: [
            exchange('1', 11, 100, 'OUTPUT', 80),
            exchange('2', 12, 20, 'OUTPUT', 20),
            exchange('3', 13, 100, 'OUTPUT'),
          ],
        },
      },
    ],
  };
  return { original, model, payload };
}

/** Legacy P/Q shares close at 100%; connected non-reference R has an implicit zero share. */
export function legacyProductDemandFixture(explicitZero = false) {
  const fixture = productDemandFixture();
  const supplier = fixture.payload.instances[1];
  supplier.process.exchanges[0].allocations = { allocation: { '@allocatedFraction': '50' } };
  supplier.process.exchanges[1].allocations = { allocation: { '@allocatedFraction': '50' } };
  supplier.process.exchanges.push(exchange('4', 14, 10, 'OUTPUT', explicitZero ? 0 : undefined));
  fixture.payload.instances[0].process.exchanges.push(exchange('4', 14, 40, 'INPUT'));
  supplier.connections.push({
    ...supplier.connections[0],
    inputFlowId: uuid(14),
    outputFlowId: uuid(14),
    edgeId: '14',
  });
  return fixture;
}
