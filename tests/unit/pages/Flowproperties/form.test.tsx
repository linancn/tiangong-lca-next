// @ts-nocheck
import { FlowpropertyForm } from '@/pages/Flowproperties/Components/form';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../helpers/testUtils';

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

jest.mock('antd', () => {
  const React = require('react');

  const ConfigProvider = ({ children }: any) => <div>{children}</div>;

  const Card = ({ tabList = [], onTabChange, children }: any) => (
    <div>
      <div role='tablist'>
        {tabList.map((tab: any) => (
          <button key={tab.key} type='button' onClick={() => onTabChange?.(tab.key)}>
            {toText(tab.tab)}
          </button>
        ))}
      </div>
      <div>{children}</div>
    </div>
  );

  const Form = ({ children }: any) => <form>{children}</form>;
  Form.Item = ({ label, children }: any) => (
    <label>
      <span>{toText(label)}</span>
      {children}
    </label>
  );

  const Input = ({ value = '', onChange, ...rest }: any) => (
    <input
      value={value}
      onChange={(event) => onChange?.({ target: { value: event.target.value } })}
      {...rest}
    />
  );

  const Select = ({ value = '', onChange, options = [] }: any) => (
    <select value={value} onChange={(event) => onChange?.(event.target.value)}>
      {options.map((option: any) => (
        <option key={option.value ?? option} value={option.value ?? option}>
          {option.label ?? option.value ?? option}
        </option>
      ))}
    </select>
  );

  const Space = ({ children }: any) => <div>{children}</div>;
  const theme = {
    useToken: () => ({
      token: {
        colorError: '#ff4d4f',
      },
    }),
  };

  return {
    __esModule: true,
    Card,
    Form,
    Input,
    Select,
    Space,
    theme,
    ConfigProvider,
  };
});

jest.mock('@/components/RequiredMark', () => ({
  __esModule: true,
  default: ({ label }: any) => <span>{label}</span>,
}));

jest.mock('@/components/LangTextItem/form', () => ({
  __esModule: true,
  default: ({ label }: any) => <div>{toText(label)}</div>,
}));

jest.mock('@/components/LevelTextItem/form', () => ({
  __esModule: true,
  default: ({ onData }: any) => (
    <button type='button' onClick={() => onData?.()}>
      LevelTextItem
    </button>
  ),
}));

jest.mock('@/pages/Contacts/Components/select/form', () => ({
  __esModule: true,
  default: ({ label, onData }: any) => (
    <button type='button' onClick={() => onData?.()}>
      {toText(label)}
    </button>
  ),
}));

jest.mock('@/pages/Sources/Components/select/form', () => ({
  __esModule: true,
  default: ({ label, onData }: any) => (
    <button type='button' onClick={() => onData?.()}>
      {toText(label)}
    </button>
  ),
}));

jest.mock('@/pages/Unitgroups/Components/select/form', () => ({
  __esModule: true,
  default: ({ label, onData }: any) => (
    <button type='button' onClick={() => onData?.()}>
      {toText(label)}
    </button>
  ),
}));

jest.mock('@/pages/Flowproperties/Components/optiondata', () => ({
  __esModule: true,
  complianceOptions: [
    { label: 'Option A', value: 'A' },
    { label: 'Option B', value: 'B' },
  ],
}));

jest.mock('@/pages/Utils', () => ({
  __esModule: true,
  getRules: jest.fn(() => []),
}));

describe('FlowpropertyForm', () => {
  it('renders tabs and forwards tab changes and data callbacks', async () => {
    const onTabChange = jest.fn();
    const onData = jest.fn();
    const formRef = {
      current: {
        setFieldsValue: jest.fn(),
        setFieldValue: jest.fn(),
        getFieldsValue: jest.fn(() => ({})),
      },
    };

    renderWithProviders(
      <FlowpropertyForm
        lang='en'
        activeTabKey='flowPropertiesInformation'
        drawerVisible={true}
        formRef={formRef as any}
        onData={onData}
        onTabChange={onTabChange}
        formType='create'
      />,
    );

    expect(screen.getByRole('button', { name: /Flow property information/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Modelling and validation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Administrative information/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /LevelTextItem/i }));
    expect(onData).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /Modelling and validation/i }));
    expect(onTabChange).toHaveBeenCalledWith('modellingAndValidation');

    await userEvent.click(screen.getByRole('button', { name: /Administrative information/i }));
    expect(onTabChange).toHaveBeenCalledWith('administrativeInformation');
  });
});
