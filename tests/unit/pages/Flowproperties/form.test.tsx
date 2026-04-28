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
const mockGetRules = jest.fn(() => []);
const sourceSelectCalls: any[] = [];
const contactSelectCalls: any[] = [];
const unitGroupSelectCalls: any[] = [];
let mockSdkValidationCountsByTab: Record<string, number> = {};
let mockThemeToken = {
  colorError: '#ff4d4f',
  colorPrimary: '#1677ff',
  fontWeightStrong: 600,
};

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@/pages/Utils/validation/formSupport', () => ({
  __esModule: true,
  useDatasetSdkValidationFormSupport: () => ({
    sdkValidationCountsByTab: mockSdkValidationCountsByTab,
  }),
}));

jest.mock('antd', () => {
  const React = require('react');

  const ConfigProvider = ({ children }: any) => <div>{children}</div>;

  const Card = ({ tabList = [], onTabChange, children }: any) => (
    <div>
      <div role='tablist'>
        {tabList.map((tab: any) => (
          <button key={tab.key} type='button' onClick={() => onTabChange?.(tab.key)}>
            {tab.tab}
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
      token: mockThemeToken,
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
  default: ({ label }: any) => <span>{toText(label)}</span>,
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
  default: (props: any) => (
    <button
      type='button'
      onClick={() => {
        contactSelectCalls.push(props);
        props.onData?.();
      }}
    >
      {toText(props.label)}
    </button>
  ),
}));

jest.mock('@/pages/Sources/Components/select/form', () => ({
  __esModule: true,
  default: (props: any) => (
    <button
      type='button'
      onClick={() => {
        sourceSelectCalls.push(props);
        props.onData?.();
      }}
    >
      {toText(props.label)}
    </button>
  ),
}));

jest.mock('@/pages/Unitgroups/Components/select/form', () => ({
  __esModule: true,
  default: (props: any) => (
    <button
      type='button'
      onClick={() => {
        unitGroupSelectCalls.push(props);
        props.onData?.();
      }}
    >
      {toText(props.label)}
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
  getRules: (...args: any[]) => mockGetRules(...args),
}));

describe('FlowpropertyForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sourceSelectCalls.length = 0;
    contactSelectCalls.length = 0;
    unitGroupSelectCalls.length = 0;
    mockSdkValidationCountsByTab = {};
    mockThemeToken = {
      colorError: '#ff4d4f',
      colorPrimary: '#1677ff',
      fontWeightStrong: 600,
    };
  });

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

  it('passes create-mode default sources to modelling and administrative tabs', async () => {
    const formRef = {
      current: {
        setFieldsValue: jest.fn(),
        setFieldValue: jest.fn(),
        getFieldsValue: jest.fn(() => ({})),
      },
    };

    const { rerender } = renderWithProviders(
      <FlowpropertyForm
        lang='en'
        activeTabKey='modellingAndValidation'
        drawerVisible={true}
        formRef={formRef as any}
        onData={jest.fn()}
        onTabChange={jest.fn()}
        formType='create'
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Compliance system name/i }));
    expect(sourceSelectCalls[sourceSelectCalls.length - 1].defaultSourceName).toBe(
      'ILCD Data Network - compliance (non-Process)',
    );

    rerender(
      <FlowpropertyForm
        lang='en'
        activeTabKey='administrativeInformation'
        drawerVisible={true}
        formRef={formRef as any}
        onData={jest.fn()}
        onTabChange={jest.fn()}
        formType='create'
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Data set format\(s\)/i }));
    expect(sourceSelectCalls[sourceSelectCalls.length - 1].defaultSourceName).toBe('ILCD format');
  });

  it('marks the unit group field as required and disables version editing in createVersion mode', async () => {
    const formRef = {
      current: {
        setFieldsValue: jest.fn(),
        setFieldValue: jest.fn(),
        getFieldsValue: jest.fn(() => ({})),
      },
    };

    const { rerender } = renderWithProviders(
      <FlowpropertyForm
        lang='en'
        activeTabKey='flowPropertiesInformation'
        drawerVisible={true}
        formRef={formRef as any}
        onData={jest.fn()}
        onTabChange={jest.fn()}
        formType='create'
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Reference unit/i }));
    expect(unitGroupSelectCalls[unitGroupSelectCalls.length - 1].showRequiredLabel).toBe(true);

    rerender(
      <FlowpropertyForm
        lang='en'
        activeTabKey='administrativeInformation'
        drawerVisible={true}
        formRef={formRef as any}
        onData={jest.fn()}
        onTabChange={jest.fn()}
        formType='createVersion'
      />,
    );

    expect(
      screen.getAllByRole('textbox').every((element) => element.hasAttribute('disabled')),
    ).toBe(true);

    rerender(
      <FlowpropertyForm
        lang='en'
        activeTabKey='administrativeInformation'
        drawerVisible={true}
        formRef={formRef as any}
        onData={jest.fn()}
        onTabChange={jest.fn()}
        formType='create'
      />,
    );

    expect(
      screen.getAllByRole('textbox').some((element) => !element.hasAttribute('disabled')),
    ).toBe(true);
  });

  it('derives schema rules when showRules is enabled', async () => {
    mockGetRules.mockImplementation((rules: any) => [{ source: rules }]);

    const formRef = {
      current: {
        setFieldsValue: jest.fn(),
        setFieldValue: jest.fn(),
        getFieldsValue: jest.fn(() => ({})),
      },
    };

    const { rerender } = renderWithProviders(
      <FlowpropertyForm
        lang='en'
        activeTabKey='flowPropertiesInformation'
        drawerVisible={true}
        formRef={formRef as any}
        onData={jest.fn()}
        onTabChange={jest.fn()}
        formType='create'
        showRules
      />,
    );

    expect(mockGetRules).toHaveBeenCalledTimes(9);

    await userEvent.click(screen.getByRole('button', { name: /Reference unit/i }));
    expect(unitGroupSelectCalls[unitGroupSelectCalls.length - 1].rules).toEqual(
      expect.arrayContaining([expect.objectContaining({ source: expect.anything() })]),
    );

    rerender(
      <FlowpropertyForm
        lang='en'
        activeTabKey='modellingAndValidation'
        drawerVisible={true}
        formRef={formRef as any}
        onData={jest.fn()}
        onTabChange={jest.fn()}
        formType='create'
        showRules
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Compliance system name/i }));
    expect(sourceSelectCalls[sourceSelectCalls.length - 1].rules).toEqual(
      expect.arrayContaining([expect.objectContaining({ source: expect.anything() })]),
    );

    rerender(
      <FlowpropertyForm
        lang='en'
        activeTabKey='administrativeInformation'
        drawerVisible={true}
        formRef={formRef as any}
        onData={jest.fn()}
        onTabChange={jest.fn()}
        formType='create'
        showRules
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Data set format(s)' }));
    expect(sourceSelectCalls[sourceSelectCalls.length - 1].rules).toEqual(
      expect.arrayContaining([expect.objectContaining({ source: expect.anything() })]),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Owner of data set' }));
    expect(contactSelectCalls[contactSelectCalls.length - 1].rules).toEqual(
      expect.arrayContaining([expect.objectContaining({ source: expect.anything() })]),
    );
  });

  it('highlights tabs with sdk validation issues using the error color token', () => {
    mockSdkValidationCountsByTab = {
      modellingAndValidation: 1,
    };

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
        onData={jest.fn()}
        onTabChange={jest.fn()}
        formType='create'
      />,
    );

    expect(screen.getByText('Modelling and validation')).toHaveStyle({
      color: '#ff4d4f',
      fontWeight: '600',
    });
  });

  it('falls back to the primary color when sdk-highlighted tabs have no explicit error color token', () => {
    mockSdkValidationCountsByTab = {
      administrativeInformation: 1,
    };
    mockThemeToken = {
      ...mockThemeToken,
      colorError: undefined,
    } as any;

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
        onData={jest.fn()}
        onTabChange={jest.fn()}
        formType='create'
      />,
    );

    expect(screen.getByText('Administrative information')).toHaveStyle({
      color: '#1677ff',
      fontWeight: '600',
    });
  });
});
