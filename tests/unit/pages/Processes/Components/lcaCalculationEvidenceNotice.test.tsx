// @ts-nocheck
import enMessages from '@/locales/en-US/pages_process';
import zhMessages from '@/locales/zh-CN/pages_process';
import LcaCalculationEvidenceNotice, {
  isTrustedLciaGapArtifactUrl,
} from '@/pages/Processes/Components/lcaCalculationEvidenceNotice';
import { fireEvent, render, screen } from '@testing-library/react';

let mockLocale = 'en-US';
let mockMessages: Record<string, string> = enMessages;
const mockParseStaticLciaReport = jest.fn(() => null as any);

jest.mock('umi', () => ({
  __esModule: true,
  useIntl: () => ({
    locale: mockLocale,
    formatMessage: ({ id, defaultMessage }: any, values: Record<string, unknown> = {}) => {
      const template = mockMessages[id] ?? defaultMessage ?? id;
      return Object.entries(values).reduce(
        (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
        template,
      );
    },
  }),
}));

const mockCounts = { matched: 1, unmatched: 0, invalid: 0, unsupported_direction: 0 };
const mockMatrix = {
  counts: mockCounts,
  by_method: [
    {
      method_id: 'method-canonical-id',
      method_version: '01.00.000',
      artifact_locator_id: 'method-locator-id',
      counts: mockCounts,
    },
  ],
  source_snapshot_sha256: 'a'.repeat(64),
  uncharacterized_evidence: null,
};

jest.mock('@/services/lciaMethods/evidence', () => ({
  __esModule: true,
  STATIC_LCIA_METHOD_LIST: {
    files: [
      {
        id: 'method-locator-id',
        description: [
          { '@xml:lang': 'en', '#text': 'Climate method' },
          { '@xml:lang': 'zh', '#text': '气候方法' },
        ],
      },
    ],
  },
  parseStaticLciaReport: (...args: any[]) => mockParseStaticLciaReport(...args),
  resolveServiceLciaStatus: jest.fn((raw: any) => ({
    status: raw?.status ?? 'method_source_drift',
    evidence:
      raw?.evidence ??
      (raw?.status === 'complete' || raw?.status === 'incomplete_coverage'
        ? {
            schema_version: 'lca.calculation_evidence.v2',
            lcia_method_factor_source: { bundle_version: '1.2.4' },
          }
        : null),
    matrix:
      raw?.matrix ??
      (raw?.status === 'complete' || raw?.status === 'incomplete_coverage' ? mockMatrix : null),
    reason: raw?.reason ?? null,
  })),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getLangText: (value: any[], lang: string) =>
    value.find((item) => String(item['@xml:lang']).startsWith(lang))?.['#text'] ?? '',
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  DownloadOutlined: () => <span />,
}));

jest.mock('antd', () => {
  const Descriptions = ({ children }: any) => <div>{children}</div>;
  Descriptions.Item = ({ children, label }: any) => (
    <div>
      <span>{label}</span>
      {children}
    </div>
  );
  const Typography = {
    Text: ({ children }: any) => <span>{children}</span>,
  };
  return {
    __esModule: true,
    Alert: ({ message, description }: any) => (
      <div>
        {message}
        {description}
      </div>
    ),
    Button: ({ children, href, onClick }: any) =>
      href ? (
        <a href={href}>{children}</a>
      ) : (
        <button type='button' onClick={onClick}>
          {children}
        </button>
      ),
    Collapse: ({ items }: any) => (
      <div>
        {items.map((item: any) => (
          <div key={item.key}>
            {item.label}
            {item.children}
          </div>
        ))}
      </div>
    ),
    Descriptions,
    Space: ({ children }: any) => <div>{children}</div>,
    Table: ({ columns, dataSource, rowKey }: any) => (
      <div>
        {columns.map((column: any) => (
          <span key={String(column.key ?? column.dataIndex)}>{column.title}</span>
        ))}
        {dataSource.map((row: any) => (
          <div key={rowKey(row)}>
            {columns.map((column: any) =>
              column.render
                ? column.render(column.key === 'invalid' ? undefined : row[column.dataIndex], row)
                : null,
            )}
          </div>
        ))}
      </div>
    ),
    Tag: ({ children }: any) => <span>{children}</span>,
    Typography,
  };
});

describe('LcaCalculationEvidenceNotice', () => {
  beforeEach(() => {
    mockLocale = 'en-US';
    mockMessages = enMessages;
    mockParseStaticLciaReport.mockReset();
    mockParseStaticLciaReport.mockReturnValue(null);
  });

  it.each([
    ['complete', 'pages.process.lca.evidence.complete.title'],
    ['incomplete_coverage', 'pages.process.lca.evidence.incomplete.title'],
    ['calculation_failure', 'pages.process.lca.evidence.failure.title'],
    ['method_source_drift', 'pages.process.lca.evidence.drift.title'],
  ])('renders localized English copy for %s', (status, titleKey) => {
    render(<LcaCalculationEvidenceNotice calculationEvidence={{ status }} />);
    expect(screen.getByText(enMessages[titleKey])).toBeInTheDocument();
  });

  it.each([
    ['complete', 'pages.process.lca.evidence.complete.title'],
    ['incomplete_coverage', 'pages.process.lca.evidence.incomplete.title'],
    ['calculation_failure', 'pages.process.lca.evidence.failure.title'],
    ['method_source_drift', 'pages.process.lca.evidence.drift.title'],
  ])('renders localized Chinese copy for %s', (status, titleKey) => {
    mockLocale = 'zh-CN';
    mockMessages = zhMessages;
    render(<LcaCalculationEvidenceNotice calculationEvidence={{ status }} />);
    expect(screen.getByText(zhMessages[titleKey])).toBeInTheDocument();
  });

  it('shows method description with its canonical ID', () => {
    render(<LcaCalculationEvidenceNotice calculationEvidence={{ status: 'complete' }} />);
    expect(screen.getByText('Climate method')).toBeInTheDocument();
    expect(screen.getByText('method-canonical-id')).toBeInTheDocument();
  });

  it('hides unprojected production artifacts and allows only explicit development loopback URLs', () => {
    expect(isTrustedLciaGapArtifactUrl('https://artifacts.example/gaps.jsonl')).toBe(false);
    expect(isTrustedLciaGapArtifactUrl('http://localhost:54321/gaps.jsonl')).toBe(true);
    expect(isTrustedLciaGapArtifactUrl('http://127.0.0.1/gaps.jsonl')).toBe(true);
    expect(isTrustedLciaGapArtifactUrl('http://[::1]/gaps.jsonl')).toBe(true);
    expect(isTrustedLciaGapArtifactUrl('ftp://localhost/gaps.jsonl')).toBe(false);
    expect(isTrustedLciaGapArtifactUrl('http://artifacts.example/gaps.jsonl')).toBe(false);
    expect(isTrustedLciaGapArtifactUrl('/relative/gaps.jsonl')).toBe(false);
    expect(isTrustedLciaGapArtifactUrl('not-a-url')).toBe(false);
  });

  it('renders valid static evidence and the unknown fallback when no evidence parses', () => {
    mockParseStaticLciaReport.mockReturnValueOnce({
      calculation_status: 'complete',
      method_factor_coverage: mockMatrix,
      failure_reason: null,
      source: { bundle_version: '1.2.4' },
    });
    const { unmount } = render(<LcaCalculationEvidenceNotice staticEvidence={{ report: true }} />);
    expect(
      screen.getByText(enMessages['pages.process.lca.evidence.complete.title']),
    ).toBeInTheDocument();
    unmount();

    render(<LcaCalculationEvidenceNotice />);
    expect(
      screen.getByText(enMessages['pages.process.lca.evidence.drift.title']),
    ).toBeInTheDocument();
    expect(
      screen.getByText(enMessages['pages.process.lca.evidence.matrix.missing']),
    ).toBeInTheDocument();
  });

  it('downloads normalized JSON evidence and inline gap JSONL', () => {
    const createObjectURL = jest.fn(() => 'blob:evidence');
    const revokeObjectURL = jest.fn();
    (URL as any).createObjectURL = createObjectURL;
    (URL as any).revokeObjectURL = revokeObjectURL;
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const matrix = {
      ...mockMatrix,
      counts: { matched: 0, unmatched: 1, invalid: 1, unsupported_direction: 0 },
      by_method: [
        {
          ...mockMatrix.by_method[0],
          artifact_locator_id: 'unknown-locator',
          counts: { matched: 0, unmatched: 1, invalid: 1, unsupported_direction: 0 },
        },
      ],
      uncharacterized_evidence: {
        artifact_url: 'https://artifacts.example/gaps.jsonl',
        artifact_sha256: 'e'.repeat(64),
        record_count: 1,
      },
      uncharacterized_exchanges: [{ reason: 'missing_factor', exchange_id: 'exchange-1' }],
    };
    render(
      <LcaCalculationEvidenceNotice
        calculationEvidence={{
          status: 'incomplete_coverage',
          reason: 'conflicting_parallel_method_coverage_source',
          matrix,
        }}
      />,
    );

    fireEvent.click(screen.getByText(enMessages['pages.process.lca.evidence.download.json']));
    fireEvent.click(
      screen.getByText(
        enMessages['pages.process.lca.evidence.download.gaps'].replace('{count}', '1'),
      ),
    );
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(click).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
    expect(
      screen.getByText(enMessages['pages.process.lca.evidence.method.unnamed']),
    ).toBeInTheDocument();
  });

  it('exposes only loopback artifacts and tolerates an absent locale', () => {
    mockLocale = undefined as any;
    const matrix = {
      ...mockMatrix,
      counts: { matched: 0, unmatched: 1, invalid: 0, unsupported_direction: 0 },
      uncharacterized_evidence: {
        artifact_url: 'http://localhost:54321/gaps.jsonl',
        artifact_sha256: 'e'.repeat(64),
        record_count: 1,
      },
    };
    render(
      <LcaCalculationEvidenceNotice
        calculationEvidence={{ status: 'incomplete_coverage', matrix }}
      />,
    );
    expect(
      screen.getByText(
        enMessages['pages.process.lca.evidence.download.artifact'].replace('{count}', '1'),
      ),
    ).toHaveAttribute('href', 'http://localhost:54321/gaps.jsonl');
  });
});
