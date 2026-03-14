// @ts-nocheck
import ProcessExchangeView from '@/pages/Review/Components/Exchange/view';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../../../../helpers/testUtils';

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close</span>,
  ProfileOutlined: () => <span>view-icon</span>,
}));

jest.mock('@/components/LangTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='lang-text'>{JSON.stringify(data)}</div>,
}));

jest.mock('@/components/QuantitativeReferenceIcon', () => ({
  __esModule: true,
  default: ({ value }: any) => <span>{value ? 'quantitative-yes' : 'quantitative-no'}</span>,
}));

jest.mock('@/pages/Flows/Components/select/description', () => ({
  __esModule: true,
  default: ({ title, data, lang }: any) => (
    <div data-testid='flow-description'>{`${lang}:${data?.['@refObjectId']}:${title?.props?.defaultMessage ?? title}`}</div>
  ),
}));

jest.mock('@/pages/Sources/Components/select/description', () => ({
  __esModule: true,
  default: ({ title, data, lang }: any) => (
    <div data-testid='source-description'>{`${lang}:${data?.['@refObjectId']}:${title?.props?.defaultMessage ?? title}`}</div>
  ),
}));

jest.mock('@/pages/Processes/Components/optiondata', () => ({
  __esModule: true,
  DataDerivationTypeStatusOptions: [{ value: 'status-1', label: 'Status One' }],
  dataSourceTypeOptions: [{ value: 'source-1', label: 'Source Type One' }],
  functionTypeOptions: [{ value: 'function-1', label: 'Function Type One' }],
}));

jest.mock('antd', () => {
  const React = require('react');
  const { toText } = require('../../../../../helpers/nodeToText');

  const Button = ({ children, onClick, disabled = false, icon }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {icon}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ children }: any) => <>{children}</>;

  const Drawer = ({ open, title, extra, children, onClose }: any) =>
    open ? (
      <section role='dialog' aria-label={toText(title) || 'drawer'}>
        <header>
          <div>{extra}</div>
          <button type='button' onClick={onClose}>
            close
          </button>
        </header>
        <div>{children}</div>
      </section>
    ) : null;

  const Card = ({ children, title }: any) => (
    <section>
      <header>{toText(title)}</header>
      <div>{children}</div>
    </section>
  );

  const Descriptions = ({ children }: any) => <dl>{children}</dl>;
  Descriptions.Item = ({ label, children }: any) => (
    <div>
      <dt>{toText(label)}</dt>
      <dd>{children}</dd>
    </div>
  );

  const Divider = ({ children }: any) => <div>{toText(children)}</div>;

  return {
    __esModule: true,
    Button,
    Card,
    Descriptions,
    Divider,
    Drawer,
    Tooltip,
  };
});

describe('ReviewExchangeView', () => {
  const baseExchange = {
    '@dataSetInternalID': 'ex-1',
    exchangeDirection: 'Input',
    referenceToFlowDataSet: {
      '@refObjectId': 'flow-1',
    },
    location: 'CN',
    functionType: 'function-1',
    referenceToVariable: 'var-1',
    meanAmount: 10,
    resultingAmount: 12,
    allocations: {
      allocation: {
        '@internalReferenceToCoProduct': 'co-product-1',
        '@allocatedFraction': 0.5,
      },
    },
    dataSourceType: 'source-1',
    dataDerivationTypeStatus: 'status-1',
    referencesToDataSource: {
      referenceToDataSource: {
        '@refObjectId': 'source-1',
      },
    },
    generalComment: [{ '@xml:lang': 'en', '#text': 'Exchange comment' }],
    quantitativeReference: true,
    functionalUnitOrOther: [{ '@xml:lang': 'en', '#text': 'Functional unit' }],
  };

  it('renders triangular exchange details including minimum and maximum amounts', async () => {
    render(
      <ProcessExchangeView
        id='ex-1'
        data={[
          {
            ...baseExchange,
            uncertaintyDistributionType: 'triangular',
            minimumAmount: 1,
            maximumAmount: 20,
          },
        ]}
        lang='en'
        buttonType='text'
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /view/i }));

    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.getByText('Function Type One')).toBeInTheDocument();
    expect(screen.getByText('Source Type One')).toBeInTheDocument();
    expect(screen.getByText('Status One')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByTestId('flow-description')).toHaveTextContent('en:flow-1:Flow');
    expect(screen.getByTestId('source-description')).toHaveTextContent(
      'en:source-1:Data source(s)',
    );
    expect(screen.getByText('quantitative-yes')).toBeInTheDocument();
  });

  it('renders normal-distribution details and the relative standard deviation branch', async () => {
    render(
      <ProcessExchangeView
        id='ex-1'
        data={[
          {
            ...baseExchange,
            uncertaintyDistributionType: 'normal',
            relativeStandardDeviation95In: 0.95,
          },
        ]}
        lang='en'
        buttonType='icon'
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /view-icon/i }));

    expect(screen.getByText('0.95')).toBeInTheDocument();
    expect(screen.queryByText('20')).not.toBeInTheDocument();
    expect(
      screen
        .getAllByTestId('lang-text')
        .some((element) => element.textContent?.includes('Exchange comment')),
    ).toBe(true);
  });

  it('renders log-normal distribution details, fallback labels, and closes the drawer', async () => {
    render(
      <ProcessExchangeView
        id='ex-1'
        data={[
          {
            ...baseExchange,
            functionType: 'unknown-function',
            dataSourceType: 'unknown-source',
            dataDerivationTypeStatus: 'unknown-status',
            uncertaintyDistributionType: 'log-normal',
            relativeStandardDeviation95In: 1.25,
            quantitativeReference: false,
          },
        ]}
        lang='en'
        buttonType='icon'
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /view-icon/i }));

    expect(screen.getByText('1.25')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    expect(screen.getByText('quantitative-no')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: 'close' })[0]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
