// @ts-nocheck
import userEvent from '@testing-library/user-event';
import { act, renderWithProviders, screen, waitFor } from '../../../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

const mockRefCheckContextValue = { refCheckData: [] as any[] };
let mockCurrentUserId = 'user-1';
let mockRefDataUserId = 'user-1';

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useModel: () => ({ initialState: { currentUser: { userid: mockCurrentUserId } } }),
}));

jest.mock('antd', () => {
  const React = require('react');

  const ConfigProvider = ({ children }: any) => <div>{children}</div>;
  const Button = ({ children, onClick, disabled }: any) => (
    <button type='button' onClick={disabled ? undefined : onClick} disabled={disabled}>
      {toText(children)}
    </button>
  );
  const Card = ({ title, children }: any) => (
    <div>
      <div>{title}</div>
      <div>{children}</div>
    </div>
  );
  const Form = ({ children }: any) => <form>{children}</form>;
  Form.Item = ({ label, children, getValueProps }: any) => {
    const content = React.Children.only(children);
    if (content && React.isValidElement(content) && getValueProps) {
      return (
        <label>
          <span>{toText(label)}</span>
          {React.cloneElement(content, getValueProps(content.props.value))}
        </label>
      );
    }
    return (
      <label>
        <span>{toText(label)}</span>
        {children}
      </label>
    );
  };
  Form.List = ({ children }: any) => (
    <div>
      {typeof children === 'function'
        ? children([], { add: () => {}, remove: () => {} })
        : children}
    </div>
  );
  const Input = ({ value = '', onChange, disabled, placeholder }: any) => (
    <input
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={disabled}
      onChange={(event) => onChange?.({ target: { value: event.target.value } })}
    />
  );
  Input.TextArea = ({ value = '', onChange, disabled, ...rest }: any) => (
    <textarea
      value={value}
      disabled={disabled}
      readOnly={disabled}
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
        colorTextDescription: '#8c8c8c',
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
  default: ({ label }: any) => <span data-testid='required-title'>{toText(label)}</span>,
  ErrRefTipMessage: () => <span>err-ref</span>,
}));

jest.mock('@/pages/Flowproperties/Components/select/drawer', () => ({
  __esModule: true,
  default: ({ onData, buttonText }: any) => (
    <button type='button' onClick={() => onData?.('flowproperty-1', '1.0.0')}>
      {toText(buttonText) || 'open drawer'}
    </button>
  ),
}));

jest.mock('@/pages/Flowproperties/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span>{`view ${id}:${version}`}</span>,
}));

jest.mock('@/pages/Flowproperties/Components/edit', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span>{`edit ${id}:${version}`}</span>,
}));

jest.mock('@/pages/Unitgroups/Components/select/formMini', () => ({
  __esModule: true,
  default: ({ id, version, idType }: any) => (
    <div data-testid='unitgroup-mini'>{`${id}:${version}:${idType}`}</div>
  ),
}));

const mockGetFlowpropertyDetail = jest.fn(async () => ({
  data: {
    id: 'flowproperty-1',
    version: '1.0.0',
    userId: mockRefDataUserId,
    stateCode: 10,
    ruleVerification: false,
    json: {
      flowPropertyDataSet: {
        flowPropertiesInformation: {
          dataSetInformation: {
            'common:name': [{ '@xml:lang': 'en', '#text': 'Flow property short name' }],
          },
        },
      },
    },
  },
}));

jest.mock('@/services/flowproperties/api', () => ({
  __esModule: true,
  getFlowpropertyDetail: (...args: any[]) => mockGetFlowpropertyDetail(...args),
}));

jest.mock('@/services/flowproperties/util', () => ({
  __esModule: true,
  genFlowpropertyFromData: jest.fn((payload: any) => payload ?? {}),
}));

const mockGetRefData = jest.fn(async () => ({
  data: {
    id: 'flowproperty-1',
    version: '1.0.0',
    userId: mockRefDataUserId,
    stateCode: 10,
    ruleVerification: false,
  },
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  getRefData: (...args: any[]) => mockGetRefData(...args),
}));

const mockValidateRefObjectId = jest.fn();
const mockGetLocalValueProps = jest.fn((value: string) => ({
  value: value === 'en' ? 'English' : value,
}));

jest.mock('@/pages/Utils', () => ({
  __esModule: true,
  getLocalValueProps: (...args: any[]) => mockGetLocalValueProps(...args),
  validateRefObjectId: (...args: any[]) => mockValidateRefObjectId(...args),
}));

jest.mock('@/contexts/refCheckContext', () => {
  const React = require('react');
  const RefCheckContext = React.createContext(mockRefCheckContextValue);
  return {
    __esModule: true,
    RefCheckContext,
    RefCheckType: class {},
    useRefCheckContext: () => mockRefCheckContextValue,
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
    cursor = cursor?.[path[index]];
    if (cursor === undefined) return undefined;
  }
  return cursor;
};

describe('FlowpropertySelectForm', () => {
  const FlowpropertySelectForm = require('@/pages/Flowproperties/Components/select/form').default;

  beforeEach(() => {
    Object.keys(formState).forEach((key) => delete formState[key]);
    mockRefCheckContextValue.refCheckData = [];
    mockCurrentUserId = 'user-1';
    mockRefDataUserId = 'user-1';
    jest.clearAllMocks();
  });

  it('selects a flow property, supports refresh, and clears the selected reference', async () => {
    const onData = jest.fn();
    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    await act(async () => {
      renderWithProviders(
        <FlowpropertySelectForm
          name={['reference']}
          label='Flow property'
          lang='en'
          formRef={formRef as any}
          drawerVisible={false}
          onData={onData}
          rules={[{ required: true, message: 'Flow property is required' }]}
        />,
      );
    });

    expect(screen.getByTestId('required-title')).toHaveTextContent('Flow property');

    await userEvent.click(screen.getByRole('button', { name: /open drawer/i }));

    await waitFor(() => expect(formState.reference['@refObjectId']).toBe('flowproperty-1'));
    expect(formState.reference['common:shortDescription']).toEqual([
      { '@xml:lang': 'en', '#text': 'Flow property short name' },
    ]);
    expect(mockValidateRefObjectId).toHaveBeenCalledWith(formRef, ['reference']);
    expect(onData).toHaveBeenCalled();
    expect(screen.getByText('view flowproperty-1:1.0.0')).toBeInTheDocument();
    expect(screen.getByText('edit flowproperty-1:1.0.0')).toBeInTheDocument();
    expect(screen.getByTestId('unitgroup-mini')).toHaveTextContent(
      'flowproperty-1:1.0.0:flowproperty',
    );

    await userEvent.click(screen.getByRole('button', { name: /update reference/i }));
    await waitFor(() => expect(mockGetFlowpropertyDetail).toHaveBeenCalledTimes(2));

    await userEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(formState.reference).toEqual({});
  });

  it('loads an existing reference and hides edit access for non-owners', async () => {
    setValueAtPath(['reference'], {
      '@refObjectId': 'flowproperty-1',
      '@version': '1.0.0',
    });
    mockCurrentUserId = 'user-1';
    mockRefDataUserId = 'user-2';

    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    await act(async () => {
      renderWithProviders(
        <FlowpropertySelectForm
          name={['reference']}
          label='Flow property'
          lang='en'
          formRef={formRef as any}
          drawerVisible
          onData={jest.fn()}
        />,
      );
    });

    await waitFor(() =>
      expect(mockGetRefData).toHaveBeenCalledWith('flowproperty-1', '1.0.0', 'flowproperties', ''),
    );
    expect(screen.getByRole('button', { name: /reselect/i })).toBeInTheDocument();
    expect(screen.getByText('view flowproperty-1:1.0.0')).toBeInTheDocument();
    expect(screen.queryByText('edit flowproperty-1:1.0.0')).not.toBeInTheDocument();
    expect(screen.getByTestId('unitgroup-mini')).toHaveTextContent(
      'flowproperty-1:1.0.0:flowproperty',
    );
  });
});
