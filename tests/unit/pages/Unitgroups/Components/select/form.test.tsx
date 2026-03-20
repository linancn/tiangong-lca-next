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
const mockCapturedRules = new Map<string, any[]>();
const mockFormListFieldsByName = new Map<string, any[]>();
const mockValueByName = new Map<string, any>();

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
    if (name) {
      mockCapturedRules.set(JSON.stringify(name), rules ?? []);
    }
    const content = React.Children.only(children);
    if (content && React.isValidElement(content) && getValueProps) {
      const resolvedValue = name ? mockValueByName.get(JSON.stringify(name)) : undefined;
      return (
        <label>
          <span>{toText(label)}</span>
          {React.cloneElement(
            content,
            getValueProps(resolvedValue === undefined ? content.props.value : resolvedValue),
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
  Form.List = ({ children, name }: any) => (
    <div>
      {typeof children === 'function'
        ? children(mockFormListFieldsByName.get(JSON.stringify(name)) ?? [], {
            add: () => {},
            remove: () => {},
          })
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

jest.mock('@/pages/Unitgroups/Components/select/drawer', () => ({
  __esModule: true,
  default: ({ onData, buttonText }: any) => (
    <button type='button' onClick={() => onData?.('unitgroup-1', '1.0.0')}>
      {toText(buttonText) || 'open drawer'}
    </button>
  ),
}));

jest.mock('@/pages/Unitgroups/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span>{`view ${id}:${version}`}</span>,
}));

jest.mock('@/pages/Unitgroups/Components/edit', () => ({
  __esModule: true,
  default: ({ id, version, updateErrRef, setViewDrawerVisible }: any) => (
    <>
      <span>{`edit ${id}:${version}`}</span>
      <button
        type='button'
        onClick={() =>
          updateErrRef?.({
            id: 'other-unitgroup',
            version: '9.9.9',
            ruleVerification: false,
            nonExistent: false,
          })
        }
      >
        update err ref
      </button>
      <button type='button' onClick={() => setViewDrawerVisible?.(false)}>
        close edit view
      </button>
    </>
  ),
}));

const mockGetUnitGroupDetail = jest.fn(async () => ({
  data: {
    id: 'unitgroup-1',
    version: '1.0.0',
    userId: mockRefDataUserId,
    stateCode: 10,
    ruleVerification: false,
    json: {
      unitGroupDataSet: {},
    },
  },
}));

const mockGetReferenceUnit = jest.fn(async () => ({
  data: {
    refUnitName: 'kg',
    refUnitGeneralComment: [{ '@xml:lang': 'en', '#text': 'Reference comment' }],
  },
}));

jest.mock('@/services/unitgroups/api', () => ({
  __esModule: true,
  getUnitGroupDetail: (...args: any[]) => mockGetUnitGroupDetail(...args),
  getReferenceUnit: (...args: any[]) => mockGetReferenceUnit(...args),
}));

const mockGenUnitGroupFromData = jest.fn(() => ({
  unitGroupInformation: {
    dataSetInformation: {
      'common:name': [{ '@xml:lang': 'en', '#text': 'Unit group short name' }],
    },
    quantitativeReference: {
      referenceToReferenceUnit: '0',
    },
  },
  units: {
    unit: [
      {
        '@dataSetInternalID': '0',
        name: 'kg',
        generalComment: [{ '@xml:lang': 'en', '#text': 'Reference comment' }],
      },
    ],
  },
}));

jest.mock('@/services/unitgroups/util', () => ({
  __esModule: true,
  genUnitGroupFromData: (...args: any[]) => mockGenUnitGroupFromData(...args),
}));

const mockGetRefData = jest.fn(async () => ({
  data: {
    id: 'unitgroup-1',
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

const mockJsonToList = jest.fn((value: any) =>
  Array.isArray(value) ? value : value ? [value] : [],
);

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  jsonToList: (...args: any[]) => mockJsonToList(...args),
}));

const mockValidateRefObjectId = jest.fn();
const mockGetLocalValueProps = jest.fn((value: any) => ({
  value: value === 'en' ? 'English' : value === 'zh' ? '简体中文' : value,
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

describe('UnitgroupsSelectForm', () => {
  const UnitgroupsSelectForm = require('@/pages/Unitgroups/Components/select/form').default;

  beforeEach(() => {
    Object.keys(formState).forEach((key) => delete formState[key]);
    mockRefCheckContextValue = { refCheckData: [] };
    mockCurrentUserId = 'user-1';
    mockRefDataUserId = 'user-1';
    mockCapturedRules.clear();
    mockFormListFieldsByName.clear();
    mockValueByName.clear();
    jest.clearAllMocks();
  });

  it('selects a unit group, refreshes it, and clears the selected field', async () => {
    mockFormListFieldsByName.set(JSON.stringify(['reference', 'common:shortDescription']), [
      { key: 'short-row', name: 0 },
    ]);
    mockFormListFieldsByName.set(JSON.stringify(['reference', 'refUnit', 'generalComment']), [
      { key: 'comment-row', name: 0 },
    ]);
    mockValueByName.set(JSON.stringify([0, '@xml:lang']), 'en');

    const onData = jest.fn();
    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    await act(async () => {
      renderWithProviders(
        <UnitgroupsSelectForm
          name={['reference']}
          label='Unit group'
          lang='en'
          formRef={formRef as any}
          onData={onData}
          rules={[{ required: true, message: 'Unit group is required' }]}
        />,
      );
    });

    expect(screen.getByTestId('required-title')).toHaveTextContent('Unit group');

    await userEvent.click(screen.getByRole('button', { name: /open drawer/i }));

    await waitFor(() => expect(formState.reference['@refObjectId']).toBe('unitgroup-1'));
    expect(formState.reference['@type']).toBe('unit group data set');
    expect(formState.reference['@uri']).toBe('../unitgroups/unitgroup-1.xml');
    expect(formState.reference['common:shortDescription'][0]['#text']).toBe(
      'Unit group short name',
    );
    expect(formState.reference.refUnit.name).toBe('kg');
    expect(mockValidateRefObjectId).toHaveBeenCalledWith(formRef, ['reference']);
    expect(onData).toHaveBeenCalledTimes(1);

    expect(await screen.findByText('view unitgroup-1:1.0.0')).toBeInTheDocument();
    expect(screen.getByText('edit unitgroup-1:1.0.0')).toBeInTheDocument();
    expect(screen.getByDisplayValue('English')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /update err ref/i }));
    await userEvent.click(screen.getByRole('button', { name: /close edit view/i }));

    await userEvent.click(screen.getByRole('button', { name: /update reference/i }));
    await waitFor(() => expect(mockGetUnitGroupDetail).toHaveBeenCalledTimes(2));
    expect(onData).toHaveBeenCalledTimes(2);

    await userEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(formState.reference).toEqual({});
    expect(mockValidateRefObjectId).toHaveBeenCalledTimes(3);
    expect(onData).toHaveBeenCalledTimes(3);
  });

  it('restores an existing selection, shows ref errors, and hides edit actions for non-owners', async () => {
    setValueAtPath(['reference', '@refObjectId'], 'unitgroup-1');
    setValueAtPath(['reference', '@version'], '1.0.0');
    mockRefCheckContextValue = {
      refCheckData: [
        {
          id: 'unitgroup-1',
          version: '1.0.0',
          ruleVerification: true,
          nonExistent: true,
        },
      ],
    };
    mockRefDataUserId = 'other-user';

    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    renderWithProviders(
      <UnitgroupsSelectForm
        name={['reference']}
        label='Unit group'
        lang='en'
        formRef={formRef as any}
        onData={jest.fn()}
      />,
    );

    await waitFor(() =>
      expect(mockGetRefData).toHaveBeenCalledWith('unitgroup-1', '1.0.0', 'unitgroups', ''),
    );
    await waitFor(() => expect(mockGetReferenceUnit).toHaveBeenCalledWith('unitgroup-1', '1.0.0'));

    expect(screen.getByText('err-ref')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update reference/i })).toBeInTheDocument();
    expect(screen.getByText('view unitgroup-1:1.0.0')).toBeInTheDocument();
    expect(screen.queryByText('edit unitgroup-1:1.0.0')).not.toBeInTheDocument();

    expect(formState.reference.refUnit).toEqual({
      name: 'kg',
      generalComment: [{ '@xml:lang': 'en', '#text': 'Reference comment' }],
    });
  });

  it('runs the required validator and renders the required title when requested', async () => {
    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    renderWithProviders(
      <UnitgroupsSelectForm
        name={['reference']}
        label='Unit group'
        lang='en'
        formRef={formRef as any}
        onData={jest.fn()}
        rules={[{ required: true, message: 'Unit group is required' }]}
        showRequiredLabel
      />,
    );

    expect(screen.getByTestId('required-title')).toHaveTextContent('Unit group');

    const rules = mockCapturedRules.get(JSON.stringify(['reference', '@refObjectId'])) ?? [];
    const validatorRule = rules.find((rule) => typeof rule?.validator === 'function');

    await act(async () => {
      await expect(validatorRule.validator({}, undefined)).rejects.toBeInstanceOf(Error);
    });
    await act(async () => {
      await expect(validatorRule.validator({}, 'unitgroup-1')).resolves.toBeUndefined();
    });
    expect(consoleSpy).toHaveBeenCalledWith('form rules check error');

    consoleSpy.mockRestore();
  });

  it('renders the required title when showRequiredLabel is enabled without required rules', () => {
    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    renderWithProviders(
      <UnitgroupsSelectForm
        name={['reference']}
        label='Unit group'
        lang='en'
        formRef={formRef as any}
        onData={jest.fn()}
        showRequiredLabel
      />,
    );

    expect(screen.getByTestId('required-title')).toHaveTextContent('Unit group');
  });

  it('uses ref-data matches to clear stale errors', async () => {
    setValueAtPath(['reference', '@refObjectId'], 'unitgroup-1');
    setValueAtPath(['reference', '@version'], '1.0.0');
    mockGetRefData.mockResolvedValueOnce({
      data: {
        id: 'unitgroup-2',
        version: '2.0.0',
        userId: mockRefDataUserId,
        stateCode: 10,
        ruleVerification: false,
      },
    });
    mockRefCheckContextValue = {
      refCheckData: [{ id: 'unitgroup-2', version: '2.0.0', ruleVerification: false }],
    };

    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    const { rerender } = renderWithProviders(
      <UnitgroupsSelectForm
        name={['reference']}
        label='Unit group'
        lang='en'
        formRef={formRef as any}
        onData={jest.fn()}
      />,
    );

    await waitFor(() => expect(mockGetRefData).toHaveBeenCalledTimes(1));
    expect(screen.getByText('err-ref')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /update err ref/i }));

    mockRefCheckContextValue = {
      refCheckData: [{ id: 'other-unitgroup', version: '0.0.1', ruleVerification: false }],
    };
    rerender(
      <UnitgroupsSelectForm
        name={['reference']}
        label='Unit group'
        lang='en'
        formRef={formRef as any}
        onData={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText('err-ref')).not.toBeInTheDocument();
    });
  });

  it('handles null ref-data responses without cloning errors', async () => {
    setValueAtPath(['reference', '@refObjectId'], 'unitgroup-1');
    setValueAtPath(['reference', '@version'], '1.0.0');
    mockGetRefData.mockResolvedValueOnce({ data: null });

    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    renderWithProviders(
      <UnitgroupsSelectForm
        name={['reference']}
        label='Unit group'
        lang='en'
        formRef={formRef as any}
        onData={jest.fn()}
      />,
    );

    await waitFor(() =>
      expect(mockGetRefData).toHaveBeenCalledWith('unitgroup-1', '1.0.0', 'unitgroups', ''),
    );
    expect(screen.getByText('view unitgroup-1:1.0.0')).toBeInTheDocument();
    expect(screen.queryByText('edit unitgroup-1:1.0.0')).not.toBeInTheDocument();
  });

  it('uses version, reference-unit, and unit-group fallbacks for non-nested references', async () => {
    setValueAtPath(['reference', '@refObjectId'], 'unitgroup-1');
    mockGetReferenceUnit.mockResolvedValueOnce({ data: undefined });
    mockGetUnitGroupDetail.mockResolvedValueOnce({
      data: {
        id: 'unitgroup-1',
        version: undefined,
        userId: mockRefDataUserId,
        stateCode: 10,
        ruleVerification: false,
        json: {},
      },
    });
    mockGenUnitGroupFromData.mockReturnValueOnce({
      unitGroupInformation: {
        dataSetInformation: {},
        quantitativeReference: {
          referenceToReferenceUnit: 'missing-unit',
        },
      },
      units: {
        unit: [],
      },
    });

    const formRef = {
      current: {
        setFieldValue: (path: any[], value: any) => setValueAtPath(path, value),
        getFieldValue: (path: any[]) => getValueAtPath(path),
      },
    };

    renderWithProviders(
      <UnitgroupsSelectForm
        name={['reference']}
        label='Unit group'
        lang='en'
        formRef={formRef as any}
        onData={jest.fn()}
      />,
    );

    await waitFor(() => expect(mockGetReferenceUnit).toHaveBeenCalledWith('unitgroup-1', ''));
    expect(formState.reference.refUnit).toEqual({ name: '', generalComment: [] });
    expect(await screen.findByText('view unitgroup-1:')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /update reference/i }));

    await waitFor(() => expect(mockGetUnitGroupDetail).toHaveBeenCalledWith('unitgroup-1', ''));
    expect(await screen.findByText('edit unitgroup-1:')).toBeInTheDocument();
    expect(formState.reference['common:shortDescription']).toEqual([]);
    expect(formState.reference.refUnit).toEqual({ name: '', generalComment: [] });
  });
});
