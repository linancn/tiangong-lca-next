// @ts-nocheck
import ProcessExchangeCreate from '@/pages/Processes/Components/Exchange/create';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

let proFormApi: any = null;
let triggerValuesChange: ((_: any, values: any) => void) | null = null;

beforeEach(() => {
  proFormApi = null;
  triggerValuesChange = null;
});

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
}));

jest.mock('@/components/ToolBarButton', () => ({
  __esModule: true,
  default: ({ onClick, disabled, icon, tooltip }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {toText(tooltip)}
      {icon ? <span data-testid='toolbar-icon'>{icon}</span> : null}
    </button>
  ),
}));

const mockUnitConvertState: { visible: boolean; onOk?: (value: any) => void } = { visible: false };

jest.mock('@/components/UnitConvert', () => ({
  __esModule: true,
  default: ({ visible, onOk, onCancel }: any) => {
    mockUnitConvertState.visible = visible;
    mockUnitConvertState.onOk = onOk;
    return visible ? (
      <div data-testid='unit-convert'>
        <button type='button' onClick={() => onOk?.('42')}>
          confirm-convert
        </button>
        <button type='button' onClick={onCancel}>
          close-convert
        </button>
      </div>
    ) : null;
  },
}));

jest.mock('@/pages/Flows/Components/select/form', () => ({
  __esModule: true,
  default: ({ onData }: any) => (
    <div>
      <button type='button' onClick={() => onData({ referenceToFlowDataSet: 'Flow Item' })}>
        trigger-flow-data
      </button>
    </div>
  ),
}));

jest.mock('@/pages/Sources/Components/select/form', () => ({
  __esModule: true,
  default: () => <div data-testid='source-select'>source</div>,
}));

jest.mock('@/components/LangTextItem/form', () => ({
  __esModule: true,
  default: () => <div data-testid='lang-form'>lang-form</div>,
}));

jest.mock('antd', () => {
  const React = require('react');

  const Button = ({ children, onClick, disabled }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {toText(children)}
    </button>
  );

  const Drawer = ({ open, title, extra, footer, children }: any) => {
    if (!open) return null;
    const label = toText(title) || 'drawer';
    return (
      <section role='dialog' aria-label={label}>
        <header>{extra}</header>
        <div>{children}</div>
        <footer>{footer}</footer>
      </section>
    );
  };

  const Space = ({ children }: any) => <div>{children}</div>;

  const Input = ({ onClick, 'data-testid': dataTestId }: any) => (
    <input data-testid={dataTestId} readOnly onClick={onClick} />
  );

  const Select = ({ onChange, options = [], 'data-testid': dataTestId }: any) => (
    <select data-testid={dataTestId} onChange={(event) => onChange?.(event.target.value)}>
      {options.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  const Switch = (props: any) => (
    <input
      type='checkbox'
      data-testid='switch'
      onChange={(event) => props.onChange?.(event.target.checked)}
      checked={props.checked}
    />
  );

  const Divider = () => <hr />;
  const Card = ({ children }: any) => <div>{children}</div>;

  const FormComponent = ({ children }: any) => <div>{children}</div>;
  FormComponent.Item = ({ children, name }: any) => {
    const nameKey = Array.isArray(name) ? name.join('.') : name;
    return (
      <div>
        {React.Children.map(children, (child: any) => {
          if (!React.isValidElement(child)) return child;
          return React.cloneElement(child, {
            'data-testid': child.props['data-testid'] ?? nameKey,
          });
        })}
      </div>
    );
  };

  const InputNumber = ({ onChange, value }: any) => (
    <input
      type='number'
      value={value ?? ''}
      onChange={(event) => onChange?.(Number(event.target.value))}
    />
  );

  return {
    __esModule: true,
    Button,
    Drawer,
    Space,
    Input,
    Select,
    Switch,
    Divider,
    Card,
    Form: FormComponent,
    InputNumber,
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const setNestedValue = (source: any, path: any[], value: any) => {
    const next = { ...source };
    let cursor = next;
    for (let index = 0; index < path.length - 1; index += 1) {
      const key = path[index];
      cursor[key] = { ...(cursor[key] ?? {}) };
      cursor = cursor[key];
    }
    cursor[path[path.length - 1]] = value;
    return next;
  };

  const getNestedValue = (source: any, path: any[]) => {
    return path.reduce((acc, key) => (acc ? acc[key] : undefined), source);
  };

  const ProForm = ({ formRef, initialValues = {}, onFinish, onValuesChange, children }: any) => {
    const valuesRef = React.useRef({ ...initialValues });

    const buildFormApi = React.useCallback(() => {
      const api = {
        submit: async () => {
          return onFinish?.();
        },
        resetFields: () => {
          valuesRef.current = { ...initialValues };
        },
        getFieldsValue: () => ({ ...valuesRef.current }),
        setFieldsValue: (next: any) => {
          valuesRef.current = { ...valuesRef.current, ...next };
        },
        setFieldValue: (name: any, value: any) => {
          if (Array.isArray(name)) {
            valuesRef.current = setNestedValue(valuesRef.current, name, value);
          } else {
            valuesRef.current = { ...valuesRef.current, [name]: value };
          }
        },
        getFieldValue: (name: any) => {
          if (Array.isArray(name)) {
            return getNestedValue(valuesRef.current, name);
          }
          return valuesRef.current[name];
        },
      };
      if (formRef) {
        formRef.current = api;
      }
      proFormApi = api;
      return api;
    }, [formRef, initialValues, onFinish]);

    React.useEffect(() => {
      buildFormApi();
    });

    React.useEffect(() => {
      triggerValuesChange = onValuesChange;
    }, [onValuesChange]);

    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onFinish?.();
        }}
      >
        {typeof children === 'function' ? children(valuesRef.current) : children}
      </form>
    );
  };

  return {
    __esModule: true,
    ProForm,
  };
});

describe('ProcessExchangeCreate', () => {
  const defaultProps = {
    direction: 'output',
    lang: 'en',
    onData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnitConvertState.visible = false;
    mockUnitConvertState.onOk = undefined;
  });

  it('renders disabled create button when disabled prop is true', () => {
    render(<ProcessExchangeCreate {...defaultProps} disabled />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('opens drawer and submits form data', async () => {
    const onData = jest.fn();

    render(<ProcessExchangeCreate {...defaultProps} onData={onData} />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('dialog', { name: 'Create exchange' })).toBeInTheDocument();
    expect(proFormApi).not.toBeNull();
    expect(triggerValuesChange).not.toBeNull();

    const currentValues = proFormApi?.getFieldsValue() ?? {};
    await act(async () => {
      proFormApi?.setFieldsValue({ meanAmount: 10, quantitativeReference: true });
      triggerValuesChange?.({}, { ...currentValues, meanAmount: 10, quantitativeReference: true });
    });

    await waitFor(() => {
      expect(proFormApi?.getFieldsValue()).toEqual({
        meanAmount: 10,
        quantitativeReference: true,
        exchangeDirection: 'output',
      });
    });

    await act(async () => {
      await proFormApi?.submit();
    });

    await waitFor(() => {
      expect(onData).toHaveBeenCalledWith(
        expect.objectContaining({ meanAmount: 10, quantitativeReference: true }),
      );
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Create exchange' })).not.toBeInTheDocument(),
    );
  });

  it('shows unit convert dialog when amount field is clicked and applies conversion', async () => {
    render(<ProcessExchangeCreate {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));

    const meanAmountInput = screen.getByTestId('meanAmount');
    fireEvent.click(meanAmountInput);

    expect(mockUnitConvertState.visible).toBe(true);
    mockUnitConvertState.onOk?.('123');

    await waitFor(() => {
      expect(proFormApi?.getFieldValue('meanAmount')).toBe('123');
    });
  });
});
