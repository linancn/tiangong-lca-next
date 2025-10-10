// @ts-nocheck
import TargetAmount from '@/pages/LifeCycleModels/Components/toolbar/editTargetAmount';
import userEvent from '@testing-library/user-event';
import { act, render, screen, waitFor } from '../../../../../helpers/testUtils';

let proFormApi: any = null;

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
}));

jest.mock('@/style/custom.less', () => ({
  __esModule: true,
  default: { footer_right: 'footer-right' },
}));

jest.mock('@/pages/Flows/Components/view', () => ({
  __esModule: true,
  default: () => <span>flows-view</span>,
}));

jest.mock('@/components/LangTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='lang-text'>{JSON.stringify(data)}</div>,
}));

jest.mock('@/pages/Unitgroups/Components/select/descriptionMini', () => ({
  __esModule: true,
  default: () => <div>unit-group</div>,
}));

const mockGetProcessDetail = jest.fn();
jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessDetail: (...args: any[]) => mockGetProcessDetail(...args),
}));

const mockGenProcessFromData = jest.fn();
jest.mock('@/services/processes/util', () => ({
  __esModule: true,
  genProcessFromData: (...args: any[]) => mockGenProcessFromData(...args),
}));

jest.mock('antd', () => {
  const React = require('react');
  const { toText } = require('../../../../../helpers/nodeToText');

  const Button = ({ children, onClick, disabled = false, icon, htmlType = 'button' }: any) => (
    <button
      type={htmlType === 'submit' ? 'submit' : htmlType === 'reset' ? 'reset' : 'button'}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
    >
      {icon}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ children }: any) => <>{children}</>;

  const Drawer = ({ open, title, extra, footer, children, onClose }: any) => {
    if (!open) return null;
    const label = toText(title) || 'drawer';
    return (
      <section role='dialog' aria-label={label}>
        <header>
          <div>{extra}</div>
          <button type='button' onClick={onClose}>
            close
          </button>
        </header>
        <div>{children}</div>
        <footer>{footer}</footer>
      </section>
    );
  };

  const Space = ({ children, className }: any) => <div className={className ?? ''}>{children}</div>;

  const Card = ({ children, title }: any) => (
    <section>
      <header>{toText(title)}</header>
      <div>{children}</div>
    </section>
  );

  const Descriptions = ({ children }: any) => <dl>{children}</dl>;
  Descriptions.Item = ({ label, children }: any) => (
    <div>
      <dt>{toText(label)}</dt>
      <dd>{children}</dd>
    </div>
  );

  const Divider = ({ children }: any) => <div>{toText(children)}</div>;

  const Input = ({ value, onChange, disabled = false, 'aria-label': ariaLabel }: any) => (
    <input
      aria-label={ariaLabel}
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => onChange?.({ target: { value: event.target.value } })}
    />
  );

  const FormItem = ({ label, children }: any) => {
    const labelText = toText(label);
    return (
      <label>
        <span>{labelText}</span>
        {React.Children.map(children, (child: any) =>
          React.cloneElement(child, { 'aria-label': labelText }),
        )}
      </label>
    );
  };

  const Form = ({ children }: any) => <div>{children}</div>;
  Form.Item = FormItem;

  return {
    __esModule: true,
    Button,
    Tooltip,
    Drawer,
    Space,
    Card,
    Input,
    Form,
    Descriptions,
    Divider,
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const setNestedValue = (source: any, path: any[], value: any) => {
    const next = { ...source };
    let cursor = next;
    path.forEach((key: string, index: number) => {
      if (index === path.length - 1) {
        cursor[key] = value;
      } else {
        cursor[key] = { ...(cursor[key] ?? {}) };
        cursor = cursor[key];
      }
    });
    return next;
  };

  const getNestedValue = (source: any, path: any[]) => {
    return path.reduce((acc: any, key: string) => (acc ? acc[key] : undefined), source);
  };

  const buildChangedValue = (path: any[], value: any) => {
    return path.reduceRight((acc: any, key: string) => ({ [key]: acc }), value);
  };

  const FormContext = React.createContext<any>(null);

  const ProForm = ({
    formRef,
    initialValues = {},
    onValuesChange,
    onFinish,
    submitter,
    children,
  }: any) => {
    const valuesRef = React.useRef({ ...initialValues });

    const setValue = React.useCallback(
      (namePath: any[], value: any) => {
        valuesRef.current = setNestedValue(valuesRef.current, namePath, value);
        const changed = buildChangedValue(namePath, value);
        onValuesChange?.(changed, { ...valuesRef.current });
      },
      [onValuesChange],
    );

    const contextValue = React.useMemo(
      () => ({
        getValue: (name: any) => {
          const path = Array.isArray(name) ? name : [name];
          return getNestedValue(valuesRef.current, path);
        },
        setValue: (name: any, value: any) => {
          const path = Array.isArray(name) ? name : [name];
          setValue(path, value);
        },
      }),
      [setValue],
    );

    const api = React.useMemo(
      () => ({
        submit: async () => onFinish?.({ ...valuesRef.current }),
        resetFields: () => {
          valuesRef.current = { ...initialValues };
        },
        setFieldsValue: (next: any) => {
          valuesRef.current = { ...valuesRef.current, ...next };
        },
        getFieldsValue: () => ({ ...valuesRef.current }),
        setFieldValue: (name: any, value: any) => {
          const path = Array.isArray(name) ? name : [name];
          setValue(path, value);
        },
        getFieldValue: (name: any) => {
          const path = Array.isArray(name) ? name : [name];
          return getNestedValue(valuesRef.current, path);
        },
      }),
      [initialValues, onFinish, setValue],
    );

    React.useEffect(() => {
      if (formRef) {
        formRef.current = api;
      }
      proFormApi = api;
    }, [api, formRef]);

    return (
      <FormContext.Provider value={contextValue}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onFinish?.({ ...valuesRef.current });
          }}
        >
          {typeof children === 'function' ? children(valuesRef.current) : children}
          {submitter?.render?.() ?? null}
        </form>
      </FormContext.Provider>
    );
  };

  const ProFormContext = FormContext;

  const ProFormField = ({ name, children }: any) => {
    const context = React.useContext(ProFormContext);
    const value = context?.getValue(name);
    const handleChange = (event: any) => {
      const nextValue = event?.target?.value ?? event;
      context?.setValue(name, nextValue);
    };
    return React.cloneElement(children, {
      value: value ?? '',
      onChange: handleChange,
    });
  };

  return {
    __esModule: true,
    ProForm,
    ProFormField,
    ProFormInstance: {},
  };
});

beforeEach(() => {
  proFormApi = null;
  mockGetProcessDetail.mockReset();
  mockGenProcessFromData.mockReset();
});

const buildProcessDataset = () => ({
  processInformation: {
    dataSetInformation: {
      name: { baseName: [{ '@lang': 'en', '#text': 'Process name' }] },
      'common:generalComment': [{ '@lang': 'en', '#text': 'comment' }],
    },
    quantitativeReference: {
      referenceToReferenceFlow: 'ref-1',
    },
  },
  exchanges: {
    exchange: [
      {
        '@dataSetInternalID': 'ref-1',
        meanAmount: 10,
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-1',
          '@version': '1.0',
          '@uri': 'uri-1',
          '@type': 'type-1',
          'common:shortDescription': [{ '@lang': 'en', '#text': 'flow short' }],
        },
      },
    ],
  },
});

describe('TargetAmount', () => {
  it('prefills target and scaling amounts when drawer opens', async () => {
    const dataset = buildProcessDataset();
    mockGetProcessDetail.mockResolvedValue({ data: { json: { processDataSet: {} } } });
    mockGenProcessFromData.mockReturnValue(dataset);

    const setDrawerVisible = jest.fn();
    const onData = jest.fn();

    render(
      <TargetAmount
        refNode={{ data: { id: 'proc-1', version: '1.0' } }}
        drawerVisible={true}
        lang='en'
        setDrawerVisible={setDrawerVisible}
        onData={onData}
      />,
    );

    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalledTimes(1));

    expect(proFormApi).not.toBeNull();
    expect(proFormApi.getFieldsValue()).toEqual({
      targetAmount: 10,
      originalAmount: 10,
      scalingFactor: 1,
    });
  });

  it('updates scaling factor when target amount changes', async () => {
    const dataset = buildProcessDataset();
    mockGetProcessDetail.mockResolvedValue({ data: { json: { processDataSet: {} } } });
    mockGenProcessFromData.mockReturnValue(dataset);

    render(
      <TargetAmount
        refNode={{ data: { id: 'proc-1', version: '1.0' } }}
        drawerVisible={true}
        lang='en'
        setDrawerVisible={jest.fn()}
        onData={jest.fn()}
      />,
    );

    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalledTimes(1));

    await act(async () => {
      proFormApi.setFieldValue('targetAmount', 25);
    });

    expect(proFormApi.getFieldValue('targetAmount')).toBe(25);
    expect(proFormApi.getFieldValue('scalingFactor')).toBe('2.5');
  });

  it('submits form values and closes drawer', async () => {
    const dataset = buildProcessDataset();
    mockGetProcessDetail.mockResolvedValue({ data: { json: { processDataSet: {} } } });
    mockGenProcessFromData.mockReturnValue(dataset);

    const setDrawerVisible = jest.fn();
    const onData = jest.fn();

    render(
      <TargetAmount
        refNode={{ data: { id: 'proc-1', version: '1.0' } }}
        drawerVisible={true}
        lang='en'
        setDrawerVisible={setDrawerVisible}
        onData={onData}
      />,
    );

    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onData).toHaveBeenCalledWith({
      targetAmount: 10,
      originalAmount: 10,
      scalingFactor: 1,
    });
    expect(setDrawerVisible).toHaveBeenCalledWith(false);
  });
});
