// @ts-nocheck
import { act, renderWithProviders, waitFor } from '../../../../../helpers/testUtils';

const mockSetUnits = jest.fn();
const mockSetTargetUnit = jest.fn();

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
}));

jest.mock('@/contexts/unitContext', () => ({
  __esModule: true,
  useUnitsContext: () => ({
    setUnits: mockSetUnits,
    setTargetUnit: mockSetTargetUnit,
  }),
}));

const mockGetReferenceProperty = jest.fn();
const mockGetReferenceUnitGroup = jest.fn();
const mockGetReferenceUnit = jest.fn();

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  getReferenceProperty: (...args: any[]) => mockGetReferenceProperty(...args),
}));

jest.mock('@/services/flowproperties/api', () => ({
  __esModule: true,
  getReferenceUnitGroup: (...args: any[]) => mockGetReferenceUnitGroup(...args),
}));

jest.mock('@/services/unitgroups/api', () => ({
  __esModule: true,
  getReferenceUnit: (...args: any[]) => mockGetReferenceUnit(...args),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  jsonToList: jest.fn((value: any) => (Array.isArray(value) ? value : value ? [value] : [])),
}));

jest.mock('antd', () => {
  const React = require('react');
  const ConfigProvider = ({ children }: any) => <div>{children}</div>;
  const Card = ({ title, children }: any) => (
    <div>
      <div>{title}</div>
      <div>{children}</div>
    </div>
  );
  const Col = ({ children }: any) => <div>{children}</div>;
  const Divider = ({ children }: any) => <div>{children}</div>;
  const Form = ({ children }: any) => <form>{children}</form>;
  Form.Item = ({ children }: any) => <div>{children}</div>;
  Form.List = ({ children }: any) => (
    <div>
      {typeof children === 'function'
        ? children([], { add: () => {}, remove: () => {} })
        : children}
    </div>
  );
  const Input = ({ value = '', disabled }: any) => (
    <input value={value} disabled={disabled} readOnly={disabled} />
  );
  Input.TextArea = ({ value = '', disabled, ...rest }: any) => (
    <textarea value={value} disabled={disabled} readOnly={disabled} {...rest} />
  );
  const Row = ({ children }: any) => <div>{children}</div>;
  const Spin = ({ spinning, children }: any) =>
    spinning ? <div data-testid='spin'>{children}</div> : <div>{children}</div>;
  const theme = {
    useToken: () => ({
      token: {
        colorTextDescription: '#8c8c8c',
      },
    }),
  };

  return {
    __esModule: true,
    Card,
    Col,
    ConfigProvider,
    Divider,
    Form,
    Input,
    Row,
    Spin,
    theme,
  };
});

describe('UnitGroupFormMini', () => {
  const UnitGroupFormMini = require('@/pages/Unitgroups/Components/select/formMini').default;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetReferenceProperty.mockResolvedValue({
      data: { refFlowPropertytId: 'fp-1', version: '2.0.0' },
    });
    mockGetReferenceUnitGroup.mockResolvedValue({
      data: {
        refUnitGroupId: 'ug-1',
        version: '3.0.0',
        refUnitGroupShortDescription: [{ '@xml:lang': 'en', '#text': 'Mass unit' }],
      },
    });
    mockGetReferenceUnit.mockResolvedValue({
      data: {
        unit: [{ '@dataSetInternalID': '0', name: 'kg' }],
        refUnitName: 'kg',
        refUnitGeneralComment: [{ '@xml:lang': 'en', '#text': 'comment' }],
      },
    });
  });

  it('loads reference unit data for flow ids and updates the unit context', async () => {
    const setFieldValue = jest.fn();
    const formRef = { current: { setFieldValue } };

    await act(async () => {
      renderWithProviders(
        <UnitGroupFormMini
          id='flow-1'
          version='1.0.0'
          idType='flow'
          name={['exchange']}
          formRef={formRef as any}
          drawerVisible
        />,
      );
    });

    await waitFor(() => expect(mockGetReferenceProperty).toHaveBeenCalledWith('flow-1', '1.0.0'));
    expect(mockGetReferenceUnitGroup).toHaveBeenCalledWith('fp-1', '2.0.0');
    expect(mockGetReferenceUnit).toHaveBeenCalledWith('ug-1', '3.0.0');
    expect(mockSetUnits).toHaveBeenCalledWith([{ '@dataSetInternalID': '0', name: 'kg' }]);
    expect(mockSetTargetUnit).toHaveBeenCalledWith('kg');
    expect(setFieldValue).toHaveBeenCalledWith(['exchange', 'refUnitGroup'], {
      shortDescription: [{ '@xml:lang': 'en', '#text': 'Mass unit' }],
      refUnit: {
        name: 'kg',
        generalComment: [{ '@xml:lang': 'en', '#text': 'comment' }],
      },
    });
  });

  it('loads reference unit data directly for flowproperty ids', async () => {
    const setFieldValue = jest.fn();
    const formRef = { current: { setFieldValue } };

    await act(async () => {
      renderWithProviders(
        <UnitGroupFormMini
          id='fp-2'
          version='4.0.0'
          idType='flowproperty'
          name={['flowProperty']}
          formRef={formRef as any}
          drawerVisible
        />,
      );
    });

    await waitFor(() => expect(mockGetReferenceUnitGroup).toHaveBeenCalledWith('fp-2', '4.0.0'));
    expect(mockGetReferenceUnit).toHaveBeenCalledWith('ug-1', '3.0.0');
    expect(setFieldValue).toHaveBeenCalledWith(['flowProperty', 'refUnitGroup'], {
      shortDescription: [{ '@xml:lang': 'en', '#text': 'Mass unit' }],
      refUnit: {
        name: 'kg',
        generalComment: [{ '@xml:lang': 'en', '#text': 'comment' }],
      },
    });
  });

  it('does not load data when the drawer is closed or id is missing', async () => {
    const setFieldValue = jest.fn();
    const formRef = { current: { setFieldValue } };

    await act(async () => {
      renderWithProviders(
        <UnitGroupFormMini
          id={undefined}
          version='1.0.0'
          idType='flow'
          name={['exchange']}
          formRef={formRef as any}
          drawerVisible={false}
        />,
      );
    });

    expect(mockGetReferenceProperty).not.toHaveBeenCalled();
    expect(mockGetReferenceUnitGroup).not.toHaveBeenCalled();
    expect(mockGetReferenceUnit).not.toHaveBeenCalled();
    expect(setFieldValue).not.toHaveBeenCalled();
  });
});
