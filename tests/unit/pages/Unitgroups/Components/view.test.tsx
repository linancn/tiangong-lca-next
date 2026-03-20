// @ts-nocheck
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.['#text']) return String(node['#text']);
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

const mockGetUnitGroupDetail = jest.fn();
const mockGenUnitGroupFromData = jest.fn();
const mockGenUnitTableData = jest.fn();
const mockJsonToList = jest.fn((value: any) =>
  Array.isArray(value) ? value : value ? [value] : [],
);
const mockGetClassificationValues = jest.fn(() => ['classification-a', 'classification-b']);

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close-icon</span>,
  ProfileOutlined: () => <span>profile-icon</span>,
}));

jest.mock('@/components/AlignedNumber', () => ({
  __esModule: true,
  toSuperscript: (value: string) => `sup:${value}`,
}));

jest.mock('@/components/LangTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='lang-desc'>{toText(data)}</div>,
}));

jest.mock('@/components/LevelTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='level-desc'>{toText(data)}</div>,
}));

jest.mock('@/components/QuantitativeReferenceIcon', () => ({
  __esModule: true,
  default: ({ value }: any) => <div data-testid='quant-ref'>{String(value)}</div>,
}));

jest.mock('@/pages/Contacts/Components/select/description', () => ({
  __esModule: true,
  default: () => <div data-testid='contact-desc'>contact-desc</div>,
}));

jest.mock('@/pages/Sources/Components/select/description', () => ({
  __esModule: true,
  default: () => <div data-testid='source-desc'>source-desc</div>,
}));

jest.mock('@/pages/Unitgroups/Components/select/description', () => ({
  __esModule: true,
  default: () => <div data-testid='unitgroup-desc'>unitgroup-desc</div>,
}));

jest.mock('@/pages/Unitgroups/Components/Unit/view', () => ({
  __esModule: true,
  default: ({ id }: any) => <div data-testid='unit-view'>{id}</div>,
}));

jest.mock('@/pages/Utils', () => ({
  __esModule: true,
  getClassificationValues: (...args: any[]) => mockGetClassificationValues(...args),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  jsonToList: (...args: any[]) => mockJsonToList(...args),
}));

jest.mock('@/services/unitgroups/api', () => ({
  __esModule: true,
  getUnitGroupDetail: (...args: any[]) => mockGetUnitGroupDetail(...args),
}));

jest.mock('@/services/unitgroups/util', () => ({
  __esModule: true,
  genUnitGroupFromData: (...args: any[]) => mockGenUnitGroupFromData(...args),
  genUnitTableData: (...args: any[]) => mockGenUnitTableData(...args),
}));

jest.mock('antd', () => {
  const ConfigProvider = ({ children }: any) => <div>{children}</div>;
  const Button = ({ children, onClick, disabled, icon }: any) => (
    <button type='button' onClick={disabled ? undefined : onClick} disabled={disabled}>
      {icon}
      {toText(children)}
    </button>
  );
  const Tooltip = ({ children }: any) => <>{children}</>;
  const Drawer = ({ open, title, extra, children, onClose, getContainer }: any) =>
    open ? (
      <section
        role='dialog'
        aria-label={toText(title) || 'drawer'}
        data-container={getContainer?.() === globalThis.document?.body ? 'body' : 'custom'}
      >
        <header>
          <div>{extra}</div>
          <button type='button' onClick={onClose}>
            close
          </button>
        </header>
        <div>{children}</div>
      </section>
    ) : null;
  const Card = ({ tabList = [], activeTabKey, onTabChange, children }: any) => (
    <div data-testid='card' data-active-key={activeTabKey}>
      <div>
        {tabList.map((tab: any) => (
          <button type='button' key={tab.key} onClick={() => onTabChange?.(tab.key)}>
            {toText(tab.tab)}
          </button>
        ))}
      </div>
      <div>{children}</div>
    </div>
  );
  const Descriptions: any = ({ children }: any) => <div>{children}</div>;
  Descriptions.Item = ({ children }: any) => <div>{children}</div>;
  const Divider = ({ children }: any) => <div>{toText(children)}</div>;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Spin = ({ spinning, children }: any) => (
    <div data-testid='spin' data-spinning={String(spinning)}>
      {children}
    </div>
  );
  return {
    __esModule: true,
    Button,
    Card,
    ConfigProvider,
    Descriptions,
    Divider,
    Drawer,
    Space,
    Spin,
    Tooltip,
  };
});

jest.mock('@ant-design/pro-components', () => {
  const ProTable = ({ dataSource = [], columns = [], toolBarRender }: any) => (
    <div data-testid='pro-table'>
      <div data-testid='pro-table-toolbar'>{toText(toolBarRender?.())}</div>
      {dataSource.map((row: any, index: number) => (
        <div key={row.dataSetInternalID ?? index}>
          {columns.map((column: any, columnIndex: number) =>
            typeof column.render === 'function' ? (
              <div key={column.dataIndex ?? columnIndex}>
                {column.render(row[column.dataIndex], row, index)}
              </div>
            ) : null,
          )}
        </div>
      ))}
    </div>
  );

  return {
    __esModule: true,
    ActionType: class {},
    ProColumns: class {},
    ProTable,
  };
});

describe('UnitGroupView', () => {
  const UnitGroupView = require('@/pages/Unitgroups/Components/view').default;
  const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUnitGroupDetail.mockResolvedValue({
      data: {
        json: {
          unitGroupDataSet: {
            from: 'api',
          },
        },
      },
    });
    mockGenUnitGroupFromData.mockReturnValue({
      unitGroupInformation: {
        dataSetInformation: {
          'common:UUID': 'ug-1',
          'common:name': [{ '@xml:lang': 'en', '#text': 'Unit group name' }],
          'common:generalComment': [{ '@xml:lang': 'en', '#text': 'General comment' }],
          classificationInformation: {
            'common:classification': {
              'common:class': ['classification-a', 'classification-b'],
            },
          },
        },
      },
      modellingAndValidation: {
        complianceDeclarations: {
          compliance: {
            'common:referenceToComplianceSystem': {
              '@refObjectId': 'source-1',
              '@version': '1.0',
            },
            'common:approvalOfOverallCompliance': 'Fully compliant',
          },
        },
      },
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': '2024-01-01',
          'common:referenceToDataSetFormat': { '@refObjectId': 'source-2', '@version': '1.0' },
        },
        publicationAndOwnership: {
          'common:dataSetVersion': '2.0',
          'common:referenceToOwnershipOfDataSet': {
            '@refObjectId': 'contact-1',
            '@version': '1.0',
          },
          'common:referenceToPrecedingDataSetVersion': {
            '@refObjectId': 'ug-0',
            '@version': '0.9',
          },
          'common:permanentDataSetURI': 'https://example.com/unitgroup',
        },
      },
      units: {
        unit: [
          {
            '@dataSetInternalID': 'unit-1',
            name: 'kg',
            generalComment: 'Unit comment',
            meanValue: '1',
            quantitativeReference: true,
          },
        ],
      },
    });
    mockGenUnitTableData.mockReturnValue([
      {
        dataSetInternalID: 'unit-1',
        name: 'kg',
        generalComment: 'Unit comment',
        meanValue: '1',
        quantitativeReference: true,
      },
    ]);
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  it('loads detail data and renders unit group tabs, nested references, and unit rows', async () => {
    renderWithProviders(<UnitGroupView id='ug-1' version='1.0' lang='en' buttonType='icon' />);

    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(mockGetUnitGroupDetail).toHaveBeenCalledWith('ug-1', '1.0'));
    expect(mockGenUnitGroupFromData).toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: /View Unit group/i })).toBeInTheDocument();
    expect(screen.getByTestId('level-desc')).toHaveTextContent('classification-a');
    expect(screen.getByTestId('level-desc')).toHaveTextContent('classification-b');

    await userEvent.click(screen.getByRole('button', { name: /Modelling and validation/i }));
    expect(screen.getAllByTestId('source-desc').length).toBeGreaterThan(0);
    expect(screen.getByText('Fully compliant')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Administrative information/i }));
    expect(screen.getByTestId('contact-desc')).toBeInTheDocument();
    expect(screen.getByTestId('unitgroup-desc')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^Units$/i }));
    expect(screen.getByTestId('pro-table')).toBeInTheDocument();
    expect(screen.getByTestId('pro-table-toolbar')).toBeEmptyDOMElement();
    expect(screen.getByTestId('unit-view')).toHaveTextContent('unit-1');
  });

  it('supports the text trigger, fallback labels, drawer close handlers, and sparse datasets', async () => {
    mockGetUnitGroupDetail.mockResolvedValueOnce({
      data: null,
    });
    mockGenUnitGroupFromData.mockReturnValue({
      unitGroupInformation: {
        dataSetInformation: {
          'common:UUID': undefined,
          'common:name': [],
          'common:generalComment': undefined,
          classificationInformation: {
            'common:classification': {
              'common:class': [],
            },
          },
        },
      },
      modellingAndValidation: {
        complianceDeclarations: {
          compliance: {
            'common:approvalOfOverallCompliance': 'unknown-value',
          },
        },
      },
      administrativeInformation: {
        dataEntryBy: {},
        publicationAndOwnership: {},
      },
      units: {
        unit: null,
      },
    });
    mockGenUnitTableData.mockReturnValue([]);

    renderWithProviders(<UnitGroupView id='ug-2' version='2.0' lang='en' buttonType='text' />);

    await userEvent.click(screen.getByRole('button', { name: /^View$/i }));

    await waitFor(() => expect(mockGetUnitGroupDetail).toHaveBeenCalledWith('ug-2', '2.0'));
    expect(screen.getByRole('dialog', { name: /View Unit group/i })).toHaveAttribute(
      'data-container',
      'body',
    );

    await userEvent.click(screen.getByRole('button', { name: /Modelling and validation/i }));
    expect(screen.getByText('-')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Administrative information/i }));
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: /^Units$/i }));
    expect(screen.getByTestId('pro-table')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button')[1]);
    expect(screen.queryByRole('dialog', { name: /View Unit group/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^View$/i }));
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /View Unit group/i })).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByRole('dialog', { name: /View Unit group/i })).not.toBeInTheDocument();
  });
});
