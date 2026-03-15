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

let mockRefCheckContextValue = { refCheckData: [] as any[] };
let mockCurrentUserId = 'user-1';
let mockRefDataUserId = 'user-1';
const mockFormItemRulesRegistry = new Map<string, any[]>();
const mockUseRefCheckContext = jest.fn(() => mockRefCheckContextValue);
const mockFormState: Record<string, any> = {};

const mockSetValueAtPath = (path: any[], value: any) => {
  let cursor = mockFormState;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    cursor[key] = cursor[key] ? { ...cursor[key] } : {};
    cursor = cursor[key];
  }
  cursor[path[path.length - 1]] = value;
};

const mockGetValueAtPath = (path: any[]) => {
  let cursor: any = mockFormState;
  for (let index = 0; index < path.length; index += 1) {
    cursor = cursor?.[path[index]];
    if (cursor === undefined) return undefined;
  }
  return cursor;
};

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
  Form.Item = ({ label, children, getValueProps, name, rules }: any) => {
    const path = Array.isArray(name) ? name : name ? [name] : null;
    if (path) {
      mockFormItemRulesRegistry.set(path.join('.'), rules ?? []);
    }
    const content = React.Children.only(children);
    const value = path ? mockGetValueAtPath(path) : content?.props?.value;
    if (content && React.isValidElement(content) && getValueProps) {
      return (
        <label>
          <span>{toText(label)}</span>
          {React.cloneElement(content, getValueProps(value))}
        </label>
      );
    }
    if (content && React.isValidElement(content) && path) {
      return (
        <label>
          <span>{toText(label)}</span>
          {React.cloneElement(content, { value })}
          {rules?.some((rule: any) => typeof rule?.validator === 'function') && (
            <button
              type='button'
              onClick={() =>
                rules
                  .find((rule: any) => typeof rule?.validator === 'function')
                  ?.validator({}, value)
                  ?.catch(() => undefined)
              }
            >
              {`validate ${path.join('.')}`}
            </button>
          )}
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
  Form.List = ({ children, name }: any) => {
    const path = Array.isArray(name) ? name : name ? [name] : [];
    const currentValue = mockGetValueAtPath(path);
    const subFields = Array.isArray(currentValue)
      ? currentValue.map((_: any, index: number) => ({ key: index, name: index }))
      : [];
    return (
      <div>
        {typeof children === 'function'
          ? children(subFields, { add: () => {}, remove: () => {} })
          : children}
      </div>
    );
  };
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
  default: ({ label, errRef }: any) => (
    <span data-testid='required-title'>
      {toText(label)}
      {errRef ? ' err-ref' : ''}
    </span>
  ),
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
  default: ({ id, version, updateErrRef }: any) => (
    <div>
      <span>{`edit ${id}:${version}`}</span>
      <button
        type='button'
        onClick={() =>
          updateErrRef?.({
            id: `${id}-edited`,
            version,
            ruleVerification: false,
            nonExistent: false,
          })
        }
      >
        trigger edit err ref
      </button>
    </div>
  ),
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
    useRefCheckContext: () => mockUseRefCheckContext(),
  };
});

describe('FlowpropertySelectForm', () => {
  const flowpropertySelectFormModule = require('@/pages/Flowproperties/Components/select/form');
  const FlowpropertySelectForm = flowpropertySelectFormModule.default;
  const { resolveRefErrorFromContext, validateRequiredReferenceValue } =
    flowpropertySelectFormModule;

  beforeEach(() => {
    Object.keys(mockFormState).forEach((key) => delete mockFormState[key]);
    mockRefCheckContextValue = { refCheckData: [] };
    mockCurrentUserId = 'user-1';
    mockRefDataUserId = 'user-1';
    mockFormItemRulesRegistry.clear();
    jest.clearAllMocks();
    mockUseRefCheckContext.mockImplementation(() => mockRefCheckContextValue);
  });

  it('selects a flow property, supports refresh, and clears the selected reference', async () => {
    const onData = jest.fn();
    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => mockSetValueAtPath(path, value),
        getFieldValue: (path: any[]) => mockGetValueAtPath(path),
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

    await waitFor(() => expect(mockFormState.reference['@refObjectId']).toBe('flowproperty-1'));
    expect(mockFormState.reference['common:shortDescription']).toEqual([
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
    expect(mockFormState.reference).toEqual({});
  });

  it('resolves ref-check errors across id, refData, and stale-error cases', () => {
    const matchedById = resolveRefErrorFromContext({
      refCheckData: [
        { id: 'flowproperty-1', version: '1.0.0', ruleVerification: false, nonExistent: false },
      ],
      id: 'flowproperty-1',
      version: '1.0.0',
      refData: null,
      currentErrRef: null,
    });
    expect(matchedById?.id).toBe('flowproperty-1');

    const matchedByRefData = resolveRefErrorFromContext({
      refCheckData: [
        { id: 'refdata-id', version: '2.0.0', ruleVerification: false, nonExistent: false },
      ],
      id: 'other-id',
      version: '0.0.1',
      refData: { id: 'refdata-id', version: '2.0.0' } as any,
      currentErrRef: null,
    });
    expect(matchedByRefData?.id).toBe('refdata-id');

    const clearedStaleErrRef = resolveRefErrorFromContext({
      refCheckData: [
        { id: 'different-id', version: '9.9.9', ruleVerification: false, nonExistent: false },
      ],
      id: 'flowproperty-1',
      version: '1.0.0',
      refData: { id: 'flowproperty-1', version: '1.0.0' } as any,
      currentErrRef: {
        id: 'stale-id',
        version: '1.0.0',
        ruleVerification: false,
        nonExistent: false,
      },
    });
    expect(clearedStaleErrRef).toBeNull();

    const preservedCurrentErrRef = resolveRefErrorFromContext({
      refCheckData: [
        { id: 'different-id', version: '9.9.9', ruleVerification: false, nonExistent: false },
      ],
      id: 'flowproperty-1',
      version: '1.0.0',
      refData: { id: 'same-id', version: '1.0.0' } as any,
      currentErrRef: {
        id: 'same-id',
        version: '1.0.0',
        ruleVerification: false,
        nonExistent: false,
      },
    });
    expect(preservedCurrentErrRef?.id).toBe('same-id');
    expect(
      resolveRefErrorFromContext({
        refCheckData: [],
        id: 'flowproperty-1',
        version: '1.0.0',
        refData: null,
        currentErrRef: {
          id: 'same-id',
          version: '1.0.0',
          ruleVerification: false,
          nonExistent: false,
        },
      }),
    ).toBeNull();
  });

  it('loads an existing reference and hides edit access for non-owners', async () => {
    mockSetValueAtPath(['reference'], {
      '@refObjectId': 'flowproperty-1',
      '@version': '1.0.0',
    });
    mockCurrentUserId = 'user-1';
    mockRefDataUserId = 'user-2';

    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => mockSetValueAtPath(path, value),
        getFieldValue: (path: any[]) => mockGetValueAtPath(path),
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

  it('renders populated short description rows and owner err-ref updates', async () => {
    mockSetValueAtPath(['reference'], {
      '@refObjectId': 'flowproperty-1',
      '@version': '1.0.0',
      'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Existing short description' }],
    });

    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => mockSetValueAtPath(path, value),
        getFieldValue: (path: any[]) => mockGetValueAtPath(path),
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
          onData={jest.fn()}
        />,
      );
    });

    await waitFor(() => expect(screen.getAllByPlaceholderText('text')).toHaveLength(1));
    expect(mockGetLocalValueProps).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /trigger edit err ref/i }));
    expect(screen.getByText('err-ref')).toBeInTheDocument();
  });

  it('renders matched ref-check errors in non-required mode', async () => {
    mockSetValueAtPath(['reference'], {
      '@refObjectId': 'flowproperty-1',
      '@version': '1.0.0',
    });
    mockRefCheckContextValue = { refCheckData: [{ id: 'flowproperty-1', version: '1.0.0' }] };
    mockUseRefCheckContext.mockImplementation(() => mockRefCheckContextValue);

    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => mockSetValueAtPath(path, value),
        getFieldValue: (path: any[]) => mockGetValueAtPath(path),
      },
    };

    const { rerender } = renderWithProviders(
      <FlowpropertySelectForm
        name={['reference']}
        label='Flow property'
        lang='en'
        formRef={formRef as any}
        drawerVisible={false}
        onData={jest.fn()}
      />,
    );

    await waitFor(() => expect(mockGetRefData).toHaveBeenCalled());
    expect(await screen.findByText('err-ref')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /trigger edit err ref/i }));
    expect(screen.getByText('err-ref')).toBeInTheDocument();

    mockRefCheckContextValue = { refCheckData: [{ id: 'different-id', version: '9.9.9' }] };
    mockUseRefCheckContext.mockImplementation(() => mockRefCheckContextValue);
    rerender(
      <FlowpropertySelectForm
        name={['reference']}
        label='Flow property'
        lang='en'
        formRef={formRef as any}
        drawerVisible={false}
        onData={jest.fn()}
      />,
    );

    await waitFor(() => expect(screen.queryByText('err-ref')).not.toBeInTheDocument());
  });

  it('runs the required validator branches', async () => {
    mockSetValueAtPath(['reference'], {
      '@refObjectId': 'flowproperty-1',
      '@version': '1.0.0',
    });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => mockSetValueAtPath(path, value),
        getFieldValue: (path: any[]) => mockGetValueAtPath(path),
      },
    };

    renderWithProviders(
      <FlowpropertySelectForm
        name={['reference']}
        label='Flow property'
        lang='en'
        formRef={formRef as any}
        drawerVisible={false}
        onData={jest.fn()}
        rules={[{ required: true, message: 'Flow property is required' }]}
      />,
    );

    await waitFor(() => expect(mockGetRefData).toHaveBeenCalled());

    const validator = mockFormItemRulesRegistry
      .get('reference.@refObjectId')
      ?.find((rule: any) => typeof rule?.validator === 'function')?.validator;
    expect(typeof validator).toBe('function');

    await act(async () => {
      await expect(validator({}, undefined)).rejects.toThrow();
    });
    expect(consoleSpy).toHaveBeenCalledWith('form rules check error');

    await act(async () => {
      await expect(validator({}, 'flowproperty-1')).resolves.toBeUndefined();
    });
    await userEvent.click(
      screen.getByRole('button', { name: /validate reference\.@refObjectId/i }),
    );
    consoleSpy.mockRestore();
  });

  it('validates required reference values directly', async () => {
    const setRuleErrorState = jest.fn();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await expect(validateRequiredReferenceValue(undefined, setRuleErrorState)).rejects.toThrow();
    expect(setRuleErrorState).toHaveBeenCalledWith(true);
    expect(consoleSpy).toHaveBeenCalledWith('form rules check error');

    setRuleErrorState.mockClear();
    await expect(
      validateRequiredReferenceValue('flowproperty-1', setRuleErrorState),
    ).resolves.toBeUndefined();
    expect(setRuleErrorState).toHaveBeenCalledWith(false);
    consoleSpy.mockRestore();
  });

  it('covers missing ref data and detail fallbacks', async () => {
    mockSetValueAtPath(['reference'], {
      '@refObjectId': 'flowproperty-1',
      '@version': '1.0.0',
    });
    mockGetFlowpropertyDetail.mockResolvedValueOnce({
      data: {
        id: 'flowproperty-1',
        version: undefined,
        userId: 'user-1',
      },
    });
    mockGetRefData.mockResolvedValueOnce({});

    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => mockSetValueAtPath(path, value),
        getFieldValue: (path: any[]) => mockGetValueAtPath(path),
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
          onData={jest.fn()}
        />,
      );
    });

    await userEvent.click(screen.getByRole('button', { name: /update reference/i }));
    await waitFor(() =>
      expect(mockGetFlowpropertyDetail).toHaveBeenCalledWith('flowproperty-1', '1.0.0'),
    );
    expect(screen.getByText('view flowproperty-1:')).toBeInTheDocument();
    expect(screen.getByText('edit flowproperty-1:')).toBeInTheDocument();
    expect(mockFormState.reference['common:shortDescription']).toEqual([]);

    await userEvent.click(screen.getByRole('button', { name: /update reference/i }));
    await waitFor(() =>
      expect(mockGetFlowpropertyDetail).toHaveBeenLastCalledWith('flowproperty-1', ''),
    );
  });
});
