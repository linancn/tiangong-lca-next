import { FormattedMessage } from 'umi';

export const uncertaintyDistributionTypeOptions = [
  {
    value: 'undefined',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.uncertaintyDistributionType.undefined'
        defaultMessage='undefined'
      />
    ),
  },
  {
    value: 'log-normal',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.uncertaintyDistributionType.logNormal'
        defaultMessage='log-normal'
      />
    ),
  },
  {
    value: 'normal',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.uncertaintyDistributionType.normal'
        defaultMessage='normal'
      />
    ),
  },
  {
    value: 'triangular',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.uncertaintyDistributionType.triangular'
        defaultMessage='triangular'
      />
    ),
  },
  {
    value: 'uniform',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.uncertaintyDistributionType.uniform'
        defaultMessage='uniform'
      />
    ),
  },
];

export const processtypeOfDataSetOptions = [
  {
    value: 'Unit process, single operation',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.typeOfDataSet.unitProcessSingleOperation'
        defaultMessage='Unit process, single operation'
      />
    ),
  },
  {
    value: 'Unit processes, black box',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.typeOfDataSet.unitProcessesBlackBox'
        defaultMessage='Unit processes, black box'
      />
    ),
  },
  {
    value: 'LCI result',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.typeOfDataSet.LCIResult'
        defaultMessage='LCI result'
      />
    ),
  },
  {
    value: 'Partly terminated system',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.typeOfDataSet.partlyTerminatedSystem'
        defaultMessage='Partly terminated system'
      />
    ),
  },
  {
    value: 'Avoided product system',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.typeOfDataSet.avoidedProductSystem'
        defaultMessage='Avoided product system'
      />
    ),
  },
];

export const LCIMethodPrincipleOptions = [
  {
    value: 'Attributional',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodPrinciple.attributional'
        defaultMessage='Attributional'
      />
    ),
  },
  {
    value: 'Consequential',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodPrinciple.consequential'
        defaultMessage='Consequential'
      />
    ),
  },
  {
    value: 'Consequential with attributional components',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodPrinciple.consequentialWithAttributionalComponents'
        defaultMessage='Consequential with attributional components'
      />
    ),
  },
  {
    value: 'Not applicable',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodPrinciple.notApplicable'
        defaultMessage='Not applicable'
      />
    ),
  },
  {
    value: 'Other',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodPrinciple.other'
        defaultMessage='Other'
      />
    ),
  },
];

export const LCIMethodApproachOptions = [
  {
    value: 'Allocation - market value',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.allocationMarketValue'
        defaultMessage='Allocation - market value'
      />
    ),
  },
  {
    value: 'Allocation - gross calorific value',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.allocationGrossCalorificValue'
        defaultMessage='Allocation - gross calorific value'
      />
    ),
  },
  {
    value: 'Allocation - net calorific value',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.allocationNetCalorificValue'
        defaultMessage='Allocation - net calorific value'
      />
    ),
  },
  {
    value: 'Allocation - exergetic content',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.allocationExergeticContent'
        defaultMessage='Allocation - exergetic content'
      />
    ),
  },
  {
    value: 'Allocation - element content',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.allocationElementContent'
        defaultMessage='Allocation - element content'
      />
    ),
  },
  {
    value: 'Allocation - mass',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.allocationMass'
        defaultMessage='Allocation - mass'
      />
    ),
  },
  {
    value: 'Allocation - volume',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.allocationVolume'
        defaultMessage='Allocation - volume'
      />
    ),
  },
  {
    value: 'Allocation - ability to bear',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.allocationAbilityToBear'
        defaultMessage='Allocation - ability to bear'
      />
    ),
  },
  {
    value: 'Allocation - marginal causality',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.allocationMarginalCausality'
        defaultMessage='Allocation - marginal causality'
      />
    ),
  },
  {
    value: 'Allocation - physical causality',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.allocationPhysicalCausality'
        defaultMessage='Allocation - physical causality'
      />
    ),
  },
  {
    value: 'Allocation - 100% to main function',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.allocation100%ToMainFunction'
        defaultMessage='Allocation - 100% to main function'
      />
    ),
  },
  {
    value: 'Allocation - other explicit assignment',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.allocationOtherExplicitAssignment'
        defaultMessage='Allocation - other explicit assignment'
      />
    ),
  },
  {
    value: 'Allocation - equal distribution',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.allocationEqualDistribution'
        defaultMessage='Allocation - equal distribution'
      />
    ),
  },
  {
    value: 'Allocation - recycled content',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.allocationRecycledContent'
        defaultMessage='Allocation - recycled content'
      />
    ),
  },
  {
    value: 'Substitution - BAT',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.substitutionBAT'
        defaultMessage='Substitution - BAT'
      />
    ),
  },
  {
    value: 'Substitution - average, market price correction',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.substitutionAverageMarketPriceCorrection'
        defaultMessage='Substitution - average, market price correction'
      />
    ),
  },
  {
    value: 'Substitution - average, technical properties correction',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.substitutionAverageTechnicalPropertiesCorrection'
        defaultMessage='Substitution - average, technical properties correction'
      />
    ),
  },
  {
    value: 'Substitution - recycling potential',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.substitutionRecyclingPotential'
        defaultMessage='Substitution - recycling potential'
      />
    ),
  },
  {
    value: 'Substitution - average, no correction',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.substitutionAverageNoCorrection'
        defaultMessage='Substitution - average, no correction'
      />
    ),
  },
  {
    value: 'Substitution - specific',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.substitutionSpecific'
        defaultMessage='Substitution - specific'
      />
    ),
  },
  {
    value: 'Consequential effects - other',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.consequentialEffectsOther'
        defaultMessage='Consequential effects - other'
      />
    ),
  },
  {
    value: 'Not applicable',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.notApplicable'
        defaultMessage='Not applicable'
      />
    ),
  },
  {
    value: 'Other',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.LCIMethodApproach.other'
        defaultMessage='Other'
      />
    ),
  },
];

export const reviewTypeOptions = [
  {
    value: 'Dependent internal review',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.Validation.Review.dependentInternalReview'
        defaultMessage='Dependent internal review'
      />
    ),
  },
  {
    value: 'Independent internal review',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.Validation.Review.independentInternalReview'
        defaultMessage='Independent internal review'
      />
    ),
  },
  {
    value: 'Independent external review',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.Validation.Review.independentExternalReview'
        defaultMessage='Independent external review'
      />
    ),
  },
  {
    value: 'Accredited third party review',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.Validation.Review.accreditedThirdPartyReview'
        defaultMessage='Accredited third party review'
      />
    ),
  },
  {
    value: 'Independent review panel',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.Validation.Review.independentReviewPanel'
        defaultMessage='Independent review panel'
      />
    ),
  },
  {
    value: 'Not reviewed',
    label: (
      <FormattedMessage
        id='pages.process.view.modellingAndValidation.Validation.Review.notReviewed'
        defaultMessage='Not reviewed'
      />
    ),
  },
];

export const scopeNameOptions = [
  {
    value: 'Raw data',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.scopeName.rawData'
        defaultMessage='Raw data'
      />
    ),
  },
  {
    value: 'Unit process(es), single operation',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.scopeName.unitProcessSingleOperation'
        defaultMessage='Unit process(es), single operation'
      />
    ),
  },
  {
    value: 'Unit process(es), black box',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.scopeName.unitProcessBlackBox'
        defaultMessage='Unit process(es), black box'
      />
    ),
  },
  {
    value: 'LCI results or Partly terminated system',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.scopeName.lciResultsPartlyTerminatedSystem'
        defaultMessage='LCI results or Partly terminated system'
      />
    ),
  },
  {
    value: 'LCIA results',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.scopeName.lciaResults'
        defaultMessage='LCIA results'
      />
    ),
  },
  {
    value: 'Documentation',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.scopeName.documentation'
        defaultMessage='Documentation'
      />
    ),
  },
  {
    value: 'Life cycle inventory methods',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.scopeName.lifeCycleInventoryMethods'
        defaultMessage='Life cycle inventory methods'
      />
    ),
  },
  {
    value: 'LCIA results calculation',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.scopeName.lciaResultsCalculation'
        defaultMessage='LCIA results calculation'
      />
    ),
  },
  {
    value: 'Goal and scope definition',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.scopeName.goalAndScopeDefinition'
        defaultMessage='Goal and scope definition'
      />
    ),
  },
];

export const methodNameOptions = [
  {
    value: 'Validation of data sources',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.methodName.validationOfDataSources'
        defaultMessage='Validation of data sources'
      />
    ),
  },
  {
    value: 'Sample tests on calculations',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.methodName.sampleTestsOnCalculations'
        defaultMessage='Sample tests on calculations'
      />
    ),
  },
  {
    value: 'Energy balance',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.methodName.energyBalance'
        defaultMessage='Energy balance'
      />
    ),
  },
  {
    value: 'Element balance',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.methodName.elementBalance'
        defaultMessage='Element balance'
      />
    ),
  },
  {
    value: 'Cross-check with other source',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.methodName.crossCheckWithOtherSource'
        defaultMessage='Cross-check with other source'
      />
    ),
  },
  {
    value: 'Cross-check with other data set',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.methodName.crossCheckWithOtherDataSet'
        defaultMessage='Cross-check with other data set'
      />
    ),
  },
  {
    value: 'Expert judgement',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.methodName.expertJudgement'
        defaultMessage='Expert judgement'
      />
    ),
  },
  {
    value: 'Mass balance',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.methodName.massBalance'
        defaultMessage='Mass balance'
      />
    ),
  },
  {
    value: 'Compliance with legal limits',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.methodName.complianceWithLegalLimits'
        defaultMessage='Compliance with legal limits'
      />
    ),
  },
  {
    value: 'Compliance with ISO 14040 to 14044',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.methodName.complianceWithISO14040to14044'
        defaultMessage='Compliance with ISO 14040 to 14044'
      />
    ),
  },
  {
    value: 'Documentation',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.methodName.documentation'
        defaultMessage='Documentation'
      />
    ),
  },
  {
    value: 'Evidence collection by means of plant visits and/or interviews',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.methodName.evidenceCollection'
        defaultMessage='Evidence collection by means of plant visits and/or interviews'
      />
    ),
  },
];

export const dataQualityIndicatorNameOptions = [
  {
    value: 'Technological representativeness',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.dataQualityIndicatorName.technologicalRepresentativeness'
        defaultMessage='Technological representativeness'
      />
    ),
  },
  {
    value: 'Time representativeness',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.dataQualityIndicatorName.timeRepresentativeness'
        defaultMessage='Time representativeness'
      />
    ),
  },
  {
    value: 'Geographical representativeness',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.dataQualityIndicatorName.geographicalRepresentativeness'
        defaultMessage='Geographical representativeness'
      />
    ),
  },
  {
    value: 'Completeness',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.dataQualityIndicatorName.completeness'
        defaultMessage='Completeness'
      />
    ),
  },
  {
    value: 'Precision',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.dataQualityIndicatorName.precision'
        defaultMessage='Precision'
      />
    ),
  },
  {
    value: 'Methodological appropriateness and consistency',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.dataQualityIndicatorName.methodologicalAppropriateness'
        defaultMessage='Methodological appropriateness and consistency'
      />
    ),
  },
  {
    value: 'Overall quality',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.dataQualityIndicatorName.overallQuality'
        defaultMessage='Overall quality'
      />
    ),
  },
];

export const dataQualityIndicatorValueOptions = [
  {
    value: 'Very good',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.dataQualityIndicatorValue.veryGood'
        defaultMessage='Very good'
      />
    ),
  },
  {
    value: 'Good',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.dataQualityIndicatorValue.good'
        defaultMessage='Good'
      />
    ),
  },
  {
    value: 'Fair',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.dataQualityIndicatorValue.fair'
        defaultMessage='Fair'
      />
    ),
  },
  {
    value: 'Poor',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.dataQualityIndicatorValue.poor'
        defaultMessage='Poor'
      />
    ),
  },
  {
    value: 'Very poor',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.dataQualityIndicatorValue.veryPoor'
        defaultMessage='Very poor'
      />
    ),
  },
  {
    value: 'Not evaluated / unknown',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.dataQualityIndicatorValue.notEvaluatedUnknown'
        defaultMessage='Not evaluated / unknown'
      />
    ),
  },
  {
    value: 'Not applicable',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.dataQualityIndicatorValue.notApplicable'
        defaultMessage='Not applicable'
      />
    ),
  },
];

export const workflowAndPublicationStatusOptions = [
  {
    value: 'Working draft',
    label: (
      <FormattedMessage
        id='pages.process.view.administrativeInformation.workflowAndPublicationStatus.workingDraft'
        defaultMessage='Working draft'
      />
    ),
  },
  {
    value: 'Final draft for internal review',
    label: (
      <FormattedMessage
        id='pages.process.view.administrativeInformation.workflowAndPublicationStatus.finalDraftForInternalReview'
        defaultMessage='Final draft for internal review'
      />
    ),
  },
  {
    value: 'Final draft for external review',
    label: (
      <FormattedMessage
        id='pages.process.view.administrativeInformation.workflowAndPublicationStatus.finalDraftForExternalReview'
        defaultMessage='Final draft for external review'
      />
    ),
  },
  {
    value: 'Data set finalised; unpublished',
    label: (
      <FormattedMessage
        id='pages.process.view.administrativeInformation.workflowAndPublicationStatus.dataSetFinalisedUnpublished'
        defaultMessage='Data set finalised; unpublished'
      />
    ),
  },
  {
    value: 'Under revision',
    label: (
      <FormattedMessage
        id='pages.process.view.administrativeInformation.workflowAndPublicationStatus.underRevision'
        defaultMessage='Under revision'
      />
    ),
  },
  {
    value: 'Withdrawn',
    label: (
      <FormattedMessage
        id='pages.process.view.administrativeInformation.workflowAndPublicationStatus.withdrawn'
        defaultMessage='Withdrawn'
      />
    ),
  },
  {
    value: 'Data set finalised; subsystems published',
    label: (
      <FormattedMessage
        id='pages.process.view.administrativeInformation.workflowAndPublicationStatus.dataSetFinalisedSubsystemsPublished'
        defaultMessage='Data set finalised; subsystems published'
      />
    ),
  },
  {
    value: 'Data set finalised; entirely published',
    label: (
      <FormattedMessage
        id='pages.process.view.administrativeInformation.workflowAndPublicationStatus.dataSetFinalisedEntirelyPublished'
        defaultMessage='Data set finalised; entirely published'
      />
    ),
  },
];

export const copyrightOptions = [
  {
    value: 'Yes',
    label: (
      <FormattedMessage
        id='pages.process.view.administrativeInformation.copyright.yes'
        defaultMessage='Yes'
      />
    ),
  },
  {
    value: 'No',
    label: (
      <FormattedMessage
        id='pages.process.view.administrativeInformation.copyright.no'
        defaultMessage='No'
      />
    ),
  },
];

export const licenseTypeOptions = [
  {
    value: 'Free of charge for all users and uses',
    label: (
      <FormattedMessage
        id='pages.process.view.administrativeInformation.licenseType.freeOfChargeForAllUsersAndUses'
        defaultMessage='Free of charge for all users and uses'
      />
    ),
  },
  {
    value: 'Free of charge for some user types or use types',
    label: (
      <FormattedMessage
        id='pages.process.view.administrativeInformation.licenseType.freeOfChargeForSomeUserTypesOrUseTypes'
        defaultMessage='Free of charge for some user types or use types'
      />
    ),
  },
  {
    value: 'Free of charge for members only',
    label: (
      <FormattedMessage
        id='pages.process.view.administrativeInformation.licenseType.freeOfChargeForMembersOnly'
        defaultMessage='Free of charge for members only'
      />
    ),
  },
  {
    value: 'License fee',
    label: (
      <FormattedMessage
        id='pages.process.view.administrativeInformation.licenseType.licenseFee'
        defaultMessage='License fee'
      />
    ),
  },
  {
    value: 'Other',
    label: (
      <FormattedMessage
        id='pages.process.view.administrativeInformation.licenseType.other'
        defaultMessage='Other'
      />
    ),
  },
];

export const DataDerivationTypeStatusOptions = [
  {
    value: 'Measured',
    label: (
      <FormattedMessage
        id='pages.process.view.exchanges.uncertaintyDistributionType.measured'
        defaultMessage='Measured'
      />
    ),
  },
  {
    value: 'Calculated',
    label: (
      <FormattedMessage
        id='pages.process.view.exchanges.uncertaintyDistributionType.calculated'
        defaultMessage='Calculated'
      />
    ),
  },
  {
    value: 'Estimated',
    label: (
      <FormattedMessage
        id='pages.process.view.exchanges.uncertaintyDistributionType.estimated'
        defaultMessage='Estimated'
      />
    ),
  },
  {
    value: 'Unknown derivation',
    label: (
      <FormattedMessage
        id='pages.process.view.exchanges.uncertaintyDistributionType.unknownDerivation'
        defaultMessage='Unknown derivation'
      />
    ),
  },
  {
    value: 'Missing important',
    label: (
      <FormattedMessage
        id='pages.process.view.exchanges.uncertaintyDistributionType.missingImportant'
        defaultMessage='Missing important'
      />
    ),
  },
  {
    value: 'Missing unimportant',
    label: (
      <FormattedMessage
        id='pages.process.view.exchanges.uncertaintyDistributionType.missingUnimportant'
        defaultMessage='Missing unimportant'
      />
    ),
  },
];

export const approvalOfOverallComplianceOptions = [
  {
    value: 'Fully compliant',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.approvalOfOverallCompliance.fullyCompliant'
        defaultMessage='Fully compliant'
      />
    ),
  },
  {
    value: 'Not compliant',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.approvalOfOverallCompliance.notCompliant'
        defaultMessage='Not compliant'
      />
    ),
  },
  {
    value: 'Not defined',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.approvalOfOverallCompliance.notDefined'
        defaultMessage='Not defined'
      />
    ),
  },
];

export const nomenclatureComplianceOptions = [
  {
    value: 'Fully compliant',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.nomenclatureCompliance.fullyCompliant'
        defaultMessage='Fully compliant'
      />
    ),
  },
  {
    value: 'Not compliant',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.nomenclatureCompliance.notCompliant'
        defaultMessage='Not compliant'
      />
    ),
  },
  {
    value: 'Not defined',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.nomenclatureCompliance.notDefined'
        defaultMessage='Not defined'
      />
    ),
  },
];

export const methodologicalComplianceOptions = [
  {
    value: 'Fully compliant',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.methodologicalCompliance.fullyCompliant'
        defaultMessage='Fully compliant'
      />
    ),
  },
  {
    value: 'Not compliant',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.methodologicalCompliance.notCompliant'
        defaultMessage='Not compliant'
      />
    ),
  },
  {
    value: 'Not defined',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.methodologicalCompliance.notDefined'
        defaultMessage='Not defined'
      />
    ),
  },
];

export const reviewComplianceOptions = [
  {
    value: 'Fully compliant',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.reviewCompliance.fullyCompliant'
        defaultMessage='Fully compliant'
      />
    ),
  },
  {
    value: 'Not compliant',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.reviewCompliance.notCompliant'
        defaultMessage='Not compliant'
      />
    ),
  },
  {
    value: 'Not defined',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.reviewCompliance.notDefined'
        defaultMessage='Not defined'
      />
    ),
  },
];

export const documentationComplianceOptions = [
  {
    value: 'Fully compliant',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.documentationCompliance.fullyCompliant'
        defaultMessage='Fully compliant'
      />
    ),
  },
  {
    value: 'Not compliant',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.documentationCompliance.notCompliant'
        defaultMessage='Not compliant'
      />
    ),
  },
  {
    value: 'Not defined',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.documentationCompliance.notDefined'
        defaultMessage='Not defined'
      />
    ),
  },
];

export const qualityComplianceOptions = [
  {
    value: 'Fully compliant',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.qualityCompliance.fullyCompliant'
        defaultMessage='Fully compliant'
      />
    ),
  },
  {
    value: 'Not compliant',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.qualityCompliance.notCompliant'
        defaultMessage='Not compliant'
      />
    ),
  },
  {
    value: 'Not defined',
    label: (
      <FormattedMessage
        id='pages.process.modellingAndValidation.qualityCompliance.notDefined'
        defaultMessage='Not defined'
      />
    ),
  },
];
