// @ts-nocheck
import { UnitGroupForm } from '@/pages/Unitgroups/Components/form';
import schema from '@/pages/Unitgroups/unitgroups_schema.json';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

const mockGenUnitTableData = jest.fn();

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
}));

jest.mock('@/pages/Utils', () => ({
  __esModule: true,
  getRules: jest.fn((rules: any) => rules ?? []),
}));

jest.mock('@/components/AlignedNumber', () => ({
  __esModule: true,
  default: ({ value }: any) => <span>{`aligned:${value}`}</span>,
  toSuperscript: jest.fn((value: string) => `super(${value})`),
}));

jest.mock('@/components/LangTextItem/form', () => ({
  __esModule: true,
  default: ({ name, label, rules }: any) => (
    <div data-testid='lang-text-form'>
      {JSON.stringify({
        name,
        label: label?.props?.defaultMessage ?? label,
        rulesCount: rules?.length ?? 0,
      })}
    </div>
  ),
}));

jest.mock('@/components/LevelTextItem/form', () => ({
  __esModule: true,
  default: ({ name, dataType, onData }: any) => (
    <button type='button' data-testid='level-text-form' onClick={onData}>
      {JSON.stringify({ name, dataType })}
    </button>
  ),
}));

jest.mock('@/components/QuantitativeReferenceIcon', () => ({
  __esModule: true,
  default: ({ value }: any) => <span>{`qref:${String(value)}`}</span>,
}));

jest.mock('@/components/RequiredMark', () => ({
  __esModule: true,
  default: ({ label, showError }: any) => (
    <div data-testid='required-mark'>{`${toText(label)}:${showError}`}</div>
  ),
}));

jest.mock('@/pages/Contacts/Components/select/form', () => ({
  __esModule: true,
  default: ({ name, label, rules, showRequiredLabel }: any) => (
    <div data-testid='contact-select'>
      {JSON.stringify({
        name,
        label: label?.props?.defaultMessage ?? label,
        rulesCount: rules?.length ?? 0,
        showRequiredLabel: !!showRequiredLabel,
      })}
    </div>
  ),
}));

jest.mock('@/pages/Sources/Components/select/form', () => ({
  __esModule: true,
  default: ({ name, label, defaultSourceName, onData, showRequiredLabel, rules }: any) => (
    <button type='button' data-testid='source-select' onClick={onData}>
      {JSON.stringify({
        name,
        label: label?.props?.defaultMessage ?? label,
        defaultSourceName,
        showRequiredLabel: !!showRequiredLabel,
        rulesCount: rules?.length ?? 0,
      })}
    </button>
  ),
}));

jest.mock('@/pages/Unitgroups/Components/Unit/create', () => ({
  __esModule: true,
  default: ({ onData }: any) => (
    <button
      type='button'
      data-testid='unit-create'
      onClick={() =>
        onData?.({
          name: 'Created unit',
          meanValue: '1',
          quantitativeReference: true,
        })
      }
    >
      unit-create
    </button>
  ),
}));

jest.mock('@/pages/Unitgroups/Components/Unit/view', () => ({
  __esModule: true,
  default: ({ id }: any) => <div data-testid='unit-view'>{`view:${id}`}</div>,
}));

jest.mock('@/pages/Unitgroups/Components/Unit/edit', () => ({
  __esModule: true,
  default: ({ id, setViewDrawerVisible }: any) => (
    <div data-testid='unit-edit'>
      {`edit:${id}`}
      <button type='button' onClick={() => setViewDrawerVisible?.(false)}>
        close-unit-edit
      </button>
    </div>
  ),
}));

jest.mock('@/pages/Unitgroups/Components/Unit/delete', () => ({
  __esModule: true,
  default: ({ id, setViewDrawerVisible }: any) => (
    <div data-testid='unit-delete'>
      {`delete:${id}`}
      <button type='button' onClick={() => setViewDrawerVisible?.(false)}>
        close-unit-delete
      </button>
    </div>
  ),
}));

jest.mock('@/services/unitgroups/util', () => ({
  __esModule: true,
  genUnitTableData: (...args: any[]) => mockGenUnitTableData(...args),
}));

jest.mock('antd', () => {
  const React = require('react');

  const ConfigProvider = ({ children }: any) => <div>{children}</div>;

  const Card = ({ children, title, tabList = [], activeTabKey, onTabChange, style }: any) => (
    <section style={style}>
      {title ? <header>{toText(title)}</header> : null}
      {tabList.length > 0 ? (
        <div>
          {tabList.map((tab: any) => (
            <button
              type='button'
              key={tab.key}
              data-active={tab.key === activeTabKey}
              onClick={() => onTabChange?.(tab.key)}
            >
              {toText(tab.tab)}
            </button>
          ))}
        </div>
      ) : null}
      <div>{children}</div>
    </section>
  );

  const Space = ({ children }: any) => <div>{children}</div>;

  const Form = ({ children }: any) => <form>{children}</form>;
  Form.Item = ({ children, label, hidden }: any) => {
    if (hidden) return <div style={{ display: 'none' }}>{children}</div>;
    const labelText = toText(label);
    if (React.isValidElement(children)) {
      return (
        <label>
          <span>{labelText}</span>
          {React.cloneElement(children, {
            'aria-label': children.props['aria-label'] ?? labelText,
          })}
        </label>
      );
    }
    return (
      <div>
        <span>{labelText}</span>
        {children}
      </div>
    );
  };

  const Input = (props: any) => <input {...props} />;
  const Select = ({ options = [] }: any) => (
    <div data-testid='select'>{options.map((option: any) => toText(option.label)).join(',')}</div>
  );

  const theme = {
    useToken: () => ({
      token: {
        colorTextDescription: '#999',
      },
    }),
  };

  return {
    __esModule: true,
    Card,
    ConfigProvider,
    Form,
    Input,
    Select,
    Space,
    theme,
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProTable = ({ dataSource = [], columns = [], toolBarRender, actionRef, rowKey }: any) => {
    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = {
          reload: jest.fn(),
          setPageInfo: jest.fn(),
        };
      }
    }, [actionRef]);

    return (
      <section data-testid='pro-table'>
        <div>{toolBarRender?.()}</div>
        {dataSource.map((row: any, rowIndex: number) => (
          <div key={rowKey ? rowKey(row) : `${row.dataSetInternalID}-${rowIndex}`}>
            {columns.map((column: any, columnIndex: number) => (
              <div key={`${row.dataSetInternalID}-${columnIndex}`}>
                {column.render ? column.render(undefined, row) : row[column.dataIndex]}
              </div>
            ))}
          </div>
        ))}
      </section>
    );
  };

  return {
    __esModule: true,
    ProTable,
  };
});

describe('UnitGroupForm', () => {
  const baseProps = {
    lang: 'en',
    formRef: { current: undefined },
    onData: jest.fn(),
    onUnitData: jest.fn(),
    onUnitDataCreate: jest.fn(),
    onTabChange: jest.fn(),
    unitDataSource: [
      {
        '@dataSetInternalID': '0',
        name: 'm2',
        generalComment: [{ '@xml:lang': 'en', '#text': 'Square meter' }],
        meanValue: '1',
        quantitativeReference: true,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenUnitTableData.mockImplementation((data: any[]) =>
      (data ?? []).map((item) => ({
        dataSetInternalID: item['@dataSetInternalID'],
        name: item.name,
        generalComment: 'Square meter',
        meanValue: item.meanValue,
        quantitativeReference: item.quantitativeReference,
      })),
    );
  });

  const withRulesFallbacks = (callback: () => void) => {
    const nameRules =
      schema.unitGroupDataSet.unitGroupInformation.dataSetInformation['common:name'].rules;
    const classRules =
      schema.unitGroupDataSet.unitGroupInformation.dataSetInformation.classificationInformation[
        'common:classification'
      ]['common:class']['@classId'].rules;
    const complianceRefRules =
      schema.unitGroupDataSet.modellingAndValidation.complianceDeclarations.compliance[
        'common:referenceToComplianceSystem'
      ]['@refObjectId'].rules;
    const approvalRules =
      schema.unitGroupDataSet.modellingAndValidation.complianceDeclarations.compliance[
        'common:approvalOfOverallCompliance'
      ].rules;
    const timeStampRules =
      schema.unitGroupDataSet.administrativeInformation.dataEntryBy['common:timeStamp'].rules;
    const formatRules =
      schema.unitGroupDataSet.administrativeInformation.dataEntryBy[
        'common:referenceToDataSetFormat'
      ]['@refObjectId'].rules;
    const versionRules =
      schema.unitGroupDataSet.administrativeInformation.publicationAndOwnership[
        'common:dataSetVersion'
      ].rules;
    const ownerRules =
      schema.unitGroupDataSet.administrativeInformation.publicationAndOwnership[
        'common:referenceToOwnershipOfDataSet'
      ]['@refObjectId'].rules;

    delete schema.unitGroupDataSet.unitGroupInformation.dataSetInformation['common:name'].rules;
    delete schema.unitGroupDataSet.unitGroupInformation.dataSetInformation
      .classificationInformation['common:classification']['common:class']['@classId'].rules;
    delete schema.unitGroupDataSet.modellingAndValidation.complianceDeclarations.compliance[
      'common:referenceToComplianceSystem'
    ]['@refObjectId'].rules;
    delete schema.unitGroupDataSet.modellingAndValidation.complianceDeclarations.compliance[
      'common:approvalOfOverallCompliance'
    ].rules;
    delete schema.unitGroupDataSet.administrativeInformation.dataEntryBy['common:timeStamp'].rules;
    delete schema.unitGroupDataSet.administrativeInformation.dataEntryBy[
      'common:referenceToDataSetFormat'
    ]['@refObjectId'].rules;
    delete schema.unitGroupDataSet.administrativeInformation.publicationAndOwnership[
      'common:dataSetVersion'
    ].rules;
    delete schema.unitGroupDataSet.administrativeInformation.publicationAndOwnership[
      'common:referenceToOwnershipOfDataSet'
    ]['@refObjectId'].rules;

    try {
      callback();
    } finally {
      schema.unitGroupDataSet.unitGroupInformation.dataSetInformation['common:name'].rules =
        nameRules;
      schema.unitGroupDataSet.unitGroupInformation.dataSetInformation.classificationInformation[
        'common:classification'
      ]['common:class']['@classId'].rules = classRules;
      schema.unitGroupDataSet.modellingAndValidation.complianceDeclarations.compliance[
        'common:referenceToComplianceSystem'
      ]['@refObjectId'].rules = complianceRefRules;
      schema.unitGroupDataSet.modellingAndValidation.complianceDeclarations.compliance[
        'common:approvalOfOverallCompliance'
      ].rules = approvalRules;
      schema.unitGroupDataSet.administrativeInformation.dataEntryBy['common:timeStamp'].rules =
        timeStampRules;
      schema.unitGroupDataSet.administrativeInformation.dataEntryBy[
        'common:referenceToDataSetFormat'
      ]['@refObjectId'].rules = formatRules;
      schema.unitGroupDataSet.administrativeInformation.publicationAndOwnership[
        'common:dataSetVersion'
      ].rules = versionRules;
      schema.unitGroupDataSet.administrativeInformation.publicationAndOwnership[
        'common:referenceToOwnershipOfDataSet'
      ]['@refObjectId'].rules = ownerRules;
    }
  };

  it('renders the information tab and triggers shared metadata helpers', async () => {
    renderWithProviders(<UnitGroupForm {...baseProps} activeTabKey='unitGroupInformation' />);

    expect(screen.getByTestId('level-text-form')).toHaveTextContent('"dataType":"UnitGroup"');
    expect(screen.getAllByTestId('lang-text-form')[0]).toHaveTextContent(
      '"label":"Name of unit group"',
    );

    await userEvent.click(screen.getByTestId('level-text-form'));
    expect(baseProps.onData).toHaveBeenCalledTimes(1);
  });

  it('uses create-mode defaults in modelling and administrative tabs', () => {
    const { rerender } = renderWithProviders(
      <UnitGroupForm
        {...baseProps}
        activeTabKey='modellingAndValidation'
        formType='create'
        showRules
      />,
    );

    expect(
      screen
        .getAllByTestId('source-select')
        .find((node) => node.textContent?.includes('ILCD Data Network - compliance (non-Process)')),
    ).toHaveTextContent('"defaultSourceName":"ILCD Data Network - compliance (non-Process)"');
    expect(
      screen
        .getAllByTestId('source-select')
        .find((node) => node.textContent?.includes('ILCD Data Network - compliance (non-Process)')),
    ).toHaveTextContent('"showRequiredLabel":true');

    rerender(
      <UnitGroupForm {...baseProps} activeTabKey='administrativeInformation' formType='create' />,
    );

    const adminSourceSelect =
      screen
        .getAllByTestId('source-select')
        .find((node) => node.textContent?.includes('"defaultSourceName":"ILCD format"')) ||
      screen.getAllByTestId('source-select')[1];

    expect(adminSourceSelect).toHaveTextContent('"defaultSourceName":"ILCD format"');

    rerender(
      <UnitGroupForm
        {...baseProps}
        activeTabKey='administrativeInformation'
        formType='createVersion'
      />,
    );

    expect(screen.getAllByRole('textbox')[1]).toBeDisabled();
    expect(screen.getByTestId('contact-select')).toHaveTextContent('"showRequiredLabel":true');
  });

  it('keeps non-create administrative fields editable and skips create-only default sources', () => {
    const { rerender } = renderWithProviders(
      <UnitGroupForm {...baseProps} activeTabKey='modellingAndValidation' formType='edit' />,
    );

    expect(
      screen.getAllByTestId('source-select').every((node) => !node.textContent?.includes('ILCD')),
    ).toBe(true);

    rerender(
      <UnitGroupForm {...baseProps} activeTabKey='administrativeInformation' formType='edit' />,
    );

    expect(screen.getAllByRole('textbox')[1]).not.toBeDisabled();
    expect(screen.getAllByTestId('source-select')[0]).not.toHaveTextContent('ILCD format');
  });

  it('renders the units table and forwards unit create callbacks', async () => {
    renderWithProviders(<UnitGroupForm {...baseProps} activeTabKey='units' />);

    expect(mockGenUnitTableData).toHaveBeenCalledWith(baseProps.unitDataSource, 'en');
    expect(screen.getByTestId('pro-table')).toBeInTheDocument();
    expect(screen.getByText('super(m2)')).toBeInTheDocument();
    expect(screen.getByText('aligned:1')).toBeInTheDocument();
    expect(screen.getByText('qref:true')).toBeInTheDocument();
    expect(screen.getByTestId('unit-view')).toHaveTextContent('view:0');
    expect(screen.getByTestId('unit-edit')).toHaveTextContent('edit:0');
    await userEvent.click(screen.getByRole('button', { name: /close-unit-edit/i }));
    await userEvent.click(screen.getByRole('button', { name: /close-unit-delete/i }));
    expect(screen.getByTestId('unit-delete')).toHaveTextContent('delete:0');

    await userEvent.click(screen.getByTestId('unit-create'));
    expect(baseProps.onUnitDataCreate).toHaveBeenCalledWith({
      name: 'Created unit',
      meanValue: '1',
      quantitativeReference: true,
    });
  });

  it('switches tabs through the card callback', async () => {
    renderWithProviders(<UnitGroupForm {...baseProps} activeTabKey='unitGroupInformation' />);

    await userEvent.click(screen.getByRole('button', { name: /units/i }));
    expect(baseProps.onTabChange).toHaveBeenCalledWith('units');

    await userEvent.click(screen.getByRole('button', { name: /administrative information/i }));
    expect(baseProps.onTabChange).toHaveBeenCalledWith('administrativeInformation');
  });

  it('adds schema-driven rules on the information tab when showRules is enabled', () => {
    renderWithProviders(
      <UnitGroupForm {...baseProps} activeTabKey='unitGroupInformation' showRules />,
    );

    expect(screen.getAllByTestId('lang-text-form')[0]).not.toHaveTextContent('"rulesCount":0');
  });

  it('falls back to empty rule arrays when schema rules are missing', () => {
    withRulesFallbacks(() => {
      const { rerender } = renderWithProviders(
        <UnitGroupForm {...baseProps} activeTabKey='unitGroupInformation' showRules />,
      );

      expect(screen.getAllByTestId('lang-text-form')[0]).toHaveTextContent('"rulesCount":0');

      rerender(<UnitGroupForm {...baseProps} activeTabKey='modellingAndValidation' showRules />);
      const complianceSourceSelect = screen
        .getAllByTestId('source-select')
        .find((node) => node.textContent?.includes('Compliance system name'));
      expect(complianceSourceSelect).toHaveTextContent('"showRequiredLabel":true');
      expect(complianceSourceSelect).toHaveTextContent('"rulesCount":0');

      rerender(
        <UnitGroupForm
          {...baseProps}
          activeTabKey='administrativeInformation'
          showRules
          formType='createVersion'
        />,
      );
      expect(screen.getAllByRole('textbox')[1]).toBeDisabled();
      expect(screen.getByTestId('contact-select')).toHaveTextContent('"rulesCount":0');
    });
  });
});
