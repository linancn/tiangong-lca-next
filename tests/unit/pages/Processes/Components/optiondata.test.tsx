import {
  DataDerivationTypeStatusOptions,
  LCIMethodApproachOptions,
  LCIMethodPrincipleOptions,
  approvalOfOverallComplianceOptions,
  completenessElementaryFlowsTypeOptions,
  completenessElementaryFlowsValueOptions,
  completenessProductModelOptions,
  copyrightOptions,
  dataQualityIndicatorNameOptions,
  dataQualityIndicatorValueOptions,
  dataSourceTypeOptions,
  documentationComplianceOptions,
  functionTypeOptions,
  licenseTypeOptions,
  methodNameOptions,
  methodologicalComplianceOptions,
  nomenclatureComplianceOptions,
  processtypeOfDataSetOptions,
  qualityComplianceOptions,
  reviewComplianceOptions,
  reviewTypeOptions,
  scopeNameOptions,
  uncertaintyDistributionTypeOptions,
  workflowAndPublicationStatusOptions,
} from '@/pages/Processes/Components/optiondata';

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => ({
    props: { defaultMessage, id },
  }),
}));

describe('Processes optiondata', () => {
  it('exposes core process option groups with expected values', () => {
    expect(dataSourceTypeOptions.map((option) => option.value)).toEqual([
      'Primary',
      '> 90% primary',
      'Mixed primary / secondary',
      'Secondary',
    ]);
    expect(functionTypeOptions.map((option) => option.value)).toEqual([
      'General reminder flow',
      'Allocation reminder flow',
      'System expansion reminder flow',
    ]);
    expect(uncertaintyDistributionTypeOptions.map((option) => option.value)).toEqual([
      'undefined',
      'log-normal',
      'normal',
      'triangular',
      'uniform',
    ]);
  });

  it('keeps workflow and copyright labels wired to the intended messages', () => {
    expect(workflowAndPublicationStatusOptions).toHaveLength(8);
    expect((workflowAndPublicationStatusOptions[0].label as any).props.defaultMessage).toBe(
      'Working draft',
    );
    expect((workflowAndPublicationStatusOptions[7].label as any).props.id).toBe(
      'pages.process.view.administrativeInformation.workflowAndPublicationStatus.dataSetFinalisedEntirelyPublished',
    );
    expect(copyrightOptions.map((option) => option.value)).toEqual(['true', 'false']);
    expect((copyrightOptions[0].label as any).props.defaultMessage).toBe('Yes');
    expect((copyrightOptions[1].label as any).props.defaultMessage).toBe('No');
  });

  it('exposes completeness and process-type option groups with stable values', () => {
    expect(completenessElementaryFlowsTypeOptions[0].value).toBe('Climate change');
    expect(
      completenessElementaryFlowsTypeOptions[completenessElementaryFlowsTypeOptions.length - 1]
        .value,
    ).toBe('Noise');
    expect(completenessElementaryFlowsValueOptions.map((option) => option.value)).toEqual([
      'All relevant flows quantified',
      'Relevant flows missing',
      'Topic not relevant',
      'No statement',
    ]);
    expect(completenessProductModelOptions.map((option) => option.value)).toEqual(
      completenessElementaryFlowsValueOptions.map((option) => option.value),
    );
    expect(processtypeOfDataSetOptions.map((option) => option.value)).toEqual([
      'Unit process, single operation',
      'Unit process, black box',
      'LCI result',
      'Partly terminated system',
      'Avoided product system',
    ]);
  });

  it('keeps LCI method and review-related option groups aligned with message ids', () => {
    expect(LCIMethodPrincipleOptions.map((option) => option.value)).toEqual([
      'Attributional',
      'Consequential',
      'Consequential with attributional components',
      'Not applicable',
      'Other',
    ]);
    expect(LCIMethodApproachOptions).toHaveLength(23);
    expect((LCIMethodApproachOptions[0].label as any).props.defaultMessage).toBe(
      'Allocation - market value',
    );
    const otherApproach = LCIMethodApproachOptions.find((option) => option.value === 'Other');

    expect((otherApproach?.label as any).props.id).toBe(
      'pages.process.view.modellingAndValidation.LCIMethodApproach.other',
    );
    expect(reviewTypeOptions.map((option) => option.value)).toContain('Not reviewed');
    expect(scopeNameOptions.map((option) => option.value)).toContain('LCIA results');
    expect(methodNameOptions.map((option) => option.value)).toContain('Validation of data sources');
  });

  it('exposes data quality and exchange derivation option groups', () => {
    expect(dataQualityIndicatorNameOptions.map((option) => option.value)).toEqual([
      'Technological representativeness',
      'Time representativeness',
      'Geographical representativeness',
      'Completeness',
      'Precision',
      'Methodological appropriateness and consistency',
      'Overall quality',
    ]);
    expect(dataQualityIndicatorValueOptions.map((option) => option.value)).toEqual([
      'Very good',
      'Good',
      'Fair',
      'Poor',
      'Very poor',
      'Not evaluated / unknown',
      'Not applicable',
    ]);
    expect(DataDerivationTypeStatusOptions.map((option) => option.value)).toEqual([
      'Measured',
      'Calculated',
      'Estimated',
      'Unknown derivation',
      'Missing important',
      'Missing unimportant',
    ]);
  });

  it('keeps license and compliance option groups in sync across categories', () => {
    expect(licenseTypeOptions.map((option) => option.value)).toEqual([
      'Free of charge for all users and uses',
      'Free of charge for some user types or use types',
      'Free of charge for members only',
      'License fee',
      'Other',
    ]);
    expect(approvalOfOverallComplianceOptions.map((option) => option.value)).toEqual([
      'Fully compliant',
      'Not compliant',
      'Not defined',
    ]);
    expect(nomenclatureComplianceOptions.map((option) => option.value)).toEqual(
      approvalOfOverallComplianceOptions.map((option) => option.value),
    );
    expect(methodologicalComplianceOptions.map((option) => option.value)).toEqual(
      approvalOfOverallComplianceOptions.map((option) => option.value),
    );
    expect(reviewComplianceOptions.map((option) => option.value)).toEqual(
      approvalOfOverallComplianceOptions.map((option) => option.value),
    );
    expect(documentationComplianceOptions.map((option) => option.value)).toEqual(
      approvalOfOverallComplianceOptions.map((option) => option.value),
    );
    expect(qualityComplianceOptions.map((option) => option.value)).toEqual(
      approvalOfOverallComplianceOptions.map((option) => option.value),
    );
  });
});
