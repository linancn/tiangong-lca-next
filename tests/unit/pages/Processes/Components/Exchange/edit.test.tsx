// @ts-nocheck
import ProcessExchangeEdit from '@/pages/Processes/Components/Exchange/edit';
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

const mockUnitConvertState: { visible: boolean; onOk?: (value: any) => void } = { visible: false };

jest.mock('@/components/UnitConvert', () => ({
  __esModule: true,
  default: ({ visible, onOk, onCancel }: any) => {
    mockUnitConvertState.visible = visible;
    mockUnitConvertState.onOk = onOk;
    return visible ? (
      <div data-testid='unit-convert'>
        <button type='button' onClick={() => onOk?.('88')}>
          convert
        </button>
        <button type='button' onClick={onCancel}>
          close
        </button>
      </div>
    ) : null;
  },
}));

jest.mock('@/pages/Flows/Components/select/form', () => ({
  __esModule: true,
  default: ({ onData }: any) => (
    <button type='button' onClick={() => onData({ referenceToFlowDataSet: 'Flow Item' })}>
      trigger-flow
    </button>
  ),
}));

jest.mock('@/pages/Sources/Components/select/form', () => ({
  __esModule: true,
  default: () => <div data-testid='source-select'>source</div>,
}));

jest.mock('@/components/LangTextItem/form', () => ({
  __esModule: true,
  default: () => <div data-testid='lang-form'>lang</div>,
}));

jest.mock('antd', () => {
  const React = require('react');

  const Button = ({ children, onClick, disabled, icon }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {icon ? <span data-testid='button-icon'>{icon}</span> : null}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ children }: any) => <>{children}</>;

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
  const Card = ({ children }: any) => <div>{children}</div>;
  const Divider = () => <hr />;

  const Input = ({ onClick, 'data-testid': dataTestId }: any) => (
    <input data-testid={dataTestId} readOnly onClick={onClick} />
  );

  const InputNumber = ({ onChange, value, 'data-testid': dataTestId }: any) => (
    <input
      data-testid={dataTestId}
      type='number'
      value={value ?? ''}
      onChange={(event) => onChange?.(Number(event.target.value))}
    />
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
      checked={props.checked}
      onChange={(event) => props.onChange?.(event.target.checked)}
    />
  );

  const FormComponent = ({ children }: any) => <div>{children}</div>;
  FormComponent.Item = ({ children, name }: any) => {
    const React = require('react');
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

  return {
    __esModule: true,
    Button,
    Tooltip,
    Drawer,
    Space,
    Card,
    Divider,
    Input,
    InputNumber,
    Select,
    Switch,
    Form: FormComponent,
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

    const buildApi = React.useCallback(() => {
      const api = {
        submit: async () => onFinish?.(),
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
      buildApi();
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

describe('ProcessExchangeEdit', () => {
  const exchangeList = [
    { '@dataSetInternalID': '0', meanAmount: 5, exchangeDirection: 'output', name: 'first' },
    { '@dataSetInternalID': '1', meanAmount: 6, exchangeDirection: 'input', name: 'second' },
  ];

  const defaultProps = {
    id: '0',
    data: exchangeList,
    lang: 'en',
    buttonType: 'icon',
    setViewDrawerVisible: jest.fn(),
    onData: jest.fn(),
    showRules: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnitConvertState.visible = false;
    mockUnitConvertState.onOk = undefined;
  });

  it('disables edit button when disabled', () => {
    render(<ProcessExchangeEdit {...defaultProps} disabled />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('opens drawer and preloads exchange data', async () => {
    render(<ProcessExchangeEdit {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));

    const dialog = screen.getByRole('dialog', { name: 'Edit exchange' });
    expect(dialog).toBeInTheDocument();

    await waitFor(() => {
      expect(proFormApi?.getFieldsValue()).toEqual(
        expect.objectContaining({ meanAmount: 5, '@dataSetInternalID': '0' }),
      );
    });
  });

  it('submits updated exchange data', async () => {
    const onData = jest.fn();
    render(<ProcessExchangeEdit {...defaultProps} onData={onData} />);

    fireEvent.click(screen.getByRole('button'));

    proFormApi?.setFieldsValue({ meanAmount: 15 });
    const updatedValues = proFormApi?.getFieldsValue() ?? {};
    await act(async () => {
      triggerValuesChange?.({}, updatedValues);
    });

    await act(async () => {
      await proFormApi?.submit();
    });

    await waitFor(() => {
      expect(onData).toHaveBeenCalledWith([
        expect.objectContaining({ meanAmount: 15 }),
        defaultProps.data[1],
      ]);
    });
  });

  it('applies unit conversion result to the form', async () => {
    render(<ProcessExchangeEdit {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));

    const meanAmountInput = screen.getByTestId('meanAmount');
    fireEvent.click(meanAmountInput);

    expect(mockUnitConvertState.visible).toBe(true);
    mockUnitConvertState.onOk?.('200');

    await waitFor(() => {
      expect(proFormApi?.getFieldValue('meanAmount')).toBe('200');
    });
  });
});
