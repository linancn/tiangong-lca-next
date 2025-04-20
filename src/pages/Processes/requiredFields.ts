const requiredFields = {
  //fieldPath :tabName
  'processInformation.dataSetInformation.name.baseName': 'processInformation',
  'processInformation.dataSetInformation.name.treatmentStandardsRoutes': 'processInformation',
  'processInformation.dataSetInformation.name.mixAndLocationTypes': 'processInformation',
  'processInformation.dataSetInformation.classificationInformation.common:classification.common:class':
    'processInformation',
  'processInformation.dataSetInformation.common:generalComment': 'processInformation',
  // 'processInformation.quantitativeReference.@type':'processInformation',
  // 'processInformation.quantitativeReference.referenceToReferenceFlow':'processInformation',
  'processInformation.time.common:referenceYear': 'processInformation',
  'processInformation.geography.locationOfOperationSupplyOrProduction.@location':
    'processInformation',
  'processInformation.technology.technologyDescriptionAndIncludedProcesses': 'processInformation',

  'modellingAndValidation.LCIMethodAndAllocation.typeOfDataSet': 'modellingAndValidation',
  'modellingAndValidation.dataSourcesTreatmentAndRepresentativeness.dataCutOffAndCompletenessPrinciples':
    'modellingAndValidation',
  'modellingAndValidation.dataSourcesTreatmentAndRepresentativeness.referenceToDataSource':
    'modellingAndValidation',

  'administrativeInformation.common:commissionerAndGoal.common:referenceToCommissioner':
    'administrativeInformation',
  'administrativeInformation.common:commissionerAndGoal.common:intendedApplications':
    'administrativeInformation',
  'administrativeInformation.dataEntryBy.common:timeStamp': 'administrativeInformation',
  'administrativeInformation.dataEntryBy.common:referenceToDataSetFormat':
    'administrativeInformation',
  'administrativeInformation.dataEntryBy.common:referenceToPersonOrEntityEnteringTheData':
    'administrativeInformation',
  'administrativeInformation.publicationAndOwnership.common:dataSetVersion':
    'administrativeInformation',
  'administrativeInformation.publicationAndOwnership.common:permanentDataSetURI':
    'administrativeInformation',
  'administrativeInformation.publicationAndOwnership.common:referenceToOwnershipOfDataSet':
    'administrativeInformation',
  'administrativeInformation.publicationAndOwnership.common:copyright': 'administrativeInformation',
  'administrativeInformation.publicationAndOwnership.common:licenseType':
    'administrativeInformation',

  'modellingAndValidation.validation.review': 'validation',
  // 'modellingAndValidation.validation.review.@type': 'validation',
  // 'modellingAndValidation.validation.review.scope.@type': 'validation',
  // 'modellingAndValidation.validation.review.scope.@name': 'validation',
  // 'modellingAndValidation.validation.review.scope.method.@name': 'validation',
  // 'modellingAndValidation.validation.review.reviewDetails': 'validation',
  // 'modellingAndValidation.validation.review.common:referenceToNameOfReviewerAndInstitution': 'validation',
  // 'modellingAndValidation.validation.review.common:referenceToCompleteReviewReport': 'validation',

  'modellingAndValidation.complianceDeclarations.compliance': 'complianceDeclarations',
  // 'modellingAndValidation.complianceDeclarations.compliance.common:referenceToComplianceSystem': 'complianceDeclarations',
  // 'modellingAndValidation.complianceDeclarations.compliance.common:approvalOfOverallCompliance': 'complianceDeclarations',
  // 'modellingAndValidation.complianceDeclarations.compliance.common:nomenclatureCompliance': 'complianceDeclarations',
  // 'modellingAndValidation.complianceDeclarations.compliance.common:methodologicalCompliance': 'complianceDeclarations',
  // 'modellingAndValidation.complianceDeclarations.compliance.common:reviewCompliance': 'complianceDeclarations',
  // 'modellingAndValidation.complianceDeclarations.compliance.common:documentationCompliance': 'complianceDeclarations',
  // 'modellingAndValidation.complianceDeclarations.compliance.common:qualityCompliance': 'complianceDeclarations',
};

export default requiredFields;
