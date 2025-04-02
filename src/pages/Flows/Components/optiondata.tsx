import { FormattedMessage } from 'umi';

export const dataDerivationTypeStatusOptions = [
  {
    value: 'Measured',
    label: (
      <FormattedMessage
        id='pages.flow.view.flowProperties.dataDerivationType.measured'
        defaultMessage='Measured'
      />
    ),
  },
  {
    value: 'Calculated',
    label: (
      <FormattedMessage
        id='pages.flow.view.flowProperties.dataDerivationType.calculated'
        defaultMessage='Calculated'
      />
    ),
  },
  {
    value: 'Estimated',
    label: (
      <FormattedMessage
        id='pages.flow.view.flowProperties.dataDerivationType.estimated'
        defaultMessage='Estimated'
      />
    ),
  },
  {
    value: 'Unknown derivation',
    label: (
      <FormattedMessage
        id='pages.flow.view.flowProperties.dataDerivationType.unknown'
        defaultMessage='Unknown derivation'
      />
    ),
  },
];

export const uncertaintyDistributionTypeOptions = [
  {
    value: 'undefined',
    label: (
      <FormattedMessage
        id='pages.flow.view.flowProperties.uncertaintyDistributionType.undefined'
        defaultMessage='undefined'
      />
    ),
  },
  {
    value: 'log-normal',
    label: (
      <FormattedMessage
        id='pages.flow.view.flowProperties.uncertaintyDistributionType.logNormal'
        defaultMessage='log-normal'
      />
    ),
  },
  {
    value: 'normal',
    label: (
      <FormattedMessage
        id='pages.flow.view.flowProperties.uncertaintyDistributionType.normal'
        defaultMessage='normal'
      />
    ),
  },
  {
    value: 'triangular',
    label: (
      <FormattedMessage
        id='pages.flow.view.flowProperties.uncertaintyDistributionType.triangular'
        defaultMessage='triangular'
      />
    ),
  },
  {
    value: 'uniform',
    label: (
      <FormattedMessage
        id='pages.flow.view.flowProperties.uncertaintyDistributionType.uniform'
        defaultMessage='uniform'
      />
    ),
  },
];
export const myFlowTypeOptions = [
  {
    value: 'Product flow',
    label: (
      <FormattedMessage
        id='pages.flow.view.modellingAndValidation.typeOfDataSet.productFlow'
        defaultMessage='Product flow'
      />
    ),
  },
  {
    value: 'Waste flow',
    label: (
      <FormattedMessage
        id='pages.flow.view.modellingAndValidation.typeOfDataSet.wasteFlow'
        defaultMessage='Waste flow'
      />
    ),
  },
];

export const flowTypeOptions = [
  {
    value: 'Elementary flow',
    label: (
      <FormattedMessage
        id='pages.flow.view.modellingAndValidation.typeOfDataSet.elementaryFlow'
        defaultMessage='Elementary flow'
      />
    ),
  },
  {
    value: 'Product flow',
    label: (
      <FormattedMessage
        id='pages.flow.view.modellingAndValidation.typeOfDataSet.productFlow'
        defaultMessage='Product flow'
      />
    ),
  },
  {
    value: 'Waste flow',
    label: (
      <FormattedMessage
        id='pages.flow.view.modellingAndValidation.typeOfDataSet.wasteFlow'
        defaultMessage='Waste flow'
      />
    ),
  },
  {
    value: 'Other flow',
    label: (
      <FormattedMessage
        id='pages.flow.view.modellingAndValidation.typeOfDataSet.otherFlow'
        defaultMessage='Other flow'
      />
    ),
  },
];

export const complianceOptions = [
  {
    value: 'Fully compliant',
    label: (
      <FormattedMessage
        id='pages.flow.view.modellingAndValidation.approvalOfOverallCompliance.fullyCompliant'
        defaultMessage='Fully compliant'
      />
    ),
  },
  {
    value: 'Not compliant',
    label: (
      <FormattedMessage
        id='pages.flow.view.modellingAndValidation.approvalOfOverallCompliance.notCompliant'
        defaultMessage='Not compliant'
      />
    ),
  },
  {
    value: 'Not defined',
    label: (
      <FormattedMessage
        id='pages.flow.view.modellingAndValidation.approvalOfOverallCompliance.notDefined'
        defaultMessage='Not defined'
      />
    ),
  },
];
