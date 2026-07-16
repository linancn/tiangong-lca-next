import CalculationBundlePanel, {
  artifactForProcess,
  artifactInlineByteSize,
  formatBundleNumber,
  processOptionLabel,
  recordsToCsv,
} from '@/pages/DataProcessing/CalculationBundlePanel';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('antd', () => require('../../../mocks/antd').createAntdMock());
jest.mock('@ant-design/icons', () =>
  require('../../../mocks/antDesignIcons').createAntDesignIconsMock(),
);
jest.mock('@umijs/max', () => ({
  __esModule: true,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

const mockGetCalculationBundle = jest.fn();
const mockFetchRecords = jest.fn();
const mockFetchText = jest.fn();

jest.mock('@/services/lcaReleases', () => ({
  __esModule: true,
  getCalculationBundle: (...args: any[]) => mockGetCalculationBundle(...args),
  fetchCalculationBundleRecords: (...args: any[]) => mockFetchRecords(...args),
  fetchCalculationBundleArtifactText: (...args: any[]) => mockFetchText(...args),
}));

const processRows = [
  {
    processIndex: 0,
    rootProcess: { id: '11111111-1111-4111-8111-111111111111', version: '01.00.000' },
    quantitativeReference: {
      exchangeInternalId: '0',
      flow: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', version: '01.00.000' },
      direction: 'Output',
      referenceUnit: 'kg',
      meanAmount: 1,
    },
  },
  {
    processIndex: 1,
    rootProcess: { id: '22222222-2222-4222-8222-222222222222', version: '02.00.000' },
    quantitativeReference: {
      exchangeInternalId: '0',
      flow: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', version: '01.00.000' },
      direction: 'Output',
      referenceUnit: 'MJ',
      meanAmount: 1,
    },
  },
];

const artifact = (kind: string, overrides: Record<string, unknown> = {}) => ({
  kind,
  path: `${kind}.ndjson.gz`,
  schemaVersion: `test.${kind}`,
  mediaType: kind === 'coverage' ? 'application/json' : 'application/x-ndjson',
  compression: kind === 'coverage' ? 'none' : 'gzip',
  sha256: kind.repeat(64).slice(0, 64),
  byteSize: 100,
  recordCount: 2,
  firstProcessIndex: 0,
  lastProcessIndex: 1,
  signedDownloadUrl: `https://download.example/${kind}`,
  signedDownloadExpiresInSeconds: 900,
  ...overrides,
});

const bundleProjection = (overrides: Record<string, any> = {}) => ({
  packageId: '33333333-3333-4333-8333-333333333333',
  packageVersion: '01.00.000',
  snapshotId: '44444444-4444-4444-8444-444444444444',
  resultId: '55555555-5555-4555-8555-555555555555',
  calculationBundle: {
    bundleContentHash: 'a'.repeat(64),
    manifestSha256: 'b'.repeat(64),
    manifestByteSize: 1000,
    artifactCount: 4,
    manifest: {
      schemaVersion: 'tiangong.calculation-bundle.v1',
      calculationContractVersion: '1.0.0',
      calculationId: '66666666-6666-4666-8666-666666666666',
      bundleContentHash: 'a'.repeat(64),
      scope: {
        coverageMode: 'global_eligible',
        processCount: 2,
        selectionManifestHash: 'c'.repeat(64),
      },
      snapshot: {
        id: '44444444-4444-4444-8444-444444444444',
        sha256: 'd'.repeat(64),
        processCount: 2,
        flowCount: 3,
        impactCount: 25,
      },
      solver: {},
      methodSet: {
        methodIdentityManifestSha256: 'e'.repeat(64),
        factorManifestSha256: 'f'.repeat(64),
      },
      artifacts: [],
      calculationEvidence: {},
      hashes: {},
    },
    manifestDownload: {
      sha256: 'b'.repeat(64),
      byteSize: 1000,
      mediaType: 'application/json',
      signedDownloadUrl: 'https://download.example/manifest',
      signedDownloadExpiresInSeconds: 900,
    },
    artifacts: [artifact('process_axis'), artifact('lci'), artifact('lcia'), artifact('coverage')],
    ...overrides,
  },
});

describe('CalculationBundlePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCalculationBundle.mockResolvedValue({ data: bundleProjection(), error: null });
    mockFetchText.mockResolvedValue(JSON.stringify({ complete: true }));
    mockFetchRecords.mockImplementation(async (item: any) => {
      if (item.kind === 'process_axis') return processRows;
      if (item.kind === 'lci') {
        return [
          {
            processIndex: 0,
            flow: { id: 'flow-0', version: '01.00.000' },
            direction: 'Output',
            unit: 'kg',
            location: null,
            meanAmount: 0.000001,
          },
          {
            processIndex: 1,
            flow: { id: 'flow-1', version: '01.00.000' },
            direction: 'Input',
            unit: 'm3',
            location: 'CN',
            meanAmount: 12.5,
          },
        ];
      }
      return [
        { processIndex: 0, method: { id: 'method-0', version: '01.00.000' }, meanAmount: 0 },
        { processIndex: 1, method: { id: 'method-1', version: '01.00.000' }, meanAmount: 42 },
      ];
    });
    (URL as any).createObjectURL = jest.fn(() => 'blob:result');
    (URL as any).revokeObjectURL = jest.fn();
    HTMLAnchorElement.prototype.click = jest.fn();
  });

  it('covers deterministic display and export helpers', () => {
    expect(artifactForProcess([artifact('lci') as any], 'lci', 1)?.kind).toBe('lci');
    expect(artifactForProcess([artifact('lci') as any], 'lcia', 1)).toBeUndefined();
    expect(artifactInlineByteSize(artifact('lci') as any)).toBe(100);
    expect(
      artifactInlineByteSize(artifact('lci', { uncompressedByteSize: 30 * 1024 * 1024 }) as any),
    ).toBe(30 * 1024 * 1024);
    expect(formatBundleNumber(Number.NaN)).toBe('-');
    expect(formatBundleNumber(0)).toBe('0');
    expect(formatBundleNumber(1_000_000)).toBe('1.000000e+6');
    expect(formatBundleNumber(0.5)).toBe('0.50000000');
    expect(processOptionLabel(processRows[0] as any)).toContain('#0');
    expect(
      recordsToCsv(
        ['a', 'b'],
        [
          ['quoted,value', 'a"b'],
          [null, undefined],
        ],
      ),
    ).toBe('a,b\n"quoted,value","a""b"\n,\n');
  });

  it('shows directional LCI, LCIA, evidence, exports, and verified downloads', async () => {
    render(
      <CalculationBundlePanel
        packageId='33333333-3333-4333-8333-333333333333'
        initialProcessId='22222222-2222-4222-8222-222222222222'
        initialProcessVersion='02.00.000'
      />,
    );

    expect(await screen.findByText('Calculation Bundle')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('flow-1')).toBeInTheDocument());
    expect(screen.getByText('CN')).toBeInTheDocument();
    expect(screen.getByText('12.500000')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-lcia'));
    expect(await screen.findByText('method-1')).toBeInTheDocument();
    expect(screen.getByText('42.000000')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-evidence'));
    expect(screen.getByText('e'.repeat(64))).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('tab-downloads'));
    expect(screen.getByText('calculation-bundle.json')).toBeInTheDocument();
    expect(screen.getByText('lci.ndjson.gz')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-lci'));
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export JSON' }));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(2);

    fireEvent.change(screen.getByLabelText('Process'), { target: { value: '0' } });
    await waitFor(() => expect(screen.getByText('flow-0')).toBeInTheDocument());
    expect(screen.getByText('-')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh secure links' }));
    await waitFor(() => expect(mockGetCalculationBundle).toHaveBeenCalledTimes(2));
  });

  it('renders legacy and generic load failures with a retry path', async () => {
    mockGetCalculationBundle
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'calculation_bundle_not_available', message: 'legacy' },
      })
      .mockResolvedValueOnce({ data: null, error: { code: 'upstream_failed', message: 'offline' } })
      .mockResolvedValueOnce({ data: null, error: null });
    const { rerender } = render(<CalculationBundlePanel packageId='legacy-package' />);
    expect(await screen.findByText(/Legacy LCIA-only/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('offline')).toBeInTheDocument();

    rerender(<CalculationBundlePanel packageId='missing-package' />);
    expect(await screen.findByText('Calculation Bundle is unavailable.')).toBeInTheDocument();
  });

  it('fails closed for corrupt axes, missing chunks, oversized chunks, and record errors', async () => {
    mockGetCalculationBundle.mockResolvedValueOnce({
      data: bundleProjection({
        artifacts: [
          artifact('process_axis', { uncompressedByteSize: 25 * 1024 * 1024 }),
          artifact('lci'),
          artifact('lcia'),
          artifact('coverage'),
        ],
      }),
      error: null,
    });
    const { rerender } = render(<CalculationBundlePanel packageId='large-axis' />);
    expect(await screen.findByText(/too large for inline preview/)).toBeInTheDocument();

    mockFetchRecords.mockRejectedValueOnce('corrupt process axis');
    rerender(<CalculationBundlePanel packageId='corrupt' />);
    expect(await screen.findByText('corrupt process axis')).toBeInTheDocument();

    mockGetCalculationBundle.mockResolvedValueOnce({
      data: bundleProjection({ artifacts: [artifact('process_axis'), artifact('coverage')] }),
      error: null,
    });
    mockFetchRecords.mockResolvedValueOnce(processRows);
    rerender(<CalculationBundlePanel packageId='missing-chunks' />);
    expect(await screen.findByText(/result chunks are incomplete/)).toBeInTheDocument();

    mockGetCalculationBundle.mockResolvedValueOnce({
      data: bundleProjection({
        artifacts: [
          artifact('process_axis'),
          artifact('lci', { uncompressedByteSize: 25 * 1024 * 1024 }),
          artifact('lcia'),
          artifact('coverage'),
        ],
      }),
      error: null,
    });
    mockFetchRecords.mockResolvedValueOnce(processRows);
    rerender(<CalculationBundlePanel packageId='large' />);
    expect(await screen.findByText(/too large for inline preview/)).toBeInTheDocument();

    mockGetCalculationBundle.mockResolvedValueOnce({ data: bundleProjection(), error: null });
    mockFetchRecords
      .mockResolvedValueOnce(processRows)
      .mockRejectedValueOnce(new Error('record download expired'));
    rerender(<CalculationBundlePanel packageId='expired' />);
    expect(await screen.findByText('record download expired')).toBeInTheDocument();
  });
});
