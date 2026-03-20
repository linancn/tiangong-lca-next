// @ts-nocheck
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

jest.mock('@/components/AlignedNumber', () => ({
  __esModule: true,
  toSuperscript: (value: string) => `sup:${value}`,
}));

jest.mock('@/components/LangTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='lang-desc'>{toText(data)}</div>,
}));

jest.mock('@/components/QuantitativeReferenceIcon', () => ({
  __esModule: true,
  default: ({ value }: any) => <div data-testid='quant-ref'>{String(value)}</div>,
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close-icon</span>,
  ProfileOutlined: () => <span>profile-icon</span>,
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
        data-container={getContainer?.() === globalThis.document?.body ? 'body' : 'unknown'}
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
  const Descriptions: any = ({ children }: any) => <div>{children}</div>;
  Descriptions.Item = ({ children }: any) => <div>{children}</div>;
  const Divider = ({ children }: any) => <div>{toText(children)}</div>;
  return {
    __esModule: true,
    Button,
    ConfigProvider,
    Descriptions,
    Divider,
    Drawer,
    Tooltip,
  };
});

describe('UnitView', () => {
  const UnitView = require('@/pages/Unitgroups/Components/Unit/view').default;

  it('opens the matching unit from the supplied data list', async () => {
    renderWithProviders(
      <UnitView
        id='unit-1'
        buttonType='icon'
        data={[
          {
            '@dataSetInternalID': 'unit-1',
            name: 'kg',
            generalComment: 'Kilogram comment',
            meanValue: '1',
            quantitativeReference: true,
          },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('dialog', { name: /View Unit/i })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /View Unit/i })).toHaveAttribute(
      'data-container',
      'body',
    );
    expect(screen.getByText('sup:kg')).toBeInTheDocument();
    expect(screen.getByText('Kilogram comment')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByTestId('quant-ref')).toHaveTextContent('true');
  });

  it('falls back to placeholders when the unit id cannot be found', async () => {
    renderWithProviders(<UnitView id='missing' buttonType='text' data={[]} />);

    await userEvent.click(screen.getByRole('button', { name: /^view$/i }));

    expect(screen.getByRole('dialog', { name: /View Unit/i })).toBeInTheDocument();
    expect(screen.getByText('sup:-')).toBeInTheDocument();
    expect(screen.getByTestId('quant-ref')).toHaveTextContent('false');
  });

  it('closes through both the extra close button and drawer onClose handler', async () => {
    renderWithProviders(
      <UnitView
        id='unit-1'
        buttonType='icon'
        data={[
          {
            '@dataSetInternalID': 'unit-1',
            name: 'kg',
            generalComment: 'Kilogram comment',
            meanValue: '1',
            quantitativeReference: true,
          },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog', { name: /View Unit/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /close-icon/i }));
    expect(screen.queryByRole('dialog', { name: /View Unit/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /profile-icon/i }));
    expect(screen.getByRole('dialog', { name: /View Unit/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^close$/i }));
    expect(screen.queryByRole('dialog', { name: /View Unit/i })).not.toBeInTheDocument();
  });
});
