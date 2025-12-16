import React from 'react';
import { toText } from '../helpers/nodeToText';

type ProFormContextValue = {
  values: any;
  setFieldValue?: (path: any, value: any) => void;
  setFieldsValue?: (values: any) => void;
};

export const proComponentsMocks = {
  lastProTableAction: null as null | {
    reload: () => Promise<any>;
    setPageInfo: (info: any) => Promise<any>;
  },
};

export const resetProComponentsMocks = () => {
  proComponentsMocks.lastProTableAction = null;
};

const deepMerge = (target: any, source: any): any => {
  const base = Array.isArray(target) ? [...target] : { ...(target ?? {}) };
  Object.entries(source ?? {}).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      base[key] = deepMerge(base[key], value);
    } else {
      base[key] = value;
    }
  });
  return base;
};

const setDeepValue = (object: any, path: any[], value: any) => {
  if (path.length === 0) return;
  const [head, ...rest] = path;
  if (rest.length === 0) {
    object[head] = value;
    return;
  }
  if (!object[head] || typeof object[head] !== 'object') {
    object[head] = {};
  }
  setDeepValue(object[head], rest, value);
};

const buildNestedValue = (path: any[], value: any): any => {
  if (path.length === 0) {
    return value;
  }
  const [head, ...rest] = path;
  if (rest.length === 0) {
    return { [head]: value };
  }
  return { [head]: buildNestedValue(rest, value) };
};

export const createProComponentsMock = () => {
  const ProFormContext = React.createContext<ProFormContextValue | null>(null);

  const ProForm = ({ formRef, initialValues = {}, onValuesChange, onFinish, children }: any) => {
    const initialRef = React.useRef(initialValues);
    const [values, setValues] = React.useState<any>(initialValues ?? {});
    const pendingChangeRef = React.useRef<any>(null);

    const handleSetFieldValue = React.useCallback((pathInput: any, nextValue: any) => {
      const path = Array.isArray(pathInput) ? pathInput : [pathInput];
      setValues((previous: any) => {
        const draft = JSON.parse(JSON.stringify(previous ?? {}));
        setDeepValue(draft, path, nextValue);
        const changed = buildNestedValue(path, nextValue);
        pendingChangeRef.current = { changed, nextValues: draft };
        return draft;
      });
    }, []);

    const handleSetFieldsValue = React.useCallback((next: any = {}) => {
      setValues((previous: any) => {
        const merged = deepMerge(previous, next);
        pendingChangeRef.current = { changed: next, nextValues: merged };
        return merged;
      });
    }, []);

    const handleResetFields = React.useCallback(() => {
      setValues(initialRef.current ?? {});
    }, []);

    const handleGetFieldsValue = React.useCallback(() => values, [values]);
    const handleValidateFields = React.useCallback(async () => values, [values]);

    const handleSubmit = React.useCallback(async () => onFinish?.(), [onFinish]);

    React.useImperativeHandle(formRef, () => ({
      getFieldsValue: handleGetFieldsValue,
      setFieldsValue: handleSetFieldsValue,
      resetFields: handleResetFields,
      setFieldValue: handleSetFieldValue,
      validateFields: handleValidateFields,
      submit: handleSubmit,
    }));

    React.useEffect(() => {
      if (pendingChangeRef.current) {
        const { changed, nextValues } = pendingChangeRef.current;
        pendingChangeRef.current = null;
        onValuesChange?.(changed, nextValues);
      }
    }, [values, onValuesChange]);

    const contextValue = React.useMemo(
      () => ({
        values,
        setFieldValue: handleSetFieldValue,
        setFieldsValue: handleSetFieldsValue,
      }),
      [values, handleSetFieldValue, handleSetFieldsValue],
    );

    return (
      <ProFormContext.Provider value={contextValue}>
        <form
          data-testid='pro-form'
          onSubmit={(event) => {
            event.preventDefault();
            void onFinish?.();
          }}
        >
          {typeof children === 'function' ? children({}) : children}
        </form>
      </ProFormContext.Provider>
    );
  };

  const LoginForm = ({ children, formRef, initialValues = {}, onFinish, submitter = {} }: any) => {
    const [values, setValues] = React.useState({ ...initialValues });

    const setFieldValue = (nameOrPath: any, value: any) => {
      const key = Array.isArray(nameOrPath) ? nameOrPath.join('.') : nameOrPath;
      setValues((prev: any) => ({ ...prev, [key]: value }));
    };

    React.useImperativeHandle(formRef, () => ({
      validateFields: () => Promise.resolve({ ...values }),
      setFieldsValue: (nextValues: any) => setValues((prev: any) => ({ ...prev, ...nextValues })),
    }));

    const handleSubmit = (event: any) => {
      event.preventDefault();
      onFinish?.({ ...values });
    };

    return (
      <form onSubmit={handleSubmit} data-testid='login-form'>
        <ProFormContext.Provider value={{ values, setFieldValue }}>
          {typeof children === 'function' ? children({}) : children}
        </ProFormContext.Provider>
        {submitter !== false ? (
          <button
            type='submit'
            data-testid='login-submit'
            disabled={submitter?.submitButtonProps?.disabled}
            data-loading={submitter?.submitButtonProps?.loading ? 'true' : 'false'}
          >
            Login
          </button>
        ) : null}
      </form>
    );
  };

  const ProFormText = ({ name, placeholder, fieldProps = {} }: any) => {
    const ctx = React.useContext(ProFormContext);
    const value = ctx?.values?.[name] ?? '';
    const inputType = fieldProps.type ?? 'text';
    return (
      <label>
        {placeholder ?? name}
        <input
          aria-label={placeholder ?? name}
          name={name}
          value={value}
          type={inputType}
          onChange={(event) => ctx?.setFieldValue?.(name, event.target.value)}
        />
      </label>
    );
  };

  const ProFormPassword = (props: any) => (
    <ProFormText {...props} fieldProps={{ ...(props.fieldProps ?? {}), type: 'password' }} />
  );
  (ProFormText as any).Password = ProFormPassword;

  const ProFormCheckbox = ({ name, children }: any) => {
    const ctx = React.useContext(ProFormContext);
    const checked = Boolean(ctx?.values?.[name]);
    return (
      <label>
        <input
          type='checkbox'
          name={name}
          checked={checked}
          onChange={(event) => ctx?.setFieldValue?.(name, event.target.checked)}
        />
        <span>{children}</span>
      </label>
    );
  };

  const ProFormSelect = ({ name, options = [], placeholder }: any) => {
    const ctx = React.useContext(ProFormContext);
    const value = ctx?.values?.[name] ?? '';
    return (
      <label>
        {placeholder ?? name}
        <select
          aria-label={placeholder ?? name}
          value={value}
          onChange={(event) => ctx?.setFieldValue?.(name, event.target.value)}
        >
          <option value=''>--</option>
          {options.map((option: any) => (
            <option key={option.value ?? option.label} value={option.value}>
              {toText(option.label ?? option.value)}
            </option>
          ))}
        </select>
      </label>
    );
  };

  const ProTable = ({
    request,
    actionRef,
    columns = [],
    rowKey = 'id',
    pagination,
    toolBarRender,
    headerTitle,
  }: any) => {
    const [rows, setRows] = React.useState<any[]>([]);
    const paramsRef = React.useRef<any>({
      current: pagination?.current ?? 1,
      pageSize: pagination?.pageSize ?? 10,
    });
    const requestRef = React.useRef<any>(request);

    const runRequest = React.useCallback(
      async (override: any = {}) => {
        paramsRef.current = { ...paramsRef.current, ...(override ?? {}) };
        const result = await requestRef.current?.(paramsRef.current, {});
        setRows(result?.data ?? []);
        return result;
      },
      [setRows],
    );

    React.useEffect(() => {
      requestRef.current = request;
    }, [request]);

    const scheduleRun = React.useCallback(
      (override: any = {}) =>
        new Promise((resolve) => {
          setTimeout(async () => {
            const result = await runRequest(override);
            resolve(result);
          }, 0);
        }),
      [runRequest],
    );

    React.useEffect(() => {
      const handlers = {
        reload: () => scheduleRun(),
        setPageInfo: (info: any) => scheduleRun(info ?? {}),
      };
      if (actionRef) {
        actionRef.current = handlers;
      }
      proComponentsMocks.lastProTableAction = handlers;
      return () => {
        if (actionRef) {
          actionRef.current = undefined;
        }
        if (proComponentsMocks.lastProTableAction === handlers) {
          proComponentsMocks.lastProTableAction = null;
        }
      };
    }, [actionRef, scheduleRun]);

    React.useEffect(() => {
      void runRequest();
    }, [runRequest]);

    const resolvedHeader = typeof headerTitle === 'function' ? headerTitle() : toText(headerTitle);
    const toolbar = toolBarRender?.() ?? [];

    const renderContent = (content: any, keyPrefix: string) => {
      if (Array.isArray(content)) {
        return content.map((item, index) => (
          <React.Fragment key={`${keyPrefix}-${index}`}>{item}</React.Fragment>
        ));
      }
      return content;
    };

    const renderToolbar = (nodes: any) => {
      const list = Array.isArray(nodes) ? nodes : [nodes];
      return list.map((node, index) => (
        <React.Fragment key={`toolbar-${index}`}>{node}</React.Fragment>
      ));
    };

    return (
      <div data-testid='pro-table'>
        <div data-testid='pro-table-header'>{resolvedHeader}</div>
        <div data-testid='pro-table-toolbar'>{renderToolbar(toolbar)}</div>
        <table>
          <tbody>
            {rows.map((row, rowIndex) => {
              const identifier =
                typeof rowKey === 'function'
                  ? rowKey(row, rowIndex)
                  : rowKey && row[rowKey]
                    ? row[rowKey]
                    : rowIndex;
              return (
                <tr key={identifier} data-testid={`pro-table-row-${identifier}`}>
                  {columns.map((column: any, columnIndex: number) => {
                    const value = column.dataIndex ? row[column.dataIndex] : undefined;
                    const cell = column.render
                      ? column.render(value, row, rowIndex)
                      : (value ?? column.title ?? null);
                    return (
                      <td
                        key={columnIndex}
                        data-testid={`pro-table-cell-${column.dataIndex ?? columnIndex}-${identifier}`}
                      >
                        {renderContent(cell, `render-${columnIndex}`)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const PageContainer = ({ title, header, children }: any) => (
    <div data-testid='page-container'>
      <div data-testid='page-container-title'>{header?.title ?? title}</div>
      <div data-testid='page-title'>{header?.title ?? title}</div>
      <div>{children}</div>
    </div>
  );

  const ProConfigProvider = ({ children }: any) => <>{children}</>;
  const ProLayout = ({ children }: any) => <div data-testid='pro-layout'>{children}</div>;

  return {
    __esModule: true,
    ActionType: {},
    PageContainer,
    ProConfigProvider,
    ProForm,
    ProFormCheckbox,
    ProFormSelect,
    ProFormText,
    ProLayout,
    ProTable,
    LoginForm,
    __ProFormContext: ProFormContext,
  };
};
