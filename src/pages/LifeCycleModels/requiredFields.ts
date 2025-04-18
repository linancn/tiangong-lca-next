const requiredFields = {
  //fieldPath :tabName

  'lifeCycleModelInformation.dataSetInformation.name.baseName': 'lifeCycleModelInformation',
  'lifeCycleModelInformation.dataSetInformation.name.treatmentStandardsRoutes':
    'lifeCycleModelInformation',
  'lifeCycleModelInformation.dataSetInformation.name.mixAndLocationTypes':
    'lifeCycleModelInformation',
  'lifeCycleModelInformation.dataSetInformation.classificationInformation.common:classification.common:class':
    'lifeCycleModelInformation',
  'lifeCycleModelInformation.dataSetInformation.common:generalComment': 'lifeCycleModelInformation',
  'lifeCycleModelInformation.time.common:referenceYear': 'lifeCycleModelInformation',
  'lifeCycleModelInformation.geography.locationOfOperationSupplyOrProduction.@location':
    'lifeCycleModelInformation',
  'lifeCycleModelInformation.technology.technologyDescriptionAndIncludedProcesses':
    'lifeCycleModelInformation',

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
  'modellingAndValidation.complianceDeclarations.compliance': 'complianceDeclarations',
};

export default requiredFields;
