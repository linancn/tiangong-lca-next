type IntlShapeLike = {
  formatMessage: (
    descriptor: { defaultMessage?: string; id: string },
    values?: Record<string, string | number | undefined>,
  ) => string;
};

const DATASET_TAB_MESSAGES = {
  'contact data set': {
    administrativeInformation: {
      defaultMessage: 'Administrative information',
      id: 'pages.contact.administrativeInformation',
    },
    contactInformation: {
      defaultMessage: 'Contact information',
      id: 'pages.contact.contactInformation',
    },
  },
  'flow data set': {
    administrativeInformation: {
      defaultMessage: 'Administrative information',
      id: 'pages.flow.view.administrativeInformation',
    },
    flowInformation: { defaultMessage: 'Flow information', id: 'pages.flow.view.flowInformation' },
    flowProperties: { defaultMessage: 'Flow properties', id: 'pages.flow.view.flowProperties' },
    modellingAndValidation: {
      defaultMessage: 'Modelling and validation',
      id: 'pages.flow.view.modellingAndValidation',
    },
  },
  'flow property data set': {
    administrativeInformation: {
      defaultMessage: 'Administrative information',
      id: 'pages.FlowProperties.view.administrativeInformation',
    },
    flowPropertiesInformation: {
      defaultMessage: 'Flow property information',
      id: 'pages.FlowProperties.view.flowPropertiesInformation',
    },
    modellingAndValidation: {
      defaultMessage: 'Modelling and validation',
      id: 'pages.FlowProperties.view.modellingAndValidation',
    },
  },
  'lifeCycleModel data set': {
    administrativeInformation: {
      defaultMessage: 'Administrative information',
      id: 'pages.lifeCycleModel.view.administrativeInformation',
    },
    complianceDeclarations: {
      defaultMessage: 'Compliance declarations',
      id: 'pages.lifeCycleModel.view.complianceDeclarations',
    },
    lifeCycleModelInformation: {
      defaultMessage: 'Life cycle model information',
      id: 'pages.lifeCycleModel.view.lifeCycleModelInformation',
    },
    modellingAndValidation: {
      defaultMessage: 'Modelling and validation',
      id: 'pages.lifeCycleModel.view.modellingAndValidation',
    },
    validation: { defaultMessage: 'Validation', id: 'pages.lifeCycleModel.view.validation' },
  },
  'process data set': {
    administrativeInformation: {
      defaultMessage: 'Administrative information',
      id: 'pages.process.view.administrativeInformation',
    },
    complianceDeclarations: {
      defaultMessage: 'Compliance declarations',
      id: 'pages.process.complianceDeclarations',
    },
    exchanges: { defaultMessage: 'Inputs and Outputs', id: 'pages.process.view.exchanges' },
    lciaResults: { defaultMessage: 'LCIA Results', id: 'pages.process.view.lciaresults' },
    modellingAndValidation: {
      defaultMessage: 'Modelling and validation',
      id: 'pages.process.view.modellingAndValidation',
    },
    processInformation: {
      defaultMessage: 'Process information',
      id: 'pages.process.view.processInformation',
    },
    validation: { defaultMessage: 'Validation', id: 'pages.process.validation' },
  },
  'source data set': {
    administrativeInformation: {
      defaultMessage: 'Administrative information',
      id: 'pages.source.view.administrativeInformation',
    },
    sourceInformation: {
      defaultMessage: 'Source information',
      id: 'pages.source.view.sourceInformation',
    },
  },
  'unit group data set': {
    administrativeInformation: {
      defaultMessage: 'Administrative information',
      id: 'pages.unitgroup.administrativeInformation',
    },
    modellingAndValidation: {
      defaultMessage: 'Modelling and validation',
      id: 'pages.unitgroup.modellingAndValidation',
    },
    unitGroupInformation: {
      defaultMessage: 'Unit group information',
      id: 'pages.unitgroup.unitGroupInformation',
    },
    units: { defaultMessage: 'Units', id: 'pages.unitgroup.units' },
  },
} as const;

const hasOwn = (value: object, key: PropertyKey) =>
  Object.prototype.hasOwnProperty.call(value, key);

export const formatDatasetTabLabel = (
  intl: IntlShapeLike,
  datasetType: string,
  tabName: string,
): string => {
  if (hasOwn(DATASET_TAB_MESSAGES, datasetType)) {
    const tabMessages = DATASET_TAB_MESSAGES[datasetType as keyof typeof DATASET_TAB_MESSAGES];
    if (hasOwn(tabMessages, tabName)) {
      const message = tabMessages[tabName as keyof typeof tabMessages];
      return intl.formatMessage(message);
    }
  }

  return intl.formatMessage(
    {
      defaultMessage: 'Unknown section ({tab})',
      id: 'pages.validationIssues.tab.unknown',
    },
    { tab: tabName.trim() || '-' },
  );
};
