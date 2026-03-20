import { complianceOptions } from '@/pages/Flowproperties/Components/optiondata';

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => ({
    props: { defaultMessage, id },
  }),
}));

describe('Flowproperties optiondata', () => {
  it('exposes the expected compliance choices', () => {
    expect(complianceOptions.map((option) => option.value)).toEqual([
      'Fully compliant',
      'Not compliant',
      'Not defined',
    ]);
  });

  it('keeps the formatted message payload on each compliance option label', () => {
    expect((complianceOptions[0].label as any).props.defaultMessage).toBe('Fully compliant');
    expect((complianceOptions[1].label as any).props.id).toBe(
      'pages.FlowProperties.view.modellingAndValidation.approvalOfOverallCompliance.notCompliant',
    );
    expect((complianceOptions[2].label as any).props.id).toBe(
      'pages.FlowProperties.view.modellingAndValidation.approvalOfOverallCompliance.notDefined',
    );
  });
});
