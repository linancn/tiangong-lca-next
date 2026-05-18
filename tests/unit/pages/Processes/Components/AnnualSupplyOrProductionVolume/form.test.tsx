// @ts-nocheck
import AnnualSupplyOrProductionVolumeForm from '@/pages/Processes/Components/AnnualSupplyOrProductionVolume/form';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockGetUnitData = jest.fn(async (_idType: string, rows: any[]) => rows);
const mockFormItems: any[] = [];

const findFormItem = (name: Array<string | number>) => {
  return mockFormItems.find((item) => JSON.stringify(item.name) === JSON.stringify(name));
};

const buildForm = (value: unknown) => ({
  getFieldValue: jest.fn(() => value),
  setFieldValue: jest.fn(),
});

jest.mock('umi', () => ({
  __esModule: true,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getUnitData: (...args: any[]) => mockGetUnitData(...args),
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

  const InputNumber = ({ onChange, style }: any) => (
    <label>
      <input
        aria-label='annual-volume'
        onChange={(event) => onChange?.(event.target.value)}
        style={style}
      />
    </label>
  );
  const Input = ({ 'aria-label': ariaLabel, disabled, style, value = '' }: any) => (
    <input aria-label={ariaLabel} disabled={disabled} style={style} value={value} />
  );
  const Space = ({ children }: any) => <div>{children}</div>;
  Space.Compact = ({ children }: any) => <div data-testid='annual-volume-compact'>{children}</div>;

  return {
    __esModule: true,
    Form: FormComponent,
    Input,
    InputNumber,
    Space,
  };
});

describe('AnnualSupplyOrProductionVolumeForm', () => {
  const defaultExchangeDataSource = [
    {
      '@dataSetInternalID': '1',
      exchangeDirection: 'Output',
      quantitativeReference: true,
      referenceToFlowDataSet: {
        'common:shortDescription': [
          { '@xml:lang': 'en', '#text': 'Steel' },
          { '@xml:lang': 'zh', '#text': '钢材' },
        ],
      },
      refUnitRes: {
        refUnitName: 'kg',
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFormItems.length = 0;
    mockGetUnitData.mockImplementation(async (_idType: string, rows: any[]) => rows);
  });

  it('resolves the reference flow unit and displays the current-language suffix in a disabled input', async () => {
    mockGetUnitData.mockResolvedValueOnce([
      {
        referenceToFlowDataSetId: 'flow-1',
        referenceToFlowDataSetVersion: '01.00.000',
        refUnitRes: {
          refUnitName: 'kg',
        },
      },
    ]);
    const form = buildForm([{ '@xml:lang': 'en', '#text': '100 old suffix' }]);

    render(
      <AnnualSupplyOrProductionVolumeForm
        exchangeDataSource={[
          {
            '@dataSetInternalID': '1',
            exchangeDirection: 'Output',
            quantitativeReference: true,
            referenceToFlowDataSet: {
              '@refObjectId': 'flow-1',
              '@version': '01.00.000',
              'common:shortDescription': [
                { '@xml:lang': 'en', '#text': 'Steel' },
                { '@xml:lang': 'zh', '#text': '钢材' },
              ],
            },
          },
        ]}
        formRef={{ current: form }}
        label='Annual volume'
        lang='zh'
        name={['annualSupply']}
        onData={jest.fn()}
        rules={[{ required: true }]}
      />,
    );

    await waitFor(() => {
      expect(mockGetUnitData).toHaveBeenCalledWith('flow', [
        {
          referenceToFlowDataSetId: 'flow-1',
          referenceToFlowDataSetVersion: '01.00.000',
        },
      ]);
    });
    await waitFor(() => {
      expect(form.setFieldValue).toHaveBeenLastCalledWith(
        ['annualSupply'],
        [
          { '@xml:lang': 'en', '#text': '100 kg Steel' },
          { '@xml:lang': 'zh', '#text': '100 kg 钢材' },
        ],
      );
    });
    expect(screen.getByLabelText('annual-supply-volume-context')).toHaveValue('kg 钢材');
    expect(screen.getByLabelText('annual-supply-volume-context')).toBeDisabled();
    expect(screen.queryByLabelText('language')).not.toBeInTheDocument();
  });

  it('falls back to the raw exchange suffix when unit resolution fails', async () => {
    mockGetUnitData.mockRejectedValueOnce(new Error('unit lookup failed'));
    const form = buildForm([{ '@xml:lang': 'en', '#text': '100 old suffix' }]);

    render(
      <AnnualSupplyOrProductionVolumeForm
        exchangeDataSource={[
          {
            '@dataSetInternalID': '1',
            exchangeDirection: 'Output',
            quantitativeReference: true,
            referenceToFlowDataSet: {
              '@refObjectId': 'flow-1',
              '@version': '01.00.000',
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Steel' }],
            },
          },
        ]}
        formRef={{ current: form }}
        label='Annual volume'
        lang='en'
        name={['annualSupply']}
        onData={jest.fn()}
        rules={[{ required: true }]}
      />,
    );

    await waitFor(() => {
      expect(form.setFieldValue).toHaveBeenLastCalledWith(
        ['annualSupply'],
        [
          { '@xml:lang': 'en', '#text': '100 Steel' },
          { '@xml:lang': 'zh', '#text': '100 Steel' },
        ],
      );
    });
    expect(screen.getByLabelText('annual-supply-volume-context')).toHaveValue('Steel');
  });

  it('normalizes numeric-only input into multilingual storage and validates required values', async () => {
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
        [
          { '@xml:lang': 'en', '#text': '100 kg Steel' },
          { '@xml:lang': 'zh', '#text': '100 kg 钢材' },
        ],
      );
    });
    expect(onData).toHaveBeenCalled();
    expect(screen.getByLabelText('annual-supply-volume-context')).toHaveValue('kg Steel');

    const formItem = findFormItem(['modelling', 'annualSupply']);
    expect(formItem.getValueProps([{ '@xml:lang': 'en', '#text': '123 kg Steel' }])).toEqual({
      value: '123',
    });
    expect(formItem.getValueProps([{ '@xml:lang': 'zh', '#text': '456 kg 钢材' }])).toEqual({
      value: '456',
    });
    expect(formItem.normalize('789')).toEqual([
      { '@xml:lang': 'en', '#text': '789 kg Steel' },
      { '@xml:lang': 'zh', '#text': '789 kg 钢材' },
    ]);
    expect(formItem.normalize('abc789')).toEqual([
      { '@xml:lang': 'en', '#text': '789 kg Steel' },
      { '@xml:lang': 'zh', '#text': '789 kg 钢材' },
    ]);

    await expect(formItem.rules[0].validator(null, '')).rejects.toThrow(
      'Annual volume is required',
    );
    expect(setRuleErrorState).toHaveBeenLastCalledWith(true);
    await expect(formItem.rules[0].validator(null, '1E-')).rejects.toThrow(
      'Please enter a number.',
    );
    expect(setRuleErrorState).toHaveBeenLastCalledWith(true);
    await expect(formItem.rules[0].validator(null, '123')).resolves.toBeUndefined();
    expect(setRuleErrorState).toHaveBeenLastCalledWith(false);

    fireEvent.change(screen.getByLabelText('annual-volume'), { target: { value: '300' } });
    expect(onData).toHaveBeenCalled();
  });

  it('skips required rules for optional fields and tolerates empty or missing form state', () => {
    const form = buildForm(undefined);
    const onData = jest.fn();

    render(
      <AnnualSupplyOrProductionVolumeForm
        exchangeDataSource={[]}
        formRef={{ current: form }}
        label='Annual volume'
        lang='fr'
        name={['annualSupply']}
        onData={onData}
      />,
    );

    const formItem = findFormItem(['annualSupply']);
    expect(formItem.rules).toEqual([]);
    expect(form.setFieldValue).not.toHaveBeenCalled();
    expect(onData).not.toHaveBeenCalled();
    expect(screen.getByLabelText('annual-supply-volume-context')).toHaveValue('');

    mockFormItems.length = 0;
    render(
      <AnnualSupplyOrProductionVolumeForm
        exchangeDataSource={[]}
        formRef={{ current: undefined }}
        label='Annual volume'
        lang='en'
        name={['annualSupplyWithoutForm']}
        onData={onData}
        rules={[{ required: true }]}
      />,
    );
    expect(findFormItem(['annualSupplyWithoutForm']).rules).toHaveLength(1);
  });

  it('keeps unit and flow context blank when no reference flow exists', async () => {
    const form = buildForm([{ '@xml:lang': 'en', '#text': '100 old suffix' }]);

    render(
      <AnnualSupplyOrProductionVolumeForm
        exchangeDataSource={[]}
        formRef={{ current: form }}
        label='Annual volume'
        lang='en'
        name={['annualSupply']}
        onData={jest.fn()}
        rules={[{ required: true }]}
      />,
    );

    await waitFor(() => {
      expect(form.setFieldValue).toHaveBeenLastCalledWith(
        ['annualSupply'],
        [
          { '@xml:lang': 'en', '#text': '100' },
          { '@xml:lang': 'zh', '#text': '100' },
        ],
      );
    });
    expect(screen.getByLabelText('annual-supply-volume-context')).toHaveValue('');

    const formItem = findFormItem(['annualSupply']);
    expect(formItem.normalize('789')).toEqual([
      { '@xml:lang': 'en', '#text': '789' },
      { '@xml:lang': 'zh', '#text': '789' },
    ]);
    await expect(formItem.rules[0].validator(null, '123')).resolves.toBeUndefined();
  });

  it('keeps unit and flow context blank when exchanges exist but no reference flow is selected', async () => {
    const form = buildForm([{ '@xml:lang': 'en', '#text': '100 old suffix' }]);

    render(
      <AnnualSupplyOrProductionVolumeForm
        exchangeDataSource={[
          {
            '@dataSetInternalID': '1',
            exchangeDirection: 'Output',
            quantitativeReference: false,
            referenceToFlowDataSet: {
              '@refObjectId': 'flow-1',
              '@version': '01.00.000',
              'common:shortDescription': [
                { '@xml:lang': 'en', '#text': 'Steel' },
                { '@xml:lang': 'zh', '#text': '钢材' },
              ],
            },
            refUnitRes: {
              refUnitName: 'kg',
            },
          },
        ]}
        formRef={{ current: form }}
        label='Annual volume'
        lang='zh'
        name={['annualSupply']}
        onData={jest.fn()}
        rules={[{ required: true }]}
      />,
    );

    await waitFor(() => {
      expect(form.setFieldValue).toHaveBeenLastCalledWith(
        ['annualSupply'],
        [
          { '@xml:lang': 'en', '#text': '100' },
          { '@xml:lang': 'zh', '#text': '100' },
        ],
      );
    });
    expect(screen.getByLabelText('annual-supply-volume-context')).toHaveValue('');
  });

  it('normalizes single-object form values and uses default required validation copy', async () => {
    const form = buildForm({ '@xml:lang': 'en', '#text': '321 kg Steel' });
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

    await waitFor(() => {
      expect(form.setFieldValue).toHaveBeenCalledWith(
        ['annualSupply'],
        [
          { '@xml:lang': 'en', '#text': '321 kg Steel' },
          { '@xml:lang': 'zh', '#text': '321 kg 钢材' },
        ],
      );
    });

    const formItem = findFormItem(['annualSupply']);
    await expect(formItem.rules[0].validator(null, '')).rejects.toThrow('Please input this field!');
  });
});
