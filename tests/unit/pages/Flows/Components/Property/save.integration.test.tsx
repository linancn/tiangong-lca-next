import { FlowForm } from '@/pages/Flows/Components/form';
import { ProForm } from '@ant-design/pro-components';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useRef, useState } from 'react';
import { getFlowpropertyDetail } from '@/services/flowproperties/api';

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
  useModel: () => ({ initialState: { currentUser: { userid: 'another-user' } } }),
  useIntl: () => ({
    formatMessage: ({ id, defaultMessage }: { id: string; defaultMessage: string }) =>
      id === 'pages.validationIssues.sdkDetail.suggestedFix.required_missing'
        ? 'Fill in this field'
        : defaultMessage,
  }),
}));

jest.mock('@/pages/Utils', () => ({
  getRules: () => [],
  getLocalValueProps: (value: string) => ({ value }),
  validateRefObjectId: jest.fn(),
}));
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
jest.mock('@/pages/Flows/Components/Property/view', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/pages/Flows/Components/Property/delete', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/pages/Flowproperties/Components/select/drawer', () => ({
  __esModule: true,
  default: ({ onData }: any) => (
    <button type='button' onClick={() => onData('volume-property', '03.00.003')}>
      Select volume property
    </button>
  ),
}));
jest.mock('@/pages/Flowproperties/Components/edit', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/pages/Flowproperties/Components/view', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/pages/Unitgroups/Components/select/formMini', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/services/flowproperties/api', () => ({ getFlowpropertyDetail: jest.fn() }));
jest.mock('@/services/flows/api', () => ({}));
jest.mock('@/services/unitgroups/api', () => ({}));
jest.mock('@/services/general/api', () => ({ getRefData: async () => ({ data: null }) }));
jest.mock('@/services/general/util', () => ({
  ...jest.requireActual('@/services/general/util'),
  getUnitData: async (_type: string, rows: any[]) => rows,
}));

const selectedReference = {
  '@refObjectId': 'volume-property',
  '@type': 'flow property data set',
  '@uri': '../flowproperties/volume-property.xml',
  '@version': '03.00.003',
  'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Volume' }],
};

const FlowPropertiesHarness = ({
  initialRows,
  onSave,
}: {
  initialRows: any[];
  onSave: (rows: any[]) => void;
}) => {
  const formRef = useRef<any>(undefined);
  const [rows, setRows] = useState(initialRows);
  const saveRows = (next: any[]) => {
    onSave(next);
    setRows(next);
  };
  return (
    <ProForm formRef={formRef} submitter={false}>
      <FlowForm
        lang='en'
        activeTabKey='flowProperties'
        drawerVisible
        formRef={formRef}
        onData={() => {}}
        flowType='Product flow'
        propertyDataSource={rows}
        onPropertyData={saveRows}
        onPropertyDataCreate={(row) =>
          saveRows([...rows, { ...row, '@dataSetInternalID': String(rows.length) }])
        }
        onTabChange={() => {}}
        formType='edit'
      />
    </ProForm>
  );
};

describe('Flow properties save through the real selector, form and table', () => {
  beforeEach(() => {
    jest.mocked(getFlowpropertyDetail).mockResolvedValue({
      success: true,
      data: {
        id: 'volume-property',
        version: '03.00.003',
        userId: 'owner',
        json: {
          flowPropertyDataSet: {
            flowPropertiesInformation: {
              dataSetInformation: { 'common:name': [{ '@xml:lang': 'en', '#text': 'Volume' }] },
            },
          },
        },
      },
    } as any);
  });

  it.each(['create', 'edit'] as const)(
    'updates the %s row after selecting a property and saving directly',
    async (mode) => {
      const onSave = jest.fn();
      const initialRows =
        mode === 'create'
          ? []
          : [
              {
                '@dataSetInternalID': '0',
                referenceToFlowPropertyDataSet: {
                  ...selectedReference,
                  '@version': '03.00.000',
                  'common:shortDescription': [],
                },
                meanValue: '1',
              },
            ];
      render(<FlowPropertiesHarness initialRows={initialRows} onSave={onSave} />);
      if (mode === 'create') {
        fireEvent.click(await screen.findByRole('button', { name: 'Create' }));
      } else {
        fireEvent.click(await screen.findByRole('button', { name: 'form' }));
      }
      const drawer = await screen.findByRole('dialog', {
        name: `${mode === 'create' ? 'Create' : 'Edit'} Flow property`,
      });
      fireEvent.click(
        await within(drawer).findByRole('button', { name: 'Select volume property' }),
      );
      await waitFor(() =>
        expect(within(drawer).getByLabelText('Version')).toHaveValue('03.00.003'),
      );
      fireEvent.click(within(drawer).getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(onSave).toHaveBeenCalled());
      expect(onSave.mock.calls[0][0][0].referenceToFlowPropertyDataSet).toEqual(selectedReference);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(await screen.findByRole('cell', { name: 'Volume' })).toBeVisible();
      expect(screen.getByRole('cell', { name: '03.00.003' })).toBeVisible();
    },
  );

  it.each([
    ['create', '42'],
    ['edit', '42'],
    ['create', '0'],
    ['edit', '0'],
    ['create', '0.125'],
    ['edit', '0.125'],
  ] as const)(
    'updates the %s row mean value to %s without losing its selected reference',
    async (mode, meanValue) => {
      const onSave = jest.fn();
      const initialRows =
        mode === 'create'
          ? []
          : [
              {
                '@dataSetInternalID': '0',
                referenceToFlowPropertyDataSet: selectedReference,
                meanValue: '1',
              },
            ];
      render(<FlowPropertiesHarness initialRows={initialRows} onSave={onSave} />);
      if (mode === 'create') {
        fireEvent.click(await screen.findByRole('button', { name: 'Create' }));
      } else {
        fireEvent.click(await screen.findByRole('button', { name: 'form' }));
      }
      const drawer = await screen.findByRole('dialog', {
        name: `${mode === 'create' ? 'Create' : 'Edit'} Flow property`,
      });
      if (mode === 'create') {
        fireEvent.click(
          await within(drawer).findByRole('button', { name: 'Select volume property' }),
        );
      }
      await waitFor(() =>
        expect(within(drawer).getByLabelText('Version')).toHaveValue('03.00.003'),
      );
      fireEvent.change(await within(drawer).findByLabelText('Mean value (of flow property)'), {
        target: { value: meanValue },
      });
      fireEvent.click(within(drawer).getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(onSave).toHaveBeenCalled());
      expect(onSave.mock.calls[0][0][0]).toMatchObject({
        referenceToFlowPropertyDataSet: selectedReference,
        meanValue,
      });
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(await screen.findByRole('cell', { name: 'Volume' })).toBeVisible();
      expect(screen.getByRole('cell', { name: meanValue })).toBeVisible();
    },
  );
});
