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