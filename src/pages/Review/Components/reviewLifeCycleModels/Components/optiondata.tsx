import { FormattedMessage } from 'umi';
export const uncertaintyDistributionTypeOptions = [
  {
    value: 'undefined',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.uncertaintyDistributionType.undefined'
        defaultMessage='undefined'
      />
    ),
  },
  {
    value: 'log-normal',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.uncertaintyDistributionType.logNormal'
        defaultMessage='log-normal'
      />
    ),
  },
  {
    value: 'normal',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.uncertaintyDistributionType.normal'
        defaultMessage='normal'
      />
    ),
  },
  {
    value: 'triangular',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.uncertaintyDistributionType.triangular'
        defaultMessage='triangular'
      />
    ),
  },
  {
    value: 'uniform',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.uncertaintyDistributionType.uniform'
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
        id='pages.lifeCycleModel.view.modellingAndValidation.typeOfDataSet.unitProcessSingleOperation'
        defaultMessage='Unit process, single operation'
      />
    ),
  },
  {
    value: 'Unit processes, black box',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.typeOfDataSet.unitProcessesBlackBox'
        defaultMessage='Unit processes, black box'
      />
    ),
  },
  {
    value: 'LCI result',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.typeOfDataSet.LCIResult'
        defaultMessage='LCI result'
      />
    ),
  },
  {
    value: 'Partly terminated system',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.typeOfDataSet.partlyTerminatedSystem'
        defaultMessage='Partly terminated system'
      />
    ),
  },
  {
    value: 'Avoided product system',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.typeOfDataSet.avoidedProductSystem'
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
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodPrinciple.attributional'
        defaultMessage='Attributional'
      />
    ),
  },
  {
    value: 'Consequential',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodPrinciple.consequential'
        defaultMessage='Consequential'
      />
    ),
  },
  {
    value: 'Consequential with attributional components',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodPrinciple.consequentialWithAttributionalComponents'
        defaultMessage='Consequential with attributional components'
      />
    ),
  },
  {
    value: 'Not applicable',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodPrinciple.notApplicable'
        defaultMessage='Not applicable'
      />
    ),
  },
  {
    value: 'Other',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodPrinciple.other'
        defaultMessage='Other'
      />
    ),
  },
];
export const copyrightOptions = [
  {
    value: 'Yes',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.administrativeInformation.copyright.yes'
        defaultMessage='Yes'
      />
    ),
  },
  {
    value: 'No',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.administrativeInformation.copyright.no'
        defaultMessage='No'
      />
    ),
  },
];
export const LCIMethodApproachOptions = [
  {
    value: 'Allocation - market value',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.allocationMarketValue'
        defaultMessage='Allocation - market value'
      />
    ),
  },
  {
    value: 'Allocation - gross calorific value',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.allocationGrossCalorificValue'
        defaultMessage='Allocation - gross calorific value'
      />
    ),
  },
  {
    value: 'Allocation - net calorific value',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.allocationNetCalorificValue'
        defaultMessage='Allocation - net calorific value'
      />
    ),
  },
  {
    value: 'Allocation - exergetic content',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.allocationExergeticContent'
        defaultMessage='Allocation - exergetic content'
      />
    ),
  },
  {
    value: 'Allocation - element content',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.allocationElementContent'
        defaultMessage='Allocation - element content'
      />
    ),
  },
  {
    value: 'Allocation - mass',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.allocationMass'
        defaultMessage='Allocation - mass'
      />
    ),
  },
  {
    value: 'Allocation - volume',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.allocationVolume'
        defaultMessage='Allocation - volume'
      />
    ),
  },
  {
    value: 'Allocation - ability to bear',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.allocationAbilityToBear'
        defaultMessage='Allocation - ability to bear'
      />
    ),
  },
  {
    value: 'Allocation - marginal causality',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.allocationMarginalCausality'
        defaultMessage='Allocation - marginal causality'
      />
    ),
  },
  {
    value: 'Allocation - physical causality',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.allocationPhysicalCausality'
        defaultMessage='Allocation - physical causality'
      />
    ),
  },
  {
    value: 'Allocation - 100% to main function',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.allocation100%ToMainFunction'
        defaultMessage='Allocation - 100% to main function'
      />
    ),
  },
  {
    value: 'Allocation - other explicit assignment',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.allocationOtherExplicitAssignment'
        defaultMessage='Allocation - other explicit assignment'
      />
    ),
  },
  {
    value: 'Allocation - equal distribution',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.allocationEqualDistribution'
        defaultMessage='Allocation - equal distribution'
      />
    ),
  },
  {
    value: 'Allocation - recycled content',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.allocationRecycledContent'
        defaultMessage='Allocation - recycled content'
      />
    ),
  },
  {
    value: 'Substitution - BAT',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.substitutionBAT'
        defaultMessage='Substitution - BAT'
      />
    ),
  },
  {
    value: 'Substitution - average, market price correction',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.substitutionAverageMarketPriceCorrection'
        defaultMessage='Substitution - average, market price correction'
      />
    ),
  },
  {
    value: 'Substitution - average, technical properties correction',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.substitutionAverageTechnicalPropertiesCorrection'
        defaultMessage='Substitution - average, technical properties correction'
      />
    ),
  },
  {
    value: 'Substitution - recycling potential',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.substitutionRecyclingPotential'
        defaultMessage='Substitution - recycling potential'
      />
    ),
  },
  {
    value: 'Substitution - average, no correction',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.substitutionAverageNoCorrection'
        defaultMessage='Substitution - average, no correction'
      />
    ),
  },
  {
    value: 'Substitution - specific',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.substitutionSpecific'
        defaultMessage='Substitution - specific'
      />
    ),
  },
  {
    value: 'Consequential effects - other',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.consequentialEffectsOther'
        defaultMessage='Consequential effects - other'
      />
    ),
  },
  {
    value: 'Not applicable',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.notApplicable'
        defaultMessage='Not applicable'
      />
    ),
  },
  {
    value: 'Other',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.LCIMethodApproach.other'
        defaultMessage='Other'
      />
    ),
  },
];
export const completenessProductModelOptions = [
  {
    value: 'All relevant flows quantified',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.allRelevantFlowsQuantified'
        defaultMessage='All relevant flows quantified'
      />
    ),
  },
  {
    value: 'Relevant flows missing',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.relevantFlowsMissing'
        defaultMessage='Relevant flows missing'
      />
    ),
  },
  {
    value: 'Topic not relevant',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.topicNotRelevant'
        defaultMessage='Topic not relevant'
      />
    ),
  },
  {
    value: 'No statement',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.noStatement'
        defaultMessage='No statement'
      />
    ),
  },
];
export const completenessElementaryFlowsTypeOptions = [
  {
    value: 'Climate change',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.climateChange'
        defaultMessage='Climate change'
      />
    ),
  },
  {
    value: 'Ozone depletion',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.ozoneDepletion'
        defaultMessage='Ozone depletion'
      />
    ),
  },
  {
    value: 'Summer smog',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.summerSmog'
        defaultMessage='Summer smog'
      />
    ),
  },
  {
    value: 'Eutrophication',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.eutrophication'
        defaultMessage='Eutrophication'
      />
    ),
  },
  {
    value: 'Acidification',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.acidification'
        defaultMessage='Acidification'
      />
    ),
  },
  {
    value: 'Human toxicity',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.humanToxicity'
        defaultMessage='Human toxicity'
      />
    ),
  },
  {
    value: 'Freshwater ecotoxicity',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.freshwaterEcotoxicity'
        defaultMessage='Freshwater ecotoxicity'
      />
    ),
  },
  {
    value: 'Seawater eco-toxicity',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.seawaterEcoToxicity'
        defaultMessage='Seawater eco-toxicity'
      />
    ),
  },
  {
    value: 'Terrestric eco-toxicity',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.terrestricEcoToxicity'
        defaultMessage='Terrestric eco-toxicity'
      />
    ),
  },
  {
    value: 'Radioactivity',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.radioactivity'
        defaultMessage='Radioactivity'
      />
    ),
  },
  {
    value: 'Land use',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.landUse'
        defaultMessage='Land use'
      />
    ),
  },
  {
    value: 'Non-renewable material resource depletion',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.nonRenewableMaterialResourceDepletion'
        defaultMessage='Non-renewable material resource depletion'
      />
    ),
  },
  {
    value: 'Renewable material resource consumption',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.renewableMaterialResourceConsumption'
        defaultMessage='Renewable material resource consumption'
      />
    ),
  },
  {
    value: 'Non-renewable primary energy depletion',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.nonRenewablePrimaryEnergyDepletion'
        defaultMessage='Non-renewable primary energy depletion'
      />
    ),
  },
  {
    value: 'Renewable primary energy consumption',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.renewablePrimaryEnergyConsumption'
        defaultMessage='Renewable primary energy consumption'
      />
    ),
  },
  {
    value: 'Particulate matter/respiratory inorganics',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.particulateMatterRespiratoryInorganics'
        defaultMessage='Particulate matter/respiratory inorganics'
      />
    ),
  },
  {
    value: 'Species depletion',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.speciesDepletion'
        defaultMessage='Species depletion'
      />
    ),
  },
  {
    value: 'Noise',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.noise'
        defaultMessage='Noise'
      />
    ),
  },
];
export const completenessElementaryFlowsValueOptions = [
  {
    value: 'All relevant flows quantified',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.allRelevantFlowsQuantified'
        defaultMessage='All relevant flows quantified'
      />
    ),
  },
  {
    value: 'Relevant flows missing',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.relevantFlowsMissing'
        defaultMessage='Relevant flows missing'
      />
    ),
  },
  {
    value: 'Topic not relevant',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.topicNotRelevant'
        defaultMessage='Topic not relevant'
      />
    ),
  },
  {
    value: 'No statement',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.modellingAndValidation.completeness.noStatement'
        defaultMessage='No statement'
      />
    ),
  },
];
export const workflowAndPublicationStatusOptions = [
  {
    value: 'Working draft',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.administrativeInformation.workflowAndPublicationStatus.workingDraft'
        defaultMessage='Working draft'
      />
    ),
  },
  {
    value: 'Final draft for internal review',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.administrativeInformation.workflowAndPublicationStatus.finalDraftForInternalReview'
        defaultMessage='Final draft for internal review'
      />
    ),
  },
  {
    value: 'Final draft for external review',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.administrativeInformation.workflowAndPublicationStatus.finalDraftForExternalReview'
        defaultMessage='Final draft for external review'
      />
    ),
  },
  {
    value: 'Data set finalised; unpublished',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.administrativeInformation.workflowAndPublicationStatus.dataSetFinalisedUnpublished'
        defaultMessage='Data set finalised; unpublished'
      />
    ),
  },
  {
    value: 'Under revision',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.administrativeInformation.workflowAndPublicationStatus.underRevision'
        defaultMessage='Under revision'
      />
    ),
  },
  {
    value: 'Withdrawn',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.administrativeInformation.workflowAndPublicationStatus.withdrawn'
        defaultMessage='Withdrawn'
      />
    ),
  },
  {
    value: 'Data set finalised; subsystems published',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.administrativeInformation.workflowAndPublicationStatus.dataSetFinalisedSubsystemsPublished'
        defaultMessage='Data set finalised; subsystems published'
      />
    ),
  },
  {
    value: 'Data set finalised; entirely published',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.view.administrativeInformation.workflowAndPublicationStatus.dataSetFinalisedEntirelyPublished'
        defaultMessage='Data set finalised; entirely published'
      />
    ),
  },
];
export const approvalOfOverallComplianceOptions = [
  {
    value: 'Fully compliant',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.modellingAndValidation.approvalOfOverallCompliance.fullyCompliant'
        defaultMessage='Fully compliant'
      />
    ),
  },
  {
    value: 'Not compliant',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.modellingAndValidation.approvalOfOverallCompliance.notCompliant'
        defaultMessage='Not compliant'
      />
    ),
  },
  {
    value: 'Not defined',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.modellingAndValidation.approvalOfOverallCompliance.notDefined'
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
        id='pages.lifeCycleModel.modellingAndValidation.nomenclatureCompliance.fullyCompliant'
        defaultMessage='Fully compliant'
      />
    ),
  },
  {
    value: 'Not compliant',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.modellingAndValidation.nomenclatureCompliance.notCompliant'
        defaultMessage='Not compliant'
      />
    ),
  },
  {
    value: 'Not defined',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.modellingAndValidation.nomenclatureCompliance.notDefined'
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
        id='pages.lifeCycleModel.modellingAndValidation.methodologicalCompliance.fullyCompliant'
        defaultMessage='Fully compliant'
      />
    ),
  },
  {
    value: 'Not compliant',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.modellingAndValidation.methodologicalCompliance.notCompliant'
        defaultMessage='Not compliant'
      />
    ),
  },
  {
    value: 'Not defined',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.modellingAndValidation.methodologicalCompliance.notDefined'
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
        id='pages.lifeCycleModel.modellingAndValidation.reviewCompliance.fullyCompliant'
        defaultMessage='Fully compliant'
      />
    ),
  },
  {
    value: 'Not compliant',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.modellingAndValidation.reviewCompliance.notCompliant'
        defaultMessage='Not compliant'
      />
    ),
  },
  {
    value: 'Not defined',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.modellingAndValidation.reviewCompliance.notDefined'
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
        id='pages.lifeCycleModel.modellingAndValidation.documentationCompliance.fullyCompliant'
        defaultMessage='Fully compliant'
      />
    ),
  },
  {
    value: 'Not compliant',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.modellingAndValidation.documentationCompliance.notCompliant'
        defaultMessage='Not compliant'
      />
    ),
  },
  {
    value: 'Not defined',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.modellingAndValidation.documentationCompliance.notDefined'
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
        id='pages.lifeCycleModel.modellingAndValidation.qualityCompliance.fullyCompliant'
        defaultMessage='Fully compliant'
      />
    ),
  },
  {
    value: 'Not compliant',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.modellingAndValidation.qualityCompliance.notCompliant'
        defaultMessage='Not compliant'
      />
    ),
  },
  {
    value: 'Not defined',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.modellingAndValidation.qualityCompliance.notDefined'
        defaultMessage='Not defined'
      />
    ),
  },
];

export const licenseTypeOptions = [
  {
    value: 'Free of charge for all users and uses',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.administrativeInformation.licenseType.freeOfChargeForAllUsersAndUses'
        defaultMessage='Free of charge for all users and uses'
      />
    ),
  },
  {
    value: 'Free of charge for some user types or use types',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.administrativeInformation.licenseType.freeOfChargeForSomeUserTypesOrUseTypes'
        defaultMessage='Free of charge for some user types or use types'
      />
    ),
  },
  {
    value: 'Free of charge for members only',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.administrativeInformation.licenseType.freeOfChargeForMembersOnly'
        defaultMessage='Free of charge for members only'
      />
    ),
  },
  {
    value: 'License fee',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.administrativeInformation.licenseType.licenseFee'
        defaultMessage='License fee'
      />
    ),
  },
  {
    value: 'Other',
    label: (
      <FormattedMessage
        id='pages.lifeCycleModel.administrativeInformation.licenseType.other'
        defaultMessage='Other'
      />
    ),
  },
];
