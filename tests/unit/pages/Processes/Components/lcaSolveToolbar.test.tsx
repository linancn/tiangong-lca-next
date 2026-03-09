import LcaSolveToolbar from '@/pages/Processes/Components/lcaSolveToolbar';
import { submitLcaTask } from '@/services/lca/taskCenter';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

type ReactNode = import('react').ReactNode;

type MockFormApi = {
  __values: Record<string, unknown>;
  __listeners: Set<() => void>;
  __subscribe: (listener: () => void) => () => void;
  setFieldsValue: (next: Record<string, unknown>) => void;
  validateFields: () => Promise<Record<string, unknown>>;
};

const buildMockFormApi = (): MockFormApi => {
  const api: MockFormApi = {
    __values: {},
    __listeners: new Set(),
    __subscribe(listener) {
      api.__listeners.add(listener);
      return () => {
        api.__listeners.delete(listener);
      };
    },
    setFieldsValue(next) {
      api.__values = {
        ...api.__values,
        ...next,
      };
      api.__listeners.forEach((listener) => listener());
    },
    async validateFields() {
      return { ...api.__values };
    },
  };
  return api;
};

jest.mock('@/components/ToolBarButton', () => ({
  __esModule: true,
  default: ({
    onClick,
    disabled,
    tooltip,
  }: {
    onClick?: () => void;
    disabled?: boolean;
    tooltip?: ReactNode;
  }) => (
    <button type='button' onClick={onClick} disabled={disabled} data-testid='lca-toolbar-trigger'>
      {tooltip}
    </button>
  ),
}));

jest.mock('@/services/lca/taskCenter', () => ({
  __esModule: true,
  submitLcaTask: jest.fn(),
}));

jest.mock('umi', () => ({
  useIntl: () => ({
    formatMessage: (
      { defaultMessage, id }: { defaultMessage?: string; id: string },
      values?: Record<string, string | number>,
    ) => {
      let text = defaultMessage ?? id;
      if (!values) {
        return text;
      }
      for (const [key, value] of Object.entries(values)) {
        text = text.replace(`{${key}}`, String(value));
      }
      return text;
    },
  }),
}));

jest.mock('antd', () => {
  const React = jest.requireActual('react');
  const FormContext = React.createContext(null as { form: MockFormApi } | null);

  const Form = ({ form, initialValues, children }: any) => {
    React.useEffect(() => {
      if (form && initialValues) {
        form.setFieldsValue(initialValues);
      }
    }, [form, initialValues]);

    return <FormContext.Provider value={{ form }}>{children}</FormContext.Provider>;
  };

  Form.useForm = () => {
    const form = buildMockFormApi();
    return [form];
  };

  Form.useWatch = (name: string, form?: MockFormApi) => {
    const key = String(name);
    const [value, setValue] = React.useState(form?.__values?.[key]);

    React.useEffect(() => {
      if (!form) {
        return undefined;
      }
      setValue(form.__values?.[key]);
      return form.__subscribe(() => {
        setValue(form.__values?.[key]);
      });
    }, [form, key]);

    return value;
  };

  const MockFormItem = ({ name, label, children }: any) => {
    const ctx = React.useContext(FormContext);
    const form = ctx?.form;
    const stringName = String(name);

    const child = React.Children.only(children);
    return (
      <div>
        <label htmlFor={`field-${stringName}`}>{label}</label>
        {React.cloneElement(child, {
          id: `field-${stringName}`,
          'data-testid': `field-${stringName}`,
          value: form?.__values?.[stringName],
          onChange: (nextValue: unknown) => {
            const value = (nextValue as { target?: { value?: unknown } })?.target?.value;
            form?.setFieldsValue({ [stringName]: value ?? nextValue });
          },
        })}
      </div>
    );
  };
  Form.Item = MockFormItem;

  const InputNumber = ({
    value,
    onChange,
    ...rest
  }: {
    value?: number;
    onChange?: (value: number | undefined) => void;
    [key: string]: unknown;
  }) => (
    <input
      type='number'
      value={value ?? ''}
      onChange={(event) => {
        const parsed = Number(event.target.value);
        onChange?.(Number.isNaN(parsed) ? undefined : parsed);
      }}
      {...rest}
    />
  );

  const RadioGroup = ({ children, value, onChange }: any) => (
    <div>
      {React.Children.map(children, (child: any) =>
        React.cloneElement(child, {
          checked: child?.props?.value === value,
          onChange,
        }),
      )}
    </div>
  );

  const RadioButton = ({ value, onChange, checked, children }: any) => (
    <button
      type='button'
      aria-pressed={Boolean(checked)}
      onClick={() => onChange?.({ target: { value } })}
    >
      {children}
    </button>
  );

  const Modal = ({
    open,
    title,
    children,
    okText,
    cancelText,
    onOk,
    onCancel,
  }: {
    open: boolean;
    title: ReactNode;
    children: ReactNode;
    okText?: ReactNode;
    cancelText?: ReactNode;
    onOk?: () => void;
    onCancel?: () => void;
  }) => {
    if (!open) {
      return null;
    }

    return (
      <div data-testid='lca-modal'>
        <h3>{title}</h3>
        <div>{children}</div>
        <button type='button' data-testid='lca-modal-ok' onClick={onOk}>
          {okText}
        </button>
        <button type='button' data-testid='lca-modal-cancel' onClick={onCancel}>
          {cancelText}
        </button>
      </div>
    );
  };

  const Space = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  const Typography = {
    Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  };

  const message = {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    loading: jest.fn(),
  };

  return {
    __esModule: true,
    Form,
    InputNumber,
    Modal,
    Radio: {
      Group: RadioGroup,
      Button: RadioButton,
    },
    Space,
    Typography,
    message,
  };
});

import { message } from 'antd';

const mockSubmitLcaTask = submitLcaTask as unknown as jest.Mock;

describe('LcaSolveToolbar component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmitLcaTask.mockReturnValue({ id: 'task-1' });
  });

  const openModal = () => {
    fireEvent.click(screen.getByTestId('lca-toolbar-trigger'));
    expect(screen.getByTestId('lca-modal')).toBeInTheDocument();
  };

  it('opens modal from toolbar trigger', () => {
    render(<LcaSolveToolbar />);
    expect(screen.queryByTestId('lca-modal')).not.toBeInTheDocument();

    openModal();
  });

  it('submits all_unit request by default', async () => {
    render(<LcaSolveToolbar />);
    openModal();

    fireEvent.click(screen.getByTestId('lca-modal-ok'));

    await waitFor(() => {
      expect(mockSubmitLcaTask).toHaveBeenCalledWith({
        scope: 'dev-v1',
        demand_mode: 'all_unit',
        solve: {
          return_x: false,
          return_g: false,
          return_h: true,
        },
        unit_batch_size: undefined,
        print_level: 0,
      });
    });

    expect(message.success).toHaveBeenCalledWith(
      'Task submitted (task-1). Check progress in the top-right task center.',
    );
  });

  it('submits all_unit request with unit_batch_size', async () => {
    render(<LcaSolveToolbar />);
    openModal();

    fireEvent.change(screen.getByTestId('field-unit_batch_size'), { target: { value: '12' } });
    fireEvent.click(screen.getByTestId('lca-modal-ok'));

    await waitFor(() => {
      expect(mockSubmitLcaTask).toHaveBeenCalledWith({
        scope: 'dev-v1',
        demand_mode: 'all_unit',
        solve: {
          return_x: false,
          return_g: false,
          return_h: true,
        },
        unit_batch_size: 12,
        print_level: 0,
      });
    });
  });

  it('blocks submit for invalid unit_batch_size (< 1)', async () => {
    render(<LcaSolveToolbar />);
    openModal();

    fireEvent.change(screen.getByTestId('field-unit_batch_size'), { target: { value: '0' } });
    fireEvent.click(screen.getByTestId('lca-modal-ok'));

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('unit_batch_size must be an integer > 0');
    });

    expect(mockSubmitLcaTask).not.toHaveBeenCalled();
  });

  it('shows error when task submission throws', async () => {
    mockSubmitLcaTask.mockImplementationOnce(() => {
      throw new Error('boom');
    });

    render(<LcaSolveToolbar />);
    openModal();
    fireEvent.click(screen.getByTestId('lca-modal-ok'));

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Calculation request failed: boom');
    });
  });
});
