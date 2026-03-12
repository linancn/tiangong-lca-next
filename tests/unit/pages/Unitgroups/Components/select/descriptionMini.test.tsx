// @ts-nocheck
import { renderWithProviders, screen, waitFor } from '../../../../../helpers/testUtils';

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

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
}));

jest.mock('@/components/LangTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='lang-desc'>{toText(data)}</div>,
}));

const mockGetReferenceProperty = jest.fn();
const mockGetReferenceUnitGroup = jest.fn();
const mockGetReferenceUnit = jest.fn();

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  getReferenceProperty: (...args: any[]) => mockGetReferenceProperty(...args),
}));

jest.mock('@/services/flowproperties/api', () => ({
  __esModule: true,
  getReferenceUnitGroup: (...args: any[]) => mockGetReferenceUnitGroup(...args),
}));

jest.mock('@/services/unitgroups/api', () => ({
  __esModule: true,
  getReferenceUnit: (...args: any[]) => mockGetReferenceUnit(...args),
}));

jest.mock('antd', () => {
  const ConfigProvider = ({ children }: any) => <div>{children}</div>;
  const Card = ({ title, children }: any) => (
    <section>
      <div>{toText(title)}</div>
      <div>{children}</div>
    </section>
  );
  const Descriptions: any = ({ children }: any) => <div>{children}</div>;
  Descriptions.Item = ({ children }: any) => <div>{children}</div>;
  const Divider = ({ children }: any) => <div>{toText(children)}</div>;
  const Spin = ({ spinning, children }: any) => (
    <div data-testid='spin' data-spinning={String(spinning)}>
      {children}
    </div>
  );
  return {
    __esModule: true,
    Card,
    ConfigProvider,
    Descriptions,
    Divider,
    Spin,
  };
});

describe('UnitGroupDescriptionMini', () => {
  const UnitGroupDescriptionMini =
    require('@/pages/Unitgroups/Components/select/descriptionMini').default;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetReferenceProperty.mockResolvedValue({
      data: { refFlowPropertytId: 'fp-1', version: '1.2' },
    });
    mockGetReferenceUnitGroup.mockResolvedValue({
      data: {
        refUnitGroupId: 'ug-1',
        version: '2.0',
        refUnitGroupShortDescription: [{ '@xml:lang': 'en', '#text': 'Unit group short' }],
      },
    });
    mockGetReferenceUnit.mockResolvedValue({
      data: {
        refUnitName: 'kg',
        refUnitGeneralComment: [{ '@xml:lang': 'en', '#text': 'General comment' }],
      },
    });
  });

  it('loads unit-group details through the flow -> flowproperty -> unit-group chain', async () => {
    renderWithProviders(<UnitGroupDescriptionMini id='flow-1' version='1.0' idType='flow' />);

    await waitFor(() => expect(mockGetReferenceProperty).toHaveBeenCalledWith('flow-1', '1.0'));
    expect(mockGetReferenceUnitGroup).toHaveBeenCalledWith('fp-1', '1.2');
    expect(mockGetReferenceUnit).toHaveBeenCalledWith('ug-1', '2.0');
    await waitFor(() => {
      expect(screen.getAllByTestId('lang-desc')[0]).toHaveTextContent('Unit group short');
      expect(screen.getByText('kg')).toBeInTheDocument();
      expect(screen.getAllByTestId('lang-desc')[1]).toHaveTextContent('General comment');
    });
  });

  it('loads unit-group details directly when the id refers to a flow property', async () => {
    renderWithProviders(
      <UnitGroupDescriptionMini id='flow-property-1' version='3.0' idType='flowproperty' />,
    );

    await waitFor(() =>
      expect(mockGetReferenceUnitGroup).toHaveBeenCalledWith('flow-property-1', '3.0'),
    );
    expect(mockGetReferenceProperty).not.toHaveBeenCalled();
    expect(mockGetReferenceUnit).toHaveBeenCalledWith('ug-1', '2.0');
  });
});
