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
