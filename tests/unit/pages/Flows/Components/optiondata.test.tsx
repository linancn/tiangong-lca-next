import {
  complianceOptions,
  dataDerivationTypeStatusOptions,
  flowTypeOptions,
  myFlowTypeOptions,
  uncertaintyDistributionTypeOptions,
} from '@/pages/Flows/Components/optiondata';

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => ({
    props: { defaultMessage, id },
  }),
}));

describe('optiondata (src/pages/Flows/Components/optiondata.tsx)', () => {
  it('exposes flow property option sets', () => {
    expect(dataDerivationTypeStatusOptions.map((opt) => opt.value)).toEqual([
      'Measured',
      'Calculated',
      'Estimated',
      'Unknown derivation',
    ]);
    expect(uncertaintyDistributionTypeOptions.map((opt) => opt.value)).toContain('normal');
  });

  it('contains flow type and compliance choices', () => {
    expect(myFlowTypeOptions.map((opt) => opt.value)).toEqual(['Product flow', 'Waste flow']);
    expect(flowTypeOptions.map((opt) => opt.value)).toEqual([
      'Elementary flow',
      'Product flow',
      'Waste flow',
      'Other flow',
    ]);
    expect(complianceOptions.map((opt) => opt.value)).toEqual([
      'Fully compliant',
      'Not compliant',
      'Not defined',
    ]);
  });

  it('keeps formatted message ids aligned with the option values', () => {
    expect((dataDerivationTypeStatusOptions[0].label as any).props.id).toBe(
      'pages.flow.view.flowProperties.dataDerivationType.measured',
    );
    expect((uncertaintyDistributionTypeOptions[4].label as any).props.defaultMessage).toBe(
      'uniform',
    );
    expect((flowTypeOptions[0].label as any).props.defaultMessage).toBe('Elementary flow');
    expect((complianceOptions[2].label as any).props.id).toBe(
      'pages.flow.view.modellingAndValidation.approvalOfOverallCompliance.notDefined',
    );
  });
});
