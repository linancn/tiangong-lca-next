import requiredFields from '@/pages/LifeCycleModels/requiredFields';

describe('LifeCycleModels requiredFields', () => {
  const requiredFieldsMap = requiredFields as Record<string, string>;

  it('maps lifecycle model required field paths to the expected tabs', () => {
    expect(requiredFieldsMap['lifeCycleModelInformation.dataSetInformation.name.baseName']).toBe(
      'lifeCycleModelInformation',
    );
    expect(
      requiredFieldsMap[
        'administrativeInformation.common:commissionerAndGoal.common:referenceToCommissioner'
      ],
    ).toBe('administrativeInformation');
  });

  it('does not expose commented validation-only sections as required mappings', () => {
    expect(requiredFieldsMap['modellingAndValidation.validation.review']).toBeUndefined();
    expect(
      requiredFieldsMap['modellingAndValidation.complianceDeclarations.compliance'],
    ).toBeUndefined();
  });
});
