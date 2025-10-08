// @ts-nocheck
import UnitGroupCreate from '@/pages/Unitgroups/Components/create';
import UnitCreate from '@/pages/Unitgroups/Components/Unit/create';
import UnitDelete from '@/pages/Unitgroups/Components/Unit/delete';
import UnitEdit from '@/pages/Unitgroups/Components/Unit/edit';
import ReferenceUnit from '@/pages/Unitgroups/Components/Unit/reference';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor, within } from '../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

const mockIntl = {
  locale: 'en-US',
  formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
};

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => mockIntl,
}));

jest.mock('uuid', () => ({
  __esModule: true,
  v4: jest.fn(() => 'generated-unit-group-id'),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span data-testid='icon-close' />,
  CopyOutlined: () => <span data-testid='icon-copy' />,
  DeleteOutlined: () => <span data-testid='icon-delete' />,
  FormOutlined: () => <span data-testid='icon-edit' />,
  PlusOutlined: () => <span data-testid='icon-plus' />,
}));

jest.mock('@/style/custom.less', () => ({}));

jest.mock('@/components/ToolBarButton', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ tooltip, onClick, icon }: any) => (
      <button type='button' onClick={onClick}>
        {icon}
        {toText(tooltip) || 'button'}
      </button>
    ),
  };
});

jest.mock('@/components/LangTextItem/form', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ label }: any) => (
      <div>
        <label>{toText(label)}</label>
        <textarea aria-label={`${toText(label)} text`} />
      </div>
    ),
  };
});

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  formatDateTime: jest.fn(() => '2023-09-10T00:00:00Z'),
  getLangText: jest.fn((value: any) => {
    if (typeof value === 'string') return value;
    if (!value) return '';
    if (value.en) return value.en;
    return JSON.stringify(value);
  }),
}));

const mockCreateUnitGroup = jest.fn();
const mockGetUnitGroupDetail = jest.fn();
const mockGetReferenceUnit = jest.fn();

jest.mock('@/services/unitgroups/api', () => ({
  __esModule: true,
  createUnitGroup: (...args: any[]) => mockCreateUnitGroup(...args),
  getUnitGroupDetail: (...args: any[]) => mockGetUnitGroupDetail(...args),
  getReferenceUnit: (...args: any[]) => mockGetReferenceUnit(...args),
  updateUnitGroup: jest.fn(),
  deleteUnitGroup: jest.fn(),
}));

const mockGenUnitGroupFromData = jest.fn(() => ({
  unitGroupInformation: {},
  units: {
    unit: [
      {
        '@dataSetInternalID': '0',
        name: 'Existing unit',
        quantitativeReference: true,
        generalComment: { en: 'existing' },
        meanValue: '1',
      },
    ],
  },
}));

jest.mock('@/services/unitgroups/util', () => ({
  __esModule: true,
  genUnitGroupFromData: (...args: any[]) => mockGenUnitGroupFromData(...args),
  genUnitGroupJsonOrdered: jest.fn((id: string, data: any) => ({ id, data })),
}));

const mockGetReferenceProperty = jest.fn();
const mockGetReferenceUnitGroup = jest.fn();

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  getReferenceProperty: (...args: any[]) => mockGetReferenceProperty(...args),
}));

jest.mock('@/services/flowproperties/api', () => ({
  __esModule: true,
  getReferenceUnitGroup: (...args: any[]) => mockGetReferenceUnitGroup(...args),
}));

jest.mock('antd', () => {
  const React = require('react');

  const message = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
  };

  const ConfigProvider = ({ children }: any) => <div>{children}</div>;

  const Button = React.forwardRef((props: any, ref: any) => {
    const { children, onClick, disabled, icon, ...rest } = props ?? {};
    return (
      <button
        type='button'
        ref={ref}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        {...rest}
      >
        {icon}
        {children}
      </button>
    );
  });
  Button.displayName = 'MockButton';

  const Input = React.forwardRef(
    ({ value = '', onChange, placeholder, type = 'text', ...rest }: any, ref: any) => {
      const [internalValue, setInternalValue] = React.useState(value ?? '');

      React.useEffect(() => {
        setInternalValue(value ?? '');
      }, [value]);

      return (
        <input
          ref={ref}
          type={type}
          value={internalValue}
          onChange={(event) => {
            setInternalValue(event.target.value);
            onChange?.(event);
          }}
          placeholder={placeholder}
          {...rest}
        />
      );
    },
  );
  Input.displayName = 'MockInput';

  const Switch = ({ checked = false, onChange, id }: any) => (
    <input
      id={id}
      type='checkbox'
      role='checkbox'
      aria-checked={checked}
      checked={checked}
      onChange={(event) => onChange?.(event.target.checked)}
    />
  );

  const Tooltip = ({ title, children }: any) => {
    const label = toText(title);
    if (React.isValidElement(children)) {
      return React.cloneElement(children, {
        'aria-label': children.props['aria-label'] ?? label,
        title: children.props.title ?? label,
      });
    }
    return (
      <span title={label} aria-label={label}>
        {children}
      </span>
    );
  };

  const Space = ({ children }: any) => <div>{children}</div>;

  const Drawer = ({ open, onClose, title, extra, footer, children }: any) => {
    if (!open) return null;
    return (
      <div role='dialog' aria-label={toText(title) || 'drawer'}>
        <div>{extra}</div>
        <div>{children}</div>
        <div>{footer}</div>
        <button type='button' onClick={onClose}>
          Close
        </button>
      </div>
    );
  };

  const Modal = ({ open, onOk, onCancel, title, children }: any) => {
    if (!open) return null;
    return (
      <div role='dialog' aria-label={toText(title) || 'modal'}>
        <div>{children}</div>
        <button type='button' onClick={onCancel}>
          Cancel
        </button>
        <button type='button' onClick={onOk}>
          Confirm
        </button>
      </div>
    );
  };

  const Card = ({ children, title }: any) => (
    <div>
      {title ? <div>{toText(title)}</div> : null}
      <div>{children}</div>
    </div>
  );

  const Spin = ({ spinning, children }: any) =>
    spinning ? <div data-testid='spin'>{children}</div> : <div>{children}</div>;

  const FormContext = React.createContext<any>(null);

  const normalizeName = (name: any) => (Array.isArray(name) ? name.join('.') : name);

  const setValueAtPath = (prev: any, name: string, value: any) => ({
    ...prev,
    [name]: value,
  });

  const getValueAtPath = (values: any, name: string) => values?.[name];

  const Form = React.forwardRef(({ children }: any, ref: any) => {
    const [values, setValues] = React.useState<any>({});

    const setFieldValue = React.useCallback((name: string, value: any) => {
      setValues((prev: any) => setValueAtPath(prev, name, value));
    }, []);

    const contextValue = React.useMemo(
      () => ({
        values,
        setFieldValue,
        getFieldValue: (name: string) => getValueAtPath(values, name),
      }),
      [values, setFieldValue],
    );

    React.useImperativeHandle(ref, () => ({
      validateFields: async () => values,
      resetFields: () => setValues({}),
      setFieldsValue: (fields: any) => {
        setValues((prev: any) => ({ ...prev, ...fields }));
      },
      getFieldsValue: () => ({ ...values }),
    }));

    return (
      <FormContext.Provider value={contextValue}>
        <form>{children}</form>
      </FormContext.Provider>
    );
  });
  Form.displayName = 'MockForm';

  const FormItem = ({ name, label, children, hidden }: any) => {
    const context = React.useContext(FormContext);
    const path = normalizeName(name);
    const value = context?.getFieldValue?.(path);
    const inputId = `${path}-input`;

    if (hidden) {
      return (
        <div style={{ display: 'none' }}>
          {React.cloneElement(children, {
            id: inputId,
            name: path,
            value,
            checked: typeof value === 'boolean' ? value : undefined,
            onChange: (event: any) => {
              const nextValue =
                typeof event === 'boolean'
                  ? event
                  : event?.target && Object.prototype.hasOwnProperty.call(event.target, 'value')
                    ? event.target.value
                    : event;
              context?.setFieldValue?.(path, nextValue);
              children.props.onChange?.(event);
            },
          })}
        </div>
      );
    }

    return (
      <div>
        {label ? <label htmlFor={inputId}>{toText(label)}</label> : null}
        {React.cloneElement(children, {
          id: inputId,
          name: path,
          value: value ?? '',
          checked: typeof value === 'boolean' ? value : undefined,
          onChange: (event: any) => {
            const nextValue =
              typeof event === 'boolean'
                ? event
                : event?.target && Object.prototype.hasOwnProperty.call(event.target, 'value')
                  ? event.target.value
                  : event;
            context?.setFieldValue?.(path, nextValue);
            children.props.onChange?.(event);
          },
        })}
      </div>
    );
  };

  Form.Item = FormItem;
  Form.useFormInstance = () => {
    const context = React.useContext(FormContext);
    return {
      getFieldValue: (name: any) => context?.getFieldValue?.(normalizeName(name)),
      setFieldValue: (name: any, value: any) =>
        context?.setFieldValue?.(normalizeName(name), value),
    };
  };

  return {
    __esModule: true,
    Button,
    Card,
    ConfigProvider,
    Drawer,
    Form,
    Input,
    Modal,
    Space,
    Spin,
    Switch,
    Tooltip,
    message,
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const setNestedValue = (source: any, path: any[], value: any) => {
    const next = { ...source };
    let cursor = next;
    for (let index = 0; index < path.length - 1; index += 1) {
      const key = path[index];
      cursor[key] = cursor[key] ? { ...cursor[key] } : {};
      cursor = cursor[key];
    }
    cursor[path[path.length - 1]] = value;
    return next;
  };

  const ProForm = ({ formRef, initialValues = {}, onFinish, onValuesChange, children }: any) => {
    const [values, setValues] = React.useState<any>(initialValues ?? {});

    const updateValues = React.useCallback(
      (updater: (prev: any) => any) => {
        setValues((prev: any) => {
          const next = updater(prev);
          onValuesChange?.({}, next);
          return next;
        });
      },
      [onValuesChange],
    );

    const setFieldValue = React.useCallback(
      (path: any[], value: any) => {
        updateValues((prev: any) => setNestedValue(prev, path, value));
      },
      [updateValues],
    );

    React.useEffect(() => {
      if (!formRef) return;
      formRef.current = {
        submit: async () => {
          await onFinish?.();
          return true;
        },
        setFieldsValue: (next: any) => {
          setValues((prev: any) => ({ ...prev, ...next }));
        },
        resetFields: () => {
          setValues(initialValues ?? {});
        },
        getFieldsValue: () => ({ ...values }),
        setFieldValue,
      };
    }, [formRef, initialValues, onFinish, setFieldValue, values]);

    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onFinish?.();
        }}
      >
        {typeof children === 'function' ? children(values) : children}
      </form>
    );
  };

  return {
    __esModule: true,
    ProForm,
    ActionType: {},
  };
});

jest.mock('@/pages/Unitgroups/Components/form', () => {
  const React = require('react');

  const UnitGroupForm = ({ formRef, onData, onUnitDataCreate, unitDataSource = [] }: any) => {
    const [name, setName] = React.useState('');

    const handleName = (value: string) => {
      setName(value);
      formRef?.current?.setFieldValue?.(['unitGroupName'], value);
      onData?.();
    };

    return (
      <div>
        <label htmlFor='unit-group-name-input'>Unit group name</label>
        <input
          id='unit-group-name-input'
          value={name}
          onChange={(event) => handleName(event.target.value)}
        />
        <button
          type='button'
          onClick={() =>
            onUnitDataCreate?.({
              name: `Unit ${unitDataSource.length + 1}`,
              meanValue: '1',
              quantitativeReference: unitDataSource.length === 0,
            })
          }
        >
          Add Unit
        </button>
        <div>Units: {unitDataSource.length}</div>
      </div>
    );
  };

  return {
    __esModule: true,
    UnitGroupForm,
  };
});

const { message } = jest.requireMock('antd');

describe('Unitgroups unit components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateUnitGroup.mockResolvedValue({
      data: [{ id: 'generated-unit-group-id', version: '1.0' }],
      error: null,
    });
    mockGetUnitGroupDetail.mockResolvedValue({
      data: {
        json: {
          unitGroupDataSet: {},
        },
      },
    });
    mockGenUnitGroupFromData.mockReturnValue({
      unitGroupInformation: {},
      units: {
        unit: [
          {
            '@dataSetInternalID': '0',
            name: 'Existing unit',
            quantitativeReference: true,
            meanValue: '1',
            generalComment: { en: 'existing' },
          },
        ],
      },
    });
    mockGetReferenceProperty.mockResolvedValue({
      data: { refFlowPropertytId: 'flow-prop-id', version: '1.0' },
    });
    mockGetReferenceUnitGroup.mockResolvedValue({
      data: { refUnitGroupId: 'ref-ug-id', version: '1.0' },
    });
    mockGetReferenceUnit.mockResolvedValue({
      data: {
        refUnitName: 'kg',
        name: { en: 'Kilogram' },
        refUnitGeneralComment: { en: 'Mass unit' },
      },
    });
  });

  it('creates a unit group and reloads table', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };

    renderWithProviders(<UnitGroupCreate lang='en' actionRef={actionRef} />);

    await user.click(screen.getByRole('button', { name: /create/i }));

    const drawer = await screen.findByRole('dialog', { name: /create/i });
    const nameInput = within(drawer).getByLabelText('Unit group name');
    await user.type(nameInput, 'Electric energy');

    await user.click(within(drawer).getByRole('button', { name: 'Add Unit' }));
    await user.click(within(drawer).getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockCreateUnitGroup).toHaveBeenCalledTimes(1);
    });

    expect(mockCreateUnitGroup).toHaveBeenCalledWith(
      'generated-unit-group-id',
      expect.objectContaining({
        unitGroupName: 'Electric energy',
        units: expect.objectContaining({
          unit: expect.arrayContaining([
            expect.objectContaining({
              name: 'Unit 1',
              quantitativeReference: true,
            }),
          ]),
        }),
      }),
    );

    expect(message.success).toHaveBeenCalledWith('Created successfully!');
    expect(actionRef.current.reload).toHaveBeenCalledTimes(1);
  });

  it('collects unit data during creation', async () => {
    const user = userEvent.setup();
    const onData = jest.fn();

    renderWithProviders(<UnitCreate onData={onData} />);

    await user.click(screen.getByRole('button', { name: /create/i }));

    const drawer = await screen.findByRole('dialog', { name: /unit create/i });

    await user.type(within(drawer).getByLabelText('Name of unit'), 'Kilogram');
    await user.type(within(drawer).getByLabelText('Mean value (of unit)'), '1.00');

    const referenceSwitch = within(drawer).getByRole('checkbox', {
      name: /quantitative reference/i,
    });
    await user.click(referenceSwitch);

    expect((within(drawer).getByLabelText('Name of unit') as HTMLInputElement).value).toBe(
      'Kilogram',
    );
    expect((within(drawer).getByLabelText('Mean value (of unit)') as HTMLInputElement).value).toBe(
      '1.00',
    );

    await user.click(within(drawer).getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(onData).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByRole('dialog', { name: /unit create/i })).not.toBeInTheDocument();
  });

  it('edits an existing unit and reloads', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };
    const onData = jest.fn();
    const setViewDrawerVisible = jest.fn();

    const units = [
      {
        '@dataSetInternalID': '0',
        name: 'Kilogram',
        meanValue: '1',
        quantitativeReference: true,
        generalComment: { en: 'Mass' },
      },
      {
        '@dataSetInternalID': '1',
        name: 'Gram',
        meanValue: '0.001',
        quantitativeReference: false,
        generalComment: { en: 'Mass small' },
      },
    ];

    renderWithProviders(
      <UnitEdit
        id='0'
        data={units}
        buttonType='icon'
        actionRef={actionRef}
        setViewDrawerVisible={setViewDrawerVisible}
        onData={onData}
      />,
    );

    await user.click(screen.getByRole('button', { name: /edit/i }));

    const drawer = await screen.findByRole('dialog', { name: /unit edit/i });

    const nameInput = within(drawer).getByLabelText('Name of unit');
    await user.clear(nameInput);
    await user.type(nameInput, 'Kilogram updated');

    const referenceSwitch = within(drawer).getByRole('checkbox', {
      name: /quantitative reference/i,
    });
    await user.click(referenceSwitch);

    await user.click(within(drawer).getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(onData).toHaveBeenCalledTimes(1);
    });

    const updatedUnits = onData.mock.calls[0][0];
    expect(Array.isArray(updatedUnits)).toBe(true);
    expect(updatedUnits).toHaveLength(units.length);
    expect(updatedUnits).not.toBe(units);
    expect(actionRef.current.reload).toHaveBeenCalledTimes(1);
  });

  it('deletes a unit and reindexes remaining entries', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };
    const setViewDrawerVisible = jest.fn();
    const onData = jest.fn();

    const units = [
      {
        '@dataSetInternalID': '0',
        name: 'Kilogram',
        meanValue: '1',
        quantitativeReference: true,
      },
      {
        '@dataSetInternalID': '1',
        name: 'Gram',
        meanValue: '0.001',
        quantitativeReference: false,
      },
    ];

    renderWithProviders(
      <UnitDelete
        id='0'
        data={units}
        buttonType='icon'
        actionRef={actionRef}
        setViewDrawerVisible={setViewDrawerVisible}
        onData={onData}
      />,
    );

    const deleteWrapper = screen.getByLabelText(/delete/i);
    await user.click(within(deleteWrapper).getByRole('button'));

    const modal = await screen.findByRole('dialog', { name: /delete/i });

    await user.click(within(modal).getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(onData).toHaveBeenCalledTimes(1);
    });

    const updatedUnits = onData.mock.calls[0][0];
    expect(updatedUnits).toEqual([
      expect.objectContaining({
        '@dataSetInternalID': '0',
        name: 'Gram',
      }),
    ]);
    expect(message.success).toHaveBeenCalledWith('Selected record has been deleted.');
    expect(actionRef.current.reload).toHaveBeenCalledTimes(1);
  });

  it('resolves reference unit for flow sources', async () => {
    renderWithProviders(<ReferenceUnit id='flow-id' version='1.0' idType='flow' lang='en' />);

    await waitFor(() => {
      expect(mockGetReferenceProperty).toHaveBeenCalledWith('flow-id', '1.0');
      expect(mockGetReferenceUnitGroup).toHaveBeenCalledWith('flow-prop-id', '1.0');
      expect(mockGetReferenceUnit).toHaveBeenCalledWith('ref-ug-id', '1.0');
    });

    await waitFor(() => {
      expect(screen.getByText(/Kilogram/)).toBeInTheDocument();
      expect(screen.getByText('kg')).toBeInTheDocument();
    });
  });
});
