import { FlowForm } from '@/pages/Flows/Components/form';
import { normalizeFlowSdkValidationDetails } from '@/pages/Flows/sdkValidation';
import { genFlowJsonOrdered } from '@/services/flows/util';
import { ProForm } from '@ant-design/pro-components';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { spawnSync } from 'node:child_process';

jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  const React = require('react');
  return {
    ...actual,
    Drawer: ({ children, open, ...props }: any) => {
      const [mounted, setMounted] = React.useState(false);
      React.useEffect(() => {
        // Reproduce the browser's lazy portal mount after the opening effects.
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
jest.mock('@/components/LevelTextItem/form', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/LocationTextItem/form', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/DatasetCreateVersionFormItem', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/pages/Contacts/Components/select/form', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/pages/Sources/Components/select/form', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/pages/Flows/Components/Property/create', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/pages/Flows/Components/Property/view', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/pages/Flows/Components/Property/delete', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/pages/Flowproperties/Components/select/form', () => ({
  __esModule: true,
  default: ({ name, label }: any) => {
    const { Form, Input } = jest.requireActual('antd');
    return (
      <Form.Item name={[...name, '@refObjectId']} label={label}>
        <Input />
      </Form.Item>
    );
  },
}));
jest.mock('@/services/general/util', () => ({
  getLangJson: (value: any) => value,
  getLangText: () => '',
  classificationToJsonList: (value: any) => value,
  formatDateTime: () => '2026-10-02T00:00:00Z',
  removeEmptyObjects: (value: any) => value,
  getUnitData: async (_type: string, rows: any[]) => rows,
}));

const getInstalledSdkIssues = (orderedJson: any) => {
  // Run Node package resolution to bypass Jest's SDK factory mock.
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      "const fs=require('node:fs'); const {createFlow}=require('@tiangong-lca/tidas-sdk/core'); const data=JSON.parse(fs.readFileSync(0,'utf8')); process.stdout.write(JSON.stringify(createFlow(data).validateEnhanced().error.issues.filter(issue=>issue.path.includes('flowProperties'))));",
    ],
    { cwd: process.cwd(), input: JSON.stringify(orderedJson), encoding: 'utf8' },
  );
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout);
};

describe('Serialized flow -> installed SDK -> FlowForm -> real property edit Drawer', () => {
  it.each([
    [1, false],
    [1, true],
    [2, false],
    [2, true],
  ])('marks the owning row fields with %s properties and autoOpen=%s', async (count, autoOpen) => {
    const rows = [
      { '@dataSetInternalID': '7', minimumValue: 1, dataDerivationTypeStatus: 'invalid' } as any,
      ...((count as number) === 2
        ? [{ '@dataSetInternalID': '9', meanValue: '1', dataDerivationTypeStatus: 'Measured' }]
        : []),
    ];
    const orderedJson = genFlowJsonOrdered('flow-1', {
      flowProperties: { flowProperty: rows },
    });
    expect(Array.isArray(orderedJson.flowDataSet.flowProperties.flowProperty)).toBe(count === 2);
    const details = normalizeFlowSdkValidationDetails(
      getInstalledSdkIssues(orderedJson),
      orderedJson,
    );
    const owningDetails = details.filter((detail) =>
      detail.fieldPath.startsWith('flowProperty[#7].'),
    );
    expect(owningDetails.map((detail) => detail.formName)).toEqual(
      expect.arrayContaining([
        ['referenceToFlowPropertyDataSet', '@refObjectId'],
        ['meanValue'],
        ['minimumValue'],
        ['dataDerivationTypeStatus'],
      ]),
    );

    const formRef = { current: undefined };
    const renderFlow = (highlights: typeof details) => (
      <ProForm formRef={formRef} submitter={false}>
        <FlowForm
          lang='en'
          activeTabKey='flowProperties'
          drawerVisible
          formRef={formRef}
          onData={jest.fn()}
          flowType='Product flow'
          propertyDataSource={rows}
          onPropertyData={jest.fn()}
          onPropertyDataCreate={jest.fn()}
          onTabChange={jest.fn()}
          formType='edit'
          showRules={highlights.length > 0}
          sdkValidationDetails={highlights}
          sdkValidationFocus={autoOpen && highlights.length > 0 ? owningDetails[0] : null}
        />
      </ProForm>
    );
    const { rerender } = render(renderFlow([]));
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'form' })).toHaveLength(count as number),
    );
    rerender(renderFlow(details));
    if (!autoOpen) {
      fireEvent.click(screen.getAllByRole('button', { name: 'form' })[0]);
    }

    const assertFieldErrors = () => {
      for (const label of [
        'Flow property',
        'Mean value (of flow property)',
        'Minimum value',
        'Data derivation type/status',
      ]) {
        const field = within(screen.getByRole('dialog', { name: 'Edit Flow property' }))
          .getByLabelText(label, { exact: true })
          .closest('.ant-form-item');
        expect(field).toHaveClass('ant-form-item-has-error');
        expect(field?.querySelector('.ant-form-item-explain-error')).toBeVisible();
      }
    };
    await waitFor(assertFieldErrors);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: 'form' })[0]);
    await waitFor(assertFieldErrors);
  });
});
