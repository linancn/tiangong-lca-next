// @ts-nocheck
import PropertyEdit from '@/pages/Flows/Components/Property/edit';
import userEvent from '@testing-library/user-event';
import {
  act,
  renderWithProviders,
  screen,
  waitFor,
  within,
} from '../../../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

let lastFormApi: any = null;

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close</span>,
  FormOutlined: () => <span>edit</span>,
}));

jest.mock('@/style/custom.less', () => ({
  __esModule: true,
  default: { footer_right: 'footer-right' },
}));

jest.mock('@/components/LangTextItem/form', () => ({
  __esModule: true,
  default: () => <div data-testid='lang-form'>lang-form</div>,
}));

jest.mock('@/pages/Flowproperties/Components/select/form', () => ({
  __esModule: true,
  default: ({ onData }: any) => (
    <button type='button' onClick={() => onData?.()}>
      select-flowproperty
    </button>
  ),
}));

jest.mock('@/pages/Utils', () => ({
  __esModule: true,
  getRules: jest.fn(() => []),
}));

const { getRules } = jest.requireMock('@/pages/Utils') as {
  getRules: jest.Mock;
};

jest.mock('@/pages/Flows/Components/optiondata', () => ({
  __esModule: true,
  dataDerivationTypeStatusOptions: [{ value: 'measured', label: 'Measured' }],
  uncertaintyDistributionTypeOptions: [{ value: 'normal', label: 'Normal' }],
}));

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const mergeDeep = (target: any, source: any) => {
    const next = { ...(target ?? {}) };
    Object.entries(source ?? {}).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        next[key] = mergeDeep(next[key], value);
      } else {
        next[key] = value;
      }
    });
    return next;
  };

  const ProForm = ({
    formRef,
    initialValues,
    onValuesChange,
    onFinish,
    submitter,
    children,
  }: any) => {
    const normalizedInitialValues = React.useMemo(() => initialValues ?? {}, [initialValues]);
    const [values, setValues] = React.useState<any>(normalizedInitialValues);
    const errorMapRef = React.useRef<Map<string, string[]>>(new Map());
    const valuesRef = React.useRef<any>(normalizedInitialValues);
    const initialValuesRef = React.useRef<any>(normalizedInitialValues);
    const onValuesChangeRef = React.useRef(onValuesChange);
    const onFinishRef = React.useRef(onFinish);

    const serializeName = (name: any) =>
      Array.isArray(name) ? name.map(String).join('.') : String(name ?? '');

    React.useEffect(() => {
      initialValuesRef.current = normalizedInitialValues;
      valuesRef.current = normalizedInitialValues;
      setValues(normalizedInitialValues);
    }, [normalizedInitialValues]);

    React.useEffect(() => {
      valuesRef.current = values;
    }, [values]);

    React.useEffect(() => {
      onValuesChangeRef.current = onValuesChange;
    }, [onValuesChange]);

    React.useEffect(() => {
      onFinishRef.current = onFinish;
    }, [onFinish]);

    const getFieldErrorMockRef = React.useRef(
      jest.fn((name: any) => errorMapRef.current.get(serializeName(name)) ?? []),
    );
    const setFieldsMockRef = React.useRef(
      jest.fn((fields: Array<{ errors?: string[]; name: Array<string | number> }>) => {
        fields.forEach((field) => {
          errorMapRef.current.set(serializeName(field.name), [...(field.errors ?? [])]);
        });
      }),
    );
    const scrollToFieldMockRef = React.useRef(jest.fn());
    const formApiRef = React.useRef<any>();

    if (!formApiRef.current) {
      formApiRef.current = {
        submit: async () => onFinishRef.current?.(),
        resetFields: () => {
          const nextInitialValues = initialValuesRef.current ?? {};
          valuesRef.current = nextInitialValues;
          setValues(nextInitialValues);
        },
        getFieldsValue: () => valuesRef.current,
        getFieldError: getFieldErrorMockRef.current,
        setFields: setFieldsMockRef.current,
        setFieldsValue: (next: any) => {
          if (next === undefined) {
            onValuesChangeRef.current?.({}, undefined);
            return;
          }
          setValues((prev: any) => {
            const merged = mergeDeep(prev, next);
            valuesRef.current = merged;
            onValuesChangeRef.current?.({}, merged);
            return merged;
          });
        },
        scrollToField: scrollToFieldMockRef.current,
      };
    }

    React.useEffect(() => {
      if (!formRef) return;
      formRef.current = formApiRef.current;
      lastFormApi = formApiRef.current;
    }, [formRef]);

    return (
      <form>
        {children}
        {submitter?.render?.()}
      </form>
    );
  };

  return {
    __esModule: true,
    ActionType: class {},
    ProForm,
    ProFormInstance: class {},
  };
});

jest.mock('antd', () => {
  const ConfigProvider = ({ children }: any) => <>{children}</>;
  const Button = ({ children, onClick, disabled, icon }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {icon}
      {toText(children)}
    </button>
  );

  const Drawer = ({ open, title, extra, footer, onClose, children, getContainer }: any) => {
    if (!open) return null;
    getContainer?.();
    return (
      <section role='dialog' aria-label={toText(title) || 'drawer'}>
        <header>{extra}</header>
        <div>{children}</div>
        <footer>{footer}</footer>
        <button type='button' onClick={onClose}>
          close
        </button>
      </section>
    );
  };

  const Tooltip = ({ children }: any) => <>{children}</>;
  const Card = ({ children, title }: any) => (
    <section>
      <header>{toText(title)}</header>
      <div>{children}</div>
    </section>
  );
  const Form: any = ({ children }: any) => <form>{children}</form>;
  Form.Item = ({ label, children }: any) => (
    <label>
      <span>{toText(label)}</span>
      {children}
    </label>
  );
  const Input = () => <input />;
  const InputNumber = () => <input />;
  const Select = () => <select />;
  const Switch = () => <input type='checkbox' />;
  const Space = ({ children, className }: any) => <div className={className}>{children}</div>;

  return {
    __esModule: true,
    Button,
    Card,
    ConfigProvider,
    Drawer,
    Form,
    Input,
    InputNumber,
    Select,
    Space,
    Switch,
    Tooltip,
  };
});

describe('FlowPropertyEdit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastFormApi = null;
  });

  it('updates the targeted flow property, reloads the table, and closes the drawer', async () => {
    const onData = jest.fn();
    const actionRef = { current: { reload: jest.fn() } };
    const setViewDrawerVisible = jest.fn();
    const data = [
      { '@dataSetInternalID': '0', meanValue: '1' },
      {
        '@dataSetInternalID': '1',
        referenceToFlowPropertyDataSet: { '@refObjectId': 'fp-1' },
        meanValue: '10',
        quantitativeReference: false,
      },
    ];

    renderWithProviders(
      <PropertyEdit
        id='1'
        data={data as any}
        lang='en'
        buttonType='text'
        actionRef={actionRef as any}
        setViewDrawerVisible={setViewDrawerVisible}
        onData={onData}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await waitFor(() => expect(lastFormApi).not.toBeNull());
    expect(lastFormApi.getFieldsValue()).toEqual(expect.objectContaining({ meanValue: '10' }));

    await act(async () => {
      lastFormApi.setFieldsValue({
        '@dataSetInternalID': '1',
        meanValue: '42',
        quantitativeReference: true,
      });
    });

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(onData).toHaveBeenCalledWith([
        { '@dataSetInternalID': '0', meanValue: '1' },
        expect.objectContaining({
          '@dataSetInternalID': '1',
          meanValue: '42',
          quantitativeReference: true,
        }),
      ]),
    );
    expect(actionRef.current.reload).toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: /edit flow property/i })).not.toBeInTheDocument();
  });

  it('closes without saving when cancel is clicked', async () => {
    const onData = jest.fn();
    const actionRef = { current: { reload: jest.fn() } };
    const setViewDrawerVisible = jest.fn();

    renderWithProviders(
      <PropertyEdit
        id='1'
        data={[{ '@dataSetInternalID': '1', meanValue: '10' }] as any}
        lang='en'
        buttonType='icon'
        actionRef={actionRef as any}
        setViewDrawerVisible={setViewDrawerVisible}
        onData={onData}
      />,
    );

    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onData).not.toHaveBeenCalled();
    expect(actionRef.current.reload).not.toHaveBeenCalled();
  });

  it('closes without saving when the close icon is clicked', async () => {
    const onData = jest.fn();
    const actionRef = { current: { reload: jest.fn() } };
    const setViewDrawerVisible = jest.fn();

    renderWithProviders(
      <PropertyEdit
        id='1'
        data={[{ '@dataSetInternalID': '1', meanValue: '10' }] as any}
        lang='en'
        buttonType='icon'
        actionRef={actionRef as any}
        setViewDrawerVisible={setViewDrawerVisible}
        onData={onData}
      />,
    );

    await userEvent.click(screen.getByRole('button'));
    const drawer = screen.getByRole('dialog', { name: /edit flow property/i });
    await userEvent.click(within(drawer).getAllByRole('button', { name: /close/i })[0]);

    expect(onData).not.toHaveBeenCalled();
    expect(actionRef.current.reload).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: /edit flow property/i })).not.toBeInTheDocument();
  });

  it('supports rules rendering and falls back to an empty object from the selector callback', async () => {
    const onData = jest.fn();
    const actionRef = { current: { reload: jest.fn() } };

    renderWithProviders(
      <PropertyEdit
        id='1'
        data={[{ '@dataSetInternalID': '1', meanValue: '10' }] as any}
        lang='en'
        buttonType='text'
        actionRef={actionRef as any}
        setViewDrawerVisible={jest.fn()}
        onData={onData}
        showRules
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await waitFor(() => expect(lastFormApi).not.toBeNull());
    lastFormApi.getFieldsValue = jest.fn(() => undefined);

    await userEvent.click(screen.getByRole('button', { name: /select-flowproperty/i }));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(onData).toHaveBeenCalledWith([{}]));
    expect(getRules).toHaveBeenCalled();
    expect(actionRef.current.reload).toHaveBeenCalled();
  });

  it('handles missing data, nullish value changes, and drawer onClose', async () => {
    renderWithProviders(
      <PropertyEdit
        id='missing'
        data={undefined as any}
        lang='en'
        buttonType='text'
        actionRef={{ current: { reload: jest.fn() } } as any}
        setViewDrawerVisible={jest.fn()}
        onData={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await waitFor(() => expect(lastFormApi).not.toBeNull());

    await act(async () => {
      lastFormApi.setFieldsValue(undefined);
    });

    const drawer = screen.getByRole('dialog', { name: /edit flow property/i });
    await userEvent.click(within(drawer).getAllByRole('button', { name: /close/i })[1]);

    expect(screen.queryByRole('dialog', { name: /edit flow property/i })).not.toBeInTheDocument();
  });

  it('auto-opens, applies sdk highlights, dedupes repeated field messages, and scrolls to the field', async () => {
    jest.useFakeTimers();
    const actionRef = { current: { reload: jest.fn() } };
    const sdkHighlights = [
      {
        fieldPath: 'flowProperty[#prop-1].meanValue',
        key: 'flow-property-highlight-1',
        reasonMessage: 'Validation failed',
        suggestedFix: 'Fix the flow property mean value.',
        tabName: 'flowProperties',
        validationCode: 'custom',
      },
      {
        fieldPath: 'flowProperty[#prop-1].meanValue',
        key: 'flow-property-highlight-2',
        reasonMessage: 'Validation failed',
        suggestedFix: 'Fix the flow property mean value.',
        tabName: 'flowProperties',
        validationCode: 'custom',
      },
      {
        fieldPath: 'flowProperty[#prop-1].meanValue',
        key: 'flow-property-highlight-3',
        reasonMessage: 'Validation failed',
        suggestedFix: 'Provide a longer flow property value.',
        tabName: 'flowProperties',
        validationCode: 'string_too_short',
      },
    ];

    const { rerender } = renderWithProviders(
      <PropertyEdit
        id='1'
        data={[{ '@dataSetInternalID': '1', meanValue: '10' }] as any}
        lang='en'
        buttonType='text'
        actionRef={actionRef as any}
        setViewDrawerVisible={jest.fn()}
        onData={jest.fn()}
        autoOpen
        sdkHighlights={sdkHighlights as any}
      />,
    );

    await screen.findByRole('dialog', { name: /edit flow property/i });
    rerender(
      <PropertyEdit
        id='1'
        data={[{ '@dataSetInternalID': '1', meanValue: '10' }] as any}
        lang='en'
        buttonType='text'
        actionRef={actionRef as any}
        setViewDrawerVisible={jest.fn()}
        onData={jest.fn()}
        autoOpen
        sdkHighlights={[...sdkHighlights] as any}
      />,
    );
    await waitFor(() =>
      expect(lastFormApi.setFields).toHaveBeenCalledWith([
        {
          errors: ['Fix the flow property mean value', 'Provide a longer flow property value'],
          name: ['meanValue'],
        },
      ]),
    );

    act(() => {
      jest.runAllTimers();
    });

    expect(lastFormApi.scrollToField).toHaveBeenCalledWith(['meanValue'], { focus: true });

    lastFormApi.setFields.mockClear();
    rerender(
      <PropertyEdit
        id='1'
        data={[{ '@dataSetInternalID': '1', meanValue: '10' }] as any}
        lang='en'
        buttonType='text'
        actionRef={actionRef as any}
        setViewDrawerVisible={jest.fn()}
        onData={jest.fn()}
        autoOpen
        sdkHighlights={[...sdkHighlights] as any}
      />,
    );

    expect(lastFormApi.setFields).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('keeps existing local field errors when a required sdk highlight targets the same field', async () => {
    const actionRef = { current: { reload: jest.fn() } };
    const { rerender } = renderWithProviders(
      <PropertyEdit
        id='1'
        data={[{ '@dataSetInternalID': '1', meanValue: '10' }] as any}
        lang='en'
        buttonType='text'
        actionRef={actionRef as any}
        setViewDrawerVisible={jest.fn()}
        onData={jest.fn()}
        autoOpen
      />,
    );

    await screen.findByRole('dialog', { name: /edit flow property/i });
    await waitFor(() => expect(lastFormApi).not.toBeNull());

    lastFormApi.setFields([
      {
        errors: ['Local mean value error'],
        name: ['meanValue'],
      },
    ]);
    lastFormApi.setFields.mockClear();

    rerender(
      <PropertyEdit
        id='1'
        data={[{ '@dataSetInternalID': '1', meanValue: '10' }] as any}
        lang='en'
        buttonType='text'
        actionRef={actionRef as any}
        setViewDrawerVisible={jest.fn()}
        onData={jest.fn()}
        autoOpen
        sdkHighlights={
          [
            {
              fieldPath: 'flowProperty[#prop-1].meanValue',
              key: 'flow-property-required-highlight',
              reasonMessage: 'Validation failed',
              suggestedFix: 'Fill in the required value for this field.',
              tabName: 'flowProperties',
              validationCode: 'required_missing',
            },
          ] as any
        }
      />,
    );

    expect(lastFormApi.setFields).not.toHaveBeenCalled();
    expect(lastFormApi.getFieldError(['meanValue'])).toEqual(['Local mean value error']);
  });

  it('uses the flow-property frontend required copy for sdk required_missing highlights', async () => {
    const actionRef = { current: { reload: jest.fn() } };
    const sdkHighlights = [
      {
        fieldPath: 'flowProperty[#prop-1].meanValue',
        key: 'flow-property-required-highlight',
        reasonMessage: 'Validation failed',
        suggestedFix: 'Fill in the required value for this field.',
        tabName: 'flowProperties',
        validationCode: 'required_missing',
      },
    ] as any;
    renderWithProviders(
      <PropertyEdit
        id='1'
        data={[{ '@dataSetInternalID': '1', meanValue: '10' }] as any}
        lang='en'
        buttonType='text'
        actionRef={actionRef as any}
        setViewDrawerVisible={jest.fn()}
        onData={jest.fn()}
        autoOpen
        showRules
        sdkHighlights={sdkHighlights}
      />,
    );

    await screen.findByRole('dialog', { name: /edit flow property/i });
    await waitFor(() => expect(lastFormApi).not.toBeNull());
    expect(lastFormApi.setFields).toHaveBeenCalledWith([
      {
        errors: ['Please input mean value (of flow property)'],
        name: ['meanValue'],
      },
    ]);

    lastFormApi.setFields([{ errors: [], name: ['meanValue'] }]);
    lastFormApi.setFields.mockClear();

    await act(async () => {
      lastFormApi.setFieldsValue({ meanValue: '42' });
    });

    expect(lastFormApi.setFields).not.toHaveBeenCalled();
  });
});
