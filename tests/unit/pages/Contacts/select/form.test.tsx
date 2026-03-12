// @ts-nocheck
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

jest.mock('@/pages/Contacts/Components/select/drawer', () => ({
  __esModule: true,
  default: ({ onData, buttonText }: any) => (
    <button type='button' onClick={() => onData?.('contact-1', '1.0.0')}>
      {toText(buttonText) || 'open drawer'}
    </button>
  ),
}));

jest.mock('@/pages/Contacts/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span>{`view ${id}:${version}`}</span>,
}));

jest.mock('@/pages/Contacts/Components/edit', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span>{`edit ${id}:${version}`}</span>,
}));

const mockGetContactDetail = jest.fn(async () => ({
  data: {
    id: 'contact-1',
    version: '1.0.0',
    userId: mockRefDataUserId,
    stateCode: 10,
    ruleVerification: false,
    json: {
      contactDataSet: {
        contactInformation: {
          dataSetInformation: {
            'common:shortName': [{ '@xml:lang': 'en', '#text': 'Contact short name' }],
          },
        },
      },
    },
  },
}));

jest.mock('@/services/contacts/api', () => ({
  __esModule: true,
  getContactDetail: (...args: any[]) => mockGetContactDetail(...args),
}));

jest.mock('@/services/contacts/util', () => ({
  __esModule: true,
  genContactFromData: jest.fn((payload: any) => payload ?? {}),
}));

const mockGetRefData = jest.fn(async () => ({
  data: {
    id: 'contact-1',
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

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  jsonToList: jest.fn((data: any) => (Array.isArray(data) ? data : data ? [data] : [])),
}));

const mockValidateRefObjectId = jest.fn();

jest.mock('@/pages/Utils', () => ({
  __esModule: true,
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

describe('ContactSelectForm', () => {
  const ContactSelectForm = require('@/pages/Contacts/Components/select/form').default;

  beforeEach(() => {
    Object.keys(formState).forEach((key) => delete formState[key]);
    mockRefCheckContextValue.refCheckData = [];
    mockCurrentUserId = 'user-1';
    mockRefDataUserId = 'user-1';
    jest.clearAllMocks();
  });

  it('handles nested selection and clearing for contact references', async () => {
    const onData = jest.fn();
    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    await act(async () => {
      renderWithProviders(
        <ContactSelectForm
          parentName={['parent']}
          name={['contact']}
          label='Contact'
          lang='en'
          formRef={formRef as any}
          onData={onData}
          rules={[{ required: true, message: 'Contact is required' }]}
          showRequiredLabel={true}
        />,
      );
    });

    expect(screen.getByTestId('required-title')).toHaveTextContent('Contact');

    await userEvent.click(screen.getByRole('button', { name: /open drawer/i }));

    await waitFor(() => expect(formState.parent.contact['@refObjectId']).toBe('contact-1'));
    expect(formState.parent.contact['@type']).toBe('contact data set');
    expect(formState.parent.contact['@uri']).toBe('../contacts/contact-1.xml');
    expect(formState.parent.contact['@version']).toBe('1.0.0');
    expect(formState.parent.contact['common:shortDescription'][0]['#text']).toBe(
      'Contact short name',
    );
    expect(mockValidateRefObjectId).toHaveBeenCalledWith(formRef, ['contact'], ['parent']);
    expect(onData).toHaveBeenCalledTimes(1);

    expect(await screen.findByText('view contact-1:1.0.0')).toBeInTheDocument();
    expect(screen.getByText('edit contact-1:1.0.0')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(formState.contact ?? undefined).toBeUndefined();
    expect(formState.parent.contact).toEqual({});
    expect(mockValidateRefObjectId).toHaveBeenCalledTimes(2);
    expect(onData).toHaveBeenCalledTimes(2);
  });

  it('keeps update/view actions while disabled and hides edit/reselect/clear', async () => {
    setValueAtPath(['parent', 'contact', '@refObjectId'], 'contact-1');
    setValueAtPath(['parent', 'contact', '@version'], '1.0.0');

    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    await act(async () => {
      renderWithProviders(
        <ContactSelectForm
          parentName={['parent']}
          name={['contact']}
          label='Contact'
          lang='en'
          formRef={formRef as any}
          onData={jest.fn()}
          disabled={true}
        />,
      );
    });

    await waitFor(() => expect(mockGetRefData).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /update reference/i })).toBeInTheDocument();
    expect(screen.getByText('view contact-1:1.0.0')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reselect/i })).not.toBeInTheDocument();
    expect(screen.queryByText('edit contact-1:1.0.0')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
  });

  it('renders ref-check error messaging for matched references in non-required mode', async () => {
    setValueAtPath(['contact', '@refObjectId'], 'contact-1');
    setValueAtPath(['contact', '@version'], '1.0.0');
    mockRefCheckContextValue.refCheckData = [
      {
        id: 'contact-1',
        version: '1.0.0',
        ruleVerification: true,
        nonExistent: true,
      },
    ];

    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    await act(async () => {
      renderWithProviders(
        <ContactSelectForm
          name={['contact']}
          label='Contact'
          lang='en'
          formRef={formRef as any}
          onData={jest.fn()}
        />,
      );
    });

    expect(await screen.findByText('err-ref')).toBeInTheDocument();
  });
});
