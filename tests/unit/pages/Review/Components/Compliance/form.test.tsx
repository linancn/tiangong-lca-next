// @ts-nocheck
import ComplianceItemForm from '@/pages/Review/Components/Compliance/form';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../../../../helpers/testUtils';

let mockFormListInitialCount = 1;
let mockLastAddedItem: any;

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
}));

jest.mock('@/pages/Sources/Components/select/form', () => ({
  __esModule: true,
  default: ({ label, parentName, name, lang }: any) => (
    <div data-testid='source-select'>
      {JSON.stringify({
        label: label?.props?.defaultMessage ?? label,
        parentName,
        name,
        lang,
      })}
    </div>
  ),
}));

jest.mock('@/pages/Processes/Components/optiondata', () => ({
  __esModule: true,
  approvalOfOverallComplianceOptions: [{ value: 'approved', label: 'Approved' }],
  nomenclatureComplianceOptions: [{ value: 'nomenclature-ok', label: 'Nomenclature OK' }],
  methodologicalComplianceOptions: [{ value: 'method-ok', label: 'Method OK' }],
  reviewComplianceOptions: [{ value: 'review-ok', label: 'Review OK' }],
  documentationComplianceOptions: [{ value: 'docs-ok', label: 'Docs OK' }],
  qualityComplianceOptions: [{ value: 'quality-ok', label: 'Quality OK' }],
}));

jest.mock('@/pages/Processes/processes_schema.json', () => ({
  processDataSet: {
    modellingAndValidation: {
      complianceDeclarations: {
        compliance: {
          'common:approvalOfOverallCompliance': { rules: [] },
          'common:nomenclatureCompliance': { rules: [] },
          'common:methodologicalCompliance': { rules: [] },
          'common:reviewCompliance': { rules: [] },
          'common:documentationCompliance': { rules: [] },
          'common:qualityCompliance': { rules: [] },
          'common:referenceToComplianceSystem': {
            '@refObjectId': { rules: [] },
          },
        },
      },
    },
  },
}));

jest.mock('@/pages/Utils', () => ({
  __esModule: true,
  getRules: () => [],
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: ({ onClick }: any) => (
    <button type='button' aria-label='remove-compliance' onClick={onClick}>
      remove
    </button>
  ),
}));

jest.mock('antd', () => {
  const React = require('react');
  const { toText } = require('../../../../../helpers/nodeToText');

  const Button = ({ children, onClick }: any) => (
    <button type='button' onClick={onClick}>
      {toText(children)}
    </button>
  );
  const Card = ({ children, title, extra }: any) => (
    <section>
      <header>{toText(title)}</header>
      <div>{extra}</div>
      <div>{children}</div>
    </section>
  );
  const Col = ({ children }: any) => <div>{children}</div>;
  const Row = ({ children }: any) => <div>{children}</div>;
  const Select = ({ options = [] }: any) => <div>{options.map((o: any) => o.label).join(',')}</div>;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Form = ({ children }: any) => <form>{children}</form>;
  Form.Item = ({ children }: any) => <div>{children}</div>;
  const MockFormList = ({ children }: any) => {
    const [items, setItems] = React.useState(
      Array.from({ length: mockFormListInitialCount }, (_, index) => ({
        key: index,
        name: index,
      })),
    );
    const add = (value: any) => {
      mockLastAddedItem = value;
      setItems((current: any[]) => [...current, { key: current.length, name: current.length }]);
    };
    const remove = (name: number) =>
      setItems((current: any[]) => current.filter((item) => item.name !== name));
    return <div>{children(items, { add, remove })}</div>;
  };
  Form.List = MockFormList;

  return {
    __esModule: true,
    Button,
    Card,
    Col,
    Form,
    Row,
    Select,
    Space,
  };
});

describe('ReviewComplianceForm', () => {
  beforeEach(() => {
    mockFormListInitialCount = 1;
    mockLastAddedItem = undefined;
  });

  it('renders compliance fields, wires source select paths, and seeds defaults on add', async () => {
    render(
      <ComplianceItemForm
        name={['compliance']}
        lang='en'
        formRef={{ current: undefined }}
        onData={jest.fn()}
      />,
    );

    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Nomenclature OK')).toBeInTheDocument();
    expect(screen.getByText('Method OK')).toBeInTheDocument();
    expect(screen.getByTestId('source-select')).toHaveTextContent('"parentName":["compliance"]');
    expect(screen.getByTestId('source-select')).toHaveTextContent(
      '"name":[0,"common:referenceToComplianceSystem"]',
    );

    await userEvent.click(screen.getByRole('button', { name: /\+ Add Review Item/i }));

    expect(screen.getAllByLabelText('remove-compliance')).toHaveLength(2);
    expect(mockLastAddedItem).toEqual({
      'common:approvalOfOverallCompliance': 'Fully compliant',
      'common:nomenclatureCompliance': 'Fully compliant',
      'common:methodologicalCompliance': 'Fully compliant',
      'common:reviewCompliance': 'Fully compliant',
      'common:documentationCompliance': 'Fully compliant',
      'common:qualityCompliance': 'Fully compliant',
      'common:referenceToComplianceSystem': {},
    });
  });

  it('does not remove the only remaining row', async () => {
    render(
      <ComplianceItemForm
        name={['compliance']}
        lang='en'
        formRef={{ current: undefined }}
        onData={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByLabelText('remove-compliance'));
    expect(screen.getAllByLabelText('remove-compliance')).toHaveLength(1);
  });

  it('removes a row when multiple compliance rows are present', async () => {
    mockFormListInitialCount = 2;

    render(
      <ComplianceItemForm
        name={['compliance']}
        lang='en'
        formRef={{ current: undefined }}
        onData={jest.fn()}
      />,
    );

    expect(screen.getAllByLabelText('remove-compliance')).toHaveLength(2);

    await userEvent.click(screen.getAllByLabelText('remove-compliance')[1]);
    expect(screen.getAllByLabelText('remove-compliance')).toHaveLength(1);
  });
});
