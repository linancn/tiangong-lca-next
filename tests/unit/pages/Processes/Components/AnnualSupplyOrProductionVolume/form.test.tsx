// @ts-nocheck
import AnnualSupplyOrProductionVolumeForm from '@/pages/Processes/Components/AnnualSupplyOrProductionVolume/form';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockMessageError = jest.fn();
const mockFormItems: any[] = [];
let mockListFields: any[] = [{ key: 0, name: 0 }];
let mockListOperations: any;

const textOf = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return textOf(node.props.children);
  return '';
};

const findFormItem = (name: Array<string | number>) => {
  return mockFormItems.find((item) => JSON.stringify(item.name) === JSON.stringify(name));
};

const buildForm = (value: unknown) => ({
  getFieldValue: jest.fn(() => value),
  setFieldValue: jest.fn(),
});

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: ({ onClick, style }: any) => (
    <button type='button' aria-label='remove-language' onClick={onClick} style={style}>
      remove
    </button>
  ),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getLangText: (value: any, lang: string) => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      return (
        value.find((item) => item?.['@xml:lang'] === lang)?.['#text'] ??
        value.find((item) => item?.['#text'])?.['#text'] ??
        ''
      );
    }
    return value?.['#text'] ?? '';
  },
}));

jest.mock('antd', () => {
  const FormComponent = ({ children }: any) => <form>{children}</form>;
  const FormItem = (props: any) => {
    mockFormItems.push(props);
    return (
      <div data-testid={props.name ? `form-item-${props.name.join('.')}` : 'form-item'}>
        {props.children}
      </div>
    );
  };
  FormComponent.Item = FormItem;
  FormComponent.List = ({ children, name, rules = [] }: any) => {
    mockFormItems.push({ name, rules, list: true });
    mockListOperations = {
      add: jest.fn(),
      remove: jest.fn(),
    };
    return <div data-testid='form-list'>{children(mockListFields, mockListOperations)}</div>;
  };

  const Button = ({ children, disabled, onClick }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {textOf(children)}
    </button>
  );
  const Col = ({ children }: any) => <div>{children}</div>;
  const Row = ({ children }: any) => <div>{children}</div>;
  const InputNumber = ({ onChange, suffix }: any) => (
    <label>
      <span>{suffix}</span>
      <input aria-label='annual-volume' onChange={(event) => onChange?.(event)} />
    </label>
  );
  const Select = ({ onChange, options = [] }: any) => (
    <select aria-label='language' onChange={(event) => onChange?.(event.target.value)}>
      {options.map((option: any) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );

  return {
    __esModule: true,
    Button,
    Col,
    Form: FormComponent,
    InputNumber,
    Row,
    Select,
    message: {
      error: (...args: any[]) => mockMessageError(...args),
    },
  };
});

describe('AnnualSupplyOrProductionVolumeForm', () => {
  const defaultExchangeDataSource = [
    {
      '@dataSetInternalID': '1',
      exchangeDirection: 'Output',
      quantitativeReference: true,
      referenceToFlowDataSet: {
        'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Steel' }],
      },
      refUnitRes: {
        refUnitName: 'kg',
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFormItems.length = 0;
    mockListFields = [{ key: 0, name: 0 }];
    mockListOperations = undefined;
    global.requestAnimationFrame = (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    };
  });

  it('normalizes persisted text, exposes numeric input helpers, and validates required entries', async () => {
    const form = buildForm([{ '@xml:lang': 'en', '#text': '100 old suffix' }]);
    const onData = jest.fn();
    const setRuleErrorState = jest.fn();

    render(
      <AnnualSupplyOrProductionVolumeForm
        exchangeDataSource={defaultExchangeDataSource}
        formRef={{ current: form }}
        label='Annual volume'
        lang='en'
        name={['modelling', 'annualSupply']}
        onData={onData}
        rules={[
          {
            required: true,
            messageKey: 'annual.required',
            defaultMessage: 'Annual volume is required',
          },
        ]}
        setRuleErrorState={setRuleErrorState}
      />,
    );

    await waitFor(() => {
      expect(form.setFieldValue).toHaveBeenCalledWith(
        ['modelling', 'annualSupply'],
        [{ '@xml:lang': 'en', '#text': '100 kg Steel' }],
      );
    });
    expect(onData).toHaveBeenCalled();
    expect(screen.getByText('kg Steel')).toBeInTheDocument();

    const textItem = findFormItem([0, '#text']);
    expect(textItem.getValueProps('123 kg Steel')).toEqual({ value: '123' });
    expect(textItem.getValueProps('abc kg Steel')).toEqual({ value: '' });
    expect(textItem.normalize('456')).toBe('456 kg Steel');
    expect(textItem.normalize('abc789')).toBe('789 kg Steel');

    await expect(textItem.rules[0].validator(null, '')).rejects.toThrow(
      'Annual volume is required',
    );
    await expect(textItem.rules[0].validator(null, 123)).rejects.toThrow(
      'Annual volume is required',
    );
    await expect(textItem.rules[0].validator(null, 'abc')).rejects.toThrow(
      'Please enter a number; the reference flow suffix is added automatically.',
    );
    await expect(textItem.rules[0].validator(null, '456 kg Steel')).resolves.toBeUndefined();

    const langItem = findFormItem([0, '@xml:lang']);
    await expect(langItem.rules[0].validator(null, undefined)).rejects.toThrow(
      'Please select a language!',
    );
    await expect(langItem.rules[0].validator(null, 'en')).resolves.toBeUndefined();
    expect(setRuleErrorState).toHaveBeenLastCalledWith(false);

    const listItem = mockFormItems.find((item) => item.list);
    await expect(listItem.rules[0].validator(null, null)).resolves.toBeUndefined();
    await expect(listItem.rules[0].validator(null, [])).resolves.toBeUndefined();
    await expect(listItem.rules[0].validator(null, [{ '#text': '' }])).resolves.toBeUndefined();
    await expect(
      listItem.rules[0].validator(null, [{ '@xml:lang': 'zh', '#text': '100 kg Steel' }]),
    ).rejects.toThrow();
    expect(setRuleErrorState).toHaveBeenLastCalledWith(true);
    await expect(
      listItem.rules[0].validator(null, [{ '@xml:lang': 'en', '#text': '100 kg Steel' }]),
    ).resolves.toBeUndefined();
    expect(setRuleErrorState).toHaveBeenLastCalledWith(false);
  });

  it('shows the message fallback when the required language validator has no grouped error setter', async () => {
    const form = buildForm([{ '@xml:lang': 'zh', '#text': '100 old suffix' }]);

    render(
      <AnnualSupplyOrProductionVolumeForm
        exchangeDataSource={defaultExchangeDataSource}
        formRef={{ current: form }}
        label='Annual volume'
        lang='zh'
        name={['annualSupply']}
        onData={jest.fn()}
        rules={[{ required: true }]}
      />,
    );

    const listItem = mockFormItems.find((item) => item.list);
    const textItem = findFormItem([0, '#text']);
    await expect(textItem.rules[0].validator(null, '')).rejects.toThrow('Please input this field!');
    await expect(
      listItem.rules[0].validator(null, [{ '@xml:lang': 'zh', '#text': '100 kg Steel' }]),
    ).rejects.toThrow();
    expect(mockMessageError).toHaveBeenCalledWith('English is a required language!');
  });

  it('adds and removes language rows while protecting the final required row', () => {
    const form = buildForm([{ '@xml:lang': 'en', '#text': '100 kg Steel' }]);
    const onData = jest.fn();

    render(
      <AnnualSupplyOrProductionVolumeForm
        exchangeDataSource={defaultExchangeDataSource}
        formRef={{ current: form }}
        label='Annual volume'
        lang='en'
        name={['annualSupply']}
        onData={onData}
        rules={[{ required: true }]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'remove-language' }));
    expect(mockListOperations.remove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '+ Add Annual volume Item' }));
    expect(mockListOperations.add).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalled();
  });

  it('removes non-final rows and wires input and select change callbacks', () => {
    mockListFields = [
      { key: 0, name: 0 },
      { key: 1, name: 1 },
    ];
    const form = buildForm([
      { '@xml:lang': 'en', '#text': '100 kg Steel' },
      { '@xml:lang': 'zh', '#text': '200 kg Steel' },
    ]);
    const onData = jest.fn();

    render(
      <AnnualSupplyOrProductionVolumeForm
        exchangeDataSource={defaultExchangeDataSource}
        formRef={{ current: form }}
        label='Annual volume'
        lang='en'
        name={['annualSupply']}
        onData={onData}
        rules={[{ required: true }]}
      />,
    );

    fireEvent.change(screen.getAllByLabelText('annual-volume')[0], { target: { value: '300' } });
    fireEvent.change(screen.getAllByLabelText('language')[0], { target: { value: 'zh' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'remove-language' })[0]);

    expect(mockListOperations.remove).toHaveBeenCalledWith(0);
    expect(onData).toHaveBeenCalledTimes(3);
  });

  it('auto-adds the initial required row and tolerates missing form instances', () => {
    mockListFields = [];
    const onData = jest.fn();

    render(
      <AnnualSupplyOrProductionVolumeForm
        exchangeDataSource={[]}
        formRef={{ current: undefined }}
        label='Annual volume'
        lang='fr'
        name={['annualSupply']}
        onData={onData}
        rules={[{ required: true }]}
      />,
    );

    expect(mockListOperations.add).toHaveBeenCalledTimes(1);
    expect(onData).not.toHaveBeenCalled();
  });

  it('skips required rules for optional fields and wraps non-array form values', () => {
    const form = buildForm({ '#text': '100 old suffix' });

    render(
      <AnnualSupplyOrProductionVolumeForm
        exchangeDataSource={defaultExchangeDataSource}
        formRef={{ current: form }}
        label='Annual volume'
        lang='en'
        name={['annualSupply']}
        onData={jest.fn()}
      />,
    );

    const listItem = mockFormItems.find((item) => item.list);
    expect(listItem.rules).toEqual([]);
    expect(findFormItem([0, '#text']).rules).toEqual([]);
    expect(findFormItem([0, '@xml:lang']).rules).toEqual([]);
  });

  it('falls back to the english suffix when the current language is unavailable', () => {
    const form = buildForm(undefined);

    render(
      <AnnualSupplyOrProductionVolumeForm
        exchangeDataSource={[]}
        formRef={{ current: form }}
        label='Annual volume'
        lang='fr'
        name={['annualSupply']}
        onData={jest.fn()}
        rules={[{ required: true }]}
      />,
    );

    expect(screen.getByText('reference flow')).toBeInTheDocument();
  });
});
