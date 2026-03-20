// @ts-nocheck
import { LifeCycleModelForm } from '@/pages/LifeCycleModels/Components/form';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../../helpers/testUtils';

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
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
}));

jest.mock('@/pages/Utils', () => ({
  __esModule: true,
  getRules: jest.fn((rules: any) => rules ?? []),
}));

jest.mock('@/components/LangTextItem/form', () => ({
  __esModule: true,
  default: ({ name, label, rules }: any) => (
    <div data-testid='lang-text-form'>
      {JSON.stringify({
        name,
        label: label?.props?.defaultMessage ?? label,
        rulesCount: rules?.length ?? 0,
      })}
    </div>
  ),
}));

jest.mock('@/components/LevelTextItem/form', () => ({
  __esModule: true,
  default: ({ name, dataType, onData }: any) => (
    <button type='button' data-testid='level-text-form' onClick={onData}>
      {JSON.stringify({ name, dataType })}
    </button>
  ),
}));

jest.mock('@/components/RequiredMark', () => ({
  __esModule: true,
  default: ({ label, showError }: any) => (
    <div data-testid='required-mark'>{`${toText(label)}:${showError}`}</div>
  ),
}));

jest.mock('@/pages/Contacts/Components/select/form', () => ({
  __esModule: true,
  default: ({ name, label, rules, showRequiredLabel }: any) => (
    <div data-testid='contact-select'>
      {JSON.stringify({
        name,
        label: label?.props?.defaultMessage ?? label,
        rulesCount: rules?.length ?? 0,
        showRequiredLabel: !!showRequiredLabel,
      })}
    </div>
  ),
}));

jest.mock('@/pages/Sources/Components/select/form', () => ({
  __esModule: true,
  default: ({ name, label, defaultSourceName, onData }: any) => (
    <button type='button' data-testid='source-select' onClick={onData}>
      {JSON.stringify({
        name,
        label: label?.props?.defaultMessage ?? label,
        defaultSourceName,
      })}
    </button>
  ),
}));

jest.mock('@/pages/Processes/Components/Compliance/form', () => ({
  __esModule: true,
  default: ({ name, showRules }: any) => (
    <div data-testid='compliance-form'>{JSON.stringify({ name, showRules })}</div>
  ),
}));

jest.mock('@/pages/Processes/Components/Review/form', () => ({
  __esModule: true,
  default: ({ name, type, showRules }: any) => (
    <div data-testid='review-form'>{JSON.stringify({ name, type, showRules })}</div>
  ),
}));

jest.mock('antd', () => {
  const React = require('react');

  const ConfigProvider = ({ children }: any) => <div>{children}</div>;

  const Card = ({ children, title, tabList = [], activeTabKey, onTabChange, style }: any) => (
    <section style={style}>
      {title ? <header>{toText(title)}</header> : null}
      {tabList.length > 0 ? (
        <div>
          {tabList.map((tab: any) => (
            <button
              type='button'
              key={tab.key}
              data-active={tab.key === activeTabKey}
              onClick={() => onTabChange?.(tab.key)}
            >
              {toText(tab.tab)}
            </button>
          ))}
        </div>
      ) : null}
      <div>{children}</div>
    </section>
  );

  const Space = ({ children }: any) => <div>{children}</div>;

  const Form = ({ children }: any) => <form>{children}</form>;
  Form.Item = ({ children, label }: any) => {
    const labelText = toText(label);
    if (React.isValidElement(children)) {
      return (
        <label>
          <span>{labelText}</span>
          {React.cloneElement(children, {
            'aria-label': children.props['aria-label'] ?? labelText,
          })}
        </label>
      );
    }
    return (
      <div>
        <span>{labelText}</span>
        {children}
      </div>
    );
  };

  const Input = (props: any) => <input {...props} />;
  const Select = ({ options = [] }: any) => (
    <div data-testid='select'>{options.map((option: any) => toText(option.label)).join(',')}</div>
  );

  const theme = {
    useToken: () => ({
      token: {
        colorTextDescription: '#999',
      },
    }),
  };

  return {
    __esModule: true,
    Card,
    ConfigProvider,
    Form,
    Input,
    Select,
    Space,
    theme,
  };
});

describe('LifeCycleModelForm', () => {
  const baseProps = {
    lang: 'en',
    formRef: { current: undefined },
    onData: jest.fn(),
    onTabChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the information tab and wires classification/source helpers', async () => {
    renderWithProviders(
      <LifeCycleModelForm {...baseProps} activeTabKey='lifeCycleModelInformation' />,
    );

    expect(screen.getByTestId('level-text-form')).toHaveTextContent('"dataType":"LifeCycleModel"');
    expect(screen.getAllByTestId('source-select')).toHaveLength(2);
    expect(screen.getAllByTestId('source-select')[0]).toHaveTextContent(
      '"label":"Data set report, background info"',
    );
    expect(screen.getAllByTestId('source-select')[1]).toHaveTextContent(
      '"label":"Life cycle model diagramm(s) or screenshot(s)"',
    );

    await userEvent.click(screen.getByTestId('level-text-form'));
    expect(baseProps.onData).toHaveBeenCalledTimes(1);
  });

  it('uses the create default source and disables dataset version during createVersion', () => {
    renderWithProviders(
      <LifeCycleModelForm
        {...baseProps}
        activeTabKey='administrativeInformation'
        formType='create'
        actionType='createVersion'
      />,
    );

    expect(screen.getAllByRole('textbox')[1]).toBeDisabled();
    expect(screen.getByTestId('source-select')).toHaveTextContent(
      '"defaultSourceName":"ILCD format"',
    );
    expect(screen.getAllByTestId('contact-select')[0]).toHaveTextContent(
      '"showRequiredLabel":true',
    );
  });

  it('keeps dataset version editable and does not inject the create default source otherwise', () => {
    renderWithProviders(
      <LifeCycleModelForm
        {...baseProps}
        activeTabKey='administrativeInformation'
        formType='edit'
      />,
    );

    expect(screen.getAllByRole('textbox')[1]).not.toBeDisabled();
    expect(screen.getByTestId('source-select')).not.toHaveTextContent('ILCD format');
  });

  it('renders validation and compliance child forms with lifecycle paths', () => {
    const { rerender } = renderWithProviders(
      <LifeCycleModelForm {...baseProps} activeTabKey='validation' showRules />,
    );

    expect(screen.getByTestId('review-form')).toHaveTextContent(
      '"name":["modellingAndValidation","validation","review"]',
    );
    expect(screen.getByTestId('review-form')).toHaveTextContent('"type":"reviewReport"');
    expect(screen.getByTestId('review-form')).toHaveTextContent('"showRules":true');

    rerender(<LifeCycleModelForm {...baseProps} activeTabKey='complianceDeclarations' showRules />);

    expect(screen.getByTestId('compliance-form')).toHaveTextContent(
      '"name":["modellingAndValidation","complianceDeclarations","compliance"]',
    );
    expect(screen.getByTestId('compliance-form')).toHaveTextContent('"showRules":true');
  });

  it('switches tabs through the card tab list callback', async () => {
    const onTabChange = jest.fn();

    renderWithProviders(
      <LifeCycleModelForm
        {...baseProps}
        activeTabKey='lifeCycleModelInformation'
        onTabChange={onTabChange}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /^validation$/i }));
    expect(onTabChange).toHaveBeenCalledWith('validation');

    await userEvent.click(screen.getByRole('button', { name: /compliance declarations/i }));
    expect(onTabChange).toHaveBeenCalledWith('complianceDeclarations');
  });

  it('adds schema-driven rules on information fields when showRules is enabled', () => {
    renderWithProviders(
      <LifeCycleModelForm {...baseProps} activeTabKey='lifeCycleModelInformation' showRules />,
    );

    expect(screen.getAllByTestId('lang-text-form')[0]).not.toHaveTextContent('"rulesCount":0');
  });
});
