// @ts-nocheck
import { getExchangeColumns } from '@/pages/Processes/Components/Exchange/column';

jest.mock('@umijs/max', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
}));

jest.mock('antd', () => ({
  __esModule: true,
  Tooltip: ({ title, children }: any) => (
    <span data-testid='tooltip'>
      {title || ''}
      {children}
    </span>
  ),
}));

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

const mockGetFlowType = jest.fn((value: string) => `type:${value}`);

jest.mock('@/pages/LifeCycleModels/Components/toolbar/Exchange/ioPortSelect', () => ({
  __esModule: true,
  getFolwypeOfDataSetOptions: (value: string) => mockGetFlowType(value),
}));

const mockGetLangText = jest.fn((value: any) => `lang:${value}`);

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getLangText: (...args: any[]) => mockGetLangText(args[0]),
}));

const mockAlignedNumber = jest.fn(({ value }: { value: number }) => (
  <span data-testid='aligned-number'>{value}</span>
));

jest.mock('@/components/AlignedNumber', () => ({
  __esModule: true,
  default: ({ value }: any) => mockAlignedNumber({ value }),
}));

const mockQuantitativeReferenceIcon = jest.fn(({ value }: { value: boolean }) => (
  <span data-testid='quantitative-reference'>{value ? 'true' : 'false'}</span>
));

jest.mock('@/components', () => ({
  __esModule: true,
  QuantitativeReferenceIcon: ({ value }: any) => mockQuantitativeReferenceIcon({ value }),
}));

describe('getExchangeColumns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return configured columns for exchange table', () => {
    const columns = getExchangeColumns('en');

    expect(columns).toHaveLength(10);
    expect(columns[0].dataIndex).toBe('index');
    expect(columns[1].dataIndex).toBe('referenceToFlowDataSet');
    expect(columns[columns.length - 1].dataIndex).toBe('reviewType');
  });

  it('should render flow related columns with tooltips and formatters', () => {
    const columns = getExchangeColumns('en');

    const flowColumn = columns.find((column) => column.dataIndex === 'referenceToFlowDataSet');
    const typeColumn = columns.find((column) => column.dataIndex === 'typeOfDataSet');
    const refUnitColumn = columns.find((column) => column.dataIndex === 'refUnitGroup');

    const row = {
      generalComment: 'General comment',
      referenceToFlowDataSet: 'Flow A',
      typeOfDataSet: 'data-type',
      refUnitRes: {
        name: 'Flow name',
        refUnitGeneralComment: 'Unit comment',
        refUnitName: 'kg',
      },
    };

    const flowRender = flowColumn?.render?.({}, row) as any[];
    expect(toText(flowRender)).toContain('Flow A');
    expect(flowRender?.[0]?.props?.title).toBe('General comment');

    const typeRender = typeColumn?.render?.({}, row);
    expect(typeRender).toBe('type:data-type');
    expect(mockGetFlowType).toHaveBeenCalledWith('data-type');

    const refRender = refUnitColumn?.render?.({}, row) as any[];
    expect(mockGetLangText).toHaveBeenCalledWith(row.refUnitRes?.name);
    expect(toText(refRender)).toContain('lang:Flow name');
  });

  it('should render numeric and review columns with formatted components', () => {
    const columns = getExchangeColumns('en');
    const meanColumn = columns.find((column) => column.dataIndex === 'meanAmount');
    const resultColumn = columns.find((column) => column.dataIndex === 'resultingAmount');
    const quantitativeColumn = columns.find(
      (column) => column.dataIndex === 'quantitativeReference',
    );
    const reviewColumn = columns.find((column) => column.dataIndex === 'reviewType');

    const row = {
      meanAmount: 1.23,
      resultingAmount: 4.56,
      quantitativeReference: true,
      stateCode: 100,
    };

    const meanRender = meanColumn?.render?.({}, row);
    const resultRender = resultColumn?.render?.({}, row);
    const quantitativeRender = quantitativeColumn?.render?.({}, row);
    const reviewRender = reviewColumn?.render?.({}, row);

    expect(meanRender?.props?.value).toBe(1.23);
    expect(resultRender?.props?.value).toBe(4.56);
    expect(quantitativeRender?.props?.value).toBe(true);

    expect(toText(reviewRender)).toBe('Reviewed');

    const unreviewedRender = reviewColumn?.render?.({}, { stateCode: 50 } as any);
    expect(toText(unreviewedRender)).toBe('Unreviewed');

    const dashRender = reviewColumn?.render?.({}, {} as any);
    expect(toText(dashRender)).toBe('-');
  });
});
