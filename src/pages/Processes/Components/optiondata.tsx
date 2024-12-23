import { FormattedMessage } from 'umi';

export const processtypeOfDataSetOptions = [
  {
    value: 'Unit process, single operation',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.typeOfDataSet.unitProcessSingleOperation"
        defaultMessage="Unit process, single operation"
      />
    ),
  },
  {
    value: 'Unit processes, black box',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.typeOfDataSet.unitProcessesBlackBox"
        defaultMessage="Unit processes, black box"
      />
    ),
  },
  {
    value: 'LCI result',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.typeOfDataSet.LCIResult"
        defaultMessage="LCI result"
      />
    ),
  },
  {
    value: 'Partly terminated system',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.typeOfDataSet.partlyTerminatedSystem"
        defaultMessage="Partly terminated system"
      />
    ),
  },
  {
    value: 'Avoided product system',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.typeOfDataSet.avoidedProductSystem"
        defaultMessage="Avoided product system"
      />
    ),
  },
];

export const LCIMethodPrincipleOptions = [
  {
    value: 'Attributional',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodPrinciple.attributional"
        defaultMessage="Attributional"
      />
    ),
  },
  {
    value: 'Consequential',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodPrinciple.consequential"
        defaultMessage="Consequential"
      />
    ),
  },
  {
    value: 'Consequential with attributional components',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodPrinciple.consequentialWithAttributionalComponents"
        defaultMessage="Consequential with attributional components"
      />
    ),
  },
  {
    value: 'Not applicable',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodPrinciple.notApplicable"
        defaultMessage="Not applicable"
      />
    ),
  },
  {
    value: 'Other',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodPrinciple.other"
        defaultMessage="Other"
      />
    ),
  },
];

export const LCIMethodApproachOptions = [
  {
    value: 'Allocation - market value',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.allocationMarketValue"
        defaultMessage="Allocation - market value"
      />
    ),
  },
  {
    value: 'Allocation - gross calorific value',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.allocationGrossCalorificValue"
        defaultMessage="Allocation - gross calorific value"
      />
    ),
  },
  {
    value: 'Allocation - net calorific value',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.allocationNetCalorificValue"
        defaultMessage="Allocation - net calorific value"
      />
    ),
  },
  {
    value: 'Allocation - exergetic content',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.allocationExergeticContent"
        defaultMessage="Allocation - exergetic content"
      />
    ),
  },
  {
    value: 'Allocation - element content',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.allocationElementContent"
        defaultMessage="Allocation - element content"
      />
    ),
  },
  {
    value: 'Allocation - mass',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.allocationMass"
        defaultMessage="Allocation - mass"
      />
    ),
  },
  {
    value: 'Allocation - volume',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.allocationVolume"
        defaultMessage="Allocation - volume"
      />
    ),
  },
  {
    value: 'Allocation - ability to bear',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.allocationAbilityToBear"
        defaultMessage="Allocation - ability to bear"
      />
    ),
  },
  {
    value: 'Allocation - marginal causality',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.allocationMarginalCausality"
        defaultMessage="Allocation - marginal causality"
      />
    ),
  },
  {
    value: 'Allocation - physical causality',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.allocationPhysicalCausality"
        defaultMessage="Allocation - physical causality"
      />
    ),
  },
  {
    value: 'Allocation - 100% to main function',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.allocation100%ToMainFunction"
        defaultMessage="Allocation - 100% to main function"
      />
    ),
  },
  {
    value: 'Allocation - other explicit assignment',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.allocationOtherExplicitAssignment"
        defaultMessage="Allocation - other explicit assignment"
      />
    ),
  },
  {
    value: 'Allocation - equal distribution',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.allocationEqualDistribution"
        defaultMessage="Allocation - equal distribution"
      />
    ),
  },
  {
    value: 'Allocation - recycled content',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.allocationRecycledContent"
        defaultMessage="Allocation - recycled content"
      />
    ),
  },
  {
    value: 'Substitution - BAT',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.substitutionBAT"
        defaultMessage="Substitution - BAT"
      />
    ),
  },
  {
    value: 'Substitution - average, market price correction',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.substitutionAverageMarketPriceCorrection"
        defaultMessage="Substitution - average, market price correction"
      />
    ),
  },
  {
    value: 'Substitution - average, technical properties correction',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.substitutionAverageTechnicalPropertiesCorrection"
        defaultMessage="Substitution - average, technical properties correction"
      />
    ),
  },
  {
    value: 'Substitution - recycling potential',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.substitutionRecyclingPotential"
        defaultMessage="Substitution - recycling potential"
      />
    ),
  },
  {
    value: 'Substitution - average, no correction',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.substitutionAverageNoCorrection"
        defaultMessage="Substitution - average, no correction"
      />
    ),
  },
  {
    value: 'Substitution - specific',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.substitutionSpecific"
        defaultMessage="Substitution - specific"
      />
    ),
  },
  {
    value: 'Consequential effects - other',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.consequentialEffectsOther"
        defaultMessage="Consequential effects - other"
      />
    ),
  },
  {
    value: 'Not applicable',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.notApplicable"
        defaultMessage="Not applicable"
      />
    ),
  },
  {
    value: 'Other',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.LCIMethodApproach.other"
        defaultMessage="Other"
      />
    ),
  },
];

export const reviewTypeOptions = [
  {
    value: 'Dependent internal review',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.Validation.Review.dependentInternalReview"
        defaultMessage="Dependent internal review"
      />
    ),
  },
  {
    value: 'Independent internal review',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.Validation.Review.independentInternalReview"
        defaultMessage="Independent internal review"
      />
    ),
  },
  {
    value: 'Independent external review',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.Validation.Review.independentExternalReview"
        defaultMessage="Independent external review"
      />
    ),
  },
  {
    value: 'Accredited third party review',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.Validation.Review.accreditedThirdPartyReview"
        defaultMessage="Accredited third party review"
      />
    ),
  },
  {
    value: 'Independent review panel',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.Validation.Review.independentReviewPanel"
        defaultMessage="Independent review panel"
      />
    ),
  },
  {
    value: 'Not reviewed',
    label: (
      <FormattedMessage
        id="pages.process.view.modellingAndValidation.Validation.Review.notReviewed"
        defaultMessage="Not reviewed"
      />
    ),
  },
];

export const scopeNameOptions = [
  {
    value: 'Raw data',
    label: 'Raw data',
  },
  {
    value: 'Unit process(es), single operation',
    label: 'Unit process(es), single operation',
  },
  {
    value: 'Unit process(es), black box',
    label: 'Unit process(es), black box',
  },
  {
    value: 'LCI results or Partly terminated system',
    label: 'LCI results or Partly terminated system',
  },
  {
    value: 'LCIA results',
    label: 'LCIA results',
  },
  {
    value: 'Documentation',
    label: 'Documentation',
  },
  {
    value: 'Life cycle inventory methods',
    label: 'Life cycle inventory methods',
  },
  {
    value: 'LCIA results calculation',
    label: 'LCIA results calculation',
  },
  {
    value: 'Goal and scope definition',
    label: 'Goal and scope definition',
  },
];

export const methodNameOptions = [
  {
    value: 'Validation of data sources',
    label: 'Validation of data sources',
  },
  {
    value: 'Sample tests on calculations',
    label: 'Sample tests on calculations',
  },
  {
    value: 'Energy balance',
    label: 'Energy balance',
  },
  {
    value: 'Element balance',
    label: 'Element balance',
  },
  {
    value: 'Cross-check with other source',
    label: 'Cross-check with other source',
  },
  {
    value: 'Cross-check with other data set',
    label: 'Cross-check with other data set',
  },
  {
    value: 'Expert judgement',
    label: 'Expert judgement',
  },
  {
    value: 'Mass balance',
    label: 'Mass balance',
  },
  {
    value: 'Compliance with legal limits',
    label: 'Compliance with legal limits',
  },
  {
    value: 'Compliance with ISO 14040 to 14044',
    label: 'Compliance with ISO 14040 to 14044',
  },
  {
    value: 'Documentation',
    label: 'Documentation',
  },
  {
    value: 'Evidence collection by means of plant visits and/or interviews',
    label: 'Evidence collection by means of plant visits and/or interviews',
  },
];

export const dataQualityIndicatorNameOptions = [
  {
    value: 'Technological representativeness',
    label: 'Technological representativeness',
  },
  {
    value: 'Time representativeness',
    label: 'Time representativeness',
  },
  {
    value: 'Geographical representativeness',
    label: 'Geographical representativeness',
  },
  {
    value: 'Completeness',
    label: 'Completeness',
  },
  {
    value: 'Precision',
    label: 'Precision',
  },
  {
    value: 'Methodological appropriateness and consistency',
    label: 'Methodological appropriateness and consistency',
  },
  {
    value: 'Overall quality',
    label: 'Overall quality',
  },
];

export const dataQualityIndicatorValueOptions = [
  {
    value: 'Very good',
    label: 'Very good',
  },
  {
    value: 'Good',
    label: 'Good',
  },
  {
    value: 'Fair',
    label: 'Fair',
  },
  {
    value: 'Poor',
    label: 'Poor',
  },
  {
    value: 'Very poor',
    label: 'Very poor',
  },
  {
    value: 'Not evaluated / unknown',
    label: 'Not evaluated / unknown',
  },
  {
    value: 'Not applicable',
    label: 'Not applicable',
  },
];

export const complianceOptions = [
  {
    value: 'Fully compliant',
    label: 'Fully compliant',
  },
  {
    value: 'Not compliant',
    label: 'Not compliant',
  },
  {
    value: 'Not defined',
    label: 'Not defined',
  },
];

export const workflowAndPublicationStatusOptions = [
  {
    value: 'Working draft',
    label: (
      <FormattedMessage
        id="pages.process.view.administrativeInformation.workflowAndPublicationStatus.workingDraft"
        defaultMessage="Working draft"
      />
    ),
  },
  {
    value: 'Final draft for internal review',
    label: (
      <FormattedMessage
        id="pages.process.view.administrativeInformation.workflowAndPublicationStatus.finalDraftForInternalReview"
        defaultMessage="Final draft for internal review"
      />
    ),
  },
  {
    value: 'Final draft for external review',
    label: (
      <FormattedMessage
        id="pages.process.view.administrativeInformation.workflowAndPublicationStatus.finalDraftForExternalReview"
        defaultMessage="Final draft for external review"
      />
    ),
  },
  {
    value: 'Data set finalised; unpublished',
    label: (
      <FormattedMessage
        id="pages.process.view.administrativeInformation.workflowAndPublicationStatus.dataSetFinalisedUnpublished"
        defaultMessage="Data set finalised; unpublished"
      />
    ),
  },
  {
    value: 'Under revision',
    label: (
      <FormattedMessage
        id="pages.process.view.administrativeInformation.workflowAndPublicationStatus.underRevision"
        defaultMessage="Under revision"
      />
    ),
  },
  {
    value: 'Withdrawn',
    label: (
      <FormattedMessage
        id="pages.process.view.administrativeInformation.workflowAndPublicationStatus.withdrawn"
        defaultMessage="Withdrawn"
      />
    ),
  },
  {
    value: 'Data set finalised; subsystems published',
    label: (
      <FormattedMessage
        id="pages.process.view.administrativeInformation.workflowAndPublicationStatus.dataSetFinalisedSubsystemsPublished"
        defaultMessage="Data set finalised; subsystems published"
      />
    ),
  },
  {
    value: 'Data set finalised; entirely published',
    label: (
      <FormattedMessage
        id="pages.process.view.administrativeInformation.workflowAndPublicationStatus.dataSetFinalisedEntirelyPublished"
        defaultMessage="Data set finalised; entirely published"
      />
    ),
  },
];

export const copyrightOptions = [
  {
    value: 'Yes',
    label: (
      <FormattedMessage
        id="pages.process.view.administrativeInformation.copyright.yes"
        defaultMessage="Yes"
      />
    ),
  },
  {
    value: 'No',
    label: (
      <FormattedMessage
        id="pages.process.view.administrativeInformation.copyright.no"
        defaultMessage="No"
      />
    ),
  },
];

export const licenseTypeOptions = [
  {
    value: 'Free of charge for all users and uses',
    label: (
      <FormattedMessage
        id="pages.process.view.administrativeInformation.licenseType.freeOfChargeForAllUsersAndUses"
        defaultMessage="Free of charge for all users and uses"
      />
    ),
  },
  {
    value: 'Free of charge for some user types or use types',
    label: (
      <FormattedMessage
        id="pages.process.view.administrativeInformation.licenseType.freeOfChargeForSomeUserTypesOrUseTypes"
        defaultMessage="Free of charge for some user types or use types"
      />
    ),
  },
  {
    value: 'Free of charge for members only',
    label: (
      <FormattedMessage
        id="pages.process.view.administrativeInformation.licenseType.freeOfChargeForMembersOnly"
        defaultMessage="Free of charge for members only"
      />
    ),
  },
  {
    value: 'License fee',
    label: (
      <FormattedMessage
        id="pages.process.view.administrativeInformation.licenseType.licenseFee"
        defaultMessage="License fee"
      />
    ),
  },
  {
    value: 'Other',
    label: (
      <FormattedMessage
        id="pages.process.view.administrativeInformation.licenseType.other"
        defaultMessage="Other"
      />
    ),
  },
];

export const DataDerivationTypeStatusOptions = [
  {
    value: 'Measured',
    label: (
      <FormattedMessage
        id="pages.process.view.exchanges.uncertaintyDistributionType.measured"
        defaultMessage="Measured"
      />
    ),
  },
  {
    value: 'Calculated',
    label: (
      <FormattedMessage
        id="pages.process.view.exchanges.uncertaintyDistributionType.calculated"
        defaultMessage="Calculated"
      />
    ),
  },
  {
    value: 'Estimated',
    label: (
      <FormattedMessage
        id="pages.process.view.exchanges.uncertaintyDistributionType.estimated"
        defaultMessage="Estimated"
      />
    ),
  },
  {
    value: 'Unknown derivation',
    label: (
      <FormattedMessage
        id="pages.process.view.exchanges.uncertaintyDistributionType.unknownDerivation"
        defaultMessage="Unknown derivation"
      />
    ),
  },
  {
    value: 'Missing important',
    label: (
      <FormattedMessage
        id="pages.process.view.exchanges.uncertaintyDistributionType.missingImportant"
        defaultMessage="Missing important"
      />
    ),
  },
  {
    value: 'Missing unimportant',
    label: (
      <FormattedMessage
        id="pages.process.view.exchanges.uncertaintyDistributionType.missingUnimportant"
        defaultMessage="Missing unimportant"
      />
    ),
  },
];
