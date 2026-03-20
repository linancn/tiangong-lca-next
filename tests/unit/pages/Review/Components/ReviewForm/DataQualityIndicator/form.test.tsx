// @ts-nocheck
import DataQualityIndicatorItemForm from '@/pages/Review/Components/ReviewForm/DataQualityIndicator/form';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../../../../../helpers/testUtils';

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
}));

jest.mock('@/pages/Processes/Components/optiondata', () => ({
  __esModule: true,
  dataQualityIndicatorNameOptions: [
    { value: 'temporal-correlation', label: 'Temporal correlation' },
  ],
  dataQualityIndicatorValueOptions: [{ value: 'very-good', label: 'Very good' }],
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: ({ onClick }: any) => (
    <button type='button' aria-label='remove-indicator' onClick={onClick}>
      remove
    </button>
  ),
}));

jest.mock('antd', () => {
  const React = require('react');

  const Button = ({ children, onClick }: any) => (
    <button type='button' onClick={onClick}>
      {children}
    </button>
  );
  const Row = ({ children }: any) => <div>{children}</div>;
  const Col = ({ children }: any) => <div>{children}</div>;
  const Select = ({ options = [] }: any) => <div>{options.map((o: any) => o.label).join(',')}</div>;
  const Form = ({ children }: any) => <form>{children}</form>;
  Form.Item = ({ children }: any) => <div>{children}</div>;
  const MockFormList = ({ children }: any) => {
    const [items, setItems] = React.useState([{ key: 0, name: 0 }]);
    const add = () =>
      setItems((current: any[]) => [...current, { key: current.length, name: current.length }]);
    const remove = (name: number) =>
      setItems((current: any[]) => current.filter((item) => item.name !== name));
    return <div>{children(items, { add, remove })}</div>;
  };
  Form.List = MockFormList;

  return {
    __esModule: true,
    Button,
    Col,
    Form,
    Row,
    Select,
  };
});

describe('ReviewFormDataQualityIndicatorForm', () => {
  it('renders labels on the first row and supports add/remove operations', async () => {
    render(<DataQualityIndicatorItemForm name={['review', 'indicator']} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
    expect(screen.getAllByLabelText('remove-indicator')).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: /Add Data Quality Indicator Item/i }));
    expect(screen.getAllByLabelText('remove-indicator')).toHaveLength(2);

    await userEvent.click(screen.getAllByLabelText('remove-indicator')[0]);
    expect(screen.getAllByLabelText('remove-indicator')).toHaveLength(1);
  });
});
