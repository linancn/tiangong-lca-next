import {
  basicFlowType,
  defaultFlowTopologyCacheBaseUrl,
  filterTopologyFlowCandidates,
  getFlowTopologyCacheBaseUrl,
  getFlowTopologyHashPrefix,
  getFlowTopologyLatestPointerPath,
  getFlowTopologyObjectPath,
  isTopologyEligibleFlow,
  parseFlowTopologySnapshot,
  resolveFlowTopologyUrl,
  topologyFlowTypeFilter,
} from '@/pages/NationalCarbonDashboard/data/flowTopology';

const originalCacheBaseUrl = process.env.FLOW_TOPOLOGY_CACHE_BASE_URL;

afterEach(() => {
  if (originalCacheBaseUrl === undefined) {
    delete process.env.FLOW_TOPOLOGY_CACHE_BASE_URL;
  } else {
    process.env.FLOW_TOPOLOGY_CACHE_BASE_URL = originalCacheBaseUrl;
  }
});

describe('NationalCarbonDashboard flow topology data helpers', () => {
  it('parses valid topology snapshots and rejects incompatible payloads', () => {
    const snapshot = parseFlowTopologySnapshot({
      buildId: 'build-20260603',
      dataAsOf: '2026-06-03T00:00:00Z',
      edges: [
        {
          dataDerivationTypeStatus: 'Calculated',
          exchangeDirection: 'input',
          id: 'edge-consumer',
          meanAmount: '1.0',
          quantitativeReference: true,
          relation: 'consumer',
          resultingAmount: 1,
          source: 'flow-1',
          target: 'process-1',
        },
        {
          exchangeDirection: 'output',
          id: 'edge-provider',
          relation: 'provider',
          source: 'process-2',
          target: 'flow-1',
        },
      ],
      flow: {
        flowType: 'Product flow',
        id: 'flow-1',
        name: 'Hydrogen',
        version: '01.00.000',
      },
      nodes: [
        {
          classification: 'energy / hydrogen',
          id: 'flow-1',
          location: 'CN',
          name: 'Hydrogen',
          referenceYear: '2026',
          type: 'flow',
          typeOfDataSet: 'Flow',
          version: '01.00.000',
        },
        {
          id: 'process-1',
          name: 'Electrolysis',
          type: 'process',
          version: '01.00.000',
        },
      ],
      schemaVersion: 'flow_process_topology_v1',
      stats: {
        consumers: 1,
        processCount: 2,
        providers: 1,
      },
    });

    expect(snapshot.stats).toEqual({ consumers: 1, processCount: 2, providers: 1 });
    expect(snapshot.edges[0].resultingAmount).toBe(1);
    expect(() =>
      parseFlowTopologySnapshot({
        schemaVersion: 'unsupported',
      }),
    ).toThrow();
  });

  it('filters topology candidates to non-basic flows with complete identity fields', () => {
    const eligibleFlow = {
      flowType: 'Product flow',
      id: 'flow-product',
      name: 'Steel coil',
      version: '01.00.000',
    } as any;

    const candidates = filterTopologyFlowCandidates([
      eligibleFlow,
      { ...eligibleFlow, flowType: basicFlowType, id: 'flow-basic' },
      { ...eligibleFlow, id: '' },
      { ...eligibleFlow, name: '' },
      { ...eligibleFlow, version: '' },
      { ...eligibleFlow, flowType: undefined },
    ] as any);

    expect(topologyFlowTypeFilter).toBe('Product flow,Waste flow,Other flow');
    expect(candidates).toEqual([eligibleFlow]);
    expect(isTopologyEligibleFlow(null)).toBe(false);
    expect(isTopologyEligibleFlow(undefined)).toBe(false);
    expect(isTopologyEligibleFlow({ ...eligibleFlow, flowType: 1 } as any)).toBe(false);
    expect(isTopologyEligibleFlow(eligibleFlow)).toBe(true);
  });

  it('resolves cache base URLs and topology object paths', () => {
    delete process.env.FLOW_TOPOLOGY_CACHE_BASE_URL;
    expect(getFlowTopologyCacheBaseUrl()).toBe(defaultFlowTopologyCacheBaseUrl);

    process.env.FLOW_TOPOLOGY_CACHE_BASE_URL = 'https://cache.example.test/base///';
    const baseUrl = getFlowTopologyCacheBaseUrl();

    expect(baseUrl).toBe('https://cache.example.test/base');
    expect(resolveFlowTopologyUrl(baseUrl, 'https://cdn.example.test/topology.json')).toBe(
      'https://cdn.example.test/topology.json',
    );
    expect(resolveFlowTopologyUrl(baseUrl, 'http://cdn.example.test/topology.json')).toBe(
      'http://cdn.example.test/topology.json',
    );
    expect(resolveFlowTopologyUrl(baseUrl, '/fixed/topology.json')).toBe('/fixed/topology.json');
    expect(resolveFlowTopologyUrl(baseUrl, 'builds/latest.json')).toBe(
      'https://cache.example.test/base/builds/latest.json',
    );

    expect(getFlowTopologyHashPrefix('AB-cd-1234')).toBe('ab');
    expect(getFlowTopologyHashPrefix('')).toBe('00');
    expect(getFlowTopologyLatestPointerPath('build-1', 'AB-cd-1234')).toBe(
      'builds/build-1/by-flow/ab/AB-cd-1234/latest.json',
    );
    expect(getFlowTopologyObjectPath('build-1', 'AB-cd-1234', '01.00.000')).toBe(
      'builds/build-1/by-flow/ab/AB-cd-1234/01.00.000/topology.json',
    );
  });
});
