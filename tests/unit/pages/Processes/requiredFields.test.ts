import requiredFields from '@/pages/Processes/requiredFields';

describe('Processes requiredFields', () => {
  const requiredFieldsMap = requiredFields as Record<string, string>;

  it('maps process required field paths to the expected tabs', () => {
    expect(requiredFieldsMap['processInformation.dataSetInformation.name.baseName']).toBe(
      'processInformation',
    );
    expect(requiredFieldsMap['modellingAndValidation.LCIMethodAndAllocation.typeOfDataSet']).toBe(
      'modellingAndValidation',
    );
    expect(
      requiredFieldsMap[
        'administrativeInformation.publicationAndOwnership.common:referenceToOwnershipOfDataSet'
      ],
    ).toBe('administrativeInformation');
  });

  it('keeps commented optional validation mappings out of the export', () => {
    expect(requiredFieldsMap['modellingAndValidation.validation.review']).toBeUndefined();
    expect(
      requiredFieldsMap['modellingAndValidation.complianceDeclarations.compliance'],
    ).toBeUndefined();
  });
});
