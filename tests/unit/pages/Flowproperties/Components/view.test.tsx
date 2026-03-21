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

const mockGetFlowpropertyDetail = jest.fn();
const mockGenFlowpropertyFromData = jest.fn();
const mockGetClassificationValues = jest.fn(() => ['flowproperty-class']);
const mockListToJson = jest.fn((value: any) =>
  Array.isArray(value) ? (value[0] ?? {}) : (value ?? {}),
);

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  getLocale: () => 'en-US',
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close-icon</span>,
  ProfileOutlined: () => <span>profile-icon</span>,
}));

jest.mock('@/components/LangTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='lang-desc'>{toText(data)}</div>,
}));

jest.mock('@/components/LevelTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='level-desc'>{toText(data)}</div>,
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

jest.mock('@/pages/Utils', () => ({
  __esModule: true,
  getClassificationValues: (...args: any[]) => mockGetClassificationValues(...args),
}));

jest.mock('@/services/flowproperties/api', () => ({
  __esModule: true,
  getFlowpropertyDetail: (...args: any[]) => mockGetFlowpropertyDetail(...args),
}));

jest.mock('@/services/flowproperties/util', () => ({
  __esModule: true,
  genFlowpropertyFromData: (...args: any[]) => mockGenFlowpropertyFromData(...args),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  listToJson: (...args: any[]) => mockListToJson(...args),
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
        data-container={String(getContainer?.() === globalThis.document?.body)}
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
  const Card = ({ tabList = [], activeTabKey, onTabChange, title, children }: any) => (
    <section>
      {title ? <div>{toText(title)}</div> : null}
      <div data-testid='active-tab'>{activeTabKey}</div>
      <div>
        {tabList.map((tab: any) => (
          <button type='button' key={tab.key} onClick={() => onTabChange?.(tab.key)}>
            {toText(tab.tab)}
          </button>
        ))}
      </div>
      <div>{children}</div>
    </section>
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

describe('FlowpropertyView', () => {
  const FlowpropertyView = require('@/pages/Flowproperties/Components/view').default;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFlowpropertyDetail.mockResolvedValue({
      data: { json: { flowPropertyDataSet: { from: 'api' } } },
    });
    mockGenFlowpropertyFromData.mockReturnValue({
      flowPropertiesInformation: {
        dataSetInformation: {
          'common:UUID': 'fp-1',
          'common:name': [{ '@xml:lang': 'en', '#text': 'Flow property name' }],
          'common:synonyms': [{ '@xml:lang': 'en', '#text': 'synonym' }],
          'common:generalComment': [{ '@xml:lang': 'en', '#text': 'Flow property comment' }],
          classificationInformation: {
            'common:classification': { 'common:class': ['flowproperty-class'] },
          },
        },
        quantitativeReference: {
          referenceToReferenceUnitGroup: { '@refObjectId': 'ug-1', '@version': '1.0' },
        },
      },
      modellingAndValidation: {
        dataSourcesTreatmentAndRepresentativeness: {
          referenceToDataSource: { '@refObjectId': 'source-1', '@version': '1.0' },
        },
        complianceDeclarations: {
          compliance: {
            'common:referenceToComplianceSystem': {
              '@refObjectId': 'source-2',
              '@version': '1.0',
            },
            'common:approvalOfOverallCompliance': 'Fully compliant',
          },
        },
      },
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': '2024-01-01',
          'common:referenceToDataSetFormat': { '@refObjectId': 'source-3', '@version': '1.0' },
        },
        publicationAndOwnership: {
          'common:dataSetVersion': '1.0',
          'common:referenceToPrecedingDataSetVersion': {},
          'common:referenceToOwnershipOfDataSet': {
            '@refObjectId': 'contact-1',
            '@version': '1.0',
          },
          'common:permanentDataSetURI': 'uri:flowproperty',
        },
      },
    });
  });

  it('loads flow-property detail data and renders all three tabs', async () => {
    renderWithProviders(<FlowpropertyView id='fp-1' version='1.0' lang='en' buttonType='icon' />);

    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(mockGetFlowpropertyDetail).toHaveBeenCalledWith('fp-1', '1.0'));
    expect(mockGenFlowpropertyFromData).toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: /View Flow property/i })).toBeInTheDocument();
    expect(screen.getByTestId('unitgroup-desc')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Modelling and validation/i }));
    expect(screen.getAllByTestId('source-desc').length).toBeGreaterThan(0);
    expect(screen.getByText('Fully compliant')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Administrative information/i }));
    expect(screen.getByTestId('contact-desc')).toBeInTheDocument();
    expect(screen.getByText('1.0')).toBeInTheDocument();
  });

  it('opens from the text trigger and closes through both close actions', async () => {
    renderWithProviders(<FlowpropertyView id='fp-2' version='2.0' lang='en' buttonType='text' />);

    await userEvent.click(screen.getByRole('button', { name: 'View' }));

    await waitFor(() => expect(mockGetFlowpropertyDetail).toHaveBeenCalledWith('fp-2', '2.0'));
    expect(screen.getByRole('dialog', { name: /View Flow property/i })).toHaveAttribute(
      'data-container',
      'true',
    );

    await userEvent.click(screen.getByRole('button', { name: 'close-icon' }));
    expect(screen.queryByRole('dialog', { name: /View Flow property/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'View' }));
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /View Flow property/i })).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByRole('dialog', { name: /View Flow property/i })).not.toBeInTheDocument();
  });

  it('falls back to empty classification data and sparse detail payloads without crashing', async () => {
    mockGetFlowpropertyDetail.mockResolvedValueOnce({ data: {} });
    mockGetClassificationValues.mockReturnValue(undefined);
    mockGenFlowpropertyFromData.mockReturnValueOnce({
      flowPropertiesInformation: {
        dataSetInformation: {},
        quantitativeReference: {},
      },
      modellingAndValidation: {},
      administrativeInformation: {},
    });

    renderWithProviders(<FlowpropertyView id='fp-3' version='3.0' lang='en' buttonType='text' />);

    await userEvent.click(screen.getByRole('button', { name: 'View' }));

    await waitFor(() => expect(mockGetFlowpropertyDetail).toHaveBeenCalledWith('fp-3', '3.0'));
    expect(mockGenFlowpropertyFromData).toHaveBeenCalledWith({});
    expect(mockGetClassificationValues).toHaveBeenLastCalledWith(undefined);
    expect(screen.getByRole('dialog', { name: /View Flow property/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Flow property information/i }));
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});
