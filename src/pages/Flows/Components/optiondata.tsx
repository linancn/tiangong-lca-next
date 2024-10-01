import { FormattedMessage } from 'umi';

export const flowTypeOptions = [
  {
    value: 'Elementary flow',
    label: (
      <FormattedMessage
        id="pages.flow.view.modellingAndValidation.typeOfDataSet.elementaryFlow"
        defaultMessage="Elementary flow"
      />
    ),
  },
  {
    value: 'Product flow',
    label: (
      <FormattedMessage
        id="pages.flow.view.modellingAndValidation.typeOfDataSet.productFlow"
        defaultMessage="Product flow"
      />
    ),
  },
  {
    value: 'Waste flow',
    label: (
      <FormattedMessage
        id="pages.flow.view.modellingAndValidation.typeOfDataSet.wasteFlow"
        defaultMessage="Waste flow"
      />
    ),
  },
  {
    value: 'Other flow',
    label: (
      <FormattedMessage
        id="pages.flow.view.modellingAndValidation.typeOfDataSet.otherFlow"
        defaultMessage="Other flow"
      />
    ),
  },
];

export const complianceOptions = [
  {
    value: 'Fully compliant',
    label: (
      <FormattedMessage
        id="pages.flow.view.modellingAndValidation.approvalOfOverallCompliance.fullyCompliant"
        defaultMessage="Fully compliant"
      />
    ),
  },
  {
    value: 'Not compliant',
    label: (
      <FormattedMessage
        id="pages.flow.view.modellingAndValidation.approvalOfOverallCompliance.notCompliant"
        defaultMessage="Not compliant"
      />
    ),
  },
  {
    value: 'Not defined',
    label: (
      <FormattedMessage
        id="pages.flow.view.modellingAndValidation.approvalOfOverallCompliance.notDefined"
        defaultMessage="Not defined"
      />
    ),
  },
];
