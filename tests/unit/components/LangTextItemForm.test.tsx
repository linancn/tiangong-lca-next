/**
 * Tests for LangTextItemForm component
 * Path: src/components/LangTextItem/form.tsx
 */

import LangTextItemForm from '@/components/LangTextItem/form';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form } from 'antd';

jest.mock('umi', () => ({
  FormattedMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) => (
    <span>{defaultMessage ?? id}</span>
  ),
  useIntl: () => ({
    formatMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) =>
      defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  CloseOutlined: ({ onClick, style }: any) => (
    <button type='button' aria-label='remove-entry' onClick={onClick} style={style}>
      ×
    </button>
  ),
}));

jest.mock('antd', () => {
  const React = require('react') as typeof import('react');

  const FormContext = React.createContext<any>(null);

  const normalizePath = (path: any): (string | number)[] =>
    Array.isArray(path) ? path : path !== undefined ? [path] : [];

  const Form = ({ children, formRef }: any) => {
    const [version, forceUpdate] = React.useReducer((count: number) => count + 1, 0);

    React.useEffect(() => {
      if (!formRef?.current?.subscribe) {
        return;
      }
      const unsubscribe = formRef.current.subscribe(() => {
        forceUpdate();
      });
      return unsubscribe;
    }, [formRef]);

    const contextValue = React.useMemo(
      () => ({ form: formRef?.current ?? {}, prefix: [] as Path }),
      [formRef, version],
    );

    return <FormContext.Provider value={contextValue}>{children}</FormContext.Provider>;
  };

  Form.useFormInstance = () => React.useContext(FormContext).form;

  const FormItem = ({ name, children, style }: any) => {
    const { form, prefix } = React.useContext(FormContext);
    const path = [...prefix, ...normalizePath(name)];

    if (path.length === 0) {
      return <div style={style}>{children}</div>;
    }

    const value = form.getFieldValue(path);

    const handleChange = (next: any) => {
      const resolvedValue = next && next.target !== undefined ? next.target.value : next;
      form.setFieldValue(path, resolvedValue);
    };

    const content = React.isValidElement(children)
      ? React.cloneElement(
          children as React.ReactElement<any>,
          {
            value,
            onChange: handleChange,
          } as any,
        )
      : typeof children === 'function'
        ? children({ value, onChange: handleChange })
        : children;

    return <div style={style}>{content}</div>;
  };

  const FormList = ({ name, children, rules = [] }: any) => {
    const context = React.useContext(FormContext);
    const form = context.form;
    const prefixArray = Array.isArray(context.prefix) ? context.prefix : [];
    const nameArray = normalizePath(name);
    const prefixKey = prefixArray.join('|');
    const nameKey = nameArray.join('|');

    const path = React.useMemo(() => {
      return [...prefixArray, ...nameArray];
    }, [prefixKey, nameKey]);

    const pathKey = React.useMemo(() => path.join('|'), [path]);
    const rulesRef = React.useRef(rules);
    rulesRef.current = rules;

    const [fields, setFields] = React.useState<Array<{ key: number; name: number }>>([]);

    React.useEffect(() => {
      const handleValuesChange = (values: any[]) => {
        const nextFields: Array<{ key: number; name: number }> = Array.isArray(values)
          ? values.map((_: any, index: number) => ({ key: index, name: index }))
          : [];

        setFields((prev: Array<{ key: number; name: number }>) => {
          if (
            prev.length === nextFields.length &&
            prev.every(
              (field: { key: number; name: number }, index: number) =>
                field.name === nextFields[index]?.name,
            )
          ) {
            return prev;
          }
          return nextFields;
        });

        if (Array.isArray(values)) {
          rulesRef.current.forEach((rule: any) => {
            if (typeof rule?.validator === 'function') {
              Promise.resolve(rule.validator(null, values)).catch(() => {});
            }
          });
        }
      };

      form.registerList(path, handleValuesChange);
    }, [form, path, pathKey]);

    const add = () => {
      const current = form.getFieldValue(path) ?? [];
      const next = Array.isArray(current) ? [...current, {}] : [{}];
      form.setFieldValue(path, next);
    };

    const remove = (nameIndex: number) => {
      const current = form.getFieldValue(path) ?? [];
      const next = Array.isArray(current)
        ? current.filter((_: any, index: number) => index !== nameIndex)
        : [];
      form.setFieldValue(path, next);
    };

    const renderedChildren = children(fields, { add, remove });

    return (
      <FormContext.Provider value={{ form, prefix: path }}>{renderedChildren}</FormContext.Provider>
    );
  };

  const Select = ({ value, onChange, options = [], placeholder }: any) => {
    const resolvedPlaceholder =
      typeof placeholder === 'string'
        ? placeholder
        : typeof placeholder?.props?.defaultMessage === 'string'
          ? placeholder.props.defaultMessage
          : 'Select';

    return (
      <label>
        <span className='sr-only'>{resolvedPlaceholder}</span>
        <select
          aria-label={resolvedPlaceholder}
          value={value ?? ''}
          onChange={(event) => onChange?.(event.target.value)}
        >
          <option value='' disabled>
            {resolvedPlaceholder}
          </option>
          {options.map((option: any) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  };

  const TextArea = ({ value, onChange }: any) => (
    <textarea value={value ?? ''} onChange={(event) => onChange?.(event)} />
  );

  const Input = { TextArea };

  const Button = ({ children, onClick, style }: any) => (
    <button type='button' style={style} onClick={onClick}>
      {children}
    </button>
  );

  const Row = ({ children }: any) => <div>{children}</div>;
  const Col = ({ children }: any) => <div>{children}</div>;

  const message = {
    error: jest.fn(),
  };

  Form.Item = FormItem;
  Form.List = FormList;

  return {
    Form,
    Button,
    Select,
    Input,
    Row,
    Col,
    message,
  };
});

type ReactNode = import('react').ReactNode;

type RenderOptions = {
  name?: (string | number)[];
  label?: ReactNode;
  rules?: any[];
  listName?: string[];
  setRuleErrorState?: jest.Mock;
  initialValues?: Record<string, unknown>;
};

type Path = (string | number)[];

const normalizePath = (path: any): Path => (Array.isArray(path) ? path : [path]);

const getNestedValue = (target: any, path: Path) =>
  path.reduce(
    (acc: any, key) => (acc === null || acc === undefined ? undefined : acc[key]),
    target,
  );

const setNestedValue = (target: any, path: Path, value: any) => {
  let cursor = target;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    if (cursor[key] === undefined || cursor[key] === null) {
      cursor[key] = typeof path[i + 1] === 'number' ? [] : {};
    }
    cursor = cursor[key];
  }
  cursor[path[path.length - 1]] = value;
};

const createFormRef = (initialValues: Record<string, unknown>) => {
  const store: Record<string, unknown> = JSON.parse(JSON.stringify(initialValues));
  const validators = new Map<string, (values: any[]) => void>();
  const listeners = new Set<() => void>();

  const buildKey = (path: Path) => path.join('|');

  const registerList = (path: Path, callback: (values: any[]) => void) => {
    const key = buildKey(path);
    validators.set(key, callback);
    const current = getNestedValue(store, path) ?? [];
    callback(Array.isArray(current) ? current : []);
  };

  const notifyValidators = (path: Path) => {
    for (let i = path.length; i >= 0; i -= 1) {
      const slice = path.slice(0, i);
      const key = buildKey(slice);
      if (validators.has(key)) {
        const callback = validators.get(key)!;
        const current = getNestedValue(store, slice) ?? [];
        callback(Array.isArray(current) ? current : []);
      }
    }
  };

  return {
    current: {
      getFieldValue: (path: any) => getNestedValue(store, normalizePath(path)),
      setFieldValue: (path: any, value: any) => {
        const normalized = normalizePath(path);
        setNestedValue(store, normalized, value);
        notifyValidators(normalized);
        listeners.forEach((listener) => listener());
      },
      registerList: (path: Path, callback: (values: any[]) => void) => {
        registerList(path, callback);
      },
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    store,
  };
};

const renderLangTextItemForm = (options: RenderOptions = {}) => {
  const {
    name = ['translations'],
    label = 'Translation',
    rules = [],
    listName,
    setRuleErrorState,
    initialValues = { translations: [] },
  } = options;

  const formRef = createFormRef(initialValues);

  const Wrapper = () => (
    <Form {...({ formRef } as any)}>
      <LangTextItemForm
        name={name}
        label={label}
        rules={rules}
        listName={listName}
        setRuleErrorState={setRuleErrorState}
        formRef={formRef}
      />
    </Form>
  );

  return { ...render(<Wrapper />), formRef };
};

const originalRequestAnimationFrame = global.requestAnimationFrame;
const originalWindowRequestAnimationFrame =
  typeof window !== 'undefined' ? window.requestAnimationFrame : undefined;

beforeAll(() => {
  const raf = (callback: FrameRequestCallback) => {
    act(() => {
      callback(performance.now());
    });
    return 0;
  };

  global.requestAnimationFrame = raf as typeof global.requestAnimationFrame;
  if (typeof window !== 'undefined') {
    window.requestAnimationFrame = raf as typeof window.requestAnimationFrame;
  }
});

afterAll(() => {
  if (originalRequestAnimationFrame) {
    global.requestAnimationFrame = originalRequestAnimationFrame;
  } else {
    // @ts-expect-error cleanup fallback
    delete global.requestAnimationFrame;
  }

  if (typeof window !== 'undefined') {
    if (originalWindowRequestAnimationFrame) {
      window.requestAnimationFrame = originalWindowRequestAnimationFrame;
    } else {
      // @ts-expect-error cleanup fallback
      delete window.requestAnimationFrame;
    }
  }
});

describe('LangTextItemForm', () => {
  const { message } = jest.requireMock('antd') as { message: { error: jest.Mock } };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('prevents removing the final required entry', async () => {
    renderLangTextItemForm({
      rules: [{ required: true }],
      initialValues: { translations: [] },
    });

    const user = userEvent.setup();

    const [languageSelect] = await screen.findAllByRole('combobox');
    expect(languageSelect).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'remove-entry' }));

    await waitFor(() => {
      expect(screen.getAllByRole('combobox')).toHaveLength(1);
    });
  });

  it('allows adding and removing optional language entries', async () => {
    renderLangTextItemForm({ rules: [] });

    const user = userEvent.setup();

    const addButton = screen.getByRole('button', { name: /Add Translation Item/i });

    await user.click(addButton);
    await waitFor(() => {
      expect(screen.getAllByRole('combobox')).toHaveLength(1);
    });

    await user.selectOptions(screen.getByRole('combobox'), 'en');

    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getAllByRole('combobox')).toHaveLength(2);
    });

    const removeButtons = screen.getAllByRole('button', { name: 'remove-entry' });
    await user.click(removeButtons[1]);

    await waitFor(() => {
      expect(screen.getAllByRole('combobox')).toHaveLength(1);
    });
  });

  it('disables selecting duplicate languages across entries', async () => {
    renderLangTextItemForm({ rules: [] });

    const user = userEvent.setup();

    const addButton = screen.getByRole('button', { name: /Add Translation Item/i });

    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getAllByRole('combobox')).toHaveLength(1);
    });

    await user.selectOptions(screen.getByRole('combobox'), 'en');

    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getAllByRole('combobox')).toHaveLength(2);
    });

    const selects = screen.getAllByRole('combobox');
    const duplicateOption = selects[1].querySelector(
      "option[value='en']",
    ) as HTMLOptionElement | null;

    expect(duplicateOption).not.toBeNull();
    expect(duplicateOption).toBeDisabled();
  });

  it('invokes setRuleErrorState based on validator results', async () => {
    const setRuleErrorState = jest.fn();

    const { formRef } = renderLangTextItemForm({
      rules: [{ required: true }],
      setRuleErrorState,
      initialValues: {
        translations: [{ '@xml:lang': 'zh', '#text': '你好' }],
      },
    });

    await waitFor(() => {
      expect(setRuleErrorState).toHaveBeenCalledWith(true);
    });

    const [select] = screen.getAllByRole('combobox');
    const user = userEvent.setup();

    await user.selectOptions(select, 'en');

    const currentValues = formRef.current.getFieldValue(['translations']);
    formRef.current.setFieldValue(['translations'], currentValues);

    await waitFor(() => {
      expect(setRuleErrorState).toHaveBeenLastCalledWith(false);
    });
  });

  it('shows a validation message when required English translation is missing', async () => {
    const { formRef } = renderLangTextItemForm({
      rules: [{ required: true }],
    });

    const user = userEvent.setup();

    const [select] = await screen.findAllByRole('combobox');
    await user.selectOptions(select, 'zh');

    const currentValues = formRef.current.getFieldValue(['translations']);
    formRef.current.setFieldValue(['translations'], currentValues);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('English is a required language!');
    });
  });

  it('reads initial values when using listName for nested lists', async () => {
    const initialValues = {
      review: [
        {
          'common:otherReviewDetails': [{ '@xml:lang': 'en', '#text': 'Review notes' }],
        },
      ],
    };

    const formRef = createFormRef(initialValues);

    const NestedWrapper = () => (
      <Form {...({ formRef } as any)}>
        <Form.List name={['review']}>
          {(fields: Array<{ key: number; name: number }>) => (
            <>
              {fields.map((field) => (
                <LangTextItemForm
                  key={field.key}
                  name={[field.name, 'common:otherReviewDetails']}
                  listName={['review']}
                  formRef={formRef}
                  label='Review details'
                />
              ))}
            </>
          )}
        </Form.List>
      </Form>
    );

    render(<NestedWrapper />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Review notes')).toBeInTheDocument();
    });
  });
});
