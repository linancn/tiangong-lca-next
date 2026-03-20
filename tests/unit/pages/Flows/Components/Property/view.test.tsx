// @ts-nocheck
import PropertyView from '@/pages/Flows/Components/Property/view';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close</span>,
  ProfileOutlined: () => <span>view-icon</span>,
}));

jest.mock('@/components/QuantitativeReferenceIcon', () => ({
  __esModule: true,
  default: ({ value }: any) => <span>{value ? 'quantitative-yes' : 'quantitative-no'}</span>,
}));

jest.mock('@/pages/Flowproperties/Components/select/description', () => ({
  __esModule: true,
  default: ({ data, lang, title }: any) => (
    <div data-testid='flowproperty-description'>
      {`${lang}:${data?.['@refObjectId']}:${title?.props?.defaultMessage ?? title}`}
    </div>
  ),
}));

jest.mock('antd', () => {
  const ConfigProvider = ({ children }: any) => <>{children}</>;
  const Button = ({ children, onClick, disabled, icon }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
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
        data-container={String(Boolean(getContainer?.()))}
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
  const Descriptions: any = ({ children }: any) => <dl>{children}</dl>;
  Descriptions.Item = ({ label, children }: any) => (
    <div>
      <dt>{toText(label)}</dt>
      <dd>{children}</dd>
    </div>
  );

  return {
    __esModule: true,
    Button,
    ConfigProvider,
    Descriptions,
    Drawer,
    Tooltip,
  };
});

describe('FlowPropertyView', () => {
  it('renders the selected property details in the drawer', async () => {
    renderWithProviders(
      <PropertyView
        id='1'
        data={
          [
            {
              '@dataSetInternalID': '1',
              referenceToFlowPropertyDataSet: { '@refObjectId': 'fp-1' },
              meanValue: '10',
              quantitativeReference: true,
            },
          ] as any
        }
        lang='en'
        buttonType='text'
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /view/i }));

    expect(screen.getByRole('dialog', { name: /view exchange/i })).toBeInTheDocument();
    expect(screen.getByTestId('flowproperty-description')).toHaveTextContent(
      'en:fp-1:Flow property',
    );
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('quantitative-yes')).toBeInTheDocument();
  });

  it('shows placeholders and closes the drawer when the property is missing', async () => {
    renderWithProviders(<PropertyView id='missing' data={[]} lang='en' buttonType='icon' />);

    await userEvent.click(screen.getByRole('button'));
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    expect(screen.getByRole('dialog', { name: /view exchange/i })).toHaveAttribute(
      'data-container',
      'true',
    );

    await userEvent.click(screen.getAllByRole('button', { name: /close/i })[0]);
    expect(screen.queryByRole('dialog', { name: /view exchange/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getAllByRole('button', { name: /^close$/i })[1]);
    expect(screen.queryByRole('dialog', { name: /view exchange/i })).not.toBeInTheDocument();
  });
});
