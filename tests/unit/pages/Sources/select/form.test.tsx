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

jest.mock('@umijs/max', () => ({
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

jest.mock('@/pages/Sources/Components/select/drawer', () => ({
  __esModule: true,
  default: ({ onData, buttonText }: any) => (
    <button type='button' onClick={() => onData?.('source-1', '1.0.0')}>
      {toText(buttonText) || 'open drawer'}
    </button>
  ),
}));

jest.mock('@/pages/Sources/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span>{`view ${id}:${version}`}</span>,
}));

jest.mock('@/pages/Sources/Components/edit', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span>{`edit ${id}:${version}`}</span>,
}));

const mockGetSourceDetail = jest.fn(async (id: string) => {
  if (id === 'a97a0155-0234-4b87-b4ce-a45da52f2a40') {
    return {
      success: true,
      data: {
        id,
        version: '2.0.0',
        userId: mockRefDataUserId,
        json: {
          sourceDataSet: {
            sourceInformation: {
              dataSetInformation: {
                'common:shortName': [{ '@xml:lang': 'en', '#text': 'ILCD format short name' }],
              },
            },
          },
        },
      },
    };
  }

  return {
    success: true,
    data: {
      id: 'source-1',
      version: '1.0.0',
      userId: mockRefDataUserId,
      stateCode: 10,
      ruleVerification: false,
      json: {
        sourceDataSet: {
          sourceInformation: {
            dataSetInformation: {
              'common:shortName': [{ '@xml:lang': 'en', '#text': 'Source short name' }],
            },
          },
        },
      },
    },
  };
});

jest.mock('@/services/sources/api', () => ({
  __esModule: true,
  getSourceDetail: (...args: any[]) => mockGetSourceDetail(...args),
}));

jest.mock('@/services/sources/util', () => ({
  __esModule: true,
  genSourceFromData: jest.fn((payload: any) => payload ?? {}),
}));

const mockGetRefData = jest.fn(async () => ({
  data: {
    id: 'source-1',
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

describe('SourceSelectForm', () => {
  const SourceSelectForm = require('@/pages/Sources/Components/select/form').default;

  beforeEach(() => {
    Object.keys(formState).forEach((key) => delete formState[key]);
    mockRefCheckContextValue.refCheckData = [];
    mockCurrentUserId = 'user-1';
    mockRefDataUserId = 'user-1';
    jest.clearAllMocks();
  });

  it('handles nested selection and clearing for source references', async () => {
    const onData = jest.fn();
    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    await act(async () => {
      renderWithProviders(
        <SourceSelectForm
          parentName={['parent']}
          name={['source']}
          label='Source'
          lang='en'
          formRef={formRef as any}
          onData={onData}
          rules={[{ required: true, message: 'Source is required' }]}
          showRequiredLabel={true}
        />,
      );
    });

    expect(screen.getByTestId('required-title')).toHaveTextContent('Source');

    await userEvent.click(screen.getByRole('button', { name: /open drawer/i }));

    await waitFor(() => expect(formState.parent.source['@refObjectId']).toBe('source-1'));
    expect(formState.parent.source['@type']).toBe('source data set');
    expect(formState.parent.source['@uri']).toBe('../sources/source-1.xml');
    expect(formState.parent.source['common:shortDescription'][0]['#text']).toBe(
      'Source short name',
    );
    expect(mockValidateRefObjectId).toHaveBeenCalledWith(formRef, ['source'], ['parent']);
    expect(onData).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(formState.parent.source).toEqual({});
    expect(formState.source ?? undefined).toBeUndefined();
    expect(mockValidateRefObjectId).toHaveBeenCalledTimes(2);
    expect(onData).toHaveBeenCalledTimes(2);
  });

  it('hydrates the known default source reference by name', async () => {
    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    await act(async () => {
      renderWithProviders(
        <SourceSelectForm
          name={['source']}
          label='Source'
          lang='en'
          formRef={formRef as any}
          onData={jest.fn()}
          defaultSourceName='ILCD format'
        />,
      );
    });

    await waitFor(() =>
      expect(formState.source['@refObjectId']).toBe('a97a0155-0234-4b87-b4ce-a45da52f2a40'),
    );
    expect(formState.source['@version']).toBe('2.0.0');
    expect(formState.source['common:shortDescription'][0]['#text']).toBe('ILCD format short name');
  });

  it('renders matched ref-check errors in non-required mode', async () => {
    setValueAtPath(['source', '@refObjectId'], 'source-1');
    setValueAtPath(['source', '@version'], '1.0.0');
    mockRefCheckContextValue.refCheckData = [
      {
        id: 'source-1',
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
        <SourceSelectForm
          name={['source']}
          label='Source'
          lang='en'
          formRef={formRef as any}
          onData={jest.fn()}
        />,
      );
    });

    expect(await screen.findByText('err-ref')).toBeInTheDocument();
  });
});
