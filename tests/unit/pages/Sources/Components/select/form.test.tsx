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

const defaultSourceIds = {
  'ILCD format': 'a97a0155-0234-4b87-b4ce-a45da52f2a40',
  'ILCD Data Network - compliance (non-Process)': '9ba3ac1e-6797-4cc0-afd5-1b8f7bf28c6a',
  'ILCD Data Network - Entry-level': 'd92a1a12-2545-49e2-a585-55c259997756',
};

let mockRefCheckContextValue = { refCheckData: [] as any[] };
let mockCurrentUserId = 'user-1';
let mockRefDataUserId = 'user-1';
const mockDrawerProps: any[] = [];
const mockFormItemRules: any[] = [];
let mockFormListFields = [{ key: 0, name: 0 }];

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
  Form.Item = (props: any) => {
    const { label, children, getValueProps } = props;
    if (props?.rules) {
      mockFormItemRules.push(props);
    }
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
        ? children(mockFormListFields, { add: () => {}, remove: () => {} })
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
  default: (props: any) => {
    mockDrawerProps.push(props);
    return (
      <button type='button' onClick={() => props.onData?.('source-1', '1.0.0')}>
        {toText(props.buttonText) || 'open drawer'}
      </button>
    );
  },
}));

jest.mock('@/pages/Sources/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span>{`view ${id}:${version}`}</span>,
}));

jest.mock('@/pages/Sources/Components/edit', () => ({
  __esModule: true,
  default: ({ id, version, updateErrRef, setViewDrawerVisible }: any) => (
    <button
      type='button'
      onClick={() => {
        setViewDrawerVisible?.(false);
        updateErrRef?.({
          id: 'other-source',
          version: '9.9.9',
          ruleVerification: true,
          nonExistent: false,
        });
      }}
    >
      {`edit ${id}:${version}`}
    </button>
  ),
}));

const mockGetSourceDetail = jest.fn(async (id: string) => ({
  success: true,
  data: {
    id,
    version: id === defaultSourceIds['ILCD format'] ? '9.9.9' : '1.0.0',
    userId: mockRefDataUserId,
    stateCode: 10,
    ruleVerification: false,
    json: {
      sourceDataSet: {
        sourceInformation: {
          dataSetInformation: {
            'common:shortName': [
              {
                '@xml:lang': 'en',
                '#text':
                  id === defaultSourceIds['ILCD format'] ? 'ILCD format' : 'Source short name',
              },
            ],
          },
        },
      },
    },
  },
}));

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
    mockDrawerProps.length = 0;
    mockRefCheckContextValue = { refCheckData: [] };
    mockFormItemRules.length = 0;
    mockFormListFields = [{ key: 0, name: 0 }];
    mockCurrentUserId = 'user-1';
    mockRefDataUserId = 'user-1';
    jest.clearAllMocks();
  });

  it('applies default source mapping, handles nested selection, and clears the nested field path', async () => {
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
          parentName={['review', 0]}
          name={['reference']}
          label='Source'
          lang='en'
          formRef={formRef as any}
          onData={onData}
          rules={[{ required: true, message: 'Source is required' }]}
          defaultSourceName='ILCD format'
          type='reviewReport'
        />,
      );
    });

    await waitFor(() =>
      expect(mockGetSourceDetail).toHaveBeenCalledWith(defaultSourceIds['ILCD format'], ''),
    );
    expect(formState.review[0].reference['@refObjectId']).toBe(defaultSourceIds['ILCD format']);
    expect(mockDrawerProps[0]?.type).toBe('reviewReport');
    expect(screen.getByTestId('required-title')).toHaveTextContent('Source');

    await userEvent.click(screen.getByRole('button', { name: /open drawer/i }));

    await waitFor(() => expect(formState.review[0].reference['@refObjectId']).toBe('source-1'));
    expect(formState.review[0].reference['@type']).toBe('source data set');
    expect(formState.review[0].reference['@uri']).toBe('../sources/source-1.xml');
    expect(formState.review[0].reference['common:shortDescription'][0]['#text']).toBe(
      'Source short name',
    );
    expect(mockValidateRefObjectId).toHaveBeenCalledWith(formRef, ['reference'], ['review', 0]);
    expect(onData).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(formState.review[0].reference).toEqual({});
    expect(formState.reference).toBeUndefined();
    expect(onData).toHaveBeenCalledTimes(2);
  });

  it('restores existing selections, shows ref errors, and keeps edit hidden for other users', async () => {
    setValueAtPath(['reference', '@refObjectId'], 'source-1');
    setValueAtPath(['reference', '@version'], '1.0.0');
    mockRefCheckContextValue.refCheckData = [
      {
        id: 'source-1',
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

    renderWithProviders(
      <SourceSelectForm
        name={['reference']}
        label='Source'
        lang='en'
        formRef={formRef as any}
        onData={jest.fn()}
      />,
    );

    await waitFor(() =>
      expect(mockGetRefData).toHaveBeenCalledWith('source-1', '1.0.0', 'sources', ''),
    );
    expect(await screen.findByText('err-ref')).toBeInTheDocument();
    expect(screen.getByText('view source-1:1.0.0')).toBeInTheDocument();
    expect(screen.queryByText('edit source-1:1.0.0')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /update reference/i }));

    await waitFor(() => expect(mockGetSourceDetail).toHaveBeenCalledWith('source-1', '1.0.0'));
  });

  it('supports alternate default sources, non-nested clear, validator branches, and owner edit updates', async () => {
    const onData = jest.fn();
    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    const { rerender } = renderWithProviders(
      <SourceSelectForm
        name={['reference']}
        label='Source'
        lang='en'
        formRef={formRef as any}
        onData={onData}
        rules={[{ required: false, pattern: /./ }]}
        defaultSourceName='ILCD Data Network - compliance (non-Process)'
        showRequiredLabel
      />,
    );

    await waitFor(() =>
      expect(mockGetSourceDetail).toHaveBeenCalledWith(
        defaultSourceIds['ILCD Data Network - compliance (non-Process)'],
        '',
      ),
    );
    expect(formState.reference['@refObjectId']).toBe(
      defaultSourceIds['ILCD Data Network - compliance (non-Process)'],
    );
    expect(screen.getByTestId('required-title')).toHaveTextContent('Source');

    rerender(
      <SourceSelectForm
        name={['reference']}
        label='Source'
        lang='en'
        formRef={formRef as any}
        onData={onData}
        rules={[{ required: false, pattern: /./ }]}
        defaultSourceName='ILCD Data Network - Entry-level'
        showRequiredLabel
      />,
    );

    await waitFor(() =>
      expect(mockGetSourceDetail).toHaveBeenCalledWith(
        defaultSourceIds['ILCD Data Network - Entry-level'],
        '',
      ),
    );

    rerender(
      <SourceSelectForm
        name={['reference']}
        label='Source'
        lang='en'
        formRef={formRef as any}
        onData={onData}
        rules={[{ required: true, message: 'Source required' }]}
        defaultSourceName='ILCD Data Network - Entry-level'
        showRequiredLabel
      />,
    );

    delete formState.reference['@version'];
    await userEvent.click(screen.getByRole('button', { name: /update reference/i }));
    await waitFor(() =>
      expect(mockGetSourceDetail).toHaveBeenCalledWith(
        defaultSourceIds['ILCD Data Network - Entry-level'],
        '',
      ),
    );

    const validator =
      mockFormItemRules
        .flatMap((item) => item.rules ?? [])
        .find((rule) => typeof rule?.validator === 'function')?.validator ?? null;

    expect(validator).not.toBeNull();
    await act(async () => {
      await expect(validator({}, undefined)).rejects.toThrow();
    });
    await act(async () => {
      await expect(validator({}, 'source-id')).resolves.toBeUndefined();
    });

    await userEvent.click(
      screen.getByRole('button', {
        name: new RegExp(`edit ${defaultSourceIds['ILCD Data Network - Entry-level']}:`),
      }),
    );

    mockRefCheckContextValue = {
      refCheckData: [{ id: 'another-source', version: '1.0.0', ruleVerification: true }],
    };
    rerender(
      <SourceSelectForm
        name={['reference']}
        label='Source'
        lang='en'
        formRef={formRef as any}
        onData={onData}
        rules={[{ required: false, pattern: /./ }]}
        defaultSourceName='ILCD Data Network - Entry-level'
        showRequiredLabel
      />,
    );

    await waitFor(() => expect(screen.queryByText('err-ref')).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(formState.reference).toEqual({});
    expect(onData).toHaveBeenCalled();
  });

  it('skips unknown defaults, aborts unsuccessful default fetches, and falls back when default source data is incomplete', async () => {
    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    const { rerender } = renderWithProviders(
      <SourceSelectForm
        name={['reference']}
        label='Source'
        lang='en'
        formRef={formRef as any}
        onData={jest.fn()}
        defaultSourceName='Unknown default'
      />,
    );

    await waitFor(() => expect(mockGetSourceDetail).not.toHaveBeenCalled());

    mockGetSourceDetail.mockResolvedValueOnce({ success: false, data: null });
    rerender(
      <SourceSelectForm
        name={['reference']}
        label='Source'
        lang='en'
        formRef={formRef as any}
        onData={jest.fn()}
        defaultSourceName='ILCD Data Network - compliance (non-Process)'
      />,
    );

    await waitFor(() =>
      expect(mockGetSourceDetail).toHaveBeenCalledWith(
        defaultSourceIds['ILCD Data Network - compliance (non-Process)'],
        '',
      ),
    );
    expect(formState.reference).toBeUndefined();

    mockGetSourceDetail.mockResolvedValueOnce({
      success: true,
      data: {
        id: defaultSourceIds['ILCD format'],
        version: '3.3.3',
        userId: 'user-1',
        stateCode: 10,
        ruleVerification: true,
        json: {},
      },
    });
    rerender(
      <SourceSelectForm
        name={['reference']}
        label='Source'
        lang='en'
        formRef={formRef as any}
        onData={jest.fn()}
        defaultSourceName='ILCD format'
      />,
    );

    await waitFor(() =>
      expect(formState.reference['@refObjectId']).toBe(defaultSourceIds['ILCD format']),
    );
    expect(formState.reference['common:shortDescription']).toEqual([]);
  });

  it('falls back when selected source detail is incomplete and renders the empty list placeholder', async () => {
    mockFormListFields = [];
    mockGetSourceDetail.mockResolvedValue({
      success: true,
      data: {
        id: 'source-1',
        version: undefined,
        userId: 'user-1',
        stateCode: 10,
        ruleVerification: true,
        json: {},
      },
    });
    const onData = jest.fn();
    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    renderWithProviders(
      <SourceSelectForm
        name={['reference']}
        label='Source'
        lang='en'
        formRef={formRef as any}
        onData={onData}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /open drawer/i }));

    await waitFor(() => expect(formState.reference['@refObjectId']).toBe('source-1'));
    expect(formState.reference['common:shortDescription']).toEqual([]);
    expect(screen.getByText('view source-1:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit source-1:/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /update reference/i }));
    await waitFor(() => expect(mockGetSourceDetail).toHaveBeenCalledWith('source-1', ''));
    expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0);
  });

  it('clears stale errRef state when ref-check entries no longer match the resolved reference', async () => {
    setValueAtPath(['reference', '@refObjectId'], 'source-1');
    setValueAtPath(['reference', '@version'], '1.0.0');
    mockRefCheckContextValue = {
      refCheckData: [
        { id: 'source-1', version: '1.0.0', ruleVerification: true, nonExistent: true },
      ],
    };

    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    const { rerender } = renderWithProviders(
      <SourceSelectForm
        name={['reference']}
        label='Source'
        lang='en'
        formRef={formRef as any}
        onData={jest.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText('err-ref')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /edit source-1:1.0.0/i }));

    mockRefCheckContextValue = {
      refCheckData: [{ id: 'another-source', version: '1.0.0', ruleVerification: true }],
    };
    rerender(
      <SourceSelectForm
        name={['reference']}
        label='Source'
        lang='en'
        formRef={formRef as any}
        onData={jest.fn()}
      />,
    );

    await waitFor(() => expect(screen.queryByText('err-ref')).not.toBeInTheDocument());
  });

  it('sets refData to null when ref detail lookup returns no data', async () => {
    setValueAtPath(['reference', '@refObjectId'], 'source-1');
    setValueAtPath(['reference', '@version'], '1.0.0');
    mockGetRefData.mockResolvedValue({
      data: null,
    });

    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    renderWithProviders(
      <SourceSelectForm
        name={['reference']}
        label='Source'
        lang='en'
        formRef={formRef as any}
        onData={jest.fn()}
      />,
    );

    await waitFor(() =>
      expect(mockGetRefData).toHaveBeenCalledWith('source-1', '1.0.0', 'sources', ''),
    );
    expect(screen.getByText('view source-1:1.0.0')).toBeInTheDocument();
  });

  it('falls back to an empty short description for nested selections when source detail data is incomplete', async () => {
    mockGetSourceDetail.mockResolvedValue({
      success: true,
      data: {
        id: 'source-1',
        version: '1.0.0',
        userId: 'user-1',
        stateCode: 10,
        ruleVerification: true,
        json: {},
      },
    });
    const onData = jest.fn();
    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    renderWithProviders(
      <SourceSelectForm
        parentName={['review', 0]}
        name={['reference']}
        label='Source'
        lang='en'
        formRef={formRef as any}
        onData={onData}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /open drawer/i }));

    await waitFor(() => expect(formState.review[0].reference['@refObjectId']).toBe('source-1'));
    expect(formState.review[0].reference['common:shortDescription']).toEqual([]);
  });

  it('evaluates ref-check entries against resolved refData ids even when the version does not match', async () => {
    setValueAtPath(['reference', '@refObjectId'], 'local-source');
    setValueAtPath(['reference', '@version'], '9.9.9');
    mockGetRefData.mockResolvedValue({
      data: {
        id: 'source-1',
        version: '1.0.0',
        userId: 'user-1',
        stateCode: 10,
        ruleVerification: false,
      },
    });
    mockRefCheckContextValue = {
      refCheckData: [{ id: 'source-1', version: '2.0.0', ruleVerification: true }],
    };

    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    renderWithProviders(
      <SourceSelectForm
        name={['reference']}
        label='Source'
        lang='en'
        formRef={formRef as any}
        onData={jest.fn()}
      />,
    );

    await waitFor(() =>
      expect(mockGetRefData).toHaveBeenCalledWith('local-source', '9.9.9', 'sources', ''),
    );
    expect(screen.queryByText('err-ref')).not.toBeInTheDocument();
  });
});
