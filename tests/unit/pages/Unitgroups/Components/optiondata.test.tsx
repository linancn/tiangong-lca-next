import { complianceOptions } from '@/pages/Unitgroups/Components/optiondata';

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => ({
    props: { defaultMessage, id },
  }),
}));

describe('Unitgroups optiondata', () => {
  it('exposes the expected compliance choices', () => {
    expect(complianceOptions.map((option) => option.value)).toEqual([
      'Fully compliant',
      'Not compliant',
      'Not defined',
    ]);
  });

  it('keeps the compliance labels mapped to the intended translation ids', () => {
    expect((complianceOptions[0].label as any).props.defaultMessage).toBe('Fully compliant');
    expect((complianceOptions[1].label as any).props.id).toBe(
      'pages.unitgroup.view.modellingAndValidation.approvalOfOverallCompliance.notCompliant',
    );
    expect((complianceOptions[2].label as any).props.id).toBe(
      'pages.unitgroup.view.modellingAndValidation.approvalOfOverallCompliance.notDefined',
    );
  });
});
