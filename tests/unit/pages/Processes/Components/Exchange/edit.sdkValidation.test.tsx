import ProcessExchangeEdit from '@/pages/Processes/Components/Exchange/edit';
import { normalizeProcessSdkValidationDetails } from '@/pages/Processes/sdkValidation';
import { ProForm, ProTable } from '@ant-design/pro-components';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  const React = require('react');
  return {
    ...actual,
    Drawer: ({ children, open, ...props }: any) => {
      const [mounted, setMounted] = React.useState(false);
      React.useEffect(() => {
        // Reproduce the browser's lazy portal mount, after the parent's opening effects.
        if (!open) {
          setMounted(false);
          return;
        }
        const timer = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(timer);
      }, [open]);
      return (
        <actual.Drawer {...props} open={open}>
          {mounted ? children : null}
        </actual.Drawer>
      );
    },
  };
});

jest.mock('umi', () => ({
  FormattedMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
  useIntl: () => ({
    formatMessage: ({ id, defaultMessage }: { id: string; defaultMessage: string }) =>
      id === 'pages.validationIssues.sdkDetail.suggestedFix.required_missing'
        ? 'Fill in this field'
        : defaultMessage,
  }),
}));

jest.mock('@/pages/Utils', () => ({ getRules: () => [] }));
jest.mock('@/components/LangTextItem/form', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/LocationTextItem/codeSelect', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/components/UnitConvert', () => ({ __esModule: true, default: () => null }));
jest.mock('@/pages/Flows/Components/select/form', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/pages/Sources/Components/select/form', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/pages/Processes/Components/Exchange/allocationField', () => ({
  __esModule: true,
  default: () => null,
}));

const sdkIssues = [
  ...['meanAmount', 'resultingAmount'].map((field) => ({
    expected: 'string',
    code: 'required_missing',
    path: ['processDataSet', 'exchanges', 'exchange', 0, field],
    message: 'Invalid input: expected string, received undefined',
    params: { expected: 'string' },
    severity: 'error' as const,
    rawCode: 'invalid_type',
  })),
  {
    code: 'invalid_union',
    errors: [
      'Measured',
      'Calculated',
      'Estimated',
      'Unknown derivation',
      'Missing important',
      'Missing unimportant',
    ].map((value) => [
      {
        code: 'invalid_value',
        values: [value],
        path: [],
        message: `Invalid input: expected "${value}"`,
      },
    ]),
    path: ['processDataSet', 'exchanges', 'exchange', 0, 'dataDerivationTypeStatus'],
    message: 'Invalid input',
    severity: 'error' as const,
    rawCode: 'invalid_union',
  },
  {
    expected: 'string',
    code: 'required_missing',
    path: ['processDataSet', 'exchanges', 'exchange', 0, 'dataDerivationTypeStatus'],
    message: 'Invalid input: expected string, received undefined',
    params: { expected: 'string' },
    severity: 'error' as const,
    rawCode: 'invalid_type',
  },
];

describe('Process exchange SDK errors with deferred Drawer mounting and real ProForm', () => {
  it.each(['Input', 'Output'])(
    'marks the missing %s exchange fields on first open',
    async (direction) => {
      const exchange = { '@dataSetInternalID': '7', exchangeDirection: direction };
      const details = normalizeProcessSdkValidationDetails(sdkIssues, {
        processDataSet: { exchanges: { exchange: [exchange] } },
      });
      expect([...new Set(details.map((detail) => detail.fieldKey))]).toEqual([
        'meanAmount',
        'resultingAmount',
        'dataDerivationTypeStatus',
      ]);
      expect(details.every((detail) => detail.exchangeInternalId === '7')).toBe(true);

      const exchangeRows = [exchange];
      const renderTable = (highlights: typeof details) => (
        <ProForm submitter={false}>
          <ProTable
            rowKey='@dataSetInternalID'
            search={false}
            options={false}
            pagination={false}
            dataSource={exchangeRows}
            columns={[
              {
                dataIndex: 'option',
                render: () => (
                  <ProcessExchangeEdit
                    id='7'
                    data={exchangeRows}
                    lang='en'
                    buttonType='text'
                    setViewDrawerVisible={jest.fn()}
                    onData={jest.fn()}
                    showRules={highlights.length > 0}
                    sdkHighlights={highlights}
                  />
                ),
              },
            ]}
          />
        </ProForm>
      );
      const { rerender } = render(renderTable([]));
      rerender(renderTable(details));
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

      await waitFor(() => {
        for (const label of ['Mean amount', 'Resulting amount', 'Data derivation type / status']) {
          const field = screen.getByLabelText(label).closest('.ant-form-item');
          expect(field).toHaveClass('ant-form-item-has-error');
          expect(field?.querySelector('.ant-form-item-explain-error')).toBeVisible();
        }
      });

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      await waitFor(() => {
        for (const label of ['Mean amount', 'Resulting amount', 'Data derivation type / status']) {
          const field = screen.getByLabelText(label).closest('.ant-form-item');
          expect(field).toHaveClass('ant-form-item-has-error');
          expect(field?.querySelector('.ant-form-item-explain-error')).toBeVisible();
        }
      });
    },
  );
});
