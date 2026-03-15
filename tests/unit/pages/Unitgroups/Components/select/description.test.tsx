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

let mockLocale = 'en-US';

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  getLocale: () => mockLocale,
}));

jest.mock('@/components/AlignedNumber', () => ({
  __esModule: true,
  toSuperscript: (value: string) => `sup:${value}`,
}));

jest.mock('@/components/LangTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='lang-desc'>{toText(data)}</div>,
}));

jest.mock('@/pages/Unitgroups/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <div data-testid='unitgroup-view'>{`${id}:${version}`}</div>,
}));

const mockGetReferenceUnit = jest.fn();

jest.mock('@/services/unitgroups/api', () => ({
  __esModule: true,
  getReferenceUnit: (...args: any[]) => mockGetReferenceUnit(...args),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  listToJson: (data: any) => (Array.isArray(data) ? (data[0] ?? {}) : (data ?? {})),
}));

jest.mock('antd', () => {
  const ConfigProvider = ({ children }: any) => <div>{children}</div>;
  const Card = ({ title, children }: any) => (
    <section>
      <div>{toText(title)}</div>
      <div>{children}</div>
    </section>
  );
  const Space = ({ children }: any) => <div>{children}</div>;
  const Descriptions: any = ({ children }: any) => <div>{children}</div>;
  Descriptions.Item = ({ children, labelStyle, styles }: any) => (
    <div data-label-style-width={labelStyle?.width} data-styles-label-width={styles?.label?.width}>
      {children}
    </div>
  );
  const Divider = ({ children }: any) => <div>{toText(children)}</div>;
  return {
    __esModule: true,
    Card,
    ConfigProvider,
    Descriptions,
    Divider,
    Space,
  };
});

describe('UnitGroupSelectDescription', () => {
  const UnitGroupSelectDescription =
    require('@/pages/Unitgroups/Components/select/description').default;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocale = 'en-US';
  });

  it('renders fallback values when no referenced unit group is provided', () => {
    renderWithProviders(<UnitGroupSelectDescription title='Unit group' data={{}} lang='en' />);

    expect(mockGetReferenceUnit).not.toHaveBeenCalled();
    expect(screen.queryByTestId('unitgroup-view')).not.toBeInTheDocument();
  });

  it('normalizes array data, loads the reference unit, and renders linked details', async () => {
    mockGetReferenceUnit.mockResolvedValue({
      data: {
        refUnitName: 'kg',
        refUnitGeneralComment: [{ '@xml:lang': 'en', '#text': 'Reference comment' }],
      },
    });

    renderWithProviders(
      <UnitGroupSelectDescription
        title='Unit group'
        lang='en'
        data={[
          {
            '@refObjectId': 'ug-1',
            '@version': '1.0',
            'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Short desc' }],
          },
        ]}
      />,
    );

    await waitFor(() => expect(mockGetReferenceUnit).toHaveBeenCalledWith('ug-1', '1.0'));
    expect(screen.getByTestId('unitgroup-view')).toHaveTextContent('ug-1:1.0');
    expect(screen.getByText('sup:kg')).toBeInTheDocument();
    expect(screen.getByText('Short desc')).toBeInTheDocument();
    expect(screen.getByText('Reference comment')).toBeInTheDocument();
  });

  it('uses the zh label width and falls back to an empty version when it is missing', async () => {
    mockLocale = 'zh-CN';
    mockGetReferenceUnit.mockResolvedValue({ data: null });

    const { container } = renderWithProviders(
      <UnitGroupSelectDescription
        title='Unit group'
        lang='zh'
        data={{
          '@refObjectId': 'ug-zh',
          'common:shortDescription': [{ '@xml:lang': 'zh', '#text': '简述' }],
        }}
      />,
    );

    await waitFor(() => expect(mockGetReferenceUnit).toHaveBeenCalledWith('ug-zh', ''));
    expect(screen.getByTestId('unitgroup-view')).toHaveTextContent('ug-zh:');
    expect(container.querySelector('[data-label-style-width="210px"]')).not.toBeNull();
    expect(screen.getAllByTestId('lang-desc')[1]).toHaveTextContent('');
  });
});
