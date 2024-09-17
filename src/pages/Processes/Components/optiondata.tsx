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


export const LCIMethodPrincipleOptions_1 = [
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
