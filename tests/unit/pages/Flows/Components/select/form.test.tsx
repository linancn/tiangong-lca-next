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

jest.mock('@/pages/Flows/Components/select/drawer', () => ({
  __esModule: true,
  default: ({ onData, buttonText }: any) => (
    <button type='button' onClick={() => onData?.('flow-1', '1.0.0')}>
      {toText(buttonText) || 'open drawer'}
    </button>
  ),
}));

jest.mock('@/pages/Flows/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span>{`view ${id}:${version}`}</span>,
}));

jest.mock('@/pages/Flows/Components/edit', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span>{`edit ${id}:${version}`}</span>,
}));

jest.mock('@/pages/Unitgroups/Components/select/formMini', () => ({
  __esModule: true,
  default: ({ id, version, idType }: any) => (
    <span data-testid='unit-group-mini'>{`${idType}:${id}:${version}`}</span>
  ),
}));

const mockGetFlowDetail = jest.fn(async () => ({
  data: {
    id: 'flow-1',
    version: '1.0.0',
    userId: mockRefDataUserId,
    stateCode: 10,
    ruleVerification: false,
    json: {
      flowDataSet: {
        flowInformation: {
          dataSetInformation: {
            name: { baseName: [{ '@xml:lang': 'en', '#text': 'Flow short name' }] },
          },
        },
      },
    },
  },
}));

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  getFlowDetail: (...args: any[]) => mockGetFlowDetail(...args),
}));

jest.mock('@/services/flows/util', () => ({
  __esModule: true,
  genFlowFromData: jest.fn((payload: any) => payload ?? {}),
  genFlowNameJson: jest.fn(() => [{ '@xml:lang': 'en', '#text': 'Flow short name' }]),
}));

const mockGetRefData = jest.fn(async () => ({
  data: {
    id: 'flow-1',
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

describe('FlowsSelectForm', () => {
  const FlowsSelectForm = require('@/pages/Flows/Components/select/form').default;

  beforeEach(() => {
    Object.keys(formState).forEach((key) => delete formState[key]);
    mockRefCheckContextValue.refCheckData = [];
    mockCurrentUserId = 'user-1';
    mockRefDataUserId = 'user-1';
    jest.clearAllMocks();
  });

  it('handles flow selection, renders related actions, and clears the selected ref', async () => {
    const onData = jest.fn();
    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    await act(async () => {
      renderWithProviders(
        <FlowsSelectForm
          name={['reference']}
          label='Flow'
          lang='en'
          formRef={formRef as any}
          drawerVisible={true}
          onData={onData}
          rules={[{ required: true, message: 'Flow is required' }]}
        />,
      );
    });

    expect(screen.getByTestId('required-title')).toHaveTextContent('Flow');

    await userEvent.click(screen.getByRole('button', { name: /open drawer/i }));

    await waitFor(() => expect(formState.reference['@refObjectId']).toBe('flow-1'));
    expect(formState.reference['@type']).toBe('flow data set');
    expect(formState.reference['@uri']).toBe('../flows/flow-1.xml');
    expect(formState.reference['common:shortDescription'][0]['#text']).toBe('Flow short name');
    expect(mockValidateRefObjectId).toHaveBeenCalledWith(formRef, ['reference']);
    expect(onData).toHaveBeenCalledTimes(1);

    expect(await screen.findByText('view flow-1:1.0.0')).toBeInTheDocument();
    expect(screen.getByText('edit flow-1:1.0.0')).toBeInTheDocument();
    expect(screen.getByTestId('unit-group-mini')).toHaveTextContent('flow:flow-1:1.0.0');

    await userEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(formState.reference).toEqual({});
    expect(mockValidateRefObjectId).toHaveBeenCalledTimes(2);
    expect(onData).toHaveBeenCalledTimes(2);
  });

  it('only restores existing selections when the parent drawer is open', async () => {
    setValueAtPath(['reference', '@refObjectId'], 'flow-1');
    setValueAtPath(['reference', '@version'], '1.0.0');
    mockRefCheckContextValue.refCheckData = [
      {
        id: 'flow-1',
        version: '1.0.0',
        ruleVerification: true,
        nonExistent: true,
      },
    ];
    mockRefDataUserId = 'other-user';

    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    const { rerender } = renderWithProviders(
      <FlowsSelectForm
        name={['reference']}
        label='Flow'
        lang='en'
        formRef={formRef as any}
        drawerVisible={false}
        onData={jest.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /reselect/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /update reference/i })).not.toBeInTheDocument();

    rerender(
      <FlowsSelectForm
        name={['reference']}
        label='Flow'
        lang='en'
        formRef={formRef as any}
        drawerVisible={true}
        onData={jest.fn()}
      />,
    );

    await waitFor(() => expect(mockGetRefData).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /reselect/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update reference/i })).toBeInTheDocument();
    expect(screen.getByText('view flow-1:1.0.0')).toBeInTheDocument();
    expect(screen.queryByText('edit flow-1:1.0.0')).not.toBeInTheDocument();
    expect(screen.getByText('err-ref')).toBeInTheDocument();
  });
});
