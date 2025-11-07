// @ts-nocheck
import FlowpropertiesSelectForm from '@/pages/Flowproperties/Components/select/form';
import userEvent from '@testing-library/user-event';
import { act, renderWithProviders, screen, waitFor } from '../../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useModel: () => ({ initialState: {} }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close</span>,
  PlusOutlined: () => <span>plus</span>,
}));

jest.mock('antd', () => {
  const React = require('react');

  const ConfigProvider = ({ children }: any) => <div>{children}</div>;

  const Button = ({ children, onClick, disabled, icon, ...rest }: any) => (
    <button type='button' onClick={disabled ? undefined : onClick} disabled={disabled} {...rest}>
      {icon}
      {children}
    </button>
  );

  const Card = ({ title, children }: any) => (
    <div>
      <div>{toText(title)}</div>
      <div>{children}</div>
    </div>
  );

  const Form = ({ children }: any) => <form>{children}</form>;
  Form.Item = ({ label, children }: any) => (
    <label>
      <span>{toText(label)}</span>
      {children}
    </label>
  );
  Form.List = ({ children }: any) => (
    <div>
      {typeof children === 'function'
        ? children([], { add: () => {}, remove: () => {} })
        : children}
    </div>
  );

  const Input = ({ value = '', onChange, placeholder, disabled }: any) => (
    <input
      value={value}
      onChange={(event) => onChange?.({ target: { value: event.target.value } })}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={disabled}
    />
  );
  Input.TextArea = ({ value = '', onChange, ...rest }: any) => (
    <textarea
      value={value}
      onChange={(event) => onChange?.({ target: { value: event.target.value } })}
      {...rest}
    />
  );

  const Row = ({ children }: any) => <div>{children}</div>;
  const Col = ({ children }: any) => <div>{children}</div>;
  const Divider = ({ children }: any) => <div>{toText(children)}</div>;

  const Space = ({ children }: any) => <div>{children}</div>;

  const theme = {
    useToken: () => ({
      token: {
        colorError: '#ff4d4f',
      },
    }),
  };

  return {
    __esModule: true,
    Button,
    Card,
    Form,
    Input,
    Row,
    Col,
    Divider,
    Space,
    theme,
    ConfigProvider,
  };
});

jest.mock('@/components/RequiredSelectFormTitle', () => ({
  __esModule: true,
  default: ({ label }: any) => <span>{label}</span>,
}));

jest.mock('@/pages/Flowproperties/Components/select/drawer', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ onData }: any) => (
      <button type='button' onClick={() => onData?.('fp-1', '1.0.0')}>
        open drawer
      </button>
    ),
  };
});

jest.mock('@/pages/Flowproperties/Components/view', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ id, version }: any) => <span>{`view ${id}:${version}`}</span>,
  };
});

jest.mock('@/pages/Flowproperties/Components/edit', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ id, version }: any) => <span>{`edit ${id}:${version}`}</span>,
  };
});

jest.mock('@/pages/Unitgroups/Components/select/formMini', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }: any) => <div>{children}</div>,
  };
});

jest.mock('@/services/flowproperties/api', () => ({
  __esModule: true,
  getFlowpropertyDetail: jest.fn(async () => ({
    data: {
      json: {
        flowPropertyDataSet: {
          flowPropertiesInformation: {
            dataSetInformation: {
              'common:name': [{ '#text': 'Water mass', '@lang': 'en' }],
            },
          },
        },
      },
      version: '1.0.0',
    },
  })),
}));

jest.mock('@/services/flowproperties/util', () => ({
  __esModule: true,
  genFlowpropertyFromData: jest.fn((payload: any) => payload ?? {}),
}));

const mockValidateRefObjectId = jest.fn();

jest.mock('@/pages/Utils', () => ({
  __esModule: true,
  getLocalValueProps: jest.fn(),
  validateRefObjectId: (...args: any[]) => mockValidateRefObjectId(...args),
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  getRefData: jest.fn(async () => ({
    data: { id: 'fp-1', version: '1.0.0' },
  })),
}));

const refCheckContextValue = { refCheckData: [] };
jest.mock('@/contexts/refCheckContext', () => {
  const React = require('react');
  const RefCheckContext = React.createContext(refCheckContextValue);
  return {
    __esModule: true,
    RefCheckContext,
    useRefCheckContext: () => refCheckContextValue,
  };
});

const formState: Record<string, any> = {};

const setValueAtPath = (path: any[], value: any) => {
  let cursor = formState;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    cursor[key] = cursor[key] ? { ...cursor[key] } : {};
    cursor = cursor[key];
  }
  cursor[path[path.length - 1]] = value;
};

const getValueAtPath = (path: any[]) => {
  let cursor: any = formState;
  for (let index = 0; index < path.length; index += 1) {
    const key = path[index];
    cursor = cursor?.[key];
    if (cursor === undefined) return undefined;
  }
  return cursor;
};

describe('FlowpropertiesSelectForm', () => {
  beforeEach(() => {
    Object.keys(formState).forEach((key) => delete formState[key]);
    jest.clearAllMocks();
  });

  it('handles selection and updates form reference', async () => {
    const onData = jest.fn();

    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    await act(async () => {
      renderWithProviders(
        <FlowpropertiesSelectForm
          name={['reference']}
          label='Flow property'
          lang='en'
          formRef={formRef as any}
          drawerVisible={false}
          onData={onData}
        />,
      );
    });

    await userEvent.click(screen.getByRole('button', { name: /open drawer/i }));

    await waitFor(() => expect(formState.reference['@refObjectId']).toBe('fp-1'));
    expect(formState.reference['@version']).toBe('1.0.0');
    expect(formState.reference['common:shortDescription'][0]['#text']).toBe('Water mass');
    expect(mockValidateRefObjectId).toHaveBeenCalled();
    expect(onData).toHaveBeenCalled();
    expect(screen.getByText('edit fp-1:1.0.0')).toBeInTheDocument();
    expect(screen.getByText('view fp-1:1.0.0')).toBeInTheDocument();
  });
});
