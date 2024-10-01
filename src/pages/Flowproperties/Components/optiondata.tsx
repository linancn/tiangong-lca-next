import { FormattedMessage } from 'umi';

export const complianceOptions = [
  {
    value: 'Fully compliant',
    label: (
      <FormattedMessage
        id="pages.FlowProperties.view.modellingAndValidation.approvalOfOverallCompliance.fullyCompliant"
        defaultMessage="Fully compliant"
      />
    ),
  },
  {
    value: 'Not compliant',
    label: (
      <FormattedMessage
        id="pages.FlowProperties.view.modellingAndValidation.approvalOfOverallCompliance.notCompliant"
        defaultMessage="Not compliant"
      />
    ),
  },
  {
    value: 'Not defined',
    label: (
      <FormattedMessage
        id="pages.FlowProperties.view.modellingAndValidation.approvalOfOverallCompliance.notDefined"
        defaultMessage="Not defined"
      />
    ),
  },
];
