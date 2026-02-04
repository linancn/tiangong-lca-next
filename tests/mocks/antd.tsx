import React from 'react';
import { toText } from '../helpers/nodeToText';

type AntdThemeToken = Record<string, any>;

const defaultToken: AntdThemeToken = {
  colorPrimary: '#1677ff',
  colorBgElevated: '#ffffff',
  boxShadow: 'none',
  colorText: '#1f1f1f',
  colorFillSecondary: '#fafafa',
  colorTextSecondary: '#595959',
  colorSplit: '#d9d9d9',
  colorWarning: 'orange',
  colorSuccess: 'green',
  colorError: 'red',
};

let tokenOverrides: AntdThemeToken = {};

export const setAntdToken = (partial: AntdThemeToken) => {
  tokenOverrides = { ...tokenOverrides, ...(partial ?? {}) };
};

export const resetAntdToken = () => {
  tokenOverrides = {};
};

export const antdMocks = {
  messageApi: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
    open: jest.fn(),
  },
  notificationApi: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    open: jest.fn(),
  },
  modal: {
    confirm: jest.fn(),
  },
};

export const resetAntdMocks = () => {
  Object.values(antdMocks.messageApi).forEach((fn) => (fn as any).mockReset?.());
  Object.values(antdMocks.notificationApi).forEach((fn) => (fn as any).mockReset?.());
  antdMocks.modal.confirm.mockReset();
  resetAntdToken();
};

const getFieldName = (name: any) => (Array.isArray(name) ? name.join('.') : name);

export const createAntdMock = () => {
  const message = {
    ...antdMocks.messageApi,
    useMessage: jest.fn(() => [
      antdMocks.messageApi,
      <div key='message-holder' data-testid='message-holder' />,
    ]),
  };

  const notification = {
    ...antdMocks.notificationApi,
    useNotification: jest.fn(() => [
      antdMocks.notificationApi,
      <div key='notification-holder' data-testid='notification-holder' />,
    ]),
  };

  const App = ({ children }: any) => <>{children}</>;
  (App as any).useApp = () => ({
    message: antdMocks.messageApi,
    notification: antdMocks.notificationApi,
    modal: antdMocks.modal,
  });

  const ConfigProvider = ({ children }: any) => <>{children}</>;

  const Button = React.forwardRef((props: any, ref: React.Ref<HTMLButtonElement>) => {
    const {
      children,
      onClick,
      disabled,
      icon,
      type,
      loading,
      block,
      shape,
      danger,
      ghost,
      ...rest
    } = props ?? {};
    void block;
    void shape;
    void danger;
    void ghost;
    return (
      <button
        ref={ref}
        type={type === 'submit' ? 'submit' : 'button'}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        data-loading={loading ? 'true' : 'false'}
        data-button-type={type}
        {...rest}
      >
        {icon}
        {children}
      </button>
    );
  });
  Button.displayName = 'MockButton';

  const Input = React.forwardRef(
    (
      { value = '', onChange, placeholder, type = 'text', ...rest }: any,
      ref: React.Ref<HTMLInputElement>,
    ) => (
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={(event) => onChange?.(event)}
        placeholder={placeholder}
        {...rest}
      />
    ),
  );
  Input.displayName = 'MockInput';

  const InputTextArea = React.forwardRef(
    ({ value = '', onChange, placeholder, ...rest }: any, ref: React.Ref<HTMLTextAreaElement>) => (
      <textarea
        ref={ref}
        value={value}
        onChange={(event) => onChange?.(event)}
        placeholder={placeholder}
        {...rest}
      />
    ),
  );
  InputTextArea.displayName = 'MockTextArea';
  (Input as any).TextArea = InputTextArea;

  const InputSearch = ({ placeholder, onSearch }: any) => {
    const [keyword, setKeyword] = React.useState('');
    return (
      <div data-testid='search-input'>
        <input
          value={keyword}
          placeholder={placeholder}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <button type='button' onClick={() => onSearch?.(keyword)}>
          Search
        </button>
      </div>
    );
  };
  (Input as any).Search = InputSearch;

  const InputNumber = ({ value, onChange, ...rest }: any) => (
    <input
      type='number'
      value={value ?? ''}
      onChange={(event) =>
        onChange?.(event.target.value === '' ? undefined : Number(event.target.value))
      }
      {...rest}
    />
  );

  const Select = ({
    value,
    defaultValue,
    onChange,
    options = [],
    children,
    placeholder,
    ...rest
  }: any) => (
    <select
      value={(value ?? defaultValue ?? '') as any}
      onChange={(event) => onChange?.(event.target.value, event)}
      aria-label={rest['aria-label']}
      {...rest}
    >
      {placeholder ? (
        <option value='' disabled={true}>
          {placeholder}
        </option>
      ) : null}
      {options.map((option: any) => (
        <option key={option.value ?? option.label} value={option.value}>
          {option.label ?? option.value}
        </option>
      ))}
      {children}
    </select>
  );
  (Select as any).Option = ({ value: optionValue, children: optionChildren, ...rest }: any) => (
    <option value={optionValue} {...rest}>
      {toText(optionChildren)}
    </option>
  );

  const Checkbox = ({ checked, onChange, children, ...rest }: any) => (
    <label>
      <input
        type='checkbox'
        checked={Boolean(checked)}
        onChange={(event) => onChange?.(event)}
        {...rest}
      />
      {children}
    </label>
  );

  const Switch = ({ checked, onChange, ...rest }: any) => (
    <label>
      <input
        type='checkbox'
        checked={Boolean(checked)}
        onChange={(event) => onChange?.(event.target.checked)}
        {...rest}
      />
    </label>
  );

  const Space = ({ children, wrap: _wrap, ...rest }: any) => {
    void _wrap;
    return (
      <div data-testid='space' {...rest}>
        {children}
      </div>
    );
  };

  const Row = ({ children, wrap: _wrap, ...rest }: any) => {
    void _wrap;
    return (
      <div data-testid='row' {...rest}>
        {children}
      </div>
    );
  };

  const Col = ({ children, ...rest }: any) => (
    <div data-testid='col' {...rest}>
      {children}
    </div>
  );

  const Tooltip = ({ title, children }: any) => {
    const label = toText(title);
    if (React.isValidElement(children)) {
      return React.cloneElement(children as any, {
        'aria-label': (children as any).props['aria-label'] ?? label,
        title: (children as any).props.title ?? label,
      });
    }
    return <span title={label}>{children}</span>;
  };

  const Spin = ({ spinning, children }: any) => (
    <div data-testid='spin' data-spinning={spinning ? 'true' : 'false'}>
      {children}
    </div>
  );

  const Divider = (props: any) => <hr data-testid='divider' {...props} />;

  const Statistic = ({ title, value, formatter }: any) => (
    <div data-testid='statistic'>
      <div>{title}</div>
      <div>{formatter ? formatter(value) : value}</div>
    </div>
  );

  const Image = ({ src, alt = '', preview, ...rest }: any) => {
    void preview;
    return <img src={src} alt={alt} data-testid='image' {...rest} />;
  };

  const Avatar = ({ src, size, style, alt, ...rest }: any) => (
    <img
      data-testid='avatar'
      src={src}
      alt={alt ?? 'avatar'}
      style={{ width: size, height: size, ...(style ?? {}) }}
      {...rest}
    />
  );

  const Skeleton = {
    Image: ({ active }: any) => (
      <div data-testid='skeleton-image' data-active={active ? 'true' : 'false'} />
    ),
  };

  const Alert = ({ message: alertMessage }: any) => <div role='alert'>{alertMessage}</div>;

  const Descriptions = ({ children, ...rest }: any) => (
    <div data-testid='descriptions' {...rest}>
      {children}
    </div>
  );
  (Descriptions as any).Item = ({ label, children, ...rest }: any) => (
    <div data-testid='descriptions-item' {...rest}>
      <strong>{toText(label)}</strong>
      <span>{children}</span>
    </div>
  );

  const CardMeta = ({ title, description }: any) => (
    <div data-testid='card-meta'>
      <div>{title}</div>
      {description ? <div>{description}</div> : null}
    </div>
  );

  const Card = ({
    children,
    cover,
    tabList,
    activeTabKey,
    onTabChange,
    hoverable: _hoverable,
    ...rest
  }: any) => {
    void _hoverable;
    if (tabList && tabList.length) {
      return (
        <div data-testid='mock-card' {...rest}>
          <div data-testid='mock-card-tabs'>
            {tabList.map((tab: any) => (
              <button
                key={tab.key}
                type='button'
                onClick={() => onTabChange?.(tab.key)}
                aria-pressed={tab.key === activeTabKey}
              >
                {toText(tab.tab)}
              </button>
            ))}
          </div>
          <div>{children}</div>
        </div>
      );
    }
    return (
      <div
        data-testid={rest?.onClick ? 'card-clickable' : 'card'}
        role={rest?.onClick ? 'button' : undefined}
        tabIndex={rest?.onClick ? 0 : undefined}
        {...rest}
      >
        {cover}
        <div>{children}</div>
      </div>
    );
  };
  (Card as any).Meta = CardMeta;

  const Tabs = ({ items = [], activeKey, onChange }: any) => (
    <div data-testid='tabs'>
      {(items ?? []).map((item: any) => (
        <div key={item.key} data-testid={`tab-wrapper-${item.key}`}>
          <button
            type='button'
            data-testid={`tab-${item.key}`}
            onClick={() => onChange?.(item.key)}
          >
            {item.label}
          </button>
          {item.key === activeKey && item.children ? (
            <div data-testid={`tab-panel-${item.key}`}>{item.children}</div>
          ) : null}
        </div>
      ))}
    </div>
  );

  const Drawer = ({ open, children, extra, title, footer, onClose }: any) => {
    if (!open) return null;
    const label = toText(title) || 'drawer';
    return (
      <div data-testid='drawer' role='dialog' aria-label={label}>
        {title ? <div data-testid='drawer-title'>{label}</div> : null}
        <div>{extra}</div>
        {children}
        {footer ? <div data-testid='drawer-footer'>{footer}</div> : null}
        {typeof onClose === 'function' ? (
          <button type='button' onClick={onClose}>
            Close
          </button>
        ) : null}
      </div>
    );
  };

  const Modal = ({ open, onCancel, onOk, children, title, width, okText, cancelText }: any) => {
    if (!open) return null;
    const label = toText(title) || 'modal';
    const resolvedOkText = toText(okText) || 'Confirm';
    const resolvedCancelText = toText(cancelText) || 'Cancel';
    return (
      <div data-testid='modal' data-width={width ?? ''} role='dialog' aria-label={label}>
        {title ? <div data-testid='modal-title'>{title}</div> : null}
        <div>{children}</div>
        <button type='button' onClick={onCancel}>
          {resolvedCancelText}
        </button>
        <button type='button' onClick={onOk}>
          {resolvedOkText}
        </button>
      </div>
    );
  };
  (Modal as any).confirm = antdMocks.modal.confirm;

  const Typography = {
    Link: ({ children, onClick, href = '#', strong: _strong, ...rest }: any) => {
      void _strong;
      return (
        <a
          href={href}
          onClick={(event) => {
            event.preventDefault();
            onClick?.(event);
          }}
          {...rest}
        >
          {children}
        </a>
      );
    },
    Paragraph: ({ children, ...rest }: any) => (
      <p data-testid='typography-paragraph' {...rest}>
        {children}
      </p>
    ),
    Text: ({ children, strong: _strong, ...rest }: any) => {
      void _strong;
      return (
        <span data-testid='typography-text' {...rest}>
          {children}
        </span>
      );
    },
  };

  const FormContext = React.createContext<any>(null);

  const Form = React.forwardRef(({ children, initialValues = {}, form }: any, ref: any) => {
    const [values, setValues] = React.useState<Record<string, any>>(initialValues ?? {});
    const rulesRef = React.useRef<Record<string, any[]>>({});

    const registerRules = React.useCallback((name: string, rules: any[] = []) => {
      if (!name) return;
      rulesRef.current[name] = rules;
    }, []);

    const setFieldValue = React.useCallback((name: string, value: any) => {
      if (!name) return;
      setValues((previous) => ({ ...previous, [name]: value }));
    }, []);

    const resetFields = React.useCallback(() => {
      setValues(initialValues ?? {});
    }, [initialValues]);

    const setFieldsValue = React.useCallback((fields: Record<string, any> = {}) => {
      setValues((previous) => ({ ...previous, ...fields }));
    }, []);

    const getFieldValue = React.useCallback(
      (name: string) => (name ? values[name] : undefined),
      [values],
    );

    const validateFields = React.useCallback(async () => {
      const errors: any[] = [];
      for (const [field, rules] of Object.entries(rulesRef.current)) {
        const value = values[field];
        for (const rule of rules ?? []) {
          const messageText = toText(rule?.message) || 'Validation failed';
          if (
            rule?.required &&
            (value === undefined || value === null || value === '' || Number.isNaN(value))
          ) {
            errors.push({ name: [field], errors: [messageText] });
          }
          if (rule?.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(String(value))) {
              errors.push({ name: [field], errors: [messageText] });
            }
          }
          if (rule?.validator) {
            try {
              const maybePromise = rule.validator(undefined, value);
              if (maybePromise && typeof maybePromise.then === 'function') {
                await maybePromise;
              }
            } catch (error: any) {
              errors.push({
                name: [field],
                errors: [(error as Error)?.message || messageText],
              });
            }
          }
        }
      }
      if (errors.length) {
        const submitError: any = new Error('Validation failed');
        submitError.errorFields = errors;
        throw submitError;
      }
      return values;
    }, [values]);

    const api = React.useMemo(
      () => ({
        validateFields,
        resetFields,
        setFieldsValue,
        setFieldValue,
        getFieldValue,
        getFieldsValue: () => ({ ...values }),
      }),
      [getFieldValue, resetFields, setFieldValue, setFieldsValue, validateFields, values],
    );

    React.useImperativeHandle(ref, () => api, [api]);

    React.useEffect(() => {
      if (form && typeof form === 'object') {
        Object.assign(form, api);
      }
    }, [form, api]);

    const contextValue = React.useMemo(
      () => ({
        values,
        setFieldValue,
        registerRules,
      }),
      [values, setFieldValue, registerRules],
    );

    return (
      <FormContext.Provider value={contextValue}>
        <form data-testid='form'>{children}</form>
      </FormContext.Provider>
    );
  });
  Form.displayName = 'MockForm';
  (Form as any).__Context = FormContext;

  const FormItem = ({
    name,
    label,
    rules = [],
    children,
    valuePropName = 'value',
    help,
    validateStatus,
  }: any) => {
    const context = React.useContext(FormContext);
    const fieldName = getFieldName(name);

    React.useEffect(() => {
      if (fieldName) {
        context?.registerRules?.(fieldName, rules);
      }
    }, [context, fieldName, rules]);

    const currentValue =
      fieldName !== undefined && fieldName !== null ? context?.values?.[fieldName] : undefined;
    const valueProps =
      currentValue !== undefined
        ? { [valuePropName]: currentValue }
        : valuePropName === 'checked'
          ? { checked: false }
          : { [valuePropName]: '' };

    const handleChange = (eventOrValue: any) => {
      let nextValue = eventOrValue;
      if (valuePropName === 'checked') {
        if (typeof eventOrValue === 'boolean') {
          nextValue = eventOrValue;
        } else if (eventOrValue?.target) {
          nextValue = Boolean(eventOrValue.target.checked);
        }
      } else if (eventOrValue?.target) {
        nextValue = eventOrValue.target.value;
      }
      if (fieldName) {
        context?.setFieldValue?.(fieldName, nextValue);
      }
      if (React.isValidElement(children) && (children as any).props?.onChange) {
        (children as any).props.onChange(eventOrValue);
      }
    };

    const decoratedChild = React.isValidElement(children)
      ? React.cloneElement(children as any, {
          ...valueProps,
          onChange: handleChange,
        })
      : children;

    return (
      <div data-testid={`form-item-${fieldName ?? 'unknown'}`}>
        {label ? <label>{label}</label> : null}
        <div>{decoratedChild}</div>
        {help ? (
          <div data-testid='form-item-help' data-validate-status={validateStatus}>
            {help}
          </div>
        ) : null}
      </div>
    );
  };

  (Form as any).Item = FormItem;
  (Form as any).useForm = () => {
    const api: any = {};
    return [api];
  };

  return {
    __esModule: true,
    Avatar,
    App,
    Alert,
    Button,
    Card,
    Checkbox,
    Col,
    ConfigProvider,
    Divider,
    Descriptions,
    Drawer,
    Form,
    Image,
    Input,
    InputNumber,
    Modal,
    Skeleton,
    Row,
    Select,
    Space,
    Spin,
    Statistic,
    Switch,
    Tabs,
    Tooltip,
    Typography,
    message,
    notification,
    theme: {
      defaultAlgorithm: 'default',
      darkAlgorithm: 'dark',
      useToken: () => ({
        token: {
          ...defaultToken,
          ...(tokenOverrides ?? {}),
        },
      }),
    },
  };
};
