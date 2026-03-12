// @ts-nocheck
import PropertyCreate from '@/pages/Flows/Components/Property/create';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../../../../../helpers/testUtils';

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
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close</span>,
  PlusOutlined: () => <span>plus</span>,
}));

jest.mock('@/style/custom.less', () => ({
  __esModule: true,
  default: { footer_right: 'footer-right' },
}));

jest.mock('@/components/ToolBarButton', () => ({
  __esModule: true,
  default: ({ tooltip, onClick }: any) => (
    <button type='button' onClick={onClick}>
      {toText(tooltip) || 'button'}
    </button>
  ),
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

  const ProForm = ({ formRef, onValuesChange, onFinish, children }: any) => {
    const [values, setValues] = React.useState<any>({});

    React.useEffect(() => {
      if (!formRef) return;
      formRef.current = {
        submit: async () => onFinish?.(),
        resetFields: () => setValues({}),
        getFieldsValue: () => values,
        setFieldsValue: (next: any) => {
          setValues((prev: any) => {
            const merged = mergeDeep(prev, next);
            onValuesChange?.({}, merged);
            return merged;
          });
        },
      };
      lastFormApi = formRef.current;
    }, [formRef, onValuesChange, onFinish, values]);

    return <form>{children}</form>;
  };

  return {
    __esModule: true,
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

  const Drawer = ({ open, title, extra, footer, onClose, children }: any) =>
    open ? (
      <section role='dialog' aria-label={toText(title) || 'drawer'}>
        <header>{extra}</header>
        <div>{children}</div>
        <footer>{footer}</footer>
        <button type='button' onClick={onClose}>
          close
        </button>
      </section>
    ) : null;

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
  };
});

describe('FlowPropertyCreate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastFormApi = null;
  });

  it('submits the newly created property and closes the drawer', async () => {
    const onData = jest.fn();

    renderWithProviders(<PropertyCreate lang='en' onData={onData} />);

    await userEvent.click(screen.getByRole('button', { name: /create/i }));
    expect(screen.getByRole('dialog', { name: /create flow property/i })).toBeInTheDocument();

    await waitFor(() => expect(lastFormApi).not.toBeNull());
    lastFormApi.setFieldsValue({
      referenceToFlowPropertyDataSet: { '@refObjectId': 'fp-1' },
      meanValue: '10',
      quantitativeReference: true,
    });

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(onData).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceToFlowPropertyDataSet: { '@refObjectId': 'fp-1' },
        meanValue: '10',
        quantitativeReference: true,
      }),
    );
    expect(screen.queryByRole('dialog', { name: /create flow property/i })).not.toBeInTheDocument();
  });

  it('closes without saving when cancel is clicked', async () => {
    const onData = jest.fn();

    renderWithProviders(<PropertyCreate lang='en' onData={onData} />);

    await userEvent.click(screen.getByRole('button', { name: /create/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onData).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: /create flow property/i })).not.toBeInTheDocument();
  });
});
