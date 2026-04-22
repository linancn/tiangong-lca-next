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
let mockSourceListAdd = jest.fn();
let mockSourceListRemove = jest.fn();
let mockSourceFields: Array<{ key: string; name: number }> = [];

beforeEach(() => {
  proFormApi = null;
  triggerValuesChange = null;
  mockSourceListAdd = jest.fn();
  mockSourceListRemove = jest.fn();
  mockSourceFields = [
    { key: '0', name: 0 },
    { key: '1', name: 1 },
  ];
});

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
}));

const mockUnitConvertState: { visible: boolean; onOk?: (value: any) => void } = { visible: false };
const mockGetRules = jest.fn(() => [{ required: true }]);

jest.mock('@/pages/Utils', () => ({
  __esModule: true,
  getRules: (...args: any[]) => mockGetRules(...args),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CaretRightOutlined: ({ rotate }: any) => <span>{`caret-${rotate ?? 0}`}</span>,
  CloseOutlined: (props: any) => (
    <span data-testid={props.onClick ? 'close-action' : 'close-icon'} onClick={props.onClick}>
      close-outlined
    </span>
  ),
  FormOutlined: () => <span>edit-icon</span>,
}));

jest.mock('@/components/UnitConvert', () => ({
  __esModule: true,
  default: ({ visible, onOk, onCancel }: any) => {
    mockUnitConvertState.visible = visible;
    mockUnitConvertState.onOk = onOk;
    return visible ? (
      <div data-testid='unit-convert'>
        <button type='button' onClick={() => onOk?.('88')}>
          convert-unit
        </button>
        <button type='button' onClick={onCancel}>
          close-unit
        </button>
      </div>
    ) : null;
  },
}));

jest.mock('@/pages/Flows/Components/select/form', () => ({
  __esModule: true,
  default: ({ onData, formRef, name, asInput }: any) => {
    const fieldName = name ?? ['referenceToFlowDataSet'];
    return (
      <div>
        <span data-testid='flow-select-mode'>{String(asInput)}</span>
        <button
          type='button'
          onClick={() => {
            formRef?.current?.setFieldValue(fieldName, { '@refObjectId': 'flow-1' });
            onData?.();
          }}
        >
          trigger-flow
        </button>
      </div>
    );
  },
}));

jest.mock('@/pages/Sources/Components/select/form', () => ({
  __esModule: true,
  default: ({ parentName = [], name = [], formRef, onData, label }: any) => {
    const fieldPath = [...parentName, ...name];
    return (
      <button
        type='button'
        onClick={() => {
          formRef?.current?.setFieldValue(fieldPath, { '@refObjectId': `source-${name[0] ?? 0}` });
          onData?.();
        }}
      >
        {toText(label)}
      </button>
    );
  },
}));

jest.mock('@/components/LangTextItem/form', () => ({
  __esModule: true,
  default: () => <div data-testid='lang-form'>lang</div>,
}));

jest.mock('antd', () => {
  const React = require('react');

  const Button = (props: any) => {
    const { children, onClick, disabled, icon, type, ...rest } = props;
    delete rest.block;
    return (
      <button
        type='button'
        data-button-type={type}
        disabled={disabled}
        onClick={disabled ? undefined : onClick}
        {...rest}
      >
        {icon ? <span data-testid='button-icon'>{icon}</span> : null}
        {toText(children)}
      </button>
    );
  };

  const Tooltip = ({ children }: any) => <>{children}</>;

  const Drawer = ({ open, title, extra, footer, children, onClose, getContainer }: any) => {
    if (!open) return null;
    getContainer?.();
    const label = toText(title) || 'drawer';
    return (
      <section role='dialog' aria-label={label}>
        <header>
          {extra}
          <button type='button' onClick={onClose}>
            close
          </button>
        </header>
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
  FormComponent.List = ({ children }: any) => {
    return children(mockSourceFields, {
      add: (...args: any[]) => mockSourceListAdd(...args),
      remove: (...args: any[]) => mockSourceListRemove(...args),
    });
  };

  const Collapse = ({ items, expandIcon }: any) => (
    <div>
      {items?.map((item: any) => (
        <div key={item.key}>
          <div>{expandIcon?.({ isActive: true })}</div>
          <div>{expandIcon?.({ isActive: false })}</div>
          <div>{toText(item.label)}</div>
          {item.children}
        </div>
      ))}
    </div>
  );

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
    Collapse,
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

  const ProForm = ({
    formRef,
    initialValues = {},
    onFinish,
    onValuesChange,
    children,
    submitter,
  }: any) => {
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
        {submitter?.render?.() ?? null}
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

  it('normalizes historical undefined amount strings to empty form values', async () => {
    render(
      <ProcessExchangeEdit
        {...defaultProps}
        data={[
          {
            '@dataSetInternalID': '0',
            meanAmount: 'undefined',
            resultingAmount: 'undefined',
            exchangeDirection: 'output',
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(proFormApi?.getFieldValue('meanAmount')).toBeUndefined();
      expect(proFormApi?.getFieldValue('resultingAmount')).toBeUndefined();
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
    await act(async () => {
      mockUnitConvertState.onOk?.('200');
    });

    await waitFor(() => {
      expect(proFormApi?.getFieldValue('meanAmount')).toBe('200');
    });
  });

  it('opens from the text trigger, updates flow and source references, and saves from the footer', async () => {
    const onData = jest.fn();
    render(<ProcessExchangeEdit {...defaultProps} buttonType='text' onData={onData} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByTestId('flow-select-mode')).toHaveTextContent('false');
    fireEvent.change(screen.getByTestId('exchangeDirection'), { target: { value: 'input' } });
    await act(async () => {
      proFormApi?.setFieldValue('exchangeDirection', 'input');
      triggerValuesChange?.({}, proFormApi?.getFieldsValue());
    });
    expect(screen.getByTestId('flow-select-mode')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'trigger-flow' }));
    fireEvent.click(screen.getByRole('button', { name: /Data source\(s\)1/i }));
    fireEvent.click(screen.getByRole('button', { name: /Add.*Data source\(s\).*Item/i }));
    fireEvent.click(screen.getAllByTestId('close-action')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockSourceListAdd).toHaveBeenCalledWith({});
      expect(mockSourceListRemove).toHaveBeenCalledWith(0);
      expect(onData).toHaveBeenCalledWith([
        expect.objectContaining({
          '@dataSetInternalID': '0',
          exchangeDirection: 'input',
          referenceToFlowDataSet: { '@refObjectId': 'flow-1' },
        }),
        defaultProps.data[1],
      ]);
    });
  });

  it('shows conditional uncertainty and quantitative-reference sections after form changes', async () => {
    render(<ProcessExchangeEdit {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));

    await act(async () => {
      proFormApi?.setFieldValue('uncertaintyDistributionType', 'triangular');
      triggerValuesChange?.({}, proFormApi?.getFieldsValue());
    });

    expect(screen.getByTestId('minimumAmount')).toBeInTheDocument();
    expect(screen.getByTestId('maximumAmount')).toBeInTheDocument();

    await act(async () => {
      proFormApi?.setFieldValue('uncertaintyDistributionType', 'log-normal');
      triggerValuesChange?.({}, proFormApi?.getFieldsValue());
    });

    expect(screen.getByTestId('relativeStandardDeviation95In')).toBeInTheDocument();

    await act(async () => {
      proFormApi?.setFieldValue('quantitativeReference', true);
      triggerValuesChange?.({}, proFormApi?.getFieldsValue());
    });

    expect(screen.getAllByTestId('lang-form')).toHaveLength(2);
  });

  it('closes the unit converter and the drawer through icon, header, and cancel actions', async () => {
    render(<ProcessExchangeEdit {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByTestId('resultingAmount'));
    expect(screen.getByTestId('unit-convert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'close-unit' }));
    await waitFor(() => expect(screen.queryByTestId('unit-convert')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /close-outlined/i }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit exchange' })).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit exchange' })).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit exchange' })).not.toBeInTheDocument(),
    );
  });

  it('falls back to an empty initial exchange when the target id is missing and showRules is omitted', async () => {
    render(
      <ProcessExchangeEdit
        id='missing'
        data={exchangeList}
        lang='en'
        buttonType='icon'
        setViewDrawerVisible={jest.fn()}
        onData={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(proFormApi?.getFieldsValue()).toEqual({});
    });
  });

  it('uses rule-enabled rendering and falls back to empty objects for undefined form values', async () => {
    const onData = jest.fn();
    render(<ProcessExchangeEdit {...defaultProps} onData={onData} showRules />);

    fireEvent.click(screen.getByRole('button'));

    expect(mockGetRules).toHaveBeenCalled();

    await act(async () => {
      triggerValuesChange?.({}, undefined);
    });

    proFormApi.getFieldsValue = () => undefined;
    fireEvent.click(screen.getByRole('button', { name: 'trigger-flow' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onData).toHaveBeenCalledWith([{}, defaultProps.data[1]]);
    });
  });

  it('auto opens and renders sdk field highlights for the targeted exchange issue', async () => {
    const scrollIntoView = jest.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    render(
      <ProcessExchangeEdit
        {...defaultProps}
        autoOpen
        sdkHighlights={[
          {
            key: 'sdk-highlight-1',
            fieldKey: 'generalComment',
            fieldLabel: 'Comment',
            fieldPath: 'exchange[#0].generalComment.0.#text',
            reasonMessage: 'Text length 520 exceeds maximum 500',
            suggestedFix: 'Shorten this comment to 500 characters or fewer.',
          },
        ]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Edit exchange' })).toBeInTheDocument();
    });

    expect(screen.getByTestId('sdk-highlight-generalComment')).toBeInTheDocument();
    expect(screen.getByText(/Text length 520 exceeds maximum 500/)).toBeInTheDocument();
    expect(
      screen.getByText(/Shorten this comment to 500 characters or fewer\./),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalled();
    });
  });
});
